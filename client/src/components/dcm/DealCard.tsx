// Deal Card - Single deal summary display

interface Deal {
  id: string;
  issuerId: string;
  issuerName: string;
  isin: string;
  pricingDate: string;
  currency: string;
  size: number;
  tenor: string;
  coupon: number;
  reoffer: number;
  spread: number;
  nip: number;
  format: string;
  seniority: string;
  leads: string[];
  coLeads: string[];
  oversubscription: number;
}

interface DealCardProps {
  deal: Deal;
  compact?: boolean;
}

export function DealCard({ deal, compact = false }: DealCardProps) {
  const formatCurrency = (value: number, currency: string) => {
    const symbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
    return `${symbol}${value.toLocaleString()}M`;
  };

  if (compact) {
    return (
      <div className="bg-white border border-stone-200 rounded-lg p-3 shadow-sm">
        <div className="flex justify-between items-start">
          <div>
            <div className="font-semibold text-stone-800 text-sm">
              {deal.issuerName} {deal.coupon}% {deal.tenor}
            </div>
            <div className="text-xs text-stone-500 mt-0.5">{deal.pricingDate}</div>
          </div>
          <div className="text-right">
            <div className="font-semibold text-stone-800 text-sm">
              {formatCurrency(deal.size, deal.currency)}
            </div>
            <div className="text-xs text-stone-500">{deal.spread}bps</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 bg-white border border-stone-200 rounded-lg overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="flex justify-between items-start">
          <div>
            <div className="font-bold text-lg">{deal.issuerName}</div>
            <div className="text-blue-100 text-sm mt-0.5">
              {deal.coupon}% {deal.tenor} {deal.seniority}
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold text-lg">{formatCurrency(deal.size, deal.currency)}</div>
            <div className="text-blue-100 text-sm">{deal.format}</div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 divide-x divide-stone-200 border-b border-stone-200">
        <div className="px-3 py-2 text-center">
          <div className="text-xs text-stone-500">Spread</div>
          <div className="font-semibold text-stone-800">{deal.spread}bps</div>
        </div>
        <div className="px-3 py-2 text-center">
          <div className="text-xs text-stone-500">NIP</div>
          <div className="font-semibold text-stone-800">{deal.nip}bps</div>
        </div>
        <div className="px-3 py-2 text-center">
          <div className="text-xs text-stone-500">Reoffer</div>
          <div className="font-semibold text-stone-800">{deal.reoffer}</div>
        </div>
        <div className="px-3 py-2 text-center">
          <div className="text-xs text-stone-500">Oversub</div>
          <div className="font-semibold text-emerald-600">{deal.oversubscription}x</div>
        </div>
      </div>

      {/* Details */}
      <div className="px-4 py-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs text-stone-500 mb-1">Pricing Date</div>
            <div className="text-stone-700">{deal.pricingDate}</div>
          </div>
          <div>
            <div className="text-xs text-stone-500 mb-1">ISIN</div>
            <div className="text-stone-700 font-mono text-xs">{deal.isin}</div>
          </div>
          <div className="col-span-2">
            <div className="text-xs text-stone-500 mb-1">Lead Managers</div>
            <div className="text-stone-700">{deal.leads.join(', ')}</div>
          </div>
          {deal.coLeads.length > 0 && (
            <div className="col-span-2">
              <div className="text-xs text-stone-500 mb-1">Co-Leads</div>
              <div className="text-stone-700">{deal.coLeads.join(', ')}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
