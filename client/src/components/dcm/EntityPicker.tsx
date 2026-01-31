// Entity Picker - Disambiguation UI when multiple entities match
import { useState } from 'react';

interface Issuer {
  id: string;
  lei: string;
  name: string;
  shortName: string;
  sector: string;
  country: string;
  ratings: { agency: string; rating: string }[];
}

interface EntityPickerProps {
  query: string;
  matches: Issuer[];
  onSelect: (issuerId: string) => void;
}

export function EntityPicker({ query, matches, onSelect }: EntityPickerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    onSelect(id);
  };

  return (
    <div className="mt-3 bg-white border border-amber-200 rounded-lg overflow-hidden shadow-sm">
      <div className="px-4 py-3 bg-amber-50 border-b border-amber-200">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-semibold text-amber-800">
            Multiple matches for "{query}"
          </span>
        </div>
        <p className="text-xs text-amber-600 mt-1">Please select the correct issuer:</p>
      </div>
      
      <div className="divide-y divide-stone-100">
        {matches.map((issuer) => (
          <button
            key={issuer.id}
            onClick={() => handleSelect(issuer.id)}
            disabled={selectedId !== null}
            className={`w-full px-4 py-3 text-left transition-colors ${
              selectedId === issuer.id
                ? 'bg-blue-50 border-l-4 border-blue-500'
                : selectedId !== null
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-stone-50 cursor-pointer'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold text-stone-800">{issuer.shortName}</div>
                <div className="text-xs text-stone-500 mt-0.5">{issuer.name}</div>
                <div className="flex gap-3 mt-1.5">
                  <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded">
                    {issuer.sector}
                  </span>
                  <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded">
                    {issuer.country}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-stone-400">Ratings</div>
                <div className="flex gap-1 mt-0.5 flex-wrap justify-end">
                  {issuer.ratings.slice(0, 2).map((r) => (
                    <span key={r.agency} className="text-xs font-medium text-stone-700">
                      {r.agency}: {r.rating}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
      
      {selectedId && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-100 text-xs text-blue-700">
          Selected: {matches.find(m => m.id === selectedId)?.shortName}
        </div>
      )}
    </div>
  );
}
