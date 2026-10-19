import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  type MachineReportInput,
  buildMachineReport,
  deriveFacts,
  parseFirmware,
  parseModalState,
  parseOffsets,
  parseStartupBlocks,
} from '../src/shared/machine';
import { parseSettings } from '../src/shared/protocol';

const HERE = fileURLToPath(new URL('.', import.meta.url));

/**
 * Coleta **somente leitura** da máquina real (Sculpfun C1, 18/10/2026), a mesma
 * usada por `tests/machines.test.ts` — a verdade contra a qual o parser é
 * conferido (`docs/PLANO_MAQUINA.md` §11).
 */
const fixture = JSON.parse(
  readFileSync(`${HERE}fixtures/machine-sculpfun-c1.json`, 'utf8'),
) as { responses: Record<string, string[]> };

/** Linhas da resposta `$I`/`$$`/`$#`/`$G`/`$N` da coleta (vazio se ausente). */
function response(key: string): string[] {
  return fixture.responses[key] ?? [];
}

describe('parseFirmware', () => {
  it('lê GRBL 1.1 vanilla com options, planner e buffer', () => {
    const fw = parseFirmware(['[VER:1.1h.20190825:]', '[OPT:V,15,128]', 'ok']);

    expect(fw.raw).toBe('[VER:1.1h.20190825:]');
    expect(fw.version).toBe('1.1h');
    expect(fw.build).toBe('20190825');
    expect(fw.platform).toBeUndefined();
    expect(fw.options).toEqual({
      variableSpindle: true,
      coreXY: false,
      mist: false,
      raw: 'V',
    });
    expect(fw.plannerBlocks).toBe(15);
    expect(fw.rxBufferSize).toBe(128);
  });

  it('lê a Sculpfun C1 (versão sem `h`, `[OPT:H]` sem planner/buffer)', () => {
    const fw = parseFirmware(response('$I'));

    expect(fw.raw).toBe('[VER:1.3a.20250324:]');
    expect(fw.version).toBe('1.3a');
    expect(fw.build).toBe('20250324');
    expect(fw.options).toEqual({
      variableSpindle: false,
      coreXY: false,
      mist: false,
      // Regressão (coleta real, 18/10): as letras cruas eram descartadas e o
      // diagnóstico saía com `firmware.options=` vazio.
      raw: 'H',
    });
    expect(fw.plannerBlocks).toBeUndefined();
    expect(fw.rxBufferSize).toBeUndefined();
  });

  it('lê flags combinadas (V/C/M)', () => {
    const fw = parseFirmware(['[OPT:VCM,16,256]']);

    expect(fw.options).toEqual({
      variableSpindle: true,
      coreXY: true,
      mist: true,
      raw: 'VCM',
    });
    expect(fw.plannerBlocks).toBe(16);
    expect(fw.rxBufferSize).toBe(256);
  });

  it('tolera `[OPT:]` sem letras e `[VER:]` sem data', () => {
    const fw = parseFirmware(['[VER:1.1h:]', '[OPT:]']);

    expect(fw.version).toBe('1.1h');
    expect(fw.build).toBeUndefined();
    expect(fw.options).toEqual({
      variableSpindle: false,
      coreXY: false,
      mist: false,
    });
    expect(fw.plannerBlocks).toBeUndefined();
    expect(fw.rxBufferSize).toBeUndefined();
  });

  it('lê a plataforma quando o firmware informa ([VER:1.1h:…])', () => {
    const fw = parseFirmware(['[VER:1.1h:grblHAL]']);

    expect(fw.raw).toBe('[VER:1.1h:grblHAL]');
    expect(fw.version).toBe('1.1h');
    expect(fw.build).toBeUndefined();
    expect(fw.platform).toBe('grblHAL');
  });

  it('não quebra quando a firmware não responde', () => {
    const fw = parseFirmware(['error:3', 'ok']);

    expect(fw).toEqual({ raw: '' });
    expect(fw.version).toBeUndefined();
    expect(fw.options).toBeUndefined();
    expect(fw.plannerBlocks).toBeUndefined();
    expect(fw.rxBufferSize).toBeUndefined();
  });
});

