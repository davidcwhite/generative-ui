import { useChat, type Message } from '@ai-sdk/react';
import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
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
import { LabChatView } from './lab/LabChatView';
import { UiComponentLabView } from './lab/components-ui/UiComponentLabView';
import { BondIssuanceAgGridLab } from './lab/ag-grid/BondIssuanceAgGridLab';
import { CopilotKitLabView } from './lab/copilotkit/CopilotKitLabView';
import { SidebarUxLabView } from './lab/sidebar-ux/SidebarUxLabView';
import {
  MessageSquare,
  FileText,
  BarChart3,
  PanelLeft,
  Plus,
  Search,
  LogOut,
  ChevronRight,
  Trash2,
  Menu,
  X,
  type LucideIcon,
} from 'lucide-react';

const MAX_STORED_MESSAGES = 50;
const MAX_SESSIONS = 20;
const AUTH_KEY = 'dcm-authenticated';
const SESSIONS_KEY = 'pf-chat-sessions';
const ACTIVE_SESSION_KEY = 'pf-active-session';
const API_URL = import.meta.env.VITE_API_URL || '/api/dcm/chat';
const API_BASE = API_URL.replace('/api/dcm/chat', '');

type LabMode =
  | 'off'
  | 'streaming_ux'
  | 'ui_components_custom'
  | 'ui_components_precanned'
  | 'aggrid_bonds'
  | 'copilotkit_generative'
  | 'sidebar_ux_examples';

const LAB_MODE_LABEL: Record<LabMode, string> = {
  off: 'Lab off',
  streaming_ux: 'Streaming UX',
  ui_components_custom: 'UI components · Custom',
  ui_components_precanned: 'UI components · Pre-canned',
  aggrid_bonds: 'AG Grid · Bonds',
  copilotkit_generative: 'CopilotKit · Generative UI',
  sidebar_ux_examples: 'Sidebar UX · Examples',
};

// Chat session type
interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

type SidebarSectionId = 'agents' | 'documents' | 'data';
type SidebarIconName =
  | 'agents'
  | 'documents'
  | 'data'
  | 'sidebar-toggle'
  | 'plus'
  | 'search'
  | 'logout'
  | 'chevron'
  | 'trash';

interface SidebarLink {
  id: string;
  label: string;
  meta?: string;
  status?: string;
}

interface SidebarContextGroup {
  id: string;
  title: string;
  links: SidebarLink[];
}

const SIDEBAR_SECTIONS: Array<{ id: SidebarSectionId; label: string; icon: SidebarIconName }> = [
  { id: 'agents', label: 'Agents', icon: 'agents' },
  { id: 'documents', label: 'Documents', icon: 'documents' },
  { id: 'data', label: 'Data', icon: 'data' },
];

const STATIC_CONTEXT_GROUPS: Record<Exclude<SidebarSectionId, 'agents'>, SidebarContextGroup[]> = {
  documents: [
    {
      id: 'recent-documents',
      title: 'Recent',
      links: [
        { id: 'mandate-brief', label: 'BMW mandate brief', meta: 'Updated 8m ago', status: 'draft' },
        { id: 'investor-pack', label: 'Investor meeting pack', meta: 'Coverage notes' },
        { id: 'term-sheet', label: 'Draft term sheet', meta: 'Primary Flow doc' },
      ],
    },
    {
      id: 'document-workflows',
      title: 'Workflows',
      links: [
        { id: 'summaries', label: 'Generated summaries', meta: '12 documents' },
        { id: 'exports', label: 'Export queue', meta: '2 pending' },
      ],
    },
  ],
  data: [
    {
      id: 'market-data',
      title: 'Market data',
      links: [
        { id: 'dashboard', label: 'Data Viewer', meta: 'Open dashboard', status: 'live' },
        { id: 'issuance', label: 'Issuance monitor', meta: '20 deals' },
        { id: 'allocations', label: 'Allocation quality', meta: '6 books' },
      ],
    },
    {
      id: 'coverage-data',
      title: 'Coverage',
      links: [
        { id: 'issuers', label: 'Issuer profiles', meta: 'Autos focus' },
        { id: 'investors', label: 'Investor history', meta: 'Fill rates' },
      ],
    },
  ],
};

