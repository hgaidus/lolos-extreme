'use client';

import { useRef, useState } from 'react';
import {
  BASE_MAP, project, buildWaypoints, splitLegs, flightArcControl, thin, placeLabels,
} from '@/lib/routeMapGeometry';

// The trip's overview map: the picture above the itinerary on the trip page.
//
// Two ways to set it. Upload an image made elsewhere, or generate one from the
// stops: the route drawn along the roads between them, each stop numbered as
// it is in the itinerary, on the same base map the hand-made ones used.
//
// The drawing happens here in the browser, on a canvas, rather than on the
// server. That keeps it independent of what the host has installed (fonts for
// the numbers, outbound access for the routing lookup), and the preview is
// simply the canvas. Saving sends the finished picture through the same upload
// the "New Trip" form uses, then points the trip at it.
//
// Roads come from the public OSRM routing service. It is free and carries no
// guarantee, so a failed lookup falls back to straight lines between stops and
// says so — the map is still usable, and can be regenerated later.

const ROUTE_CORE = '#65a0bb';   // sampled from the 2000 map's route line
const ROUTE_EDGE = '#3f7896';
const LABEL_FONT_PX = 22;
const LABEL_FONT = `700 ${LABEL_FONT_PX}px Arial, Helvetica, sans-serif`;
const OSRM = 'https://router.project-osrm.org/route/v1/driving/';
const MAX_ROUTE_POINTS = 80;    // per request; longer runs are fetched in overlapping pieces

async function roadLine(points) {
  const line = [];
  for (let start = 0; start < points.length - 1; start += MAX_ROUTE_POINTS - 1) {
    const piece = points.slice(start, start + MAX_ROUTE_POINTS);
    const coords = piece.map((p) => `${p.lng},${p.lat}`).join(';');
    const res = await fetch(`${OSRM}${coords}?overview=full&geometries=geojson`);
    if (!res.ok) throw new Error(`routing service answered ${res.status}`);
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.[0]) throw new Error(`routing service: ${data.code || 'no route'}`);
    for (const [lng, lat] of data.routes[0].geometry.coordinates) line.push(project(lat, lng));
  }
  return thin(line);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('could not load the base map'));
    img.src = src;
  });
}

function tracePath(ctx, line) {
  ctx.beginPath();
  line.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
}

