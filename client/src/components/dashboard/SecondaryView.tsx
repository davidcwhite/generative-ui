import { useState, useEffect } from 'react';

interface SecondaryData {
  isin: string;
  issuerName: string;
  issueSpread: number;
  currentSpread: number;
  spreadDrift: number;
  trend: 'Tightening' | 'Widening' | 'Stable';
  avgVolume: number;
}

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api/dcm/chat', '') || '';

export function SecondaryView() {
  const [secondaryData, setSecondaryData] = useState<SecondaryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSecondary() {
      try {
        const response = await fetch(`${API_BASE}/api/data/secondary`);
        if (!response.ok) throw new Error('Failed to fetch secondary data');
        const data = await response.json();
        setSecondaryData(data.secondary || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    fetchSecondary();
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
        <h2 className="text-xl font-semibold text-[#1A1A1A] mb-1">Secondary Performance</h2>
        <p className="text-sm text-stone-500">Spread drift and trading activity</p>
      </div>

      <div className="bg-white border border-[#E5E5E3] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F5F5F3] border-b border-[#E5E5E3]">
                <th className="text-left px-4 py-3 font-medium text-stone-600">Issuer</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">ISIN</th>
                <th className="text-right px-4 py-3 font-medium text-stone-600">Issue Spread</th>
                <th className="text-right px-4 py-3 font-medium text-stone-600">Current Spread</th>
                <th className="text-right px-4 py-3 font-medium text-stone-600">Drift</th>
                <th className="text-center px-4 py-3 font-medium text-stone-600">Trend</th>
                <th className="text-right px-4 py-3 font-medium text-stone-600">Avg Volume</th>
              </tr>
            </thead>
            <tbody>
              {secondaryData.map((item) => (
                <tr key={item.isin} className="border-b border-[#E5E5E3] hover:bg-[#FAFAF8] transition-colors">
                  <td className="px-4 py-3 font-medium text-[#1A1A1A]">{item.issuerName}</td>
                  <td className="px-4 py-3 text-stone-500 font-mono text-xs">{item.isin}</td>
                  <td className="px-4 py-3 text-right text-stone-600">{item.issueSpread}bps</td>
                  <td className="px-4 py-3 text-right text-stone-600">{item.currentSpread}bps</td>
                  <td className={`px-4 py-3 text-right font-medium ${item.spreadDrift < 0 ? 'text-emerald-600' : item.spreadDrift > 0 ? 'text-rose-600' : 'text-stone-600'}`}>
                    {item.spreadDrift > 0 ? '+' : ''}{item.spreadDrift}bps
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                      item.trend === 'Tightening' ? 'bg-emerald-100 text-emerald-700' :
                      item.trend === 'Widening' ? 'bg-rose-100 text-rose-700' :
                      'bg-stone-100 text-stone-700'
                    }`}>
                      {item.trend === 'Tightening' && '↓'}
                      {item.trend === 'Widening' && '↑'}
                      {item.trend === 'Stable' && '→'}
                      {item.trend}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-stone-600">€{(item.avgVolume / 1000000).toFixed(1)}M</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {secondaryData.length === 0 && (
          <div className="text-center py-8 text-stone-500">No secondary data available</div>
        )}
      </div>
    </div>
  );
}
