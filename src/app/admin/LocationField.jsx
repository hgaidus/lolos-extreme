'use client';

import dynamic from 'next/dynamic';

const LocationPickerMap = dynamic(() => import('./LocationPickerMap'), {
  ssr: false,
  loading: () => (
    <div className="rounded border border-gray-300 bg-gray-50 text-sm text-gray-500 flex items-center justify-center" style={{ height: 420 }}>
      Loading map…
    </div>
  ),
});

// Five decimals is about a metre, and is what the existing 808 stops carry.
const round5 = (n) => Math.round(n * 1e5) / 1e5;

// "37.87391, -119.35912" — what Google Maps puts on the clipboard when you
// right-click a spot — pasted into either box fills both.
function parsePair(text) {
  const m = String(text).trim().match(/^(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

// A stop's position: two number boxes and a map, kept in step. `lat`/`lng`
// are strings (the boxes' own state) so a half-typed "-119." is not fought.
export default function LocationField({ lat, lng, onChange, nearby, errors = {} }) {
  const latNum = lat === '' ? NaN : Number(lat);
  const lngNum = lng === '' ? NaN : Number(lng);
  const hasPin = Number.isFinite(latNum) && Number.isFinite(lngNum);

  const onPaste = (e) => {
    const pair = parsePair(e.clipboardData.getData('text'));
    if (!pair) return;
    e.preventDefault();
    onChange(String(round5(pair.lat)), String(round5(pair.lng)));
  };

  return (
    <div className="border-t border-gray-100 pt-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
      <p className="text-xs text-gray-500 mb-2">
        Click the map to place the pin, or drag it to adjust. Saving puts this stop on the
        site&rsquo;s trip stops map once it is published.
      </p>
      <LocationPickerMap
        lat={latNum}
        lng={lngNum}
        nearby={nearby}
        onPick={(a, b) => onChange(String(round5(a)), String(round5(b)))}
      />
      <div className="flex flex-wrap items-end gap-3 mt-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1" htmlFor="stop-lat">Latitude</label>
          <input
            id="stop-lat" inputMode="decimal" value={lat}
            onChange={(e) => onChange(e.target.value, lng)}
            onPaste={onPaste}
            className="w-36 border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1" htmlFor="stop-lng">Longitude</label>
          <input
            id="stop-lng" inputMode="decimal" value={lng}
            onChange={(e) => onChange(lat, e.target.value)}
            onPaste={onPaste}
            className="w-36 border border-gray-300 rounded px-3 py-2"
          />
        </div>
        {(lat !== '' || lng !== '') && (
          <button type="button" onClick={() => onChange('', '')} className="text-sm text-blue-700 underline pb-2">
            Remove location
          </button>
        )}
        {!hasPin && lat === '' && lng === '' && (
          <span className="text-xs text-amber-700 pb-2">No location yet — this stop is not on the map.</span>
        )}
      </div>
      {errors.lat && <p className="text-red-600 text-xs mt-1">Latitude: {errors.lat}</p>}
      {errors.lng && <p className="text-red-600 text-xs mt-1">Longitude: {errors.lng}</p>}
    </div>
  );
}
