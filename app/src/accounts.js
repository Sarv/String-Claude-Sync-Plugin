// Users (Claude accounts), organisations, and the links between them.
// Filled from the account the Stop hook reports; transcripts themselves carry no account info.
const { es } = require('./es');
const { INDEX_USERS, INDEX_ORGS, INDEX_MEMBERS, INDEX_LOG, INDEX_USAGE } = require('./config');

const API_KEY_USER = 'api-key'; // Claude Code running on an API key has no account; all such use shares this entry
const seen = new Map(); // key → last write (ms), to avoid rewriting the same docs on every hook

async function upsert(index, id, fields, firstSeenAt) {
  const doc = await es('GET', `/${index}/_doc/${encodeURIComponent(id)}`, undefined, { allow404: true });
  const prev = doc?._source || {};
  const merged = { ...prev };
  for (const [k, v] of Object.entries(fields)) if (v !== null && v !== undefined) merged[k] = v;
  merged.first_seen = prev.first_seen || firstSeenAt;
  merged.last_seen = firstSeenAt;
  await es('PUT', `/${index}/_doc/${encodeURIComponent(id)}?refresh=true`, merged);
  return { created: !doc, doc: merged };
}

/**
 * Records the account (and its organisation + membership) and returns the tag to put on
 * messages: { account_uuid, org_uuid }. Returns null when the hook sent nothing usable.
 */
async function recordAccount(a, log = () => {}) {
  if (!a || typeof a !== 'object') return null;
  const now = new Date().toISOString();
  const isKey = a.kind === 'api_key' || !a.account_uuid;
  const userId = isKey ? API_KEY_USER : String(a.account_uuid);
  const orgId = isKey ? null : a.org_uuid ? String(a.org_uuid) : null;
  const tag = { account_uuid: userId, org_uuid: orgId };

  const key = `${userId}|${orgId}|${a.org_role}|${a.email}|${a.install_id}`;
  if (Date.now() - (seen.get(key) || 0) < 60_000) return tag;
  seen.set(key, Date.now());

  const user = await upsert(INDEX_USERS, userId, isKey
    ? { account_uuid: userId, kind: 'api_key', display_name: 'API key' }
    : {
        account_uuid: userId, kind: 'oauth', email: a.email, display_name: a.display_name, full_name: a.full_name,
        account_created_at: a.account_created_at, billing_type: a.billing_type,
      }, now);
  if (a.install_id) {
    const ids = new Set(user.doc.install_ids || []);
    if (!ids.has(a.install_id)) {
      ids.add(a.install_id);
      await es('POST', `/${INDEX_USERS}/_update/${encodeURIComponent(userId)}?refresh=true`, { doc: { install_ids: [...ids] } });
    }
  }
  if (user.created) log(`New user: ${a.email || user.doc.display_name || userId}`);

  if (orgId) {
    const org = await upsert(INDEX_ORGS, orgId, {
      org_uuid: orgId, name: a.org_name, type: a.org_type, billing_type: a.org_billing_type,
    }, now);
    if (org.created) log(`New organisation: ${a.org_name || orgId}`);
    await upsert(INDEX_MEMBERS, `${userId}:${orgId}`, {
      user_uuid: userId, org_uuid: orgId, org_role: a.org_role, workspace_role: a.workspace_role, seat_tier: a.seat_tier,
    }, now);
  }
  return tag;
}

/** All users, orgs and memberships, keyed for quick lookup. */
async function directory() {
  const [u, o, m] = await Promise.all([
    es('POST', `/${INDEX_USERS}/_search`, { size: 1000, query: { match_all: {} } }),
    es('POST', `/${INDEX_ORGS}/_search`, { size: 1000, query: { match_all: {} } }),
    es('POST', `/${INDEX_MEMBERS}/_search`, { size: 5000, query: { match_all: {} } }),
  ]);
  return {
    users: new Map(u.hits.hits.map((h) => [h._id, h._source])),
    orgs: new Map(o.hits.hits.map((h) => [h._id, h._source])),
    members: m.hits.hits.map((h) => h._source),
  };
}

/** Users and organisations with their links and activity, for the Accounts page. */
async function listing() {
  const dir = await directory();
  const sums = { input: { sum: { field: 'input' } }, output: { sum: { field: 'output' } }, cache_write: { sum: { field: 'cache_write' } }, cache_read: { sum: { field: 'cache_read' } }, cost: { sum: { field: 'cost' } }, unpriced: { missing: { field: 'cost' } } };
  const act = (field) => ({
    terms: { field, size: 1000 },
    aggs: {
      sessions: { cardinality: { field: 'session_id' } },
      projects: { cardinality: { field: 'project' } },
      prompts: { filter: { term: { role: 'user' } } },
      first: { min: { field: 'timestamp' } }, last: { max: { field: 'timestamp' } },
    },
  });
  const [log, usage, unlinked] = await Promise.all([
    es('POST', `/${INDEX_LOG}/_search`, { size: 0, aggs: { u: act('account_uuid'), o: act('org_uuid') } }),
    es('POST', `/${INDEX_USAGE}/_search`, { size: 0, aggs: { u: { terms: { field: 'account_uuid', size: 1000 }, aggs: sums }, o: { terms: { field: 'org_uuid', size: 1000 }, aggs: sums } } }),
    es('POST', `/${INDEX_LOG}/_search`, { size: 0, track_total_hits: true, query: { bool: { must_not: { exists: { field: 'account_uuid' } } } }, aggs: { s: { cardinality: { field: 'session_id' } } } }),
  ]);
  const actOf = (buckets) => new Map(buckets.map((b) => [b.key, {
    sessions: b.sessions.value, projects: b.projects.value, messages: b.doc_count, prompts: b.prompts.doc_count,
    first: b.first.value_as_string || null, last: b.last.value_as_string || null,
  }]));
  const tokOf = (buckets) => new Map(buckets.map((b) => [b.key, {
    input: b.input.value, output: b.output.value, cache_write: b.cache_write.value, cache_read: b.cache_read.value, cost: b.cost.value, unpriced: b.unpriced.doc_count, responses: b.doc_count,
  }]));
  const ua = actOf(log.aggregations.u.buckets), oa = actOf(log.aggregations.o.buckets);
  const ut = tokOf(usage.aggregations.u.buckets), ot = tokOf(usage.aggregations.o.buckets);
  const users = [...dir.users.values()].map((u) => ({
    ...u,
    install_count: (u.install_ids || []).length,
    install_ids: undefined,
    orgs: dir.members.filter((m) => m.user_uuid === u.account_uuid).map((m) => ({ ...m, name: dir.orgs.get(m.org_uuid)?.name || m.org_uuid })),
    activity: ua.get(u.account_uuid) || null,
    tokens: ut.get(u.account_uuid) || null,
  }));
  const orgs = [...dir.orgs.values()].map((o) => ({
    ...o,
    members: dir.members.filter((m) => m.org_uuid === o.org_uuid).map((m) => {
      const u = dir.users.get(m.user_uuid);
      return { ...m, email: u?.email || null, name: u?.full_name || u?.display_name || m.user_uuid };
    }),
    activity: oa.get(o.org_uuid) || null,
    tokens: ot.get(o.org_uuid) || null,
  }));
  return { users, orgs, unlinked: { messages: unlinked.hits.total.value, sessions: unlinked.aggregations.s.value } };
}

module.exports = { recordAccount, directory, listing, API_KEY_USER };
