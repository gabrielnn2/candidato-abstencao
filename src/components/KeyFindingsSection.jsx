import React, { useMemo } from 'react';
import { formatNumber } from '../utils/electoralMath';

export default function KeyFindingsSection({ brasilData, estadosData = [] }) {
  // Compute metrics dynamically from official loaded data with robust fallbacks
  const findings = useMemo(() => {
    // 1. PRESIDENTE
    // Official national data
    const totalAbst = brasilData?.total_abstencao || 33463551;
    const rankingPres = brasilData?.cargos?.Presidente?.ranking || [];
    const cand1 = rankingPres.find(c => !c.is_abstencao && c.posicao === 1);
    const cand2 = rankingPres.find(c => !c.is_abstencao && c.posicao === 2);
    const diff1e2 = cand1 && cand2 ? Math.abs(cand1.votos - cand2.votos) : 2227651;
    const multDiff1e2 = diff1e2 > 0 ? (totalAbst / diff1e2).toFixed(1).replace('.', ',') : '15';

    // Sum of 3rd way candidates (everyone except 1st, 2nd and abstencao)
    const sumTerceiraVia = rankingPres
      .filter(c => !c.is_abstencao && c.posicao > 2)
      .reduce((acc, c) => acc + (c.votos || 0), 0) || 9313752;
    const mult3aVia = sumTerceiraVia > 0 ? (totalAbst / sumTerceiraVia).toFixed(1).replace('.', ',') : '3,6';

    // States where abstention reached 2nd place in presidential race
    let estadosPres2 = 4;
    if (estadosData.length > 0) {
      estadosPres2 = estadosData.filter(u => u.cargos?.Presidente?.posicao === 2).length;
    }

    // 2. GOVERNADOR
    let govFoi2t = 7;
    let govForcou2t = 12;
    let govNaoAlterou = 8;

    if (estadosData.length > 0) {
      govFoi2t = estadosData.filter(u => (u.cargos?.Governador?.posicao || 3) <= 2).length;
      govForcou2t = estadosData.filter(u => {
        const isPos3Plus = (u.cargos?.Governador?.posicao || 3) > 2;
        const g1t = u.dados_1t_governador;
        return isPos3Plus && g1t && !g1t.sobrevive_1t;
      }).length;
      govNaoAlterou = Math.max(0, estadosData.length - govFoi2t - govForcou2t);
    }

    // 3. SENADO
    let sen1o = 2;
    let sen2o = 8;
    let senCadeiras = 10;
    let senSemCadeira = 17;

    if (estadosData.length > 0) {
      sen1o = estadosData.filter(u => u.cargos?.Senador?.posicao === 1).length;
      sen2o = estadosData.filter(u => u.cargos?.Senador?.posicao === 2).length;
      senCadeiras = sen1o + sen2o;
      senSemCadeira = Math.max(0, estadosData.length - senCadeiras);
    }

    return {
      mult3aVia,
      multDiff1e2,
      estadosPres2,
      govFoi2t,
      govForcou2t,
      govNaoAlterou,
      sen1o,
      sen2o,
      senCadeiras,
      senSemCadeira
    };
  }, [brasilData, estadosData]);

  return (
    <section className="key-findings-section" id="achadosPrincipais">
      <div className="findings-header">
        <div className="findings-badge">💡 Análise Consolidada Nacional</div>
        <h2 className="findings-title">Achados principais</h2>
        <p className="findings-subtitle">
          O peso decisivo do não-comparecimento nas urnas analisado cargo por cargo em todo o Brasil
        </p>
      </div>

      <div className="findings-grid">
        {/* CARD 1: PRESIDENTE */}
        <article className="finding-card glass-panel" id="cardFindingPres">
          <div className="finding-card-top">
            <div className="finding-cargo-badge pres">
              <span className="finding-icon">🏛️</span>
              <span>Presidente</span>
            </div>
            <span className="finding-metric-tag">Nacional</span>
          </div>

          <h3 className="finding-card-heading">
            O Terceiro Colocado que Esmaga a Terceira Via
          </h3>

          <p className="finding-narrative">
            O total de abstenções <strong>não alteraria a disputa para o segundo turno</strong>, porém supera em{' '}
            <span className="finding-highlight">{findings.mult3aVia} vezes</span> a soma de todos os candidatos de terceira via, é{' '}
            <span className="finding-highlight">{findings.multDiff1e2} vezes</span> a diferença entre os dois primeiros candidatos e em{' '}
            <span className="finding-highlight">{findings.estadosPres2} estados</span> brasileiros ficaria em segundo lugar na disputa.
          </p>

          <div className="finding-stats-row">
            <div className="finding-stat-item">
              <span className="finding-stat-val">{findings.mult3aVia}x</span>
              <span className="finding-stat-label">Soma das 3ªs Vias</span>
            </div>
            <div className="finding-stat-item">
              <span className="finding-stat-val">{findings.multDiff1e2}x</span>
              <span className="finding-stat-label">Diferença 1º e 2º</span>
            </div>
            <div className="finding-stat-item">
              <span className="finding-stat-val">{findings.estadosPres2} UFs</span>
              <span className="finding-stat-label">Em 2º Lugar</span>
            </div>
          </div>
        </article>

        {/* CARD 2: GOVERNADOR */}
        <article className="finding-card glass-panel" id="cardFindingGov">
          <div className="finding-card-top">
            <div className="finding-cargo-badge gov">
              <span className="finding-icon">🏢</span>
              <span>Governador</span>
            </div>
            <span className="finding-metric-tag">27 Estados</span>
          </div>

          <h3 className="finding-card-heading">
            O Grande Fiel da Balança dos Governos Estaduais
          </h3>

          <p className="finding-narrative">
            O total de abstenções <strong>iria para o segundo turno em {findings.govFoi2t} estados</strong>,{' '}
            <strong>forçaria um segundo turno</strong> entre os dois primeiros candidatos em{' '}
            <span className="finding-highlight">{findings.govForcou2t} estados</span> em que a disputa se encerrou no primeiro turno e em{' '}
            <strong>apenas {findings.govNaoAlterou} estados não alteraria</strong> o andamento das eleições.
          </p>

          <div className="finding-stats-row">
            <div className="finding-stat-item highlight-green">
              <span className="finding-stat-val">{findings.govFoi2t}</span>
              <span className="finding-stat-label">Abstenção no 2ºT</span>
            </div>
            <div className="finding-stat-item highlight-gold">
              <span className="finding-stat-val">{findings.govForcou2t}</span>
              <span className="finding-stat-label">Forçaria 2º Turno</span>
            </div>
            <div className="finding-stat-item">
              <span className="finding-stat-val">{findings.govNaoAlterou}</span>
              <span className="finding-stat-label">Sem Alteração</span>
            </div>
          </div>
        </article>

        {/* CARD 3: SENADO */}
        <article className="finding-card glass-panel" id="cardFindingSen">
          <div className="finding-card-top">
            <div className="finding-cargo-badge sen">
              <span className="finding-icon">⚖️</span>
              <span>Senado</span>
            </div>
            <span className="finding-metric-tag">2 Vagas / UF</span>
          </div>

          <h3 className="finding-card-heading">
            A 2ª Maior Bancada Eleita do Senado (Atrás Apenas do PL)
          </h3>

          <p className="finding-narrative">
            No Senado, as abstenções <strong>ganhariam uma cadeira em {findings.senCadeiras} estados</strong>, sendo que em{' '}
            <span className="finding-highlight">{findings.sen1o} deles</span> ficaria em primeiro lugar na disputa e apenas em{' '}
            <strong>{findings.senSemCadeira} estados não conquistaria</strong> uma cadeira. Com {findings.senCadeiras} eleitos, seria a{' '}
            <strong>2ª maior bancada da Casa</strong>, atrás apenas do PL (17 eleitos) e à frente de MDB (7) e PT (6).
          </p>

          <div className="finding-stats-row">
            <div className="finding-stat-item highlight-gold">
              <span className="finding-stat-val">{findings.senCadeiras}</span>
              <span className="finding-stat-label">Cadeiras Eleitas</span>
            </div>
            <div className="finding-stat-item highlight-green">
              <span className="finding-stat-val">{findings.sen1o}</span>
              <span className="finding-stat-label">Mais Votada (1º)</span>
            </div>
            <div className="finding-stat-item">
              <span className="finding-stat-val">{findings.senSemCadeira}</span>
              <span className="finding-stat-label">Sem Cadeira</span>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
