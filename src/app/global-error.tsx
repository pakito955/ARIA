'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
          <h2>Application Error</h2>
          <p>Something went wrong critically.</p>
          <button
            onClick={() => reset()}
            style={{ padding: '8px 16px', background: '#000', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '16px' }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
