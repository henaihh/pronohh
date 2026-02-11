import './globals.css'

export const metadata = {
  title: 'PronoHH - Rio de la Plata Wind & Weather',
  description: 'Real-time forecast for sailors in Rio de la Plata',
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="bg-black text-white">{children}</body>
    </html>
  )
}
