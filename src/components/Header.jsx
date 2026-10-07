import React from 'react';

export default function Header({ currentCargo, onSelectCargo, onOpenSearch }) {
  const cargos = [
    { id: 'Presidente', label: 'Presidente' },
    { id: 'Governador', label: 'Governador' },
    { id: 'Senador', label: 'Senado' }
  ];

  return (
    <header className="hud-top" id="hudTop">
      <div className="brand">
        <div className="brand-badge">
          <img src="/assets/abstencao.svg" alt="Ícone Abstenção" className="brand-icon" />
          <span className="pulse-dot"></span>
        </div>
        <div className="brand-text">
          <h1 className="brand-title">Candidata 00: <em>Candidata Abstenção</em></h1>
          <span className="brand-sub">Eleições Gerais 2026 · Fonte: TSE</span>
        </div>
      </div>

      {/* Cargo Switcher */}
      <nav className="cargo-switch" role="tablist" aria-label="Selecione o cargo">
        {cargos.map(c => (
          <button
            key={c.id}
            type="button"
            className={`cargo-btn ${currentCargo === c.id ? 'active' : ''}`}
            role="tab"
            aria-selected={currentCargo === c.id}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSelectCargo(c.id);
            }}
          >
            <span className="cargo-label">{c.label}</span>
          </button>
        ))}
      </nav>

      <div className="header-right-spacer" aria-hidden="true" />
    </header>
  );
}
