import { useState, useCallback } from 'react';
import { useMutation, gql } from '@apollo/client';
import { useAuth } from './context/AuthContext';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';

// Mutation to save the result
const UPDATE_AVATAR = gql`
  mutation UpdateAvatar($avatarData: String!) {
    updateAvatar(avatarData: $avatarData) {
      avatar
    }
  }
`;

// Helper to generate retro options
const RETRO_STYLES = ['pixel-art', 'bottts', 'identicon', 'retro', 'thumbs'];

export default function Settings() {
  const { user } = useAuth();
  const [updateAvatar, { loading }] = useMutation(UPDATE_AVATAR);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result?.toString() || null);
        setIsCropping(true);
      });
      reader.readAsDataURL(file);
    }
  };

  const createCroppedImage = useCallback(async () => {
    try {
      const image = new Image();
      image.src = imageSrc!;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      await new Promise((resolve) => {
        image.onload = resolve;
      });

      canvas.width = croppedAreaPixels!.width;
      canvas.height = croppedAreaPixels!.height;

      ctx?.drawImage(
        image,
        croppedAreaPixels!.x,
        croppedAreaPixels!.y,
        croppedAreaPixels!.width,
        croppedAreaPixels!.height,
        0,
        0,
        croppedAreaPixels!.width,
        croppedAreaPixels!.height
      );

      return canvas.toDataURL('image/jpeg');
    } catch (e) {
      console.error(e);
      return null;
    }
  }, [imageSrc, croppedAreaPixels]);

  const handleSave = async (avatarData: string) => {
    if (!user) return;
    try {
      await updateAvatar({
        variables: { avatarData },
      });
      const updatedUser = { ...user, avatar: avatarData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  };

  const onCropComplete = (_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const finalizeCrop = async () => {
    const croppedImage = await createCroppedImage();
    if (croppedImage) {
      await handleSave(croppedImage);
      setIsCropping(false);
    }
  };

  return (
    <div className="pt-24 pb-10 max-w-5xl mx-auto px-4">
      <h1 className="text-2xl font-bold tracking-tight text-ink mb-8 border-b border-line pb-4">
        Profile Settings
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* --- LEFT SIDE: UPLOAD & CROP --- */}
        <div className="card p-8">
          <h3 className="text-lg font-semibold text-ink mb-6">Custom Avatar</h3>

          <div className="flex flex-col items-center">
            {/* The Avatar Circle */}
            <div className="relative group w-40 h-40 mb-6">
              {/* Current Image */}
              <div className="w-full h-full rounded-full overflow-hidden border-4 border-accent/60 bg-surface-hover flex items-center justify-center">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-ink-subtle">
                    {user?.username.substring(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Camera Overlay */}
              <label className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                <svg
                  className="h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="text-white text-sm font-semibold">Upload</span>
                <input type="file" className="hidden" accept="image/*" onChange={onFileChange} />
              </label>
            </div>

            <p className="text-sm text-ink-subtle">Click the image to upload a new photo.</p>
          </div>

          {/* CROP MODAL (Shows only when cropping) */}
          {isCropping && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-fade-in">
              <div className="relative w-full max-w-md h-64 bg-surface rounded-lg overflow-hidden mb-4">
                <Cropper
                  image={imageSrc!}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setIsCropping(false)} className="btn-ghost">
                  Cancel
                </button>
                <button onClick={finalizeCrop} disabled={loading} className="btn-primary">
                  {loading && (
                    <span className="w-4 h-4 border-2 border-accent-ink/40 border-t-accent-ink rounded-full animate-spin" />
                  )}
                  {loading ? 'Saving…' : 'Update Avatar'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* --- RIGHT SIDE: RETRO LIBRARY --- */}
        <div className="card p-8">
          <h3 className="text-lg font-semibold text-ink mb-6">Retro Library</h3>
          <p className="text-sm text-ink-subtle mb-6">Feeling nostalgic? Pick a generated style.</p>

          <div className="grid grid-cols-3 gap-4">
            {RETRO_STYLES.map((style) => {
              // Generate a URL based on the username + style
              const url = `https://api.dicebear.com/7.x/${style}/svg?seed=${user?.username}`;

              return (
                <button
                  key={style}
                  onClick={() => handleSave(url)}
                  className="p-2 border border-line rounded-lg hover:border-accent/60 hover:bg-surface-hover transition-all flex flex-col items-center gap-2 cursor-pointer"
                >
                  <img src={url} alt={style} className="w-16 h-16 rounded-full bg-surface-hover" />
                  <span className="text-xs text-ink-muted capitalize">{style}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
