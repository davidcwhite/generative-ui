import { useCallback, useEffect, useState } from 'react';

const SAVED_PROMPTS_KEY = 'pf-saved-prompts';
const MAX_SAVED_PROMPTS = 30;

export interface SavedPrompt {
  id: string;
  label: string;
  prompt: string;
  savedAt: number;
}

function loadSavedPrompts(): SavedPrompt[] {
  try {
    const stored = localStorage.getItem(SAVED_PROMPTS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed as SavedPrompt[];
      }
    }
  } catch (e) {
    console.warn('Failed to load saved prompts:', e);
  }
  return [];
}

function persistSavedPrompts(prompts: SavedPrompt[]) {
  try {
    localStorage.setItem(SAVED_PROMPTS_KEY, JSON.stringify(prompts.slice(0, MAX_SAVED_PROMPTS)));
  } catch (e) {
    console.warn('Failed to persist saved prompts:', e);
  }
}

/** Normalize prompt text so equivalent prompts collapse to one saved entry. */
function promptKey(prompt: string): string {
  return prompt.trim().toLowerCase();
}

export function useSavedPrompts() {
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>(() => loadSavedPrompts());

  useEffect(() => {
    persistSavedPrompts(savedPrompts);
  }, [savedPrompts]);

  const isSaved = useCallback(
    (prompt: string) => {
      const key = promptKey(prompt);
      return savedPrompts.some((p) => promptKey(p.prompt) === key);
    },
    [savedPrompts],
  );

  const savePrompt = useCallback((prompt: string, label?: string) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    setSavedPrompts((prev) => {
      const key = promptKey(trimmed);
      if (prev.some((p) => promptKey(p.prompt) === key)) {
        return prev;
      }
      const entry: SavedPrompt = {
        id: `saved-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        label: (label ?? trimmed).slice(0, 80),
        prompt: trimmed,
        savedAt: Date.now(),
      };
      return [entry, ...prev].slice(0, MAX_SAVED_PROMPTS);
    });
  }, []);

  const removePrompt = useCallback((id: string) => {
    setSavedPrompts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const togglePrompt = useCallback(
    (prompt: string, label?: string) => {
      const trimmed = prompt.trim();
      if (!trimmed) return;
      const key = promptKey(trimmed);
      setSavedPrompts((prev) => {
        const existing = prev.find((p) => promptKey(p.prompt) === key);
        if (existing) {
          return prev.filter((p) => p.id !== existing.id);
        }
        const entry: SavedPrompt = {
          id: `saved-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          label: (label ?? trimmed).slice(0, 80),
          prompt: trimmed,
          savedAt: Date.now(),
        };
        return [entry, ...prev].slice(0, MAX_SAVED_PROMPTS);
      });
    },
    [],
  );

  return { savedPrompts, isSaved, savePrompt, removePrompt, togglePrompt };
}
