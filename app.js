/**
 * E Se a Abstenção Fosse Candidato? · Eleições 2026
 * Frontend Logic, State Management & Interactivity
 */

(function () {
  'use strict';

  // Application State
  const state = {
    brasilData: null,
    estadosData: [],
    municipiosData: [],
    currentCargo: 'Presidente', // 'Presidente' | 'Governador' | 'Senador'
    currentScope: {
      type: 'brasil', // 'brasil' | 'uf' | 'municipio'
      id: 'BR',
      item: null
    },
    currentRegiao: 'todas',
    searchIndex: [],
    searchSelectedIdx: -1,
    gov1TFilter: 'todos'
  };

  // DOM Elements
  const el = {
    btnCargoPres: document.getElementById('btnCargoPres'),
    btnCargoGov: document.getElementById('btnCargoGov'),
    btnCargoSen: document.getElementById('btnCargoSen'),
    searchTriggerBtn: document.getElementById('searchTriggerBtn'),
    searchModal: document.getElementById('searchModal'),
    searchInput: document.getElementById('searchInput'),
    searchResultsList: document.getElementById('searchResultsList'),
    searchCloseBtn: document.getElementById('searchCloseBtn'),
    btnResetBrasil: document.getElementById('btnResetBrasil'),
    btnShareCard: document.getElementById('btnShareCard'),
    shareModal: document.getElementById('shareModal'),
    shareCloseBtn: document.getElementById('shareCloseBtn'),
    btnShareWhatsApp: document.getElementById('btnShareWhatsApp'),
    btnShareTwitter: document.getElementById('btnShareTwitter'),
    btnCopyText: document.getElementById('btnCopyText'),
    copyAlert: document.getElementById('copyAlert'),
    currentScopeTag: document.getElementById('currentScopeTag'),
    currentCargoTag: document.getElementById('currentCargoTag'),
    verdictHeadline: document.getElementById('verdictHeadline'),
    verdictSubtext: document.getElementById('verdictSubtext'),
    badgesRow: document.getElementById('badgesRow'),
    badgeSegundoTurno: document.getElementById('badgeSegundoTurno'),
    badgeSegundoTurnoText: document.getElementById('badgeSegundoTurnoText'),
    badgeSuperados: document.getElementById('badgeSuperados'),
    badgeSuperadosText: document.getElementById('badgeSuperadosText'),
    badgeMargem: document.getElementById('badgeMargem'),
    badgeMargemText: document.getElementById('badgeMargemText'),
    rankingList: document.getElementById('rankingList'),
    ufStrip: document.getElementById('ufStrip'),
    
    // Modern Map Workspace Controls
    selectRegiao: document.getElementById('selectRegiao'),
    selectEstado: document.getElementById('selectEstado'),
    mapSearchTriggerBtn: document.getElementById('mapSearchTriggerBtn'),
    mapSearchTriggerText: document.getElementById('mapSearchTriggerText'),
    btnClearMunInput: document.getElementById('btnClearMunInput'),
    maplibreCanvas: document.getElementById('maplibreCanvas'),
    mapWrapper: document.getElementById('mapWrapper'),
    mapHoverTooltip: document.getElementById('mapHoverTooltip'),
    hoverTipTitle: document.getElementById('hoverTipTitle'),
    hoverTipTaxa: document.getElementById('hoverTipTaxa'),
    hoverTipPos: document.getElementById('hoverTipPos'),
    btnResetMapView: document.getElementById('btnResetMapView'),
    mapActivePill: document.getElementById('mapActivePill'),
    mapActivePillText: document.getElementById('mapActivePillText'),
    btnPillResetBrasil: document.getElementById('btnPillResetBrasil'),
    mapModeSubtitle: document.getElementById('mapModeSubtitle'),

    telAptos: document.getElementById('telAptos'),
    telAusentes: document.getElementById('telAusentes'),
    telTaxa: document.getElementById('telTaxa'),
    telPosicao: document.getElementById('telPosicao'),
    listCidadesVencedor: document.getElementById('listCidadesVencedor'),
    listMaiorAbstencao: document.getElementById('listMaiorAbstencao'),
    listMenorAbstencao: document.getElementById('listMenorAbstencao'),
    sharePreviewHeadline: document.getElementById('sharePreviewHeadline'),
    sharePreviewData: document.getElementById('sharePreviewData'),
    sectionGov1T: document.getElementById('sectionGov1T'),
    gov1TGrid: document.getElementById('gov1TGrid'),
    gov1TFilters: document.querySelectorAll('.filter-pill-btn')
  };

  // Formatting Helpers
  function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return Number(num).toLocaleString('pt-BR');
  }

  function formatPercent(pct) {
    if (pct === null || pct === undefined) return '0%';
    return Number(pct).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + '%';
  }

  function getRankBadge(pos) {
    if (pos === 1) return '🥇 1º Lugar';
    if (pos === 2) return '🥈 2º Lugar';
    if (pos === 3) return '🥉 3º Lugar';
    return `${pos}º Lugar`;
  }

  // Initialization
  async function init() {
    try {
      if (window.ELECTION_DATA && window.ELECTION_DATA.brasil) {
        state.brasilData = window.ELECTION_DATA.brasil;
        state.estadosData = window.ELECTION_DATA.estados;
        state.municipiosData = window.ELECTION_DATA.municipios;
      } else {
        // Load pre-compiled datasets via fetch
        const [resBr, resUf, resMun] = await Promise.all([
          fetch('data/brasil.json').then(r => r.json()),
          fetch('data/estados.json').then(r => r.json()),
          fetch('data/municipios.json').then(r => r.json())
        ]);

        state.brasilData = resBr;
        state.estadosData = resUf;
        state.municipiosData = resMun;
      }

      // Build unified search index
      buildSearchIndex();

      // Render components
      renderTelemetry();
      initMapLibre();
      if (el.ufStrip) renderUfStrip();
      renderVerdict();
      renderGovernadores1T();
      renderCuriosities();

      // Setup event listeners
      setupEvents();
      setupToolbarEvents();
      setupGov1TFilters();

    } catch (err) {
      console.error('Erro ao inicializar dados eleitorais:', err);
      if (!state.brasilData) {
        el.verdictHeadline.innerHTML = 'Erro ao carregar dados oficiais do TSE. Verifique a conexão com o servidor local.';
      }
    }
  }

  // Search Index Builder
  function buildSearchIndex() {
    state.searchIndex = [];

    // Add Brasil
    state.searchIndex.push({
      type: 'brasil',
      id: 'BR',
      name: 'Brasil (Todo o País)',
      subtitle: 'Visão Nacional · 158,7 milhões de eleitores',
      item: state.brasilData
    });

    // Add Estados (27 UFs)
    state.estadosData.forEach(uf => {
      state.searchIndex.push({
        type: 'uf',
        id: uf.uf,
        name: `${uf.nome} (${uf.uf})`,
        subtitle: `Estado · Capital: ${uf.capital || uf.nome} · ${formatNumber(uf.aptos)} eleitores`,
        item: uf
      });
    });

    // Add all 5,564 municipalities from indexed source
    const munSource = window.MUNICIPIOS_INDEX || state.municipiosData || [];
    munSource.forEach(m => {
      state.searchIndex.push({
        type: 'municipio',
        id: m.id || m.slug,
        name: `${m.nome} - ${m.uf}`,
        subtitle: `Município · ${formatNumber(m.aptos)} eleitores · Abstenção: ${formatPercent(m.taxa || m.taxa_abstencao)}`,
        item: m
      });
    });
  }

  // Telemetry Renderer
  function renderTelemetry() {
    if (!state.brasilData) return;
    const b = state.brasilData;
    el.telAptos.textContent = formatNumber(b.total_aptos);
    el.telAusentes.textContent = formatNumber(b.total_abstencao);
    el.telTaxa.textContent = formatPercent(b.taxa_abstencao);
    const presRank = b.cargos.Presidente.posicao;
    el.telPosicao.textContent = getRankBadge(presRank);
  }

  // Update map highlighting (bold borders and dimming non-selected areas, matching Image 3)
  function updateMapHighlightStyles() {
    if (!mapInstance || !mapLoaded) return;

    const scope = state.currentScope;
    let opacityExpr = 0.86;
    let lineOpacityExpr = [
      'interpolate', ['linear'], ['zoom'],
      3, 0.18,
      6, 0.28,
      9, 0.42,
      12, 0.60
    ];
    let estadoLineOpacityExpr = 0.65;

    if (scope.type === 'uf') {
      const targetUf = scope.id;
      if (mapInstance.getLayer('estado-highlight')) {
        mapInstance.setFilter('estado-highlight', ['==', 'uf', targetUf]);
      }
      if (mapInstance.getLayer('municipio-highlight')) {
        mapInstance.setFilter('municipio-highlight', ['==', 'id', '']);
      }

      opacityExpr = [
        'case',
        ['==', ['get', 'uf'], targetUf],
        0.94,
        0.08
      ];
      lineOpacityExpr = [
        'case',
        ['==', ['get', 'uf'], targetUf],
        0.28,
        0.02
      ];
      estadoLineOpacityExpr = [
        'case',
        ['==', ['get', 'uf'], targetUf],
        0.85,
        0.10
      ];
    } else if (scope.type === 'municipio') {
      const munUf = scope.item?.uf || '';
      const munId = scope.id;

      if (mapInstance.getLayer('estado-highlight')) {
        mapInstance.setFilter('estado-highlight', ['==', 'uf', munUf]);
      }
      if (mapInstance.getLayer('municipio-highlight')) {
        mapInstance.setFilter('municipio-highlight', [
          'any',
          ['==', 'id', Number(munId)],
          ['==', 'id', String(munId)]
        ]);
      }

      opacityExpr = [
        'case',
        ['==', ['get', 'id'], Number(munId)],
        1.0,
        ['==', ['get', 'id'], String(munId)],
        1.0,
        ['==', ['get', 'uf'], munUf],
        0.90,
        0.08
      ];
      lineOpacityExpr = [
        'case',
        ['==', ['get', 'uf'], munUf],
        0.28,
        0.02
      ];
      estadoLineOpacityExpr = [
        'case',
        ['==', ['get', 'uf'], munUf],
        0.85,
        0.10
      ];
    } else if (state.currentRegiao && state.currentRegiao !== 'todas') {
      const reg = state.currentRegiao;
      const ufs = REGION_STATES[reg] || [];

      if (mapInstance.getLayer('estado-highlight')) {
        if (ufs.length > 0) {
          mapInstance.setFilter('estado-highlight', ['in', 'uf', ...ufs]);
        } else {
          mapInstance.setFilter('estado-highlight', ['==', 'uf', '']);
        }
      }
      if (mapInstance.getLayer('municipio-highlight')) {
        mapInstance.setFilter('municipio-highlight', ['==', 'id', '']);
      }

      opacityExpr = [
        'case',
        ['==', ['get', 'reg'], reg],
        0.94,
        0.08
      ];
      lineOpacityExpr = [
        'case',
        ['==', ['get', 'reg'], reg],
        0.28,
        0.02
      ];
      estadoLineOpacityExpr = [
        'case',
        ['in', 'uf', ...ufs],
        0.85,
        0.10
      ];
    } else {
      // Brasil (Nacional)
      if (mapInstance.getLayer('estado-highlight')) {
        mapInstance.setFilter('estado-highlight', ['==', 'uf', '']);
      }
      if (mapInstance.getLayer('municipio-highlight')) {
        mapInstance.setFilter('municipio-highlight', ['==', 'id', '']);
      }

      opacityExpr = 0.86;
      lineOpacityExpr = [
        'interpolate', ['linear'], ['zoom'],
        3, 0.18,
        6, 0.28,
        9, 0.42,
        12, 0.60
      ];
      estadoLineOpacityExpr = 0.65;
    }

    if (mapInstance.getLayer('municipios-fill')) {
      mapInstance.setPaintProperty('municipios-fill', 'fill-opacity', opacityExpr);
    }
    if (mapInstance.getLayer('municipios-line')) {
      mapInstance.setPaintProperty('municipios-line', 'line-opacity', lineOpacityExpr);
    }
    if (mapInstance.getLayer('estados-line')) {
      mapInstance.setPaintProperty('estados-line', 'line-opacity', estadoLineOpacityExpr);
    }
  }

  // Update visual selection states across strip, toolbar, and pills
  function updateVisualSelections() {
    const scope = state.currentScope;

    // 1. Update UF Strip active state
    if (el.ufStrip) {
      el.ufStrip.querySelectorAll('.uf-tile').forEach(btn => {
        const uf = btn.getAttribute('data-uf');
        if (scope.type === 'uf' && scope.id === uf) {
          btn.classList.add('active');
        } else if (scope.type === 'municipio' && scope.item && scope.item.uf === uf) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }

    // 2. Sync Scope Tag, Pills, and Reset Brasil buttons
    if (scope.type === 'brasil') {
      if (el.btnResetBrasil) el.btnResetBrasil.style.display = 'none';
      if (el.btnPillResetBrasil) el.btnPillResetBrasil.style.display = 'none';
      if (el.mapActivePill) el.mapActivePill.classList.remove('is-filtered');
      if (el.selectEstado) el.selectEstado.value = 'BR';
      if (el.mapSearchTriggerText) el.mapSearchTriggerText.textContent = 'Buscar Município...';
      if (el.mapSearchTriggerBtn) el.mapSearchTriggerBtn.classList.remove('is-active');
      if (el.btnClearMunInput) el.btnClearMunInput.style.display = 'none';
      if (el.mapActivePillText) {
        el.mapActivePillText.textContent = 'Brasil · 5.564 Municípios em Polígonos';
      }
    } else if (scope.type === 'uf') {
      if (el.btnResetBrasil) el.btnResetBrasil.style.display = 'inline-flex';
      if (el.btnPillResetBrasil) el.btnPillResetBrasil.style.display = 'inline-flex';
      if (el.mapActivePill) el.mapActivePill.classList.add('is-filtered');
      if (el.selectEstado) el.selectEstado.value = scope.id;
      if (el.mapSearchTriggerText) {
        const ufName = scope.item?.nome || scope.id;
        el.mapSearchTriggerText.textContent = `${ufName} (${scope.id})`;
      }
      if (el.mapSearchTriggerBtn) el.mapSearchTriggerBtn.classList.add('is-active');
      if (el.btnClearMunInput) el.btnClearMunInput.style.display = 'inline-flex';
      if (el.mapActivePillText) {
        const ufName = scope.item?.nome || scope.id;
        el.mapActivePillText.textContent = `📍 ${ufName} (${scope.id}) · Todos os Municípios`;
      }
    } else if (scope.type === 'municipio') {
      if (el.btnResetBrasil) el.btnResetBrasil.style.display = 'inline-flex';
      if (el.btnPillResetBrasil) el.btnPillResetBrasil.style.display = 'inline-flex';
      if (el.mapActivePill) el.mapActivePill.classList.add('is-filtered');
      if (scope.item) {
        if (el.selectEstado && scope.item.uf) el.selectEstado.value = scope.item.uf;
        if (el.mapSearchTriggerText) el.mapSearchTriggerText.textContent = `${scope.item.nome} (${scope.item.uf})`;
        if (el.mapSearchTriggerBtn) el.mapSearchTriggerBtn.classList.add('is-active');
        if (el.btnClearMunInput) el.btnClearMunInput.style.display = 'inline-flex';
        if (el.mapActivePillText) {
          const ausentes = scope.item.abstencao || 0;
          const taxa = scope.item.taxa_abstencao ?? scope.item.taxa ?? 0;
          el.mapActivePillText.textContent = `📍 ${scope.item.nome} (${scope.item.uf}) · ${formatNumber(ausentes)} ausentes (${formatPercent(taxa)})`;
        }
      }
    }

    updateMapHighlightStyles();
  }

  // Primary Verdict & Podium Renderer
  function renderVerdict() {
    const cargo = state.currentCargo;
    const scope = state.currentScope;

    let targetData = null;
    let locationTitle = '';
    let aptos = 0;
    let abstencao = 0;
    let taxa = 0;

    if (scope.type === 'brasil') {
      locationTitle = 'BRASIL · NACIONAL';
      el.btnResetBrasil.style.display = 'none';

      // For Brasil scope:
      if (cargo === 'Senador') {
        el.currentScopeTag.textContent = '📍 BRASIL · SENADO FEDERAL (54 VAGAS)';
        el.currentCargoTag.textContent = 'RENOVAÇÃO DE 2/3 DO SENADO (2 CADEIRAS POR ESTADO)';
        el.verdictHeadline.innerHTML = `
          Se a Abstenção fosse um partido para o Senado em 2026, ela conquistaria uma cadeira em 
          <span class="highlight-amber">TODOS OS 27 ESTADOS</span> e formaria a <span class="highlight-white">MAIOR BANCADA DO PAÍS (27 SENADORES)!</span>
        `;
        el.verdictSubtext.textContent = 'Nas Eleições Gerais de 2026, cada estado renova 2 vagas no Senado (54 vagas no total). Em 9 estados os ausentes ficariam em 1º lugar e em 18 estados em 2º lugar — conquistando exatamente 50% de todas as cadeiras em disputa no país!';
        
        el.badgesRow.style.display = 'flex';
        el.badgeSegundoTurnoText.innerHTML = `Cadeiras no Senado: <strong>🏛️ 27 de 54 Vagas (50% do Senado)</strong>`;
        el.badgeSegundoTurno.classList.add('highlight');
        el.badgeSuperadosText.innerHTML = `Eleita em: <strong>27 de 27 Unidades Federativas</strong>`;
        el.badgeMargemText.innerHTML = `Desempenho: <strong>9 UFs em 1º lugar · 18 UFs em 2º lugar</strong>`;

        renderSenateNationalSummary();
        updateVisualSelections();
        return;
      }

      if (cargo === 'Governador') {
        const g1t = state.brasilData?.analise_governadores_1t;
        const total1T = g1t ? g1t.total_analisados : 16;
        const derrubados1T = g1t ? g1t.total_derrubados : 12;
        const pctDerrubados = g1t ? g1t.pct_derrubados : 75;
        const abst2T = g1t ? g1t.total_estados_com_abstencao_no_2t : 6;

        el.currentScopeTag.textContent = '📍 BRASIL · 27 GOVERNOS DE ESTADO';
        el.currentCargoTag.textContent = 'DISPUTAS ESTADUAIS DE GOVERNO';
        el.verdictHeadline.innerHTML = `
          Mesmo em 3º lugar, a presença da Abstenção <span class="highlight-amber">TERIA FORÇADO SEGUNDO TURNO EM ${pctDerrubados}% DOS ESTADOS</span> onde governadores venceram no 1º turno!
        `;
        el.verdictSubtext.textContent = `O Grande Achado: Dos ${total1T} governadores eleitos em 1º turno no país, ${derrubados1T} perderiam a vitória imediata e teriam que disputar o 2º Turno caso os ausentes contassem como votos válidos! O volume de votos ausentes é tão massivo que impede qualquer líder de alcançar os 50% dos votos válidos em quase todo o Brasil.`;
        
        el.badgesRow.style.display = 'flex';
        el.badgeSegundoTurnoText.innerHTML = `Forçaria 2º Turno? <strong>⚡ SIM! (Derrubaria ${derrubados1T} de ${total1T} Governadores)</strong>`;
        el.badgeSegundoTurno.classList.add('highlight');
        el.badgeSuperadosText.innerHTML = `Disputa Direta no 2ºT: <strong>Em ${abst2T} Estados a Abstenção iria ao 2ºT</strong>`;
        el.badgeMargemText.innerHTML = `Total de Ausentes: <strong>32.443.719 eleitores (20,8%)</strong>`;

        renderGovernadorNationalSummary();
        updateVisualSelections();
        return;
      }

      // Presidente (Disputa Unificada Nacional)
      el.badgesRow.style.display = 'flex';
      targetData = state.brasilData.cargos.Presidente;
      aptos = state.brasilData.total_aptos;
      abstencao = state.brasilData.total_abstencao;
      taxa = state.brasilData.taxa_abstencao;

    } else if (scope.type === 'uf') {
      const uf = scope.item;
      locationTitle = `${uf.nome.toUpperCase()} (${uf.uf})`;
      el.btnResetBrasil.style.display = 'inline-block';
      el.badgesRow.style.display = 'flex';

      targetData = uf.cargos[cargo];
      aptos = uf.aptos;
      abstencao = uf.abstencao;
      taxa = uf.taxa_abstencao;

    } else if (scope.type === 'municipio') {
      const mun = scope.item;
      locationTitle = `${mun.nome.toUpperCase()} (${mun.uf})`;
      el.btnResetBrasil.style.display = 'inline-block';
      el.badgesRow.style.display = 'flex';

      targetData = mun.cargos[cargo];
      aptos = mun.aptos;
      abstencao = mun.abstencao;
      taxa = mun.taxa_abstencao;
    }

    if (!targetData) return;

    // Header tags
    el.currentScopeTag.textContent = `📍 ${locationTitle}`;
    el.currentCargoTag.textContent = `DISPUTA PARA ${cargo.toUpperCase()}`;

    // Verdict Headline Generation (Journalistic style like Minha Cidade Tem Mais Boi)
    const pos = targetData.posicao;
    const rankBadgeText = getRankBadge(pos);
    const votosAbst = targetData.votos;

    if (cargo === 'Senador') {
      // Regras constitucionais do Senado (majoritária simples plurinominal, 2 eleitos, sem 2º turno)
      if (pos === 1) {
        el.verdictHeadline.innerHTML = `
          Se a Abstenção fosse candidata ao Senado em <em>${locationTitle}</em>, ela seria a 
          <span class="highlight-amber">MAIS VOTADA (1º LUGAR)</span> com ${formatNumber(votosAbst)} votos e estaria <span class="highlight-white">ELEITA SENADORA (1ª Vaga)!</span>
        `;
        el.verdictSubtext.textContent = `O contingente de eleitores ausentes superou individualmente todos os candidatos reais nesta localidade (${formatPercent(taxa)} de abstenção).`;
        el.badgeSegundoTurnoText.innerHTML = `Eleita para o Senado? <strong>🏛️ SIM! Eleita Senadora (1ª Vaga)</strong>`;
        el.badgeSegundoTurno.classList.add('highlight');
      } else if (pos === 2) {
        el.verdictHeadline.innerHTML = `
          Se a Abstenção fosse candidata ao Senado em <em>${locationTitle}</em>, ela conquistaria o 
          <span class="highlight-amber">2º LUGAR</span> com ${formatNumber(votosAbst)} votos e estaria <span class="highlight-white">ELEITA SENADORA (2ª Vaga)!</span>
        `;
        el.verdictSubtext.textContent = `Nas Eleições Gerais de 2026 são renovadas duas cadeiras por estado. Com ${formatNumber(votosAbst)} ausentes (${formatPercent(taxa)} do eleitorado), a Abstenção conquista a vaga com folga e assume mandato de 8 anos!`;
        el.badgeSegundoTurnoText.innerHTML = `Eleita para o Senado? <strong>🏛️ SIM! Eleita Senadora (2ª Vaga)</strong>`;
        el.badgeSegundoTurno.classList.add('highlight');
      } else {
        el.verdictHeadline.innerHTML = `
          Se a Abstenção fosse candidata ao Senado em <em>${locationTitle}</em>, ela conquistaria o 
          <span class="highlight-amber">${rankBadgeText}</span> com ${formatNumber(votosAbst)} eleitores ausentes.
        `;
        el.verdictSubtext.textContent = `Nesta localidade, dois candidatos nominais conseguiram votação superior à abstenção (${formatPercent(taxa)} de eleitores ausentes).`;
        el.badgeSegundoTurnoText.innerHTML = `Eleita para o Senado? <strong>Não (Ficaria em ${pos}º)</strong>`;
        el.badgeSegundoTurno.classList.remove('highlight');
      }
    } else {
      // Presidente ou Governador (Poder Executivo - Sujeito a 2º Turno)
      if (pos === 1) {
        el.verdictHeadline.innerHTML = `
          Se a Abstenção fosse candidata a <strong>${cargo}</strong> em <em>${locationTitle}</em>, ela seria a 
          <span class="highlight-amber">VENCEDORA ABSOLUTA</span> com ${formatNumber(votosAbst)} eleitores ausentes.
        `;
        el.verdictSubtext.textContent = `Nenhum candidato real conseguiu atingir a quantidade de eleitores que deixaram de ir às urnas nesta localidade (${formatPercent(taxa)} de abstenção).`;
        el.badgeSegundoTurnoText.innerHTML = `Iria para o 2º Turno? <strong>🏆 Venceria em 1º Turno ou Lideraria</strong>`;
        el.badgeSegundoTurno.classList.add('highlight');
      } else if (pos === 2) {
        const primeiroComp = targetData.ranking ? targetData.ranking.find(c => !c.is_abstencao) : null;
        const liderResistiu = primeiroComp && primeiroComp.percentual_simulado > 50.0;

        if (liderResistiu && cargo === 'Governador') {
          el.verdictHeadline.innerHTML = `
            Em <em>${locationTitle}</em>, a Abstenção ficaria em 
            <span class="highlight-amber">2º LUGAR</span> para ${cargo} (${formatNumber(votosAbst)} votos), 
            mas o líder <span class="highlight-white">${primeiroComp.nome_exibicao} RESISTIRIA EM 1º TURNO!</span>
          `;
          el.verdictSubtext.textContent = `A Abstenção superou todos os candidatos de oposição (como ${(targetData.candidatos_superados && targetData.candidatos_superados[0]) || 'os demais concorrentes'}), tornando-se a 2ª força política do estado. Mesmo assim, ${primeiroComp.nome_exibicao} obteve uma votação tão expressiva (${formatPercent(primeiroComp.percentual_simulado)} dos votos totais simulados) que venceria a eleição diretamente no 1º Turno sem necessidade de 2ª etapa!`;
          el.badgeSegundoTurnoText.innerHTML = `Forçaria 2º Turno? <strong>🛡️ Não (Líder resiste com ${formatPercent(primeiroComp.percentual_simulado)})</strong>`;
          el.badgeSegundoTurno.classList.add('highlight');
        } else {
          el.verdictHeadline.innerHTML = `
            Em <em>${locationTitle}</em>, a Abstenção ficaria em 
            <span class="highlight-amber">2º LUGAR</span> para ${cargo} e <span class="highlight-white">IRIA PARA O SEGUNDO TURNO!</span>
          `;
          el.verdictSubtext.textContent = `Com ${formatNumber(votosAbst)} ausentes (${formatPercent(taxa)} do eleitorado), a Abstenção ultrapassou todos os demais concorrentes exceto o líder e disputaria diretamente o 2º Turno!`;
          el.badgeSegundoTurnoText.innerHTML = `Iria para o 2º Turno? <strong>🥈 SIM! Classificada em 2º Lugar</strong>`;
          el.badgeSegundoTurno.classList.add('highlight');
        }
      } else {
        if (cargo === 'Governador') {
          const g1t = (scope.type === 'uf' && scope.item) ? scope.item.dados_1t_governador : null;
          if (g1t && !g1t.sobrevive_1t) {
            el.verdictHeadline.innerHTML = `
              Mesmo em <span class="highlight-amber">${rankBadgeText}</span> para Governador em <em>${locationTitle}</em>, 
              a presença da Abstenção <span class="highlight-white">TERIA FORÇADO UM SEGUNDO TURNO!</span>
            `;
            el.verdictSubtext.textContent = `🚨 O Grande Achado: Oficialmente, ${g1t.governador} (${g1t.partido}) venceu no 1º turno com ${formatPercent(g1t.pct_oficial)}. Porém, a presença massiva de ${formatNumber(votosAbst)} ausentes (${formatPercent(taxa)} do eleitorado) dilui os votos do líder para ${formatPercent(g1t.pct_com_abstencao)} (< 50%), arrancando sua vitória imediata e arrastando a eleição para o 2º Turno contra ${g1t.adversario_2t}!`;
            el.badgeSegundoTurnoText.innerHTML = `Forçaria 2º Turno? <strong>⚡ SIM! (Mesmo em 3º, derruba vitória em 1ºT)</strong>`;
            el.badgeSegundoTurno.classList.add('highlight');
          } else if (g1t && g1t.sobrevive_1t) {
            el.verdictHeadline.innerHTML = `
              Em <em>${locationTitle}</em>, a Abstenção ficaria em <span class="highlight-amber">${rankBadgeText}</span> com ${formatNumber(votosAbst)} votos, 
              mas o líder <span class="highlight-white">RESISTIRIA EM 1º TURNO!</span>
            `;
            el.verdictSubtext.textContent = `Mesmo com ${formatNumber(votosAbst)} eleitores ausentes (${formatPercent(taxa)}) contados como válidos, ${g1t.governador} (${g1t.partido}) manteria ${formatPercent(g1t.pct_com_abstencao)} dos votos (> 50%) — um dos raros 3 casos no país a resistir ao teste da abstenção!`;
            el.badgeSegundoTurnoText.innerHTML = `Forçaria 2º Turno? <strong>🛡️ Não (Líder resiste com ${formatPercent(g1t.pct_com_abstencao)})</strong>`;
            el.badgeSegundoTurno.classList.add('highlight');
          } else {
            // Estado que já teve 2º turno ou município
            el.verdictHeadline.innerHTML = `
              Mesmo em <span class="highlight-amber">${rankBadgeText}</span> para Governador em <em>${locationTitle}</em>, 
              a presença da Abstenção <span class="highlight-white">CONFIRMARIA O SEGUNDO TURNO!</span>
            `;
            el.verdictSubtext.textContent = `🚨 O Grande Achado: Com ${formatNumber(votosAbst)} eleitores ausentes (${formatPercent(taxa)}), a abstenção é a 3ª maior força na disputa. Seu contingente impede qualquer candidatura de atingir os 50% dos votos válidos, tornando o 2º Turno matematicamente inevitável.`;
            el.badgeSegundoTurnoText.innerHTML = `Forçaria 2º Turno? <strong>⚡ SIM! (Garante 2º Turno com ${formatPercent(taxa)} de ausentes)</strong>`;
            el.badgeSegundoTurno.classList.add('highlight');
          }
        } else {
          if (cargo === 'Presidente' && scope.type === 'brasil') {
            el.verdictHeadline.innerHTML = `
              Se a Abstenção fosse candidata a Presidente no Brasil, ela conquistaria o 
              <span class="highlight-amber">3º Lugar</span> com mais de <span class="highlight-white">${formatNumber(votosAbst)}</span> de eleitores ausentes.
            `;
            el.verdictSubtext.textContent = `🚨 O Grande Achado Nacional: O volume recorde de ${formatNumber(votosAbst)} ausentes (${formatPercent(taxa)} do eleitorado apto de 158,7M) supera com folga a soma de todas as terceiras vias somadas (Augusto Cury, Renan Santos, Ronaldo Caiado e Romeu Zema juntos têm 9,3 milhões). A Abstenção é a 3ª maior força política do país, atrás apenas de Flávio Bolsonaro (PL) e Lula (PT), que disputarão o 2º Turno em 25 de outubro.`;
            el.badgeSegundoTurnoText.innerHTML = `Iria para o 2º Turno? <strong>Não (Ficaria em 3º Lugar)</strong>`;
            el.badgeSegundoTurno.classList.remove('highlight');
          } else {
            el.verdictHeadline.innerHTML = `
              Se a Abstenção fosse candidata a ${cargo} em <em>${locationTitle}</em>, ela conquistaria o 
              <span class="highlight-amber">${rankBadgeText}</span> com ${formatNumber(votosAbst)} eleitores ausentes.
            `;
            el.verdictSubtext.textContent = `O número de pessoas que não compareceram à urna representa ${formatPercent(taxa)} de todo o eleitorado apto (${formatNumber(aptos)} eleitores).`;
            el.badgeSegundoTurnoText.innerHTML = `Iria para o 2º Turno? <strong>Não (Ficaria em ${pos}º)</strong>`;
            el.badgeSegundoTurno.classList.remove('highlight');
          }
        }
      }
    }

    // Special Callout for 1º Turno Governors in State scope
    if (scope.type === 'uf' && cargo === 'Governador' && scope.item && scope.item.dados_1t_governador) {
      const g1t = scope.item.dados_1t_governador;
      let alertHtml = '';
      if (!g1t.sobrevive_1t) {
        alertHtml = `
          <div class="gov-1t-state-alert danger">
            <span class="gov-1t-state-alert-icon">⚡</span>
            <div>
              <strong>Teste de Resistência Eleitoral (1º Turno):</strong> ${g1t.governador} (${g1t.partido}) venceu oficialmente em 1º turno com ${formatPercent(g1t.pct_oficial)} dos votos válidos. Porém, se os ${formatNumber(abstencao)} eleitores ausentes contassem como votos válidos, seu percentual despencaria para <strong>${formatPercent(g1t.pct_com_abstencao)}</strong> (< 50%) e haveria <strong>2º TURNO</strong> contra <strong>${g1t.adversario_2t}</strong>!
            </div>
          </div>
        `;
      } else {
        alertHtml = `
          <div class="gov-1t-state-alert success">
            <span class="gov-1t-state-alert-icon">🛡️</span>
            <div>
              <strong>Teste de Resistência Eleitoral (1º Turno):</strong> Mesmo se todos os ${formatNumber(abstencao)} eleitores ausentes fossem contados como válidos, ${g1t.governador} (${g1t.partido}) manteria <strong>${formatPercent(g1t.pct_com_abstencao)}</strong> (> 50%) e <strong>CONTINUARIA ELEITO EM 1º TURNO!</strong>
            </div>
          </div>
        `;
      }
      el.verdictSubtext.innerHTML += alertHtml;
    }

    // Superados badge
    const superados = targetData.candidatos_superados || [];
    if (superados.length > 0) {
      const formattedSample = superados.slice(0, 2).join(', ');
      el.badgeSuperadosText.innerHTML = `Superou <strong>${superados.length} concorrente(s)</strong> (${formattedSample}${superados.length > 2 ? '...' : ''})`;
    } else {
      el.badgeSuperadosText.innerHTML = `Ficou atrás de todos os concorrentes nominais`;
    }

    // Margem badge
    const dif = targetData.diferenca_lider;
    if (dif > 0) {
      el.badgeMargemText.innerHTML = `Vantagem sobre o 2º colocado: <strong>+${formatNumber(dif)} votos</strong>`;
    } else if (dif < 0) {
      el.badgeMargemText.innerHTML = `Diferença para o 1º colocado: <strong>${formatNumber(Math.abs(dif))} votos</strong>`;
    } else {
      el.badgeMargemText.innerHTML = `Empate técnico na liderança`;
    }

    // Render Candidates List
    renderRankingList(targetData.ranking);

    // Update active state in map and strip
    updateVisualSelections();
  }

  // National Summary for Senate 54 Seats
  function renderSenateNationalSummary() {
    const bancadas = [
      {
        nome: "Abstenção (Não Comparecimento)",
        partido: "ELEITORES AUSENTES",
        vagas: 27,
        pct: 50.0,
        is_abstencao: true,
        posicao: 1,
        desc: "Eleita em todas as 27 UFs (9 em 1º lugar + 18 em 2º lugar)"
      },
      {
        nome: "Bancadas Governistas (Aliança Maior)",
        partido: "GOVERNO",
        vagas: 18,
        pct: 33.3,
        is_abstencao: false,
        posicao: 2,
        desc: "Líderes estaduais nos estados onde a abstenção foi 2ª"
      },
      {
        nome: "Bancadas de Oposição (Coligações)",
        partido: "OPOSIÇÃO",
        vagas: 9,
        pct: 16.7,
        is_abstencao: false,
        posicao: 3,
        desc: "2º colocado nominal nos 9 estados onde a abstenção liderou"
      }
    ];

    el.rankingList.innerHTML = `
      <div style="margin-bottom: 14px; font-size: 0.88rem; color: var(--fg-3); line-height: 1.5;">
        Divisão estimada das <strong>54 cadeiras do Senado Federal</strong> renovadas em 2026 se a Abstenção disputasse a eleição:
      </div>
      ${bancadas.map(b => {
        const isAbst = b.is_abstencao;
        const rowClass = isAbst ? 'candidate-row is-abstencao' : 'candidate-row';
        const barWidth = (b.vagas / 27) * 100;
        return `
          <div class="${rowClass}">
            <div class="cand-rank-badge">#${b.posicao}</div>
            <div class="cand-info">
              <div class="cand-meta">
                <div class="cand-name-wrap">
                  <span class="cand-name">${b.nome}</span>
                  <span class="cand-party">${b.desc}</span>
                </div>
                <span class="cand-vote-pct">${b.pct.toFixed(1)}% das vagas</span>
              </div>
              <div class="cand-bar-container">
                <div class="cand-bar-fill" style="width: ${barWidth}%;"></div>
              </div>
            </div>
            <div class="cand-votes">
              <span class="cand-vote-number">${b.vagas}</span>
              <span class="cand-vote-pct">senadores</span>
            </div>
          </div>
        `;
      }).join('')}
      <div style="margin-top: 16px; padding: 12px 16px; border-radius: 8px; background: rgba(235, 169, 53, 0.08); border: 1px solid rgba(235, 169, 53, 0.25); font-size: 0.84rem; color: var(--gold); text-align: center;">
        👉 <strong>Clique em qualquer Estado no mapa abaixo ou nas siglas (SP, RJ, MG, etc.)</strong> para ver a apuração individual e os candidatos nominais de cada UF!
      </div>
    `;
  }

  // National Summary for Governador 27 Races
  function renderGovernadorNationalSummary() {
    el.rankingList.innerHTML = `
      <div style="margin-bottom: 14px; font-size: 0.88rem; color: var(--fg-3); line-height: 1.5;">
        Panorama consolidado das <strong>27 eleições para Governador de Estado</strong> com a Abstenção:
      </div>
      <div class="candidate-row is-abstencao">
        <div class="cand-rank-badge">#3</div>
        <div class="cand-info">
          <div class="cand-meta">
            <div class="cand-name-wrap">
              <span class="cand-name">Abstenção (ELEITORES AUSENTES)</span>
              <span class="cand-party">3ª FORÇA ELEITORAL EM TODAS AS 27 UFs · O GRANDE DISRUPTOR DO 1º TURNO</span>
            </div>
            <span class="cand-vote-pct">20.8% do eleitorado</span>
          </div>
          <div class="cand-bar-container">
            <div class="cand-bar-fill" style="width: 70%;"></div>
          </div>
        </div>
        <div class="cand-votes">
          <span class="cand-vote-number">32.443.719</span>
          <span class="cand-vote-pct">ausentes</span>
        </div>
      </div>
      <div style="margin-top: 16px; padding: 16px 20px; border-radius: 12px; background: rgba(235, 169, 53, 0.08); border: 1px solid rgba(235, 169, 53, 0.35); font-size: 0.88rem; color: var(--fg); line-height: 1.6;">
        💡 <strong>O Grande Achado: O Efeito Fiel da Balança da Abstenção</strong><br>
        Mesmo ficando em <strong>3º lugar</strong> no ranking geral, o contingente de mais de 32 milhões de ausentes é tão massivo que <strong>impede a vitória em 1º turno de 12 dos 16 governadores eleitos (75%)</strong>! A simples contagem dos ausentes como votos válidos pulveriza os percentuais para abaixo dos 50% constitucionais, forçando segundo turno em quase todo o país.
        <br><br>
        👉 Veja abaixo o <strong>Raio-X completo com a linha dos 50%</strong> para cada um dos 16 estados ou clique em qualquer UF no mapa!
      </div>
    `;
  }

  // Candidate Ranking List Renderer
  function renderRankingList(cands) {
    if (!cands || cands.length === 0) {
      el.rankingList.innerHTML = '<div style="padding: 16px; color: var(--fg-4);">Nenhum dado de votação disponível.</div>';
      return;
    }

    const maxVotes = Math.max(...cands.map(c => c.votos));

    el.rankingList.innerHTML = cands.map(cand => {
      const isAbst = cand.is_abstencao;
      const barWidth = maxVotes > 0 ? (cand.votos / maxVotes * 100) : 0;
      const rowClass = isAbst ? 'candidate-row is-abstencao' : 'candidate-row';
      const displayName = cand.nome_exibicao || (cand.partido && cand.partido !== '--' ? `${cand.nome} (${cand.partido})` : cand.nome);
      const partySubtitle = isAbst ? 'ELEITORES AUSENTES' : (cand.partido && cand.partido !== '--' ? `Partido: ${cand.partido}` : 'Candidatura');

      return `
        <div class="${rowClass}">
          <div class="cand-rank-badge">#${cand.posicao}</div>
          <div class="cand-info">
            <div class="cand-meta">
              <div class="cand-name-wrap">
                <span class="cand-name">${displayName}</span>
                <span class="cand-party">${partySubtitle}</span>
              </div>
              <span class="cand-vote-pct">${formatPercent(cand.percentual_simulado)}</span>
            </div>
            <div class="cand-bar-container">
              <div class="cand-bar-fill" style="width: ${barWidth}%;"></div>
            </div>
          </div>
          <div class="cand-votes">
            <span class="cand-vote-number">${formatNumber(cand.votos)}</span>
            <span class="cand-vote-pct">votos</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // 27 UFs Matrix Strip Renderer
  function renderUfStrip() {
    if (!el.ufStrip) return;
    const cargo = state.currentCargo;
    el.ufStrip.innerHTML = state.estadosData.map(uf => {
      const cargoData = uf.cargos[cargo];
      const pos = cargoData ? cargoData.posicao : 3;
      const isSelected = state.currentScope.type === 'uf' && state.currentScope.id === uf.uf;

      let rankClass = 'rank-3';
      let rankText = `${pos}º`;
      if (pos === 1) {
        rankClass = 'rank-1';
        rankText = '🥇 1º';
      } else if (pos === 2) {
        rankClass = 'rank-2';
        rankText = '🥈 2º';
      }

      return `
        <button class="uf-tile ${rankClass} ${isSelected ? 'active' : ''}" data-uf="${uf.uf}" title="${uf.nome} · Abstenção ficaria em ${pos}º lugar">
          <span class="uf-tile-sigla">${uf.uf}</span>
          <span class="uf-tile-rank">${rankText}</span>
        </button>
      `;
    }).join('');

    // Attach click events
    el.ufStrip.querySelectorAll('.uf-tile').forEach(btn => {
      btn.addEventListener('click', () => {
        const ufSigla = btn.getAttribute('data-uf');
        selectUf(ufSigla);
      });
    });
  }

  // MapLibre GL Architecture & Map Controls
  let mapInstance = null;
  let mapLoaded = false;
  let currentHighlightedMunId = null;

  // Brazil Geographic Framing Constants & Safe Bounding Box
  const BRAZIL_BOUNDS = [[-73.99, -33.75], [-34.79, 5.27]];
  const BRAZIL_FIT_PADDING = { top: 32, bottom: 32, left: 24, right: 38 };

  function fitBrasilBounds(immediate = false) {
    if (!mapInstance) return;
    try {
      mapInstance.resize();
      mapInstance.fitBounds(BRAZIL_BOUNDS, {
        padding: BRAZIL_FIT_PADDING,
        duration: immediate ? 0 : 800,
        maxZoom: 4.2
      });
    } catch (e) {
      console.warn('fitBrasilBounds warning:', e);
    }
  }

  // Region to States Mapping
  const REGION_STATES = {
    'Norte': ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO'],
    'Nordeste': ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
    'Centro-Oeste': ['DF', 'GO', 'MT', 'MS'],
    'Sudeste': ['ES', 'MG', 'RJ', 'SP'],
    'Sul': ['PR', 'RS', 'SC']
  };

  // Dynamic MapLibre Color Expression by Electoral Office
  function getFillColorExpression(cargo) {
    const prop = cargo === 'Presidente' ? 'pos_pres' : (cargo === 'Governador' ? 'pos_gov' : 'pos_sen');
    return [
      'match',
      ['get', prop],
      1, '#f59e0b', // 1º Lugar (Gold)
      2, '#38bdf8', // 2º Lugar / 2º Turno / Vaga (Cyan)
      /* default */ '#262d3d' // 3º ou abaixo (Dark Slate)
    ];
  }

  // Update MapLibre Paint Properties on Cargo Change
  function updateMapCargoColors() {
    if (!mapInstance || !mapLoaded) return;
    if (mapInstance.getLayer('municipios-fill')) {
      mapInstance.setPaintProperty('municipios-fill', 'fill-color', getFillColorExpression(state.currentCargo));
    }
  }

  // MapLibre GL WebGL Map Initialization
  function initMapLibre() {
    if (!window.maplibregl) {
      console.warn('MapLibre GL library not found in window');
      return;
    }

    if (!el.maplibreCanvas) return;

    try {
      mapInstance = new maplibregl.Map({
        container: 'maplibreCanvas',
        style: {
          version: 8,
          sources: {},
          layers: [
            {
              id: 'background',
              type: 'background',
              paint: { 'background-color': '#0d1117' }
            }
          ]
        },
        center: [-53.5, -14.2],
        zoom: 3.15,
        minZoom: 2.0,
        maxZoom: 14,
        dragRotate: false,
        pitchWithRotate: false
      });

      // Add navigation controls
      mapInstance.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

      mapInstance.on('load', () => {
        mapLoaded = true;

        // 1. Municipalities Polygons Layer (Default View!)
        if (window.MUNICIPIOS_GEO) {
          mapInstance.addSource('municipios', {
            type: 'geojson',
            data: window.MUNICIPIOS_GEO
          });

          // Fill Polygons
          mapInstance.addLayer({
            id: 'municipios-fill',
            type: 'fill',
            source: 'municipios',
            paint: {
              'fill-color': getFillColorExpression(state.currentCargo),
              'fill-opacity': 0.86
            }
          });

            // Municipal Boundaries (ultra-fine, delicate translucent hairline, matching Image 1)
            mapInstance.addLayer({
              id: 'municipios-line',
              type: 'line',
              source: 'municipios',
              paint: {
                'line-color': '#ffffff',
                'line-width': [
                  'interpolate', ['linear'], ['zoom'],
                  3, 0.18,
                  6, 0.30,
                  9, 0.50,
                  12, 0.85
                ],
                'line-opacity': [
                  'interpolate', ['linear'], ['zoom'],
                  3, 0.18,
                  6, 0.28,
                  9, 0.42,
                  12, 0.60
                ]
              }
            });

            // Highlighted polygon outline (prominent bold white outline for selected municipality, matching Image 3)
            mapInstance.addLayer({
              id: 'municipio-highlight',
              type: 'line',
              source: 'municipios',
              paint: {
                'line-color': '#ffffff',
                'line-width': [
                  'interpolate', ['linear'], ['zoom'],
                  3, 2.8,
                  6, 3.8,
                  10, 5.0
                ],
                'line-opacity': 1.0
              },
              filter: ['==', 'id', '']
            });
          }

          // 2. State Boundaries Layer (Thin clean white state lines)
          if (window.ESTADOS_GEO) {
            mapInstance.addSource('estados', {
              type: 'geojson',
              data: window.ESTADOS_GEO
            });

            mapInstance.addLayer({
              id: 'estados-line',
              type: 'line',
              source: 'estados',
              paint: {
                'line-color': '#ffffff',
                'line-width': [
                  'interpolate', ['linear'], ['zoom'],
                  3, 0.8,
                  6, 1.3,
                  10, 1.8
                ],
                'line-opacity': 0.65
              }
            });

            // 3. Estado Highlight Layer (Bold solid white boundary for selected state/region, matching Image 3)
            mapInstance.addLayer({
              id: 'estado-highlight',
              type: 'line',
              source: 'estados',
              paint: {
                'line-color': '#ffffff',
                'line-width': [
                  'interpolate', ['linear'], ['zoom'],
                  3, 2.4,
                  6, 3.2,
                  10, 4.2
                ],
                'line-opacity': 1.0
              },
              filter: ['==', 'uf', '']
            });
          }

        // Attach Map Hover & Click Handlers
        setupMapInteractions();

        // Apply current scope/region highlight styles
        updateMapHighlightStyles();

        // Frame Brazil accurately with zero boundary clipping
        fitBrasilBounds(true);
        setTimeout(() => {
          if (mapInstance && (!state.currentScope || state.currentScope.type === 'brasil')) {
            fitBrasilBounds(true);
          }
        }, 120);
      });

    } catch (e) {
      console.error('Erro ao inicializar MapLibre GL:', e);
    }
  }

  // Setup Map Hover and Click Interactions
  function setupMapInteractions() {
    if (!mapInstance) return;

    // Hover Tooltip
    mapInstance.on('mousemove', 'municipios-fill', (e) => {
      if (!e.features || e.features.length === 0) return;
      mapInstance.getCanvas().style.cursor = 'pointer';
      const props = e.features[0].properties;

      const cargo = state.currentCargo;
      const posProp = cargo === 'Presidente' ? 'pos_pres' : (cargo === 'Governador' ? 'pos_gov' : 'pos_sen');
      const pos = props[posProp] || 3;

      if (el.hoverTipTitle) el.hoverTipTitle.textContent = `${props.nome} (${props.uf})`;
      if (el.hoverTipTaxa) el.hoverTipTaxa.textContent = `Abstenção: ${formatPercent(props.taxa)} (${formatNumber(props.abstencao)} ausentes)`;

      let rankDesc = `${getRankBadge(pos)} para ${cargo}`;
      if (cargo === 'Senador') {
        if (pos <= 2) rankDesc += ' · 🏛️ Eleita Senadora!';
      } else {
        if (pos === 1) rankDesc += ' · 🏆 Lidera a Disputa!';
        else if (pos === 2) rankDesc += ' · 🥈 Iria para o 2º Turno!';
        else if (cargo === 'Governador') rankDesc += ' · ⚡ Forçaria 2º Turno!';
      }
      if (el.hoverTipPos) el.hoverTipPos.textContent = rankDesc;

      // Position tooltip inside container
      const containerRect = el.mapWrapper.getBoundingClientRect();
      const x = e.point.x;
      const y = e.point.y;
      if (el.mapHoverTooltip) {
        el.mapHoverTooltip.style.left = `${Math.min(x + 15, containerRect.width - 240)}px`;
        el.mapHoverTooltip.style.top = `${Math.max(10, y - 75)}px`;
        el.mapHoverTooltip.style.display = 'flex';
      }
    });

    mapInstance.on('mouseleave', 'municipios-fill', () => {
      mapInstance.getCanvas().style.cursor = '';
      if (el.mapHoverTooltip) el.mapHoverTooltip.style.display = 'none';
    });

    // Click municipality
    mapInstance.on('click', 'municipios-fill', (e) => {
      if (!e.features || e.features.length === 0) return;
      const props = e.features[0].properties;
      selectMunicipioFromProps(props);
    });
  }

  // Full On-Demand Candidate Simulation Generator for any Brazilian Municipality
  function generateCompleteMunData(props) {
    const aptos = props.aptos || 10000;
    const abstencao = props.abstencao || Math.round(aptos * 0.22);
    const comparecimento = aptos - abstencao;
    const uf = props.uf;
    const reg = props.reg || 'Sudeste';
    const taxa = props.taxa || Number((abstencao / aptos * 100).toFixed(2));
    const ufData = state.estadosData.find(e => e.uf === uf);
    const ufAptos = ufData?.aptos || 1;
    const munRatio = aptos / ufAptos;

    // 1. Presidential Candidates from Official State Data
    const candsPres = (ufData?.cargos?.Presidente?.ranking || [])
      .filter(c => !c.is_abstencao)
      .map(c => ({
        nome: c.nome,
        partido: c.partido,
        numero: c.numero || '',
        votos: Math.max(1, Math.round(c.votos * munRatio))
      }));

    // 2. Gubernatorial Candidates from Official State Data
    const candsGov = (ufData?.cargos?.Governador?.ranking || [])
      .filter(c => !c.is_abstencao)
      .map(c => ({
        nome: c.nome,
        partido: c.partido,
        numero: c.numero || '',
        votos: Math.max(1, Math.round(c.votos * munRatio))
      }));

    // 3. Senatorial Candidates from Official State Data
    const candsSen = (ufData?.cargos?.Senador?.ranking || [])
      .filter(c => !c.is_abstencao)
      .map(c => ({
        nome: c.nome,
        partido: c.partido,
        numero: c.numero || '',
        votos: Math.max(1, Math.round(c.votos * munRatio))
      }));

    function calcRanking(abstVotes, list, cargoType) {
      const validos = list.reduce((a, b) => a + b.votos, 0);
      const totalSimulado = validos + abstVotes;
      const all = [
        ...list.map(c => ({
          ...c,
          nome_exibicao: c.partido && c.partido !== '--' ? `${c.nome} (${c.partido})` : c.nome,
          is_abstencao: false,
          percentual_simulado: Number((c.votos / totalSimulado * 100).toFixed(2))
        })),
        {
          nome: 'Abstenção',
          partido: 'ELEITORES AUSENTES',
          nome_exibicao: 'Abstenção (ELEITORES AUSENTES)',
          numero: '00',
          votos: abstVotes,
          is_abstencao: true,
          percentual_simulado: Number((abstVotes / totalSimulado * 100).toFixed(2))
        }
      ];

      all.sort((a, b) => b.votos - a.votos);
      all.forEach((c, idx) => { c.posicao = idx + 1; });

      const abstItem = all.find(c => c.is_abstencao);
      const pos = abstItem.posicao;
      const superados = all.filter(c => c.posicao > pos && !c.is_abstencao).map(c => c.nome_exibicao);

      const lider = all[0];
      const segundo = all[1];
      let dif = 0;
      if (pos === 1 && segundo) {
        dif = abstVotes - segundo.votos;
      } else if (lider) {
        dif = abstVotes - lider.votos;
      }

      return {
        posicao: pos,
        votos: abstVotes,
        total_aptos: aptos,
        taxa_abstencao: taxa,
        diferenca_lider: dif,
        vencedor_primeiro_turno: pos === 1 && (abstVotes / totalSimulado > 0.5),
        iria_segundo_turno: pos <= 2,
        eleito_senado: pos <= 2,
        candidatos_superados: superados,
        ranking: all
      };
    }

    return {
      id: props.id,
      nome: props.nome,
      uf: props.uf,
      reg: reg,
      aptos: aptos,
      abstencao: abstencao,
      comparecimento: comparecimento,
      taxa_abstencao: taxa,
      lat: props.lat,
      lon: props.lon,
      cargos: {
        Presidente: calcRanking(abstencao, candsPres, 'Presidente'),
        Governador: calcRanking(abstencao, candsGov, 'Governador'),
        Senador: calcRanking(abstencao, candsSen, 'Senador')
      }
    };
  }

  // Selection of Municipality from properties (map click or search)
  function selectMunicipioFromProps(props) {
    if (!props) return;
    const munId = props.id;
    currentHighlightedMunId = munId;

    // Look up in catalog (96 cities) or generate complete simulation
    let munData = state.municipiosData.find(m => m.nome === props.nome && m.uf === props.uf);
    if (!munData) {
      munData = generateCompleteMunData(props);
    }

    state.currentScope = {
      type: 'municipio',
      id: munId,
      item: munData
    };

    if (props.reg) {
      state.currentRegiao = props.reg;
    }

    // Update toolbar controls
    if (el.selectRegiao && props.reg) {
      el.selectRegiao.value = props.reg;
      filterEstadosByRegiao(props.reg);
    }
    if (el.selectEstado) el.selectEstado.value = props.uf;
    if (el.mapSearchTriggerText) el.mapSearchTriggerText.textContent = `${props.nome} (${props.uf})`;
    if (el.mapSearchTriggerBtn) el.mapSearchTriggerBtn.classList.add('is-active');
    if (el.btnClearMunInput) el.btnClearMunInput.style.display = 'inline-flex';

    if (el.mapActivePillText) {
      el.mapActivePillText.textContent = `📍 ${props.nome} (${props.uf}) · ${formatNumber(props.abstencao)} ausentes (${formatPercent(props.taxa)})`;
    }
    if (el.mapActivePill) el.mapActivePill.classList.add('is-filtered');
    if (el.btnPillResetBrasil) el.btnPillResetBrasil.style.display = 'inline-flex';
    if (el.btnResetBrasil) el.btnResetBrasil.style.display = 'inline-flex';

    updateMapHighlightStyles();
    if (el.ufStrip) renderUfStrip();
    renderVerdict();
  }

  // Selection of Municipality by ID (from index / search)
  function selectMunicipioById(ibgeId) {
    let props = null;

    if (window.MUNICIPIOS_GEO && window.MUNICIPIOS_GEO.features) {
      const feat = window.MUNICIPIOS_GEO.features.find(f => f.properties.id === ibgeId);
      if (feat) props = feat.properties;
    }

    if (!props && window.MUNICIPIOS_INDEX) {
      props = window.MUNICIPIOS_INDEX.find(m => m.id === ibgeId);
    }

    if (!props) return;

    selectMunicipioFromProps(props);

    if (props.lon && props.lat && mapInstance) {
      mapInstance.flyTo({
        center: [props.lon, props.lat],
        zoom: 9.5,
        duration: 1400
      });
    }
  }

  // Selection of State (UF)
  function selectUf(ufSigla) {
    if (!ufSigla || ufSigla === 'BR') {
      resetToBrasil();
      return;
    }

    const uf = state.estadosData.find(u => u.uf === ufSigla);
    if (!uf) return;

    state.currentScope = {
      type: 'uf',
      id: uf.uf,
      item: uf
    };
    if (uf.regiao) {
      state.currentRegiao = uf.regiao;
    }

    // Clear specific municipality highlight
    currentHighlightedMunId = null;

    // Zoom map to state bounds
    const bbox = (window.STATE_BBOXES && window.STATE_BBOXES[ufSigla]);
    if (bbox && mapInstance) {
      mapInstance.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 40, duration: 1200 });
    }

    // Sync Toolbar
    if (el.selectEstado) el.selectEstado.value = ufSigla;
    if (el.selectRegiao && uf.regiao) {
      el.selectRegiao.value = uf.regiao;
      filterEstadosByRegiao(uf.regiao);
    }
    if (el.mapSearchTriggerText) el.mapSearchTriggerText.textContent = `${uf.nome} (${uf.uf})`;
    if (el.mapSearchTriggerBtn) el.mapSearchTriggerBtn.classList.add('is-active');
    if (el.btnClearMunInput) el.btnClearMunInput.style.display = 'inline-flex';

    if (el.mapActivePillText) {
      el.mapActivePillText.textContent = `📍 ${uf.nome} (${uf.uf}) · Todos os Municípios`;
    }
    if (el.mapActivePill) el.mapActivePill.classList.add('is-filtered');
    if (el.btnPillResetBrasil) el.btnPillResetBrasil.style.display = 'inline-flex';
    if (el.btnResetBrasil) el.btnResetBrasil.style.display = 'inline-flex';

    updateMapHighlightStyles();
    if (el.ufStrip) renderUfStrip();
    renderVerdict();
  }

  function selectMunicipio(munSlug) {
    const mun = state.municipiosData.find(m => m.slug === munSlug);
    if (!mun) return;

    selectMunicipioFromProps({
      id: mun.id || mun.slug,
      nome: mun.nome,
      uf: mun.uf,
      reg: mun.reg,
      aptos: mun.aptos,
      abstencao: mun.abstencao,
      taxa: mun.taxa_abstencao,
      lat: mun.lat,
      lon: mun.lon
    });
  }

  window.selectMunicipioByName = (nome, uf) => {
    if (window.MUNICIPIOS_INDEX) {
      const match = window.MUNICIPIOS_INDEX.find(m => m.nome.toLowerCase() === nome.toLowerCase() && m.uf === uf);
      if (match) {
        selectMunicipioById(match.id);
        return;
      }
    }
    if (state.municipiosData) {
      const match = state.municipiosData.find(m => m.nome === nome && m.uf === uf);
      if (match) selectMunicipio(match.slug);
    }
  };

  // Filter States Dropdown based on Selected Region
  function filterEstadosByRegiao(regiao) {
    if (!el.selectEstado) return;
    const currentVal = el.selectEstado.value;
    const allowedUfs = regiao === 'todas' ? null : (REGION_STATES[regiao] || null);

    Array.from(el.selectEstado.options).forEach(opt => {
      if (opt.value === 'BR') {
        opt.style.display = '';
      } else if (!allowedUfs || allowedUfs.includes(opt.value)) {
        opt.style.display = '';
      } else {
        opt.style.display = 'none';
      }
    });

    if (allowedUfs && !allowedUfs.includes(currentVal) && currentVal !== 'BR') {
      el.selectEstado.value = 'BR';
    }
  }

  // Selection of Region
  function selectRegiao(regiao) {
    state.currentRegiao = regiao;
    filterEstadosByRegiao(regiao);

    if (regiao === 'todas') {
      resetToBrasil();
    } else {
      state.currentScope = {
        type: 'brasil',
        id: 'BR',
        item: state.brasilData
      };

      const bbox = (window.REGION_BBOXES && window.REGION_BBOXES[regiao]);
      if (bbox && mapInstance) {
        mapInstance.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 40, duration: 1200 });
      }

      currentHighlightedMunId = null;

      if (el.selectEstado) el.selectEstado.value = 'BR';
      if (el.selectRegiao) el.selectRegiao.value = regiao;
      if (el.mapSearchTriggerText) el.mapSearchTriggerText.textContent = `Região ${regiao}`;
      if (el.mapSearchTriggerBtn) el.mapSearchTriggerBtn.classList.add('is-active');
      if (el.btnClearMunInput) el.btnClearMunInput.style.display = 'inline-flex';

      if (el.mapActivePillText) {
        el.mapActivePillText.textContent = `Região ${regiao} · Todos os Municípios`;
      }
      if (el.mapActivePill) el.mapActivePill.classList.add('is-filtered');
      if (el.btnPillResetBrasil) el.btnPillResetBrasil.style.display = 'inline-flex';
      if (el.btnResetBrasil) el.btnResetBrasil.style.display = 'inline-flex';

      updateMapHighlightStyles();
      if (el.ufStrip) renderUfStrip();
      renderVerdict();
    }
  }

  // Reset View to Entire Brazil
  function resetToBrasil() {
    state.currentScope = {
      type: 'brasil',
      id: 'BR',
      item: state.brasilData
    };
    state.currentRegiao = 'todas';

    currentHighlightedMunId = null;
    if (mapLoaded && mapInstance) {
      fitBrasilBounds(false);
    }

    if (el.selectRegiao) el.selectRegiao.value = 'todas';
    filterEstadosByRegiao('todas');
    if (el.selectEstado) el.selectEstado.value = 'BR';
    if (el.mapSearchTriggerText) el.mapSearchTriggerText.textContent = 'Buscar Município...';
    if (el.mapSearchTriggerBtn) el.mapSearchTriggerBtn.classList.remove('is-active');
    if (el.btnClearMunInput) el.btnClearMunInput.style.display = 'none';

    if (el.mapActivePillText) {
      el.mapActivePillText.textContent = 'Brasil · 5.564 Municípios em Polígonos';
    }
    if (el.btnPillResetBrasil) {
      el.btnPillResetBrasil.style.display = 'none';
    }
    if (el.btnResetBrasil) {
      el.btnResetBrasil.style.display = 'none';
    }
    if (el.mapActivePill) {
      el.mapActivePill.classList.remove('is-filtered');
    }

    updateMapHighlightStyles();
    if (el.ufStrip) renderUfStrip();
    updateMapCargoColors();
    renderVerdict();
  }

  // Toolbar Event Listeners
  function setupToolbarEvents() {
    // Region Select
    if (el.selectRegiao) {
      el.selectRegiao.addEventListener('change', (e) => {
        selectRegiao(e.target.value);
      });
    }

    // State Select
    if (el.selectEstado) {
      el.selectEstado.addEventListener('change', (e) => {
        selectUf(e.target.value);
      });
    }

    // Map Search Trigger Button
    if (el.mapSearchTriggerBtn) {
      el.mapSearchTriggerBtn.addEventListener('click', (e) => {
        if (e.target.closest('#btnClearMunInput') || e.target === el.btnClearMunInput) {
          e.stopPropagation();
          e.preventDefault();
          resetToBrasil();
          return;
        }
        openSearch();
      });
    }

    // Clear Button inside Map Search
    if (el.btnClearMunInput) {
      el.btnClearMunInput.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        resetToBrasil();
      });
    }

    // Reset View Button in map footer
    if (el.btnResetMapView) {
      el.btnResetMapView.addEventListener('click', resetToBrasil);
    }
  }

  // Curiosities and Highlights Section Renderer
  function renderCuriosities() {
    if (!state.brasilData || !state.brasilData.curiosidades) return;
    const cur = state.brasilData.curiosidades;

    // 1. Cidades onde venceu
    const lista1o = cur.cidades_destaque_1o_lugar || 
      (state.municipiosData ? state.municipiosData.filter(m => m.cargos && m.cargos.Presidente && m.cargos.Presidente.posicao === 1).map(m => ({ nome: m.nome, uf: m.uf, taxa: m.taxa_abstencao })) : []) ||
      (cur.top_maior_taxa || []);

    if (el.listCidadesVencedor && lista1o.length > 0) {
      el.listCidadesVencedor.innerHTML = lista1o.slice(0, 5).map(c => `
        <li class="highlight-item" data-search="${c.nome} - ${c.uf}">
          <span class="highlight-city-name">${c.nome} (${c.uf})</span>
          <span class="highlight-stat-val">🏆 1º Lugar (${formatPercent(c.taxa)})</span>
        </li>
      `).join('');

      // Attach click to jump to city
      el.listCidadesVencedor.querySelectorAll('.highlight-item').forEach(item => {
        item.addEventListener('click', () => {
          const query = item.getAttribute('data-search');
          const match = state.municipiosData.find(m => `${m.nome} - ${m.uf}` === query);
          if (match) selectMunicipio(match.slug);
        });
      });
    }

    // 2. Maiores e Menores taxas
    if (el.listMaiorAbstencao && cur.top_maior_taxa) {
      el.listMaiorAbstencao.innerHTML = cur.top_maior_taxa.slice(0, 4).map(c => `
        <li style="cursor: pointer;" title="Clique para ver ${c.nome} (${c.uf})" onclick="window.selectMunicipioByName && window.selectMunicipioByName('${c.nome}', '${c.uf}')"><strong>${c.nome} (${c.uf})</strong>: <span style="color: var(--gold); font-weight: 600;">${formatPercent(c.taxa_abstencao ?? c.taxa)}</span></li>
      `).join('');
    }

    if (el.listMenorAbstencao && cur.top_menor_taxa) {
      el.listMenorAbstencao.innerHTML = cur.top_menor_taxa.slice(0, 4).map(c => `
        <li style="cursor: pointer;" title="Clique para ver ${c.nome} (${c.uf})" onclick="window.selectMunicipioByName && window.selectMunicipioByName('${c.nome}', '${c.uf}')"><strong>${c.nome} (${c.uf})</strong>: <span style="font-weight: 600;">${formatPercent(c.taxa_abstencao ?? c.taxa)}</span></li>
      `).join('');
    }
  }

  // Special Analysis: Governadores Eleitos em 1º Turno vs Abstenções
  function renderGovernadores1T() {
    if (!el.gov1TGrid) return;
    const analise = state.brasilData?.analise_governadores_1t || state.brasilData?.curiosidades?.analise_governadores_1t;
    if (!analise || !analise.governadores) return;

    const filter = state.gov1TFilter || 'todos';
    let list = analise.governadores;

    if (filter === 'derrubados') {
      list = list.filter(g => !g.sobrevive_1t);
    } else if (filter === 'sobreviventes') {
      list = list.filter(g => g.sobrevive_1t);
    } else if (filter === 'abstencao_2t') {
      list = list.filter(g => g.adversario_tipo === 'ABSTENCAO');
    }

    el.gov1TGrid.innerHTML = list.map(g => {
      const isDerrubado = !g.sobrevive_1t;
      const statusClass = isDerrubado ? 'status-derrubado' : 'status-sobrevive';
      const badgeText = isDerrubado ? '❌ 2º Turno Forçado' : '✅ Resistiu em 1ºT';
      const badgeClass = isDerrubado ? 'derrubado' : 'sobrevive';
      const barFillClass = isDerrubado ? 'below-50' : 'above-50';
      const pctSimuladoClass = isDerrubado ? 'below-50' : 'above-50';
      const isAbstOpponent = g.adversario_tipo === 'ABSTENCAO';

      return `
        <div class="gov-card ${statusClass}" data-uf="${g.uf}" title="Clique para ver a análise completa de ${g.estado_nome}">
          <div class="gov-card-top">
            <div class="gov-card-uf-badge">
              <span>📍</span> ${g.uf} · ${g.estado_nome}
            </div>
            <span class="gov-card-status-badge ${badgeClass}">${badgeText}</span>
          </div>

          <div class="gov-card-candidate">
            <span class="gov-card-cand-name">${g.governador} (${g.partido})</span>
            <span class="gov-card-cand-sub">2º Colocado Oficial: ${g.segundo_nome} (${g.segundo_partido})</span>
          </div>

          <div class="gov-card-comparison">
            <div class="gov-card-pcts-row">
              <span class="gov-pct-oficial">Resultado Oficial: <strong>${formatPercent(g.pct_oficial)}</strong></span>
              <span class="gov-pct-simulado ${pctSimuladoClass}">Com Abstenção: ${formatPercent(g.pct_com_abstencao)}</span>
            </div>

            <div class="gov-bar-track-wrap">
              <div class="gov-bar-track-fill ${barFillClass}" style="width: ${Math.min(100, Math.max(0, g.pct_com_abstencao))}%;"></div>
              <div class="gov-bar-marker-50"></div>
            </div>
          </div>

          <div class="gov-card-second-round">
            <span class="gov-card-2t-label">${isDerrubado ? 'Cenário no 2º Turno com Abstenções:' : 'Situação Constitucional:'}</span>
            <span class="gov-card-2t-opponent ${isAbstOpponent ? 'is-abstencao' : ''}">
              ${isDerrubado ? (isAbstOpponent ? `🚨 Enfrentaria a Abstenção (${formatNumber(g.abstencao)} ausentes)` : `Disputaria contra ${g.adversario_2t}`) : `🏆 Vitória assegurada em 1º Turno (${formatPercent(g.pct_com_abstencao)} > 50%)`}
            </span>
          </div>

          <div class="gov-card-callout">
            <span>Ver apuração de ${g.uf}</span> →
          </div>
        </div>
      `;
    }).join('');

    // Attach card click handlers
    el.gov1TGrid.querySelectorAll('.gov-card').forEach(card => {
      card.addEventListener('click', () => {
        const uf = card.getAttribute('data-uf');
        state.currentCargo = 'Governador';
        // Update cargo switch UI
        [el.btnCargoPres, el.btnCargoGov, el.btnCargoSen].forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        el.btnCargoGov.classList.add('active');
        el.btnCargoGov.setAttribute('aria-selected', 'true');

        selectUf(uf);
        renderUfStrip();
        updateMapCargoColors();
      });
    });
  }

  function setupGov1TFilters() {
    if (!el.gov1TFilters) return;
    el.gov1TFilters.forEach(btn => {
      btn.addEventListener('click', () => {
        el.gov1TFilters.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.gov1TFilter = btn.getAttribute('data-filter');
        renderGovernadores1T();
      });
    });
  }

  // Instant Search System
  function openSearch() {
    el.searchModal.classList.add('open');
    el.searchModal.setAttribute('aria-hidden', 'false');
    el.searchInput.value = '';
    renderSearchResults('');
    setTimeout(() => el.searchInput.focus(), 50);
  }

  function closeSearch() {
    el.searchModal.classList.remove('open');
    el.searchModal.setAttribute('aria-hidden', 'true');
    state.searchSelectedIdx = -1;
  }

  function renderSearchResults(query) {
    const q = query.trim().toLowerCase();
    let matches = [];

    if (!q) {
      // Default: show major capitals
      matches = state.searchIndex.slice(0, 10);
    } else {
      matches = state.searchIndex.filter(item => {
        return item.name.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q);
      }).slice(0, 15);
    }

    if (matches.length === 0) {
      el.searchResultsList.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--fg-4);">
          Nenhum município ou estado encontrado para "<strong>${query}</strong>".
        </div>
      `;
      return;
    }

    state.searchSelectedIdx = 0;

    el.searchResultsList.innerHTML = matches.map((item, idx) => `
      <div class="search-result-item ${idx === 0 ? 'selected' : ''}" data-idx="${idx}">
        <div class="search-result-main">
          <span class="search-res-name">${item.name}</span>
          <span class="search-res-uf">${item.subtitle}</span>
        </div>
        <span class="search-res-rank">Ver Análise →</span>
      </div>
    `).join('');

    // Attach clicks
    el.searchResultsList.querySelectorAll('.search-result-item').forEach((row, i) => {
      row.addEventListener('click', () => {
        executeSearchSelection(matches[i]);
      });
    });
  }

  function executeSearchSelection(target) {
    if (!target) return;
    closeSearch();

    if (target.type === 'brasil') {
      resetToBrasil();
    } else if (target.type === 'uf') {
      selectUf(target.id);
    } else if (target.type === 'municipio') {
      if (typeof target.id === 'number') {
        selectMunicipioById(target.id);
      } else {
        const found = state.municipiosData.find(m => m.slug === target.id);
        if (found) selectMunicipio(target.id);
        else selectMunicipioById(Number(target.id));
      }
    }
  }

  // Share Generator Modal
  function openShare() {
    const scope = state.currentScope;
    const cargo = state.currentCargo;
    let headlineText = '';
    let dataText = '';

    if (scope.type === 'brasil') {
      if (cargo === 'Senador') {
        headlineText = `No Senado Federal, o "Partido da Abstenção" elegeria uma bancada em TODOS OS 27 ESTADOS em 2026!`;
        dataText = `Com mais de 32 milhões de ausentes pelo país, seriam 27 Senadores eleitos (50% de todas as 54 vagas em disputa) e a maior bancada do Congresso Nacional.`;
      } else if (cargo === 'Governador') {
        headlineText = `Para Governador de Estado, a ABSTENÇÃO FORÇARIA 2º TURNO em 80% dos estados que elegeram governadores de primeira!`;
        dataText = `Mesmo ficando em 3º lugar, a presença massiva de mais de 32 milhões de ausentes dilui a votação e impediria qualquer líder de atingir os 50% constitucionais em 12 de 15 estados.`;
      } else {
        headlineText = `Se a Abstenção fosse candidata a Presidente no Brasil, ficaria em 3º LUGAR com mais de 32 milhões de votos!`;
        dataText = `Nas Eleições 2026, 20,8% dos eleitores não compareceram às urnas — superando todas as candidaturas de terceira via.`;
      }
    } else if (scope.type === 'uf') {
      const uf = scope.item;
      const pos = uf.cargos[cargo].posicao;
      if (cargo === 'Senador' && pos <= 2) {
        headlineText = `Em ${uf.nome} (${uf.uf}), a ABSTENÇÃO estaria ELEITA SENADORA (${pos}ª Vaga) com ${formatNumber(uf.abstencao)} votos!`;
        dataText = `Nas Eleições Gerais de 2026 são renovadas duas cadeiras por estado. Os eleitores ausentes (${formatPercent(uf.taxa_abstencao)}) conquistariam o mandato com folga!`;
      } else {
        headlineText = `Em ${uf.nome} (${uf.uf}), a ABSTENÇÃO ficaria em ${pos}º LUGAR para ${cargo}!`;
        dataText = `Foram ${formatNumber(uf.abstencao)} eleitores ausentes (${formatPercent(uf.taxa_abstencao)} de abstenção).`;
      }
    } else {
      const mun = scope.item;
      const pos = mun.cargos[cargo].posicao;
      if (cargo === 'Senador' && pos <= 2) {
        headlineText = `Em ${mun.nome} (${mun.uf}), a ABSTENÇÃO seria a mais votada para o Senado (${pos}º Lugar)!`;
        dataText = `${formatNumber(mun.abstencao)} eleitores não foram votar (${formatPercent(mun.taxa_abstencao)} da cidade).`;
      } else {
        headlineText = `Em ${mun.nome} (${mun.uf}), a ABSTENÇÃO ficaria em ${pos}º LUGAR para ${cargo}!`;
        dataText = `${formatNumber(mun.abstencao)} eleitores não foram votar (${formatPercent(mun.taxa_abstencao)} da cidade).`;
      }
    }

    el.sharePreviewHeadline.textContent = headlineText;
    el.sharePreviewData.textContent = dataText;

    el.shareModal.classList.add('open');
    el.shareModal.setAttribute('aria-hidden', 'false');
  }

  function closeShare() {
    el.shareModal.classList.remove('open');
    el.shareModal.setAttribute('aria-hidden', 'true');
    el.copyAlert.classList.remove('show');
  }

  function getShareContent() {
    const headline = el.sharePreviewHeadline.textContent;
    const data = el.sharePreviewData.textContent;
    return `🚨 E SE A ABSTENÇÃO FOSSE CANDIDATO NAS ELEIÇÕES 2026?\n\n${headline}\n${data}\n\nConfira o ranking completo na ferramenta de análise eleitoral com dados públicos do TSE:`;
  }

  // Event Listeners Setup
  function setupEvents() {
    // Cargo Switcher Tabs
    [el.btnCargoPres, el.btnCargoGov, el.btnCargoSen].forEach(btn => {
      btn.addEventListener('click', () => {
        [el.btnCargoPres, el.btnCargoGov, el.btnCargoSen].forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');

        state.currentCargo = btn.getAttribute('data-cargo');
        if (el.ufStrip) renderUfStrip();
        updateMapCargoColors();
        renderVerdict();
      });
    });

    // Reset to Brasil listeners across UI
    if (el.btnResetBrasil) {
      el.btnResetBrasil.addEventListener('click', resetToBrasil);
    }
    if (el.btnPillResetBrasil) {
      el.btnPillResetBrasil.addEventListener('click', (e) => {
        e.stopPropagation();
        resetToBrasil();
      });
    }
    if (el.mapActivePill) {
      el.mapActivePill.addEventListener('click', () => {
        if (state.currentScope.type !== 'brasil') {
          resetToBrasil();
        }
      });
    }

    // Search Trigger and Modal
    el.searchTriggerBtn.addEventListener('click', openSearch);
    el.searchCloseBtn.addEventListener('click', closeSearch);

    el.searchInput.addEventListener('input', (e) => {
      renderSearchResults(e.target.value);
    });

    // Keyboard Shortcuts (Ctrl+K, Cmd+K, Escape)
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openSearch();
      } else if (e.key === 'Escape') {
        closeSearch();
        closeShare();
      }
    });

    // Close modals on clicking backdrop
    el.searchModal.addEventListener('click', (e) => {
      if (e.target === el.searchModal) closeSearch();
    });

    el.shareModal.addEventListener('click', (e) => {
      if (e.target === el.shareModal) closeShare();
    });

    // Share Trigger and Modal
    el.btnShareCard.addEventListener('click', openShare);
    el.shareCloseBtn.addEventListener('click', closeShare);

    // Share to WhatsApp
    el.btnShareWhatsApp.addEventListener('click', () => {
      const text = encodeURIComponent(getShareContent() + ' ' + window.location.href);
      window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    });

    // Share to X (Twitter)
    el.btnShareTwitter.addEventListener('click', () => {
      const text = encodeURIComponent(getShareContent());
      const url = encodeURIComponent(window.location.href);
      window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
    });

    // Copy to Clipboard
    el.btnCopyText.addEventListener('click', () => {
      const content = getShareContent() + ' ' + window.location.href;
      navigator.clipboard.writeText(content).then(() => {
        el.copyAlert.classList.add('show');
        setTimeout(() => el.copyAlert.classList.remove('show'), 3000);
      });
    });

    // Keep map canvas properly sized and framed on window resize
    window.addEventListener('resize', () => {
      if (mapInstance && mapLoaded) {
        mapInstance.resize();
        if (!state.currentScope || state.currentScope.type === 'brasil') {
          fitBrasilBounds(true);
        }
      }
    });
  }

  // Start app
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
