// Aggregations for the Stats page. Everything comes from Claude Recall's own indices.
const { es } = require('./es');
const { INDEX_LOG, INDEX_STATE, INDEX_IMAGES, INDEX_USAGE } = require('./config');
const { directory } = require('./accounts');
const { namer } = require('./projects');

const NONE = '__none__'; // filter value / bucket key for data not linked to any account
const linkFilter = (field, v) => (!v ? [] : v === NONE ? [{ bool: { must_not: { exists: { field } } } }] : [{ term: { [field]: v } }]);

const TOKEN_SUMS = {
  input: { sum: { field: 'input' } },
  output: { sum: { field: 'output' } },
  cache_write: { sum: { field: 'cache_write' } },
  cache_read: { sum: { field: 'cache_read' } },
  cost: { sum: { field: 'cost' } },
  unpriced: { missing: { field: 'cost' } },
};
const tokens = (b) => ({
  input: b.input.value,
  output: b.output.value,
  cache_write: b.cache_write.value,
  cache_read: b.cache_read.value,
  cost: b.cost.value,
  unpriced: b.unpriced.doc_count, // responses whose model has no price (not in cost)
  responses: b.doc_count,
});

const TZ = 'Asia/Kolkata';
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** days = last N days (0 = all time), or from/to = inclusive YYYY-MM-DD dates (IST). Every number on the page uses the range. */
async function stats({ days = 30, from = null, to = null, project = null, account = null, org = null } = {}) {
  let range = [];
  let bounds = null;
  if (DAY.test(from || '') && DAY.test(to || '')) {
    if (from > to) [from, to] = [to, from];
    range = [{ range: { timestamp: { gte: `${from}||/d`, lte: `${to}||/d`, format: 'yyyy-MM-dd', time_zone: TZ } } }];
    bounds = { min: from, max: to };
  } else if (days > 0) {
    range = [{ range: { timestamp: { gte: `now-${days - 1}d/d`, time_zone: TZ } } }];
    bounds = { min: `now-${days - 1}d/d`, max: 'now/d' };
  }
  const filter = [...(project ? [{ term: { project } }] : []), ...linkFilter('account_uuid', account), ...linkFilter('org_uuid', org), ...range];
  const daily = (extra = {}) => ({
    date_histogram: {
      field: 'timestamp', calendar_interval: 'day', min_doc_count: 0, time_zone: TZ, format: 'yyyy-MM-dd',
      ...(bounds ? { extended_bounds: bounds } : {}),
    },
    ...extra,
  });

  const [log, usage, images, state, sizes, dir, name] = await Promise.all([
    es('POST', `/${INDEX_LOG}/_search`, {
      size: 0,
      track_total_hits: true,
      query: { bool: { filter } },
      aggs: {
        projects: { cardinality: { field: 'project' } },
        sessions: { cardinality: { field: 'session_id' } },
        roles: { terms: { field: 'role' } },
        first: { min: { field: 'timestamp' } },
        last: { max: { field: 'timestamp' } },
        perDay: { filter: { match_all: {} }, aggs: { d: daily({ aggs: { roles: { terms: { field: 'role' } } } }) } },
        perHour: { terms: { script: { source: "doc['timestamp'].value.withZoneSameInstant(ZoneId.of('Asia/Kolkata')).getHour()" }, size: 24 } },
        perProject: {
          terms: { field: 'project', size: 200, order: { last: 'desc' } },
          aggs: {
            name: { terms: { field: 'project_name', size: 1 } },
            path: { terms: { field: 'project_path', size: 1 } },
            sessions: { cardinality: { field: 'session_id' } },
            roles: { terms: { field: 'role' } },
            first: { min: { field: 'timestamp' } },
            last: { max: { field: 'timestamp' } },
          },
        },
        perAccount: {
          terms: { field: 'account_uuid', size: 200, missing: NONE },
          aggs: { sessions: { cardinality: { field: 'session_id' } }, roles: { terms: { field: 'role' } }, last: { max: { field: 'timestamp' } } },
        },
        perOrg: {
          terms: { field: 'org_uuid', size: 200, missing: NONE },
          aggs: { sessions: { cardinality: { field: 'session_id' } }, roles: { terms: { field: 'role' } }, last: { max: { field: 'timestamp' } } },
        },
        topSessions: {
          terms: { field: 'session_id', size: 15, order: { _count: 'desc' } },
          aggs: {
            project: { terms: { field: 'project', size: 1 } },
            name: { terms: { field: 'project_name', size: 1 } },
            roles: { terms: { field: 'role' } },
            first: { min: { field: 'timestamp' } },
            last: { max: { field: 'timestamp' } },
          },
        },
      },
    }),
    es('POST', `/${INDEX_USAGE}/_search`, {
      size: 0,
      track_total_hits: true,
      query: { bool: { filter } },
      aggs: {
        ...TOKEN_SUMS,
        sidechain: { filter: { term: { sidechain: true } }, aggs: TOKEN_SUMS },
        perModel: { terms: { field: 'model', size: 20 }, aggs: TOKEN_SUMS },
        perProject: { terms: { field: 'project', size: 200 }, aggs: TOKEN_SUMS },
        perSession: { terms: { field: 'session_id', size: 1000 }, aggs: TOKEN_SUMS },
        perAccount: { terms: { field: 'account_uuid', size: 200, missing: NONE }, aggs: TOKEN_SUMS },
        perOrg: { terms: { field: 'org_uuid', size: 200, missing: NONE }, aggs: TOKEN_SUMS },
        perDay: { filter: { match_all: {} }, aggs: { d: daily({ aggs: TOKEN_SUMS }) } },
      },
    }),
    es('POST', `/${INDEX_IMAGES}/_search`, {
      size: 0,
      query: { bool: { filter } },
      aggs: { perProject: { terms: { field: 'project', size: 200 } } },
    }),
    es('POST', `/${INDEX_STATE}/_search`, { size: 10000, _source: ['session_id', 'title'], query: project ? { term: { project } } : { match_all: {} } }),
    es('GET', `/${[INDEX_LOG, INDEX_STATE, INDEX_IMAGES, INDEX_USAGE].join(',')}/_stats/store,docs`),
    directory(),
    namer(),
  ]);

  const role = (b) => Object.fromEntries((b?.buckets || []).map((x) => [x.key, x.doc_count]));
  const titles = new Map(state.hits.hits.map((h) => [h._source.session_id, h._source.title]));
  const usageByProject = new Map(usage.aggregations.perProject.buckets.map((b) => [b.key, tokens(b)]));
  const usageBySession = new Map(usage.aggregations.perSession.buckets.map((b) => [b.key, tokens(b)]));
  const imagesByProject = new Map(images.aggregations.perProject.buckets.map((b) => [b.key, b.doc_count]));
  const a = log.aggregations;
  const r = role(a.roles);

  const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, messages: 0 }));
  for (const b of a.perHour.buckets) hours[Number(b.key)].messages = b.doc_count;

  return {
    totals: {
      projects: a.projects.value,
      sessions: a.sessions.value,
      messages: log.hits.total.value,
      prompts: r.user || 0,
      replies: r.assistant || 0,
      images: images.hits.total.value,
      first: a.first.value_as_string || null,
      last: a.last.value_as_string || null,
      tokens: { ...tokens(usage.aggregations), responses: usage.hits.total.value },
      sidechainTokens: tokens(usage.aggregations.sidechain),
    },
    indices: Object.entries(sizes.indices).map(([name, v]) => ({
      name, docs: v.primaries.docs.count, bytes: v.primaries.store.size_in_bytes,
    })),
    perDay: a.perDay.d.buckets.map((b) => {
      const x = role(b.roles);
      return { day: b.key_as_string.slice(0, 10), prompts: x.user || 0, replies: x.assistant || 0 };
    }),
    tokensPerDay: usage.aggregations.perDay.d.buckets.map((b) => ({ day: b.key_as_string.slice(0, 10), ...tokens(b) })),
    perHour: hours,
    perModel: usage.aggregations.perModel.buckets.map((b) => ({ model: b.key, ...tokens(b) })),
    perProject: a.perProject.buckets.map((b) => {
      const x = role(b.roles);
      return {
        slug: b.key,
        name: name(b.key, b.name.buckets[0]?.key),
        path: b.path.buckets[0]?.key || null,
        sessions: b.sessions.value,
        prompts: x.user || 0,
        replies: x.assistant || 0,
        images: imagesByProject.get(b.key) || 0,
        first: b.first.value_as_string,
        last: b.last.value_as_string,
        tokens: usageByProject.get(b.key) || null,
      };
    }),
    perAccount: a.perAccount.buckets.map((b) => {
      const x = role(b.roles);
      const u = dir.users.get(b.key);
      const t = usage.aggregations.perAccount.buckets.find((y) => y.key === b.key);
      return {
        id: b.key, linked: b.key !== NONE,
        name: b.key === NONE ? 'Not linked' : u?.email || u?.display_name || b.key,
        sub: b.key === NONE ? 'Written before account tracking' : u?.full_name || u?.display_name || '',
        sessions: b.sessions.value, prompts: x.user || 0, replies: x.assistant || 0, last: b.last.value_as_string,
        tokens: t ? tokens(t) : null,
      };
    }),
    perOrg: a.perOrg.buckets.map((b) => {
      const x = role(b.roles);
      const o = dir.orgs.get(b.key);
      const t = usage.aggregations.perOrg.buckets.find((y) => y.key === b.key);
      return {
        id: b.key, linked: b.key !== NONE,
        name: b.key === NONE ? 'No organisation' : o?.name || b.key,
        sub: b.key === NONE ? 'Not linked, or an API key' : o?.type || '',
        sessions: b.sessions.value, prompts: x.user || 0, replies: x.assistant || 0, last: b.last.value_as_string,
        tokens: t ? tokens(t) : null,
      };
    }),
    topSessions: a.topSessions.buckets.map((b) => {
      const x = role(b.roles);
      return {
        id: b.key,
        title: titles.get(b.key) || null,
        project: b.project.buckets[0]?.key,
        projectName: name(b.project.buckets[0]?.key, b.name.buckets[0]?.key),
        prompts: x.user || 0,
        replies: x.assistant || 0,
        first: b.first.value_as_string,
        last: b.last.value_as_string,
        tokens: usageBySession.get(b.key) || null,
      };
    }),
  };
}

module.exports = { stats };
