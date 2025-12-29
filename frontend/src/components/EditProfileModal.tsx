import { useState } from 'react';
import { useMutation, gql } from '@apollo/client';

const UPDATE_USER = gql`
  mutation UpdateUser($bio: String, $avatar: String) {
    updateUser(bio: $bio, avatar: $avatar) {
      username
      bio
      avatar
    }
  }
`;

interface EditProfileModalProps {
  currentBio: string;
  currentAvatar: string | null;
  onClose: () => void;
}

export default function EditProfileModal({
  currentBio,
  currentAvatar,
  onClose,
}: EditProfileModalProps) {
  const [bio, setBio] = useState(currentBio || '');
  const [uploading, setUploading] = useState(false);
  const [updateUser] = useMutation(UPDATE_USER);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;

    setUploading(true);
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      // 1. Upload to REST endpoint
      // Note: In Prod, this URL needs to be dynamic, but for now localhost works
      const res = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      // 2. Save URL to GraphQL
      await updateUser({ variables: { avatar: data.url } });
      window.location.reload(); // Simple reload to show changes
    } catch (err) {
      console.error('Upload failed', err);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      await updateUser({ variables: { bio } });
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 p-8 rounded-xl w-full max-w-md shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-6">Edit Signal</h2>

        {/* Avatar Section */}
        <div className="mb-6 flex items-center gap-4">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-800 border border-white/10">
            {currentAvatar && <img src={currentAvatar} className="w-full h-full object-cover" />}
          </div>
          <div>
            <label className="bg-gray-800 hover:bg-gray-700 text-white text-sm px-4 py-2 rounded-lg cursor-pointer transition-colors border border-gray-600">
              {uploading ? 'Uploading...' : 'Change Avatar'}
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </label>
          </div>
        </div>

        {/* Bio Section */}
        <div className="mb-6">
          <label className="block text-gray-400 text-sm mb-2">Bio</label>
          <textarea
            className="w-full bg-black/50 border border-gray-700 rounded-lg p-3 text-white focus:border-pulse-blue outline-none transition-colors"
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="text-gray-400 hover:text-white px-4 py-2">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="bg-pulse-blue text-black font-bold px-6 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
