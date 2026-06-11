/**
 * UserProfile — User profile modal panel.
 *
 * Shows the current user's identity info (Firebase Auth)
 * and allows editing display name. Uses FloatingPanel modal
 * to match the design language of ProjectSettings.
 */

import { useState, useEffect } from 'react';
import { X, Save, User, Mail, Shield, CheckCircle2 } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { FloatingPanel } from '../FloatingPanel/FloatingPanel';
import { useAuth } from '../../context/AuthContext';
import './UserProfile.css';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfile({ isOpen, onClose }: UserProfileProps) {
  const { user, role, isEmailVerified } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form when opened
  useEffect(() => {
    if (isOpen && user) {
      setDisplayName(user.displayName || '');
      setError(null);
      setSaved(false);
    }
  }, [isOpen, user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await updateProfile(user, { displayName: displayName.trim() || null });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const initial = (user?.displayName || user?.email?.split('@')[0] || 'U').charAt(0).toUpperCase();
  const email = user?.email || 'No email';
  const hasChanges = displayName !== (user?.displayName || '');

  if (!isOpen) return null;

  return (
    <FloatingPanel variant="modal" isOpen={isOpen} onClose={onClose} width="min(480px, 90vw)">
      <div className="nords-user-profile">
        <header className="nords-user-profile__header">
          <h2 className="nords-user-profile__title">Profile</h2>
          <button className="nords-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={2} />
          </button>
        </header>

        <div className="nords-user-profile__content">
          {/* Avatar + Identity */}
          <div className="nords-user-profile__identity">
            <div className="nords-user-profile__avatar">{initial}</div>
            <div className="nords-user-profile__identity-info">
              <span className="nords-user-profile__name">{user?.displayName || 'No name set'}</span>
              <span className="nords-user-profile__email">
                <Mail size={12} />
                {email}
              </span>
            </div>
          </div>

          {/* Status badges */}
          <div className="nords-user-profile__badges">
            <span className="nords-user-profile__badge nords-user-profile__badge--role">
              <Shield size={11} />
              {role || 'member'}
            </span>
            {isEmailVerified && (
              <span className="nords-user-profile__badge nords-user-profile__badge--verified">
                <CheckCircle2 size={11} />
                Verified
              </span>
            )}
          </div>

          {/* Editable fields */}
          <div className="nords-user-profile__form">
            <div className="nords-form__field">
              <label className="nords-form__label">
                <User size={12} />
                Display Name
              </label>
              <input
                className="nords-form__input"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name…"
              />
            </div>

            <div className="nords-form__field">
              <label className="nords-form__label">
                <Mail size={12} />
                Email Address
              </label>
              <input
                className="nords-form__input nords-form__input--readonly"
                type="email"
                value={email}
                readOnly
                tabIndex={-1}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="nords-user-profile__error">{error}</div>
          )}
        </div>

        {/* Footer with save */}
        <footer className="nords-user-profile__footer">
          <button
            className="nords-form__btn nords-form__btn--primary"
            onClick={handleSave}
            disabled={saving || !hasChanges}
          >
            {saving ? 'Saving…' : saved ? '✓ Saved' : <><Save size={14} /> Save Changes</>}
          </button>
        </footer>
      </div>
    </FloatingPanel>
  );
}

export default UserProfile;
