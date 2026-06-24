import type { ReactNode } from 'react';
import type { HydrationMode } from '../issuance-components/useHydration';

import { IssuanceWindow } from './components/IssuanceWindow';
import { DealSnapshot } from './components/DealSnapshot';
import { NewIssueTermsMonitor } from './components/NewIssueTermsMonitor';
import { CrossCurrencyRelativeValue } from './components/CrossCurrencyRelativeValue';
import { PeerAnalysis } from './components/PeerAnalysis';
import { AllocationSummary } from './components/AllocationSummary';
import { SecondaryPerformance } from './components/SecondaryPerformance';

import { dealSamples, termsSamples, secondarySamples } from './data/deal';
import { windowSamples, crossCurrencySamples } from './data/market';
import { allocationSamples, peerSamples } from './data/book';

export type ComponentKind =
  | 'issuanceWindow'
  | 'dealSnapshot'
  | 'newIssueTerms'
  | 'crossCurrencyRV'
  | 'peerAnalysis'
  | 'allocationSummary'
  | 'secondaryPerformance';

export interface SharedHydration {
  mode: HydrationMode;
  runId: number;
  delay?: number;
}

export interface StudioEntry {
  kind: ComponentKind;
  label: string;
  blurb: string;
  samples: { id: string; label: string }[];
  render: (sampleId: string, shared: SharedHydration) => ReactNode;
}

/** Picks a sample by id, falling back to the first so an unknown id never crashes. */
function pick<T extends { id: string }>(samples: T[], id: string): T {
  return samples.find((s) => s.id === id) ?? samples[0];
}

const sampleList = <T extends { id: string; label: string }>(samples: T[]) =>
  samples.map((s) => ({ id: s.id, label: s.label }));

/**
 * The registry: one entry per generated-UI component kind. Each knows its
 * selectable samples and how to render itself for a given {mode, runId}.
 */
export const STUDIO_ENTRIES: StudioEntry[] = [
  {
    kind: 'issuanceWindow',
    label: 'Issuance Window',
    blurb: 'Is the primary market open? Rates, vol and spread backdrop with a go / no-go read.',
    samples: sampleList(windowSamples),
    render: (id, shared) => <IssuanceWindow data={pick(windowSamples, id).data} {...shared} />,
  },
  {
    kind: 'dealSnapshot',
    label: 'Deal Snapshot',
    blurb: 'Single-deal tear sheet: terms, book coverage and lifecycle status.',
    samples: sampleList(dealSamples),
    render: (id, shared) => <DealSnapshot data={pick(dealSamples, id).data} {...shared} />,
  },
  {
    kind: 'newIssueTerms',
    label: 'New Issue Terms',
    blurb: 'Price progression IPT → guidance → launch → priced, with tightening and NIC.',
    samples: sampleList(termsSamples),
    render: (id, shared) => <NewIssueTermsMonitor data={pick(termsSamples, id).data} {...shared} />,
  },
  {
    kind: 'crossCurrencyRV',
    label: 'Cross-Currency RV',
    blurb: 'Where is it cheapest to fund? USD / EUR / GBP all-in after the basis swap.',
    samples: sampleList(crossCurrencySamples),
    render: (id, shared) => <CrossCurrencyRelativeValue data={pick(crossCurrencySamples, id).data} {...shared} />,
  },
  {
    kind: 'peerAnalysis',
    label: 'Peer Analysis',
    blurb: 'Issuer vs comparables on the curve, with secondary liquidity (outstanding vs traded).',
    samples: sampleList(peerSamples),
    render: (id, shared) => <PeerAnalysis data={pick(peerSamples, id).data} {...shared} />,
  },
  {
    kind: 'allocationSummary',
    label: 'Allocation',
    blurb: 'Book breakdown by investor type, geography and quality, plus hit rate.',
    samples: sampleList(allocationSamples),
    render: (id, shared) => <AllocationSummary data={pick(allocationSamples, id).data} {...shared} />,
  },
  {
    kind: 'secondaryPerformance',
    label: 'Secondary',
    blurb: 'Post-pricing performance vs reoffer — price and spread, did it break tighter.',
    samples: sampleList(secondarySamples),
    render: (id, shared) => <SecondaryPerformance data={pick(secondarySamples, id).data} {...shared} />,
  },
];

export function getEntry(kind: string): StudioEntry {
  return STUDIO_ENTRIES.find((e) => e.kind === kind) ?? STUDIO_ENTRIES[0];
}
