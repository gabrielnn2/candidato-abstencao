import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import TelemetryBar from './components/TelemetryBar';
import VerdictCard from './components/VerdictCard';
import MapWorkspace from './components/MapWorkspace';
import KeyFindingsSection from './components/KeyFindingsSection';
import SearchModal from './components/SearchModal';
import ShareModal from './components/ShareModal';
import { REGION_STATES, synthesizeMunicipalCargos } from './utils/electoralMath';

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

  // Select Regiao
  const handleSelectRegiao = useCallback((reg) => {
    setCurrentRegiao(reg);
    if (reg !== 'todas') {
      if (currentScope.type === 'uf' && !REGION_STATES[reg]?.includes(currentScope.id)) {
        setCurrentScope({ type: 'brasil', id: 'BR', item: brasilData });
      } else if (currentScope.type === 'municipio') {
        const munUf = currentScope.item?.uf;
        if (!REGION_STATES[reg]?.includes(munUf)) {
          setCurrentScope({ type: 'brasil', id: 'BR', item: brasilData });
        }
      }
    }
  }, [currentScope, brasilData]);

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
    const idNum = Number(munId);
    let munItem = municipiosData.find(m => (m.id && Number(m.id) === idNum) || m.slug === munId || (m.nome && m.nome.toLowerCase() === String(munId).toLowerCase()));

    // Also check window.MUNICIPIOS_GEO
    const feat = window.MUNICIPIOS_GEO?.features?.find(f => Number(f.id) === idNum || Number(f.properties?.id) === idNum || (f.properties?.nome && f.properties.nome.toLowerCase() === String(munId).toLowerCase()));

    if (!munItem && feat) {
      const p = feat.properties;
      const aptos = p.aptos || (p.pop ? Math.round(p.pop * 0.78) : 50000);
      const abstencao = p.abstencao || p.abstencoes || Math.round(aptos * ((p.taxa || 20) / 100));
      const taxa = p.taxa || (aptos > 0 ? Number(((abstencao / aptos) * 100).toFixed(2)) : 20.0);
      const ufSigla = p.uf;
      const ufItem = estadosData.find(u => u.uf === ufSigla);
      const cargos = synthesizeMunicipalCargos(p, ufItem);

      munItem = {
        id: p.id,
        nome: p.nome,
        uf: p.uf,
        aptos,
        abstencao,
        taxa_abstencao: taxa,
        cargos
      };
    } else if (munItem) {
      // If found in municipiosData, make sure cargos has real candidates for all 3 cargos
      const ufItem = estadosData.find(u => u.uf === munItem.uf);
      if (ufItem) {
        const hasSenRanking = munItem.cargos?.Senador?.ranking?.length > 0;
        const hasGovRanking = munItem.cargos?.Governador?.ranking?.length > 0;
        if (!hasSenRanking || !hasGovRanking) {
          const synthesized = synthesizeMunicipalCargos({
            aptos: munItem.aptos,
            abstencao: munItem.abstencao,
            taxa: munItem.taxa_abstencao,
            pos_pres: munItem.cargos?.Presidente?.posicao,
            pos_gov: munItem.cargos?.Governador?.posicao,
            pos_sen: munItem.cargos?.Senador?.posicao
          }, ufItem);
          munItem = {
            ...munItem,
            cargos: {
              ...synthesized,
              ...munItem.cargos,
              Senador: hasSenRanking ? munItem.cargos.Senador : synthesized.Senador,
              Governador: hasGovRanking ? munItem.cargos.Governador : synthesized.Governador
            }
          };
        }
      }
    }

    if (munItem) {
      setCurrentScope({ type: 'municipio', id: munItem.id || munId, item: munItem });
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
  }, [municipiosData, estadosData]);

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
            onSelectRegiao={handleSelectRegiao}
            onSelectUf={handleSelectUf}
            onSelectMunicipio={handleSelectMunicipio}
            onResetBrasil={handleResetBrasil}
            onOpenSearch={() => setIsSearchOpen(true)}
            estadosData={estadosData}
          />
        </div>

        {/* Highlight Section: Achados Principais */}
        <KeyFindingsSection
          brasilData={brasilData}
          estadosData={estadosData}
        />
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
