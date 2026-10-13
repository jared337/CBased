/* =========================================================
   CBased Environmental prototype, UI building blocks:
   cards, page headers, phase markers, overlays, toasts.
   ========================================================= */

/* ---------------- Phase markers ----------------
   Every Phase 2 item carries the same small badge, whether it is built as a
   preview or shown as an inactive placeholder. */
CB.p2 = function (txt) { return '<span class="chip chip-p2" title="Phase 2 - Advanced Capabilities & Enhancements">' + CB.icon('sparkle') + (txt || 'Phase 2') + '</span>'; };
CB.placeholder = function (title, text, o) {
  o = o || {};
  return '<section class="card ph2' + (o.cls ? ' ' + o.cls : '') + '" aria-disabled="true"><div class="ph2-b"><div class="ph2-ico">' + CB.icon(o.icon || 'lock') + '</div><div><div class="row" style="gap:8px"><h4>' + CB.esc(title) + '</h4>' + CB.p2() + '</div>' +
    '<p>' + text + '</p>' + (o.mock || '') + '<button class="btn btn-sm" disabled>' + CB.icon('lock') + (o.btn || 'Planned for Phase 2') + '</button></div></div></section>';
};
/* Inline disabled control with a Phase 2 badge (for toggles/buttons inside a working screen). */
CB.p2Btn = function (label, icon) { return '<button class="btn btn-sm p2-btn" disabled title="Planned for Phase 2">' + CB.icon(icon || 'lock') + CB.esc(label) + CB.p2('P2') + '</button>'; };

/* ---------------- Chips ---------------- */
CB.stateChip = function (st) { var m = CB.STATE[st]; return '<span class="st ' + m.cls + '">' + m.label + '</span>'; };
CB.sevChip = function (sev) { var m = CB.SEV[sev]; return '<span class="st ' + m.cls + '">' + m.label + '</span>'; };
CB.alarmStateChip = function (a) {
  if (a.state === 'active') return '<span class="st st-bad">Active · unacknowledged</span>';
  if (a.state === 'acknowledged') return '<span class="st st-warn">Active · acknowledged</span>';
  return '<span class="st st-ok">Cleared</span>';
};
CB.status = function (st) {
  var map = {
    ok: ['st-ok', 'Receiving'], delayed: ['st-warn', 'Delayed'], error: ['st-bad', 'No data'],
    Active: ['st-ok', 'Active'], Invited: ['st-info', 'Invited'], Suspended: ['st-bad', 'Suspended'],
    Valid: ['st-ok', 'Valid'], Suspect: ['st-warn', 'Suspect'], Missing: ['st-bad', 'Missing'], Calm: ['st-idle', 'Calm'], Invalid: ['st-bad', 'Invalid']
  };
  var m = map[st] || ['st-idle', st];
  return '<span class="st ' + m[0] + '">' + m[1] + '</span>';
};
CB.kindChips = function (s) {
  return s.kinds.map(function (k) { return '<span class="chip chip-kind">' + CB.icon(CB.KIND[k].icon) + CB.KIND[k].label + '</span>'; }).join('');
};
CB.clientChip = function (cid) {
  var c = CB.client(cid);
  return '<span class="cl-chip"><i style="background:' + c.color + '"></i>' + CB.esc(c.short) + '</span>';
};

/* ---------------- Cards ---------------- */
CB.card = function (o) {
  o = o || {};
  return '<section class="card ' + (o.cls || '') + '"' + (o.attrs || '') + '>' +
    (o.title || o.actions ? '<div class="card-h"><div><div class="card-t">' + (o.icon ? CB.icon(o.icon) : '') + (o.title ? CB.esc(o.title) : '') + (o.titleExtra || '') + '</div>' + (o.sub ? '<div class="card-s">' + o.sub + '</div>' : '') + '</div>' + (o.actions ? '<div class="card-a">' + o.actions + '</div>' : '') + '</div>' : '') +
    '<div class="card-b' + (o.flush ? ' flush' : '') + '">' + (o.body || '') + '</div>' +
    (o.footer ? '<div class="card-f">' + o.footer + '</div>' : '') +
    '</section>';
};

