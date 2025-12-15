import { useState, useEffect } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { useAuth } from './context/AuthContext';

// --- Type Definitions ---
interface Author {
  username: string;
  avatar: string | null;
}

interface Post {
  id: number;
  content: string;
  author: Author;
  likesCount: number;
  isLiked: boolean;
}

// Result of the GET_POSTS query
interface PostsData {
  posts: Post[];
}

// Result of the POST_SUBSCRIPTION
interface SubscriptionData {
  newPost: Post;
}

// --- GraphQL Definitions ---
const GET_POSTS = gql`
  query GetPosts {
    posts {
      id
      content
      author {
        username
        avatar
      }
      likesCount
      isLiked
    }
  }
`;

const POST_SUBSCRIPTION = gql`
  subscription OnNewPost {
    newPost {
      id
      content
      author {
        username
        avatar
      }
      likesCount
      isLiked
    }
  }
`;

const CREATE_POST = gql`
  mutation CreatePost($username: String!, $content: String!) {
    createPost(username: $username, content: $content) {
      id
      content
      likesCount
      author {
        username
        avatar
      }
      isLiked
    }
  }
`;

const LIKE_MUTATION = gql`
  mutation LikePost($username: String!, $postId: Int!) {
    likePost(username: $username, postId: $postId)
  }
`;

export default function Feed() {
  const { user } = useAuth();
  const [content, setContent] = useState('');

  // 1. Fetch Posts with Subscription Support
  const { data, loading, error, subscribeToMore } = useQuery<PostsData>(GET_POSTS, {
    variables: { viewer: user?.username }
  });

  // 2. Setup Mutations
  const [createPost, { loading: creating }] = useMutation(CREATE_POST);
  
  const [likePost] = useMutation(LIKE_MUTATION, {
    // Portfolio-Grade Feature: Optimistic UI
    // We don't wait for the server. We assume it worked and update the cache instantly.
    onError: (err) => console.error("Like failed", err) 
  });

  // 3. Subscription Listener
  useEffect(() => {
    const unsubscribe = subscribeToMore<SubscriptionData>({
      document: POST_SUBSCRIPTION,
      updateQuery: (prev, { subscriptionData }) => {
        if (!subscriptionData.data) return prev;
        const newPostItem = subscriptionData.data.newPost;
        
        // Prevent duplicate posts if user created it themselves
        if (prev.posts.some(p => p.id === newPostItem.id)) return prev;

        return {
          ...prev,
          posts: [newPostItem, ...prev.posts]
        };
      }
    });
    return () => unsubscribe();
  }, [subscribeToMore]);

  // 4. Handlers
  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !user) return;
    
    try {
      await createPost({
        variables: { username: user.username, content },
        // Manually update cache to show your own post instantly
        // update: (cache, { data: { createPost } }) => {
        //   const existing = cache.readQuery<PostsData>({ query: GET_POSTS });
        //   if (existing) {
        //     cache.writeQuery({
        //       query: GET_POSTS,
        //       data: { posts: [createPost, ...existing.posts] }
        //     });
        //   }
        // }
      });
      setContent('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleLike = (postId: number, currentLikes: number, currentlyLiked: boolean) => {
    if (!user) return;

    // 1. Calculate the new state immediately (Optimistic Math)
    const isNowLiked = !currentlyLiked;
    const newCount = isNowLiked ? currentLikes + 1 : currentLikes - 1;

    likePost({
      variables: { username: user.username, postId },
      
      // 2. Fake the server response so it feels instant
      optimisticResponse: {
        likePost: newCount 
      },

      // 3. Manually update the Apollo Cache
      update: (cache, { data: { likePost: returnedCount } }) => {
        const cacheId = cache.identify({ __typename: 'PostType', id: postId });
        if (!cacheId) return; // Safety check

        cache.modify({
          id: cacheId,
          fields: {
            likesCount: () => returnedCount,
            isLiked: () => isNowLiked
          }
        });
      }
    });
  };

  // --- Render ---
  if (loading && !data) return <div className="text-center mt-20 text-pulse-blue animate-pulse">Loading Pulse...</div>;
  if (error) return <div className="text-center mt-20 text-red-500 bg-red-900/10 p-4 rounded">System Offline: {error.message}</div>;

  return (
    <div className="pt-24 pb-20 max-w-2xl mx-auto px-4">
      
      {/* Create Post Box */}
      <div className="bg-pulse-dark border border-white/10 rounded-xl p-6 mb-8 shadow-2xl backdrop-blur-sm">
        <h3 className="text-lg font-bold mb-4 text-gray-300">Broadcast your Signal</h3>
        <form onSubmit={handlePost}>
          <textarea
            className="w-full bg-black/50 border border-gray-700 rounded-lg p-4 text-white focus:border-pulse-blue focus:ring-1 focus:ring-pulse-blue outline-none resize-none transition-all placeholder-gray-600"
            rows={3}
            placeholder="What's happening?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="flex justify-end mt-3">
            <button 
              type="submit" 
              disabled={creating || !content}
              className="bg-gradient-to-r from-pulse-blue to-pulse-green text-black font-bold py-2 px-8 rounded-full hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-pulse-green/20"
            >
              {creating ? 'Transmitting...' : 'Pulse'}
            </button>
          </div>
        </form>
      </div>

      {/* Feed List */}
      <div className="space-y-6">
        {data?.posts.map((post) => (
          <div key={post.id} className="bg-pulse-dark p-6 rounded-xl border border-white/5 hover:border-white/10 transition-colors shadow-lg">
            
            {/* Header: Avatar + User */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-800 to-black flex items-center justify-center text-white font-bold border border-white/10 overflow-hidden">
                {post.author.avatar ? (
                  <img src={post.author.avatar} alt={post.author.username} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg">{post.author.username.substring(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div>
                <span className="font-bold text-white text-lg block">{post.author.username}</span>
                <span className="text-xs text-gray-500">Pulse Node ID: #{post.id}</span>
              </div>
            </div>

            {/* Content */}
            <p className="text-gray-300 leading-relaxed text-lg mb-6 whitespace-pre-wrap">
              {post.content}
            </p>

            {/* Footer: Interactions */}
            <div className="border-t border-white/5 pt-4 flex items-center gap-6">
              <button 
                onClick={() => handleLike(post.id, post.likesCount, post.isLiked)}
                className="flex items-center gap-2 text-gray-400 hover:text-red-500 transition-colors group"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className={`h-6 w-6 transition-transform group-hover:scale-125 ${post.likesCount > 0 ? 'fill-current text-red-500' : 'stroke-current'}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span className="font-medium text-sm">
                  {post.likesCount > 0 ? post.likesCount : 'Like'}
                </span>
              </button>
            </div>

          </div>
        ))}
        
        {data?.posts.length === 0 && (
          <div className="text-center py-20 opacity-50">
            <p className="text-xl text-gray-500">No signals detected.</p>
            <p className="text-sm text-gray-600">Be the first to transmit.</p>
          </div>
        )}
      </div>
    </div>
  );
}
