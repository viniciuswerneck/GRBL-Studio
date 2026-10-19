import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Cobertura medida no núcleo do protocolo (P0.6: meta de 90 %).
      include: ['src/shared/protocol.ts', 'src/shared/preview.ts'],
      thresholds: {
        // Global: protocol.ts 100/97,8/100/100 e preview.ts 94,1/91,4/100/94,1
        // (statements/branches/functions/lines) deixam folga sobre 90 %.
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
        // O parser do protocolo é o núcleo crítico: exige 95 % em tudo
        // (medido: 100 % de linhas/funções/statements e 97,8 % de ramos).
        'src/shared/protocol.ts': {
          lines: 95,
          functions: 95,
          branches: 95,
          statements: 95,
        },
      },
    },
  },
});
