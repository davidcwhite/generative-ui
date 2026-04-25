import { V1Minimal } from './variants/V1Minimal';
import { V2ClaudeSteps } from './variants/V2ClaudeSteps';
import { V3Perplexity } from './variants/V3Perplexity';
import { V4TaskList } from './variants/V4TaskList';
import { V5Immersive } from './variants/V5Immersive';
import { V6MatrixGrid } from './variants/V6MatrixGrid';
import { V7TerminalStream } from './variants/V7TerminalStream';
import { V8RibbonTicker } from './variants/V8RibbonTicker';
import { V9TerminalStacked } from './variants/V9TerminalStacked';
import { V10TerminalWorkflow } from './variants/V10TerminalWorkflow';
import { V11TerminalCollapse } from './variants/V11TerminalCollapse';
import { V12ResponseBloop } from './variants/V12ResponseBloop';
import type { VariantDef } from './types';

export const variants: Record<string, VariantDef> = {
  v1_minimal: {
    id: 'v1_minimal',
    label: 'V1 · Minimal (control)',
    blurb: 'Italic "Resolving…" line per tool, replaced inline with the result.',
    Render: V1Minimal,
  },
  v2_claude_steps: {
    id: 'v2_claude_steps',
    label: 'V2 · Claude Steps',
    blurb: 'Collapsible operation card per tool, with file chip + inspectable artifact.',
    Render: V2ClaudeSteps,
  },
  v3_perplexity: {
    id: 'v3_perplexity',
    label: 'V3 · Perplexity Sources',
    blurb: 'Collapsible "Searching…" header revealing each match/deal as a source row.',
    Render: V3Perplexity,
  },
  v4_task_list: {
    id: 'v4_task_list',
    label: 'V4 · Task List',
    blurb: 'Vertical chain-of-thought (◯ → ◐ → ✓), expand to inspect args/result.',
    Render: V4TaskList,
  },
  v5_immersive: {
    id: 'v5_immersive',
    label: 'V5 · Immersive Task List',
    blurb: 'Chrome-free chain with a liquid "gloop" indicator that morphs from pulse to tick.',
    Render: V5Immersive,
  },
  v6_matrix_grid: {
    id: 'v6_matrix_grid',
    label: 'V6 · Matrix Grid',
    blurb: 'Per-task 5×5 dot tile (Anthropic-mark vibes); pulses while running, snaps into a check shape on done.',
    Render: V6MatrixGrid,
  },
  v7_terminal_stream: {
    id: 'v7_terminal_stream',
    label: 'V7 · Terminal Stream',
    blurb: 'Dark monospaced CLI slab with a braille spinner and clip-path typewriter that snaps to ✓ / ✗.',
    Render: V7TerminalStream,
  },
  v8_ribbon_ticker: {
    id: 'v8_ribbon_ticker',
    label: 'V8 · Ribbon Ticker',
    blurb: 'Dynamic-Island-style pill that elastically morphs per tool, with a clipped progress beam.',
    Render: V8RibbonTicker,
  },
  v9_terminal_stacked: {
    id: 'v9_terminal_stacked',
    label: 'V9 · Terminal Stacked',
    blurb: 'Same flat terminal vocabulary as V7, but the tool name lives on a tabbed-in second line so the headline reads first.',
    Render: V9TerminalStacked,
  },
  v10_terminal_workflow: {
    id: 'v10_terminal_workflow',
    label: 'V10 · Terminal Workflow',
    blurb: 'Headline is just the workflow stage; tool call + raw JSON-ish result drop into the sub line. Completion glyph is a circular ring that draws around then pops a check.',
    Render: V10TerminalWorkflow,
  },
  v11_terminal_collapse: {
    id: 'v11_terminal_collapse',
    label: 'V11 · Terminal Collapse',
    blurb: 'Same as V10 while the stream runs, then the step list collapses up into a one-line summary; tap to re-expand. Answer loads beneath.',
    Render: V11TerminalCollapse,
  },
  v12_response_bloop: {
    id: 'v12_response_bloop',
    label: 'V12 · Response Bloop',
    blurb: 'Fork of V11: the answer waits until the step rail has finished collapsing, then appears with a minimal fade and slight lift—same step collapse, calmer message entrance.',
    Render: V12ResponseBloop,
  },
};

export const variantOrder = [
  'v1_minimal',
  'v2_claude_steps',
  'v3_perplexity',
  'v4_task_list',
  'v5_immersive',
  'v6_matrix_grid',
  'v7_terminal_stream',
  'v8_ribbon_ticker',
  'v9_terminal_stacked',
  'v10_terminal_workflow',
  'v11_terminal_collapse',
  'v12_response_bloop',
] as const;

export type VariantId = (typeof variantOrder)[number];

export const DEFAULT_VARIANT_ID: VariantId = 'v12_response_bloop';
