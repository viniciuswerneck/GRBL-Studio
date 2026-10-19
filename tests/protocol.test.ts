import { describe, expect, it } from 'vitest';
import {
  classifyLine,
  formatPosition,
  isStatusReport,
  parseSettingLine,
  parseSettings,
  parseStatusReport,
  splitLines,
} from '../src/shared/protocol';

describe('isStatusReport', () => {
  it('detecta linhas <...>', () => {
    expect(isStatusReport('<Idle|MPos:0.000,0.000,0.000>')).toBe(true);
    expect(isStatusReport('  <Idle>')).toBe(true);
    expect(isStatusReport('ok')).toBe(false);
    expect(isStatusReport('$G')).toBe(false);
  });
});

describe('parseStatusReport', () => {
  it('faz o parse de status Idle completo', () => {
    const s = parseStatusReport(
      '<Idle|MPos:0.000,0.000,0.000|FS:0,0|WCO:0.000,0.000,0.000>',
    );
    expect(s).not.toBeNull();
    expect(s!.state).toBe('Idle');
    expect(s!.mpos).toEqual({ x: 0, y: 0, z: 0 });
    expect(s!.fs).toEqual({ feed: 0, spindle: 0 });
    expect(s!.wco).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('faz o parse de Run com overrides e buffer', () => {
    const s = parseStatusReport(
      '<Run|MPos:12.340,5.000,0.000|FS:1200,0|Ov:100,100,100|Bf:14,128>',
    );
    expect(s!.state).toBe('Run');
    expect(s!.mpos).toEqual({ x: 12.34, y: 5, z: 0 });
    expect(s!.fs!.feed).toBe(1200);
    expect(s!.ov).toEqual([100, 100, 100]);
    expect(s!.bf).toEqual({ planned: 14, rx: 128 });
  });

  it('lida com WPos e Pn', () => {
    const s = parseStatusReport('<Jog|WPos:1.000,2.000,3.000|Pn:XY>');
    expect(s!.state).toBe('Jog');
    expect(s!.wpos).toEqual({ x: 1, y: 2, z: 3 });
    expect(s!.pn).toBe('XY');
  });

  it('não quebra com estado desconhecido nem campos estranhos', () => {
    const s = parseStatusReport('<Foobar|MPos:bad|Xyz:1>');
    expect(s!.state).toBe('Unknown');
    expect(s!.mpos).toBeUndefined();
    expect(s!.extra).toEqual({ Xyz: '1' });
  });

  it('retorna null para não-status', () => {
    expect(parseStatusReport('ok')).toBeNull();
    expect(parseStatusReport('<Idle')).toBeNull();
  });

  it('aceita MPos sem Z', () => {
    const s = parseStatusReport('<Idle|MPos:1.000,2.000>');
    expect(s!.mpos).toEqual({ x: 1, y: 2, z: 0 });
  });
});

describe('classifyLine', () => {
  it('classifica ok, error, alarm, message, setting, welcome', () => {
    expect(classifyLine('ok').kind).toBe('ok');
    expect(classifyLine('@ok').kind).toBe('ok');
    expect(classifyLine('ok\r')).toEqual({ kind: 'ok', text: 'ok' });

    const err = classifyLine('error:9');
    expect(err.kind).toBe('error');
    expect(err.code).toBe(9);
    expect(err.message).toMatch(/alarme ou jog/i);

    const alarm = classifyLine('ALARM:1');
    expect(alarm.kind).toBe('alarm');
    expect(alarm.code).toBe(1);
    expect(alarm.message).toMatch(/hard limit/i);

    expect(classifyLine('[MSG:Check Limits]').kind).toBe('message');
    expect(classifyLine('[MSG:Check Limits]').message).toBe('Check Limits');
    expect(classifyLine('$110=1200.000').kind).toBe('setting');
    expect(classifyLine("Grbl 1.1f ['$' for help]").kind).toBe('welcome');
  });

  it('trata alarme/erro sem código', () => {
    const alarm = classifyLine('ALARM:');
    expect(alarm.kind).toBe('alarm');
    expect(alarm.code).toBeUndefined();
    expect(alarm.message).toBe('ALARM:');
  });

  it('linha vazia e desconhecida viram other', () => {
    expect(classifyLine('   ').kind).toBe('other');
    expect(classifyLine('qualquer coisa').kind).toBe('other');
  });
});

describe('parseSettingLine / parseSettings', () => {
  it('faz o parse de $n=valor', () => {
    expect(parseSettingLine('$110=1200.000')).toEqual({
      key: 110,
      value: '1200.000',
      number: 1200,
    });
    expect(parseSettingLine('$22=1')).toEqual({
      key: 22,
      value: '1',
      number: 1,
    });
    expect(parseSettingLine('nope')).toBeNull();
  });

  it('monta o mapa de settings', () => {
    const map = parseSettings(['$0=10', '$22=1', 'lixo', '$32=1']);
    expect(map.size).toBe(3);
    expect(map.get(22)!.number).toBe(1);
  });
});

describe('splitLines', () => {
  it('separa linhas completas e preserva o resto', () => {
    const { lines, rest } = splitLines('ok\nALARM:1\nparcial');
    expect(lines).toEqual(['ok', 'ALARM:1']);
    expect(rest).toBe('parcial');
  });

  it('sem newline mantém tudo no rest', () => {
    expect(splitLines('ok')).toEqual({ lines: [], rest: 'ok' });
  });
});

describe('formatPosition', () => {
  it('usa 3 casas e em-dash para indefinido', () => {
    expect(formatPosition(1.2399)).toBe('1.240');
    expect(formatPosition(0)).toBe('0.000');
    expect(formatPosition(undefined)).toBe('—');
    expect(formatPosition(Number.NaN)).toBe('—');
  });
});

describe('parseStatusReport — campos parciais', () => {
  it('aceita o campo F (feed sem spindle) preservando o spindle atual', () => {
    const status = parseStatusReport('<Run|MPos:1,2,3|FS:500,255|F:800>')!;
    expect(status.fs).toEqual({ feed: 800, spindle: 255 });
  });

  it('guarda segmentos sem ":" em extra e ignora segmentos vazios', () => {
    const status = parseStatusReport('<Run|MPos:0,0,0|Probe|>')!;
    expect(status.extra.Probe).toBe('');
    expect(Object.keys(status.extra)).toEqual(['Probe']);
  });

  it('reconhece Pn/Bf e preserva chaves desconhecidas', () => {
    const status = parseStatusReport(
      '<Idle|MPos:0,0,0|Pn:XYZ|Bf:12,128|Foo:bar>',
    )!;
    expect(status.pn).toBe('XYZ');
    expect(status.bf).toEqual({ planned: 12, rx: 128 });
    expect(status.extra.Foo).toBe('bar');
  });

  it('cai em Unknown para estado não catálogado', () => {
    expect(parseStatusReport('<Foo|MPos:0,0,0>')!.state).toBe('Unknown');
  });
});

describe('classifyLine — casos de borda', () => {
  it('mensagens do firmware com "ok" não são confundidas com ACK', () => {
    const line = classifyLine('[MSG:Jog ok]');
    expect(line.kind).toBe('message');
    expect(line.message).toBe('Jog ok');
  });

  it('erro sem código numérico mantém o texto cru', () => {
    const line = classifyLine('error:UNKNOWN');
    expect(line.kind).toBe('error');
    expect(line.code).toBeUndefined();
    expect(line.message).toBe('error:UNKNOWN');
  });

  it('código de erro fora do catálogo usa rótulo genérico', () => {
    const line = classifyLine('error:99');
    expect(line.kind).toBe('error');
    expect(line.code).toBe(99);
    expect(line.message).toBe('Erro 99.');
  });

  it('descarta o CR final e classifica linha vazia como other', () => {
    expect(classifyLine('ok\r').kind).toBe('ok');
    expect(classifyLine('   ').kind).toBe('other');
  });
});

describe('regressões encontradas pelo fuzz (entrada corrompida)', () => {
  it('não propaga NaN em Ov/Bf; usa os padrões documentados', () => {
    const full = parseStatusReport('<Idle|Ov:abc,50,|Bf:x,>')!;
    expect(full.ov).toEqual([100, 50, 100]);
    expect(full.bf).toEqual({ planned: 0, rx: 0 });

    const missing = parseStatusReport('<Idle|Ov:|Bf:>')!;
    expect(missing.ov).toEqual([100, 100, 100]);
    expect(missing.bf).toEqual({ planned: 0, rx: 0 });
  });

  it('rejeita posições infinitas (1e999/Infinity) em vez de expor Infinity', () => {
    expect(parseStatusReport('<Idle|MPos:1e999,2,3>')!.mpos).toBeUndefined();
    expect(parseStatusReport('<Idle|WPos:Infinity,2,3>')!.wpos).toBeUndefined();
    expect(parseStatusReport('<Idle|WCO:-Infinity,2,3>')!.wco).toBeUndefined();
  });

  it('não deixa código/código de setting virar Infinity', () => {
    const huge = '9'.repeat(400);
    const error = classifyLine(`error:${huge}`);
    expect(error.kind).toBe('error');
    expect(error.code).toBeUndefined();
    expect(error.message).toBe(`error:${huge}`);

    const alarm = classifyLine(`ALARM:${huge}`);
    expect(alarm.kind).toBe('alarm');
    expect(alarm.code).toBeUndefined();
    expect(alarm.message).toBe(`ALARM:${huge}`);

    expect(parseSettingLine(`$${huge}=1`)).toBeNull();
  });
});
