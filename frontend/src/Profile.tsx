import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, gql } from '@apollo/client';
import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import EditProfileModal from './components/EditProfileModal';
import { timeAgo, fullTimestamp } from './utils/time';

const GET_PROFILE = gql`
  query GetProfile($username: String!) {
    profile(username: $username) {
      username
      avatar
      bio
      createdAt
      postsCount
      followersCount
      followingCount
      isFollowing
      posts {
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
`;

// Note: We keep this mutation here if you want to use the "Quick Camera Icon"
// but the Modal now handles this too.
const UPDATE_AVATAR = gql`
  mutation UpdateAvatar($avatarUrl: String!) {
    updateAvatar(avatarData: $avatarUrl) {
      id
      avatar
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

export default function Profile() {
  const { username } = useParams();
  const { user } = useAuth();

  const { data, loading, error, refetch } = useQuery(GET_PROFILE, {
    variables: { username },
    fetchPolicy: 'network-only', // Ensure we see updates after editing
  });

  const [updateAvatar] = useMutation(UPDATE_AVATAR);
  const [followUser] = useMutation(FOLLOW_MUTATION);
  const [unfollowUser] = useMutation(UNFOLLOW_MUTATION);

  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();

      await updateAvatar({
        variables: {
          avatarUrl: result.url,
        },
      });

      refetch();
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setUploading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!user || !data?.profile) return;
    const isFollowing = data.profile.isFollowing;

    try {
      if (isFollowing) {
        await unfollowUser({ variables: { target: username } });
      } else {
        await followUser({ variables: { target: username } });
      }
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading)
    return (
      <div className="pt-24 pb-20 max-w-2xl mx-auto px-4">
        <div className="card p-8 animate-pulse">
          <div className="w-32 h-32 rounded-full bg-surface-hover mx-auto mb-4" />
          <div className="h-6 w-40 rounded bg-surface-hover mx-auto mb-2" />
          <div className="h-4 w-64 rounded bg-surface-hover mx-auto" />
        </div>
      </div>
    );
  if (error || !data?.profile)
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
          <span>User not found</span>
        </div>
      </div>
    );

  const profile = data.profile;
  const isOwnProfile = user?.username === profile.username;

  return (
    <div className="pt-24 pb-20 max-w-2xl mx-auto px-4">
      {/* Profile Card */}
      <div className="card p-8 mb-8 text-center">
        {/* Avatar Circle */}
        <div className="w-32 h-32 rounded-full mx-auto border-4 border-surface overflow-hidden mb-4 bg-surface-hover relative group">
          {profile.avatar ? (
            <img
              src={profile.avatar}
              alt={profile.username}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-ink-subtle">
              {profile.username.substring(0, 2).toUpperCase()}
            </div>
          )}

          {/* Quick Upload Hover Overlay (Optional: Keep if you want quick access) */}
          {isOwnProfile && (
            <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-all">
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
                disabled={uploading}
              />
              {uploading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg
                  className="h-8 w-8 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              )}
            </label>
          )}
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-ink mb-2">{profile.username}</h1>
        <p className="text-ink-muted mb-6 max-w-md mx-auto whitespace-pre-wrap">
          {profile.bio || 'No bio yet.'}
        </p>

        {/* Stats Row */}
        <div className="flex justify-center gap-8 text-sm text-ink-muted border-t border-line pt-6 mb-6">
          <div className="text-center">
            <span className="block text-xl font-bold text-ink">{profile.postsCount}</span>
            <span>{profile.postsCount === 1 ? 'Post' : 'Posts'}</span>
          </div>
          <div className="text-center">
            <span className="block text-xl font-bold text-ink">{profile.followersCount}</span>
            <span>Followers</span>
          </div>
          <div className="text-center">
            <span className="block text-xl font-bold text-ink">{profile.followingCount}</span>
            <span>Following</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center">
          {isOwnProfile ? (
            <button onClick={() => setIsEditing(true)} className="btn-secondary">
              Edit Profile
            </button>
          ) : (
            <button
              onClick={handleFollowToggle}
              className={
                profile.isFollowing
                  ? 'btn bg-transparent border border-line text-ink-muted hover:border-red-500/60 hover:text-red-400 px-5 py-2.5'
                  : 'btn-primary'
              }
            >
              {profile.isFollowing ? 'Unfollow' : 'Follow'}
            </button>
          )}
        </div>
      </div>

      {/* User's Posts Feed */}
      <h3 className="text-lg font-semibold text-ink mb-4">Posts</h3>
      <div className="space-y-4">
        {profile.posts.map((post: any) => (
          <div key={post.id} className="card p-6">
            {post.createdAt && (
              <time
                dateTime={post.createdAt}
                title={fullTimestamp(post.createdAt)}
                className="text-xs text-ink-subtle block mb-2"
              >
                {timeAgo(post.createdAt)}
              </time>
            )}
            <p className="text-ink-muted mb-4 whitespace-pre-wrap">{post.content}</p>
            <div className="text-sm text-ink-subtle flex items-center gap-4">
              <span className="flex items-center gap-1.5">
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
              </span>
              <Link to="/" className="hover:text-accent transition-colors">
                View in Feed
              </Link>
            </div>
          </div>
        ))}
        {profile.posts.length === 0 && (
          <div className="text-center text-ink-muted py-10">No posts yet.</div>
        )}
      </div>

      {/* Edit Modal */}
      {isEditing && profile && (
        <EditProfileModal
          currentBio={profile.bio || ''}
          currentAvatar={profile.avatar}
          onClose={() => setIsEditing(false)}
          onSuccess={() => {
            refetch();
          }}
        />
      )}
    </div>
  );
}
