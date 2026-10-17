const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const os = require('os');
const { es } = require('./es');
const queue = require('./queue');
const { embed } = require('./embed');
const { parseLine, parseUsage } = require('./parse');
const { recordAccount } = require('./accounts');
const prices = require('./prices');
const { PROJECTS_DIR, INDEX_LOG, INDEX_STATE, INDEX_SETTINGS, INDEX_IMAGES, INDEX_USAGE, EMBED_BATCH } = require('./config');

// Log lines go to stdout and, as `log` events, to every API process (Sync page live log).
const WORKER = `${os.hostname()}:${process.pid}`;
function log(msg) {
  const entry = { ts: new Date().toISOString(), msg, worker: WORKER };
  console.log(entry.ts, msg);
  queue.publishEvent('log', entry);
}

// ---------- settings ----------
const DEFAULT_SETTINGS = { autoSync: true, intervalMinutes: 5, excluded: [] };
let settings = { ...DEFAULT_SETTINGS };

async function loadSettings() {
  const doc = await es('GET', `/${INDEX_SETTINGS}/_doc/config`, undefined, { allow404: true });
  settings = { ...DEFAULT_SETTINGS, ...(doc?._source || {}) };
  return settings;
}
async function saveSettings(patch) {
  settings = { ...settings, ...patch };
  await es('PUT', `/${INDEX_SETTINGS}/_doc/config?refresh=true`, settings);
  queue.publishEvent('settings', null); // other processes reload them
  return settings;
}
const getSettings = () => settings;

// ---------- files & state ----------
function projectNameFromSlug(slug) {
  const parts = slug.split('-').filter(Boolean);
  return parts[parts.length - 1] || slug;
}

function listFiles() {
  const out = [];
  let dirs = [];
  try { dirs = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true }); } catch { return out; }
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    const dir = path.join(PROJECTS_DIR, d.name);
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (!e.isFile() || !e.name.endsWith('.jsonl')) continue;
      const full = path.join(dir, e.name);
      const st = fs.statSync(full);
      out.push({ slug: d.name, sessionId: e.name.slice(0, -6), path: full, size: st.size, mtime: st.mtimeMs });
    }
  }
  return out;
}

const stateId = (f) => `${f.slug}/${f.sessionId}`;

const labels = new Map();
function projectLabel(slug, file) {
  if (!labels.has(slug)) {
    const cwd = peekCwd(file);
    labels.set(slug, cwd ? path.basename(cwd) : projectNameFromSlug(slug));
  }
  return labels.get(slug);
}

// Project root = the first cwd recorded in a session (later lines may have cd'd elsewhere).
function peekCwd(file) {
  try {
    const fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(256 * 1024);
    const n = fs.readSync(fd, buf, 0, buf.length, 0);
    fs.closeSync(fd);
    const m = buf.toString('utf8', 0, n).match(/"cwd":"((?:[^"\\]|\\.)*)"/);
    return m ? JSON.parse(`"${m[1]}"`) : null;
  } catch {
    return null;
  }
}

async function loadAllState() {
  const res = await es('POST', `/${INDEX_STATE}/_search`, { size: 10000, query: { match_all: {} } });
  const map = new Map();
  for (const h of res.hits.hits) map.set(h._id, h._source);
  return map;
}

/**
 * Fenced write of the read position: only succeeds if nobody else wrote it since we read it
 * (ver = { seq, term } of the doc we read, or null when it did not exist yet). Returns the new ver.
 * A conflict means another worker got to this session (e.g. our Redis lock expired while we stalled).
 */
const isConflict = (e) => /-> 409/.test(e.message);
class StaleWriteError extends Error {}
async function saveState(f, s, ver) {
  const q = ver ? `if_seq_no=${ver.seq}&if_primary_term=${ver.term}` : 'op_type=create';
  try {
    const r = await es('PUT', `/${INDEX_STATE}/_doc/${encodeURIComponent(stateId(f))}?${q}`, s);
    return { seq: r._seq_no, term: r._primary_term };
  } catch (e) {
    if (isConflict(e)) throw new StaleWriteError(`read position of ${f.sessionId.slice(0, 8)} was changed by another writer; retrying`);
    throw e;
  }
}
async function readState(f) {
  const doc = await es('GET', `/${INDEX_STATE}/_doc/${encodeURIComponent(stateId(f))}`, undefined, { allow404: true });
  return doc?.found ? { prev: doc._source, ver: { seq: doc._seq_no, term: doc._primary_term } } : { prev: null, ver: null };
}

