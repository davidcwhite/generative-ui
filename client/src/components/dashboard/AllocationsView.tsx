import { useState, useEffect } from 'react';

interface AllocationSummary {
  dealId: string;
  issuerName: string;
  size: number;
  oversubscription: number;
  topInvestorTypes: { type: string; percentage: number }[];
}

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api/dcm/chat', '') || '';

export function AllocationsView() {
  const [allocations, setAllocations] = useState<AllocationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAllocations() {
      try {
        const response = await fetch(`${API_BASE}/api/data/allocations`);
        if (!response.ok) throw new Error('Failed to fetch allocations');
        const data = await response.json();
        setAllocations(data.allocations || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    fetchAllocations();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-6 w-6 border-2 border-stone-300 border-t-stone-600 rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-stone-500">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-[#1A1A1A] mb-1">Allocation Summary</h2>
        <p className="text-sm text-stone-500">Investor allocation breakdown by deal</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {allocations.map((alloc) => (
          <div key={alloc.dealId} className="bg-white border border-[#E5E5E3] rounded-xl p-5 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-[#1A1A1A]">{alloc.issuerName}</h3>
                <p className="text-xs text-stone-500 mt-0.5">€{alloc.size}M</p>
              </div>
              <span className="text-emerald-600 font-semibold text-sm">{alloc.oversubscription}x</span>
            </div>
            
            <div className="space-y-2">
              {alloc.topInvestorTypes.map((inv) => (
                <div key={inv.type} className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-[#E5E5E3] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${inv.percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-stone-600 w-24 text-right">{inv.type}</span>
                  <span className="text-xs font-medium text-stone-800 w-10 text-right">{inv.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {allocations.length === 0 && (
        <div className="text-center py-12 text-stone-500">No allocation data available</div>
      )}
    </div>
  );
}
