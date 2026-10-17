/*!
 * StringHub UI — optional behaviour for plain-HTML pages built with design-system.css.
 * No dependencies. Load once:  <script src="…/stringhub-ui.js" defer></script>
 * (or `import '@stringhub/theme/ui'` in a bundler). Everything is driven by
 * attributes and event delegation, so content added later works too.
 * Frameworks (React, Vue…) should manage this state themselves and skip this file.
 *
 *   Theme       <button data-sh-theme-toggle>          toggles html[data-theme] light/dark (remembered)
 *   Sidebar     <button data-sh-sidebar-toggle>        toggles .sh-sidebar.collapsed
 *   Overlays    <button data-sh-open="invite">         opens #invite (.modal-backdrop / .drawer-scrim, hidden attr)
 *               <button data-sh-close>                 closes the overlay it is inside
 *               Esc, backdrop click, focus trap and focus return are automatic.
 *   Tabs        [role="tablist"] > [role="tab"][aria-controls]   click / ← → switch panels
 *   Toggles     .filter-tabs, .seg, .pill-nav, .view-toggle, .status-toggle (without role=tablist)   single-select buttons
 *               .opt-chips                             multi-select (add data-single for single)
 *   Cards       [data-sh-select="single|multi"] > .pick-card / .choice-card    .selected state
 *               .opt-card with a radio/checkbox inside  .selected follows the input
 *   Dropdown    .ds-dropdown > .ds-dropdown-trigger + .ds-dropdown-menu
 *   Dismiss     <button data-sh-dismiss>               removes the closest .banner / .toast
 *   Toasts      StringHubUI.toast({ title, message, tone: 'success'|'danger'|'warning'|'info', timeout, action })
 *               <button data-sh-toast="success" data-title="Saved" data-message="…">
 *   Dropzone    .dropzone containing <input type="file">  → fires `sh-files` (detail: FileList), fills [data-sh-files]
 *   Avatar      .avatar-upload containing <input type="file" accept="image/*">  → previews the image, fires `sh-avatar`
 *   Filters     .filter-chip <button> removes that chip; .filter-clear removes all chips in its .filter-bar → `sh-filters`
 *   Kanban      .board-card[draggable="true"] can be dragged between .board-card-list columns → `sh-card-move`
 *   Hotkey      <button data-sh-hotkey="mod+k">  ⌘K / Ctrl+K clicks it (e.g. opens the search dialog)
 *   Filter list <input data-sh-filter="results-id">  hides [data-sh-filter-item] rows that don't match, shows
 *               [data-sh-filter-empty] when nothing does, fills [data-sh-filter-count]; ↑ ↓ move .active, Enter opens it.
 *               <button data-sh-clear> empties the input next to it.
 *   Tickets     .tk-views button[data-view] shows the matching .tk-view[data-view] inside [data-tk-page] → `sh-view`;
 *               .tk-check toggles .on; [data-tk-note] switch puts its .tk-cform in note mode
 *   Gallery     .gv-group / .gv-card / .gv-sort button   single-select within their list → `sh-gallery-select`
 *   Editor      [data-sh-rte] > .rte-toolbar [data-cmd="bold|italic|…|formatBlock" data-value] + .rte-content[contenteditable]
 *               (demo-grade, uses execCommand; real apps use TipTap/ProseMirror with the same classes)
 */
