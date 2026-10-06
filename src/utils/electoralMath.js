// Electoral Math, Formatting, and Constants for Candidato Abstenção

export const REGION_STATES = {
  'Norte': ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO'],
  'Nordeste': ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
  'Centro-Oeste': ['DF', 'GO', 'MT', 'MS'],
  'Sudeste': ['ES', 'MG', 'RJ', 'SP'],
  'Sul': ['PR', 'RS', 'SC']
};

export const BRAZIL_BOUNDS = [[-73.99, -33.75], [-34.79, 5.27]];
export const BRAZIL_FIT_PADDING = { top: 32, bottom: 32, left: 24, right: 38 };

export const REGION_BOUNDS = {
  'Norte': [[-73.9903, -13.6933], [-45.6957, 5.2722]],
  'Nordeste': [[-48.7547, -18.3489], [-32.3922, -1.0443]],
  'Centro-Oeste': [[-61.6323, -24.0679], [-45.9069, -7.3486]],
  'Sudeste': [[-53.1096, -25.3118], [-28.8357, -14.2327]],
  'Sul': [[-57.6433, -33.7516], [-48.0231, -22.5162]]
};

export const STATE_BOUNDS = {
  "AC": [[-73.9903, -11.1448], [-66.6235, -7.1115]],
  "AL": [[-38.2372, -10.4988], [-35.1523, -8.8127]],
  "AM": [[-73.801, -9.8177], [-56.0971, 2.2466]],
  "AP": [[-54.8758, -1.2356], [-49.8758, 4.4371]],
  "BA": [[-46.6167, -18.3489], [-37.3423, -8.5324]],
  "CE": [[-41.4231, -7.8578], [-37.2526, -2.784]],
  "DF": [[-48.2867, -16.0511], [-47.3084, -15.4997]],
  "ES": [[-41.8794, -21.3013], [-28.8357, -17.8915]],
  "GO": [[-53.2507, -19.4987], [-45.9069, -12.3955]],
  "MA": [[-48.7547, -10.2612], [-41.7965, -1.0443]],
  "MG": [[-51.0455, -22.9223], [-39.8565, -14.2327]],
  "MS": [[-58.167, -24.0679], [-50.9227, -17.1662]],
  "MT": [[-61.6323, -18.0416], [-50.2244, -7.3486]],
  "PA": [[-58.8971, -9.8407], [-46.0605, 2.5914]],
  "PB": [[-38.7649, -8.3025], [-34.7933, -6.0262]],
  "PE": [[-41.358, -9.4825], [-32.3922, -3.8301]],
  "PI": [[-45.9939, -10.9283], [-40.3701, -2.7389]],
  "PR": [[-54.6175, -26.7168], [-48.0231, -22.5162]],
  "RJ": [[-44.8885, -23.3677], [-40.9564, -20.7637]],
  "RN": [[-38.5812, -6.9822], [-34.9694, -4.8318]],
  "RO": [[-66.8097, -13.6933], [-59.7738, -7.9689]],
  "RR": [[-64.8247, -1.5803], [-58.8864, 5.2722]],
  "RS": [[-57.6433, -33.7516], [-49.6911, -27.0801]],
  "SC": [[-53.8358, -29.3509], [-48.3583, -25.9555]],
  "SE": [[-38.2453, -11.5672], [-36.3935, -9.5149]],
  "SP": [[-53.1096, -25.3118], [-44.1605, -19.7792]],
  "TO": [[-50.7416, -13.4673], [-45.6957, -5.168]]
};

export function formatNumber(val) {
  if (val === null || val === undefined) return '0';
  return Number(val).toLocaleString('pt-BR');
}

export function formatPercent(val) {
  if (val === null || val === undefined) return '0,00%';
  return Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + '%';
}

export function getRankBadge(pos) {
  if (pos === 1) return '🥇 1º Lugar';
  if (pos === 2) return '🥈 2º Lugar';
  if (pos === 3) return '🥉 3º Lugar';
  return `${pos}º Lugar`;
}

export function getGovStatus(item) {
  if (!item) return 'nao_alterou';
  const pos = item.cargos?.Governador?.posicao || item.pos_gov || item.posicao || 3;
  const d1t = item.dados_1t_governador;

  if (d1t) {
    // Teve vitória em 1º turno na eleição oficial
    if (!d1t.sobrevive_1t) {
      if (pos <= 2) {
        return 'forcou_e_iria_2t'; // Forçaria e iria para o segundo turno
      } else {
        return 'forcou_2t_entre_dois'; // Forçaria um segundo turno entre os dois primeiros colocados
      }
    } else {
      return 'nao_alterou'; // Não alteraria (governador resistiu com > 50%)
    }
  } else {
    // Disputa já iria para o 2º turno originalmente
    if (pos <= 2) {
      return 'iria_2t_no_lugar'; // Iria para o segundo turno no lugar de um dos dois primeiros candidatos
    } else {
      return 'nao_alterou'; // Não alteraria
    }
  }
}

export function getGovStatusLabel(status) {
  switch (status) {
    case 'forcou_e_iria_2t':
      return 'Forçaria e iria para o segundo turno';
    case 'forcou_2t_entre_dois':
      return 'Forçaria um segundo turno entre os dois primeiros colocados';
    case 'iria_2t_no_lugar':
      return 'Iria para o segundo turno no lugar de um dos dois primeiros candidatos';
    case 'nao_alterou':
    default:
      return 'Não alteraria';
  }
}