// Yields complete lines from `start`; an unfinished last line is left for next time.
async function* readLines(file, start) {
  const fh = await fs.promises.open(file, 'r');
  try {
    const buf = Buffer.alloc(1 << 20);
    let pos = start;
    let carry = Buffer.alloc(0);
    for (;;) {
      const { bytesRead } = await fh.read(buf, 0, buf.length, pos);
      if (!bytesRead) break;
      let chunk = Buffer.concat([carry, buf.subarray(0, bytesRead)]);
      const chunkStart = pos - carry.length;
      pos += bytesRead;
      let lineStart = 0;
      let nl;
      while ((nl = chunk.indexOf(10, lineStart)) !== -1) {
        yield { line: chunk.toString('utf8', lineStart, nl), end: chunkStart + nl + 1 };
        lineStart = nl + 1;
      }
      carry = Buffer.from(chunk.subarray(lineStart));
    }
  } finally {
    await fh.close();
  }
}

// A pushed chunk as lines: { line, end } like readLines, from byte `start`; lines up to `from` are dropped (already read).
async function* chunkLines(data, start, from) {
  let pos = start;
  let i = 0;
  while (i < data.length) {
    const nl = data.indexOf('\n', i);
    if (nl === -1) break; // the API only accepts complete lines
    const line = data.slice(i, nl);
    pos += Buffer.byteLength(line) + 1;
    i = nl + 1;
    if (pos > from) yield { line, end: pos };
  }
}

class GapError extends Error {}

function freshState(f, prev) {
  return {
    file: f.path ? path.relative(PROJECTS_DIR, f.path) : `${f.slug}/${f.sessionId}.jsonl`,
    project: f.slug,
    session_id: f.sessionId,
    byte_offset: 0,
    size: 0,
    title: null,
    cwd: null,
    git_branch: null,
    last_prompt_uuid: null,
    ...(prev || {}),
  };
}

/** Counts records not yet ingested (no embedding, no writes). Cached by size+offset. */
const pendingCache = new Map();
async function countPending(f, prev) {
  const s = freshState(f, prev);
  const start = f.size < s.byte_offset ? 0 : s.byte_offset;
  if (start >= f.size) return 0;
  const key = `${f.path}:${f.size}:${start}`;
  if (pendingCache.has(key)) return pendingCache.get(key);
  const ctx = { title: s.title, cwd: s.cwd, gitBranch: s.git_branch, lastPromptUuid: s.last_prompt_uuid };
  let n = 0;
  for await (const { line } of readLines(f.path, start)) {
    if (!line.includes('"type":"user"') && !line.includes('"type":"assistant"')) continue;
    try { if (parseLine(JSON.parse(line), ctx)) n++; } catch {}
  }
  pendingCache.set(key, n);
  return n;
}

// Pasted images go to their own index (kept out of the chat docs so search stays light).
// Sets rec.images = [{ id, media_type }] on each record that had any.
async function indexImages(recs) {
  const lines = [];
  let bytes = 0;
  const flush = async () => {
    if (!lines.length) return;
    const res = await es('POST', '/_bulk', lines.join('\n') + '\n', { ndjson: true });
    if (res.errors) throw new Error(`image bulk errors: ${res.items.find((it) => it.index?.error)?.index?.error?.reason || 'unknown'}`);
    lines.length = 0;
    bytes = 0;
  };
  for (const r of recs) {
    if (!r._images?.length) continue;
    r.images = r._images.map((im, i) => ({ id: `${r._id}-${i}`, media_type: im.media_type }));
    for (let i = 0; i < r._images.length; i++) {
      const im = r._images[i];
      lines.push(JSON.stringify({ index: { _index: INDEX_IMAGES, _id: r.images[i].id } }));
      lines.push(JSON.stringify({
        message_id: r._id, session_id: r.session_id, project: r.project,
        account_uuid: r.account_uuid || undefined, org_uuid: r.org_uuid || undefined, tenant_id: r.tenant_id || undefined,
        media_type: im.media_type, timestamp: r.timestamp, data: im.data,
      }));
      bytes += im.data.length;
      if (bytes > 8e6) await flush();
    }
  }
  await flush();
}

