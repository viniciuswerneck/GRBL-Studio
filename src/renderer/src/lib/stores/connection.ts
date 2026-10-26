/**
 * Store de conexão — estado reativo Svelte 5 (runes) para window.grbl IPC.
 * Centraliza: portas, conexão, status, jog, job, console, overrides.
 */

import { grbl } from '../../../../../preload/index'; // types only
import type {
  PortInfo,
  ConnectOptions,
  GrblStatus,
  JobInfo,
  JobProgress,
  ConsoleLine,
  ErrorPayload,
  JogCommand,
  OverrideAction,
  RapidOverrideLevel,
} from '../../../../../src/shared/types';

// ===== Tipos locais =====
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

interface PortOption {
  path: string;
  label: string;
}

interface BaudOption {
  value: number;
  label: string;
}

interface MachineProfile {
  id: string;
  name: string;
  category: string;
  area: { x: number; y: number; z?: number };
  homing: boolean;
  laserModule: string;
  sMax: number;
  settings: Record<number, number>;
  notes?: string;
}

// ===== Store reativo (runes) =====
class ConnectionStore {
  // Estado bruto
  ports = $state<PortOption[]>([]);
  bauds = $state<BaudOption[]>([
    { value: 9600, label: '9600' },
    { value: 115200, label: '115200' },
    { value: 230400, label: '230400' },
    { value: 250000, label: '250000' },
    { value: 500000, label: '500000' },
    { value: 921600, label: '921600' },
  ]);

  machineProfiles = $state<MachineProfile[]>([]);
  selectedProfile = $state<MachineProfile | null>(null);

  selectedPort = $state<string>('');
  selectedBaud = $state<number>(115200);

  connectionState = $state<ConnectionState>('disconnected');
  connectError = $state<string | null>(null);

  // Status GRBL
  grblStatus = $state<GrblStatus | null>(null);
  lastStatusAt = $state<number>(0);

  // Job
  job = $state<JobInfo>({ state: 'idle', sent: 0, total: 0 });

  // Console
  consoleLines = $state<ConsoleLine[]>([]);
  consolePaused = $state<boolean>(false);
  consoleFilter = $state<'all' | 'sent' | 'received' | 'errors'>('all');

  // Overrides
  feedOverride = $state<number>(100);
  spindleOverride = $state<number>(100);
  rapidOverride = $state<'default' | 'medium' | 'low'>('default');

  // Alarmes/Erros
  alarmHistory = $state<ErrorPayload[]>([]);
  currentAlarm = $state<ErrorPayload | null>(null);