export function getFillColorExpression(cargo) {
  if (cargo === 'Governador') {
    return [
      'match',
      ['get', 'status_gov'],
      'forcou_e_iria_2t', '#10b981',       // Verde Esmeralda (Forçaria e iria para o segundo turno)
      'forcou_2t_entre_dois', '#f59e0b',    // Âmbar / Ouro (Forçaria um segundo turno entre os dois primeiros colocados)
      'iria_2t_no_lugar', '#38bdf8',        // Ciano / Azul (Iria para o segundo turno no lugar de um dos dois primeiros candidatos)
      /* default nao_alterou */ '#262d3d'  // Dark Slate (Não alteraria)
    ];
  }
  const prop = cargo === 'Presidente' ? 'pos_pres' : 'pos_sen';
  return [
    'match',
    ['get', prop],
    1, '#f59e0b', // 1º Lugar (Gold)
    2, '#38bdf8', // 2º Lugar / 2º Turno / Vaga (Cyan)
    /* default */ '#262d3d' // 3º ou abaixo (Dark Slate)
  ];
}

export function synthesizeMunicipalCargos(props, ufItem) {
  const aptos = props.aptos || (props.pop ? Math.round(props.pop * 0.78) : 50000);
  const abstencao = props.abstencao || props.abstencoes || Math.round(aptos * ((props.taxa || 20) / 100));
  const taxa = props.taxa || (aptos > 0 ? Number(((abstencao / aptos) * 100).toFixed(2)) : 20.0);
  const comparecimento = Math.max(1, aptos - abstencao);
  const nominalVotesTotal = Math.round(comparecimento * 0.92);

  const cargos = {};
  const cargosList = ['Presidente', 'Governador', 'Senador'];

  for (const cargo of cargosList) {
    const ufCargo = ufItem?.cargos?.[cargo];
    const realCands = ufCargo?.ranking ? ufCargo.ranking.filter(c => !c.is_abstencao) : [];
    
    // Sum of shares from the parent state
    const sumPct = realCands.reduce((acc, c) => acc + (c.percentual_simulado || 1), 0) || 1;
    
    const competitors = realCands.map(c => {
      const share = (c.percentual_simulado || 1) / sumPct;
      const candVotos = Math.max(1, Math.round(nominalVotesTotal * share));
      return {
        nome: c.nome,
        partido: c.partido,
        nome_exibicao: c.nome_exibicao || `${c.nome} (${c.partido})`,
        numero: c.numero || '',
        votos: candVotos,
        is_abstencao: false,
        foto: c.foto || ''
      };
    });

    // Add Abstenção
    competitors.push({
      nome: 'Abstenção',
      partido: 'ELEITORES AUSENTES',
      nome_exibicao: 'Abstenção (ELEITORES AUSENTES)',
      numero: '00',
      votos: abstencao,
      is_abstencao: true,
      foto: 'assets/abstencao.svg'
    });

    // Target rank from properties if explicitly stored in geojson
    const targetProp = cargo === 'Presidente' ? props.pos_pres : (cargo === 'Governador' ? props.pos_gov : props.pos_sen);

    // Initial sort
    competitors.sort((a, b) => b.votos - a.votos);

    // If precomputed target position exists and differs, align abstencao votes slightly
    if (targetProp === 1) {
      const abst = competitors.find(c => c.is_abstencao);
      const otherMax = Math.max(...competitors.filter(c => !c.is_abstencao).map(c => c.votos), 1);
      if (abst && abst.votos <= otherMax) {
        abst.votos = otherMax + Math.max(50, Math.round(otherMax * 0.05));
      }
    } else if (targetProp === 2) {
      const abst = competitors.find(c => c.is_abstencao);
      const nonAbst = competitors.filter(c => !c.is_abstencao).sort((a, b) => b.votos - a.votos);
      if (abst && nonAbst.length >= 1) {
        const top1 = nonAbst[0].votos;
        const top2 = nonAbst.length > 1 ? nonAbst[1].votos : 0;
        if (abst.votos >= top1) {
          abst.votos = Math.round((top1 + top2) / 2);
        } else if (abst.votos <= top2) {
          abst.votos = top2 + Math.max(25, Math.round(top2 * 0.04));
        }
      }
    }

    // Re-sort after alignment
    competitors.sort((a, b) => b.votos - a.votos);

    const totalSimulado = competitors.reduce((acc, c) => acc + c.votos, 0);
    let posAbst = 3;
    const superados = [];

    competitors.forEach((c, idx) => {
      c.posicao = idx + 1;
      c.percentual_simulado = totalSimulado > 0 ? Number(((c.votos / totalSimulado) * 100).toFixed(2)) : 0;
      if (c.is_abstencao) {
        posAbst = c.posicao;
      } else if (posAbst && c.posicao > posAbst) {
        superados.push(c.nome_exibicao);
      }
    });

    const leader = competitors.find(c => !c.is_abstencao) || competitors[0];
    const difLider = abstencao - (leader?.votos || 0);

    cargos[cargo] = {
      posicao: posAbst,
      votos: abstencao,
      total_aptos: aptos,
      taxa_abstencao: taxa,
      vencedor_primeiro_turno: posAbst === 1 && competitors[0].percentual_simulado > 50,
      iria_segundo_turno: (cargo !== 'Senador') && (posAbst === 2 || (posAbst === 1 && competitors[0].percentual_simulado <= 50)),
      eleito_senado: cargo === 'Senador' && posAbst <= 2,
      candidatos_superados: superados,
      diferenca_lider: difLider,
      ranking: competitors
    };
  }

  return cargos;
}

