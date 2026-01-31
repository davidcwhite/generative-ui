import { useChat, type Message } from '@ai-sdk/react';
import { useEffect, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { TableCard } from './components/TableCard';
import { FilterForm } from './components/FilterForm';
import { ApprovalCard } from './components/ApprovalCard';
import { ChartCard } from './components/ChartCard';

const STORAGE_KEY = 'generative-ui-chat-history';
const MAX_STORED_MESSAGES = 50;

// Load messages from localStorage
function loadStoredMessages(): Message[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate that it's an array
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
    // Only store the last N messages to prevent bloat
    const toStore = messages.slice(-MAX_STORED_MESSAGES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch (e) {
    console.warn('Failed to save chat history:', e);
  }
}

export default function App() {
  const [initialMessages] = useState<Message[]>(() => loadStoredMessages());
  
  const { messages, input, handleInputChange, handleSubmit, addToolResult, isLoading, setMessages } = useChat({
    api: '/api/chat',
    maxSteps: 10,
    initialMessages,
  });

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      saveMessages(messages);
    }
  }, [messages]);

  // Clear chat history
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
      return <div style={styles.emptyResult}>No results found</div>;
    }
    
    // Format summary for display
    const summaryParts = Object.entries(result.summary)
      .filter(([_, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${k}: ${v}`)
      .slice(0, 4);
    
    return (
      <div>
        <div style={styles.summaryBanner}>
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
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.title}>Data Assistant</h1>
            <p style={styles.subtitle}>Query data, view charts, and get insights</p>
          </div>
          {messages.length > 0 && (
            <button onClick={handleClearHistory} style={styles.clearButton}>
              Clear History
            </button>
          )}
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.messages}>
          {messages.length === 0 && (
            <div style={styles.welcomeCard}>
              <h2>Welcome! Try asking:</h2>
              <ul>
                <li>"Show me all bond trades"</li>
                <li>"List employees in the Engineering department"</li>
                <li>"What products are low on stock?"</li>
                <li>"Chart of trades by counterparty"</li>
                <li>"Show employee salary distribution"</li>
              </ul>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              style={{
                ...styles.message,
                ...(message.role === 'user' ? styles.userMessage : styles.assistantMessage),
              }}
            >
              <div style={styles.messageRole}>
                {message.role === 'user' ? 'You' : 'Assistant'}
              </div>
              <div style={styles.messageContent}>
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

                    // Tool: query_data (generic data query)
                    if (toolInvocation.toolName === 'query_data') {
                      if (toolInvocation.state === 'result') {
                        return (
                          <div key={callId}>
                            {formatQueryResult(toolInvocation.result)}
                          </div>
                        );
                      }
                      if (toolInvocation.state === 'call') {
                        return <div key={callId} style={styles.loading}>Querying {toolInvocation.args?.dataSource || 'data'}...</div>;
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
                        return <div key={callId} style={styles.loading}>Rendering chart...</div>;
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
                        return <div key={callId} style={styles.loading}>Loading table...</div>;
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
                          <div key={callId} style={styles.completedTool}>
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
                          <div key={callId} style={styles.completedTool}>
                            {toolInvocation.result.cancelled 
                              ? 'Action cancelled' 
                              : `Action approved: ${toolInvocation.result.approvedActionId}`}
                          </div>
                        );
                      }
                    }

                    // Generic fallback for unknown tools
                    return (
                      <div key={callId} style={styles.loading}>
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
            <div style={styles.loadingIndicator}>
              <span>Thinking...</span>
            </div>
          )}
        </div>
      </main>

      <footer style={styles.footer}>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Ask about your data..."
            style={styles.input}
            disabled={isLoading}
          />
          <button type="submit" style={styles.button} disabled={isLoading || !input.trim()}>
            Send
          </button>
        </form>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    maxWidth: '1000px',
    margin: '0 auto',
    background: '#fff',
    boxShadow: '0 0 20px rgba(0,0,0,0.1)',
  },
  header: {
    padding: '16px 24px',
    borderBottom: '1px solid #e5e5e5',
    background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)',
    color: '#fff',
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '22px',
    fontWeight: 600,
    margin: 0,
  },
  subtitle: {
    fontSize: '13px',
    margin: '4px 0 0 0',
    opacity: 0.8,
  },
  clearButton: {
    padding: '8px 16px',
    fontSize: '12px',
    fontWeight: 500,
    background: 'rgba(255,255,255,0.2)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  main: {
    flex: 1,
    overflow: 'auto',
    padding: '16px',
    background: '#f8f9fa',
  },
  messages: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  welcomeCard: {
    background: '#fff',
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid #e0e0e0',
  },
  message: {
    padding: '12px 16px',
    borderRadius: '12px',
    maxWidth: '90%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    background: '#1a237e',
    color: '#fff',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    background: '#fff',
    color: '#333',
    border: '1px solid #e0e0e0',
  },
  messageRole: {
    fontSize: '12px',
    fontWeight: 600,
    marginBottom: '4px',
    opacity: 0.7,
  },
  messageContent: {
    fontSize: '14px',
    lineHeight: 1.5,
  },
  loading: {
    fontStyle: 'italic',
    opacity: 0.7,
    padding: '8px 0',
  },
  completedTool: {
    padding: '8px 12px',
    background: '#e8f5e9',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#2e7d32',
    marginTop: '8px',
  },
  statsCard: {
    padding: '12px 16px',
    background: '#e3f2fd',
    borderRadius: '8px',
    fontSize: '13px',
    marginTop: '8px',
  },
  summaryBanner: {
    padding: '8px 12px',
    background: '#e8eaf6',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#3949ab',
    marginBottom: '8px',
  },
  emptyResult: {
    padding: '16px',
    background: '#fff3e0',
    borderRadius: '8px',
    color: '#e65100',
    fontSize: '14px',
    marginTop: '8px',
  },
  loadingIndicator: {
    alignSelf: 'flex-start',
    padding: '12px 16px',
    background: '#fff',
    borderRadius: '12px',
    fontStyle: 'italic',
    color: '#666',
    border: '1px solid #e0e0e0',
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid #e5e5e5',
    background: '#fff',
  },
  form: {
    display: 'flex',
    gap: '12px',
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '24px',
    outline: 'none',
  },
  button: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 600,
    background: '#1a237e',
    color: '#fff',
    border: 'none',
    borderRadius: '24px',
    cursor: 'pointer',
  },
};
