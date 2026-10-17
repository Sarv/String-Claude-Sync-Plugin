const http = require('http');
const fs = require('fs');
const path = require('path');
const { PORT, INDEX_LOG, INDEX_STATE, INDEX_IMAGES, LOCAL_MODE } = require('./config');
const { es, waitForEs, ensureIndices } = require('./es');
const { embed, ensureModel, status: embedStatus } = require('./embed');
const ing = require('./ingest');
const { stats } = require('./stats');
const accounts = require('./accounts');
const projectsMod = require('./projects');
const prices = require('./prices');
const queue = require('./queue');
const lock = require('./lock');
const relay = require('./relay');
const devices = require('./devices');
const receive = require('./receive');

let ready = false;
let startupError = null;

// ---------- helpers ----------
function send(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}
async function readBody(req) {
  let data = '';
  for await (const c of req) {
    data += c;
    if (data.length > 5e6) break;
  }
  try { return data ? JSON.parse(data) : {}; } catch { return {}; }
}
const SOURCE_EXCLUDES = ['embedding'];

function filters({ project, role, session }) {
  const f = [];
  if (project) f.push({ term: { project } });
  if (role) f.push({ term: { role } });
  if (session) f.push({ term: { session_id: session } });
  return f;
}

// ---------- search (no LLM: just ranked matching records) ----------
async function search({ q, project, role, mode = 'hybrid', size = 30 }) {
  const filter = filters({ project, role });
  const runKnn = mode !== 'keyword';
  const runBm25 = mode !== 'semantic';
  const [knn, bm25] = await Promise.all([
    runKnn
      ? embed([q], 'query').then(([vec]) =>
          es('POST', `/${INDEX_LOG}/_search`, {
            size: 50,
            _source: { excludes: SOURCE_EXCLUDES },
            knn: { field: 'embedding', query_vector: vec, k: 50, num_candidates: 300, filter },
          })
        )
      : null,
    runBm25
      ? es('POST', `/${INDEX_LOG}/_search`, {
          size: 50,
          _source: { excludes: SOURCE_EXCLUDES },
          query: { bool: { must: [{ match: { text: { query: q } } }], filter } },
        })
      : null,
  ]);

  // Reciprocal rank fusion of the two lists.
  const fused = new Map();
  const add = (hits, key) =>
    hits.forEach((h, i) => {
      const e = fused.get(h._id) || { id: h._id, ...h._source, rrf: 0, semantic: null, keyword: null };
      e.rrf += 1 / (60 + i + 1);
      e[key] = h._score;
      fused.set(h._id, e);
    });
  if (knn) add(knn.hits.hits, 'semantic');
  if (bm25) add(bm25.hits.hits, 'keyword');
  const results = [...fused.values()].sort((a, b) => b.rrf - a.rrf).slice(0, size);
  const name = await projectsMod.namer();
  for (const r of results) r.project_name = name(r.project, r.project_name);

  // For Claude replies, attach the user prompt they answered.
  const promptIds = [...new Set(results.filter((r) => r.role === 'assistant' && r.prompt_uuid).map((r) => r.prompt_uuid))];
  if (promptIds.length) {
    const m = await es('POST', `/${INDEX_LOG}/_mget?_source_includes=text`, { ids: promptIds });
    const map = new Map(m.docs.filter((d) => d.found).map((d) => [d._id, d._source.text]));
    for (const r of results) if (r.role === 'assistant') r.prompt = map.get(r.prompt_uuid) || null;
  }
  return results;
}

// ---------- timeline ----------
async function projects() {
  const name = await projectsMod.namer();
  const r = await es('POST', `/${INDEX_LOG}/_search`, {
    size: 0,
    aggs: {
      p: {
        terms: { field: 'project', size: 1000, order: { last: 'desc' } },
        aggs: {
          last: { max: { field: 'timestamp' } },
          name: { terms: { field: 'project_name', size: 1 } },
          path: { terms: { field: 'project_path', size: 1 } },
          sessions: { cardinality: { field: 'session_id' } },
        },
      },
    },
  });
  return r.aggregations.p.buckets.map((b) => ({
    slug: b.key,
    name: name(b.key, b.name.buckets[0]?.key),
    folder: b.name.buckets[0]?.key || b.key,
    path: b.path.buckets[0]?.key || null,
    messages: b.doc_count,
    sessions: b.sessions.value,
    last: b.last.value_as_string,
  }));
}

