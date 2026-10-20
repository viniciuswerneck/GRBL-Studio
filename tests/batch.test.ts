/**
 * Lote / dados variáveis (RF-SYM-10): parsing da planilha, modelo de campos e
 * montagem das peças. Módulo puro — nada de DOM nem de máquina.
 */
import { describe, expect, it } from 'vitest';
import {
  BATCH_DEFAULT_TEMPLATE,
  BATCH_MAX_CELL_CHARS,
  BATCH_MAX_COLUMNS,
  BATCH_MAX_PREF_CHARS,
  BATCH_MAX_ROWS,
  batchFields,
  batchPieceFileName,
  batchPieceLabel,
  batchPieces,
  batchSerial,
  batchTotal,
  detectDelimiter,
  detectHasHeader,
  parseBatchTable,
  parseBatchTemplate,
  renderBatchContent,
  sanitizeBatchPrefs,
  validateBatchTemplate,
} from '../src/shared/batch';

describe('detectDelimiter', () => {
  it('reconhece vírgula, ponto e vírgula, tabulação e barra', () => {
    expect(detectDelimiter('a,b\nc,d')).toBe(',');
    expect(detectDelimiter('a;b\nc;d')).toBe(';');
    expect(detectDelimiter('a\tb\nc\td')).toBe('\t');
    expect(detectDelimiter('a|b\nc|d')).toBe('|');
  });

  it('ignora separadores dentro de aspas', () => {
    expect(detectDelimiter('"Ana; Silva";cargo\n"Bia";cargo2')).toBe(';');
  });

  it('cai na vírgula quando não há separador', () => {
    expect(detectDelimiter('Ana\nBia')).toBe(',');
    expect(detectDelimiter('')).toBe(',');
  });
});

describe('detectHasHeader', () => {
  it('reconhece cabeçalho quando a 1ª linha não é numérica', () => {
    expect(
      detectHasHeader([
        ['nome', 'cargo'],
        ['Ana', 'Dev'],
      ]),
    ).toBe(true);
  });

  it('não confunde dados com cabeçalho', () => {
    expect(
      detectHasHeader([
        ['1', 'Ana'],
        ['2', 'Bia'],
      ]),
    ).toBe(false);
    expect(detectHasHeader([['Ana', '']])).toBe(false);
    expect(detectHasHeader([['nome', 'cargo']])).toBe(false);
  });
});

describe('parseBatchTable', () => {
  it('lê CSV com cabeçalho, aspas e CRLF', () => {
    const table = parseBatchTable(
      'nome,cargo\r\n"Ana; Silva","Dev, sênior"\r\nBia,Designer\r\n',
    );
    expect(table.delimiter).toBe(',');
    expect(table.hasHeader).toBe(true);
    expect(table.header).toEqual(['nome', 'cargo']);
    expect(table.rows).toEqual([
      ['Ana; Silva', 'Dev, sênior'],
      ['Bia', 'Designer'],
    ]);
    expect(table.width).toBe(2);
    expect(batchTotal(table)).toBe(2);
  });

  it('aceita aspas escapadas ("") e células vazias', () => {
    const table = parseBatchTable('a\n"diz ""oi"""\n\nBia\n');
    expect(table.rows).toEqual([['diz "oi"'], ['Bia']]);
  });

  it('respeita o separador e o cabeçalho forçados', () => {
    const table = parseBatchTable('Ana|Dev\nBia|Designer', {
      delimiter: '|',
      hasHeader: true,
    });
    expect(table.header).toEqual(['Ana', 'Dev']);
    expect(table.rows).toEqual([['Bia', 'Designer']]);
  });

  it('trata planilha só com dados (sem cabeçalho)', () => {
    const table = parseBatchTable('1,Ana\n2,Bia');
    expect(table.hasHeader).toBe(false);
    // Sem cabeçalho não há nomes: os campos vêm da posição (`{1}`, `{2}`).
    expect(table.header).toEqual(['', '']);
    expect(batchFields(table)).toEqual(['1', '2']);
    expect(table.rows).toHaveLength(2);
  });

  it('apara espaços das pontas e remove BOM', () => {
    const table = parseBatchTable('\uFEFFnome, cargo\n Ana , Dev ');
    expect(table.header).toEqual(['nome', 'cargo']);
    expect(table.rows).toEqual([['Ana', 'Dev']]);
  });

  it('limita linhas, colunas e o tamanho da célula', () => {
    const many = `${Array.from({ length: BATCH_MAX_ROWS + 5 }, (_, i) => `p${i}`).join('\n')}`;
    const big = parseBatchTable(many, { hasHeader: false });
    expect(big.rows).toHaveLength(BATCH_MAX_ROWS);
    expect(big.droppedRows).toBe(5);

    const wide = parseBatchTable(
      Array.from({ length: BATCH_MAX_COLUMNS + 3 }, (_, i) => `c${i}`).join(
        ',',
      ),
    );
    expect(wide.width).toBe(BATCH_MAX_COLUMNS);

    const long = parseBatchTable(`x,${'a'.repeat(BATCH_MAX_CELL_CHARS + 10)}`);
    expect(long.rows[0][1]).toHaveLength(BATCH_MAX_CELL_CHARS);
    expect(long.truncatedCells).toBe(1);
  });

  it('não cria peça para arquivo vazio', () => {
    const table = parseBatchTable('   \n\n');
    expect(table.rows).toEqual([]);
    expect(batchTotal(table)).toBe(0);
  });
});

