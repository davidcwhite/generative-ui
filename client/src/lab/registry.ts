import { V13StreamingSteps } from './variants/V13StreamingSteps';
import { V14SublimeStream } from './variants/V14SublimeStream';
import { V15AmbientStream } from './variants/V15AmbientStream';
import { V16SoftFocusStream } from './variants/V16SoftFocusStream';
import { V17ParsedSignalStream } from './variants/V17ParsedSignalStream';
import { V18DataRibbonStream } from './variants/V18DataRibbonStream';
import type { VariantDef } from './types';

export const variants: Record<string, VariantDef> = {
  v13_streaming_steps: {
    id: 'v13_streaming_steps',
    label: 'V13 · Streaming steps',
    blurb: 'V12+ mock “SSE” under the active tool row: a clipped, auto-scrolling log; when it finishes, the step ticks to done and the next step streams. The final response waits until the walkthrough completes.',
    Render: V13StreamingSteps,
  },
  v14_sublime_stream: {
    id: 'v14_sublime_stream',
    label: 'V14 · Sublime stream',
    blurb: 'A quieter critique of V13: the stream remains transparent, but becomes a small fading “receiving” treatment so the workflow stage stays primary and raw data reads as ambient proof of work.',
    Render: V14SublimeStream,
  },
  v15_ambient_stream: {
    id: 'v15_ambient_stream',
    label: 'V15 · Ambient stream',
    blurb: 'Fork of V14 that removes the literal “receiving” label; a faint gutter and masked two-line data flow make the sub-stream feel native to the step row.',
    Render: V15AmbientStream,
  },
  v16_soft_focus_stream: {
    id: 'v16_soft_focus_stream',
    label: 'V16 · Soft focus stream',
    blurb: 'V15 with softer motion: raw records remain visible, but older lines drift back and the current line receives a gentle focus treatment.',
    Render: V16SoftFocusStream,
  },
  v17_parsed_signal_stream: {
    id: 'v17_parsed_signal_stream',
    label: 'V17 · Parsed signal stream',
    blurb: 'V15 mechanics with JSON records condensed into semantic signal snippets, reducing log noise while preserving full detail on expand.',
    Render: V17ParsedSignalStream,
  },
  v18_data_ribbon_stream: {
    id: 'v18_data_ribbon_stream',
    label: 'V18 · Data ribbon stream',
    blurb: 'V15 as a quiet horizontal ribbon: streamed records arrive as small data pills sliding through the sub-step area.',
    Render: V18DataRibbonStream,
  },
};

export const variantOrder = [
  'v13_streaming_steps',
  'v14_sublime_stream',
  'v15_ambient_stream',
  'v16_soft_focus_stream',
  'v17_parsed_signal_stream',
  'v18_data_ribbon_stream',
] as const;

export type VariantId = (typeof variantOrder)[number];

export const DEFAULT_VARIANT_ID: VariantId = 'v18_data_ribbon_stream';
