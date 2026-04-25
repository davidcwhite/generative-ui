// Synthetic, deterministic event timeline for the UX experiments lab.
//
// Yields a sequence of text-delta + tool-call + tool-result events that drive
// the same canonical scenario through every variant in `client/src/lab`.
// Result shapes are taken from the real DCM data layer so renderers built
// against this stream are drop-in for `/api/dcm/chat` later.

import { getIssuerById } from '../mcp/data/issuers.js';
import {
  getDealsByIssuerId,
  calculateDealSummary,
} from '../mcp/data/deals.js';
import { generateAllocationsForDeal } from '../mcp/data/investors.js';
import type {
  Issuer,
  ResolveEntityResult,
  MandateBrief,
  MandateBriefSection,
} from '../mcp/types.js';

export type Speed = 'fast' | 'normal' | 'slow';
export type InjectError = 'none' | 'tool' | 'stream';

export type ScenarioEvent =
  | { kind: 'start_step'; messageId: string }
  | { kind: 'text'; text: string }
  | {
      kind: 'tool_call';
      toolCallId: string;
      toolName: string;
      args: Record<string, unknown>;
    }
  | { kind: 'tool_result'; toolCallId: string; result: unknown }
  | { kind: 'error'; message: string }
  | {
      kind: 'finish_step';
      finishReason:
        | 'stop'
        | 'length'
        | 'content-filter'
        | 'tool-calls'
        | 'error'
        | 'other'
        | 'unknown';
    }
  | {
      kind: 'finish_message';
      finishReason:
        | 'stop'
        | 'length'
        | 'content-filter'
        | 'tool-calls'
        | 'error'
        | 'other'
        | 'unknown';
    };

export interface ScenarioOptions {
  speed?: Speed;
  injectError?: InjectError;
}

const SPEED_MULTIPLIER: Record<Speed, number> = {
  fast: 0.25,
  normal: 1,
  slow: 2.5,
};

function delayFor(baseMs: number, speed: Speed): number {
  return Math.max(0, Math.round(baseMs * SPEED_MULTIPLIER[speed]));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let counter = 0;
function newToolCallId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`;
}

function newMessageId(): string {
  counter += 1;
  return `msg-${Date.now().toString(36)}-${counter.toString(36)}`;
}

// Stream a string as 4-12 char chunks so the UI can render token-by-token
// streaming without spamming the wire.
async function* streamText(
  text: string,
  speed: Speed,
): AsyncGenerator<ScenarioEvent> {
  const tokens = text.match(/[\s]+|[^\s]+/g) ?? [text];
  let buffer = '';
  for (const token of tokens) {
    buffer += token;
    if (buffer.length >= 6) {
      yield { kind: 'text', text: buffer };
      buffer = '';
      await sleep(delayFor(28, speed));
    }
  }
  if (buffer.length > 0) {
    yield { kind: 'text', text: buffer };
  }
}

const ISSUER_ID = 'bmw-ag';
const SECTIONS = [
  'overview',
  'issuance_history',
  'peer_comparison',
  'investor_analysis',
  'secondary_performance',
];

function buildResolveResult(issuer: Issuer): ResolveEntityResult {
  return {
    matches: [issuer],
    confidence: 'exact',
    query: 'BMW',
  };
}

function buildIssuerDealsResult(issuer: Issuer) {
  const deals = getDealsByIssuerId(issuer.id, 5);
  return {
    issuer: {
      id: issuer.id,
      name: issuer.shortName,
      fullName: issuer.name,
      sector: issuer.sector,
      ratings: issuer.ratings,
    },
    deals,
    summary: calculateDealSummary(deals),
  };
}

function buildMandateBriefResult(issuer: Issuer) {
  const deals = getDealsByIssuerId(issuer.id);
  const summary = calculateDealSummary(deals);
  const sources: string[] = [];
  const briefSections: MandateBriefSection[] = [];

  sources.push('mcp-entity-resolution');
  briefSections.push({
    title: 'Issuer Overview',
    content:
      `${issuer.name} (${issuer.shortName}) is a ${issuer.sector} company based in ${issuer.country}. ` +
      `Credit ratings: ${issuer.ratings
        .map((r) => `${r.agency}: ${r.rating}`)
        .join(', ')}.`,
    dataPoints: [
      { field: 'Legal Name', value: issuer.name },
      { field: 'LEI', value: issuer.lei },
      { field: 'Sector', value: issuer.sector },
      { field: 'Country', value: issuer.country },
    ],
  });

  sources.push('mcp-issuance');
  briefSections.push({
    title: 'Issuance History',
    content:
      `${issuer.shortName} has completed ${summary.totalDeals} bond issuances, ` +
      `raising €${summary.totalRaised.toLocaleString()}M. Average NIP: ${summary.avgNip}bps.`,
    dataPoints: deals.slice(0, 5).map((d) => ({
      deal: `${d.coupon}% ${d.tenor}`,
      date: d.pricingDate,
      size: `€${d.size}M`,
      spread: `${d.spread}bps`,
    })),
  });

  sources.push('mcp-issuance');
  briefSections.push({
    title: 'Peer Comparison',
    content:
      `Compared to ${issuer.sector} sector peers, ${issuer.shortName}'s average NIP of ` +
      `${summary.avgNip}bps and oversubscription of ${summary.avgOversubscription}x reflects strong investor demand.`,
  });

  if (deals.length > 0) {
    sources.push('mcp-bookbuild', 'mcp-investor');
    const latestDeal = deals[0];
    const allocations = generateAllocationsForDeal(latestDeal.id, latestDeal.size);
    briefSections.push({
      title: 'Investor Analysis',
      content:
        `Most recent deal attracted ${allocations.length} institutional investors with ` +
        `${latestDeal.oversubscription}x oversubscription.`,
    });
  }

  sources.push('mcp-secondary');
  briefSections.push({
    title: 'Secondary Performance',
    content: `${issuer.shortName}'s bonds have generally performed well in the secondary market.`,
  });

  const brief: MandateBrief = {
    issuerId: issuer.id,
    issuerName: issuer.shortName,
    generatedAt: new Date().toISOString(),
    sections: briefSections,
    provenance: {
      sources,
      timestamp: new Date().toISOString(),
      queryContext: `Mandate brief for ${issuer.shortName}`,
    },
  };

  return {
    brief,
    exportFormats: ['pdf', 'pptx', 'xlsx', 'email'],
  };
}

