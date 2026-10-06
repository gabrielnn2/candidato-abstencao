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
