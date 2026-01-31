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

const STORAGE_KEY = 'dcm-chat-history';
const MAX_STORED_MESSAGES = 50;

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
  
  const { messages, input, handleInputChange, handleSubmit, addToolResult, isLoading, setMessages } = useChat({
    api: '/api/dcm/chat', // DCM Bond Issuance endpoint
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

  return (
    <div className="flex flex-col h-screen w-full bg-stone-50">
      {/* Header - Minimal */}
      <header className="px-4 py-3 bg-white border-b border-stone-100">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-lg font-semibold text-stone-800">DCM</h1>
          {messages.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="px-3 py-1.5 text-xs font-medium text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded-md transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-5">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <h2 className="text-2xl font-semibold text-stone-800 mb-2">DCM Bond Issuance</h2>
              <p className="text-stone-500 mb-8">AI-powered mandate pitching and deal analysis</p>
              <div className="inline-flex flex-col gap-2 text-left">
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
                    className="px-4 py-2.5 text-sm text-stone-600 bg-white border border-stone-200 rounded-lg hover:border-stone-300 hover:bg-stone-50 transition-colors text-left"
                  >
                    {suggestion}
                  </button>
                ))}
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

      {/* Input Area - No divider, modern design */}
      <footer className="px-4 pb-4 pt-2 bg-stone-50">
        <div className="max-w-4xl mx-auto">
          <form
            onSubmit={handleSubmit}
            className="relative flex items-center bg-white border border-stone-200 rounded-xl shadow-sm hover:shadow-md focus-within:shadow-md focus-within:border-stone-300 transition-all"
          >
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Ask about issuers, deals, or mandates..."
              disabled={isLoading}
              className="flex-1 px-4 py-3.5 text-sm bg-transparent outline-none placeholder-stone-400 disabled:text-stone-400"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="mr-2 p-2 rounded-lg bg-stone-800 text-white hover:bg-stone-700 transition-colors disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
              </svg>
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}
