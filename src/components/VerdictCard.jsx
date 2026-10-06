import React from 'react';
import { formatNumber, formatPercent, getRankBadge } from '../utils/electoralMath';

export default function VerdictCard({
  currentCargo,
  currentScope,
  brasilData,
  estadosData,
  onResetBrasil,
  onSelectUf,
  onOpenShare
}) {
  const isBrasil = currentScope.type === 'brasil';
  const isUf = currentScope.type === 'uf';
  const isMun = currentScope.type === 'municipio';

  // 27 UFs matrix
  const ufsList = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
    'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
    'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  // Helper to determine UF performance in current cargo
  const getUfRank = (ufSigla) => {
    if (!estadosData) return 3;
    const ufItem = estadosData.find(u => u.uf === ufSigla);
    if (!ufItem || !ufItem.cargos || !ufItem.cargos[currentCargo]) return 3;
    return ufItem.cargos[currentCargo].posicao || 3;
  };

  // Determine target data for ranking
  let targetData = null;
  let locationTitle = 'BRASIL · NACIONAL';
  let aptos = brasilData?.total_aptos || 0;
  let abstencao = brasilData?.total_abstencao || 0;
  let taxa = brasilData?.taxa_abstencao || 0;

  if (isBrasil) {
    locationTitle = 'BRASIL · NACIONAL';
    targetData = brasilData?.cargos?.[currentCargo];
  } else if (isUf && currentScope.item) {
    const uf = currentScope.item;
    locationTitle = `${uf.nome.toUpperCase()} (${uf.uf})`;
    targetData = uf.cargos?.[currentCargo];
    aptos = uf.aptos;
    abstencao = uf.abstencao;
    taxa = uf.taxa_abstencao;
  } else if (isMun && currentScope.item) {
    const mun = currentScope.item;
    locationTitle = `${mun.nome.toUpperCase()} (${mun.uf})`;
    targetData = mun.cargos?.[currentCargo];
    aptos = mun.aptos;
    abstencao = mun.abstencao;
    taxa = mun.taxa_abstencao;
  }

  // Generate Editorial Content
  let headline = null;
  let subtext = '';
  let badge1 = null;
  let badge2 = null;
  let badge3 = null;

  if (isBrasil && currentCargo === 'Senador') {
    headline = (
      <>
        Se a Abstenção fosse um partido para o Senado em 2026, ela conquistaria uma cadeira em{' '}
        <span className="highlight-amber">TODOS OS 27 ESTADOS</span> e formaria a{' '}
        <span className="highlight-white">MAIOR BANCADA DO PAÍS (27 SENADORES)!</span>
      </>
    );
    subtext = 'Nas Eleições Gerais de 2026, cada estado renova 2 vagas no Senado (54 vagas no total). Em 9 estados os ausentes ficariam em 1º lugar e em 18 estados em 2º lugar — conquistando exatamente 50% de todas as cadeiras em disputa no país!';
    badge1 = { icon: '🏛️', text: <>Cadeiras no Senado: <strong>27 de 54 Vagas (50%)</strong></>, highlight: true };
    badge2 = { icon: '📉', text: <>Eleita em: <strong>27 de 27 Unidades Federativas</strong></> };
    badge3 = { icon: '📊', text: <>Desempenho: <strong>9 UFs em 1º · 18 UFs em 2º</strong></> };
  } else if (isBrasil && currentCargo === 'Governador') {
    const g1t = brasilData?.analise_governadores_1t;
    const total1T = g1t?.total_analisados || 16;
    const derrubados1T = g1t?.total_derrubados || 12;
    const pctDerrubados = g1t?.pct_derrubados || 75;
    const abst2T = g1t?.total_estados_com_abstencao_no_2t || 6;

    headline = (
      <>
        Mesmo em 3º lugar, a presença da Abstenção{' '}
        <span className="highlight-amber">TERIA FORÇADO SEGUNDO TURNO EM {pctDerrubados}% DOS ESTADOS</span>{' '}
        onde governadores venceram no 1º turno!
      </>
    );
    subtext = `O Grande Achado: Dos ${total1T} governadores eleitos em 1º turno no país, ${derrubados1T} perderiam a vitória imediata e teriam que disputar o 2º Turno caso os ausentes contassem como votos válidos! O volume de votos ausentes é tão massivo que impede qualquer líder de alcançar os 50% dos votos válidos em quase todo o Brasil.`;
    badge1 = { icon: '⚡', text: <>Forçaria 2º Turno? <strong>SIM! (Derrubaria {derrubados1T} de {total1T} Gov.)</strong></>, highlight: true };
    badge2 = { icon: '📉', text: <>Disputa Direta no 2ºT: <strong>Em {abst2T} Estados a Abstenção iria ao 2ºT</strong></> };
    badge3 = { icon: '📊', text: <>Total de Ausentes: <strong>{formatNumber(abstencao)} ({formatPercent(taxa)})</strong></> };
  } else if (isBrasil && currentCargo === 'Presidente') {
    headline = (
      <>
        Se a Abstenção fosse candidata a Presidente no Brasil, ela conquistaria o{' '}
        <span className="highlight-amber">3º Lugar</span> com mais de{' '}
        <span className="highlight-white">33,4 milhões</span> de eleitores ausentes.
      </>
    );
    subtext = 'O volume de eleitores ausentes (21,08%) supera com folga a soma de todas as terceiras vias e confirma o Segundo Turno entre Flávio Bolsonaro (PL) e Lula (PT).';
    badge1 = { icon: '🗳️', text: <>Iria para o 2º Turno? <strong>Não (Ficaria em 3º Lugar)</strong></> };
    badge2 = { icon: '📉', text: <>Superou <strong>5 candidatos</strong> na apuração</> };
    badge3 = { icon: '📊', text: <>Distância do 2º colocado: <strong>20.413.066 votos</strong></> };
  } else if (targetData) {
    const pos = targetData.posicao || 3;
    const rankBadgeText = getRankBadge(pos);
    const votosAbst = targetData.votos || abstencao;

    if (currentCargo === 'Senador') {
      if (pos === 1) {
        headline = (
          <>
            Se a Abstenção fosse candidata ao Senado em <em>{locationTitle}</em>, ela seria a{' '}
            <span className="highlight-amber">MAIS VOTADA (1º LUGAR)</span> com {formatNumber(votosAbst)} votos e estaria{' '}
            <span className="highlight-white">ELEITA SENADORA (1ª Vaga)!</span>
          </>
        );
        subtext = `O contingente de eleitores ausentes superou individualmente todos os candidatos reais nesta localidade (${formatPercent(taxa)} de abstenção).`;
        badge1 = { icon: '🏛️', text: <>Eleita para o Senado? <strong>SIM! Eleita Senadora (1ª Vaga)</strong></>, highlight: true };
      } else if (pos === 2) {
        headline = (
          <>
            Se a Abstenção fosse candidata ao Senado em <em>{locationTitle}</em>, ela conquistaria o{' '}
            <span className="highlight-amber">2º LUGAR</span> com {formatNumber(votosAbst)} votos e estaria{' '}
            <span className="highlight-white">ELEITA SENADORA (2ª Vaga)!</span>
          </>
        );
        subtext = `Nas Eleições Gerais de 2026 são renovadas duas cadeiras por estado. Com ${formatNumber(votosAbst)} ausentes (${formatPercent(taxa)} do eleitorado), a Abstenção conquista a vaga com folga e assume mandato de 8 anos!`;
        badge1 = { icon: '🏛️', text: <>Eleita para o Senado? <strong>SIM! Eleita Senadora (2ª Vaga)</strong></>, highlight: true };
      } else {
        headline = (
          <>
            Se a Abstenção fosse candidata ao Senado em <em>{locationTitle}</em>, ela conquistaria o{' '}
            <span className="highlight-amber">{rankBadgeText}</span> com {formatNumber(votosAbst)} eleitores ausentes.
          </>
        );
        subtext = `Nesta localidade, dois candidatos nominais conseguiram votação superior à abstenção (${formatPercent(taxa)} de eleitores ausentes).`;
        badge1 = { icon: '🏛️', text: <>Eleita para o Senado? <strong>Não (Ficaria em {pos}º)</strong></> };
      }
      badge2 = { icon: '📉', text: <>Ausentes: <strong>{formatNumber(votosAbst)} ({formatPercent(taxa)})</strong></> };
      badge3 = { icon: '📊', text: <>Eleitorado Apto: <strong>{formatNumber(aptos)}</strong></> };
    } else {
      // Presidente ou Governador
      if (pos === 1) {
        headline = (
          <>
            Se a Abstenção fosse candidata a <strong>{currentCargo}</strong> em <em>{locationTitle}</em>, ela seria a{' '}
            <span className="highlight-amber">VENCEDORA ABSOLUTA</span> com {formatNumber(votosAbst)} eleitores ausentes.
          </>
        );
        subtext = `Nenhum candidato real conseguiu atingir a quantidade de eleitores que deixaram de ir às urnas nesta localidade (${formatPercent(taxa)} de abstenção).`;
        badge1 = { icon: '🏆', text: <>Iria para o 2º Turno? <strong>Venceria em 1º Turno ou Lideraria</strong></>, highlight: true };
      } else if (pos === 2) {
        const primeiroComp = targetData.ranking ? targetData.ranking.find(c => !c.is_abstencao) : null;
        const liderResistiu = primeiroComp && primeiroComp.percentual_simulado > 50.0;

        if (liderResistiu && currentCargo === 'Governador') {
          headline = (
            <>
              Em <em>{locationTitle}</em>, a Abstenção ficaria em{' '}
              <span className="highlight-amber">2º LUGAR</span> para {currentCargo} ({formatNumber(votosAbst)} votos), mas o líder{' '}
              <span className="highlight-white">{primeiroComp.nome_exibicao} RESISTIRIA EM 1º TURNO!</span>
            </>
          );
          subtext = `A Abstenção superou a oposição, tornando-se a 2ª força política do estado. Mesmo assim, ${primeiroComp.nome_exibicao} obteve votação tão expressiva (${formatPercent(primeiroComp.percentual_simulado)}) que venceria a eleição diretamente no 1º Turno!`;
          badge1 = { icon: '🛡️', text: <>Forçaria 2º Turno? <strong>Não (Líder resiste com {formatPercent(primeiroComp.percentual_simulado)})</strong></>, highlight: true };
        } else {
          headline = (
            <>
              Em <em>{locationTitle}</em>, a Abstenção ficaria em{' '}
              <span className="highlight-amber">2º LUGAR</span> para {currentCargo} e{' '}
              <span className="highlight-white">IRIA PARA O SEGUNDO TURNO!</span>
            </>
          );
          subtext = `Com ${formatNumber(votosAbst)} ausentes (${formatPercent(taxa)} do eleitorado), a Abstenção ultrapassou todos os demais concorrentes exceto o líder e disputaria diretamente o 2º Turno!`;
          badge1 = { icon: '🥈', text: <>Iria para o 2º Turno? <strong>SIM! Classificada em 2º Lugar</strong></>, highlight: true };
        }
      } else {
        // pos >= 3
        const g1t = isUf && currentScope.item ? currentScope.item.dados_1t_governador : null;
        if (currentCargo === 'Governador' && g1t && !g1t.sobrevive_1t) {
          headline = (
            <>
              Mesmo em <span className="highlight-amber">{rankBadgeText}</span> para Governador em <em>{locationTitle}</em>, a presença da Abstenção{' '}
              <span className="highlight-white">TERIA FORÇADO UM SEGUNDO TURNO!</span>
            </>
          );
          subtext = `🚨 O Grande Achado: Oficialmente, ${g1t.governador} (${g1t.partido}) venceu no 1º turno com ${formatPercent(g1t.pct_oficial)}. Porém, a presença massiva de ${formatNumber(votosAbst)} ausentes (${formatPercent(taxa)} do eleitorado) dilui os votos do líder para ${formatPercent(g1t.pct_com_abstencao)} (< 50%), arrancando sua vitória imediata e arrastando a eleição para o 2º Turno contra ${g1t.adversario_2t}!`;
          badge1 = { icon: '⚡', text: <>Forçaria 2º Turno? <strong>SIM! (Derruba vitória em 1ºT)</strong></>, highlight: true };
        } else {
          headline = (
            <>
              Se a Abstenção fosse candidata a {currentCargo} em <em>{locationTitle}</em>, ela conquistaria o{' '}
              <span className="highlight-amber">{rankBadgeText}</span> com {formatNumber(votosAbst)} votos ausentes.
            </>
          );
          subtext = `Nesta disputa, os ausentes representam ${formatPercent(taxa)} do eleitorado apto, ficando atrás dos primeiros colocados.`;
          badge1 = { icon: '🗳️', text: <>Iria para o 2º Turno? <strong>Não (Ficaria em {pos}º)</strong></> };
        }
      }

      badge2 = { icon: '📉', text: <>Superou: <strong>{(targetData.candidatos_superados?.length) || 0} candidatos</strong></> };
      badge3 = { icon: '📊', text: <>Distância do 2º: <strong>{formatNumber(targetData.distancia_segundo_votos || 0)} votos</strong></> };
    }
  }

  // Ranking candidates list
  const ranking = targetData?.ranking || [];

  return (
    <article className="verdict-card glass-panel" id="verdictCard">
      <div className="verdict-header">
        <div className="scope-indicator">
          <span className="scope-tag" id="currentScopeTag">
            {isBrasil ? '🇧🇷 BRASIL · NACIONAL' : `📍 ${locationTitle}`}
          </span>
          <span className="cargo-tag" id="currentCargoTag">
            DISPUTA PARA {currentCargo.toUpperCase()}
          </span>
        </div>
        <div className="verdict-controls">
          {!isBrasil && (
            <button className="btn-ghost" id="btnResetBrasil" title="Voltar para a visão do Brasil" onClick={onResetBrasil}>
              🇧🇷 Ver Brasil Completo
            </button>
          )}
          <button className="btn-share" id="btnShareCard" title="Compartilhar este veredito" onClick={onOpenShare}>
            <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
              <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
            </svg>
            Compartilhar
          </button>
        </div>
      </div>

      {/* Provocative Newspaper Headline */}
      <div className="headline-container">
        <h2 className="verdict-headline" id="verdictHeadline">
          {headline}
        </h2>
        <p className="verdict-subtext" id="verdictSubtext">
          {subtext}
        </p>
      </div>

      {/* Badges Row */}
      <div className="badges-row" id="badgesRow">
        {badge1 && (
          <div className={`status-badge ${badge1.highlight ? 'highlight' : ''}`} id="badgeSegundoTurno">
            <span className="badge-icon">{badge1.icon}</span>
            <span className="badge-text">{badge1.text}</span>
          </div>
        )}
        {badge2 && (
          <div className="status-badge" id="badgeSuperados">
            <span className="badge-icon">{badge2.icon}</span>
            <span className="badge-text">{badge2.text}</span>
          </div>
        )}
        {badge3 && (
          <div className="status-badge" id="badgeMargem">
            <span className="badge-icon">{badge3.icon}</span>
            <span className="badge-text">{badge3.text}</span>
          </div>
        )}
      </div>

      {/* Electoral Podium and Candidate Comparison Bars */}
      <section className="podium-section">
        <div className="section-heading">
          <h3 className="section-title">Ranking da Disputa com o Candidato "Abstenção"</h3>
          <span className="section-caption">Simulação proporcional de votos nominais válidos + total de eleitores ausentes</span>
        </div>

        <div className="candidates-ranking-list" id="rankingList">
          {ranking.map((cand, idx) => {
            const isAbst = cand.is_abstencao;
            const pct = cand.percentual_simulado ?? cand.percentual ?? 0;
            const votos = cand.votos_simulados ?? cand.votos ?? 0;

            return (
              <div
                key={idx}
                className={`candidate-row ${isAbst ? 'is-abstencao' : ''}`}
              >
                <div className="cand-rank-badge">
                  {cand.posicao}º
                </div>
                <div className="cand-info">
                  <div className="cand-meta">
                    <div className="cand-name-wrap">
                      <span className="cand-name">{cand.nome_exibicao || cand.nome}</span>
                      <span className="cand-party">{cand.partido || (isAbst ? 'AUSENTES' : '')}</span>
                    </div>
                  </div>
                  <div className="cand-bar-container">
                    <div
                      className="cand-bar-fill"
                      style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
                    ></div>
                  </div>
                </div>
                <div className="cand-votes">
                  <span className="cand-vote-number">{formatNumber(votos)}</span>
                  <span className="cand-vote-pct">{formatPercent(pct)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 27 UFs Quick Matrix */}
        <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="sub-label">Panorama Rápido nas 27 UFs (Clique para Filtrar)</span>
          </div>
          <div className="uf-strip" id="ufStrip">
            {ufsList.map(ufSigla => {
              const pos = getUfRank(ufSigla);
              const isActive = (isUf && currentScope.id === ufSigla) || (isMun && currentScope.item?.uf === ufSigla);
              const rankIndicator = pos === 1 ? '🥇 1º' : (pos === 2 ? '🥈 2º' : '3º');

              return (
                <button
                  key={ufSigla}
                  className={`uf-tile ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectUf(ufSigla)}
                  title={`${ufSigla}: Abstenção ficaria em ${pos}º lugar`}
                >
                  <span className="uf-sigla">{ufSigla}</span>
                  <span className={`uf-sub ${pos <= 2 ? 'gold' : ''}`}>{rankIndicator}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </article>
  );
}
