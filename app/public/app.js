(() => {
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const md = (s) => DOMPurify.sanitize(marked.parse(s || '', { gfm: true, breaks: false }));
  const fmt = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
  const ago = (iso) => {
    if (!iso) return 'Never';
    const s = (Date.now() - new Date(iso)) / 1000;
    if (s < 60) return 'Just now';
    if (s < 3600) return `${Math.floor(s / 60)} m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
    return `${Math.floor(s / 86400)} d ago`;
  };
  const num = (n) => Number(n || 0).toLocaleString('en-IN');
  const plural = (n, word) => `${num(n)} ${word}${Number(n) === 1 ? '' : 's'}`;
  const empty = (icon, title, text) =>
    `<div class="empty"><div class="art"><i class="bx bx-${icon} icon-36" aria-hidden="true"></i></div><h4>${esc(title)}</h4>${text ? `<p>${text}</p>` : ''}</div>`;
  async function api(path, opts = {}) {
    const res = await fetch(path, {
      ...opts,
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(json.error || json.code || res.statusText), { status: res.status, code: json.code });
    return json;
  }
  const LS = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  };

  // ---------- theme ----------
  const root = document.documentElement;
  const isDark = () => root.dataset.theme === 'dark' || (root.dataset.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  const themeIcon = () => ($('#theme-toggle i').className = `bx ${isDark() ? 'bx-sun' : 'bx-moon'} icon-20`);
  $('#theme-toggle').addEventListener('click', () => {
    root.dataset.theme = isDark() ? 'light' : 'dark';
    LS.set('theme', root.dataset.theme);
    Prefs.apply();
  });
  themeIcon();


  // ---------- background sync banner ----------
  const fmtBytes = (n) => (n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);
  // Live sync progress, shown only in the Sync page's health card (nothing elsewhere in the app).
  const JOB_LABEL = { hook: 'Saving the latest reply', 'auto-sync': 'Auto-sync', manual: 'Sync', 'startup catch-up': 'Catching up', delete: 'Deleting',
    'token usage backfill': 'Backfilling token usage', 'image backfill': 'Backfilling images', 'recalculate costs': 'Recalculating costs', sync: 'Sync' };
  function renderProgress(running, p) {
    const box = $('#sh-progress');
    const st = $('#sh-status');
    if (!running) {
      box.hidden = true;
      st.className = 'status';
      st.querySelector('.txt').textContent = 'Idle';
      return;
    }
    const label = JOB_LABEL[running] || running;
    st.className = 'status paused';
    st.querySelector('.txt').textContent = label;
    box.hidden = false;
    const track = box.querySelector('.progress-track');
    if (!p || !p.bytesTotal) {
      track.classList.add('indeterminate');
      $('#sh-progress-text').textContent = `${label} · preparing…`;
      $('#sh-progress-pct').textContent = '';
      return;
    }
    const pct = Math.min(100, (p.bytesDone / p.bytesTotal) * 100);
    track.classList.remove('indeterminate');
    $('#sh-progress-fill').style.width = `${pct.toFixed(1)}%`;
    let eta = '';
    const elapsed = (Date.now() - new Date(p.startedAt)) / 1000;
    if (p.bytesDone > 0 && elapsed > 5) {
      const left = (elapsed / p.bytesDone) * (p.bytesTotal - p.bytesDone);
      eta = left > 90 ? ` · about ${Math.round(left / 60)} min left` : ` · about ${Math.max(1, Math.round(left))} s left`;
    }
    $('#sh-progress-text').textContent = `${label}: ${p.current || '…'} · file ${Math.min(p.filesDone + 1, p.filesTotal)} of ${p.filesTotal} · ${num(p.added)} messages added${eta}`;
    $('#sh-progress-pct').textContent = `${Math.floor(pct)}% · ${fmtBytes(p.bytesDone)} of ${fmtBytes(p.bytesTotal)}`;
  }

  // ---------- health ----------
  let isReady = false;
  function setHealth(tone, text) {
    const el = $('#health');
    el.className = `status${tone ? ' ' + tone : ''}`;
    el.querySelector('.txt').textContent = text;
  }
  async function health() {
    try {
      const h = await api('/api/health');
      isReady = h.ready;
      if (h.error) setHealth('error', h.error);
      else if (!h.ready) setHealth('paused', h.embedding?.detail || 'Starting…');
      else setHealth('', 'Ready');
    } catch {
      isReady = false;
      setHealth('error', 'Service unreachable');
    }
    return isReady;
  }

  // ---------- skeleton loaders (design-system .skeleton) ----------
  const sk = (w = '100%', h = 12, cls = '') => `<span class="skeleton${cls ? ' ' + cls : ''}" style="width:${w};height:${h}px"></span>`;
  const Skel = {
    chat() {
      const row = (user, widths) => `<div class="chat-row${user ? ' user' : ''} sk-row"><div class="body">
        <div class="meta">${sk('64px', 10)}</div>
        <div class="bubble sk-bubble">${widths.map((w) => sk(w, 11)).join('')}</div></div></div>`;
      return row(true, ['70%', '45%']) + row(false, ['95%', '88%', '92%', '60%']) + row(true, ['55%']) + row(false, ['90%', '96%', '40%']);
    },
    rows(cols, n = 6) {
      return Array.from({ length: n }, () => `<tr class="sk-tr">${Array.from({ length: cols }, (_, i) =>
        `<td>${i === 0 ? `<div class="sk-cell">${sk('60%', 12)}${sk('85%', 9)}</div>` : sk(i === cols - 1 ? '48px' : '36px', 12)}</td>`).join('')}</tr>`).join('');
    },
    table(title, cols, n = 6) {
      return `<div class="table-card"><div class="card-head"><div>${sk('120px', 16)}${sk('90px', 10, 'sk-sub')}</div></div>
        <div class="table-scroll"><table class="ds compact"><tbody>${this.rows(cols, n)}</tbody></table></div></div>`;
    },
    stats() {
      return `<div class="grid-auto stat-grid">${Array.from({ length: 8 }, () => `<div class="stat-card">${sk('70px', 10)}${sk('90px', 26)}${sk('110px', 9)}</div>`).join('')}</div>
        <div class="grid-2 st-charts">${[0, 1].map(() => `<div class="card"><div class="card-head"><div>${sk('140px', 16)}${sk('200px', 10, 'sk-sub')}</div></div><div class="card-pad">${sk('100%', 200, 'block')}</div></div>`).join('')}</div>
        ${this.table('', 9, 5)}`;
    },
    nav(n = 3) { return `<div class="sk-nav">${Array.from({ length: n }, (_, i) => sk(`${[78, 64, 70][i % 3]}%`, 10)).join('')}</div>`; },
    cards(n = 3) { return Array.from({ length: n }, () => `<div class="card"><div class="card-pad sk-card">${sk('180px', 10)}${sk('100%', 11)}${sk('94%', 11)}${sk('60%', 11)}</div></div>`).join(''); },
  };

  // ---------- shared chat rendering ----------
  const images = (list) =>
    list?.length
      ? `<div class="chat-images">${list.map((im) => `<a href="/api/image/${encodeURIComponent(im.id)}" target="_blank" rel="noopener"><img src="/api/image/${encodeURIComponent(im.id)}" alt="Pasted image" loading="lazy"></a>`).join('')}</div>`
      : '';
  function renderMessages(messages, { showAccount = false } = {}) {
    let lastDay = '';
    return messages.map((m) => {
      const d = new Date(m.timestamp);
      const day = d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
      const dayRow = day !== lastDay ? `<div class="chat-day">${esc(day)}</div>` : '';
      lastDay = day;
      const user = m.role === 'user';
      const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      return `${dayRow}<div class="chat-row${user ? ' user' : ''}" data-mid="${esc(m.id)}">
          <div class="body">
            <div class="meta"><span class="who-ico" aria-hidden="true"><i class="bx ${user ? 'bx-user' : 'bx-bot'}"></i></span><span class="who-name">${user ? 'You' : 'Claude'}</span>${showAccount && user ? `<span class="msg-account" title="Logged-in account">${esc(m.account || 'not linked')}</span>` : ''}<span>${time}</span></div>
            <div class="bubble${user ? '' : ' md-prose'}">${user ? esc(m.text) : md(m.text)}</div>
            ${images(m.images)}
          </div>
        </div>`;
    }).join('');
  }

  // ---------- sidebar: project → sessions tree ----------
  const SESSIONS_SHOWN = 12;
  const Tree = {
    projects: [],
    sessions: new Map(), // project slug → sessions[]
    open: new Set(JSON.parse(LS.get('tree.open') || '[]')),
    showAll: new Set(),
    /** After new data: reload only what is visible for that project. */
    async refreshProject(slug) {
      if (!this.projects.some((p) => p.slug === slug)) return this.loadProjects({ withSessions: false });
      if (this.open.has(slug)) { await this.loadSessions(slug); this.render(); }
      else this.sessions.delete(slug); // stale; fetched again when the group is opened
    },
    async loadProjects({ withSessions = true } = {}) {
      const { projects } = await api('/api/projects');
      this.projects = projects;
      const keep = $('#s-project').value;
      $('#s-project').innerHTML = '<option value="">All projects</option>' + projects.map((p) => `<option value="${esc(p.slug)}">${esc(p.name)}</option>`).join('');
      $('#s-project').value = keep;
      // sessions of open groups (only when asked: boot, delete)
      if (withSessions) await Promise.all([...this.open].filter((s) => projects.some((p) => p.slug === s)).map((s) => this.loadSessions(s)));
      this.render();
    },
    async loadSessions(slug) {
      const { sessions } = await api(`/api/sessions?project=${encodeURIComponent(slug)}`);
      this.sessions.set(slug, sessions);
    },
    async toggle(slug, force) {
      const willOpen = force ?? !this.open.has(slug);
      if (willOpen) {
        this.open.add(slug);
        if (!this.sessions.has(slug)) {
          this.render(); // show the group expanding right away
          await this.loadSessions(slug);
        }
      } else this.open.delete(slug);
      LS.set('tree.open', JSON.stringify([...this.open]));
      this.render();
    },
    render() {
      const shown = Panes.list.map((p) => p.session);
      const activeSession = currentTab === 'chat' ? Panes.active()?.session : null;
      $('#nav-projects').innerHTML = this.projects.map((p) => {
        const isOpen = this.open.has(p.slug);
        const list = this.sessions.get(p.slug);
        const has = shown.length && list?.some((s) => shown.includes(s.id));
        const all = this.showAll.has(p.slug);
        const visible = list ? (all ? list : list.slice(0, SESSIONS_SHOWN)) : [];
        const sub = !isOpen ? '' : `<div class="nav-sub" role="group" aria-label="${esc(p.name)} sessions">${
          !list ? Skel.nav()
          : visible.map((s) => `
            <div class="nav-sub-row">
              <a class="sh-nav-item${s.id === activeSession ? ' active' : shown.includes(s.id) ? ' open-elsewhere' : ''}" href="#/chat" data-session="${esc(s.id)}" data-project="${esc(p.slug)}" title="${esc(s.title)} · ${plural(s.messages, 'message')} · ${ago(s.last).toLowerCase()}"${s.id === activeSession ? ' aria-current="page"' : ''}><span>${esc(s.title)}</span></a>
              <button class="icon-btn sm nav-split" type="button" data-split="${esc(s.id)}" data-project="${esc(p.slug)}" aria-label="Open in new pane" data-tip="Open in new pane" data-tip-pos="right"><i class="bx bx-dock-right" aria-hidden="true"></i></button>
            </div>`).join('') + (list.length > SESSIONS_SHOWN ? `<div class="nav-more"><button type="button" data-more="${esc(p.slug)}">${all ? 'Show fewer' : `Show all ${list.length}`}</button></div>` : '')
        }</div>`;
        return `<button class="sh-nav-item nav-group${has ? ' has-open' : ''}" type="button" data-group="${esc(p.slug)}" aria-expanded="${isOpen}" data-tip="${esc(p.name)}" data-tip-pos="right" title="${esc(p.path || p.name)} · ${plural(p.sessions, 'session')}">
            <i class="bx ${isOpen ? 'bx-folder-open' : 'bx-folder'} icon-18" aria-hidden="true"></i><span>${esc(p.name)}</span>
            <i class="bx ${isOpen ? 'bx-chevron-up' : 'bx-chevron-down'} chev icon-16" aria-hidden="true"></i>
          </button>${sub}`;
      }).join('') || '<div class="sh-nav-label">Nothing synced yet</div>';
    },
  };
  $('#nav-projects').addEventListener('click', (e) => {
    const group = e.target.closest('[data-group]');
    if (group) {
      // on the icon rail, a project click opens the sidebar and its group
      if (Sidebar.collapsed) { Sidebar.set(false); Tree.toggle(group.dataset.group, true); return; }
      return Tree.toggle(group.dataset.group);
    }
    const more = e.target.closest('[data-more]');
    if (more) {
      const s = more.dataset.more;
      Tree.showAll.has(s) ? Tree.showAll.delete(s) : Tree.showAll.add(s);
      return Tree.render();
    }
    const split = e.target.closest('[data-split]');
    if (split) {
      e.preventDefault();
      Panes.open(split.dataset.split, { newPane: true });
      if (currentTab !== 'chat') location.hash = '#/chat';
      return;
    }
    const link = e.target.closest('[data-session]');
    if (link) {
      e.preventDefault();
      Panes.open(link.dataset.session, { newPane: e.metaKey || e.ctrlKey });
      if (currentTab !== 'chat') location.hash = '#/chat';
    }
  });

  // ---------- sidebar collapse ----------
  const Sidebar = {
    collapsed: false,
    narrow: matchMedia('(max-width: 860px)'),
    set(v, save = true) {
      this.collapsed = v;
      $('.sh-sidebar').classList.toggle('collapsed', v);
      const b = $('#sidebar-toggle');
      b.setAttribute('aria-label', v ? 'Expand sidebar' : 'Collapse sidebar');
      b.dataset.tip = v ? 'Expand sidebar' : 'Collapse sidebar';
      if (save) LS.set('sidebar.collapsed', v ? '1' : '0');
    },
  };
  Sidebar.set(Sidebar.narrow.matches || LS.get('sidebar.collapsed') === '1', false);
  Sidebar.narrow.addEventListener('change', (e) => Sidebar.set(e.matches || LS.get('sidebar.collapsed') === '1', false));
  $('#sidebar-toggle').addEventListener('click', () => Sidebar.set(!Sidebar.collapsed));

  // ---------- chat panes (1–3) ----------
  const MAX_PANES = 3;
  class Pane {
    constructor(session = null, weight = 1) {
      this.session = session;
      this.weight = weight; // share of the width in split view
      this.project = null;
      this.stick = true;
      this.el = document.createElement('section');
      this.el.className = 'card pane';
      this.el.innerHTML = `
        <div class="card-head pane-head"></div>
        <div class="chat-thread card-pad"></div>
        <div class="chat-jump">
          <button class="icon-btn" type="button" data-jump="top" aria-label="Scroll to first message" title="Scroll to first message" hidden><i class="bx bx-chevrons-up icon-20" aria-hidden="true"></i></button>
          <button class="icon-btn" type="button" data-jump="bottom" aria-label="Scroll to latest message" title="Scroll to latest message" hidden><i class="bx bx-chevrons-down icon-20" aria-hidden="true"></i></button>
        </div>`;
      this.head = this.el.querySelector('.pane-head');
      this.chat = this.el.querySelector('.chat-thread');
      this.chat.tabIndex = -1; // focusable, so arrow and Page keys scroll this pane
      this.top = this.el.querySelector('[data-jump=top]');
      this.bottom = this.el.querySelector('[data-jump=bottom]');
      // only an actual move up un-pins; reflow from a width change never does
      this.lastTop = 0;
      this.chat.addEventListener('scroll', () => {
        const t = this.chat.scrollTop;
        if (this.nearBottom()) this.stick = true;
        else if (t < this.lastTop - 2) this.stick = false;
        this.lastTop = t;
        this.updateJump();
      }, { passive: true });
      // pane width changes (split/close/sidebar/window) reflow the text: stay pinned to the latest message
      new ResizeObserver(() => { if (this.stick) this.toBottom(); this.updateJump(); }).observe(this.chat);
      this.top.addEventListener('click', () => { this.stick = false; this.chat.scrollTo({ top: 0, behavior: 'smooth' }); });
      this.bottom.addEventListener('click', () => { this.stick = true; this.toBottom(true); });
      this.el.addEventListener('mousedown', () => Panes.activate(this));
      this.el.addEventListener('focusin', () => Panes.activate(this));
      this.head.addEventListener('click', (e) => {
        if (e.target.closest('[data-close]')) Panes.close(this);
        if (e.target.closest('[data-delete]') && this.session) {
          Delete.run({ kind: 'session', id: this.session, name: this.meta?.title || this.session.slice(0, 8), counts: this.count ? plural(this.count, 'message') : '' });
        }
      });
    }
    nearBottom() { return this.chat.scrollHeight - this.chat.scrollTop - this.chat.clientHeight < 80; }
    toBottom(smooth = false) { this.chat.scrollTo({ top: this.chat.scrollHeight, behavior: smooth ? 'smooth' : 'auto' }); }
    updateJump() {
      const scrollable = this.chat.scrollHeight > this.chat.clientHeight + 40;
      this.top.hidden = !scrollable || this.chat.scrollTop < 200;
      this.bottom.hidden = !scrollable || this.nearBottom();
    }
    renderHead(meta) {
      meta = meta || {};
      const closable = Panes.list.length > 1;
      const del = this.session ? '<button class="icon-btn sm" type="button" data-delete aria-label="Delete this session from Claude Recall" title="Delete this session from Claude Recall"><i class="bx bx-trash" aria-hidden="true"></i></button>' : '';
      const actions = `<div class="pane-actions">${del}${closable ? '<button class="icon-btn sm" type="button" data-close aria-label="Close pane" title="Close pane"><i class="bx bx-x" aria-hidden="true"></i></button>' : ''}</div>`;
      if (!this.session) {
        this.head.innerHTML = `<div><h3>Empty pane</h3><p class="card-sub">Pick a session in the sidebar.</p></div>${actions}`;
        return;
      }
      this.head.innerHTML = `<div><h3 title="${esc(meta.title || this.session)}">${esc(meta.title || this.session)}</h3>
        <p class="card-sub">${meta.projectName ? `<span class="chip grey"><i class="bx bx-folder icon-12" aria-hidden="true"></i> ${esc(meta.projectName)}</span>` : ''}${
          (meta.accounts || []).length ? `<span class="chip grey" title="${esc(meta.accounts.map((a) => `${a.email || a.name}${a.org ? ` · ${a.org}` : ''}`).join('\n'))}"><i class="bx bx-user icon-12" aria-hidden="true"></i> ${
            meta.accounts.length > 1 ? `${meta.accounts.length} accounts` : esc(meta.accounts[0].email || meta.accounts[0].name)}</span>` : ''}
        <span class="when" title="${fmt(meta.first)} – ${fmt(meta.last)}">${fmt(meta.first)} – ${fmt(meta.last)}</span><span class="mono">${esc(this.session.slice(0, 8))}</span></p></div>${actions}`;
    }
    /** refresh=true re-renders in place (after a sync) and keeps the reader's position. */
    async load({ refresh = false, focus = null } = {}) {
      this.renderHead(this.meta);
      if (!this.session) {
        this.chat.innerHTML = empty('message-detail', 'Nothing open here', 'Click a session in the sidebar to read it in this pane.');
        this.updateJump();
        return;
      }
      const prevTop = this.chat.scrollTop;
      if (!refresh) this.chat.innerHTML = Skel.chat();
      const session = this.session;
      const { messages, title, accounts = [] } = await api(`/api/session/${encodeURIComponent(session)}`);
      if (session !== this.session) return; // switched while loading
      const first = messages[0];
      this.count = messages.length;
      this.project = first?.project || this.project;
      this.meta = {
        title: title || messages.find((m) => m.role === 'user')?.text.slice(0, 120) || session,
        projectName: first?.project_name,
        accounts,
        first: first?.timestamp,
        last: messages[messages.length - 1]?.timestamp,
      };
      this.renderHead(this.meta);
      this.chat.innerHTML = renderMessages(messages, { showAccount: accounts.length > 1 }) || empty('message-detail', 'Empty session', 'This session has no prompts or replies yet.');
      // auto-scroll: open at the latest message; on refresh stay put unless already at the bottom
      if (refresh && !this.stick) this.chat.scrollTop = prevTop;
      else { this.stick = true; this.toBottom(); }
      this.chat.querySelectorAll('img').forEach((img) => img.addEventListener('load', () => this.stick && this.toBottom(), { once: true }));
      if (focus) this.focus(focus);
      this.updateJump();
    }
    focus(id) {
      const el = this.chat.querySelector(`[data-mid="${CSS.escape(id)}"]`);
      if (!el) return;
      this.stick = false;
      el.scrollIntoView({ block: 'center' });
      this.lastTop = this.chat.scrollTop;
      el.classList.remove('flash', 'fade');
      void el.offsetWidth;
      el.classList.add('flash');
      setTimeout(() => el.classList.add('fade'), 1200);
    }
  }

  const Panes = {
    list: [],
    activeIdx: 0,
    active() { return this.list[this.activeIdx]; },
    save() {
      LS.set('panes', JSON.stringify(this.list.map((p) => p.session)));
      LS.set('panes.weights', JSON.stringify(this.list.map((p) => +p.weight.toFixed(4))));
      LS.set('panes.active', String(this.activeIdx));
    },
    restore() {
      let saved = [];
      try { saved = JSON.parse(LS.get('panes') || '[]'); } catch {}
      let weights = [];
      try { weights = JSON.parse(LS.get('panes.weights') || '[]'); } catch {}
      this.list = (saved.length ? saved : [null]).slice(0, MAX_PANES).map((s, i) => new Pane(s, weights[i] > 0 ? weights[i] : 1));
      this.activeIdx = Math.min(Number(LS.get('panes.active')) || 0, this.list.length - 1);
      this.layout();
    },
    layout() {
      const box = $('#panes');
      // re-inserting nodes resets their scroll, so remember where each reader was
      const tops = this.list.map((p) => p.chat.scrollTop);
      box.style.setProperty('--panes', this.list.length);
      box.classList.toggle('multi', this.list.length > 1);
      const nodes = [];
      this.list.forEach((p, i) => {
        p.el.style.setProperty('--w', p.weight);
        if (i) nodes.push(this.resizer(i));
        nodes.push(p.el);
      });
      box.replaceChildren(...nodes);
      this.list.forEach((p, i) => (p.stick ? p.toBottom() : (p.chat.scrollTop = tops[i])));
      this.list.forEach((p, i) => p.el.classList.toggle('active', i === this.activeIdx));
      const add = $('#pane-add');
      add.disabled = this.list.length >= MAX_PANES;
      add.title = add.disabled ? 'Up to 3 panes' : 'Add a pane next to this one';
      this.list.forEach((p) => { p.renderHead(p.meta); p.updateJump(); });
      Tree.render();
    },
    /** Hairline between pane i-1 and pane i: drag to resize, double-click to make all equal, arrows nudge. */
    resizer(i) {
      const r = document.createElement('div');
      r.className = 'pane-resizer';
      r.tabIndex = 0;
      r.setAttribute('role', 'separator');
      r.setAttribute('aria-orientation', 'vertical');
      r.setAttribute('aria-label', 'Resize panes');
      r.title = 'Drag to resize · double-click to make equal';
      const pair = () => [this.list[i - 1], this.list[i]];
      const setLeftPx = (leftPx, totalPx, wSum) => {
        const [a, b] = pair();
        const min = Math.min(240, totalPx / 2);
        const l = Math.max(min, Math.min(totalPx - min, leftPx));
        a.weight = (l / totalPx) * wSum;
        b.weight = wSum - a.weight;
        a.el.style.setProperty('--w', a.weight);
        b.el.style.setProperty('--w', b.weight);
      };
      r.addEventListener('pointerdown', (e) => {
        const [a, b] = pair();
        const startX = e.clientX;
        const aPx = a.el.getBoundingClientRect().width;
        const totalPx = aPx + b.el.getBoundingClientRect().width;
        const wSum = a.weight + b.weight;
        r.setPointerCapture(e.pointerId);
        r.classList.add('dragging');
        document.body.classList.add('resizing');
        const move = (ev) => setLeftPx(aPx + ev.clientX - startX, totalPx, wSum);
        const up = () => {
          r.removeEventListener('pointermove', move);
          r.classList.remove('dragging');
          document.body.classList.remove('resizing');
          this.save();
        };
        r.addEventListener('pointermove', move);
        r.addEventListener('pointerup', up, { once: true });
        r.addEventListener('pointercancel', up, { once: true });
      });
      r.addEventListener('dblclick', () => {
        this.list.forEach((p) => { p.weight = 1; p.el.style.setProperty('--w', 1); });
        this.save();
      });
      r.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        const [a, b] = pair();
        const aPx = a.el.getBoundingClientRect().width;
        const totalPx = aPx + b.el.getBoundingClientRect().width;
        setLeftPx(aPx + (e.key === 'ArrowLeft' ? -32 : 32), totalPx, a.weight + b.weight);
        this.save();
      });
      return r;
    },
    /** ← / → moves to the neighbouring pane and focuses its thread, so ↑ ↓ / Page keys scroll that pane. */
    step(dir) {
      const i = Math.max(0, Math.min(this.activeIdx + dir, this.list.length - 1));
      if (i === this.activeIdx) return;
      this.activate(this.list[i]);
      this.list[i].chat.focus({ preventScroll: true });
    },
    activate(pane) {
      const i = this.list.indexOf(pane);
      if (i < 0 || i === this.activeIdx) return;
      this.activeIdx = i;
      this.list.forEach((p, j) => p.el.classList.toggle('active', j === i));
      this.save();
      Tree.render();
    },
    add(session = null) {
      if (this.list.length >= MAX_PANES) return null;
      const avg = this.list.reduce((s, p) => s + p.weight, 0) / this.list.length;
      const pane = new Pane(session, avg);
      this.list.splice(this.activeIdx + 1, 0, pane);
      this.activeIdx += 1;
      this.layout();
      this.save();
      pane.load().catch(() => {});
      return pane;
    },
    close(pane) {
      if (this.list.length <= 1) return;
      const i = this.list.indexOf(pane);
      this.list.splice(i, 1);
      this.activeIdx = Math.max(0, Math.min(this.activeIdx >= i ? this.activeIdx - 1 : this.activeIdx, this.list.length - 1));
      this.layout();
      this.save();
      this.list.forEach((p) => p.updateJump());
    },
    /** Opens a session in the active pane, or a new pane (falls back to the active one at 3 panes). */
    open(session, { newPane = false, focus = null } = {}) {
      const already = this.list.find((p) => p.session === session);
      if (already && !newPane) {
        this.activate(already);
        if (focus) already.focus(focus);
        return;
      }
      if (newPane && this.list.length < MAX_PANES) {
        const pane = this.add(null);
        pane.session = session;
        pane.meta = null;
        this.save();
        pane.load({ focus }).then(() => Tree.render()).catch(() => {});
        return;
      }
      const pane = this.active();
      pane.session = session;
      pane.meta = null;
      this.save();
      Tree.render();
      pane.load({ focus }).then(() => Tree.render()).catch((e) => (pane.chat.innerHTML = empty('error-circle', 'Couldn’t load this session', esc(e.message))));
    },
    loadAll() { return Promise.all(this.list.map((p) => p.load().catch(() => {}))); },
    refreshAll() { return Promise.all(this.list.filter((p) => p.session).map((p) => p.load({ refresh: true }).catch(() => {}))); },
  };
  $('#pane-add').addEventListener('click', () => Panes.add(null));

  // ---------- settings (per browser) ----------
  const Prefs = {
    fontSize() { return Number(LS.get('chat.fontSize')) || 15; },
    apply() {
      root.style.setProperty('--chat-fs', `${this.fontSize()}px`);
      const mark = (sel, v) => document.querySelectorAll(`${sel} .seg-btn`).forEach((b) => {
        const on = b.dataset.v === String(v);
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', on);
      });
      mark('#set-font', this.fontSize());
      mark('#set-theme', root.dataset.theme || 'system');
      themeIcon();
    },
  };
  $('#set-font').addEventListener('click', (e) => {
    const b = e.target.closest('.seg-btn');
    if (!b) return;
    LS.set('chat.fontSize', b.dataset.v);
    Prefs.apply();
  });
  $('#set-theme').addEventListener('click', (e) => {
    const b = e.target.closest('.seg-btn');
    if (!b) return;
    root.dataset.theme = b.dataset.v;
    LS.set('theme', b.dataset.v);
    Prefs.apply();
  });

  // ---------- toasts ----------
  function toast(title, message = '', tone = 'success') {
    const icon = { success: 'check', danger: 'error-circle', info: 'info-circle', warning: 'error' }[tone];
    const el = document.createElement('div');
    el.className = `toast ${tone}`;
    el.setAttribute('role', tone === 'danger' ? 'alert' : 'status');
    el.innerHTML = `<span class="toast-ico"><i class="bx bx-${icon} icon-16" aria-hidden="true"></i></span>
      <div class="toast-body"><div class="toast-title">${esc(title)}</div>${message ? `<div class="toast-msg">${esc(message)}</div>` : ''}</div>
      <button class="btn-close" aria-label="Dismiss"><i class="bx bx-x icon-14" aria-hidden="true"></i></button>`;
    const close = () => { el.classList.add('leaving'); setTimeout(() => el.remove(), 200); };
    el.querySelector('.btn-close').addEventListener('click', close);
    $('#toasts').appendChild(el);
    setTimeout(close, 6000);
  }

  // ---------- delete (Claude Recall's copy only) ----------
  const Delete = {
    /** kind: 'session' | 'project'. Resolves after the dialog closes. */
    ask({ kind, id, name, counts }) {
      return new Promise((resolve) => {
        const isProject = kind === 'project';
        const root = $('#modal-root');
        const what = isProject ? 'project' : 'session';
        const opt = (v, title, hint, checked) => `<label class="opt-card${checked ? ' selected' : ''}">
            <input type="radio" class="radio" name="del-mode" value="${v}"${checked ? ' checked' : ''}>
            <span class="opt-body"><span class="opt-title">${title}</span><span class="hint">${hint}</span></span></label>`;
        root.innerHTML = `
          <div class="modal-backdrop">
            <div class="card modal-dialog modal-md" role="dialog" aria-modal="true" aria-labelledby="del-title">
              <div class="modal-head">
                <div class="ico danger"><i class="bx bx-trash icon-18" aria-hidden="true"></i></div>
                <div class="text"><h4 id="del-title">Delete ${isProject ? 'project' : 'session'} “${esc(name)}”?</h4>
                  <p>This removes ${counts ? `its ${esc(counts)}` : 'its messages'}, images and token history from Claude Recall. Your Claude Code transcripts stay as they are.</p></div>
                <button class="close" type="button" aria-label="Close" data-cancel><i class="bx bx-x icon-16" aria-hidden="true"></i></button>
              </div>
              <div class="modal-body del-options" role="radiogroup" aria-label="After deleting">
                <div class="label">After deleting</div>
                ${opt('keep', 'Keep it out', `The deleted messages won’t come back.${isProject ? ' New sessions in this project will still be saved.' : ' New messages in this session will still be saved.'}`, true)}
                ${opt('reindex', 'Bring it back on the next sync', `Rebuilds this ${what} from the transcripts. Use this to re-index it from scratch.`, false)}
                ${isProject ? opt('exclude', 'Stop saving this project', 'The deleted messages won’t come back, and nothing new from this project will be saved. You can include it again on the Sync page.', false) : ''}
              </div>
              <div class="modal-foot">
                <button class="btn btn-custom-secondary" type="button" data-cancel>Cancel</button>
                <button class="btn btn-danger" type="button" data-ok><i class="bx bx-trash" aria-hidden="true"></i> Delete ${what}</button>
              </div>
            </div>
          </div>`;
        root.querySelectorAll('input[name=del-mode]').forEach((r) => r.addEventListener('change', () =>
          root.querySelectorAll('.opt-card').forEach((c) => c.classList.toggle('selected', c.querySelector('input').checked))));
        const done = (ok) => {
          const mode = root.querySelector('input[name=del-mode]:checked')?.value || 'keep';
          const res = ok ? { ok, forget: mode === 'reindex', exclude: mode === 'exclude' } : { ok: false };
          root.innerHTML = '';
          document.removeEventListener('keydown', onKey);
          resolve(res);
        };
        const onKey = (e) => { if (e.key === 'Escape') done(false); };
        document.addEventListener('keydown', onKey);
        root.querySelector('.modal-backdrop').addEventListener('mousedown', (e) => { if (e.target === e.currentTarget) done(false); });
        root.querySelectorAll('[data-cancel]').forEach((b) => b.addEventListener('click', () => done(false)));
        root.querySelector('[data-ok]').addEventListener('click', () => done(true));
        root.querySelector('[data-cancel].btn').focus();
      });
    },
    async run({ kind, id, name, counts }) {
      const ans = await this.ask({ kind, id, name, counts });
      if (!ans.ok) return;
      const qs = new URLSearchParams({ ...(ans.forget ? { forget: '1' } : {}), ...(ans.exclude ? { exclude: '1' } : {}) });
      try {
        const r = await api(`/api/${kind}/${encodeURIComponent(id)}?${qs}`, { method: 'DELETE' });
        toast(kind === 'project' ? 'Project deleted' : 'Session deleted',
          `Removed ${plural(r.messages, 'message')}, ${plural(r.images, 'image')} and ${plural(r.usage, 'token record')}.` +
          (ans.forget ? ' It will be rebuilt on the next sync.' : ans.exclude ? ' This project won’t be saved any more.' : ''));
        // clear panes that showed the deleted data
        Panes.list.forEach((p) => {
          if ((kind === 'session' && p.session === id) || (kind === 'project' && p.project === id)) { p.session = null; p.meta = null; p.load(); }
        });
        Panes.save();
        if (kind === 'project') Tree.sessions.delete(id);
        await Tree.loadProjects().catch(() => {});
        if (currentTab === 'sync') Sync.refresh();
        if (currentTab === 'stats') Stats.load();
      } catch (e) {
        toast('Couldn’t delete', e.message, 'danger');
      }
    },
  };

  // ---------- project titles ----------
  const Rename = {
    async run(slug) {
      let info = (await api(`/api/projects/all?q=${encodeURIComponent(slug)}&size=100`).catch(() => ({ rows: [] }))).rows.find((r) => r.slug === slug);
      info = info || { slug, name: slug, folder: slug, title: null, path: '' };
      const root = $('#modal-root');
      root.innerHTML = `
        <div class="modal-backdrop">
          <form class="card modal-dialog modal-md" role="dialog" aria-modal="true" aria-labelledby="rn-title">
            <div class="modal-head">
              <div class="ico"><i class="bx bx-edit-alt icon-18" aria-hidden="true"></i></div>
              <div class="text"><h4 id="rn-title">Project title</h4><p>Shown everywhere in Claude Recall instead of the folder name.</p></div>
              <button class="close" type="button" aria-label="Close" data-cancel><i class="bx bx-x icon-16" aria-hidden="true"></i></button>
            </div>
            <div class="modal-body">
              <div class="field">
                <label class="label" for="rn-input">Title</label>
                <input class="input" id="rn-input" maxlength="80" value="${esc(info.title || '')}" placeholder="${esc(info.folder)}" autocomplete="off" />
                <span class="hint">Folder: <span class="mono">${esc(info.folder)}</span>${info.path ? ` · ${esc(info.path)}` : ''}. Leave empty to use the folder name.</span>
              </div>
            </div>
            <div class="modal-foot">
              ${info.title ? '<button class="btn btn-header" type="button" data-clear>Use folder name</button><span class="spacer"></span>' : ''}
              <button class="btn btn-custom-secondary" type="button" data-cancel>Cancel</button>
              <button class="btn btn-custom-primary" type="submit">Save title</button>
            </div>
          </form>
        </div>`;
      const close = () => { root.innerHTML = ''; document.removeEventListener('keydown', onKey); };
      const onKey = (e) => { if (e.key === 'Escape') close(); };
      document.addEventListener('keydown', onKey);
      const save = async (title) => {
        try {
          const r = await api(`/api/project/${encodeURIComponent(slug)}/title`, { method: 'PUT', body: { title } });
          close();
          toast(r.title ? 'Project renamed' : 'Title removed', r.title ? `Now shown as “${r.title}”.` : `Shown as “${info.folder}” again.`);
          this.applied();
        } catch (e) { toast('Couldn’t save the title', e.message, 'danger'); }
      };
      root.querySelector('.modal-backdrop').addEventListener('mousedown', (e) => { if (e.target === e.currentTarget) close(); });
      root.querySelectorAll('[data-cancel]').forEach((b) => b.addEventListener('click', close));
      root.querySelector('[data-clear]')?.addEventListener('click', () => save(''));
      root.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); save($('#rn-input').value); });
      const input = $('#rn-input');
      input.focus();
      input.select();
    },
    // names come from the server, so re-fetch what is on screen
    applied() {
      Tree.loadProjects().catch(() => {});
      Panes.list.forEach((p) => p.session && p.load({ refresh: true }).catch(() => {}));
      if (currentTab === 'projects') ProjectsPage.load();
      if (currentTab === 'stats') Stats.load();
      if (currentTab === 'sync') Sync.refresh();
    },
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-rename-project]');
    if (b) { e.preventDefault(); Rename.run(b.dataset.renameProject); }
  });

  const ProjectsPage = {
    page: 1, size: 20, q: '', sort: 'last', timer: null,
    show() { this.load(); },
    async load() {
      $('#pj-rows').innerHTML = Skel.rows(9, Math.min(this.size, 8));
      let d;
      try {
        d = await api(`/api/projects/all?${new URLSearchParams({ page: this.page, size: this.size, q: this.q, sort: this.sort })}`);
      } catch (e) {
        $('#pj-rows').innerHTML = `<tr><td colspan="9">${empty('error-circle', 'Couldn’t load projects', esc(e.message))}</td></tr>`;
        return;
      }
      this.page = d.page;
      $('#pj-count').textContent = num(d.total);
      $('#pj-rows').innerHTML = d.rows.map((p) => `<tr>
        <td><div class="pc-text"><span class="pc-name cell-title">${esc(p.name)}${p.title ? ` <span class="muted pj-folder" title="Folder name">· ${esc(p.folder)}</span>` : ''}</span><span class="pc-sub" title="${esc(p.path || '')}">${esc(p.path || p.slug)}</span></div></td>
        <td class="num">${num(p.sessions)}</td><td class="num">${num(p.prompts)}</td><td class="num">${num(p.replies)}</td><td class="num">${num(p.images)}</td>
        <td class="num" title="${num(p.tokens?.output)}">${compact(p.tokens?.output)}</td><td class="num" title="${num(p.tokens?.cache_read)}">${compact(p.tokens?.cache_read)}</td>${costTd(p.tokens)}
        <td><div class="when-cell"><b>${ago(p.last)}</b><span>since ${fmt(p.first).split(',')[0]}</span></div></td>
        <td class="actions"><div class="row-actions">
          <button class="icon-btn sm" data-open-project="${esc(p.slug)}" aria-label="Open latest session" title="Open its latest session"><i class="bx bx-message-detail" aria-hidden="true"></i></button>
          <button class="icon-btn sm" data-rename-project="${esc(p.slug)}" aria-label="Rename ${esc(p.name)}" title="Give this project a title"><i class="bx bx-edit-alt" aria-hidden="true"></i></button>
          <button class="icon-btn sm" data-del-project="${esc(p.slug)}" data-name="${esc(p.name)}" data-count="${p.prompts + p.replies}" aria-label="Delete ${esc(p.name)}" title="Delete this project's data"><i class="bx bx-trash" aria-hidden="true"></i></button>
        </div></td></tr>`).join('') || `<tr><td colspan="10">${empty('folder', this.q ? 'No projects match' : 'No projects yet', this.q ? 'Try a different search.' : 'Run a sync to bring in your Claude Code history.')}</td></tr>`;
      const from = d.total ? (d.page - 1) * d.size + 1 : 0;
      const to = Math.min(d.total, d.page * d.size);
      const nums = [];
      const lo = Math.max(1, Math.min(d.page - 2, d.pages - 4));
      for (let i = lo; i <= Math.min(d.pages, lo + 4); i++) nums.push(i);
      $('#pj-pager').innerHTML = `<span>Showing ${num(from)}–${num(to)} of ${num(d.total)}</span>
        <div class="page-size"><span>Rows</span><select class="select" id="pj-size" aria-label="Rows per page">${[10, 20, 50, 100].map((n) => `<option${n === this.size ? ' selected' : ''}>${n}</option>`).join('')}</select></div>
        <div class="pages">
          <button data-page="${d.page - 1}" aria-label="Previous page"${d.page <= 1 ? ' disabled' : ''}><i class="bx bx-chevron-left icon-14" aria-hidden="true"></i></button>
          ${nums.map((n) => `<button data-page="${n}"${n === d.page ? ' class="active" aria-current="page"' : ''}>${n}</button>`).join('')}
          <button data-page="${d.page + 1}" aria-label="Next page"${d.page >= d.pages ? ' disabled' : ''}><i class="bx bx-chevron-right icon-14" aria-hidden="true"></i></button>
        </div>`;
    },
  };
  $('#pj-q').addEventListener('input', (e) => {
    clearTimeout(ProjectsPage.timer);
    ProjectsPage.timer = setTimeout(() => { ProjectsPage.q = e.target.value; ProjectsPage.page = 1; ProjectsPage.load(); }, 250);
  });
  $('#pj-sort').addEventListener('change', (e) => { ProjectsPage.sort = e.target.value; ProjectsPage.page = 1; ProjectsPage.load(); });
  $('#pj-pager').addEventListener('click', (e) => {
    const b = e.target.closest('[data-page]');
    if (b && !b.disabled) { ProjectsPage.page = Number(b.dataset.page); ProjectsPage.load(); }
  });
  $('#pj-pager').addEventListener('change', (e) => {
    if (e.target.id === 'pj-size') { ProjectsPage.size = Number(e.target.value); ProjectsPage.page = 1; ProjectsPage.load(); }
  });
  $('#pj-rows').addEventListener('click', (e) => {
    const o = e.target.closest('[data-open-project]');
    if (o) {
      // open the project's most recent session (sessions come newest first) and show the project expanded
      const slug = o.dataset.openProject;
      Tree.toggle(slug, true).then(() => {
        const latest = Tree.sessions.get(slug)?.[0];
        if (latest) Panes.open(latest.id);
        else toast('No sessions in this project', '', 'info');
        location.hash = '#/chat';
      }).catch((err) => toast('Couldn’t open the project', err.message, 'danger'));
      return;
    }
    const dp = e.target.closest('[data-del-project]');
    if (dp) Delete.run({ kind: 'project', id: dp.dataset.delProject, name: dp.dataset.name, counts: plural(+dp.dataset.count, 'message') }).then(() => ProjectsPage.load());
  });

  // ---------- model prices (Settings) ----------
  const PRICE_FIELDS = [
    ['input', 'Input'], ['cache_write_5m', 'Cache write 5m'], ['cache_write_1h', 'Cache write 1h'], ['cache_read', 'Cache read'], ['output', 'Output'],
  ];
  const rate = (v) => (v === null || v === undefined ? '—' : `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`);
  const Prices = {
    data: null,
    async show() {
      if (!isReady) return;
      if (!this.data) $('#pr-rows').innerHTML = Skel.rows(10, 3);
      try { this.data = await api('/api/prices'); } catch (e) { $('#pr-rows').innerHTML = `<tr><td colspan="10">${empty('error-circle', 'Couldn’t load prices', esc(e.message))}</td></tr>`; return; }
      this.render();
    },
    render() {
      const d = this.data;
      const checked = new Date(`${d.checked}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      $('#pr-sub').innerHTML = `USD per million tokens. Known prices are Claude API list prices, checked ${esc(checked)} (<a href="${esc(d.source)}" target="_blank" rel="noopener">source</a>). A model id with a date uses the price of the id without it.`;
      const known = $('#pr-known');
      known.disabled = !d.missingKnown;
      known.title = d.missingKnown ? `Adds ${plural(d.missingKnown, 'model')} missing from the table; prices already here are kept` : 'Every known Claude model is in the table';
      const unpriced = d.usage.filter((u) => !u.priced_as);
      $('#pr-banner').innerHTML = unpriced.length ? `<div class="banner warning"><i class="bx bx-error icon-16" aria-hidden="true"></i><div class="banner-body">
        <span class="banner-title">${plural(unpriced.length, 'model')} in use without a price</span>
        <span>${unpriced.map((u) => `<span class="mono">${esc(u.model)}</span> (${plural(u.responses, 'response')})`).join(', ')}. Their responses are left out of every cost until a price is added.</span></div></div>` : '';
      const aliases = (model) => d.usage.filter((u) => u.priced_as === model && u.model !== model).map((u) => u.model);
      const tier = (p) => (p.tiers || []).map((t) => `<span class="pr-tier" title="Prompts (input + cache) over ${num(t.above)} tokens: whole request at these prices">Over ${compact(t.above)}: ${rate(t.input)} in · ${rate(t.output)} out</span>`).join('') || '<span class="muted">—</span>';
      const rows = [
        ...unpriced.map((u) => `<tr class="pr-missing">
          <td><span class="mono">${esc(u.model)}</span> <span class="chip grey">No price</span></td><td class="num">${num(u.responses)}</td>
          ${PRICE_FIELDS.map(() => '<td class="num muted">—</td>').join('')}<td></td><td></td>
          <td class="actions"><button class="btn btn-sm btn-header" data-price-edit="${esc(u.model)}" data-new="1">Add price</button></td></tr>`),
        ...d.prices.map((r) => {
          const al = aliases(r.model);
          return `<tr class="${r.responses ? '' : 'pr-unused'}">
          <td><div class="pc-text"><span class="mono">${esc(r.model)}</span>${al.length ? `<span class="pc-sub">also ${al.map((m) => `<span class="mono">${esc(m)}</span>`).join(', ')}</span>` : ''}</div></td>
          <td class="num">${r.responses ? num(r.responses) : '<span class="muted">—</span>'}</td>
          ${PRICE_FIELDS.map(([k]) => `<td class="num">${rate(r.price[k])}</td>`).join('')}
          <td>${tier(r.price)}</td><td class="num">${r.price.fast ? `${r.price.fast}×` : '<span class="muted">—</span>'}</td>
          <td class="actions"><button class="icon-btn sm" data-price-edit="${esc(r.model)}" aria-label="Edit ${esc(r.model)} price" title="Edit price"><i class="bx bx-edit-alt" aria-hidden="true"></i></button></td></tr>`;
        }),
      ];
      $('#pr-rows').innerHTML = rows.join('') || `<tr><td colspan="10">${empty('dollar-circle', 'No prices yet', 'Add the known Claude prices, or add a model by hand.')}</td></tr>`;
    },
    async put(changes, done) {
      try {
        this.data = await api('/api/prices', { method: 'PUT', body: { changes } });
        Stats.data = null; // costs changed
        this.render();
        done();
      } catch (e) { toast('Couldn’t save the price', e.message, 'danger'); }
    },
    edit(model, isNew = false) {
      const row = this.data.prices.find((r) => r.model === model);
      const p = row?.price || {};
      const t = (p.tiers || [])[0] || {};
      const inp = (id, v, extra = '') => `<input class="input" type="number" min="0" step="any" inputmode="decimal" id="${id}" value="${v ?? ''}" ${extra} />`;
      const root = $('#modal-root');
      root.innerHTML = `
        <div class="modal-backdrop">
          <form class="card modal-dialog modal-md" role="dialog" aria-modal="true" aria-labelledby="pr-title">
            <div class="modal-head">
              <div class="ico"><i class="bx bx-dollar-circle icon-18" aria-hidden="true"></i></div>
              <div class="text"><h4 id="pr-title">${row ? 'Edit price' : 'Add a model price'}</h4><p>USD per million tokens. Saving recalculates the cost of every response.</p></div>
              <button class="close" type="button" aria-label="Close" data-cancel><i class="bx bx-x icon-16" aria-hidden="true"></i></button>
            </div>
            <div class="modal-body">
              <div class="field">
                <label class="label" for="pr-model">Model id</label>
                <input class="input mono" id="pr-model" value="${esc(model || '')}" ${row || isNew ? 'readonly' : ''} placeholder="claude-opus-5-5" autocomplete="off" required />
                <span class="hint">As Claude Code reports it. A dated id (…-20250929) without its own row uses this one.</span>
              </div>
              <div class="pr-grid">
                ${PRICE_FIELDS.map(([k, label]) => `<div class="field"><label class="label" for="pr-${k}">${label}</label>${inp(`pr-${k}`, p[k], k === 'input' || k === 'output' ? 'required' : `placeholder="${k === 'cache_read' ? '0.1' : k === 'cache_write_1h' ? '2' : '1.25'}× input"`)}</div>`).join('')}
                <div class="field"><label class="label" for="pr-fast">Fast mode ×</label>${inp('pr-fast', p.fast, 'placeholder="none"')}</div>
              </div>
              <span class="hint">Empty cache prices use the usual share of the input price.</span>
              <details class="pr-tier-box"${t.above ? ' open' : ''}>
                <summary>Long prompts are priced higher</summary>
                <div class="field"><label class="label" for="pr-above">When the prompt is over (tokens)</label>${inp('pr-above', t.above, 'placeholder="100000"')}
                  <span class="hint">Prompt = input + cache reads + cache writes. The whole request is then priced as below.</span></div>
                <div class="pr-grid">${PRICE_FIELDS.map(([k, label]) => `<div class="field"><label class="label" for="pr-t-${k}">${label}</label>${inp(`pr-t-${k}`, t[k])}</div>`).join('')}</div>
              </details>
            </div>
            <div class="modal-foot">
              ${row ? '<button class="btn btn-header" type="button" data-remove><i class="bx bx-trash" aria-hidden="true"></i> Remove price</button><span class="spacer"></span>' : ''}
              <button class="btn btn-custom-secondary" type="button" data-cancel>Cancel</button>
              <button class="btn btn-custom-primary" type="submit">Save price</button>
            </div>
          </form>
        </div>`;
      const close = () => { root.innerHTML = ''; document.removeEventListener('keydown', onKey); };
      const onKey = (e) => { if (e.key === 'Escape') close(); };
      document.addEventListener('keydown', onKey);
      root.querySelector('.modal-backdrop').addEventListener('mousedown', (e) => { if (e.target === e.currentTarget) close(); });
      root.querySelectorAll('[data-cancel]').forEach((b) => b.addEventListener('click', close));
      const v = (id) => { const x = $(`#${id}`).value.trim(); return x === '' ? null : Number(x); };
      root.querySelector('[data-remove]')?.addEventListener('click', () => this.put({ [model]: null }, () => { close(); toast('Price removed', `${model} responses are now left out of the cost.`); }));
      root.querySelector('form').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = $('#pr-model').value.trim();
        if (!id) return;
        const price = Object.fromEntries(PRICE_FIELDS.map(([k]) => [k, v(`pr-${k}`)]));
        price.fast = v('pr-fast');
        const above = v('pr-above');
        if (above && v('pr-t-input') !== null && v('pr-t-output') !== null) price.tiers = [{ above, ...Object.fromEntries(PRICE_FIELDS.map(([k]) => [k, v(`pr-t-${k}`)])) }];
        this.put({ [id]: price }, () => { close(); toast('Price saved', 'Costs recalculated.'); });
      });
      (row || isNew ? $('#pr-input') : $('#pr-model')).focus();
    },
  };
  $('#pr-rows').addEventListener('click', (e) => {
    const b = e.target.closest('[data-price-edit]');
    if (b) Prices.edit(b.dataset.priceEdit, !!b.dataset.new);
  });
  $('#pr-add').addEventListener('click', () => Prices.edit(''));
  $('#pr-known').addEventListener('click', async () => {
    const b = $('#pr-known');
    b.disabled = true;
    try {
      const r = await api('/api/prices/known', { method: 'POST' });
      Prices.data = r;
      Stats.data = null;
      Prices.render();
      toast(r.added ? `${plural(r.added, 'model')} added` : 'Nothing to add', r.added ? 'Prices you had already entered were kept. Costs recalculated.' : '');
    } catch (e) { b.disabled = false; toast('Couldn’t add prices', e.message, 'danger'); }
  });

  $('#sh-kv').addEventListener('click', (e) => { if (e.target.closest('#sh-retry')) Sync.retryDead(); });

  // ---------- compact numbers ----------
  const compact = (n) => Number(n || 0).toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 });
  // API-equivalent cost in USD
  const usd = (n) => {
    if (n === null || n === undefined) return '—';
    const v = Number(n);
    if (v > 0 && v < 0.01) return '<$0.01';
    return v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: v >= 1000 ? 0 : 2 });
  };
  const usdAxis = (n) => (n >= 1000 ? `$${compact(n)}` : `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: n < 10 ? 2 : 0 })}`);
  /** Cost cell; responses whose model has no price are left out of the sum, so say so. */
  const costTd = (t) => {
    if (!t) return '<td class="num">—</td>';
    const note = t.unpriced ? ` · ${num(t.unpriced)} of ${num(t.responses)} responses have no price (Settings → Model prices)` : '';
    return `<td class="num${t.unpriced ? ' cost-partial' : ''}" title="API-equivalent cost${note}">${usd(t.cost)}${t.unpriced ? '*' : ''}</td>`;
  };
  const bytes = (n) => (n > 1e9 ? `${(n / 1e9).toFixed(1)} GB` : n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1e3)} KB`);

  // ---------- bar chart (SVG, stacked or single series) ----------
  // series: [{ key, label, cls }] where cls maps to a .viz-N colour slot. Hover shows a tooltip per column.
  function barChart(el, { rows, series, label, tip, height = 200, xEvery, fmt: fmtY = compact }) {
    const W = Math.max(280, el.clientWidth || 600);
    const H = height, padL = 44, padR = 8, padT = 10, padB = 24;
    const totals = rows.map((r) => series.reduce((s, x) => s + (r[x.key] || 0), 0));
    const max = Math.max(1, ...totals);
    const step = niceStep(max / 4);
    const top = Math.ceil(max / step) * step;
    const n = rows.length;
    const bw = (W - padL - padR) / n;
    const barW = Math.max(2, Math.min(28, bw * 0.68));
    const y = (v) => padT + (H - padT - padB) * (1 - v / top);
    const every = xEvery || Math.ceil(n / Math.max(2, Math.floor((W - padL) / 64)));
    let svg = `<svg class="viz" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(label)}">`;
    for (let v = 0; v <= top + 1e-9; v += step) {
      svg += `<line class="viz-grid" x1="${padL}" x2="${W - padR}" y1="${y(v)}" y2="${y(v)}"/>`;
      svg += `<text class="viz-axis" x="${padL - 6}" y="${y(v) + 4}" text-anchor="end">${fmtY(v)}</text>`;
    }
    rows.forEach((r, i) => {
      const cx = padL + bw * i + bw / 2;
      let base = 0;
      const segs = series.map((s) => ({ s, v: r[s.key] || 0 })).filter((x) => x.v > 0);
      segs.forEach((x, j) => {
        const y0 = y(base), y1 = y(base + x.v);
        const h = Math.max(0, y0 - y1 - (j ? 2 : 0)); // 2px surface gap between stacked segments
        const yTop = y1;
        const last = j === segs.length - 1;
        svg += last ? `<path class="${x.s.cls}" d="${roundTop(cx - barW / 2, yTop, barW, h, Math.min(4, barW / 2, h))}"/>`
                    : `<rect class="${x.s.cls}" x="${cx - barW / 2}" y="${yTop}" width="${barW}" height="${h}"/>`;
        base += x.v;
      });
      if (i % every === 0 || i === n - 1) svg += `<text class="viz-axis" x="${cx}" y="${H - 6}" text-anchor="middle">${esc(r._x)}</text>`;
      svg += `<rect class="viz-hit" data-i="${i}" x="${padL + bw * i}" y="${padT}" width="${bw}" height="${H - padT - padB}"/>`;
    });
    svg += `<line class="viz-base" x1="${padL}" x2="${W - padR}" y1="${y(0)}" y2="${y(0)}"/></svg>`;
    const legend = series.length > 1
      ? `<div class="viz-legend">${series.map((s) => `<span class="legend-dot ${s.cls}-dot">${esc(s.label)}</span>`).join('')}</div>` : '';
    el.innerHTML = `${legend}<div class="viz-wrap">${svg}<div class="viz-tip" hidden></div></div>`;
    const tipEl = el.querySelector('.viz-tip');
    const wrap = el.querySelector('.viz-wrap');
    wrap.addEventListener('pointermove', (e) => {
      const hit = e.target.closest('.viz-hit');
      wrap.querySelectorAll('.viz-hit.on').forEach((h) => h.classList.remove('on'));
      if (!hit) { tipEl.hidden = true; return; }
      hit.classList.add('on');
      const r = rows[+hit.dataset.i];
      tipEl.innerHTML = tip(r, series);
      tipEl.hidden = false;
      const box = wrap.getBoundingClientRect();
      const x = e.clientX - box.left;
      tipEl.style.left = `${Math.min(Math.max(8, x + 12), box.width - tipEl.offsetWidth - 8)}px`;
      tipEl.style.top = `${Math.max(0, e.clientY - box.top - tipEl.offsetHeight - 12)}px`;
    });
    wrap.addEventListener('pointerleave', () => { tipEl.hidden = true; wrap.querySelectorAll('.viz-hit.on').forEach((h) => h.classList.remove('on')); });
  }
  function niceStep(raw) {
    const p = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
    const f = raw / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
  }
  function roundTop(x, y, w, h, r) {
    if (h <= 0) return '';
    r = Math.max(0, Math.min(r, h));
    return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
  }
  const dayLabel = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  const tipRows = (title, items) => `<div class="viz-tip-title">${esc(title)}</div>${items.map(([cls, k, v]) => `<div class="viz-tip-row"><span class="legend-dot ${cls}-dot">${esc(k)}</span><b>${v}</b></div>`).join('')}`;

  // ---------- date range picker (design-system .ds-daterange / .ds-calendar markup) ----------
  const dkey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const dparse = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const daddDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const dShort = (k, year = false) => dparse(k).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', ...(year ? { year: 'numeric' } : {}) });
  const rangeText = (from, to) => {
    if (!from) return '';
    if (!to || from === to) return dShort(from, true);
    const sameYear = from.slice(0, 4) === to.slice(0, 4);
    return `${dShort(from, !sameYear)} – ${dShort(to, true)}`;
  };
  const dayCount = (from, to) => Math.round((dparse(to) - dparse(from)) / 86400000) + 1;

  const Picker = {
    open: false,
    start: null, end: null, hover: null,
    view: null, // first day of the right-hand month
    presets() {
      const t = new Date();
      const today = dkey(t);
      const firstOfMonth = new Date(t.getFullYear(), t.getMonth(), 1);
      const lastMonthEnd = daddDays(firstOfMonth, -1);
      return [
        ['Today', today, today],
        ['Yesterday', dkey(daddDays(t, -1)), dkey(daddDays(t, -1))],
        ['Last 7 days', dkey(daddDays(t, -6)), today],
        ['Last 14 days', dkey(daddDays(t, -13)), today],
        ['Last 30 days', dkey(daddDays(t, -29)), today],
        ['This month', dkey(firstOfMonth), today],
        ['Last month', dkey(new Date(lastMonthEnd.getFullYear(), lastMonthEnd.getMonth(), 1)), dkey(lastMonthEnd)],
        ['This year', `${t.getFullYear()}-01-01`, today],
      ];
    },
    show() {
      const t = new Date();
      this.start = Stats.from || dkey(daddDays(t, -(Math.max(Stats.days, 7) - 1)));
      this.end = Stats.to || dkey(t);
      this.hover = null;
      const e = dparse(this.end);
      this.view = new Date(e.getFullYear(), e.getMonth(), 1);
      this.open = true;
      $('#st-picker').hidden = false;
      $('#st-custom').setAttribute('aria-expanded', 'true');
      this.render();
      setTimeout(() => document.addEventListener('mousedown', this.outside), 0);
      document.addEventListener('keydown', this.esc);
    },
    hide() {
      this.open = false;
      $('#st-picker').hidden = true;
      $('#st-custom').setAttribute('aria-expanded', 'false');
      document.removeEventListener('mousedown', this.outside);
      document.removeEventListener('keydown', this.esc);
    },
    outside: (e) => { if (!e.target.closest('#st-picker') && !e.target.closest('#st-custom')) Picker.hide(); },
    esc: (e) => { if (e.key === 'Escape') Picker.hide(); },
    month(first) {
      const today = dkey(new Date());
      const title = first.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      const lead = (first.getDay() + 6) % 7; // weeks start on Monday
      const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
      const lo = this.start;
      const hi = this.end || this.hover;
      const [a, b] = lo && hi && hi < lo ? [hi, lo] : [lo, hi];
      let cells = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => `<span class="cal-dow">${d}</span>`).join('');
      cells += '<span></span>'.repeat(lead);
      for (let i = 1; i <= days; i++) {
        const k = dkey(new Date(first.getFullYear(), first.getMonth(), i));
        const cls = ['cal-day'];
        if (k === today) cls.push('today');
        if (a && b && a !== b) {
          if (k === a) cls.push('range-start');
          else if (k === b) cls.push('range-end');
          else if (k > a && k < b) cls.push('in-range');
        } else if (k === a) cls.push('selected');
        cells += `<button type="button" class="${cls.join(' ')}" data-d="${k}"${k > today ? ' disabled' : ''} aria-label="${dShort(k, true)}">${i}</button>`;
      }
      return `<div class="ds-calendar"><div class="cal-head"><span class="cal-title">${title}</span></div><div class="cal-grid">${cells}</div></div>`;
    },
    render() {
      const left = new Date(this.view.getFullYear(), this.view.getMonth() - 1, 1);
      const now = new Date();
      const atEnd = this.view.getFullYear() === now.getFullYear() && this.view.getMonth() === now.getMonth();
      const active = this.presets().find(([, f, t]) => f === this.start && t === this.end)?.[0];
      const ready = this.start && this.end;
      $('#st-picker').innerHTML = `
        <div class="ds-daterange" role="dialog" aria-label="Choose a date range">
          <div class="presets">
            <div class="preset-h">Quick ranges</div>
            ${this.presets().map(([label, f, t]) => `<button type="button" data-from="${f}" data-to="${t}" class="${label === active ? 'active' : ''}">${label}</button>`).join('')}
            <div class="presets-divider"></div>
            <button type="button" data-all>All time</button>
          </div>
          <div class="dr-main">
            <div class="dr-nav">
              <button type="button" class="icon-btn sm" data-nav="-1" aria-label="Previous month"><i class="bx bx-chevron-left" aria-hidden="true"></i></button>
              <button type="button" class="icon-btn sm" data-nav="1" aria-label="Next month"${atEnd ? ' disabled' : ''}><i class="bx bx-chevron-right" aria-hidden="true"></i></button>
            </div>
            <div class="cals">${this.month(left)}${this.month(this.view)}</div>
            <div class="cal-footer">
              <span class="dr-summary">${ready ? `<strong>${rangeText(...[this.start, this.end].sort())}</strong> <span class="muted">· ${plural(dayCount(...[this.start, this.end].sort()), 'day')}</span>` : '<span class="muted">Pick an end date</span>'}</span>
              <span class="dr-actions">
                <button type="button" class="btn btn-sm btn-custom-secondary" data-cancel>Cancel</button>
                <button type="button" class="btn btn-sm btn-custom-primary" data-apply${ready ? '' : ' disabled'}>Apply</button>
              </span>
            </div>
          </div>
        </div>`;
    },
  };
  $('#st-picker').addEventListener('click', (e) => {
    const day = e.target.closest('.cal-day');
    if (day && !day.disabled) {
      const d = day.dataset.d;
      if (!Picker.start || Picker.end) { Picker.start = d; Picker.end = null; }
      else { Picker.end = d; [Picker.start, Picker.end] = [Picker.start, Picker.end].sort(); }
      return Picker.render();
    }
    const preset = e.target.closest('[data-from]');
    if (preset) { Picker.start = preset.dataset.from; Picker.end = preset.dataset.to; const t = dparse(Picker.end); Picker.view = new Date(t.getFullYear(), t.getMonth(), 1); return Picker.render(); }
    if (e.target.closest('[data-all]')) { Picker.hide(); return Stats.setRange({ days: 0 }); }
    const nav = e.target.closest('[data-nav]');
    if (nav) { Picker.view = new Date(Picker.view.getFullYear(), Picker.view.getMonth() + Number(nav.dataset.nav), 1); return Picker.render(); }
    if (e.target.closest('[data-cancel]')) return Picker.hide();
    if (e.target.closest('[data-apply]') && Picker.start && Picker.end) { Picker.hide(); Stats.setRange({ from: Picker.start, to: Picker.end }); }
  });
  $('#st-picker').addEventListener('mouseover', (e) => {
    const day = e.target.closest('.cal-day');
    if (!day || !Picker.start || Picker.end || day.dataset.d === Picker.hover) return;
    Picker.hover = day.dataset.d;
    Picker.render();
  });

  // ---------- stats page ----------
  const TOKEN_SERIES = [
    { key: 'input', label: 'Input', cls: 'viz-1' },
    { key: 'output', label: 'Output', cls: 'viz-2' },
    { key: 'cache_write', label: 'Cache write', cls: 'viz-3' },
    { key: 'cache_read', label: 'Cache read', cls: 'viz-4' },
    { key: 'cost', label: 'Cost', cls: 'viz-1', fmt: usd, axis: usdAxis, money: true },
  ];
  const TOKEN_TH = '<th class="num" title="New, uncached prompt tokens">Input</th><th class="num">Output</th><th class="num" title="Prompt tokens written to the cache">Cache write</th><th class="num" title="Prompt tokens served from the cache">Cache read</th><th class="num" title="API-equivalent cost at Claude API list prices">Cost</th>';
  const tokenTds = (t) => ['input', 'output', 'cache_write', 'cache_read'].map((k) => `<td class="num" title="${t ? num(t[k]) : '0'}">${t ? compact(t[k]) : '—'}</td>`).join('') + costTd(t);
  const Stats = {
    days: 30,
    from: null, // custom range (YYYY-MM-DD, inclusive) wins over days when set
    to: null,
    project: '',
    rangeLabel() {
      if (this.from) return rangeText(this.from, this.to);
      return this.days ? `last ${this.days} days` : 'all time';
    },
    setRange({ days = null, from = null, to = null }) {
      this.from = from;
      this.to = to;
      if (days !== null) this.days = days;
      document.querySelectorAll('#st-range .seg-btn').forEach((x) => {
        const on = from ? x.dataset.v === 'custom' : x.dataset.v === String(this.days);
        x.classList.toggle('is-on', on);
        x.setAttribute('aria-pressed', on);
      });
      $('#st-custom span').textContent = from ? rangeText(from, to) : 'Custom';
      this.load();
    },
    metric: 'output',
    data: null,
    account: '',
    org: '',
    async show() {
      if (!isReady) { $('#st-body').innerHTML = empty('loader-alt', 'Starting up', ''); return; }
      if (!this.data) $('#st-body').innerHTML = Skel.stats();
      const sel = $('#st-project');
      sel.innerHTML = '<option value="">All projects</option>' + Tree.projects.map((p) => `<option value="${esc(p.slug)}">${esc(p.name)}</option>`).join('');
      sel.value = this.project;
      try {
        const { users, orgs } = await api('/api/accounts');
        $('#st-account').innerHTML = '<option value="">All accounts</option>' +
          users.map((u) => `<option value="${esc(u.account_uuid)}">${esc(u.email || u.display_name || u.account_uuid)}</option>`).join('') +
          '<option value="__none__">Not linked</option>';
        $('#st-org').innerHTML = '<option value="">All organisations</option>' +
          orgs.map((o) => `<option value="${esc(o.org_uuid)}">${esc(o.name || o.org_uuid)}</option>`).join('') +
          '<option value="__none__">No organisation</option>';
        $('#st-account').value = this.account;
        $('#st-org').value = this.org;
      } catch {}
      await this.load();
    },
    async load() {
      $('#st-body').innerHTML = Skel.stats();
      try {
        const q = new URLSearchParams(this.from ? { from: this.from, to: this.to } : { days: this.days });
        if (this.project) q.set('project', this.project);
        if (this.account) q.set('account', this.account);
        if (this.org) q.set('org', this.org);
        this.data = await api(`/api/stats?${q}`);
        this.render();
      } catch (e) {
        $('#st-body').innerHTML = empty('error-circle', 'Couldn’t load stats', esc(e.message));
      }
    },
    render() {
      const d = this.data;
      const t = d.totals;
      const tk = t.tokens;
      const range = this.rangeLabel();
      const Range = range.charAt(0).toUpperCase() + range.slice(1);
      const card = (icon, label, value, sub = '') => `<div class="stat-card"><span class="sc-label"><i class="bx bx-${icon} icon-14" aria-hidden="true"></i> ${label}</span><span class="sc-value">${value}</span>${sub ? `<span class="sc-sub">${sub}</span>` : ''}</div>`;
      $('#st-body').innerHTML = `
        <div class="grid-auto stat-grid">
          ${card('folder', 'Projects', num(t.projects))}
          ${card('message-detail', 'Sessions', num(t.sessions))}
          ${card('user', 'Prompts', num(t.prompts), `${num(t.messages)} messages in all`)}
          ${card('bot', 'Claude replies', num(t.replies), t.prompts ? `${(t.replies / t.prompts).toFixed(1)} per prompt` : '')}
          ${card('image', 'Images', num(t.images))}
          ${card('up-arrow-alt', 'Output tokens', compact(tk.output), `${num(tk.responses)} API responses`)}
          ${card('down-arrow-alt', 'Input + cache write', compact(tk.input + tk.cache_write), `${compact(tk.input)} new · ${compact(tk.cache_write)} cached`)}
          ${card('data', 'Cache read', compact(tk.cache_read), t.sidechainTokens.responses ? `incl. ${compact(t.sidechainTokens.output)} output by sub-agents` : '')}
          ${card('dollar-circle', 'API-equivalent cost', usd(tk.cost), tk.unpriced ? `<a href="#/settings" class="cost-warn">${num(tk.unpriced)} responses have no price</a>` : 'At Claude API list prices')}
        </div>

        <div class="grid-2 st-charts">
          <div class="card"><div class="card-head"><div><h3>Messages per day</h3><p class="card-sub">Prompts and Claude replies, ${range}</p></div></div>
            <div class="card-pad"><div id="ch-msgs" class="chart"></div>${this.table(d.perDay, [['Day', (r) => dayLabel(r.day)], ['Prompts', (r) => num(r.prompts)], ['Replies', (r) => num(r.replies)]])}</div></div>
          <div class="card"><div class="card-head"><div><h3>Tokens and cost per day</h3><p class="card-sub">${range}, one kind at a time (their scales differ a lot)</p></div>
              <div class="seg" role="group" aria-label="Token kind" id="st-metric">${TOKEN_SERIES.map((s) => `<button type="button" class="seg-btn${s.key === this.metric ? ' is-on' : ''}" data-v="${s.key}" aria-pressed="${s.key === this.metric}">${s.label}</button>`).join('')}</div></div>
            <div class="card-pad"><div id="ch-tokens" class="chart"></div>${this.table(d.tokensPerDay, [['Day', (r) => dayLabel(r.day)], ...TOKEN_SERIES.map((s) => [s.label, (r) => (s.fmt || num)(r[s.key])])])}</div></div>
        </div>

        <div class="card"><div class="card-head"><div><h3>When you work</h3><p class="card-sub">Messages by hour of day (IST), ${range}</p></div></div>
          <div class="card-pad"><div id="ch-hours" class="chart"></div></div></div>

        <div class="table-card">
          <div class="card-head"><div><h3>Recently active projects</h3><p class="card-sub">${d.perProject.length > 10 ? `10 of ${num(d.perProject.length)}` : plural(d.perProject.length, 'project')} · ${range}</p></div>
            <a class="btn btn-sm btn-header" href="#/projects"><i class="bx bx-folder-open" aria-hidden="true"></i> All projects</a></div>
          <div class="table-scroll"><table class="ds compact">
            <thead><tr><th>Project</th><th class="num">Sessions</th><th class="num">Prompts</th><th class="num">Replies</th><th class="num">Images</th>${TOKEN_TH}<th>Active</th><th class="actions">Actions</th></tr></thead>
            <tbody>${d.perProject.slice(0, 10).map((p) => `<tr>
              <td><div class="pc-text"><span class="pc-name cell-title">${esc(p.name)}</span><span class="pc-sub" title="${esc(p.path || '')}">${esc(p.path || p.slug)}</span></div></td>
              <td class="num">${num(p.sessions)}</td><td class="num">${num(p.prompts)}</td><td class="num">${num(p.replies)}</td><td class="num">${num(p.images)}</td>
              ${tokenTds(p.tokens)}
              <td><div class="when-cell"><b>${ago(p.last)}</b><span>since ${fmt(p.first).split(',')[0]}</span></div></td>
              <td class="actions"><div class="row-actions">
                <button class="icon-btn sm" data-rename-project="${esc(p.slug)}" data-name="${esc(p.name)}" aria-label="Rename ${esc(p.name)}" title="Give this project a title"><i class="bx bx-edit-alt" aria-hidden="true"></i></button>
                <button class="icon-btn sm" data-del-project="${esc(p.slug)}" data-name="${esc(p.name)}" data-count="${p.prompts + p.replies}" aria-label="Delete ${esc(p.name)}" title="Delete this project's data"><i class="bx bx-trash" aria-hidden="true"></i></button>
              </div></td></tr>`).join('') || '<tr><td colspan="11">No data</td></tr>'}</tbody>
          </table></div>
        </div>

        <div class="grid-2 st-who">
          ${['Accounts', 'Organisations'].map((title) => {
            const rows = title === 'Accounts' ? d.perAccount : d.perOrg;
            const kind = title === 'Accounts' ? 'account' : 'org';
            return `<div class="table-card">
              <div class="card-head"><div><h3>${title}</h3><p class="card-sub">${Range}</p></div></div>
              <div class="table-scroll"><table class="ds compact">
                <thead><tr><th>${title === 'Accounts' ? 'Account' : 'Organisation'}</th><th class="num">Sessions</th><th class="num">Prompts</th><th class="num">Replies</th><th class="num">Output</th><th class="num">Cache read</th><th class="num">Cost</th><th class="actions"></th></tr></thead>
                <tbody>${rows.map((r) => `<tr class="${r.linked ? '' : 'unlinked'}">
                  <td><div class="pc-text"><span class="pc-name cell-title">${esc(r.name)}</span>${r.sub ? `<span class="pc-sub">${esc(r.sub)}</span>` : ''}</div></td>
                  <td class="num">${num(r.sessions)}</td><td class="num">${num(r.prompts)}</td><td class="num">${num(r.replies)}</td>
                  <td class="num">${compact(r.tokens?.output)}</td><td class="num">${compact(r.tokens?.cache_read)}</td>${costTd(r.tokens)}
                  <td class="actions"><button class="icon-btn sm" data-filter-${kind}="${esc(r.id)}" aria-label="Show only ${esc(r.name)}" title="Show only this"><i class="bx bx-filter-alt" aria-hidden="true"></i></button></td>
                </tr>`).join('') || '<tr><td colspan="8">No data</td></tr>'}</tbody>
              </table></div></div>`;
          }).join('')}
        </div>

        <div class="grid-2 st-tables">
          <div class="table-card">
            <div class="card-head"><div><h3>Models</h3><p class="card-sub">Token use and cost by model, ${range}</p></div></div>
            <div class="table-scroll"><table class="ds compact">
              <thead><tr><th>Model</th><th class="num">Responses</th><th class="num">Input</th><th class="num">Output</th><th class="num">Cache write</th><th class="num">Cache read</th><th class="num">Cost</th></tr></thead>
              <tbody>${d.perModel.map((m) => `<tr><td><span class="mono">${esc(m.model)}</span>${m.unpriced === m.responses ? ' <a class="chip grey" href="#/settings">No price</a>' : ''}</td><td class="num">${num(m.responses)}</td><td class="num">${compact(m.input)}</td><td class="num">${compact(m.output)}</td><td class="num">${compact(m.cache_write)}</td><td class="num">${compact(m.cache_read)}</td>${costTd(m)}</tr>`).join('') || '<tr><td colspan="7">No data</td></tr>'}</tbody>
            </table></div>
          </div>
          <div class="card">
            <div class="card-head"><div><h3>Storage</h3><p class="card-sub">Claude Recall’s Elasticsearch indices</p></div></div>
            <div class="card-pad"><dl class="kv">${d.indices.sort((a, b) => a.name.localeCompare(b.name)).map((i) => `<dt class="mono">${esc(i.name)}</dt><dd>${num(i.docs)} docs · ${bytes(i.bytes)}</dd>`).join('')}</dl></div>
          </div>
        </div>

        <div class="table-card">
          <div class="card-head"><div><h3>Busiest sessions</h3><p class="card-sub">By number of messages, ${range}</p></div></div>
          <div class="table-scroll"><table class="ds compact">
            <thead><tr><th>Session</th><th>Project</th><th class="num">Prompts</th><th class="num">Replies</th>${TOKEN_TH}<th>Last active</th><th class="actions">Actions</th></tr></thead>
            <tbody>${d.topSessions.map((s) => `<tr>
              <td><span class="cell-title st-title" title="${esc(s.title || s.id)}">${esc(s.title || 'Untitled session')}</span><span class="pc-sub mono">${esc(s.id.slice(0, 8))}</span></td>
              <td>${esc(s.projectName || '')}</td>
              <td class="num">${num(s.prompts)}</td><td class="num">${num(s.replies)}</td>
              ${tokenTds(s.tokens)}
              <td><span class="cell-muted-text">${ago(s.last)}</span></td>
              <td class="actions"><div class="row-actions">
                <button class="icon-btn sm" data-open="${esc(s.id)}" data-project="${esc(s.project)}" aria-label="Open in chat" title="Open in chat"><i class="bx bx-message-detail" aria-hidden="true"></i></button>
                <button class="icon-btn sm" data-del-session="${esc(s.id)}" data-name="${esc(s.title || s.id.slice(0, 8))}" data-count="${s.prompts + s.replies}" aria-label="Delete session" title="Delete session"><i class="bx bx-trash" aria-hidden="true"></i></button>
              </div></td></tr>`).join('') || '<tr><td colspan="10">No data</td></tr>'}</tbody>
          </table></div>
        </div>`;
      this.charts();
    },
    table(rows, cols) {
      return `<details class="viz-table"><summary>Show as table</summary><div class="table-scroll"><table class="ds compact"><thead><tr>${cols.map(([h], i) => `<th${i ? ' class="num"' : ''}>${h}</th>`).join('')}</tr></thead>
        <tbody>${rows.map((r) => `<tr>${cols.map(([, f], i) => `<td${i ? ' class="num"' : ''}>${f(r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`;
    },
    charts() {
      const d = this.data;
      if (!d) return;
      const msgs = d.perDay.map((r) => ({ ...r, _x: dayLabel(r.day) }));
      barChart($('#ch-msgs'), {
        rows: msgs, label: 'Messages per day',
        series: [{ key: 'prompts', label: 'Prompts', cls: 'viz-1' }, { key: 'replies', label: 'Replies', cls: 'viz-2' }],
        tip: (r, s) => tipRows(r._x, s.map((x) => [x.cls, x.label, num(r[x.key])])),
      });
      const m = TOKEN_SERIES.find((s) => s.key === this.metric);
      barChart($('#ch-tokens'), {
        rows: d.tokensPerDay.map((r) => ({ ...r, _x: dayLabel(r.day) })), label: m.money ? 'API-equivalent cost per day' : `${m.label} tokens per day`,
        series: [m], fmt: m.axis || compact,
        tip: (r) => tipRows(r._x, [[m.cls, m.money ? 'API-equivalent cost' : `${m.label} tokens`, (m.fmt || num)(r[m.key])], ['viz-none', 'API responses', num(r.responses)]]),
      });
      barChart($('#ch-hours'), {
        rows: d.perHour.map((h) => ({ ...h, _x: `${String(h.hour).padStart(2, '0')}` })), label: 'Messages by hour of day', height: 160, xEvery: 3,
        series: [{ key: 'messages', label: 'Messages', cls: 'viz-1' }],
        tip: (r) => tipRows(`${r._x}:00 – ${r._x}:59`, [['viz-1', 'Messages', num(r.messages)]]),
      });
    },
  };
  $('#st-range').addEventListener('click', (e) => {
    const b = e.target.closest('.seg-btn');
    if (!b) return;
    if (b.dataset.v === 'custom') return Picker.open ? Picker.hide() : Picker.show();
    Picker.hide();
    Stats.setRange({ days: Number(b.dataset.v) });
  });
  $('#st-project').addEventListener('change', (e) => { Stats.project = e.target.value; Stats.load(); });
  $('#st-account').addEventListener('change', (e) => { Stats.account = e.target.value; Stats.load(); });
  $('#st-org').addEventListener('change', (e) => { Stats.org = e.target.value; Stats.load(); });

  // ---------- accounts page ----------
  const initials = (s) => String(s || '?').split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
  const Accounts = {
    tab: (() => { try { return localStorage.getItem('recall.accountsTab') === 'orgs' ? 'orgs' : 'users'; } catch { return 'users'; } })(),
    data: null,
    async show() {
      this.setTab(this.tab, false);
      if (!isReady) { $('#ac-banner').innerHTML = ''; $('#ac-body').innerHTML = empty('loader-alt', 'Starting up', ''); return; }
      $('#ac-body').innerHTML = Skel.table('', 11, 3);
      try { this.data = await api('/api/accounts'); } catch (e) { $('#ac-body').innerHTML = empty('error-circle', 'Couldn’t load accounts', esc(e.message)); return; }
      const d = this.data;
      $('#ac-count-users').textContent = num(d.users.length);
      $('#ac-count-orgs').textContent = num(d.orgs.length);
      $('#ac-banner').innerHTML = d.unlinked.messages ? `<div class="banner info"><i class="bx bx-info-circle icon-16" aria-hidden="true"></i><div class="banner-body">
          <span class="banner-title">${num(d.unlinked.messages)} messages in ${plural(d.unlinked.sessions, 'session')} aren’t linked to an account</span>
          <span>Claude Code’s transcripts don’t record who was logged in. Claude Recall links messages from the moment its hook reports the account, so older history stays unlinked.</span></div></div>` : '';
      this.render();
    },
    setTab(tab, render = true) {
      this.tab = tab === 'orgs' ? 'orgs' : 'users';
      try { localStorage.setItem('recall.accountsTab', this.tab); } catch {}
      document.querySelectorAll('#ac-tabs [role="tab"]').forEach((t) => {
        const on = t.dataset.acTab === this.tab;
        t.classList.toggle('active', on); t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1;
      });
      $('#ac-body').setAttribute('aria-labelledby', `ac-tab-${this.tab}`);
      if (render && this.data) this.render();
    },
    render() {
      const d = this.data;
      const act = (a) => a || { sessions: 0, projects: 0, messages: 0, prompts: 0 };
      $('#ac-body').innerHTML = this.tab === 'users' ? `
        <div class="table-card">
          <div class="card-head"><div><h3>Users</h3><p class="card-sub">${plural(d.users.length, 'account')} seen by the hook</p></div></div>
          <div class="table-scroll"><table class="ds compact">
            <thead><tr><th>User</th><th>Organisations</th><th class="num">Sessions</th><th class="num">Projects</th><th class="num">Prompts</th><th class="num">Messages</th><th class="num">Output</th><th class="num">Cache read</th><th class="num">Cost</th><th>First seen</th><th>Last active</th><th class="actions"></th></tr></thead>
            <tbody>${d.users.map((u) => {
              const a = act(u.activity);
              return `<tr>
                <td><div class="person-cell"><span class="avatar-soft">${u.kind === 'api_key' ? '<i class="bx bx-key" aria-hidden="true"></i>' : esc(initials(u.full_name || u.display_name || u.email))}</span><div class="pc-text">
                  <span class="pc-name">${esc(u.full_name || u.display_name || 'Unknown')}</span><span class="pc-sub">${esc(u.email || (u.kind === 'api_key' ? 'Claude Code on an API key' : u.account_uuid))}</span></div></div></td>
                <td><div class="chip-row">${u.orgs.map((o) => `<span class="chip grey" title="${esc(o.org_role || '')}${o.seat_tier ? ` · ${esc(o.seat_tier)}` : ''}"><i class="bx bx-buildings icon-12" aria-hidden="true"></i> ${esc(o.name)}${o.org_role ? ` · ${esc(o.org_role)}` : ''}</span>`).join('') || '<span class="muted">—</span>'}</div></td>
                <td class="num">${num(a.sessions)}</td><td class="num">${num(a.projects)}</td><td class="num">${num(a.prompts)}</td><td class="num">${num(a.messages)}</td>
                <td class="num">${compact(u.tokens?.output)}</td><td class="num">${compact(u.tokens?.cache_read)}</td>${costTd(u.tokens)}
                <td><span class="cell-muted-text">${fmt(u.first_seen).split(',')[0]}</span></td>
                <td><span class="cell-muted-text">${ago(a.last || u.last_seen)}</span></td>
                <td class="actions"><button class="icon-btn sm" data-stats-account="${esc(u.account_uuid)}" aria-label="Stats for this user" title="Stats for this user"><i class="bx bx-bar-chart-alt-2" aria-hidden="true"></i></button></td>
              </tr>`;
            }).join('') || `<tr><td colspan="12">${empty('user', 'No accounts yet', 'They appear after the next Claude Code reply, once the hook reports who is logged in.')}</td></tr>`}</tbody>
          </table></div>
        </div>` : `
        <div class="table-card">
          <div class="card-head"><div><h3>Organisations</h3><p class="card-sub">${plural(d.orgs.length, 'organisation')}</p></div></div>
          <div class="table-scroll"><table class="ds compact">
            <thead><tr><th>Organisation</th><th>Members</th><th class="num">Sessions</th><th class="num">Projects</th><th class="num">Prompts</th><th class="num">Messages</th><th class="num">Output</th><th class="num">Cache read</th><th class="num">Cost</th><th>First seen</th><th>Last active</th><th class="actions"></th></tr></thead>
            <tbody>${d.orgs.map((o) => {
              const a = act(o.activity);
              return `<tr>
                <td><div class="org-cell"><span class="co-chip">${esc(initials(o.name))}</span><div class="pc-text"><span class="pc-name cell-title">${esc(o.name || o.org_uuid)}</span><span class="pc-sub">${esc([o.type, o.billing_type].filter(Boolean).join(' · '))}</span></div></div></td>
                <td><div class="chip-row">${o.members.map((m) => `<span class="chip grey" title="${esc(m.name)}"><i class="bx bx-user icon-12" aria-hidden="true"></i> ${esc(m.email || m.name)}${m.org_role ? ` · ${esc(m.org_role)}` : ''}</span>`).join('')}</div></td>
                <td class="num">${num(a.sessions)}</td><td class="num">${num(a.projects)}</td><td class="num">${num(a.prompts)}</td><td class="num">${num(a.messages)}</td>
                <td class="num">${compact(o.tokens?.output)}</td><td class="num">${compact(o.tokens?.cache_read)}</td>${costTd(o.tokens)}
                <td><span class="cell-muted-text">${fmt(o.first_seen).split(',')[0]}</span></td>
                <td><span class="cell-muted-text">${ago(a.last || o.last_seen)}</span></td>
                <td class="actions"><button class="icon-btn sm" data-stats-org="${esc(o.org_uuid)}" aria-label="Stats for this organisation" title="Stats for this organisation"><i class="bx bx-bar-chart-alt-2" aria-hidden="true"></i></button></td>
              </tr>`;
            }).join('') || `<tr><td colspan="12">${empty('buildings', 'No organisations yet', '')}</td></tr>`}</tbody>
          </table></div>
        </div>`;
    },
  };
  // ---------- devices (approve the machines that push) ----------
  const Devices = {
    data: null,
    token() { try { return sessionStorage.getItem('recall.adminToken') || ''; } catch { return ''; } },
    setToken(t) { try { t ? sessionStorage.setItem('recall.adminToken', t) : sessionStorage.removeItem('recall.adminToken'); } catch {} },
    call(path, opts = {}) { return api(path, { ...opts, headers: { 'X-Admin-Token': this.token() } }); },
    async show() {
      if (!isReady) { $('#dv-body').innerHTML = empty('loader-alt', 'Starting up', ''); return; }
      $('#dv-body').innerHTML = Skel.table('', 7, 3);
      try {
        this.data = await this.call('/api/devices');
      } catch (e) {
        if (e.status === 401) {
          $('#dv-login').hidden = false;
          $('#dv-logout').hidden = true;
          $('#dv-banner').innerHTML = this.token() ? '<div class="banner danger"><i class="bx bx-error-circle icon-16" aria-hidden="true"></i><div class="banner-body"><span class="banner-title">That admin token is not right</span></div></div>' : '';
          $('#dv-body').innerHTML = '';
          $('#dv-token').focus();
          return;
        }
        $('#dv-body').innerHTML = empty('error-circle', 'Couldn’t load devices', esc(e.message));
        return;
      }
      $('#dv-login').hidden = true;
      $('#dv-logout').hidden = !this.token();
      const d = this.data;
      $('#dv-banner').innerHTML = !d.tenants.length ? `<div class="banner info"><i class="bx bx-info-circle icon-16" aria-hidden="true"></i><div class="banner-body">
          <span class="banner-title">No enrollment token set</span>
          <span>Hooks on this machine push without one (tenant “local”). To let other machines push, start the server with <code>ENROLL_TOKENS=&lt;org&gt;:&lt;token&gt;</code> and give the token to their hooks, e.g. in managed settings. See Guide → Hooks.</span></div></div>`
        : !d.adminTokenSet ? `<div class="banner warning"><i class="bx bx-error icon-16" aria-hidden="true"></i><div class="banner-body">
          <span class="banner-title">No ADMIN_TOKEN set</span><span>Anyone who can open this page can approve devices. Set <code>ADMIN_TOKEN</code> before exposing the server.</span></div></div>` : '';
      this.render();
    },
    render() {
      const d = this.data;
      const order = { pending: 0, approved: 1, rejected: 2 };
      const list = [...d.devices].sort((a, b) => (order[a.status] - order[b.status]) || String(b.created_at).localeCompare(String(a.created_at)));
      const badge = (s) => s === 'pending' ? '<span class="status paused"><span class="pulse"></span> Waiting for approval</span>'
        : s === 'approved' ? '<span class="status"><span class="pulse"></span> Approved</span>'
        : '<span class="status error"><span class="pulse"></span> Rejected</span>';
      const n = list.filter((x) => x.status === 'pending').length;
      $('#dv-body').innerHTML = `
        <div class="table-card">
          <div class="card-head"><div><h3>Devices</h3><p class="card-sub">${plural(list.length, 'device')}${n ? ` · ${num(n)} waiting for you` : ''}</p></div></div>
          <div class="table-scroll"><table class="ds compact">
            <thead><tr><th>Who</th><th>Machine</th><th>Tenant</th><th>Status</th><th>Asked</th><th>Last seen</th><th class="actions"></th></tr></thead>
            <tbody>${list.map((x) => `<tr>
              <td><div class="person-cell"><span class="avatar-soft">${esc(initials(x.name || x.email || '?'))}</span><div class="pc-text">
                <span class="pc-name">${esc(x.name || x.email || 'Unknown account')}</span><span class="pc-sub">${esc([x.email, x.org_name].filter(Boolean).join(' · ') || '—')}</span></div></div></td>
              <td><span class="mono">${esc(x.hostname || '—')}</span><div class="pc-sub mono" title="${esc(x.device_id)}">${esc(x.device_id.slice(0, 8))}</div></td>
              <td><span class="chip grey">${esc(x.tenant_id)}</span></td>
              <td>${badge(x.status)}</td>
              <td><span class="cell-muted-text">${ago(x.created_at)}</span></td>
              <td><span class="cell-muted-text">${x.last_seen_at ? ago(x.last_seen_at) : '—'}</span></td>
              <td class="actions">
                ${x.status !== 'approved' && x.status !== 'rejected' ? `<button class="btn btn-sm btn-custom-primary" data-dv="approve" data-id="${esc(x.device_id)}"><i class="bx bx-check" aria-hidden="true"></i> Approve</button>` : ''}
                ${x.status !== 'rejected' ? `<button class="btn btn-sm btn-header" data-dv="reject" data-id="${esc(x.device_id)}"><i class="bx bx-x" aria-hidden="true"></i> ${x.status === 'approved' ? 'Revoke' : 'Reject'}</button>` : ''}
              </td>
            </tr>`).join('') || `<tr><td colspan="7">${empty('devices', 'No devices yet', 'A machine appears here after its hook first asks to push (it needs CLAUDE_RECALL_ENROLL_TOKEN).')}</td></tr>`}</tbody>
          </table></div>
        </div>`;
    },
    async decide(id, action) {
      try {
        const r = await this.call(`/api/devices/${encodeURIComponent(id)}/${action}`, { method: 'POST' });
        toast(action === 'approve' ? 'Device approved' : 'Device rejected',
          action === 'approve' ? 'Its next push gets a token and sends everything it kept.' : 'It gets APPROVAL_REJECTED and stops sending; a new Claude Code session asks again.');
        const i = this.data.devices.findIndex((x) => x.device_id === id);
        if (i >= 0) this.data.devices[i] = r.device;
        this.render();
      } catch (e) { toast('Couldn’t change the device', e.message, 'danger'); }
    },
  };
  $('#dv-login').addEventListener('submit', (e) => {
    e.preventDefault();
    Devices.setToken($('#dv-token').value.trim());
    $('#dv-token').value = '';
    Devices.show();
  });
  $('#dv-logout').addEventListener('click', () => { Devices.setToken(''); Devices.show(); });
  $('#dv-refresh').addEventListener('click', () => Devices.show());
  $('#dv-body').addEventListener('click', (e) => {
    const b = e.target.closest('[data-dv]');
    if (b) Devices.decide(b.dataset.id, b.dataset.dv);
  });

  // ← → switch between split panes (not while typing, in a dialog, or on a control that uses arrows itself)
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (currentTab !== 'chat' || Panes.list.length < 2 || $('#modal-root').childElementCount) return;
    if (e.target.closest('input, textarea, select, [contenteditable], [role="tab"], [role="separator"], .seg, pre')) return;
    e.preventDefault();
    Panes.step(e.key === 'ArrowLeft' ? -1 : 1);
  });
  $('#ac-tabs').addEventListener('click', (e) => {
    const t = e.target.closest('[data-ac-tab]');
    if (t) Accounts.setTab(t.dataset.acTab);
  });
  $('#ac-tabs').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const next = Accounts.tab === 'users' ? 'orgs' : 'users';
    Accounts.setTab(next);
    $(`#ac-tab-${next}`).focus();
  });
  $('#ac-body').addEventListener('click', (e) => {
    const u = e.target.closest('[data-stats-account]');
    const o = e.target.closest('[data-stats-org]');
    if (!u && !o) return;
    Stats.account = u ? u.dataset.statsAccount : '';
    Stats.org = o ? o.dataset.statsOrg : '';
    location.hash = '#/stats';
  });
  $('#st-body').addEventListener('click', (e) => {
    const metric = e.target.closest('#st-metric .seg-btn');
    if (metric) {
      Stats.metric = metric.dataset.v;
      document.querySelectorAll('#st-metric .seg-btn').forEach((x) => { x.classList.toggle('is-on', x === metric); x.setAttribute('aria-pressed', x === metric); });
      return Stats.charts();
    }
    const open = e.target.closest('[data-open]');
    if (open) {
      Tree.toggle(open.dataset.project, true).catch(() => {});
      Panes.open(open.dataset.open);
      location.hash = '#/chat';
      return;
    }
    const fa = e.target.closest('[data-filter-account]');
    if (fa) { Stats.account = fa.dataset.filterAccount; $('#st-account').value = Stats.account; return Stats.load(); }
    const fo = e.target.closest('[data-filter-org]');
    if (fo) { Stats.org = fo.dataset.filterOrg; $('#st-org').value = Stats.org; return Stats.load(); }
    const dp = e.target.closest('[data-del-project]');
    if (dp) return Delete.run({ kind: 'project', id: dp.dataset.delProject, name: dp.dataset.name, counts: plural(+dp.dataset.count, 'message') });
    const ds = e.target.closest('[data-del-session]');
    if (ds) return Delete.run({ kind: 'session', id: ds.dataset.delSession, name: ds.dataset.name, counts: plural(+ds.dataset.count, 'message') });
  });
  new ResizeObserver(() => { if (currentTab === 'stats' && Stats.data) Stats.charts(); }).observe($('#st-body'));

  // ---------- guide: table of contents + scroll spy ----------
  const Guide = {
    built: false,
    show() {
      if (this.built) return;
      this.built = true;
      const secs = [...document.querySelectorAll('#guide-body .guide-sec')];
      $('#guide-toc').innerHTML = `<div class="sh-nav-label toc-label">On this page</div>` +
        secs.map((s) => `<a class="toc-item" href="#/guide" data-to="${s.id}">${esc(s.dataset.title)}</a>`).join('');
      $('#guide-toc').addEventListener('click', (e) => {
        const a = e.target.closest('[data-to]');
        if (!a) return;
        e.preventDefault();
        lock = a.dataset.to;
        mark(lock);
        document.getElementById(a.dataset.to).scrollIntoView({ behavior: 'smooth', block: 'start' });
        clearTimeout(unlock);
        unlock = setTimeout(() => (lock = null), 900);
      });
      const page = $('#view-guide');
      let lock = null, unlock = null;
      const mark = (id) => document.querySelectorAll('.toc-item').forEach((a) => a.classList.toggle('active', a.dataset.to === id));
      const spy = () => {
        if (lock) return; // a TOC click is scrolling; keep its item lit
        const top = page.getBoundingClientRect().top + page.clientHeight * 0.3;
        let cur = secs[0];
        for (const s of secs) if (s.getBoundingClientRect().top <= top) cur = s;
        if (page.scrollTop + page.clientHeight >= page.scrollHeight - 4) cur = secs[secs.length - 1];
        mark(cur.id);
      };
      page.addEventListener('scroll', spy, { passive: true });
      spy();
    },
  };

  // ---------- router ----------
  let currentTab = 'chat';
  function markNav() {
    document.querySelectorAll('.sh-sidebar-panel > .sh-nav-item[data-tab]').forEach((a) => {
      const on = a.dataset.tab === currentTab;
      a.classList.toggle('active', on);
      on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
    });
  }
  function route() {
    let [, tab = 'chat', ...rest] = location.hash.split('/');
    // deep link from search: #/timeline/<project>/<session>/<message>
    if (tab === 'timeline') {
      const [project, session, msg] = rest.map(decodeURIComponent);
      history.replaceState(null, '', '#/chat');
      tab = 'chat';
      if (session) {
        if (project) Tree.toggle(project, true).catch(() => {});
        Panes.open(session, { focus: msg || null });
      }
    }
    currentTab = tab;
    if (tab !== 'sync') Sync.closeStream();
    document.querySelectorAll('.view').forEach((v) => (v.hidden = v.id !== `view-${tab}`));
    markNav();
    Tree.render();
    $('#pane-add').hidden = tab !== 'chat';
    if (tab === 'chat') Panes.list.forEach((p) => p.updateJump());
    if (tab === 'search') Search.show();
    if (tab === 'sync') Sync.show();
    if (tab === 'settings') { Prefs.apply(); Prices.show(); }
    if (tab === 'stats') Stats.show();
    if (tab === 'accounts') Accounts.show();
    if (tab === 'devices') Devices.show();
    if (tab === 'projects') ProjectsPage.show();
    if (tab === 'guide') Guide.show();
  }

  // ---------- search ----------
  const Search = {
    mode: 'hybrid',
    async show() {
      if (isReady && !Tree.projects.length) await Tree.loadProjects().catch(() => {});
      if (!$('#s-results').innerHTML) $('#s-results').innerHTML = empty('search', 'Search your Claude history', 'Type a question in your own words — Hinglish works too.');
      $('#s-q').focus();
    },
    highlight(html, q) {
      const words = q.split(/\s+/).filter((w) => w.length > 2).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      if (!words.length) return html;
      const re = new RegExp(`(${words.join('|')})`, 'gi');
      const div = document.createElement('div');
      div.innerHTML = html;
      const walk = document.createTreeWalker(div, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walk.nextNode()) nodes.push(walk.currentNode);
      for (const n of nodes) {
        if (!re.test(n.nodeValue)) continue;
        re.lastIndex = 0;
        const span = document.createElement('span');
        span.innerHTML = esc(n.nodeValue).replace(re, '<mark>$1</mark>');
        n.replaceWith(span);
      }
      return div.innerHTML;
    },
    async run() {
      const q = $('#s-q').value.trim();
      if (!q) return;
      const params = new URLSearchParams({ q, project: $('#s-project').value, role: $('#s-role').value, mode: this.mode });
      $('#s-meta').textContent = 'Searching…';
      $('#s-results').innerHTML = Skel.cards(3);
      const t0 = performance.now();
      try {
        const { results } = await api(`/api/search?${params}`);
        $('#s-meta').textContent = `${results.length} matching records · ${Math.round(performance.now() - t0)} ms`;
        const projName = (slug) => Tree.projects.find((p) => p.slug === slug)?.name || slug;
        $('#s-results').innerHTML = results.map((r) => {
          const user = r.role === 'user';
          const body = user ? `<div class="md-prose"><p>${esc(r.text).replace(/\n/g, '<br>')}</p></div>` : `<div class="md-prose">${md(r.text)}</div>`;
          const scores = [r.semantic != null ? `semantic ${r.semantic.toFixed(3)}` : '', r.keyword != null ? `keyword ${r.keyword.toFixed(2)}` : ''].filter(Boolean).join(' · ');
          return `<div class="card"><div class="card-pad">
            <div class="result-meta">
              <span class="chip${user ? ' grey' : ''}"><i class="bx ${user ? 'bx-user' : 'bx-bot'} icon-12" aria-hidden="true"></i> ${user ? 'You asked' : 'Claude replied'}</span>
              <span class="chip grey"><i class="bx bx-folder icon-12" aria-hidden="true"></i> ${esc(r.project_name || projName(r.project))}</span>
              <span class="muted">${fmt(r.timestamp)}</span>
              <span class="spacer"></span>
              <span class="muted mono">${scores}</span>
            </div>
            ${r.prompt ? `<div class="md-prose result-q"><blockquote>${esc(r.prompt.length > 400 ? r.prompt.slice(0, 400) + '…' : r.prompt)}</blockquote></div>` : ''}
            <div class="result-body">${this.highlight(body, q)}${images(r.images)}</div>
            <div class="result-actions">
              <button type="button" class="btn btn-sm btn-custom-secondary" data-act="expand">Show more</button>
              <a class="btn btn-sm btn-header" href="#/timeline/${encodeURIComponent(r.project)}/${encodeURIComponent(r.session_id)}/${encodeURIComponent(r.id)}"><i class="bx bx-message-detail" aria-hidden="true"></i> Open in chat</a>
            </div>
          </div></div>`;
        }).join('') || empty('search', 'No matches', 'Try different words, or switch the mode to Keyword or Semantic.');
        document.querySelectorAll('#s-results .card').forEach((card) => {
          const b = card.querySelector('.result-body');
          const clipped = b.scrollHeight > b.clientHeight + 4;
          b.classList.toggle('clip', clipped);
          card.querySelector('[data-act=expand]').hidden = !clipped;
        });
      } catch (e) {
        $('#s-meta').textContent = '';
        $('#s-results').innerHTML = empty('error-circle', 'Search didn’t work', esc(e.message));
      }
    },
  };
  $('#s-form').addEventListener('submit', (e) => { e.preventDefault(); Search.run(); });
  $('#s-mode').addEventListener('click', (e) => {
    const b = e.target.closest('.seg-btn');
    if (!b) return;
    Search.mode = b.dataset.mode;
    document.querySelectorAll('#s-mode .seg-btn').forEach((x) => {
      x.classList.toggle('is-on', x === b);
      x.setAttribute('aria-pressed', x === b);
    });
    if ($('#s-q').value.trim()) Search.run();
  });
  $('#s-results').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act=expand]');
    if (!b) return;
    const body = b.closest('.card').querySelector('.result-body');
    body.classList.toggle('open');
    b.textContent = body.classList.contains('open') ? 'Show less' : 'Show more';
  });

  // ---------- sync ----------
  const Sync = {
    data: null,
    selected: new Set(),
    stream: null,
    async show() {
      this.openStream();
      if (!isReady) {
        $('#sy-state').textContent = 'Starting up — the first run downloads the embedding model.';
        return;
      }
      await this.refresh();
    },
    /** Log + live progress, only while the Sync page is open. */
    openStream() {
      if (this.stream) return;
      const ev = new EventSource('/api/events?detail=1');
      this.stream = ev;
      ev.addEventListener('log', (m) => {
        const log = $('#sy-log');
        log.insertAdjacentHTML('beforeend', this.logLine(JSON.parse(m.data)));
        log.scrollTop = log.scrollHeight;
      });
      let wasRunning = null;
      ev.addEventListener('status', (m) => {
        const { running, progress } = JSON.parse(m.data);
        renderProgress(running, progress);
        if (this.data) { this.data.running = running; this.updateButtons(); }
        if (wasRunning && !running) this.refresh(); // a job just ended: one refresh of counts
        wasRunning = running;
      });
      ev.onerror = () => { ev.close(); this.stream = null; if (currentTab === 'sync') setTimeout(() => this.openStream(), 3000); };
    },
    closeStream() {
      if (this.stream) { this.stream.close(); this.stream = null; }
    },
    async retryDead() {
      try {
        const r = await api('/api/queue/retry-dead', { method: 'POST' });
        toast(r.retried ? `${plural(r.retried, 'job')} sent back to the queue` : 'Nothing to retry', '');
        this.refresh();
      } catch (e) { toast('Couldn’t retry', e.message, 'danger'); }
    },
    renderHealth(h, settings) {
      if (!h) return;
      renderProgress(h.running, null);
      const fmtAgo = (iso) => (iso ? `${ago(iso)} <span class="muted">· ${fmt(iso)}</span>` : '<span class="muted">Not yet</span>');
      const ok = (good, text) => `<span class="status${good ? '' : ' error'}"><span class="pulse"></span> ${esc(text)}</span>`;
      $('#sh-kv').innerHTML = `
        <dt>Last reply saved by the hook</dt><dd>${fmtAgo(h.lastHookAt)}</dd>
        <dt>Last full sync</dt><dd>${h.lastSyncAt ? fmtAgo(h.lastSyncAt) : '<span class="muted">Not since the app started</span>'}</dd>
        <dt>Auto-sync</dt><dd>${settings.autoSync ? `On · every ${plural(settings.intervalMinutes, 'minute')}` : '<span class="muted">Off: only the hook and the buttons save messages</span>'}</dd>
        <dt>Embedding model</dt><dd>${ok(h.embedding?.state === 'ready', h.embedding?.state === 'ready' ? h.embedding.detail : h.embedding?.detail || 'Not ready')}</dd>
        <dt>Elasticsearch</dt><dd>${ok(h.elasticsearch === 'green' || h.elasticsearch === 'yellow', h.elasticsearch === 'unreachable' ? 'Unreachable' : `Cluster ${h.elasticsearch}`)}</dd>
        ${this.queueRows(h)}
        <dt>Last error</dt><dd>${h.lastError ? `<span class="err">${esc(h.lastError.msg)}</span> <span class="muted">· ${ago(h.lastError.ts).toLowerCase()}</span>` : '<span class="muted">None since the app started</span>'}</dd>`;
    },
    /** RabbitMQ / Redis / workers / dead-letter queue rows of the health card. */
    queueRows(h) {
      const q = h.queue;
      if (!q) return '<dt>Job queue</dt><dd><span class="status error"><span class="pulse"></span> RabbitMQ unreachable</span></dd>';
      const waiting = q.ingest.waiting + q.maintenance.waiting;
      const later = q.retrying.waiting + q.locked.waiting;
      const workers = q.ingest.workers;
      const ok = (good, text) => `<span class="status${good ? '' : ' error'}"><span class="pulse"></span> ${esc(text)}</span>`;
      return `
        <dt>Job queue</dt><dd>${ok(true, 'RabbitMQ')} <span class="muted">· ${waiting ? `${plural(waiting, 'job')} waiting` : 'nothing waiting'}${later ? ` · ${num(later)} to retry shortly` : ''}</span></dd>
        <dt>Workers</dt><dd>${workers ? `${plural(workers, 'worker')} fetching jobs` : '<span class="err">No worker running: jobs wait until one starts</span>'}</dd>
        <dt>Session locks</dt><dd>${ok(h.redis === 'ok', h.redis === 'ok' ? 'Redis' : 'Redis unreachable')}</dd>
        <dt>Failed jobs</dt><dd>${q.dlq.waiting ? `<span class="err">${plural(q.dlq.waiting, 'job')} gave up after 3 tries</span>
            <button type="button" class="btn btn-sm btn-header sh-retry" id="sh-retry"><i class="bx bx-revision" aria-hidden="true"></i> Try again</button>
            <ul class="sh-dead">${(h.dead || []).map((d) => `<li><span class="mono">${esc(d.label || d.type || 'job')}${d.session ? ` · ${esc(d.session.slice(0, 8))}` : ''}</span> <span class="muted">${esc(d.error || '')}${d.failedAt ? ` · ${ago(d.failedAt).toLowerCase()}` : ''}</span></li>`).join('')}</ul>`
          : '<span class="muted">None</span>'}</dd>`;
    },
    async refresh() {
      $('#sy-state').textContent = 'Scanning transcripts…';
      if (!this.data) $('#sy-rows').innerHTML = Skel.rows(7, 5);
      try {
        this.data = await api('/api/sync/status');
      } catch (e) {
        $('#sy-state').textContent = `Couldn’t read sync status: ${e.message}`;
        return;
      }
      const { settings, projects, running, lastSyncAt, log } = this.data;
      this.renderHealth(this.data.health, settings);
      $('#sy-auto').checked = settings.autoSync;
      $('#sy-interval').value = String(settings.intervalMinutes);
      $('#sy-interval').disabled = !settings.autoSync;
      $('#sy-mode').innerHTML = this.data.localMode ? '' : `<div class="banner info"><i class="bx bx-info-circle icon-16" aria-hidden="true"></i><div class="banner-body">
          <span class="banner-title">Push mode: this server has no transcripts folder</span>
          <span>Each machine’s hook sends its new lines itself (see Devices). Sync, auto-sync and catch-up need local mode, so they are off here.</span></div></div>`;
      const pending = projects.filter((p) => !p.excluded).reduce((a, p) => a + p.pending, 0);
      $('#sy-state').textContent = `Last sync ${ago(lastSyncAt).toLowerCase()} · ${num(pending)} messages waiting${running ? ' · sync running' : ''}`;
      $('#sy-rows').innerHTML = projects.map((p) => `
        <tr class="${p.excluded ? 'excluded' : ''}">
          <td class="row-check"><input type="checkbox" class="row-checkbox" data-slug="${esc(p.slug)}" aria-label="Select ${esc(p.name)}" ${this.selected.has(p.slug) ? 'checked' : ''} ${p.excluded ? 'disabled' : ''}></td>
          <td><div class="person-cell"><span class="avatar-soft"><i class="bx bx-folder" aria-hidden="true"></i></span><div class="pc-text">
            <span class="pc-name">${esc(p.name)} ${p.excluded ? '<span class="status draft">Excluded</span>' : ''}</span>
            <span class="pc-sub" title="${esc(p.path || p.slug)}">${esc(p.path || p.slug)}</span></div></div></td>
          <td class="num">${num(p.sessions)}</td>
          <td class="num">${num(p.indexed)}</td>
          <td class="num">${p.pending && !p.excluded ? `<span class="count-badge">${num(p.pending)}</span>` : num(p.pending)}</td>
          <td><span class="cell-muted-text">${ago(p.lastSynced)}</span></td>
          <td class="actions"><div class="row-actions">
            <button class="btn btn-sm btn-custom-secondary" data-act="sync" data-slug="${esc(p.slug)}" ${p.excluded ? 'disabled' : ''}><i class="bx bx-sync" aria-hidden="true"></i> Sync</button>
            <button class="btn btn-sm btn-header" data-act="exclude" data-slug="${esc(p.slug)}">${p.excluded ? 'Include' : 'Exclude'}</button>
            <button class="icon-btn sm" data-act="delete" data-slug="${esc(p.slug)}" data-name="${esc(p.name)}" data-count="${p.indexed}" ${p.indexed ? '' : 'disabled'} aria-label="Delete ${esc(p.name)} data" title="Delete this project's data from Claude Recall"><i class="bx bx-trash" aria-hidden="true"></i></button>
          </div></td>
        </tr>`).join('') || `<tr><td colspan="7">${empty('folder-open', 'No transcripts found', 'Nothing in ~/.claude/projects yet.')}</td></tr>`;
      this.renderLog(log);
      this.updateButtons();
    },
    renderLog(entries) {
      $('#sy-log').innerHTML = entries.map((e) => this.logLine(e)).join('');
      $('#sy-log').scrollTop = $('#sy-log').scrollHeight;
    },
    logLine(e) {
      const t = new Date(e.ts).toLocaleTimeString('en-IN', { hour12: false });
      return `<div class="${/ERROR/.test(e.msg) ? 'err' : ''}">${esc(t)}  ${esc(e.msg)}</div>`;
    },
    updateButtons() {
      const running = !!this.data?.running || this.data?.localMode === false;
      $('#sy-selected').disabled = running || !this.selected.size;
      $('#sy-all').disabled = running;
      $('#sy-auto').disabled = this.data?.localMode === false;
      $('#sy-selected span').textContent = this.selected.size ? `Sync selected (${this.selected.size})` : 'Sync selected';
      document.querySelectorAll('#sy-rows [data-act=sync]').forEach((b) => (b.disabled = running || b.closest('tr').classList.contains('excluded')));
    },
    async start(body) {
      try {
        await api('/api/sync', { method: 'POST', body });
        if (this.data) this.data.running = 'manual';
        this.updateButtons();
      } catch (e) {
        $('#sy-state').textContent = e.message;
      }
    },
    async saveSettings(patch) {
      const { settings } = await api('/api/settings', { method: 'POST', body: patch });
      this.data.settings = settings;
      $('#sy-interval').disabled = !settings.autoSync;
    },
  };
  $('#sy-all').addEventListener('click', () => Sync.start({ all: true }));
  $('#sy-selected').addEventListener('click', () => Sync.start({ projects: [...Sync.selected] }));
  $('#sy-rescan').addEventListener('click', () => Sync.refresh());
  $('#sy-auto').addEventListener('change', (e) => Sync.saveSettings({ autoSync: e.target.checked }));
  $('#sy-interval').addEventListener('change', (e) => Sync.saveSettings({ intervalMinutes: Number(e.target.value) }));
  $('#sy-check-all').addEventListener('change', (e) => {
    Sync.selected = new Set(e.target.checked ? Sync.data.projects.filter((p) => !p.excluded).map((p) => p.slug) : []);
    document.querySelectorAll('#sy-rows input[type=checkbox]:not(:disabled)').forEach((c) => (c.checked = e.target.checked));
    Sync.updateButtons();
  });
  $('#sy-rows').addEventListener('change', (e) => {
    const slug = e.target.dataset.slug;
    if (!slug) return;
    e.target.checked ? Sync.selected.add(slug) : Sync.selected.delete(slug);
    Sync.updateButtons();
  });
  $('#sy-rows').addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    const slug = b.dataset.slug;
    if (b.dataset.act === 'sync') return Sync.start({ projects: [slug] });
    if (b.dataset.act === 'delete') return Delete.run({ kind: 'project', id: slug, name: b.dataset.name, counts: plural(+b.dataset.count, 'message') });
    const excluded = new Set(Sync.data.settings.excluded);
    excluded.has(slug) ? excluded.delete(slug) : excluded.add(slug);
    Sync.selected.delete(slug);
    await Sync.saveSettings({ excluded: [...excluded] });
    Sync.refresh();
  });

  // ---------- live updates: one quiet stream, only real changes ----------
  // The server sends `changed` once per finished job, listing the sessions that got new data.
  // Only panes showing those sessions and open sidebar groups of those projects are re-fetched.
  function connectEvents() {
    const ev = new EventSource('/api/events');
    ev.addEventListener('hello', async () => { if (!isReady) { await health(); if (isReady) startApp(); } else setHealth('', 'Ready'); });
    ev.addEventListener('changed', (m) => {
      const list = JSON.parse(m.data);
      const sessions = new Set(list.map((c) => c.session));
      Panes.list.forEach((p) => { if (p.session && sessions.has(p.session)) p.load({ refresh: true }).catch(() => {}); });
      for (const slug of new Set(list.map((c) => c.project))) Tree.refreshProject(slug).catch(() => {});
    });
    ev.onerror = () => { ev.close(); setHealth('error', 'Service unreachable'); setTimeout(connectEvents, 3000); };
  }

  // ---------- boot ----------
  let started = false;
  async function startApp() {
    if (started) return;
    started = true;
    await Tree.loadProjects().catch(() => {});
    route();
    Panes.loadAll();
  }
  window.addEventListener('hashchange', route);
  (async function boot() {
    Prefs.apply();
    Panes.restore();
    await health();
    if (!location.hash) history.replaceState(null, '', '#/chat');
    if (isReady) await startApp();
    else {
      route();
      // still starting (first run downloads the model): check now and then until ready
      const t = setInterval(async () => { if (await health()) { clearInterval(t); startApp(); } }, 5000);
    }
    connectEvents();
  })();
})();
