import { useSyncExternalStore } from 'react';
import type { BlockSpec } from './contract';
import { writeSpecToUrl } from './urlState';

/**
 * The chat ↔ workspace round trip.
 *
 * Two rules hold this together. What travels out is the spec, never the
 * payload: the chat block shows numbers frozen when the agent answered, the
 * workspace re-executes the same recipe live, and any disagreement between
 * them is information. And every trip out has a trip back, because a one-way
 * door stops being used the first time someone loses their place in a
 * conversation behind it.
 */

export interface BlockSource {
  /** The question that produced the block. Labels the way back. */
  question: string;
  /** Anchor in the conversation, so returning lands on the block, not the top. */
  anchorId: string;
}

interface Target {
  spec: BlockSpec;
  source?: BlockSource;
  /** Bumped every request so a repeat click on the same block still navigates. */
  nonce: number;
}

interface ChatReturn {
  anchorId?: string;
  nonce: number;
}

/**
 * Blocks opened this session.
 *
 * Deliberately not a second chat history. It holds specs, not payloads, and it
 * dies with the session — the conversation remains the record, because it is
 * the only place a block sits next to the reasoning that produced it. This is
 * a shortcut back to a view, which is why entries are labelled by the question
 * asked rather than by block type: nobody remembers which of four comps runs
 * was "A · EUR · 12m".
 */
export interface RecentBlock {
  spec: BlockSpec;
  source?: BlockSource;
  at: number;
}

const RECENT_LIMIT = 6;

let target: Target | null = null;
let chatReturn: ChatReturn | null = null;
let recents: RecentBlock[] = [];

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Same block type and subject counts as the same entry, filters aside. */
function sameEntry(a: BlockSpec, b: BlockSpec) {
  if (a.blockType !== b.blockType) return false;
  if (a.blockType === 'deal_flash' && b.blockType === 'deal_flash') return a.dealId === b.dealId;
  if (a.blockType === 'comps' && b.blockType === 'comps') {
    return a.subject?.trancheId === b.subject?.trancheId;
  }
  return false;
}

export function openInWorkspace(spec: BlockSpec, source?: BlockSource) {
  target = { spec, source, nonce: (target?.nonce ?? 0) + 1 };
  recents = [
    { spec, source, at: Date.now() },
    ...recents.filter((entry) => !sameEntry(entry.spec, spec)),
  ].slice(0, RECENT_LIMIT);
  writeSpecToUrl(spec);
  emit();
}

export function returnToChat(anchorId?: string) {
  chatReturn = { anchorId, nonce: (chatReturn?.nonce ?? 0) + 1 };
  emit();
}

export function useWorkspaceTarget(): Target | null {
  return useSyncExternalStore(
    subscribe,
    () => target,
    () => null,
  );
}

export function useChatReturn(): ChatReturn | null {
  return useSyncExternalStore(
    subscribe,
    () => chatReturn,
    () => null,
  );
}

export function useRecentBlocks(): RecentBlock[] {
  return useSyncExternalStore(
    subscribe,
    () => recents,
    () => recents,
  );
}
