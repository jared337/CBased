/* =========================================================
   Login, Portfolio Overview (admin home), Client Home,
   Interactive Site Map, Site Detail (+ acknowledge overlay)
   ========================================================= */
CB.S = CB.S || {};

/* ---------------- Shared bits ---------------- */
CB.spark24 = function (s, key, o) {
  var now = Date.now(), vals = CB.series(s, key, now - 24 * CB.HOUR, now, 30).map(function (p) { return p[1]; });
  return CB.Charts.spark(vals, Object.assign({ color: 'var(--accent)', height: 30, width: 140 }, o || {}));
};
CB.siteCounts = function (sites) {
  var c = { normal: 0, warning: 0, alarm: 0, comms: 0 };
  sites.forEach(function (s) { c[CB.siteState(s)]++; });
  return c;
};
CB.alarmRow = function (a, o) {
  o = o || {};
  var s = CB.site(a.site);
  var val = a.param ? CB.fmtUnit(a.param, a.value) : 'No data ' + (s.comms ? CB.mins(s.comms) : '');
  return '<div class="li click al-row" data-go="/sites/' + s.id + '"><div class="li-ico ' + (a.sev === 'critical' ? 'tint-red' : a.sev === 'warning' ? 'tint-amber' : 'tint-blue') + '">' + CB.icon(a.param ? 'alert' : 'wifi') + '</div>' +
    '<div class="li-main"><div class="li-t">' + CB.esc(a.name) + '</div><div class="li-s">' + CB.esc(s.name) + (o.client ? ' · ' + CB.client(s.client).short : '') + ' · <b class="mono">' + val + '</b> · ' + CB.ago(a.mins) + '</div></div>' +
    '<div class="li-r">' + CB.alarmStateChip(a) + (a.state === 'active' ? '<div class="mt-s"><button class="btn btn-sm" data-action="ack" data-id="' + a.id + '">Acknowledge</button></div>' : '') + '</div></div>';
};

/* ---------------- Login ---------------- */
CB.S.login = function () {
  var c = CB.me();
  var art = '<svg class="bg" viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice"><g fill="none" stroke="#fff" stroke-width="1.1">' +
    CB.range(14).map(function (i) { var y = 120 + i * 30; return '<path d="M0 ' + y + ' C 120 ' + (y - 40 - i * 3) + ', 240 ' + (y + 30) + ', 360 ' + (y - 10) + ' S 520 ' + (y - 50) + ', 600 ' + (y - 20) + '"/>'; }).join('') +
    '</g></svg>';
  var head = c
    ? '<div class="cust"><div class="cust-logo" style="background:#fff;color:' + c.color + '">' + c.mark + '</div>' + c.name + '</div>'
    : '<div class="cust"><div class="cbe-mark lg">' + CB.LOGO + '</div>CBased Environmental</div>';
  var pitch = c
    ? '<p class="login-eyebrow"><span class="live-dot"></span>' + c.domain + '</p><h1>Environmental monitoring for ' + c.short + '.</h1><p>Live dust, noise, weather and water data from your monitoring network, with alarms, reports and downloads in one place.</p>'
    : '<p class="login-eyebrow"><span class="live-dot"></span>Environmental Monitoring Specialists</p><h1>Every station, every alarm, one platform.</h1><p>Real-time meteorological, water, air quality and noise monitoring across CBE\'s client portfolio. Never lose data. Never miss an alarm.</p>';
  var stat = c
    ? '<div class="login-stat"><span class="live-dot"></span><div><small>Jerrys Plains Dust & Met · live</small><b><span data-live="hvo-jp|pm10_1h" data-live-unit>' + CB.fmtUnit('pm10_1h', CB.latest(CB.site('hvo-jp'), 'pm10_1h')) + '</span> PM10 (1-hr)</b></div></div>'
    : '<div class="login-stat"><span class="live-dot"></span><div><small>Portfolio · live</small><b>' + CB.SITES.length + ' stations · ' + CB.CLIENTS.length + ' clients</b></div></div>';
  return '<div class="login-wrap ' + (c ? 'is-client' : 'is-admin') + '" style="' + (c ? '--brand:' + c.color + ';--brand2:' + c.color2 : '') + '"><div class="login-art">' + art + head +
    '<div class="login-pitch">' + pitch + stat + '</div>' +
    '<div class="powered">' + (c ? 'Monitoring delivered by CBased Environmental' : 'Singleton · Mudgee · Gunnedah · Built on Rayven') + '</div></div>' +
    '<div class="login-form"><div class="login-card">' +
    '<div class="login-switch"><span class="tiny muted">Preview login as</span>' + CB.seg('role', [['admin', 'CBE Admin'], ['client', 'Client (white-label)']], CB.state.role) + '</div>' +
    '<h2>Sign in</h2><p class="muted">' + (c ? 'Welcome to ' + c.short + ' Environmental Monitoring.' : 'Welcome back to the CBased monitoring platform.') + '</p>' +
    '<div class="form mt"><label class="field"><span>Email</span><input class="input" type="email" value="' + (c ? 'daniel.hughes@hvo.com.au' : 'sarah.mitchell@cbased.com.au') + '" autocomplete="off"></label>' +
    '<label class="field"><span class="row-between"><span>Password</span><a class="small" href="#" data-action="toast" data-msg="Password reset link sent">Forgot password?</a></span><input class="input" type="password" value="prototype" autocomplete="off"></label>' +
    '<label class="switch small"><input type="checkbox" checked><span class="track"></span>Keep me signed in</label>' +
    '<button class="btn btn-brand" data-go="/home">Sign in</button>' +
    '<div class="tiny muted" style="text-align:center">Prototype: no credentials are checked. Use the role switcher to change view.</div></div>' +
    '</div></div></div>';
};

