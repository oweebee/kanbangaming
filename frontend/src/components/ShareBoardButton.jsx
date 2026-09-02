import { useState } from 'react';
import { useLang } from '../i18n.js';

// ── Bouton "partager ce board" ───────────────────────────────────────────────
// Copie (ou ouvre le partage natif) l'URL directe du board :
// https://<domaine>/board/<id>. Indispensable en PWA installée, où la barre
// d'adresse n'existe pas et où l'URL n'est donc pas récupérable à la main.
export default function ShareBoardButton({ boardId, boardName, compact = false }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  if (!boardId) return null;

  const url = `${window.location.origin}/board/${boardId}`;
  const flash = () => { setCopied(true); setTimeout(() => setCopied(false), 1800); };

  // Filet pour les contextes sans API Clipboard (http non securise, vieux
  // WebView Android) : textarea temporaire + execCommand, puis prompt en dernier
  // recours pour que l'utilisateur puisse toujours copier le lien a la main.
  const copyFallback = () => {
    try {
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      flash();
    } catch {
      window.prompt(t('board.share'), url);
    }
  };

  const handleClick = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: boardName || 'KangBanGaming', url }); return; }
      catch (e) { if (e?.name === 'AbortError') return; } // partage annule par l'utilisateur
    }
    if (navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(url); flash(); return; } catch {}
    }
    copyFallback();
  };

  const base = {
    borderRadius: 6,
    cursor: 'pointer',
    flexShrink: 0,
    background: copied ? 'rgba(61,184,106,.18)' : (compact ? 'rgba(255,255,255,.06)' : 'var(--surface2)'),
    border: `1px solid ${copied ? '#3db86a' : 'var(--border)'}`,
    color: copied ? '#3db86a' : 'var(--text-muted)',
  };

  return (
    <button
      onClick={handleClick}
      title={copied ? t('board.link_copied') : t('board.share')}
      style={compact
        ? { ...base, padding: '4px 8px', fontSize: 13, lineHeight: 1 }
        : { ...base, padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
    >
      {compact
        ? (copied ? '✓' : '🔗')
        : (copied ? `✓ ${t('board.link_copied')}` : `🔗 ${t('board.share')}`)}
    </button>
  );
}
