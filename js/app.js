/* =========================================================
   CBased Environmental prototype, router, shell, role switcher.
   ========================================================= */
CB.S = CB.S || {};

CB.ROUTES = [
  { re: /^\/login$/, fn: 'login', screen: 'login', bare: true },
  { re: /^\/home$/, fn: 'home', screen: 'home' },
  { re: /^\/map$/, fn: 'map', screen: 'site_map' },
  { re: /^\/sites\/([^/]+)$/, fn: 'site', screen: 'site_detail' },
  { re: /^\/charts$/, fn: 'charts', screen: 'chart_explorer' },
  { re: /^\/dashboards(?:\/([^/]+))?$/, fn: 'dashboards', screen: 'dashboards' },
  { re: /^\/alarms$/, fn: 'alarms', screen: 'alarm_console' },
  { re: /^\/reports$/, fn: 'reports', screen: 'reports' },
  { re: /^\/export$/, fn: 'exportScreen', screen: 'data_export' },
  { re: /^\/audio$/, fn: 'audio', screen: 'audio_browser' },
  { re: /^\/media$/, fn: 'media', screen: 'media_gallery' },
  { re: /^\/admin\/alarms$/, fn: 'alarmSetup', screen: 'alarm_setup' },
  { re: /^\/admin\/clients$/, fn: 'adminClients', screen: 'admin_clients' },
  { re: /^\/admin\/sites$/, fn: 'adminSites', screen: 'admin_sites' },
  { re: /^\/admin\/sources$/, fn: 'adminSources', screen: 'admin_data_sources' }
];

CB.go = function (path) { if (location.hash === '#' + path) CB.render(); else location.hash = path; };

/* ---------------- State ---------------- */
var STORE_KEY = 'cbe_prototype_state_v1';
(function loadState() {
  try {
    var saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (saved) ['role', 'refresh'].forEach(function (k) { if (saved[k] != null) CB.state[k] = saved[k]; });
  } catch (e) { /* storage unavailable, defaults are fine */ }
})();
CB.setState = function (patch) {
  var roleChanged = patch.role && patch.role !== CB.state.role;
  Object.assign(CB.state, patch);
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ role: CB.state.role, refresh: CB.state.refresh })); } catch (e) { /* ignore */ }
  CB.renderPreview();
  if (roleChanged) {
    CB.ai.reset();
    CB.toast('Now viewing as ' + CB.ROLES[CB.state.role].label);
    var onLogin = CB.current && CB.current.route.bare;
    if (onLogin) CB.render(true);
    else {
      // stay on the same screen when the new role can see it, otherwise go home
      var sc = CB.current ? CB.screen(CB.current.route.screen === 'home' ? 'admin_home' : CB.current.route.screen) : null;
      var keep = sc && sc.roles.indexOf(CB.state.role) >= 0 && CB.current.route.screen !== 'site_detail';
      if (keep) CB.render(true); else CB.go('/home');
    }
  } else CB.render(true);
};

/* ---------------- White-label theme ---------------- */
CB.applyTheme = function () {
  var root = document.documentElement.style, c = CB.me();
  document.body.classList.toggle('wl', !!c);
  if (c) {
    root.setProperty('--accent', c.color); root.setProperty('--accent-2', c.color2); root.setProperty('--accent-soft', c.soft);
    root.setProperty('--accent-ring', c.color + '2e');
  } else ['--accent', '--accent-2', '--accent-soft', '--accent-ring'].forEach(function (k) { root.removeProperty(k); });
};

/* ---------------- Guards ---------------- */
CB.guard = function (route, args) {
  if (route.screen === 'home' || route.screen === 'login') return null;
  var sc = CB.screen(route.screen);
  if (sc.roles.indexOf(CB.state.role) < 0) {
    return CB.empty('shield', sc.name + ' is for CBE staff', 'Clients never see configuration or administration screens. Their view is read-focused and scoped to their own sites.',
      '<button class="btn btn-primary" data-action="role" data-v="admin">Switch to CBE Admin</button> <button class="btn" data-go="/home">Go to Home</button>');
  }
  if (route.screen === 'site_detail') {
    var s = CB.site(args[0]);
    if (!s) return CB.empty('search', 'Site not found', 'This site does not exist.', '<button class="btn" data-go="/map">Open the site map</button>');
    if (CB.scopeSites().indexOf(s) < 0) return CB.empty('lock', 'Not part of your sites', 'Your account can only see ' + CB.me().name + ' sites. No cross-client visibility.', '<button class="btn" data-go="/home">Go to Home</button>');
  }
  return null;
};

