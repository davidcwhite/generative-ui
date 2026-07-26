import { IssuanceDashboard } from '@/components/issuance-dashboard/IssuanceDashboard';
import { DashboardSettingsButton, useDashboardChrome } from './DashboardSettings';

/**
 * Adapter. The dashboard itself takes plain props so it can be lifted into
 * another project wholesale; this is the only place that knows it is currently
 * one prototype among several.
 */
export default function ShadcnIssuanceDashboard() {
  const { prefs } = useDashboardChrome();
  return <IssuanceDashboard prefs={prefs} toolbar={<DashboardSettingsButton />} />;
}
