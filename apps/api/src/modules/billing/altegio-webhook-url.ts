/**
 * Appends the shared webhook authentication token as a query parameter so the
 * Altegio delivery endpoint is not anonymous. Altegio preserves the query
 * string of the registered hook URL on every delivery.
 */
export function appendWebhookTokenToUrl(url: string, token: string): string {
  const normalizedUrl = String(url || '').trim();
  const normalizedToken = String(token || '').trim();
  if (!normalizedUrl || !normalizedToken) {
    return normalizedUrl;
  }
  const hasTokenParam = new URLSearchParams(
    normalizedUrl.includes('?') ? normalizedUrl.slice(normalizedUrl.indexOf('?') + 1) : '',
  ).has('token');
  if (hasTokenParam) {
    return normalizedUrl;
  }
  const separator = normalizedUrl.includes('?') ? '&' : '?';
  return `${normalizedUrl}${separator}token=${encodeURIComponent(normalizedToken)}`;
}