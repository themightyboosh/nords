/**
 * ShareChat — Public share link page.
 *
 * URL: /share/:token
 * No auth required. Token gates access to the project's AI agent.
 *
 * Layout:
 *   - Desktop (>640px): Dot-grid canvas background with a floating,
 *     draggable, resizable chat window (uses PreviewChat in 'preview' mode
 *     but with shareToken for API routing).
 *   - Mobile (≤640px): Full-screen app-like chat (uses PreviewChat in
 *     'share' mode).
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Bot, Loader2 } from 'lucide-react';
import { PreviewChat, type ShareInfo } from '../../components/PreviewChat/PreviewChat';
import './ShareChat.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/** Breakpoint — below this is "mobile" */
const MOBILE_MAX = 640;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= MOBILE_MAX);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_MAX}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

export function ShareChat() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<ShareInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialSessionId, setInitialSessionId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Read URL query params for variable overrides (e.g. ?user_name=Daniel)
  const urlOverrides = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const overrides: Record<string, string> = {};
    params.forEach((val, key) => { overrides[key] = val; });
    return Object.keys(overrides).length > 0 ? overrides : undefined;
  }, []);

  // Load project info on mount
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/share/info?token=${token}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || 'This link is no longer valid');
          setLoading(false);
          return;
        }
        const data: ShareInfo = await res.json();
        setInfo(data);

        // Eagerly initialize session on page load
        try {
          const initRes = await fetch(`${API_BASE}/api/share/init`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Share-Token': token },
            credentials: 'include',
            body: JSON.stringify({
              ...(urlOverrides ? { url_overrides: urlOverrides } : {}),
            }),
          });
          if (initRes.ok) {
            const initData = await initRes.json();
            setInitialSessionId(initData.sessionId);
          }
        } catch {
          // Non-fatal: chat handler will create session as fallback
        }

        setLoading(false);
      } catch {
        setError('Unable to connect. Please try again.');
        setLoading(false);
      }
    })();
  }, [token]);

  // Set document title
  useEffect(() => {
    if (info?.project_name) {
      document.title = info.project_name;
    }
    return () => { document.title = 'Nords'; };
  }, [info?.project_name]);

  // ── Loading State ──
  if (loading) {
    return (
      <div className="share-canvas share-canvas--center">
        <Loader2 size={32} className="share-canvas__spinner" />
        <span className="share-canvas__label">Connecting…</span>
      </div>
    );
  }

  // ── Error State ──
  if (error || !token) {
    return (
      <div className="share-canvas share-canvas--center share-canvas--col">
        <Bot size={48} />
        <h2 className="share-canvas__error-title">Link Unavailable</h2>
        <p className="share-canvas__error-msg">{error || 'Invalid share link'}</p>
      </div>
    );
  }

  // ── Mobile: full-screen share mode ──
  if (isMobile) {
    return (
      <PreviewChat
        projectId=""
        isOpen={true}
        onClose={() => {}}
        mode="share"
        shareToken={token}
        shareInfo={info}
        urlOverrides={urlOverrides}
        initialSessionId={initialSessionId}
      />
    );
  }

  // ── Desktop: grid canvas + floating preview window ──
  return (
    <div className="share-canvas">
      <PreviewChat
        projectId=""
        isOpen={true}
        onClose={() => {}}
        mode="share"
        shareToken={token}
        shareInfo={info}
        urlOverrides={urlOverrides}
        initialSessionId={initialSessionId}
      />
    </div>
  );
}
