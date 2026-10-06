import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import TelemetryBar from './components/TelemetryBar';
import VerdictCard from './components/VerdictCard';
import MapWorkspace from './components/MapWorkspace';
import Gov1TSection from './components/Gov1TSection';
import MethodologySection from './components/MethodologySection';
import SearchModal from './components/SearchModal';
import ShareModal from './components/ShareModal';
import { REGION_STATES } from './utils/electoralMath';

export default function App() {
  const [brasilData, setBrasilData] = useState(null);
  const [estadosData, setEstadosData] = useState([]);
  const [municipiosData, setMunicipiosData] = useState([]);

  const [currentCargo, setCurrentCargo] = useState('Presidente');
  const [currentScope, setCurrentScope] = useState({ type: 'brasil', id: 'BR', item: null });
  const [currentRegiao, setCurrentRegiao] = useState('todas');

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  // Initialize data on mount
  useEffect(() => {
    // 1. If preloaded on window (fastest)
    if (window.ELEICOES_DATA) {
      setBrasilData(window.ELEICOES_DATA.brasil);
      setEstadosData(window.ELEICOES_DATA.estados || []);
      setMunicipiosData(window.ELEICOES_DATA.municipios || []);
      setCurrentScope({ type: 'brasil', id: 'BR', item: window.ELEICOES_DATA.brasil });
      return;
    }

    // 2. Fallback to fetch
    Promise.all([
      fetch('/data/brasil.json').then(r => r.json()),
      fetch('/data/estados.json').then(r => r.json()),
      fetch('/data/municipios.json').then(r => r.json())
    ]).then(([resBr, resUf, resMun]) => {
      setBrasilData(resBr);
      setEstadosData(resUf);
      setMunicipiosData(resMun);
      setCurrentScope({ type: 'brasil', id: 'BR', item: resBr });
    }).catch(err => {
      console.error('Erro ao carregar dados oficiais do TSE:', err);
    });
  }, []);

  // Global Keyboard Shortcuts (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Reset to Brasil
  const handleResetBrasil = useCallback(() => {
    setCurrentScope({ type: 'brasil', id: 'BR', item: brasilData });
    setCurrentRegiao('todas');
  }, [brasilData]);

  // Select UF
  const handleSelectUf = useCallback((ufSigla) => {
    const ufItem = estadosData.find(u => u.uf === ufSigla);
    if (ufItem) {
      setCurrentScope({ type: 'uf', id: ufSigla, item: ufItem });
      // Find region
      for (const [reg, ufs] of Object.entries(REGION_STATES)) {
        if (ufs.includes(ufSigla)) {
          setCurrentRegiao(reg);
          break;
        }
      }
    }
  }, [estadosData]);

  // Select Municipio
  const handleSelectMunicipio = useCallback((munId) => {
    // Look up in municipiosData or window.MUNICIPIOS_GEO
    const idNum = Number(munId);
    let munItem = municipiosData.find(m => Number(m.id) === idNum);

    if (!munItem && window.MUNICIPIOS_GEO) {
      const feat = window.MUNICIPIOS_GEO.features.find(f => Number(f.id) === idNum || Number(f.properties?.id) === idNum);
      if (feat) {
        munItem = {
          id: feat.properties.id,
          nome: feat.properties.nome,
          uf: feat.properties.uf,
          aptos: feat.properties.pop ? Math.round(feat.properties.pop * 0.78) : 50000,
          abstencao: feat.properties.abstencoes || 10000,
          taxa_abstencao: feat.properties.taxa || 20.0,
          cargos: {
            Presidente: { posicao: feat.properties.pos_pres || 3, ranking: [] },
            Governador: { posicao: feat.properties.pos_gov || 3, ranking: [] },
            Senador: { posicao: feat.properties.pos_sen || 2, ranking: [] }
          }
        };
      }
    }

    if (munItem) {
      setCurrentScope({ type: 'municipio', id: munItem.id, item: munItem });
      // Set region from UF
      if (munItem.uf) {
        for (const [reg, ufs] of Object.entries(REGION_STATES)) {
          if (ufs.includes(munItem.uf)) {
            setCurrentRegiao(reg);
            break;
          }
        }
      }
    }
  }, [municipiosData]);

  // Select Scope from Search Modal
  const handleSelectScope = useCallback((searchItem) => {
    if (searchItem.type === 'brasil') {
      handleResetBrasil();
    } else if (searchItem.type === 'uf') {
      handleSelectUf(searchItem.id);
    } else if (searchItem.type === 'municipio') {
      handleSelectMunicipio(searchItem.id);
    }
  }, [handleResetBrasil, handleSelectUf, handleSelectMunicipio]);

  return (
    <div className="dark-theme app-root">
      {/* Ambient background glow */}
      <div className="ambient-glow" aria-hidden="true"></div>

      {/* Top Global HUD */}
      <Header
        currentCargo={currentCargo}
        onSelectCargo={setCurrentCargo}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      {/* Telemetry Bar */}
      <TelemetryBar brasilData={brasilData} />

      {/* Main Layout Container */}
      <main className="main-layout">
        {/* Split Dashboard: Left = Verdict Panel, Right = Interactive Brazil Map */}
        <div className="dashboard-split" id="dashboardSplit">
          <VerdictCard
            currentCargo={currentCargo}
            currentScope={currentScope}
            brasilData={brasilData}
            estadosData={estadosData}
            onResetBrasil={handleResetBrasil}
            onSelectUf={handleSelectUf}
            onOpenShare={() => setIsShareOpen(true)}
          />

          <MapWorkspace
            currentCargo={currentCargo}
            currentScope={currentScope}
            currentRegiao={currentRegiao}
            onSelectRegiao={setCurrentRegiao}
            onSelectUf={handleSelectUf}
            onSelectMunicipio={handleSelectMunicipio}
            onResetBrasil={handleResetBrasil}
            onOpenSearch={() => setIsSearchOpen(true)}
          />
        </div>

        {/* Special Feature: Raio-X dos Governadores Eleitos em 1º Turno */}
        <Gov1TSection
          brasilData={brasilData}
          estadosData={estadosData}
          onSelectUf={handleSelectUf}
        />

        {/* Curiosities & Methodology */}
        <MethodologySection />
      </main>

      {/* Instant Search Modal (Cmd+K) */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        estadosData={estadosData}
        municipiosData={municipiosData}
        onSelectScope={handleSelectScope}
      />

      {/* Share Modal Dialog */}
      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        currentCargo={currentCargo}
        currentScope={currentScope}
      />
    </div>
  );
}