CB.pageHead = function (o) {
  var back = o.back ? '<div class="ph-back" data-go="' + o.back.go + '">' + CB.icon('back', 'ico') + CB.esc(o.back.label) + '</div>' : '';
  return '<div class="ph"><div>' + back + '<div class="ph-title"><h1>' + CB.esc(o.title) + '</h1>' + (o.chips || '') + '</div>' + (o.sub ? '<div class="ph-sub">' + o.sub + '</div>' : '') + '</div>' +
    (o.actions ? '<div class="ph-actions">' + o.actions + '</div>' : '') + '</div>';
};

CB.kpi = function (label, value, o) {
  o = o || {};
  return '<div class="kpi"><div class="kpi-l">' + (o.icon ? CB.icon(o.icon, 'ico') : '') + label + '</div><div class="kpi-v"' + (o.liveAttr || '') + '>' + value + '</div>' + (o.sub ? '<div class="kpi-d ' + (o.subCls || 'flat') + '">' + o.sub + '</div>' : '') + (o.spark ? '<div class="kpi-spark">' + o.spark + '</div>' : '') + (o.extra || '') + '</div>';
};

CB.empty = function (icon, title, text, extra) {
  return '<div class="empty"><div class="ico-xl">' + CB.icon(icon, 'ico') + '</div><h2>' + title + '</h2><p>' + text + '</p>' + (extra || '') + '</div>';
};

CB.switchHtml = function (label, on, attrs) {
  return '<label class="switch"><input type="checkbox"' + (on ? ' checked' : '') + ' ' + (attrs || '') + '><span class="track"></span>' + (label || '') + '</label>';
};
CB.seg = function (name, opts, cur, attrs) {
  return '<div class="seg"' + (attrs || '') + '>' + opts.map(function (o) {
    var v = Array.isArray(o) ? o[0] : o, l = Array.isArray(o) ? o[1] : o;
    return '<button class="' + (String(v) === String(cur) ? 'on' : '') + '" data-action="' + name + '" data-v="' + CB.esc(v) + '">' + l + '</button>';
  }).join('') + '</div>';
};
CB.ctx = function (items) {
  return '<div class="ctx-note">' + CB.icon('info') + '<div>' + items + '</div></div>';
};
CB.select = function (opts, cur, attrs) {
  return '<select class="select select-sm" ' + (attrs || '') + '>' + opts.map(function (o) {
    var v = Array.isArray(o) ? o[0] : o, l = Array.isArray(o) ? o[1] : o;
    return '<option value="' + CB.esc(v) + '"' + (String(v) === String(cur) ? ' selected' : '') + '>' + CB.esc(l) + '</option>';
  }).join('') + '</select>';
};

/* ---------------- Overlays ---------------- */
CB.overlay = {
  open: function (o) {
    var root = document.getElementById('overlay-root');
    var wrap = document.createElement('div');
    wrap.className = 'ov-backdrop' + (o.side ? ' ov-side' : '');
    wrap.innerHTML = '<div class="ov ' + (o.size || '') + '" role="dialog" aria-modal="true">' +
      '<div class="ov-h"><div><div class="row"><h3>' + CB.esc(o.title) + '</h3>' + (o.chips || '') + '</div>' + (o.sub ? '<div class="sub">' + o.sub + '</div>' : '') + '</div>' +
      '<button class="ov-close" data-action="ov-close" aria-label="Close">' + CB.icon('close') + '</button></div>' +
      '<div class="ov-b">' + (o.body || '') + '</div>' +
      (o.footer ? '<div class="ov-f">' + o.footer + '</div>' : '') + '</div>';
    wrap.addEventListener('mousedown', function (e) { if (e.target === wrap) CB.overlay.close(); });
    root.appendChild(wrap);
    var saved = CB._unmounts; CB._unmounts = [];
    if (o.onMount) o.onMount(wrap);
    CB.runMounts();
    wrap._unmounts = CB._unmounts; CB._unmounts = saved;
    return wrap;
  },
  close: function () {
    var root = document.getElementById('overlay-root');
    var last = root.lastElementChild;
    if (!last) return;
    (last._unmounts || []).forEach(function (fn) { try { fn(); } catch (e) { /* ignore */ } });
    root.removeChild(last);
  },
  closeAll: function () { while (document.getElementById('overlay-root').lastElementChild) CB.overlay.close(); },
  top: function () { return document.getElementById('overlay-root').lastElementChild; }
};

