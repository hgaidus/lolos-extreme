'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

// The map half of the stop location field: click anywhere to drop the pin,
// drag the pin to adjust. Loaded only in the browser (see LocationField) —
// Leaflet touches `window` on import.
//
// Same Esri tiles the public map uses. Satellite is offered because the point
// of picking by eye is usually to land on the actual campsite, which a street
// map does not show.
const LAYERS = {
  street: {
    label: 'Street',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
  },
  satellite: {
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  },
  topo: {
    label: 'Topo',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
  },
};
const ATTRIBUTION = '&copy; Esri and its data providers';

const PIN = L.divIcon({
  className: 'location-picker-pin',
  html: `<svg viewBox="0 0 24 24" width="34" height="34" style="filter: drop-shadow(0 2px 3px rgba(0,0,0,.6))">
    <path d="M12 0C7.58 0 4 3.58 4 8C4 14.28 12 24 12 24C12 24 20 14.28 20 8C20 3.58 16.42 0 12 0Z" fill="#ef4444" stroke="#fff" stroke-width="1.5"/>
    <circle cx="12" cy="8" r="3.5" fill="#fff"/>
  </svg>`,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
});

export default function LocationPickerMap({ lat, lng, nearby, onPick }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const tilesRef = useRef(null);
  const markerRef = useRef(null);
  const onPickRef = useRef(onPick);
  const [layer, setLayer] = useState('street');
  const [query, setQuery] = useState('');
  const [searchNote, setSearchNote] = useState('');

  useEffect(() => { onPickRef.current = onPick; }, [onPick]);

  const hasPin = Number.isFinite(lat) && Number.isFinite(lng);

  // Create the map once.
  useEffect(() => {
    const start = hasPin ? { center: [lat, lng], zoom: 13 }
      : nearby ? { center: [nearby.lat, nearby.lng], zoom: 8 }
      : { center: [39.8283, -98.5795], zoom: 4 };
    const map = L.map(elRef.current, { ...start, scrollWheelZoom: true });
    tilesRef.current = L.tileLayer(LAYERS.street.url, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(map);
    map.on('click', (e) => onPickRef.current(e.latlng.lat, e.latlng.lng));
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; markerRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { tilesRef.current?.setUrl(LAYERS[layer].url); }, [layer]);

  // Keep the pin where the lat/lng boxes say it is — they may have been typed.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!hasPin) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    if (!markerRef.current) {
      const marker = L.marker([lat, lng], { icon: PIN, draggable: true }).addTo(map);
      marker.on('dragend', () => {
        const p = marker.getLatLng();
        onPickRef.current(p.lat, p.lng);
      });
      markerRef.current = marker;
    } else {
      markerRef.current.setLatLng([lat, lng]);
    }
    // A typed coordinate can be anywhere; bring it into view without undoing
    // the zoom level someone has carefully chosen.
    if (!map.getBounds().contains([lat, lng])) map.setView([lat, lng], Math.max(map.getZoom(), 10));
  }, [lat, lng, hasPin]);

  // Jump the view to a named place. It only moves the map — the pin is still
  // placed by hand, because a place name resolves to a town centre or a park
  // office, not to where the motorhome was parked.
  async function findPlace() {
    const q = query.trim();
    if (!q) return;
    setSearchNote('Searching…');
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`);
      const hits = res.ok ? await res.json() : [];
      if (!hits.length) { setSearchNote('No place found by that name.'); return; }
      const hit = hits[0];
      // Centre on the place itself; its bounding box only chooses the zoom. A
      // coastal town's box is half ocean, and fitting to it parks the town at
      // the edge of the view.
      const map = mapRef.current;
      let zoom = 13;
      if (map && hit.boundingbox) {
        const [s, n, w, e] = hit.boundingbox.map(Number);
        zoom = Math.min(map.getBoundsZoom([[s, w], [n, e]]), 15);
      }
      map?.setView([Number(hit.lat), Number(hit.lon)], zoom);
      setSearchNote(`Showing ${hit.display_name}. Click the map to place the pin.`);
    } catch {
      setSearchNote('Place search is unavailable right now — pan and zoom instead.');
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); findPlace(); } }}
          placeholder="Find a place, e.g. Tuolumne Meadows Campground"
          aria-label="Find a place on the map"
          className="flex-1 min-w-[14rem] border border-gray-300 rounded px-3 py-1.5 text-sm"
        />
        <button type="button" onClick={findPlace} className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-gray-50 hover:bg-gray-100">
          Find
        </button>
        <span className="inline-flex rounded border border-gray-300 overflow-hidden text-sm">
          {Object.entries(LAYERS).map(([key, l]) => (
            <button
              key={key}
              type="button"
              onClick={() => setLayer(key)}
              aria-pressed={layer === key}
              className={`px-3 py-1.5 ${layer === key ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
            >
              {l.label}
            </button>
          ))}
        </span>
      </div>
      {searchNote && <p className="text-xs text-gray-500 mb-2">{searchNote}</p>}
      <div ref={elRef} className="location-picker-map rounded border border-gray-300" style={{ height: 420, cursor: 'crosshair' }} />
    </div>
  );
}
