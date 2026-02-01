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

const MAX_STORED_MESSAGES = 50;
const MAX_SESSIONS = 20;
const AUTH_KEY = 'dcm-authenticated';
const SESSIONS_KEY = 'pf-chat-sessions';
const ACTIVE_SESSION_KEY = 'pf-active-session';
const API_URL = import.meta.env.VITE_API_URL || '/api/dcm/chat';
const API_BASE = API_URL.replace('/api/dcm/chat', '');

// Chat session type
interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

// Generate unique session ID
function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Generate session title from first user message
function generateSessionTitle(messages: Message[]): string {
  const firstUserMessage = messages.find(m => m.role === 'user');
  if (firstUserMessage && firstUserMessage.content) {
    const content = typeof firstUserMessage.content === 'string' 
      ? firstUserMessage.content 
      : '';
    return content.slice(0, 40) + (content.length > 40 ? '...' : '');
  }
  return 'New Chat';
}

// Load sessions from localStorage
function loadStoredSessions(): ChatSession[] {
  try {
    const stored = localStorage.getItem(SESSIONS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load chat sessions:', e);
  }
  return [];
}

// Save sessions to localStorage
function saveSessions(sessions: ChatSession[]) {
  try {
    const toStore = sessions.slice(0, MAX_SESSIONS);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(toStore));
  } catch (e) {
    console.warn('Failed to save chat sessions:', e);
  }
}

// Load active session ID
function loadActiveSessionId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_SESSION_KEY);
  } catch (e) {
    return null;
  }
}

// Save active session ID
function saveActiveSessionId(id: string | null) {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_SESSION_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    }
  } catch (e) {
    console.warn('Failed to save active session ID:', e);
  }
}

