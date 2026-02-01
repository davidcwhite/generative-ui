import { useState, useEffect } from 'react';

interface Deal {
  id: string;
  issuerName: string;
  isin: string;
  pricingDate: string;
  currency: string;
  size: number;
  tenor: string;
  coupon: number;
  spread: number;
  nip: number;
  oversubscription: number;
}

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api/dcm/chat', '') || '';

export function IssuanceView() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDeals() {
      try {
        const response = await fetch(`${API_BASE}/api/data/deals`);
        if (!response.ok) throw new Error('Failed to fetch deals');
        const data = await response.json();
        setDeals(data.deals || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    fetchDeals();
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
        <h2 className="text-xl font-semibold text-[#1A1A1A] mb-1">Recent Issuance</h2>
        <p className="text-sm text-stone-500">Latest bond deals across all issuers</p>
      </div>

      <div className="bg-white border border-[#E5E5E3] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F5F5F3] border-b border-[#E5E5E3]">
                <th className="text-left px-4 py-3 font-medium text-stone-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Issuer</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">ISIN</th>
                <th className="text-right px-4 py-3 font-medium text-stone-600">Size</th>
                <th className="text-center px-4 py-3 font-medium text-stone-600">Tenor</th>
                <th className="text-right px-4 py-3 font-medium text-stone-600">Coupon</th>
                <th className="text-right px-4 py-3 font-medium text-stone-600">Spread</th>
                <th className="text-right px-4 py-3 font-medium text-stone-600">NIP</th>
                <th className="text-right px-4 py-3 font-medium text-stone-600">Overs.</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((deal) => (
                <tr key={deal.id} className="border-b border-[#E5E5E3] hover:bg-[#FAFAF8] transition-colors">
                  <td className="px-4 py-3 text-stone-600">{new Date(deal.pricingDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-medium text-[#1A1A1A]">{deal.issuerName}</td>
                  <td className="px-4 py-3 text-stone-500 font-mono text-xs">{deal.isin}</td>
                  <td className="px-4 py-3 text-right text-stone-600">{deal.currency} {deal.size}M</td>
                  <td className="px-4 py-3 text-center text-stone-600">{deal.tenor}</td>
                  <td className="px-4 py-3 text-right text-stone-600">{deal.coupon}%</td>
                  <td className="px-4 py-3 text-right text-stone-600">{deal.spread}bps</td>
                  <td className={`px-4 py-3 text-right font-medium ${deal.nip <= 5 ? 'text-emerald-600' : deal.nip <= 10 ? 'text-amber-600' : 'text-rose-600'}`}>
                    {deal.nip}bps
                  </td>
                  <td className="px-4 py-3 text-right text-stone-600">{deal.oversubscription}x</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {deals.length === 0 && (
          <div className="text-center py-8 text-stone-500">No deals found</div>
        )}
      </div>
    </div>
  );
}
