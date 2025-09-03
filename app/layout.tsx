import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ARTI Ed - Intelligent Educational Platform',
  description: 'An intelligent educational platform powered by AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="no">
      <body>{children}</body>
    </html>
  )
}