/* ---------------- Home router ---------------- */
CB.S.home = function () { return CB.state.role === 'client' ? CB.S.clientHome() : CB.S.adminHome(); };

/* ---------------- Portfolio Overview (admin) ---------------- */
CB.S.adminHome = function () {
  var sites = CB.SITES, counts = CB.siteCounts(sites);
  var al = CB.ALARMS, act = al.filter(function (a) { return a.state === 'active'; }), ackd = al.filter(function (a) { return a.state === 'acknowledged'; });
  var cleared24 = al.filter(function (a) { return a.state === 'cleared' && a.clearedMins < 1440; }).length;
  var offline = sites.filter(function (s) { return s.comms; });
  var reporting = sites.length - offline.length;
  var params = CB.sum(sites.map(function (s) { return s.params.length; }));
  var payloads = CB.sum(sites.map(function (s) { return Math.round(60 / s.cadence); }));

  var health = '<div class="health">' +
    '<div class="h-item"><div class="h-ico tint-green">' + CB.icon('db') + '</div><div><div class="h-l">Ingestion</div><div class="h-v">' + payloads + ' <small>payloads / hr</small></div><div class="h-s">' + CB.Charts.spark(CB.range(24).map(function (i) { return payloads * (0.97 + 0.03 * Math.sin(i)); }), { color: '#10b981', height: 20, width: 90 }) + '</div></div></div>' +
    '<div class="h-item"><div class="h-ico ' + (offline.length ? 'tint-amber' : 'tint-green') + '">' + CB.icon('wifi') + '</div><div><div class="h-l">Communications</div><div class="h-v">' + reporting + '<small> of ' + sites.length + ' reporting</small></div><div class="h-s">' + offline.map(function (s) { return '<a href="#/sites/' + s.id + '" class="h-flag">' + CB.icon('alert') + CB.esc(s.name) + ' · ' + CB.mins(s.comms) + '</a>'; }).join('') + '</div></div></div>' +
    '<div class="h-item"><div class="h-ico tint-green">' + CB.icon('check') + '</div><div><div class="h-l">Data completeness (24 h)</div><div class="h-v">99.4<small>%</small></div><div class="h-s">0 payloads lost · 288 re-processed</div></div></div>' +
    '<div class="h-item"><div class="h-ico tint-green">' + CB.icon('sms') + '</div><div><div class="h-l">Notifications (24 h)</div><div class="h-v">412 <small>SMS</small> · 1,086 <small>email</small></div><div class="h-s">100% delivered · 2 retried · median 6 s</div></div></div>' +
    '<div class="h-item"><div class="h-ico tint-blue">' + CB.icon('server') + '</div><div><div class="h-l">Data points</div><div class="h-v">' + params + ' <small>parameters</small></div><div class="h-s">41.8M raw payloads retained since 2019</div></div></div>' +
    '</div>';

  var stateTiles = '<div class="grid g-4">' + ['alarm', 'warning', 'comms', 'normal'].map(function (k) {
    var st = CB.STATE[k];
    return '<div class="card clickable state-tile" data-go="/map"><div class="kpi"><div class="kpi-l"><span class="dot-lg" style="background:' + st.color + '"></span>' + (k === 'alarm' ? 'Sites in alarm' : k === 'warning' ? 'Sites in warning' : k === 'comms' ? 'Comms failure' : 'Normal') + '</div><div class="kpi-v">' + counts[k] + '<small>of ' + sites.length + '</small></div></div></div>';
  }).join('') + '</div>';

  var alarmCard = CB.card({
    title: 'Active alarms', icon: 'bell', sub: 'Across all clients, newest first',
    actions: '<button class="btn btn-sm" data-go="/alarms">Alarm console ' + CB.icon('chev') + '</button>',
    titleExtra: '<span class="chip chip-bad">' + act.length + ' new</span><span class="chip chip-warn">' + ackd.length + ' acknowledged</span><span class="chip">' + cleared24 + ' cleared today</span>',
    flush: true,
    body: '<div class="list">' + act.concat(ackd).sort(function (a, b) { return a.mins - b.mins; }).map(function (a) { return CB.alarmRow(a, { client: true }); }).join('') + '</div>'
  });

  var clientRows = CB.CLIENTS.map(function (c) {
    var cs = sites.filter(function (s) { return s.client === c.id; }), cc = CB.siteCounts(cs);
    var ca = al.filter(function (a) { return a.client === c.id && a.state !== 'cleared'; }).length;
    return '<tr class="click" data-go="/map?client=' + c.id + '"><td><div class="name">' + c.name + '</div><div class="sub">' + c.region + '</div></td>' +
      '<td class="num">' + cs.length + '</td><td><div class="state-bar">' + ['alarm', 'warning', 'comms', 'normal'].map(function (k) { return cc[k] ? '<span style="flex:' + cc[k] + ';background:' + CB.STATE[k].color + '" data-tip="' + CB.esc(CB.STATE[k].label + ': ' + cc[k]) + '"></span>' : ''; }).join('') + '</div></td>' +
      '<td class="num">' + (ca ? '<span class="st st-bad">' + ca + '</span>' : '<span class="muted">0</span>') + '</td></tr>';
  }).join('');

  CB.onMount(function () {
    var m = CB.Maps.make('home-map', { styles: false, mode: 'satellite' });
    var pts = CB.SITES.filter(function (s) { return s.client !== 'nel'; }).map(function (s) { CB.Maps.marker(m, s, { size: 13, onClick: function () { CB.go('/sites/' + s.id); } }); return [s.lat, s.lng]; });
    CB.SITES.filter(function (s) { return s.client === 'nel'; }).forEach(function (s) { CB.Maps.marker(m, s, { size: 13, onClick: function () { CB.go('/sites/' + s.id); } }); });
    CB.Maps.fit(m, pts, 20);
  });

  var quick = [['/map', 'map', 'Site map'], ['/alarms', 'bell', 'Alarms'], ['/dashboards', 'dash', 'Dashboards'], ['/reports', 'file', 'Reports'], ['/admin/clients', 'users', 'Clients & users'], ['/admin/sites', 'tree', 'Sites & parameters'], ['/admin/sources', 'plug', 'Data sources'], ['/admin/settings', 'settings', 'Platform settings']];
  return CB.pageHead({ title: 'Portfolio Overview', sub: 'All ' + CB.CLIENTS.length + ' clients, ' + CB.sum(CB.CLIENTS.map(function (c) { return c.projects.length; })) + ' projects and ' + sites.length + ' sites. Updated <span data-clock>' + CB.stamp24(new Date()) + '</span>.',
    actions: CB.p2Btn('Set as my default landing view', 'home') }) +
    health +
    '<div class="qlinks mt">' + quick.map(function (q) { return '<span class="qlink" data-go="' + q[0] + '">' + CB.icon(q[1]) + q[2] + (q[0] === '/alarms' && act.length ? '<span class="badge">' + act.length + '</span>' : '') + '</span>'; }).join('') + '</div>' +
    '<div class="mt">' + stateTiles + '</div>' +
    '<div class="grid g-main mt">' + alarmCard + '<div class="stack">' +
    CB.card({ title: 'Site network', icon: 'map', sub: 'Hunter Valley · NEL (Melbourne) not in frame', actions: '<button class="btn btn-sm" data-go="/map">Open map</button>', body: '<div id="home-map" class="map short"></div>' }) +
    CB.card({ title: 'Clients', icon: 'users', flush: true, sub: 'Live state of each client\'s sites', body: '<table class="tbl"><thead><tr><th>Client</th><th class="num">Sites</th><th>State</th><th class="num">Alarms</th></tr></thead><tbody>' + clientRows + '</tbody></table>' }) +
    '</div></div>';
};

