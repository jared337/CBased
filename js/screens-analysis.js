/* =========================================================
   Chart / Trend Explorer (+ wind & dust rose) and Dashboards
   ========================================================= */
CB.S = CB.S || {};

/* ---------------- Chart Explorer ---------------- */
CB.ce = null;
CB.PERIODS = [[24, '24 h'], [72, '3 days'], [168, '7 days'], [720, '30 days']];
CB.ceInit = function () {
  var q = CB.query(), sites = CB.scopeSites();
  var key = (q.site || '') + '|' + (q.p || '') + '|' + CB.state.role;
  if (CB.ce && CB.ce.key === key) { if (q.view) CB.ce.tab = q.view; return CB.ce; }
  var s = CB.site(q.site);
  if (!s || sites.indexOf(s) < 0) s = sites.find(function (x) { return x.params.indexOf('pm10') >= 0 && x.params.indexOf('wd') >= 0; }) || sites[0];
  var ps = q.p ? q.p.split(',').filter(function (k) { return s.params.indexOf(k) >= 0; }) : null;
  if (!ps || !ps.length) ps = s.kinds.indexOf('dust') >= 0 ? ['pm10', 'pm25', 'ws'] : s.kinds.indexOf('noise') >= 0 ? ['laeq', 'la90'] : s.kinds.indexOf('water') >= 0 ? ['level', 'ec'] : s.kinds.indexOf('blast') >= 0 ? ['ppv', 'op'] : s.kinds.indexOf('met') >= 0 ? ['ws', 'temp', 'rh'] : ['batt'];
  CB.ce = { key: key, site: s.id, series: ps.map(function (k) { return { site: s.id, key: k }; }), period: 72, mode: 'raw', thresholds: true, shading: true, scale: {}, tab: q.view || 'trend', panMode: 'zoom',
    rose: { period: 168, sectors: 16, calm: 0.5, calmMode: 'centre', wind: '0.5,2,4,6,8,10', dust: '0,10,20,30,45,50' } };
  return CB.ce;
};

