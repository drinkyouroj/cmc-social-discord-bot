export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
          {children}
        </div>
      </body>
    </html>
  );
}

