import { Suspense, lazy } from 'react'

const Spline = lazy(() => import('@splinetool/react-spline'))

export function SplineScene({ scene, className, style }) {
  return (
    <Suspense
      fallback={
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spinner" />
        </div>
      }
    >
      <Spline
        scene={scene}
        className={className}
        style={{ width: '100%', height: '100%', ...style }}
      />
    </Suspense>
  )
}
