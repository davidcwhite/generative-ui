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
    <div className="flex flex-col h-screen w-full bg-white">
      {/* Header */}
      <header className="px-6 py-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white border-b border-blue-800">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold">DCM Bond Issuance</h1>
            <p className="text-sm text-blue-200 mt-0.5">AI-powered mandate pitching and deal analysis</p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="px-4 py-2 text-xs font-medium bg-blue-800/50 text-blue-100 border border-blue-700 rounded-md hover:bg-blue-700 hover:text-white transition-colors"
            >
              Clear History
            </button>
          )}
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-auto p-4 bg-stone-50">
        <div className="flex flex-col gap-4">
          {messages.length === 0 && (
            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
              <h2 className="text-lg font-semibold text-stone-800 mb-3">DCM Bond Issuance Assistant</h2>
              <p className="text-stone-600 mb-4">I can help with mandate pitching, deal analysis, and investor insights.</p>
              <h3 className="text-sm font-semibold text-stone-700 mb-2">Try asking:</h3>
              <ul className="space-y-2 text-stone-600">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  "We're pitching BMW for a mandate"
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  "Show me Volkswagen's issuance history"
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  "Compare Mercedes-Benz to auto sector peers"
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  "Who were the top investors in Porsche's last deal?"
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  "Generate a mandate brief for Siemens"
                </li>
              </ul>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={`px-4 py-3 rounded-xl max-w-[90%] ${
                message.role === 'user'
                  ? 'self-end bg-stone-800 text-stone-100'
                  : 'self-start bg-white text-stone-700 border border-stone-200 shadow-sm'
              }`}
            >
              <div className={`text-xs font-semibold mb-1 ${
                message.role === 'user' ? 'text-stone-400' : 'text-stone-500'
              }`}>
                {message.role === 'user' ? 'You' : 'Assistant'}
              </div>
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
                            <div key={callId} className="mt-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                              <span className="text-blue-700 font-medium">{issuer.shortName}</span>
                              <span className="text-blue-500 ml-2">({issuer.sector}, {issuer.country})</span>
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
            <div className="self-start px-4 py-3 bg-white rounded-xl border border-stone-200 shadow-sm">
              <span className="text-stone-500 italic text-sm">Thinking...</span>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 bg-white border-t border-stone-200">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Ask about issuers, deals, or mandates..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 text-sm border border-stone-300 rounded-full outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-200 transition-all disabled:bg-stone-50 disabled:text-stone-400"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 text-sm font-semibold bg-blue-600 text-white rounded-full hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:bg-stone-300 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </footer>
    </div>
  );
}
