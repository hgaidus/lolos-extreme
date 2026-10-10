import { getTrip, getStopsForTrip } from './adminData';
import { toSiteDateInput } from './siteDates';

// What the overview-map generator needs to know about a trip, read fresh from
// the data files. Used twice: to render the trip edit page, and again by the
// API each time "Generate from stops" is pressed — a stop edited in another
// tab, or by the other person, since this page was opened has to count.
//
// Itinerary order is the same rule the public trip page uses, so the number
// drawn beside a stop is the row number readers see. Only what the map needs
// is returned; the travelogues stay on the server.
export function getRouteMapInput(tripNid) {
  const trip = getTrip(tripNid);
  if (!trip) return null;
  const when = (s) => Number(s.arrival_date) || Number(s.created) || 0;
  const stops = getStopsForTrip(tripNid).sort((a, b) => when(a) - when(b));
  return {
    trip: { nid: trip.nid, slug: trip.slug, map_image: trip.map_image || '' },
    stops: stops.map((s) => ({
      nid: s.nid, title: s.title, lat: s.lat, lng: s.lng, arrived_by: s.arrived_by, published: s.published,
    })),
    startDay: trip.start_date || (stops.length ? toSiteDateInput(when(stops[0])) : ''),
  };
}