const ICON_MAP: Record<SidebarIconName, LucideIcon> = {
  agents: MessageSquare,
  documents: FileText,
  data: BarChart3,
  'sidebar-toggle': PanelLeft,
  plus: Plus,
  search: Search,
  logout: LogOut,
  chevron: ChevronRight,
  trash: Trash2,
};

function SidebarIcon({ icon, className = 'h-5 w-5' }: { icon: SidebarIconName; className?: string }) {
  const Icon = ICON_MAP[icon];
  return <Icon className={className} strokeWidth={1.75} aria-hidden="true" />;
}

function PFLogoMark({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path d="M8 5.5v13" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
      <path d="M8 6.25h6a3 3 0 0 1 0 6H9" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 14.5h6.5" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
    </svg>
  );
}

function RailTooltip({
  label,
  anchor,
  show,
}: {
  label: string;
  anchor: HTMLElement | null;
  show: boolean;
}) {
  if (!show || !anchor) return null;
  const rect = anchor.getBoundingClientRect();
  return createPortal(
    <span
      role="tooltip"
      style={{
        position: 'fixed',
        top: rect.top + rect.height / 2,
        left: rect.right + 8,
        transform: 'translateY(-50%)',
        zIndex: 60,
      }}
      className="pointer-events-none whitespace-nowrap rounded-md bg-[#1A1A1A] px-2.5 py-1.5 text-xs font-medium text-white shadow-lg"
    >
      {label}
    </span>,
    document.body,
  );
}

function useRailTooltip(collapsed: boolean) {
  const [hovered, setHovered] = useState(false);
  return {
    showTooltip: collapsed && hovered,
    bind: {
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
    },
  };
}

