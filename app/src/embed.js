const { OLLAMA_URL, EMBED_MODEL, EMBED_DOC_PREFIX, EMBED_QUERY_PREFIX, EMBED_MAX_CHARS } = require('./config');

const status = { state: 'starting', detail: '' };

async function ensureModel(log) {
  for (;;) {
    try {
      const tags = await (await fetch(`${OLLAMA_URL}/api/tags`)).json();
      const has = (tags.models || []).some((m) => m.name === EMBED_MODEL || m.name === `${EMBED_MODEL}:latest`);
      if (has) break;
      status.state = 'downloading';
      status.detail = `Pulling ${EMBED_MODEL} (first run only)`;
      log(status.detail);
      const res = await fetch(`${OLLAMA_URL}/api/pull`, {
        method: 'POST',
        body: JSON.stringify({ model: EMBED_MODEL, stream: false }),
      });
      if (!res.ok) throw new Error(`pull failed: ${res.status} ${await res.text()}`);
    } catch (e) {
      status.state = 'waiting';
      status.detail = `Embedding service not ready: ${e.message}`;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  status.state = 'ready';
  status.detail = EMBED_MODEL;
}

async function embed(texts, kind = 'doc') {
  const prefix = kind === 'query' ? EMBED_QUERY_PREFIX : EMBED_DOC_PREFIX;
  const input = texts.map((t) => prefix + t.slice(0, EMBED_MAX_CHARS));
  const res = await fetch(`${OLLAMA_URL}/api/embed`, {
    method: 'POST',
    body: JSON.stringify({ model: EMBED_MODEL, input, truncate: true }),
  });
  if (!res.ok) throw new Error(`embed failed: ${res.status} ${await res.text()}`);
  const { embeddings } = await res.json();
  return embeddings;
}

module.exports = { embed, ensureModel, status };
