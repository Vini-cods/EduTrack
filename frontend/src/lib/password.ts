const passwordEncoder = new TextEncoder();

/** Same Unicode character count and UTF-8 limit as the backend bcrypt contract. */
export function accountPasswordError(password: string): string | null {
  if (Array.from(password).length < 6) return 'Use pelo menos 6 caracteres.';
  if (passwordEncoder.encode(password).byteLength > 72) return 'A senha ficou longa demais. Use menos caracteres.';
  return null;
}