export default function App() {
  // Session management state
  const [sessions, setSessions] = useState<ChatSession[]>(() => loadStoredSessions());
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    const storedId = loadActiveSessionId();
    const existingSessions = loadStoredSessions();
    // Validate that the stored session exists
    if (storedId && existingSessions.some(s => s.id === storedId)) {
      return storedId;
    }
    return null;
  });
  
  // Get initial messages from active session
  const getInitialMessages = useCallback((): Message[] => {
    if (activeSessionId) {
      const session = sessions.find(s => s.id === activeSessionId);
      if (session) {
        return session.messages;
      }
    }
    return [];
  }, [activeSessionId, sessions]);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem(AUTH_KEY) === 'true';
  });
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [activeView, setActiveView] = useState<'chat' | 'dashboard'>('chat');
  const [isHistoryHovered, setIsHistoryHovered] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const { messages, input, handleInputChange, handleSubmit, addToolResult, isLoading, setMessages } = useChat({
    api: API_URL,
    maxSteps: 15,
    initialMessages: getInitialMessages(),
  });

  // Save messages to active session when they change
  useEffect(() => {
    if (messages.length > 0) {
      if (activeSessionId) {
        // Update existing session
        setSessions(prevSessions => {
          const updatedSessions = prevSessions.map(session => {
            if (session.id === activeSessionId) {
              return {
                ...session,
                messages: messages.slice(-MAX_STORED_MESSAGES),
                title: generateSessionTitle(messages),
                updatedAt: Date.now(),
              };
            }
            return session;
          });
          saveSessions(updatedSessions);
          return updatedSessions;
        });
      } else {
        // Auto-create a new session when user sends first message
        const newSession: ChatSession = {
          id: generateSessionId(),
          title: generateSessionTitle(messages),
          messages: messages.slice(-MAX_STORED_MESSAGES),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        
        setSessions(prevSessions => {
          const updated = [newSession, ...prevSessions].slice(0, MAX_SESSIONS);
          saveSessions(updated);
          return updated;
        });
        
        setActiveSessionId(newSession.id);
        saveActiveSessionId(newSession.id);
      }
    }
  }, [messages, activeSessionId]);

  // Create new chat session
  const handleNewChat = useCallback(() => {
    // Save current session if it has messages
    if (activeSessionId && messages.length > 0) {
      setSessions(prevSessions => {
        const updated = prevSessions.map(s => 
          s.id === activeSessionId 
            ? { ...s, messages: messages.slice(-MAX_STORED_MESSAGES), title: generateSessionTitle(messages), updatedAt: Date.now() }
            : s
        );
        saveSessions(updated);
        return updated;
      });
    }
    
    // Create new session
    const newSession: ChatSession = {
      id: generateSessionId(),
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    setSessions(prevSessions => {
      const updated = [newSession, ...prevSessions].slice(0, MAX_SESSIONS);
      saveSessions(updated);
      return updated;
    });
    
    setActiveSessionId(newSession.id);
    saveActiveSessionId(newSession.id);
    setMessages([]);
    setActiveView('chat');
  }, [activeSessionId, messages, setMessages]);

  // Switch to a different session
  const switchToSession = useCallback((sessionId: string) => {
    // Save current session first
    if (activeSessionId && messages.length > 0) {
      setSessions(prevSessions => {
        const updated = prevSessions.map(s => 
          s.id === activeSessionId 
            ? { ...s, messages: messages.slice(-MAX_STORED_MESSAGES), title: generateSessionTitle(messages), updatedAt: Date.now() }
            : s
        );
        saveSessions(updated);
        return updated;
      });
    }
    
    // Load target session
    const targetSession = sessions.find(s => s.id === sessionId);
    if (targetSession) {
      setActiveSessionId(sessionId);
      saveActiveSessionId(sessionId);
      setMessages(targetSession.messages);
      setActiveView('chat');
    }
  }, [activeSessionId, messages, sessions, setMessages]);

  // Delete a session
  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prevSessions => {
      const updated = prevSessions.filter(s => s.id !== sessionId);
      saveSessions(updated);
      
      // If we deleted the active session, clear messages
      if (sessionId === activeSessionId) {
        setActiveSessionId(null);
        saveActiveSessionId(null);
        setMessages([]);
      }
      
      return updated;
    });
  }, [activeSessionId, setMessages]);

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
    <div className="flex flex-col md:flex-row h-screen w-full bg-[#FAFAF8]">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[#E5E5E3] bg-[#F5F5F3]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] flex items-center justify-center">
            <span className="text-white font-bold text-xs">PF</span>
          </div>
          <span className="font-semibold text-[#1A1A1A]">Primary Flow</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 rounded-lg hover:bg-[#E5E5E3] transition-colors"
          title="Menu"
        >
          <svg className="w-6 h-6 text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile Slide-Out Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={() => setIsMobileMenuOpen(false)} 
          />
          {/* Drawer */}
          <div className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-[#E5E5E3]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] flex items-center justify-center">
                  <span className="text-white font-bold text-xs">PF</span>
                </div>
                <span className="font-semibold text-[#1A1A1A]">Primary Flow</span>
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-stone-100 transition-colors"
              >
                <svg className="w-5 h-5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Menu Items */}
            <div className="flex-1 overflow-y-auto py-2">
              {/* New Chat */}
              <button 
                onClick={() => { handleNewChat(); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors"
              >
                <svg className="w-5 h-5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-sm font-medium text-stone-700">New Chat</span>
              </button>
              
              {/* Chat / History */}
              <button 
                onClick={() => { setActiveView('chat'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors ${activeView === 'chat' ? 'bg-stone-100' : ''}`}
              >
                <svg className="w-5 h-5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-stone-700">Chat</span>
              </button>
              
              {/* Recent Chats */}
              {sessions.length > 0 && (
                <div className="px-4 py-2">
                  <span className="text-xs font-medium text-stone-400 uppercase tracking-wide">Recent</span>
                  <div className="mt-2 flex flex-col gap-1">
                    {sessions.slice(0, 5).map(session => (
                      <button 
                        key={session.id}
                        onClick={() => { switchToSession(session.id); setIsMobileMenuOpen(false); }}
                        className={`w-full text-left text-sm text-stone-600 py-2 px-2 rounded-lg hover:bg-stone-50 truncate ${session.id === activeSessionId ? 'bg-stone-100' : ''}`}
                      >
                        {session.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Data Viewer */}
              <button 
                onClick={() => { setActiveView('dashboard'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors ${activeView === 'dashboard' ? 'bg-stone-100' : ''}`}
              >
                <svg className="w-5 h-5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-sm font-medium text-stone-700">Data Viewer</span>
              </button>
            </div>
            
            {/* Bottom - Logout */}
            <div className="border-t border-[#E5E5E3] p-4">
              <button 
                onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-2 py-2 hover:bg-stone-50 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="text-sm font-medium text-stone-700">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rail Sidebar - hidden on mobile */}
      <aside className="hidden md:flex w-16 flex-col items-center py-4 border-r border-[#E5E5E3] bg-[#F5F5F3] relative z-40">
        {/* Logo */}
        <div className="w-10 h-10 rounded-lg bg-[#1A1A1A] flex items-center justify-center mb-8">
          <span className="text-white font-bold text-sm">PF</span>
        </div>
        
        {/* New Chat Button */}
        <button 
          onClick={handleNewChat}
          className="w-10 h-10 rounded-lg bg-[#E5E5E3] hover:bg-[#DCDCDA] flex items-center justify-center transition-colors mb-4"
          title="New chat"
        >
          <svg className="w-5 h-5 text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        
        {/* Nav items */}
        <nav className="flex-1 flex flex-col items-center gap-2">
          {/* History button */}
          <div 
            className="relative"
            onMouseEnter={() => setIsHistoryHovered(true)}
            onMouseLeave={() => setIsHistoryHovered(false)}
          >
            <button 
              onClick={() => setActiveView('chat')}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${isHistoryHovered || activeView === 'chat' ? 'bg-[#E5E5E3]' : 'hover:bg-[#E5E5E3]'}`}
              title="History"
            >
              <svg className={`w-5 h-5 ${activeView === 'chat' ? 'text-[#1A1A1A]' : 'text-stone-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            
            {/* Invisible bridge to flyover - extends hover zone to the right */}
            {isHistoryHovered && (
              <div className="absolute left-full top-0 w-4 h-full" />
            )}
          </div>
          
          {/* Data Viewer button */}
          <button 
            onClick={() => setActiveView('dashboard')}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${activeView === 'dashboard' ? 'bg-[#E5E5E3]' : 'hover:bg-[#E5E5E3]'}`}
            title="Data Viewer"
          >
            <svg className={`w-5 h-5 ${activeView === 'dashboard' ? 'text-[#1A1A1A]' : 'text-stone-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </button>
        </nav>
        
        {/* Bottom actions */}
        <div className="flex flex-col items-center gap-2">
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

      {/* Secondary Sidebar - History Panel (Overlay) - hidden on mobile */}
      {isHistoryHovered && (
        <div 
          className="hidden md:flex absolute left-16 top-0 w-64 h-full bg-white border-r border-[#E5E5E3] shadow-lg flex-col z-50"
          onMouseEnter={() => setIsHistoryHovered(true)}
          onMouseLeave={() => setIsHistoryHovered(false)}
        >
          {/* Header */}
          <div className="px-4 pt-4 pb-4">
            <div className="flex items-center justify-between h-10">
              <span className="font-medium text-[#1A1A1A]">History</span>
              <button 
                className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
                title="Pin sidebar"
              >
                <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Recent section */}
          <div className="flex-1 overflow-y-auto">
            {sessions.length > 0 ? (
              <>
                <div className="px-4 py-2">
                  <span className="text-xs font-medium text-stone-400 uppercase tracking-wide">Recent</span>
                </div>
                <div className="flex flex-col">
                  {sessions.map(session => (
                    <div 
                      key={session.id}
                      className={`flex items-center gap-2 px-4 py-2.5 hover:bg-stone-50 cursor-pointer group/item ${session.id === activeSessionId ? 'bg-stone-100' : ''}`}
                    >
                      <button 
                        onClick={() => switchToSession(session.id)}
                        className="flex-1 text-sm text-left text-stone-700 truncate"
                      >
                        {session.title}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(session.id);
                        }}
                        className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-stone-200 rounded transition-opacity"
                        title="Delete chat"
                      >
                        <svg className="w-3.5 h-3.5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-stone-400">No chat history yet</p>
                <p className="text-xs text-stone-400 mt-1">Start a new conversation</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      {activeView === 'dashboard' ? (
        <Dashboard />
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Scrollable content area */}
          <div className="flex-1 overflow-auto">
            {/* Header */}
            <header className="px-4 md:px-6 pt-4 pb-4 border-b border-[#E5E5E3] bg-[#FAFAF8]/80 backdrop-blur-sm sticky top-0 z-10">
              <div className="flex items-center h-10">
                <h1 className="text-lg font-semibold text-[#1A1A1A]">Primary Flow</h1>
              </div>
            </header>

            {/* Messages */}
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 flex flex-col gap-5">
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
                          <div key={callId} className="mb-4">
                            <ChartCard
                              title={toolInvocation.result.title}
                              type={toolInvocation.result.type}
                              data={toolInvocation.result.data}
                              xKey={toolInvocation.result.xKey}
                              yKey={toolInvocation.result.yKey}
                              yLabel={toolInvocation.result.yLabel}
                              color={toolInvocation.result.color}
                            />
                          </div>
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
                          <div key={callId} className="mb-4">
                            <TableCard
                              title={toolInvocation.result.title}
                              columns={toolInvocation.result.columns}
                              rows={toolInvocation.result.rows}
                            />
                          </div>
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
                          <div key={callId} className="mb-4">
                            <MarketIssuance
                              deals={result.deals || []}
                              summary={result.summary || { totalDeals: 0, totalVolume: 0, avgSpread: 0, avgNip: 0, bySector: [], byCurrency: [] }}
                              filters={result.filters || { sector: 'All', currency: 'All', showing: 0 }}
                            />
                          </div>
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
                          <div key={callId} className="mb-4">
                            <IssuerTimeline
                              issuerName={result.issuer?.name || 'Issuer'}
                              deals={result.deals || []}
                              summary={result.summary || { totalDeals: 0, totalRaised: 0, avgTenor: 'N/A', avgNip: 0, avgOversubscription: 0 }}
                            />
                          </div>
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
                          <div key={callId} className="mb-4">
                            <ComparableDealsPanel
                              issuer={result.issuer}
                              issuerSummary={result.issuerSummary}
                              issuerDeals={result.issuerDeals || []}
                              peers={result.peers || []}
                              comparison={result.comparison || { nipVsPeers: 'N/A' }}
                            />
                          </div>
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
                          <div key={callId} className="mb-4">
                            <AllocationBreakdown
                              deal={result.deal}
                              allocations={result.allocations || []}
                              breakdown={result.breakdown || { byType: [], byGeography: [] }}
                              summary={result.summary || { totalInvestors: 0, totalAllocated: 0, avgFillRate: 0 }}
                            />
                          </div>
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
                          <div key={callId} className="mb-4">
                            <SecondaryPerformanceView
                              bond={result.bond}
                              performance={result.performance || []}
                              drift={result.drift || 0}
                              summary={result.summary}
                              analysis={result.analysis || { trend: 'Stable', interpretation: '' }}
                            />
                          </div>
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
                          <div key={callId} className="mb-4">
                            <TableCard
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
                          </div>
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
                          <div key={callId} className="mb-4">
                            <ExportPanel
                              brief={result.brief}
                              exportFormats={result.exportFormats || ['pdf', 'pptx', 'xlsx', 'email']}
                            />
                          </div>
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
          </div>

          {/* Input Area */}
          <footer className="px-4 md:px-6 pb-6 pt-3">
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
