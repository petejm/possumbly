import { useState } from 'react';
import { GalleryMeme, memes, templates } from '../lib/api';
import VoteButtons from './VoteButtons';

interface MemeCardProps {
  meme: GalleryMeme;
  onVoteChange?: (memeId: string, upvotes: number, downvotes: number, score: number) => void;
  onClick?: () => void;
}

export default function MemeCard({ meme, onVoteChange, onClick }: MemeCardProps) {
  const [imageError, setImageError] = useState(false);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return diffMins <= 1 ? 'just now' : `${diffMins}m ago`;
    }
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }
    if (diffDays < 7) {
      return `${diffDays}d ago`;
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const handleVoteChange = (upvotes: number, downvotes: number, score: number) => {
    onVoteChange?.(meme.id, upvotes, downvotes, score);
  };

  const imageUrl = meme.output_filename
    ? memes.imageUrl(meme.output_filename)
    : meme.template_filename
      ? templates.imageUrl(meme.template_filename)
      : null;

  return (
    <div className="card p-4 group">
      <div
        className="aspect-square bg-themed-tertiary rounded-lg mb-3 overflow-hidden cursor-pointer relative"
        onClick={onClick}
      >
        {imageUrl && !imageError ? (
          <>
            {/* Blurred background to fill gaps */}
            <img
              src={imageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover blur-xl scale-110 opacity-50"
              aria-hidden="true"
            />
            {/* Main image */}
            <img
              src={imageUrl}
              alt={meme.template_name || 'Meme'}
              className="relative w-full h-full object-contain group-hover:scale-105 transition-transform"
              onError={() => setImageError(true)}
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-themed-muted">
            No preview
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-themed-secondary truncate">
            {meme.template_name || 'Untitled'}
          </p>
          <p className="text-xs text-themed-muted">{formatDate(meme.created_at)}</p>
        </div>
      </div>

      {/* Creator info */}
      {(meme.creator_name || meme.creator_avatar) && (
        <div className="flex items-center gap-2 mb-3">
          {meme.creator_avatar ? (
            <img
              src={meme.creator_avatar}
              alt=""
              className="w-5 h-5 rounded-full"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-themed-accent/20 flex items-center justify-center text-xs text-themed-secondary">
              {(meme.creator_name || '?')[0].toUpperCase()}
            </div>
          )}
          <span className="text-xs text-themed-muted truncate">
            {meme.creator_name || 'Anonymous'}
          </span>
        </div>
      )}

      {/* Vote buttons */}
      <div className="flex justify-center">
        <VoteButtons
          memeId={meme.id}
          initialUpvotes={meme.upvotes}
          initialDownvotes={meme.downvotes}
          initialUserVote={meme.userVote}
          onVoteChange={handleVoteChange}
          compact
        />
      </div>
    </div>
  );
}
