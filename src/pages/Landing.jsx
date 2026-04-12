import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()
  const [aboutOpen, setAboutOpen] = useState(false)

  // Trigger word-appear animation for each hero word with its own delay
  useEffect(() => {
    const words = document.querySelectorAll('.word-animate')
    words.forEach(word => {
      const delay = parseInt(word.getAttribute('data-delay')) || 0
      setTimeout(() => {
        if (word) word.style.animation = 'word-appear 1.1s cubic-bezier(0.22,1,0.36,1) forwards'
      }, delay)
    })
  }, [])

  return (
    <>
      <style>{`
        .font-display { font-family: 'Instrument Serif', serif; }

        /* Liquid glass */
        .liquid-glass {
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: none;
          box-shadow: inset 0 1px 1px rgba(255,255,255,0.12);
          position: relative;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.2s ease, background 0.2s ease;
        }
        .liquid-glass:hover { transform: scale(1.03); background: rgba(255,255,255,0.07); }
        .liquid-glass::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1.4px;
          background: linear-gradient(180deg,
            rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.15) 20%,
            rgba(255,255,255,0)   40%, rgba(255,255,255,0)   60%,
            rgba(255,255,255,0.15) 80%, rgba(255,255,255,0.45) 100%);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }

        /* Word-by-word hero animation — rises from below, same as subtitle */
        @keyframes word-appear {
          from { opacity: 0; transform: translateY(28px); filter: blur(7px); }
          55%  { filter: blur(0); }
          to   { opacity: 1; transform: translateY(0);   filter: blur(0); }
        }
        .word-animate {
          display: inline-block;
          opacity: 0;
          margin: 0 0.04em;
          will-change: transform, opacity, filter;
          backface-visibility: hidden;
          transition: transform 0.5s cubic-bezier(0.22,1,0.36,1), text-shadow 0.4s ease;
        }
        .word-animate:hover {
          transform: translateY(-3px);
          text-shadow: 0 0 22px rgba(255,255,255,0.22);
        }

        /* Fade rise (subtitle / button) */
        @keyframes fade-rise {
          from { opacity: 0; transform: translateY(24px); filter: blur(7px); }
          55%  { filter: blur(0); }
          to   { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        .anim-1 { animation: fade-rise 1.1s cubic-bezier(0.22,1,0.36,1) 0.80s both; }
        .anim-2 { animation: fade-rise 1.1s cubic-bezier(0.22,1,0.36,1) 1.00s both; }
        .anim-3 { animation: fade-rise 1.1s cubic-bezier(0.22,1,0.36,1) 1.20s both; }

        /* Scroll arrow pulse */
        @keyframes arrowFloat {
          0%,100% { transform: translateY(0); opacity: 0.4; }
          50%      { transform: translateY(5px); opacity: 0.85; }
        }
        .arrow-float { animation: arrowFloat 2s ease-in-out infinite; }

        /* About panel */
        @keyframes panelIn {
          from { opacity: 0; transform: translateY(40px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .about-panel {
          animation: panelIn 0.45s cubic-bezier(0.16,1,0.3,1) both;
        }

        /* Nav link hover */
        .nav-link {
          background: none; border: none; cursor: pointer;
          font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 400;
          color: rgba(255,255,255,0.82); padding: 0;
          transition: color 0.2s ease;
        }
        .nav-link:hover, .nav-link.active { color: #fff; }

        @media (max-width: 640px) {
          .nav-links { display: none !important; }
          .hero-title { font-size: 52px !important; letter-spacing: -1.5px !important; }
        }
      `}</style>

      {/* ── Full-screen hero ─────────────────────────────────────────────── */}
      <section style={{ position: 'relative', width: '100%', minHeight: '100vh', overflow: 'hidden', background: '#050812' }}>

        {/* Video */}
        <video
          autoPlay loop muted playsInline
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
        >
          <source
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4"
            type="video/mp4"
          />
        </video>

        {/* Veil */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(5,8,18,0.32)', zIndex: 1 }} />

        {/* ── Nav ── */}
        <nav style={{
          position: 'relative', zIndex: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '24px 40px', maxWidth: 1280, margin: '0 auto',
        }}>
          <span style={{ fontFamily: "'Pacifico', cursive", fontSize: 28, color: '#fff', letterSpacing: '0.01em' }}>
            Campusly
          </span>

          <div className="nav-links" style={{ display: 'flex', gap: 36, alignItems: 'center' }}>
            <button className="nav-link active" style={{ color: '#fff' }}>Home</button>
            <button className="nav-link" style={{ color: '#fff' }} onClick={() => setAboutOpen(true)}>About</button>
            <button className="nav-link" style={{ color: '#fff' }} onClick={() => navigate('/join')}>Join</button>
          </div>

          <button
            onClick={() => navigate('/join')}
            className="liquid-glass"
            style={{ borderRadius: 999, padding: '10px 26px', fontSize: 14, color: '#fff', fontFamily: "'Inter', sans-serif" }}
          >
            Get started
          </button>
        </nav>

        {/* ── Hero text ── */}
        <div style={{
          position: 'relative', zIndex: 10,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', textAlign: 'center',
          padding: '0 24px 80px',
          minHeight: 'calc(100vh - 80px)',
        }}>
          <h1
            className="font-display hero-title"
            style={{
              fontSize: 'clamp(52px, 8.5vw, 100px)',
              lineHeight: 0.95,
              letterSpacing: '-2.46px',
              fontWeight: 400,
              color: '#fff',
              maxWidth: 960,
            }}
          >
            <span className="word-animate" data-delay="0"   style={{ color: '#fff' }}>Where</span>{' '}
            <span className="word-animate" data-delay="55"  style={{ color: 'rgba(255,255,255,0.4)' }}>campus</span>{' '}
            <span className="word-animate" data-delay="110" style={{ color: 'rgba(255,255,255,0.4)' }}>life</span>{' '}
            <span className="word-animate" data-delay="175" style={{ color: '#fff' }}>rises</span>
            <br />
            <span className="word-animate" data-delay="260" style={{ color: 'rgba(255,255,255,0.4)' }}>through</span>{' '}
            <span className="word-animate" data-delay="315" style={{ color: 'rgba(255,255,255,0.4)' }}>the</span>{' '}
            <span className="word-animate" data-delay="370" style={{ color: 'rgba(255,255,255,0.4)' }}>noise.</span>
          </h1>

          <p
            className="anim-1"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 'clamp(15px, 1.5vw, 18px)',
              color: 'rgba(255,255,255,0.48)',
              maxWidth: 500,
              marginTop: 28,
              lineHeight: 1.75,
              fontWeight: 400,
            }}
          >
            A social network built exclusively for verified students. Post moments, send DMs, join threads — everyone here is from your school.
          </p>

          <button
            onClick={() => navigate('/join')}
            className="liquid-glass anim-2"
            style={{ borderRadius: 999, padding: '18px 60px', fontSize: 16, color: '#fff', marginTop: 44, fontFamily: "'Inter', sans-serif" }}
          >
            Join your campus →
          </button>

        </div>

        {/* ── About overlay ── */}
        {aboutOpen && (
          <>
            {/* Backdrop */}
            <div
              onClick={() => setAboutOpen(false)}
              style={{ position: 'absolute', inset: 0, zIndex: 30, background: 'rgba(5,8,18,0.6)', backdropFilter: 'blur(2px)' }}
            />

            {/* Panel — bottom sheet style */}
            <div
              className="about-panel"
              style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 40,
                background: 'rgba(12,14,28,0.88)',
                backdropFilter: 'blur(28px)',
                WebkitBackdropFilter: 'blur(28px)',
                borderTop: '1px solid rgba(255,255,255,0.09)',
                borderRadius: '28px 28px 0 0',
                padding: '48px 60px 56px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '48px 64px',
                maxWidth: '100%',
              }}
            >
              {/* Close */}
              <button
                onClick={() => setAboutOpen(false)}
                style={{
                  position: 'absolute', top: 20, right: 28,
                  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '50%', width: 36, height: 36,
                  color: 'rgba(255,255,255,0.5)', fontSize: 18, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.13)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
              >
                ×
              </button>

              {/* Col 1 — What */}
              <div>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: 'rgba(167,139,250,0.8)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 500, marginBottom: 16 }}>
                  What is Campusly
                </p>
                <h3 className="font-display" style={{ fontSize: 28, fontWeight: 400, color: '#fff', lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: 14 }}>
                  Your campus,<br />only yours.
                </h3>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: 'rgba(255,255,255,0.42)', lineHeight: 1.8 }}>
                  Campusly is a private social network where every account is tied to a verified .edu email. No outsiders — just the real people who walk the same campus as you.
                </p>
              </div>

              {/* Col 2 — Why */}
              <div>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: 'rgba(244,114,182,0.8)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 500, marginBottom: 16 }}>
                  Why we built it
                </p>
                <h3 className="font-display" style={{ fontSize: 28, fontWeight: 400, color: '#fff', lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: 14 }}>
                  Campus life<br />shouldn't be scattered.
                </h3>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: 'rgba(255,255,255,0.42)', lineHeight: 1.8 }}>
                  Group chats, random apps, flyers on poles — campus connection was broken. We built one place: posts, DMs, threads, all verified, all yours.
                </p>
              </div>

              {/* Col 3 — Who + CTA */}
              <div>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: 'rgba(96,165,250,0.8)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 500, marginBottom: 16 }}>
                  Who's behind it
                </p>
                <h3 className="font-display" style={{ fontSize: 28, fontWeight: 400, color: '#fff', lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: 14 }}>
                  Students,<br />building for students.
                </h3>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: 'rgba(255,255,255,0.42)', lineHeight: 1.8, marginBottom: 28 }}>
                  We were frustrated by the same problem. So we built the network we wished existed — focused, private, and built around real campus life.
                </p>
                <button
                  onClick={() => navigate('/join')}
                  className="liquid-glass"
                  style={{ borderRadius: 999, padding: '11px 28px', fontSize: 14, color: '#fff', fontFamily: "'Inter', sans-serif" }}
                >
                  Join your campus →
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </>
  )
}
