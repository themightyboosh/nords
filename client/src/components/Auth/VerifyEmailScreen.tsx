import { useEffect, useState } from 'react';
import { Mail, RefreshCw, LogOut, Network, Sparkles, User } from 'lucide-react';
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
      <div className="nords-auth-split-card">
        
        {/* MARKETING PANE */}
        <div className="nords-auth-split-card__marketing">
          <div className="nords-auth-split-card__marketing-content">
            <div className="nords-auth__logo" style={{ marginBottom: 24 }}>
              <NordsLogo size={48} />
            </div>
            <h1>A visual knowledge space for AI and Humans.</h1>
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
        <div className="nords-auth-split-card__form-pane" style={{ textAlign: 'center', justifyContent: 'center' }}>
          
          <div style={{ margin: '0 0 24px', display: 'flex', justifyContent: 'center' }}>
            <div style={{ backgroundColor: 'var(--nords-color-bg-panel)', padding: '16px', borderRadius: '50%' }}>
              <Mail size={32} strokeWidth={1.5} color="var(--nords-color-accent)" />
            </div>
          </div>

          <h2 className="nords-auth__title">Verify your email</h2>
          <p style={{ 
            fontFamily: 'var(--nords-font-primary)',
            fontSize: 'var(--nords-font-size-sm)',
            color: 'var(--nords-color-text-secondary)',
            marginBottom: '24px', 
            lineHeight: 1.5 
          }}>
            We sent a verification link to <strong style={{ color: 'var(--nords-color-text-primary)', fontWeight: 600 }}>{user?.email}</strong>.<br />
            Please click the link to activate your account.
          </p>

          {message && (
            <div
              data-testid="verify-message"
              style={{ 
                marginBottom: '16px', 
                color: 'var(--nords-color-accent)', 
                fontSize: 'var(--nords-font-size-sm)',
                fontFamily: 'var(--nords-font-primary)'
              }}
            >
              {message}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '320px', margin: '0 auto' }}>
            <button 
              className="nords-auth__sso-btn" 
              type="button" 
              onClick={handleResend}
              disabled={resending}
              style={{ justifyContent: 'center' }}
              data-testid="verify-resend-btn"
            >
              <RefreshCw size={16} strokeWidth={1.5} className={resending ? 'nords-spin' : ''} />
              <span>{resending ? 'Sending...' : 'Resend verification email'}</span>
            </button>

            <button 
              className="nords-auth__switch-btn" 
              type="button" 
              onClick={handleLogout}
              style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', margin: 0 }}
              data-testid="verify-logout-btn"
            >
              <LogOut size={14} />
              <span>Sign out and try another account</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