CB.S.charts = function () {
  var ce = CB.ceInit(), sites = CB.scopeSites(), s = CB.site(ce.site), isAdmin = CB.state.role === 'admin';
  var t1 = Date.now(), t0 = t1 - ce.period * CB.HOUR;
  if (ce.view && (ce.view[1] < t0 || ce.view[0] < t0)) ce.view = null;
  var units = [];
  ce.series.forEach(function (x) { var u = CB.Trend.unitFor(x, ce.mode); if (units.indexOf(u) < 0) units.push(u); });

  var siteSel = '<select class="select" data-input="ce-site">' + CB.scopeClients().map(function (c) {
    var cs = sites.filter(function (x) { return x.client === c.id && x.params.length > 2; });
    return cs.length ? '<optgroup label="' + CB.esc(c.name) + '">' + cs.map(function (x) { return '<option value="' + x.id + '"' + (x.id === s.id ? ' selected' : '') + '>' + CB.esc(x.name) + '</option>'; }).join('') + '</optgroup>' : '';
  }).join('') + '</select>';
  var paramList = '<div class="plist">' + s.params.map(function (k) {
    var on = ce.series.some(function (x) { return x.site === s.id && x.key === k; }), p = CB.PARAMS[k];
    return '<label class="pchk' + (on ? ' on' : '') + '"><input type="checkbox" data-input="ce-param" data-k="' + k + '"' + (on ? ' checked' : '') + '><span>' + p.name + '</span><small>' + p.unit + (p.calc ? ' · calc' : '') + '</small></label>';
  }).join('') + '</div>';
  var others = ce.series.filter(function (x) { return x.site !== s.id; });
  var seriesChips = '<div class="pills">' + ce.series.map(function (x, i) {
    return '<span class="pill sr-pill"><i style="background:' + CB.PALETTE[i % 8] + '"></i>' + CB.esc(CB.site(x.site).name.split(' ').slice(0, 2).join(' ')) + ' · ' + CB.PARAMS[x.key].name + '<button data-action="ce-remove" data-i="' + i + '" aria-label="Remove">' + CB.icon('close') + '</button></span>';
  }).join('') + '</div>';

  var controls = CB.card({ title: 'Data', icon: 'sliders', body:
    '<div class="form"><label class="field"><span>Site</span>' + siteSel + '</label><div class="field"><span>Parameters</span>' + paramList + '</div>' +
    '<div class="field"><span>Plotted series (' + ce.series.length + ')</span>' + seriesChips + (others.length ? '<small>Includes series from other sites, keep them to compare sites on one chart.</small>' : '<small>Change site and tick more to compare sites.</small>') + '</div></div>' });

  var scaleRows = units.map(function (u) {
    var sc = ce.scale[u] || {};
    return '<div class="scale-row"><span class="mono">' + CB.esc(u) + '</span><input class="input" placeholder="auto" value="' + (sc.min != null ? sc.min : '') + '" data-input="ce-scale" data-u="' + CB.esc(u) + '" data-k="min"><input class="input" placeholder="auto" value="' + (sc.max != null ? sc.max : '') + '" data-input="ce-scale" data-u="' + CB.esc(u) + '" data-k="max"></div>';
  }).join('');
  var display = CB.card({ title: 'Display', icon: 'eye', body: '<div class="form">' +
    '<div class="field"><span>Show values as</span>' + CB.seg('ce-mode', [['raw', 'Raw'], ['zeroed', 'Zeroed'], ['cumulative', 'Cumulative'], ['rate', 'Rate / h']], ce.mode) + '</div>' +
    CB.switchHtml('Alarm thresholds & breaches', ce.thresholds, 'data-input="ce-toggle" data-k="thresholds"') +
    CB.switchHtml('Day / evening / night shading', ce.shading, 'data-input="ce-toggle" data-k="shading"') +
    '<div class="field"><span>Y-axes (' + units.length + ', one per unit)</span><div class="scale-row hd"><span>Unit</span><span>Min</span><span>Max</span></div>' + scaleRows + '<small>Leave blank for auto scaling.</small></div></div>' });

  var tabs = '<div class="tabs" style="margin-top:0">' + [['trend', 'trend', 'Trend'], ['rose', 'wind', 'Wind & dust rose']].map(function (t) { return '<button class="tab' + (ce.tab === t[0] ? ' on' : '') + '" data-action="ce-tab" data-v="' + t[0] + '">' + CB.icon(t[1]) + t[2] + '</button>'; }).join('') + '</div>';

  var main;
  if (ce.tab === 'rose') main = CB.ceRose(ce, s);
  else {
    CB.onMount(function () {
      var el = document.getElementById('ce-chart');
      CB._trend = new CB.Trend(el, {
        t0: t0, t1: t1, height: 400, shading: ce.shading, thresholds: ce.thresholds && ce.mode === 'raw', scale: ce.scale, wheel: true, mode: ce.panMode, minStep: 5,
        series: ce.series.map(function (x, i) {
          var st = CB.site(x.site), p = CB.PARAMS[x.key];
          return { name: (ce.series.some(function (y) { return y.site !== x.site; }) ? st.name.split(' ').slice(0, 2).join(' ') + ' · ' : '') + p.name, short: p.name, unit: CB.Trend.unitFor(x, ce.mode), dp: p.dp, color: CB.PALETTE[i % 8], th: p.warn != null ? CB.thresholds(st, x.key) : null,
            get: function (a, b, step) { return CB.transform(CB.series(st, x.key, a, b, step), ce.mode, step); } };
        }),
        onView: function (a, b) { ce.view = [a, b]; CB.ceStats(); }
      });
      if (ce.view) CB._trend.setView(ce.view[0], ce.view[1]);
      CB.ceStats();
    });
    main = CB.card({ cls: 'ce-card', body:
      '<div class="ce-tools"><div class="row">' + CB.seg('ce-period', CB.PERIODS, ce.period) +
      '<span class="ce-range" id="ce-range"></span></div><div class="row">' +
      CB.seg('ce-pan', [['zoom', CB.icon('zoomin') + 'Zoom'], ['pan', CB.icon('move') + 'Pan']], ce.panMode) +
      '<div class="btn-group"><button class="btn btn-sm" data-action="ce-z" data-v="0.5" title="Zoom in">+</button><button class="btn btn-sm" data-action="ce-z" data-v="2" title="Zoom out">−</button><button class="btn btn-sm" data-action="ce-p" data-v="-0.4" title="Pan left">‹</button><button class="btn btn-sm" data-action="ce-p" data-v="0.4" title="Pan right">›</button><button class="btn btn-sm" data-action="ce-reset">Reset</button></div>' +
      '<button class="btn btn-sm btn-primary" data-action="ce-export">' + CB.icon('download') + 'Export view</button></div></div>' +
      '<div id="ce-chart"></div><div class="tiny muted mt-s">Drag across the chart to zoom · Ctrl + scroll to zoom · switch to Pan (or hold Shift) to drag · click a legend item to hide it, double-click to isolate.</div>' }) +
      CB.card({ title: 'Statistics for the visible window', icon: 'list', flush: true, cls: 'mt', body: '<div id="ce-stats"></div>' });
  }

  return CB.pageHead({ title: 'Chart Explorer', sub: 'Plot any parameters over any period. Calculated parameters (rolling averages) behave exactly like measured ones.',
    actions: '<button class="btn" data-go="/sites/' + s.id + '">' + CB.icon('pin') + CB.esc(s.name) + '</button>' }) +
    '<div class="grid g-side ce-grid"><div class="stack">' + controls + display + '</div><div>' + tabs + main + '</div></div>';
};

