/* =========================================================
   Alarm & Event Console, Reports (+ schedule editor, simplified
   builder preview), Data Export & API (+ export dialog),
   Noise / Audio Browser (+ player), Webcam / Media Gallery (+ viewer)
   ========================================================= */
CB.S = CB.S || {};

/* ---------------- Alarm & Event Console ---------------- */
CB.ac = { tab: 'alarms', site: '', param: '', state: '', sev: '', days: 21, kind: '', q: '' };
CB.S.alarms = function () {
  var q = CB.query(), ac = CB.ac, isAdmin = CB.state.role === 'admin';
  if (q.site && q.site !== ac._qs) { ac.site = q.site; ac._qs = q.site; ac.tab = 'alarms'; }
  var all = CB.scopeAlarms();
  var act = all.filter(function (a) { return a.state === 'active'; }), ackd = all.filter(function (a) { return a.state === 'acknowledged'; });
  var cl24 = all.filter(function (a) { return a.state === 'cleared' && a.clearedMins < 1440; });
  var ackTimes = all.filter(function (a) { return a.ackMins != null && a.state === 'cleared'; }).map(function (a) { return a.mins - a.ackMins; });
  var kpis = '<div class="grid g-5">' +
    '<div class="card kc-alarm">' + CB.kpi('New · unacknowledged', act.length, { icon: 'bell', sub: act.filter(function (a) { return a.sev === 'critical'; }).length + ' critical' }) + '</div>' +
    '<div class="card">' + CB.kpi('Active · acknowledged', ackd.length, { icon: 'check' }) + '</div>' +
    '<div class="card">' + CB.kpi('Cleared · last 24 h', cl24.length, { icon: 'clock' }) + '</div>' +
    '<div class="card">' + CB.kpi('Median time to acknowledge', Math.round(ackTimes.sort(function (a, b) { return a - b; })[Math.floor(ackTimes.length / 2)] || 0) + '<small>min</small>', { icon: 'bolt' }) + '</div>' +
    '<div class="card">' + CB.kpi('Notifications delivered', '100<small>%</small>', { icon: 'sms', sub: 'SMS + email · last 30 days' }) + '</div></div>';

  var tabs = '<div class="tabs">' + [['alarms', 'bell', 'Alarms', all.length], ['events', 'list', 'Event log', CB.scopeEvents().length]].map(function (t) { return '<button class="tab' + (ac.tab === t[0] ? ' on' : '') + '" data-action="ac-tab" data-v="' + t[0] + '">' + CB.icon(t[1]) + t[2] + '<span class="cnt">' + t[3] + '</span></button>'; }).join('') + '</div>';

  var body;
  if (ac.tab === 'alarms') {
    var sites = CB.scopeSites();
    var paramsUsed = {}; all.forEach(function (a) { if (a.param) paramsUsed[a.param] = 1; });
    var list = all.filter(function (a) {
      return (!ac.site || a.site === ac.site) && (!ac.param || a.param === ac.param || (ac.param === 'comms' && !a.param)) && (!ac.state || a.state === ac.state) && (!ac.sev || a.sev === ac.sev) && a.mins <= ac.days * 1440;
    });
    var filters = '<div class="filters">' +
      CB.select([['', 'All sites']].concat(sites.map(function (s) { return [s.id, s.name]; })), ac.site, 'data-input="ac-f" data-k="site"') +
      CB.select([['', 'All parameters']].concat(Object.keys(paramsUsed).map(function (k) { return [k, CB.PARAMS[k].name]; })).concat([['comms', 'Comms / stale data']]), ac.param, 'data-input="ac-f" data-k="param"') +
      CB.select([['', 'Any state'], ['active', 'Active · unacknowledged'], ['acknowledged', 'Active · acknowledged'], ['cleared', 'Cleared']], ac.state, 'data-input="ac-f" data-k="state"') +
      CB.select([['', 'Any severity'], ['critical', 'Critical'], ['warning', 'Warning'], ['info', 'Info']], ac.sev, 'data-input="ac-f" data-k="sev"') +
      CB.select([[1, 'Last 24 h'], [7, 'Last 7 days'], [21, 'Last 21 days']], ac.days, 'data-input="ac-f" data-k="days"') +
      '<span class="tiny muted">' + list.length + ' alarms</span>' +
      (ac.site || ac.param || ac.state || ac.sev ? '<button class="btn btn-sm btn-ghost" data-action="ac-clear">Clear filters</button>' : '') + '</div>';
    body = CB.card({ flush: true, body: filters + '<div class="tbl-wrap"><table class="tbl al-tbl"><thead><tr><th>Severity</th><th>Alarm</th><th>Site</th><th class="num">Value</th><th class="num">Threshold</th><th>Triggered</th><th>State</th><th>Acknowledgement</th><th></th></tr></thead><tbody>' +
      list.map(function (a) {
        var s = CB.site(a.site), unit = a.param ? CB.PARAMS[a.param].unit : '';
        return '<tr class="click" data-go="/sites/' + s.id + '"><td>' + CB.sevChip(a.sev) + '</td><td><div class="name">' + CB.esc(a.name) + '</div><div class="sub">' + a.id + ' · ' + (a.param ? CB.PARAMS[a.param].name : 'Stale data') + '</div></td>' +
          '<td><div>' + CB.esc(s.name) + '</div>' + (isAdmin ? '<div class="sub">' + CB.client(s.client).short + '</div>' : '') + '</td>' +
          '<td class="num strong">' + (a.param ? CB.fixed(a.value, CB.PARAMS[a.param].dp) + ' <span class="muted" style="font-weight:400">' + unit + '</span>' : '—') + '</td><td class="num muted">' + a.threshold + '</td>' +
          '<td class="nowrap">' + CB.dateTime(new Date(a.t)) + '<div class="sub">' + (a.state === 'cleared' ? 'cleared after ' + CB.mins(a.mins - a.clearedMins) : CB.ago(a.mins)) + '</div></td>' +
          '<td>' + CB.alarmStateChip(a) + '</td><td class="ack-cell">' + (a.ackBy ? '<b>' + a.ackBy + '</b>' + (a.ackNote ? '<div class="sub">“' + CB.esc(a.ackNote) + '”</div>' : '') : '<span class="muted">—</span>') + '</td>' +
          '<td class="right">' + (a.state === 'active' ? '<button class="btn btn-sm" data-action="ack" data-id="' + a.id + '">Acknowledge</button>' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>' + (list.length ? '' : '<div class="empty" style="padding:40px">' + CB.icon('check') + '<p>No alarms match these filters.</p></div>') });
  } else {
    var ev = CB.scopeEvents().filter(function (e) { return (!ac.kind || e.kind === ac.kind) && (!ac.q || e.text.toLowerCase().indexOf(ac.q.toLowerCase()) >= 0); });
    var cats = { Ingestion: 'db', Alarm: 'bell', Notification: 'sms', Comms: 'wifi', Config: 'settings', Report: 'file', Export: 'download', Access: 'key', Data: 'pen', Storage: 'server', Media: 'camera' };
    body = CB.card({ flush: true, body: '<div class="filters">' + CB.select([['', 'System & user events'], ['System', 'System events'], ['User', 'User actions']], ac.kind, 'data-input="ac-f" data-k="kind"') +
      '<input class="input input-sm" style="max-width:260px" placeholder="Search events" value="' + CB.esc(ac.q) + '" data-input="ac-q"><span class="tiny muted">' + ev.length + ' events</span><span style="margin-left:auto"></span><button class="btn btn-sm" data-action="ev-export">' + CB.icon('download') + 'Export CSV</button></div>' +
      '<div class="list">' + ev.map(function (e) {
        return '<div class="li"><div class="li-ico ' + (e.kind === 'User' ? 'tint-purple' : 'tint-blue') + '">' + CB.icon(cats[e.cat] || 'info') + '</div><div class="li-main"><div class="li-t">' + CB.esc(e.text) + '</div><div class="li-s">' + e.id + ' · ' + e.kind + ' · ' + e.cat + (isAdmin && e.client ? ' · ' + CB.client(e.client).short : '') + '</div></div><div class="li-r">' + CB.stamp(e.mins) + '<br>' + CB.ago(e.mins) + '</div></div>';
      }).join('') + '</div>' });
  }
  return CB.pageHead({ title: 'Alarms & Events', sub: 'What is active, what needs acknowledging, and the full history. ' + (isAdmin ? 'Rules are managed in Alarm & Notification Setup.' : 'Alarm rules are configured for you by CBased Environmental.'),
    actions: isAdmin ? '<button class="btn btn-primary" data-go="/admin/alarms">' + CB.icon('bolt') + 'Alarm & notification setup</button>' : '' }) + kpis + tabs + body;
};
CB.actions['ac-tab'] = function (el) { CB.ac.tab = el.getAttribute('data-v'); CB.render(true); };
CB.inputs['ac-f'] = function (el) { var k = el.getAttribute('data-k'); CB.ac[k] = k === 'days' ? +el.value : el.value; CB.render(true); };
CB.inputs['ac-q'] = function (el) { CB.ac.q = el.value; clearTimeout(CB._acq); CB._acq = setTimeout(function () { CB.render(true); var i = document.querySelector('[data-input="ac-q"]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 300); };
CB.actions['ac-clear'] = function () { Object.assign(CB.ac, { site: '', param: '', state: '', sev: '' }); CB.render(true); };
CB.actions['ev-export'] = function () {
  var rows = [['id', 'timestamp', 'kind', 'category', 'event']].concat(CB.scopeEvents().map(function (e) { return [e.id, new Date(Date.now() - e.mins * CB.MIN).toISOString(), e.kind, e.cat, e.text]; }));
  CB.download('cbe-event-log.csv', rows.map(CB.csvRow).join('\n'), 'text/csv');
};

/* ---------------- File helpers ---------------- */
CB.csvRow = function (r) { return r.map(function (v) { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); };
CB.download = function (name, text, type) {
  try {
    var blob = new Blob([text], { type: type || 'text/plain' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    CB.toast('Downloaded ' + name);
  } catch (e) { CB.toast('Download not available in this browser'); }
};

/* ---------------- Reports ---------------- */
CB.rp = { tab: 'scheduled' };
CB.S.reports = function () {
  var isAdmin = CB.state.role === 'admin', reps = CB.scopeReports(), rp = CB.rp;
  var tabs = '<div class="tabs" style="margin-top:0">' + [['scheduled', 'calendar', 'Scheduled reports'], ['history', 'file', 'Generated'], ['branding', 'image', 'Branding & layout']].filter(function (t) { return isAdmin || t[0] !== 'branding'; }).map(function (t) { return '<button class="tab' + (rp.tab === t[0] ? ' on' : '') + '" data-action="rp-tab" data-v="' + t[0] + '">' + CB.icon(t[1]) + t[2] + '</button>'; }).join('') + '</div>';
  var body;
  if (rp.tab === 'scheduled') {
    body = CB.card({ flush: true, body: '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Report</th>' + (isAdmin ? '<th>Client</th>' : '') + '<th>Schedule</th><th class="num">Recipients</th><th>Next run</th><th></th></tr></thead><tbody>' + reps.map(function (r) {
      return '<tr><td><div class="name">' + r.name + '</div><div class="sub">' + r.blocks.join(' · ') + '</div></td>' + (isAdmin ? '<td>' + CB.clientChip(r.client) + '</td>' : '') + '<td><span class="chip">' + r.freq + '</span><div class="sub">' + r.when + ' · ' + (r.client === 'nel' ? 'Australia/Melbourne' : 'Australia/Sydney') + '</div></td><td class="num">' + r.recips + '</td><td class="nowrap">' + r.next + '</td>' +
        '<td class="right nowrap"><button class="btn btn-sm" data-action="report-preview" data-id="' + r.id + '">' + CB.icon('eye') + 'Preview</button> <button class="btn btn-sm" data-action="report-pdf" data-id="' + r.id + '">' + CB.icon('download') + 'PDF</button>' + (isAdmin ? ' <button class="btn btn-sm btn-ghost" data-action="report-schedule" data-id="' + r.id + '">' + CB.icon('pen') + 'Edit</button>' : '') + '</td></tr>';
    }).join('') + '</tbody></table></div>' });
  } else if (rp.tab === 'history') {
    var hist = [];
    reps.forEach(function (r) {
      var n = r.freq === 'Daily' ? 7 : r.freq === 'Weekly' ? 4 : r.freq === 'Custom' ? 5 : 3, gap = { Daily: 1, Weekly: 7, Monthly: 30, Quarterly: 91, Yearly: 365, Custom: 3 }[r.freq];
      for (var i = 0; i < n; i++) hist.push({ r: r, days: i * gap + 0.3 + (CB.hash(r.id) % 10) / 20 });
    });
    hist.sort(function (a, b) { return a.days - b.days; });
    body = CB.card({ flush: true, body: '<div class="list">' + hist.map(function (h) {
      var d = new Date(Date.now() - h.days * 86400000);
      return '<div class="li"><div class="li-ico tint-red">' + CB.icon('file') + '</div><div class="li-main"><div class="li-t">' + h.r.name + ' – ' + CB.dateLabel(d) + ' ' + d.getFullYear() + '</div><div class="li-s">' + (isAdmin ? CB.client(h.r.client).short + ' · ' : '') + 'PDF · ' + h.r.pages + ' pages · ' + CB.fixed(h.r.pages * 0.18, 1) + ' MB · emailed to ' + h.r.recips + ' recipients</div></div><div class="li-r"><button class="btn btn-sm" data-action="report-preview" data-id="' + h.r.id + '">View</button> <button class="btn btn-sm" data-action="report-pdf" data-id="' + h.r.id + '">' + CB.icon('download') + '</button></div></div>';
    }).join('') + '</div>' });
  } else {
    var c = CB.client(rp.brand || 'hvo');
    body = '<div class="grid g-2">' + CB.card({ title: 'Client branding', icon: 'image', actions: CB.select(CB.CLIENTS.map(function (x) { return [x.id, x.name]; }), c.id, 'data-input="rp-brand"'), body: '<div class="form"><div class="row" style="gap:14px"><span class="cust-logo xl" style="background:' + c.color + '">' + c.mark + '</span><div class="dropzone" style="flex:1;padding:14px">' + CB.icon('upload') + '<div class="small">Replace logo (SVG or PNG)</div></div></div>' +
      '<div class="form g-2"><label class="field"><span>Primary colour</span><div class="row"><input type="color" value="' + c.color + '" class="color-in"><input class="input mono" value="' + c.color + '"></div></label><label class="field"><span>Accent colour</span><div class="row"><input type="color" value="' + c.color2 + '" class="color-in"><input class="input mono" value="' + c.color2 + '"></div></label></div>' +
      '<label class="field"><span>Header text</span><input class="input" value="{client} · Environmental Monitoring"></label><label class="field"><span>Footer text</span><input class="input" value="Prepared by CBased Environmental Pty Ltd · {report_name} · Generated {generated_at}"></label>' +
      '<div class="row">' + CB.switchHtml('Page numbering “Page {page} of {pages}”', true) + '</div><div class="row">' + CB.switchHtml('Cover page with site map', true) + '</div></div>' }) +
      CB.card({ title: 'Dynamic tags', icon: 'hash', sub: 'Filled in when each report runs', flush: true, body: '<table class="tbl"><tbody>' + [['{client}', c.name], ['{period}', '1 Sep 2026 – 30 Sep 2026'], ['{report_name}', 'Monthly Air Quality Compliance Report'], ['{site_list}', '3 dust stations'], ['{generated_at}', CB.dateTime(new Date()) + ' AEDT'], ['{page} / {pages}', '1 / 22'], ['{exceedances}', '2 days above 50 µg/m³'], ['{licence}', 'EPL 640']].map(function (r) { return '<tr><td class="mono">' + r[0] + '</td><td class="muted">' + r[1] + '</td></tr>'; }).join('') + '</tbody></table>' }) + '</div>' +
      '<div class="card-f" style="border:0;background:none;padding:14px 0"><button class="btn btn-primary" data-action="toast" data-msg="Branding saved for ' + c.short + '">Save branding</button></div>';
  }
  return CB.pageHead({ title: 'Reports', sub: 'Scheduled, time-zone aware PDF reports emailed automatically, with client branding. Download any report on demand.',
    actions: (isAdmin ? '<button class="btn" data-action="report-schedule">' + CB.icon('plus') + 'New schedule</button>' : '') + '<button class="btn btn-primary" data-action="report-builder">' + CB.icon('grid') + 'Report builder ' + CB.p2('Phase 2 preview') + '</button>' }) +
    tabs + body;
};
CB.actions['rp-tab'] = function (el) { CB.rp.tab = el.getAttribute('data-v'); CB.render(true); };
CB.inputs['rp-brand'] = function (el) { CB.rp.brand = el.value; CB.render(true); };
CB.actions['report-pdf'] = function (el) { var r = CB.report(el.getAttribute('data-id')); CB.toast('Generating PDF · ' + r.name); setTimeout(function () { CB.toast(r.pages + '-page PDF ready (prototype: no file created)'); }, 1200); };

/* Report document preview (branded) */
CB.reportDoc = function (r, blocks) {
  var c = CB.client(r.client), sites = CB.SITES.filter(function (s) { return s.client === c.id; });
  var dust = sites.filter(function (s) { return s.params.indexOf('pm10') >= 0; }), met = sites.filter(function (s) { return s.params.indexOf('wd') >= 0; });
  var days = CB.daysBack(14);
  var blockHtml = function (b) {
    if (b === 'chart') {
      var ds = dust.length ? dust : sites.filter(function (s) { return s.params.indexOf('laeq') >= 0; });
      var k = dust.length ? 'pm10' : 'laeq';
      return '<h3>' + (dust.length ? 'PM10 24-hour averages' : 'LAeq nightly averages') + '</h3>' + CB.Charts.line({ labels: days.map(CB.dateLabel), series: ds.slice(0, 3).map(function (s, i) { return { name: s.name, color: CB.PALETTE[i], values: days.map(function (d) { var e = new Date(d); e.setHours(23, 0, 0, 0); return k === 'pm10' ? CB.val(s, 'pm10_24h', e.getTime()) : CB.val(s, 'laeq', e.getTime() - 2 * CB.HOUR); }) }; }), height: 200, xTicks: 7, yFmt: function (v) { return CB.fixed(v, 0); } });
    }
    if (b === 'table') {
      return '<h3>Summary by site</h3><table class="tbl doc-tbl"><thead><tr><th>Site</th><th>Parameter</th><th class="num">Mean</th><th class="num">Max</th><th class="num">Data capture</th></tr></thead><tbody>' + sites.filter(function (s) { return s.kinds[0] !== 'camera'; }).slice(0, 6).map(function (s) {
        var k = CB.headline(s), arr = CB.series(s, k, Date.now() - 14 * 86400000, Date.now(), 60).map(function (p) { return p[1]; }).filter(function (v) { return v != null; });
        return '<tr><td>' + s.name + '</td><td>' + CB.PARAMS[k].name + '</td><td class="num">' + CB.fixed(CB.avg(arr), CB.PARAMS[k].dp) + '</td><td class="num">' + CB.fixed(Math.max.apply(null, arr), CB.PARAMS[k].dp) + '</td><td class="num">' + (s.comms ? '96.2' : '99.' + (CB.hash(s.id) % 9 + 1)) + '%</td></tr>';
      }).join('') + '</tbody></table>';
    }
    if (b === 'rose') return met.length ? '<h3>Wind rose · ' + met[0].name + '</h3><div style="max-width:300px">' + CB.Charts.rose(CB.roseSamples(met[0], Date.now() - 14 * 86400000, Date.now(), 60), { size: 260, mode: met[0].params.indexOf('pm10') >= 0 ? 'dust' : 'wind' }) + '</div>' : '';
    if (b === 'alarms') {
      var al = CB.ALARMS.filter(function (a) { return a.client === c.id; }).slice(0, 6);
      return '<h3>Alarm summary</h3><table class="tbl doc-tbl"><thead><tr><th>Date</th><th>Alarm</th><th>Site</th><th class="num">Value</th><th>Response</th></tr></thead><tbody>' + al.map(function (a) { return '<tr><td class="nowrap">' + CB.dateTime(new Date(a.t)) + '</td><td>' + CB.esc(a.name) + '</td><td>' + CB.site(a.site).name + '</td><td class="num">' + (a.param ? CB.fmtUnit(a.param, a.value) : '—') + '</td><td>' + CB.esc(a.ackNote || (a.ackBy ? 'Acknowledged by ' + a.ackBy : 'Open')) + '</td></tr>'; }).join('') + '</tbody></table>';
    }
    return '';
  };
  return '<div class="doc" style="--brand:' + c.color + '"><div class="doc-head"><span class="cust-logo" style="background:' + c.color + '">' + c.mark + '</span><div><b>' + c.name + '</b><span>Environmental Monitoring</span></div><div class="doc-meta">' + r.name + '<br>Period: ' + CB.dateLabel(days[0]) + ' – ' + CB.dateLabel(days[13]) + ' ' + new Date().getFullYear() + '</div></div>' +
    '<h2>' + r.name + '</h2><p class="muted">Prepared for ' + c.contact + ', ' + c.name + '. All times ' + (c.id === 'nel' ? 'AEDT (Australia/Melbourne)' : 'AEDT (Australia/Sydney)') + '.</p>' +
    (blocks || ['chart', 'table', 'rose', 'alarms']).map(blockHtml).join('') +
    '<div class="doc-foot"><span>Prepared by CBased Environmental Pty Ltd · Generated ' + CB.dateTime(new Date()) + '</span><span>Page 1 of ' + r.pages + '</span></div></div>';
};
CB.actions['report-preview'] = function (el) {
  var r = CB.report(el.getAttribute('data-id'));
  CB.overlay.open({ title: r.name, size: 'lg', sub: CB.client(r.client).name + ' · ' + r.freq + ' · ' + r.pages + ' pages', body: '<div class="doc-wrap">' + CB.reportDoc(r) + '</div>',
    footer: '<button class="btn" data-action="ov-close">Close</button><button class="btn btn-primary" data-action="report-pdf" data-id="' + r.id + '">' + CB.icon('download') + 'Download PDF</button>' });
};
CB.actions['report-schedule'] = function (el) {
  var r = el.getAttribute('data-id') ? CB.report(el.getAttribute('data-id')) : { name: '', client: 'hvo', freq: 'Monthly', when: '1st of month, 06:00', recips: 0 };
  var emails = r.recips ? ['daniel.hughes@hvo.com.au', 'env.team@hvo.com.au', 'compliance@cbased.com.au'].slice(0, Math.min(3, r.recips)) : [];
  CB.overlay.open({ title: r.name ? 'Edit schedule' : 'New scheduled report', sub: r.name || 'Automated PDF report emailed to a contact list',
    body: '<div class="form"><label class="field"><span>Report name</span><input class="input" value="' + CB.esc(r.name) + '" placeholder="e.g. Monthly Air Quality Compliance Report"></label>' +
      '<div class="form g-2"><label class="field"><span>Client</span>' + CB.select(CB.CLIENTS.map(function (c) { return [c.id, c.name]; }), r.client, 'class="select"') + '</label><label class="field"><span>Template</span>' + CB.select(['Air quality compliance', 'Noise compliance', 'Blast results', 'Water summary', 'Weekly snapshot'], '', '') + '</label></div>' +
      '<div class="field"><span>Frequency</span>' + CB.seg('noop', ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Custom'], r.freq) + '</div>' +
      '<div class="form g-2"><label class="field"><span>Run at</span><input class="input" type="time" value="06:00"></label><label class="field"><span>Time zone</span>' + CB.select(['Australia/Sydney (AEDT, DST aware)', 'Australia/Melbourne (AEDT, DST aware)', 'Australia/Brisbane (AEST)'], '', '') + '</label></div>' +
      '<label class="field"><span>Reporting period</span>' + CB.select(['Previous calendar month', 'Previous 7 days', 'Previous day (00:00–24:00)', 'Since last report'], '', '') + '</label>' +
      '<div class="field"><span>Email PDF to</span><div class="pills">' + emails.map(function (e) { return '<span class="pill">' + e + ' ×</span>'; }).join('') + '<span class="pill" style="border-style:dashed">+ add email, user or group</span></div><small>Recipients do not need a platform login.</small></div>' +
      '<div class="row">' + CB.switchHtml('Apply client branding', true) + CB.switchHtml('Attach CSV of the data', false) + '</div></div>',
    footer: '<button class="btn" data-action="ov-close">Cancel</button><button class="btn" data-action="toast" data-msg="Test report emailed to you">Send test</button><button class="btn btn-primary" data-action="save-close" data-msg="Schedule saved">Save schedule</button>' });
};
CB.actions['noop'] = function (el) { el.parentNode.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b === el); }); };

/* Simplified report builder (Phase 2 preview) */
CB.rb = { blocks: ['chart', 'rose', 'alarms'] };
CB.RB_BLOCKS = { chart: ['Chart', 'trend', 'Trend of a parameter'], table: ['Table', 'list', 'Summary statistics by site'], rose: ['Wind rose', 'wind', 'Directional distribution'], alarms: ['Alarm summary', 'bell', 'Alarms and responses'] };
CB.actions['report-builder'] = function () {
  var r = CB.scopeReports()[0];
  var render = function (wrap) {
    var list = wrap.querySelector('#rb-list'), prev = wrap.querySelector('#rb-prev');
    list.innerHTML = CB.rb.blocks.map(function (b, i) { var d = CB.RB_BLOCKS[b]; return '<div class="rb-item" draggable="true" data-i="' + i + '">' + CB.icon('move', 'ico grip') + CB.icon(d[1]) + '<b>' + d[0] + '</b><button class="ov-close" data-action="rb-del" data-i="' + i + '" style="width:26px;height:26px">' + CB.icon('close') + '</button></div>'; }).join('') || '<div class="tiny muted" style="padding:14px">Add a block from the left.</div>';
    prev.innerHTML = CB.reportDoc(r, CB.rb.blocks);
  };
  var w = CB.overlay.open({ title: 'Report builder', size: 'xl', chips: CB.p2('Phase 2 preview'), sub: 'Compose a report without coding: add blocks, drag to reorder, see a live preview. A simplified preview of the Phase 2 builder.',
    body: '<div class="rb"><div class="rb-col"><div class="rb-h">Blocks</div>' + Object.keys(CB.RB_BLOCKS).map(function (k) { var d = CB.RB_BLOCKS[k]; return '<button class="rb-add" data-action="rb-add" data-k="' + k + '">' + CB.icon(d[1]) + '<div><b>' + d[0] + '</b><span>' + d[2] + '</span></div>' + CB.icon('plus') + '</button>'; }).join('') +
      '<div class="rb-h" style="margin-top:16px">Report layout</div><div id="rb-list"></div><div class="tiny muted mt-s">Drag blocks to reorder.</div>' +
      '<div class="ph2-note">' + CB.icon('lock') + 'Full element library, templates and styling controls arrive with Phase 2.</div></div><div class="rb-prev"><div id="rb-prev"></div></div></div>',
    footer: '<button class="btn" data-action="ov-close">Close</button><button class="btn btn-primary" data-action="save-close" data-msg="Draft report saved">Save draft</button>',
    onMount: function (wrap) {
      render(wrap);
      CB._rbRender = function () { render(wrap); };
      var list = wrap.querySelector('#rb-list'), from = null;
      list.addEventListener('dragstart', function (e) { var it = e.target.closest('.rb-item'); if (!it) return; from = +it.getAttribute('data-i'); it.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', from); } catch (x) { /* ie */ } });
      list.addEventListener('dragover', function (e) { e.preventDefault(); var it = e.target.closest('.rb-item'); list.querySelectorAll('.rb-item').forEach(function (n) { n.classList.toggle('over', n === it); }); });
      list.addEventListener('drop', function (e) {
        e.preventDefault(); var it = e.target.closest('.rb-item'); if (from == null || !it) return;
        var to = +it.getAttribute('data-i'), b = CB.rb.blocks.splice(from, 1)[0]; CB.rb.blocks.splice(to, 0, b); from = null; render(wrap);
      });
      list.addEventListener('dragend', function () { from = null; list.querySelectorAll('.rb-item').forEach(function (n) { n.classList.remove('drag', 'over'); }); });
    } });
  return w;
};
CB.actions['rb-add'] = function (el) { CB.rb.blocks.push(el.getAttribute('data-k')); CB._rbRender(); };
CB.actions['rb-del'] = function (el) { CB.rb.blocks.splice(+el.getAttribute('data-i'), 1); CB._rbRender(); };

/* ---------------- Data Export & API ---------------- */
CB.dx = null;
CB.S.exportScreen = function () {
  var sites = CB.scopeSites().filter(function (s) { return s.params.length > 2; }), isAdmin = CB.state.role === 'admin';
  if (!CB.dx || CB.dx.role !== CB.state.role) CB.dx = { role: CB.state.role, sites: [sites[0].id], params: ['pm10', 'pm25', 'ws', 'wd'], days: 7, interval: 'raw', agg: ['avg', 'min', 'max'], format: 'csv', flags: true };
  var dx = CB.dx;
  var avail = {}; dx.sites.forEach(function (id) { CB.site(id).params.forEach(function (k) { avail[k] = 1; }); });
  var byDomain = {}; Object.keys(avail).forEach(function (k) { var d = CB.PARAMS[k].domain; (byDomain[d] = byDomain[d] || []).push(k); });
  var form = CB.card({ title: 'Download data', icon: 'download', body: '<div class="form">' +
    '<div class="field"><span>Sites</span><div class="plist two">' + CB.scopeClients().map(function (c) {
      var cs = sites.filter(function (s) { return s.client === c.id; });
      return (isAdmin ? '<div class="plist-g">' + c.name + '</div>' : '') + cs.map(function (s) { var on = dx.sites.indexOf(s.id) >= 0; return '<label class="pchk' + (on ? ' on' : '') + '"><input type="checkbox" data-input="dx-site" data-v="' + s.id + '"' + (on ? ' checked' : '') + '><span>' + CB.esc(s.name) + '</span></label>'; }).join('');
    }).join('') + '</div></div>' +
    '<div class="field"><span>Parameters</span><div class="plist two">' + Object.keys(byDomain).map(function (d) { return '<div class="plist-g">' + d + '</div>' + byDomain[d].map(function (k) { var on = dx.params.indexOf(k) >= 0; return '<label class="pchk' + (on ? ' on' : '') + '"><input type="checkbox" data-input="dx-param" data-v="' + k + '"' + (on ? ' checked' : '') + '><span>' + CB.PARAMS[k].name + '</span><small>' + CB.PARAMS[k].unit + '</small></label>'; }).join(''); }).join('') + '</div></div>' +
    '<div class="form g-2"><div class="field"><span>Date range</span>' + CB.seg('dx-days', [[1, '24 h'], [7, '7 days'], [30, '30 days'], [365, '12 months']], dx.days) + '<small>' + CB.dateLabel(new Date(Date.now() - dx.days * 86400000)) + ' → now · or pick dates</small></div>' +
    '<div class="field"><span>Custom range</span><div class="row"><input class="input" type="date" value="' + CB.isoDate(new Date(Date.now() - dx.days * 86400000)) + '" style="width:auto"><input class="input" type="date" value="' + CB.isoDate(new Date()) + '" style="width:auto"></div></div></div>' +
    '<div class="field"><span>Interval</span>' + CB.seg('dx-int', [['raw', 'Raw'], ['15', '15-min'], ['60', 'Hourly'], ['1440', 'Daily'], ['month', 'Monthly']], dx.interval) + '</div>' +
    (dx.interval !== 'raw' ? '<div class="field"><span>Summary statistics</span><div class="row">' + ['avg', 'min', 'max'].map(function (a) { return CB.switchHtml({ avg: 'Average', min: 'Minimum', max: 'Maximum' }[a], dx.agg.indexOf(a) >= 0, 'data-input="dx-agg" data-v="' + a + '"'); }).join('') + '</div></div>' : '') +
    '<div class="form g-2"><div class="field"><span>Format</span>' + CB.seg('dx-fmt', [['csv', 'CSV'], ['json', 'JSON']], dx.format) + '</div><div class="field"><span>Options</span>' + CB.switchHtml('Include quality flags', dx.flags, 'data-input="dx-flags"') + '</div></div>' +
    '</div>', footer: '<span class="tiny muted" style="margin-right:auto">' + CB.dxEstimate() + '</span>' + CB.p2Btn('Save as template', 'copy') + '<button class="btn btn-primary" data-action="dx-go">' + CB.icon('download') + 'Download</button>' });

  var preview = CB.card({ title: 'Preview', icon: 'eye', sub: 'First rows of the file', flush: true, body: '<div class="tbl-wrap"><pre class="code-pre">' + CB.esc(CB.dxBuild(8)) + '</pre></div>' });
  var keyTxt = isAdmin ? 'cbe_live_••••••••••••••••7Qx2' : 'hvo_ro_••••••••••••••••Lm8d';
  var api = CB.card({ title: 'Read-only REST API', icon: 'code', sub: 'Pull ' + (isAdmin ? 'any client\'s' : 'your') + ' data into other systems (modelling, GIS, BI). Keys are read-only and scoped like the user.', body:
    '<dl class="kv"><dt>Base URL</dt><dd class="mono">https://api.cbased-rayven.io/v1</dd><dt>API key</dt><dd><span class="mono">' + keyTxt + '</span> <button class="btn btn-sm" data-action="toast" data-msg="New read-only key generated (shown once)">Regenerate</button></dd><dt>Rate limit</dt><dd>600 requests / min</dd></dl>' +
    '<div class="endpoints">' + [['GET', '/sites', 'Sites you can access, with location and parameters'], ['GET', '/sites/{id}/latest', 'Latest value of every parameter'], ['GET', '/sites/{id}/data?params=pm10,ws&from=…&to=…&interval=15m', 'Raw or summarised time series'], ['GET', '/alarms?state=active', 'Active and historic alarms'], ['GET', '/media/{id}/images?from=…', 'Camera image index']].map(function (e) { return '<div class="ep"><span class="chip chip-get">' + e[0] + '</span><code>' + CB.esc(e[1]) + '</code><span class="muted tiny">' + e[2] + '</span></div>'; }).join('') + '</div>' +
    '<pre class="code-pre dark">curl -H "Authorization: Bearer $CBE_KEY" \\\n  "https://api.cbased-rayven.io/v1/sites/' + sites[0].id + '/latest"\n\n' + CB.esc(JSON.stringify({ site: sites[0].id, name: sites[0].name, timestamp: new Date(CB.lastTime(sites[0])).toISOString(), values: sites[0].params.slice(0, 3).reduce(function (o, k) { o[k] = { value: CB.latest(sites[0], k), unit: CB.PARAMS[k].unit, quality: 'valid' }; return o; }, {}) }, null, 2)) + '</pre>' });
  var bulk = CB.card({ title: isAdmin ? 'Bulk export on exit' : 'A complete copy of your data', icon: 'db', body: '<p class="muted" style="margin-top:0">No lock-in: the full historical record (raw payloads, processed values, quality flags, alarms, audit log and media index) can be exported at any time as CSV / Parquet to an S3 bucket or download link.</p>' +
    '<dl class="kv"><dt>Scope</dt><dd>' + (isAdmin ? 'Whole account or any client' : CB.me().name + ' · all sites since ' + CB.me().since) + '</dd><dt>Size (est.)</dt><dd>' + (isAdmin ? '1.9 TB raw · 214 GB processed' : '38 GB raw · 4.1 GB processed') + '</dd></dl>' +
    '<button class="btn mt" data-action="toast" data-msg="Full archive export requested. You will be emailed a link.">' + CB.icon('db') + 'Request full archive export</button>' });
  return CB.pageHead({ title: 'Data Export & API', sub: 'Download raw or summarised data for any parameters and dates, or pull it programmatically.' }) +
    '<div class="grid g-2 dx-grid"><div class="stack">' + form + preview + '</div><div class="stack">' + api + bulk +
    CB.placeholder('Saved download templates', 'Save and reuse preset combinations of sites, parameters, intervals and formats, e.g. "Monthly EPA submission".', { icon: 'copy' }) +
    (isAdmin ? CB.ctx('CBE continues to run its own pipeline and onward-export raw data to other services (e.g. weather and noise modelling). Exports here and via the API read the same retained record.') : '') + '</div></div>';
};
CB.dxStep = function () { var i = CB.dx.interval; return i === 'raw' ? null : i === 'month' ? 43200 : +i; };
CB.dxEstimate = function () {
  var dx = CB.dx, rows = 0;
  dx.sites.forEach(function (id) { var s = CB.site(id), step = CB.dxStep() || s.cadence; rows += Math.round(dx.days * 1440 / step); });
  var cols = dx.params.length * (CB.dxStep() ? dx.agg.length : 1) * (dx.flags ? 2 : 1);
  return CB.fmt(rows) + ' rows × ' + cols + ' value columns · ~' + CB.fixed(rows * cols * 7 / 1048576 + 0.01, 1) + ' MB';
};
/* Build the export file. limit = preview row count. */
CB.dxBuild = function (limit, full) {
  var dx = CB.dx, step = CB.dxStep(), t1 = Date.now(), t0 = t1 - dx.days * 86400000;
  var head = ['site', 'timestamp_local'], rows = [];
  var cols = [];
  dx.params.forEach(function (k) {
    if (step) dx.agg.forEach(function (a) { cols.push({ k: k, a: a }); head.push(k + '_' + a); });
    else { cols.push({ k: k }); head.push(k); }
    if (dx.flags) head.push(k + '_flag');
  });
  dx.sites.forEach(function (id) {
    var s = CB.site(id), st = step || s.cadence;
    var maxRows = limit || (full ? 20000 : 0);
    var start = limit ? t1 - (limit + 1) * st * CB.MIN : Math.max(t0, t1 - maxRows * st * CB.MIN);
    for (var t = CB.align(t1, st); t >= start && (!limit || rows.length < limit); t -= st * CB.MIN) {
      var r = [s.id, new Date(t).toISOString().replace('Z', '').slice(0, 16)];
      dx.params.forEach(function (k) {
        if (s.params.indexOf(k) < 0) { if (step) dx.agg.forEach(function () { r.push(''); }); else r.push(''); if (dx.flags) r.push('n/a'); return; }
        if (step) {
          var sub = CB.series(s, k, t - st * CB.MIN, t, Math.max(s.cadence, Math.round(st / 6))).map(function (p) { return p[1]; }).filter(function (v) { return v != null; });
          dx.agg.forEach(function (a) { r.push(sub.length ? CB.fixed(a === 'avg' ? CB.avg(sub) : a === 'min' ? Math.min.apply(null, sub) : Math.max.apply(null, sub), CB.PARAMS[k].dp) : ''); });
          if (dx.flags) r.push(sub.length ? 'valid' : 'missing');
        } else { var v = CB.val(s, k, t); r.push(v == null ? '' : CB.fixed(v, CB.PARAMS[k].dp)); if (dx.flags) r.push(CB.quality(s, k, v).toLowerCase()); }
      });
      rows.push(r);
    }
  });
  if (dx.format === 'json') {
    return JSON.stringify(rows.slice(0, limit || rows.length).map(function (r) { var o = {}; head.forEach(function (h, i) { o[h] = r[i] === '' ? null : isNaN(+r[i]) || i < 2 ? r[i] : +r[i]; }); return o; }), null, limit ? 1 : 0);
  }
  return [head].concat(rows).map(CB.csvRow).join('\n');
};
CB.inputs['dx-site'] = function (el) { var dx = CB.dx, v = el.getAttribute('data-v'); if (el.checked) dx.sites.push(v); else if (dx.sites.length > 1) dx.sites = dx.sites.filter(function (x) { return x !== v; }); CB.render(true); };
CB.inputs['dx-param'] = function (el) { var dx = CB.dx, v = el.getAttribute('data-v'); if (el.checked) dx.params.push(v); else if (dx.params.length > 1) dx.params = dx.params.filter(function (x) { return x !== v; }); CB.render(true); };
CB.inputs['dx-agg'] = function (el) { var dx = CB.dx, v = el.getAttribute('data-v'); if (el.checked) dx.agg.push(v); else if (dx.agg.length > 1) dx.agg = dx.agg.filter(function (x) { return x !== v; }); CB.render(true); };
CB.inputs['dx-flags'] = function (el) { CB.dx.flags = el.checked; CB.render(true); };
CB.actions['dx-days'] = function (el) { CB.dx.days = +el.getAttribute('data-v'); CB.render(true); };
CB.actions['dx-int'] = function (el) { CB.dx.interval = el.getAttribute('data-v'); CB.render(true); };
CB.actions['dx-fmt'] = function (el) { CB.dx.format = el.getAttribute('data-v'); CB.render(true); };
CB.actions['dx-go'] = function () {
  var dx = CB.dx;
  CB.exportDialog({ title: 'Download data', sites: dx.sites, params: dx.params, days: dx.days, build: function () { return CB.dxBuild(0, true); }, format: dx.format, estimate: CB.dxEstimate() });
};

/* Export dialog (from Chart Explorer, Data Export, quick-glance and Site Detail) */
CB.exportDialog = function (o) {
  var fmt = o.format || 'csv';
  var summary = o.series ? o.series.map(function (x) { return CB.site(x.site).name + ' · ' + CB.PARAMS[x.key].name; }) : (o.sites || []).map(function (id) { return CB.site(id).name; });
  var range = o.t0 ? CB.dateTime(new Date(o.t0)) + ' → ' + CB.dateTime(new Date(o.t1)) : 'Last ' + (o.days || 7) + ' days';
  CB.overlay.open({ title: o.title || 'Export data', size: 'sm',
    body: '<dl class="kv"><dt>Data</dt><dd>' + summary.slice(0, 6).map(CB.esc).join('<br>') + (summary.length > 6 ? '<br>+ ' + (summary.length - 6) + ' more' : '') + '</dd><dt>Range</dt><dd>' + range + '</dd>' + (o.step ? '<dt>Interval</dt><dd>' + o.step + '-minute (as shown)</dd>' : '') + (o.estimate ? '<dt>Size</dt><dd>' + o.estimate + '</dd>' : '') + '<dt>Format</dt><dd>' + fmt.toUpperCase() + ' · timestamps in local time · quality flags included</dd></dl>' +
      '<div class="xp" id="xp"><div class="xp-bar"><span></span></div><div class="tiny muted" id="xp-l">Ready</div></div>',
    footer: '<button class="btn" data-action="ov-close">Cancel</button><button class="btn btn-primary" id="xp-go">' + CB.icon('download') + 'Download ' + fmt.toUpperCase() + '</button>',
    onMount: function (wrap) {
      wrap.querySelector('#xp-go').addEventListener('click', function () {
        var bar = wrap.querySelector('.xp-bar span'), lab = wrap.querySelector('#xp-l'), p = 0;
        var iv = setInterval(function () {
          p = Math.min(100, p + 22); bar.style.width = p + '%'; lab.textContent = p < 100 ? 'Preparing file… ' + p + '%' : 'Done';
          if (p >= 100) {
            clearInterval(iv);
            var text;
            if (o.build) text = o.build();
            else {
              var rows = [['timestamp_local'].concat(o.series.map(function (x) { return CB.site(x.site).id + '.' + x.key + ' (' + CB.PARAMS[x.key].unit + ')'; }))];
              for (var t = CB.align(o.t0, o.step); t <= o.t1; t += o.step * CB.MIN) rows.push([new Date(t).toISOString().slice(0, 16)].concat(o.series.map(function (x) { var v = CB.val(CB.site(x.site), x.key, t); return v == null ? '' : v; })));
              text = rows.map(CB.csvRow).join('\n');
            }
            CB.download('cbe-export-' + CB.isoDate(new Date()) + '.' + fmt, text, fmt === 'json' ? 'application/json' : 'text/csv');
            setTimeout(function () { CB.overlay.close(); }, 400);
          }
        }, 160);
      });
    } });
};
CB.actions['export-dialog'] = function (el) {
  var s = CB.site(el.getAttribute('data-site')), t1 = Date.now();
  CB.exportDialog({ title: 'Export ' + s.name, series: s.params.map(function (k) { return { site: s.id, key: k }; }), t0: t1 - 7 * 86400000, t1: t1, step: Math.max(5, s.cadence) });
};

/* ---------------- Camera imagery ----------------
   Real open-cut mine photographs (Wikimedia Commons, CC licences) stand in for camera frames.
   Time of day, IR night mode, PM10-driven dust haze and the timestamp are layered on top. */
CB.CAM_PHOTOS = {
  'hvo-jp': { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Coal_Mine_Field.jpg/1280px-Coal_Mine_Field.jpg', credit: 'Max Phillips, CC BY 2.0, via Wikimedia Commons' },
  'hvo-cam': { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/CSIRO_ScienceImage_2852_Dump_Truck_Drives_Through_an_Open_cut_Mine.jpg/1280px-CSIRO_ScienceImage_2852_Dump_Truck_Drives_Through_an_Open_cut_Mine.jpg', credit: 'CSIRO, CC BY 3.0, via Wikimedia Commons' },
  'mtw-ws': { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/CSIRO_ScienceImage_2945_Morwell_Open_Cut_Mine.jpg/1280px-CSIRO_ScienceImage_2945_Morwell_Open_Cut_Mine.jpg', credit: 'CSIRO, CC BY 3.0, via Wikimedia Commons' },
  'mtw-cam': { url: 'https://upload.wikimedia.org/wikipedia/commons/0/02/Loy_Yang_open_cut_brown_coal_mine_and_dredgers.jpg', credit: 'Marcus Wong, CC BY-SA 3.0, via Wikimedia Commons' },
  'ben-cam': { url: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Kalgoorlie_open_cast_mine.jpg', credit: 'Stephen Codrington, CC BY 2.5, via Wikimedia Commons' },
  'nel-cc': { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/CSIRO_ScienceImage_2852_Dump_Truck_Drives_Through_an_Open_cut_Mine.jpg/1280px-CSIRO_ScienceImage_2852_Dump_Truck_Drives_Through_an_Open_cut_Mine.jpg', credit: 'CSIRO, CC BY 3.0, via Wikimedia Commons' }
};
CB.camCredit = function (s) { var p = CB.CAM_PHOTOS[s.id]; return p ? 'Placeholder photo: ' + p.credit : ''; };
CB.camImg = function (s, t, o) {
  o = o || {};
  var W = 640, H = 360, d = new Date(t), h = d.getHours() + d.getMinutes() / 60;
  var r = CB.rng(s.id + 'cam'), fr = CB.rng(s.id + t);
  var night = h < 5.6 || h > 19.6, dawn = h >= 5.6 && h < 7.2, dusk = h > 17.8 && h <= 19.6;
  var sky = night ? ['#3a3a40', '#5a5a62'] : dawn ? ['#f6c58f', '#a9c1dd'] : dusk ? ['#f19c63', '#7d86b8'] : ['#7fb4e3', '#d6e9f7'];
  var id = CB.uid('c');
  var g = function (c) { if (!night) return c; var x = parseInt(c.slice(1), 16), v = Math.round(((x >> 16) * 0.3 + ((x >> 8) & 255) * 0.59 + (x & 255) * 0.11) * 0.62); return 'rgb(' + v + ',' + v + ',' + v + ')'; };
  var dustSite = CB.SITES.find(function (x) { return x.client === s.client && x.params.indexOf('pm10') >= 0; });
  var pm = dustSite ? CB.val(dustSite, 'pm10', t) || 15 : 15;
  var dustOp = CB.clamp((pm - 18) / 50, 0.04, 0.75);
  var sv = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="cam-svg" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="' + id + 's" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + sky[0] + '"/><stop offset="1" stop-color="' + sky[1] + '"/></linearGradient><filter id="' + id + 'b"><feGaussianBlur stdDeviation="14"/></filter><filter id="' + id + 'n"><feTurbulence baseFrequency=".9" numOctaves="1" seed="' + (CB.hash(String(t)) % 50) + '"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .07 0"/></filter></defs>';
  sv += '<rect width="' + W + '" height="' + H + '" fill="url(#' + id + 's)"/>';
  if (night) for (var i = 0; i < 26; i++) sv += '<circle cx="' + fr() * W + '" cy="' + fr() * 110 + '" r="' + (0.5 + fr()) + '" fill="#ddd" opacity=".6"/>';
  else for (var k = 0; k < 3; k++) { var cx = ((r() * W + t / CB.MIN * 0.8 * (k + 1)) % (W + 200)) - 100; sv += '<ellipse cx="' + cx + '" cy="' + (30 + r() * 60) + '" rx="' + (50 + r() * 60) + '" ry="' + (10 + r() * 8) + '" fill="#fff" opacity="' + (0.35 + r() * 0.3) + '"/>'; }
  // ranges
  var hz = 150 + r() * 25;
  var hill = function (y0, amp, col, seed) { var rr = CB.rng(s.id + seed), p = 'M0 ' + H + ' L0 ' + y0; for (var x = 0; x <= W; x += 40) p += ' L' + x + ' ' + (y0 - amp * (0.4 + 0.6 * Math.abs(Math.sin(x / 90 + rr() * 2))) + rr() * 6); return '<path d="' + p + ' L' + W + ' ' + H + 'Z" fill="' + g(col) + '"/>'; };
  sv += hill(hz, 34, dusk ? '#7a7fa6' : '#93a6bb', 'h1') + hill(hz + 22, 22, dusk ? '#6c6a7f' : '#7f9175', 'h2');
  // pit benches
  var top = hz + 30, benches = 5 + Math.floor(r() * 3), cols = ['#b89a74', '#a68866', '#c4a983', '#9d8062', '#b39470', '#8f7458', '#a88b69'];
  for (var b = 0; b < benches; b++) {
    var y = top + b * ((H - top) / benches), inset = b * (W * 0.06), yy = y + (H - top) / benches;
    sv += '<path d="M' + (-20 + inset) + ' ' + y + ' L' + (W + 20 - inset * 0.7) + ' ' + y + ' L' + (W + 20 - inset * 0.7 - 24) + ' ' + yy + ' L' + (inset + 24 - 20) + ' ' + yy + 'Z" fill="' + g(cols[b % cols.length]) + '"/>';
    if (b === benches - 2) sv += '<rect x="' + (inset + 30) + '" y="' + (y + 6) + '" width="' + (W - inset * 1.7 - 60) + '" height="6" fill="' + g('#2d2722') + '" opacity=".85"/>';
  }
  // haul road
  sv += '<path d="M' + (W * 0.12) + ' ' + H + ' Q ' + (W * 0.45) + ' ' + (top + 70) + ' ' + (W * 0.86) + ' ' + (top + 18) + '" stroke="' + g('#d8c3a0') + '" stroke-width="14" fill="none" opacity=".9"/>';
  // trucks move along the road with time
  for (var tr = 0; tr < 3; tr++) {
    var u = ((t / CB.MIN / 9 + tr * 0.33 + r() * 0.1) % 1), q = function (a, b2, c2) { return (1 - u) * (1 - u) * a + 2 * (1 - u) * u * b2 + u * u * c2; };
    var tx = q(W * 0.12, W * 0.45, W * 0.86), ty = q(H, top + 70, top + 18), sc = 1.6 - u;
    if (ty < H - 4) sv += '<g transform="translate(' + tx + ' ' + (ty - 9 * sc) + ') scale(' + sc + ')"><rect x="-11" y="-6" width="22" height="9" rx="1.5" fill="' + g('#f2b705') + '"/><rect x="5" y="-10" width="6" height="5" fill="' + g('#e0a800') + '"/><circle cx="-6" cy="4" r="2.6" fill="#222"/><circle cx="7" cy="4" r="2.6" fill="#222"/>' + (night ? '<circle cx="11" cy="-2" r="3" fill="#fff" opacity=".9"/>' : '') + '</g>';
  }
  // excavator
  sv += '<g transform="translate(' + (W * 0.66) + ' ' + (top + 52) + ')"><rect x="-14" y="-8" width="26" height="12" fill="' + g('#e3a20a') + '"/><path d="M10 -6 L30 -22 L40 -10" stroke="' + g('#c98d08') + '" stroke-width="4" fill="none"/><rect x="-16" y="4" width="30" height="5" fill="#333"/></g>';
  // real site photograph over the drawn scene (the drawn scene stays as the offline fallback)
  var ph = CB.CAM_PHOTOS[s.id];
  if (ph) {
    var jx = (fr() - 0.5) * 8, jy = (fr() - 0.5) * 5; // slight camera shake between frames
    if (night) sv += '<filter id="' + id + 'ir"><feColorMatrix type="matrix" values=".3 .59 .11 0 0  .3 .59 .11 0 0  .3 .59 .11 0 0  0 0 0 1 0"/><feComponentTransfer><feFuncR type="linear" slope=".55"/><feFuncG type="linear" slope=".55"/><feFuncB type="linear" slope=".55"/></feComponentTransfer></filter>';
    sv += '<image href="' + ph.url + '" x="' + (jx - 8) + '" y="' + (jy - 8) + '" width="' + (W + 16) + '" height="' + (H + 16) + '" preserveAspectRatio="xMidYMid slice"' + (night ? ' filter="url(#' + id + 'ir)"' : '') + '/>';
    if (!night && (h < 9 || h > 16)) sv += '<rect width="' + W + '" height="' + H + '" fill="#ffb070" opacity=".1"/>';
  }
  // dust plume tracks PM10 at the client's dust station
  sv += '<g filter="url(#' + id + 'b)" opacity="' + dustOp + '"><ellipse cx="' + (W * 0.55) + '" cy="' + (top + 34) + '" rx="' + (90 + pm) + '" ry="' + (24 + pm * 0.3) + '" fill="' + g('#d9c7a6') + '"/><ellipse cx="' + (W * 0.72) + '" cy="' + (top + 10) + '" rx="' + (60 + pm * 0.6) + '" ry="20" fill="' + g('#cfbb98') + '"/></g>';
  if (dawn || dusk) sv += '<rect width="' + W + '" height="' + H + '" fill="' + (dawn ? '#ffb070' : '#ff8a50') + '" opacity=".12"/>';
  sv += '<rect width="' + W + '" height="' + H + '" filter="url(#' + id + 'n)"/>';
  if (o.label !== false) {
    var ts = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + ' ' + CB.stamp24(d) + ':00';
    sv += '<rect x="0" y="0" width="' + W + '" height="22" fill="#000" opacity=".55"/><text x="10" y="15" style="font:600 11px ui-monospace,Consolas,monospace;fill:#fff;letter-spacing:.04em">' + CB.esc(s.name.toUpperCase()) + '</text><text x="' + (W - 10) + '" y="15" text-anchor="end" style="font:600 11px ui-monospace,Consolas,monospace;fill:#fff">' + ts + (night ? '  IR' : '') + '</text>';
  }
  return sv + '</svg>';
};

/* ---------------- Webcam / Media Gallery (Phase 2, built) ---------------- */
CB.mg = { site: null, day: 0, hour: null };
CB.S.media = function () {
  var cams = CB.camSites(), q = CB.query(), mg = CB.mg;
  if (q.site && CB.site(q.site) && cams.indexOf(CB.site(q.site)) >= 0 && q.site !== mg._qs) { mg.site = q.site; mg._qs = q.site; }
  if (!mg.site || cams.indexOf(CB.site(mg.site)) < 0) mg.site = cams[0] && cams[0].id;
  if (!cams.length) return CB.pageHead({ title: 'Webcam Gallery', chips: CB.p2() }) + CB.empty('camera', 'No camera sites', 'None of your sites have a camera.');
  var s = CB.site(mg.site), now = CB.align(Date.now(), 15);
  var dayStart = new Date(); dayStart.setHours(0, 0, 0, 0); dayStart = dayStart.getTime() - mg.day * 86400000;
  var dayEnd = mg.day === 0 ? now : dayStart + 86400000 - 15 * CB.MIN;
  var frames = CB.camFrames(s, dayStart, dayEnd, 30);
  var sel = mg.hour != null ? CB.clamp(dayStart + mg.hour * CB.HOUR, dayStart, dayEnd) : (mg.day === 0 ? now : dayStart + 12 * CB.HOUR);
  sel = CB.align(sel, 15);
  var days = CB.range(14).map(function (i) { var d = new Date(Date.now() - i * 86400000); return [i, i === 0 ? 'Today' : i === 1 ? 'Yesterday' : CB.DAYS[d.getDay()] + ' ' + CB.dateLabel(d)]; });
  return CB.pageHead({ title: 'Webcam Gallery', chips: CB.p2('Phase 2 preview'), sub: 'Current images and a browsable archive for every camera site. Images arrive by FTP, email and S3, and are kept 90 days.' }) +
    '<div class="cam-tabs">' + cams.map(function (c) { return '<button class="cam-tab' + (c.id === s.id ? ' on' : '') + '" data-action="mg-site" data-v="' + c.id + '"><div class="cam-thumb">' + CB.camImg(c, now, { label: false }) + '</div><div><b>' + CB.esc(c.name) + '</b><span>' + (CB.state.role === 'admin' ? CB.client(c.client).short + ' · ' : '') + 'every 15 min</span></div></button>'; }).join('') + '</div>' +
    '<div class="grid g-main mt"><div class="stack">' + CB.card({ title: CB.dateTime(new Date(sel)), icon: 'camera', sub: s.name + ' · ' + (mg.day === 0 && sel === now ? 'latest image' : 'archive'), actions: '<button class="btn btn-sm" data-action="media-view" data-site="' + s.id + '" data-t="' + sel + '">' + CB.icon('zoomin') + 'Open viewer</button>',
      body: '<div class="cam-main" data-action="media-view" data-site="' + s.id + '" data-t="' + sel + '">' + CB.camImg(s, sel) + '</div>' +
        '<div class="cam-scrub"><span class="tiny muted">00:00</span><input type="range" class="range" min="0" max="' + (mg.day === 0 ? CB.round((now - dayStart) / CB.HOUR, 2) : 23.75) + '" step="0.25" value="' + ((sel - dayStart) / CB.HOUR) + '" data-input="mg-hour"><span class="tiny muted">' + (mg.day === 0 ? 'now' : '23:45') + '</span></div>' }) +
    CB.card({ title: 'Browse by time', icon: 'clock', sub: frames.length + ' images shown (every 30 min) · ' + (96 * 90).toLocaleString('en-AU') + ' retained for this camera', flush: true,
      actions: CB.select(days, mg.day, 'data-input="mg-day"') + '<input class="input input-sm" type="datetime-local" style="width:auto" value="' + CB.isoDate(new Date(sel)) + 'T' + CB.stamp24(new Date(sel)) + '" data-input="mg-jump" title="Jump to a date and time">',
      body: '<div class="strip">' + frames.map(function (f) { return '<button class="strip-f' + (Math.abs(f - sel) < 15 * CB.MIN ? ' on' : '') + '" data-action="mg-pick" data-t="' + f + '">' + CB.camImg(s, f, { label: false }) + '<span>' + CB.stamp24(new Date(f)) + '</span></button>'; }).join('') + '</div>' }) +
    '</div><div class="stack">' + CB.card({ title: 'Archive', icon: 'db', body: '<dl class="kv"><dt>Camera</dt><dd>' + s.logger + '</dd><dt>Ingest</dt><dd>' + s.protocol + ' · 1920×1080 JPEG</dd><dt>Interval</dt><dd>Every 15 minutes, IR at night</dd><dt>Retention</dt><dd>90 days, then deleted automatically</dd><dt>Oldest image</dt><dd>' + CB.dateLabel(new Date(Date.now() - 90 * 86400000)) + '</dd><dt>Stored</dt><dd>8,640 images · 3.1 GB</dd></dl><div class="tiny muted mt-s">' + CB.camCredit(s) + '</div>' }) +
    CB.card({ title: 'Days', icon: 'calendar', flush: true, body: '<div class="list">' + days.slice(0, 7).map(function (d) { return '<div class="li click' + (d[0] === mg.day ? ' li-on' : '') + '" data-action="mg-dayp" data-v="' + d[0] + '"><div class="li-main"><div class="li-t">' + d[1] + '</div><div class="li-s">' + (d[0] === 0 ? Math.round((now - dayStart) / (15 * CB.MIN)) : 96) + ' images</div></div></div>'; }).join('') + '</div>' }) +
    '</div></div>';
};
CB.actions['mg-site'] = function (el) { CB.mg.site = el.getAttribute('data-v'); CB.mg.hour = null; CB.render(true); };
CB.inputs['mg-day'] = function (el) { CB.mg.day = +el.value; CB.mg.hour = null; CB.render(true); };
CB.actions['mg-dayp'] = function (el) { CB.mg.day = +el.getAttribute('data-v'); CB.mg.hour = null; CB.render(true); };
CB.inputs['mg-hour'] = function (el) { CB.mg.hour = +el.value; clearTimeout(CB._mgh); CB._mgh = setTimeout(function () { CB.render(true); }, 120); };
CB.actions['mg-pick'] = function (el) { var t = +el.getAttribute('data-t'), d0 = new Date(t); d0.setHours(0, 0, 0, 0); CB.mg.hour = (t - d0.getTime()) / CB.HOUR; CB.render(true); };
CB.inputs['mg-jump'] = function (el) {
  var t = new Date(el.value).getTime(); if (isNaN(t)) return;
  t = Math.min(t, Date.now());
  if (t < Date.now() - 90 * 86400000) { CB.toast('Images are kept for 90 days'); return; }
  var d0 = new Date(t); d0.setHours(0, 0, 0, 0);
  var today = new Date(); today.setHours(0, 0, 0, 0);
  CB.mg.day = Math.round((today - d0) / 86400000); CB.mg.hour = (t - d0.getTime()) / CB.HOUR; CB.render(true);
};
CB.actions['media-view'] = function (el) {
  var s = CB.site(el.getAttribute('data-site')), t = +el.getAttribute('data-t');
  var show = function (wrap) {
    wrap.querySelector('.mv-img').innerHTML = CB.camImg(s, t);
    wrap.querySelector('.mv-t').textContent = CB.dateTime(new Date(t));
    var pm = CB.SITES.find(function (x) { return x.client === s.client && x.params.indexOf('pm10') >= 0; });
    wrap.querySelector('.mv-m').innerHTML = 'Image ' + s.id.toUpperCase() + '_' + CB.isoDate(new Date(t)).replace(/-/g, '') + '_' + CB.stamp24(new Date(t)).replace(':', '') + '.jpg · 1920×1080 · ' + (300 + CB.hash(String(t)) % 120) + ' KB' + (pm ? ' · PM10 at ' + pm.name + ' then: ' + CB.fmtUnit('pm10', CB.val(pm, 'pm10', t)) : '') + (CB.CAM_PHOTOS[s.id] ? ' · ' + CB.camCredit(s) : '');
  };
  CB.overlay.open({ title: s.name, size: 'xl', chips: CB.p2(), sub: 'Use ← → to step through images',
    body: '<div class="mv"><button class="mv-nav l" data-mv="-1">' + CB.icon('back') + '</button><div class="mv-img"></div><button class="mv-nav r" data-mv="1">' + CB.icon('chev') + '</button></div><div class="row-between mt-s"><b class="mv-t"></b><span class="tiny muted mv-m"></span></div>',
    footer: '<button class="btn" data-action="ov-close">Close</button><button class="btn btn-primary" data-action="toast" data-msg="Image downloaded (prototype)">' + CB.icon('download') + 'Download image</button>',
    onMount: function (wrap) {
      show(wrap);
      var step = function (dir) { var nt = t + dir * 15 * CB.MIN; if (nt > Date.now()) return; t = nt; show(wrap); };
      wrap.querySelectorAll('[data-mv]').forEach(function (b) { b.addEventListener('click', function () { step(+b.getAttribute('data-mv')); }); });
      var key = function (e) { if (e.key === 'ArrowLeft') step(-1); if (e.key === 'ArrowRight') step(1); };
      document.addEventListener('keydown', key);
      CB.onUnmount(function () { document.removeEventListener('keydown', key); });
    } });
};

/* ---------------- Noise / Audio Browser ---------------- */
CB.au = { site: null, trig: '', days: 3 };
CB.S.audio = function () {
  var sites = CB.audioSites(), q = CB.query(), au = CB.au;
  if (!sites.length) return CB.pageHead({ title: 'Noise Audio' }) + CB.empty('volume', 'No audio sites', 'None of your noise monitors record audio.');
  if (q.site && q.site !== au._qs) { au.site = q.site; au._qs = q.site; }
  if (!au.site || sites.indexOf(CB.site(au.site)) < 0) au.site = sites[0].id;
  var s = CB.site(au.site);
  var recs = CB.audioFor(s, au.days).filter(function (r) { return !au.trig || r.trig === au.trig; });
  var jumpT = q.t ? +q.t : null;
  CB.onMount(function () {
    var el = document.getElementById('au-chart'); if (!el) return;
    new CB.Trend(el, { t0: Date.now() - au.days * 24 * CB.HOUR, t1: Date.now(), height: 220, shading: true, thresholds: true, minStep: 15,
      markers: recs.filter(function (r) { return r.trig !== 'Scheduled'; }).map(function (r) { return { t: r.t, color: r.trig === 'Alarm trigger' ? '#ef4444' : '#7c3aed' }; }),
      series: ['laeq', 'lamax'].map(function (k, i) { var p = CB.PARAMS[k]; return { name: p.name, unit: p.unit, dp: 1, color: CB.PALETTE[i], th: k === 'laeq' ? CB.thresholds(s, k) : null, get: function (a, b, st) { return CB.series(s, k, a, b, st); } }; }) });
    if (jumpT) { var row = document.querySelector('[data-rec-t="' + CB.audioNearest(recs, jumpT) + '"]'); if (row) { row.classList.add('li-on'); row.scrollIntoView({ block: 'center' }); } }
  });
  return CB.pageHead({ title: 'Noise Audio', sub: 'Listen to what the noise monitors heard. Recordings are stored with every alarm trigger, LAmax event and on a 1-minute-per-hour schedule.',
    actions: '<button class="btn" data-go="/charts?site=' + s.id + '&p=laeq,la90,lamax">' + CB.icon('trend') + 'Noise charts</button>' }) +
    '<div class="grid g-side"><div class="stack">' + CB.card({ title: 'Receivers', icon: 'volume', flush: true, body: '<div class="list">' + sites.map(function (x) { return '<div class="li click' + (x.id === s.id ? ' li-on' : '') + '" data-action="au-site" data-v="' + x.id + '"><span class="dot-lg" style="background:' + CB.STATE[CB.siteState(x)].color + '"></span><div class="li-main"><div class="li-t">' + CB.esc(x.name) + '</div><div class="li-s">' + (CB.state.role === 'admin' ? CB.client(x.client).short + ' · ' : '') + 'LAeq <span data-live="' + x.id + '|laeq">' + CB.fmtVal('laeq', CB.latest(x, 'laeq')) + '</span> dB(A)</div></div></div>'; }).join('') + '</div>' }) +
    CB.card({ title: 'Retention', icon: 'db', titleExtra: CB.p2(), body: '<p class="small muted" style="margin:0">Audio is kept for 90 days, then deleted automatically. Recordings linked to alarms can be pinned for longer.</p>' }) + '</div>' +
    '<div class="stack">' + CB.card({ title: s.name + ' · LAeq and LAmax', icon: 'trend', sub: 'Red markers: alarm-triggered recordings · purple: LAmax events', body: '<div id="au-chart"></div>' }) +
    CB.card({ title: 'Recordings', icon: 'list', sub: recs.length + ' recordings · last ' + au.days + ' days', flush: true,
      actions: CB.select([['', 'All triggers'], ['Alarm trigger', 'Alarm triggers'], ['LAmax event', 'LAmax events'], ['Scheduled', 'Scheduled']], au.trig, 'data-input="au-trig"') + CB.select([[1, '24 h'], [3, '3 days'], [7, '7 days']], au.days, 'data-input="au-days"') +
        '<input class="input input-sm" type="datetime-local" style="width:auto" title="Jump to the recording nearest a time" data-input="au-jump">',
      body: '<div class="list rec-list">' + recs.slice(0, 80).map(function (r) {
        return '<div class="li rec" data-rec-t="' + r.t + '"><button class="play-btn" data-action="au-play" data-site="' + s.id + '" data-t="' + r.t + '" aria-label="Play">' + CB.icon('play') + '</button><div class="li-main"><div class="li-t">' + CB.dateTime(new Date(r.t)) + ' <span class="chip ' + (r.trig === 'Alarm trigger' ? 'chip-bad' : r.trig === 'LAmax event' ? 'chip-purple' : '') + '">' + r.trig + '</span></div><div class="li-s">Likely source: ' + r.src + ' · ' + r.dur + ' s · ' + r.size + ' MB</div></div>' +
          '<div class="rec-wave">' + CB.wave(r.t, 60, 22) + '</div><div class="li-r"><b class="mono">' + CB.fixed(r.laeq, 1) + '</b> LAeq<br><span class="mono">' + CB.fixed(r.lamax, 1) + '</span> LAmax</div></div>';
      }).join('') + '</div>' }) + '</div></div>';
};
CB.audioNearest = function (recs, t) { var best = recs[0]; recs.forEach(function (r) { if (Math.abs(r.t - t) < Math.abs(best.t - t)) best = r; }); return best ? best.t : null; };
CB.actions['au-site'] = function (el) { CB.au.site = el.getAttribute('data-v'); CB.render(true); };
CB.inputs['au-trig'] = function (el) { CB.au.trig = el.value; CB.render(true); };
CB.inputs['au-days'] = function (el) { CB.au.days = +el.value; CB.render(true); };
CB.inputs['au-jump'] = function (el) {
  var t = new Date(el.value).getTime(); if (isNaN(t)) return;
  var recs = CB.audioFor(CB.site(CB.au.site), 7), n = CB.audioNearest(recs, t);
  if (n) { CB.au.days = Math.max(CB.au.days, Math.ceil((Date.now() - n) / 86400000)); CB.go('/audio?site=' + CB.au.site + '&t=' + n); }
};
CB.wave = function (seed, n, h) {
  var r = CB.rng('w' + seed), s = '<svg viewBox="0 0 ' + (n * 3) + ' ' + h + '" width="' + (n * 3) + '" height="' + h + '" preserveAspectRatio="none">';
  for (var i = 0; i < n; i++) { var a = (0.15 + r() * 0.5 + (Math.sin(i / 6 + r()) + 1) * 0.2) * h; s += '<rect x="' + i * 3 + '" y="' + (h - a) / 2 + '" width="2" height="' + a + '" rx="1" fill="currentColor"/>'; }
  return s + '</svg>';
};

/* Audio player overlay with synthesised playback */
CB.actions['au-play'] = function (el) {
  var s = CB.site(el.getAttribute('data-site')), t = +el.getAttribute('data-t');
  var rec = CB.audioFor(s, 7).find(function (r) { return r.t === t; }) || { t: t, laeq: CB.val(s, 'laeq', t), lamax: CB.val(s, 'lamax', t), dur: 60, trig: 'Scheduled', src: 'Ambient', size: 1 };
  var dur = rec.dur;
  CB.overlay.open({ title: 'Recording · ' + s.name, size: 'sm', sub: CB.dateTime(new Date(t)) + ' · ' + rec.trig,
    body: '<div class="player"><div class="pl-wave" id="pl-wave">' + CB.wave(t, 110, 70) + '<div class="pl-prog" id="pl-prog"></div></div>' +
      '<div class="row-between mt-s"><button class="play-btn lg" id="pl-btn">' + CB.icon('play') + '</button><div class="mono" id="pl-time">0:00 / ' + Math.floor(dur / 60) + ':' + String(dur % 60).padStart(2, '0') + '</div><span class="chip">' + rec.src + '</span></div>' +
      '<dl class="kv mt"><dt>LAeq</dt><dd>' + CB.fixed(rec.laeq, 1) + ' dB(A)</dd><dt>LAmax</dt><dd>' + CB.fixed(rec.lamax, 1) + ' dB(A)</dd><dt>File</dt><dd class="mono">' + s.id + '_' + CB.isoDate(new Date(t)).replace(/-/g, '') + '_' + CB.stamp24(new Date(t)).replace(':', '') + '.wav · ' + rec.size + ' MB</dd><dt>Retention</dt><dd>Deleted ' + CB.dateLabel(new Date(t + 90 * 86400000)) + ' (90 days)</dd></dl>' +
      '<p class="tiny muted">Prototype: audio is synthesised in your browser to represent the recording.</p></div>',
    footer: '<button class="btn" data-go="/charts?site=' + s.id + '&p=laeq,lamax">' + CB.icon('trend') + 'See on chart</button><button class="btn btn-primary" data-action="toast" data-msg="Recording downloaded (prototype)">' + CB.icon('download') + 'Download WAV</button>',
    onMount: function (wrap) {
      var btn = wrap.querySelector('#pl-btn'), prog = wrap.querySelector('#pl-prog'), tm = wrap.querySelector('#pl-time');
      var ctx = null, src = null, start = 0, raf = null, playing = false, offset = 0;
      var playLen = Math.min(dur, 20); // playback capped for the prototype
      var stop = function () { playing = false; try { if (src) src.stop(); } catch (e) { /* stopped */ } cancelAnimationFrame(raf); btn.innerHTML = CB.icon('play'); };
      var tick = function () {
        var el2 = offset + (ctx.currentTime - start), p = Math.min(1, el2 / playLen);
        prog.style.width = (p * 100) + '%';
        var shown = Math.round(p * dur);
        tm.textContent = Math.floor(shown / 60) + ':' + String(shown % 60).padStart(2, '0') + ' / ' + Math.floor(dur / 60) + ':' + String(dur % 60).padStart(2, '0');
        if (p >= 1) { stop(); offset = 0; return; }
        raf = requestAnimationFrame(tick);
      };
      btn.addEventListener('click', function () {
        if (playing) { offset += ctx.currentTime - start; stop(); return; }
        try {
          ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
          var buf = CB.synth(ctx, rec, playLen);
          src = ctx.createBufferSource(); src.buffer = buf; src.connect(ctx.destination);
          start = ctx.currentTime; src.start(0, offset); playing = true; btn.innerHTML = CB.icon('pause'); tick();
        } catch (e) { CB.toast('Audio playback is not available in this browser'); }
      });
      CB.onUnmount(function () { stop(); if (ctx && ctx.close) ctx.close(); });
    } });
};
CB.synth = function (ctx, rec, secs) {
  var sr = ctx.sampleRate, n = Math.floor(sr * secs), buf = ctx.createBuffer(1, n, sr), d = buf.getChannelData(0);
  var r = CB.rng('syn' + rec.t), last = 0, gain = CB.clamp((rec.laeq - 25) / 45, 0.05, 0.6);
  var src = rec.src.toLowerCase();
  for (var i = 0; i < n; i++) {
    var t = i / sr, white = r() * 2 - 1;
    last = (last + 0.02 * white) / 1.02; // brown noise ambience
    var v = last * 3.2 * gain;
    if (/reversing|beeper|alarm/.test(src)) v += (Math.floor(t * 2.2) % 2 === 0 ? 0.18 : 0) * Math.sin(2 * Math.PI * 1150 * t) * gain * 1.4;
    if (/truck|dozer|excavator|piling|concrete|generator|rock|train|traffic|tram/.test(src)) v += Math.sin(2 * Math.PI * (48 + 6 * Math.sin(t * 0.7)) * t) * 0.35 * gain * (0.6 + 0.4 * Math.sin(t * 0.5)) + (/rock|piling/.test(src) && (t * 3) % 1 < 0.06 ? white * 0.6 * gain : 0);
    if (/bird/.test(src)) { var ph = (t * 1.7) % 1; if (ph < 0.22) v += Math.sin(2 * Math.PI * (3200 + 1800 * ph * 4) * t) * 0.08 * (1 - ph * 4); }
    if (/dog/.test(src) && (t % 2.4) < 0.18) v += Math.sin(2 * Math.PI * 520 * t) * white * 0.3;
    if (/wind/.test(src)) v += last * 2.5 * (0.5 + 0.5 * Math.sin(t * 0.9));
    var env = Math.min(1, t / 0.4, (secs - t) / 0.6);
    d[i] = CB.clamp(v * env, -1, 1);
  }
  return buf;
};
