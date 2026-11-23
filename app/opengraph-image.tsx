import { readFile } from 'fs/promises';
import { join } from 'path';
import { ImageResponse } from 'next/og';
import { SITE_CREATOR, SITE_NAME } from '@/lib/seo';

export const alt = `${SITE_NAME} by ${SITE_CREATOR} — Digital Khata`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const iconBytes = await readFile(join(process.cwd(), 'public/icons/udharwale-512.png'));
  const iconSrc = `data:image/png;base64,${iconBytes.toString('base64')}`;

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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={iconSrc}
          width={96}
          height={96}
          alt=""
          style={{
            width: 96,
            height: 96,
            borderRadius: 24,
            marginBottom: 36,
          }}
        />
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
          {SITE_NAME}
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
          By {SITE_CREATOR}
        </div>
      </div>
    ),
    { ...size }
  );
}
