import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OnchainKOL — KOL-Powered Token Launchpad on Robinhood Chain',
  description: 'Launch tokens on Robinhood Chain. KOLs discover and call them. Creator royalties forever.',
  openGraph: {
    title: 'OnchainKOL',
    description: 'Launch tokens. Get called by KOLs. Earn together.',
    url: 'https://onchainkol.com',
    siteName: 'OnchainKOL',
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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600;700&family=Barlow+Condensed:wght@400;600;700&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('okl-theme')||'dark';document.documentElement.setAttribute('data-theme',t)}catch(e){}})()` }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
