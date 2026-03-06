import { useState, useRef } from 'react';
import { X, Camera, User, Mail, Building, Shield } from 'lucide-react';
import { useAuth } from '../App';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVATAR_OPTIONS = [
  'AJ', 'SW', 'MC', 'ER', 'JW',
  '👤', '👨‍💼', '👩‍💼', '🧑‍💻', '👨‍🎨',
  '🌟', '⭐', '🔥', '💎', '🎯',
  'A', 'B', 'C', 'D', 'E',
  'F', 'G', 'H', 'J', 'K'
];

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, login } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || 'AJ');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || ''
        },
        body: JSON.stringify({ name, avatar })
      });

      if (res.ok) {
        const updatedUser = await res.json();
        login({ ...user!, ...updatedUser });
        onClose();
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarSelect = (newAvatar: string) => {
    setAvatar(newAvatar);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="relative inline-block">
            <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center text-white text-3xl font-bold border-4 border-white/30 mx-auto">
              {avatar}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          <h2 className="text-xl font-bold text-white mt-4">Edit Profile</h2>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <User className="w-4 h-4" />
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Mail className="w-4 h-4" />
              Email
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Building className="w-4 h-4" />
              Department
            </label>
            <input
              type="text"
              value={user?.department || ''}
              disabled
              className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Shield className="w-4 h-4" />
              Role
            </label>
            <input
              type="text"
              value={user?.role || ''}
              disabled
              className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Choose Avatar
            </label>
            <div className="grid grid-cols-5 gap-2 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded-lg">
              {AVATAR_OPTIONS.map((option, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleAvatarSelect(option)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold transition-all ${
                    avatar === option
                      ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                      : 'bg-white text-slate-700 hover:bg-blue-50 border border-slate-200'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 pt-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
