/**
 * EUR-base formatters for the Bond Issuance Studio.
 * All number/date rendering goes through Intl (Web Interface Guidelines:
 * no hardcoded currency/date formats). Units use a non-breaking space so
 * "88 bps" / "€1.25 bn" never wrap awkwardly.
 */

const NBSP = '\u00A0';

const SYMBOL: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  JPY: '¥',
};

const decimals = (min: number, max = min) =>
  new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  });

/** Millions -> "€1.25 bn" / "€435 m" (EUR base, symbol per currency). */
export function fmtCcyMm(mm: number, ccy = 'EUR'): string {
  const sym = SYMBOL[ccy] ?? '';
  if (Math.abs(mm) >= 1000) return `${sym}${decimals(2).format(mm / 1000)}${NBSP}bn`;
  return `${sym}${decimals(0).format(mm)}${NBSP}m`;
}

/** "88 bps" (non-breaking). */
export function fmtBps(n: number, dp = 0): string {
  return `${decimals(dp).format(n)}${NBSP}bps`;
}

/** Signed spread delta with direction arrow. Negative = tighter (good). */
export function fmtSignedBps(n: number, dp = 0): string {
  if (n === 0) return `±0${NBSP}bps`;
  const arrow = n < 0 ? '▼' : '▲';
  return `${arrow}${NBSP}${decimals(dp).format(Math.abs(n))}${NBSP}bps`;
}

/** Plain spread vs reference, e.g. "+88 bps". */
export function fmtSpread(n: number, dp = 0): string {
  const sign = n >= 0 ? '+' : '−';
  return `${sign}${decimals(dp).format(Math.abs(n))}${NBSP}bps`;
}

export function fmtPct(n: number, dp = 0): string {
  return `${decimals(dp).format(n)}%`;
}

/** Book coverage etc., e.g. "3.28x". */
export function fmtMult(n: number, dp = 2): string {
  return `${decimals(dp).format(n)}x`;
}

export function fmtPrice(n: number, dp = 2): string {
  return decimals(dp).format(n);
}

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : dateFmt.format(d);
}
