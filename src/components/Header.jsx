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
          <h1 className="brand-title">E se a <em>Abstenção</em> fosse candidata?</h1>
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

      <div className="header-right-action">
        <a
          href="https://www.linkedin.com/in/gabrielnn"
          target="_blank"
          rel="noopener noreferrer"
          className="header-linkedin-link"
          title="Conectar no LinkedIn (Gabriel)"
          aria-label="Perfil no LinkedIn de Gabriel"
        >
          <svg
            className="linkedin-icon"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.45 1.45 0 0 0 1.46-1.45 1.46 1.46 0 1 0-1.46 1.45m1.39 9.74v-8.37H5.07v8.37h2.78z" />
          </svg>
        </a>
      </div>
    </header>
  );
}