  // Unsubscribers para cleanup
  #unsubs: (() => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined' && window.grbl) {
      this.#initListeners();
    }
  }

  #initListeners() {
    const api = window.grbl;

    this.#unsubs.push(
      api.onStatus((status: GrblStatus) => {
        this.grblStatus = status;
        this.lastStatusAt = Date.now();
        // Atualiza overrides do status
        if (status.ov) {
          this.feedOverride = status.ov[0] ?? 100;
          this.spindleOverride = status.ov[1] ?? 100;
        }
      }),
    );

    this.#unsubs.push(
      api.onJob((job: JobInfo) => {
        this.job = job;
      }),
    );

    this.#unsubs.push(
      api.onProgress((progress: JobProgress) => {
        this.job = { ...this.job, sent: progress.sent, total: progress.total };
      }),
    );

    this.#unsubs.push(
      api.onConsole((line: ConsoleLine) => {
        if (!this.consolePaused) {
          this.consoleLines = [...this.consoleLines.slice(-999), line]; // max 1000
        }
      }),
    );

    this.#unsubs.push(
      api.onConnection((state: ConnectionState) => {
        this.connectionState = state;
        if (state === 'disconnected') {
          this.grblStatus = null;
          this.job = { state: 'idle', sent: 0, total: 0 };
        }
      }),
    );

    this.#unsubs.push(
      api.onError((err: ErrorPayload) => {
        if (err.kind === 'alarm') {
          this.currentAlarm = err;
          this.alarmHistory = [...this.alarmHistory.slice(-49), err];
        }
      }),
    );
  }

  // ===== Actions =====

  async loadPorts() {
    try {
      const ports = await window.grbl.listPorts();
      this.ports = ports.map((p) => ({
        path: p.path,
        label: p.path + (p.manufacturer ? ` (${p.manufacturer})` : ''),
      }));
      // Seleciona primeira se nenhuma selecionada
      if (!this.selectedPort && this.ports.length > 0) {
        this.selectedPort = this.ports[0].path;
      }
    } catch (e) {
      console.error('[ConnectionStore] Falha ao listar portas:', e);
    }
  }

  async loadMachineProfiles() {
    try {
      // Carrega do bundle GRBL_MACHINES (public/machines.js)
      if (typeof window !== 'undefined' && (window as any).GRBL_MACHINES) {
        const data = (window as any).GRBL_MACHINES;
        this.machineProfiles = data.profiles || [];
        // Seleciona genérico por padrão
        const generic = this.machineProfiles.find((p) => p.id === 'generic');
        if (generic) this.selectedProfile = generic;
      }
    } catch (e) {
      console.error('[ConnectionStore] Falha ao carregar perfis:', e);
    }
  }

  async connect() {
    if (!this.selectedPort) return false;
    if (
      this.connectionState === 'connecting' ||
      this.connectionState === 'connected'
    )
      return false;

    this.connectionState = 'connecting';
    this.connectError = null;

    const opts: ConnectOptions = {
      kind: 'serial',
      path: this.selectedPort,
      baudRate: this.selectedBaud,
    };

    try {
      const ok = await window.grbl.connect(opts);
      if (ok) {
        this.connectionState = 'connected';
        // Carrega snapshot da máquina se houver perfil
        if (this.selectedProfile) {
          try {
            await window.grbl.machineSnapshot();
          } catch {
            /* ignore */
          }
        }
      }
      return ok;
    } catch (e) {
      this.connectError = e instanceof Error ? e.message : String(e);
      this.connectionState = 'error';
      return false;
    }
  }

  async disconnect() {
    try {
      await window.grbl.disconnect();
      this.connectionState = 'disconnected';
      this.grblStatus = null;
      this.job = { state: 'idle', sent: 0, total: 0 };
    } catch (e) {
      console.error('[ConnectionStore] Erro ao desconectar:', e);
    }
  }

  // Console
  clearConsole() {
    this.consoleLines = [];
  }
  toggleConsolePause() {
    this.consolePaused = !this.consolePaused;
  }
  setConsoleFilter(f: 'all' | 'sent' | 'received' | 'errors') {
    this.consoleFilter = f;
  }
  async sendConsoleLine(line: string) {
    await window.grbl.writeLine(line);
  }

  // Job
  async startJob(lines: string[], name?: string) {
    await window.grbl.startJob(lines, name);
  }
  async pauseJob() {
    await window.grbl.pauseJob();
  }
  async resumeJob() {
    await window.grbl.resumeJob();
  }
  async stopJob() {
    await window.grbl.stopJob();
  }

  // Jog
  async jog(cmd: JogCommand) {
    await window.grbl.jog(cmd);
  }
  async cancelJog() {
    await window.grbl.cancelJog();
  }
  async home() {
    await window.grbl.home();
  }
  async unlock() {
    await window.grbl.unlock();
    this.currentAlarm = null;
  }
  async reset() {
    await window.grbl.reset();
  }
  async setOrigin(x = 0, y = 0, z = 0) {
    await window.grbl.setOrigin(x, y, z);
  }
  async gotoZero() {
    await window.grbl.gotoZero();
  }

  // Overrides
  async overrideFeed(action: OverrideAction) {
    await window.grbl.overrideFeed(action);
  }
  async overrideSpindle(action: OverrideAction) {
    await window.grbl.overrideSpindle(action);
  }
  async overrideRapid(level: RapidOverrideLevel) {
    await window.grbl.overrideRapid(level);
  }

  // Cleanup
  destroy() {
    this.#unsubs.forEach((u) => {
      u();
    });
    this.#unsubs = [];
  }

  // Derived (computed)
  get filteredConsoleLines() {
    if (this.consoleFilter === 'all') return this.consoleLines;
    return this.consoleLines.filter((l) => {
      if (this.consoleFilter === 'sent') return l.direction === 'out';
      if (this.consoleFilter === 'received')
        return l.direction === 'in' && l.kind !== 'error';
      if (this.consoleFilter === 'errors')
        return l.kind === 'error' || l.kind === 'alarm';
      return true;
    });
  }

  get isConnected() {
    return this.connectionState === 'connected';
  }
  get isJobRunning() {
    return this.job.state === 'running';
  }
  get isJobPaused() {
    return this.job.state === 'paused';
  }
  get jobProgress() {
    return this.job.total > 0 ? (this.job.sent / this.job.total) * 100 : 0;
  }
}

// Singleton
export const connectionStore = new ConnectionStore();
