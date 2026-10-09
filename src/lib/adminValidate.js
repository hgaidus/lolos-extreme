import { STOP_CATEGORIES } from './adminData';

// Server-side validation for admin writes. The forms constrain input too, but
// the API is the real boundary: a crafted PATCH could otherwise store a bogus
// category (silently vanishing the stop from its category listing page) or a
// NaN mileage (which the write layer would then refuse to serialize).
//
// Validators take the incoming fields object and return {ok, errors, values}:
// errors maps field name -> message; values carries coerced copies (numbers
// arrive as strings from JSON forms) that routes should persist instead of
// the raw input. With {partial: true} (PATCH), absent fields are skipped.

function validateWith(rules, fields, { partial = false } = {}) {
  const errors = {};
  const values = {};
  for (const [name, rule] of Object.entries(rules)) {
    if (!(name in fields)) {
      if (!partial && rule.required) errors[name] = 'Required.';
      continue;
    }
    const result = rule.check(fields[name]);
    if (result.error) errors[name] = result.error;
    else values[name] = result.value;
  }
  return { ok: Object.keys(errors).length === 0, errors, values };
}

const nonEmptyString = {
  required: true,
  check(v) {
    if (typeof v !== 'string' || !v.trim()) return { error: 'Must not be empty.' };
    return { value: v };
  },
};

const optionalString = {
  check(v) {
    if (typeof v !== 'string') return { error: 'Must be text.' };
    return { value: v };
  },
};

const finiteNonNegative = {
  check(v) {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return { error: 'Must be a number ≥ 0.' };
    return { value: n };
  },
};

const unixSeconds = {
  check(v) {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0) return { error: 'Must be a valid date.' };
    return { value: n };
  },
};

const publishedFlag = {
  check(v) {
    if (typeof v !== 'boolean') return { error: 'Must be true or false.' };
    return { value: v };
  },
};

// A coordinate, or null/'' for "no position". A stop with no position is
// normal (66 have none); it simply is not on the map.
const coordinate = (limit) => ({
  check(v) {
    if (v === null || v === '') return { value: null };
    const n = typeof v === 'number' ? v : Number(String(v).trim());
    if (typeof v === 'boolean' || !Number.isFinite(n) || Math.abs(n) > limit) {
      return { error: `Must be a number between -${limit} and ${limit}.` };
    }
    return { value: n };
  },
});

// Half a position is not a position. Returns {field: message} for whichever
// half is missing, or {} when both or neither are set.
export function coordinatePairError(lat, lng) {
  const has = (v) => v !== null && v !== undefined;
  if (has(lat) === has(lng)) return {};
  return has(lat) ? { lng: 'Needed along with the latitude.' } : { lat: 'Needed along with the longitude.' };
}

const STOP_RULES = {
  title: nonEmptyString,
  lat: coordinate(90),
  lng: coordinate(180),
  description: optionalString,
  travelogue: optionalString,
  miles: finiteNonNegative,
  hours: finiteNonNegative,
  nights: finiteNonNegative,
  arrival_date: unixSeconds,
  author: optionalString,
  state: optionalString,
  published: publishedFlag,
  category: {
    required: true,
    check(v) {
      if (!STOP_CATEGORIES.includes(v)) {
        return { error: 'Must be one of the existing categories.' };
      }
      return { value: v };
    },
  },
};

const REGIONS = ['crossCountry', 'eastCoast', 'westCoast', 'international'];

const regionRule = {
  check(v) {
    if (!REGIONS.includes(v)) return { error: 'Must be one of the four regions.' };
    return { value: v };
  },
};

// A calendar day as YYYY-MM-DD, or '' to clear it. Kept as a plain string end
// to end — no Date object, no timezone — because a trip's dates are days on a
// calendar, and converting them through UTC is what shifted the stop dates.
const calendarDay = {
  check(v) {
    if (typeof v !== 'string') return { error: 'Must be a date.' };
    if (v === '') return { value: '' };
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const d = m && new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    if (!d || d.getUTCMonth() !== +m[2] - 1 || +m[1] < 1900 || +m[1] > 2100) {
      return { error: 'Must be a valid date.' };
    }
    return { value: v };
  },
};

// Cross-field check the per-field rules cannot express. ISO days compare
// correctly as strings.
export function tripDateOrderError(start, end) {
  return start && end && end < start ? 'Must not be before the start date.' : null;
}

const TRIP_RULES = {
  title: nonEmptyString,
  start_date: calendarDay,
  end_date: calendarDay,
  region: regionRule,
  author: optionalString,
  year: {
    check(v) {
      if (typeof v !== 'string' && typeof v !== 'number') return { error: 'Must be text.' };
      return { value: String(v) };
    },
  },
  travelogue: optionalString,
  published: publishedFlag,
  menu_label: {
    check(v) {
      if (typeof v !== 'string' || !v.trim()) return { error: 'Must not be empty.' };
      if (v.trim().length > 40) return { error: 'Keep menu labels short (40 characters max).' };
      return { value: v.trim() };
    },
  },
  menu_hover: optionalString,
};

// Creation is stricter than editing: a trip must land in a region with a
// menu label and a real four-digit year, or it can't appear in navigation.
const NEW_TRIP_RULES = {
  ...TRIP_RULES,
  menu_label: { required: true, ...TRIP_RULES.menu_label },
  year: {
    required: true,
    check(v) {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1900 || n > 2100) return { error: 'Must be a four-digit year.' };
      return { value: String(n) };
    },
  },
  region: { required: true, ...regionRule },
  start_date: {
    required: true,
    check(v) {
      if (v === '') return { error: 'Choose the day the trip starts.' };
      return calendarDay.check(v);
    },
  },
  author: optionalString,
  map_image: optionalString,
};

// Ratings: the five-star scale plus the two legacy values already present in
// the export ('' = unrated, '_original' = Drupal cruft on 153 records) — the
// editor never mints '_original' but must not reject a record carrying it.
const ACTIVITY_RULES = {
  title: nonEmptyString,
  activity_type: nonEmptyString,
  narrative: optionalString,
  published: publishedFlag,
  rating: {
    check(v) {
      if (typeof v !== 'string' || !['', '*', '**', '***', '****', '*****', '_original'].includes(v)) {
        return { error: 'Must be a star rating or blank.' };
      }
      return { value: v };
    },
  },
};

export function validateActivityFields(fields, opts) {
  return validateWith(ACTIVITY_RULES, fields, opts);
}

const PAGE_RULES = {
  title: nonEmptyString,
  body: optionalString,
  author: optionalString,
  published: publishedFlag,
};

const NEW_PAGE_RULES = {
  ...PAGE_RULES,
  type: {
    required: true,
    check(v) {
      if (!['page', 'story', 'tips'].includes(v)) return { error: 'Must be page, story, or tips.' };
      return { value: v };
    },
  },
};

export function validatePageFields(fields, opts) {
  return validateWith(PAGE_RULES, fields, opts);
}

export function validateNewPageFields(fields) {
  return validateWith(NEW_PAGE_RULES, fields, { partial: false });
}

export function validateStopFields(fields, opts) {
  return validateWith(STOP_RULES, fields, opts);
}

export function validateTripFields(fields, opts) {
  return validateWith(TRIP_RULES, fields, opts);
}

export function validateNewTripFields(fields) {
  return validateWith(NEW_TRIP_RULES, fields, { partial: false });
}
