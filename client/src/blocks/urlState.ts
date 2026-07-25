import type { CompsSpec } from './contract';
import { AS_OF } from './data/queries';

/**
 * The spec lives in the URL, so a workspace view is shareable, back-button
 * correct and pasteable into Slack. It is also the transport for the chat
 * deep link: the link carries the recipe, never the frozen numbers.
 */

const PARAM = 'spec';

/** Plain JSON; URLSearchParams owns the percent-encoding at the edges. */
export function encodeSpec(spec: CompsSpec): string {
  return JSON.stringify(spec);
}

export function decodeSpec(raw: string): CompsSpec | null {
  try {
    const parsed = JSON.parse(raw) as Partial<CompsSpec>;
    if (parsed?.blockType !== 'comps') return null;
    return {
      blockType: 'comps',
      subject: parsed.subject,
      filters: parsed.filters ?? {},
      windowMonths: parsed.windowMonths ?? 6,
      asOf: parsed.asOf ?? AS_OF,
    };
  } catch {
    return null;
  }
}

export function readSpecFromUrl(): CompsSpec | null {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get(PARAM);
  return raw ? decodeSpec(raw) : null;
}

/** Replace rather than push: filter fiddling shouldn't fill the back stack. */
export function writeSpecToUrl(spec: CompsSpec) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  params.set(PARAM, encodeSpec(spec));
  window.history.replaceState(null, '', `${window.location.pathname}?${params}`);
}

export function specHref(spec: CompsSpec): string {
  const params = new URLSearchParams({ [PARAM]: encodeSpec(spec) });
  return `${window.location.pathname}?${params}`;
}
