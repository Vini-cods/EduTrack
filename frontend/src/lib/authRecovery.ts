/** Reset tokens are opaque: only reject missing, ambiguous or malformed URL input. */
export function readPasswordResetToken(hash: string, search: string): string | null {
  const fragmentTokens = new URLSearchParams(hash.replace(/^#/, '')).getAll('token');
  const tokens = fragmentTokens.length
    ? fragmentTokens
    : new URLSearchParams(search.replace(/^\?/, '')).getAll('token');
  if (tokens.length !== 1) return null;
  const token = tokens[0];
  return token.length > 0 && token.length <= 2048 && !/[\s\u0000-\u001f\u007f]/.test(token)
    ? token
    : null;
}

/** Remove the secret from browser history while preserving other URL parameters. */
export function redactPasswordResetUrl(pathname: string, search: string, hash: string): string {
  const query = new URLSearchParams(search.replace(/^\?/, ''));
  const fragment = new URLSearchParams(hash.replace(/^#/, ''));
  const hadQueryToken = query.has('token');
  const hadFragmentToken = fragment.has('token');
  query.delete('token');
  fragment.delete('token');
  const cleanQuery = hadQueryToken ? (query.size ? `?${query.toString()}` : '') : search;
  const cleanHash = hadFragmentToken ? (fragment.size ? `#${fragment.toString()}` : '') : hash;
  return `${pathname}${cleanQuery}${cleanHash}`;
}

export function recoveryErrorMessage(action: 'request' | 'reset', status?: number): string {
  if (status === 429) return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.';
  if (action === 'reset' && status === 400) return 'Este link é inválido, expirou ou já foi usado. Peça um novo link para continuar.';
  if (status === 503) return 'A recuperação de senha está indisponível no momento. Tente novamente mais tarde.';
  if (status === 422) return 'Confira os dados informados e tente novamente.';
  if (status === undefined) return 'Não foi possível confirmar a solicitação. Verifique sua conexão e tente novamente.';
  return 'Não foi possível concluir a solicitação agora. Tente novamente em alguns instantes.';
}
