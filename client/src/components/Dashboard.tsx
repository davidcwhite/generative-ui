import { useState } from 'react';
import { IssuanceView } from './dashboard/IssuanceView';
import { AllocationsView } from './dashboard/AllocationsView';
import { SecondaryView } from './dashboard/SecondaryView';

type TabId = 'issuance' | 'allocations' | 'secondary';

const tabs: { id: TabId; label: string }[] = [
  { id: 'issuance', label: 'Issuance' },
  { id: 'allocations', label: 'Allocations' },
  { id: 'secondary', label: 'Secondary' },
];

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('issuance');

  return (
    <div className="flex-1 overflow-auto">
      {/* Header with tabs */}
      <header className="px-4 md:px-6 pt-4 pb-4 border-b border-[#E5E5E3] bg-[#FAFAF8]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:relative md:h-10">
          <h1 className="text-lg font-semibold text-[#1A1A1A]">Primary Flow <span className="font-normal italic">Data</span></h1>
          
          {/* Tabs - stacked on mobile, centered on desktop */}
          <div className="flex gap-1 md:absolute md:left-1/2 md:-translate-x-1/2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 md:px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#1A1A1A] text-white'
                    : 'text-stone-600 hover:bg-[#E5E5E3]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Tab content */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">
        {activeTab === 'issuance' && <IssuanceView />}
        {activeTab === 'allocations' && <AllocationsView />}
        {activeTab === 'secondary' && <SecondaryView />}
      </div>
    </div>
  );
}
