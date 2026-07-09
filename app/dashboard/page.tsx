import Dashboard from '../components/Dashboard';

export default function DashboardPage() {
  return (
    <main className="flex flex-col flex-1 h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <Dashboard />
    </main>
  );
}