// Partial update + upsert: a re-read (backfill) refreshes token fields and cost without dropping account tags.
async function indexUsage(list, f, tag = null) {
  if (!list.length) return;
  await prices.addCosts(list);
  const body = list
    .map(({ _id, ...u }) => JSON.stringify({ update: { _index: INDEX_USAGE, _id } }) + '\n'
      + JSON.stringify({ doc: { ...u, project: f.slug, session_id: f.sessionId, ...(tag || {}) }, doc_as_upsert: true }))
    .join('\n') + '\n';
  const res = await es('POST', '/_bulk', body, { ndjson: true });
  if (res.errors) throw new Error(`usage bulk errors: ${res.items.find((it) => it.update?.error)?.update?.error?.reason || 'unknown'}`);
}

async function bulkIndex(docs) {
  await indexImages(docs);
  const vectors = [];
  for (let i = 0; i < docs.length; i += EMBED_BATCH) {
    vectors.push(...(await embed(docs.slice(i, i + EMBED_BATCH).map((d) => d.text))));
  }
  const body = docs
    .map((d, i) => {
      const { _id, _images, ...src } = d;
      return JSON.stringify({ index: { _index: INDEX_LOG, _id } }) + '\n' + JSON.stringify({ ...src, embedding: vectors[i] });
    })
    .join('\n') + '\n';
  const res = await es('POST', '/_bulk', body, { ndjson: true });
  if (res.errors) {
    const first = res.items.find((it) => it.index?.error)?.index?.error;
    throw new Error(`bulk errors: ${first?.reason || 'unknown'}`);
  }
}

/**
 * Ingests everything after the saved offset. Offset only moves after a successful write, and only if
 * nobody else moved it meanwhile (fenced by `ver`). Call it holding the session's lock.
 * tag = { account_uuid, org_uuid } of the logged-in account when the hook fired (null for catch-up syncs).
 * Returns { n, ver } (messages added, version of the read-position doc now).
 */
async function ingestFile(f, prev, tag = null, { ver = null, guard = null, job = null } = {}) {
  const progress = job?.progress;
  const s = freshState(f, prev);
  if (f.chunk) {
    // pushed lines: f.size = the chunk's end. Already have it all → nothing to do; a gap before it → later.
    if (s.byte_offset >= f.size) return { n: 0, ver };
    if (s.byte_offset < f.chunk.start) throw new GapError(`waiting for bytes ${s.byte_offset}–${f.chunk.start}`);
  } else if (f.size < s.byte_offset) {
    log(`${f.slug} › ${f.sessionId}: file shrank, re-reading from start`);
    s.byte_offset = 0;
  }
  if (f.size === s.byte_offset) return { n: 0, ver };

  const ctx = { title: s.title, cwd: s.cwd, gitBranch: s.git_branch, lastPromptUuid: s.last_prompt_uuid };
  let pending = [];
  const usage = new Map();
  let offset = s.byte_offset;
  let committed = s.byte_offset;
  let total = 0;

  const commit = async () => {
    guard?.check();
    if (pending.length) {
      const projectPath = ctx.cwd || null;
      const projectName = projectPath ? path.basename(projectPath) : projectNameFromSlug(f.slug);
      for (const r of pending) {
        r.project = f.slug;
        r.project_name = projectName;
        r.project_path = projectPath;
        r.session_id = f.sessionId;
        if (f.tenant) r.tenant_id = f.tenant;
        if (tag) Object.assign(r, tag);
      }
      await bulkIndex(pending);
      total += pending.length;
      if (progress) progress.added += pending.length;
      pending = [];
    }
    if (usage.size) {
      await indexUsage([...usage.values()], f, f.tenant ? { ...(tag || {}), tenant_id: f.tenant } : tag);
      usage.clear();
    }
    Object.assign(s, {
      byte_offset: offset,
      size: f.size,
      title: ctx.title,
      cwd: ctx.cwd,
      git_branch: ctx.gitBranch,
      last_prompt_uuid: ctx.lastPromptUuid,
      updated_at: new Date().toISOString(),
      ...(f.tenant ? { tenant_id: f.tenant } : {}),
    });
    ver = await saveState(f, s, ver);
    if (progress) {
      progress.bytesDone += offset - committed;
      job.emit();
    }
    committed = offset;
  };

  const lines = !f.chunk ? readLines(f.path, s.byte_offset)
    : f.chunk.skipped ? (async function* () { yield { line: '', end: f.size }; })()
    : chunkLines(f.chunk.data, f.chunk.start, s.byte_offset);
  for await (const { line, end } of lines) {
    let rec = null;
    let obj = null;
    if (line.trim()) {
      try { obj = JSON.parse(line); } catch {}
    }
    if (obj) {
      rec = parseLine(obj, ctx);
      const u = parseUsage(obj);
      if (u) usage.set(u._id, u);
    }
    if (rec) {
      rec.seq = end;
      pending.push(rec);
    }
    offset = end;
    if (pending.length >= EMBED_BATCH * 2) await commit();
  }
  await commit();
  return { n: total, ver };
}