export default function RouteMapSection({ trip, stops, startDay }) {
  const canvasRef = useRef(null);
  const fileRef = useRef(null);
  const [mapUrl, setMapUrl] = useState(trip.map_image || '');
  const [busy, setBusy] = useState('');       // '' | 'drawing' | 'saving' | 'uploading'
  const [drawn, setDrawn] = useState(false);
  const [notes, setNotes] = useState([]);
  const [message, setMessage] = useState(null); // { tone: 'ok' | 'bad', text }

  const located = stops.filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng)).length;

  async function generate() {
    setBusy('drawing');
    setMessage(null);
    setDrawn(false);
    const found = [];
    try {
      const { points, skipped, offMap, home } = buildWaypoints(trip, stops, startDay);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(await loadImage(BASE_MAP.src), 0, 0, BASE_MAP.width, BASE_MAP.height);

      const routeXY = [];
      let straightFallback = 0;
      for (const leg of splitLegs(points)) {
        const ends = leg.points.map((p) => project(p.lat, p.lng));
        if (leg.kind === 'drive') {
          let line;
          try {
            line = await roadLine(leg.points);
          } catch {
            line = ends;
            straightFallback += 1;
          }
          routeXY.push(...line);
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          ctx.setLineDash([]);
          tracePath(ctx, line);
          ctx.strokeStyle = ROUTE_EDGE;
          ctx.globalAlpha = 0.6;
          ctx.lineWidth = 7;
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = ROUTE_CORE;
          ctx.lineWidth = 4.5;
          ctx.stroke();
        } else {
          // Flown or ferried: dashed. A flight bows like a flight path; a ferry
          // crossing is short and straight.
          const [a, b] = ends;
          ctx.beginPath();
          ctx.moveTo(a[0], a[1]);
          if (leg.kind === 'flight') {
            const [cx, cy] = flightArcControl(a, b);
            ctx.quadraticCurveTo(cx, cy, b[0], b[1]);
          } else {
            ctx.lineTo(b[0], b[1]);
          }
          ctx.setLineDash([3, 9]);
          ctx.lineCap = 'round';
          ctx.strokeStyle = ROUTE_EDGE;
          ctx.lineWidth = 3.5;
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      const stopsXY = points.map((p) => ({ label: p.label, xy: project(p.lat, p.lng) }));
      for (const s of stopsXY) {
        ctx.beginPath();
        ctx.arc(s.xy[0], s.xy[1], 3.6, 0, Math.PI * 2);
        ctx.fillStyle = '#1f3d52';
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = '#eaf2f7';
        ctx.stroke();
      }

      ctx.font = LABEL_FONT;
      ctx.textAlign = 'center';
      ctx.lineJoin = 'round';
      for (const label of placeLabels(stopsXY, routeXY, LABEL_FONT_PX, (t) => ctx.measureText(t).width)) {
        ctx.strokeStyle = '#f3efe6';
        ctx.lineWidth = 4;
        ctx.strokeText(label.label, label.x, label.y);
        ctx.fillStyle = '#141414';
        ctx.fillText(label.label, label.x, label.y);
      }

      found.push(`${points.length - 1} of ${stops.length} stops drawn, starting from home (${home.name}) as 0.`);
      if (skipped.length) found.push(`Left off — no location yet: ${skipped.join('; ')}.`);
      if (offMap.length) found.push(`Outside this map's area: ${offMap.join('; ')}.`);
      const drafts = stops.filter((s) => s.published === false).length;
      if (drafts) found.push(`${drafts} draft stop${drafts === 1 ? ' is' : 's are'} included. The numbers match the public itinerary once every stop is published.`);
      if (straightFallback) found.push('The routing service did not answer for part of the route, so those legs are straight lines. Try again later for roads.');
      setNotes(found);
      setDrawn(true);
    } catch (err) {
      setMessage({ tone: 'bad', text: `Could not draw the map: ${err.message}.` });
    } finally {
      setBusy('');
    }
  }

  // Upload a picture and make it the trip's map. Used for both a generated map
  // and a file chosen from disk.
  async function saveAsMap(file, verb) {
    const form = new FormData();
    form.append('file', file);
    form.append('kind', 'map');
    const up = await fetch('/api/admin/photos', { method: 'POST', body: form });
    const upData = await up.json();
    if (!up.ok) {
      throw new Error(upData.error === 'file_exists'
        ? `${upData.message} Rename it (for example ${upData.suggestion}) and try again`
        : upData.error || 'upload failed');
    }
    const res = await fetch(`/api/admin/trips/${trip.nid}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ map_image: upData.url }),
    });
    if (!res.ok) throw new Error('the picture uploaded, but the trip could not be pointed at it');
    setMapUrl(upData.url);
    const pushFailed = upData.gitUploads?.status === 'push_failed' || (await res.json()).git?.status === 'push_failed';
    setMessage({
      tone: 'ok',
      text: `${verb} — it is now this trip's overview map.${pushFailed ? ' (Saved on the server; the GitHub backup will follow with the next save.)' : ''}`,
    });
  }

  async function saveGenerated() {
    setBusy('saving');
    setMessage(null);
    try {
      // WebP where the browser can write it: a canvas PNG of this map is about
      // 1.3 MB, and every regenerated map is kept for good in the uploads
      // repository. At this quality WebP is a tenth of that with the numbers
      // still crisp. A browser that cannot encode WebP hands back a PNG
      // instead, which is why the type is read off the result, not assumed.
      let blob = await new Promise((resolve) => canvasRef.current.toBlob(resolve, 'image/webp', 0.95));
      if (!blob || blob.type !== 'image/webp') {
        blob = await new Promise((resolve) => canvasRef.current.toBlob(resolve, 'image/png'));
      }
      const ext = blob.type === 'image/webp' ? 'webp' : 'png';
      // A fresh name every time: nothing uploaded is ever overwritten, so an
      // earlier map can always be put back.
      const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 13);
      await saveAsMap(new File([blob], `${trip.slug}-route-${stamp}.${ext}`, { type: blob.type }), 'Map saved');
    } catch (err) {
      setMessage({ tone: 'bad', text: `Not saved: ${err.message}.` });
    } finally {
      setBusy('');
    }
  }

  async function uploadChosen(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy('uploading');
    setMessage(null);
    try {
      await saveAsMap(file, 'Map uploaded');
    } catch (err) {
      setMessage({ tone: 'bad', text: `Not uploaded: ${err.message}.` });
    } finally {
      setBusy('');
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <section className="bg-white rounded-lg shadow p-6 mt-8">
      <h2 className="text-lg font-semibold text-gray-800">Overview map</h2>
      <p className="text-sm text-gray-500 mb-4">
        The picture above the itinerary on the trip page. Generate it from the stops, or upload your own.
      </p>

      <div className="flex flex-wrap gap-6 items-start">
        <div>
          <div className="text-xs font-medium text-gray-600 mb-1">Current map</div>
          {mapUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mapUrl} alt="Current overview map" width="300" height="200" className="rounded border border-gray-300 bg-gray-100" style={{ width: 300, height: 'auto' }} />
          ) : (
            <div className="rounded border border-dashed border-gray-300 text-sm text-gray-400 flex items-center justify-center" style={{ width: 300, height: 200 }}>
              No map yet
            </div>
          )}
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <button
              type="button"
              onClick={generate}
              disabled={!!busy || located === 0}
              className="bg-blue-600 text-white rounded px-4 py-2 font-semibold disabled:opacity-50"
            >
              {busy === 'drawing' ? 'Drawing…' : drawn ? 'Draw it again' : 'Generate from stops'}
            </button>
            <p className="text-xs text-gray-500 mt-1">
              {located === 0
                ? 'Give at least one stop a location first.'
                : `Draws the route along the roads between the ${located} located stop${located === 1 ? '' : 's'} and numbers them. Nothing is saved until you say so.`}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor="trip-map-file">Or upload a picture</label>
            <input
              id="trip-map-file" ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.gif,.webp"
              onChange={uploadChosen} disabled={!!busy}
              className="block text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Used as it is. Best at 3:2, for example 1200 × 800.</p>
          </div>
        </div>
      </div>

      {message && (
        <p className={`text-sm rounded px-3 py-2 mt-4 border ${message.tone === 'ok' ? 'text-green-800 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200'}`}>
          {message.text}
        </p>
      )}

      {/* Kept in the page even before anything is drawn: the drawing needs a
          canvas to draw on. Hidden until there is something to look at. */}
      <div className={drawn ? 'mt-5' : 'hidden'}>
        <div className="text-xs font-medium text-gray-600 mb-1">Preview</div>
        <canvas
          ref={canvasRef}
          width={BASE_MAP.width}
          height={BASE_MAP.height}
          className="rounded border border-gray-300 w-full"
          style={{ maxWidth: 900, height: 'auto' }}
        />
        {notes.length > 0 && (
          <ul className="text-xs text-gray-600 mt-2 space-y-0.5 list-disc pl-5">
            {notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
        )}
        <div className="flex items-center gap-3 mt-3">
          <button
            type="button"
            onClick={saveGenerated}
            disabled={!!busy}
            className="bg-green-700 text-white rounded px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {busy === 'saving' ? 'Saving…' : 'Use this as the trip’s map'}
          </button>
          <span className="text-xs text-gray-500">The current map stays in the uploads folder, so it can be put back.</span>
        </div>
      </div>
    </section>
  );
}
