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

export function getFillColorExpression(cargo) {
  const prop = cargo === 'Presidente' ? 'pos_pres' : (cargo === 'Governador' ? 'pos_gov' : 'pos_sen');
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

