import { useState, useEffect } from 'react';
import { Mail, Lock, User, Eye, EyeOff, Key, Sparkles, Network } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FirebaseError } from 'firebase/app';
import { signInEmail, signInGoogle, signUpEmail, signOut, auth } from '../../lib/firebase';
import { getAuthErrorMessage } from './authErrors';
import { GoogleIcon } from './GoogleIcon';
import NordsLogo from '../NordsLogo';
import { config } from '../../config/env';
import './AuthScreen.css';

interface AuthScreenProps {
  initialMode?: 'login' | 'signup';
}

export default function AuthScreen({ initialMode = 'login' }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  
  // Update internal mode if props change
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteKey, setInviteKey] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * After Firebase auth completes for SIGN UP, call our registration endpoint
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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate inputs
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    if (mode === 'signup') {
      if (!name) {
        setError('Please enter your name.');
        return;
      }
      if (!inviteKey.trim()) {
        setError('Invite key is required.');
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        // --- LOGIN ---
        await signInEmail(email, password);
        const destination = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
        navigate(destination, { replace: true });
      } else {
        // --- SIGNUP ---
        await signUpEmail(email, password, name);
        try {
          await registerWithServer(inviteKey.trim());
        } catch (regErr: any) {
          // Invalid invite key — sign out and show error
          await signOut();
          setError(regErr.message || 'Invalid invite key');
          setLoading(false);
          return;
        }
        navigate('/verify-email', { replace: true });
      }
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

  const handleGoogleAuth = async () => {
    setError(null);
    if (mode === 'signup' && !inviteKey.trim()) {
      setError('Please enter your invite key first.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        // --- LOGIN ---
        await signInGoogle();
        const destination = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
        navigate(destination, { replace: true });
      } else {
        // --- SIGNUP ---
        await signInGoogle();
        try {
          await registerWithServer(inviteKey.trim());
        } catch (regErr: any) {
          await signOut();
          setError(regErr.message || 'Invalid invite key');
          setLoading(false);
          return;
        }
        navigate('/', { replace: true });
      }
    } catch (err: unknown) {
      if (err instanceof FirebaseError && err.code !== 'auth/popup-closed-by-user') {
        setError(getAuthErrorMessage(err.code));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="nords-auth-overlay" data-testid="auth-screen" data-theme="obsidian">
      <div className="nords-auth-split-card">
        
        {/* MARKETING PANE */}
        <div className="nords-auth-split-card__marketing">
          <div className="nords-auth-split-card__marketing-content">
            <div className="nords-auth__logo" style={{ marginBottom: 20 }}>
              <NordsLogo size={64} />
            </div>
            <h1>Think visually, build pragmatically.</h1>
            <p>
              Nords lets you drag, drop, and connect your context and expertise into a structured map that AI can navigate, reason over, and act upon.
            </p>
            <ul className="nords-auth-split-card__features">
              <li>
                <Network className="nords-auth-split-card__feature-icon" size={18} />
                <span><strong>Spatial Canvas</strong> — Build relationships visually, no databases required.</span>
              </li>
              <li>
                <Sparkles className="nords-auth-split-card__feature-icon" size={18} />
                <span><strong>Visual Graph RAG</strong> — Ground AI answers in exact structure and dependencies.</span>
              </li>
              <li>
                <User className="nords-auth-split-card__feature-icon" size={18} />
                <span><strong>Personas</strong> — Inject domain expertise to change how the AI prioritizes.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* FORM PANE */}
        <div className="nords-auth-split-card__form-pane">
          <h2 className="nords-auth__title">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>

          {/* SSO */}
          <button
            className="nords-auth__sso-btn"
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
          >
            <GoogleIcon />
            <span>Continue with Google</span>
          </button>

          <div className="nords-auth__divider">
            <span>or</span>
          </div>

          {error && (
            <div className="nords-auth__error" style={{ color: 'var(--nords-color-error)', width: '100%', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <form className="nords-auth__form" onSubmit={handleAuth}>
            
            {/* SIGNUP ONLY: Invite Key */}
            {mode === 'signup' && (
              <div className="nords-auth__field">
                <label className="nords-auth__label" htmlFor="auth-invite-key">Invite Key</label>
                <div className="nords-auth__input-wrap">
                  <Key size={14} strokeWidth={1.6} className="nords-auth__input-icon" />
                  <input
                    id="auth-invite-key"
                    type="text"
                    className="nords-auth__input"
                    placeholder="Enter your invite key"
                    value={inviteKey}
                    onChange={e => setInviteKey(e.target.value)}
                    autoComplete="off"
                  />
                </div>
              </div>
            )}

            {/* SIGNUP ONLY: Name */}
            {mode === 'signup' && (
              <div className="nords-auth__field">
                <label className="nords-auth__label" htmlFor="auth-name">Full Name</label>
                <div className="nords-auth__input-wrap">
                  <User size={14} strokeWidth={1.6} className="nords-auth__input-icon" />
                  <input
                    id="auth-name"
                    type="text"
                    className="nords-auth__input"
                    placeholder="Jane Doe"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            <div className="nords-auth__field">
              <label className="nords-auth__label" htmlFor="auth-email">Email</label>
              <div className="nords-auth__input-wrap">
                <Mail size={14} strokeWidth={1.6} className="nords-auth__input-icon" />
                <input
                  id="auth-email"
                  type="email"
                  className="nords-auth__input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="nords-auth__field">
              <label className="nords-auth__label" htmlFor="auth-password">Password</label>
              <div className="nords-auth__input-wrap">
                <Lock size={14} strokeWidth={1.6} className="nords-auth__input-icon" />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  className="nords-auth__input"
                  placeholder={mode === 'signup' ? 'Min 8 characters' : '••••••••'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  className="nords-auth__reveal"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {mode === 'login' ? (
                <div className="nords-auth__actions" style={{ marginTop: 8 }}>
                  <button type="button" className="nords-auth__forgot" onClick={() => navigate('/forgot-password')}>
                    Forgot password?
                  </button>
                </div>
              ) : (
                <p className="nords-auth__hint">Must be at least 8 characters</p>
              )}
            </div>

            <button type="submit" className="nords-auth__submit" disabled={loading}>
              {loading ? (mode === 'login' ? 'Signing In...' : 'Creating Account...') : (mode === 'login' ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          {/* TOGGLE MODE */}
          <p className="nords-auth__switch">
            {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              className="nords-auth__switch-btn"
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setError(null);
              }}
            >
              {mode === 'login' ? 'Create one' : 'Sign in'}
            </button>
          </p>

          {mode === 'signup' && (
            <p className="nords-auth__legal">
              By creating an account, you agree to our{' '}
              <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
            </p>
          )}

        </div>
      </div>
    </div>
  );
}
