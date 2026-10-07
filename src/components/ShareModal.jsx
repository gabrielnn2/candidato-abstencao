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
    if (currentScope.type === 'brasil') return 'no Brasil';
    if (currentScope.type === 'uf') return `em ${currentScope.item?.nome || currentScope.id}`;
    if (currentScope.type === 'municipio') return `em ${currentScope.item?.nome} (${currentScope.item?.uf})`;
    return '';
  };

  const shareText = `E se a Candidata Abstenção fosse candidata a ${currentCargo} ${getScopeName()}? Descubra o ranking real dos eleitores ausentes com dados do TSE nas Eleições 2026!`;
  const shareUrl = window.location.href;

  const handleCopy = () => {
    navigator.clipboard.writeText(`${shareText}\n${shareUrl}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  const handleTwitter = () => {
    const text = encodeURIComponent(shareText);
    const url = encodeURIComponent(shareUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  return (
    <div className="search-modal-backdrop" onClick={onClose}>
      <div className="share-modal glass-panel" onClick={e => e.stopPropagation()}>
        <div className="share-modal-header">
          <h3 className="share-modal-title">Compartilhar Veredito Eleitoral</h3>
          <button className="search-modal-close" onClick={onClose} title="Fechar">✕</button>
        </div>

        <div className="share-card-preview">
          <div className="share-preview-badge">E SE A CANDIDATA ABSTENÇÃO FOSSE CANDIDATA? · 2026</div>
          <p className="share-preview-text">"{shareText}"</p>
          <span className="share-preview-url">{shareUrl}</span>
        </div>

        <div className="share-buttons-grid">
          <button className="share-action-btn btn-copy" onClick={handleCopy}>
            📋 {copied ? 'Copiado para a Área de Transferência!' : 'Copiar Texto e Link'}
          </button>
          <button className="share-action-btn btn-twitter" onClick={handleTwitter}>
            𝕏 Compartilhar no X (Twitter)
          </button>
        </div>
      </div>
    </div>
  );
}
