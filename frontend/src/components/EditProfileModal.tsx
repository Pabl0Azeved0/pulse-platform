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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="card shadow-pop p-8 w-full max-w-md relative animate-fade-up">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 text-ink-subtle hover:text-ink transition-colors cursor-pointer"
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <h2 className="text-xl font-bold tracking-tight text-ink mb-6">Edit Profile</h2>

        {/* Avatar Section */}
        <div className="mb-6 flex items-center gap-4">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-surface-hover border border-line relative">
            {avatar ? (
              <img src={avatar} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-ink-subtle">
                ?
              </div>
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
              className={`btn-secondary text-sm ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {uploading ? 'Uploading…' : 'Change Avatar'}
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
          <label htmlFor="bio" className="label">
            Bio
          </label>
          <textarea
            id="bio"
            className="input resize-none"
            rows={4}
            value={bio}
            placeholder="Tell people who you are..."
            onChange={(e) => setBio(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || uploading} className="btn-primary">
            {saving && (
              <span className="w-4 h-4 border-2 border-accent-ink/40 border-t-accent-ink rounded-full animate-spin" />
            )}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
