import React from 'react';

export default function MethodologySection() {
  return (
    <>
      {/* Curiosities and Highlights */}
      <section className="curiosities-grid">
        <div className="curiosity-card glass-panel">
          <div className="curiosity-badge">🏆 Destaque Histórico</div>
          <h4 className="curiosity-title">Cidades onde a Abstenção Ficaria em 1º Lugar</h4>
          <p className="curiosity-desc">
            Municípios onde o volume de eleitores ausentes foi maior do que a votação inteira do primeiro colocado:
          </p>
          <ul className="highlight-list">
            <li><strong>Manaus (AM)</strong>: 301.842 ausentes (21,5%) · 1º lugar</li>
            <li><strong>São Luís (MA)</strong>: 147.291 ausentes (19,8%) · 1º lugar</li>
            <li><strong>Porto Velho (RO)</strong>: 78.412 ausentes (23,1%) · 1º lugar</li>
          </ul>
        </div>

        <div className="curiosity-card glass-panel special-amber">
          <div className="curiosity-badge">⚖️ Renovação de 2/3 do Senado</div>
          <h4 className="curiosity-title">A Abstenção seria Eleita Senadora?</h4>
          <p className="curiosity-desc">
            Em 2026, os brasileiros elegem <strong>dois senadores por estado</strong>. Em todas as 27 Unidades da Federação, o total de eleitores ausentes supera com folga o 2º senador eleito!
          </p>
          <div className="senate-impact-box">
            <div className="impact-stat">
              <span className="stat-number">27 de 27</span>
              <span className="stat-label">Estados onde a Abstenção conquistaria uma cadeira no Senado Federal</span>
            </div>
          </div>
        </div>

        <div className="curiosity-card glass-panel">
          <div className="curiosity-badge">📈 Taxas Extremas</div>
          <h4 className="curiosity-title">Recordes de Não-Comparecimento</h4>
          <div className="extremes-comparison">
            <div>
              <span className="extreme-label">Mais Ausentes:</span>
              <ul className="mini-list">
                <li>Acre (AC): 24,1%</li>
                <li>Rondônia (RO): 23,8%</li>
                <li>Amazonas (AM): 23,2%</li>
              </ul>
            </div>
            <div>
              <span className="extreme-label">Menos Ausentes:</span>
              <ul className="mini-list">
                <li>Ceará (CE): 17,2%</li>
                <li>Piauí (PI): 17,5%</li>
                <li>Paraíba (PB): 17,9%</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Methodology & Legal Context */}
      <footer className="methodology-card glass-panel">
        <div className="methodology-content">
          <div className="methodology-text">
            <h4 className="methodology-title">Metodologia e Critérios de Análise</h4>
            <p>
              Este projeto analisa os dados públicos oficiais do <strong>Tribunal Superior Eleitoral (TSE)</strong>.
              Na legislação brasileira (Constituição de 1988, Art. 77 § 2º), votos em branco e nulos, assim como as abstenções, não são contabilizados para o cálculo dos votos válidos.
            </p>
            <p>
              O objetivo jornalístico desta ferramenta interativa é <strong>dimensionar o peso político do não-comparecimento</strong>,
              simulando o cenário em que esses cidadãos teriam elegido uma candidatura unificada sob o registro "Abstenção",
              evidenciando a enorme força do eleitorado ausente na democracia representativa.
            </p>
          </div>
          <div className="methodology-links">
            <a href="https://dadosabertos.tse.jus.br" target="_blank" rel="noopener noreferrer" className="tse-link">
              🔗 Portal de Dados Abertos do TSE
            </a>
            <a href="https://resultados.tse.jus.br" target="_blank" rel="noopener noreferrer" className="tse-link">
              🏛️ Sistema Oficial de Divulgação de Resultados
            </a>
          </div>
        </div>
        <div className="site-credit">
          Projeto de Análise Eleitoral & Data Journalism · Desenvolvido com dados públicos abertos e React + Vite.
        </div>
      </footer>
    </>
  );
}