/* ---------------- Client Home ---------------- */
CB.S.clientHome = function () {
  var c = CB.me(), sites = CB.scopeSites(), counts = CB.siteCounts(sites), role = CB.ROLES.client;
  var al = CB.scopeAlarms().filter(function (a) { return a.state !== 'cleared'; });
  var h = new Date().getHours(), greet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  var attention = counts.alarm + counts.warning + counts.comms;
  var hero = '<section class="card hero client-hero"><div class="card-b"><div class="row-between"><div><div class="tiny muted">' + CB.dateLabel(new Date()) + ' · ' + c.region + '</div><h2 class="hero-h">' + greet + ', ' + role.who.split(' ')[0] + '.</h2>' +
    '<p class="muted" style="margin:6px 0 0">' + (attention ? '<b style="color:var(--ink)">' + attention + ' of your ' + sites.length + ' sites need attention.</b> ' + al.filter(function (a) { return a.state === 'active'; }).length + ' alarms are waiting for acknowledgement.' : 'All ' + sites.length + ' sites are normal.') + '</p></div>' +
    '<div class="hero-states">' + ['alarm', 'warning', 'comms', 'normal'].map(function (k) { return '<div class="hs" data-go="/map"><span class="dot-lg" style="background:' + CB.STATE[k].color + '"></span><b>' + counts[k] + '</b><span>' + CB.STATE[k].label + '</span></div>'; }).join('') + '</div></div></div></section>';

  var tap = [['/map', 'map', 'Map'], ['/dashboards', 'dash', 'Dashboards'], ['/alarms', 'bell', 'Alarms'], ['/reports', 'file', 'Reports'], ['/export', 'download', 'Downloads']];
  var taps = '<div class="taps">' + tap.map(function (t) { return '<button class="tap" data-go="' + t[0] + '">' + CB.icon(t[1]) + '<span>' + t[2] + '</span>' + (t[0] === '/alarms' && al.length ? '<i>' + al.length + '</i>' : '') + '</button>'; }).join('') + '</div>';

  var order = { alarm: 0, warning: 1, comms: 2, normal: 3 };
  var cards = sites.slice().sort(function (a, b) { return order[CB.siteState(a)] - order[CB.siteState(b)]; }).map(function (s) {
    var st = CB.siteState(s), k = CB.headline(s), p = CB.PARAMS[k];
    var big = s.kinds[0] === 'camera' ? '<div class="sc-cam">' + CB.camImg(s, CB.align(Date.now(), 15), { w: 320, h: 120, label: false }) + '</div>'
      : '<div class="sc-v"><span data-live="' + s.id + '|' + (k === 'pm10' ? 'pm10_1h' : k) + '">' + CB.fmtVal(k === 'pm10' ? 'pm10_1h' : k, CB.latest(s, k === 'pm10' ? 'pm10_1h' : k)) + '</span><small>' + p.unit + ' · ' + (k === 'pm10' ? 'PM10 1-hr' : p.name) + '</small></div><div class="sc-sp">' + (s.comms ? '<div class="tiny muted">Last data ' + CB.ago(s.comms) + '</div>' : CB.spark24(s, k, { color: CB.STATE[st].color === '#10b981' ? 'var(--accent)' : CB.STATE[st].color })) + '</div>';
    return '<div class="card clickable site-card st-' + st + '" data-go="/sites/' + s.id + '"><div class="sc-h"><div><div class="sc-n">' + CB.esc(s.name) + '</div><div class="sc-k">' + s.kinds.map(function (kk) { return CB.icon(CB.KIND[kk].icon); }).join('') + CB.siteType(s) + '</div></div>' + CB.stateChip(st) + '</div>' + big + '</div>';
  }).join('');

  var rep = CB.scopeReports();
  CB.onMount(function () {
    var m = CB.Maps.make('ch-map', { styles: false, mode: 'satellite' });
    CB.Maps.fit(m, sites.map(function (s) { CB.Maps.marker(m, s, { size: 14, onClick: function () { CB.go('/sites/' + s.id); } }); return [s.lat, s.lng]; }), 24);
  });
  return hero + taps +
    '<div class="sec-title">Your sites</div><div class="grid g-3 site-grid">' + cards + '</div>' +
    '<div class="grid g-main mt">' +
    CB.card({ title: 'Alarms needing attention', icon: 'bell', flush: true, actions: '<button class="btn btn-sm" data-go="/alarms">All alarms</button>', body: al.length ? '<div class="list">' + al.map(function (a) { return CB.alarmRow(a); }).join('') + '</div>' : '<p class="muted" style="padding:0 20px">No active alarms.</p>' }) +
    '<div class="stack">' + CB.card({ title: 'Map', icon: 'map', actions: '<button class="btn btn-sm" data-go="/map">Open</button>', body: '<div id="ch-map" class="map short"></div>' }) +
    CB.card({ title: 'Reports', icon: 'file', flush: true, actions: '<button class="btn btn-sm" data-go="/reports">All reports</button>', body: '<div class="list">' + rep.map(function (r) { return '<div class="li click" data-action="report-preview" data-id="' + r.id + '"><div class="li-ico tint-blue">' + CB.icon('file') + '</div><div class="li-main"><div class="li-t">' + r.name + '</div><div class="li-s">' + r.freq + ' · next ' + r.next + '</div></div></div>'; }).join('') + '</div>' }) +
    '</div></div>';
};

