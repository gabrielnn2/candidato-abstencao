import React, { useEffect, useRef, useState } from 'react';
import {
  BRAZIL_BOUNDS,
  BRAZIL_FIT_PADDING,
  REGION_BOUNDS,
  STATE_BOUNDS,
  REGION_STATES,
  formatNumber,
  formatPercent,
  getFillColorExpression,
  getGovStatus,
  getMunicipalGovStatus,
  getGovStatusLabel
} from '../utils/electoralMath';

export default function MapWorkspace({
  currentCargo,
  currentScope,
  currentRegiao,
  onSelectRegiao,
  onSelectUf,
  onSelectMunicipio,
  onResetBrasil,
  onOpenSearch,
  estadosData = []
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // View Mode: 'estados' (default) or 'municipios'
  const [viewMode, setViewMode] = useState('estados');

  // Tooltip DOM refs & hover tracking for zero-latency mouseover without React re-renders
  const tooltipRef = useRef(null);
  const tooltipTitleRef = useRef(null);
  const tooltipTaxaRef = useRef(null);
  const tooltipPosRef = useRef(null);
  const hoveredMunIdRef = useRef(null);
  const hoveredUfRef = useRef(null);
  const municipiosMapRef = useRef(null);
  const estadosMapRef = useRef(null);

  // Keep latest refs for MapLibre event handlers
  const currentCargoRef = useRef(currentCargo);
  currentCargoRef.current = currentCargo;

  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;

  const onSelectUfRef = useRef(onSelectUf);
  onSelectUfRef.current = onSelectUf;

  const onSelectMunicipioRef = useRef(onSelectMunicipio);
  onSelectMunicipioRef.current = onSelectMunicipio;

  // Track previous scope key to ensure camera doesn't fly/zoom when user simply switches cargo
  const prevScopeKeyRef = useRef('');

  const isFiltered = currentScope.type !== 'brasil' || currentRegiao !== 'todas';

  // Automatically switch viewMode to 'municipios' when a municipio is selected
  useEffect(() => {
    if (currentScope.type === 'municipio') {
      setViewMode('municipios');
    }
  }, [currentScope.type, currentScope.id]);

  // Initialize MapLibre GL
  useEffect(() => {
    const maplibregl = window.maplibregl;
    if (!maplibregl || !mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    try {
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        attributionControl: false,
        style: {
          version: 8,
          sources: {
            'esri-dark': {
              type: 'raster',
              tiles: [
                'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
              ],
              tileSize: 256,
              maxzoom: 16
            }
          },
          layers: [
            {
              id: 'background',
              type: 'background',
              paint: { 'background-color': '#0d1117' }
            },
            {
              id: 'esri-dark-layer',
              type: 'raster',
              source: 'esri-dark',
              paint: {
                'raster-opacity': 0.92
              }
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

        // 1. Source: Estados
        if (window.ESTADOS_GEO) {
          estadosMapRef.current = new Map(
            window.ESTADOS_GEO.features?.map(feat => [feat.properties?.uf, feat]) || []
          );

          const ufMap = estadosData && estadosData.length > 0 ? new Map(estadosData.map(u => [u.uf, u])) : null;
          window.ESTADOS_GEO.features?.forEach(feat => {
            feat.properties.status_gov = getGovStatus(feat.properties.uf);
            if (ufMap) {
              const u = ufMap.get(feat.properties?.uf);
              if (u) {
                if (!feat.properties.pos_pres || !feat.properties.taxa) {
                  feat.properties.nome = u.nome;
                  feat.properties.aptos = u.aptos;
                  feat.properties.abstencao = u.abstencao;
                  feat.properties.abstencoes = u.abstencao;
                  feat.properties.taxa = u.taxa_abstencao;
                  feat.properties.pos_pres = u.cargos?.Presidente?.posicao || 3;
                  feat.properties.pos_gov = u.cargos?.Governador?.posicao || 3;
                  feat.properties.pos_sen = u.cargos?.Senador?.posicao || 3;
                  feat.properties.abstencao_pres = u.cargos?.Presidente?.votos || u.abstencao;
                  feat.properties.taxa_pres = u.cargos?.Presidente?.taxa_abstencao || u.taxa_abstencao;
                  feat.properties.abstencao_gov = u.cargos?.Governador?.votos || u.abstencao;
                  feat.properties.taxa_gov = u.cargos?.Governador?.taxa_abstencao || u.taxa_abstencao;
                  feat.properties.abstencao_sen = u.cargos?.Senador?.votos || u.abstencao;
                  feat.properties.taxa_sen = u.cargos?.Senador?.taxa_abstencao || u.taxa_abstencao;
                }
              }
            }
          });

          map.addSource('estados', {
            type: 'geojson',
            data: window.ESTADOS_GEO
          });

          // Dedicated single-feature hover source for instantaneous 0.05ms state hover
          map.addSource('estado-hover-source', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
          });

          // Estados Fill Layer (Visible by default in Estados mode)
          map.addLayer({
            id: 'estados-fill',
            type: 'fill',
            source: 'estados',
            paint: {
              'fill-color': getFillColorExpression(currentCargoRef.current),
              'fill-opacity': 0.88
            },
            layout: {
              visibility: 'visible'
            }
          });

          // Estados Line Boundary
          map.addLayer({
            id: 'estados-line',
            type: 'line',
            source: 'estados',
            paint: {
              'line-color': '#ffffff',
              'line-width': [
                'interpolate', ['linear'], ['zoom'],
                3, 0.95,
                6, 1.6,
                10, 2.2
              ],
              'line-opacity': 0.75
            },
            layout: {
              visibility: 'visible'
            }
          });

          // Estado Hover Glow (Luminous outer aura on hover)
          map.addLayer({
            id: 'estado-hover-glow',
            type: 'line',
            source: 'estado-hover-source',
            paint: {
              'line-color': '#38bdf8',
              'line-width': 7.0,
              'line-opacity': 0.75,
              'line-blur': 2.2
            },
            layout: {
              visibility: 'visible',
              'line-join': 'round',
              'line-cap': 'round'
            }
          });

          // Estado Hover Fill Overlay
          map.addLayer({
            id: 'estado-hover-fill',
            type: 'fill',
            source: 'estado-hover-source',
            paint: {
              'fill-color': '#ffffff',
              'fill-opacity': 0.30
            },
            layout: {
              visibility: 'visible'
            }
          });

          // Estado Hover Outline (Bright white stroke)
          map.addLayer({
            id: 'estado-hover-line',
            type: 'line',
            source: 'estado-hover-source',
            paint: {
              'line-color': '#ffffff',
              'line-width': 3.4,
              'line-opacity': 1.0
            },
            layout: {
              visibility: 'visible',
              'line-join': 'round',
              'line-cap': 'round'
            }
          });

          // Estado Selection Highlight
          map.addLayer({
            id: 'estado-highlight',
            type: 'line',
            source: 'estados',
            paint: {
              'line-color': '#38bdf8',
              'line-width': 3.6,
              'line-opacity': 1.0
            },
            filter: ['==', 'uf', ''],
            layout: {
              visibility: 'visible'
            }
          });
        }

        // 2. Source: Municípios
        if (window.MUNICIPIOS_GEO) {
          municipiosMapRef.current = new Map(
            window.MUNICIPIOS_GEO.features?.map(feat => [Number(feat.properties?.id ?? feat.id), feat]) || []
          );

          window.MUNICIPIOS_GEO.features?.forEach(feat => {
            feat.properties.status_gov = getMunicipalGovStatus(feat.properties);
          });

          map.addSource('municipios', {
            type: 'geojson',
            data: window.MUNICIPIOS_GEO,
            promoteId: 'id'
          });

          // Dedicated single-feature hover source for instantaneous 0.05ms municipality hover
          map.addSource('municipio-hover-source', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
          });

          // Municípios Fill Layer (Hidden by default in Estados mode)
          map.addLayer({
            id: 'municipios-fill',
            type: 'fill',
            source: 'municipios',
            paint: {
              'fill-color': getFillColorExpression(currentCargoRef.current),
              'fill-opacity': 0.86
            },
            layout: {
              visibility: 'none'
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
                3, 0.22,
                6, 0.35,
                9, 0.55,
                12, 0.85
              ],
              'line-opacity': [
                'interpolate', ['linear'], ['zoom'],
                3, 0.25,
                6, 0.40,
                9, 0.60
              ]
            },
            layout: {
              visibility: 'none'
            }
          });

          // Contornos das UFs sobrepostos ao mapa de municípios (Limites estaduais nítidos e claros)
          if (map.getSource('estados')) {
            map.addLayer({
              id: 'estados-uf-contour-overlay',
              type: 'line',
              source: 'estados',
              paint: {
                'line-color': '#ffffff',
                'line-width': [
                  'interpolate', ['linear'], ['zoom'],
                  3, 1.4,
                  5, 2.0,
                  8, 2.8,
                  12, 3.8
                ],
                'line-opacity': 0.85
              },
              layout: {
                visibility: 'visible',
                'line-join': 'round',
                'line-cap': 'round'
              }
            });
          }

          // Layer: Município Hover Glow (Luminous outer aura on hover)
          map.addLayer({
            id: 'municipio-hover-glow',
            type: 'line',
            source: 'municipio-hover-source',
            paint: {
              'line-color': '#38bdf8',
              'line-width': [
                'interpolate', ['linear'], ['zoom'],
                3, 3.5,
                6, 5.0,
                9, 7.0,
                12, 9.0
              ],
              'line-opacity': 0.75,
              'line-blur': 1.8
            },
            layout: {
              visibility: 'none',
              'line-join': 'round',
              'line-cap': 'round'
            }
          });

          // Layer: Município Hover Fill Overlay (White luminous highlight)
          map.addLayer({
            id: 'municipio-hover-fill',
            type: 'fill',
            source: 'municipio-hover-source',
            paint: {
              'fill-color': '#ffffff',
              'fill-opacity': 0.38
            },
            layout: {
              visibility: 'none'
            }
          });

          // Layer: Município Hover Outline (Bright white crisp stroke)
          map.addLayer({
            id: 'municipio-hover-line',
            type: 'line',
            source: 'municipio-hover-source',
            paint: {
              'line-color': '#ffffff',
              'line-width': [
                'interpolate', ['linear'], ['zoom'],
                3, 1.8,
                6, 2.5,
                9, 3.2,
                12, 4.2
              ],
              'line-opacity': 1.0
            },
            layout: {
              visibility: 'none',
              'line-join': 'round',
              'line-cap': 'round'
            }
          });

          // Município Selection Highlight (Cyan stroke)
          map.addLayer({
            id: 'municipio-highlight',
            type: 'line',
            source: 'municipios',
            paint: {
              'line-color': '#38bdf8',
              'line-width': 3.2,
              'line-opacity': 1.0
            },
            filter: ['==', 'id', -1],
            layout: {
              visibility: 'none'
            }
          });
        }

        // Initial view fit
        map.resize();
        map.fitBounds(BRAZIL_BOUNDS, {
          padding: BRAZIL_FIT_PADDING,
          duration: 0,
          maxZoom: 4.2
        });

        // Helper to update tooltip position safely within map bounds
        const updateTooltipPosition = (point) => {
          if (!tooltipRef.current) return;
          const mapContainer = map.getContainer();
          const mapWidth = mapContainer.offsetWidth || 800;
          const mapHeight = mapContainer.offsetHeight || 600;
          const tooltipW = 230;
          const tooltipH = 90;
          let posX = point.x + 16;
          let posY = point.y + 16;

          if (posX + tooltipW > mapWidth - 10) {
            posX = point.x - tooltipW - 12;
          }
          if (posY + tooltipH > mapHeight - 10) {
            posY = point.y - tooltipH - 12;
          }
          if (posX < 8) posX = 8;
          if (posY < 8) posY = 8;

          tooltipRef.current.style.transform = `translate3d(${posX}px, ${posY}px, 0)`;
          if (tooltipRef.current.style.display !== 'block') {
            tooltipRef.current.style.display = 'block';
          }
        };

        // --- Estados Hover & Click Events ---
        map.on('mousemove', 'estados-fill', (e) => {
          if (viewModeRef.current !== 'estados') return;
          if (!e.features || e.features.length === 0) return;
          map.getCanvas().style.cursor = 'pointer';

          updateTooltipPosition(e.point);

          const p = e.features[0].properties;
          const uf = p.uf;

          if (hoveredUfRef.current !== uf) {
            hoveredUfRef.current = uf;

            const fullFeat = estadosMapRef.current?.get(uf) || e.features[0];
            const hoverSrc = map.getSource('estado-hover-source');
            if (hoverSrc) {
              hoverSrc.setData({
                type: 'FeatureCollection',
                features: [fullFeat]
              });
            }

            const cargo = currentCargoRef.current;
            let posDesc = '';
            if (cargo === 'Governador') {
              const status = getGovStatus(p.uf || p);
              if (status === 'forcou_e_iria_2t') {
                posDesc = '🟢 Forçaria e iria para o 2º turno';
              } else if (status === 'forcou_2t_entre_dois') {
                posDesc = '🟠 Forçaria um 2º turno entre os dois primeiros colocados';
              } else {
                posDesc = '🔵 Não alteraria';
              }
            } else if (cargo === 'Presidente') {
              const pos = p.pos_pres || 3;
              if (pos === 2) posDesc = '🥈 2º Lugar · Iria para o 2º Turno';
              else posDesc = '🥉 Não iria para o 2º Turno';
            } else {
              const pos = p.pos_sen || 3;
              if (pos === 1) posDesc = '🥇 1º Lugar · Eleita Senadora (1ª Vaga)';
              else if (pos === 2) posDesc = '🥈 2º Lugar · Eleita Senadora (2ª Vaga)';
              else posDesc = '🥉 Não eleita';
            }

            let currentAbst = p.abstencao || p.abstencoes;
            let currentTaxa = p.taxa;
            if (cargo === 'Governador') {
              currentAbst = p.abstencao_gov || currentAbst;
              currentTaxa = p.taxa_gov ?? currentTaxa;
            } else if (cargo === 'Senador') {
              currentAbst = p.abstencao_sen || currentAbst;
              currentTaxa = p.taxa_sen ?? currentTaxa;
            } else if (cargo === 'Presidente') {
              currentAbst = p.abstencao_pres || currentAbst;
              currentTaxa = p.taxa_pres ?? currentTaxa;
            }

            if (tooltipTitleRef.current) tooltipTitleRef.current.textContent = `${p.nome || p.name} (${p.uf})`;
            if (tooltipTaxaRef.current) tooltipTaxaRef.current.textContent = `Abstenção: ${formatPercent(currentTaxa)} (${formatNumber(currentAbst)} ausentes)`;
            if (tooltipPosRef.current) tooltipPosRef.current.textContent = posDesc;
          }
        });

        map.on('mouseleave', 'estados-fill', () => {
          if (viewModeRef.current !== 'estados') return;
          hoveredUfRef.current = null;
          map.getCanvas().style.cursor = '';
          const hoverSrc = map.getSource('estado-hover-source');
          if (hoverSrc) {
            hoverSrc.setData({ type: 'FeatureCollection', features: [] });
          }
          if (tooltipRef.current) {
            tooltipRef.current.style.display = 'none';
          }
        });

        map.on('click', 'estados-fill', (e) => {
          if (viewModeRef.current !== 'estados') return;
          if (!e.features || e.features.length === 0) return;
          const p = e.features[0].properties;
          onSelectUfRef.current(p.uf);
        });

        // --- Municípios Hover & Click Events ---
        map.on('mousemove', 'municipios-fill', (e) => {
          if (viewModeRef.current !== 'municipios') return;
          if (!e.features || e.features.length === 0) return;
          map.getCanvas().style.cursor = 'pointer';

          updateTooltipPosition(e.point);

          const feat = e.features[0];
          const p = feat.properties;
          const munId = Number(p.id || feat.id);

          // Instantaneous 0.05ms update via dedicated single-feature source
          if (hoveredMunIdRef.current !== munId) {
            hoveredMunIdRef.current = munId;

            const fullFeat = municipiosMapRef.current?.get(munId) || feat;
            const hoverSrc = map.getSource('municipio-hover-source');
            if (hoverSrc) {
              hoverSrc.setData({
                type: 'FeatureCollection',
                features: [fullFeat]
              });
            }

            const cargo = currentCargoRef.current;
            let posDesc = '';
            if (cargo === 'Governador') {
              const status = p.status_gov || getMunicipalGovStatus(p);
              if (status === 'forcou_e_iria_2t') {
                posDesc = '🟢 Forçaria e iria para o 2º turno';
              } else if (status === 'forcou_2t_entre_dois') {
                posDesc = '🟠 Forçaria um 2º turno entre os dois primeiros colocados';
              } else {
                posDesc = '🔵 Não alteraria';
              }
            } else if (cargo === 'Presidente') {
              const pos = p.pos_pres || 3;
              if (pos === 2) posDesc = '🥈 2º Lugar · Iria para o 2º Turno';
              else posDesc = '🥉 Não iria para o 2º Turno';
            } else {
              const pos = p.pos_sen || 3;
              if (pos === 1) posDesc = '🥇 1º Lugar · Eleita Senadora (1ª Vaga)';
              else if (pos === 2) posDesc = '🥈 2º Lugar · Eleita Senadora (2ª Vaga)';
              else posDesc = '🥉 Não eleita';
            }

            if (tooltipTitleRef.current) tooltipTitleRef.current.textContent = `${p.nome} (${p.uf})`;
            if (tooltipTaxaRef.current) tooltipTaxaRef.current.textContent = `Abstenção: ${formatPercent(p.taxa)} (${formatNumber(p.abstencao || p.abstencoes)} ausentes)`;
            if (tooltipPosRef.current) tooltipPosRef.current.textContent = posDesc;
          }
        });

        map.on('mouseleave', 'municipios-fill', () => {
          if (viewModeRef.current !== 'municipios') return;
          hoveredMunIdRef.current = null;
          map.getCanvas().style.cursor = '';
          const hoverSrc = map.getSource('municipio-hover-source');
          if (hoverSrc) {
            hoverSrc.setData({ type: 'FeatureCollection', features: [] });
          }
          if (tooltipRef.current) {
            tooltipRef.current.style.display = 'none';
          }
        });

        map.on('mouseout', () => {
          hoveredMunIdRef.current = null;
          hoveredUfRef.current = null;
          map.getCanvas().style.cursor = '';
          const munHoverSrc = map.getSource('municipio-hover-source');
          if (munHoverSrc) munHoverSrc.setData({ type: 'FeatureCollection', features: [] });
          const ufHoverSrc = map.getSource('estado-hover-source');
          if (ufHoverSrc) ufHoverSrc.setData({ type: 'FeatureCollection', features: [] });
          if (tooltipRef.current) {
            tooltipRef.current.style.display = 'none';
          }
        });

        map.on('click', 'municipios-fill', (e) => {
          if (viewModeRef.current !== 'municipios') return;
          if (!e.features || e.features.length === 0) return;
          const props = e.features[0].properties;
          onSelectMunicipioRef.current(props.id);
        });

        setMapLoaded(true);
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
    const colorExpr = getFillColorExpression(currentCargo);
    if (map.getLayer('municipios-fill')) {
      map.setPaintProperty('municipios-fill', 'fill-color', colorExpr);
    }
    if (map.getLayer('estados-fill')) {
      map.setPaintProperty('estados-fill', 'fill-color', colorExpr);
    }
  }, [currentCargo, mapLoaded]);

  // Synchronize dynamic datasets when estadosData updates
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded || !estadosData || estadosData.length === 0) return;
    if (window.ESTADOS_GEO) {
      const ufMap = new Map(estadosData.map(u => [u.uf, u]));
      window.ESTADOS_GEO.features?.forEach(feat => {
        feat.properties.status_gov = getGovStatus(feat.properties.uf);
        const u = ufMap.get(feat.properties?.uf);
        if (u) {
          feat.properties.nome = u.nome;
          feat.properties.aptos = u.aptos;
          feat.properties.abstencao = u.abstencao;
          feat.properties.taxa = u.taxa_abstencao;
          feat.properties.pos_pres = u.cargos?.Presidente?.posicao || 3;
          feat.properties.pos_gov = u.cargos?.Governador?.posicao || 3;
          feat.properties.pos_sen = u.cargos?.Senador?.posicao || 3;
          feat.properties.abstencao_pres = u.cargos?.Presidente?.votos || u.abstencao;
          feat.properties.taxa_pres = u.cargos?.Presidente?.taxa_abstencao || u.taxa_abstencao;
          feat.properties.abstencao_gov = u.cargos?.Governador?.votos || u.abstencao;
          feat.properties.taxa_gov = u.cargos?.Governador?.taxa_abstencao || u.taxa_abstencao;
          feat.properties.abstencao_sen = u.cargos?.Senador?.votos || u.abstencao;
          feat.properties.taxa_sen = u.cargos?.Senador?.taxa_abstencao || u.taxa_abstencao;
        }
      });
      const src = map.getSource('estados');
      if (src) src.setData(window.ESTADOS_GEO);
    }
  }, [estadosData, mapLoaded]);

  // Toggle ViewMode Layers Visibility (Estados vs Municípios)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;

    if (viewMode === 'estados') {
      // Show Estados layers and refresh fill-color
      const colorExpr = getFillColorExpression(currentCargoRef.current || currentCargo);
      if (map.getLayer('estados-fill')) {
        map.setLayoutProperty('estados-fill', 'visibility', 'visible');
        map.setPaintProperty('estados-fill', 'fill-color', colorExpr);
      }
      if (map.getLayer('estados-line')) map.setLayoutProperty('estados-line', 'visibility', 'visible');
      if (map.getLayer('estados-uf-contour-overlay')) map.setLayoutProperty('estados-uf-contour-overlay', 'visibility', 'visible');
      if (map.getLayer('estado-hover-glow')) map.setLayoutProperty('estado-hover-glow', 'visibility', 'visible');
      if (map.getLayer('estado-hover-fill')) map.setLayoutProperty('estado-hover-fill', 'visibility', 'visible');
      if (map.getLayer('estado-hover-line')) map.setLayoutProperty('estado-hover-line', 'visibility', 'visible');
      if (map.getLayer('estado-highlight')) map.setLayoutProperty('estado-highlight', 'visibility', 'visible');

      // Hide Municípios layers
      if (map.getLayer('municipios-fill')) map.setLayoutProperty('municipios-fill', 'visibility', 'none');
      if (map.getLayer('municipios-line')) map.setLayoutProperty('municipios-line', 'visibility', 'none');
      if (map.getLayer('municipio-hover-glow')) map.setLayoutProperty('municipio-hover-glow', 'visibility', 'none');
      if (map.getLayer('municipio-hover-fill')) map.setLayoutProperty('municipio-hover-fill', 'visibility', 'none');
      if (map.getLayer('municipio-hover-line')) map.setLayoutProperty('municipio-hover-line', 'visibility', 'none');
      if (map.getLayer('municipio-highlight')) map.setLayoutProperty('municipio-highlight', 'visibility', 'none');

      // Clear any municipality hover
      const munHover = map.getSource('municipio-hover-source');
      if (munHover) munHover.setData({ type: 'FeatureCollection', features: [] });
    } else {
      // Municípios view mode:
      // Hide Estados fill & hover
      if (map.getLayer('estados-fill')) map.setLayoutProperty('estados-fill', 'visibility', 'none');
      if (map.getLayer('estados-line')) map.setLayoutProperty('estados-line', 'visibility', 'visible');
      if (map.getLayer('estados-uf-contour-overlay')) map.setLayoutProperty('estados-uf-contour-overlay', 'visibility', 'visible');
      if (map.getLayer('estado-hover-glow')) map.setLayoutProperty('estado-hover-glow', 'visibility', 'none');
      if (map.getLayer('estado-hover-fill')) map.setLayoutProperty('estado-hover-fill', 'visibility', 'none');
      if (map.getLayer('estado-hover-line')) map.setLayoutProperty('estado-hover-line', 'visibility', 'none');

      // Show Municípios layers
      if (map.getLayer('municipios-fill')) map.setLayoutProperty('municipios-fill', 'visibility', 'visible');
      if (map.getLayer('municipios-line')) map.setLayoutProperty('municipios-line', 'visibility', 'visible');
      if (map.getLayer('municipio-hover-glow')) map.setLayoutProperty('municipio-hover-glow', 'visibility', 'visible');
      if (map.getLayer('municipio-hover-fill')) map.setLayoutProperty('municipio-hover-fill', 'visibility', 'visible');
      if (map.getLayer('municipio-hover-line')) map.setLayoutProperty('municipio-hover-line', 'visibility', 'visible');
      if (map.getLayer('municipio-highlight')) map.setLayoutProperty('municipio-highlight', 'visibility', 'visible');

      // Clear any state hover
      const ufHover = map.getSource('estado-hover-source');
      if (ufHover) ufHover.setData({ type: 'FeatureCollection', features: [] });
    }
  }, [viewMode, mapLoaded]);

  // Handle Isolation & Zoom when selecting Município, Estado ou Região
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;

    const scopeKey = `${currentScope?.type || 'brasil'}_${currentScope?.id || 'BR'}_${currentRegiao}`;
    const scopeChanged = prevScopeKeyRef.current !== scopeKey;
    prevScopeKeyRef.current = scopeKey;

    if (currentScope.type === 'municipio' && currentScope.item) {
      // 1. ISOLATE MUNICIPIO: Show ONLY the selected municipality!
      const targetId = Number(currentScope.item.id);
      const munUf = currentScope.item.uf;

      if (map.getLayer('municipios-fill')) {
        map.setFilter('municipios-fill', ['==', 'id', targetId]);
      }
      if (map.getLayer('municipios-line')) {
        map.setFilter('municipios-line', ['==', 'id', targetId]);
      }
      if (map.getLayer('municipio-highlight')) {
        map.setFilter('municipio-highlight', ['==', 'id', targetId]);
      }

      if (map.getLayer('estados-fill')) {
        map.setFilter('estados-fill', ['==', 'uf', munUf]);
      }
      if (map.getLayer('estados-line')) {
        map.setFilter('estados-line', ['==', 'uf', munUf]);
      }
      if (map.getLayer('estados-uf-contour-overlay')) {
        map.setFilter('estados-uf-contour-overlay', ['==', 'uf', munUf]);
      }
      if (map.getLayer('estado-highlight')) {
        map.setFilter('estado-highlight', ['==', 'uf', munUf]);
      }

      // Auto-fit to isolated municipality only if scope changed
      if (scopeChanged) {
        const feat = window.MUNICIPIOS_GEO?.features?.find(
          f => Number(f.id) === targetId || Number(f.properties?.id) === targetId
        );
        const bbox = currentScope.item.bbox || feat?.properties?.bbox;
        if (bbox && bbox.length === 4) {
          map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], {
            padding: 80,
            duration: 700,
            maxZoom: 11
          });
        } else if (feat?.properties?.lat && feat?.properties?.lon) {
          map.flyTo({
            center: [feat.properties.lon, feat.properties.lat],
            zoom: 8.5,
            duration: 700
          });
        }
      }

    } else if (currentScope.type === 'uf') {
      // 2. ISOLATE ESTADO: Show ONLY the selected State!
      const targetUf = currentScope.id;

      if (map.getLayer('estados-fill')) {
        map.setFilter('estados-fill', ['==', 'uf', targetUf]);
      }
      if (map.getLayer('estados-line')) {
        map.setFilter('estados-line', ['==', 'uf', targetUf]);
      }
      if (map.getLayer('estados-uf-contour-overlay')) {
        map.setFilter('estados-uf-contour-overlay', ['==', 'uf', targetUf]);
      }
      if (map.getLayer('estado-highlight')) {
        map.setFilter('estado-highlight', ['==', 'uf', targetUf]);
      }

      if (map.getLayer('municipios-fill')) {
        map.setFilter('municipios-fill', ['==', 'uf', targetUf]);
      }
      if (map.getLayer('municipios-line')) {
        map.setFilter('municipios-line', ['==', 'uf', targetUf]);
      }
      if (map.getLayer('municipio-highlight')) {
        map.setFilter('municipio-highlight', ['==', 'id', -1]);
      }

      // Auto-fit to isolated State only if scope changed
      if (scopeChanged) {
        const bbox = STATE_BOUNDS[targetUf];
        if (bbox) {
          map.fitBounds(bbox, {
            padding: 50,
            duration: 700
          });
        }
      }

    } else if (currentRegiao !== 'todas') {
      // 3. ISOLATE REGIÃO: Show ONLY the selected Region!
      const ufs = REGION_STATES[currentRegiao] || [];

      if (map.getLayer('estados-fill')) {
        map.setFilter('estados-fill', ['in', 'uf', ...ufs]);
      }
      if (map.getLayer('estados-line')) {
        map.setFilter('estados-line', ['in', 'uf', ...ufs]);
      }
      if (map.getLayer('estados-uf-contour-overlay')) {
        map.setFilter('estados-uf-contour-overlay', ['in', 'uf', ...ufs]);
      }
      if (map.getLayer('estado-highlight')) {
        map.setFilter('estado-highlight', ['==', 'uf', '']);
      }

      if (map.getLayer('municipios-fill')) {
        map.setFilter('municipios-fill', ['in', 'uf', ...ufs]);
      }
      if (map.getLayer('municipios-line')) {
        map.setFilter('municipios-line', ['in', 'uf', ...ufs]);
      }
      if (map.getLayer('municipio-highlight')) {
        map.setFilter('municipio-highlight', ['==', 'id', -1]);
      }

      // Auto-fit to isolated Region only if scope changed
      if (scopeChanged) {
        const bbox = REGION_BOUNDS[currentRegiao];
        if (bbox) {
          map.fitBounds(bbox, {
            padding: 45,
            duration: 700
          });
        }
      }

    } else {
      // 4. BRASIL (NO ISOLATION): Show ALL States & Municípios!
      if (map.getLayer('estados-fill')) {
        map.setFilter('estados-fill', null);
      }
      if (map.getLayer('estados-line')) {
        map.setFilter('estados-line', null);
      }
      if (map.getLayer('estados-uf-contour-overlay')) {
        map.setFilter('estados-uf-contour-overlay', null);
      }
      if (map.getLayer('estado-highlight')) {
        map.setFilter('estado-highlight', ['==', 'uf', '']);
      }

      if (map.getLayer('municipios-fill')) {
        map.setFilter('municipios-fill', null);
      }
      if (map.getLayer('municipios-line')) {
        map.setFilter('municipios-line', null);
      }
      if (map.getLayer('municipio-highlight')) {
        map.setFilter('municipio-highlight', ['==', 'id', -1]);
      }

      // Reframe Brazil only if scope changed
      if (scopeChanged) {
        map.fitBounds(BRAZIL_BOUNDS, {
          padding: BRAZIL_FIT_PADDING,
          duration: 700,
          maxZoom: 4.2
        });
      }
    }
  }, [currentScope, currentRegiao, mapLoaded]);

  // Window & Container Resize Listener
  useEffect(() => {
    const handleResize = () => {
      const map = mapInstanceRef.current;
      if (!map || !mapLoaded) return;
      map.resize();
    };
    window.addEventListener('resize', handleResize);

    let ro = null;
    if (mapContainerRef.current && window.ResizeObserver) {
      ro = new ResizeObserver(() => {
        handleResize();
      });
      ro.observe(mapContainerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (ro) ro.disconnect();
    };
  }, [mapLoaded]);

  // Pill Title Text in Legend Bar
  let pillText = viewMode === 'estados'
    ? 'Brasil · 27 Estados (UFs)'
    : 'Brasil · 5.564 Municípios em Polígonos';

  if (currentScope.type === 'uf' && currentScope.item) {
    const u = currentScope.item;
    const cgData = u.cargos?.[currentCargo];
    const ufAbst = cgData?.votos || cgData?.abstencao || u.abstencao || 0;
    const ufTaxa = cgData?.taxa_abstencao || u.taxa_abstencao || 0;
    pillText = viewMode === 'estados'
      ? `📍 ${u.nome} (${currentScope.id}) · ${formatNumber(ufAbst)} ausentes (${formatPercent(ufTaxa)}) · Estado Isolado`
      : `📍 ${u.nome} (${currentScope.id}) · ${formatNumber(ufAbst)} ausentes (${formatPercent(ufTaxa)}) · Municípios Isolados`;
  } else if (currentScope.type === 'municipio' && currentScope.item) {
    const m = currentScope.item;
    pillText = `📍 ${m.nome} (${m.uf}) · ${formatNumber(m.abstencao || 0)} ausentes (${formatPercent(m.taxa_abstencao ?? m.taxa ?? 0)}) · Isolado`;
  } else if (currentRegiao !== 'todas') {
    pillText = viewMode === 'estados'
      ? `📍 Região ${currentRegiao} · Estados Isolados`
      : `📍 Região ${currentRegiao} · Municípios Isolados`;
  }

  // Search input button text
  let searchButtonText = 'Buscar Município...';
  if (currentScope.type === 'uf' && currentScope.item) {
    searchButtonText = `${currentScope.item.nome} (${currentScope.id})`;
  } else if (currentScope.type === 'municipio' && currentScope.item) {
    searchButtonText = `${currentScope.item.nome} (${currentScope.item.uf})`;
  }

  const selectedMunUf = currentScope.type === 'municipio' ? (currentScope.item?.uf || '') : '';
  const handleBackToUf = () => {
    if (!selectedMunUf) return;
    setViewMode('municipios');
    onSelectUf(selectedMunUf);
  };

  const handleReframeBrasil = () => {
    onResetBrasil();
    const map = mapInstanceRef.current;
    if (map) {
      prevScopeKeyRef.current = 'brasil_BR_todas';
      map.fitBounds(BRAZIL_BOUNDS, {
        padding: BRAZIL_FIT_PADDING,
        duration: 700,
        maxZoom: 4.2
      });
    }
  };

  return (
    <section className="map-workspace glass-panel" id="mapWorkspace">
      <div className="map-header">
        <div className="map-title-block">
          <div className="map-header-top">
            <span className="map-badge-icon">🗺️</span>
            <h3 className="panel-title">
              {viewMode === 'estados' ? 'Mapa Eleitoral por Estados (27 UFs)' : 'Mapa Eleitoral Municipal do Brasil'}
            </h3>
          </div>
          <p className="panel-subtitle" id="mapModeSubtitle">
            {viewMode === 'estados'
              ? 'Todas as 27 Unidades da Federação com simulação da Abstenção'
              : 'Todos os 5.564 municípios em polígonos com simulação da Abstenção'}
          </p>
        </div>
      </div>

      {/* Filter Controls Toolbar: Visualização (Radio), Região, Estado & Busca de Município */}
      <div className="map-controls-toolbar">
        {/* Visualização: Seleção Radio "Municípios" e "Estados" (Default: Estados) */}
        <div className="control-group view-mode-group">
          <label className="control-label">Visualização</label>
          <div className="radio-group-container" role="radiogroup" aria-label="Visualização do mapa">
            <label className={`custom-radio-item ${viewMode === 'municipios' ? 'is-selected' : ''}`}>
              <input
                type="radio"
                name="mapViewMode"
                value="municipios"
                checked={viewMode === 'municipios'}
                onChange={() => setViewMode('municipios')}
                className="custom-radio-input"
              />
              <span className="radio-text">Municípios</span>
            </label>
            <label className={`custom-radio-item ${viewMode === 'estados' ? 'is-selected' : ''}`}>
              <input
                type="radio"
                name="mapViewMode"
                value="estados"
                checked={viewMode === 'estados'}
                onChange={() => {
                  setViewMode('estados');
                  if (currentScope?.type === 'municipio') {
                    if (currentScope.item?.uf) {
                      onSelectUf(currentScope.item.uf);
                    } else {
                      onResetBrasil();
                    }
                  }
                }}
                className="custom-radio-input"
              />
              <span className="radio-text">Estados</span>
            </label>
          </div>
        </div>

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
              if (e.target.value === 'BR') handleReframeBrasil();
              else onSelectUf(e.target.value);
            }}
          >
            <option value="BR">Todos os Estados (Brasil)</option>
            <option value="AC">Acre (AC)</option>
            <option value="AL">Alagoas (AL)</option>
            <option value="AP">Amapá (AP)</option>
            <option value="AM">Amazonas (AM)</option>
            <option value="BA">Bahia (BA)</option>
            <option value="CE">Ceará (CE)</option>
            <option value="DF">Distrito Federal (DF)</option>
            <option value="ES">Espírito Santo (ES)</option>
            <option value="GO">Goiás (GO)</option>
            <option value="MA">Maranhão (MA)</option>
            <option value="MT">Mato Grosso (MT)</option>
            <option value="MS">Mato Grosso do Sul (MS)</option>
            <option value="MG">Minas Gerais (MG)</option>
            <option value="PA">Pará (PA)</option>
            <option value="PB">Paraíba (PB)</option>
            <option value="PR">Paraná (PR)</option>
            <option value="PE">Pernambuco (PE)</option>
            <option value="PI">Piauí (PI)</option>
            <option value="RJ">Rio de Janeiro (RJ)</option>
            <option value="RN">Rio Grande do Norte (RN)</option>
            <option value="RS">Rio Grande do Sul (RS)</option>
            <option value="RO">Rondônia (RO)</option>
            <option value="RR">Roraima (RR)</option>
            <option value="SC">Santa Catarina (SC)</option>
            <option value="SP">São Paulo (SP)</option>
            <option value="SE">Sergipe (SE)</option>
            <option value="TO">Tocantins (TO)</option>
          </select>
        </div>

        <div className="control-group search-group">
          <label className="control-label">Buscar Município</label>
          <div className="search-trigger-wrap">
            <div
              className={`search-trigger-btn map-search-btn ${isFiltered ? 'is-active' : ''}`}
              id="mapSearchTriggerBtn"
              role="button"
              tabIndex={0}
              onClick={onOpenSearch}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpenSearch();
                }
              }}
            >
              <div className="search-btn-left">
                <svg className="search-icon" viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
                <span className="search-btn-text">{searchButtonText}</span>
              </div>
              <div className="search-btn-right">
                {isFiltered && (
                  <button
                    className="btn-clear-search"
                    title="Limpar seleção e voltar ao Brasil"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReframeBrasil();
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Map Legend Bar */}
      <div className="map-legend-bar">
        <div className="map-active-pill-wrap" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            className={`map-active-pill ${isFiltered ? 'is-filtered' : ''}`}
            id="mapActivePill"
            title={selectedMunUf ? `Clique para voltar aos municípios de ${selectedMunUf}` : "Clique para voltar à visão nacional do Brasil"}
            onClick={selectedMunUf ? handleBackToUf : (isFiltered ? handleReframeBrasil : undefined)}
          >
            <span className="pulse-dot"></span>
            <span>{pillText}</span>
          </div>
          {selectedMunUf && (
            <button
              type="button"
              className="pill-back-btn"
              title={`Voltar para os municípios de ${selectedMunUf}`}
              onClick={handleBackToUf}
            >
              ✕ Voltar à {selectedMunUf}
            </button>
          )}
          {isFiltered && (
            <button
              type="button"
              className="pill-back-btn"
              title="Voltar para a visão do Brasil"
              onClick={handleReframeBrasil}
            >
              ✕ Voltar ao Brasil
            </button>
          )}
        </div>

        {/* Dynamic Legend based on cargo */}
        {currentCargo === 'Governador' ? (
          <div className="legend-pills">
            <span className="legend-item"><i className="legend-color green"></i> Forçaria e iria para o 2º turno</span>
            <span className="legend-item"><i className="legend-color gold"></i> Forçaria um 2º turno entre os dois primeiros colocados</span>
            <span className="legend-item"><i className="legend-color blue"></i> Não alteraria</span>
          </div>
        ) : currentCargo === 'Presidente' ? (
          <div className="legend-pills">
            <span className="legend-item"><i className="legend-color cyan"></i> Iria para o 2º Turno</span>
            <span className="legend-item"><i className="legend-color slate"></i> Não iria para o 2º Turno</span>
          </div>
        ) : (
          <div className="legend-pills">
            <span className="legend-item"><i className="legend-color gold"></i> Eleita Senadora (1ª Vaga)</span>
            <span className="legend-item"><i className="legend-color cyan"></i> Eleita Senadora (2ª Vaga)</span>
            <span className="legend-item"><i className="legend-color slate"></i> Não eleita</span>
          </div>
        )}
      </div>

      {/* MapLibre WebGL Canvas Container */}
      <div
        className="maplibre-container-wrap"
        id="mapWrapper"
        style={{ position: 'relative' }}
        onMouseLeave={() => {
          hoveredMunIdRef.current = null;
          hoveredUfRef.current = null;
          const map = mapInstanceRef.current;
          if (map) {
            const munHoverSrc = map.getSource('municipio-hover-source');
            if (munHoverSrc) munHoverSrc.setData({ type: 'FeatureCollection', features: [] });
            const ufHoverSrc = map.getSource('estado-hover-source');
            if (ufHoverSrc) ufHoverSrc.setData({ type: 'FeatureCollection', features: [] });
          }
          if (tooltipRef.current) {
            tooltipRef.current.style.display = 'none';
          }
        }}
      >
        <div ref={mapContainerRef} id="maplibreCanvas" style={{ width: '100%', height: '100%' }}></div>

        {/* Floating Hover Tooltip (Direct DOM manipulation for 0-latency cursor tracking) */}
        <div
          ref={tooltipRef}
          className="maplibre-hover-tooltip"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            display: 'none',
            pointerEvents: 'none',
            zIndex: 100,
            willChange: 'transform'
          }}
        >
          <div ref={tooltipTitleRef} className="tooltip-title"></div>
          <div ref={tooltipTaxaRef} className="tooltip-taxa"></div>
          <div ref={tooltipPosRef} className="tooltip-pos"></div>
        </div>
      </div>

      {/* Quick state reset button when zoomed in */}
      <div className="map-footer-bar">
        <button type="button" className="btn-reset-map-view" id="btnResetMapView" onClick={handleReframeBrasil}>
          🇧🇷 Reenquadrar Todo o Brasil
        </button>
        <span className="map-footer-hint">
          {viewMode === 'estados'
            ? 'Passe o mouse para destacar ou clique em qualquer estado para isolá-lo e ver o veredito'
            : 'Passe o mouse para destacar ou clique em qualquer município para isolá-lo e ver o veredito'}
        </span>
      </div>
    </section>
  );
}
