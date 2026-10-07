import React from 'react';
import { formatNumber, formatPercent, getRankBadge } from '../utils/electoralMath';

export default function TelemetryBar({ brasilData }) {
  if (!brasilData) return null;

  const aptos = brasilData.total_aptos || 155856080;
  const ausentes = brasilData.total_abstencao || 32443719;
  const taxa = brasilData.taxa_abstencao || 20.82;
  const presRank = brasilData.cargos?.Presidente?.posicao || 3;

  return (
    <section className="telemetry-bar" aria-label="Resumo eleitoral">
      <div className="telemetry-inner">
        <div className="telemetry-item">
          <span className="telemetry-label">Eleitorado Nacional</span>
          <strong className="telemetry-val" id="telAptos">{formatNumber(aptos)}</strong>
        </div>
        <div className="telemetry-sep"></div>
        <div className="telemetry-item">
          <span className="telemetry-label">Eleitores Ausentes (Brasil)</span>
          <strong className="telemetry-val alert-gold" id="telAusentes">{formatNumber(ausentes)}</strong>
        </div>
        <div className="telemetry-sep"></div>
        <div className="telemetry-item">
          <span className="telemetry-label">Taxa Média de Abstenção</span>
          <strong className="telemetry-val" id="telTaxa">{formatPercent(taxa)}</strong>
        </div>
        <div className="telemetry-sep"></div>
        <div className="telemetry-item">
          <span className="telemetry-label">Candidata Abstenção na corrida presidencial</span>
          <strong className="telemetry-val badge-rank" id="telPosicao">3º Lugar</strong>
        </div>
      </div>
    </section>
  );
}
