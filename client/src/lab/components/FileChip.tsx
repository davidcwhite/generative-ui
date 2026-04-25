interface FileChipProps {
  filename: string;
  language?: string;
  meta?: string;
}

// Compact pill mirroring the "filename.py · python" chip in Claude's
// "Writing to organiser.py" pattern.
export function FileChip({ filename, language, meta }: FileChipProps) {
  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-stone-200 bg-white px-2 py-1 text-[11px] font-medium text-stone-700">
      <svg width="11" height="11" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d="M6 3h5l4 4v9a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 5 16V4.5A1.5 1.5 0 0 1 6.5 3z"
          stroke="currentColor"
          strokeWidth="1.4"
          fill="none"
        />
        <path d="M11 3v4h4" stroke="currentColor" strokeWidth="1.4" fill="none" />
      </svg>
      <span className="font-mono">{filename}</span>
      {language && (
        <span className="rounded-sm bg-stone-100 px-1 py-px text-[10px] text-stone-500">
          {language}
        </span>
      )}
      {meta && <span className="text-stone-400">{meta}</span>}
    </span>
  );
}
