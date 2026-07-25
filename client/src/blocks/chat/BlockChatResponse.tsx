import { useMemo } from 'react';
import type { BlockInstance, CompsSpec } from '../contract';
import { AS_OF, TRANCHE_ROWS } from '../data/queries';
import { execute, executeForChat } from '../execute';
import { openInWorkspace } from '../navigation';
import { CompsInline } from '../comps/CompsInline';
import { useEffect, useState } from 'react';
import type { CompsPayload } from '../contract';

/**
 * A mocked assistant turn carrying blocks.
 *
 * The point of this view is the seam, not the prose: what the agent freezes
 * into the conversation, what it looks like at chat scale, and what happens
 * when the reader wants more than a block can hold.
 */

/** Stand-in for the deal the desk is working on. */
const SUBJECT =
  TRANCHE_ROWS.find(
    (row) =>
      row.issuer.ticker === 'BMW' &&
      row.deal.currency === 'EUR' &&
      row.tenorYears >= 5 &&
      row.tenorYears <= 10,
  ) ?? TRANCHE_ROWS[0];

function buildInstances(): BlockInstance[] {
  // No tenor filter with a subject set. The chart wants the whole curve to
  // position the deal on, and the benchmark narrows to tenor-matched peers by
  // itself — filtering here as well would leave a peer set of six.
  const subjectSpec: CompsSpec = {
    blockType: 'comps',
    subject: { trancheId: SUBJECT.id },
    filters: { ratingBands: [SUBJECT.issuer.ratingBand], currencies: ['EUR'] },
    windowMonths: 12,
    asOf: AS_OF,
  };

  const sectorSpec: CompsSpec = {
    blockType: 'comps',
    filters: { sectors: ['Automobiles'], currencies: ['EUR'] },
    windowMonths: 12,
    asOf: AS_OF,
  };

  return [subjectSpec, sectorSpec].map((spec, index) => ({
    id: `block-${index}`,
    spec,
    payload: executeForChat(spec),
    computedAt: AS_OF,
  }));
}

/** Re-runs each spec so the block can tell the reader if its numbers have moved. */
function useLivePayloads(instances: BlockInstance[]) {
  const [live, setLive] = useState<Record<string, CompsPayload>>({});

  useEffect(() => {
    let active = true;
    Promise.all(instances.map((instance) => execute(instance.spec))).then((results) => {
      if (!active) return;
      setLive(Object.fromEntries(instances.map((instance, i) => [instance.id, results[i]])));
    });
    return () => {
      active = false;
    };
  }, [instances]);

  return live;
}

export function BlockChatResponse() {
  const instances = useMemo(buildInstances, []);
  const live = useLivePayloads(instances);
  const subject = instances[0].payload.subject;

  return (
    <div className="flex flex-col text-sm leading-relaxed text-stone-700">
      <p>
        {subject ? (
          <>
            {subject.point.issuer} priced its {subject.point.tenorLabel} at{' '}
            <strong className="font-semibold text-stone-900">{subject.point.spread}bp</strong>
            {subject.spread.reliable && (
              <>
                {' '}
                against a {subject.spread.peerMedian}bp median for {subject.spread.basis}
              </>
            )}
            , with a {subject.point.coverage}x book.
          </>
        ) : (
          'Here is where the deal sits against its peer set.'
        )}
      </p>

      <CompsInline instance={instances[0]} live={live[instances[0].id]} onOpen={openInWorkspace} />

      <p className="mt-1">
        Across the sector the picture is wider — twelve months of EUR autos supply, where the
        curve steepens materially past seven years.
      </p>

      <CompsInline instance={instances[1]} live={live[instances[1].id]} onOpen={openInWorkspace} />
    </div>
  );
}
