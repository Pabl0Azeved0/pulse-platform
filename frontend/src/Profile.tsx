import { useParams } from 'react-router-dom';
import { useQuery, gql, useMutation } from '@apollo/client';
import { useAuth } from './context/AuthContext';
import { Link } from 'react-router-dom';
import { useState } from 'react';

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

const UPDATE_AVATAR = gql`
  mutation UpdateAvatar($username: String!, $avatarUrl: String!) {
    updateAvatar(username: $username, avatarData: $avatarUrl) {
      id
      avatar
    }
  }
`;


export default function Profile() {
  const { username } = useParams();
  const { user } = useAuth();
  
  const { data, loading, error, refetch } = useQuery(GET_PROFILE, {
    variables: { username, viewer: user?.username }
  });

  const [updateAvatar] = useMutation(UPDATE_AVATAR);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      
      await updateAvatar({
        variables: { 
            username: user.username, 
            avatarUrl: result.url 
        }
      });
      
      refetch(); 
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="text-center mt-20 text-pulse-blue animate-pulse">Loading Profile...</div>;
  if (error || !data?.profile) return <div className="text-center mt-20 text-red-500">User not found</div>;

  const profile = data.profile;
  const isOwnProfile = user?.username === profile.username;

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

            {isOwnProfile && (
                <label className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-all">
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={uploading} />
                    {uploading ? (
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                </label>
            )}
           
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
