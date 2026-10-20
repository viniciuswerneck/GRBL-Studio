import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/shared/grblSettings';
import {
  DEFAULT_MACHINE_ID,
  MACHINE_PROFILES,
  findMachineProfile,
  lbdevToProfile,
  machineProfile,
  parseLbdev,
  parsePins,
  suggestMachineProfile,
  type MachineProfile,
} from '../src/shared/machines';

const HERE = fileURLToPath(new URL('.', import.meta.url));

/**
 * Coleta **somente leitura** da máquina real (Sculpfun C1, 18/10/2026) feita com
 * `scripts/probe-machine.mjs`. É a verdade contra a qual o perfil é conferido.
 */
const fixture = JSON.parse(
  readFileSync(`${HERE}fixtures/machine-sculpfun-c1.json`, 'utf8'),
) as { responses: Record<string, string[]> };

/** Valor de `$<code>` no bloco `$$` da coleta. */
function machineSetting(code: number): number | undefined {
  const line = fixture.responses.$$?.find((entry) =>
    entry.startsWith(`$${code}=`),
  );
  if (!line) return undefined;
  return Number(line.slice(line.indexOf('=') + 1));
}

describe('catálogo de perfis de máquina (RF-MAQ-10)', () => {
  it('tem ids únicos e não está vazio', () => {
    const ids = MACHINE_PROFILES.map((profile) => profile.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
  });

  it('tem todos os campos válidos', () => {
    for (const profile of MACHINE_PROFILES) {
      expect(['3W', '5W', '10W']).toContain(profile.module);
      expect(['M3', 'M4']).toContain(profile.mode);
      expect(profile.name.length).toBeGreaterThan(0);
      expect(profile.area[0]).toBeGreaterThanOrEqual(0);
      expect(profile.area[1]).toBeGreaterThanOrEqual(0);
      expect(profile.spot).toBeGreaterThan(0);
      expect(profile.lines).toBeGreaterThan(0);
      expect(typeof profile.homing).toBe('boolean');
      if (profile.sMax !== undefined) {
        expect(profile.sMax).toBeGreaterThan(0);
        expect(profile.sMax).toBeLessThanOrEqual(32767);
      }
      if (profile.pointPercent !== undefined) {
        expect(profile.pointPercent).toBeGreaterThan(0);
        expect(profile.pointPercent).toBeLessThanOrEqual(100);
      }
    }
  });

  it('só garante settings que existem no catálogo do GRBL, dentro da faixa', () => {
    for (const profile of MACHINE_PROFILES) {
      for (const [code, value] of Object.entries(profile.settings)) {
        const descriptor = CATALOG[Number(code)];
        expect(descriptor, `${profile.id} usa $${code}`).toBeDefined();
        if (typeof descriptor?.min === 'number') {
          expect(value, `${profile.id} $${code}`).toBeGreaterThanOrEqual(
            descriptor.min,
          );
        }
        if (typeof descriptor?.max === 'number') {
          expect(value, `${profile.id} $${code}`).toBeLessThanOrEqual(
            descriptor.max,
          );
        }
      }
    }
  });

  it('encontra o perfil pelo id e cai no padrão quando o id é desconhecido', () => {
    expect(findMachineProfile(DEFAULT_MACHINE_ID)?.id).toBe(DEFAULT_MACHINE_ID);
    expect(findMachineProfile('nao-existe')).toBeUndefined();
    expect(findMachineProfile(undefined)).toBeUndefined();
    expect(machineProfile('nao-existe').id).toBe(MACHINE_PROFILES[0].id);
    expect(machineProfile(DEFAULT_MACHINE_ID).id).toBe(DEFAULT_MACHINE_ID);
  });
});

describe('perfil Sculpfun C1 × máquina real', () => {
  const profile = machineProfile('sculpfun-c1');

  it('é o perfil padrão do app', () => {
    expect(MACHINE_PROFILES[0]?.id).not.toBe(undefined);
    expect(DEFAULT_MACHINE_ID).toBe('sculpfun-c1');
    expect(profile.id).toBe('sculpfun-c1');
  });

  it('declara o mesmo curso da máquina (`$130`/`$131`)', () => {
    expect(profile.area).toEqual([machineSetting(130), machineSetting(131)]);
  });

  it('declara o mesmo `S-max` da máquina (`$30`)', () => {
    expect(profile.sMax).toBe(machineSetting(30));
  });

  it('tem homing de fábrica porque a máquina tem `$22=1`', () => {
    // Regressão: o perfil dizia `homing: false`/`$22=0` e, aplicado com a
    // máquina conectada, **desligava** o homing.
    expect(machineSetting(22)).toBe(1);
    expect(profile.homing).toBe(true);
    expect(profile.settings[22]).toBe(machineSetting(22));
  });

  it('garante o modo laser e os limites que a máquina já usa', () => {
    expect(machineSetting(32)).toBe(1); // modo laser ligado
    for (const code of [20, 21, 32]) {
      expect(profile.settings[code]).toBe(machineSetting(code));
    }
  });

  it('usa o módulo 3 W enquanto `$30=1000`', () => {
    expect(profile.module).toBe('3W');
    expect(profile.sMax).toBe(1000);
  });

  it('só escreve `$` que o firmware da máquina realmente tem', () => {
    // Aplicar o perfil **escreve** na máquina: um código que o firmware não
    // conhece responde `error:3` — foi assim que a coleta real registrou uma
    // avalanche de `code 3` no histórico do usuário.
    const available = new Set(
      (fixture.responses.$$ ?? [])
        .map((line) => /^\$(\d+)=/.exec(line)?.[1])
        .filter((code): code is string => code !== undefined)
        .map((code) => Number(code)),
    );
    expect(available.size).toBeGreaterThan(20);
    for (const machine of MACHINE_PROFILES) {
      for (const code of Object.keys(machine.settings).map(Number)) {
        expect(
          available.has(code),
          `perfil ${machine.id} escreve $${code}, que a máquina não tem`,
        ).toBe(true);
      }
    }
  });

  it('conhece o firmware "enxuto" da C1: sem $27, $33, $37-40 nem $43-47', () => {
    // `$$` real da C1: 32 linhas, sem os settings de spindle/PWM e sem os
    // extras do grblHAL. O app degrada para "não informado" em vez de inventar.
    for (const code of [27, 28, 29, 33, 37, 38, 39, 40, 43, 44, 45, 46, 47]) {
      expect(machineSetting(code), `$${code}`).toBeUndefined();
    }
    expect(machineSetting(130)).toBe(150);
    expect(machineSetting(131)).toBe(130);
  });
});

describe('indicador de pinos do status (RF-MAQ-7)', () => {
  it('Pn ausente = o firmware não reporta pinos', () => {
    expect(parsePins(undefined)).toEqual({ reported: false, pins: [] });
  });

  it('Pn vazio = reporta, mas nenhum pino ativo', () => {
    expect(parsePins('')).toEqual({ reported: true, pins: [] });
    expect(parsePins('  ')).toEqual({ reported: true, pins: [] });
  });

  it('Pn com letras = pinos ativos, na ordem do firmware', () => {
    expect(parsePins('X')).toEqual({ reported: true, pins: ['X'] });
    expect(parsePins('XYZ')).toEqual({ reported: true, pins: ['X', 'Y', 'Z'] });
    expect(parsePins('p')).toEqual({ reported: true, pins: ['P'] });
    // O firmware real da C1 (`$10=1`) não manda `Pn` — cai no "não reportado".
    expect(parsePins(fixturePn())).toEqual({ reported: false, pins: [] });
  });
});

/** Extrai o campo `Pn` do status real da C1 (não existe em `$10=1`). */
function fixturePn(): string | undefined {
  const status = fixture.responses['?']?.[0] ?? '';
  const match = status.match(/(?:^|\|)Pn:([^|>]*)/);
  return match ? match[1] : undefined;
}

describe('smart connect — sugestão de perfil (P2.5)', () => {
  it('sugere o perfil quando o curso bate exatamente', () => {
    const suggestion = suggestMachineProfile({
      travel: { x: 150, y: 130 },
      sMax: 1000,
      homing: true,
    });
    expect(suggestion?.profile.id).toBe('sculpfun-c1');
    expect(suggestion?.reasons).toContain('area');
    expect(suggestion?.reasons).toContain('smax');
    expect(suggestion?.reasons).toContain('homing');
    expect(suggestion?.score).toBeGreaterThanOrEqual(90);
  });

  it('não sugere quando o curso é outro (o app gravaria limites errados)', () => {
    expect(
      suggestMachineProfile({ travel: { x: 137, y: 121 } }),
    ).toBeUndefined();
  });

  it('não sugere sem curso conhecido', () => {
    expect(suggestMachineProfile({})).toBeUndefined();
    expect(suggestMachineProfile({ travel: { x: 0, y: 0 } })).toBeUndefined();
  });

  it('nunca sugere o perfil genérico', () => {
    for (const profile of MACHINE_PROFILES) {
      const suggestion = suggestMachineProfile({
        travel: { x: profile.area[0] || 999, y: profile.area[1] || 999 },
      });
      if (suggestion) expect(suggestion.profile.id).not.toBe('generic');
    }
  });

  it('desempata perfis de mesmo curso pelo teto de S e pelo homing', () => {
    const profiles: MachineProfile[] = [
      {
        id: 'a',
        name: 'A',
        module: '5W',
        area: [400, 400],
        homing: true,
        spot: 0.08,
        lines: 10,
        mode: 'M4',
        sMax: 1000,
        settings: {},
      },
      {
        id: 'b',
        name: 'B',
        module: '5W',
        area: [400, 400],
        homing: false,
        spot: 0.08,
        lines: 10,
        mode: 'M4',
        sMax: 255,
        settings: {},
      },
    ];
    const suggestion = suggestMachineProfile(
      { travel: { x: 400, y: 400 }, sMax: 255, homing: false },
      profiles,
    );
    expect(suggestion?.profile.id).toBe('b');
  });
});

describe('import `.lbdev` do LightBurn (P2.5)', () => {
  const lbdev = JSON.stringify({
    DeviceList: [
      {
        DisplayName: 'Meu laser',
        Name: 'GRBL',
        Type: 'Serial',
        Width: 508,
        Height: 390,
        HomeOnStartup: true,
        Settings: { S_Scale: 1000, BaudRate: 115200, CommPort: 'COM3' },
      },
    ],
  });

  it('lê o dispositivo do arquivo', () => {
    const result = parseLbdev(lbdev);
    expect(result.error).toBeUndefined();
    expect(result.devices).toHaveLength(1);
    expect(result.devices[0].name).toBe('Meu laser');
    expect(result.devices[0].controller).toBe('GRBL');
    expect(result.devices[0].area).toEqual([508, 390]);
    expect(result.devices[0].homing).toBe(true);
    expect(result.devices[0].sMax).toBe(1000);
  });

  it('recusa JSON inválido e arquivo sem dispositivos', () => {
    expect(parseLbdev('isto não é json').error).toBe('invalid-json');
    expect(parseLbdev('{}').error).toBe('no-device');
    expect(parseLbdev('{"DeviceList":[]}').error).toBe('no-device');
  });

  it('converte o dispositivo em perfil local (sem tocar no catálogo)', () => {
    const device = parseLbdev(lbdev).devices[0];
    const profile = lbdevToProfile(device, 'imported');
    expect(profile.id).toBe('imported');
    expect(profile.name).toBe('Meu laser');
    expect(profile.area).toEqual([508, 390]);
    expect(profile.homing).toBe(true);
    expect(profile.sMax).toBe(1000);
    // O curso importado vira `$130`/`$131` (o valor que o app escreve).
    expect(profile.settings[130]).toBe(508);
    expect(profile.settings[131]).toBe(390);
    expect(profile.settings[32]).toBe(1);
  });
});

describe('catálogo 30+ (P2.5)', () => {
  it('tem 30+ perfis (com o genérico)', () => {
    expect(MACHINE_PROFILES.length).toBeGreaterThanOrEqual(30);
  });

  it('os perfis novos têm o curso publicado pelo fabricante', () => {
    const expected: Record<string, [number, number]> = {
      'ortur-aufero1': [180, 180],
      'ortur-lm2-pro': [400, 400],
      'xtool-d1-pro': [432, 406],
      'atomstack-a5-pro-v2': [400, 400],
      'twotrees-tt55': [300, 300],
      'neje-master2-plus': [255, 440],
      'neje-3': [170, 170],
    };
    for (const [id, area] of Object.entries(expected)) {
      const profile = findMachineProfile(id);
      expect(profile, `perfil ${id}`).toBeDefined();
      expect(profile?.area, `curso de ${id}`).toEqual(area);
      // O curso do perfil é o que vira `$130`/`$131` — tem de bater.
      expect(profile?.settings[130], `$130 de ${id}`).toBe(area[0]);
      expect(profile?.settings[131], `$131 de ${id}`).toBe(area[1]);
    }
  });
});
