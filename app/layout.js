export const metadata = {
  title: 'PnL Manager – SaaS Edition',
  description: 'Personal PnL calculator for SaaS products',
}

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body style={{ margin: 0, padding: 0, background: '#090c1a' }}>
        {children}
      </body>
    </html>
  )
}