async function sessions(project) {
  const r = await es('POST', `/${INDEX_LOG}/_search`, {
    size: 0,
    query: { term: { project } },
    aggs: {
      s: {
        terms: { field: 'session_id', size: 1000, order: { last: 'desc' } },
        aggs: {
          first: { min: { field: 'timestamp' } },
          last: { max: { field: 'timestamp' } },
          firstPrompt: {
            filter: { term: { role: 'user' } },
            aggs: { top: { top_hits: { size: 1, sort: [{ timestamp: 'asc' }], _source: ['text'] } } },
          },
        },
      },
    },
  });
  const ids = r.aggregations.s.buckets.map((b) => b.key);
  const titles = new Map();
  if (ids.length) {
    const st = await es('POST', `/${INDEX_STATE}/_search`, {
      size: ids.length,
      _source: ['session_id', 'title', 'git_branch'],
      query: { terms: { session_id: ids } },
    });
    for (const h of st.hits.hits) titles.set(h._source.session_id, h._source);
  }
  return r.aggregations.s.buckets.map((b) => ({
    id: b.key,
    title: titles.get(b.key)?.title || b.firstPrompt.top.hits.hits[0]?._source.text.slice(0, 120) || b.key,
    branch: titles.get(b.key)?.git_branch || null,
    messages: b.doc_count,
    first: b.first.value_as_string,
    last: b.last.value_as_string,
  }));
}

async function sessionMessages(id) {
  const r = await es('POST', `/${INDEX_LOG}/_search`, {
    size: 10000,
    _source: { excludes: SOURCE_EXCLUDES },
    query: { term: { session_id: id } },
    sort: [{ timestamp: 'asc' }, { seq: 'asc' }],
  });
  return r.hits.hits.map((h) => ({ id: h._id, ...h._source }));
}

