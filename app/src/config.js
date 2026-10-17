module.exports = {
  ES_URL: process.env.ES_URL || 'http://localhost:9200',
  OLLAMA_URL: process.env.OLLAMA_URL || 'http://localhost:11434',
  EMBED_MODEL: process.env.EMBED_MODEL || 'nomic-embed-text',
  // nomic-embed-text expects task prefixes; set both to "" for models that don't.
  EMBED_DOC_PREFIX: process.env.EMBED_DOC_PREFIX ?? 'search_document: ',
  EMBED_QUERY_PREFIX: process.env.EMBED_QUERY_PREFIX ?? 'search_query: ',
  EMBED_MAX_CHARS: Number(process.env.EMBED_MAX_CHARS || 6000),
  EMBED_BATCH: Number(process.env.EMBED_BATCH || 16),
  PROJECTS_DIR: process.env.PROJECTS_DIR || require('path').join(require('os').homedir(), '.claude/projects'),
  PORT: Number(process.env.PORT || 4000),
  RABBIT_URL: process.env.RABBIT_URL || 'amqp://recall:recall@localhost:5672',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  // ingest jobs one worker runs at once (embedding is the bottleneck; add workers rather than raising this a lot)
  WORKER_PREFETCH: Number(process.env.WORKER_PREFETCH || 2),
  JOB_MAX_ATTEMPTS: Number(process.env.JOB_MAX_ATTEMPTS || 3), // then the job goes to the dead-letter queue
  LOCK_TTL_MS: Number(process.env.LOCK_TTL_MS || 30000), // a crashed worker's session lock frees itself after this

  // Local mode: the server also reads ~/.claude/projects from the read-only mount (Sync page, catch-up, backfills).
  // Off on a shared server: there the hooks push the lines (POST /api/push) and there is no mount.
  LOCAL_MODE: (process.env.LOCAL_MODE ?? 'true') !== 'false',
  // Requests without a device token count as tenant "local". Only for a server bound to 127.0.0.1.
  ALLOW_NO_AUTH: (process.env.ALLOW_NO_AUTH ?? 'true') !== 'false',
  // "tenant:token,tenant2:token2": the org enrollment tokens (sent by hooks, e.g. from managed settings)
  ENROLL_TOKENS: process.env.ENROLL_TOKENS || '',
  ADMIN_TOKEN: process.env.ADMIN_TOKEN || '', // approves devices on the Devices page
  TOKEN_TTL_S: Number(process.env.TOKEN_TTL_S || 86400), // device access token lifetime; renewed in the second half
  PUSH_MAX_BYTES: Number(process.env.PUSH_MAX_BYTES || 16 * 1024 * 1024), // one /api/push body, compressed or not

  // All indices are prefixed so they never collide with anything else in the cluster.
  INDEX_LOG: 'claude_chat_log',
  INDEX_STATE: 'claude_chat_ingest_state',
  INDEX_SETTINGS: 'claude_chat_settings',
  INDEX_IMAGES: 'claude_chat_images',
  INDEX_USAGE: 'claude_chat_usage',
  INDEX_USERS: 'claude_chat_users',
  INDEX_PROJECTS: 'claude_chat_projects',
  INDEX_ORGS: 'claude_chat_orgs',
  INDEX_MEMBERS: 'claude_chat_memberships',
  INDEX_PRICES: 'claude_chat_prices',
  INDEX_DEVICES: 'claude_chat_devices',
};
