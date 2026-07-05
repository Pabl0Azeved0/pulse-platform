import { useState, useEffect } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { useAuth } from './context/AuthContext';
import CommentThread, { countComments } from './components/CommentThread';
import CommentForm from './components/CommentForm';
import { Link } from 'react-router-dom';
import { timeAgo, fullTimestamp } from './utils/time';

// --- Type Definitions ---
interface Author {
  username: string;
  avatar: string | null;
}

interface Comment {
  id: number;
  content: string;
  author: Author;
  likesCount: number;
  isLiked: boolean;
  replies: Comment[];
  createdAt?: string | null;
}

interface Post {
  id: number;
  content: string;
  author: Author;
  likesCount: number;
  isLiked: boolean;
  comments: Comment[];
  createdAt?: string | null;
}

interface PostsData {
  posts: Post[];
}

interface SubscriptionData {
  newPost: Post;
}

// --- GraphQL Definitions ---
const GET_POSTS = gql`
  query GetPosts($filter: String) {
    posts(filterType: $filter) {
      id
      content
      likesCount
      isLiked
      createdAt
      author {
        username
        avatar
      }
      comments {
        id
        content
        likesCount
        isLiked
        createdAt
        author {
          username
          avatar
        }
        replies {
          id
          content
          likesCount
          isLiked
          createdAt
          author {
            username
            avatar
          }
          replies {
            id
            content
            likesCount
            isLiked
            createdAt
            author {
              username
              avatar
            }
          }
        }
      }
    }
  }
`;

const POST_SUBSCRIPTION = gql`
  subscription OnNewPost {
    newPost {
      id
      content
      likesCount
      isLiked
      createdAt
      author {
        username
        avatar
      }
    }
  }
`;

const CREATE_POST = gql`
  mutation CreatePost($content: String!) {
    createPost(content: $content) {
      id
      content
      likesCount
      isLiked
      createdAt
      author {
        username
        avatar
      }
    }
  }
`;

const LIKE_MUTATION = gql`
  mutation LikePost($postId: Int!) {
    likePost(postId: $postId)
  }
`;

