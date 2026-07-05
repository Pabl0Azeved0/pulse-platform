import { useState } from 'react';
import { useLazyQuery, gql, useMutation } from '@apollo/client';
import { Link } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

const SEARCH_QUERY = gql`
  query Search($query: String!) {
    search(query: $query) {
      users {
        username
        avatar
        bio
        isFollowing
      }
      posts {
        id
        content
        likesCount
        isLiked
        author {
          username
          avatar
        }
      }
    }
  }
`;

const FOLLOW_MUTATION = gql`
  mutation Follow($target: String!) {
    followUser(targetUsername: $target)
  }
`;

const UNFOLLOW_MUTATION = gql`
  mutation Unfollow($target: String!) {
    unfollowUser(targetUsername: $target)
  }
`;

export default function Search() {
  const { user } = useAuth();
  const [term, setTerm] = useState('');

  const [executeSearch, { data, loading }] = useLazyQuery(SEARCH_QUERY);
  const [followUser] = useMutation(FOLLOW_MUTATION);
  const [unfollowUser] = useMutation(UNFOLLOW_MUTATION);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (term.trim()) {
      executeSearch({ variables: { query: term } });
    }
  };

  const handleFollowToggle = async (targetUsername: string, isFollowing: boolean) => {
    if (!user) return;
    try {
      if (isFollowing) {
        await unfollowUser({ variables: { target: targetUsername } });
      } else {
        await followUser({ variables: { target: targetUsername } });
      }
      // Re-run search to update UI state
      executeSearch({ variables: { query: term } });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="pt-24 pb-20 max-w-2xl mx-auto px-4">
      {/* Search Input */}
      <div className="mb-8">
        <form onSubmit={handleSearch} className="relative">
          <svg
            className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search users or posts..."
            className="input pl-12 pr-24 rounded-full"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
          <button
            type="submit"
            className="btn-primary absolute right-1.5 top-1.5 bottom-1.5 py-0 text-sm"
          >
            Search
          </button>
        </form>
      </div>

      {loading && (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-surface-hover" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-1/3 rounded bg-surface-hover" />
                <div className="h-3 w-1/2 rounded bg-surface-hover" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !data && (
        <div className="text-center py-16">
          <svg
            className="mx-auto h-10 w-10 text-ink-subtle mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-ink">Discover people and posts</h3>
          <p className="text-ink-muted mt-1 text-sm">
            Search for people to follow or find posts by keyword.
          </p>
        </div>
      )}

      {/* Results */}
      {data?.search && (
        <div className="space-y-8 animate-fade-in">
          {/* Users Section */}
          {data.search.users.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-ink-muted mb-4 border-b border-line pb-2">
                Users
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {data.search.users.map((u: any) => (
                  <div key={u.username} className="card flex flex-col gap-3 p-4">
                    <Link to={`/u/${u.username}`} className="flex items-center gap-3 group">
                      <div className="w-12 h-12 rounded-full bg-surface-hover overflow-hidden border border-line">
                        {u.avatar ? (
                          <img src={u.avatar} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-semibold text-ink-subtle">
                            {u.username[0]}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-ink block group-hover:text-accent transition-colors">
                          {u.username}
                        </span>
                        <span className="text-xs text-ink-subtle truncate block max-w-[150px]">
                          {u.bio || 'No bio'}
                        </span>
                      </div>
                    </Link>

                    {/* Follow Button (Only show if not me) */}
                    {user && user.username !== u.username && (
                      <button
                        onClick={() => handleFollowToggle(u.username, u.isFollowing)}
                        className={
                          u.isFollowing
                            ? 'btn bg-transparent border border-line text-ink-muted hover:border-red-500/60 hover:text-red-400 w-full py-1.5 text-xs'
                            : 'btn-primary w-full py-1.5 text-xs'
                        }
                      >
                        {u.isFollowing ? 'Unfollow' : 'Follow'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Posts Section */}
          {data.search.posts.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-ink-muted mb-4 border-b border-line pb-2">
                Posts
              </h3>
              <div className="space-y-4">
                {data.search.posts.map((post: any) => (
                  <div key={post.id} className="card p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-surface-hover overflow-hidden">
                        {post.author.avatar && (
                          <img src={post.author.avatar} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <span className="font-semibold text-sm text-ink">{post.author.username}</span>
                    </div>
                    <p className="text-ink-muted">{post.content}</p>
                    <div className="mt-2 text-sm text-ink-subtle flex items-center gap-1.5">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.8}
                          d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 21.036l-7.682-7.682a4.5 4.5 0 010-6.364z"
                        />
                      </svg>
                      {post.likesCount}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {data.search.users.length === 0 && data.search.posts.length === 0 && (
            <div className="text-center text-ink-muted py-10">No results matching "{term}".</div>
          )}
        </div>
      )}
    </div>
  );
}