function SidebarNavRow({
  icon,
  label,
  collapsed,
  active = false,
  tone = 'default',
  onClick,
}: {
  icon: SidebarIconName;
  label: string;
  collapsed: boolean;
  active?: boolean;
  tone?: 'default' | 'muted';
  onClick: () => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { showTooltip, bind } = useRailTooltip(collapsed);

  const colorClasses = active
    ? 'bg-[#E5E5E3] text-[#1A1A1A]'
    : tone === 'muted'
    ? 'text-stone-600 hover:bg-[#EDEDEB] hover:text-[#1A1A1A]'
    : 'text-stone-700 hover:bg-[#EEEEEC] hover:text-[#1A1A1A]';

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        {...bind}
        className={`flex w-full items-center rounded-lg py-2 text-left text-sm font-medium transition-colors duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 motion-reduce:transition-none ${colorClasses}`}
      >
        <span className="flex h-5 w-10 shrink-0 items-center justify-center">
          <SidebarIcon icon={icon} className="h-5 w-5" />
        </span>
        <span
          className={`ml-3 min-w-0 flex-1 truncate transition-opacity duration-150 ease-out motion-reduce:transition-none ${
            collapsed ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {label}
        </span>
      </button>
      <RailTooltip label={label} anchor={buttonRef.current} show={showTooltip} />
    </>
  );
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
  const [activeSidebarSection, setActiveSidebarSection] = useState<SidebarSectionId>('agents');
  const [isContextPanelCollapsed, setIsContextPanelCollapsed] = useState(false);
  const [isRailHovered, setIsRailHovered] = useState(false);
  const brandChipRef = useRef<HTMLButtonElement>(null);
  const [isBrandChipHovered, setIsBrandChipHovered] = useState(false);
  const [collapsedContextGroups, setCollapsedContextGroups] = useState<Record<string, boolean>>({});
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [labMode, setLabMode] = useState<LabMode>('off');
  
  const { messages, input, setInput, handleInputChange, addToolResult, isLoading, setMessages, stop, append } = useChat({
    api: API_URL,
    maxSteps: 5,
    initialMessages: getInitialMessages(),
  });

  // Find all pending tool calls that require user input (forms, approval buttons)
  const getPendingInteractiveTools = useCallback(() => {
    const pendingTools: { toolCallId: string; toolName: string }[] = [];
    
    for (const message of messages) {
      if (message.role === 'assistant' && message.toolInvocations) {
        for (const tool of message.toolInvocations) {
          if (
            tool.state === 'call' &&
            (tool.toolName === 'collect_filters' || tool.toolName === 'confirm_action')
          ) {
            pendingTools.push({
              toolCallId: tool.toolCallId,
              toolName: tool.toolName,
            });
          }
        }
      }
    }
    return pendingTools;
  }, [messages]);

  // Wrap handleSubmit to auto-cancel pending interactive tools before sending new message
  const handleSubmitWithCancel = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    // Cancel any pending interactive tools so the AI can process the new message
    const pendingTools = getPendingInteractiveTools();
    for (const tool of pendingTools) {
      addToolResult({
        toolCallId: tool.toolCallId,
        result: tool.toolName === 'collect_filters' 
          ? { values: {}, skipped: true }
          : { cancelled: true, skipped: true },
      });
    }
    
    // Use append to send the message directly (works better than handleSubmit with modified event)
    const messageContent = input;
    setInput('');
    append({ role: 'user', content: messageContent });
  }, [input, getPendingInteractiveTools, addToolResult, setInput, append]);

  const handleSidebarSectionSelect = useCallback((sectionId: SidebarSectionId) => {
    setActiveSidebarSection(sectionId);
    setActiveView(sectionId === 'data' ? 'dashboard' : 'chat');
  }, []);

  const toggleContextGroup = useCallback((groupId: string) => {
    setCollapsedContextGroups((current) => ({
      ...current,
      [groupId]: !current[groupId],
    }));
  }, []);

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
    setActiveSidebarSection('agents');
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
      setActiveSidebarSection('agents');
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

  const sidebarContextGroups: SidebarContextGroup[] =
    activeSidebarSection === 'agents'
      ? [
          {
            id: 'agent-recents',
            title: 'Recents',
            links:
              sessions.length > 0
                ? sessions.map((session) => ({
                    id: session.id,
                    label: session.title,
                    meta: new Date(session.updatedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    }),
                  }))
                : [{ id: 'empty-agents', label: 'No chat history yet', meta: 'Start a new conversation' }],
          },
        ]
      : STATIC_CONTEXT_GROUPS[activeSidebarSection];

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
          <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] flex items-center justify-center text-white">
            <PFLogoMark className="h-4 w-4" />
          </div>
          <span className="font-semibold text-[#1A1A1A]">Primary Flow</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 rounded-lg hover:bg-[#E5E5E3] transition-colors"
          title="Menu"
        >
          <Menu className="w-6 h-6 text-stone-700" strokeWidth={1.75} aria-hidden="true" />
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
                <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] flex items-center justify-center text-white">
                  <PFLogoMark className="h-4 w-4" />
                </div>
                <span className="font-semibold text-[#1A1A1A]">Primary Flow</span>
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5 text-stone-600" strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
            
            {/* Menu Items */}
            <div className="flex-1 overflow-y-auto py-2">
              {/* Chat / Agents (top-level) */}
              <button 
                onClick={() => { setActiveView('chat'); setActiveSidebarSection('agents'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors ${activeView === 'chat' ? 'bg-stone-100' : ''}`}
              >
                <MessageSquare className="w-5 h-5 text-stone-600" strokeWidth={1.75} aria-hidden="true" />
                <span className="text-sm font-medium text-stone-700">Chat</span>
              </button>

              {/* Agents actions */}
              <button 
                onClick={() => { handleNewChat(); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors"
              >
                <Plus className="w-5 h-5 text-stone-600" strokeWidth={1.75} aria-hidden="true" />
                <span className="text-sm font-medium text-stone-700">New chat</span>
              </button>
              <button 
                onClick={() => { /* placeholder until search is wired */ setIsMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors"
              >
                <Search className="w-5 h-5 text-stone-600" strokeWidth={1.75} aria-hidden="true" />
                <span className="text-sm font-medium text-stone-700">Search chats</span>
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
                onClick={() => { setActiveView('dashboard'); setActiveSidebarSection('data'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors ${activeView === 'dashboard' ? 'bg-stone-100' : ''}`}
              >
                <BarChart3 className="w-5 h-5 text-stone-600" strokeWidth={1.75} aria-hidden="true" />
                <span className="text-sm font-medium text-stone-700">Data Viewer</span>
              </button>
            </div>
            
            {/* Bottom - Logout */}
            <div className="border-t border-[#E5E5E3] p-4">
              <button 
                onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-2 py-2 hover:bg-stone-50 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5 text-stone-600" strokeWidth={1.75} aria-hidden="true" />
                <span className="text-sm font-medium text-stone-700">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar - hidden on mobile */}
      <aside
        className={`hidden md:flex h-full shrink-0 flex-col overflow-x-hidden border-r border-[#E5E5E3] bg-[#F5F5F3] transition-[width] duration-200 ease-out motion-reduce:transition-none ${
          isContextPanelCollapsed ? 'w-16' : 'w-72'
        }`}
        aria-label="Primary navigation"
        onMouseEnter={() => setIsRailHovered(true)}
        onMouseLeave={() => setIsRailHovered(false)}
      >
        {/* Brand row — single layout, fades only */}
        <div className="flex h-[60px] items-center gap-3 px-3">
          {/* w-10 slot keeps the chip centered at x=32, identical to section nav icons */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center">
            <button
              ref={brandChipRef}
              type="button"
              onClick={
                isContextPanelCollapsed
                  ? () => {
                      setIsRailHovered(false);
                      setIsContextPanelCollapsed(false);
                    }
                  : undefined
              }
              onMouseEnter={() => setIsBrandChipHovered(true)}
              onMouseLeave={() => setIsBrandChipHovered(false)}
              tabIndex={isContextPanelCollapsed ? 0 : -1}
              aria-label={isContextPanelCollapsed ? 'Open sidebar' : undefined}
              aria-hidden={isContextPanelCollapsed ? undefined : true}
              className={`relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg transition-colors duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 motion-reduce:transition-none ${
                !isContextPanelCollapsed
                  ? 'cursor-default bg-[#1A1A1A] text-white'
                  : isBrandChipHovered
                  ? 'cursor-pointer bg-[#EEEEEC] text-stone-700'
                  : isRailHovered
                  ? 'cursor-pointer bg-transparent text-stone-700'
                  : 'cursor-pointer bg-[#1A1A1A] text-white'
              }`}
            >
              <span
                className={`absolute inset-0 flex items-center justify-center transition-opacity duration-150 ease-out motion-reduce:transition-none ${
                  isContextPanelCollapsed && isRailHovered ? 'opacity-0' : 'opacity-100'
                }`}
              >
                <PFLogoMark className="h-5 w-5" />
              </span>
              <span
                className={`absolute inset-0 flex items-center justify-center transition-opacity duration-150 ease-out motion-reduce:transition-none ${
                  isContextPanelCollapsed && isRailHovered ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <SidebarIcon icon="sidebar-toggle" className="h-5 w-5" />
              </span>
            </button>
          </div>

          <span
            className={`min-w-0 flex-1 truncate text-sm font-semibold text-[#1A1A1A] transition-opacity duration-150 ease-out motion-reduce:transition-none ${
              isContextPanelCollapsed ? 'opacity-0' : 'opacity-100'
            }`}
            aria-hidden={isContextPanelCollapsed ? true : undefined}
          >
            Primary Flow
          </span>

          <button
            type="button"
            onClick={() => {
              setIsRailHovered(false);
              setIsContextPanelCollapsed(true);
            }}
            tabIndex={isContextPanelCollapsed ? -1 : 0}
            aria-label="Collapse sidebar"
            aria-hidden={isContextPanelCollapsed ? true : undefined}
            title="Collapse sidebar"
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-500 transition-opacity duration-150 ease-out hover:bg-[#E5E5E3] hover:text-[#1A1A1A] focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 motion-reduce:transition-none ${
              isContextPanelCollapsed ? 'pointer-events-none opacity-0' : 'opacity-100'
            }`}
          >
            <SidebarIcon icon="sidebar-toggle" className="h-4 w-4" />
          </button>
          <RailTooltip
            label="Open sidebar"
            anchor={brandChipRef.current}
            show={isContextPanelCollapsed && isBrandChipHovered}
          />
        </div>

        {/* Primary nav */}
        <nav className="mt-2 flex flex-col gap-0.5 px-3" aria-label="Primary navigation">
          {SIDEBAR_SECTIONS.map((section) => (
            <SidebarNavRow
              key={section.id}
              icon={section.icon}
              label={section.label}
              collapsed={isContextPanelCollapsed}
              active={activeSidebarSection === section.id}
              onClick={() => handleSidebarSectionSelect(section.id)}
            />
          ))}
        </nav>

        {/* Section content — always rendered; fades when collapsed */}
        <div
          className={`mt-5 flex flex-1 flex-col overflow-hidden transition-opacity duration-150 ease-out motion-reduce:transition-none ${
            isContextPanelCollapsed ? 'pointer-events-none opacity-0' : 'opacity-100'
          }`}
          aria-hidden={isContextPanelCollapsed ? true : undefined}
        >
          {activeSidebarSection === 'agents' && (
            <div className="shrink-0 space-y-0.5 px-3 pb-3">
              <SidebarNavRow
                icon="plus"
                label="New chat"
                collapsed={false}
                tone="muted"
                onClick={handleNewChat}
              />
              <SidebarNavRow
                icon="search"
                label="Search chats"
                collapsed={false}
                tone="muted"
                onClick={() => { /* placeholder until search is wired */ }}
              />
            </div>
          )}
          <div className="flex-1 overflow-y-auto px-3 pb-3">
            <div className="space-y-3">
              {sidebarContextGroups.map((group) => {
                const isGroupCollapsed = collapsedContextGroups[group.id] ?? false;
                return (
                  <section key={group.id} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => toggleContextGroup(group.id)}
                      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-400 transition-colors hover:text-stone-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-300"
                      aria-expanded={!isGroupCollapsed}
                    >
                      <span>{group.title}</span>
                      <span
                        className={`transition-transform duration-150 ease-out ${isGroupCollapsed ? '' : 'rotate-90'}`}
                      >
                        <SidebarIcon icon="chevron" className="h-3 w-3" />
                      </span>
                    </button>

                    {!isGroupCollapsed && (
                      <div className="flex flex-col">
                        {group.links.map((link) => {
                          const isAgentSession =
                            activeSidebarSection === 'agents' && sessions.some((s) => s.id === link.id);
                          const isActiveSession =
                            activeSidebarSection === 'agents' && link.id === activeSessionId;
                          const isEmptyState = link.id === 'empty-agents';

                          const handleLinkClick = () => {
                            if (isEmptyState) return;
                            if (link.id === 'dashboard') {
                              handleSidebarSectionSelect('data');
                              return;
                            }
                            if (isAgentSession) {
                              switchToSession(link.id);
                            }
                          };

                          return (
                            <div
                              key={link.id}
                              className={`group/item flex items-center rounded-lg transition-colors ${
                                isActiveSession ? 'bg-[#E5E5E3]' : 'hover:bg-[#EEEEEC]'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={handleLinkClick}
                                disabled={isEmptyState}
                                className="min-w-0 flex-1 px-3 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-300 disabled:cursor-default"
                                aria-current={isActiveSession ? 'page' : undefined}
                              >
                                <span
                                  className={`block truncate text-sm ${
                                    isEmptyState
                                      ? 'text-stone-400'
                                      : isActiveSession
                                      ? 'font-medium text-[#1A1A1A]'
                                      : 'text-stone-800'
                                  }`}
                                >
                                  {link.label}
                                </span>
                              </button>
                              {isAgentSession && (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    deleteSession(link.id);
                                  }}
                                  className="mr-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-stone-400 opacity-0 transition-opacity hover:bg-stone-200/60 hover:text-stone-700 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-stone-300 group-hover/item:opacity-100"
                                  title="Delete chat"
                                  aria-label={`Delete ${link.label}`}
                                >
                                  <SidebarIcon icon="trash" className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom: Logout — uses single-layout SidebarNavRow */}
        <div className="mt-auto border-t border-[#E5E5E3] px-3 py-3">
          <SidebarNavRow
            icon="logout"
            label="Logout"
            collapsed={isContextPanelCollapsed}
            onClick={handleLogout}
          />
        </div>
      </aside>

      {/* Main content */}
      {activeView === 'dashboard' ? (
        <Dashboard />
      ) : (
        <div className="relative flex-1 flex flex-col overflow-hidden">
          {/* Floating Lab mode control */}
          <div className="pointer-events-none absolute right-4 top-3 z-10 md:right-6">
            <label className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[#E5E5E3] bg-white/90 px-3 py-1.5 text-xs font-medium text-stone-600 shadow-sm backdrop-blur transition-colors hover:bg-white">
              <svg className="h-3.5 w-3.5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M14.25 3.104v5.714a2.25 2.25 0 00.659 1.591L19 14.5M9.75 3.104a48.554 48.554 0 014.5 0M5 14.5l-1.27 4.317A1.5 1.5 0 005.166 20.7h13.668a1.5 1.5 0 001.436-1.883L19 14.5M5 14.5h14" />
              </svg>
              <span className="sr-only">Lab mode</span>
              <select
                value={labMode}
                onChange={(event) =>
                  setLabMode(event.target.value as LabMode)
                }
                className="bg-transparent text-xs font-medium text-stone-700 outline-none"
                aria-label="Lab mode"
              >
                {(Object.keys(LAB_MODE_LABEL) as LabMode[]).map((mode) => (
                  <option key={mode} value={mode}>
                    {LAB_MODE_LABEL[mode]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-auto">
            {labMode === 'streaming_ux' ? (
              <LabChatView />
            ) : labMode === 'ui_components_custom' ? (
              <UiComponentLabView mode="custom" />
            ) : labMode === 'ui_components_precanned' ? (
              <UiComponentLabView mode="precanned" />
            ) : labMode === 'aggrid_bonds' ? (
              <BondIssuanceAgGridLab />
            ) : labMode === 'copilotkit_generative' ? (
              <CopilotKitLabView />
            ) : labMode === 'sidebar_ux_examples' ? (
              <SidebarUxLabView />
            ) : (
              <>
            {/* Messages */}
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 flex flex-col gap-5">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">

              <h2 className="text-2xl font-semibold text-[#1A1A1A] mb-2">Component-first <span className="font-normal italic">flow</span></h2>
              <p className="text-stone-500 mb-12 text-sm max-w-md text-center">Less wall of text, more get things done.</p>
              
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
                        const values = toolInvocation.result.values || {};
                        const filterText = Object.entries(values)
                          .filter(([, v]) => v && v !== 'All')
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(', ') || 'No filters applied';
                        
                        return (
                          <div key={callId} className="mt-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
                            {filterText !== 'No filters applied' ? `Filtered by ${filterText}` : filterText}
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
                        if (result.error || !result.issuer || !result.deals) {
                          return (
                            <div key={callId} className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                              {result.error || 'Failed to load issuance history'}
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
                        if (result.error || !result.issuer) {
                          return (
                            <div key={callId} className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                              {result.error || 'Failed to load peer comparison'}
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
                        if (result.error || !result.deal) {
                          return (
                            <div key={callId} className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                              {result.error || 'Failed to load allocation data'}
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
                        if (result.error || !result.bond || !result.summary) {
                          return (
                            <div key={callId} className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                              {result.error || 'Failed to load performance data'}
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
              </>
            )}
          </div>

          {labMode === 'off' && (
          <footer className="px-4 md:px-6 pb-6 pt-3">
          <div className="max-w-3xl mx-auto">
            <form
              onSubmit={handleSubmitWithCancel}
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
                {isLoading ? (
                  <button
                    type="button"
                    onClick={stop}
                    className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                    aria-label="Stop generation"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="6" width="12" height="12" rx="1" />
                    </svg>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="p-2 rounded-full bg-[#1A1A1A] text-white hover:bg-stone-700 transition-colors disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed"
                    aria-label="Send message"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  </button>
                )}
              </div>
            </form>
          </div>
        </footer>
          )}
        </div>
      )}
    </div>
  );
}
