import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Udharwale - Smart Digital Debt Ledger';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#03040a',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* Background aurora glows */}
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            left: '-10%',
            width: '800px',
            height: '800px',
            background: 'radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 60%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-20%',
            right: '-10%',
            width: '700px',
            height: '700px',
            background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 60%)',
          }}
        />
        
        {/* Icon & Title Container */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 50, zIndex: 10 }}>
          <div
            style={{
              width: 120,
              height: 120,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
              borderRadius: 36,
              fontSize: 64,
              boxShadow: '0 12px 40px rgba(124,58,237,0.5)',
              marginRight: 32,
            }}
          >
            🧾
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 72, fontWeight: 900, color: 'white', letterSpacing: '-0.02em', lineHeight: 1 }}>
              Udharwale
            </span>
            <span style={{ fontSize: 24, fontWeight: 700, color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: 12 }}>
              By Naeem Navjivan
            </span>
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 76,
            fontWeight: 800,
            color: 'white',
            textAlign: 'center',
            lineHeight: 1.1,
            zIndex: 10,
            maxWidth: '1000px',
            textShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}
        >
          Settle debts, track loans,<br/>maintain trust.
        </div>
      </div>
    ),
    { ...size }
  );
}
