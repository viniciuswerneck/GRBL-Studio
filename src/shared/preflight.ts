/**
 * Pré-voo antes de gravar (RF-MAQ-6 / P0.8) — regras **MX-1…MX-15**.
 *
 * Funções **puras**, sem I/O: recebem o G-code já carregado e os fatos da
 * máquina (`machine.ts`) e devolvem achados **sem texto de UI** — o renderer
 * traduz `preflight.<id>.title` / `.detail` e interpola `params`.
 *
 * Princípios (seguem `docs/PLANO_MAQUINA.md` §6):
 * - **Nunca falso positivo:** regra sem dado suficiente **não é emitida**.
 * - `block` só nos erros que o GRBL realmente rejeitaria (MX-2, MX-3, MX-6,
 *   MX-7); o resto é `warn`/`info`.
 * - Ordem estável: `block` → `warn` → `info`; empate pelo número do MX, sem
 *   duplicatas.
 *
 * Especificação: `docs/PLANO_MAQUINA.md` §6 (e §8 para os testes).
 */

import type {
  PreflightFix,
  PreflightInput,
  PreflightIssue,
  PreflightSeverity,
} from './machine';

/**
 * Informação extra (perfil/firmware/jog) que a UI já tem em mãos. Opcional: sem
 * ela as regras que dependem desses dados **não rodam** (MX-8, MX-11, MX-13,
 * MX-14) em vez de inventar.
 */
export interface PreflightContext {
  /** Perfil de máquina selecionado (`machines.ts`) — hoje só interessa o `$30`. */
  profile?: { sMax?: number };
  /** `$I` já parseado (`FirmwareInfo`) — opções e dimensionamento do buffer. */
  firmware?: {
    options?: { mist?: boolean };
    rxBufferSize?: number;
    plannerBlocks?: number;
  };
  /** Parâmetros de jog atuais (passo/avanço) — só avalia MX-11 quando presentes. */
  jog?: { step?: number; feed?: number };
}

/** Ordem de severidade na saída. */
const SEVERITY_RANK: Record<PreflightSeverity, number> = {
  block: 0,
  warn: 1,
  info: 2,
};

/** Tolerância (mm) para considerar que o cabeçote "voltou ao zero". */
const ZERO_EPS_MM = 1e-3;

/** Palavras `letra+valor`: aceita colada (`G1X10Y5F300`) ou com espaço. */
const WORD_RE = /([A-Za-z])\s*(-?(?:\d+\.?\d*|\.\d+))/g;

/** Comentários `(...)` (não aninhados) e `; …` até o fim da linha. */
function stripComments(raw: string): string {
  let out = '';
  let depth = 0;
  for (const c of raw) {
    if (c === ';' && depth === 0) break;
    if (c === '(') {
      depth++;
      continue;
    }
    if (c === ')') {
      if (depth > 0) depth--;
      continue;
    }
    if (depth === 0) out += c;
  }
  return out.trim();
}

interface Bounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

/** Fatos que o G-code sozinho revela (uma passada, modais inclusive). */
interface GcodeScan {
  /** Maior `S` pedido no job (`null` se nunca houve `S`). */
  maxS: number | null;
  /** O job liga o laser (`M3`/`M4`)? */
  usesLaserEnable: boolean;
  /** Códigos de refrigeração presentes (`M7`/`M8`). */
  coolantCodes: string[];
  /** O job seleciona polegadas (`G20`)? */
  usesInches: boolean;
  /** O job usa `G28`/`G30`? */
  usesHomeReturn: boolean;
  /** 1ª linha (1-based) de `G1` sem `F` e sem feed modal. */
  feedlessCutLine: number | null;
  /** 1ª linha (1-based) de `M3`/`M4` sem `S` estabelecido antes. */
  unsafeLaserLine: number | null;
  /** Caixa (mm) alcançada pelo job, incluindo a origem implícita. */
  bounds: Bounds | null;
  /** O job desloca (absoluto) de volta para `X0 Y0`. */
  returnsToOrigin: boolean;
}