/** Files with unread bytes (what a sync has to do). null = every project that is not excluded. */
async function planSync(slugs = null) {
  const files = listFiles().filter((f) => (slugs ? slugs.includes(f.slug) : !settings.excluded.includes(f.slug)));
  const state = await loadAllState();
  const todo = files
    .filter((f) => state.get(stateId(f))?.byte_offset !== f.size)
    .map((f) => ({ slug: f.slug, sessionId: f.sessionId, bytes: Math.max(0, f.size - (state.get(stateId(f))?.byte_offset || 0)) }));
  return { files: files.length, todo };
}

/**
 * One-time pass for messages ingested before images were supported: reads only the
 * already-ingested part of each transcript, stores pasted images and links them to
 * their message. Offsets are not touched.
 */
async function backfillImages(job) {
  const files = listFiles();
  const state = await loadAllState();
  const todo = files.filter((f) => (state.get(stateId(f))?.byte_offset || 0) > 0);
  const progress = (job.progress = {
    label: job.label, filesTotal: todo.length, filesDone: 0,
    bytesTotal: todo.reduce((a, f) => a + Math.min(f.size, state.get(stateId(f)).byte_offset), 0),
    bytesDone: 0, added: 0, current: null, startedAt: new Date().toISOString(),
  });
  job.emit(true);
  let linked = 0;
  for (const f of todo) {
    const limit = state.get(stateId(f)).byte_offset;
    progress.current = `images · ${projectLabel(f.slug, f.path)} › ${f.sessionId.slice(0, 8)}`;
    job.emit(true);
    const ctx = {};
    let done = 0;
    for await (const { line, end } of readLines(f.path, 0)) {
      if (end > limit) break;
      progress.bytesDone += end - done;
      done = end;
      if (!line.includes('"type":"image"') || !line.includes('"type":"user"')) continue;
      let rec = null;
      try { rec = parseLine(JSON.parse(line), ctx); } catch {}
      if (!rec?._images?.length) continue;
      rec.project = f.slug;
      rec.session_id = f.sessionId;
      await indexImages([rec]);
      const res = await es('POST', `/${INDEX_LOG}/_update/${encodeURIComponent(rec._id)}`, { doc: { images: rec.images } }).catch((e) => {
        if (!/document_missing|404/.test(e.message)) throw e;
        return null;
      });
      if (res) {
        linked += rec.images.length;
        progress.added = linked;
      }
      job.emit();
    }
    progress.bytesDone += Math.min(f.size, limit) - done;
    progress.filesDone++;
    job.emit(true);
  }
  log(`Image backfill done: ${linked} image(s) linked to earlier messages`);
  return linked;
}

/**
 * One-time pass over the already-read part of every transcript: token usage for parts ingested before usage
 * was tracked, and (re-run once for pricing) the 5-minute / 1-hour cache-write split, speed and cost.
 * Offsets untouched; account tags kept.
 */
async function backfillUsage(job) {
  const files = listFiles();
  const state = await loadAllState();
  const todo = files.filter((f) => (state.get(stateId(f))?.byte_offset || 0) > 0);
  const progress = (job.progress = {
    label: job.label, filesTotal: todo.length, filesDone: 0,
    bytesTotal: todo.reduce((a, f) => a + Math.min(f.size, state.get(stateId(f)).byte_offset), 0),
    bytesDone: 0, added: 0, current: null, startedAt: new Date().toISOString(),
  });
  job.emit(true);
  let n = 0;
  for (const f of todo) {
    const limit = state.get(stateId(f)).byte_offset;
    progress.current = `tokens · ${projectLabel(f.slug, f.path)} › ${f.sessionId.slice(0, 8)}`;
    job.emit(true);
    const usage = new Map();
    let done = 0;
    for await (const { line, end } of readLines(f.path, 0)) {
      if (end > limit) break;
      progress.bytesDone += end - done;
      done = end;
      if (!line.includes('"usage"') || !line.includes('"type":"assistant"')) continue;
      let u = null;
      try { u = parseUsage(JSON.parse(line)); } catch {}
      if (u) usage.set(u._id, u);
      if (usage.size >= 500) { n += usage.size; await indexUsage([...usage.values()], f); usage.clear(); }
      job.emit();
    }
    n += usage.size;
    await indexUsage([...usage.values()], f);
    progress.added = n;
    progress.bytesDone += Math.min(f.size, limit) - done;
    progress.filesDone++;
    job.emit(true);
  }
  log(`Token usage backfill done: ${n} API responses`);
  return n;
}

