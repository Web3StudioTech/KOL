import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OnchainKOL — The Social Trading Arena',
  description: 'The first KOL-powered token launchpad on Solana. Anyone launches. KOLs discover. The market decides. Creator royalties forever.',
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
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Barlow+Condensed:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('okl-theme') || 'dark';
                  document.documentElement.setAttribute('data-theme', theme);
                } catch(e) {}
              })();
            `
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
