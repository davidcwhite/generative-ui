// Shared types for the UX experiments lab.
//
// Each variant receives a single assistant `Message` and renders it however
// it likes (collapsible step card, source list, task list, etc.). The host
// `LabChatView` handles user messages, the input, and stream orchestration
// uniformly across variants.

import type { Message } from '@ai-sdk/react';
import type { ReactNode } from 'react';

export type LabSpeed = 'fast' | 'normal' | 'slow';
export type LabInjectError = 'none' | 'tool' | 'stream';

export type ChatStatus = 'submitted' | 'streaming' | 'ready' | 'error';

export interface VariantRenderProps {
  message: Message;
  status: ChatStatus;
  isLastMessage: boolean;
}

export interface VariantDef {
  id: string;
  label: string;
  blurb: string;
  Render: (props: VariantRenderProps) => ReactNode;
}
