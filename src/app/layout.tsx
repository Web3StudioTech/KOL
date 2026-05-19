import type { Metadata } from 'next'
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const sans = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['300', '400', '500', '600', '700']
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500']
})

export const metadata: Metadata = {
  title: 'OnchainKOL — Launch your influence, onchain',
  description: 'The token launchpad where KOLs discover gems and anyone can launch. Verified identity. Fair launches. Real alpha.',
  openGraph: {
    title: 'OnchainKOL',
    description: 'Launch tokens. Get called by KOLs. Let the market decide.',
    url: 'https://onchainkol.com',
    siteName: 'OnchainKOL',
    images: [{ url: 'https://onchainkol.com/og.png' }],
    locale: 'en_US',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OnchainKOL',
    description: 'Launch tokens. Get called by KOLs.',
    creator: '@onchainkol'
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
