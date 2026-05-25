import { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff, Key } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { FirebaseError } from 'firebase/app';
import { signUpEmail, signInGoogle, signOut, auth } from '../../lib/firebase';
import { getAuthErrorMessage } from './authErrors';
import { GoogleIcon } from './GoogleIcon';
import NordsLogo from '../NordsLogo';
import { config } from '../../config/env';
import './AuthScreen.css';

export default function SignupScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteKey, setInviteKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  /**
   * After Firebase auth completes, call our registration endpoint
   * to validate the invite key and provision the account.
   */
  const registerWithServer = async (inviteKeyValue: string): Promise<boolean> => {
    const currentUser = auth.currentUser;
    if (!currentUser) return false;

    const token = await currentUser.getIdToken();
    const res = await fetch(`${config.api.url}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ invite_key: inviteKeyValue }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Registration failed' }));
      throw new Error(data.error || 'Registration failed');
    }

    return true;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) {
      setError('Please fill out all fields.');
      return;
    }
    if (!inviteKey.trim()) {
      setError('Invite key is required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // 1. Create Firebase account
      await signUpEmail(email, password, name);

      // 2. Validate invite key + provision on our server
      try {
        await registerWithServer(inviteKey.trim());
      } catch (regErr: any) {
        // Invalid invite key — sign the user OUT of Firebase and show error
        await signOut();
        setError(regErr.message || 'Invalid invite key');
        setLoading(false);
        return;
      }

      navigate('/verify-email', { replace: true });
    } catch (err: unknown) {
      if (err instanceof FirebaseError) {
        setError(getAuthErrorMessage(err.code));
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    if (!inviteKey.trim()) {
      setError('Please enter your invite key first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // 1. Google OAuth
      await signInGoogle();

      // 2. Validate invite key + provision
      try {
        await registerWithServer(inviteKey.trim());
      } catch (regErr: any) {
        await signOut();
        setError(regErr.message || 'Invalid invite key');
        setLoading(false);
        return;
      }

      navigate('/', { replace: true });
    } catch (err: unknown) {
      if (err instanceof FirebaseError && err.code !== 'auth/popup-closed-by-user') {
        setError(getAuthErrorMessage(err.code));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="nords-auth-overlay" data-testid="signup-screen" data-theme="obsidian">
      <div className="nords-auth-card">
        <div className="nords-auth__logo">
          <NordsLogo size={36} />
        </div>
        <p className="nords-auth__tagline">The pragmatic graph.</p>
        <h2 className="nords-auth__title">Create your account</h2>

        {error && (
          <div
            className="nords-auth__error"
            data-testid="signup-error"
            style={{ color: 'var(--nords-color-error)', marginBottom: '16px', fontSize: '13px' }}
          >
            {error}
          </div>
        )}

        <form className="nords-auth__form" onSubmit={handleSignup} data-testid="signup-form">
          {/* Invite Key — first field, prominent */}
          <div className="nords-auth__field">
            <label className="nords-auth__label" htmlFor="signup-invite-key">Invite Key</label>
            <div className="nords-auth__input-wrap">
              <Key size={14} strokeWidth={1.6} className="nords-auth__input-icon" />
              <input
                id="signup-invite-key"
                type="text"
                className="nords-auth__input"
                placeholder="Enter your invite key"
                value={inviteKey}
                onChange={e => setInviteKey(e.target.value)}
                autoComplete="off"
                data-testid="signup-invite-key-input"
              />
            </div>
          </div>

          <div className="nords-auth__field">
            <label className="nords-auth__label" htmlFor="signup-name">Full Name</label>
            <div className="nords-auth__input-wrap">
              <User size={14} strokeWidth={1.6} className="nords-auth__input-icon" />
              <input
                id="signup-name"
                type="text"
                className="nords-auth__input"
                placeholder="Jane Doe"
                value={name}
                onChange={e => setName(e.target.value)}
                autoComplete="name"
                data-testid="signup-name-input"
              />
            </div>
          </div>

          <div className="nords-auth__field">
            <label className="nords-auth__label" htmlFor="signup-email">Email</label>
            <div className="nords-auth__input-wrap">
              <Mail size={14} strokeWidth={1.6} className="nords-auth__input-icon" />
              <input
                id="signup-email"
                type="email"
                className="nords-auth__input"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                data-testid="signup-email-input"
              />
            </div>
          </div>

          <div className="nords-auth__field">
            <label className="nords-auth__label" htmlFor="signup-password">Password</label>
            <div className="nords-auth__input-wrap">
              <Lock size={14} strokeWidth={1.6} className="nords-auth__input-icon" />
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                className="nords-auth__input"
                placeholder="Min 8 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                data-testid="signup-password-input"
              />
              <button
                type="button"
                className="nords-auth__reveal"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                data-testid="signup-toggle-password"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <p className="nords-auth__hint">Must be at least 8 characters</p>
          </div>

          <button type="submit" className="nords-auth__submit" disabled={loading} data-testid="signup-submit-btn">
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="nords-auth__divider">
          <span>or</span>
        </div>

        <button
          className="nords-auth__sso-btn"
          type="button"
          onClick={handleGoogleSignup}
          disabled={loading}
          data-testid="signup-google-btn"
        >
          <GoogleIcon />
          <span>Sign up with Google</span>
        </button>

        <p className="nords-auth__switch">
          Already have an account?{' '}
          <Link to="/login" className="nords-auth__switch-btn" data-testid="signup-login-link">
            Sign in
          </Link>
        </p>

        <p className="nords-auth__legal">
          By creating an account, you agree to our{' '}
          <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
