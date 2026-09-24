import { ImageResponse } from 'next/og';

export const alt =
  'PharmaFlow: sell a strip at the counter, your online store already knows';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// The social card repeats the hero: the three lines, ticked, and the mark.
export default function OpengraphImage() {
  const lines = [
    'Sell a strip at the counter.',
    'Your online store already knows.',
    'So does your reorder list.',
  ];
  const cell = (x: number, y: number, popped = false) => (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 40,
        height: 40,
        borderRadius: 15,
        background: popped ? 'transparent' : '#0a7a4d',
        border: popped ? '8px solid #0a7a4d' : 'none',
      }}
    />
  );
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: '#f3f5f2',
        padding: '72px 80px',
        color: '#0e2b22',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div
          style={{
            position: 'relative',
            width: 142,
            height: 142,
            display: 'flex',
            transform: 'scale(0.5)',
            margin: -36,
          }}
        >
          {cell(51, 4)}
          {cell(4, 51)}
          {cell(51, 51)}
          {cell(98, 51, true)}
          {cell(51, 98)}
        </div>
        <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>
          PharmaFlow
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {lines.map((l) => (
          <div
            key={l}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 22,
              fontSize: 64,
              fontWeight: 800,
              letterSpacing: -2,
            }}
          >
            <svg width="46" height="46" viewBox="0 0 24 24">
              <path
                d="M3 13.5 L9.2 19 L21 4.5"
                fill="none"
                stroke="#0a7a4d"
                strokeWidth="3.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {l}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 28, color: '#4a5e56' }}>
        Pharmacy POS, online store and supplier ordering on one stock record.
      </div>
    </div>,
    size,
  );
}
