import { ImageResponse } from 'next/og';
 
// Route segment config
export const runtime = 'edge';
 
// Image metadata
export const size = {
  width: 512,
  height: 512,
};
export const contentType = 'image/png';
 
// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      // ImageResponse JSX element
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
          borderRadius: '110px',
        }}
      >
        <div style={{ fontSize: 240, filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))' }}>🧾</div>
      </div>
    ),
    {
      ...size,
    }
  );
}
