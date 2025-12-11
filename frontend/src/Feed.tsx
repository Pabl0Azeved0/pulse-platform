import { useState, useEffect } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { useAuth } from './context/AuthContext';

const GET_POSTS = gql`
  query GetPosts {
    posts {
      id
      content
      author {
        username
      }
    }
  }
`;

// New Subscription definition
const POST_SUBSCRIPTION = gql`
  subscription OnNewPost {
    newPost {
      id
      content
      author {
        username
      }
    }
  }
`;

const CREATE_POST = gql`
  mutation CreatePost($username: String!, $content: String!) {
    createPost(username: $username, content: $content) {
      id
    }
  }
`;

export default function Feed() {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  
  // 1. Remove pollInterval, add subscribeToMore
  const { data, loading, error, subscribeToMore } = useQuery(GET_POSTS);

  const [createPost, { loading: creating }] = useMutation(CREATE_POST);

  // 2. Setup the Subscription Listener
  useEffect(() => {
    const unsubscribe = subscribeToMore({
      document: POST_SUBSCRIPTION,
      updateQuery: (prev, { subscriptionData }) => {
        if (!subscriptionData.data) return prev;
        
        const newPostItem = subscriptionData.data.newPost;
        
        // Return new cache state: [New Post, ...Old Posts]
        return {
          ...prev,
          posts: [newPostItem, ...prev.posts]
        };
      }
    });

    return () => unsubscribe();
  }, [subscribeToMore]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    try {
      await createPost({
        variables: { username: user?.username, content }
      });
      setContent('');
      // No need to refetch()! The subscription handles it.
    } catch (err) {
      console.error(err);
    }
  };

  // ... (Rest of the UI remains exactly the same) ...
  if (loading && !data) return <div className="text-center mt-10">Loading Pulse...</div>;
  if (error) return <div className="text-center mt-10 text-red-500">Error loading feed.</div>;

  return (
    <div className="pt-24 pb-10 max-w-2xl mx-auto px-4">
      <div className="bg-pulse-dark border border-white/10 rounded-xl p-6 mb-8 shadow-lg">
        <h3 className="text-lg font-bold mb-4 text-gray-300">What's happening?</h3>
        <form onSubmit={handlePost}>
          <textarea
            className="w-full bg-black border border-gray-700 rounded-lg p-4 text-white focus:border-pulse-blue outline-none resize-none transition-all"
            rows={3}
            placeholder="Share your frequency..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="flex justify-end mt-3">
            <button 
              type="submit" 
              disabled={creating || !content}
              className="bg-gradient-to-r from-pulse-blue to-pulse-green text-black font-bold py-2 px-6 rounded-full hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {creating ? 'Posting...' : 'Pulse It'}
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-4">
        {data?.posts.map((post: any) => (
          <div key={post.id} className="bg-pulse-dark p-6 rounded-xl border border-white/5 animate-fade-in transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center font-bold text-white uppercase">
                {post.author.username.substring(0, 2)}
              </div>
              <div>
                <span className="font-bold text-white block">{post.author.username}</span>
              </div>
            </div>
            <p className="text-gray-300 leading-relaxed text-lg">
              {post.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
