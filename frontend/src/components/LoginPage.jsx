import { useState } from 'react';
import React from 'react';
import { useLang } from '../i18n.js';
import ModalCard from './ModalCard.jsx';

const GITHUB = 'https://github.com/oweebee/kangbangaming';
const DISCORD_FALLBACK_URL  = 'https://discord.gg/9mXpM9wv';
const DISCORD_FALLBACK_ICON = 'https://cdn.discordapp.com/icons/983316258302877747/ebcf20448ef8818f93e8f31afad9f8d9.webp?size=64';

function DiscordServerIcon({ size = 22, borderColor = 'var(--surface1)', iconUrl = '' }) {
  const [err, setErr] = React.useState(false);
  const src = iconUrl || DISCORD_FALLBACK_ICON;
  if (err) return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#5865f2', marginLeft: -(size * 0.2), position: 'relative', zIndex: 2, border: `2px solid ${borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
      <svg viewBox="0 0 127.14 96.36" xmlns="http://www.w3.org/2000/svg" style={{ width: '70%', height: '70%', fill: '#fff' }}><path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/></svg>
    </div>
  );
  return <img src={src} alt="" onError={() => setErr(true)} style={{ width: size, height: size, borderRadius: '50%', marginLeft: -(size * 0.2), position: 'relative', zIndex: 2, border: `2px solid ${borderColor}`, flexShrink: 0 }} />;
}

