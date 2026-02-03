// Secondary Performance View - Post-pricing spread/price performance
import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface PerformancePoint {
  date: string;
  price: number;
  spread: number;
  yieldToMaturity: number;
  volumeTraded: number;
  daysFromPricing: number;
}

interface SecondaryPerformanceViewProps {
  bond: {
    isin: string;
    issuer: string;
    coupon: number;
    tenor: string;
    issueSpread: number;
    issuePrice: number;
  };
  performance: PerformancePoint[];
  drift: number;
  summary: {
    currentSpread: number;
    issueSpread: number;
    drift: number;
    currentPrice: number;
    issuePrice: number;
    priceChange: number;
    avgDailyVolume: number;
  } | null;
  analysis: {
    trend: string;
    interpretation: string;
  };
}

export const SecondaryPerformanceView = React.memo(function SecondaryPerformanceView({ bond, performance, drift: _drift, summary, analysis }: SecondaryPerformanceViewProps) {
  // Note: drift is available as _drift if needed for future enhancements
  const chartData = performance.map(p => ({
    date: p.date.split('-').slice(1).join('/'), // MM/DD format
    spread: p.spread,
    price: p.price,
    volume: p.volumeTraded,
  }));

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'Tightening': return 'text-emerald-600';
      case 'Widening': return 'text-red-600';
      default: return 'text-stone-600';
    }
  };

  const getTrendBg = (trend: string) => {
    switch (trend) {
      case 'Tightening': return 'bg-emerald-50 border-emerald-200';
      case 'Widening': return 'bg-red-50 border-red-200';
      default: return 'bg-stone-50 border-stone-200';
    }
  };

  return (
    <div className="mt-3 bg-white border border-stone-200 rounded-lg overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-violet-600 to-violet-700 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold">Secondary Performance</h3>
            <p className="text-violet-200 text-xs mt-0.5">
              {bond.issuer} {bond.coupon}% {bond.tenor}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-violet-200">ISIN</div>
            <div className="font-mono text-xs">{bond.isin}</div>
          </div>
        </div>
      </div>

      {/* Trend Summary */}
      <div className={`px-4 py-3 border-b ${getTrendBg(analysis.trend)}`}>
        <div className="flex items-center gap-2">
          {analysis.trend === 'Tightening' && (
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          )}
          {analysis.trend === 'Widening' && (
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
            </svg>
          )}
          {analysis.trend === 'Stable' && (
            <svg className="w-5 h-5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
            </svg>
          )}
          <span className={`font-semibold ${getTrendColor(analysis.trend)}`}>{analysis.trend}</span>
          <span className="text-stone-500 text-sm">|</span>
          <span className="text-stone-600 text-sm">{analysis.interpretation}</span>
        </div>
      </div>

      {/* Key Metrics */}
      {summary && (
        <div className="grid grid-cols-4 divide-x divide-stone-200 border-b border-stone-200">
          <div className="px-3 py-2 text-center">
            <div className="text-xs text-stone-500">Issue Spread</div>
            <div className="font-semibold text-stone-800">{summary.issueSpread}bps</div>
          </div>
          <div className="px-3 py-2 text-center">
            <div className="text-xs text-stone-500">Current Spread</div>
            <div className="font-semibold text-stone-800">{summary.currentSpread}bps</div>
          </div>
          <div className="px-3 py-2 text-center">
            <div className="text-xs text-stone-500">Drift</div>
            <div className={`font-semibold ${summary.drift < 0 ? 'text-emerald-600' : summary.drift > 0 ? 'text-red-600' : 'text-stone-600'}`}>
              {summary.drift > 0 ? '+' : ''}{summary.drift}bps
            </div>
          </div>
          <div className="px-3 py-2 text-center">
            <div className="text-xs text-stone-500">Avg Volume</div>
            <div className="font-semibold text-stone-800">€{summary.avgDailyVolume}M</div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Spread Chart */}
          <div>
            <h4 className="text-xs font-semibold text-stone-500 mb-2">Spread (bps)</h4>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="date" fontSize={10} tickLine={false} />
                  <YAxis fontSize={10} tickLine={false} domain={['dataMin - 5', 'dataMax + 5']} />
                  <Tooltip
                    formatter={(value) => [`${value}bps`, 'Spread']}
                    contentStyle={{ fontSize: '12px' }}
                  />
                  <ReferenceLine y={bond.issueSpread} stroke="#9CA3AF" strokeDasharray="3 3" />
                  <Line
                    type="monotone"
                    dataKey="spread"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="text-xs text-stone-400 text-center mt-1">
              Dashed line = issue spread ({bond.issueSpread}bps)
            </div>
          </div>

          {/* Price Chart */}
          <div>
            <h4 className="text-xs font-semibold text-stone-500 mb-2">Price</h4>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="date" fontSize={10} tickLine={false} />
                  <YAxis fontSize={10} tickLine={false} domain={['dataMin - 0.5', 'dataMax + 0.5']} />
                  <Tooltip
                    formatter={(value) => [Number(value).toFixed(2), 'Price']}
                    contentStyle={{ fontSize: '12px' }}
                  />
                  <ReferenceLine y={bond.issuePrice} stroke="#9CA3AF" strokeDasharray="3 3" />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="text-xs text-stone-400 text-center mt-1">
              Dashed line = reoffer price ({bond.issuePrice})
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
