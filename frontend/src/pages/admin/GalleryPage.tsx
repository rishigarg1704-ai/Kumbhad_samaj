import { useState } from 'react';
import {
  useAdminAlbums,
  useAdminCreateAlbum,
  useAdminUpdateAlbum,
  useAdminDeleteAlbum,
  useAdminAlbumPhotos,
  useAdminUploadPhoto,
  useAdminDeletePhoto,
} from '../../hooks/useAdminQueries';
import { DataTable } from '../../components/admin/DataTable';

export function GalleryPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);

  const [showAlbumModal, setShowAlbumModal] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<any>(null);

  const [albumTitle, setAlbumTitle] = useState('');
  const [albumSlug, setAlbumSlug] = useState('');
  const [albumDesc, setAlbumDesc] = useState('');
  const [albumStatus, setAlbumStatus] = useState<'draft' | 'published' | 'archived'>('draft');

  // Photo uploads
  const [photoTitle, setPhotoTitle] = useState('');
  const [sortOrder, setSortOrder] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: albumsData, isLoading: loadingAlbums, refetch: refetchAlbums } = useAdminAlbums({
    page,
    page_size: 10,
    search: search || undefined,
  });

  const { data: photosData, isLoading: loadingPhotos, refetch: refetchPhotos } = useAdminAlbumPhotos(selectedAlbumId || '');

  const createAlbumMutation = useAdminCreateAlbum();
  const updateAlbumMutation = useAdminUpdateAlbum(editingAlbum?.id ?? '');
  const deleteAlbumMutation = useAdminDeleteAlbum();

  const uploadPhotoMutation = useAdminUploadPhoto(selectedAlbumId || '');
  const deletePhotoMutation = useAdminDeletePhoto(selectedAlbumId || '');

  const albums = albumsData?.data?.items ?? [];
  const pagination = albumsData?.meta?.pagination;
  const totalPages = pagination?.total_pages ?? 0;

  const photos = photosData?.data?.photos ?? [];
  const currentAlbum = photosData?.data;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    refetchAlbums();
  };

  const openAlbumAdd = () => {
    setEditingAlbum(null);
    setAlbumTitle('');
    setAlbumSlug('');
    setAlbumDesc('');
    setAlbumStatus('draft');
    setShowAlbumModal(true);
  };

  const openAlbumEdit = (al: any) => {
    setEditingAlbum(al);
    setAlbumTitle(al.title);
    setAlbumSlug(al.slug);
    setAlbumDesc(al.description || '');
    setAlbumStatus(al.status);
    setShowAlbumModal(true);
  };

  const handleAlbumSlugAuto = (val: string) => {
    setAlbumTitle(val);
    if (!editingAlbum) {
      setAlbumSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
      );
    }
  };

  const handleSubmitAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title: albumTitle,
        slug: albumSlug,
        description: albumDesc || undefined,
        status: albumStatus,
      };

      if (editingAlbum) {
        await updateAlbumMutation.mutateAsync(payload);
        alert('Album updated successfully!');
      } else {
        await createAlbumMutation.mutateAsync(payload);
        alert('Album created successfully!');
      }
      setShowAlbumModal(false);
      refetchAlbums();
    } catch (err: any) {
      alert(err.message || 'Failed to save album');
    }
  };

  const handleDeleteAlbum = async (alId: string) => {
    const reason = prompt('Please enter a reason for deleting this album:');
    if (!reason) return;

    try {
      await deleteAlbumMutation.mutateAsync({ albumId: alId, reason });
      alert('Album deleted successfully.');
      refetchAlbums();
    } catch (err: any) {
      alert(err.message || 'Failed to delete album');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds the 5MB limit.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handlePhotoUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (photoTitle) {
        formData.append('title', photoTitle);
      }
      formData.append('sort_order', String(sortOrder));

      await uploadPhotoMutation.mutateAsync(formData);
      alert('Photo uploaded successfully!');
      // Reset form
      setPhotoTitle('');
      setSortOrder(1);
      setSelectedFile(null);
      // Reset input element
      const fileInput = document.getElementById('photo-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      refetchPhotos();
      refetchAlbums();
    } catch (err: any) {
      alert(err.message || 'Failed to upload photo');
    }
  };

  const handleDeletePhoto = async (phId: string) => {
    const reason = prompt('Please enter a reason for deleting this photo:');
    if (!reason) return;

    try {
      await deletePhotoMutation.mutateAsync({ photoId: phId, reason });
      alert('Photo removed.');
      refetchPhotos();
      refetchAlbums();
    } catch (err: any) {
      alert(err.message || 'Failed to delete photo');
    }
  };

  const albumColumns = [
    { key: 'title', header: 'Album Title', render: (row: any) => <strong style={{ color: 'var(--color-primary)' }}>{row.title}</strong> },
    { key: 'slug', header: 'Slug' },
    { key: 'photo_count', header: 'Photos Count', render: (row: any) => `${row.photo_count} photos` },
    { key: 'status', header: 'Status', render: (row: any) => <span className={`status-badge ${row.status}`}>{row.status}</span> },
    {
      key: 'actions',
      header: 'Action',
      render: (row: any) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="button button-outline" style={{ minHeight: 'auto', padding: '4px 10px', fontSize: '0.85rem' }} onClick={() => setSelectedAlbumId(row.id)}>
            📁 Manage Photos
          </button>
          <button className="button button-outline" style={{ minHeight: 'auto', padding: '4px 8px', fontSize: '0.85rem' }} onClick={() => openAlbumEdit(row)}>
            ✏️
          </button>
          <button className="button button-outline" style={{ minHeight: 'auto', padding: '4px 8px', fontSize: '0.85rem', color: 'var(--color-error)', borderColor: 'var(--color-border)' }} onClick={() => handleDeleteAlbum(row.id)}>
            🗑️
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      {selectedAlbumId ? (
        // Inner View: Manage Album Photos
        <div>
          <div className="member-header-section">
            <div>
              <h1 className="member-title">📁 Album: {currentAlbum?.title ?? 'Loading...'}</h1>
              <p className="member-subtitle">Upload images and organize visual content for this album.</p>
            </div>
            <div>
              <button className="button button-outline" onClick={() => setSelectedAlbumId(null)}>
                Back to Albums
              </button>
            </div>
          </div>

          <div className="grid grid-3">
            {/* Left: Upload Column */}
            <div className="card" style={{ padding: '24px', gridColumn: 'span 1' }}>
              <h3>Upload Photo</h3>
              <form onSubmit={handlePhotoUploadSubmit} style={{ marginTop: '20px' }}>
                <div className="form-group">
                  <label>Photo Title (Optional)</label>
                  <input type="text" value={photoTitle} onChange={(e) => setPhotoTitle(e.target.value)} placeholder="e.g. Stage Event Group Photo" />
                </div>
                <div className="form-group">
                  <label>Sort Order</label>
                  <input type="number" min="1" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value))} />
                </div>
                <div className="form-group">
                  <label>Select Image File (Max 5MB) *</label>
                  <input type="file" id="photo-file-input" accept="image/*" onChange={handleFileChange} required />
                </div>
                <button type="submit" className="button button-primary" style={{ width: '100%', marginTop: '20px' }} disabled={uploadPhotoMutation.isPending || !selectedFile}>
                  {uploadPhotoMutation.isPending ? 'Uploading...' : 'Upload Image File'}
                </button>
              </form>
            </div>

            {/* Right: Album photos grid list */}
            <div className="card" style={{ padding: '24px', gridColumn: 'span 2' }}>
              <h3>Photos inside Album</h3>
              {loadingPhotos ? (
                <div>Loading album photos...</div>
              ) : photos.length === 0 ? (
                <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '40px 0' }}>This album is currently empty. Upload photos on the left!</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', marginTop: '20px' }}>
                  {photos.map((ph: any) => (
                    <div key={ph.id} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', overflow: 'hidden', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
                      <img src={`http://localhost:8000${ph.public_url}`} alt={ph.title || 'Samaj Photo'} style={{ height: '120px', width: '100%', objectFit: 'cover' }} />
                      <div style={{ padding: '8px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {ph.title || 'Untitled'}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Order: {ph.sort_order}</span>
                          <button
                            className="button button-outline"
                            style={{ minHeight: 'auto', padding: '2px 6px', fontSize: '0.75rem', color: 'var(--color-error)', borderColor: 'var(--color-border)' }}
                            onClick={() => handleDeletePhoto(ph.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        // Outer View: Manage Gallery Albums
        <div>
          <div className="member-header-section">
            <div>
              <h1 className="member-title">🖼️ Gallery Albums</h1>
              <p className="member-subtitle">Organize and publish samaj celebration albums, gatherings, and visual records.</p>
            </div>
            <div>
              <button className="button button-primary" onClick={openAlbumAdd}>
                ➕ Create Album
              </button>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '24px', padding: '20px' }}>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '16px' }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search albums by title or slug description..."
                style={{ flex: 1 }}
              />
              <button type="submit" className="button button-primary" style={{ minHeight: 'auto' }}>
                Search
              </button>
            </form>
          </div>

          <DataTable
            columns={albumColumns}
            data={albums}
            isLoading={loadingAlbums}
            emptyMessage="No gallery albums found. Click Create Album above to make one."
            emptyIcon="🖼️"
            pagination={{
              page,
              totalPages,
              totalItems: pagination?.total_items,
              onPageChange: setPage,
            }}
          />
        </div>
      )}

      {/* Album Add/Edit Modal */}
      {showAlbumModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div className="card" style={{ maxWidth: '500px', width: '90%', padding: '24px' }}>
            <h3>{editingAlbum ? '✏️ Edit Album Metadata' : '🖼️ Create Gallery Album'}</h3>
            <form onSubmit={handleSubmitAlbum} style={{ marginTop: '20px' }}>
              <div className="form-group">
                <label>Album Title *</label>
                <input type="text" value={albumTitle} onChange={(e) => handleAlbumSlugAuto(e.target.value)} required placeholder="e.g. Sneh Milan 2026 Celebration" />
              </div>
              <div className="form-group">
                <label>Album Slug *</label>
                <input type="text" value={albumSlug} onChange={(e) => setAlbumSlug(e.target.value)} required placeholder="e.g. sneh-milan-2026" />
              </div>
              <div className="form-group">
                <label>Album Description</label>
                <textarea value={albumDesc} onChange={(e) => setAlbumDesc(e.target.value)} rows={3} placeholder="Provide description..." />
              </div>
              <div className="form-group">
                <label>Publication Status *</label>
                <select value={albumStatus} onChange={(e: any) => setAlbumStatus(e.target.value)}>
                  <option value="draft">Draft (Hidden from Public)</option>
                  <option value="published">Published (Visible in gallery)</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="submit" className="button button-primary" style={{ flex: 1 }}>
                  {editingAlbum ? 'Save Changes' : 'Create Album'}
                </button>
                <button type="button" className="button button-outline" style={{ flex: 1 }} onClick={() => setShowAlbumModal(false)}>
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
