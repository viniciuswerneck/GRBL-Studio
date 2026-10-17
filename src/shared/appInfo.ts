/**
 * Identidade do aplicativo (RF-APP-6/7) — constantes de metadados lidas pelo
 * `main` e repassadas ao renderer via IPC `app:info`.
 *
 * `version` NÃO mora aqui: o main usa `app.getVersion()` (lido do
 * package.json no build/empacotamento). Os campos abaixo espelham o
 * `package.json` (`name`/`author`/`license`/`description`) e só mudam junto
 * com ele.
 */

export const APP_NAME = 'GRBL Studio';
export const APP_AUTHOR = 'Vinicius Werneck';
export const APP_LICENSE = 'MIT';
/** Site institucional (WerneckLab). */
export const APP_URL = 'https://lab.werneck.dev.br/';
/** Repositório público (sem o sufixo `.git`). */
export const APP_REPOSITORY = 'https://github.com/viniciuswerneck/GRBL-Studio';

/**
 * hosts permitidos em `app:open-external`. Whitelist estrita: nada de
 * `file:`, `javascript:` ou domínios arbitrários vindos do renderer
 * (invariante de segurança do AGENTS.md).
 */
export const ALLOWED_EXTERNAL_HOSTS: readonly string[] = [
  'lab.werneck.dev.br',
  'github.com',
];

/** `true` quando `value` é uma URL **https** de host liberado. */
export function isAllowedExternalUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  // Só `https:` — nada de `http:`, `file:`, `javascript:`, `data:`…
  if (parsed.protocol !== 'https:') return false;
  return ALLOWED_EXTERNAL_HOSTS.some(
    (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`),
  );
}
