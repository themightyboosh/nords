import { useEffect, useState } from 'react';
import { Mail, RefreshCw, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { sendVerification } from '../../lib/firebase';
import NordsLogo from '../NordsLogo';
import './AuthScreen.css';

export default function VerifyEmailScreen() {
  const { user, isEmailVerified, logout } = useAuth();
  const navigate = useNavigate();
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isEmailVerified) {
      navigate('/');
      return;
    }

    const interval = setInterval(async () => {
      if (user) {
        await user.reload();
        if (user.emailVerified) {
          clearInterval(interval);
          navigate('/');
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [user, isEmailVerified, navigate]);

  const handleResend = async () => {
    setResending(true);
    setMessage('');
    try {
      await sendVerification();
      setMessage('Verification email sent! Check your inbox.');
    } catch (_err: unknown) {
      setMessage('Too many requests. Please try again later.');
    } finally {
      setResending(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="nords-auth-overlay" data-testid="verify-email-screen" data-theme="obsidian">
      <div className="nords-auth-card" style={{ textAlign: 'center' }}>
        <div className="nords-auth__logo" style={{ justifyContent: 'center' }}>
          <NordsLogo size={36} />
        </div>
        
        <div style={{ margin: '24px 0', display: 'flex', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'var(--nords-color-bg-panel)', padding: '16px', borderRadius: '50%' }}>
            <Mail size={32} strokeWidth={1.5} color="var(--nords-color-accent)" />
          </div>
        </div>

        <h2 className="nords-auth__title">Verify your email</h2>
        <p className="nords-auth__tagline" style={{ marginBottom: '24px' }}>
          We sent a verification link to <strong>{user?.email}</strong>.<br />
          Please click the link to activate your account.
        </p>

        {message && (
          <div
            data-testid="verify-message"
            style={{ marginBottom: '16px', color: 'var(--nords-color-accent-dim)', fontSize: '13px' }}
          >
            {message}
          </div>
        )}

        <button 
          className="nords-auth__sso-btn" 
          type="button" 
          onClick={handleResend}
          disabled={resending}
          style={{ justifyContent: 'center', marginBottom: '16px' }}
          data-testid="verify-resend-btn"
        >
          <RefreshCw size={16} strokeWidth={1.5} className={resending ? 'nords-spin' : ''} />
          <span>{resending ? 'Sending...' : 'Resend verification email'}</span>
        </button>

        <button 
          className="nords-auth__switch-btn" 
          type="button" 
          onClick={handleLogout}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          data-testid="verify-logout-btn"
        >
          <LogOut size={14} />
          <span>Sign out and try another account</span>
        </button>
      </div>
    </div>
  );
}
