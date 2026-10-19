import { describe, expect, it } from 'vitest';
import type { MachineFacts, PreflightIssue } from '../src/shared/machine';
import { runPreflight } from '../src/shared/preflight';

/**
 * Fatos "limpos" (Sculpfun C1, `docs/PLANO_MAQUINA.md` §11): cada fixture troca
 * só o campo que a regra em teste precisa — assim um job realmente limpo não
 * dispara nada e cada regra tem um teste isolado.
 */
const FACTS: MachineFacts = {
  travel: [150, 130, 45],
  maxRate: [10000, 10000, 500],
  laserMode: true,
  sMax: 1000,
  softLimits: false,
  hardLimits: true,
  homing: true,
  reportInches: false,
  startupBlocks: [],
};

/** Job mínimo e correto: liga o laser com `S`, move e desliga. */
const CLEAN_LINES = ['M4 S500', 'G1 X10 Y10 F1000', 'M5'];

function ids(issues: PreflightIssue[]): string[] {
  return issues.map((issue) => issue.id);
}

function run(
  lines: string[],
  over: Partial<Parameters<typeof runPreflight>[0]> = {},
  context?: Parameters<typeof runPreflight>[1],
): PreflightIssue[] {
  return runPreflight({ lines, facts: FACTS, ...over }, context);
}

describe('runPreflight — regras MX-1…MX-15 (RF-MAQ-6)', () => {
  it('não emite nada em um job limpo', () => {
    expect(run(CLEAN_LINES)).toEqual([]);
  });

  it('MX-1: avisa quando o `S` do job passa de `$30`', () => {
    const issues = run(['M4 S1200', 'G1 X5 F500']);
    expect(ids(issues)).toEqual(['MX-1']);
    expect(issues[0]!.severity).toBe('warn');
    expect(issues[0]!.params).toEqual({ s: 1200, smax: 1000 });
    expect(issues[0]!.fix).toEqual({ kind: 'action', action: 'reduce-power' });
  });

  it('MX-2: bloqueia `M3/M4` sem modo laser (`$32=0`)', () => {
    const issues = run(['M4 S500', 'G1 X5 F500'], {
      facts: { ...FACTS, laserMode: false },
    });
    expect(ids(issues)).toEqual(['MX-2']);
    expect(issues[0]!.severity).toBe('block');
    expect(issues[0]!.fix).toEqual({ kind: 'setting', code: 32, value: '1' });
  });

  it('MX-3: bloqueia quando a caixa do job não cabe no curso', () => {
    const issues = run(['M4 S500', 'G1 X30 Y5 F500'], {
      facts: { ...FACTS, travel: [20, 20, 45] },
    });
    expect(ids(issues)).toEqual(['MX-3']);
    expect(issues[0]!.severity).toBe('block');
    expect(issues[0]!.params).toEqual({ x: 10, y: 0 });
    expect(issues[0]!.fix).toEqual({ kind: 'action', action: 'fit-preview' });
  });

  it('MX-4: avisa quando `$20=1` sem homing (`$22=0`)', () => {
    const issues = run(CLEAN_LINES, {
      facts: { ...FACTS, softLimits: true, homing: false },
    });
    expect(ids(issues)).toEqual(['MX-4']);
    expect(issues[0]!.fix).toEqual({ kind: 'setting', code: 22, value: '1' });
  });

  it('MX-5: avisa `G28/G30` sem home definido (`$22=0`)', () => {
    const issues = run(['G28', 'M4 S500', 'G1 X5 F500'], {
      facts: { ...FACTS, homing: false },
    });
    expect(ids(issues)).toEqual(['MX-5']);
    expect(issues[0]!.severity).toBe('warn');
  });

  it('MX-6: bloqueia `G1` sem feed', () => {
    const issues = run(['G1 X5 Y5']);
    expect(ids(issues)).toEqual(['MX-6']);
    expect(issues[0]!.severity).toBe('block');
    expect(issues[0]!.params).toEqual({ line: 1 });
  });

  it('MX-7: bloqueia quando há pino de segurança ativo (`Pn`)', () => {
    const issues = run(CLEAN_LINES, { status: { pin: 'XPD' } });
    expect(ids(issues)).toEqual(['MX-7']);
    expect(issues[0]!.severity).toBe('block');
    expect(issues[0]!.params).toEqual({ pin: 'XPD' });
  });

  it('MX-8: avisa `M7/M8` em firmware sem refrigeração (`OPT` sem `M`)', () => {
    const issues = run(
      ['M8', 'M4 S500', 'G1 X5 F500'],
      {},
      {
        firmware: { options: { mist: false }, rxBufferSize: 128 },
      },
    );
    expect(ids(issues)).toEqual(['MX-8']);
    expect(issues[0]!.params).toEqual({ codes: 'M8' });
  });

  it('MX-9: informa `G20` com relatórios em mm (`$13=0`)', () => {
    const issues = run(['G20', 'M4 S500', 'G1 X0.5 Y0.5 F20']);
    expect(ids(issues)).toEqual(['MX-9']);
    expect(issues[0]!.severity).toBe('info');
  });

  it('MX-10: informa blocos de inicialização (`$N`)', () => {
    const issues = run(CLEAN_LINES, {
      facts: { ...FACTS, startupBlocks: ['G90', 'M5'] },
    });
    expect(ids(issues)).toEqual(['MX-10']);
    expect(issues[0]!.severity).toBe('info');
    expect(issues[0]!.params).toEqual({ n: 2 });
  });

  it('MX-11: avisa jog com passo maior que o curso (só com contexto)', () => {
    const issues = run(CLEAN_LINES, {}, { jog: { step: 200 } });
    expect(ids(issues)).toEqual(['MX-11']);
    expect(issues[0]!.params).toEqual({ step: 200, area: 130 });
  });

  it('MX-12: avisa o 1º laser ligado sem `S` estabelecido', () => {
    const issues = run(['M4', 'G1 X5 F500']);
    expect(ids(issues)).toEqual(['MX-12']);
    expect(issues[0]!.severity).toBe('warn');
    expect(issues[0]!.params).toEqual({ line: 1 });
  });

  it('MX-13: avisa `$30` da máquina diferente do `sMax` do perfil', () => {
    const issues = run(CLEAN_LINES, {}, { profile: { sMax: 500 } });
    expect(ids(issues)).toEqual(['MX-13']);
    expect(issues[0]!.params).toEqual({ machine: 1000, profile: 500 });
  });

  it('MX-14: informa `OPT` sem buffer RX', () => {
    const issues = run(CLEAN_LINES, {}, { firmware: { options: {} } });
    expect(ids(issues)).toEqual(['MX-14']);
    expect(issues[0]!.severity).toBe('info');
  });

  it('MX-15: avisa retorno a `X0 Y0` com hard limits (`$21=1`)', () => {
    const issues = run(['M4 S500', 'G1 X10 Y10 F500', 'M5', 'G0 X0 Y0']);
    expect(ids(issues)).toEqual(['MX-15']);
    expect(issues[0]!.severity).toBe('warn');
    expect(issues[0]!.fix).toEqual({ kind: 'action', action: 'park' });
  });
});