CB.Trend.unitFor = function (x, mode) {
  var u = CB.PARAMS[x.key].unit;
  if (mode === 'rate') return u + '/h';
  if (mode === 'cumulative') return 'Σ ' + u;
  return u;
};

CB.ceStats = function () {
  var ce = CB.ce, el = document.getElementById('ce-stats'), tr = CB._trend;
  if (!el || !tr) return;
  var a = tr.view[0], b = tr.view[1];
  var r = document.getElementById('ce-range');
  if (r) r.textContent = CB.dateTime(new Date(a)) + ' → ' + CB.dateTime(new Date(b));
  el.innerHTML = '<table class="tbl"><thead><tr><th>Series</th><th class="num">Min</th><th class="num">Mean</th><th class="num">Max</th><th class="num">Samples</th><th class="num">Above warning</th><th class="num">Above critical</th></tr></thead><tbody>' + ce.series.map(function (x, i) {
    var st = CB.site(x.site), p = CB.PARAMS[x.key], data = tr.dataCache[i] || [];
    var v = data.filter(function (d) { return d[0] >= a && d[0] <= b && d[1] != null; }).map(function (d) { return d[1]; });
    var th = CB.thresholds(st, x.key);
    var w = th.warn != null && ce.mode === 'raw' ? v.filter(function (q) { return th.low ? q <= th.warn : q >= th.warn; }).length : null;
    var c = th.crit != null && ce.mode === 'raw' ? v.filter(function (q) { return th.low ? q <= th.crit : q >= th.crit; }).length : null;
    return '<tr><td><span class="dot-sm" style="background:' + CB.PALETTE[i % 8] + '"></span><span class="name">' + p.name + '</span> <span class="sub">' + CB.esc(st.name) + '</span></td><td class="num">' + (v.length ? CB.fixed(Math.min.apply(null, v), p.dp) : '—') + '</td><td class="num">' + (v.length ? CB.fixed(CB.avg(v), p.dp) : '—') + '</td><td class="num strong">' + (v.length ? CB.fixed(Math.max.apply(null, v), p.dp) : '—') + '</td><td class="num muted">' + v.length + ' × ' + tr.step + ' min</td>' +
      '<td class="num">' + (w == null ? '<span class="muted">—</span>' : w ? '<span class="st st-warn">' + w + '</span>' : '0') + '</td><td class="num">' + (c == null ? '<span class="muted">—</span>' : c ? '<span class="st st-bad">' + c + '</span>' : '0') + '</td></tr>';
  }).join('') + '</tbody></table>';
};

CB.ceRose = function (ce, s) {
  var rs = ce.rose, hasDir = s.params.indexOf('wd') >= 0;
  if (!hasDir) return CB.card({ body: CB.empty('wind', 'No wind direction at this site', 'Pick a site with a wind sensor (weather or dust station) to draw wind and dust roses.') });
  var t1 = Date.now(), t0 = t1 - rs.period * CB.HOUR;
  var sm = CB.roseSamples(s, t0, t1, rs.period > 200 ? 30 : 10);
  var parse = function (str) { return str.split(',').map(function (x) { return parseFloat(x); }).filter(function (x) { return !isNaN(x); }); };
  var opts = { sectors: rs.sectors, calm: rs.calm, calmMode: rs.calmMode, size: 340 };
  var hasDust = s.params.indexOf('pm10') >= 0;
  var cfg = CB.card({ title: 'Rose configuration', icon: 'sliders', titleExtra: CB.p2('Phase 2 · full configurable rose'), sub: 'Sectors, speed / concentration buckets and calm handling', body:
    '<div class="form g-2 rose-cfg"><div class="field"><span>Period</span>' + CB.seg('rose-period', [[24, '24 h'], [168, '7 days'], [720, '30 days']], rs.period) + '</div>' +
    '<div class="field"><span>Sectors</span>' + CB.seg('rose-sectors', [[8, '8'], [16, '16'], [36, '36']], rs.sectors) + '</div>' +
    '<label class="field"><span>Wind speed buckets (m/s)</span><input class="input mono" value="' + rs.wind + '" data-input="rose-buckets" data-k="wind"><small>Comma-separated lower edges</small></label>' +
    '<label class="field"><span>Dust buckets (PM10 µg/m³)</span><input class="input mono" value="' + rs.dust + '" data-input="rose-buckets" data-k="dust"><small>Top bucket starts at the 24-hr criterion</small></label>' +
    '<label class="field"><span>Calm threshold (m/s)</span><input class="input mono" type="number" step="0.1" min="0" value="' + rs.calm + '" data-input="rose-calm"></label>' +
    '<div class="field"><span>Calm handling</span>' + CB.seg('rose-calmmode', [['centre', 'Show in centre'], ['exclude', 'Exclude']], rs.calmMode) + '</div></div>' });
  return '<div class="grid g-2">' + CB.card({ title: 'Wind rose', icon: 'wind', sub: s.name + ' · ' + (rs.period / 24) + ' day' + (rs.period > 24 ? 's' : '') + ' · direction wind blows from', body: CB.Charts.rose(sm, Object.assign({ mode: 'wind', buckets: parse(rs.wind) }, opts)) }) +
    (hasDust ? CB.card({ title: 'Dust rose', icon: 'dust', sub: 'PM10 concentration by wind direction · points to likely sources', body: CB.Charts.rose(sm, Object.assign({ mode: 'dust', buckets: parse(rs.dust) }, opts)) })
      : CB.card({ title: 'Dust rose', icon: 'dust', body: CB.empty('dust', 'No dust sensor here', 'Dust roses combine PM10 with wind direction at the same station.') })) + '</div>' +
    '<div class="mt">' + cfg + '</div>';
};

