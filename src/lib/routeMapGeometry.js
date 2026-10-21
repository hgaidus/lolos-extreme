// Geometry for the generated trip overview maps: where a latitude/longitude
// falls on the base map, which points a trip's route passes through, and where
// each stop's number goes. No browser or filesystem dependencies, so the admin
// component can import it and it can be checked directly under Node.
//
// The base map is public/maps/base/north-america-base.png — the flattened
// image from Herb's north_america_map_2026_Base.psd, recoloured to the palette
// of the hand-made maps published since 1998 (fitted against 2021-Carmel.gif,
// which is that base with almost nothing drawn on it).

export const BASE_MAP = { src: '/maps/base/north-america-base.png', width: 1200, height: 800 };

// A Lambert conformal conic projection fitted to the base map from 58
// landmarks read off it (state corners, coastline points); it reproduces them
// to about 5 px RMS on the 1200 px image. The map is hand-drawn, so that is
// roughly as good as any single projection can do, and it is well inside the
// width of the route line.
const P = { n: 0.628497, F: 2891.434421, lon0: -96.951818, x0: 568.138534, yApex: -1389.010793 };
const RAD = Math.PI / 180;

export function project(lat, lng) {
  const rho = P.F / Math.pow(Math.tan(Math.PI / 4 + (lat * RAD) / 2), P.n);
  const theta = P.n * (lng - P.lon0) * RAD;
  return [P.x0 + rho * Math.sin(theta), P.yApex + rho * Math.cos(theta)];
}

export function onMap([x, y], margin = 0) {
  return x >= margin && x <= BASE_MAP.width - margin && y >= margin && y <= BASE_MAP.height - margin;
}

// Home, for drawing only. Stops titled "Home" deliberately carry no position
// (Herb's decision, 2026-10-09: the house itself is not to be on any map), so
// the route needs somewhere to start and end. These are town-level points —
// on this map a dot is about 15 miles across — not addresses. The family
// moved west in November 2015.
const HOME_BASES = [
  { until: '2015-11-06', name: 'New Jersey', lat: 41.05, lng: -74.1 },
  { until: '9999-12-31', name: 'Santa Rosa, California', lat: 38.44, lng: -122.71 },
];

export function homeBaseFor(day) {
  return HOME_BASES.find((h) => String(day || '9999') < h.until) || HOME_BASES[HOME_BASES.length - 1];
}

const hasPosition = (s) => Number.isFinite(s.lat) && Number.isFinite(s.lng);

// A stop that is "back home": no position of its own and a title that says so.
export function isHomeStop(stop) {
  return !hasPosition(stop) && /\bhome\b|\bdriveway\b/i.test(stop.title || '');
}

export const ARRIVED_BY = ['drive', 'flight', 'ferry'];

// A last stop this close to home (Sebastopol is 11 km from Santa Rosa) already
// ends the trip there; a drive back would be a smudge on top of the "0".
const NEAR_HOME_KM = 25;

/**
 * Whether a trip that ends away from home is drawn driving back. Yes for a road
 * trip; no once any leg was flown, because then how they got home is not known
 * (the New Jersey-era trips flew west and flew back; the trip to buy Lola flew
 * out and drove home). The map generator lets this be overridden per drawing.
 */
export function driveHomeByDefault(stops) {
  return !stops.some((s) => s.arrived_by === 'flight');
}

