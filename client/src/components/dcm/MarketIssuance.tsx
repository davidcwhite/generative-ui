// Market Issuance - Display aggregate market bond issuance data

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

interface MarketSummary {
  totalDeals: number;
  totalVolume: number;
  avgSpread: number;
  avgNip: number;
  bySector: { sector: string; count: number; volume: number }[];
  byCurrency: { currency: string; count: number; volume: number }[];
}

interface MarketIssuanceProps {
  deals: Deal[];
  summary: MarketSummary;
  filters: {
    sector: string;
    currency: string;
    showing: number;
  };
}

export function MarketIssuance({ deals, summary, filters }: MarketIssuanceProps) {
  const formatCurrency = (value: number, currency: string = 'EUR') => {
    const symbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
    return `${symbol}${value.toLocaleString()}M`;
  };

  return (
    <div className="mt-3 bg-white border border-stone-200 rounded-lg overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 bg-stone-100 border-b border-stone-200">
        <h3 className="font-semibold text-stone-800">Market Issuance Overview</h3>
        <p className="text-xs text-stone-500 mt-0.5">
          {filters.sector !== 'All' && `Sector: ${filters.sector} | `}
          {filters.currency !== 'All' && `Currency: ${filters.currency} | `}
          Showing {filters.showing} deals
        </p>
      </div>

      {/* Summary Stats */}
      <div className="px-4 py-3 border-b border-stone-100">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-stone-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-stone-800">{summary.totalDeals}</div>
            <div className="text-xs text-stone-500">Total Deals</div>
          </div>
          <div className="bg-stone-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-stone-800">€{(summary.totalVolume / 1000).toFixed(1)}B</div>
            <div className="text-xs text-stone-500">Total Volume</div>
          </div>
          <div className="bg-stone-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-stone-800">{summary.avgSpread}bps</div>
            <div className="text-xs text-stone-500">Avg Spread</div>
          </div>
          <div className="bg-stone-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-stone-800">{summary.avgNip}bps</div>
            <div className="text-xs text-stone-500">Avg NIP</div>
          </div>
        </div>

        {/* Sector breakdown */}
        {summary.bySector.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {summary.bySector.slice(0, 5).map((s) => (
              <span key={s.sector} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
                {s.sector}: {s.count} ({Math.round((s.volume / summary.totalVolume) * 100)}%)
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Deals Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stone-50 text-stone-600 text-xs uppercase">
              <th className="px-4 py-2 text-left font-medium">Date</th>
              <th className="px-4 py-2 text-left font-medium">Issuer</th>
              <th className="px-4 py-2 text-left font-medium">Bond</th>
              <th className="px-4 py-2 text-right font-medium">Size</th>
              <th className="px-4 py-2 text-right font-medium">Spread</th>
              <th className="px-4 py-2 text-right font-medium">NIP</th>
              <th className="px-4 py-2 text-right font-medium">Oversub</th>
            </tr>
          </thead>
          <tbody>
            {deals.map((deal, index) => (
              <tr 
                key={deal.id} 
                className={`border-t border-stone-100 hover:bg-stone-50 transition-colors ${
                  index === 0 ? 'bg-blue-50/30' : ''
                }`}
              >
                <td className="px-4 py-2.5 text-stone-600 whitespace-nowrap">
                  {deal.pricingDate}
                </td>
                <td className="px-4 py-2.5 font-medium text-stone-800">
                  {deal.issuerName}
                </td>
                <td className="px-4 py-2.5 text-stone-600">
                  <span className="font-medium">{deal.coupon}%</span> {deal.tenor}
                  <span className="text-stone-400 text-xs ml-2">{deal.currency}</span>
                </td>
                <td className="px-4 py-2.5 text-right font-medium text-stone-800">
                  {formatCurrency(deal.size, deal.currency)}
                </td>
                <td className="px-4 py-2.5 text-right text-stone-600">
                  {deal.spread}bps
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span className={`px-1.5 py-0.5 rounded text-xs ${
                    deal.nip <= 5 ? 'bg-emerald-100 text-emerald-700' : 
                    deal.nip <= 10 ? 'bg-amber-100 text-amber-700' : 
                    'bg-red-100 text-red-700'
                  }`}>
                    {deal.nip}bps
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right text-emerald-600 font-medium">
                  {deal.oversubscription}x
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {deals.length >= 10 && (
        <div className="px-4 py-2 bg-stone-50 border-t border-stone-100 text-center">
          <span className="text-xs text-stone-500">
            Showing top {deals.length} recent deals by pricing date
          </span>
        </div>
      )}
    </div>
  );
}
