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

const STOP_RULES = {
  title: nonEmptyString,
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

const TRIP_RULES = {
  title: nonEmptyString,
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

const REGIONS = ['crossCountry', 'eastCoast', 'westCoast', 'international'];

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
  region: {
    required: true,
    check(v) {
      if (!REGIONS.includes(v)) return { error: 'Must be one of the four regions.' };
      return { value: v };
    },
  },
  author: optionalString,
  map_image: optionalString,
};

export function validateStopFields(fields, opts) {
  return validateWith(STOP_RULES, fields, opts);
}

export function validateTripFields(fields, opts) {
  return validateWith(TRIP_RULES, fields, opts);
}

export function validateNewTripFields(fields) {
  return validateWith(NEW_TRIP_RULES, fields, { partial: false });
}
