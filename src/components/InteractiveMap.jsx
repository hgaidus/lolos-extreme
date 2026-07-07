"use client";

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

// Tile Layer definitions
const TILE_LAYERS = {
  street: {
    name: "Street Map",
    icon: "🗺️",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012"
  },
  topo: {
    name: "Topo / Terrain",
    icon: "🏔️",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community"
  },
  satellite: {
    name: "Satellite Imagery",
    icon: "🛰️",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
  },
  dark: {
    name: "Dark Navigation",
    icon: "🌙",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors &copy; <a href='https://carto.com/attributions'>CARTO</a>"
  }
};

const REGION_PRESETS = [
  { key: 'ALL', label: "🌍 Worldwide (809 stops)", center: [20.0, 0.0], zoom: 2 },
  { key: 'NA', label: "🇺🇸 North America (693 stops)", center: [39.8283, -98.5795], zoom: 4 },
  { key: 'NZ', label: "🇳🇿 New Zealand (24 stops)", center: [-43.0, 171.0], zoom: 6 },
  { key: 'EU', label: "🇪🇺 Europe & Iceland (73 stops)", center: [48.0, 10.0], zoom: 4 },
  { key: 'GAL', label: "🏝️ Galapagos Islands (11 stops)", center: [-0.6, -90.3], zoom: 8 },
  { key: 'TH', label: "🇹🇭 Thailand (6 stops)", center: [13.7, 100.5], zoom: 6 },
];