export default function LoginPage({ onLogin, steamError = '', discordConfig = {} }) {
  const { t } = useLang();
  const [showAdmin, setShowAdmin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const discordUrl  = discordConfig.discordUrl  || DISCORD_FALLBACK_URL;
  const discordIcon = discordConfig.discordIconUrl || '';

  async function handleAdminLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Identifiants incorrects');
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 }}>
      <ModalCard style={{ borderRadius: 16, padding: '44px 36px 32px', width: '100%', maxWidth: 380 }}>

        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 36 }}>
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
            <svg viewBox="0 0 496 512" xmlns="http://www.w3.org/2000/svg" style={{ width: 40, height: 40, position: 'relative', zIndex: 1 }}>
              <defs>
                <clipPath id="loginLogoClip">
                  <path d="M496 256c0 137-111.2 248-248.4 248-113.8 0-209.7-76.3-239-180.4l95.2 39.3c6.4 32.1 34.9 56.4 68.9 56.4 38.2 0 69.1-31.1 68.9-69.3l84.5-60.2c52.1 1.3 95.8-40.9 95.8-93.5 0-51.6-42-93.5-93.7-93.5s-93.7 42-93.7 93.5v1.2L176.6 279c-15.5-.9-30.7 3.4-43.5 12.1L0 236.1C10.2 108.4 117.1 8 247.6 8 384.8 8 496 119 496 256zM155.7 384.3l-30.5-12.6a52.79 52.79 0 0 0 27.2 25.8c26.9 11.2 57.8-1.6 69-28.4 5.4-13 5.5-27.3.1-40.3-5.4-13-15.5-23.2-28.5-28.6-12.7-5.3-26.4-5.5-38.8-1.4l31.5 13c19.8 8.2 29.2 30.9 20.9 50.7-8.3 19.9-31 29.2-50.9 21zm173.8-129.9c-34.4 0-62.4-28-62.4-62.3s28-62.3 62.4-62.3 62.4 28 62.4 62.3-27.9 62.3-62.4 62.3zm.1-15.6c25.9 0 46.9-21 46.9-46.8 0-25.9-21-46.8-46.9-46.8s-46.9 21-46.9 46.8c.1 25.8 21.1 46.8 46.9 46.8z" />
                </clipPath>
              </defs>
              <circle cx="248" cy="256" r="244" fill="#000" />
              <path d="M496 256c0 137-111.2 248-248.4 248-113.8 0-209.7-76.3-239-180.4l95.2 39.3c6.4 32.1 34.9 56.4 68.9 56.4 38.2 0 69.1-31.1 68.9-69.3l84.5-60.2c52.1 1.3 95.8-40.9 95.8-93.5 0-51.6-42-93.5-93.7-93.5s-93.7 42-93.7 93.5v1.2L176.6 279c-15.5-.9-30.7 3.4-43.5 12.1L0 236.1C10.2 108.4 117.1 8 247.6 8 384.8 8 496 119 496 256zM155.7 384.3l-30.5-12.6a52.79 52.79 0 0 0 27.2 25.8c26.9 11.2 57.8-1.6 69-28.4 5.4-13 5.5-27.3.1-40.3-5.4-13-15.5-23.2-28.5-28.6-12.7-5.3-26.4-5.5-38.8-1.4l31.5 13c19.8 8.2 29.2 30.9 20.9 50.7-8.3 19.9-31 29.2-50.9 21zm173.8-129.9c-34.4 0-62.4-28-62.4-62.3s28-62.3 62.4-62.3 62.4 28 62.4 62.3-27.9 62.3-62.4 62.3zm.1-15.6c25.9 0 46.9-21 46.9-46.8 0-25.9-21-46.8-46.9-46.8s-46.9 21-46.9 46.8c.1 25.8 21.1 46.8 46.9 46.8z" fill="var(--accent)" stroke="var(--accent-dim)" strokeWidth="9" strokeLinejoin="round" />
              <g clipPath="url(#loginLogoClip)">
                <ellipse cx="180" cy="130" rx="100" ry="80" fill="#e8813a" />
              </g>
            </svg>
            <DiscordServerIcon size={36} borderColor="var(--surface1)" iconUrl={discordIcon} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: '0.04em', color: 'var(--text)', textAlign: 'center' }}>KangBanGaming</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 3 }}>{t('login.subtitle')}</div>
          </div>
        </div>

        {/* Erreur Steam */}
        {(steamError || error) && (
          <div style={{ background: 'rgba(220,50,50,.15)', border: '1px solid rgba(220,50,50,.4)', borderRadius: 8, padding: '8px 12px', color: '#f88', fontSize: 13, marginBottom: 16 }}>
            {(steamError ? t(steamError) : null) || error}
          </div>
        )}

        {/* Bouton Steam principal */}
        <a href="/api/auth/steam" style={{ textDecoration: 'none', display: 'block' }}>
          <button type="button" style={{
            width: '100%', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            background: '#1b2838', border: '1px solid #2a475e', borderRadius: 10,
            color: '#c6d4df', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            transition: 'all .15s', boxShadow: '0 2px 12px rgba(0,0,0,.3)',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = '#2a475e'; e.currentTarget.style.borderColor = '#4a7fa5'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#1b2838'; e.currentTarget.style.borderColor = '#2a475e'; }}
          >
            <svg viewBox="0 0 496 512" xmlns="http://www.w3.org/2000/svg" style={{ width: 22, height: 22, fill: '#c6d4df' }}>
              <path d="M496 256c0 137-111.2 248-248.4 248-113.8 0-209.7-76.3-239-180.4l95.2 39.3c6.4 32.1 34.9 56.4 68.9 56.4 38.2 0 69.1-31.1 68.9-69.3l84.5-60.2c52.1 1.3 95.8-40.9 95.8-93.5 0-51.6-42-93.5-93.7-93.5s-93.7 42-93.7 93.5v1.2L176.6 279c-15.5-.9-30.7 3.4-43.5 12.1L0 236.1C10.2 108.4 117.1 8 247.6 8 384.8 8 496 119 496 256zM155.7 384.3l-30.5-12.6a52.79 52.79 0 0 0 27.2 25.8c26.9 11.2 57.8-1.6 69-28.4 5.4-13 5.5-27.3.1-40.3-5.4-13-15.5-23.2-28.5-28.6-12.7-5.3-26.4-5.5-38.8-1.4l31.5 13c19.8 8.2 29.2 30.9 20.9 50.7-8.3 19.9-31 29.2-50.9 21zm173.8-129.9c-34.4 0-62.4-28-62.4-62.3s28-62.3 62.4-62.3 62.4 28 62.4 62.3-27.9 62.3-62.4 62.3zm.1-15.6c25.9 0 46.9-21 46.9-46.8 0-25.9-21-46.8-46.9-46.8s-46.9 21-46.9 46.8c.1 25.8 21.1 46.8 46.9 46.8z"/>
            </svg>
            {t('login.steam_btn')}
          </button>
        </a>

        <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>
          {t('login.first_time')}
        </div>

        <div style={{ marginTop: 10, background: 'rgba(102,192,244,0.07)', border: '1px solid rgba(102,192,244,0.25)', borderRadius: 8, padding: '8px 12px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#66c0f4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {t('login.steam_note')}{' '}
            <a href="https://help.steampowered.com/fr/faqs/view/588C-C67D-0251-C276" target="_blank" rel="noreferrer" style={{ color: '#66c0f4', textDecoration: 'underline' }}>{t('login.steam_how')}</a>
          </div>
        </div>

        {/* Discord + GitHub */}
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center', gap: 12 }}>
          <a href={discordUrl} target="_blank" rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(88,101,242,.15)', border: '1px solid rgba(88,101,242,.35)', borderRadius: 8, color: '#7289da', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
            <svg viewBox="0 0 127.14 96.36" xmlns="http://www.w3.org/2000/svg" style={{ width: 14, height: 14, fill: 'currentColor' }}>
              <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
            </svg>
            Discord
          </a>
          <a href={GITHUB} target="_blank" rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 8, color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ width: 14, height: 14, fill: 'currentColor' }}>
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
            </svg>
            GitHub
          </a>
        </div>

        {/* Accès admin — discret */}
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <button onClick={() => { setShowAdmin(v => !v); setError(''); }}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 10, cursor: 'pointer', opacity: 0.35, padding: '4px 8px', letterSpacing: '0.04em' }}>
            {t('login.admin_toggle')}
          </button>
        </div>

        {showAdmin && (
          <form onSubmit={handleAdminLogin} style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10, padding: '14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{t('login.admin_title')}</div>
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder={t('login.username')} autoFocus required
              style={{ padding: '8px 10px', background: 'var(--surface1)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text)', fontSize: 13, outline: 'none' }} />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t('login.password')} required
              style={{ padding: '8px 10px', background: 'var(--surface1)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text)', fontSize: 13, outline: 'none' }} />
            {error && <div style={{ color: '#f88', fontSize: 12 }}>{error}</div>}
            <button type="submit" disabled={loading}
              style={{ padding: '8px', background: 'var(--accent)', border: 'none', borderRadius: 7, color: '#fff', fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? '…' : t('login.connect')}
            </button>
          </form>
        )}
      </ModalCard>
    </div>
  );
}