describe('runPreflight — ordenação e robustez', () => {
  it('ordena por severidade (block → warn → info) e pelo número do MX', () => {
    const issues = run(
      ['G20', 'M4 S500', 'G1 X5 F500'],
      {
        facts: {
          ...FACTS,
          laserMode: false,
          softLimits: true,
          homing: false,
          startupBlocks: ['G90'],
        },
      },
      { profile: { sMax: 1000 } },
    );
    // MX-2 (block) · MX-4 (warn) · MX-9/MX-10 (info).
    expect(ids(issues)).toEqual(['MX-2', 'MX-4', 'MX-9', 'MX-10']);
  });

  it('não duplica um MX que ocorreria várias vezes', () => {
    const issues = run(['G1 X5', 'G1 X6', 'G1 X7']);
    expect(ids(issues)).toEqual(['MX-6']);
  });

  it('sem fatos → não inventa regras que dependem da máquina', () => {
    const issues = runPreflight({
      lines: ['M4 S9999', 'G1 X9999 F100'],
    });
    expect(issues).toEqual([]);
  });

  it('ignora comentários e linhas vazias', () => {
    const issues = run([
      '; cabeçalho',
      'M4 S500 (laser)',
      '',
      '   ',
      'G1 X10 Y10 F1000',
      'M5',
    ]);
    expect(issues).toEqual([]);
  });

  it('não emite MX-11/MX-13/MX-14 sem contexto', () => {
    const issues = run(CLEAN_LINES);
    expect(ids(issues)).not.toContain('MX-11');
    expect(ids(issues)).not.toContain('MX-13');
    expect(ids(issues)).not.toContain('MX-14');
  });
});