const createPinIcon = (isSelected = false) => {
  const color = isSelected ? "#ef4444" : "#f59e0b";
  const size = isSelected ? 36 : 28;
  return L.divIcon({
    className: "custom-gps-pin",
    html: `<div style="width: ${size}px; height: ${size}px; filter: drop-shadow(0px 3px 5px rgba(0,0,0,0.8)); cursor: pointer; transition: all 0.2s ease;">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%;">
        <path d="M12 0C7.58 0 4 3.58 4 8C4 14.28 12 24 12 24C12 24 20 14.28 20 8C20 3.58 16.42 0 12 0Z" fill="${color}" stroke="#ffffff" stroke-width="1.5"/>
        <circle cx="12" cy="8" r="3.5" fill="#0b1711"/>
      </svg>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    tooltipAnchor: [0, -size]
  });
};

export default function InteractiveMap({ 
  locations = [], 
  defaultCenter = [20.0, 0.0], 
  defaultZoom = 2, 
  height = "580px",
  enableFilter = true 
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const tileLayerRef = useRef(null);
  
  const [activeLayerKey, setActiveLayerKey] = useState('street');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('ALL');
  const [selectedState, setSelectedState] = useState('ALL');

  // Extract available state abbreviations from stop titles or data
  const availableStates = React.useMemo(() => {
    const states = new Set();
    locations.forEach(loc => {
      // Look for ", XX" pattern in title (e.g. "Breezewood, PA")
      const match = (loc.title || "").match(/,\s*([A-Z]{2})\b/);
      if (match) {
        states.add(match[1]);
      }
    });
    return Array.from(states).sort();
  }, [locations]);

  // Filtered locations
  const filteredLocations = React.useMemo(() => {
    return locations.filter(loc => {
      if (!loc.lat || !loc.lng || isNaN(loc.lat) || isNaN(loc.lng)) return false;

      const matchesSearch = !searchTerm || 
        (loc.title && loc.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (loc.travelogue && loc.travelogue.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesState = selectedState === 'ALL' || 
        (loc.title && loc.title.includes(`, ${selectedState}`));

      const matchesRegion = selectedRegion === 'ALL' || 
        (selectedRegion === 'NA' && loc.lng < -50 && loc.lat > 15) ||
        (selectedRegion === 'NZ' && (loc.lng > 160 || loc.lat < -30)) ||
        (selectedRegion === 'EU' && loc.lng > -30 && loc.lng < 40 && loc.lat > 35) ||
        (selectedRegion === 'GAL' && loc.lng > -95 && loc.lng < -85 && loc.lat > -5 && loc.lat < 5) ||
        (selectedRegion === 'TH' && loc.lng > 90 && loc.lng < 110 && loc.lat > 0 && loc.lat < 25);
        
      return matchesSearch && matchesState && matchesRegion;
    });
  }, [locations, searchTerm, selectedState, selectedRegion]);

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstanceRef.current) return;

    // Create map instance defaulting to Worldwide view
    const map = L.map(mapRef.current, {
      center: defaultCenter,
      zoom: defaultZoom,
      zoomControl: false,
      attributionControl: true
    });

    // Add custom position zoom control
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Initial tile layer
    const layerInfo = TILE_LAYERS[activeLayerKey];
    const tileLayer = L.tileLayer(layerInfo.url, {
      maxZoom: 18,
      attribution: layerInfo.attribution
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;

    // Layer group for markers
    markersLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle tile layer changes
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const layerInfo = TILE_LAYERS[activeLayerKey];
    tileLayerRef.current.setUrl(layerInfo.url);
  }, [activeLayerKey]);

  // Update Markers when filteredLocations change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    // Clear previous markers
    markersLayerRef.current.clearLayers();

    const validLatLngs = [];

    filteredLocations.forEach((loc) => {
      if (!loc.lat || !loc.lng || isNaN(loc.lat) || isNaN(loc.lng)) return;

      validLatLngs.push([loc.lat, loc.lng]);

      const marker = L.marker([loc.lat, loc.lng], {
        icon: createPinIcon(false),
        title: loc.title
      });

      const targetUrl = loc.url ? (loc.url.startsWith('/') ? loc.url : `/${loc.url}`) : '#';

      // Show title tooltip cleanly on hover
      marker.bindTooltip(`<strong>${loc.title || 'Campsite Stop'}</strong>`, {
        direction: 'top',
        offset: [0, -28],
        className: 'custom-map-tooltip'
      });

      // Clicking the pushpin goes directly to the trip stop without opening a popup box!
      marker.on('click', () => {
        if (targetUrl && targetUrl !== '#') {
          window.location.href = targetUrl;
        }
      });

      markersLayerRef.current.addLayer(marker);
    });

    if (!enableFilter && validLatLngs.length > 0) {
      mapInstanceRef.current.fitBounds(L.latLngBounds(validLatLngs), {
        padding: [40, 40],
        maxZoom: 12,
        animate: true,
        duration: 1.0
      });
    }
  }, [filteredLocations, enableFilter]);

  const handleRegionChange = (newRegionKey) => {
    setSelectedRegion(newRegionKey);
    setSelectedState('ALL');
    const region = REGION_PRESETS.find(r => r.key === newRegionKey);
    if (region && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(region.center, region.zoom, {
        animate: true,
        duration: 1.2
      });
    }
  };

  const handleResetView = () => {
    setSelectedRegion('ALL');
    setSelectedState('ALL');
    setSearchTerm('');
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([20.0, 0.0], 2, {
        animate: true,
        duration: 1.0
      });
    }
  };

  return (
    <div className="interactive-travel-map-container" style={{ width: "100%", marginBottom: "40px" }}>
      {/* Filter and Controls Header */}
      {enableFilter && (
        <div className="glass-panel" style={{ padding: "16px 20px", marginBottom: "16px", display: "flex", flexWrap: "wrap", gap: "16px", justifyContent: "space-between", alignItems: "center", borderLeft: "4px solid var(--color-gold-primary)" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", flex: "1 1 400px" }}>
            <div style={{ position: "relative", flex: "1 1 200px" }}>
              <input 
                type="text" 
                placeholder="🔍 Search stop by name or keyword..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: "100%", padding: "8px 14px", borderRadius: "6px", background: "rgba(0,0,0,0.4)", border: "1px solid var(--border-light)", color: "#fff", fontSize: "0.9rem" }}
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1rem" }}
                >
                  ✕
                </button>
              )}
            </div>

            <select 
              value={selectedRegion} 
              onChange={(e) => handleRegionChange(e.target.value)}
              style={{ padding: "8px 14px", borderRadius: "6px", background: "rgba(0,0,0,0.6)", border: "1px solid var(--border-gold)", color: "var(--color-gold-light)", fontWeight: "700", fontSize: "0.9rem", cursor: "pointer" }}
            >
              {REGION_PRESETS.map(r => (
                <option key={r.key} value={r.key}>{r.label}</option>
              ))}
            </select>
            
            {availableStates.length > 0 && selectedRegion === 'NA' && (
              <select 
                value={selectedState} 
                onChange={(e) => setSelectedState(e.target.value)}
                style={{ padding: "8px 14px", borderRadius: "6px", background: "rgba(0,0,0,0.6)", border: "1px solid var(--border-light)", color: "#fff", fontSize: "0.9rem", cursor: "pointer" }}
              >
                <option value="ALL">All States/Provinces</option>
                {availableStates.map(st => (
                  <option key={st} value={st}>State: {st}</option>
                ))}
              </select>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--color-gold-light)", fontWeight: "700" }}>
              Showing {filteredLocations.length} Waypoints
            </span>
            <button 
              onClick={handleResetView}
              className="btn-gold"
              style={{ padding: "6px 14px", fontSize: "0.85rem", background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid var(--border-gold)" }}
            >
              🔄 World View
            </button>
          </div>
        </div>
      )}

      {/* Main Map Viewport */}
      <div style={{ position: "relative", width: "100%", height: height, borderRadius: "12px", overflow: "hidden", border: "2px solid var(--border-gold)", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
        {/* Tile Layer Switcher Pills */}
        <div style={{ position: "absolute", top: "12px", right: "12px", zIndex: 1000, display: "flex", gap: "6px", background: "rgba(10,25,18,0.85)", padding: "6px", borderRadius: "8px", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)", flexWrap: "wrap", boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}>
          {Object.entries(TILE_LAYERS).map(([key, info]) => {
            const isActive = activeLayerKey === key;
            return (
              <button
                key={key}
                onClick={() => setActiveLayerKey(key)}
                style={{
                  padding: "5px 10px",
                  borderRadius: "6px",
                  fontSize: "0.8rem",
                  fontWeight: isActive ? "700" : "500",
                  background: isActive ? "var(--color-gold-primary)" : "transparent",
                  color: isActive ? "#000000" : "var(--text-primary)",
                  border: isActive ? "1px solid #d97706" : "1px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                <span>{info.icon}</span>
                <span className="hidden sm:inline">{info.name}</span>
              </button>
            );
          })}
        </div>

        {/* The Leaflet Map DOM Element */}
        <div ref={mapRef} style={{ width: "100%", height: "100%", background: "#0b1711" }} />
      </div>
    </div>
  );
}
