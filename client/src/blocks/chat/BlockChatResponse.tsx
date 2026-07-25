import { useEffect, useMemo, useState } from 'react';
import type {
  BlockInstance,
  BlockSpec,
  CompsPayload,
  CompsSpec,
  DealFlashPayload,
  DealFlashSpec,
} from '../contract';
import { AS_OF, TRANCHE_ROWS } from '../data/queries';
import { execute, executeForChat } from '../execute';
import { openInWorkspace, type BlockSource } from '../navigation';
import { CompsInline } from '../comps/CompsInline';
import { DealFlashInline } from '../deal-flash/DealFlashInline';

/**
 * A mocked assistant turn carrying blocks.
 *
 * The point of this view is the seam, not the prose: what the agent freezes
 * into the conversation, what two different blocks look like side by side at
 * chat scale, and what happens when the reader wants more than a block can
 * hold — including how they get back.
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

/**
 * A name still in the market, so the second block shows the lifecycle rather
 * than repeating the first one's numbers back at the reader.
 */
const LIVE = TRANCHE_ROWS.find((row) => row.deal.status !== 'priced') ?? TRANCHE_ROWS[0];

/** The question that produced these blocks; labels the way back from each. */
const QUESTION = 'Where would BMW price a new 10Y?';

interface Entry {
  instance: BlockInstance;
  source: BlockSource;
}

function buildEntries(): Entry[] {
  // No tenor filter with a subject set. The chart wants the whole curve to
  // position the deal on, and the benchmark narrows to tenor-matched peers by
  // itself — filtering here as well would leave a peer set of six.
  const compsSpec: CompsSpec = {
    blockType: 'comps',
    subject: { trancheId: SUBJECT.id },
    filters: { ratingBands: [SUBJECT.issuer.ratingBand], currencies: ['EUR'] },
    windowMonths: 12,
    asOf: AS_OF,
  };

  const flashSpec: DealFlashSpec = {
    blockType: 'deal_flash',
    dealId: LIVE.dealId,
    trancheId: LIVE.id,
    asOf: AS_OF,
  };

  return [compsSpec, flashSpec].map<Entry>((spec, index) => ({
    instance: {
      id: `block-${index}`,
      spec,
      payload: executeForChat(spec),
      computedAt: AS_OF,
    },
    source: { question: QUESTION, anchorId: `chat-block-${index}` },
  }));
}

/** Re-runs the comps spec so the block can say if its numbers have moved. */
function useLiveComps(instance: BlockInstance) {
  const [live, setLive] = useState<CompsPayload | undefined>();

  useEffect(() => {
    let active = true;
    execute(instance.spec).then((result) => {
      if (active) setLive(result as CompsPayload);
    });
    return () => {
      active = false;
    };
  }, [instance]);

  return live;
}

export function BlockChatResponse() {
  const entries = useMemo(buildEntries, []);
  const [comps, flash] = entries;
  const live = useLiveComps(comps.instance);

  const compsPayload = comps.instance.payload as CompsPayload;
  const flashPayload = flash.instance.payload as DealFlashPayload;
  const subject = compsPayload.subject;

  const open = (spec: BlockSpec, source: BlockSource) => openInWorkspace(spec, source);

  return (
    <div className="flex flex-col text-sm leading-relaxed text-stone-700">
      <p>
        {subject ? (
          <>
            The closest read is {subject.point.issuer}&rsquo;s own {subject.point.tenorLabel}, which
            came at{' '}
            <strong className="font-semibold text-stone-900">{subject.point.spread}bp</strong>
            {subject.spread.reliable && (
              <> against a {subject.spread.peerMedian}bp median for {subject.spread.basis}</>
            )}
            .
          </>
        ) : (
          'Here is where the deal sits against its peer set.'
        )}
      </p>

      <div id={comps.source.anchorId} className="scroll-mt-24">
        <CompsInline
          instance={comps.instance}
          live={live}
          onOpen={(spec) => open(spec, comps.source)}
        />
      </div>

      <p className="mt-1">
        Worth watching alongside it: {flashPayload.deal.issuer} is in the market this morning and
        hasn&rsquo;t priced yet, so the read updates through the day.
      </p>

      <div id={flash.source.anchorId} className="scroll-mt-24">
        <DealFlashInline instance={flash.instance} onOpen={(spec) => open(spec, flash.source)} />
      </div>
    </div>
  );
}