describe('parseBatchTemplate', () => {
  it('separa texto, colunas, contador e total', () => {
    const { tokens, errors } = parseBatchTemplate('{1} - {i:03} ({total})');
    expect(errors).toEqual([]);
    expect(tokens).toEqual([
      { kind: 'column', raw: '1', index: 0 },
      { kind: 'text', value: ' - ' },
      { kind: 'counter', raw: 'i:03', width: 3 },
      { kind: 'text', value: ' (' },
      { kind: 'total', raw: 'total' },
      { kind: 'text', value: ')' },
    ]);
  });

  it('aceita campo por nome e ignora maiúsculas/espaços', () => {
    const { tokens } = parseBatchTemplate('{ Nome }');
    expect(tokens).toEqual([
      { kind: 'column', raw: 'Nome', index: -1, name: 'nome' },
    ]);
  });

  it('escapa chaves literais com {{ e }}', () => {
    const { tokens, errors } = parseBatchTemplate('{{i}}={i} }}');
    expect(errors).toEqual([]);
    expect(tokens).toEqual([
      { kind: 'text', value: '{i}=' },
      { kind: 'counter', raw: 'i' },
      { kind: 'text', value: ' }' },
    ]);
  });

  it('aponta chave sem fechamento e contador inválido', () => {
    expect(parseBatchTemplate('{1').errors).toEqual([
      { code: 'unclosed', token: '{1' },
    ]);
    expect(parseBatchTemplate('{i:abc}').errors).toEqual([
      { code: 'bad-counter', token: '{i:abc}' },
    ]);
    expect(parseBatchTemplate('{i:99}').errors[0].code).toBe('bad-counter');
  });
});

describe('validateBatchTemplate', () => {
  const table = parseBatchTable('nome,cargo\nAna,Dev\nBia,QA');

  it('aceita colunas por posição e por nome', () => {
    expect(validateBatchTemplate('{1} {cargo}', table).ok).toBe(true);
    expect(validateBatchTemplate('{3}', table).errors).toEqual([
      { code: 'bad-column', token: '{3}' },
    ]);
    expect(validateBatchTemplate('{sobrenome}', table).errors).toEqual([
      { code: 'unknown-field', token: '{sobrenome}' },
    ]);
  });

  it('acusa modelo vazio', () => {
    const result = validateBatchTemplate('   ', table);
    expect(result.ok).toBe(false);
    expect(result.errors[0].code).toBe('empty');
  });

  it('lista os campos disponíveis', () => {
    expect(validateBatchTemplate('{1}', table).fields).toEqual([
      'nome',
      'cargo',
    ]);
  });
});

