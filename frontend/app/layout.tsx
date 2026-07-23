import type { Metadata } from 'next'
import '@fontsource/playfair-display/400.css'
import '@fontsource/playfair-display/600.css'
import '@fontsource/playfair-display/700.css'
import '@fontsource/playfair-display/900.css'
import '@fontsource/cinzel/400.css'
import '@fontsource/cinzel/500.css'
import '@fontsource/cinzel/600.css'
import '@fontsource/cinzel/700.css'
import '@fontsource/dm-sans/300.css'
import '@fontsource/dm-sans/400.css'
import '@fontsource/dm-sans/500.css'
import '@fontsource/dm-sans/600.css'
import './globals.css'
import { Toaster } from 'react-hot-toast'

// Fonts are bundled locally via @fontsource instead of next/font/google.
// next/font/google fetches font CSS from Google's servers AT BUILD TIME —
// if that network call ever fails (offline CI runner, restricted network,
// a Google Fonts outage) the entire production build fails outright.
// Self-hosting removes that external dependency completely: the font
// files ship inside node_modules and get bundled by webpack like any
// other asset, so the build (and the site) never depends on Google's
// servers being reachable.


export const metadata: Metadata = {
  title: { default: 'Attar Bazaar — Luxury Perfume Marketplace', template: '%s | Attar Bazaar' },
  description: "Pakistan's most trusted P2P perfume marketplace.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#06040E] text-[#F5F0E8] antialiased">
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#17152E', color: '#F5F0E8', border: '1px solid rgba(201,168,76,0.3)', fontFamily: 'DM Sans, sans-serif', fontSize: '14px' },
            success: { iconTheme: { primary: '#C9A84C', secondary: '#06040E' } },
            error: { iconTheme: { primary: '#ff4444', secondary: '#fff' } },
          }}
        />
        {children}
      </body>
    </html>
  )
}
