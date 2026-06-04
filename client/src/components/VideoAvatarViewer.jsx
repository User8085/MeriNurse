import { useRef, useEffect, useState } from 'react';

/* ─────────────────────────────────────────────────────────────
   VideoAvatarViewer
   Plays the doctor / nurse animated character video in a
   beautiful, looping, full-height panel that replaces the
   heavy 3-D GLB viewer on the Login page.
   ───────────────────────────────────────────────────────────── */
export default function VideoAvatarViewer({ src = '/doctor-avatar.mp4', style = {} }) {
  const videoRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [floating, setFloating] = useState(0);

  /* Auto-play as soon as the component mounts */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.loop  = true;
    v.playsInline = true;
    v.play().catch(() => {/* silently ignore autoplay policy blocks */});
  }, []);

  /* Subtle floating animation via JS (mimics the old GLB bob) */
  useEffect(() => {
    let raf;
    const tick = () => {
      setFloating(Math.sin(Date.now() * 0.001) * 6); // ±6 px
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        borderRadius: '20px',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      {/* ── Loading skeleton ── */}
      {!loaded && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 5,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 16,
          background: 'rgba(253,240,234,0.7)',
          backdropFilter: 'blur(8px)',
          borderRadius: 'inherit',
        }}>
          <div className="spinner" style={{ width: 44, height: 44, borderTopColor: 'var(--brand-500)' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
            Loading avatar…
          </p>
        </div>
      )}

      {/* ── Background glow orb (depth / depth-of-field feel) ── */}
      <div style={{
        position: 'absolute',
        width: '70%',
        aspectRatio: '1',
        borderRadius: '50%',
        background: 'radial-gradient(circle at 40% 40%, rgba(240,122,90,0.28) 0%, rgba(200,69,32,0.10) 60%, transparent 80%)',
        filter: 'blur(32px)',
        pointerEvents: 'none',
        zIndex: 1,
        bottom: '5%',
      }} />

      {/* ── The video itself, floating gently ── */}
      <video
        ref={videoRef}
        src={src}
        muted
        loop
        playsInline
        disablePictureInPicture
        controlsList="nodownload nofullscreen noremoteplayback"
        onCanPlay={() => setLoaded(true)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center top',
          display: 'block',
          position: 'relative',
          zIndex: 2,
          transform: `translateY(${floating}px)`,
          transition: 'transform 0.05s linear',
          borderRadius: 'inherit',
          background: 'transparent',
          mixBlendMode: 'normal',
          /* Prevent pointer events so browser never shows overlay on hover */
          pointerEvents: 'none',
        }}
      />

      {/* ── Top fade: blends video into the panel background ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: '22%',
        background: 'linear-gradient(to bottom, rgba(253,240,234,0.72) 0%, transparent 100%)',
        zIndex: 3,
        pointerEvents: 'none',
        borderRadius: 'inherit',
      }} />

      {/* ── Bottom fade ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '22%',
        background: 'linear-gradient(to top, rgba(249,226,213,0.85) 0%, transparent 100%)',
        zIndex: 3,
        pointerEvents: 'none',
        borderRadius: 'inherit',
      }} />

      {/* ── Subtle vignette ring ── */}
      <div style={{
        position: 'absolute', inset: 0,
        borderRadius: 'inherit',
        boxShadow: 'inset 0 0 60px rgba(200,69,32,0.08)',
        zIndex: 4,
        pointerEvents: 'none',
      }} />

      {/* ── Floating status badge ── */}
      <div style={{
        position: 'absolute',
        top: 16, right: 16,
        zIndex: 6,
        background: 'rgba(255,255,255,0.90)',
        backdropFilter: 'blur(10px)',
        borderRadius: '999px',
        padding: '5px 14px',
        fontSize: '0.72rem',
        fontWeight: 700,
        color: 'var(--brand-600)',
        border: '1px solid rgba(255,255,255,0.9)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
      }}>
        <span style={{
          width: 7, height: 7,
          borderRadius: '50%',
          background: '#22c55e',
          display: 'inline-block',
          boxShadow: '0 0 0 2px rgba(34,197,94,0.3)',
          animation: 'pulse 2s ease-in-out infinite',
        }} />
        Live
      </div>

      {/* Kill all native browser video control overlays */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%       { transform: scale(1.3); opacity: 0.7; }
        }
        video::-webkit-media-controls            { display: none !important; }
        video::-webkit-media-controls-enclosure  { display: none !important; }
        video::-webkit-media-controls-overlay-play-button { display: none !important; }
        video::-webkit-media-controls-panel      { display: none !important; }
        video::--webkit-media-controls-start-playback-button { display: none !important; }
      `}</style>
    </div>
  );
}
