import React from 'react';
import { formatNumber, formatPercent, getRankBadge, getGovStatus, getGovStatusLabel } from '../utils/electoralMath';

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
        Se a Abstenção fosse um partido para o Senado em 2026, ela conquistaria{' '}
        <span className="highlight-amber">10 CADEIRAS NO SENADO</span> e formaria a{' '}
        <span className="highlight-white">2ª MAIOR BANCADA DO PAÍS</span> (atrás apenas do PL)!
      </>
    );
    subtext = 'Nas Eleições Gerais de 2026, cada estado renova duas vagas no Senado (54 vagas no total). Os eleitores ausentes conquistariam 10 cadeiras (2 UFs em 1º lugar e 8 UFs em 2º lugar), superando bancadas tradicionais como MDB (7), PT (6) e PP (4), ficando atrás apenas do PL (17 eleitos).';
    badge1 = { icon: '🏛️', text: <>Cadeiras Conquistadas: <strong>10 de 54 Vagas</strong></>, highlight: true };
    badge2 = { icon: '📉', text: <>Posição Nacional: <strong>2ª Maior Bancada Eleita</strong></> };
    badge3 = { icon: '📊', text: <>Desempenho: <strong>2 UFs em 1º · 8 UFs em 2º</strong></> };
  } else if (isBrasil && currentCargo === 'Governador') {
    headline = (
      <>
        A Abstenção{' '}
        <span className="highlight-amber">FORÇARIA E IRIA AO 2º TURNO EM 4 ESTADOS</span>,{' '}
        <span className="highlight-white">FORÇARIA O 2º TURNO EM OUTROS 12</span> e não alteraria em 11 estados!
      </>
    );
    subtext = 'Pela Constituição Federal, vencer no 1º turno exige mais de 50% dos votos. Com os votos dos ausentes, 4 estados teriam a Abstenção no 2º Turno (GO, MG, MT e RO), 12 estados teriam o 2º turno forçado entre os dois primeiros colocados, e em apenas 11 estados o andamento da eleição não seria alterado.';
    badge1 = { icon: '🟢', text: <>Forçaria e iria ao 2ºT: <strong>4 Estados (GO, MG, MT, RO)</strong></>, highlight: true };
    badge2 = { icon: '🟠', text: <>Forçaria 2ºT entre os 2 primeiros: <strong>12 Estados</strong></> };
    badge3 = { icon: '🛡️', text: <>Não alteraria: <strong>11 Estados</strong></> };
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
    } else if (currentCargo === 'Governador') {
      const govStatus = getGovStatus(currentScope.item);
      if (govStatus === 'forcou_e_iria_2t') {
        headline = (
          <>
            Em <em>{locationTitle}</em>, a Abstenção{' '}
            <span className="highlight-amber">FORÇARIA E IRIA PARA O SEGUNDO TURNO</span> contra o líder!
          </>
        );
        subtext = `O governador oficial venceu no 1º turno, mas a presença de ${formatNumber(votosAbst)} ausentes (${formatPercent(taxa)}) dilui os votos do líder para menos de 50% e supera o 2º colocado real, levando a Abstenção diretamente para o 2º Turno!`;
        badge1 = { icon: '🟢', text: <>Indicador: <strong>Forçaria e iria para o segundo turno</strong></>, highlight: true };
      } else if (govStatus === 'forcou_2t_entre_dois') {
        headline = (
          <>
            Em <em>{locationTitle}</em>, a presença da Abstenção{' '}
            <span className="highlight-amber">FORÇARIA UM SEGUNDO TURNO ENTRE OS DOIS PRIMEIROS COLOCADOS!</span>
          </>
        );
        subtext = `Oficialmente a disputa encerrou no 1º turno. Porém, a presença massiva de ${formatNumber(votosAbst)} ausentes (${formatPercent(taxa)}) dilui os votos do líder para menos de 50%, forçando um 2º Turno entre os dois primeiros candidatos reais.`;
        badge1 = { icon: '🟠', text: <>Indicador: <strong>Forçaria um segundo turno entre os dois primeiros colocados</strong></>, highlight: true };
      } else if (govStatus === 'iria_2t_no_lugar') {
        headline = (
          <>
            Em <em>{locationTitle}</em>, a Abstenção{' '}
            <span className="highlight-amber">IRIA PARA O SEGUNDO TURNO NO LUGAR DE UM DOS DOIS PRIMEIROS CANDIDATOS!</span>
          </>
        );
        subtext = `A disputa já iria para o 2º turno, mas o volume de ${formatNumber(votosAbst)} eleitores ausentes (${formatPercent(taxa)}) supera a votação do 2º colocado real, tomando a sua vaga na disputa final!`;
        badge1 = { icon: '🔵', text: <>Indicador: <strong>Iria para o segundo turno no lugar de um dos dois primeiros candidatos</strong></>, highlight: true };
      } else {
        headline = (
          <>
            Em <em>{locationTitle}</em>, a presença da Abstenção{' '}
            <span className="highlight-white">NÃO ALTERARIA O ANDAMENTO DA ELEIÇÃO.</span>
          </>
        );
        subtext = `Nesta disputa (${formatPercent(taxa)} de ausentes), o líder manteve mais de 50% dos votos válidos ou a disputa de 2º turno já existente permaneceu inalterada.`;
        badge1 = { icon: '🛡️', text: <>Indicador: <strong>Não alteraria</strong></> };
      }
      badge2 = { icon: '📉', text: <>Ausentes: <strong>{formatNumber(votosAbst)} ({formatPercent(taxa)})</strong></> };
      badge3 = { icon: '📊', text: <>Posição no Ranking: <strong>{rankBadgeText}</strong></> };
    } else {
      // Presidente
      if (pos === 1) {
        headline = (
          <>
            Se a Abstenção fosse candidata a <strong>Presidente</strong> em <em>{locationTitle}</em>, ela seria a{' '}
            <span className="highlight-amber">VENCEDORA ABSOLUTA</span> com {formatNumber(votosAbst)} eleitores ausentes.
          </>
        );
        subtext = `Nenhum candidato real conseguiu atingir a quantidade de eleitores que deixaram de ir às urnas nesta localidade (${formatPercent(taxa)} de abstenção).`;
        badge1 = { icon: '🏆', text: <>Iria para o 2º Turno? <strong>Venceria em 1º Turno ou Lideraria</strong></>, highlight: true };
      } else if (pos === 2) {
        headline = (
          <>
            Em <em>{locationTitle}</em>, a Abstenção ficaria em{' '}
            <span className="highlight-amber">2º LUGAR</span> para Presidente e{' '}
            <span className="highlight-white">IRIA PARA O SEGUNDO TURNO!</span>
          </>
        );
        subtext = `Com ${formatNumber(votosAbst)} ausentes (${formatPercent(taxa)} do eleitorado), a Abstenção ultrapassou todos os demais concorrentes exceto o líder e disputaria diretamente o 2º Turno!`;
        badge1 = { icon: '🥈', text: <>Iria para o 2º Turno? <strong>SIM! Classificada em 2º Lugar</strong></>, highlight: true };
      } else {
        headline = (
          <>
            Se a Abstenção fosse candidata a Presidente em <em>{locationTitle}</em>, ela conquistaria o{' '}
            <span className="highlight-amber">{rankBadgeText}</span> com {formatNumber(votosAbst)} votos ausentes.
          </>
        );
        subtext = `Nesta disputa, os ausentes representam ${formatPercent(taxa)} do eleitorado apto, ficando atrás dos primeiros colocados.`;
        badge1 = { icon: '🗳️', text: <>Iria para o 2º Turno? <strong>Não (Ficaria em {pos}º)</strong></> };
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
            <button type="button" className="btn-ghost" id="btnResetBrasil" title="Voltar para a visão do Brasil" onClick={onResetBrasil}>
              🇧🇷 Ver Brasil Completo
            </button>
          )}
          <button type="button" className="btn-share" id="btnShareCard" title="Compartilhar este veredito" onClick={onOpenShare}>
            <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
              <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
            </svg>
            Compartilhar
          </button>
        </div>
      </div>

      {/* Internal scrollable content area: Fixed height card, smooth inner scrolling */}
      <div className="verdict-body-scroll" id="verdictBodyScroll">
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
              const ufItem = estadosData?.find(u => u.uf === ufSigla);

              let rankIndicator = pos === 1 ? '🥇 1º' : (pos === 2 ? '🥈 2º' : '3º');
              let subClass = pos <= 2 ? 'gold' : '';
              let tooltipText = `${ufSigla}: Abstenção ficaria em ${pos}º lugar`;

              if (currentCargo === 'Governador' && ufItem) {
                const govSt = getGovStatus(ufItem);
                if (govSt === 'forcou_e_iria_2t') {
                  rankIndicator = '🟢 2ºT';
                  subClass = 'green';
                  tooltipText = `${ufSigla}: Forçaria e iria para o segundo turno`;
                } else if (govSt === 'forcou_2t_entre_dois') {
                  rankIndicator = '🟠 2ºT';
                  subClass = 'gold';
                  tooltipText = `${ufSigla}: Forçaria um segundo turno entre os dois primeiros colocados`;
                } else if (govSt === 'iria_2t_no_lugar') {
                  rankIndicator = '🔵 2ºT';
                  subClass = 'cyan';
                  tooltipText = `${ufSigla}: Iria para o segundo turno no lugar de um dos dois primeiros candidatos`;
                } else {
                  rankIndicator = '—';
                  subClass = 'slate';
                  tooltipText = `${ufSigla}: Não alteraria`;
                }
              }

              return (
                <button
                  key={ufSigla}
                  type="button"
                  className={`uf-tile ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectUf(ufSigla)}
                  title={tooltipText}
                >
                  <span className="uf-sigla">{ufSigla}</span>
                  <span className={`uf-sub ${subClass}`}>{rankIndicator}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
      </div>
    </article>
  );
}
