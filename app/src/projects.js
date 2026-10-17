// Project titles (a name you give a project, shown instead of its folder name everywhere)
// and the paginated list of all projects.
const { es } = require('./es');
const { INDEX_PROJECTS, INDEX_LOG, INDEX_USAGE, INDEX_IMAGES } = require('./config');

let cache = null; // slug → title

async function titles() {
  if (cache) return cache;
  const r = await es('POST', `/${INDEX_PROJECTS}/_search`, { size: 10000, query: { exists: { field: 'title' } } });
  cache = new Map(r.hits.hits.map((h) => [h._id, h._source.title]));
  return cache;
}

/** Empty title clears it (the folder name is shown again). */
async function setTitle(slug, title) {
  const t = String(title || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  if (t) await es('PUT', `/${INDEX_PROJECTS}/_doc/${encodeURIComponent(slug)}?refresh=true`, { slug, title: t, updated_at: new Date().toISOString() });
  else await es('DELETE', `/${INDEX_PROJECTS}/_doc/${encodeURIComponent(slug)}?refresh=true`, undefined, { allow404: true });
  cache = null;
  return t || null;
}

/** Title if set, else the folder name we already had. */
async function namer() {
  const t = await titles();
  return (slug, fallback) => t.get(slug) || fallback || slug;
}

const SORTS = {
  last: (a, b) => (b.last || '').localeCompare(a.last || ''),
  name: (a, b) => a.name.localeCompare(b.name),
  messages: (a, b) => b.prompts + b.replies - (a.prompts + a.replies),
  sessions: (a, b) => b.sessions - a.sessions,
  output: (a, b) => (b.tokens?.output || 0) - (a.tokens?.output || 0),
  cost: (a, b) => (b.tokens?.cost || 0) - (a.tokens?.cost || 0),
};

/** Every indexed project with its numbers; filtered, sorted and paged here. */
async function listAll({ page = 1, size = 20, q = '', sort = 'last' } = {}) {
  const sums = { input: { sum: { field: 'input' } }, output: { sum: { field: 'output' } }, cache_write: { sum: { field: 'cache_write' } }, cache_read: { sum: { field: 'cache_read' } }, cost: { sum: { field: 'cost' } }, unpriced: { missing: { field: 'cost' } } };
  const [log, usage, images, name] = await Promise.all([
    es('POST', `/${INDEX_LOG}/_search`, {
      size: 0,
      aggs: {
        p: {
          terms: { field: 'project', size: 10000 },
          aggs: {
            name: { terms: { field: 'project_name', size: 1 } },
            path: { terms: { field: 'project_path', size: 1 } },
            sessions: { cardinality: { field: 'session_id' } },
            roles: { terms: { field: 'role' } },
            first: { min: { field: 'timestamp' } },
            last: { max: { field: 'timestamp' } },
          },
        },
      },
    }),
    es('POST', `/${INDEX_USAGE}/_search`, { size: 0, aggs: { p: { terms: { field: 'project', size: 10000 }, aggs: sums } } }),
    es('POST', `/${INDEX_IMAGES}/_search`, { size: 0, aggs: { p: { terms: { field: 'project', size: 10000 } } } }),
    namer(),
  ]);
  const tok = new Map(usage.aggregations.p.buckets.map((b) => [b.key, {
    input: b.input.value, output: b.output.value, cache_write: b.cache_write.value, cache_read: b.cache_read.value, cost: b.cost.value, unpriced: b.unpriced.doc_count, responses: b.doc_count,
  }]));
  const img = new Map(images.aggregations.p.buckets.map((b) => [b.key, b.doc_count]));
  const t = await titles();
  let rows = log.aggregations.p.buckets.map((b) => {
    const role = Object.fromEntries(b.roles.buckets.map((x) => [x.key, x.doc_count]));
    const folder = b.name.buckets[0]?.key || b.key;
    return {
      slug: b.key,
      name: name(b.key, folder),
      folder,
      title: t.get(b.key) || null,
      path: b.path.buckets[0]?.key || null,
      sessions: b.sessions.value,
      prompts: role.user || 0,
      replies: role.assistant || 0,
      images: img.get(b.key) || 0,
      first: b.first.value_as_string,
      last: b.last.value_as_string,
      tokens: tok.get(b.key) || null,
    };
  });
  const needle = String(q || '').trim().toLowerCase();
  if (needle) rows = rows.filter((r) => [r.name, r.folder, r.path, r.slug].some((v) => v && v.toLowerCase().includes(needle)));
  rows.sort(SORTS[sort] || SORTS.last);
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const p = Math.min(Math.max(1, page), pages);
  return { total, page: p, pages, size, rows: rows.slice((p - 1) * size, p * size) };
}

module.exports = { titles, setTitle, namer, listAll };
