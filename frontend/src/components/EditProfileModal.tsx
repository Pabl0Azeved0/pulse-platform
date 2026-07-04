import { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { UPLOAD_URL } from '../config';

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
  onSuccess: () => void;
}

export default function EditProfileModal({
  currentBio,
  currentAvatar,
  onClose,
  onSuccess,
}: EditProfileModalProps) {
  const [bio, setBio] = useState(currentBio || '');
  const [avatar, setAvatar] = useState(currentAvatar);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [updateUser] = useMutation(UPDATE_USER);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;

    setUploading(true);
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(UPLOAD_URL, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
      setAvatar(data.url);
    } catch (err) {
      console.error('Upload failed', err);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateUser({ variables: { bio, avatar } });

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-900 border border-gray-700 p-8 rounded-xl w-full max-w-md shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">
          ✕
        </button>

        <h2 className="text-2xl font-bold text-white mb-6">Edit Signal</h2>

        {/* Avatar Section */}
        <div className="mb-6 flex items-center gap-4">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-800 border border-white/10 relative">
            {avatar ? (
              <img src={avatar} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">?</div>
            )}
            {/* Loading Overlay */}
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div>
            <label
              className={`bg-gray-800 text-white text-sm px-4 py-2 rounded-lg transition-colors border border-gray-600 ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-700 cursor-pointer'}`}
            >
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
            className="w-full bg-black/50 border border-gray-700 rounded-lg p-3 text-white focus:border-pulse-blue outline-none transition-colors resize-none"
            rows={4}
            value={bio}
            placeholder="Tell the network who you are..."
            onChange={(e) => setBio(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="text-gray-400 hover:text-white px-4 py-2">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className="bg-pulse-blue text-black font-bold px-6 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving && (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            )}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
