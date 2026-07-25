import type { FilterClause, FilterField, ListField } from './issuanceApi';
import {
  ISSUANCE_CURRENCIES,
  ISSUANCE_ISSUERS,
  ISSUANCE_RATINGS,
  ISSUANCE_REGIONS,
  ISSUANCE_SECTORS,
  ISSUANCE_STATUSES,
  ISSUANCE_TICKERS,
  type Dimension,
} from './shadcnIssuanceData';

export interface FieldDef {
  field: FilterField;
  label: string;
  kind: 'list' | 'size' | 'date';
  /** Fixed option lists; long ones rely on the popover's search box. */
  options?: readonly string[];
  hint?: string;
}

export const FILTER_FIELDS: FieldDef[] = [
  { field: 'issuer', label: 'Issuer', kind: 'list', options: ISSUANCE_ISSUERS },
  { field: 'ticker', label: 'Ticker', kind: 'list', options: ISSUANCE_TICKERS },
  { field: 'region', label: 'Region', kind: 'list', options: ISSUANCE_REGIONS },
  { field: 'sector', label: 'Sector', kind: 'list', options: ISSUANCE_SECTORS },
  { field: 'rating', label: 'Rating', kind: 'list', options: ISSUANCE_RATINGS },
  { field: 'currency', label: 'Currency', kind: 'list', options: ISSUANCE_CURRENCIES },
  { field: 'status', label: 'Status', kind: 'list', options: ISSUANCE_STATUSES },
  { field: 'size', label: 'Deal size', kind: 'size', hint: 'Local currency, millions' },
  { field: 'pricingDate', label: 'Pricing date', kind: 'date' },
];

export const FIELD_LABELS: Record<FilterField, string> = Object.fromEntries(
  FILTER_FIELDS.map((field) => [field.field, field.label]),
) as Record<FilterField, string>;

export function findClause(filters: FilterClause[], field: FilterField) {
  return filters.find((clause) => clause.field === field);
}

/** An empty clause is dropped, which keeps the chip row honest. */
export function upsertClause(filters: FilterClause[], clause: FilterClause): FilterClause[] {
  const rest = filters.filter((item) => item.field !== clause.field);
  if (isEmptyClause(clause)) return rest;
  return [...rest, clause];
}

export function removeClause(filters: FilterClause[], field: FilterField) {
  return filters.filter((clause) => clause.field !== field);
}

export function isEmptyClause(clause: FilterClause) {
  if (clause.field === 'size') return clause.min === null && clause.max === null;
  if (clause.field === 'pricingDate') return clause.from === null && clause.to === null;
  return clause.values.length === 0;
}

/**
 * Charts toggle values on their own dimension. "Other" slices expand to every
 * value they fold in, so clicking the slice filters on all of them.
 */
export function toggleValues(
  filters: FilterClause[],
  field: ListField,
  values: string[],
): FilterClause[] {
  const clause = findClause(filters, field);
  const current = clause && 'values' in clause ? clause.values : [];
  const allSelected = values.every((value) => current.includes(value));
  const next = allSelected
    ? current.filter((value) => !values.includes(value))
    : [...new Set([...current, ...values])];
  return upsertClause(filters, { field, values: next });
}

export function selectedValues(filters: FilterClause[], field: ListField): string[] {
  const clause = findClause(filters, field);
  return clause && 'values' in clause ? clause.values : [];
}

/** Dimensions map one-to-one onto list fields, so charts can filter directly. */
export function dimensionField(dimension: Dimension): ListField {
  return dimension;
}

export function describeClause(clause: FilterClause): string {
  const label = FIELD_LABELS[clause.field];
  if (clause.field === 'size') {
    if (clause.min !== null && clause.max !== null) {
      return `${label} ${clause.min}–${clause.max}m`;
    }
    if (clause.min !== null) return `${label} ≥ ${clause.min}m`;
    return `${label} ≤ ${clause.max}m`;
  }
  if (clause.field === 'pricingDate') {
    if (clause.from && clause.to) return `${label} ${shortDate(clause.from)} – ${shortDate(clause.to)}`;
    if (clause.from) return `${label} from ${shortDate(clause.from)}`;
    return `${label} to ${shortDate(clause.to!)}`;
  }
  if (clause.values.length === 1) return `${label} ${clause.values[0]}`;
  return `${label} ${clause.values.length} selected`;
}

export function shortDate(iso: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`));
}
