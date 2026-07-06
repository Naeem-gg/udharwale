import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '404 - Page Not Found | Udharwale',
  description: 'The page you are looking for does not exist.',
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'var(--bg-base)', fontFamily: "'Outfit', system-ui, sans-serif" }}>
      {/* Aurora Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="animate-aurora absolute rounded-full aurora-blob"
          style={{ width: 600, height: 600, top: '-20%', left: '-10%', background: 'radial-gradient(circle at center, rgba(124,58,237,0.15) 0%, transparent 70%)' }} />
        <div className="animate-aurora absolute rounded-full aurora-blob"
          style={{ width: 500, height: 500, bottom: '-10%', right: '-5%', animationDelay: '3s', animationDirection: 'reverse', background: 'radial-gradient(circle at center, rgba(244,63,94,0.10) 0%, transparent 70%)' }} />
        {/* Grid */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(124,58,237,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.04) 1px, transparent 1px)',
          backgroundSize: '64px 64px'
        }} />
      </div>

      <div className="relative z-10 max-w-lg w-full text-center space-y-8 animate-fade-slide-up">
        {/* 404 text */}
        <div className="relative inline-block">
          <h1 className="text-8xl sm:text-9xl font-black tracking-tighter"
            style={{ 
              fontFamily: "'Syne', sans-serif",
              background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.6) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 40px rgba(124,58,237,0.3))'
            }}>
            404
          </h1>
          <div className="absolute -top-4 -right-8 text-4xl animate-bounce" style={{ filter: 'drop-shadow(0 4px 12px rgba(124,58,237,0.4))' }}>🧾</div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
            Lost in the ledger?
          </h2>
          <p className="text-base max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
            The page you're looking for doesn't exist or has been moved. Let's get your balance back on track.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link href="/"
            className="btn-primary w-full sm:w-auto px-8 py-3.5 text-sm" style={{ borderRadius: 14 }}>
            Go Home →
          </Link>
          <Link href="/dashboard"
            className="w-full sm:w-auto flex items-center justify-center px-8 py-3.5 rounded-xl text-sm font-bold transition-all"
            style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-soft)', color: 'var(--text-secondary)' }}>
            To Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