describe('parseModalState', () => {
  it('lê o estado modal da coleta da C1', () => {
    expect(parseModalState(response('$G'))).toEqual({
      motion: 'G0',
      wcs: 'G54',
      plane: 'G17',
      units: 'G21',
      distance: 'G90',
      arc: 'G94',
      spindle: 'M5',
      coolant: 'M9',
      tool: 0,
      feed: 0,
      speed: 0,
    });
  });

  it('lê valores não nulos e variantes de WCS/plano/unidade', () => {
    const modal = parseModalState([
      '[GC:G1 G55 G18 G20 G91 G93 M3 M7 T2 F1200 S255]',
    ]);

    expect(modal.motion).toBe('G1');
    expect(modal.wcs).toBe('G55');
    expect(modal.plane).toBe('G18');
    expect(modal.units).toBe('G20');
    expect(modal.distance).toBe('G91');
    expect(modal.arc).toBe('G93');
    expect(modal.spindle).toBe('M3');
    expect(modal.coolant).toBe('M7');
    expect(modal.tool).toBe(2);
    expect(modal.feed).toBe(1200);
    expect(modal.speed).toBe(255);
  });

  it('retorna objeto vazio sem a linha [GC:]', () => {
    expect(parseModalState(['ok'])).toEqual({});
  });

  it('lê o fluxo de programa (M2/M30)', () => {
    expect(
      parseModalState(['[GC:G0 G54 G17 G21 G90 G94 M30 M5 M9 T0 F0 S0]'])
        .programFlow,
    ).toBe('M30');
  });
});

describe('parseOffsets', () => {
  it('lê todos os offsets zerados da C1 (inclusive PRB e TLO)', () => {
    expect(parseOffsets(response('$#'))).toEqual({
      g54: { x: 0, y: 0, z: 0 },
      g55: { x: 0, y: 0, z: 0 },
      g56: { x: 0, y: 0, z: 0 },
      g57: { x: 0, y: 0, z: 0 },
      g58: { x: 0, y: 0, z: 0 },
      g59: { x: 0, y: 0, z: 0 },
      g28: { x: 0, y: 0, z: 0 },
      g30: { x: 0, y: 0, z: 0 },
      g92: { x: 0, y: 0, z: 0 },
      tlo: 0,
      prb: { x: 0, y: 0, z: 0 },
    });
  });

  it('lê valores reais e ignora o flag de sucesso do PRB', () => {
    const offsets = parseOffsets([
      '[G54:10.000,-5.500,1.250]',
      '[G92:1.000,2.000,3.000]',
      '[TLO:-12.345]',
      '[PRB:1.234,5.678,9.012:1]',
    ]);

    expect(offsets.g54).toEqual({ x: 10, y: -5.5, z: 1.25 });
    expect(offsets.g92).toEqual({ x: 1, y: 2, z: 3 });
    expect(offsets.tlo).toBeCloseTo(-12.345);
    expect(offsets.prb).toEqual({ x: 1.234, y: 5.678, z: 9.012 });
    expect(offsets.g55).toBeUndefined();
  });

  it('retorna objeto vazio sem linhas de offset', () => {
    expect(parseOffsets(['ok'])).toEqual({});
  });

  it('ignora vetores malformados sem quebrar', () => {
    const offsets = parseOffsets([
      '[G54:1.000]',
      '[G55:nao,numero]',
      '[G56:]',
      '[TLO:abc]',
    ]);

    expect(offsets).toEqual({});
  });
});

describe('parseStartupBlocks', () => {
  it('ignora `$N0=`/`$N1=` vazios (C1)', () => {
    expect(parseStartupBlocks(response('$N'))).toEqual([]);
  });

  it('lê blocos não vazios na ordem do índice', () => {
    expect(parseStartupBlocks(['$N1=G21', '$N0=G90 G54'])).toEqual([
      'G90 G54',
      'G21',
    ]);
  });

  it('tolera linhas que não são `$N`', () => {
    expect(parseStartupBlocks(['ok', '$N0=G17', 'error:3'])).toEqual(['G17']);
  });
});

