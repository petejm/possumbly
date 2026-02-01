import { useState } from 'react';
import { votes } from '../lib/api';

interface VoteButtonsProps {
  memeId: string;
  initialUpvotes: number;
  initialDownvotes: number;
  initialUserVote: number | null;
  onVoteChange?: (upvotes: number, downvotes: number, score: number, userVote: number | null) => void;
  disabled?: boolean;
  compact?: boolean;
}

export default function VoteButtons({
  memeId,
  initialUpvotes,
  initialDownvotes,
  initialUserVote,
  onVoteChange,
  disabled = false,
  compact = false,
}: VoteButtonsProps) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState<number | null>(initialUserVote);
  const [loading, setLoading] = useState(false);

  const score = upvotes - downvotes;

  const handleVote = async (voteType: 1 | -1) => {
    if (disabled || loading) return;

    setLoading(true);
    try {
      let response;
      if (userVote === voteType) {
        // Remove vote if clicking same button
        response = await votes.remove(memeId);
      } else {
        // Cast or change vote
        response = await votes.cast(memeId, voteType);
      }

      setUpvotes(response.upvotes);
      setDownvotes(response.downvotes);
      setUserVote(response.userVote);
      onVoteChange?.(response.upvotes, response.downvotes, response.score, response.userVote);
    } catch (err) {
      console.error('Vote failed:', err);
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => handleVote(1)}
          disabled={disabled || loading}
          className={`p-1 rounded transition-colors ${
            userVote === 1
              ? 'text-green-500'
              : 'text-themed-muted hover:text-green-500'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Upvote"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>
        <span className={`text-sm font-medium min-w-[2ch] text-center ${
          score > 0 ? 'text-green-500' : score < 0 ? 'text-red-500' : 'text-themed-muted'
        }`}>
          {score}
        </span>
        <button
          onClick={() => handleVote(-1)}
          disabled={disabled || loading}
          className={`p-1 rounded transition-colors ${
            userVote === -1
              ? 'text-red-500'
              : 'text-themed-muted hover:text-red-500'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Downvote"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleVote(1)}
        disabled={disabled || loading}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
          userVote === 1
            ? 'bg-green-500/20 text-green-500 border border-green-500/30'
            : 'bg-themed-secondary text-themed-secondary hover:bg-green-500/10 hover:text-green-500 border border-themed'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        title="Upvote"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
        <span className="text-sm font-medium">{upvotes}</span>
      </button>

      <span className={`text-lg font-bold min-w-[3ch] text-center ${
        score > 0 ? 'text-green-500' : score < 0 ? 'text-red-500' : 'text-themed-muted'
      }`}>
        {score > 0 ? '+' : ''}{score}
      </span>

      <button
        onClick={() => handleVote(-1)}
        disabled={disabled || loading}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
          userVote === -1
            ? 'bg-red-500/20 text-red-500 border border-red-500/30'
            : 'bg-themed-secondary text-themed-secondary hover:bg-red-500/10 hover:text-red-500 border border-themed'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        title="Downvote"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        <span className="text-sm font-medium">{downvotes}</span>
      </button>
    </div>
  );
}
