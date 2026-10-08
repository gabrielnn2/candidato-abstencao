import React, { useState } from 'react';

export default function ShareModal({
  isOpen,
  onClose,
  currentCargo,
  currentScope
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const getScopeName = () => {
    if (currentScope?.type === 'brasil') return 'no Brasil';
    if (currentScope?.type === 'uf') return `em ${currentScope.item?.nome || currentScope.id}`;
    if (currentScope?.type === 'municipio') return `em ${currentScope.item?.nome} (${currentScope.item?.uf})`;
    return '';
  };

  const shareHeadline = `E se a Candidata Abstenção fosse candidata a ${currentCargo} ${getScopeName()}?`;
  const shareData = `Descubra o impacto real dos eleitores ausentes com dados oficiais do TSE nas Eleições 2026.`;
  const shareUrl = window.location.href;

  const handleCopy = () => {
    navigator.clipboard.writeText(`${shareHeadline}\n${shareData}\n${shareUrl}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  const handleTwitter = () => {
    const text = encodeURIComponent(`🚨 ${shareHeadline}\n\n${shareData}`);
    const url = encodeURIComponent(shareUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`🚨 *${shareHeadline}*\n\n${shareData}\n\nConfira: ${shareUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="share-modal-backdrop open" onClick={onClose}>
      <div className="share-modal-box glass-panel" onClick={e => e.stopPropagation()}>
        <div className="share-header">
          <h3 className="share-title">Compartilhar Veredito Eleitoral</h3>
          <button className="btn-close-modal" onClick={onClose} title="Fechar (Esc)">✕</button>
        </div>

        <div className="share-preview-card">
          <div className="share-preview-badge">E SE A CANDIDATA ABSTENÇÃO FOSSE CANDIDATA? · 2026</div>
          <div className="share-preview-thumb-wrap">
            <img src="/assets/og-mapa.png" alt="Prévia do Mapa Eleitoral" className="share-preview-thumb" />
          </div>
          <div className="share-preview-headline">"{shareHeadline}"</div>
          <div className="share-preview-data">{shareData}</div>
        </div>

        <div className="share-buttons-grid">
          <button type="button" className="btn-share-channel whatsapp" onClick={handleWhatsApp}>
            💬 WhatsApp
          </button>
          <button type="button" className="btn-share-channel twitter" onClick={handleTwitter}>
            𝕏 Twitter / X
          </button>
          <button type="button" className="btn-share-channel copy" onClick={handleCopy}>
            📋 {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>

        {copied && (
          <div style={{ textAlign: 'center', color: 'var(--gold)', fontSize: '0.82rem', fontWeight: 500 }}>
            ✓ Link e texto copiados para a área de transferência!
          </div>
        )}
      </div>
    </div>
  );
}