// ---------- static ----------
const PUBLIC = path.join(__dirname, '..', 'public');
const VENDOR = {
  '/vendor/marked.js': require.resolve('marked/marked.min.js'),
  '/vendor/purify.js': require.resolve('dompurify/dist/purify.min.js'),
};
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
function serveStatic(req, res, pathname) {
  let file = VENDOR[pathname];
  if (!file) {
    const rel = pathname === '/' ? 'index.html' : pathname.slice(1);
    file = path.join(PUBLIC, path.normalize(rel));
    if (!file.startsWith(PUBLIC)) return send(res, 403, { error: 'forbidden' });
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      // SPA fallback
      return fs.readFile(path.join(PUBLIC, 'index.html'), (e2, html) => {
        if (e2) return send(res, 404, { error: 'not found' });
        res.writeHead(200, { 'Content-Type': TYPES['.html'] });
        res.end(html);
      });
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}

// ---------- routes ----------
async function route(req, res) {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  const qp = Object.fromEntries(url.searchParams);

  if (!p.startsWith('/api/')) return serveStatic(req, res, p);

  if (p === '/api/health') {
    return send(res, 200, { ready, error: startupError, embedding: embedStatus, localMode: LOCAL_MODE, ...relay.current() });
  }

  // Stop hook: publish a job and answer as soon as RabbitMQ has it on disk (a few ms); a worker does the rest.
  // If the queue is down the hook still exits quietly, and the next sync picks the lines up from the transcript.
  if (p === '/api/hook' && req.method === 'POST') {
    // the older hook (path only) needs the mount; the current hook pushes the lines to /api/push
    if (!LOCAL_MODE) return send(res, 410, { error: 'this server has no transcripts mount; update the hook (it pushes the lines)', code: 'PUSH_REQUIRED' });
    const body = await readBody(req);
    if (!body.transcript_path) return send(res, 400, { error: 'transcript_path required' });
    try {
      const id = await queue.publishJob('ingest', { type: 'hook', label: 'hook', path: body.transcript_path, account: body.account || null });
      return send(res, 202, { ok: true, job: id });
    } catch (e) {
      ing.log(`ERROR hook not queued: ${e.message}`);
      return send(res, 503, { error: 'queue unavailable' });
    }
  }

  // Live events. Every page gets only `changed` (which sessions got new data, once per job).
  // The Sync page opens ?detail=1 and also gets the log and live progress.
  if (p === '/api/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    const detail = qp.detail === '1';
    const listeners = {
      changed: (list) => res.write(`event: changed\ndata: ${JSON.stringify(list)}\n\n`),
      ...(detail ? {
        log: (e) => res.write(`event: log\ndata: ${JSON.stringify(e)}\n\n`),
        status: () => res.write(`event: status\ndata: ${JSON.stringify(relay.current())}\n\n`),
      } : {}),
    };
    for (const [k, fn] of Object.entries(listeners)) relay.bus.on(k, fn);
    res.write(`event: hello\ndata: ${JSON.stringify({ ready, error: startupError })}\n\n`);
    const ping = setInterval(() => res.write(': ping\n\n'), 25000);
    req.on('close', () => { for (const [k, fn] of Object.entries(listeners)) relay.bus.off(k, fn); clearInterval(ping); });
    return;
  }

  if (!ready) return send(res, 503, { error: startupError || 'Starting up…', embedding: embedStatus });

  // ---------- hook push (devices, tokens, lines) ----------
  if (p === '/api/device/enroll' && req.method === 'POST') {
    const r = await devices.enroll(await readBody(req));
    const { http: code, ...rest } = r;
    if (r.code === 'APPROVAL_PENDING') ing.log(`Device ${String(rest.device_id).slice(0, 8)} asked to push; waiting for approval on the Devices page`);
    return send(res, code, rest);
  }
  if (p === '/api/device/token' && req.method === 'POST') {
    const { http: code, ...rest } = await devices.token(await readBody(req));
    return send(res, code, rest);
  }
  if (p === '/api/offset' || (p === '/api/push' && req.method === 'POST')) {
    const auth = await devices.authenticate(req);
    if (auth.http) return send(res, auth.http, { code: auth.code });
    if (auth.renewed) res.setHeader('X-Recall-Token', JSON.stringify(auth.renewed));
    try {
      if (p === '/api/offset') return send(res, 200, await receive.offset(qp));
      const { http: code, ...rest } = await receive.push(await receive.readJson(req), auth);
      return send(res, code, rest);
    } catch (e) {
      if (e instanceof receive.HttpError) return send(res, e.http, { code: e.code, ...e.extra });
      if (/RabbitMQ/.test(e.message)) return send(res, 503, { code: 'QUEUE_UNAVAILABLE' });
      throw e;
    }
  }
  if (p === '/api/devices' || p.startsWith('/api/devices/')) {
    if (!devices.adminOk(req)) return send(res, 401, { code: 'ADMIN_TOKEN_REQUIRED' });
    if (p === '/api/devices') return send(res, 200, await devices.list());
    const m = /^\/api\/devices\/([^/]+)\/(approve|reject)$/.exec(p);
    if (!m || req.method !== 'POST') return send(res, 404, { error: 'not found' });
    const d = await devices.decide(decodeURIComponent(m[1]), m[2]);
    if (!d) return send(res, 404, { error: 'no such device' });
    ing.log(`Device ${d.device_id.slice(0, 8)} (${d.email || d.hostname || '?'}, tenant ${d.tenant_id}) ${d.status}`);
    return send(res, 200, { device: d });
  }

  if (p === '/api/search') {
    if (!qp.q?.trim()) return send(res, 400, { error: 'q required' });
    return send(res, 200, { results: await search({ ...qp, q: qp.q.trim() }) });
  }
  if (p.startsWith('/api/image/')) {
    const doc = await es('GET', `/${INDEX_IMAGES}/_doc/${encodeURIComponent(decodeURIComponent(p.slice(11)))}`, undefined, { allow404: true });
    const src = doc?._source;
    if (!src || !/^image\/(png|jpeg|gif|webp)$/.test(src.media_type)) return send(res, 404, { error: 'not found' });
    res.writeHead(200, { 'Content-Type': src.media_type, 'Cache-Control': 'private, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' });
    return res.end(Buffer.from(src.data, 'base64'));
  }
  if (p === '/api/projects') return send(res, 200, { projects: await projects() });
  if (p === '/api/sessions') return send(res, 200, { sessions: await sessions(qp.project) });
  if (p === '/api/stats') {
    const days = Math.max(0, Math.min(3650, Number(qp.days ?? 30) || 0));
    return send(res, 200, await stats({
      days, from: qp.from || null, to: qp.to || null, project: qp.project || null, account: qp.account || null, org: qp.org || null,
    }));
  }
  if (p === '/api/projects/all') {
    return send(res, 200, await projectsMod.listAll({
      page: Number(qp.page) || 1, size: Math.min(100, Number(qp.size) || 20), q: qp.q || '', sort: qp.sort || 'last',
    }));
  }
  if (p.startsWith('/api/project/') && p.endsWith('/title') && req.method === 'PUT') {
    const slug = decodeURIComponent(p.slice(13, -6));
    const body = await readBody(req);
    const title = await projectsMod.setTitle(slug, body.title);
    ing.log(title ? `Project renamed: ${slug} → “${title}”` : `Project title cleared: ${slug}`);
    return send(res, 200, { ok: true, title });
  }
  if (p === '/api/prices' && req.method === 'GET') return send(res, 200, await prices.listing());
  if (p === '/api/prices' && req.method === 'PUT') {
    // { changes: { model: price | null } } → saved, then every response's cost is recalculated
    const body = await readBody(req);
    const n = await prices.save(body.changes);
    ing.log(`Prices saved: ${n} model(s)`);
    await recalcCosts();
    return send(res, 200, await prices.listing());
  }
  if (p === '/api/prices/known' && req.method === 'POST') {
    const n = await prices.addKnown();
    ing.log(`Known Claude prices added: ${n} model(s)`);
    if (n) await recalcCosts();
    return send(res, 200, { added: n, ...(await prices.listing()) });
  }
  if (p === '/api/accounts') {
    return send(res, 200, await accounts.listing());
  }

  // Deletes only Claude Recall's copy (messages, images, token usage). Transcripts are never touched.
  if (req.method === 'DELETE' && (p.startsWith('/api/project/') || p.startsWith('/api/session/'))) {
    const isProject = p.startsWith('/api/project/');
    const id = decodeURIComponent(p.slice(13)); // both prefixes are 13 chars
    if (!id) return send(res, 400, { error: 'id required' });
    const forget = qp.forget === '1';
    const result = await deleteLocked(isProject ? { project: id, forget } : { session: id, forget });
    if (isProject && qp.exclude === '1') {
      const s = ing.getSettings();
      if (!s.excluded.includes(id)) await ing.saveSettings({ excluded: [...s.excluded, id] });
    }
    return send(res, 200, { ok: true, ...result });
  }

  if (p.startsWith('/api/session/')) {
    const id = decodeURIComponent(p.slice(13));
    const [messages, st, dir] = await Promise.all([
      sessionMessages(id),
      es('POST', `/${INDEX_STATE}/_search`, { size: 1, _source: ['title', 'git_branch'], query: { term: { session_id: id } } }),
      accounts.directory(),
    ]);
    const meta = st.hits.hits[0]?._source || {};
    // accounts that wrote messages in this session (a session can span an account switch)
    const ids = [...new Set(messages.map((m) => m.account_uuid).filter(Boolean))];
    const sessionAccounts = ids.map((uid) => {
      const u = dir.users.get(uid) || {};
      const orgId = messages.find((m) => m.account_uuid === uid && m.org_uuid)?.org_uuid;
      return { account_uuid: uid, email: u.email || null, name: u.full_name || u.display_name || uid, org: orgId ? dir.orgs.get(orgId)?.name || orgId : null };
    });
    const nameOf = new Map(sessionAccounts.map((a) => [a.account_uuid, a.email || a.name]));
    for (const m of messages) if (m.account_uuid) m.account = nameOf.get(m.account_uuid);
    const pname = await projectsMod.namer();
    for (const m of messages) m.project_name = pname(m.project, m.project_name);
    return send(res, 200, { messages, title: meta.title || null, branch: meta.git_branch || null, accounts: sessionAccounts,
      unlinked: messages.filter((m) => !m.account_uuid).length });
  }

  if (p === '/api/sync/status') {
    const esHealth = await es('GET', '/_cluster/health').catch(() => null);
    return send(res, 200, {
      health: {
        running: relay.current().running,
        lastSyncAt: relay.getLastSyncAt(),
        lastHookAt: relay.getLastHookAt() || (await es('POST', `/${INDEX_STATE}/_search`, {
          size: 0, aggs: { h: { max: { field: 'last_hook_at' } } },
        }).catch(() => null))?.aggregations?.h?.value_as_string || null,
        lastError: relay.getLastError(),
        embedding: embedStatus,
        elasticsearch: esHealth ? esHealth.status : 'unreachable',
        queue: await queue.stats().catch(() => null),
        redis: await lock.client().ping().then(() => 'ok').catch(() => 'unreachable'),
        dead: await queue.peekDead(10).catch(() => []),
      },
      projects: await (async () => {
        const [list, name] = await Promise.all([ing.projectOverview(), projectsMod.namer()]);
        for (const x of list) { x.folder = x.name; x.name = name(x.slug, x.name); }
        return list;
      })(),
      settings: ing.getSettings(),
      localMode: LOCAL_MODE,
      ...relay.current(),
      lastSyncAt: relay.getLastSyncAt(),
      log: relay.recentLog.slice(-100),
    });
  }
  if (p === '/api/sync' && req.method === 'POST') {
    if (!LOCAL_MODE) return send(res, 409, { error: 'no transcripts mount on this server (LOCAL_MODE=false): hooks push new lines themselves' });
    const body = await readBody(req);
    const slugs = body.all ? null : Array.isArray(body.projects) ? body.projects : null;
    if (!body.all && !slugs?.length) return send(res, 400, { error: 'projects[] or all:true required' });
    ing.log(body.all ? 'Sync all started' : `Sync started: ${slugs.length} project(s)`);
    const job = await queue.publishJob('maintenance', { type: 'sync', label: 'manual', slugs });
    return send(res, 202, { ok: true, job });
  }
  if (p === '/api/queue/retry-dead' && req.method === 'POST') {
    const n = await queue.retryDead();
    ing.log(`Dead-letter queue: ${n} job(s) sent back to be tried again`);
    return send(res, 200, { ok: true, retried: n });
  }
  if (p === '/api/settings' && req.method === 'POST') {
    const body = await readBody(req);
    const patch = {};
    if (typeof body.autoSync === 'boolean') patch.autoSync = body.autoSync;
    if (Number(body.intervalMinutes) >= 1) patch.intervalMinutes = Math.min(1440, Number(body.intervalMinutes));
    if (Array.isArray(body.excluded)) patch.excluded = body.excluded.map(String);
    const s = await ing.saveSettings(patch);
    scheduleAutoSync();
    ing.log(`Settings saved: auto-sync ${s.autoSync ? `every ${s.intervalMinutes} min` : 'off'}, ${s.excluded.length} excluded`);
    return send(res, 200, { settings: s });
  }

  send(res, 404, { error: 'not found' });
}

http
  .createServer((req, res) => {
    route(req, res).catch((e) => {
      console.error(e);
      if (!res.headersSent) send(res, 500, { error: e.message });
    });
  })
  .listen(PORT, () => console.log(`Claude Recall on :${PORT}`));

// ---------- jobs the API starts ----------
/** Recalculates every cost on a worker; waits (up to a minute) so the answer already has the new numbers. */
async function recalcCosts() {
  queue.publishEvent('prices', null); // workers drop their cached price table
  const id = await queue.publishJob('maintenance', { type: 'recalc-costs', label: 'recalculate costs' });
  const done = await relay.awaitDone(id, 60000);
  if (!done) ing.log('Cost recalculation is still running; the numbers update when it finishes');
}

/** Delete holds the locks of every affected session, so no worker writes them while their data goes. */
async function deleteLocked(what) {
  const term = what.project ? { term: { project: what.project } } : { term: { session_id: what.session } };
  const [st, lg] = await Promise.all([
    es('POST', `/${INDEX_STATE}/_search`, { size: 10000, _source: ['project', 'session_id'], query: term }),
    es('POST', `/${INDEX_LOG}/_search`, { size: 0, query: term, aggs: { s: { terms: { field: 'session_id', size: 10000 }, aggs: { p: { terms: { field: 'project', size: 1 } } } } } }),
  ]);
  const keys = new Set(st.hits.hits.map((h) => lock.sessionKey(h._source.project, h._source.session_id)));
  for (const b of lg.aggregations.s.buckets) keys.add(lock.sessionKey(b.p.buckets[0]?.key, b.key));
  return lock.withLocks([...keys], async () => {
    const out = await ing.deleteData(what);
    if (what.forget) out.received = await receive.forgetReceived(what); // hooks resend from the start
    return out;
  }, { wait: 60000 });
}

// Auto-sync timer. With several API processes only one publishes per tick (Redis lock for the interval).
let timer = null;
function scheduleAutoSync() {
  if (timer) clearInterval(timer);
  timer = null;
  const s = ing.getSettings();
  if (!s.autoSync || !LOCAL_MODE) return;
  const ms = Math.max(1, Number(s.intervalMinutes) || 5) * 60_000;
  timer = setInterval(async () => {
    try {
      if (relay.syncRunning()) return; // previous sync still going
      if (!(await lock.acquire('scheduler:auto-sync', ms - 2000))) return; // another API process took this tick
      await queue.publishJob('maintenance', { type: 'sync', label: 'auto-sync', slugs: null });
    } catch (e) { ing.log(`ERROR auto-sync: ${e.message}`); }
  }, ms);
}

// ---------- startup ----------
(async () => {
  await queue.connect(ing.log);
  await relay.start();
  relay.bus.on('settings', () => ing.loadSettings().then(scheduleAutoSync).catch(() => {}));
  ing.log('Waiting for Elasticsearch…');
  await waitForEs();
  ing.log('Waiting for embedding model…');
  await ensureModel(ing.log);
  const [probe] = await embed(['dimension probe']);
  await ensureIndices(probe.length);
  await ing.loadSettings();
  if (!ing.getSettings().pricesSeeded) {
    // first start with pricing: fill the price table once; later only from Settings → Prices
    ing.log(`Known Claude prices added: ${await prices.addKnown()} model(s)`);
    await ing.saveSettings({ pricesSeeded: true });
  }
  ready = true;
  ing.log(`Ready (model ${embedStatus.detail}, ${probe.length} dims). Jobs go to RabbitMQ; workers do the work.`);
  scheduleAutoSync();
  const s = ing.getSettings();
  if (!LOCAL_MODE) return; // catch-up and backfills read the transcripts from the mount
  if (s.autoSync) await queue.publishJob('maintenance', { type: 'sync', label: 'startup catch-up', slugs: null });
  // re-read once for pricing: 5-minute / 1-hour cache writes, speed and the cost of each response
  if (!s.usageBackfilled || !s.usagePriced) await queue.publishJob('maintenance', { type: 'backfill-usage', label: 'token usage backfill' });
  if (!s.imagesBackfilled) await queue.publishJob('maintenance', { type: 'backfill-images', label: 'image backfill' });
})().catch((e) => {
  startupError = e.message;
  ing.log(`STARTUP ERROR: ${e.message}`);
});
