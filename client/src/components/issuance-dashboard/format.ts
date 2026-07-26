/** Billions in, the tidiest unit out. */
export function formatBn(value: number) {
  return value >= 1000 ? `€${(value / 1000).toFixed(2)}tn` : `€${value.toFixed(1)}bn`;
}

/** Millions in, the tidiest unit out. */
export function formatMm(value: number) {
  return value >= 1000 ? `€${(value / 1000).toFixed(1)}bn` : `€${Math.round(value)}m`;
}
