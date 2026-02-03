// Allocation Breakdown - Investor distribution charts
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

interface BreakdownItem {
  type?: string;
  geography?: string;
  amount: number;
  percentage: number;
}

interface Allocation {
  investorId: string;
  investorName: string;
  investorType: string;
  geography: string;
  orderSize: number;
  allocatedSize: number;
  fillRate: number;
}

interface AllocationBreakdownProps {
  deal: {
    id: string;
    issuer: string;
    size: number;
    oversubscription: number;
  };
  allocations: Allocation[];
  breakdown: {
    byType: BreakdownItem[];
    byGeography: BreakdownItem[];
  };
  summary: {
    totalInvestors: number;
    totalAllocated: number;
    avgFillRate: number;
  };
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export const AllocationBreakdown = React.memo(function AllocationBreakdown({ deal, allocations, breakdown, summary }: AllocationBreakdownProps) {
  const typeData = breakdown.byType.map((item, i) => ({
    name: item.type,
    value: item.amount,
    percentage: item.percentage,
    color: COLORS[i % COLORS.length],
  }));

  const geoData = breakdown.byGeography.map((item) => ({
    name: item.geography,
    value: item.amount,
    percentage: item.percentage,
  }));

  return (
    <div className="mt-3 bg-white border border-stone-200 rounded-lg overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white">
        <h3 className="font-semibold">Allocation Breakdown</h3>
        <p className="text-emerald-200 text-xs mt-0.5">{deal.issuer} - €{deal.size}M</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 divide-x divide-stone-200 border-b border-stone-200">
        <div className="px-4 py-2 text-center">
          <div className="text-xs text-stone-500">Investors</div>
          <div className="font-bold text-lg text-stone-800">{summary.totalInvestors}</div>
        </div>
        <div className="px-4 py-2 text-center">
          <div className="text-xs text-stone-500">Oversubscription</div>
          <div className="font-bold text-lg text-emerald-600">{deal.oversubscription}x</div>
        </div>
        <div className="px-4 py-2 text-center">
          <div className="text-xs text-stone-500">Avg Fill Rate</div>
          <div className="font-bold text-lg text-stone-800">{summary.avgFillRate}%</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4 p-4">
        {/* By Type - Pie Chart */}
        <div>
          <h4 className="text-xs font-semibold text-stone-500 mb-2">By Investor Type</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                  isAnimationActive={false}
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`€${value}M`, 'Allocated']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-1 mt-2 justify-center">
            {typeData.slice(0, 4).map((item, index) => (
              <span key={index} className="text-xs flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                {item.name} ({item.percentage}%)
              </span>
            ))}
          </div>
        </div>

        {/* By Geography - Bar Chart */}
        <div>
          <h4 className="text-xs font-semibold text-stone-500 mb-2">By Geography</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={geoData} layout="vertical">
                <XAxis type="number" tickFormatter={(v) => `€${v}M`} fontSize={10} />
                <YAxis type="category" dataKey="name" fontSize={10} width={40} />
                <Tooltip formatter={(value) => [`€${value}M`, 'Allocated']} />
                <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Investors */}
      <div className="px-4 py-3 border-t border-stone-200">
        <h4 className="text-xs font-semibold text-stone-500 mb-2">Top Investors</h4>
        <div className="space-y-1">
          {allocations.slice(0, 5).map((alloc, index) => (
            <div key={index} className="flex justify-between items-center text-xs py-1 px-2 bg-stone-50 rounded">
              <div>
                <span className="font-medium text-stone-700">{alloc.investorName}</span>
                <span className="text-stone-400 ml-2">{alloc.investorType}</span>
              </div>
              <div className="text-right">
                <span className="font-semibold text-stone-700">€{alloc.allocatedSize}M</span>
                <span className="text-stone-400 ml-2">({Math.round(alloc.fillRate * 100)}% fill)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