/* ---------------- Interactive Site Map ---------------- */
CB.S.map = function () {
  var sites = CB.scopeSites(), q = CB.query();
  var focusClient = q.client && CB.client(q.client) ? q.client : null;
  var counts = CB.siteCounts(sites);
  var isAdmin = CB.state.role === 'admin';
  var regions = isAdmin ? '<div class="seg">' + [['hv', 'Hunter Valley, NSW'], ['nel', 'Kew / Bulleen, VIC']].map(function (r) { return '<button data-action="map-region" data-v="' + r[0] + '" class="' + ((focusClient === 'nel') === (r[0] === 'nel') ? 'on' : '') + '">' + r[1] + '</button>'; }).join('') + '</div>' : '';
  CB.onMount(function () {
    var m = CB.Maps.make('site-map', { wheel: true });
    CB._map = m;
    if (!m) return;
    sites.forEach(function (s) {
      var k = CB.headline(s), st = CB.siteState(s);
      CB.Maps.marker(m, s, { size: 20, state: st, glyph: CB.KIND[s.kinds[0]].icon, value: s.kinds[0] === 'camera' ? 'Camera' : CB.fmtUnit(k, CB.latest(s, k)), onClick: function (site) { CB.quickglance(site.id); } });
    });
    // in-map list
    var el = m.getContainer();
    if (el.clientWidth >= 640) {
      var p = document.createElement('div');
      p.className = 'map-panel';
      var order = { alarm: 0, warning: 1, comms: 2, normal: 3 };
      var list = sites.slice().sort(function (a, b) { return order[CB.siteState(a)] - order[CB.siteState(b)] || a.name.localeCompare(b.name); });
      p.innerHTML = '<div class="map-panel-h">Sites<span>' + sites.length + '</span></div>' + list.map(function (s) {
        var k = CB.headline(s);
        return '<div class="map-row" data-key="' + s.id + '"><i style="background:' + CB.STATE[CB.siteState(s)].color + '"></i><div class="map-row-m"><b>' + CB.esc(s.name) + '</b><span>' + (isAdmin ? CB.client(s.client).short + ' · ' : '') + CB.siteType(s) + '</span></div><em>' + (s.kinds[0] === 'camera' ? '' : CB.fmtVal(k, CB.latest(s, k))) + '</em></div>';
      }).join('');
      el.appendChild(p);
      L.DomEvent.disableClickPropagation(p); L.DomEvent.disableScrollPropagation(p);
      m._cb.padLeft = p.offsetWidth + 12;
      p.querySelectorAll('.map-row').forEach(function (row) {
        var id = row.getAttribute('data-key');
        row.addEventListener('mouseenter', function () { CB.Maps.highlight(m, id, true); });
        row.addEventListener('mouseleave', function () { CB.Maps.highlight(m, id, false); });
        row.addEventListener('click', function () { CB.Maps.flyTo(m, CB.site(id), 14); CB.quickglance(id); });
      });
    }
    var inFrame = sites.filter(function (s) { return focusClient ? s.client === focusClient : s.client !== 'nel'; });
    CB.Maps.fit(m, (inFrame.length ? inFrame : sites).map(function (s) { return [s.lat, s.lng]; }), 40);
  });
  return CB.pageHead({ title: 'Site Map', sub: (isAdmin ? 'Every site in the portfolio' : 'Your ' + sites.length + ' monitoring sites') + ', colour-coded by live state. Click a marker for latest readings.',
    actions: regions + CB.p2Btn('Filter by state / group', 'filter') + (isAdmin ? CB.p2Btn('Reposition markers', 'move') : '') }) +
    '<div class="map-legend">' + ['normal', 'warning', 'alarm', 'comms'].map(function (k) { return '<span><i style="background:' + CB.STATE[k].color + '"></i>' + CB.STATE[k].label + ' <b>' + counts[k] + '</b></span>'; }).join('') + '<span class="muted tiny">Base map: street, satellite or terrain (top right)</span></div>' +
    '<div id="site-map" class="map full"></div>';
};
CB.actions['map-region'] = function (el) {
  var m = CB._map, nel = el.getAttribute('data-v') === 'nel';
  el.parentNode.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b === el); });
  if (m) CB.Maps.fit(m, CB.SITES.filter(function (s) { return (s.client === 'nel') === nel; }).map(function (s) { return [s.lat, s.lng]; }), 40, true);
};

