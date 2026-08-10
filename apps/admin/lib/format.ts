/** Safely truncates a possibly-missing identifier for compact display. */
export function shortId(value: string | null | undefined, length = 8): string {
  return typeof value === 'string' && value.length > 0 ? `${value.slice(0, length)}...` : '-';
}
