import React, { useState, useEffect, useRef } from 'react';
import { formatNumber, formatPercent } from '../utils/electoralMath';

export default function SearchModal({
  isOpen,
  onClose,
  estadosData,
  municipiosData,
  onSelectScope
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Filter search index
  useEffect(() => {
    if (!isOpen) return;
    const q = query.trim().toLowerCase();
    if (!q) {
      // Suggest Brasil and top states
      setResults([
        { type: 'brasil', id: 'BR', name: '🇧🇷 Brasil (Todo o País)', subtitle: 'Visão Nacional · 158,7M de eleitores' },
        ...(estadosData || []).slice(0, 8).map(u => ({
          type: 'uf',
          id: u.uf,
          name: `${u.nome} (${u.uf})`,
          subtitle: `Estado · Capital: ${u.capital || u.nome} · ${formatNumber(u.aptos)} eleitores`,
          item: u
        }))
      ]);
      setSelectedIndex(0);
      return;
    }

    const matches = [];

    // Check Brasil
    if ('brasil'.includes(q) || 'nacional'.includes(q) || 'todo o país'.includes(q)) {
      matches.push({ type: 'brasil', id: 'BR', name: '🇧🇷 Brasil (Todo o País)', subtitle: 'Visão Nacional · 158,7M de eleitores' });
    }

    // Check Estados
    (estadosData || []).forEach(u => {
      if (u.nome.toLowerCase().includes(q) || u.uf.toLowerCase().includes(q)) {
        matches.push({
          type: 'uf',
          id: u.uf,
          name: `${u.nome} (${u.uf})`,
          subtitle: `Estado · Capital: ${u.capital || u.nome} · ${formatNumber(u.aptos)} eleitores`,
          item: u
        });
      }
    });

    // Check Municípios (Search in window.MUNICIPIOS_INDEX or municipiosData)
    const munSource = window.MUNICIPIOS_INDEX || municipiosData || [];
    let count = 0;
    for (let i = 0; i < munSource.length; i++) {
      const m = munSource[i];
      const munName = m.nome || '';
      const munUf = m.uf || '';
      if (munName.toLowerCase().includes(q) || `${munName} ${munUf}`.toLowerCase().includes(q)) {
        matches.push({
          type: 'municipio',
          id: m.id || m.slug,
          name: `${munName} - ${munUf}`,
          subtitle: `Município · ${formatNumber(m.aptos)} eleitores · Abstenção: ${formatPercent(m.taxa || m.taxa_abstencao)}`,
          item: m
        });
        count++;
        if (count >= 30) break; // Limit to 30 instant matches for snappy UI
      }
    }

    setResults(matches);
    setSelectedIndex(0);
  }, [query, isOpen, estadosData, municipiosData]);

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
    <div className="search-modal-backdrop" onClick={onClose}>
      <div className="search-modal" onClick={e => e.stopPropagation()}>
        <div className="search-modal-header">
          <svg className="search-modal-icon" viewBox="0 0 20 20" width="18" height="18" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="search-modal-input"
            placeholder="Digite o nome do município ou UF..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="search-modal-close" onClick={onClose} title="Fechar (Esc)">✕</button>
        </div>

        <div className="search-modal-results">
          {results.length === 0 ? (
            <div className="search-empty-state">
              Nenhum município ou estado encontrado para "{query}".
            </div>
          ) : (
            results.map((res, idx) => (
              <div
                key={`${res.type}-${res.id}-${idx}`}
                className={`search-result-item ${selectedIndex === idx ? 'selected' : ''}`}
                onClick={() => handleSelect(res)}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div className="search-result-title">{res.name}</div>
                <div className="search-result-sub">{res.subtitle}</div>
              </div>
            ))
          )}
        </div>

        <div className="search-modal-footer">
          <span>Navegue com <kbd>↑</kbd> <kbd>↓</kbd></span>
          <span>Selecione com <kbd>Enter</kbd></span>
          <span>Fechar com <kbd>Esc</kbd></span>
        </div>
      </div>
    </div>
  );
}