/**
 * Removes a project's or a session's data from Claude Recall's indices only (transcripts are never touched).
 * forget=false keeps the read position, so the next sync does not bring the old messages back;
 * forget=true also clears it, so the next sync re-indexes everything from the transcripts.
 */
async function deleteData({ project, session, forget = false }) {
  const term = project ? { term: { project } } : { term: { session_id: session } };
  const out = {};
  for (const [key, index] of [['messages', INDEX_LOG], ['images', INDEX_IMAGES], ['usage', INDEX_USAGE]]) {
    const r = await es('POST', `/${index}/_delete_by_query?refresh=true&conflicts=proceed`, { query: term });
    out[key] = r.deleted || 0;
  }
  if (forget) {
    const r = await es('POST', `/${INDEX_STATE}/_delete_by_query?refresh=true&conflicts=proceed`, { query: term });
    out.positions = r.deleted || 0;
  }
  log(`Deleted ${project ? `project ${project}` : `session ${session}`}: ${out.messages} messages, ${out.images} images, ${out.usage} usage records${forget ? ', read position reset' : ''}`);
  return out;
}

/**
 * Links messages to the account that wrote them. Called on every hook: anything in this session
 * still without an account since the previous hook (or, on the first hook, since the turn's prompt)
 * was written during this turn, i.e. by the account logged in now. Older history stays unlinked.
 */
async function tagUntagged(sessionId, tag, since) {
  if (!tag || !since) return 0;
  const query = { bool: {
    filter: [{ term: { session_id: sessionId } }, { range: { timestamp: { gte: since } } }],
    must_not: [{ exists: { field: 'account_uuid' } }],
  } };
  const script = { source: 'ctx._source.account_uuid = params.a; if (params.o != null) { ctx._source.org_uuid = params.o; }', params: { a: tag.account_uuid, o: tag.org_uuid } };
  let n = 0;
  for (const index of [INDEX_LOG, INDEX_USAGE, INDEX_IMAGES]) {
    const r = await es('POST', `/${index}/_update_by_query?refresh=true&conflicts=proceed`, { query, script });
    if (index === INDEX_LOG) n = r.updated || 0;
  }
  return n;
}

/** "~/.claude/projects/<slug>/<session>.jsonl" (the path the hook reports) → { slug, sessionId }. */
function parseHostPath(hostTranscriptPath) {
  const parts = String(hostTranscriptPath || '').split('/').filter(Boolean);
  if (parts.length < 2 || !parts[parts.length - 1].endsWith('.jsonl')) return null;
  return { slug: parts[parts.length - 2], sessionId: parts[parts.length - 1].slice(0, -6) };
}

/**
 * One session's new lines → Elasticsearch. Used for hook jobs (with the account that was logged in)
 * and for sync jobs (no account). Call it holding the session's lock; guard says if the lock was lost.
 */
