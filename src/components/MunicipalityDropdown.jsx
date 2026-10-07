import React, { useState, useEffect, useRef, useMemo } from 'react';

function normalizeStr(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export default function MunicipalityDropdown({
  currentScope,
  currentUf,
  municipiosData = [],
  onSelectMunicipio,
  onClear
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const isMunSelected = currentScope?.type === 'municipio' && currentScope?.item;
  const selectedMun = isMunSelected ? currentScope.item : null;

  // Obter lista consolidada de todos os 5.564 municípios
  const allMunicipios = useMemo(() => {
    if (window.MUNICIPIOS_INDEX && window.MUNICIPIOS_INDEX.length > 0) {
      return window.MUNICIPIOS_INDEX;
    }
    if (municipiosData && municipiosData.length > 0) {
      return municipiosData;
    }
    if (window.MUNICIPIOS_GEO?.features?.length > 0) {
      return window.MUNICIPIOS_GEO.features.map(f => f.properties);
    }
    return [];
  }, [municipiosData]);

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Focar input ao abrir
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Resetar índice ao alterar a busca
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Filtrar municípios em tempo real
  const filteredList = useMemo(() => {
    const q = normalizeStr(query);

    if (!q) {
      // Se não digitou nada, priorizar municípios do estado ativo se houver
      if (currentUf && currentUf !== 'todas' && currentUf !== 'BR') {
        const uMuns = allMunicipios.filter(m => m.uf === currentUf);
        return uMuns.slice(0, 50);
      }
      // Caso contrário, capitais e principais cidades
      const topPriority = ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Belo Horizonte', 'Fortaleza', 'Curitiba', 'Recife', 'Goiânia', 'Belém', 'Porto Alegre', 'Manaus'];
      const prioritized = [];
      const others = [];

      allMunicipios.forEach(m => {
        if (topPriority.includes(m.nome)) {
          prioritized.push(m);
        } else if (others.length < 40) {
          others.push(m);
        }
      });
      return [...prioritized, ...others].slice(0, 50);
    }

    const matchesExact = [];
    const matchesPrefix = [];
    const matchesContains = [];

    for (let i = 0; i < allMunicipios.length; i++) {
      const m = allMunicipios[i];
      const mNameNorm = normalizeStr(m.nome);
      const mUfNorm = normalizeStr(m.uf);

      if (mNameNorm === q) {
        matchesExact.push(m);
      } else if (mNameNorm.startsWith(q)) {
        matchesPrefix.push(m);
      } else if (mNameNorm.includes(q) || mUfNorm === q) {
        matchesContains.push(m);
      }

      if (matchesExact.length + matchesPrefix.length + matchesContains.length >= 80) {
        break;
      }
    }

    return [...matchesExact, ...matchesPrefix, ...matchesContains].slice(0, 50);
  }, [query, allMunicipios, currentUf]);

  // Navegação por teclado
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(filteredList.length - 1, prev + 1));
      scrollIntoView(selectedIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(0, prev - 1));
      scrollIntoView(selectedIndex - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredList[selectedIndex]) {
        handleSelect(filteredList[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const scrollIntoView = (index) => {
    if (listRef.current) {
      const items = listRef.current.children;
      if (items[index]) {
        items[index].scrollIntoView({ block: 'nearest' });
      }
    }
  };

  const handleSelect = (m) => {
    onSelectMunicipio(m.id || m.slug || m.nome);
    setIsOpen(false);
    setQuery('');
  };

  const displayText = selectedMun
    ? `${selectedMun.nome} (${selectedMun.uf})`
    : 'Buscar Município...';

  return (
    <div className="mun-dropdown-container" ref={containerRef}>
      <label className="control-label">Buscar Município</label>
      
      <div className="search-trigger-wrap">
        <div
          className={`search-trigger-btn map-search-btn ${isMunSelected ? 'is-active' : ''} ${isOpen ? 'is-open' : ''}`}
          id="mapSearchTriggerBtn"
          role="button"
          tabIndex={0}
          onClick={() => setIsOpen(prev => !prev)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsOpen(prev => !prev);
            }
          }}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <div className="search-btn-left">
            <svg className="search-icon" viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
            <span className="search-btn-text" title={displayText}>{displayText}</span>
          </div>

          <div className="search-btn-right" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isMunSelected && (
              <button
                className="btn-clear-search"
                title="Limpar município e voltar à UF"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                }}
              >
                ✕
              </button>
            )}
            <svg
              className={`dropdown-chevron ${isOpen ? 'is-open' : ''}`}
              viewBox="0 0 20 20"
              width="14"
              height="14"
              fill="currentColor"
              style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none', opacity: 0.6 }}
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="mun-dropdown-menu" role="listbox">
            {/* Search Input Filter */}
            <div className="mun-dropdown-input-wrap">
              <svg className="mun-search-icon" viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                className="mun-dropdown-input"
                placeholder="Digite o município..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              {query && (
                <button
                  type="button"
                  className="mun-input-clear-btn"
                  onClick={() => setQuery('')}
                  title="Limpar busca"
                >
                  ✕
                </button>
              )}
            </div>

            {/* List of Municipalities: Only "Nome do Município (UF)" */}
            <div className="mun-dropdown-list" ref={listRef}>
              {filteredList.length === 0 ? (
                <div className="mun-no-results">Nenhum município encontrado</div>
              ) : (
                filteredList.map((m, idx) => {
                  const isHighlighted = idx === selectedIndex;
                  const isCurrent = selectedMun && (selectedMun.id === m.id || selectedMun.nome === m.nome);
                  return (
                    <button
                      key={m.id || `${m.nome}-${m.uf}`}
                      type="button"
                      className={`mun-dropdown-item ${isHighlighted ? 'is-highlighted' : ''} ${isCurrent ? 'is-current' : ''}`}
                      onClick={() => handleSelect(m)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      role="option"
                      aria-selected={isHighlighted}
                    >
                      <span className="mun-item-text">{m.nome} ({m.uf})</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
