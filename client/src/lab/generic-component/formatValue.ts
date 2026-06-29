/**
 * Value formatting for the generic component. All number/date formatting goes
 * through `Intl` (Web Interface Guidelines: never hardcode currency/number
 * formats). Zero project dependencies — ships with the folder.
 */

import type { ValueFormat } from './contract';

const NBSP = '\u00A0';

export interface FormatOptions {
  /** BCP-47 locale. Defaults to the runtime locale (do not hardcode). */
  locale?: string;
  /** ISO 4217 code used for `currency` format. Defaults to USD. */
  currency?: string;
  /** Override fraction digits; sensible per-format defaults otherwise. */
  maximumFractionDigits?: number;
}

/**
 * Format a contract value. Strings pass through untouched so an agent can send
 * pre-formatted text; raw numbers are formatted per the `format` hint.
 */
export function formatValue(
  value: string | number,
  format: ValueFormat = 'number',
  options: FormatOptions = {},
): string {
  if (typeof value === 'string') return value;

  const { locale, currency = 'USD', maximumFractionDigits } = options;
  const nf = (opts: Intl.NumberFormatOptions) => new Intl.NumberFormat(locale, opts).format(value);

  switch (format) {
    case 'currency':
      return nf({ style: 'currency', currency, maximumFractionDigits: maximumFractionDigits ?? 0 });
    case 'percent':
      return `${nf({ maximumFractionDigits: maximumFractionDigits ?? 1 })}%`;
    case 'bps':
      return `${nf({ maximumFractionDigits: maximumFractionDigits ?? 0 })}${NBSP}bps`;
    case 'multiple':
      return `${nf({ minimumFractionDigits: 2, maximumFractionDigits: maximumFractionDigits ?? 2 })}x`;
    case 'number':
    default:
      return nf({ maximumFractionDigits: maximumFractionDigits ?? 2 });
  }
}
