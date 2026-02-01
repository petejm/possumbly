import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { memes, templates, Meme } from '../lib/api';

export default function MyMemes() {
  const navigate = useNavigate();
  const [memeList, setMemeList] = useState<Meme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMemes();
  }, []);

  const loadMemes = async () => {
    try {
      const data = await memes.list();
      setMemeList(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load memes');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this meme?')) return;

    try {
      await memes.delete(id);
      setMemeList((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete meme');
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div
          className="animate-spin rounded-full h-12 w-12 border-4 border-themed"
          style={{ borderTopColor: 'var(--color-bg-accent)' }}
        ></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-themed-primary mb-8">My Memes</h1>

      {error && (
        <div
          className="px-4 py-3 rounded-lg mb-6 border"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderColor: 'var(--color-error)',
            color: 'var(--color-error)',
          }}
        >
          {error}
          <button onClick={() => setError('')} className="float-right font-bold">
            &times;
          </button>
        </div>
      )}

      {memeList.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-themed-muted text-lg mb-4">You haven't created any memes yet</p>
          <button onClick={() => navigate('/')} className="btn btn-primary">
            Browse templates
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {memeList.map((meme) => (
            <div key={meme.id} className="card p-4 group relative">
              <div
                className="aspect-square bg-themed-tertiary rounded-lg mb-3 overflow-hidden cursor-pointer"
                onClick={() => navigate(`/editor/${meme.template_id}/${meme.id}`)}
              >
                {meme.output_filename ? (
                  <img
                    src={memes.imageUrl(meme.output_filename)}
                    alt="Meme"
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                  />
                ) : meme.template_filename ? (
                  <img
                    src={templates.imageUrl(meme.template_filename)}
                    alt="Template"
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-themed-muted">
                    No preview
                  </div>
                )}
              </div>
              <p className="text-sm text-themed-secondary truncate">
                {meme.template_name || 'Untitled'}
              </p>
              <p className="text-xs text-themed-muted">{formatDate(meme.created_at)}</p>
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => navigate(`/editor/${meme.template_id}/${meme.id}`)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                  style={{ backgroundColor: 'var(--color-bg-accent)' }}
                  title="Edit meme"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(meme.id)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                  style={{ backgroundColor: 'var(--color-error)' }}
                  title="Delete meme"
                >
                  &times;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
