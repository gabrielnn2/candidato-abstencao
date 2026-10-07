import React, { useState } from 'react';
import { formatNumber, formatPercent } from '../utils/electoralMath';

export default function Gov1TSection({ brasilData, estadosData, onSelectUf }) {
  const [filter, setFilter] = useState('todos');

  const analiseObj = brasilData?.analise_governadores_1t;
  const totalAnalisados = analiseObj?.total_analisados || 20;
  const totalDerrubados = analiseObj?.total_derrubados || 15;
  const totalSobreviventes = analiseObj?.total_sobreviventes || 5;
  const totalAbst2T = analiseObj?.total_estados_com_abstencao_no_2t || 6;
  const pctDerrubados = analiseObj?.pct_derrubados ?? Math.round((totalDerrubados / totalAnalisados) * 100);

  const governorsData = analiseObj?.governadores?.map(g => ({
    uf: g.uf,
    gov: g.governador,
    partido: g.partido,
    pctOficial: g.pct_oficial,
    pctAbst: g.pct_com_abstencao,
    status: g.sobrevive_1t ? 'sobrevive' : 'derrubado',
    adv: g.adversario_2t,
    posAbst: g.adversario_tipo === 'ABSTENCAO' ? 2 : 3
  })) || [];

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
            Pela Constituição Federal (Art. 77, § 2º c/c Art. 28), vencer no 1º turno exige <strong>mais de 50% dos votos</strong>.
            Se as abstenções fossem consideradas votos válidos, <strong>{totalDerrubados} de {totalAnalisados} governadores eleitos em 1º turno perderiam a vitória imediata ({pctDerrubados}%) e seriam forçados a disputar o 2º Turno!</strong>
          </p>
        </div>
        <div className="gov-1t-stats-pills">
          <div className="stat-pill"><span className="stat-pill-num">{totalAnalisados}</span><span className="stat-pill-lbl">Eleitos em 1º Turno</span></div>
          <div className="stat-pill danger"><span className="stat-pill-num">{totalDerrubados}</span><span className="stat-pill-lbl">Derrubados ao 2º Turno ({pctDerrubados}%)</span></div>
          <div className="stat-pill success"><span className="stat-pill-num">{totalSobreviventes}</span><span className="stat-pill-lbl">Sobreviveriam (&gt;50%)</span></div>
          <div className="stat-pill warning"><span className="stat-pill-num">{totalAbst2T}</span><span className="stat-pill-lbl">Abstenção iria ao 2º T</span></div>
        </div>
      </div>

      {/* O Grande Achado: O Efeito Fiel da Balança */}
      <div className="gov-1t-highlight-callout">
        <span className="highlight-callout-icon">💡</span>
        <div className="highlight-callout-text">
          <strong>O Grande Achado: O Efeito Fiel da Balança da Abstenção</strong><br />
          Mesmo terminando em <strong>3º lugar</strong> (atrás dos dois principais concorrentes), a presença dos eleitores ausentes <strong>forçaria 2º Turno em {pctDerrubados}% dos estados</strong> onde governadores foram eleitos de primeira! A abstenção é tão massiva que <strong>derruba a votação dos líderes para bem abaixo dos 50% constitucionais</strong>, transformando eleições decididas em disputas abertas de 2º Turno. Em <strong>{totalAbst2T} estados</strong>, a própria Abstenção superou o 2º colocado e iria disputar o 2º Turno!
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="gov-1t-filter-tabs">
        <button className={`gov-filter-btn ${filter === 'todos' ? 'active' : ''}`} onClick={() => setFilter('todos')}>
          Todos os {totalAnalisados} Estados
        </button>
        <button className={`gov-filter-btn ${filter === 'derrubados' ? 'active' : ''}`} onClick={() => setFilter('derrubados')}>
          Derrubados ao 2º Turno ({totalDerrubados})
        </button>
        <button className={`gov-filter-btn ${filter === 'sobrevivem' ? 'active' : ''}`} onClick={() => setFilter('sobrevivem')}>
          Sobreviveriam ({totalSobreviventes})
        </button>
        <button className={`gov-filter-btn ${filter === 'abstencao_2t' ? 'active' : ''}`} onClick={() => setFilter('abstencao_2t')}>
          Abstenção no 2º Turno ({totalAbst2T})
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
                <span>Forçaria 2º Turno contra: <strong>{g.posAbst === 2 ? 'Candidata "Abstenção" (2º Lugar)' : g.adv}</strong></span>
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