export async function* runBmwMandateBriefScenario(
  options: ScenarioOptions = {},
): AsyncGenerator<ScenarioEvent> {
  const speed: Speed = options.speed ?? 'normal';
  const injectError: InjectError = options.injectError ?? 'none';
  const issuer = getIssuerById(ISSUER_ID);

  yield { kind: 'start_step', messageId: newMessageId() };

  // Opening text
  await sleep(delayFor(120, speed));
  yield* streamText("On it — let me brief you on BMW.\n\n", speed);

  if (injectError === 'stream') {
    await sleep(delayFor(200, speed));
    yield { kind: 'error', message: 'Mock stream error injected for testing.' };
    yield { kind: 'finish_step', finishReason: 'error' };
    yield { kind: 'finish_message', finishReason: 'error' };
    return;
  }

  if (!issuer) {
    yield { kind: 'error', message: `Issuer ${ISSUER_ID} not found in fixtures.` };
    yield { kind: 'finish_step', finishReason: 'error' };
    yield { kind: 'finish_message', finishReason: 'error' };
    return;
  }

  // Tool 1: resolve_entity
  const resolveCallId = newToolCallId('call-resolve');
  await sleep(delayFor(180, speed));
  yield {
    kind: 'tool_call',
    toolCallId: resolveCallId,
    toolName: 'resolve_entity',
    args: { query: 'BMW', type: 'issuer' },
  };
  await sleep(delayFor(900, speed));
  yield {
    kind: 'tool_result',
    toolCallId: resolveCallId,
    result: buildResolveResult(issuer),
  };

  // Bridge text
  await sleep(delayFor(180, speed));
  yield* streamText("Resolved to **BMW AG**. Pulling recent issuance…\n\n", speed);

  // Tool 2: get_issuer_deals
  const dealsCallId = newToolCallId('call-deals');
  await sleep(delayFor(180, speed));
  yield {
    kind: 'tool_call',
    toolCallId: dealsCallId,
    toolName: 'get_issuer_deals',
    args: { issuerId: issuer.id, limit: 5 },
  };
  await sleep(delayFor(1100, speed));

  if (injectError === 'tool') {
    yield {
      kind: 'tool_result',
      toolCallId: dealsCallId,
      result: { error: 'Mock tool error injected for testing.', issuerId: issuer.id },
    };
    yield* streamText(
      "I hit an error fetching BMW's deals. Try again or pick another issuer.",
      speed,
    );
    yield { kind: 'finish_step', finishReason: 'tool-calls' };
    yield { kind: 'finish_message', finishReason: 'stop' };
    return;
  }

  yield {
    kind: 'tool_result',
    toolCallId: dealsCallId,
    result: buildIssuerDealsResult(issuer),
  };

  // Bridge text
  await sleep(delayFor(180, speed));
  yield* streamText("Drafting the mandate brief…\n\n", speed);

  // Tool 3: generate_mandate_brief
  const briefCallId = newToolCallId('call-brief');
  await sleep(delayFor(180, speed));
  yield {
    kind: 'tool_call',
    toolCallId: briefCallId,
    toolName: 'generate_mandate_brief',
    args: { issuerId: issuer.id, sections: SECTIONS },
  };
  await sleep(delayFor(1500, speed));
  yield {
    kind: 'tool_result',
    toolCallId: briefCallId,
    result: buildMandateBriefResult(issuer),
  };

  // Closing text
  await sleep(delayFor(220, speed));
  yield* streamText(
    "Brief is ready — expand each section to inspect the data points.",
    speed,
  );

  yield { kind: 'finish_step', finishReason: 'stop' };
  yield { kind: 'finish_message', finishReason: 'stop' };
}
