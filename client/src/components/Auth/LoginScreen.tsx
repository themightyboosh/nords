import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { FirebaseError } from 'firebase/app';
import { signInEmail, signInGoogle } from '../../lib/firebase';
import { getAuthErrorMessage } from './authErrors';
import { GoogleIcon } from './GoogleIcon';
import NordsLogo from '../NordsLogo';
import './AuthScreen.css';

export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signInEmail(email, password);
      const destination = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
      navigate(destination, { replace: true });
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

  const handleGoogleLogin = async () => {
    try {
      await signInGoogle();
      const destination = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
      navigate(destination, { replace: true });
    } catch (err: unknown) {
      if (err instanceof FirebaseError && err.code !== 'auth/popup-closed-by-user') {
        setError(getAuthErrorMessage(err.code));
      }
    }
  };

  return (
    <div className="nords-auth-overlay" data-testid="login-screen" data-theme="obsidian">
      <div className="nords-auth-card">
        <div className="nords-auth__logo">
          <NordsLogo size={36} />
        </div>
        <p className="nords-auth__tagline">The pragmatic graph.</p>
        <h2 className="nords-auth__title">Welcome back</h2>

        <button
          className="nords-auth__sso-btn"
          type="button"
          onClick={handleGoogleLogin}
          data-testid="login-google-btn"
        >
          <GoogleIcon />
          <span>Continue with Google</span>
        </button>

        <div className="nords-auth__divider">
          <span>or</span>
        </div>

        {error && (
          <div
            className="nords-auth__error"
            data-testid="login-error"
            style={{ color: 'var(--nords-color-error)', marginBottom: '16px', fontSize: '13px' }}
          >
            {error}
          </div>
        )}

        <form className="nords-auth__form" onSubmit={handleLogin} data-testid="login-form">
          <div className="nords-auth__field">
            <label className="nords-auth__label" htmlFor="login-email">Email</label>
            <div className="nords-auth__input-wrap">
              <Mail size={14} strokeWidth={1.6} className="nords-auth__input-icon" />
              <input
                id="login-email"
                type="email"
                className="nords-auth__input"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                data-testid="login-email-input"
              />
            </div>
          </div>

          <div className="nords-auth__field">
            <label className="nords-auth__label" htmlFor="login-password">Password</label>
            <div className="nords-auth__input-wrap">
              <Lock size={14} strokeWidth={1.6} className="nords-auth__input-icon" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="nords-auth__input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                data-testid="login-password-input"
              />
              <button
                type="button"
                className="nords-auth__reveal"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                data-testid="login-toggle-password"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div className="nords-auth__actions">
            <Link to="/forgot-password" className="nords-auth__forgot" data-testid="login-forgot-link">
              Forgot password?
            </Link>
          </div>

          <button type="submit" className="nords-auth__submit" disabled={loading} data-testid="login-submit-btn">
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <p className="nords-auth__switch">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="nords-auth__switch-btn" data-testid="login-signup-link">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