/* Chart Explorer actions */
CB.inputs['ce-site'] = function (el) {
  var ce = CB.ce, s = CB.site(el.value);
  ce.site = s.id;
  // keep series from other sites; add this site's headline parameter
  var k = CB.headline(s);
  if (!ce.series.some(function (x) { return x.site === s.id; }) && k) ce.series.push({ site: s.id, key: k === 'pm10' ? 'pm10' : k });
  ce.view = null; CB.render(true);
};
CB.inputs['ce-param'] = function (el) {
  var ce = CB.ce, k = el.getAttribute('data-k');
  if (el.checked) { if (ce.series.length >= 8) { el.checked = false; CB.toast('Up to 8 series at a time'); return; } ce.series.push({ site: ce.site, key: k }); }
  else ce.series = ce.series.filter(function (x) { return !(x.site === ce.site && x.key === k); });
  CB.render(true);
};
CB.actions['ce-remove'] = function (el) { var ce = CB.ce; if (ce.series.length <= 1) { CB.toast('Keep at least one series'); return; } ce.series.splice(+el.getAttribute('data-i'), 1); CB.render(true); };
CB.actions['ce-mode'] = function (el) { CB.ce.mode = el.getAttribute('data-v'); CB.render(true); };
CB.actions['ce-period'] = function (el) { CB.ce.period = +el.getAttribute('data-v'); CB.ce.view = null; CB.render(true); };
CB.actions['ce-tab'] = function (el) { CB.ce.tab = el.getAttribute('data-v'); CB.render(true); };
CB.actions['ce-pan'] = function (el) { CB.ce.panMode = el.getAttribute('data-v'); CB.render(true); };
CB.inputs['ce-toggle'] = function (el) { CB.ce[el.getAttribute('data-k')] = el.checked; CB.render(true); };
CB.inputs['ce-scale'] = function (el) {
  var u = el.getAttribute('data-u'), k = el.getAttribute('data-k');
  CB.ce.scale[u] = CB.ce.scale[u] || {};
  CB.ce.scale[u][k] = el.value === '' ? null : el.value;
  clearTimeout(CB._scT); CB._scT = setTimeout(function () { if (CB._trend) CB._trend.set({ scale: CB.ce.scale }); }, 350);
};
CB.actions['ce-z'] = function (el) { if (CB._trend) CB._trend.zoomBy(+el.getAttribute('data-v')); };
CB.actions['ce-p'] = function (el) { if (CB._trend) CB._trend.panBy(+el.getAttribute('data-v')); };
CB.actions['ce-reset'] = function () { if (CB._trend) CB._trend.reset(); };
CB.actions['ce-export'] = function () {
  var tr = CB._trend, ce = CB.ce;
  CB.exportDialog({ series: ce.series, t0: tr.view[0], t1: tr.view[1], step: tr.step, title: 'Export data in view' });
};
CB.actions['rose-period'] = function (el) { CB.ce.rose.period = +el.getAttribute('data-v'); CB.render(true); };
CB.actions['rose-sectors'] = function (el) { CB.ce.rose.sectors = +el.getAttribute('data-v'); CB.render(true); };
CB.actions['rose-calmmode'] = function (el) { CB.ce.rose.calmMode = el.getAttribute('data-v'); CB.render(true); };
CB.inputs['rose-buckets'] = function (el) { CB.ce.rose[el.getAttribute('data-k')] = el.value; clearTimeout(CB._rbT); CB._rbT = setTimeout(function () { CB.render(true); }, 600); };
CB.inputs['rose-calm'] = function (el) { var v = parseFloat(el.value); if (isNaN(v)) return; CB.ce.rose.calm = v; clearTimeout(CB._rbT); CB._rbT = setTimeout(function () { CB.render(true); }, 600); };

