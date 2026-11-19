import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Udharwale by Naeem Navjivan — Digital Khata';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#f4f1ec',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '72px',
        }}
      >
        <div
          style={{
            width: 88,
            height: 88,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0f766e',
            borderRadius: 24,
            color: '#ffffff',
            fontSize: 44,
            fontWeight: 800,
            marginBottom: 36,
          }}
        >
          U
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: '#14201c',
            letterSpacing: '-0.04em',
            lineHeight: 1,
            marginBottom: 18,
          }}
        >
          Udharwale
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 600,
            color: '#3d4f47',
            maxWidth: 760,
            lineHeight: 1.35,
          }}
        >
          Personal khata for friends, loans, and shared bills.
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 18,
            fontWeight: 700,
            color: '#0f766e',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          By Naeem Navjivan
        </div>
      </div>
    ),
    { ...size }
  );
}
