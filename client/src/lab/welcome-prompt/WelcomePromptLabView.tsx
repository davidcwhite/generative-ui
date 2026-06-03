import { useMemo, useRef, useState } from 'react';
import { Bookmark, Check } from 'lucide-react';
import { WelcomeHero } from './WelcomeHero';
import { PromptCategoryBar, type PromptCategoryChip } from './PromptCategoryBar';
import { PromptCategoryPanel, type PromptPanelItem } from './PromptCategoryPanel';
import { useSavedPrompts } from './useSavedPrompts';
import { promptCategories, promptSuggestions } from './welcomePromptData';

const SAVED_CHIP_ID = 'saved';

export function WelcomePromptLabView() {
  const [committed, setCommitted] = useState('');
  const [hovered, setHovered] = useState<string | null>(null);
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);
  const [lastSent, setLastSent] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { savedPrompts, isSaved, togglePrompt, removePrompt } = useSavedPrompts();

  const chips = useMemo<PromptCategoryChip[]>(
    () => [...promptCategories, { id: SAVED_CHIP_ID, label: 'Saved', icon: Bookmark }],
    [],
  );

  const openMeta = useMemo(() => {
    if (openCategoryId === SAVED_CHIP_ID) {
      return { title: 'Saved', icon: Bookmark, variant: 'saved' as const };
    }
    const category = promptCategories.find((c) => c.id === openCategoryId);
    return category
      ? { title: category.label, icon: category.icon, variant: 'canned' as const }
      : null;
  }, [openCategoryId]);

  const openItems = useMemo<PromptPanelItem[]>(() => {
    if (openCategoryId === SAVED_CHIP_ID) {
      return savedPrompts.map((p) => ({ id: p.id, label: p.label, prompt: p.prompt }));
    }
    return promptSuggestions
      .filter((s) => s.categoryId === openCategoryId)
      .map((s) => ({ id: s.id, label: s.label, prompt: s.prompt }));
  }, [openCategoryId, savedPrompts]);

  const handleCommit = (item: PromptPanelItem) => {
    setCommitted(item.prompt);
    setHovered(null);
    setOpenCategoryId(null);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleSubmit = () => {
    const trimmed = committed.trim();
    if (!trimmed) return;
    setLastSent(trimmed);
    setCommitted('');
  };

  const displayValue = hovered ?? committed;
  const isPreview = hovered !== null;

  return (
    <div className="min-h-full bg-[#FAFAF8]">
      <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-16 md:py-24">
        <h2 className="mb-8 text-center text-2xl font-semibold tracking-tight text-[#1A1A1A]">
          What are we working on?
        </h2>

        <WelcomeHero
          ref={textareaRef}
          displayValue={displayValue}
          isPreview={isPreview}
          onChange={setCommitted}
          onSubmit={handleSubmit}
        />

        <div className="mt-4 w-full">
          {openMeta ? (
            <PromptCategoryPanel
              title={openMeta.title}
              icon={openMeta.icon}
              items={openItems}
              variant={openMeta.variant}
              isSaved={isSaved}
              onClose={() => {
                setOpenCategoryId(null);
                setHovered(null);
              }}
              onHover={setHovered}
              onCommit={handleCommit}
              onToggleSave={(item) => togglePrompt(item.prompt, item.label)}
              onDelete={(item) => removePrompt(item.id)}
            />
          ) : (
            <PromptCategoryBar chips={chips} onSelect={setOpenCategoryId} />
          )}
        </div>

        {lastSent && !openMeta && (
          <div className="mt-6 flex w-full items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">
              Lab preview, would send: <span className="font-medium">{lastSent}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
