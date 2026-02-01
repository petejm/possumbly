import { useState, useEffect, useCallback } from 'react';
import { gallery, GalleryMeme, GalleryResponse, memes } from '../lib/api';
import MemeCard from '../components/MemeCard';

type Period = '7d' | '30d' | 'year' | 'all';
type Sort = 'hot' | 'top' | 'new';

const PERIOD_LABELS: Record<Period, string> = {
  '7d': '7 Days',
  '30d': '30 Days',
  year: 'Year',
  all: 'All Time',
};

const SORT_LABELS: Record<Sort, string> = {
  hot: 'Hot',
  top: 'Top',
  new: 'New',
};

export default function Gallery() {
  const [memeList, setMemeList] = useState<GalleryMeme[]>([]);
  const [pagination, setPagination] = useState<GalleryResponse['pagination'] | null>(null);
  const [period, setPeriod] = useState<Period>('all');
  const [sort, setSort] = useState<Sort>('hot');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMeme, setSelectedMeme] = useState<GalleryMeme | null>(null);

  const loadGallery = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const response = await gallery.list({ period, sort, page, limit: 20 });
      setMemeList(response.memes);
      setPagination(response.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load gallery');
    } finally {
      setLoading(false);
    }
  }, [period, sort]);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  const handleVoteChange = (memeId: string, upvotes: number, downvotes: number, score: number) => {
    setMemeList((prev) =>
      prev.map((m) => (m.id === memeId ? { ...m, upvotes, downvotes, score } : m))
    );
    if (selectedMeme?.id === memeId) {
      setSelectedMeme((prev) => prev ? { ...prev, upvotes, downvotes, score } : null);
    }
  };

  const handlePageChange = (newPage: number) => {
    loadGallery(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-themed-primary mb-6">Gallery</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Period filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-themed-muted">Period:</span>
          <div className="flex rounded-lg overflow-hidden border border-themed">
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  period === p
                    ? 'bg-themed-accent text-themed-inverse'
                    : 'bg-themed-secondary text-themed-secondary hover:bg-themed-tertiary'
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Sort filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-themed-muted">Sort:</span>
          <div className="flex rounded-lg overflow-hidden border border-themed">
            {(Object.keys(SORT_LABELS) as Sort[]).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  sort === s
                    ? 'bg-themed-accent text-themed-inverse'
                    : 'bg-themed-secondary text-themed-secondary hover:bg-themed-tertiary'
                }`}
              >
                {SORT_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      </div>

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

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div
            className="animate-spin rounded-full h-12 w-12 border-4 border-themed"
            style={{ borderTopColor: 'var(--color-bg-accent)' }}
          ></div>
        </div>
      ) : memeList.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-themed-muted text-lg">No public memes yet</p>
          <p className="text-themed-muted text-sm mt-2">
            Be the first to share a meme with the community!
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {memeList.map((meme) => (
              <MemeCard
                key={meme.id}
                meme={meme}
                onVoteChange={handleVoteChange}
                onClick={() => setSelectedMeme(meme)}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!pagination.hasPrev}
                className="px-4 py-2 rounded-lg bg-themed-secondary text-themed-secondary border border-themed hover:bg-themed-tertiary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-themed-muted">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.hasNext}
                className="px-4 py-2 rounded-lg bg-themed-secondary text-themed-secondary border border-themed hover:bg-themed-tertiary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Meme detail modal */}
      {selectedMeme && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedMeme(null)}
        >
          <div
            className="bg-themed-primary rounded-xl max-w-3xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-themed flex items-center justify-between">
              <h2 className="text-xl font-semibold text-themed-primary">
                {selectedMeme.template_name || 'Meme'}
              </h2>
              <button
                onClick={() => setSelectedMeme(null)}
                className="text-themed-muted hover:text-themed-primary text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-4">
              {selectedMeme.output_filename && (
                <img
                  src={memes.imageUrl(selectedMeme.output_filename)}
                  alt={selectedMeme.template_name || 'Meme'}
                  className="w-full h-auto rounded-lg mb-4"
                />
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {selectedMeme.creator_avatar ? (
                    <img
                      src={selectedMeme.creator_avatar}
                      alt=""
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-themed-accent/20 flex items-center justify-center text-sm text-themed-secondary">
                      {(selectedMeme.creator_name || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm text-themed-secondary">
                    {selectedMeme.creator_name || 'Anonymous'}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-themed-muted">
                    {new Date(selectedMeme.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
