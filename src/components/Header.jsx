import React from 'react';

export default function Header({ currentCargo, onSelectCargo, onOpenSearch }) {
  const cargos = [
    { id: 'Presidente', label: 'Presidente', icon: '🏛️' },
    { id: 'Governador', label: 'Governador', icon: '🏢' },
    { id: 'Senador', label: 'Senado (2 Vagas)', icon: '⚖️' }
  ];

  return (
    <header className="hud-top" id="hudTop">
      <div className="brand">
        <div className="brand-badge">
          <img src="/assets/abstencao.svg" alt="Ícone Abstenção" className="brand-icon" />
          <span className="pulse-dot"></span>
        </div>
        <div className="brand-text">
          <h1 className="brand-title">Candidato 00: <em>Abstenção</em></h1>
          <span className="brand-sub">Eleições Gerais 2026 · Fonte: TSE</span>
        </div>
      </div>

      {/* Cargo Switcher */}
      <nav className="cargo-switch" role="tablist" aria-label="Selecione o cargo">
        {cargos.map(c => (
          <button
            key={c.id}
            className={`cargo-btn ${currentCargo === c.id ? 'active' : ''}`}
            role="tab"
            aria-selected={currentCargo === c.id}
            onClick={() => onSelectCargo(c.id)}
          >
            <span className="cargo-icon">{c.icon}</span>
            <span className="cargo-label">{c.label}</span>
          </button>
        ))}
      </nav>
    </header>
  );
}