describe('renderBatchContent', () => {
  const table = parseBatchTable('nome,cargo\nAna,Dev\nBia,QA');

  it('monta o conteúdo com colunas, contador e total', () => {
    const content = renderBatchContent(
      '{nome}/{cargo}/{i:03}/{total}',
      table.rows[1],
      {
        index: 2,
        total: 50,
        header: table.header,
      },
    );
    expect(content).toBe('Bia/QA/002/50');
  });

  it('campo desconhecido ou coluna inexistente vira vazio (sem exceção)', () => {
    expect(renderBatchContent('{x}-{9}', ['Ana'], { index: 1, total: 1 })).toBe(
      '-',
    );
  });

  it('devolve o modelo padrão como a 1ª coluna', () => {
    expect(BATCH_DEFAULT_TEMPLATE).toBe('{1}');
    expect(
      renderBatchContent(BATCH_DEFAULT_TEMPLATE, ['Ana', 'Dev'], {
        index: 1,
        total: 2,
      }),
    ).toBe('Ana');
  });
});

describe('batchSerial', () => {
  it('preenche com zero à esquerda', () => {
    expect(batchSerial(7, 3)).toBe('007');
    expect(batchSerial(700, 3)).toBe('700');
    expect(batchSerial(7)).toBe('7');
    expect(batchSerial(0, 2)).toBe('00');
  });
});

describe('batchPieces e rótulos', () => {
  const table = parseBatchTable('nome\nAna\nBia\nCaio');

  it('numera as peças a partir de 1 e usa o cabeçalho no modelo', () => {
    const pieces = batchPieces(table, '{nome}-{i}', { count: 2 });
    expect(pieces).toEqual([
      { index: 1, rowIndex: 0, content: 'Ana-1', label: '#1 · Ana' },
      { index: 2, rowIndex: 1, content: 'Bia-2', label: '#2 · Bia' },
    ]);
  });

  it('continua a numeração na retomada (start)', () => {
    const pieces = batchPieces(table, '{1}', { start: 3 });
    expect(pieces).toEqual([
      { index: 3, rowIndex: 2, content: 'Caio', label: '#3 · Caio' },
    ]);
  });

  it('encurta rótulos longos', () => {
    const label = batchPieceLabel(['um nome bem comprido demais'], 4);
    expect(label).toBe('#4 · um nome bem comprido de…');
    expect(label.length).toBe('#4 · '.length + 24);
    expect(batchPieceLabel(['', ''], 5)).toBe('#5');
  });

  it('nomeia o arquivo virtual da peça', () => {
    expect(batchPieceFileName('2d', 7, 50)).toBe('lote-07-de-50.gcode');
    expect(batchPieceFileName('1d', 7, 50)).toBe('lote-barcode-07-de-50.gcode');
  });
});

describe('sanitizeBatchPrefs', () => {
  const valid = {
    kind: '2d',
    csv: 'nome\nAna',
    template: '{1}',
    hasHeader: true,
    delimiter: ',',
    next: 1,
    total: 1,
  };

  it('aceita um lote bem formado', () => {
    expect(sanitizeBatchPrefs(valid)).toEqual(valid);
  });

  it('recusa lote inválido', () => {
    expect(sanitizeBatchPrefs(undefined)).toBeUndefined();
    expect(sanitizeBatchPrefs(null)).toBeUndefined();
    expect(sanitizeBatchPrefs({ ...valid, kind: '3d' })).toBeUndefined();
    expect(sanitizeBatchPrefs({ ...valid, csv: '' })).toBeUndefined();
    expect(sanitizeBatchPrefs({ ...valid, delimiter: '#' })).toBeUndefined();
    expect(sanitizeBatchPrefs({ ...valid, total: 0 })).toBeUndefined();
    expect(
      sanitizeBatchPrefs({
        ...valid,
        csv: 'x'.repeat(BATCH_MAX_PREF_CHARS + 1),
      }),
    ).toBeUndefined();
  });

  it('corrige a próxima peça fora da faixa', () => {
    expect(sanitizeBatchPrefs({ ...valid, total: 3, next: 9 })?.next).toBe(1);
    expect(sanitizeBatchPrefs({ ...valid, total: 3, next: 2 })?.next).toBe(2);
  });
});
