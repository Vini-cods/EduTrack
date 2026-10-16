import test from 'node:test';
import assert from 'node:assert/strict';
import { readPasswordResetToken, redactPasswordResetUrl, recoveryErrorMessage } from '../src/lib/authRecovery.ts';
import { accountPasswordError as recoveryPasswordError } from '../src/lib/password.ts';

test('reset token prefers fragment and supports a legacy query link', () => {
  assert.equal(readPasswordResetToken('#token=fragment-token', '?token=query-token'), 'fragment-token');
  assert.equal(readPasswordResetToken('', '?token=query-token&source=email'), 'query-token');
  assert.equal(readPasswordResetToken('#section', '?token=query-token'), 'query-token');
});

test('reset token rejects missing, repeated or malformed values without falling back from an invalid fragment', () => {
  assert.equal(readPasswordResetToken('', ''), null);
  assert.equal(readPasswordResetToken('#token=', '?token=query-token'), null);
  assert.equal(readPasswordResetToken('#token=one&token=two', ''), null);
  assert.equal(readPasswordResetToken('', '?token=one&token=two'), null);
  assert.equal(readPasswordResetToken('#token=one%20two', ''), null);
  assert.equal(readPasswordResetToken('#token=one%00two', ''), null);
  assert.equal(readPasswordResetToken(`#token=${'x'.repeat(2049)}`, ''), null);
});

test('reset token is removed from URL history while other parameters and anchors remain', () => {
  assert.equal(redactPasswordResetUrl('/reset-password', '?token=query-token&source=email', '#token=fragment-token'), '/reset-password?source=email');
  assert.equal(redactPasswordResetUrl('/reset-password', '', '#token=fragment-token&source=email'), '/reset-password#source=email');
  assert.equal(redactPasswordResetUrl('/reset-password', '?source=email', '#section'), '/reset-password?source=email#section');
  assert.equal(redactPasswordResetUrl('/reset-password', '?token=query-token', ''), '/reset-password');
});

test('password validation counts Unicode characters and enforces the UTF-8 byte boundary', () => {
  assert.ok(recoveryPasswordError('abcde'));
  assert.equal(recoveryPasswordError('abcdef'), null);
  assert.equal(recoveryPasswordError('x'.repeat(72)), null);
  assert.ok(recoveryPasswordError('x'.repeat(73)));
  assert.ok(recoveryPasswordError('😀'.repeat(5)));
  assert.equal(recoveryPasswordError('😀'.repeat(6)), null);
  assert.equal(recoveryPasswordError('😀'.repeat(18)), null);
  assert.ok(recoveryPasswordError('😀'.repeat(19)));
  assert.equal(recoveryPasswordError('á'.repeat(36)), null);
  assert.ok(recoveryPasswordError('á'.repeat(37)));
});

test('service, network, rate-limit and invalid-link errors stay distinct from accepted requests', () => {
  assert.match(recoveryErrorMessage('request', 503), /indisponível/);
  assert.match(recoveryErrorMessage('request'), /conexão/);
  assert.match(recoveryErrorMessage('reset', 400), /inválido, expirou ou já foi usado/);
  assert.match(recoveryErrorMessage('request', 429), /Aguarde/);
  assert.match(recoveryErrorMessage('reset', 422), /Confira/);
  assert.match(recoveryErrorMessage('request', 500), /Não foi possível/);
});
