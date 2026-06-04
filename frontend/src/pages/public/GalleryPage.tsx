import { PageShell } from '../../components/layout/PageShell';

export function GalleryPage() {
  // In Phase 6/7 we will fetch real gallery albums from the API
  const albums: any[] = []; 

  return (
    <PageShell
      title="Trust Gallery"
      description="Glimpses of our community celebrations and social initiatives."
    >
      <section className="section">
        <div className="container">
          {albums.length > 0 ? (
            <div className="grid grid-3">
              {/* Album cards will go here */}
            </div>
          ) : (
            <div className="card text-center" style={{ padding: '60px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🖼️</div>
              <h3>Gallery Coming Soon</h3>
              <p>We are currently organizing our archives. Photos of recent events will be posted here shortly.</p>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