/* ---------------- Rendering ---------------- */
CB.crumbs = null;
CB.render = function (keepScroll) {
  CB.runUnmounts();
  CB.overlay.closeAll();
  CB.applyTheme();
  var full = location.hash.replace(/^#/, '') || '/login';
  var path = full.split('?')[0];
  var route = null, m = null;
  for (var i = 0; i < CB.ROUTES.length; i++) { m = path.match(CB.ROUTES[i].re); if (m) { route = CB.ROUTES[i]; break; } }
  if (!route) { location.hash = '/home'; return; }
  var prev = CB.current ? CB.current.path : null;
  CB.current = { path: path, full: full, route: route };
  CB.crumbs = null;
  var args = m.slice(1);
  var html = CB.guard(route, args);
  if (!html) html = CB.S[route.fn].apply(null, args);
  var app = document.getElementById('app');
  app.innerHTML = route.bare ? html : CB.shell(route, html);
  CB.runMounts();
  if (!keepScroll) CB.countUp(app);
  if (!keepScroll && prev !== path) window.scrollTo(0, 0);
};

CB.shell = function (route, content) {
  var role = CB.ROLES[CB.state.role], c = CB.me(), isAdmin = !c;
  var homeId = isAdmin ? 'admin_home' : 'client_home';
  var curId = route.screen === 'home' ? homeId : route.screen;
  var activeAlarms = CB.scopeAlarms().filter(function (a) { return a.state === 'active'; }).length;
  function navItems(section) {
    return CB.SCREENS.filter(function (s) { return s.section === section && s.roles.indexOf(CB.state.role) >= 0; }).map(function (sc) {
      var on = curId === sc.id || (curId === 'site_detail' && sc.id === 'site_map') ? ' on' : '';
      var extra = sc.id === 'alarm_console' && activeAlarms ? '<span class="nav-badge">' + activeAlarms + '</span>' : sc.phase === 2 ? '<span class="nav-p2">P2</span>' : '';
      return '<div class="nav-item' + on + '" data-go="' + sc.route + '">' + CB.icon(sc.icon) + '<span>' + sc.name + '</span>' + extra + '</div>';
    }).join('');
  }
  var brand = isAdmin
    ? '<div class="brand"><div class="cbe-mark">' + CB.LOGO + '</div><div style="min-width:0"><div class="brand-name">CBased Environmental</div><div class="brand-sub">Monitoring platform · ' + CB.CLIENTS.length + ' clients · ' + CB.SITES.length + ' sites</div></div></div>'
    : '<div class="brand"><div class="cust-logo" style="background:' + c.color + '">' + c.mark + '</div><div style="min-width:0"><div class="brand-name">' + c.name + '</div><div class="brand-sub">Environmental Monitoring · ' + CB.scopeSites().length + ' sites</div></div></div>';
  var side = '<aside class="side" id="side">' + brand +
    '<div class="nav-sec">Monitoring</div>' + navItems('view') +
    (isAdmin ? '<div class="nav-sec admin">Configuration</div>' + navItems('admin') : '') +
    '<div class="side-foot">' + (isAdmin ? '<div class="powered"><span class="brand-mark">R</span>Built on <b>Rayven</b></div>Prototype with sample data' : '<div class="powered">Monitoring by <b>CBased Environmental</b></div>' + c.domain) + '</div>' +
    '</aside>';

  var sc = CB.screen(curId);
  var crumbs = CB.crumbs || [{ label: isAdmin ? 'CBE' : c.short }, { label: sc.name }];
  var crumbHtml = crumbs.map(function (cr, i) {
    var last = i === crumbs.length - 1;
    return (i ? '<span class="sep">/</span>' : '') + (last ? '<span class="cur">' + CB.esc(cr.label) + '</span>' : cr.go ? '<a href="#' + cr.go + '">' + CB.esc(cr.label) + '</a>' : '<span>' + CB.esc(cr.label) + '</span>');
  }).join('');

  var top = '<header class="top"><button class="top-burger" data-action="nav-toggle" aria-label="Menu">' + CB.icon('menu') + '</button>' +
    '<nav class="top-crumbs">' + crumbHtml + '</nav>' +
    '<div class="top-right">' +
    '<div class="role-switch" title="Prototype role switcher (no login needed)"><span class="rs-l">View as</span>' + CB.seg('role', [['admin', CB.icon('shield') + 'CBE Admin'], ['client', CB.icon('user') + 'Client']], CB.state.role) + '</div>' +
    '<button class="ai-btn" data-action="ai-toggle" title="Ask the Monitoring Assistant (Ctrl+J)">' + CB.icon('sparkle') + 'Ask AI</button>' +
    '<span class="live-pill"><span class="pulse"></span>Live</span>' +
    '<button class="icon-btn" data-go="/alarms" title="Alarms">' + CB.icon('bell') + (activeAlarms ? '<span class="dot"></span>' : '') + '</button>' +
    '<div class="menu" id="user-menu"><button class="avatar" data-action="menu-toggle" style="' + (c ? 'background:' + c.color : '') + '">' + CB.initials(role.who) + '</button>' +
    '<div class="menu-pop"><div class="menu-head"><b>' + role.who + '</b><span>' + role.title + '<br>' + role.org + '</span></div>' +
    '<div class="menu-item" data-action="screen-map">' + CB.icon('map') + 'Screen map</div>' +
    '<div class="menu-item" data-go="/login">' + CB.icon('logout') + 'Sign out</div></div></div>' +
    '</div></header>';
  return '<div class="shell">' + side + '<div class="main">' + top + '<main class="content">' + content + '</main></div></div>';
};

/* CBased Environmental logo: arrows (monitoring in every direction), C, and drill bit. */
CB.LOGO = '<svg viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="cbeArrow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5aaeea"/><stop offset="1" stop-color="#1f74c4"/></linearGradient></defs><g fill="url(#cbeArrow)" stroke="#185f9f" stroke-width="1.2" stroke-linejoin="round"><path d="M50 2 67 19 57.5 19 57.5 31 42.5 31 42.5 19 33 19Z"/><path d="M2 45 19 28 19 37.5 31 37.5 31 52.5 19 52.5 19 62Z"/><path d="M98 45 81 28 81 37.5 69 37.5 69 52.5 81 52.5 81 62Z"/></g><path d="M57.6 38.4A10 10 0 1 0 57.6 51.6" fill="none" stroke="#111" stroke-width="7.5" stroke-linecap="butt"/><path d="M33 60H67L61 73H39Z" fill="#5cb031"/><path d="M39.6 75H60.4L57.2 82H42.8Z" fill="#f2c200"/><path d="M43.4 84H56.6L50 99Z" fill="#111"/></svg>';

/* ---------------- Floating prototype pill ---------------- */
CB.renderPreview = function () {
  var st = CB.state, bar = document.getElementById('preview-bar');
  bar.classList.toggle('open', !!st.pvOpen);
  bar.innerHTML =
    '<div class="pv-panel" role="dialog" aria-label="Prototype controls">' +
    '<div class="pv-head"><b>Prototype</b><span>Sample data · no backend</span></div>' +
    '<div class="pv-row"><div class="pv-label">Role</div><div class="seg">' + [['admin', 'CBE Admin'], ['client', 'App User (Client)']].map(function (o) { return '<button class="' + (st.role === o[0] ? 'on' : '') + '" data-action="role" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div></div>' +
    '<div class="pv-row"><div class="pv-label">Client view is white-labelled as</div><div class="pv-client"><span class="cust-logo" style="background:' + CB.client('hvo').color + '">HVO</span><div><b>Hunter Valley Operations</b><div class="tiny muted">9 sites · read-focused · own data only</div></div></div></div>' +
    '<div class="pv-legend"><div class="pv-label">Phase markers</div><div class="row" style="gap:8px">' + CB.p2() + '<span class="tiny muted">Phase 2: built previews are clickable; placeholders are greyed out.</span></div></div>' +
    '<div class="pv-foot"><button class="btn btn-sm" data-action="screen-map">' + CB.icon('map') + 'Screen map</button><button class="btn btn-sm" data-action="pv-toggle-panel">Done</button></div>' +
    '</div>' +
    '<button class="pv-pill" data-action="pv-toggle-panel" title="Prototype controls"><span class="pv-dot"></span>Prototype<span class="sep">·</span><b>' + CB.ROLES[st.role].label + '</b></button>';
};
CB.actions['pv-toggle-panel'] = function () {
  CB.state.pvOpen = !CB.state.pvOpen;
  document.getElementById('preview-bar').classList.toggle('open', CB.state.pvOpen);
};
CB.actions['role'] = function (el) { CB.setState({ role: el.getAttribute('data-v') }); };
CB.actions['menu-toggle'] = function (el) { el.closest('.menu').classList.toggle('open'); };
CB.actions['nav-toggle'] = function () { var s = document.getElementById('side'); if (s) s.classList.toggle('open'); };

/* ---------------- Motion helpers ---------------- */
CB.countUp = function (root) {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  root.querySelectorAll('.kpi-v').forEach(function (el) {
    var node = Array.prototype.find.call(el.childNodes, function (n) { return n.nodeType === 3 && /\d/.test(n.nodeValue); });
    if (!node) return;
    var m = node.nodeValue.match(/^([^\d]*)([\d,]+(?:\.\d+)?)(.*)$/);
    if (!m) return;
    var target = parseFloat(m[2].replace(/,/g, '')), dec = (m[2].split('.')[1] || '').length, commas = m[2].indexOf(',') >= 0 || target >= 1000;
    if (!(target > 0)) return;
    var t0 = performance.now(), dur = 800;
    (function step(now) {
      var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3), v = target * e;
      var s = dec ? v.toFixed(dec) : String(Math.round(v));
      if (commas) s = Number(s).toLocaleString('en-AU', { minimumFractionDigits: dec, maximumFractionDigits: dec });
      node.nodeValue = m[1] + s + m[3];
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  });
};
CB.setLive = function (el, text) {
  if (el.textContent === text) return;
  el.textContent = text;
  el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick');
};

/* Shared hover tooltip for anything with data-tip. */
(function () {
  var tip = document.createElement('div');
  tip.className = 'tip';
  document.body.appendChild(tip);
  var cur = null;
  document.addEventListener('mouseover', function (e) {
    var el = e.target.closest && e.target.closest('[data-tip]');
    if (el === cur) return;
    cur = el;
    if (!el) { tip.classList.remove('on'); return; }
    tip.innerHTML = el.getAttribute('data-tip');
    tip.classList.add('on');
  });
  document.addEventListener('mousemove', function (e) {
    if (!cur) return;
    var w = tip.offsetWidth, h = tip.offsetHeight;
    var x = e.clientX + 14, y = e.clientY - h - 12;
    if (x + w > window.innerWidth - 8) x = e.clientX - w - 14;
    if (y < 8) y = e.clientY + 18;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  });
  window.addEventListener('scroll', function () { cur = null; tip.classList.remove('on'); }, true);
  window.addEventListener('hashchange', function () { cur = null; tip.classList.remove('on'); });
})();

/* ---------------- Live ticker ----------------
   Elements with data-live="siteId|param" show the latest value; data-live-unit adds the unit. */
CB.liveRefresh = function () {
  document.querySelectorAll('[data-live]').forEach(function (el) {
    var p = el.getAttribute('data-live').split('|'), s = CB.site(p[0]);
    if (!s) return;
    var v = CB.latest(s, p[1]);
    CB.setLive(el, el.hasAttribute('data-live-unit') ? CB.fmtUnit(p[1], v) : CB.fmtVal(p[1], v));
  });
  document.querySelectorAll('[data-live-time]').forEach(function (el) {
    var s = CB.site(el.getAttribute('data-live-time'));
    if (s) CB.setLive(el, CB.stamp24(new Date(CB.lastTime(s))));
  });
  document.querySelectorAll('[data-clock]').forEach(function (el) { CB.setLive(el, CB.stamp24(new Date())); });
  if (CB.onTick) CB.onTick();
};
setInterval(CB.liveRefresh, 10000);

/* ---------------- Delegated events ---------------- */
document.addEventListener('click', function (e) {
  if (!e.target.closest('.menu')) document.querySelectorAll('.menu.open').forEach(function (m) { m.classList.remove('open'); });
  var el = e.target.closest('[data-action], [data-go]');
  if (!el) return;
  if (el.disabled) return;
  var action = el.getAttribute('data-action');
  if (action) {
    if (CB.actions[action]) { e.preventDefault(); CB.actions[action](el, e); }
    return;
  }
  e.preventDefault();
  var side = document.getElementById('side'); if (side) side.classList.remove('open');
  CB.go(el.getAttribute('data-go'));
});
document.addEventListener('input', function (e) {
  var el = e.target.closest('[data-input]');
  if (el && CB.inputs[el.getAttribute('data-input')]) CB.inputs[el.getAttribute('data-input')](el, e);
});
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') CB.overlay.close();
});
window.addEventListener('hashchange', function () { CB.render(); });

CB.renderPreview();
if (!location.hash) history.replaceState(null, '', '#/login');
CB.render();
CB.ai.render();
