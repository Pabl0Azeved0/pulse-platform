import { useState } from 'react';
import { useMutation, gql } from '@apollo/client';

const UPDATE_PROFILE = gql`
  mutation UpdateProfile($username: String!, $bio: String!) {
    updateProfile(username: $username, bio: $bio) {
      id
      bio
    }
  }
`;

interface EditProfileModalProps {
  username: string;
  currentBio: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditProfileModal({
  username,
  currentBio,
  onClose,
  onSuccess,
}: EditProfileModalProps) {
  const [bio, setBio] = useState(currentBio || '');
  const [updateProfile, { loading }] = useMutation(UPDATE_PROFILE);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile({
        variables: { username, bio },
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-pulse-dark border border-white/10 w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
        <h2 className="text-xl font-bold text-white mb-4">Edit Signal</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-black/50 border border-gray-700 rounded-lg p-3 text-white focus:border-pulse-blue outline-none transition-colors resize-none h-32"
              placeholder="Tell the network who you are..."
              maxLength={160}
            />
            <div className="text-right text-xs text-gray-600 mt-1">{bio.length}/160</div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-pulse-blue text-black px-6 py-2 rounded-full text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