/* Quick-glance overlay: latest readings + links to charts / downloads */
CB.quickglance = function (id) {
  var s = CB.site(id), st = CB.siteState(s);
  var keys = s.params.filter(function (k) { return k !== 'ltemp'; }).slice(0, 8);
  var al = CB.ALARMS.filter(function (a) { return a.site === s.id && a.state !== 'cleared'; });
  CB.overlay.close();
  CB.overlay.open({
    side: true, title: s.name, chips: CB.stateChip(st),
    sub: (CB.state.role === 'admin' ? CB.client(s.client).name + ' · ' : '') + s.project + ' · ' + CB.siteType(s),
    body: (s.comms ? '<div class="note" style="margin-bottom:14px">' + CB.icon('wifi') + ' No data for ' + CB.mins(s.comms) + '. Showing last received values.</div>' : '') +
      (s.camera ? '<div class="qg-cam">' + CB.camImg(s, CB.align(Date.now(), 15), { w: 520, h: 230 }) + '</div>' : '') +
      (keys.length ? '<div class="qg-grid">' + keys.map(function (k) {
        var v = CB.latest(s, k), ps = CB.paramState(s, k, v);
        return '<div class="qg-v ' + (ps !== 'normal' ? 'qg-' + ps : '') + '"><span>' + CB.PARAMS[k].name + '</span><b data-live="' + s.id + '|' + k + '">' + CB.fmtVal(k, v) + '</b><small>' + CB.PARAMS[k].unit + '</small></div>';
      }).join('') + '</div>' : '') +
      '<div class="tiny muted mt-s">Latest <span data-live-time="' + s.id + '">' + CB.stamp24(new Date(CB.lastTime(s))) + '</span> · ' + s.cadence + '-min data · ' + s.logger + '</div>' +
      (al.length ? '<div class="sec-title">Active alarms</div><div class="list" style="margin:0 -24px">' + al.map(function (a) { return CB.alarmRow(a); }).join('') + '</div>' : ''),
    footer: '<button class="btn" data-action="export-dialog" data-site="' + s.id + '">' + CB.icon('download') + 'Download CSV</button>' +
      (s.params.length > 2 ? '<button class="btn" data-go="/charts?site=' + s.id + '">' + CB.icon('trend') + 'Charts</button>' : '') +
      '<button class="btn btn-primary" data-go="/sites/' + s.id + '">Open site ' + CB.icon('chev') + '</button>'
  });
};