/** Interpreta o G-code em uma passada, guardando só o que as regras usam. */
function scanGcode(lines: string[]): GcodeScan {
  const scan: GcodeScan = {
    maxS: null,
    usesLaserEnable: false,
    coolantCodes: [],
    usesInches: false,
    usesHomeReturn: false,
    feedlessCutLine: null,
    unsafeLaserLine: null,
    bounds: null,
    returnsToOrigin: false,
  };

  // Estado modal — defaults canônicos do GRBL (mm, absoluto, sem movimento).
  let motion = 0;
  let absolute = true;
  let inch = false;
  let feed: number | null = null;
  let sEstablished = false;
  let x = 0;
  let y = 0;

  const track = (px: number, py: number): void => {
    if (!scan.bounds) {
      scan.bounds = { xMin: px, xMax: px, yMin: py, yMax: py };
      return;
    }
    if (px < scan.bounds.xMin) scan.bounds.xMin = px;
    if (px > scan.bounds.xMax) scan.bounds.xMax = px;
    if (py < scan.bounds.yMin) scan.bounds.yMin = py;
    if (py > scan.bounds.yMax) scan.bounds.yMax = py;
  };

  for (let i = 0; i < lines.length; i++) {
    const clean = stripComments(lines[i] ?? '');
    if (!clean) continue;

    const gCodes: number[] = [];
    const mCodes: number[] = [];
    let sWord: number | null = null;
    let fWord: number | null = null;
    let xWord: number | null = null;
    let yWord: number | null = null;
    let zWord: number | null = null;

    for (const match of clean.matchAll(WORD_RE)) {
      const letter = match[1]!.toUpperCase();
      const value = Number(match[2]);
      if (!Number.isFinite(value)) continue;
      switch (letter) {
        case 'G':
          gCodes.push(value);
          break;
        case 'M':
          mCodes.push(value);
          break;
        case 'S':
          sWord = value;
          break;
        case 'F':
          fWord = value;
          break;
        case 'X':
          xWord = value;
          break;
        case 'Y':
          yWord = value;
          break;
        case 'Z':
          zWord = value;
          break;
        default:
          break;
      }
    }

    // Modais de unidades/distância e comandos de referência.
    for (const g of gCodes) {
      if (g === 20) {
        inch = true;
        scan.usesInches = true;
      } else if (g === 21) {
        inch = false;
      } else if (g === 90) {
        absolute = true;
      } else if (g === 91) {
        absolute = false;
      } else if (g === 28 || g === 30) {
        scan.usesHomeReturn = true;
      } else if (g === 0 || g === 1 || g === 2 || g === 3) {
        motion = g;
      }
    }

    // `S` estabelecido: conta mesmo antes do `M3/M4` na mesma linha (o GRBL
    // aplica a velocidade do spindle antes de ligá-lo).
    if (sWord !== null) {
      sEstablished = true;
      if (scan.maxS === null || sWord > scan.maxS) scan.maxS = sWord;
    }

    for (const m of mCodes) {
      if (m === 3 || m === 4) {
        scan.usesLaserEnable = true;
        if (scan.unsafeLaserLine === null && !sEstablished) {
          scan.unsafeLaserLine = i + 1;
        }
      } else if (m === 7 || m === 8) {
        scan.coolantCodes.push(`M${m}`);
      }
    }

    if (fWord !== null) feed = fWord;

    const hasCoord = xWord !== null || yWord !== null || zWord !== null;
    const isHome = gCodes.includes(28) || gCodes.includes(30);
    const isMove = hasCoord && !isHome;

    // MX-6: `G1` com coordenadas e sem feed (nem modal, nem na linha).
    if (motion === 1 && isMove && (feed === null || feed === 0)) {
      if (scan.feedlessCutLine === null) scan.feedlessCutLine = i + 1;
    }

    if (!isMove) continue;

    const px = x;
    const py = y;
    const factor = inch ? 25.4 : 1;

    if (absolute) {
      if (xWord !== null) x = xWord * factor;
      if (yWord !== null) y = yWord * factor;
    } else {
      if (xWord !== null) x += xWord * factor;
      if (yWord !== null) y += yWord * factor;
    }

    // A caixa inclui o ponto de partida (origem implícita do 1º movimento).
    track(px, py);
    track(x, y);

    if (absolute && (xWord !== null || yWord !== null)) {
      const atZero = Math.abs(x) <= ZERO_EPS_MM && Math.abs(y) <= ZERO_EPS_MM;
      const fromOutside =
        Math.abs(px) > ZERO_EPS_MM || Math.abs(py) > ZERO_EPS_MM;
      if (atZero && fromOutside) scan.returnsToOrigin = true;
    }
  }

  return scan;
}