CB.toast = function (msg) {
  var t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = CB.icon('check') + CB.esc(msg);
  document.getElementById('toast-root').appendChild(t);
  setTimeout(function () { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; }, 2400);
  setTimeout(function () { t.remove(); }, 2800);
};

/* ---------------- Common actions ---------------- */
CB.actions['ov-close'] = function () { CB.overlay.close(); };
CB.actions['toast'] = function (el) { CB.toast(el.getAttribute('data-msg') || 'Done'); };
CB.actions['save-close'] = function (el) { CB.overlay.close(); CB.toast(el.getAttribute('data-msg') || 'Saved'); };
CB.inputs['noop'] = function () { };

/* Hash query helpers: #/charts?site=x&p=pm10,ws */
CB.query = function () {
  var q = (location.hash.split('?')[1] || ''), out = {};
  q.split('&').forEach(function (kv) { if (!kv) return; var p = kv.split('='); out[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); });
  return out;
};

/* ---------------- Screen map (reviewer aid) ---------------- */
CB.SCREEN_MAP = [
  ['login', ['admin_home', 'client_home'], []],
  ['admin_home', ['site_map', 'alarm_console', 'dashboards', 'reports', 'admin_clients', 'admin_sites', 'admin_data_sources', 'admin_settings'], ['Role switcher']],
  ['client_home', ['site_map', 'dashboards', 'site_detail', 'reports', 'data_export', 'alarm_console'], ['Role switcher']],
  ['site_map', ['site_detail'], ['Site quick-glance']],
  ['site_detail', ['chart_explorer', 'media_gallery', 'audio_browser'], ['Acknowledge alarm']],
  ['chart_explorer', [], ['Export dialog']],
  ['dashboards', ['site_detail', 'chart_explorer'], []],
  ['alarm_console', ['alarm_setup', 'site_detail'], ['Acknowledge alarm']],
  ['alarm_setup', [], ['Alarm rule editor']],
  ['reports', [], ['Report schedule editor', 'Report builder (Phase 2 preview)']],
  ['data_export', [], ['Export dialog']],
  ['media_gallery', [], ['Media viewer']],
  ['audio_browser', [], ['Audio player']],
  ['admin_clients', [], ['User editor', 'Client editor']],
  ['admin_sites', ['admin_data_sources'], ['Site editor', 'Parameter editor', 'Template editor']],
  ['admin_data_sources', [], ['Source editor']],
  ['admin_settings', [], []]
];
CB.screenRoute = function (id) {
  if (id === 'login') return '/login';
  if (id === 'site_detail') return '/sites/' + CB.scopeSites()[0].id;
  if (id === 'admin_home' || id === 'client_home') return '/home';
  return CB.screen(id).route;
};
CB.actions['screen-map'] = function () {
  var role = CB.state.role;
  var cards = CB.SCREEN_MAP.map(function (row) {
    var sc = CB.screen(row[0]), ok = sc.roles.indexOf(role) >= 0;
    return '<div class="smap-card' + (ok ? '' : ' off') + '"><div class="smap-h"' + (ok ? ' data-go="' + CB.screenRoute(sc.id) + '"' : '') + '>' + CB.icon(sc.icon || 'file', 'ico') + sc.name + (sc.phase === 2 ? CB.p2() : '') + (ok ? '' : ' <span class="tiny muted">(' + (sc.roles[0] === 'admin' ? 'CBE Admin only' : 'Client only') + ')</span>') + '</div>' +
      (row[1].length || row[2].length ? '<div class="smap-opens">' + row[1].map(function (d) { var t = CB.screen(d); return '<div class="smap-open"><span class="open-tag drill">Drill</span>' + t.name + (t.phase === 2 ? ' <span class="tiny" style="color:var(--p2)">Phase 2</span>' : '') + '</div>'; }).join('') +
        row[2].map(function (o) { return '<div class="smap-open"><span class="open-tag overlay">Overlay</span>' + o + '</div>'; }).join('') + '</div>' : '') + '</div>';
  }).join('');
  CB.overlay.open({
    title: 'Screen map', size: 'lg', chips: '<span class="chip">17 screens</span>',
    sub: 'Every screen and what opens from it (drill-down = full screen, overlay = panel). Click a screen to jump to it. Greyed screens belong to the other role.',
    body: '<div class="smap">' + cards + '</div>'
  });
};
