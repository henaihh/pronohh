import './globals.css'

export const metadata = {
  title: 'PronoHH - Rio de la Plata Wind & Weather',
  description: 'Real-time forecast for sailors in Rio de la Plata',
  viewport: 'width=device-width, initial-scale=1',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌬️</text></svg>",
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="bg-black text-white">{children}</body>
    </html>
  )
}
