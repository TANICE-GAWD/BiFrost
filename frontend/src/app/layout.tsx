import '@mantine/core/styles.css'
import type { Metadata } from 'next'
import { ColorSchemeScript } from '@mantine/core'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'BiFrost — CE Hours Tracker',
  description: 'Track your Medicaid community engagement hours',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><ColorSchemeScript /></head>
      <body style={{ background: 'var(--mantine-color-gray-0)' }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
