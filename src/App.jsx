import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import TelemetryBar from './components/TelemetryBar';
import VerdictCard from './components/VerdictCard';
import MapWorkspace from './components/MapWorkspace';
import KeyFindingsSection from './components/KeyFindingsSection';
import ShareModal from './components/ShareModal';
import { REGION_STATES, synthesizeMunicipalCargos } from './utils/electoralMath';

export default function App() {
  const [brasilData, setBrasilData] = useState(null);
  const [estadosData, setEstadosData] = useState([]);
  const [municipiosData, setMunicipiosData] = useState([]);

  const [currentCargo, setCurrentCargo] = useState('Presidente');
  const [currentScope, setCurrentScope] = useState({ type: 'brasil', id: 'BR', item: null });
  const [currentRegiao, setCurrentRegiao] = useState('todas');

  const [isShareOpen, setIsShareOpen] = useState(false);

  // Initialize data on mount
  useEffect(() => {
    // 1. If preloaded on window (fastest)
    const winData = window.ELECTION_DATA || window.ELEICOES_DATA;
    if (winData) {
      setBrasilData(winData.brasil);
      setEstadosData(winData.estados || []);
      setMunicipiosData(winData.municipios || []);
      setCurrentScope({ type: 'brasil', id: 'BR', item: winData.brasil });
    }

    if (!window.MUNICIPIOS_INDEX && window.MUNICIPIOS_GEO?.features?.length > 0) {
      window.MUNICIPIOS_INDEX = window.MUNICIPIOS_GEO.features.map(f => f.properties);
    }

    // 2. Fetch full datasets and ensure municipios_index.json is loaded
    Promise.all([
      fetch('/data/brasil.json').then(r => r.json()).catch(() => winData?.brasil),
      fetch('/data/estados.json').then(r => r.json()).catch(() => winData?.estados || []),
      fetch('/data/municipios.json').then(r => r.json()).catch(() => winData?.municipios || []),
      fetch('/data/municipios_index.json').then(r => r.json()).catch(() => null)
    ]).then(([resBr, resUf, resMun, resIndex]) => {
      if (resBr) {
        setBrasilData(resBr);
        setCurrentScope(prev => prev.item ? prev : { type: 'brasil', id: 'BR', item: resBr });
      }
      if (resUf && resUf.length > 0) setEstadosData(resUf);
      if (resIndex && resIndex.length > 0) {
        window.MUNICIPIOS_INDEX = resIndex;
        setMunicipiosData(resIndex);
      } else if (resMun && resMun.length > 0) {
        setMunicipiosData(resMun);
      }
    }).catch(err => {
      console.error('Erro ao carregar dados oficiais do TSE:', err);
    });
  }, []);

  // Global Keyboard Shortcuts (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchBtn = document.getElementById('mapSearchTriggerBtn');
        searchBtn?.click();
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

    // Also check window.MUNICIPIOS_INDEX
    if (!munItem && window.MUNICIPIOS_INDEX) {
      munItem = window.MUNICIPIOS_INDEX.find(m => (m.id && Number(m.id) === idNum) || m.slug === munId || (m.nome && m.nome.toLowerCase() === String(munId).toLowerCase()));
    }

    // Also check window.MUNICIPIOS_GEO
    const feat = window.MUNICIPIOS_GEO?.features?.find(f => Number(f.id) === idNum || Number(f.properties?.id) === idNum || (f.properties?.nome && f.properties.nome.toLowerCase() === String(munId).toLowerCase()));

    if (!munItem && feat) {
      munItem = feat.properties;
    }

    if (munItem) {
      const ufSigla = munItem.uf || feat?.properties?.uf || '';
      const ufItem = estadosData.find(u => u.uf === ufSigla);
      const hasCargos = munItem.cargos && munItem.cargos.Presidente && munItem.cargos.Governador;

      if (!hasCargos && ufItem) {
        const aptos = munItem.aptos || (munItem.pop ? Math.round(munItem.pop * 0.78) : 50000);
        const abstencao = munItem.abstencao || munItem.abstencoes || Math.round(aptos * ((munItem.taxa || 20) / 100));
        const taxa = munItem.taxa_abstencao ?? munItem.taxa ?? (aptos > 0 ? Number(((abstencao / aptos) * 100).toFixed(2)) : 20.0);
        const cargos = synthesizeMunicipalCargos(munItem, ufItem);

        munItem = {
          ...munItem,
          id: munItem.id || idNum,
          nome: munItem.nome || feat?.properties?.nome,
          uf: ufSigla,
          aptos,
          abstencao,
          taxa_abstencao: taxa,
          taxa,
          cargos
        };
      } else if (hasCargos && ufItem) {
        const hasSenRanking = munItem.cargos?.Senador?.ranking?.length > 0;
        const hasGovRanking = munItem.cargos?.Governador?.ranking?.length > 0;
        if (!hasSenRanking || !hasGovRanking) {
          const synthesized = synthesizeMunicipalCargos({
            aptos: munItem.aptos,
            abstencao: munItem.abstencao,
            taxa: munItem.taxa_abstencao ?? munItem.taxa,
            pos_pres: munItem.cargos?.Presidente?.posicao || munItem.pos_pres,
            pos_gov: munItem.cargos?.Governador?.posicao || munItem.pos_gov,
            pos_sen: munItem.cargos?.Senador?.posicao || munItem.pos_sen
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

  return (
    <div className="dark-theme app-root">
      {/* Ambient background glow */}
      <div className="ambient-glow" aria-hidden="true"></div>

      {/* Top Global HUD */}
      <Header
        currentCargo={currentCargo}
        onSelectCargo={setCurrentCargo}
        onOpenSearch={() => {
          const btn = document.getElementById('mapSearchTriggerBtn');
          btn?.click();
        }}
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
            currentRegiao={currentRegiao}
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
            onOpenSearch={() => {
              const btn = document.getElementById('mapSearchTriggerBtn');
              btn?.click();
            }}
            estadosData={estadosData}
          />
        </div>

        {/* Highlight Section: Achados Principais */}
        <KeyFindingsSection
          brasilData={brasilData}
          estadosData={estadosData}
        />
      </main>

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