async function ingestSession({ slug, sessionId, account = null, hook = false, chunk = null, tenant = null, cwd = null }, job, guard) {
  if (settings.excluded.includes(slug)) return { added: 0, linked: 0, skipped: 'excluded' };
  let f;
  if (chunk) {
    // pushed by the hook: the lines are in the job, no file to read
    f = { slug, sessionId, path: null, size: chunk.end, chunk, tenant };
  } else {
    const full = path.join(PROJECTS_DIR, slug, `${sessionId}.jsonl`);
    if (!full.startsWith(PROJECTS_DIR + path.sep) || !fs.existsSync(full)) return { added: 0, linked: 0, skipped: 'missing' };
    const st = fs.statSync(full);
    f = { slug, sessionId, path: full, size: st.size, mtime: st.mtimeMs };
  }
  let { prev, ver } = await readState(f); // read after taking the lock
  const label = f.path ? projectLabel(slug, f.path) : path.basename(prev?.cwd || cwd || '') || projectNameFromSlug(slug);
  const where = `${label} › ${sessionId.slice(0, 8)}`;
  if (job.progress) job.progress.current = where;
  else job.progress = { label: job.label, filesTotal: 1, filesDone: 0, bytesTotal: Math.max(0, f.size - Math.max(chunk?.start || 0, prev?.byte_offset || 0)), bytesDone: 0, added: 0, current: where, startedAt: new Date().toISOString() };
  job.emit(true);
  const tag = hook ? await recordAccount(account, log).catch((e) => { log(`ERROR account: ${e.message}`); return null; }) : null;
  const r = await ingestFile(f, prev, tag, { ver, guard, job });
  const n = r.n;
  ver = r.ver;
  let linked = 0;
  if (tag) {
    // start of the window this hook vouches for
    let since = prev?.last_hook_at;
    if (!since) {
      const lastPrompt = await es('POST', `/${INDEX_LOG}/_search`, {
        size: 1, _source: ['timestamp'], query: { bool: { filter: [{ term: { session_id: sessionId } }, { term: { role: 'user' } }] } },
        sort: [{ timestamp: 'desc' }],
      });
      since = lastPrompt.hits.hits[0]?._source.timestamp;
    }
    guard?.check();
    linked = await tagUntagged(sessionId, tag, since);
    const fence = ver ? `&if_seq_no=${ver.seq}&if_primary_term=${ver.term}` : '';
    await es('POST', `/${INDEX_STATE}/_update/${encodeURIComponent(stateId(f))}?refresh=true${fence}`, {
      script: {
        source: `ctx._source.last_hook_at = params.now;
          if (ctx._source.account_uuids == null) { ctx._source.account_uuids = []; }
          if (!ctx._source.account_uuids.contains(params.a)) { ctx._source.account_uuids.add(params.a); }
          if (params.o != null) {
            if (ctx._source.org_uuids == null) { ctx._source.org_uuids = []; }
            if (!ctx._source.org_uuids.contains(params.o)) { ctx._source.org_uuids.add(params.o); }
          }`,
        params: { now: new Date().toISOString(), a: tag.account_uuid, o: tag.org_uuid },
      },
    }).catch((e) => {
      if (isConflict(e)) throw new StaleWriteError(`read position of ${sessionId.slice(0, 8)} was changed by another writer; retrying`);
      // 404: an empty transcript has no read position yet
    });
  }
  const what = `${where}  +${n} messages${linked ? ` · ${linked} more linked to the account` : ''}`;
  if (n || linked) log(hook ? `hook: ${what}` : what);
  return { added: n, linked, slug, sessionId };
}

/** Per-project overview for the Sync panel. */
async function projectOverview() {
  const files = listFiles();
  const state = await loadAllState();
  const agg = await es('POST', `/${INDEX_LOG}/_search`, {
    size: 0,
    aggs: { p: { terms: { field: 'project', size: 1000 } } },
  });
  const indexed = new Map(agg.aggregations.p.buckets.map((b) => [b.key, b.doc_count]));
  const projects = new Map();
  for (const f of files) {
    const s = state.get(stateId(f));
    let p = projects.get(f.slug);
    if (!p) {
      p = { slug: f.slug, name: projectNameFromSlug(f.slug), path: null, sessions: 0, indexed: indexed.get(f.slug) || 0, pending: 0, lastActivity: 0, lastSynced: null };
      projects.set(f.slug, p);
    }
    p.sessions++;
    const cwd = s?.cwd || (!p.path && peekCwd(f.path));
    if (cwd && !p.path) { p.path = cwd; p.name = path.basename(cwd); }
    p.lastActivity = Math.max(p.lastActivity, f.mtime);
    if (s?.updated_at && (!p.lastSynced || s.updated_at > p.lastSynced)) p.lastSynced = s.updated_at;
    p.pending += await countPending(f, s);
  }
  return [...projects.values()]
    .map((p) => ({ ...p, excluded: settings.excluded.includes(p.slug) }))
    .sort((a, b) => b.lastActivity - a.lastActivity);
}

/** Pushed chunk from a job: { start, end, data, skipped } (data travels gzipped + base64). */
function jobChunk(job) {
  return { start: job.start, end: job.end, skipped: !!job.skipped, data: job.skipped ? '' : zlib.gunzipSync(Buffer.from(job.gz, 'base64')).toString('utf8') };
}

module.exports = {
  log, WORKER, StaleWriteError, GapError, jobChunk, readState, saveState,
  loadSettings, saveSettings, getSettings,
  listFiles, planSync, parseHostPath, ingestSession, backfillImages, backfillUsage, deleteData, projectOverview,
};
