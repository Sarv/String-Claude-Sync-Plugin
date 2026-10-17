// Model prices and the API-equivalent cost of each API response.
// Prices are USD per 1,000,000 tokens and live in claude_chat_prices (one doc per model id), editable
// from Settings. KNOWN_PRICES only fills models missing from that table; a price already there wins.
// Claude Code on a subscription is not billed per token, so the cost is "what this would cost on the API".
const { es } = require('./es');
const { INDEX_PRICES, INDEX_USAGE } = require('./config');

// Claude API list prices, standard tier, global routing. Checked 2026-10-17 on
// https://platform.claude.com/docs/en/about-claude/pricing
//   cache_write_5m / cache_write_1h = 5-minute / 1-hour cache writes; cache_read = cache hits and refreshes.
//   tiers: a request whose prompt (input + cache reads + cache writes) is over `above` tokens is priced,
//          as a whole, at that tier (Claude Haiku 5.5 over 100,000).
//   fast:  fast-mode multiplier on every price (Opus 5.5 $8 / $40, Opus 5 and 4.8 $10 / $50 → 2×).
const PRICES_CHECKED = '2026-10-17';
const PRICE_SOURCE = 'https://platform.claude.com/docs/en/about-claude/pricing';

const p = (input, cache_write_5m, cache_write_1h, cache_read, output, extra = {}) =>
  ({ input, cache_write_5m, cache_write_1h, cache_read, output, ...extra });

const KNOWN_PRICES = {
  'claude-fable-5-1': p(10, 12.5, 20, 0.25, 50),
  'claude-mythos-5-1': p(10, 12.5, 20, 0.25, 50),
  'claude-fable-5': p(10, 12.5, 20, 1, 50),
  'claude-mythos-5': p(10, 12.5, 20, 1, 50),
  'claude-opus-5-5': p(4, 5, 8, 0.2, 20, { fast: 2 }),
  'claude-opus-5': p(5, 6.25, 10, 0.5, 25, { fast: 2 }),
  'claude-opus-4-8': p(5, 6.25, 10, 0.5, 25, { fast: 2 }),
  'claude-opus-4-7': p(5, 6.25, 10, 0.5, 25),
  'claude-opus-4-6': p(5, 6.25, 10, 0.5, 25),
  'claude-opus-4-5': p(5, 6.25, 10, 0.5, 25),
  'claude-opus-4-1': p(15, 18.75, 30, 1.5, 75),
  'claude-opus-4': p(15, 18.75, 30, 1.5, 75),
  'claude-sonnet-5-5': p(2, 2.5, 4, 0.1, 10),
  'claude-sonnet-5': p(2, 2.5, 4, 0.2, 10),
  'claude-sonnet-4-6': p(3, 3.75, 6, 0.3, 15),
  'claude-sonnet-4-5': p(3, 3.75, 6, 0.3, 15),
  'claude-sonnet-4': p(3, 3.75, 6, 0.3, 15),
  'claude-haiku-5-5': p(0.1, 0.125, 0.2, 0.01, 0.5, { tiers: [{ above: 100_000, ...p(0.5, 0.625, 1, 0.05, 2.5) }] }),
  'claude-haiku-4-5': p(1, 1.25, 2, 0.1, 5),
  'claude-3-5-haiku': p(0.8, 1, 1.6, 0.08, 4),
};

const FIELDS = ['input', 'cache_write_5m', 'cache_write_1h', 'cache_read', 'output'];
const US_GEO = 1.1; // inference_geo "us" (Claude 4.6 and later): 1.1× on every price

// "claude-sonnet-4-5-20250929" → "claude-sonnet-4-5"
const undated = (model) => String(model || '').replace(/-\d{8}$/, '');

let table = null; // model → price

async function load() {
  if (table) return table;
  const r = await es('POST', `/${INDEX_PRICES}/_search`, { size: 1000, query: { match_all: {} } });
  table = new Map(r.hits.hits.map((h) => [h._id, h._source.price]));
  return table;
}

/** The price a model is charged at: its own row, else the row of its id without the date. */
function priceOf(t, model) {
  return t.get(model) || t.get(undated(model)) || null;
}

/** Cleans a price from the UI; null when it has no input or output price. */
function clean(x) {
  if (!x || typeof x !== 'object') return null;
  const num = (v) => (v === '' || v === null || v === undefined || !Number.isFinite(Number(v)) || Number(v) < 0 ? null : Number(v));
  const out = {};
  for (const k of FIELDS) out[k] = num(x[k]);
  if (out.input === null || out.output === null) return null;
  const fast = num(x.fast);
  if (fast && fast !== 1) out.fast = fast;
  const tiers = (Array.isArray(x.tiers) ? x.tiers : [])
    .map((t) => ({ above: Math.round(num(t.above) || 0), ...clean(t) }))
    .filter((t) => t.above > 0 && t.input !== undefined && t.input !== null)
    .map(({ fast: _f, tiers: _t, ...t }) => t)
    .sort((a, b) => a.above - b.above);
  if (tiers.length) out.tiers = tiers;
  return out;
}

/**
 * USD for one API response, or null when its model has no price.
 * Missing cache-write prices fall back to the usual multipliers of the input price (5m 1.25×, 1h 2×),
 * a missing cache-read price to 0.1×.
 */
