import { useChat } from '@ai-sdk/react';
import { useCallback, useState } from 'react';
import { LabChatHeader } from './LabChatHeader';
import { Spinner } from './components/Spinner';
import { DEFAULT_VARIANT_ID, variants } from './registry';
import type { ChatStatus, LabInjectError, LabSpeed } from './types';

const DEFAULT_PROMPT = "We're pitching BMW for a mandate";
const PROMPT_SUGGESTIONS = [
  "We're pitching BMW for a mandate",
  'Brief BMW for tomorrow',
  'Generate a mandate brief for BMW',
];

export function LabChatView() {
  const [activeVariantId, setActiveVariantId] = useState<string>(
    DEFAULT_VARIANT_ID,
  );
  const [speed, setSpeed] = useState<LabSpeed>('normal');
  const [injectError, setInjectError] = useState<LabInjectError>('none');

  // Build a query-string-suffixed API URL that re-evaluates whenever the
  // user changes speed / injectError. The mock route reads both from
  // `req.query` so this is a clean way to thread per-request settings
  // without an `experimental_prepareRequestBody` indirection.
  const apiUrl = `/api/dcm/mock-chat?speed=${speed}&injectError=${injectError}`;

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    setMessages,
    status,
    stop,
    append,
    error,
  } = useChat({
    api: apiUrl,
    id: 'lab-chat',
    streamProtocol: 'data',
  });

  const isStreaming = status === 'submitted' || status === 'streaming';

  const handleReplay = useCallback(() => {
    stop();
    setMessages([]);
    void append({ role: 'user', content: DEFAULT_PROMPT });
  }, [append, setMessages, stop]);

  const variant = variants[activeVariantId] ?? variants[DEFAULT_VARIANT_ID];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 md:px-6">
      <LabChatHeader
        activeVariantId={activeVariantId}
        onVariantChange={setActiveVariantId}
        speed={speed}
        onSpeedChange={setSpeed}
        injectError={injectError}
        onInjectErrorChange={setInjectError}
        onReplay={handleReplay}
        isStreaming={isStreaming}
        onStop={stop}
      />

      <div
        className="flex min-h-[400px] flex-col gap-5"
        aria-live="polite"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-200 bg-white px-6 py-12 text-center">
            <h2 className="text-base font-semibold text-stone-800">
              Compare AI-chat processing UX
            </h2>
            <p className="mb-5 mt-1 max-w-md text-sm text-stone-500">
              Pick a variant above, then send a prompt. Every variant plays
              the same canonical BMW mandate-brief scenario through the
              real Vercel AI SDK data-stream protocol.
            </p>
            <div className="flex w-full max-w-md flex-col gap-2">
              {PROMPT_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() =>
                    void append({ role: 'user', content: s })
                  }
                  className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-left text-sm text-stone-700 hover:border-stone-300 hover:bg-stone-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, idx) => {
          const isLast = idx === messages.length - 1;
          if (message.role === 'user') {
            return (
              <div
                key={message.id}
                className="self-end max-w-[80%] rounded-2xl bg-stone-100 px-4 py-2.5 text-sm text-stone-800"
              >
                {message.content}
              </div>
            );
          }
          const status: ChatStatus = isLast
            ? (isStreaming ? 'streaming' : (error ? 'error' : 'ready'))
            : 'ready';
          return (
            <div
              key={message.id}
              className="self-start w-full text-sm leading-relaxed text-stone-700"
            >
              <variant.Render
                message={message}
                status={status}
                isLastMessage={isLast}
              />
            </div>
          );
        })}

        {status === 'submitted' && (
          <div className="self-start w-full">
            <div className="flex items-center gap-2 rounded-md border border-stone-200 bg-white px-3 py-2 text-xs text-stone-500">
              <Spinner size={12} />
              <span>Connecting to mock stream…</span>
            </div>
          </div>
        )}

        {error && (
          <div className="self-start w-full rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error.message}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white p-2"
      >
        <input
          value={input}
          onChange={handleInputChange}
          placeholder={
            isStreaming
              ? 'Streaming… type to queue next prompt'
              : 'Send a prompt — any text triggers the BMW scenario'
          }
          className="flex-1 bg-transparent px-2 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none"
        />
        {isStreaming ? (
          <button
            type="button"
            onClick={stop}
            className="rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="rounded-md bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-800 disabled:opacity-40"
          >
            Send
          </button>
        )}
      </form>
      <p className="text-center text-[10px] text-stone-400">
        Wire format: same as <code className="font-mono">/api/dcm/chat</code>{' '}
        — winning variant is one URL swap from production.
      </p>
    </div>
  );
}