/* ---------------- Dashboards ---------------- */
CB.dashTile = function (s, k, o) {
  o = o || {};
  var p = CB.PARAMS[k], v = CB.latest(s, k), ps = CB.paramState(s, k, v), th = CB.thresholds(s, k);
  var pct = th.crit ? CB.clamp(v / (th.crit * 1.25), 0, 1) : null;
  return '<div class="card clickable dtile dt-' + ps + '" data-go="/sites/' + s.id + '"><div class="dt-h"><span>' + CB.esc(o.label || s.name) + '</span>' + (ps !== 'normal' ? CB.stateChip(ps) : '<span class="dot-sm" style="background:' + CB.STATE.normal.color + '"></span>') + '</div>' +
    '<div class="dt-v"><span data-live="' + s.id + '|' + k + '">' + CB.fmtVal(k, v) + '</span><small>' + p.unit + '</small></div><div class="dt-s">' + (o.sub || p.name) + '</div>' +
    (pct != null ? '<div class="dt-bar"><span style="width:' + (pct * 100) + '%;background:' + CB.STATE[ps === 'comms' ? 'comms' : ps].color + '"></span><i style="left:' + (th.warn / (th.crit * 1.25) * 100) + '%"></i><i class="c" style="left:' + (80) + '%"></i></div>' : '') + '</div>';
};
CB.dashTrend = function (id, sites, k, hours) {
  CB.onMount(function () {
    var el = document.getElementById(id); if (!el) return;
    new CB.Trend(el, { t0: Date.now() - (hours || 24) * CB.HOUR, t1: Date.now(), height: 230, shading: true, thresholds: true, minStep: 10,
      series: sites.map(function (s, i) { var p = CB.PARAMS[k]; return { name: s.name, short: p.name, unit: p.unit, dp: p.dp, color: CB.PALETTE[i % 8], th: i === 0 && p.warn != null ? CB.thresholds(s, k) : null, get: function (a, b, st) { return CB.series(s, k, a, b, st); } }; }) });
  });
  return '<div id="' + id + '"></div>';
};
CB.dashAlarms = function (sites) {
  var ids = sites.map(function (s) { return s.id; }), al = CB.ALARMS.filter(function (a) { return ids.indexOf(a.site) >= 0 && a.state !== 'cleared'; });
  return CB.card({ title: 'Alarm status', icon: 'bell', flush: true, actions: '<button class="btn btn-sm" data-go="/alarms">Console</button>', body: al.length ? '<div class="list">' + al.map(function (a) {
    return '<div class="li click" data-go="/sites/' + a.site + '"><span class="dot-lg" style="background:' + (a.sev === 'critical' ? '#ef4444' : a.sev === 'warning' ? '#f59e0b' : '#4f46e5') + '"></span><div class="li-main"><div class="li-t">' + CB.esc(CB.site(a.site).name) + '</div><div class="li-s">' + CB.esc(a.name) + ' · ' + CB.ago(a.mins) + '</div></div><div class="li-r">' + (a.state === 'active' ? '<span class="st st-bad">Unack</span>' : '<span class="st st-warn">Ack</span>') + '</div></div>';
  }).join('') + '</div>' : '<div class="all-clear">' + CB.icon('check') + 'All clear</div>' });
};

