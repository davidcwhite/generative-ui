// Issuer Timeline - Vertical timeline of bond issuances

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

interface IssuerTimelineProps {
  issuerName: string;
  deals: Deal[];
  summary: {
    totalDeals: number;
    totalRaised: number;
    avgTenor: string;
    avgNip: number;
    avgOversubscription: number;
  };
}

export function IssuerTimeline({ issuerName, deals, summary }: IssuerTimelineProps) {
  const formatCurrency = (value: number, currency: string = 'EUR') => {
    const symbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
    return `${symbol}${value.toLocaleString()}M`;
  };

  return (
    <div className="mt-3 bg-white border border-stone-200 rounded-lg overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 bg-stone-100 border-b border-stone-200">
        <h3 className="font-semibold text-stone-800">{issuerName} - Issuance History</h3>
        <div className="flex gap-4 mt-2 text-xs">
          <span className="bg-white px-2 py-1 rounded border border-stone-200">
            <span className="text-stone-500">Deals:</span> <span className="font-semibold">{summary.totalDeals}</span>
          </span>
          <span className="bg-white px-2 py-1 rounded border border-stone-200">
            <span className="text-stone-500">Total:</span> <span className="font-semibold">€{summary.totalRaised.toLocaleString()}M</span>
          </span>
          <span className="bg-white px-2 py-1 rounded border border-stone-200">
            <span className="text-stone-500">Avg NIP:</span> <span className="font-semibold">{summary.avgNip}bps</span>
          </span>
          <span className="bg-white px-2 py-1 rounded border border-stone-200">
            <span className="text-stone-500">Avg Oversub:</span> <span className="font-semibold text-emerald-600">{summary.avgOversubscription}x</span>
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div className="px-4 py-3">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-blue-200" />

          {/* Timeline items */}
          <div className="space-y-4">
            {deals.map((deal, index) => (
              <div key={deal.id} className="relative pl-8">
                {/* Dot */}
                <div className={`absolute left-1.5 top-1.5 w-3 h-3 rounded-full border-2 ${
                  index === 0 ? 'bg-blue-500 border-blue-500' : 'bg-white border-blue-300'
                }`} />

                {/* Content */}
                <div className="bg-stone-50 rounded-lg p-3 border border-stone-200 hover:border-blue-200 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-stone-800">
                        {deal.coupon}% {deal.tenor}
                      </div>
                      <div className="text-xs text-stone-500 mt-0.5">{deal.pricingDate}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-stone-800">
                        {formatCurrency(deal.size, deal.currency)}
                      </div>
                      <div className="text-xs text-stone-500">{deal.spread}bps | {deal.oversubscription}x</div>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      deal.nip <= 5 ? 'bg-emerald-100 text-emerald-700' : 
                      deal.nip <= 10 ? 'bg-amber-100 text-amber-700' : 
                      'bg-red-100 text-red-700'
                    }`}>
                      NIP: {deal.nip}bps
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-stone-200 text-stone-600 font-mono">
                      {deal.isin}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
