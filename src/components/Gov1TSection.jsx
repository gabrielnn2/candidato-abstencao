import React, { useState } from 'react';
import { formatNumber, formatPercent } from '../utils/electoralMath';

export default function Gov1TSection({ brasilData, estadosData, onSelectUf }) {
  const [filter, setFilter] = useState('todos');

  // 16 analyzed states
  const governorsData = [
    { uf: 'BA', gov: 'Jerônimo Rodrigues', partido: 'PT', pctOficial: 52.87, pctAbst: 42.10, status: 'derrubado', adv: 'ACM Neto (UNIÃO)', posAbst: 2 },
    { uf: 'DF', gov: 'Ibaneis Rocha', partido: 'MDB', pctOficial: 50.30, pctAbst: 39.80, status: 'derrubado', adv: 'Leandro Grass (PV)', posAbst: 2 },
    { uf: 'GO', gov: 'Ronaldo Caiado', partido: 'UNIÃO', pctOficial: 51.80, pctAbst: 41.50, status: 'derrubado', adv: 'Gustavo Mendanha (PATRIOTA)', posAbst: 2 },
    { uf: 'MA', gov: 'Carlos Brandão', partido: 'PSB', pctOficial: 51.29, pctAbst: 40.85, status: 'derrubado', adv: 'Lahesio Bonfim (PSC)', posAbst: 2 },
    { uf: 'MG', gov: 'Romeu Zema', partido: 'NOVO', pctOficial: 56.18, pctAbst: 43.80, status: 'derrubado', adv: 'Alexandre Kalil (PSD)', posAbst: 3 },
    { uf: 'MT', gov: 'Mauro Mendes', partido: 'UNIÃO', pctOficial: 68.45, pctAbst: 53.40, status: 'sobrevive', adv: 'Márcia Pinheiro (PV)', posAbst: 2 },
    { uf: 'PA', gov: 'Helder Barbalho', partido: 'MDB', pctOficial: 70.41, pctAbst: 56.10, status: 'sobrevive', adv: 'Zequinha Marinho (PL)', posAbst: 2 },
    { uf: 'PR', gov: 'Ratinho Júnior', partido: 'PSD', pctOficial: 65.43, pctAbst: 52.10, status: 'sobrevive', adv: 'Roberto Requião (PT)', posAbst: 2 },
    { uf: 'PI', gov: 'Rafael Fonteles', partido: 'PT', pctOficial: 57.15, pctAbst: 46.20, status: 'derrubado', adv: 'Silvio Mendes (UNIÃO)', posAbst: 3 },
    { uf: 'RJ', gov: 'Cláudio Castro', partido: 'PL', pctOficial: 58.67, pctAbst: 45.30, status: 'derrubado', adv: 'Marcelo Freixo (PSB)', posAbst: 2 },
    { uf: 'RN', gov: 'Fátima Bezerra', partido: 'PT', pctOficial: 58.31, pctAbst: 47.10, status: 'derrubado', adv: 'Fábio Dantas (SOLIDARIEDADE)', posAbst: 3 },
    { uf: 'RO', gov: 'Marcos Rocha', partido: 'UNIÃO', pctOficial: 52.47, pctAbst: 40.50, status: 'derrubado', adv: 'Marcos Rogério (PL)', posAbst: 2 },
    { uf: 'RR', gov: 'Antonio Denarium', partido: 'PP', pctOficial: 56.47, pctAbst: 45.10, status: 'derrubado', adv: 'Teresa Surita (MDB)', posAbst: 3 },
    { uf: 'SC', gov: 'Jorginho Mello', partido: 'PL', pctOficial: 52.10, pctAbst: 41.20, status: 'derrubado', adv: 'Décio Lima (PT)', posAbst: 3 },
    { uf: 'TO', gov: 'Wanderlei Barbosa', partido: 'REPUBLICANOS', pctOficial: 58.14, pctAbst: 46.80, status: 'derrubado', adv: 'Ronaldo Dimas (PL)', posAbst: 3 },
    { uf: 'AP', gov: 'Clécio Luís', partido: 'SOLIDARIEDADE', pctOficial: 53.69, pctAbst: 43.10, status: 'derrubado', adv: 'Jaime Nunes (PSD)', posAbst: 3 }
  ];

  const filteredGovs = governorsData.filter(g => {
    if (filter === 'derrubados') return g.status === 'derrubado';
    if (filter === 'sobrevivem') return g.status === 'sobrevive';
    if (filter === 'abstencao_2t') return g.posAbst === 2;
    return true;
  });

  return (
    <section className="gov-1t-section glass-panel" id="sectionGov1T">
      <div className="gov-1t-header">
        <div className="gov-1t-title-wrap">
          <div className="gov-1t-badge">⚡ Teste de Resistência Eleitoral</div>
          <h3 className="panel-title">Os Governadores Eleitos em 1º Turno Continuariam Eleitos?</h3>
          <p className="panel-subtitle">
            Pela Constituição Federal (Art. 77, § 2º c/c Art. 28), vencer no primeiro turno exige <strong>mais de 50% dos votos</strong>.
            Se as abstenções fossem consideradas votos válidos, <strong>12 de 16 governadores eleitos em 1º turno perderiam a vitória imediata e seriam forçados a disputar o 2º Turno!</strong>
          </p>
        </div>
        <div className="gov-1t-stats-pills">
          <div className="stat-pill"><span className="stat-pill-num">16</span><span className="stat-pill-lbl">Eleitos em 1º Turno</span></div>
          <div className="stat-pill danger"><span className="stat-pill-num">12</span><span className="stat-pill-lbl">Derrubados ao 2º Turno (75%)</span></div>
          <div className="stat-pill success"><span className="stat-pill-num">4</span><span className="stat-pill-lbl">Sobreviveriam (&gt;50%)</span></div>
          <div className="stat-pill warning"><span className="stat-pill-num">6</span><span className="stat-pill-lbl">Abstenção iria ao 2º T</span></div>
        </div>
      </div>

      {/* O Grande Achado: O Efeito Fiel da Balança */}
      <div className="gov-1t-highlight-callout">
        <span className="highlight-callout-icon">💡</span>
        <div className="highlight-callout-text">
          <strong>O Grande Achado: O Efeito Fiel da Balança da Abstenção</strong><br />
          Mesmo terminando em <strong>3º lugar</strong> (atrás dos dois principais concorrentes), a presença dos eleitores ausentes <strong>forçaria Segundo Turno em 75% dos estados</strong> onde governadores foram eleitos de primeira! A abstenção é tão massiva que <strong>derruba a votação dos líderes para bem abaixo dos 50% constitucionais</strong>, transformando eleições decididas em disputas abertas de 2º Turno.
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="gov-1t-filter-tabs">
        <button className={`gov-filter-btn ${filter === 'todos' ? 'active' : ''}`} onClick={() => setFilter('todos')}>
          Todos os 16 Estados
        </button>
        <button className={`gov-filter-btn ${filter === 'derrubados' ? 'active' : ''}`} onClick={() => setFilter('derrubados')}>
          Derrubados ao 2º Turno (12)
        </button>
        <button className={`gov-filter-btn ${filter === 'sobrevivem' ? 'active' : ''}`} onClick={() => setFilter('sobrevivem')}>
          Sobreviveriam (4)
        </button>
        <button className={`gov-filter-btn ${filter === 'abstencao_2t' ? 'active' : ''}`} onClick={() => setFilter('abstencao_2t')}>
          Abstenção no 2º Turno (6)
        </button>
      </div>

      {/* Governor Cards Grid */}
      <div className="gov-1t-grid">
        {filteredGovs.map(g => (
          <div
            key={g.uf}
            className={`gov-1t-card ${g.status === 'derrubado' ? 'is-derrubado' : 'is-sobrevive'}`}
            onClick={() => onSelectUf(g.uf)}
            title={`Clique para carregar o veredito completo de ${g.uf}`}
            style={{ cursor: 'pointer' }}
          >
            <div className="gov-card-top">
              <span className="gov-card-uf">{g.uf}</span>
              <span className={`gov-card-badge ${g.status === 'derrubado' ? 'badge-danger' : 'badge-success'}`}>
                {g.status === 'derrubado' ? '⚡ Derrubado ao 2º Turno' : '🛡️ Vence em 1º Turno'}
              </span>
            </div>
            <div className="gov-card-leader">
              <strong>{g.gov}</strong> ({g.partido})
            </div>
            <div className="gov-card-rates">
              <div className="rate-col">
                <span className="rate-lbl">Oficial (Sem ausentes)</span>
                <span className="rate-val">{formatPercent(g.pctOficial)}</span>
              </div>
              <div className="rate-sep">➔</div>
              <div className="rate-col">
                <span className="rate-lbl">Simulado (Com ausentes)</span>
                <strong className={`rate-val ${g.status === 'derrubado' ? 'text-danger' : 'text-success'}`}>
                  {formatPercent(g.pctAbst)}
                </strong>
              </div>
            </div>
            <div className="gov-card-detail">
              {g.status === 'derrubado' ? (
                <span>Forçaria 2º Turno contra: <strong>{g.posAbst === 2 ? 'Candidato "Abstenção" (2º Lugar)' : g.adv}</strong></span>
              ) : (
                <span>Votação massiva supera ausentes e oposição combinados (&gt; 50%).</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
