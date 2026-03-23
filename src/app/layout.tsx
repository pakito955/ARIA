import type { Metadata, Viewport } from 'next'
import { Outfit, Inter, JetBrains_Mono } from 'next/font/google'
import { Providers } from '@/components/Providers'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-outfit',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ARIA · AI Executive Assistant',
  description: 'AI layer above your email. ARIA reads, understands, and organizes your communication.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'ARIA' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0B0B0F' },
    { media: '(prefers-color-scheme: light)', color: '#f5f5f7' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // dark class set server-side; ThemeProvider updates it on client
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${outfit.variable} ${inter.variable} ${jetbrainsMono.variable} font-inter antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