function costOf(u, price) {
  if (!price) return null;
  const w5 = u.cache_write_5m ?? u.cache_write ?? 0;
  const w1 = u.cache_write_1h ?? 0;
  const prompt = (u.input || 0) + (u.cache_read || 0) + w5 + w1;
  let rate = price;
  for (const t of price.tiers || []) if (prompt > t.above) rate = t;
  const r = (k, def) => (rate[k] ?? (def ? rate.input * def : 0));
  let usd = ((u.input || 0) * rate.input + w5 * r('cache_write_5m', 1.25) + w1 * r('cache_write_1h', 2)
    + (u.cache_read || 0) * r('cache_read', 0.1) + (u.output || 0) * rate.output) / 1e6;
  if (u.speed === 'fast') usd *= price.fast || 1;
  if (u.geo === 'us') usd *= US_GEO;
  return Math.round(usd * 1e8) / 1e8;
}

/** Adds `cost` to usage records (null when unpriced). */
async function addCosts(list) {
  const t = await load();
  for (const u of list) u.cost = costOf(u, priceOf(t, u.model));
  return list;
}

/** Saves prices: { model: price | null }. null removes the row. */
async function save(changes) {
  const body = [];
  for (const [model, raw] of Object.entries(changes || {})) {
    const id = String(model).trim();
    if (!id) continue;
    const price = raw === null ? null : clean(raw);
    if (price) body.push(JSON.stringify({ index: { _index: INDEX_PRICES, _id: id } }), JSON.stringify({ model: id, price, updated_at: new Date().toISOString() }));
    else body.push(JSON.stringify({ delete: { _index: INDEX_PRICES, _id: id } }));
  }
  if (body.length) await es('POST', '/_bulk?refresh=true', body.join('\n') + '\n', { ndjson: true });
  table = null;
  return body.length / 2;
}

/** Fills known prices for models missing from the table. Only adds rows, never changes one. */
async function addKnown() {
  const t = await load();
  const add = {};
  for (const [model, price] of Object.entries(KNOWN_PRICES)) if (!t.has(model)) add[model] = price;
  const n = Object.keys(add).length;
  if (n) await save(add);
  return n;
}

/** Recomputes `cost` on every usage record from the current table (after a price change). */
async function recalculate(log = () => {}) {
  const t = await load();
  let n = 0;
  let r = await es('POST', `/${INDEX_USAGE}/_search?scroll=2m`, {
    size: 2000,
    _source: ['model', 'input', 'output', 'cache_write', 'cache_write_5m', 'cache_write_1h', 'cache_read', 'speed', 'geo', 'cost'],
    query: { match_all: {} },
  });
  try {
    while (r.hits.hits.length) {
      const body = [];
      for (const h of r.hits.hits) {
        const cost = costOf(h._source, priceOf(t, h._source.model));
        if (cost === (h._source.cost ?? null)) continue;
        body.push(JSON.stringify({ update: { _index: INDEX_USAGE, _id: h._id } }), JSON.stringify({ doc: { cost } }));
      }
      if (body.length) {
        const res = await es('POST', '/_bulk', body.join('\n') + '\n', { ndjson: true });
        if (res.errors) throw new Error('cost update errors');
        n += body.length / 2;
      }
      r = await es('POST', '/_search/scroll', { scroll: '2m', scroll_id: r._scroll_id });
    }
  } finally {
    if (r._scroll_id) await es('DELETE', '/_search/scroll', { scroll_id: r._scroll_id }, { allow404: true }).catch(() => {});
  }
  await es('POST', `/${INDEX_USAGE}/_refresh`);
  log(`Costs recalculated: ${n} API response(s) changed`);
  return n;
}

/** The price table for Settings: every priced model plus every model in use, with how much it is used. */
async function listing() {
  const t = await load();
  const used = await es('POST', `/${INDEX_USAGE}/_search`, {
    size: 0,
    aggs: { m: { terms: { field: 'model', size: 200 }, aggs: { cost: { sum: { field: 'cost' } }, unpriced: { missing: { field: 'cost' } }, last: { max: { field: 'timestamp' } } } } },
  });
  const rows = new Map();
  for (const [model, price] of t) rows.set(model, { model, price, responses: 0 });
  const usage = [];
  for (const b of used.aggregations.m.buckets) {
    const via = t.has(b.key) ? b.key : t.has(undated(b.key)) ? undated(b.key) : null;
    usage.push({ model: b.key, priced_as: via, responses: b.doc_count, unpriced: b.unpriced.doc_count, cost: b.cost.value, last: b.last.value_as_string || null });
    if (via) rows.get(via).responses += b.doc_count;
  }
  return {
    checked: PRICES_CHECKED,
    source: PRICE_SOURCE,
    missingKnown: Object.keys(KNOWN_PRICES).filter((m) => !t.has(m)).length,
    prices: [...rows.values()].sort((a, b) => b.responses - a.responses || a.model.localeCompare(b.model)),
    usage,
  };
}

/** Forget the cached table (another process changed it). */
const reset = () => { table = null; };

module.exports = { reset, KNOWN_PRICES, PRICES_CHECKED, PRICE_SOURCE, load, priceOf, costOf, addCosts, save, addKnown, recalculate, listing, undated };
