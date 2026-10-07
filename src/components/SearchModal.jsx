import React, { useState, useEffect, useRef, useMemo } from 'react';
import { formatNumber, formatPercent } from '../utils/electoralMath';

function normalizeStr(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export default function SearchModal({
  isOpen,
  onClose,
  estadosData,
  municipiosData,
  onSelectScope
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const resultsContainerRef = useRef(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [isOpen]);

  // Unified list of all Brazilian municipalities (5.564)
  const allMunicipios = useMemo(() => {
    if (window.MUNICIPIOS_INDEX && window.MUNICIPIOS_INDEX.length > 0) {
      return window.MUNICIPIOS_INDEX;
    }
    if (municipiosData && municipiosData.length > 100) {
      return municipiosData;
    }
    if (window.MUNICIPIOS_GEO?.features?.length > 0) {
      return window.MUNICIPIOS_GEO.features.map(f => f.properties);
    }
    return municipiosData || [];
  }, [municipiosData]);

  // Compute search results with accent-insensitive search and smart ranking
  const results = useMemo(() => {
    if (!isOpen) return [];

    const q = query.trim();
    const qNorm = normalizeStr(q);

    // Default suggestions when query is empty: Brasil + Top Capitais
    if (!qNorm) {
      const defaultList = [
        {
          type: 'brasil',
          id: 'BR',
          name: '🇧🇷 Brasil (Todo o País)',
          subtitle: 'Visão Nacional · 158,7M de eleitores'
        }
      ];

      // Add top states
      (estadosData || []).slice(0, 6).forEach(u => {
        defaultList.push({
          type: 'uf',
          id: u.uf,
          name: `${u.nome} (${u.uf})`,
          subtitle: `Estado · ${formatNumber(u.aptos)} eleitores`,
          item: u
        });
      });

      // Add major capitals
      const majorCapitals = ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Belo Horizonte', 'Curitiba'];
      allMunicipios
        .filter(m => majorCapitals.includes(m.nome))
        .slice(0, 6)
        .forEach(m => {
          defaultList.push({
            type: 'municipio',
            id: m.id || m.slug,
            name: `${m.nome} - ${m.uf}`,
            subtitle: `Capital · ${formatNumber(m.aptos)} eleitores · Abstenção: ${formatPercent(m.taxa_abstencao ?? m.taxa)}`,
            item: m
          });
        });

      return defaultList;
    }

    const matches = [];

    // 1. Check Brasil
    if ('brasil'.includes(qNorm) || 'nacional'.includes(qNorm) || 'todo o pais'.includes(qNorm)) {
      matches.push({
        type: 'brasil',
        id: 'BR',
        name: '🇧🇷 Brasil (Todo o País)',
        subtitle: 'Visão Nacional · 158,7M de eleitores'
      });
    }

    // 2. Check Estados (27 UFs)
    (estadosData || []).forEach(u => {
      const uNorm = normalizeStr(u.nome);
      const sigla = (u.uf || '').toLowerCase();
      if (uNorm.includes(qNorm) || sigla === qNorm || `${uNorm} ${sigla}`.includes(qNorm)) {
        matches.push({
          type: 'uf',
          id: u.uf,
          name: `${u.nome} (${u.uf})`,
          subtitle: `Estado · ${formatNumber(u.aptos)} eleitores · Abstenção: ${formatPercent(u.taxa_abstencao)}`,
          item: u
        });
      }
    });

    // 3. Check Municípios (All 5.564 with normalized accents)
    const munMatches = [];
    for (let i = 0; i < allMunicipios.length; i++) {
      const m = allMunicipios[i];
      const mNorm = normalizeStr(m.nome);
      const ufNorm = (m.uf || '').toLowerCase();

      if (mNorm.includes(qNorm) || `${mNorm} ${ufNorm}`.includes(qNorm)) {
        const isPrefix = mNorm.startsWith(qNorm);
        const aptos = m.aptos || m.pop || 0;
        munMatches.push({
          item: m,
          isPrefix,
          aptos
        });
      }
    }

    // Sort municipalities: prefix matches first, then larger electorate first
    munMatches.sort((a, b) => {
      if (a.isPrefix && !b.isPrefix) return -1;
      if (!a.isPrefix && b.isPrefix) return 1;
      return b.aptos - a.aptos;
    });

    // Add up to 35 municipalities
    munMatches.slice(0, 35).forEach(({ item: m }) => {
      const taxaVal = m.taxa_abstencao ?? m.taxa ?? 0;
      matches.push({
        type: 'municipio',
        id: m.id || m.slug,
        name: `${m.nome} - ${m.uf}`,
        subtitle: `Município · ${formatNumber(m.aptos)} eleitores · Abstenção: ${formatPercent(taxaVal)}`,
        item: m
      });
    });

    return matches;
  }, [query, isOpen, estadosData, allMunicipios]);

  // Keep selected index within bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Key navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(idx => Math.min(results.length - 1, idx + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(idx => Math.max(0, idx - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleSelect = (item) => {
    onSelectScope(item);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="search-modal-backdrop open" onClick={onClose}>
      <div className="search-modal-box glass-panel" onClick={e => e.stopPropagation()}>
        <div className="search-input-wrapper">
          <svg className="search-icon" viewBox="0 0 20 20" width="18" height="18" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Digite o nome de qualquer município (ex: Campinas, Sobral, Joinville)..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="search-close-btn" onClick={onClose} title="Fechar (Esc)">ESC</button>
        </div>

        <div className="search-results-list" ref={resultsContainerRef}>
          {results.length === 0 ? (
            <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--fg-4)', fontSize: '0.9rem' }}>
              Nenhum município ou estado encontrado para "<strong>{query}</strong>".
            </div>
          ) : (
            results.map((res, idx) => (
              <div
                key={`${res.type}-${res.id}-${idx}`}
                className={`search-result-item ${selectedIndex === idx ? 'selected' : ''}`}
                onClick={() => handleSelect(res)}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div className="search-result-main">
                  <span className="search-res-name">{res.name}</span>
                  <span className="search-res-uf">{res.subtitle}</span>
                </div>
                <span className="search-res-rank">Ver Análise →</span>
              </div>
            ))
          )}
        </div>

        <div className="search-footer-hint">
          <span>Navegue com <kbd>↑</kbd> <kbd>↓</kbd> e pressione <kbd>Enter</kbd></span>
          <span>Pressione <kbd>Esc</kbd> para fechar</span>
        </div>
      </div>
    </div>
  );
}
