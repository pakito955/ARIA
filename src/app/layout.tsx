import type { Metadata } from 'next'
import { Cormorant_Garamond, Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import { Providers } from '@/components/Providers'
import './globals.css'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '600'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-space',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['300', '400'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'ARIA · AI Executive Assistant',
  description: 'AI layer above your email. ARIA reads, understands, and organizes your communication.',
  keywords: ['AI', 'email', 'executive assistant', 'Gmail', 'Outlook'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${cormorant.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} font-space bg-[#080810] text-[#eeeef5] antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