CB.S.dashboards = function (id) {
  var isAdmin = CB.state.role === 'admin', sites = CB.scopeSites();
  var dbs = CB.DASHBOARDS.filter(function (d) { return !d.admin || isAdmin; });
  var db = dbs.find(function (d) { return d.id === id; }) || dbs[0];
  var by = function (kind) { return sites.filter(function (s) { return s.kinds.indexOf(kind) >= 0; }); };
  var tiles = '', dust = by('dust'), noise = by('noise'), water = by('water'), met = sites.filter(function (s) { return s.kinds.indexOf('met') >= 0; });
  var cam = sites.find(function (s) { return s.camera; });
  var camTile = cam ? CB.card({ title: 'Camera · ' + cam.name, icon: 'camera', actions: '<button class="btn btn-sm" data-go="/media?site=' + cam.id + '">Archive ' + CB.p2('P2') + '</button>', body: '<div class="cam-latest" data-action="media-view" data-site="' + cam.id + '" data-t="' + CB.align(Date.now(), 15) + '">' + CB.camImg(cam, CB.align(Date.now(), 15), { w: 560, h: 300 }) + '</div>' }) : '';
  var lead = function (arr, k) { return arr.slice().sort(function (a, b) { return (CB.latest(b, k) || 0) - (CB.latest(a, k) || 0); }); };

  if (db.id === 'air') {
    var ds = lead(dust, 'pm10_1h');
    var avgRows = ds.map(function (s) {
      var arr = CB.series(s, 'pm10', Date.now() - 24 * CB.HOUR, Date.now(), 10).map(function (p) { return p[1]; }).filter(function (v) { return v != null; });
      var mx1 = Math.max.apply(null, CB.series(s, 'pm10_1h', Date.now() - 24 * CB.HOUR, Date.now(), 60).map(function (p) { return p[1] || 0; }));
      var a24 = CB.latest(s, 'pm10_24h');
      return '<tr class="click" data-go="/sites/' + s.id + '"><td class="name">' + CB.esc(s.name) + (isAdmin ? ' <span class="sub">' + CB.client(s.client).short + '</span>' : '') + '</td><td class="num strong">' + CB.fixed(a24, 1) + '</td><td class="num">' + CB.fixed(mx1, 1) + '</td><td class="num">' + CB.fmtVal('pm25', CB.latest(s, 'pm25')) + '</td><td class="num">' + CB.fmtVal('tsp', CB.latest(s, 'tsp')) + '</td><td class="num">' + arr.filter(function (v) { return v >= 50; }).length + '</td><td>' + CB.stateChip(CB.paramState(s, 'pm10_24h', a24)) + '</td></tr>';
    }).join('');
    var roseSite = met.find(function (s) { return s.params.indexOf('pm10') >= 0; }) || met[0];
    tiles = '<div class="grid g-4">' + ds.slice(0, 8).map(function (s) { return CB.dashTile(s, 'pm10_1h', { sub: 'PM10 1-hr rolling' + (isAdmin ? ' · ' + CB.client(s.client).short : '') }); }).join('') + '</div>' +
      '<div class="grid g-main mt">' + CB.card({ title: 'PM10 · last 24 h', icon: 'trend', actions: '<button class="btn btn-sm" data-go="/charts?site=' + ds[0].id + '&p=pm10,pm10_1h">Explore</button>', body: CB.dashTrend('db-t1', ds.slice(0, 4), 'pm10', 24) }) +
      (roseSite ? CB.card({ title: 'Dust rose · ' + roseSite.name, icon: 'wind', sub: 'Last 7 days', body: CB.Charts.rose(CB.roseSamples(roseSite, Date.now() - 168 * CB.HOUR, Date.now(), 30), { mode: 'dust', size: 260 }) }) : '') + '</div>' +
      '<div class="grid g-main mt">' + CB.card({ title: 'Daily summary', icon: 'list', flush: true, sub: 'Rolling 24 h · NSW criterion PM10 50 µg/m³ (24-hr average)', body: '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Site</th><th class="num">PM10 24-hr</th><th class="num">Max 1-hr</th><th class="num">PM2.5</th><th class="num">TSP</th><th class="num">10-min ≥ 50</th><th>State</th></tr></thead><tbody>' + avgRows + '</tbody></table></div>' }) +
      '<div class="stack">' + CB.dashAlarms(dust) + camTile + '</div></div>';
  } else if (db.id === 'noise') {
    var ns = lead(noise, 'laeq');
    tiles = '<div class="grid g-4">' + ns.slice(0, 8).map(function (s) { return CB.dashTile(s, 'laeq', { sub: 'LAeq 15-min · limit ' + CB.thresholds(s, 'laeq').crit + ' dB(A)' + (isAdmin ? ' · ' + CB.client(s.client).short : '') }); }).join('') + '</div>' +
      '<div class="grid g-main mt">' + CB.card({ title: 'LAeq · last 24 h', icon: 'trend', sub: 'Night 22:00–07:00 shaded', actions: '<button class="btn btn-sm" data-go="/charts?site=' + ns[0].id + '&p=laeq,la90,lamax">Explore</button>', body: CB.dashTrend('db-t1', ns.slice(0, 4), 'laeq', 24) }) + CB.dashAlarms(noise) + '</div>' +
      CB.card({ title: 'Receivers', icon: 'list', flush: true, cls: 'mt', body: '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Receiver</th><th class="num">LAeq</th><th class="num">LA10</th><th class="num">LA90</th><th class="num">LAmax</th><th class="num">Limit</th><th>Audio</th><th>State</th></tr></thead><tbody>' + ns.map(function (s) {
        return '<tr class="click" data-go="/sites/' + s.id + '"><td class="name">' + CB.esc(s.name) + '</td>' + ['laeq', 'la10', 'la90', 'lamax'].map(function (k) { return '<td class="num' + (k === 'laeq' ? ' strong' : '') + '"><span data-live="' + s.id + '|' + k + '">' + CB.fmtVal(k, CB.latest(s, k)) + '</span></td>'; }).join('') + '<td class="num muted">' + CB.thresholds(s, 'laeq').crit + '</td><td>' + (s.audio ? '<button class="btn btn-sm" data-go="/audio?site=' + s.id + '">' + CB.icon('play') + 'Listen</button>' : '') + '</td><td>' + CB.stateChip(CB.siteState(s)) + '</td></tr>';
      }).join('') + '</tbody></table></div>' });
  } else if (db.id === 'water') {
    tiles = '<div class="grid g-4">' + water.map(function (s) {
      var v = CB.latest(s, 'level'), th = CB.thresholds(s, 'level'), pct = CB.clamp(v / 5, 0, 1);
      return '<div class="card clickable dtile" data-go="/sites/' + s.id + '"><div class="dt-h"><span>' + CB.esc(s.name) + '</span>' + CB.stateChip(CB.siteState(s)) + '</div><div class="tank"><div class="tank-fill" style="height:' + (pct * 100) + '%"></div><i style="bottom:' + (th.warn / 5 * 100) + '%"></i><i class="c" style="bottom:' + (th.crit / 5 * 100) + '%"></i><div class="tank-v"><span data-live="' + s.id + '|level">' + CB.fmtVal('level', v) + '</span><small> m</small></div></div><div class="dt-s">EC ' + CB.fmtUnit('ec', CB.latest(s, 'ec')) + ' · pH ' + CB.fmtVal('ph', CB.latest(s, 'ph')) + '</div></div>';
    }).join('') + '</div>' +
      '<div class="grid g-main mt">' + CB.card({ title: 'Water level · last 7 days', icon: 'trend', body: CB.dashTrend('db-t1', water, 'level', 168) }) +
      CB.card({ title: 'Daily rainfall · last 14 days', icon: 'rain', sub: met[0] ? met[0].name : '', body: met[0] ? CB.Charts.bars({ labels: CB.daysBack(14).map(CB.dateLabel), series: [{ name: 'Rainfall (mm)', color: '#0284c7', values: CB.daysBack(14).map(function (d) { var e = new Date(d); e.setHours(23, 59, 0, 0); return CB.round(CB.sum(CB.series(met[0], 'rain', e.getTime() - 24 * CB.HOUR, e.getTime(), 60).map(function (p) { return p[1] || 0; })), 1); }) }], height: 220, yFmt: function (v) { return CB.fixed(v, 0); }, xTicks: 7 }) : '' }) + '</div>' +
      '<div class="mt">' + CB.dashAlarms(water) + '</div>';
  } else if (db.id === 'weather') {
    tiles = '<div class="grid g-4">' + met.slice(0, 8).map(function (s) {
      var wd = CB.latest(s, 'wd'), ws = CB.latest(s, 'ws');
      return '<div class="card clickable dtile" data-go="/sites/' + s.id + '"><div class="dt-h"><span>' + CB.esc(s.name) + '</span>' + (s.comms ? CB.stateChip('comms') : '') + '</div><div class="wx"><svg viewBox="0 0 64 64" class="wx-arrow"><circle cx="32" cy="32" r="29" fill="none" stroke="#ececef" stroke-width="2"/><text x="32" y="10" text-anchor="middle" class="c-ax">N</text><g transform="rotate(' + ((wd || 0) + 180) + ' 32 32)"><path d="M32 12 L39 34 L32 29 L25 34 Z" fill="var(--accent)"/></g></svg><div><div class="dt-v"><span data-live="' + s.id + '|ws">' + CB.fmtVal('ws', ws) + '</span><small>m/s</small></div><div class="dt-s">from ' + (wd == null ? '—' : CB.compass(wd) + ' ' + Math.round(wd) + '°') + '</div></div></div>' +
        '<div class="wx-row"><span>' + CB.icon('thermo') + '<b data-live="' + s.id + '|temp">' + CB.fmtVal('temp', CB.latest(s, 'temp')) + '</b> °C</span><span>' + CB.icon('drop') + '<b>' + CB.fmtVal('rh', CB.latest(s, 'rh')) + '</b> %</span><span>' + CB.icon('rain') + '<b>' + CB.fixed(CB.sum(CB.series(s, 'rain', new Date().setHours(0, 0, 0, 0), Date.now(), 10).map(function (p) { return p[1] || 0; })), 1) + '</b> mm</span></div></div>';
    }).join('') + '</div>' +
      '<div class="grid g-main mt">' + CB.card({ title: 'Temperature · last 3 days', icon: 'trend', body: CB.dashTrend('db-t1', met.filter(function (s) { return !s.comms; }).slice(0, 4), 'temp', 72) }) +
      CB.card({ title: 'Wind rose · ' + met[0].name, icon: 'wind', sub: 'Last 7 days', body: CB.Charts.rose(CB.roseSamples(met[0], Date.now() - 168 * CB.HOUR, Date.now(), 30), { size: 260 }) }) + '</div>';
  } else {
    var src = sites.map(function (s) { return CB.source(s); });
    var byProto = {}; sites.forEach(function (s) { byProto[s.protocol] = (byProto[s.protocol] || 0) + 1; });
    tiles = '<div class="grid g-4">' + [['Sites reporting', (sites.length - sites.filter(function (s) { return s.comms; }).length) + '<small>of ' + sites.length + '</small>', 'wifi'], ['Completeness 24 h', '99.4<small>%</small>', 'check'], ['Low batteries', sites.filter(function (s) { return CB.latest(s, 'batt') < 11.8; }).length, 'bolt'], ['Payloads 24 h', CB.fmt(CB.sum(src.map(function (x) { return x.payloads; }))), 'db']].map(function (k) { return '<div class="card">' + CB.kpi(k[0], k[1], { icon: k[2] }) + '</div>'; }).join('') + '</div>' +
      '<div class="grid g-main mt">' + CB.card({ title: 'Battery voltage', icon: 'bolt', sub: 'Lowest first · warning 11.8 V', body: CB.Charts.hbars(sites.filter(function (s) { return !s.comms; }).map(function (s) { var v = CB.latest(s, 'batt'); return { label: s.name, value: v - 10, display: CB.fixed(v, 2) + ' V', color: v < 11.8 ? '#f59e0b' : '#10b981', go: '/sites/' + s.id }; }).sort(function (a, b) { return a.value - b.value; }).slice(0, 12), { max: 4 }) }) +
      CB.card({ title: 'Sites by ingestion protocol', icon: 'plug', body: CB.Charts.donut(Object.keys(byProto).map(function (k, i) { return { label: k, value: byProto[k], color: CB.PALETTE[i] }; }), { center: sites.length, sub: 'sites' }) }) + '</div>' +
      CB.card({ title: 'Last data received', icon: 'clock', flush: true, cls: 'mt', body: '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Site</th><th>Client</th><th>Telemetry</th><th class="num">Cadence</th><th class="num">Last payload</th><th>Status</th></tr></thead><tbody>' + src.sort(function (a, b) { return b.last - a.last; }).slice(0, 12).map(function (x) { return '<tr class="click" data-go="/sites/' + x.site.id + '"><td class="name">' + x.site.name + '</td><td>' + CB.clientChip(x.site.client) + '</td><td class="muted">' + x.site.telemetry + '</td><td class="num">' + x.site.cadence + ' min</td><td class="num">' + CB.ago(x.last) + '</td><td>' + CB.status(x.status) + '</td></tr>'; }).join('') + '</tbody></table></div>' });
  }

  var rf = CB.state.refresh;
  CB.onMount(function () {
    var stamp = document.getElementById('db-refreshed');
    if (!rf) return;
    var iv = setInterval(function () { CB.liveRefresh(); if (stamp) { var d = new Date(); stamp.textContent = CB.stamp24(d) + ':' + String(d.getSeconds()).padStart(2, '0'); } }, rf * 1000);
    CB.onUnmount(function () { clearInterval(iv); });
  });
  var d0 = new Date();
  return CB.pageHead({ title: 'Dashboards', sub: 'Baseline dashboards for ' + (isAdmin ? 'the whole portfolio' : 'your sites') + '. Real-time values, colour-coded by alarm state.',
    actions: '<div class="refresh">' + CB.icon('refresh') + '<span class="tiny muted">Auto-refresh</span>' + CB.select([[0, 'Off'], [10, '10 s'], [30, '30 s'], [60, '1 min'], [300, '5 min']], rf, 'data-input="db-refresh"') + '<span class="tiny muted">· <span id="db-refreshed">' + CB.stamp24(d0) + ':' + String(d0.getSeconds()).padStart(2, '0') + '</span></span></div>' + CB.p2Btn('New dashboard', 'plus') }) +
    '<div class="db-tabs">' + dbs.map(function (d) { return '<button class="db-tab' + (d.id === db.id ? ' on' : '') + '" data-go="/dashboards/' + d.id + '">' + CB.icon(d.icon) + '<div><b>' + d.name + '</b><span>' + d.desc + '</span></div></button>'; }).join('') + '</div>' +
    tiles +
    '<div class="sec-title">Coming in Phase 2</div><div class="grid g-2">' +
    CB.placeholder('Build-your-own dashboards', 'Drag and drop modular tiles (values, trends, tables, roses, cameras) into your own layouts, saved per user or shared with a client.', { icon: 'grid', mock: '<div class="ph2-grid"><i></i><i class="w"></i><i></i><i></i><i class="w"></i></div>' }) +
    CB.placeholder('Live indicators on a site photo', 'Place live values and alarm lights on a site photo or schematic, e.g. dust monitors over a pit aerial.', { icon: 'image', mock: '<div class="ph2-photo"><span style="left:22%;top:40%">24.1</span><span style="left:58%;top:28%">47.9</span><span style="left:70%;top:66%">18.2</span></div>' }) +
    '</div>';
};
CB.inputs['db-refresh'] = function (el) { CB.setState({ refresh: +el.value }); CB.toast(+el.value ? 'Auto-refresh every ' + el.options[el.selectedIndex].text : 'Auto-refresh off'); };
