/**
 * Formatting Utility Functions
 */

export function formatCurrency(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatIDR(amount: number): string {
  return formatCurrency(amount);
}
