import Dashboard from '../components/Dashboard';

export default function DashboardPage() {
  return (
    <main className="fixed inset-0 overflow-hidden" style={{ background: 'var(--bg-raised)' }}>
      <Dashboard />
    </main>
  );
}
