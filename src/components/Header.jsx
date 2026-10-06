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

      {/* Search and Actions */}
      <div className="hud-actions">
        <button
          className="search-trigger-btn"
          id="searchTriggerBtn"
          title="Buscar cidade ou estado (Ctrl+K)"
          onClick={onOpenSearch}
        >
          <svg className="search-icon" viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <span className="search-btn-text">Buscar Município...</span>
          <kbd className="kbd-shortcut">⌘K</kbd>
        </button>
      </div>
    </header>
  );
}
