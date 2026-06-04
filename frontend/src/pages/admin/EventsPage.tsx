import { useState } from 'react';
import {
  useAdminEvents,
  useAdminCreateEvent,
  useAdminUpdateEvent,
  useAdminDeleteEvent,
} from '../../hooks/useAdminQueries';
import { DataTable } from '../../components/admin/DataTable';

export function EventsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [location, setLocation] = useState('');
  const [eventStatus, setEventStatus] = useState<'draft' | 'published' | 'archived'>('draft');

  const { data: eventsData, isLoading, refetch } = useAdminEvents({
    page,
    page_size: 10,
    search: search || undefined,
    status: statusFilter || undefined,
  });

  const createMutation = useAdminCreateEvent();
  const updateMutation = useAdminUpdateEvent(editingEvent?.id ?? '');
  const deleteMutation = useAdminDeleteEvent();

  const events = eventsData?.data?.items ?? [];
  const pagination = eventsData?.meta?.pagination;
  const totalPages = pagination?.total_pages ?? 0;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    refetch();
  };

  const openAdd = () => {
    setEditingEvent(null);
    setTitle('');
    setSlug('');
    setDescription('');
    setEventDate('');
    setLocation('');
    setEventStatus('draft');
    setShowModal(true);
  };

  const openEdit = (ev: any) => {
    setEditingEvent(ev);
    setTitle(ev.title);
    setSlug(ev.slug);
    setDescription(ev.description || '');
    setEventDate(ev.event_date ? new Date(ev.event_date).toISOString().substring(0, 16) : '');
    setLocation(ev.location || '');
    setEventStatus(ev.status);
    setShowModal(true);
  };

  const handleSlugAuto = (val: string) => {
    setTitle(val);
    if (!editingEvent) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title,
        slug,
        description,
        event_date: eventDate || null,
        location: location || null,
        status: eventStatus,
      };

      if (editingEvent) {
        await updateMutation.mutateAsync(payload);
        alert('Event updated successfully!');
      } else {
        await createMutation.mutateAsync(payload);
        alert('Event created successfully!');
      }
      setShowModal(false);
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to save event');
    }
  };

  const handleDelete = async (evId: string) => {
    const reason = prompt('Please enter a reason for deleting this event:');
    if (!reason) return;

    try {
      await deleteMutation.mutateAsync({ eventId: evId, reason });
      alert('Event deleted successfully.');
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to delete event');
    }
  };

  const columns = [
    { key: 'title', header: 'Event Title', render: (row: any) => <strong style={{ color: 'var(--color-primary)' }}>{row.title}</strong> },
    { key: 'slug', header: 'URL Slug' },
    {
      key: 'event_date',
      header: 'Event Date',
      render: (row: any) => (row.event_date ? new Date(row.event_date).toLocaleString() : '-'),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => <span className={`status-badge ${row.status}`}>{row.status}</span>,
    },
    {
      key: 'actions',
      header: 'Action',
      render: (row: any) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="button button-outline" style={{ minHeight: 'auto', padding: '4px 10px', fontSize: '0.85rem' }} onClick={() => openEdit(row)}>
            Edit
          </button>
          <button className="button button-outline" style={{ minHeight: 'auto', padding: '4px 10px', fontSize: '0.85rem', color: 'var(--color-error)', borderColor: 'var(--color-border)' }} onClick={() => handleDelete(row.id)}>
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="member-header-section">
        <div>
          <h1 className="member-title">📅 Events Management</h1>
          <p className="member-subtitle">Schedule, draft, and publish events for the public homepage noticeboard.</p>
        </div>
        <div>
          <button className="button button-primary" onClick={openAdd}>
            ➕ Add New Event
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px', padding: '20px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by event title, location, or slug..."
            style={{ flex: 1, minWidth: '250px' }}
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{ width: '180px' }}
          >
            <option value="">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
          <button type="submit" className="button button-primary" style={{ minHeight: 'auto' }}>
            Filter
          </button>
        </form>
      </div>

      <DataTable
        columns={columns}
        data={events}
        isLoading={isLoading}
        emptyMessage="No events found matching your filter options."
        emptyIcon="📅"
        pagination={{
          page,
          totalPages,
          totalItems: pagination?.total_items,
          onPageChange: setPage,
        }}
      />

      {/* Add/Edit Modal overlay */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div className="card" style={{ maxWidth: '600px', width: '90%', padding: '24px', maxHeight: '95vh', overflowY: 'auto' }}>
            <h3>{editingEvent ? '✏️ Edit Event' : '📅 Create Samaj Event'}</h3>
            <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
              <div className="form-group">
                <label>Event Title *</label>
                <input type="text" value={title} onChange={(e) => handleSlugAuto(e.target.value)} required placeholder="e.g. Annual Samaj Sneh Milan" />
              </div>

              <div className="form-group">
                <label>Slug (URL Identifier) *</label>
                <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} required placeholder="e.g. annual-samaj-sneh-milan" />
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={4} placeholder="Full event details and timings..." />
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label>Event Date & Time</label>
                  <input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Location / Venue</label>
                  <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Community Hall, Ahmedabad" />
                </div>
              </div>

              <div className="form-group">
                <label>Publication Status *</label>
                <select value={eventStatus} onChange={(e: any) => setEventStatus(e.target.value)}>
                  <option value="draft">Draft (Hidden from Public)</option>
                  <option value="published">Published (Visible on site)</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="submit" className="button button-primary" style={{ flex: 1 }}>
                  {editingEvent ? 'Save Changes' : 'Publish / Create'}
                </button>
                <button type="button" className="button button-outline" style={{ flex: 1 }} onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