function distanceKm(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/**
 * The points a trip's map passes through, in itinerary order.
 *
 * `stops` must already be in itinerary order (arrival date), every stop the
 * itinerary lists — the number drawn beside a stop is its row number there, so
 * a stop with no position is skipped on the map but still uses up its number.
 *
 * Every trip starts from home, drawn as "0". A road trip also ends there: when
 * the itinerary stops short of home (50 of the 103 trips list no home stop),
 * a last unnumbered leg drives back from the final stop — unless the trip
 * already ends at or near home. `driveHome` says whether to; left out, it is
 * driveHomeByDefault(stops). How each leg was travelled comes from the stop it
 * arrives at (`arrived_by`); anything other than a drive is drawn dashed.
 */
export function buildWaypoints(trip, stops, startDay, { driveHome } = {}) {
  const home = homeBaseFor(startDay);
  const points = [{ lat: home.lat, lng: home.lng, label: '0', title: `Home (${home.name})`, home: true, arrivedBy: 'drive' }];
  const skipped = [];
  stops.forEach((stop, i) => {
    const arrivedBy = ARRIVED_BY.includes(stop.arrived_by) ? stop.arrived_by : 'drive';
    const label = String(i + 1);
    if (hasPosition(stop)) points.push({ lat: stop.lat, lng: stop.lng, label, title: stop.title, arrivedBy });
    else if (isHomeStop(stop)) points.push({ lat: home.lat, lng: home.lng, label, title: stop.title, home: true, arrivedBy });
    else skipped.push(`${label}. ${stop.title}`);
  });
  const last = points[points.length - 1];
  const endsAway = points.length > 1 && !last.home && distanceKm(last, home) > NEAR_HOME_KM;
  const returnHome = endsAway && (driveHome ?? driveHomeByDefault(stops));
  if (returnHome) {
    // No label: home is already marked 0 where the route began.
    points.push({ lat: home.lat, lng: home.lng, label: '', title: `Home (${home.name})`, home: true, arrivedBy: 'drive' });
  }
  const offMap = points.filter((p) => !onMap(project(p.lat, p.lng), 4)).map((p) => `${p.label}. ${p.title}`);
  return { points, skipped, offMap, home, endsAway, returnHome };
}

/**
 * Split the waypoints into what gets drawn: runs of consecutive driven legs
 * (to be routed along roads together) and single dashed legs.
 */
export function splitLegs(points) {
  const legs = [];
  let run = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    if (p.arrivedBy === 'drive') {
      run.push(p);
    } else {
      if (run.length > 1) legs.push({ kind: 'drive', points: run });
      legs.push({ kind: p.arrivedBy, points: [points[i - 1], p] });
      run = [p];
    }
  }
  if (run.length > 1) legs.push({ kind: 'drive', points: run });
  return legs;
}

/**
 * A flight is drawn as a shallow arc, as flight paths look on a map. Returns
 * the control point of a quadratic curve from a to b (pixel coordinates),
 * bowed toward the top of the map.
 */
export function flightArcControl([ax, ay], [bx, by]) {
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  // Unit normal; flip it so it points up the page.
  let nx = -dy / len;
  let ny = dx / len;
  if (ny > 0) { nx = -nx; ny = -ny; }
  const bow = Math.min(60, len * 0.16);
  return [mx + nx * bow, my + ny * bow];
}

/** Drop points closer together than the map can show. */
export function thin(line, minGap = 1.2) {
  if (line.length < 3) return line;
  const out = [line[0]];
  for (const pt of line) {
    const last = out[out.length - 1];
    if (Math.hypot(pt[0] - last[0], pt[1] - last[1]) >= minGap) out.push(pt);
  }
  out.push(line[line.length - 1]);
  return out;
}

/**
 * Where each stop's number goes: beside the stop, in whichever of eight
 * positions collides least with the other numbers, the other stops and the
 * route line. Earlier stops choose first. Hand-placement would still do
 * better where a dozen stops share a valley; this keeps them legible.
 *
 * `measure(text)` returns the text's width in pixels at the label font.
 */
export function placeLabels(stopsXY, routeXY, fontSize, measure) {
  const OFFSETS = [[14, -10], [14, 16], [-14, -10], [-14, 16], [0, -18], [0, 26], [24, 4], [-24, 4]];
  const boxes = [];
  const overlap = (a, b) =>
    Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1)) * Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));
  const inside = (box, [x, y]) => x > box.x1 && x < box.x2 && y > box.y1 && y < box.y2;

  return stopsXY.map((stop) => {
    const w = measure(stop.label);
    let best = null;
    for (const [ox, oy] of OFFSETS) {
      const cx = stop.xy[0] + ox;
      const baseline = stop.xy[1] + oy;
      const box = { x1: cx - w / 2 - 2, x2: cx + w / 2 + 2, y1: baseline - fontSize + 2, y2: baseline + 4 };
      let cost = boxes.reduce((sum, b) => sum + overlap(box, b), 0);
      for (const other of stopsXY) if (other !== stop && inside(box, other.xy)) cost += 60;
      for (const pt of routeXY) if (inside(box, pt)) cost += 1.5;
      // Keep numbers on the picture.
      if (box.x1 < 2 || box.y1 < 2 || box.x2 > BASE_MAP.width - 2 || box.y2 > BASE_MAP.height - 2) cost += 500;
      if (!best || cost < best.cost) best = { cost, x: cx, y: baseline, box };
    }
    boxes.push(best.box);
    return { label: stop.label, x: best.x, y: best.y };
  });
}
