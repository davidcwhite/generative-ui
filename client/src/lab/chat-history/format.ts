/**
 * Date grouping and formatting for chat history rows.
 * Uses Intl — no hardcoded date strings (Web Interface Guidelines).
 */

import type { MockChatSession } from './mockSessions';

export type DateBucket = 'today' | 'yesterday' | 'earlier';

const BUCKET_LABEL: Record<DateBucket, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  earlier: 'Earlier',
};

const timeFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });
const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

export function bucketFor(updatedAt: number, now: number): DateBucket {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday.getTime() - 86_400_000);

  if (updatedAt >= startOfToday.getTime()) return 'today';
  if (updatedAt >= startOfYesterday.getTime()) return 'yesterday';
  return 'earlier';
}

export function bucketLabel(bucket: DateBucket): string {
  return BUCKET_LABEL[bucket];
}

/** "09:45" for today/yesterday; "18 Jun" for earlier. */
export function formatSessionTime(updatedAt: number, now: number): string {
  const bucket = bucketFor(updatedAt, now);
  if (bucket === 'earlier') return dateFmt.format(new Date(updatedAt));
  return timeFmt.format(new Date(updatedAt));
}

export const BUCKET_ORDER: DateBucket[] = ['today', 'yesterday', 'earlier'];

export interface GroupedSessions {
  bucket: DateBucket;
  label: string;
  sessions: MockChatSession[];
}

export function groupSessions(sessions: MockChatSession[], now: number): GroupedSessions[] {
  const buckets = new Map<DateBucket, MockChatSession[]>();
  const sorted = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);

  for (const session of sorted) {
    const bucket = bucketFor(session.updatedAt, now);
    const list = buckets.get(bucket) ?? [];
    list.push(session);
    buckets.set(bucket, list);
  }

  return BUCKET_ORDER.filter((b) => buckets.has(b)).map((bucket) => ({
    bucket,
    label: bucketLabel(bucket),
    sessions: buckets.get(bucket)!,
  }));
}