describe('deriveFacts', () => {
  it('deriva a C1 a partir de parseSettings($$)', () => {
    const facts = deriveFacts(parseSettings(response('$$')));

    expect(facts.travel).toEqual({ x: 150, y: 130, z: 45 });
    expect(facts.maxRate).toEqual({ x: 10000, y: 10000, z: 500 });
    expect(facts.accel).toEqual({ x: 200, y: 200, z: 200 });
    expect(facts.stepsPerMm).toEqual({ x: 80, y: 80, z: 1600 });
    expect(facts.laserMode).toBe(true);
    expect(facts.sMax).toBe(1000);
    expect(facts.sMin).toBe(0);
    expect(facts.softLimits).toBe(false);
    expect(facts.hardLimits).toBe(true);
    expect(facts.homing).toBe(true);
    expect(facts.statusMask).toBe(1);
    expect(facts.reportInches).toBe(false);
    // A C1 não informa `$33` (PWM) nem startup blocks.
    expect(facts.pwmFreq).toBeUndefined();
    expect(facts.startupBlocks).toBeUndefined();
  });

  it('aceita Record<number, string>', () => {
    const facts = deriveFacts({
      30: '255',
      32: '0',
      130: '10',
      131: '20',
      132: '30',
    });

    expect(facts.sMax).toBe(255);
    expect(facts.laserMode).toBe(false);
    expect(facts.travel).toEqual({ x: 10, y: 20, z: 30 });
  });

  it('não inventa 0: campo ausente fica undefined', () => {
    const facts = deriveFacts({});

    expect(facts).toEqual({});
    expect(facts.travel).toBeUndefined();
    expect(facts.sMax).toBeUndefined();
    expect(facts.laserMode).toBeUndefined();
    expect(facts.homing).toBeUndefined();
  });

  it('só constrói o vetor quando os três eixos existem', () => {
    const facts = deriveFacts({ 130: '150', 131: '130' });

    expect(facts.travel).toBeUndefined();
  });

  it('guarda os blocos de inicialização quando informados', () => {
    expect(deriveFacts({}, ['G90 G54']).startupBlocks).toEqual(['G90 G54']);
    expect(deriveFacts({}, []).startupBlocks).toEqual([]);
  });
});

describe('buildMachineReport', () => {
  const rawSettings: Record<number, string> = {};
  const parsed = parseSettings(response('$$'));
  for (const [code, setting] of parsed) rawSettings[code] = setting.value;

  const input: MachineReportInput = {
    app: { name: 'GRBL Studio', version: '0.7.0' },
    transport: 'serial /dev/ttyACM0 @115200',
    firmware: parseFirmware(response('$I')),
    settings: rawSettings,
    facts: deriveFacts(parsed, parseStartupBlocks(response('$N'))),
    modal: parseModalState(response('$G')),
    offsets: parseOffsets(response('$#')),
    status: { state: 'Idle', mpos: { x: 0, y: 0, z: 0 } },
    alarms: ['ALARM:1'],
  };

  it('usa rótulos técnicos estáveis e não traduzidos', () => {
    const report = buildMachineReport(input);

    expect(report).toContain('app=GRBL Studio 0.7.0');
    expect(report).toContain('transport=serial /dev/ttyACM0 @115200');
    expect(report).toContain('firmware.version=1.3a');
    expect(report).toContain('firmware.build=20250324');
    // `[OPT:H]` da máquina real: o campo não pode sair vazio.
    expect(report).toContain('firmware.options=H');
    expect(report).toContain('modal.wcs=G54');
    expect(report).toContain('facts.travel=150,130,45');
    expect(report).toContain('facts.laserMode=1');
    expect(report).toContain('facts.softLimits=0');
    expect(report).toContain('facts.hardLimits=1');
    expect(report).toContain('settings.$130=150.000');
    expect(report).toContain('offsets.g54=0,0,0');
    expect(report).toContain('status.state=Idle');
    expect(report).toContain('alarm.0=ALARM:1');
  });

  it('pula o que não existe, sem erro', () => {
    const report = buildMachineReport({ app: { name: 'App', version: '1' } });

    expect(report).toBe('app=App 1');
    expect(report).not.toContain('firmware');
    expect(report).not.toContain('facts');
  });

  it('mantém a ordem do §7 entre as seções presentes', () => {
    const report = buildMachineReport(input);
    const order = [
      'firmware.version',
      'modal.wcs',
      'facts.travel',
      'facts.hardLimits',
      'facts.sMax',
      'settings.$',
      'offsets.g54',
      'status.state',
      'alarm.0',
    ];

    const positions = order.map((token) => report.indexOf(token));
    for (const position of positions)
      expect(position).toBeGreaterThanOrEqual(0);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('inclui os blocos de inicialização quando existem', () => {
    const report = buildMachineReport({
      app: { name: 'App', version: '1' },
      facts: { startupBlocks: ['G90 G54', 'G21'] },
    });

    expect(report).toContain('startup.0=G90 G54');
    expect(report).toContain('startup.1=G21');
  });
});
