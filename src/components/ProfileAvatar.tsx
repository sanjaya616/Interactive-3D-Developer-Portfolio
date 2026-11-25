import React, { useEffect, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { DEVELOPER_PROFILE } from '../data/profileData';

const PROFILE_PHOTO_KEY = 'sanjaya_world_profile_photo_v1';

interface ProfileAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  allowUpload?: boolean;
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  size = 'md',
  allowUpload = false,
}) => {
  const [customPhoto, setCustomPhoto] = useState<string | null>(() => {
    try {
      return typeof window !== 'undefined'
        ? window.localStorage.getItem(PROFILE_PHOTO_KEY)
        : null;
    } catch {
      return null;
    }
  });
  const [publicImgFailed, setPublicImgFailed] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const sync = () => {
      try {
        setCustomPhoto(window.localStorage.getItem(PROFILE_PHOTO_KEY));
      } catch {
        // Ignore storage read errors
      }
    };
    window.addEventListener('sanjaya-profile-photo-updated', sync);
    return () => window.removeEventListener('sanjaya-profile-photo-updated', sync);
  }, []);

  const src =
    customPhoto ||
    (!publicImgFailed && DEVELOPER_PROFILE.profileImagePath
      ? DEVELOPER_PROFILE.profileImagePath
      : null);

  const dims =
    size === 'sm'
      ? 'w-14 h-14 text-xl rounded-xl'
      : size === 'lg'
        ? 'w-28 h-28 sm:w-32 sm:h-32 text-4xl rounded-2xl'
        : 'w-20 h-20 text-2xl rounded-2xl';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        try {
          window.localStorage.setItem(PROFILE_PHOTO_KEY, reader.result);
          window.dispatchEvent(new Event('sanjaya-profile-photo-updated'));
        } catch {
          // Fallback to component state only if storage quota exceeded
        }
        setCustomPhoto(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="inline-flex flex-col items-start gap-2 shrink-0">
      <div
        className={`${dims} overflow-hidden border-2 border-[#26211E] bg-[#F5E9D4] shadow-[0_3px_0_#26211E] flex items-center justify-center relative`}
      >
        {src ? (
          <img
            src={src}
            alt={DEVELOPER_PROFILE.name}
            className="w-full h-full object-cover"
            onError={() => {
              if (!customPhoto) setPublicImgFailed(true);
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#EC6D2C] text-[#FFF9F0]">
            <span className="font-display font-bold leading-none">
              {DEVELOPER_PROFILE.initials}
            </span>
          </div>
        )}
      </div>

      {allowUpload && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FFF9F0] border border-[#26211E] text-[11px] font-extrabold text-[#26211E] hover:bg-[#F5E9D4] transition-colors cursor-pointer"
          >
            <Upload className="w-3 h-3 text-[#EC6D2C]" />
            <span>{src ? 'Change profile.png' : 'Upload profile.png'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
