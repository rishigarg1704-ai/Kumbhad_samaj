import { PageShell } from '../../components/layout/PageShell';

export function EventsPage() {
  // In Phase 6/7 we will fetch real events from the API
  const events: any[] = []; 

  return (
    <PageShell
      title="Community Events"
      description="Stay updated with upcoming festivals, medical camps, and community gatherings."
    >
      <section className="section">
        <div className="container">
          {events.length > 0 ? (
            <div className="grid grid-3">
              {/* Event cards will go here */}
            </div>
          ) : (
            <div className="card text-center" style={{ padding: '60px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '20px' }}>📅</div>
              <h3>No Upcoming Events</h3>
              <p>Check back soon for upcoming community gatherings and celebrations.</p>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
