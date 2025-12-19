import { useParams } from 'react-router-dom';
import { useQuery, gql } from '@apollo/client';
import { useAuth } from './context/AuthContext';
import { Link } from 'react-router-dom';

// Reuse types or import them
interface UserProfile {
  username: string;
  avatar: string | null;
  bio: string | null;
  createdAt: string;
  postsCount: number;
  posts: any[]; // reuse Post type
}

const GET_PROFILE = gql`
  query GetProfile($username: String!, $viewer: String) {
    profile(username: $username, viewer: $viewer) {
      username
      avatar
      bio
      createdAt
      postsCount
      posts {
        id
        content
        likesCount
        isLiked
        author { username avatar }
        # We skipped comments for profile view to keep it fast
      }
    }
  }
`;

export default function Profile() {
  const { username } = useParams();
  const { user } = useAuth();
  
  const { data, loading, error } = useQuery(GET_PROFILE, {
    variables: { username, viewer: user?.username }
  });

  if (loading) return <div className="text-center mt-20 text-pulse-blue animate-pulse">Loading Profile...</div>;
  if (error || !data?.profile) return <div className="text-center mt-20 text-red-500">User not found</div>;

  const profile = data.profile;

  return (
    <div className="pt-24 pb-20 max-w-2xl mx-auto px-4">
      
      {/* Profile Card */}
      <div className="bg-pulse-dark border border-white/10 rounded-2xl p-8 mb-8 text-center shadow-2xl relative overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-pulse-blue/20 to-transparent pointer-events-none" />
        
        <div className="relative">
            <div className="w-32 h-32 rounded-full mx-auto border-4 border-pulse-dark shadow-xl overflow-hidden mb-4 bg-gray-800">
                {profile.avatar ? (
                    <img src={profile.avatar} alt={profile.username} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-500">
                        {profile.username.substring(0, 2).toUpperCase()}
                    </div>
                )}
            </div>
            
            <h1 className="text-3xl font-bold text-white mb-2">{profile.username}</h1>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">{profile.bio || "No signal details available."}</p>
            
            <div className="flex justify-center gap-8 text-sm text-gray-400 border-t border-white/5 pt-6">
                <div className="text-center">
                    <span className="block text-2xl font-bold text-white">{profile.postsCount}</span>
                    <span>Pulses</span>
                </div>
                <div className="text-center">
                    <span className="block text-2xl font-bold text-white">
                        {new Date(profile.createdAt).toLocaleDateString()}
                    </span>
                    <span>Joined</span>
                </div>
            </div>
        </div>
      </div>

      {/* User's Posts Feed */}
      <h3 className="text-xl font-bold text-gray-300 mb-6">Transmission History</h3>
      <div className="space-y-6">
        {profile.posts.map((post: any) => (
           <div key={post.id} className="bg-pulse-dark p-6 rounded-xl border border-white/5 opacity-80 hover:opacity-100 transition-opacity">
                <p className="text-gray-300 text-lg mb-4">{post.content}</p>
                <div className="text-sm text-gray-500 flex gap-4">
                    <span>❤️ {post.likesCount}</span>
                    <Link to="/" className="hover:text-pulse-blue">View in Feed</Link>
                </div>
           </div>
        ))}
        {profile.posts.length === 0 && (
            <div className="text-center text-gray-500 py-10">No transmissions yet.</div>
        )}
      </div>
    </div>
  );
}
