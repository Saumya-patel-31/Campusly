import { motion } from 'framer-motion'
import { useTheme } from '../../context/ThemeContext'

function FloatingPaths({ position, isDark }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
  }))

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <svg
        style={{ width: '100%', height: '100%' }}
        viewBox="0 0 696 316"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        {paths.map(path => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke={isDark ? 'white' : '#6d28d9'}
            strokeWidth={path.width}
            strokeOpacity={isDark
              ? 0.04 + path.id * 0.012
              : 0.025 + path.id * 0.006}
            initial={{ pathLength: 0.3, opacity: 0.4 }}
            animate={{
              pathLength: 1,
              opacity: [0.2, 0.5, 0.2],
              pathOffset: [0, 1, 0],
            }}
            transition={{
              duration: 20 + (path.id % 10),
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        ))}
      </svg>
    </div>
  )
}

/** Fixed fullscreen background — adapts to light / dark mode */
export function BackgroundPaths() {
  const { isDark } = useTheme()

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 0,
      pointerEvents: 'none',
      background: isDark
        ? 'linear-gradient(160deg, #020509 0%, #03080f 28%, #060c1a 55%, #04080e 80%, #020408 100%)'
        : 'linear-gradient(160deg, #f0eeff 0%, #ece8ff 30%, #f5f2ff 60%, #ede9ff 100%)',
      overflow: 'hidden',
      transition: 'background 0.4s ease',
    }}>
      {isDark ? (
        <>
          {/* Warm amber glow */}
          <div style={{
            position: 'absolute', top: '5%', right: '8%',
            width: '45%', height: '50%', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(251,191,36,0.065) 0%, rgba(217,119,6,0.03) 45%, transparent 70%)',
          }} />
          {/* Starlit blue */}
          <div style={{
            position: 'absolute', bottom: '0%', left: '0%',
            width: '55%', height: '55%', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(56,130,220,0.06) 0%, rgba(29,78,216,0.025) 50%, transparent 72%)',
          }} />
          {/* Warm center bloom */}
          <div style={{
            position: 'absolute', top: '40%', left: '35%',
            width: '35%', height: '30%', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(180,130,50,0.03) 0%, transparent 65%)',
          }} />
        </>
      ) : (
        <>
          {/* Soft violet glow top-right */}
          <div style={{
            position: 'absolute', top: '0%', right: '5%',
            width: '50%', height: '55%', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.10) 0%, rgba(109,40,217,0.04) 50%, transparent 72%)',
          }} />
          {/* Lavender bloom bottom-left */}
          <div style={{
            position: 'absolute', bottom: '0%', left: '0%',
            width: '55%', height: '50%', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(167,139,250,0.08) 0%, rgba(124,58,237,0.03) 50%, transparent 72%)',
          }} />
          {/* Subtle pink center accent */}
          <div style={{
            position: 'absolute', top: '38%', left: '32%',
            width: '38%', height: '32%', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(244,114,182,0.05) 0%, transparent 65%)',
          }} />
        </>
      )}

      <FloatingPaths position={1}  isDark={isDark} />
      <FloatingPaths position={-1} isDark={isDark} />
    </div>
  )
}
