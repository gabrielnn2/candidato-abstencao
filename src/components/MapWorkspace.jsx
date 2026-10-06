import React, { useEffect, useRef, useState } from 'react';
import {
  BRAZIL_BOUNDS,
  BRAZIL_FIT_PADDING,
  REGION_STATES,
  formatNumber,
  formatPercent,
  getFillColorExpression
} from '../utils/electoralMath';

export default function MapWorkspace({
  currentCargo,
  currentScope,
  currentRegiao,
  onSelectRegiao,
  onSelectUf,
  onSelectMunicipio,
  onResetBrasil,
  onOpenSearch
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Hover Tooltip State
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    title: '',
    taxa: '',
    pos: ''
  });

  const isFiltered = currentScope.type !== 'brasil' || currentRegiao !== 'todas';

  // Initialize MapLibre GL
  useEffect(() => {
    const maplibregl = window.maplibregl;
    if (!maplibregl || !mapContainerRef.current) return;

    if (mapInstanceRef.current) return;

    try {
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          sources: {},
          layers: [
            {
              id: 'background',
              type: 'background',
              paint: { 'background-color': '#0d1117' }
            }
          ]
        },
        center: [-53.5, -14.2],
        zoom: 3.15,
        minZoom: 2.0,
        maxZoom: 14,
        dragRotate: false,
        pitchWithRotate: false
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

      map.on('load', () => {
        mapInstanceRef.current = map;
        setMapLoaded(true);

        // 1. Source: Municípios
        if (window.MUNICIPIOS_GEO) {
          map.addSource('municipios', {
            type: 'geojson',
            data: window.MUNICIPIOS_GEO
          });

          // Fill Layer
          map.addLayer({
            id: 'municipios-fill',
            type: 'fill',
            source: 'municipios',
            paint: {
              'fill-color': getFillColorExpression(currentCargo),
              'fill-opacity': 0.86
            }
          });

          // Fine Boundaries Layer
          map.addLayer({
            id: 'municipios-line',
            type: 'line',
            source: 'municipios',
            paint: {
              'line-color': '#ffffff',
              'line-width': [
                'interpolate', ['linear'], ['zoom'],
                3, 0.18,
                6, 0.30,
                9, 0.50,
                12, 0.80
              ],
              'line-opacity': [
                'interpolate', ['linear'], ['zoom'],
                3, 0.20,
                6, 0.35,
                9, 0.55
              ]
            }
          });

          // Municipio Highlight
          map.addLayer({
            id: 'municipio-highlight',
            type: 'line',
            source: 'municipios',
            paint: {
              'line-color': '#ffffff',
              'line-width': 2.8,
              'line-opacity': 1.0
            },
            filter: ['==', 'id', '']
          });
        }

        // 2. Source: Estados
        if (window.ESTADOS_GEO) {
          map.addSource('estados', {
            type: 'geojson',
            data: window.ESTADOS_GEO
          });

          map.addLayer({
            id: 'estados-line',
            type: 'line',
            source: 'estados',
            paint: {
              'line-color': '#ffffff',
              'line-width': [
                'interpolate', ['linear'], ['zoom'],
                3, 0.85,
                6, 1.4,
                10, 2.0
              ],
              'line-opacity': 0.70
            }
          });

          map.addLayer({
            id: 'estado-highlight',
            type: 'line',
            source: 'estados',
            paint: {
              'line-color': '#ffffff',
              'line-width': [
                'interpolate', ['linear'], ['zoom'],
                3, 2.4,
                6, 3.2,
                10, 4.2
              ],
              'line-opacity': 1.0
            },
            filter: ['==', 'uf', '']
          });
        }

        // Initial perfect fit
        map.resize();
        map.fitBounds(BRAZIL_BOUNDS, {
          padding: BRAZIL_FIT_PADDING,
          duration: 0,
          maxZoom: 4.2
        });

        // Hover events
        map.on('mousemove', 'municipios-fill', (e) => {
          if (!e.features || e.features.length === 0) return;
          map.getCanvas().style.cursor = 'pointer';
          const props = e.features[0].properties;

          const posProp = currentCargo === 'Presidente' ? 'pos_pres' : (currentCargo === 'Governador' ? 'pos_gov' : 'pos_sen');
          const pos = props[posProp] || 3;

          let posDesc = '🥉 3º Lugar ou abaixo';
          if (pos === 1) posDesc = '🥇 1º Lugar (Mais Votado)';
          else if (pos === 2) posDesc = currentCargo === 'Senador' ? '🥈 2º Lugar · Eleita Senadora (2ª Vaga)' : '🥈 2º Lugar · Iria para o 2º Turno';

          setTooltip({
            visible: true,
            x: e.point.x,
            y: e.point.y,
            title: `${props.nome} (${props.uf})`,
            taxa: `Abstenção: ${formatPercent(props.taxa)} (${formatNumber(props.abstencoes)} ausentes)`,
            pos: posDesc
          });
        });

        map.on('mouseleave', 'municipios-fill', () => {
          map.getCanvas().style.cursor = '';
          setTooltip(t => ({ ...t, visible: false }));
        });

        map.on('click', 'municipios-fill', (e) => {
          if (!e.features || e.features.length === 0) return;
          const props = e.features[0].properties;
          onSelectMunicipio(props.id);
        });
      });

    } catch (err) {
      console.error('Erro ao inicializar MapLibre GL:', err);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Paint Colors on Cargo change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;
    if (map.getLayer('municipios-fill')) {
      map.setPaintProperty('municipios-fill', 'fill-color', getFillColorExpression(currentCargo));
    }
  }, [currentCargo, mapLoaded]);

  // Update Scope and Region visual highlights
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;

    if (currentScope.type === 'brasil') {
      if (currentRegiao === 'todas') {
        if (map.getLayer('estado-highlight')) map.setFilter('estado-highlight', ['==', 'uf', '']);
        if (map.getLayer('municipio-highlight')) map.setFilter('municipio-highlight', ['==', 'id', '']);
        if (map.getLayer('municipios-fill')) map.setPaintProperty('municipios-fill', 'fill-opacity', 0.86);
        if (map.getLayer('municipios-line')) map.setPaintProperty('municipios-line', 'line-opacity', 0.25);
      } else {
        const ufs = REGION_STATES[currentRegiao] || [];
        if (map.getLayer('estado-highlight')) map.setFilter('estado-highlight', ['in', 'uf', ...ufs]);
        if (map.getLayer('municipio-highlight')) map.setFilter('municipio-highlight', ['==', 'id', '']);
        if (map.getLayer('municipios-fill')) {
          map.setPaintProperty('municipios-fill', 'fill-opacity', ['case', ['in', ['get', 'uf'], ['literal', ufs]], 0.95, 0.15]);
        }
      }
    } else if (currentScope.type === 'uf') {
      const targetUf = currentScope.id;
      if (map.getLayer('estado-highlight')) map.setFilter('estado-highlight', ['==', 'uf', targetUf]);
      if (map.getLayer('municipio-highlight')) map.setFilter('municipio-highlight', ['==', 'id', '']);
      if (map.getLayer('municipios-fill')) {
        map.setPaintProperty('municipios-fill', 'fill-opacity', ['case', ['==', ['get', 'uf'], targetUf], 0.96, 0.12]);
      }
    } else if (currentScope.type === 'municipio' && currentScope.item) {
      const targetId = Number(currentScope.item.id);
      const munUf = currentScope.item.uf;
      if (map.getLayer('estado-highlight')) map.setFilter('estado-highlight', ['==', 'uf', munUf]);
      if (map.getLayer('municipio-highlight')) map.setFilter('municipio-highlight', ['==', ['to-number', ['get', 'id']], targetId]);
      if (map.getLayer('municipios-fill')) {
        map.setPaintProperty('municipios-fill', 'fill-opacity', ['case', ['==', ['to-number', ['get', 'id']], targetId], 1.0, ['==', ['get', 'uf'], munUf], 0.88, 0.10]);
      }
    }
  }, [currentScope, currentRegiao, mapLoaded]);

  // Window Resize Listener
  useEffect(() => {
    const handleResize = () => {
      const map = mapInstanceRef.current;
      if (!map || !mapLoaded) return;
      map.resize();
      if (currentScope.type === 'brasil' && currentRegiao === 'todas') {
        map.fitBounds(BRAZIL_BOUNDS, {
          padding: BRAZIL_FIT_PADDING,
          duration: 200,
          maxZoom: 4.2
        });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentScope, currentRegiao, mapLoaded]);

  // Pill Title Text
  let pillText = 'Brasil · 5.564 Municípios em Polígonos';
  if (currentScope.type === 'uf' && currentScope.item) {
    pillText = `📍 ${currentScope.item.nome} (${currentScope.id}) · Todos os Municípios`;
  } else if (currentScope.type === 'municipio' && currentScope.item) {
    const m = currentScope.item;
    pillText = `📍 ${m.nome} (${m.uf}) · ${formatNumber(m.abstencao || 0)} ausentes (${formatPercent(m.taxa_abstencao ?? m.taxa ?? 0)})`;
  } else if (currentRegiao !== 'todas') {
    pillText = `📍 Região ${currentRegiao} · Todos os Municípios`;
  }

  // Search input button text
  let searchButtonText = 'Buscar Município...';
  if (currentScope.type === 'uf' && currentScope.item) {
    searchButtonText = `${currentScope.item.nome} (${currentScope.id})`;
  } else if (currentScope.type === 'municipio' && currentScope.item) {
    searchButtonText = `${currentScope.item.nome} (${currentScope.item.uf})`;
  }

  return (
    <section className="map-workspace glass-panel" id="mapWorkspace">
      <div className="map-header">
        <div className="map-title-block">
          <div className="map-header-top">
            <span className="map-badge-icon">🗺️</span>
            <h3 className="panel-title">Mapa Eleitoral Municipal do Brasil</h3>
          </div>
          <p className="panel-subtitle" id="mapModeSubtitle">
            Todos os 5.564 municípios em polígonos com simulação da Abstenção
          </p>
        </div>
      </div>

      {/* Filter Controls Toolbar: Região, Estado & Busca de Município */}
      <div className="map-controls-toolbar">
        <div className="control-group">
          <label htmlFor="selectRegiao" className="control-label">Região</label>
          <select
            id="selectRegiao"
            className="custom-select"
            value={currentRegiao}
            onChange={(e) => onSelectRegiao(e.target.value)}
          >
            <option value="todas">Todas as Regiões</option>
            <option value="Centro-Oeste">Centro-Oeste</option>
            <option value="Nordeste">Nordeste</option>
            <option value="Norte">Norte</option>
            <option value="Sudeste">Sudeste</option>
            <option value="Sul">Sul</option>
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="selectEstado" className="control-label">Estado (UF)</label>
          <select
            id="selectEstado"
            className="custom-select"
            value={currentScope.type === 'uf' ? currentScope.id : (currentScope.type === 'municipio' ? currentScope.item?.uf : 'BR')}
            onChange={(e) => {
              if (e.target.value === 'BR') onResetBrasil();
              else onSelectUf(e.target.value);
            }}
          >
            <option value="BR">Todos os Estados (Brasil)</option>
            <option value="AC">AC · Acre</option>
            <option value="AL">AL · Alagoas</option>
            <option value="AP">AP · Amapá</option>
            <option value="AM">AM · Amazonas</option>
            <option value="BA">BA · Bahia</option>
            <option value="CE">CE · Ceará</option>
            <option value="DF">DF · Distrito Federal</option>
            <option value="ES">ES · Espírito Santo</option>
            <option value="GO">GO · Goiás</option>
            <option value="MA">MA · Maranhão</option>
            <option value="MT">MT · Mato Grosso</option>
            <option value="MS">MS · Mato Grosso do Sul</option>
            <option value="MG">MG · Minas Gerais</option>
            <option value="PA">PA · Pará</option>
            <option value="PB">PB · Paraíba</option>
            <option value="PR">PR · Paraná</option>
            <option value="PE">PE · Pernambuco</option>
            <option value="PI">PI · Piauí</option>
            <option value="RJ">RJ · Rio de Janeiro</option>
            <option value="RN">RN · Rio Grande do Norte</option>
            <option value="RS">RS · Rio Grande do Sul</option>
            <option value="RO">RO · Rondônia</option>
            <option value="RR">RR · Roraima</option>
            <option value="SC">SC · Santa Catarina</option>
            <option value="SP">SP · São Paulo</option>
            <option value="SE">SE · Sergipe</option>
            <option value="TO">TO · Tocantins</option>
          </select>
        </div>

        <div className="control-group search-group">
          <label className="control-label">Buscar Município</label>
          <div className="search-trigger-wrap">
            <button
              className={`search-trigger-btn map-search-btn ${isFiltered ? 'is-active' : ''}`}
              id="mapSearchTriggerBtn"
              type="button"
              onClick={onOpenSearch}
            >
              <div className="search-btn-left">
                <svg className="search-icon" viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
                <span className="search-btn-text">{searchButtonText}</span>
              </div>
              <div className="search-btn-right">
                <kbd className="kbd-shortcut">⌘K</kbd>
                {isFiltered && (
                  <button
                    className="btn-clear-search"
                    title="Limpar seleção e voltar ao Brasil"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onResetBrasil();
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Map Legend Bar */}
      <div className="map-legend-bar">
        <div className="map-active-pill-wrap" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            className={`map-active-pill ${isFiltered ? 'is-filtered' : ''}`}
            id="mapActivePill"
            title="Clique para voltar à visão nacional do Brasil"
            onClick={isFiltered ? onResetBrasil : undefined}
          >
            <span className="pulse-dot"></span>
            <span>{pillText}</span>
          </div>
          {isFiltered && (
            <button
              className="pill-back-btn"
              title="Voltar para a visão do Brasil"
              onClick={onResetBrasil}
            >
              ✕ Voltar ao Brasil
            </button>
          )}
        </div>
        <div className="legend-pills">
          <span className="legend-item"><i className="legend-color gold"></i> 1º Lugar</span>
          <span className="legend-item"><i className="legend-color silver"></i> 2º Lugar (2º Turno / Vaga)</span>
          <span className="legend-item"><i className="legend-color bronze"></i> 3º ou abaixo</span>
        </div>
      </div>

      {/* MapLibre WebGL Canvas Container */}
      <div className="maplibre-container-wrap" id="mapWrapper">
        <div ref={mapContainerRef} id="maplibreCanvas" style={{ width: '100%', height: '100%' }}></div>

        {/* Floating Hover Tooltip */}
        {tooltip.visible && (
          <div
            className="maplibre-hover-tooltip"
            style={{
              position: 'absolute',
              left: `${tooltip.x + 14}px`,
              top: `${tooltip.y + 14}px`,
              pointerEvents: 'none'
            }}
          >
            <div className="tooltip-title">{tooltip.title}</div>
            <div className="tooltip-taxa">{tooltip.taxa}</div>
            <div className="tooltip-pos">{tooltip.pos}</div>
          </div>
        )}
      </div>

      {/* Quick state reset button when zoomed in */}
      <div className="map-footer-bar">
        <button className="btn-reset-map-view" id="btnResetMapView" onClick={onResetBrasil}>
          🇧🇷 Reenquadrar Todo o Brasil
        </button>
        <span className="map-footer-hint">
          Clique em qualquer município no mapa para carregar o veredito eleitoral à esquerda
        </span>
      </div>
    </section>
  );
}
