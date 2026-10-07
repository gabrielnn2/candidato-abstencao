import React from 'react';
import {
  REGION_STATES,
  formatNumber,
  formatPercent,
  formatVotosAmigavel,
  cleanCandidateName,
  getRankBadge,
  getGovStatus
} from '../utils/electoralMath';

export default function VerdictCard({
  currentCargo,
  currentScope,
  currentRegiao = 'todas',
  brasilData,
  estadosData = [],
  onResetBrasil,
  onSelectUf,
  onOpenShare
}) {
  const isMun = currentScope?.type === 'municipio';
  const isUf = currentScope?.type === 'uf';
  const isRegiao = currentScope?.type === 'brasil' && currentRegiao && currentRegiao !== 'todas';
  const isBrasil = currentScope?.type === 'brasil' && (!currentRegiao || currentRegiao === 'todas');

  // 1. Regional states set when region filter is active
  const regUfs = isRegiao
    ? estadosData.filter(u => REGION_STATES[currentRegiao]?.includes(u.uf))
    : estadosData;

  // 2. Identify location name and title
  let locationTitle = 'BRASIL · NACIONAL';
  let locationName = 'Brasil';
  let aptos = brasilData?.total_aptos || 0;
  let abstencao = brasilData?.total_abstencao || 0;
  let taxa = brasilData?.taxa_abstencao || 0;

  if (isBrasil) {
    locationTitle = 'BRASIL · NACIONAL';
    locationName = 'Brasil';
    aptos = brasilData?.total_aptos || 0;
    abstencao = brasilData?.total_abstencao || 0;
    taxa = brasilData?.taxa_abstencao || 0;
  } else if (isRegiao) {
    locationTitle = `REGIÃO ${currentRegiao.toUpperCase()}`;
    locationName = `Região ${currentRegiao}`;
    aptos = regUfs.reduce((acc, u) => acc + (u.aptos || 0), 0);
    abstencao = regUfs.reduce((acc, u) => acc + (u.abstencao || 0), 0);
    taxa = aptos > 0 ? Number(((abstencao / aptos) * 100).toFixed(2)) : 0;
  } else if (isUf && currentScope.item) {
    const uf = currentScope.item;
    locationTitle = `${uf.nome.toUpperCase()} (${uf.uf})`;
    locationName = `${uf.nome} (${uf.uf})`;
    aptos = uf.aptos;
    abstencao = uf.abstencao;
    taxa = uf.taxa_abstencao;
  } else if (isMun && currentScope.item) {
    const mun = currentScope.item;
    locationTitle = `${mun.nome.toUpperCase()} (${mun.uf})`;
    locationName = `${mun.nome} (${mun.uf})`;
    aptos = mun.aptos;
    abstencao = mun.abstencao;
    taxa = mun.taxa_abstencao;
  }

  // 3. Editorial content and ranking lists
  let headline = null;
  let subtext = '';
  let listSectionTitle = 'Ranking simulação com o Candidato Abstenção';
  let listItems = []; // List of candidate/seat/category rows to render

  // ==========================================
  // CARGO: PRESIDENTE
  // ==========================================
  if (currentCargo === 'Presidente') {
    let rawRanking = [];

    if (isBrasil) {
      rawRanking = brasilData?.cargos?.Presidente?.ranking || [];
    } else if (isRegiao) {
      // Aggregate nominal votes from states of this region
      const candMap = new Map();
      regUfs.forEach(u => {
        const presRanking = u.cargos?.Presidente?.ranking || [];
        presRanking.forEach(c => {
          if (c.is_abstencao) return;
          const cleanName = cleanCandidateName(c.nome);
          const prev = candMap.get(cleanName) || {
            nome: cleanName,
            partido: c.partido,
            votos: 0
          };
          prev.votos += (c.votos || 0);
          candMap.set(cleanName, prev);
        });
      });

      const aggregated = Array.from(candMap.values()).map(c => ({
        ...c,
        is_abstencao: false
      }));
      aggregated.push({
        nome: 'Abstenção',
        partido: 'ELEITORES AUSENTES',
        votos: abstencao,
        is_abstencao: true
      });

      const totalSimulado = aggregated.reduce((acc, c) => acc + c.votos, 0) || 1;
      aggregated.sort((a, b) => b.votos - a.votos);
      rawRanking = aggregated.map((c, i) => ({
        ...c,
        posicao: i + 1,
        percentual_simulado: Number(((c.votos / totalSimulado) * 100).toFixed(2))
      }));
    } else {
      rawRanking = currentScope.item?.cargos?.Presidente?.ranking || [];
    }

    // Clean names (remove party suffix in name)
    const cleanedRanking = rawRanking.map(c => ({
      ...c,
      nome: cleanCandidateName(c.nome_exibicao || c.nome),
      partido: c.is_abstencao ? 'ELEITORES AUSENTES' : (c.partido || '')
    }));

    // Find Abstenção candidate
    const candAbst = cleanedRanking.find(c => c.is_abstencao);
    const abstPos = candAbst?.posicao || 3;
    const abstPct = candAbst?.percentual_simulado ?? candAbst?.percentual ?? taxa;

    // Group candidates from 4th position onwards into "Outros Candidatos"
    const top3 = cleanedRanking.slice(0, 3);
    const resto = cleanedRanking.slice(3);

    if (resto.length > 0) {
      const sumVotos = resto.reduce((acc, c) => acc + (c.votos_simulados ?? c.votos ?? 0), 0);
      const sumPct = resto.reduce((acc, c) => acc + (c.percentual_simulado ?? c.percentual ?? 0), 0);
      listItems = [
        ...top3,
        {
          posicao: 4,
          nome: 'Outros Candidatos',
          partido: 'OUTROS',
          votos: sumVotos,
          votos_simulados: sumVotos,
          percentual_simulado: Number(sumPct.toFixed(2)),
          is_abstencao: false
        }
      ];
    } else {
      listItems = top3;
    }

    // Headings
    if (isBrasil) {
      headline = (
        <>
          Se a Abstenção fosse candidata a Presidente, chegaria em{' '}
          <span className="highlight-amber">3º lugar</span>
        </>
      );
      subtext = `Os 33,4 milhões de eleitores ausentes (${formatPercent(abstPct)}) superam com folga a soma de todas as terceiras vias, mas não iria para 2º turno`;
    } else if (isRegiao) {
      headline = (
        <>
          Se a Abstenção fosse candidata a Presidente na {locationName}, chegaria em{' '}
          <span className="highlight-amber">{abstPos}º lugar</span>
        </>
      );
      subtext = `Os ${formatVotosAmigavel(abstencao)} eleitores ausentes (${formatPercent(abstPct)}) superam com folga a soma de todas as terceiras vias, mas não iria para 2º turno`;
    } else {
      headline = (
        <>
          Se a Abstenção fosse candidata a Presidente em {locationName}, chegaria em{' '}
          <span className="highlight-amber">{abstPos}º lugar</span>
        </>
      );
      subtext = `Os ${formatVotosAmigavel(abstencao)} eleitores ausentes (${formatPercent(abstPct)}) superam com folga a soma de todas as terceiras vias, mas não iria para 2º turno`;
    }
  }

  // ==========================================
  // CARGO: GOVERNADOR
  // ==========================================
  else if (currentCargo === 'Governador') {
    if (isBrasil || isRegiao) {
      const targetUfs = isRegiao ? regUfs : estadosData;
      const totalUfs = targetUfs.length || 27;

      const countIria = targetUfs.filter(u => getGovStatus(u) === 'forcou_e_iria_2t').length;
      const countForcouDois = targetUfs.filter(u => getGovStatus(u) === 'forcou_2t_entre_dois').length;
      const countNaoAlterou = targetUfs.filter(u => getGovStatus(u) === 'nao_alterou').length;
      const countForcouTotal = countIria + countForcouDois;

      listSectionTitle = 'Cenário das UFs com o Candidato Abstenção';

      if (isBrasil) {
        headline = (
          <>
            A Abstenção <span className="highlight-amber">forçaria o 2º Turno em 16 estados</span> e seria um dos candidatos de 2º turno em <span className="highlight-white">4 deles</span>
          </>
        );
        subtext = 'Vencer no 1º turno exige mais de 50% dos votos válidos, dessa forma, com a computação dos votos dos ausentes em apenas 11 estados o andamento da eleição não seria alterado.';
      } else {
        headline = (
          <>
            Na {locationName}, a Abstenção <span className="highlight-amber">forçaria o 2º Turno em {countForcouTotal} estados</span> e seria um dos candidatos de 2º turno em <span className="highlight-white">{countIria} deles</span>
          </>
        );
        subtext = `Vencer no 1º turno exige mais de 50% dos votos válidos, dessa forma, com a computação dos votos dos ausentes em apenas ${countNaoAlterou} ${countNaoAlterou === 1 ? 'estado' : 'estados'} o andamento da eleição não seria alterado.`;
      }

      listItems = [
        {
          isCustomCategory: true,
          posicao: '🟢',
          nome: 'Forçaria e iria para o 2º turno',
          badgeText: `${countIria} ${countIria === 1 ? 'Estado' : 'Estados'}`,
          corBarra: '#10b981',
          total: countIria,
          pct: totalUfs > 0 ? Number(((countIria / totalUfs) * 100).toFixed(1)) : 0,
          isHighlight: true
        },
        {
          isCustomCategory: true,
          posicao: '🟠',
          nome: 'Forçaria um 2º turno entre os dois primeiros colocados',
          badgeText: `${countForcouDois} Estados`,
          corBarra: '#f59e0b',
          total: countForcouDois,
          pct: totalUfs > 0 ? Number(((countForcouDois / totalUfs) * 100).toFixed(1)) : 0,
          isHighlight: false
        },
        {
          isCustomCategory: true,
          posicao: '🛡️',
          nome: 'Não alteraria',
          badgeText: `${countNaoAlterou} Estados`,
          corBarra: '#64748b',
          total: countNaoAlterou,
          pct: totalUfs > 0 ? Number(((countNaoAlterou / totalUfs) * 100).toFixed(1)) : 0,
          isHighlight: false
        }
      ];
    } else {
      // Estado ou Município
      const govStatus = getGovStatus(currentScope.item);
      const targetGov = currentScope.item?.cargos?.Governador;
      const candAbst = targetGov?.ranking?.find(c => c.is_abstencao);
      const abstPct = candAbst?.percentual_simulado ?? candAbst?.percentual ?? taxa;
      const votosAbst = targetGov?.votos || abstencao;

      if (govStatus === 'nao_alterou') {
        headline = (
          <>
            Em {locationName}, a presença da Abstenção <span className="highlight-white">não alteraria a disputa para Governador</span>
          </>
        );
        subtext = `Os ${formatNumber(votosAbst)} eleitores ausentes (${formatPercent(abstPct)}) não alterariam o 2º turno`;
      } else if (govStatus === 'forcou_e_iria_2t') {
        headline = (
          <>
            Em {locationName}, a Abstenção <span className="highlight-amber">forçaria e iria para o 2º turno</span>
          </>
        );
        subtext = `Os ${formatNumber(votosAbst)} eleitores ausentes (${formatPercent(abstPct)}) superariam o 2º colocado e disputariam o 2º turno contra o líder`;
      } else {
        headline = (
          <>
            Em {locationName}, a presença da Abstenção <span className="highlight-amber">forçaria um 2º turno entre os dois primeiros colocados</span>
          </>
        );
        subtext = `Os ${formatNumber(votosAbst)} eleitores ausentes (${formatPercent(abstPct)}) impediriam a vitória em 1º turno, forçando o 2º turno entre o eleito e o 2º colocado`;
      }

      listItems = (targetGov?.ranking || []).map(c => ({
        ...c,
        nome: cleanCandidateName(c.nome_exibicao || c.nome),
        partido: c.is_abstencao ? 'ELEITORES AUSENTES' : (c.partido || '')
      }));
    }
  }

  // ==========================================
  // CARGO: SENADO
  // ==========================================
  else if (currentCargo === 'Senador') {
    if (isBrasil || isRegiao) {
      const targetUfs = isRegiao ? regUfs : estadosData;
      const totalVagas = targetUfs.length * 2;

      // Count Senate seats by party (top 2 candidates in each UF get elected)
      const bancadasCount = {};
      targetUfs.forEach(u => {
        const senRanking = u.cargos?.Senador?.ranking || [];
        senRanking.slice(0, 2).forEach(c => {
          if (c.is_abstencao) {
            bancadasCount['Abstenção'] = (bancadasCount['Abstenção'] || 0) + 1;
          } else {
            const partido = c.partido || 'OUTROS';
            bancadasCount[partido] = (bancadasCount[partido] || 0) + 1;
          }
        });
      });

      const maxCadeiras = Math.max(...Object.values(bancadasCount), 1);
      const bancadasList = Object.entries(bancadasCount)
        .map(([nome, cadeiras]) => ({
          nome,
          is_abstencao: nome === 'Abstenção',
          cadeiras,
          pct: Number(((cadeiras / totalVagas) * 100).toFixed(1)),
          barPct: Number(((cadeiras / maxCadeiras) * 100).toFixed(1))
        }))
        .sort((a, b) => b.cadeiras - a.cadeiras)
        .map((item, idx) => ({ ...item, posicao: idx + 1 }));

      listSectionTitle = 'Tamanho das Bancadas Eleitas no Senado';

      if (isBrasil) {
        headline = (
          <>
            Se a Abstenção fosse um partido, ela conquistaria <span className="highlight-amber">10 CADEIRAS NO SENADO</span> e formaria a <span className="highlight-white">2ª MAIOR BANCADA DO PAÍS!</span>
          </>
        );
        subtext = 'Nas Eleições Gerais de 2026, cada estado renova duas vagas no Senado (54 vagas no total). Os eleitores ausentes conquistariam 10 cadeiras, superando bancadas tradicionais e ficando atrás apenas do PL (17 eleitos).';
      } else {
        const abstCadeiras = bancadasCount['Abstenção'] || 0;
        headline = (
          <>
            Se a Abstenção fosse um partido na {locationName}, conquistaria <span className="highlight-amber">{abstCadeiras} CADEIRAS NO SENADO!</span>
          </>
        );
        subtext = `Na ${locationName}, cada estado renova duas vagas no Senado (${totalVagas} vagas no total). Os eleitores ausentes conquistariam ${abstCadeiras} cadeiras, superando bancadas tradicionais.`;
      }

      listItems = bancadasList.map(b => ({
        isSeatRow: true,
        posicao: b.posicao,
        nome: b.nome,
        partido: b.is_abstencao ? 'ELEITORES AUSENTES' : b.nome,
        cadeiras: b.cadeiras,
        pct: b.pct,
        barPct: b.barPct,
        is_abstencao: b.is_abstencao
      }));
    } else {
      // Estado ou Município
      const targetSen = currentScope.item?.cargos?.Senador;
      const pos = targetSen?.posicao || 3;
      const votosAbst = targetSen?.votos || abstencao;
      const candAbst = targetSen?.ranking?.find(c => c.is_abstencao);
      const abstPct = candAbst?.percentual_simulado ?? candAbst?.percentual ?? taxa;

      if (pos <= 2) {
        headline = (
          <>
            Se a Abstenção fosse candidata ao Senado em {locationName}, <span className="highlight-amber">seria eleita Senadora</span>
          </>
        );
        subtext = `Com ${formatNumber(votosAbst)} eleitores ausentes (${formatPercent(abstPct)}), a Abstenção conquistaria a vaga em ${pos}º lugar e assumiria o mandato de 8 anos!`;
      } else {
        headline = (
          <>
            Se a Abstenção fosse candidata ao Senado em {locationName}, chegaria em <span className="highlight-amber">{pos}º lugar</span>
          </>
        );
        subtext = `Os ${formatNumber(votosAbst)} eleitores ausentes (${formatPercent(abstPct)}), não alcançariam a votação dos dois senadores eleitos.`;
      }

      listItems = (targetSen?.ranking || []).map(c => ({
        ...c,
        nome: cleanCandidateName(c.nome_exibicao || c.nome),
        partido: c.is_abstencao ? 'ELEITORES AUSENTES' : (c.partido || '')
      }));
    }
  }

  return (
    <article className="verdict-card glass-panel" id="verdictCard">
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

        {/* Electoral Podium and Comparison Bars */}
        <section className="podium-section">
          <div className="section-heading">
            <h3 className="section-title">{listSectionTitle}</h3>
          </div>

          <div className="candidates-ranking-list" id="rankingList">
            {listItems.map((item, idx) => {
              // 1. Caso: Cenários de Governador Brasil / Região
              if (item.isCustomCategory) {
                return (
                  <div
                    key={idx}
                    className={`candidate-row ${item.isHighlight ? 'is-abstencao' : ''}`}
                  >
                    <div className="cand-rank-badge" style={{ fontSize: '1rem' }}>
                      {item.posicao}
                    </div>
                    <div className="cand-info">
                      <div className="cand-meta">
                        <div className="cand-name-wrap">
                          <span className="cand-name">{item.nome}</span>
                        </div>
                      </div>
                      <div className="cand-bar-container">
                        <div
                          className="cand-bar-fill"
                          style={{
                            width: `${Math.min(100, Math.max(2, item.pct))}%`,
                            background: item.corBarra
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="cand-votes">
                      <span className="cand-vote-number">{item.badgeText}</span>
                      <span className="cand-vote-pct">{formatPercent(item.pct)}</span>
                    </div>
                  </div>
                );
              }

              // 2. Caso: Bancadas de Senador Brasil / Região
              if (item.isSeatRow) {
                return (
                  <div
                    key={idx}
                    className={`candidate-row ${item.is_abstencao ? 'is-abstencao' : ''}`}
                  >
                    <div className="cand-rank-badge">
                      {item.posicao}º
                    </div>
                    <div className="cand-info">
                      <div className="cand-meta">
                        <div className="cand-name-wrap">
                          <span className="cand-name">{item.nome}</span>
                          <span className="cand-party">{item.partido}</span>
                        </div>
                      </div>
                      <div className="cand-bar-container">
                        <div
                          className="cand-bar-fill"
                          style={{ width: `${Math.min(100, Math.max(3, item.barPct))}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="cand-votes">
                      <span className="cand-vote-number">{item.cadeiras} {item.cadeiras === 1 ? 'cadeira' : 'cadeiras'}</span>
                      <span className="cand-vote-pct">{formatPercent(item.pct)}</span>
                    </div>
                  </div>
                );
              }

              // 3. Caso: Ranking de Candidatos Tradicional (Presidente / Local Gov / Local Sen)
              const isAbst = item.is_abstencao;
              const pct = item.percentual_simulado ?? item.percentual ?? 0;
              const votos = item.votos_simulados ?? item.votos ?? 0;

              return (
                <div
                  key={idx}
                  className={`candidate-row ${isAbst ? 'is-abstencao' : ''}`}
                >
                  <div className="cand-rank-badge">
                    {item.posicao}º
                  </div>
                  <div className="cand-info">
                    <div className="cand-meta">
                      <div className="cand-name-wrap">
                        <span className="cand-name">{item.nome}</span>
                        <span className="cand-party">{item.partido}</span>
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
        </section>
      </div>
    </article>
  );
}
