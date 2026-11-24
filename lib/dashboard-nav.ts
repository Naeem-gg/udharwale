/** Helpers to keep /dashboard nested screens on the browser history stack. */

export type DashboardTab = 'ledgers' | 'trips' | 'activity' | 'insights' | 'settings';

export type DashboardNavState = {
  tab: DashboardTab;
  contactId: string | null;
  tripId: string | null;
};

export function readDashboardNav(search = typeof window !== 'undefined' ? window.location.search : ''): DashboardNavState {
  const params = new URLSearchParams(search);
  const tabParam = params.get('tab');
  // Overview (insights) is folded into Activity in the bottom nav
  const tab: DashboardTab =
    tabParam === 'insights'
      ? 'activity'
      : tabParam === 'trips' ||
          tabParam === 'activity' ||
          tabParam === 'settings' ||
          tabParam === 'ledgers'
        ? tabParam
        : params.get('trip')
          ? 'trips'
          : 'ledgers';

  return {
    tab,
    contactId: params.get('contact'),
    tripId: params.get('trip'),
  };
}

export function buildDashboardPath({
  tab = 'ledgers',
  contactId = null,
  tripId = null,
}: Partial<DashboardNavState> = {}) {
  const params = new URLSearchParams();
  if (tab !== 'ledgers') params.set('tab', tab);
  if (contactId) params.set('contact', contactId);
  if (tripId) params.set('trip', tripId);
  const q = params.toString();
  return q ? `/dashboard?${q}` : '/dashboard';
}

export function pushDashboardNav(state: Partial<DashboardNavState> & { tab?: DashboardTab }) {
  if (typeof window === 'undefined') return;
  const current = readDashboardNav();
  const next: DashboardNavState = {
    tab: state.tab ?? current.tab,
    contactId: state.contactId === undefined ? current.contactId : state.contactId,
    tripId: state.tripId === undefined ? current.tripId : state.tripId,
  };

  // Opening a ledger chat leaves trips; opening a trip leaves chat
  if (next.contactId) {
    next.tab = 'ledgers';
    next.tripId = null;
  }
  if (next.tripId) {
    next.tab = 'trips';
    next.contactId = null;
  }

  const path = buildDashboardPath(next);
  window.history.pushState({ __uwNav: true, ...next }, '', path);
}

export function replaceDashboardNav(state: Partial<DashboardNavState> & { tab?: DashboardTab }) {
  if (typeof window === 'undefined') return;
  const current = readDashboardNav();
  const next: DashboardNavState = {
    tab: state.tab ?? current.tab,
    contactId: state.contactId === undefined ? current.contactId : state.contactId,
    tripId: state.tripId === undefined ? current.tripId : state.tripId,
  };
  const path = buildDashboardPath(next);
  window.history.replaceState({ __uwNav: true, ...next }, '', path);
}