export default function Feed() {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [activeCommentBox, setActiveCommentBox] = useState<number | null>(null);

  // NEW: State for tabs
  const [feedFilter, setFeedFilter] = useState<'GLOBAL' | 'FOLLOWING'>('GLOBAL');

  const { data, loading, error, subscribeToMore } = useQuery<PostsData>(GET_POSTS, {
    variables: { filter: feedFilter },
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
  });

  const [createPost, { loading: creating }] = useMutation(CREATE_POST);

  const [likePost] = useMutation(LIKE_MUTATION, {
    onError: (err) => console.error('Like failed', err),
  });

  useEffect(() => {
    const unsubscribe = subscribeToMore<SubscriptionData>({
      document: POST_SUBSCRIPTION,
      updateQuery: (prev, { subscriptionData }) => {
        if (!subscriptionData.data) return prev;
        const newPostItem = subscriptionData.data.newPost;

        const cleanPost: Post = {
          ...newPostItem,
          comments: [],
        };

        if (prev.posts.some((p) => p.id === cleanPost.id)) return prev;

        // Only add new posts to the feed if we are in GLOBAL mode
        // OR if we are in FOLLOWING mode and we follow the author (complex check)
        // For simplicity, we mostly rely on Global or refetch for consistency.
        // We will append it regardless for now to keep the UI snappy.
        return {
          ...prev,
          posts: [cleanPost, ...prev.posts],
        };
      },
    });
    return () => unsubscribe();
  }, [subscribeToMore]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !user) return;

    try {
      await createPost({
        variables: { content },
      });
      setContent('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleLike = (postId: number, currentLikes: number, currentlyLiked: boolean) => {
    if (!user) return;

    const isNowLiked = !currentlyLiked;
    const newCount = isNowLiked ? currentLikes + 1 : currentLikes - 1;

    likePost({
      variables: { postId },
      optimisticResponse: { likePost: newCount },
      update: (cache, { data: { likePost: returnedCount } }) => {
        const cacheId = cache.identify({ __typename: 'PostType', id: postId });
        if (!cacheId) return;

        cache.modify({
          id: cacheId,
          fields: {
            likesCount: () => returnedCount,
            isLiked: () => isNowLiked,
          },
        });
      },
    });
  };

  if (loading && !data)
    return (
      <div className="pt-24 pb-20 max-w-2xl mx-auto px-4 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card p-6 animate-pulse">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-surface-hover" />
              <div className="space-y-2">
                <div className="h-4 w-32 rounded bg-surface-hover" />
                <div className="h-3 w-20 rounded bg-surface-hover" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full rounded bg-surface-hover" />
              <div className="h-4 w-2/3 rounded bg-surface-hover" />
            </div>
          </div>
        ))}
      </div>
    );
  if (error)
    return (
      <div className="pt-24 max-w-2xl mx-auto px-4">
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/25 px-3.5 py-3 text-sm text-red-300"
        >
          <svg
            className="w-4 h-4 mt-0.5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z"
            />
          </svg>
          <span>{error.message}</span>
        </div>
      </div>
    );

  return (
    <div className="pt-24 pb-20 max-w-2xl mx-auto px-4">
      {/* Tabs */}
      <div className="inline-flex items-center gap-1 p-1 rounded-full bg-surface border border-line mb-6">
        <button
          onClick={() => setFeedFilter('GLOBAL')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
            feedFilter === 'GLOBAL' ? 'bg-surface-hover text-ink' : 'text-ink-muted hover:text-ink'
          }`}
        >
          Global
        </button>
        <button
          onClick={() => setFeedFilter('FOLLOWING')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
            feedFilter === 'FOLLOWING'
              ? 'bg-surface-hover text-ink'
              : 'text-ink-muted hover:text-ink'
          }`}
        >
          Following
        </button>
      </div>

      <div className="card p-6 mb-8">
        <form onSubmit={handlePost}>
          <textarea
            className="input resize-none"
            rows={3}
            placeholder="What's happening?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="flex justify-end mt-3">
            <button type="submit" disabled={creating || !content} className="btn-primary">
              {creating && (
                <span className="w-4 h-4 border-2 border-accent-ink/40 border-t-accent-ink rounded-full animate-spin" />
              )}
              {creating ? 'Posting…' : 'Post'}
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-4">
        {data?.posts.map((post) => {
          const commentCount = countComments(post.comments);
          return (
            <div key={post.id} className="card p-6">
              {/* Header (Clickable Link to Profile) */}
              <Link
                to={`/u/${post.author.username}`}
                className="flex items-center gap-3 mb-4 group"
              >
                <div className="w-11 h-11 rounded-full bg-surface-hover flex items-center justify-center text-ink font-semibold border border-line overflow-hidden">
                  {post.author.avatar ? (
                    <img
                      src={post.author.avatar}
                      alt={post.author.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{post.author.username.substring(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-ink group-hover:text-accent transition-colors">
                    {post.author.username}
                  </span>
                  {post.createdAt && (
                    <>
                      <span className="text-ink-subtle text-xs">·</span>
                      <time
                        dateTime={post.createdAt}
                        title={fullTimestamp(post.createdAt)}
                        className="text-xs text-ink-subtle"
                      >
                        {timeAgo(post.createdAt)}
                      </time>
                    </>
                  )}
                </div>
              </Link>

              <p className="text-ink-muted leading-relaxed whitespace-pre-wrap mb-5">
                {post.content}
              </p>

              <div className="border-t border-line pt-4 flex items-center gap-6">
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent bubbling if you add click handlers to the container later
                    handleLike(post.id, post.likesCount, post.isLiked);
                  }}
                  className={`flex items-center gap-1.5 text-sm font-medium transition-colors cursor-pointer ${post.isLiked ? 'text-red-400' : 'text-ink-muted hover:text-ink'}`}
                >
                  <svg
                    className="h-5 w-5"
                    fill={post.isLiked ? 'currentColor' : 'none'}
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
                  <span>{post.likesCount > 0 ? post.likesCount : 'Like'}</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveCommentBox(activeCommentBox === post.id ? null : post.id);
                  }}
                  className="flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink transition-colors cursor-pointer"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  <span>{commentCount > 0 ? commentCount : 'Comment'}</span>
                </button>
              </div>

              {activeCommentBox === post.id && (
                <div className="mt-4 p-4 bg-surface-input rounded-lg animate-fade-in">
                  <CommentForm
                    postId={post.id}
                    onSuccess={() => setActiveCommentBox(null)}
                    onCancel={() => setActiveCommentBox(null)}
                  />
                </div>
              )}
              <CommentThread comments={post.comments} postId={post.id} />
            </div>
          );
        })}

        {data?.posts.length === 0 && (
          <div className="text-center py-20">
            {feedFilter === 'FOLLOWING' ? (
              <>
                <p className="text-ink-muted font-medium">No posts yet.</p>
                <p className="text-sm text-ink-subtle mt-1">You aren't following anyone yet.</p>
              </>
            ) : (
              <>
                <p className="text-ink-muted font-medium">No posts yet.</p>
                <p className="text-sm text-ink-subtle mt-1">Be the first to post something.</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
