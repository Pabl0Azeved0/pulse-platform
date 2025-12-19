import { useState, useEffect } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { useAuth } from './context/AuthContext';
import CommentThread from './components/CommentThread';
import CommentForm from './components/CommentForm';
import { Link } from 'react-router-dom';

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
}

interface Post {
  id: number;
  content: string;
  author: Author;
  likesCount: number;
  isLiked: boolean;
  comments: Comment[];
}

interface PostsData {
  posts: Post[];
}

interface SubscriptionData {
  newPost: Post;
}

// --- GraphQL Definitions ---
const GET_POSTS = gql`
  query GetPosts($viewer: String) {
    posts(viewer: $viewer) {
      id
      content
      likesCount
      isLiked
      author { username avatar }
      comments {
        id
        content
        likesCount
        isLiked
        author { username avatar }
        replies {
          id
          content
          likesCount
          isLiked
          author { username avatar }
          replies {
             id
             content
             likesCount
             isLiked
             author { username avatar }
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
      author { username avatar }
    }
  }
`;

const CREATE_POST = gql`
  mutation CreatePost($username: String!, $content: String!) {
    createPost(username: $username, content: $content) {
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
`;

const LIKE_MUTATION = gql`
  mutation LikePost($username: String!, $postId: Int!) {
    likePost(username: $username, postId: $postId)
  }
`;

export default function Feed() {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [activeCommentBox, setActiveCommentBox] = useState<number | null>(null);

  const { data, loading, error, subscribeToMore } = useQuery<PostsData>(GET_POSTS, {
    variables: { viewer: user?.username }
  });

  const [createPost, { loading: creating }] = useMutation(CREATE_POST);
  
  const [likePost] = useMutation(LIKE_MUTATION, {
    onError: (err) => console.error("Like failed", err) 
  });

  useEffect(() => {
    const unsubscribe = subscribeToMore<SubscriptionData>({
      document: POST_SUBSCRIPTION,
      updateQuery: (prev, { subscriptionData }) => {
        if (!subscriptionData.data) return prev;
        const newPostItem = subscriptionData.data.newPost;
        
        const cleanPost: Post = { 
            ...newPostItem, 
            comments: [] 
        };

        if (prev.posts.some(p => p.id === cleanPost.id)) return prev;

        return {
          ...prev,
          posts: [cleanPost, ...prev.posts]
        };
      }
    });
    return () => unsubscribe();
  }, [subscribeToMore]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !user) return;
    
    try {
      await createPost({
        variables: { username: user.username, content }
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
      variables: { username: user.username, postId },
      optimisticResponse: { likePost: newCount },
      update: (cache, { data: { likePost: returnedCount } }) => {
        const cacheId = cache.identify({ __typename: 'PostType', id: postId });
        if (!cacheId) return;

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

  if (loading && !data) return <div className="text-center mt-20 text-pulse-blue animate-pulse">Loading Pulse...</div>;
  if (error) return <div className="text-center mt-20 text-red-500 bg-red-900/10 p-4 rounded">System Offline: {error.message}</div>;

  return (
    <div className="pt-24 pb-20 max-w-2xl mx-auto px-4">
      
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

      <div className="space-y-6">
        {data?.posts.map((post) => (
          <>
          <Link to={`/u/${post.author.username}`} className="flex items-center gap-4 mb-4 group">
            <div key={post.id} className="bg-pulse-dark p-6 rounded-xl border border-white/5 hover:border-white/10 transition-colors shadow-lg">
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

              <div className="mb-6">
                <p className="text-gray-300 leading-relaxed text-lg whitespace-pre-wrap">
                  {post.content}
                </p>
              </div>

              <div className="border-t border-white/5 pt-4 flex items-center gap-6">

                <button
                  onClick={() => handleLike(post.id, post.likesCount, post.isLiked)}
                  className={`flex items-center gap-2 font-bold transition-colors ${post.isLiked ? 'text-red-500' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                  </svg>
                  <span>{post.likesCount > 0 ? post.likesCount : 'Like'}</span>
                </button>

                <button
                  onClick={() => setActiveCommentBox(activeCommentBox === post.id ? null : post.id)}
                  className="flex items-center gap-2 text-gray-400 hover:text-pulse-blue transition-colors font-bold"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
                  </svg>
                  <span>Comment</span>
                </button>
              </div>

              {activeCommentBox === post.id && (
                <div className="mt-4 p-4 bg-black/20 rounded-lg animate-fade-in">
                  <CommentForm
                    postId={post.id}
                    onSuccess={() => setActiveCommentBox(null)}
                    onCancel={() => setActiveCommentBox(null)} />
                </div>
              )}
              <CommentThread comments={post.comments} postId={post.id} />
            </div>
          </Link>
          </>
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
