import { describe, expect, it } from 'vitest';
import {
  GCODE_DIALOG_FILTERS,
  IMAGE_DIALOG_FILTERS,
  IMAGE_EXTENSIONS,
  extensionOf,
  imageMimeType,
  isSupportedGcodeName,
  isSupportedImageName,
  supportedImageList,
} from '../src/shared/fileFilters';

describe('extensionOf', () => {
  it('extrai a extensão em minúsculas, ignorando maiúsculas e caminhos', () => {
    expect(extensionOf('logo.PNG')).toBe('png');
    expect(extensionOf('Ford-Symbol.jpeg')).toBe('jpeg');
    expect(extensionOf('/home/me/fotos/gravura.JPG')).toBe('jpg');
    expect(extensionOf('sem-extensao')).toBe('');
  });

  it('ignora espaços e pontos finais espúrios', () => {
    expect(extensionOf('arquivo.png ')).toBe('png');
    expect(extensionOf('')).toBe('');
    expect(extensionOf('.gitignore')).toBe('gitignore');
  });
});

describe('validação de nomes', () => {
  it('aceita as imagens que o Chromium decodifica', () => {
    for (const name of [
      'a.png',
      'b.JPG',
      'c.jpeg',
      'd.bmp',
      'e.gif',
      'f.webp',
      'g.avif',
    ]) {
      expect(isSupportedImageName(name)).toBe(true);
    }
  });

  it('recusa formatos que a UI não consegue decodificar', () => {
    for (const name of ['a.tiff', 'b.svg', 'c.pdf', 'd.heic', 'e.txt', 'd']) {
      expect(isSupportedImageName(name)).toBe(false);
    }
  });

  it('aceita as extensões de G-code usadas na bancada', () => {
    for (const name of [
      'job.gcode',
      'JOB.NC',
      'a.ngc',
      'b.tap',
      'c.gc',
      'd.txt',
    ]) {
      expect(isSupportedGcodeName(name)).toBe(true);
    }
    expect(isSupportedGcodeName('imagem.png')).toBe(false);
  });
});

describe('mime', () => {
  it('mapeia as extensões conhecidas', () => {
    expect(imageMimeType('a.png')).toBe('image/png');
    expect(imageMimeType('a.JPEG')).toBe('image/jpeg');
    expect(imageMimeType('a.jfif')).toBe('image/jpeg');
    expect(imageMimeType('a.webp')).toBe('image/webp');
  });

  it('usa octet-stream para extensão desconhecida', () => {
    expect(imageMimeType('a.xyz')).toBe('application/octet-stream');
  });
});

describe('filtros do diálogo', () => {
  it('mantém "Todos os arquivos" como último filtro (fallback do usuário)', () => {
    expect(IMAGE_DIALOG_FILTERS.at(-1)?.extensions).toEqual(['*']);
    expect(GCODE_DIALOG_FILTERS.at(-1)?.extensions).toEqual(['*']);
  });

  it('lista cada extensão de imagem nos dois casos (GTK é sensível a maiúsculas)', () => {
    expect(IMAGE_EXTENSIONS).toContain('png');
    expect(IMAGE_EXTENSIONS).toContain('PNG');
  });

  it('descreve o filtro de imagem com as extensões principais', () => {
    expect(supportedImageList()).toContain('PNG');
    expect(supportedImageList()).toContain('WEBP');
    expect(IMAGE_DIALOG_FILTERS[0]?.name).toContain('Imagens');
  });
});