/* ---------------- Site Detail ---------------- */
CB.S.site = function (id) {
  var s = CB.site(id), st = CB.siteState(s), c = CB.client(s.client), isAdmin = CB.state.role === 'admin';
  CB.crumbs = [{ label: isAdmin ? 'CBE' : c.short }, { label: 'Site Map', go: '/map' }, { label: s.name }];
  var keys = s.params;
  var pref = ['pm10_1h', 'pm25', 'laeq', 'lamax', 'la90', 'level', 'ec', 'turb', 'ppv', 'op', 'ws', 'wd', 'temp', 'rh', 'rain'];
  var heads = pref.filter(function (k) { return keys.indexOf(k) >= 0; }).slice(0, 5);
  if (!heads.length) heads = ['batt'];
  var kpis = '<div class="grid g-' + Math.min(5, heads.length + 0) + ' kpi-row">' + heads.map(function (k) {
    var v = CB.latest(s, k), ps = CB.paramState(s, k, v), p = CB.PARAMS[k];
    return '<div class="card kpi-card ' + (ps !== 'normal' ? 'kc-' + ps : '') + '">' + CB.kpi(p.name, '<span data-live="' + s.id + '|' + k + '">' + CB.fmtVal(k, v) + '</span><small>' + p.unit + (k === 'wd' && v != null ? ' ' + CB.compass(v) : '') + '</small>', { sub: ps === 'normal' ? (p.warn != null ? 'Limit ' + CB.thresholds(s, k).crit + ' ' + p.unit : '&nbsp;') : CB.stateChip(ps), spark: CB.spark24(s, k === 'pm10_1h' ? 'pm10' : k, { color: ps === 'normal' || ps === 'comms' ? 'var(--accent)' : CB.STATE[ps].color }) }) + '</div>';
  }).join('') + '</div>';

  var table = '<div class="tbl-wrap"><table class="tbl live-tbl"><thead><tr><th>Parameter</th><th class="num">Latest</th><th>Unit</th><th>Timestamp</th><th>Quality</th><th>Alarm state</th><th>24 h</th></tr></thead><tbody>' + keys.map(function (k) {
    var p = CB.PARAMS[k], v = CB.latest(s, k), ps = CB.paramState(s, k, v), th = CB.thresholds(s, k);
    var thTxt = th.crit != null ? (th.low ? '< ' : '> ') + th.warn + ' / ' + th.crit : '';
    return '<tr class="click" data-go="/charts?site=' + s.id + '&p=' + (p.calc ? p.src + ',' + k : k) + '"><td><div class="name">' + p.name + (p.calc ? ' <span class="chip chip-calc">calculated</span>' : '') + '</div><div class="sub">' + p.domain + (thTxt ? ' · thresholds ' + thTxt : '') + '</div></td>' +
      '<td class="num strong"><span class="dot-sm" style="background:' + CB.STATE[ps].color + '"></span><span data-live="' + s.id + '|' + k + '">' + CB.fmtVal(k, v) + '</span></td><td class="muted">' + p.unit + '</td><td class="muted mono"><span data-live-time="' + s.id + '">' + CB.stamp24(new Date(CB.lastTime(s))) + '</span></td>' +
      '<td>' + CB.status(CB.quality(s, k, v)) + '</td><td>' + (th.crit != null || ps === 'comms' ? CB.stateChip(ps) : '<span class="muted tiny">No rule</span>') + '</td><td style="width:150px">' + (s.comms ? '' : CB.spark24(s, p.calc ? p.src : k, { height: 24, width: 130 })) + '</td></tr>';
  }).join('') + '</tbody></table></div>';

  var trendKeys = s.kinds.indexOf('dust') >= 0 ? [['pm10', 'pm25'], s.kinds.indexOf('met') >= 0 ? ['ws', 'temp'] : ['tsp']] : s.kinds.indexOf('noise') >= 0 ? [['laeq', 'la90', 'lamax']].concat(s.kinds.indexOf('blast') >= 0 ? [['ppv']] : []) : s.kinds.indexOf('water') >= 0 ? [['level'], ['ec', 'turb']] : s.kinds.indexOf('blast') >= 0 ? [['ppv'], ['op']] : s.kinds.indexOf('met') >= 0 ? [['ws', 'temp'], ['rain', 'rh']] : [['batt']];
  var range = CB._siteRange || 24;
  CB.onMount(function () {
    trendKeys.forEach(function (ks, i) {
      var el = document.getElementById('st-trend-' + i);
      if (!el) return;
      new CB.Trend(el, {
        t0: Date.now() - range * CB.HOUR, t1: Date.now(), height: 220, shading: true, thresholds: true, minStep: s.cadence < 5 ? 5 : s.cadence,
        markers: CB.ALARMS.filter(function (a) { return a.site === s.id && ks.indexOf((a.param || '').replace('_1h', '')) >= 0; }).map(function (a) { return { t: a.t, color: a.sev === 'critical' ? '#ef4444' : '#f59e0b' }; }),
        series: ks.map(function (k, j) { var p = CB.PARAMS[k]; return { name: p.name, short: p.name, unit: p.unit, dp: p.dp, color: CB.PALETTE[j + i], th: p.warn != null ? CB.thresholds(s, k) : null, get: function (a, b, step) { return CB.series(s, k, a, b, step); } }; })
      });
    });
  });

  var alarms = CB.ALARMS.filter(function (a) { return a.site === s.id; }).slice(0, 8);
  var cam = s.camera ? s : CB.SITES.find(function (x) { return x.client === s.client && x.camera; });
  var camCard = cam ? CB.card({ title: cam === s ? 'Latest camera image' : 'Nearest camera · ' + cam.name, icon: 'camera', sub: CB.dateTime(new Date(CB.align(Date.now(), 15))),
    actions: '<button class="btn btn-sm" data-go="/media?site=' + cam.id + '">Image archive ' + CB.p2('P2') + '</button>',
    body: '<div class="cam-latest" data-action="media-view" data-site="' + cam.id + '" data-t="' + CB.align(Date.now(), 15) + '">' + CB.camImg(cam, CB.align(Date.now(), 15), { w: 560, h: 315 }) + '</div>' }) : '';

  var rose = s.params.indexOf('wd') >= 0 ? CB.card({ title: (s.params.indexOf('pm10') >= 0 ? 'Dust rose' : 'Wind rose') + ' · last 24 h', icon: 'wind', actions: '<button class="btn btn-sm" data-go="/charts?site=' + s.id + '&view=rose">Configure</button>',
    body: CB.Charts.rose(CB.roseSamples(s, Date.now() - 24 * CB.HOUR, Date.now(), 10), { size: 280, mode: s.params.indexOf('pm10') >= 0 ? 'dust' : 'wind' }) }) : '';

  return CB.pageHead({ title: s.name, back: { label: 'Site Map', go: '/map' },
    chips: CB.stateChip(st) + CB.kindChips(s),
    sub: (isAdmin ? '<b>' + c.name + '</b> · ' : '') + s.project + ' · ' + s.lat.toFixed(4) + ', ' + s.lng.toFixed(4) + ' · ' + s.logger + ' · ' + s.cadence + '-min data',
    actions: (s.audio ? '<button class="btn" data-go="/audio?site=' + s.id + '">' + CB.icon('volume') + 'Audio recordings</button>' : '') +
      '<button class="btn" data-action="export-dialog" data-site="' + s.id + '">' + CB.icon('download') + 'Export CSV</button>' +
      '<button class="btn btn-primary" data-go="/charts?site=' + s.id + '">' + CB.icon('trend') + 'Chart explorer</button>' }) +
    (s.comms ? '<div class="note" style="margin-bottom:16px">' + CB.icon('wifi') + ' <b>Comms failure.</b> No payload received for ' + CB.mins(s.comms) + ' via ' + s.telemetry + '. Values below are the last received. CBE field technicians have been notified.</div>' : '') +
    kpis +
    '<div class="grid g-main mt"><div class="stack">' +
    CB.card({ title: 'Live parameters', icon: 'list', sub: keys.length + ' parameters · click a row to chart it · retained at full granularity for 4+ years', flush: true, body: table }) +
    CB.card({ title: 'Trends', icon: 'trend', sub: 'Shaded by time of day · alarm thresholds dashed · drag to zoom',
      actions: CB.seg('site-range', [[24, '24 h'], [72, '3 days'], [168, '7 days']], range),
      body: trendKeys.map(function (ks, i) { return '<div id="st-trend-' + i + '" class="' + (i ? 'mt' : '') + '"></div>'; }).join('') }) +
    '</div><div class="stack">' + camCard +
    CB.card({ title: 'Alarms for this site', icon: 'bell', flush: true, actions: '<button class="btn btn-sm" data-go="/alarms?site=' + s.id + '">History</button>', body: alarms.length ? '<div class="list">' + alarms.map(function (a) {
      return '<div class="li"><div class="li-main"><div class="li-t">' + CB.esc(a.name) + '</div><div class="li-s">' + (a.param ? CB.fmtUnit(a.param, a.value) + ' · ' : '') + CB.dateTime(new Date(a.t)) + (a.ackBy ? ' · ack ' + a.ackBy : '') + '</div></div><div class="li-r">' + CB.sevChip(a.sev) + '<div class="mt-s">' + (a.state === 'active' ? '<button class="btn btn-sm" data-action="ack" data-id="' + a.id + '">Acknowledge</button>' : CB.alarmStateChip(a)) + '</div></div></div>';
    }).join('') + '</div>' : '<p class="muted" style="padding:0 20px 10px">No alarms in the last 21 days.</p>' }) +
    rose +
    CB.card({ title: 'Site information', icon: 'info', body: '<dl class="kv"><dt>Client</dt><dd>' + c.name + '</dd><dt>Project</dt><dd>' + s.project + '</dd><dt>Site type</dt><dd>' + CB.siteType(s) + '</dd><dt>Datalogger</dt><dd>' + s.logger + ' · ' + s.serial + '</dd><dt>Telemetry</dt><dd>' + s.telemetry + ' · ' + s.protocol + '</dd><dt>Time zone</dt><dd>' + s.tz + ' (DST aware)</dd><dt>Elevation</dt><dd>' + s.elev + ' m AHD</dd><dt>Installed</dt><dd>' + s.installed + '</dd></dl>' }) +
    CB.placeholder('Notes, diary & documents', 'Site diary entries and linked documents such as calibration certificates and permits, kept with the site.', { icon: 'note', mock: '<div class="ph2-mock"><div>' + CB.icon('note') + 'Calibration certificate – TEOM 1405 (Aug 2026).pdf</div><div>' + CB.icon('note') + 'EPL 640 licence conditions.pdf</div><div>' + CB.icon('pen') + '12 Sep · Filter changed, flow check OK</div></div>' }) +
    '</div></div>';
};
CB.actions['site-range'] = function (el) { CB._siteRange = +el.getAttribute('data-v'); CB.render(true); };

