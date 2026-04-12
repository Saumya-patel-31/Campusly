import { useRef, useState, useEffect } from 'react'

const content = [
  {
    title: 'Where campus memories live',
    description:
      'Share the moments that make college unforgettable — late-night study sessions, spontaneous campus adventures, and the friends who make it all worth it.',
    image:
      'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&h=600&fit=crop&crop=center',
  },
  {
    title: 'Study smarter, together',
    description:
      'Find your study crew. Post about group sessions, share notes, ask questions — your campus is full of people working toward the same goals.',
    image:
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=600&fit=crop&crop=center',
  },
  {
    title: 'Only verified .edu students',
    description:
      'Every person you meet here is a real, verified student at your school. No bots, no randos — just your actual campus community.',
    image:
      'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&h=600&fit=crop&crop=top',
  },
  {
    title: 'Catch every campus moment',
    description:
      'From lecture hall laughs to quad hangs, graduation to orientation — document the full four years in one place built just for students.',
    image:
      'https://images.unsplash.com/photo-1627556704302-624286467c65?w=800&h=600&fit=crop&crop=center',
  },
]

export function StickyScrollGallery() {
  const containerRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const items = container.querySelectorAll('.scroll-item')

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const idx = parseInt(entry.target.dataset.index, 10)
            setActiveIndex(idx)
          }
        })
      },
      { threshold: 0.55 }
    )

    items.forEach(item => observer.observe(item))
    return () => observer.disconnect()
  }, [])

  return (
    <div style={{ padding: '0 0 80px', maxWidth: 1100, margin: '0 auto', width: '100%' }}>
      {/* Section heading */}
      <div style={{ textAlign: 'center', padding: '80px 24px 60px' }}>
        <p style={{ fontSize: 11, color: 'var(--campus)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 14 }}>
          Campus life
        </p>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(32px, 5vw, 58px)', lineHeight: 1.05, letterSpacing: '-0.04em' }}>
          Unfiltered.{' '}
          <span className="gradient-text-anim">Unmissable.</span>
        </h2>
      </div>

      {/* Sticky scroll layout */}
      <div
        ref={containerRef}
        style={{ display: 'flex', gap: 0, alignItems: 'flex-start', padding: '0 24px' }}
      >
        {/* Left: sticky image */}
        <div
          style={{
            flex: '0 0 48%',
            position: 'sticky',
            top: 100,
            height: 480,
            borderRadius: 24,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.09)',
          }}
        >
          {content.map((item, i) => (
            <img
              key={i}
              src={item.image}
              alt={item.title}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                opacity: activeIndex === i ? 1 : 0,
              }}
            />
          ))}
          {/* Subtle overlay */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(7,7,16,0.5) 0%, transparent 50%)', pointerEvents: 'none' }} />
          {/* Dot indicators */}
          <div style={{ position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
            {content.map((_, i) => (
              <div
                key={i}
                style={{
                  width: activeIndex === i ? 20 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: activeIndex === i ? 'var(--campus)' : 'rgba(255,255,255,0.3)',
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>
        </div>

        {/* Right: scrollable text blocks */}
        <div style={{ flex: '0 0 52%', paddingLeft: 64 }}>
          {content.map((item, i) => (
            <div
              key={i}
              data-index={i}
              className="scroll-item"
              style={{
                height: 400,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '0 12px',
                opacity: activeIndex === i ? 1 : 0.28,
                transform: activeIndex === i ? 'translateY(0)' : 'translateY(12px)',
                transition: 'opacity 0.5s ease, transform 0.5s ease',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'var(--campus-dim)',
                  border: '1px solid var(--campus-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--campus)',
                  fontFamily: 'var(--font-display)',
                  marginBottom: 20,
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </div>
              <h3
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 'clamp(20px, 2.5vw, 28px)',
                  lineHeight: 1.2,
                  letterSpacing: '-0.03em',
                  marginBottom: 14,
                }}
              >
                {item.title}
              </h3>
              <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.75, maxWidth: 380 }}>
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
