/**
 * Mock chat sessions for the Chat History lab.
 * Timestamps are relative to a fixed "now" so grouping stays stable in demos.
 */

export interface MockChatSession {
  id: string;
  title: string;
  preview: string;
  updatedAt: number;
  messageCount: number;
  /** True while the first response is being generated — row shows a shimmer skeleton. */
  loading?: boolean;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Fixed anchor: Wed 24 Jun 2026 ~10:00 UTC+1 */
export const LAB_NOW = new Date('2026-06-24T09:00:00Z').getTime();

export const INITIAL_SESSIONS: MockChatSession[] = [
  {
    id: 's1',
    title: 'BMW 5Y concession vs sector',
    preview: 'Show me the new issue concession for BMW versus autos peers…',
    updatedAt: LAB_NOW - 12 * HOUR,
    messageCount: 8,
  },
  {
    id: 's2',
    title: 'Volkswagen issuance history',
    preview: 'What has Volkswagen issued in EUR over the last 12 months?',
    updatedAt: LAB_NOW - 5 * HOUR,
    messageCount: 14,
  },
  {
    id: 's3',
    title: 'EUR IG supply this week',
    preview: 'Summarise expected EUR investment grade supply for the week…',
    updatedAt: LAB_NOW - 45 * 60 * 1000,
    messageCount: 4,
  },
  {
    id: 's4',
    title: 'SocGen tier-2 pricing',
    preview: 'How did SocGen price its last tier-2 deal versus guidance?',
    updatedAt: LAB_NOW - 28 * HOUR,
    messageCount: 6,
  },
  {
    id: 's5',
    title: 'Cross-currency RV BMW',
    preview: 'Where is it cheapest for BMW to fund a 5Y — EUR, USD or GBP?',
    updatedAt: LAB_NOW - 36 * HOUR,
    messageCount: 11,
  },
  {
    id: 's6',
    title: 'Allocation breakdown Daimler',
    preview: 'Break down the last Daimler allocation by investor type and geography.',
    updatedAt: LAB_NOW - 4 * DAY,
    messageCount: 9,
  },
  {
    id: 's7',
    title: 'Secondary performance VW 2030',
    preview: 'How is VW 3.5% 2030 trading versus reoffer since pricing?',
    updatedAt: LAB_NOW - 6 * DAY,
    messageCount: 5,
  },
  {
    id: 's8',
    title: 'New Chat',
    preview: 'Show me comparable deals for Renault in EUR autos…',
    updatedAt: LAB_NOW - 9 * DAY,
    messageCount: 3,
  },
];
