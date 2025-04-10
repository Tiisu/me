import './globals.css'
import { Providers } from './providers'

export const metadata = {
  title: 'WasteVan',
  description: 'Blockchain-powered waste management platform',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
