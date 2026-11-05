import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMaterialTitle, validateMaterialTitle } from '../src/lib/materials.ts';

test('material exige título depois de remover espaços das bordas', () => {
  for (const title of ['', '   ', '\t\n', ' \u00a0 ']) {
    assert.equal(validateMaterialTitle(title), 'Informe um título para o material.');
  }
  assert.equal(validateMaterialTitle('  Slides de revisão  '), null);
});

test('limite do material usa caracteres Unicode como a API, não unidades UTF-16', () => {
  assert.equal(validateMaterialTitle('x'.repeat(255)), null);
  assert.equal(validateMaterialTitle('📚'.repeat(255)), null);
  assert.equal(validateMaterialTitle(`  ${'📚'.repeat(255)}\n`), null);
  assert.equal(validateMaterialTitle('x'.repeat(256)), 'O título deve ter no máximo 255 caracteres.');
  assert.equal(validateMaterialTitle('📚'.repeat(256)), 'O título deve ter no máximo 255 caracteres.');
});

test('NEL nas bordas é removido como na validação Unicode da API', () => {
  assert.equal(normalizeMaterialTitle('\u0085 Slides \u0085'), 'Slides');
  assert.equal(normalizeMaterialTitle(`\u0085${'x'.repeat(255)}\u0085`), 'x'.repeat(255));
  assert.equal(validateMaterialTitle('\u0085'), 'Informe um título para o material.');
  assert.equal(validateMaterialTitle(`\u0085${'x'.repeat(255)}\u0085`), null);
});

test('FEFF permanece conteúdo e participa do limite como na API', () => {
  assert.equal(normalizeMaterialTitle(' \ufeffSlides\ufeff\n'), '\ufeffSlides\ufeff');
  assert.equal(validateMaterialTitle('\ufeff'), null);
  assert.equal(validateMaterialTitle(`\ufeff${'x'.repeat(255)}\ufeff`), 'O título deve ter no máximo 255 caracteres.');
});
