// Comparable Deals Panel - Peer comparison view

interface DealSummary {
  totalDeals: number;
  totalRaised: number;
  avgTenor: string;
  avgNip: number;
  avgOversubscription: number;
}

interface Deal {
  id: string;
  issuerName: string;
  pricingDate: string;
  currency: string;
  size: number;
  tenor: string;
  coupon: number;
  spread: number;
  nip: number;
  oversubscription: number;
}

interface Peer {
  issuerId: string;
  issuerName: string;
  deals: Deal[];
  summary: DealSummary;
}

interface ComparableDealsPanelProps {
  issuer: {
    id: string;
    name: string;
    sector: string;
  };
  issuerSummary: DealSummary;
  issuerDeals: Deal[];
  peers: Peer[];
  comparison: {
    nipVsPeers: string;
  };
}

export function ComparableDealsPanel({ issuer, issuerSummary, issuerDeals, peers, comparison }: ComparableDealsPanelProps) {
  const formatCurrency = (value: number) => `€${value.toLocaleString()}M`;

  return (
    <div className="mt-3 bg-white border border-stone-200 rounded-lg overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white">
        <h3 className="font-semibold">Peer Comparison - {issuer.sector}</h3>
        <p className="text-indigo-200 text-xs mt-0.5">{issuer.name} vs sector peers</p>
      </div>

      {/* Summary Insight */}
      <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <span className="text-sm text-indigo-800 font-medium">{comparison.nipVsPeers}</span>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200">
              <th className="px-4 py-2 text-left text-xs font-semibold text-stone-600">Issuer</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-stone-600">Deals</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-stone-600">Total Raised</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-stone-600">Avg Tenor</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-stone-600">Avg NIP</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-stone-600">Avg Oversub</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {/* Issuer row (highlighted) */}
            <tr className="bg-blue-50">
              <td className="px-4 py-2 font-semibold text-blue-800">{issuer.name}</td>
              <td className="px-4 py-2 text-right text-stone-700">{issuerSummary.totalDeals}</td>
              <td className="px-4 py-2 text-right text-stone-700">{formatCurrency(issuerSummary.totalRaised)}</td>
              <td className="px-4 py-2 text-right text-stone-700">{issuerSummary.avgTenor}</td>
              <td className="px-4 py-2 text-right font-semibold text-blue-700">{issuerSummary.avgNip}bps</td>
              <td className="px-4 py-2 text-right text-emerald-600 font-semibold">{issuerSummary.avgOversubscription}x</td>
            </tr>
            {/* Peer rows */}
            {peers.map((peer) => (
              <tr key={peer.issuerId} className="hover:bg-stone-50">
                <td className="px-4 py-2 font-medium text-stone-700">{peer.issuerName}</td>
                <td className="px-4 py-2 text-right text-stone-600">{peer.summary.totalDeals}</td>
                <td className="px-4 py-2 text-right text-stone-600">{formatCurrency(peer.summary.totalRaised)}</td>
                <td className="px-4 py-2 text-right text-stone-600">{peer.summary.avgTenor}</td>
                <td className="px-4 py-2 text-right text-stone-600">{peer.summary.avgNip}bps</td>
                <td className="px-4 py-2 text-right text-stone-600">{peer.summary.avgOversubscription}x</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent Deals */}
      <div className="px-4 py-3 border-t border-stone-200">
        <h4 className="text-xs font-semibold text-stone-500 mb-2">{issuer.name} - Recent Deals</h4>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {issuerDeals.slice(0, 3).map((deal) => (
            <div key={deal.id} className="flex-shrink-0 bg-stone-50 rounded px-3 py-2 border border-stone-200 text-xs">
              <div className="font-semibold text-stone-700">{deal.coupon}% {deal.tenor}</div>
              <div className="text-stone-500">{formatCurrency(deal.size)} | {deal.spread}bps</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
