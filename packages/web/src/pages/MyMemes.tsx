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

  const handleTogglePublic = async (id: string, currentlyPublic: boolean) => {
    try {
      const updated = await memes.setVisibility(id, !currentlyPublic);
      setMemeList((prev) =>
        prev.map((m) => (m.id === id ? { ...m, is_public: updated.is_public } : m))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update visibility');
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

              {/* Public toggle and vote counts */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-themed">
                <button
                  onClick={() => handleTogglePublic(meme.id, !!meme.is_public)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
                    meme.is_public
                      ? 'bg-green-500/20 text-green-600'
                      : 'bg-themed-secondary text-themed-muted hover:text-themed-secondary'
                  }`}
                  title={meme.is_public ? 'Make private' : 'Make public'}
                >
                  {meme.is_public ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                      Public
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                        <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                      </svg>
                      Private
                    </>
                  )}
                </button>

                {meme.is_public && (
                  <div className="flex items-center gap-1 text-xs text-themed-muted">
                    <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>{meme.upvotes || 0}</span>
                    <svg className="w-3.5 h-3.5 text-red-500 ml-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>{meme.downvotes || 0}</span>
                  </div>
                )}
              </div>

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
