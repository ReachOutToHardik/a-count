// Shown instantly on navigation while the page's DB queries run (applies to every route).
function Bar({ width, height = 14 }: { width: string | number; height?: number }) {
  return <div className="skeleton" style={{ width, height }} />
}

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div style={{ marginBottom: 24 }}>
        <Bar width={220} height={24} />
        <div style={{ height: 8 }} />
        <Bar width={320} />
      </div>

      <div className="skeleton-grid">
        {[0, 1, 2].map(i => (
          <div key={i} className="card">
            <Bar width="40%" height={12} />
            <div style={{ height: 12 }} />
            <Bar width="70%" height={22} />
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '12px 0' }}>
            <Bar width="55%" />
            <Bar width={80} />
          </div>
        ))}
      </div>
    </div>
  )
}