(function () {
  'use strict';
  if (typeof window === 'undefined' || window.StringHubUI) return;

  var doc = document;
  var root = doc.documentElement;
  var THEME_KEY = 'sh-theme';
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function byId(id) { return doc.getElementById(String(id).replace(/^#/, '')); }

  // ---------------------------------------------------------------- theme
  function setTheme(mode) {
    root.setAttribute('data-theme', mode);
    try { localStorage.setItem(THEME_KEY, mode); } catch (e) { /* storage blocked */ }
  }
  // Restore the remembered theme only on pages that offer the toggle, so a page that
  // manages its own theme (or has none) is never switched behind its back.
  function restoreTheme() {
    if (!$('[data-sh-theme-toggle]')) return;
    try {
      var saved = localStorage.getItem(THEME_KEY);
      if (saved) root.setAttribute('data-theme', saved);
    } catch (e) { /* storage blocked */ }
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', restoreTheme); else restoreTheme();

  // ---------------------------------------------------------------- overlays
  var stack = [];   // [{ el, opener }]

  function isOverlay(el) {
    return el && (el.classList.contains('modal-backdrop') || el.classList.contains('drawer-scrim') || el.hasAttribute('data-sh-overlay'));
  }
  function openOverlay(target, opener) {
    var el = typeof target === 'string' ? byId(target) : target;
    if (!el || !el.hidden) return;
    el.hidden = false;
    stack.push({ el: el, opener: opener || doc.activeElement });
    root.style.overflow = 'hidden';
    var panel = $('[role="dialog"]', el) || el;
    var first = $('[autofocus]', panel) || $$(FOCUSABLE, panel).filter(function (n) { return !n.classList.contains('btn-close') && !n.classList.contains('close'); })[0];
    (first || panel).focus && (first || panel).focus();
  }
  function closeOverlay(target) {
    var el = typeof target === 'string' ? byId(target) : target;
    if (!el || el.hidden) return;
    el.hidden = true;
    var i = stack.map(function (s) { return s.el; }).lastIndexOf(el);
    var entry = i >= 0 ? stack.splice(i, 1)[0] : null;
    if (!stack.length) root.style.overflow = '';
    if (entry && entry.opener && entry.opener.focus) entry.opener.focus();
  }

  // ---------------------------------------------------------------- tabs
  function selectTab(tab) {
    var list = tab.closest('[role="tablist"]');
    if (!list) return;
    $$('[role="tab"]', list).forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.classList.toggle('active', on);
      t.tabIndex = on ? 0 : -1;
      var panel = t.getAttribute('aria-controls') && byId(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    });
  }

  // ---------------------------------------------------------------- toggle groups
  function pressInGroup(btn, group) {
    var multi = group.classList.contains('opt-chips') && !group.hasAttribute('data-single');
    var onClass = (group.classList.contains('seg') || group.classList.contains('opt-chips')) ? 'is-on' : 'active';
    if (multi) {
      var now = !btn.classList.contains(onClass);
      btn.classList.toggle(onClass, now);
      btn.setAttribute('aria-pressed', now ? 'true' : 'false');
      return;
    }
    $$('button', group).forEach(function (b) {
      var on = b === btn;
      b.classList.toggle(onClass, on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  // ---------------------------------------------------------------- dropdown
  // Only menus this script opened are auto-closed, so server-rendered / static open menus stay put.
  function closeDropdowns(except) {
    $$('.ds-dropdown-menu[data-sh-open-menu]').forEach(function (m) {
      if (m === except) return;
      m.classList.remove('open');
      m.removeAttribute('data-sh-open-menu');
      var trig = $('.ds-dropdown-trigger', m.parentNode);
      if (trig) { trig.classList.remove('open'); trig.setAttribute('aria-expanded', 'false'); }
    });
  }

  // ---------------------------------------------------------------- toasts
  // Boxicons (loaded by fonts.css), the icon set the StringHub dashboard uses
  var ICONS = { success: 'bx-check-circle', danger: 'bx-error-circle', warning: 'bx-error', info: 'bx-info-circle' };
  function bx(name, size) {
    return '<i class="bx ' + name + ' icon-' + (size || 20) + '" aria-hidden="true"></i>';
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function removeToast(t) {
    if (!t || t.classList.contains('leaving')) return;
    t.classList.add('leaving');
    setTimeout(function () { t.remove(); }, 150);
  }
  function toast(opts) {
    opts = opts || {};
    var tone = ICONS[opts.tone] ? opts.tone : 'info';
    var stackEl = $('.toast-stack:not(.inline)');
    if (!stackEl) {
      stackEl = doc.createElement('div');
      stackEl.className = 'toast-stack';
      stackEl.setAttribute('aria-live', 'polite');
      doc.body.appendChild(stackEl);
    }
    var t = doc.createElement('div');
    t.className = 'toast ' + tone;
    t.setAttribute('role', tone === 'danger' ? 'alert' : 'status');
    t.innerHTML =
      '<span class="toast-ico">' + bx(ICONS[tone], 20) + '</span>' +
      '<div class="toast-body">' +
        (opts.title ? '<div class="toast-title">' + esc(opts.title) + '</div>' : '') +
        (opts.message ? '<div class="toast-msg">' + esc(opts.message) + '</div>' : '') +
        (opts.action ? '<div class="toast-actions"><button type="button">' + esc(opts.action.label) + '</button></div>' : '') +
      '</div>' +
      '<button type="button" class="btn-close" aria-label="Dismiss">' + bx('bx-x', 18) + '</button>';
    if (opts.action) {
      $('.toast-actions button', t).addEventListener('click', function () { opts.action.onClick && opts.action.onClick(); removeToast(t); });
    }
    $('.btn-close', t).addEventListener('click', function () { removeToast(t); });
    var timeout = opts.timeout == null ? (tone === 'danger' ? 8000 : 5000) : opts.timeout;
    t.style.setProperty('--toast-duration', timeout > 0 ? timeout + 'ms' : '0s');
    if (!(timeout > 0)) t.classList.add('sticky');
    stackEl.appendChild(t);
    if (timeout > 0) setTimeout(function () { removeToast(t); }, timeout);
    return function () { removeToast(t); };
  }

  // ---------------------------------------------------------------- dropzone
  function showFiles(zone, files) {
    var out = $('[data-sh-files]', zone.parentNode) || $('[data-sh-files]', zone);
    if (out) {
      out.innerHTML = Array.prototype.map.call(files, function (f) {
        return '<li>' + bx('bx-file', 16) +
          '<span class="truncate">' + esc(f.name) + '</span><span class="muted" style="margin-left:auto">' + Math.max(1, Math.round(f.size / 1024)) + ' KB</span></li>';
      }).join('');
    }
    zone.dispatchEvent(new CustomEvent('sh-files', { bubbles: true, detail: files }));
  }

  // ---------------------------------------------------------------- delegation
  // ---------------------------------------------------------------- rich text editor (demo-grade, execCommand)
  var RTE_STATE = ['bold', 'italic', 'underline', 'strikeThrough', 'insertUnorderedList', 'insertOrderedList'];
  function syncRte(box) {
    if (!box) return;
    $$('[data-cmd]', box).forEach(function (b) {
      var c = b.getAttribute('data-cmd'), on = false;
      if (RTE_STATE.indexOf(c) >= 0) { try { on = doc.queryCommandState(c); } catch (err) { on = false; } }
      else if (c === 'formatBlock') { try { on = String(doc.queryCommandValue('formatBlock')).toLowerCase() === String(b.getAttribute('data-value')).replace(/[<>]/g, '').toLowerCase(); } catch (err) { on = false; } }
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  doc.addEventListener('mousedown', function (e) {
    if (e.target.closest && e.target.closest('[data-sh-rte] [data-cmd]')) e.preventDefault();   // keep the text selection
  });
  doc.addEventListener('selectionchange', function () {
    var n = doc.getSelection && doc.getSelection().anchorNode;
    var el = n && (n.nodeType === 1 ? n : n.parentNode);
    var box = el && el.closest && el.closest('[data-sh-rte]');
    if (box) syncRte(box);
  });

  doc.addEventListener('change', function (e) {
    var sw = e.target.closest && e.target.closest('[data-tk-note]');
    if (!sw) return;
    var form = sw.closest('.tk-cform');
    if (form) form.classList.toggle('note', sw.checked);
  });

  doc.addEventListener('click', function (e) {
    var t = e.target;
    var el;

    if ((el = t.closest('[data-sh-theme-toggle]'))) {
      setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
      return;
    }
    if ((el = t.closest('[data-sh-sidebar-toggle]'))) {
      var shell = el.closest('.sh-shell');
      var sb = el.getAttribute('data-sh-sidebar-toggle') ? byId(el.getAttribute('data-sh-sidebar-toggle')) : ((shell && $('.sh-sidebar', shell)) || $('.sh-sidebar'));
      if (sb) { var c = sb.classList.toggle('collapsed'); el.setAttribute('aria-expanded', c ? 'false' : 'true'); }
      return;
    }
    if ((el = t.closest('[data-sh-open]'))) { e.preventDefault(); openOverlay(el.getAttribute('data-sh-open'), el); return; }
    if ((el = t.closest('[data-sh-close]'))) {
      var ov = el.getAttribute('data-sh-close') ? byId(el.getAttribute('data-sh-close')) : el.closest('.modal-backdrop, .drawer-scrim, [data-sh-overlay]');
      closeOverlay(ov);
      return;
    }
    if (isOverlay(t) && !t.hidden && !t.hasAttribute('data-sh-static')) { closeOverlay(t); return; }

    if ((el = t.closest('[data-sh-dismiss]'))) {
      var box = el.closest('.toast, .banner');
      if (box && box.classList.contains('toast')) removeToast(box); else if (box) box.remove();
      return;
    }
    if ((el = t.closest('[data-sh-toast]'))) {
      toast({ tone: el.getAttribute('data-sh-toast'), title: el.getAttribute('data-title'), message: el.getAttribute('data-message') });
      return;
    }

    if ((el = t.closest('[role="tab"]'))) { selectTab(el); return; }

    var tv = t.closest('.tk-views button[data-view]');
    if (tv) {
      var view = tv.getAttribute('data-view');
      $$('button', tv.parentNode).forEach(function (b) { var on = b === tv; b.classList.toggle('active', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      var pg = tv.closest('[data-tk-page]') || doc;
      $$('.tk-view[data-view]', pg).forEach(function (p) { p.hidden = p.getAttribute('data-view') !== view; });
      pg.dispatchEvent && pg.dispatchEvent(new CustomEvent('sh-view', { bubbles: true, detail: { view: view } }));
      return;
    }
    if ((el = t.closest('.tk-check'))) {
      var onC = el.classList.toggle('on'); el.setAttribute('aria-checked', onC ? 'true' : 'false');
      return;
    }

    var groupBtn = t.closest('.filter-tabs button, .seg .seg-btn, .pill-nav button, .opt-chips .opt-chip, .view-toggle button, .status-toggle button');
    if (groupBtn) {
      var group = groupBtn.closest('.filter-tabs, .seg, .pill-nav, .opt-chips, .view-toggle, .status-toggle');
      if (group && !group.matches('[role="tablist"]')) pressInGroup(groupBtn, group);
    }

    var card = t.closest('.pick-card, .choice-card');
    if (card) {
      var holder = card.closest('[data-sh-select]');
      if (holder) {
        var multi = holder.getAttribute('data-sh-select') === 'multi';
        $$('.pick-card, .choice-card', holder).forEach(function (c) {
          var on = c === card ? (multi ? !c.classList.contains('selected') : true) : (multi ? c.classList.contains('selected') : false);
          c.classList.toggle('selected', on);
          c.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
      }
    }

    var gv = t.closest('.gv-group, .gv-card, .gv-sort button');
    if (gv) {
      var sib = gv.parentNode.children;
      for (var gi = 0; gi < sib.length; gi++) {
        var on2 = sib[gi] === gv, cls = gv.matches('.gv-sort button') ? 'active' : 'selected';
        if (sib[gi].matches('.gv-group, .gv-card, button')) { sib[gi].classList.toggle(cls, on2); sib[gi].setAttribute('aria-pressed', on2 ? 'true' : 'false'); }
      }
      if (gv.matches('.gv-card, .gv-group')) gv.dispatchEvent(new CustomEvent('sh-gallery-select', { bubbles: true, detail: { id: gv.getAttribute('data-id') } }));
      return;
    }

    var rteBtn = t.closest('[data-sh-rte] [data-cmd]');
    if (rteBtn) {
      var ed = $('.rte-content', rteBtn.closest('[data-sh-rte]'));
      var cmd = rteBtn.getAttribute('data-cmd'), val = rteBtn.getAttribute('data-value');
      if (cmd === 'createLink') val = window.prompt('Link URL', 'https://');
      if (ed) { ed.focus(); try { doc.execCommand(cmd, false, val || null); } catch (err) { /* unsupported command */ } }
      syncRte(rteBtn.closest('[data-sh-rte]'));
      return;
    }

    var trig = t.closest('.ds-dropdown-trigger');
    if (trig) {
      var menu = $('.ds-dropdown-menu', trig.parentNode);
      var open = !menu.classList.contains('open');
      closeDropdowns(menu);
      menu.classList.toggle('open', open);
      if (open) menu.setAttribute('data-sh-open-menu', ''); else menu.removeAttribute('data-sh-open-menu');
      trig.classList.toggle('open', open);
      trig.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) { var firstItem = $('.ds-dropdown-item', menu); if (firstItem) firstItem.focus(); }
      return;
    }
    var item = t.closest('.ds-dropdown-item');
    if (item) {
      var m = item.closest('.ds-dropdown-menu');
      if (m && m.hasAttribute('data-sh-select')) {
        $$('.ds-dropdown-item', m).forEach(function (i) { i.classList.toggle('selected', i === item); });
        var label = $('.ds-dropdown-trigger [data-sh-label]', m.parentNode);
        if (label) label.textContent = item.getAttribute('data-value') || item.textContent.trim();
      }
      closeDropdowns();
      var tr = m && $('.ds-dropdown-trigger', m.parentNode);
      if (tr) tr.focus();
      return;
    }
    if (!t.closest('.ds-dropdown')) closeDropdowns();

    var clr = t.closest('[data-sh-clear]');
    if (clr) {
      var inp = $('input', clr.parentNode);
      if (inp) { inp.value = ''; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.focus(); }
      return;
    }

    var chipBtn = t.closest('.filter-chip button');
    var clearBtn = t.closest('.filter-clear');
    if (chipBtn || clearBtn) {
      var bar = (chipBtn || clearBtn).closest('.filter-bar');
      if (chipBtn) chipBtn.closest('.filter-chip').remove();
      else if (bar) $$('.filter-chip', bar).forEach(function (c) { c.remove(); });
      if (bar) bar.dispatchEvent(new CustomEvent('sh-filters', { bubbles: true, detail: $$('.filter-chip', bar).map(function (c) { return c.getAttribute('data-value') || c.textContent.trim(); }) }));
      return;
    }

    var zone = t.closest('.dropzone');
    if (zone) { var input = $('input[type="file"]', zone); if (input && t !== input) input.click(); }
  });

  doc.addEventListener('change', function (e) {
    var t = e.target;
    if (t.matches('.avatar-upload input[type="file"]') && t.files && t.files[0]) {
      var box = t.closest('.avatar-upload');
      var old = $('.avatar-upload-img, img', box);
      var img = doc.createElement('img');
      img.alt = old && old.getAttribute('alt') || 'Profile picture';
      img.src = URL.createObjectURL(t.files[0]);
      if (old) old.replaceWith(img); else box.prepend(img);
      box.dispatchEvent(new CustomEvent('sh-avatar', { bubbles: true, detail: t.files[0] }));
    }
    if (t.matches('.opt-card input[type="radio"], .opt-card input[type="checkbox"]')) {
      var scope = t.type === 'radio' && t.name ? $$('input[type="radio"][name="' + t.name + '"]') : [t];
      scope.forEach(function (i) { var c = i.closest('.opt-card'); if (c) c.classList.toggle('selected', i.checked); });
    }
    if (t.matches('.dropzone input[type="file"]')) showFiles(t.closest('.dropzone'), t.files);
  });

  ['dragenter', 'dragover'].forEach(function (type) {
    doc.addEventListener(type, function (e) {
      var zone = e.target.closest && e.target.closest('.dropzone');
      if (zone) { e.preventDefault(); zone.classList.add('dragover'); }
    });
  });
  ['dragleave', 'drop'].forEach(function (type) {
    doc.addEventListener(type, function (e) {
      var zone = e.target.closest && e.target.closest('.dropzone');
      if (!zone) return;
      e.preventDefault();
      zone.classList.remove('dragover');
      if (type === 'drop' && e.dataTransfer && e.dataTransfer.files.length) showFiles(zone, e.dataTransfer.files);
    });
  });

  // ---------------------------------------------------------------- filterable lists (global search)
  function filterItems(input) {
    var list = byId(input.getAttribute('data-sh-filter'));
    if (!list) return [];
    var q = input.value.trim().toLowerCase();
    var visible = [];
    $$('[data-sh-filter-item]', list).forEach(function (it) {
      var show = !q || it.textContent.toLowerCase().indexOf(q) !== -1;
      it.hidden = !show;
      it.classList.remove('active');
      if (show) visible.push(it);
    });
    $$('[data-sh-filter-group]', list).forEach(function (g) {
      g.hidden = !$$('[data-sh-filter-item]', g).some(function (it) { return !it.hidden; });
    });
    var scope = list.parentNode;
    $$('[data-sh-filter-empty]', scope).forEach(function (e) { e.hidden = visible.length > 0; });
    $$('[data-sh-filter-count]', scope).forEach(function (c) { c.textContent = visible.length + (visible.length === 1 ? ' result' : ' results'); });
    if (visible[0]) visible[0].classList.add('active');
    return visible;
  }
  doc.addEventListener('input', function (e) {
    if (e.target.matches && e.target.matches('input[data-sh-filter]')) filterItems(e.target);
  });
  doc.addEventListener('mouseover', function (e) {
    var it = e.target.closest && e.target.closest('[data-sh-filter-item]');
    if (!it) return;
    $$('[data-sh-filter-item].active', it.parentNode.closest('[id]') || doc).forEach(function (a) { if (a !== it) a.classList.remove('active'); });
    it.classList.add('active');
  });

  // ---------------------------------------------------------------- kanban drag & drop
  var dragCard = null;
  function recount(col) {
    var n = col && $('.bc-count', col);
    if (n) n.textContent = $$('.board-card', col).length;
  }
  doc.addEventListener('dragstart', function (e) {
    var card = e.target.closest && e.target.closest('.board-card[draggable="true"]');
    if (!card) return;
    dragCard = card;
    card.classList.add('dragging');
    if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', card.id || ''); } catch (x) { /* IE */ } }
  });
  doc.addEventListener('dragend', function () {
    if (dragCard) dragCard.classList.remove('dragging');
    $$('.board-column.drop-target').forEach(function (c) { c.classList.remove('drop-target'); });
    dragCard = null;
  });
  doc.addEventListener('dragover', function (e) {
    if (!dragCard) return;
    var list = e.target.closest && e.target.closest('.board-column') && $('.board-card-list', e.target.closest('.board-column'));
    if (!list) return;
    e.preventDefault();
    $$('.board-column.drop-target').forEach(function (c) { if (c !== list.closest('.board-column')) c.classList.remove('drop-target'); });
    list.closest('.board-column').classList.add('drop-target');
    var after = $$('.board-card:not(.dragging)', list).filter(function (c) { var r = c.getBoundingClientRect(); return e.clientY < r.top + r.height / 2; })[0];
    if (after) list.insertBefore(dragCard, after); else list.appendChild(dragCard);
  });
  doc.addEventListener('drop', function (e) {
    if (!dragCard) return;
    var col = e.target.closest && e.target.closest('.board-column');
    if (!col) return;
    e.preventDefault();
    $$('.board-column').forEach(recount);
    col.dispatchEvent(new CustomEvent('sh-card-move', { bubbles: true, detail: { card: dragCard, column: col, index: $$('.board-card', col).indexOf(dragCard) } }));
  });

  doc.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && !e.altKey && (e.key === 'k' || e.key === 'K')) {
      var hot = $('[data-sh-hotkey="mod+k"]');
      if (hot) { e.preventDefault(); hot.click(); return; }
    }
    var fin = e.target.matches && e.target.matches('input[data-sh-filter]') ? e.target : null;
    if (fin && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter')) {
      var list = byId(fin.getAttribute('data-sh-filter'));
      var items = list ? $$('[data-sh-filter-item]', list).filter(function (it) { return !it.hidden; }) : [];
      if (!items.length) return;
      var cur = items.indexOf($('[data-sh-filter-item].active', list));
      if (e.key === 'Enter') { e.preventDefault(); (items[cur] || items[0]).click(); return; }
      e.preventDefault();
      var next = items[(cur + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length];
      items.forEach(function (it) { it.classList.toggle('active', it === next); });
      if (next.scrollIntoView) next.scrollIntoView({ block: 'nearest' });
      return;
    }
    if (e.key === 'Escape') {
      if ($('.ds-dropdown-menu[data-sh-open-menu]')) { closeDropdowns(); return; }
      var top = stack[stack.length - 1];
      if (top && !top.el.hasAttribute('data-sh-static')) closeOverlay(top.el);
      return;
    }
    if (e.key === 'Tab' && stack.length) {             // keep focus inside the open overlay
      var panel = stack[stack.length - 1].el;
      var items = $$(FOCUSABLE, panel).filter(function (n) { return n.offsetParent !== null; });
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
      return;
    }
    var tab = e.target.closest && e.target.closest('[role="tab"]');
    if (tab && (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      var tabs = $$('[role="tab"]', tab.closest('[role="tablist"]'));
      var dir = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : -1;
      var next = tabs[(tabs.indexOf(tab) + dir + tabs.length) % tabs.length];
      e.preventDefault(); next.focus(); selectTab(next);
      return;
    }
    var mItem = e.target.closest && e.target.closest('.ds-dropdown-menu[data-sh-open-menu] .ds-dropdown-item');
    if (mItem && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      var list = $$('.ds-dropdown-item', mItem.closest('.ds-dropdown-menu'));
      e.preventDefault();
      list[(list.indexOf(mItem) + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length].focus();
    }
    if (e.target.matches && e.target.matches('.dropzone') && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault(); var inp = $('input[type="file"]', e.target); if (inp) inp.click();
    }
  });

  window.StringHubUI = {
    open: openOverlay,
    close: closeOverlay,
    toast: toast,
    selectTab: selectTab,
    setTheme: setTheme
  };
})();
