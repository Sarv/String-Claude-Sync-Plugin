// Turns one Claude Code transcript line into zero or one chat record.
// Keeps: human prompts and Claude's text replies. Drops: tool calls/results,
// thinking, meta/system lines, sidechains (subagents), slash-command plumbing.
const { redact } = require('./redact');

const SKIP_PREFIXES = ['<command-name>', '<command-message>', '<local-command-stdout>', '<local-command-stderr>', '<local-command-caveat>'];
const SKIP_EXACT = new Set(['[Request interrupted by user]', '[Request interrupted by user for tool use]']);

function cleanUserText(s) {
  return s
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '')
    .replace(/<\/?pasted_content[^>]*>/g, '')
    .trim();
}

function userText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  if (content.some((b) => b.type === 'tool_result')) return '';
  return content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
}

// Images you pasted into a prompt (tool-result screenshots are not kept).
function userImages(content) {
  if (!Array.isArray(content) || content.some((b) => b.type === 'tool_result')) return [];
  return content
    .filter((b) => b.type === 'image' && b.source?.type === 'base64' && /^image\//.test(b.source.media_type || '') && b.source.data)
    .map((b) => ({ media_type: b.source.media_type, data: b.source.data }));
}

function assistantText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
}

/**
 * @param obj parsed JSON line
 * @param ctx mutable per-file context { title, cwd, gitBranch, lastPromptUuid }
 * @returns record (without project/session fields) or null
 */
function parseLine(obj, ctx) {
  if (obj.type === 'custom-title' && obj.customTitle) ctx.title = obj.customTitle;
  if (obj.type === 'summary' && obj.summary && !ctx.title) ctx.title = obj.summary;
  if (obj.cwd && !ctx.cwd) ctx.cwd = obj.cwd;
  if (obj.gitBranch) ctx.gitBranch = obj.gitBranch;

  if (obj.type !== 'user' && obj.type !== 'assistant') return null;
  if (obj.isMeta || obj.isSidechain || !obj.uuid || !obj.message) return null;

  let role, text;
  let images = [];
  if (obj.type === 'user') {
    text = cleanUserText(userText(obj.message.content));
    images = userImages(obj.message.content);
    if (!text && images.length) text = '[image]';
    if (!text || SKIP_EXACT.has(text) || SKIP_PREFIXES.some((p) => text.startsWith(p))) return null;
    role = 'user';
    ctx.lastPromptUuid = obj.uuid;
  } else {
    if (obj.message.model === '<synthetic>') return null;
    text = assistantText(obj.message.content).trim();
    if (!text) return null;
    role = 'assistant';
  }

  return {
    _id: obj.uuid,
    role,
    text: redact(text),
    timestamp: obj.timestamp,
    prompt_uuid: role === 'user' ? obj.uuid : ctx.lastPromptUuid || null,
    git_branch: ctx.gitBranch || null,
    _images: images,
  };
}

/**
 * Token usage of one API response. Claude Code writes one line per content block,
 * all carrying the same message.id, so the id is the dedup key (last line wins).
 * Sidechain (sub-agent) usage is kept too: it is real spend.
 */
function parseUsage(obj) {
  if (obj.type !== 'assistant' || !obj.message?.usage || !obj.message.id) return null;
  if (obj.message.model === '<synthetic>') return null;
  const u = obj.message.usage;
  return {
    _id: obj.message.id,
    model: obj.message.model || 'unknown',
    timestamp: obj.timestamp,
    input: u.input_tokens || 0,
    output: u.output_tokens || 0,
    cache_write: u.cache_creation_input_tokens || 0,
    // 5-minute and 1-hour cache writes are priced differently; older transcripts only have the total (= 5-minute)
    cache_write_5m: u.cache_creation ? u.cache_creation.ephemeral_5m_input_tokens || 0 : u.cache_creation_input_tokens || 0,
    cache_write_1h: u.cache_creation ? u.cache_creation.ephemeral_1h_input_tokens || 0 : 0,
    cache_read: u.cache_read_input_tokens || 0,
    speed: u.speed || 'standard',
    geo: u.inference_geo || null,
    sidechain: !!obj.isSidechain,
  };
}

module.exports = { parseLine, parseUsage };
