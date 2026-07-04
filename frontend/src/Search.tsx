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
          <input
            type="text"
            placeholder="Search users or hashtags..."
            className="w-full bg-pulse-dark border border-white/10 rounded-full py-3 px-6 pl-12 text-white focus:border-pulse-blue outline-none transition-all shadow-lg"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 absolute left-4 top-3.5 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <button
            type="submit"
            className="absolute right-2 top-2 bg-pulse-blue text-black text-sm font-bold px-4 py-1.5 rounded-full hover:opacity-90 transition-all"
          >
            Search
          </button>
        </form>
      </div>

      {loading && (
        <div className="text-center text-pulse-blue animate-pulse">Scanning frequencies...</div>
      )}

      {/* Results */}
      {data?.search && (
        <div className="space-y-8 animate-fade-in">
          {/* Users Section */}
          {data.search.users.length > 0 && (
            <section>
              <h3 className="text-lg font-bold text-gray-400 mb-4 border-b border-white/10 pb-2">
                Users Found
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {data.search.users.map((u: any) => (
                  <div
                    key={u.username}
                    className="flex flex-col gap-3 bg-pulse-dark p-4 rounded-lg border border-white/5 hover:border-pulse-blue/50 transition-all relative group"
                  >
                    <Link to={`/u/${u.username}`} className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gray-800 overflow-hidden border border-white/10">
                        {u.avatar ? (
                          <img src={u.avatar} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-gray-500">
                            {u.username[0]}
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="font-bold text-white block">{u.username}</span>
                        <span className="text-xs text-gray-500 truncate block max-w-[150px]">
                          {u.bio || 'No bio'}
                        </span>
                      </div>
                    </Link>

                    {/* Follow Button (Only show if not me) */}
                    {user && user.username !== u.username && (
                      <button
                        onClick={() => handleFollowToggle(u.username, u.isFollowing)}
                        className={`w-full py-1.5 rounded text-xs font-bold transition-colors ${
                          u.isFollowing
                            ? 'bg-transparent border border-gray-600 text-gray-400 hover:border-red-500 hover:text-red-500'
                            : 'bg-pulse-blue text-black hover:opacity-90'
                        }`}
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
              <h3 className="text-lg font-bold text-gray-400 mb-4 border-b border-white/10 pb-2">
                Posts Found
              </h3>
              <div className="space-y-4">
                {data.search.posts.map((post: any) => (
                  <div
                    key={post.id}
                    className="bg-pulse-dark p-6 rounded-xl border border-white/5 opacity-80 hover:opacity-100 transition-opacity"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden">
                        {post.author.avatar && (
                          <img src={post.author.avatar} className="w-full h-full" />
                        )}
                      </div>
                      <span className="font-bold text-sm text-gray-300">
                        {post.author.username}
                      </span>
                    </div>
                    <p className="text-white text-lg">{post.content}</p>
                    <div className="mt-2 text-sm text-gray-500">❤️ {post.likesCount}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {data.search.users.length === 0 && data.search.posts.length === 0 && (
            <div className="text-center text-gray-500 py-10">
              No signals detected matching "{term}".
            </div>
          )}
        </div>
      )}
    </div>
  );
}
