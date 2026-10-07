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

export function formatVotosAmigavel(votos) {
  if (!votos) return '0';
  const num = Number(votos);
  if (num >= 1000000) {
    const milhoes = (num / 1000000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    return `${milhoes} ${num >= 2000000 ? 'milhões' : 'milhão'}`;
  }
  if (num >= 10000) {
    const mil = (num / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    return `${mil} mil`;
  }
  return Number(num).toLocaleString('pt-BR');
}

export function cleanCandidateName(nome) {
  if (!nome) return '';
  // Se for abstenção com qualquer sufixo, padroniza como Candidata Abstenção
  if (/^Absten[çc][ãa]o/i.test(nome) || /Candidata Absten[çc][ãa]o/i.test(nome)) return 'Candidata Abstenção';
  // Remove sufixo de partido entre parênteses, ex: "Lula (PT)" -> "Lula"
  return nome.replace(/\s*\([A-Z0-9\s/+-]+\)$/i, '').trim();
}

export function getRankBadge(pos) {
  if (pos === 1) return '🥇 1º Lugar';
  if (pos === 2) return '🥈 2º Lugar';
  if (pos === 3) return '🥉 3º Lugar';
  return `${pos}º Lugar`;
}

export const GOV_FORCOU_E_IRIA_2T = ['GO', 'MG', 'MS', 'MT', 'PR', 'RO'];
export const GOV_FORCOU_2T_ENTRE_DOIS = ['AL', 'BA', 'CE', 'MA', 'PA', 'PE', 'RS', 'SE', 'SP'];
export const GOV_NAO_ALTEROU = ['AC', 'AM', 'AP', 'DF', 'ES', 'PB', 'PI', 'RJ', 'RN', 'RR', 'SC', 'TO'];

export function getGovStatus(item) {
  if (!item) return 'nao_alterou';

  // 1. Prioridade absoluta para status_gov direto do item (município ou feature)
  const rawStatus = item.status_gov || item.properties?.status_gov;
  if (rawStatus === 'forcou_e_iria_2t' || rawStatus === 'foi_2t') return 'forcou_e_iria_2t';
  if (rawStatus === 'forcou_2t_entre_dois' || rawStatus === 'forcou_2t') return 'forcou_2t_entre_dois';
  if (rawStatus === 'nao_alterou') return 'nao_alterou';

  // 2. Se o item for um município (tem id numérico > 1000 ou cargos.Presidente)
  const itemId = item.id || item.properties?.id;
  const isMun = (itemId && !isNaN(Number(itemId)) && Number(itemId) > 1000);
  if (isMun) {
    return getMunicipalGovStatus(item);
  }

  // 3. Correspondência direta se for string de UF (2 letras)
  if (typeof item === 'string') {
    const ufUpper = item.toUpperCase();
    if (GOV_FORCOU_E_IRIA_2T.includes(ufUpper)) return 'forcou_e_iria_2t';
    if (GOV_FORCOU_2T_ENTRE_DOIS.includes(ufUpper)) return 'forcou_2t_entre_dois';
    if (GOV_NAO_ALTEROU.includes(ufUpper)) return 'nao_alterou';
  }

  // 4. Se for objeto de Estado (UF)
  const uf = item.uf || item.properties?.uf || item.id;
  if (uf && typeof uf === 'string' && uf.length === 2 && !isMun) {
    const ufUpper = uf.toUpperCase();
    if (GOV_FORCOU_E_IRIA_2T.includes(ufUpper)) return 'forcou_e_iria_2t';
    if (GOV_FORCOU_2T_ENTRE_DOIS.includes(ufUpper)) return 'forcou_2t_entre_dois';
    if (GOV_NAO_ALTEROU.includes(ufUpper)) return 'nao_alterou';
  }

  return 'nao_alterou';
}

export function getMunicipalGovStatus(props, ufItem) {
  if (!props) return 'nao_alterou';
  if (props.status_gov) return props.status_gov;
  const posGov = Number(props.pos_gov || props.cargos?.Governador?.posicao || 3);
  const iria2t = props.iria_2t_gov ?? props.cargos?.Governador?.iria_segundo_turno;
  
  if (posGov === 1) {
    return iria2t ? 'forcou_e_iria_2t' : 'nao_alterou';
  }
  if (posGov === 2) {
    return iria2t ? 'forcou_e_iria_2t' : 'nao_alterou';
  }
  if (posGov >= 3) {
    const gov1votos = props.gov_votos_1o || props.cargos?.Governador?.ranking?.find(c => !c.is_abstencao)?.votos;
    const totSim = (props.gov_total_validos || 0) + (props.abstencao || 0);
    if (gov1votos && totSim > 0 && (gov1votos / totSim <= 0.5)) {
      return 'forcou_2t_entre_dois';
    }
  }

  return 'nao_alterou';
}

export function getGovStatusLabel(status) {
  switch (status) {
    case 'forcou_e_iria_2t':
      return 'Forçaria e iria para o 2º turno';
    case 'forcou_2t_entre_dois':
      return 'Forçaria um 2º turno entre os dois primeiros colocados';
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
      ['forcou_e_iria_2t', 'foi_2t'], '#10b981',       // Verde Esmeralda (Forçaria e iria para o 2º turno)
      ['forcou_2t_entre_dois', 'forcou_2t'], '#f59e0b', // Âmbar / Ouro (Forçaria um 2º turno entre os dois primeiros colocados)
      'nao_alterou', '#262d3d',                         // Dark Slate (Não alteraria)
      /* default */ '#262d3d'
    ];
  }
  if (cargo === 'Presidente') {
    // Para presidente não há 1º lugar da abstenção em nenhuma agregação:
    // 2º lugar: Iria para o 2º Turno (#38bdf8 - Ciano)
    // 3º ou abaixo: Não iria para o 2º Turno (#262d3d - Dark Slate)
    return [
      'match',
      ['get', 'pos_pres'],
      2, '#38bdf8', // Iria para o 2º Turno (Ciano)
      /* default */ '#262d3d' // Não iria para o 2º Turno (Dark Slate)
    ];
  }
  // Cargo Senador
  return [
    'match',
    ['get', 'pos_sen'],
    1, '#f59e0b', // 1º Lugar (Gold)
    2, '#38bdf8', // 2º Lugar · Eleita Senadora (Cyan)
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
    let competitors = [];

    if (cargo === 'Presidente' && props.cand_1o && props.votos_1o) {
      // DADOS REAIS E EXATOS DO TSE - PRESIDENTE
      if (props.votos_1o > 0) {
        competitors.push({
          nome: props.cand_1o,
          partido: props.partido_1o || 'PARTIDO',
          nome_exibicao: `${props.cand_1o} (${props.partido_1o || ''})`,
          numero: props.numero_1o || '',
          votos: props.votos_1o,
          is_abstencao: false,
          foto: ''
        });
      }
      if (props.votos_2o > 0) {
        competitors.push({
          nome: props.cand_2o,
          partido: props.partido_2o || 'PARTIDO',
          nome_exibicao: `${props.cand_2o} (${props.partido_2o || ''})`,
          numero: props.numero_2o || '',
          votos: props.votos_2o,
          is_abstencao: false,
          foto: ''
        });
      }
      if (props.votos_3o > 0) {
        competitors.push({
          nome: props.cand_3o,
          partido: props.partido_3o || 'PARTIDO',
          nome_exibicao: `${props.cand_3o} (${props.partido_3o || ''})`,
          numero: props.numero_3o || '',
          votos: props.votos_3o,
          is_abstencao: false,
          foto: ''
        });
      }
      if (props.outros_votos > 0) {
        competitors.push({
          nome: 'Outros Candidatos',
          partido: 'OUTROS',
          nome_exibicao: 'Outros Candidatos (OUTROS)',
          numero: '--',
          votos: props.outros_votos,
          is_abstencao: false,
          foto: ''
        });
      }
    } else if (cargo === 'Governador' && props.gov_cand_1o && props.gov_votos_1o) {
      // DADOS REAIS E EXATOS DO TSE - GOVERNADOR
      if (props.gov_votos_1o > 0) {
        competitors.push({
          nome: props.gov_cand_1o,
          partido: props.gov_partido_1o || 'PARTIDO',
          nome_exibicao: `${props.gov_cand_1o} (${props.gov_partido_1o || ''})`,
          numero: props.gov_numero_1o || '',
          votos: props.gov_votos_1o,
          is_abstencao: false,
          foto: ''
        });
      }
      if (props.gov_votos_2o > 0) {
        competitors.push({
          nome: props.gov_cand_2o,
          partido: props.gov_partido_2o || 'PARTIDO',
          nome_exibicao: `${props.gov_cand_2o} (${props.gov_partido_2o || ''})`,
          numero: props.gov_numero_2o || '',
          votos: props.gov_votos_2o,
          is_abstencao: false,
          foto: ''
        });
      }
      if (props.gov_votos_3o > 0) {
        competitors.push({
          nome: props.gov_cand_3o,
          partido: props.gov_partido_3o || 'PARTIDO',
          nome_exibicao: `${props.gov_cand_3o} (${props.gov_partido_3o || ''})`,
          numero: props.gov_numero_3o || '',
          votos: props.gov_votos_3o,
          is_abstencao: false,
          foto: ''
        });
      }
      if (props.gov_outros_votos > 0) {
        competitors.push({
          nome: 'Outros Candidatos',
          partido: 'OUTROS',
          nome_exibicao: 'Outros Candidatos (OUTROS)',
          numero: '--',
          votos: props.gov_outros_votos,
          is_abstencao: false,
          foto: ''
        });
      }
    } else if (cargo === 'Senador' && props.sen_cand_1o && props.sen_votos_1o) {
      // DADOS REAIS E EXATOS DO TSE - SENADOR
      if (props.sen_votos_1o > 0) {
        competitors.push({
          nome: props.sen_cand_1o,
          partido: props.sen_partido_1o || 'PARTIDO',
          nome_exibicao: `${props.sen_cand_1o} (${props.sen_partido_1o || ''})`,
          numero: props.sen_numero_1o || '',
          votos: props.sen_votos_1o,
          is_abstencao: false,
          foto: ''
        });
      }
      if (props.sen_votos_2o > 0) {
        competitors.push({
          nome: props.sen_cand_2o,
          partido: props.sen_partido_2o || 'PARTIDO',
          nome_exibicao: `${props.sen_cand_2o} (${props.sen_partido_2o || ''})`,
          numero: props.sen_numero_2o || '',
          votos: props.sen_votos_2o,
          is_abstencao: false,
          foto: ''
        });
      }
      if (props.sen_votos_3o > 0) {
        competitors.push({
          nome: props.sen_cand_3o,
          partido: props.sen_partido_3o || 'PARTIDO',
          nome_exibicao: `${props.sen_cand_3o} (${props.sen_partido_3o || ''})`,
          numero: props.sen_numero_3o || '',
          votos: props.sen_votos_3o,
          is_abstencao: false,
          foto: ''
        });
      }
      if (props.sen_outros_votos > 0) {
        competitors.push({
          nome: 'Outros Candidatos',
          partido: 'OUTROS',
          nome_exibicao: 'Outros Candidatos (OUTROS)',
          numero: '--',
          votos: props.sen_outros_votos,
          is_abstencao: false,
          foto: ''
        });
      }
    } else {
      // Estimativa proporcional para cargos locais sem dados nominais no índice
      const ufCargo = ufItem?.cargos?.[cargo];
      const realCands = ufCargo?.ranking ? ufCargo.ranking.filter(c => !c.is_abstencao) : [];
      const sumPct = realCands.reduce((acc, c) => acc + (c.percentual_simulado || 1), 0) || 1;
      
      competitors = realCands.map(c => {
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
    }

    // Add Candidata Abstenção com os votos exatos da urna
    competitors.push({
      nome: 'Candidata Abstenção',
      partido: 'Partido Abstenção',
      nome_exibicao: 'Candidata Abstenção',
      numero: '00',
      votos: abstencao,
      is_abstencao: true,
      foto: 'assets/abstencao.svg'
    });

    const hasRealCargoData = (cargo === 'Presidente' && props.cand_1o && props.votos_1o) ||
                             (cargo === 'Governador' && props.gov_cand_1o && props.gov_votos_1o) ||
                             (cargo === 'Senador' && props.sen_cand_1o && props.sen_votos_1o);

    // Se NÃO for cargo com dados nominais reais, alinhar se houver alvo pré-computado
    if (!hasRealCargoData) {
      const targetProp = cargo === 'Presidente' ? props.pos_pres : (cargo === 'Governador' ? props.pos_gov : props.pos_sen);
      competitors.sort((a, b) => b.votos - a.votos);

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
    }

    // Ordenação final por votos
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

    const vencedor1t = posAbst === 1 && competitors[0].percentual_simulado > 50;
    // Constituição Federal Art. 77, § 2º: 2º turno apenas se o líder NÃO superou 50%
    const iria2t = (cargo !== 'Senador') && (posAbst <= 2) && (competitors[0].percentual_simulado <= 50);

    cargos[cargo] = {
      posicao: posAbst,
      votos: abstencao,
      total_aptos: aptos,
      taxa_abstencao: taxa,
      vencedor_primeiro_turno: vencedor1t,
      iria_segundo_turno: iria2t,
      eleito_senado: cargo === 'Senador' && posAbst <= 2,
      candidatos_superados: superados,
      diferenca_lider: difLider,
      ranking: competitors
    };
  }

  return cargos;
}

