import { useState } from 'react';
import { Mail, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FirebaseError } from 'firebase/app';
import { resetPassword } from '../../lib/firebase';
import { getAuthErrorMessage } from './authErrors';
import NordsLogo from '../NordsLogo';
import './AuthScreen.css';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await resetPassword(email);
      setSuccess(true);
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

  return (
    <div className="nords-auth-overlay" data-testid="forgot-password-screen" data-theme="obsidian">
      <div className="nords-auth-card">
        <div className="nords-auth__logo">
          <NordsLogo size={36} />
        </div>
        <p className="nords-auth__tagline">The pragmatic graph.</p>
        <h2 className="nords-auth__title">Reset Password</h2>

        {success ? (
          <div style={{ textAlign: 'center', margin: '24px 0' }} data-testid="forgot-success">
            <p style={{ marginBottom: '24px', color: 'var(--nords-color-text-secondary)' }}>
              If an account exists for <strong>{email}</strong>, we&apos;ve sent instructions to reset your password.
            </p>
            <Link
              to="/login"
              className="nords-auth__submit"
              style={{ display: 'inline-block', textDecoration: 'none' }}
              data-testid="forgot-return-login"
            >
              Return to Login
            </Link>
          </div>
        ) : (
          <>
            <p style={{ marginBottom: '24px', color: 'var(--nords-color-text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>
              Enter the email address associated with your account and we&apos;ll send you a link to reset your password.
            </p>

            {error && (
              <div
                className="nords-auth__error"
                data-testid="forgot-error"
                style={{ color: 'var(--nords-color-error)', marginBottom: '16px', fontSize: '13px' }}
              >
                {error}
              </div>
            )}

            <form className="nords-auth__form" onSubmit={handleReset} data-testid="forgot-form">
              <div className="nords-auth__field">
                <label className="nords-auth__label" htmlFor="reset-email">Email</label>
                <div className="nords-auth__input-wrap">
                  <Mail size={14} strokeWidth={1.6} className="nords-auth__input-icon" />
                  <input
                    id="reset-email"
                    type="email"
                    className="nords-auth__input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                    data-testid="forgot-email-input"
                  />
                </div>
              </div>

              <button type="submit" className="nords-auth__submit" disabled={loading} data-testid="forgot-submit-btn">
                {loading ? 'Sending link...' : 'Send reset link'}
              </button>
            </form>
          </>
        )}

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <Link
            to="/login"
            className="nords-auth__switch-btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            data-testid="forgot-back-link"
          >
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