/** Número do MX para desempate de ordenação (`MX-12` → 12). */
function mxNumber(id: string): number {
  const match = /(\d+)/.exec(id);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

/** Acumulador sem duplicatas + ordenação final estável. */
class IssueList {
  private readonly issues: PreflightIssue[] = [];
  private readonly seen = new Set<string>();

  add(
    id: string,
    severity: PreflightSeverity,
    params?: Record<string, string | number>,
    fix?: PreflightFix,
  ): void {
    if (this.seen.has(id)) return;
    this.seen.add(id);
    const issue: PreflightIssue = { id, severity };
    if (params) issue.params = params;
    if (fix) issue.fix = fix;
    this.issues.push(issue);
  }

  sorted(): PreflightIssue[] {
    return [...this.issues].sort((a, b) => {
      const bySeverity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
      if (bySeverity !== 0) return bySeverity;
      return mxNumber(a.id) - mxNumber(b.id);
    });
  }
}

/**
 * Roda as checagens de pré-voo sobre o G-code e os fatos da máquina.
 *
 * @param input G-code + `MachineFacts` + status (`Pn`) — tudo já coletado.
 * @param context Perfil/firmware/jog (opcional); sem ele as regras que dependem
 *   desse dado não são emitidas.
 * @returns Achados sem texto de UI, ordenados por severidade e MX.
 */
export function runPreflight(
  input: PreflightInput,
  context?: PreflightContext,
): PreflightIssue[] {
  const out = new IssueList();
  const scan = scanGcode(input.lines);
  const facts = input.facts;

  // MX-1 — `S` do job acima do teto da máquina (`$30`).
  if (
    facts?.sMax !== undefined &&
    scan.maxS !== null &&
    scan.maxS > facts.sMax
  ) {
    out.add(
      'MX-1',
      'warn',
      { s: scan.maxS, smax: facts.sMax },
      { kind: 'action', action: 'reduce-power' },
    );
  }

  // MX-2 — laser ligado sem modo laser (`$32=0`) → `error:17`.
  if (scan.usesLaserEnable && facts?.laserMode === false) {
    out.add('MX-2', 'block', undefined, {
      kind: 'setting',
      code: 32,
      value: '1',
    });
  }

  // MX-3 — caixa do job maior que o curso (`$130`/`$131`).
  if (scan.bounds && facts?.travel) {
    const travelX = facts.travel.x;
    const travelY = facts.travel.y;
    const overX =
      travelX > 0 ? scan.bounds.xMax - scan.bounds.xMin - travelX : 0;
    const overY =
      travelY > 0 ? scan.bounds.yMax - scan.bounds.yMin - travelY : 0;
    if (overX > 0 || overY > 0) {
      out.add(
        'MX-3',
        'block',
        { x: Math.max(0, round2(overX)), y: Math.max(0, round2(overY)) },
        { kind: 'action', action: 'fit-preview' },
      );
    }
  }

  // MX-4 — soft limits (`$20=1`) sem homing (`$22=0`) → `error:10`.
  if (facts?.softLimits === true && facts.homing === false) {
    out.add('MX-4', 'warn', undefined, {
      kind: 'setting',
      code: 22,
      value: '1',
    });
  }

  // MX-5 — job usa `G28`/`G30` sem home definido (`$22=0`).
  if (facts?.homing === false && scan.usesHomeReturn) {
    out.add('MX-5', 'warn', undefined, {
      kind: 'action',
      action: 'change-route',
    });
  }

  // MX-6 — `G1` sem feed (nem modal) → `error:22`.
  if (scan.feedlessCutLine !== null) {
    out.add(
      'MX-6',
      'block',
      { line: scan.feedlessCutLine },
      { kind: 'action', action: 'change-route' },
    );
  }

  // MX-7 — pino de segurança ativo (`Pn` com fim de curso ou porta).
  const pin = input.status?.pin;
  if (pin && /[xyzd]/i.test(pin)) {
    out.add('MX-7', 'block', { pin });
  }

  // MX-8 — `M7`/`M8` em firmware sem refrigeração (`OPT` sem `M`).
  const firmwareOptions = context?.firmware?.options;
  if (
    scan.coolantCodes.length > 0 &&
    firmwareOptions !== undefined &&
    firmwareOptions.mist !== true
  ) {
    out.add(
      'MX-8',
      'warn',
      { codes: scan.coolantCodes.join(' ') },
      {
        kind: 'action',
        action: 'change-route',
      },
    );
  }

  // MX-9 — job em polegadas (`G20`) com relatórios em mm (`$13=0`).
  if (scan.usesInches && facts?.reportInches === false) {
    out.add('MX-9', 'info');
  }

  // MX-10 — blocos de inicialização rodam a cada reset (`$N`).
  const startupBlocks = facts?.startupBlocks?.filter((b) => b.trim() !== '');
  if (startupBlocks && startupBlocks.length > 0) {
    out.add(
      'MX-10',
      'info',
      { n: startupBlocks.length },
      { kind: 'action', action: 'open-machine' },
    );
  }

  // MX-11 — jog (passo/avanço) fora do curso ou da velocidade máxima.
  if (context?.jog) {
    const step = context.jog.step;
    const feed = context.jog.feed;
    const travel = facts?.travel;
    const maxRate = facts?.maxRate;
    const params: Record<string, number> = {};
    let exceeds = false;
    if (step !== undefined && travel) {
      const limit = Math.min(travel.x, travel.y);
      if (limit > 0 && step > limit) {
        exceeds = true;
        params.step = step;
        params.area = limit;
      }
    }
    if (feed !== undefined && maxRate) {
      const limit = Math.min(maxRate.x, maxRate.y);
      if (limit > 0 && feed > limit) {
        exceeds = true;
        params.feed = feed;
        params.maxRate = limit;
      }
    }
    if (exceeds) {
      out.add('MX-11', 'warn', params, {
        kind: 'action',
        action: 'open-machine',
      });
    }
  }

  // MX-12 — 1º laser ligado sem `S`: o GRBL mantém o `S` da sessão anterior.
  if (scan.unsafeLaserLine !== null) {
    out.add(
      'MX-12',
      'warn',
      { line: scan.unsafeLaserLine },
      { kind: 'action', action: 'change-route' },
    );
  }

  // MX-13 — `$30` da máquina difere do `sMax` do perfil (RF-MAQ-10).
  const profileSMax = context?.profile?.sMax;
  if (
    facts?.sMax !== undefined &&
    profileSMax !== undefined &&
    facts.sMax !== profileSMax
  ) {
    out.add(
      'MX-13',
      'warn',
      { machine: facts.sMax, profile: profileSMax },
      { kind: 'action', action: 'open-machine' },
    );
  }

  // MX-14 — `OPT` sem `,blocos,buffer`: janela de envio no padrão (128 B).
  if (
    firmwareOptions !== undefined &&
    context?.firmware?.rxBufferSize === undefined
  ) {
    out.add('MX-14', 'info');
  }

  // MX-15 — com hard limits (`$21=1`), voltar a `X0 Y0` pode disparar alarme.
  if (facts?.hardLimits === true && scan.returnsToOrigin) {
    out.add('MX-15', 'warn', undefined, {
      kind: 'action',
      action: 'park',
    });
  }

  return out.sorted();
}

/** Arredonda o excedente para 2 casas (mm) — só para o `params` da UI. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
