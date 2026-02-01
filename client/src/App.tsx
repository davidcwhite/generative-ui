import { useChat, type Message } from '@ai-sdk/react';
import { useEffect, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { TableCard } from './components/TableCard';
import { FilterForm } from './components/FilterForm';
import { ApprovalCard } from './components/ApprovalCard';
import { ChartCard } from './components/ChartCard';
import {
  EntityPicker,
  IssuerTimeline,
  ComparableDealsPanel,
  AllocationBreakdown,
  SecondaryPerformanceView,
  ExportPanel,
  MarketIssuance,
} from './components/dcm';
import { Dashboard } from './components/Dashboard';

const STORAGE_KEY = 'dcm-chat-history';
const MAX_STORED_MESSAGES = 50;
const AUTH_KEY = 'dcm-authenticated';
const API_URL = import.meta.env.VITE_API_URL || '/api/dcm/chat';
const API_BASE = API_URL.replace('/api/dcm/chat', '');

// Load messages from localStorage
function loadStoredMessages(): Message[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load chat history:', e);
  }
  return [];
}

// Save messages to localStorage
function saveMessages(messages: Message[]) {
  try {
    const toStore = messages.slice(-MAX_STORED_MESSAGES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch (e) {
    console.warn('Failed to save chat history:', e);
  }
}

export default function App() {
  const [initialMessages] = useState<Message[]>(() => loadStoredMessages());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem(AUTH_KEY) === 'true';
  });
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [activeView, setActiveView] = useState<'chat' | 'dashboard'>('chat');
  
  const { messages, input, handleInputChange, handleSubmit, addToolResult, isLoading, setMessages } = useChat({
    api: API_URL,
    maxSteps: 15,
    initialMessages,
  });

  useEffect(() => {
    if (messages.length > 0) {
      saveMessages(messages);
    }
  }, [messages]);

  const handleClearHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setMessages([]);
  }, [setMessages]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCheckingAuth(true);
    setAuthError('');
    
    try {
      const response = await fetch(`${API_BASE}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem(AUTH_KEY, 'true');
        setIsAuthenticated(true);
      } else {
        setAuthError('Invalid password');
      }
    } catch (error) {
      setAuthError('Failed to verify password');
      console.error('Auth error:', error);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_KEY);
    setIsAuthenticated(false);
    setPassword('');
  };

  // Helper to format query_data results as table
  const formatQueryResult = (result: {
    dataSource: string;
    columns: string[];
    rows: Record<string, string | number | null>[];
    totalMatches: number;
    showing: number;
    summary: Record<string, string | number>;
  }) => {
    if (!result.rows || result.rows.length === 0) {
      return (
        <div className="mt-2 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
          No results found
        </div>
      );
    }
    
    const summaryParts = Object.entries(result.summary)
      .filter(([_, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${k}: ${v}`)
      .slice(0, 4);
    
    return (
      <div>
        <div className="mt-2 mb-2 px-3 py-2 bg-stone-100 rounded-md text-xs text-stone-600">
          {result.dataSource} | Showing {result.showing} of {result.totalMatches} | {summaryParts.join(' | ')}
        </div>
        <TableCard
          title={`${result.dataSource.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Results`}
          columns={result.columns}
          rows={result.rows}
        />
      </div>
    );
  };

  // Password screen
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-full bg-[#FAFAF8]">
        <div className="w-full max-w-sm px-6">
          <h1 className="text-2xl font-semibold text-stone-800 text-center mb-2">Primary Flow</h1>
          <p className="text-stone-500 text-center mb-8">Enter password to continue</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 text-sm bg-white border border-stone-200 rounded-xl outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
              autoFocus
            />
            
            {authError && (
              <p className="text-red-500 text-sm text-center">{authError}</p>
            )}
            
            <button
              type="submit"
              disabled={isCheckingAuth || !password.trim()}
              className="w-full px-4 py-3 text-sm font-medium bg-stone-800 text-white rounded-xl hover:bg-stone-700 transition-colors disabled:bg-stone-300 disabled:cursor-not-allowed"
            >
              {isCheckingAuth ? 'Checking...' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#FAFAF8]">
      {/* Sidebar */}
      <aside className="w-16 flex flex-col items-center py-4 border-r border-[#E5E5E3] bg-[#F5F5F3]">
        {/* Logo */}
        <div className="w-10 h-10 rounded-lg bg-[#1A1A1A] flex items-center justify-center mb-6">
          <span className="text-white font-bold text-sm">PF</span>
        </div>
        
        {/* Nav items */}
        <nav className="flex-1 flex flex-col items-center gap-2">
          <button 
            onClick={() => setActiveView('chat')}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${activeView === 'chat' ? 'bg-[#E5E5E3]' : 'hover:bg-[#E5E5E3]'}`} 
            title="Chat"
          >
            <svg className={`w-5 h-5 ${activeView === 'chat' ? 'text-[#1A1A1A]' : 'text-stone-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
          <button 
            onClick={() => setActiveView('dashboard')}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${activeView === 'dashboard' ? 'bg-[#E5E5E3]' : 'hover:bg-[#E5E5E3]'}`} 
            title="Data Viewer"
          >
            <svg className={`w-5 h-5 ${activeView === 'dashboard' ? 'text-[#1A1A1A]' : 'text-stone-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </button>
          <button className="w-10 h-10 rounded-lg hover:bg-[#E5E5E3] flex items-center justify-center transition-colors" title="History">
            <svg className="w-5 h-5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </nav>
        
        {/* Bottom actions */}
        <div className="flex flex-col items-center gap-2">
          {messages.length > 0 && (
            <button 
              onClick={handleClearHistory}
              className="w-10 h-10 rounded-lg hover:bg-[#E5E5E3] flex items-center justify-center transition-colors" 
              title="Clear history"
            >
              <svg className="w-5 h-5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
          <button 
            onClick={handleLogout}
            className="w-10 h-10 rounded-lg hover:bg-[#E5E5E3] flex items-center justify-center transition-colors" 
            title="Logout"
          >
            <svg className="w-5 h-5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Main content */}
      {activeView === 'dashboard' ? (
        <Dashboard />
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="px-6 py-4 border-b border-[#E5E5E3]">
            <div className="max-w-4xl mx-auto flex justify-between items-center">
              <h1 className="text-lg font-semibold text-[#1A1A1A]">Primary Flow</h1>
            </div>
          </header>

          {/* Messages */}
          <main className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-5">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <h2 className="text-3xl font-semibold text-[#1A1A1A] mb-3">Primary Flow</h2>
              <p className="text-stone-500 mb-12 text-base">Intelligent workflow orchestration for bond issuance</p>
              
              <div className="w-full max-w-xl">
                <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-3">Try asking</p>
                <div className="flex flex-col gap-2">
                  {[
                    "We're pitching BMW for a mandate",
                    "Show me Volkswagen's issuance history",
                    "Compare Mercedes-Benz to auto sector peers",
                    "Generate a mandate brief for Siemens",
                  ].map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        const event = { target: { value: suggestion } } as React.ChangeEvent<HTMLInputElement>;
                        handleInputChange(event);
                      }}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-stone-600 bg-white border border-[#E5E5E3] rounded-xl hover:border-stone-300 hover:bg-stone-50 transition-colors text-left group"
                    >
                      <svg className="w-4 h-4 text-stone-400 group-hover:text-stone-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                      <span>{suggestion}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-2xl ${
                message.role === 'user'
                  ? 'self-end bg-stone-100 text-stone-800 px-4 py-2.5 max-w-[80%]'
                  : 'self-start text-stone-700 w-full'
              }`}
            >
              <div className="text-sm leading-relaxed">
                {message.parts.map((part, index) => {
                  // Text content - render as markdown
                  if (part.type === 'text') {
                    const markdownClass = message.role === 'user' 
                      ? 'markdown-content markdown-content-user' 
                      : 'markdown-content';
                    return (
                      <div key={index} className={markdownClass}>
                        <ReactMarkdown>{part.text}</ReactMarkdown>
                      </div>
                    );
                  }

                  // Tool invocations
                  if (part.type === 'tool-invocation') {
                    const { toolInvocation } = part;
                    const callId = toolInvocation.toolCallId;

                    // Tool: query_data
                    if (toolInvocation.toolName === 'query_data') {
                      if (toolInvocation.state === 'result') {
                        return (
                          <div key={callId}>
                            {formatQueryResult(toolInvocation.result)}
                          </div>
                        );
                      }
                      if (toolInvocation.state === 'call') {
                        return (
                          <div key={callId} className="italic text-stone-500 py-2">
                            Querying {toolInvocation.args?.dataSource || 'data'}...
                          </div>
                        );
                      }
                    }

                    // Tool: show_chart
                    if (toolInvocation.toolName === 'show_chart') {
                      if (toolInvocation.state === 'result') {
                        return (
                          <ChartCard
                            key={callId}
                            title={toolInvocation.result.title}
                            type={toolInvocation.result.type}
                            data={toolInvocation.result.data}
                            xKey={toolInvocation.result.xKey}
                            yKey={toolInvocation.result.yKey}
                            yLabel={toolInvocation.result.yLabel}
                            color={toolInvocation.result.color}
                          />
                        );
                      }
                      if (toolInvocation.state === 'call') {
                        return (
                          <div key={callId} className="italic text-stone-500 py-2">
                            Rendering chart...
                          </div>
                        );
                      }
                    }

                    // Tool: show_table
                    if (toolInvocation.toolName === 'show_table') {
                      if (toolInvocation.state === 'result') {
                        return (
                          <TableCard
                            key={callId}
                            title={toolInvocation.result.title}
                            columns={toolInvocation.result.columns}
                            rows={toolInvocation.result.rows}
                          />
                        );
                      }
                      if (toolInvocation.state === 'call') {
                        return (
                          <div key={callId} className="italic text-stone-500 py-2">
                            Loading table...
                          </div>
                        );
                      }
                    }

                    // Tool: collect_filters
                    if (toolInvocation.toolName === 'collect_filters') {
                      if (toolInvocation.state === 'call') {
                        return (
                          <FilterForm
                            key={callId}
                            title={toolInvocation.args.title}
                            fields={toolInvocation.args.fields}
                            onSubmit={(values) => {
                              addToolResult({
                                toolCallId: callId,
                                result: { values },
                              });
                            }}
                          />
                        );
                      }
                      if (toolInvocation.state === 'result') {
                        return (
                          <div key={callId} className="mt-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
                            Filters applied: {JSON.stringify(toolInvocation.result.values)}
                          </div>
                        );
                      }
                    }

                    // Tool: confirm_action
                    if (toolInvocation.toolName === 'confirm_action') {
                      if (toolInvocation.state === 'call') {
                        return (
                          <ApprovalCard
                            key={callId}
                            summary={toolInvocation.args.summary}
                            risk={toolInvocation.args.risk}
                            actions={toolInvocation.args.actions}
                            onAction={(actionId) => {
                              addToolResult({
                                toolCallId: callId,
                                result: { approvedActionId: actionId, cancelled: false },
                              });
                            }}
                            onCancel={() => {
                              addToolResult({
                                toolCallId: callId,
                                result: { cancelled: true },
                              });
                            }}
                          />
                        );
                      }
                      if (toolInvocation.state === 'result') {
                        return (
                          <div key={callId} className="mt-2 px-3 py-2 bg-stone-100 rounded-lg text-sm text-stone-600">
                            {toolInvocation.result.cancelled 
                              ? 'Action cancelled' 
                              : `Action approved: ${toolInvocation.result.approvedActionId}`}
                          </div>
                        );
                      }
                    }

                    // === DCM TOOLS ===

                    // Tool: resolve_entity
                    if (toolInvocation.toolName === 'resolve_entity') {
                      if (toolInvocation.state === 'call') {
                        return (
                          <div key={callId} className="italic text-stone-500 py-2">
                            Resolving "{toolInvocation.args?.query}"...
                          </div>
                        );
                      }
                      if (toolInvocation.state === 'result') {
                        const result = toolInvocation.result;
                        // Show picker for ambiguous matches
                        if (result.confidence === 'ambiguous' && result.matches?.length > 1) {
                          return (
                            <EntityPicker
                              key={callId}
                              query={result.query}
                              matches={result.matches}
                              onSelect={(issuerId) => {
                                // For now, just show selection - in production would trigger follow-up
                                console.log('Selected issuer:', issuerId);
                              }}
                            />
                          );
                        }
                        // Show resolved entity info
                        if (result.matches?.length === 1) {
                          const issuer = result.matches[0];
                          return (
                            <div key={callId} className="mt-2 px-3 py-2 bg-stone-100 rounded-lg text-sm inline-block">
                              <span className="text-stone-800 font-medium">{issuer.shortName}</span>
                              <span className="text-stone-500 ml-2">({issuer.sector}, {issuer.country})</span>
                            </div>
                          );
                        }
                        // No matches
                        if (!result.matches?.length) {
                          return (
                            <div key={callId} className="mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                              No matches found for "{result.query}"
                            </div>
                          );
                        }
                      }
                    }

                    // Tool: get_market_deals
                    if (toolInvocation.toolName === 'get_market_deals') {
                      if (toolInvocation.state === 'call') {
                        return (
                          <div key={callId} className="italic text-stone-500 py-2">
                            Loading market issuance data...
                          </div>
                        );
                      }
                      if (toolInvocation.state === 'result') {
                        const result = toolInvocation.result;
                        if (result.error) {
                          return (
                            <div key={callId} className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                              {result.error}
                            </div>
                          );
                        }
                        return (
                          <MarketIssuance
                            key={callId}
                            deals={result.deals || []}
                            summary={result.summary || { totalDeals: 0, totalVolume: 0, avgSpread: 0, avgNip: 0, bySector: [], byCurrency: [] }}
                            filters={result.filters || { sector: 'All', currency: 'All', showing: 0 }}
                          />
                        );
                      }
                    }

                    // Tool: get_issuer_deals
                    if (toolInvocation.toolName === 'get_issuer_deals') {
                      if (toolInvocation.state === 'call') {
                        return (
                          <div key={callId} className="italic text-stone-500 py-2">
                            Loading issuance history...
                          </div>
                        );
                      }
                      if (toolInvocation.state === 'result') {
                        const result = toolInvocation.result;
                        if (result.error) {
                          return (
                            <div key={callId} className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                              {result.error}
                            </div>
                          );
                        }
                        return (
                          <IssuerTimeline
                            key={callId}
                            issuerName={result.issuer?.name || 'Issuer'}
                            deals={result.deals || []}
                            summary={result.summary || { totalDeals: 0, totalRaised: 0, avgTenor: 'N/A', avgNip: 0, avgOversubscription: 0 }}
                          />
                        );
                      }
                    }

                    // Tool: get_peer_comparison
                    if (toolInvocation.toolName === 'get_peer_comparison') {
                      if (toolInvocation.state === 'call') {
                        return (
                          <div key={callId} className="italic text-stone-500 py-2">
                            Building peer comparison...
                          </div>
                        );
                      }
                      if (toolInvocation.state === 'result') {
                        const result = toolInvocation.result;
                        if (result.error) {
                          return (
                            <div key={callId} className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                              {result.error}
                            </div>
                          );
                        }
                        return (
                          <ComparableDealsPanel
                            key={callId}
                            issuer={result.issuer}
                            issuerSummary={result.issuerSummary}
                            issuerDeals={result.issuerDeals || []}
                            peers={result.peers || []}
                            comparison={result.comparison || { nipVsPeers: 'N/A' }}
                          />
                        );
                      }
                    }

                    // Tool: get_allocations
                    if (toolInvocation.toolName === 'get_allocations') {
                      if (toolInvocation.state === 'call') {
                        return (
                          <div key={callId} className="italic text-stone-500 py-2">
                            Loading allocation breakdown...
                          </div>
                        );
                      }
                      if (toolInvocation.state === 'result') {
                        const result = toolInvocation.result;
                        if (result.error) {
                          return (
                            <div key={callId} className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                              {result.error}
                            </div>
                          );
                        }
                        return (
                          <AllocationBreakdown
                            key={callId}
                            deal={result.deal}
                            allocations={result.allocations || []}
                            breakdown={result.breakdown || { byType: [], byGeography: [] }}
                            summary={result.summary || { totalInvestors: 0, totalAllocated: 0, avgFillRate: 0 }}
                          />
                        );
                      }
                    }

                    // Tool: get_performance
                    if (toolInvocation.toolName === 'get_performance') {
                      if (toolInvocation.state === 'call') {
                        return (
                          <div key={callId} className="italic text-stone-500 py-2">
                            Loading secondary performance...
                          </div>
                        );
                      }
                      if (toolInvocation.state === 'result') {
                        const result = toolInvocation.result;
                        if (result.error) {
                          return (
                            <div key={callId} className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                              {result.error}
                            </div>
                          );
                        }
                        return (
                          <SecondaryPerformanceView
                            key={callId}
                            bond={result.bond}
                            performance={result.performance || []}
                            drift={result.drift || 0}
                            summary={result.summary}
                            analysis={result.analysis || { trend: 'Stable', interpretation: '' }}
                          />
                        );
                      }
                    }

                    // Tool: get_participation_history
                    if (toolInvocation.toolName === 'get_participation_history') {
                      if (toolInvocation.state === 'call') {
                        return (
                          <div key={callId} className="italic text-stone-500 py-2">
                            Loading investor participation...
                          </div>
                        );
                      }
                      if (toolInvocation.state === 'result') {
                        const result = toolInvocation.result;
                        // Render as a simple table for now
                        const participations = result.participations || [];
                        return (
                          <TableCard
                            key={callId}
                            title="Investor Participation History"
                            columns={['Deal', 'Investor', 'Allocated', 'Fill Rate', 'Behaviour']}
                            rows={participations.slice(0, 10).map((p: { dealName: string; issuerName: string; allocatedSize: number; fillRate: number; behaviour: string }) => ({
                              'Deal': p.dealName,
                              'Investor': p.issuerName,
                              'Allocated': `€${p.allocatedSize}M`,
                              'Fill Rate': `${Math.round(p.fillRate * 100)}%`,
                              'Behaviour': p.behaviour,
                            }))}
                          />
                        );
                      }
                    }

                    // Tool: generate_mandate_brief
                    if (toolInvocation.toolName === 'generate_mandate_brief') {
                      if (toolInvocation.state === 'call') {
                        return (
                          <div key={callId} className="italic text-stone-500 py-2">
                            Generating mandate brief...
                          </div>
                        );
                      }
                      if (toolInvocation.state === 'result') {
                        const result = toolInvocation.result;
                        if (result.error) {
                          return (
                            <div key={callId} className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                              {result.error}
                            </div>
                          );
                        }
                        return (
                          <ExportPanel
                            key={callId}
                            brief={result.brief}
                            exportFormats={result.exportFormats || ['pdf', 'pptx', 'xlsx', 'email']}
                          />
                        );
                      }
                    }

                    // Generic fallback
                    return (
                      <div key={callId} className="italic text-stone-500 py-2">
                        Tool: {toolInvocation.toolName} ({toolInvocation.state})
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="self-start flex items-center gap-2 text-stone-400 text-sm">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Thinking...</span>
            </div>
          )}
        </div>
      </main>

        {/* Input Area */}
        <footer className="px-6 pb-6 pt-3">
          <div className="max-w-3xl mx-auto">
            <form
              onSubmit={handleSubmit}
              className="relative flex items-center bg-white border border-[#E5E5E3] rounded-2xl shadow-sm focus-within:shadow-md focus-within:border-[#D5D5D3] transition-all"
            >
              {/* Left icons */}
              <div className="flex items-center gap-1 pl-4">
                <button type="button" className="p-2 rounded-lg hover:bg-stone-100 transition-colors" title="Search">
                  <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
              
              <input
                type="text"
                value={input}
                onChange={handleInputChange}
                placeholder="Ask a question..."
                disabled={isLoading}
                className="flex-1 px-3 py-4 text-sm bg-transparent outline-none placeholder-stone-400 disabled:text-stone-400"
              />
              
              {/* Right icons */}
              <div className="flex items-center gap-1 pr-3">
                <button type="button" className="p-2 rounded-lg hover:bg-stone-100 transition-colors" title="Attach">
                  <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="p-2 rounded-full bg-[#1A1A1A] text-white hover:bg-stone-700 transition-colors disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed"
                  aria-label="Send message"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </footer>
        </div>
      )}
    </div>
  );
}