/* ---------------- Acknowledge overlay ---------------- */
CB.actions['ack'] = function (el, e) {
  if (e) e.stopPropagation();
  var a = CB.alarm(el.getAttribute('data-id')), s = CB.site(a.site), rule = CB.rule(a.rule);
  var needComment = a.sev === 'critical';
  CB.overlay.open({
    title: 'Acknowledge alarm', chips: CB.sevChip(a.sev), size: 'sm',
    sub: a.id + ' · ' + CB.esc(a.name),
    body: '<dl class="kv"><dt>Site</dt><dd>' + s.name + '</dd><dt>Triggered</dt><dd>' + CB.dateTime(new Date(a.t)) + ' (' + CB.ago(a.mins) + ')</dd><dt>Value</dt><dd>' + (a.param ? CB.fmtUnit(a.param, a.value) + ' · threshold ' + a.threshold : 'No data for ' + a.threshold) + '</dd><dt>Rule</dt><dd>' + rule.id + ' · ' + CB.MONITORS[rule.monitor] + '</dd></dl>' +
      '<div class="sec-title" style="margin-top:18px">Notifications sent</div><div class="deliv">' + a.notes.map(function (n) { return '<div class="dv"><span class="chip">' + n.chan + '</span><span class="mono">' + n.to + '</span><span class="dv-s">queued → sent → <b>' + n.status.replace('failed → retried → ', 'retried → ') + '</b> · ' + n.secs + ' s</span></div>'; }).join('') + '</div>' +
      '<label class="field mt"><span>Comment' + (needComment ? ' <span class="chip chip-bad">required for critical alarms</span>' : ' (optional)') + '</span><textarea class="input" id="ack-note" rows="3" placeholder="What was done? e.g. water cart dispatched, works paused"></textarea></label>',
    footer: '<button class="btn" data-action="ov-close">Cancel</button><button class="btn btn-primary" data-action="ack-confirm" data-id="' + a.id + '" data-req="' + (needComment ? 1 : 0) + '">' + CB.icon('check') + 'Acknowledge</button>'
  });
};
CB.actions['ack-confirm'] = function (el) {
  var a = CB.alarm(el.getAttribute('data-id')), note = document.getElementById('ack-note');
  if (el.getAttribute('data-req') === '1' && !note.value.trim()) { note.classList.add('input-err'); note.focus(); return; }
  a.state = 'acknowledged'; a.ackBy = CB.ROLES[CB.state.role].who; a.ackMins = 0; a.ackNote = note.value.trim();
  CB.EVENTS.unshift({ id: 'EV-' + Date.now(), mins: 0, kind: 'User', cat: 'Alarm', text: a.ackBy + ' acknowledged ' + a.id + ' ' + a.name + ' at ' + CB.site(a.site).name, client: a.client });
  CB.overlay.close();
  CB.toast('Alarm acknowledged · escalation stopped');
  CB.render(true);
};
