const { ES_URL, INDEX_LOG, INDEX_STATE, INDEX_SETTINGS, INDEX_IMAGES, INDEX_USAGE, INDEX_USERS, INDEX_ORGS, INDEX_MEMBERS, INDEX_PROJECTS, INDEX_PRICES, INDEX_DEVICES } = require('./config');

async function es(method, path, body, { ndjson = false, allow404 = false } = {}) {
  const res = await fetch(ES_URL + path, {
    method,
    headers: { 'Content-Type': ndjson ? 'application/x-ndjson' : 'application/json' },
    body: body === undefined ? undefined : ndjson ? body : JSON.stringify(body),
  });
  if (allow404 && res.status === 404) return null;
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = json?.error?.reason || json?.error?.type || res.statusText;
    throw new Error(`ES ${method} ${path} -> ${res.status}: ${reason}`);
  }
  return json;
}

async function waitForEs() {
  for (;;) {
    try {
      const h = await es('GET', '/_cluster/health');
      if (h.status !== 'red') return;
    } catch {}
    await new Promise((r) => setTimeout(r, 2000));
  }
}

async function ensureIndices(dims) {
  const existing = await es('GET', `/${INDEX_LOG}/_mapping`, undefined, { allow404: true });
  if (!existing) {
    await es('PUT', `/${INDEX_LOG}`, {
      settings: { number_of_shards: 1, number_of_replicas: 0 },
      mappings: {
        properties: {
          project: { type: 'keyword' },
          project_name: { type: 'keyword' },
          project_path: { type: 'keyword' },
          session_id: { type: 'keyword' },
          role: { type: 'keyword' },
          text: { type: 'text' },
          timestamp: { type: 'date' },
          seq: { type: 'long' },
          prompt_uuid: { type: 'keyword' },
          git_branch: { type: 'keyword' },
          embedding: { type: 'dense_vector', dims, index: true, similarity: 'cosine' },
        },
      },
    }).catch((e) => { if (!/resource_already_exists/.test(e.message)) throw e; }); // API and workers start together
  } else {
    const have = existing[INDEX_LOG]?.mappings?.properties?.embedding?.dims;
    if (have && have !== dims) {
      throw new Error(
        `Index ${INDEX_LOG} has embedding dims=${have} but model gives ${dims}. ` +
          `Changing the model needs a new index; delete ${INDEX_LOG} and ${INDEX_STATE} manually and restart.`
      );
    }
  }
  // Image refs live only in _source (no need to index them). Account links are keywords for filtering.
  await es('PUT', `/${INDEX_LOG}/_mapping`, { properties: {
    images: { type: 'object', enabled: false },
    account_uuid: { type: 'keyword' }, org_uuid: { type: 'keyword' },
  } });

  for (const [name, props] of [
    [INDEX_STATE, {
      file: { type: 'keyword' }, project: { type: 'keyword' }, session_id: { type: 'keyword' },
      byte_offset: { type: 'long' }, size: { type: 'long' }, title: { type: 'keyword' },
      cwd: { type: 'keyword' }, last_prompt_uuid: { type: 'keyword' }, updated_at: { type: 'date' },
    }],
    [INDEX_SETTINGS, {}],
    [INDEX_PROJECTS, { slug: { type: 'keyword' }, title: { type: 'keyword' }, updated_at: { type: 'date' } }],
    [INDEX_USERS, {
      account_uuid: { type: 'keyword' }, kind: { type: 'keyword' }, email: { type: 'keyword' },
      display_name: { type: 'keyword' }, full_name: { type: 'keyword' }, account_created_at: { type: 'date' },
      billing_type: { type: 'keyword' }, install_ids: { type: 'keyword' }, first_seen: { type: 'date' }, last_seen: { type: 'date' },
    }],
    [INDEX_ORGS, {
      org_uuid: { type: 'keyword' }, name: { type: 'keyword' }, type: { type: 'keyword' }, billing_type: { type: 'keyword' },
      first_seen: { type: 'date' }, last_seen: { type: 'date' },
    }],
    [INDEX_MEMBERS, {
      user_uuid: { type: 'keyword' }, org_uuid: { type: 'keyword' }, org_role: { type: 'keyword' },
      workspace_role: { type: 'keyword' }, seat_tier: { type: 'keyword' }, first_seen: { type: 'date' }, last_seen: { type: 'date' },
    }],
    [INDEX_USAGE, {
      project: { type: 'keyword' }, session_id: { type: 'keyword' }, model: { type: 'keyword' },
      timestamp: { type: 'date' }, input: { type: 'long' }, output: { type: 'long' },
      cache_write: { type: 'long' }, cache_read: { type: 'long' }, sidechain: { type: 'boolean' },
    }],
    [INDEX_DEVICES, {
      device_id: { type: 'keyword' }, tenant_id: { type: 'keyword' }, status: { type: 'keyword' }, secret_hash: { type: 'keyword', index: false },
      hostname: { type: 'keyword' }, email: { type: 'keyword' }, account_uuid: { type: 'keyword' }, org_uuid: { type: 'keyword' },
      session_id: { type: 'keyword' }, created_at: { type: 'date' }, decided_at: { type: 'date' }, last_seen_at: { type: 'date' },
    }],
    [INDEX_PRICES, { model: { type: 'keyword' }, price: { type: 'object', enabled: false }, updated_at: { type: 'date' } }],
    [INDEX_IMAGES, {
      message_id: { type: 'keyword' }, session_id: { type: 'keyword' }, project: { type: 'keyword' },
      media_type: { type: 'keyword' }, timestamp: { type: 'date' }, data: { type: 'binary' },
    }],
  ]) {
    const ok = await es('HEAD', `/${name}`, undefined, { allow404: true }).catch(() => null);
    if (!ok) {
      await es('PUT', `/${name}`, {
        settings: { number_of_shards: 1, number_of_replicas: 0 },
        mappings: { dynamic: true, properties: props },
      }).catch((e) => { if (!/resource_already_exists/.test(e.message)) throw e; });
    }
  }
  for (const name of [INDEX_USAGE, INDEX_IMAGES]) {
    await es('PUT', `/${name}/_mapping`, { properties: { account_uuid: { type: 'keyword' }, org_uuid: { type: 'keyword' } } });
  }
  await es('PUT', `/${INDEX_USAGE}/_mapping`, { properties: {
    cache_write_5m: { type: 'long' }, cache_write_1h: { type: 'long' }, speed: { type: 'keyword' }, geo: { type: 'keyword' }, cost: { type: 'double' },
  } });
  // which tenant pushed it (no isolation by tenant yet: that is step 3)
  for (const name of [INDEX_LOG, INDEX_STATE, INDEX_USAGE, INDEX_IMAGES]) {
    await es('PUT', `/${name}/_mapping`, { properties: { tenant_id: { type: 'keyword' } } });
  }
  await es('PUT', `/${INDEX_STATE}/_mapping`, { properties: {
    account_uuids: { type: 'keyword' }, org_uuids: { type: 'keyword' }, last_hook_at: { type: 'date' },
  } });
}

module.exports = { es, waitForEs, ensureIndices };
