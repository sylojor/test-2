export default function NotFound() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: '2rem' }}>
      <h1 style={{ fontSize: '4rem', fontWeight: 'bold', marginBottom: '1rem' }}>404</h1>
      <p style={{ fontSize: '1.25rem', marginBottom: '2rem', opacity: 0.7 }}>Page not found</p>
      <a href="/ar" style={{ padding: '0.75rem 2rem', borderRadius: '0.5rem', backgroundColor: '#0d9488', color: 'white', textDecoration: 'none', fontSize: '1rem' }}>
        Go Home
      </a>
    </div>
  )
}
