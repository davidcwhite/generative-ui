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
    <div className="flex-1 flex flex-col">
      {/* Header with tabs */}
      <header className="px-6 py-4 border-b border-[#E5E5E3]">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-lg font-semibold text-[#1A1A1A] mb-4">Data Viewer</h1>
          
          {/* Tabs */}
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
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
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-6 py-6">
          {activeTab === 'issuance' && <IssuanceView />}
          {activeTab === 'allocations' && <AllocationsView />}
          {activeTab === 'secondary' && <SecondaryView />}
        </div>
      </main>
    </div>
  );
}
