/* =========================================================
   CBE Admin: Alarm & Notification Setup (+ rule editor),
   Client & User Administration, Site & Parameter Setup,
   Data Sources & Integration
   ========================================================= */
CB.S = CB.S || {};
CB.adminCrumbs = function (name) { CB.crumbs = [{ label: 'CBE' }, { label: 'Configuration' }, { label: name }]; };

/* ---------------- Alarm & Notification Setup ---------------- */
CB.as = { monitor: '', client: '' };
CB.ruleSites = function (r) { return r.sites === 'all' ? CB.SITES : r.sites.map(CB.site); };
CB.ruleSummary = function (r) {
  var p = r.param ? CB.PARAMS[r.param] : null;
  if (r.logic === 'comms') return 'No data received for ' + r.tiers.map(function (t) { return t.v; }).join(' / ');
  if (r.logic === 'complex') return r.conditions.map(function (c) { return (c.join === 'IF' ? '' : c.join + ' ') + c.p + ' ' + c.op + ' ' + c.v; }).join(' ');
  if (r.logic === 'rolling') return p.name + ' above limit for ' + r.rolling.x + ' of the last ' + r.rolling.y + ' periods';
  return p.name + ' ' + r.tiers.map(function (t) { return t.op + ' ' + t.v; }).join(' / ') + ' ' + (p.unit || '');
};
CB.S.alarmSetup = function () {
  CB.adminCrumbs('Alarm & Notification Setup');
  var as = CB.as;
  var rules = CB.RULES.filter(function (r) { return (!as.monitor || r.monitor === as.monitor) && (!as.client || r.client === as.client || (as.client && r.client == null)); });
  var en = CB.RULES.filter(function (r) { return r.enabled; }).length;
  var crit = CB.ALARMS.filter(function (x) { return x.sev === 'critical' && x.state !== 'cleared'; });
  var kpis = '<div class="grid g-4">' +
    '<div class="card">' + CB.kpi('Alarm rules', CB.RULES.length, { icon: 'bolt', sub: en + ' enabled' }) + '</div>' +
    '<div class="card">' + CB.kpi('Triggered · 30 days', CB.sum(CB.RULES.map(function (r) { return r.fired30; })), { icon: 'bell' }) + '</div>' +
    '<div class="card">' + CB.kpi('SMS delivered · 30 days', '11,842', { icon: 'sms' }) + '</div>' +
    '<div class="card' + (crit.length ? ' kc-alarm' : '') + '">' + CB.kpi('Critical alarms', crit.length, { icon: 'alert', sub: crit.filter(function (x) { return x.state === 'active'; }).length + ' unacknowledged · ' + CB.ALARMS.filter(function (x) { return x.sev === 'critical'; }).length + ' in last 21 days' }) + '</div></div>';
  var sevChips = function (r) { return r.tiers.map(function (t) { return '<span class="st ' + CB.SEV[t.sev].cls + '">' + (t.v == null ? CB.SEV[t.sev].label : t.op + ' ' + t.v) + '</span>'; }).join(' '); };
  var maxF = Math.max.apply(null, CB.RULES.map(function (r) { return r.fired30; }).concat([1]));
  var table = CB.card({ flush: true, body: '<div class="filters">' + CB.seg('as-mon', [['', 'All']].concat(Object.keys(CB.MONITORS).map(function (k) { return [k, CB.MONITORS[k]]; })), as.monitor) +
    CB.select([['', 'All clients']].concat(CB.CLIENTS.map(function (c) { return [c.id, c.name]; })), as.client, 'data-input="as-client"') + '<span class="tiny muted">' + rules.length + ' rules</span></div>' +
    '<div class="tbl-wrap"><table class="tbl rule-tbl"><thead><tr><th>Rule</th><th>Targets</th><th>Severity tiers</th><th>When</th><th>Notify</th><th>30 days</th><th>Enabled</th><th></th></tr></thead><tbody>' + rules.map(function (r) {
      var ss = CB.ruleSites(r);
      return '<tr class="click" data-action="rule-edit" data-id="' + r.id + '"><td><div class="name">' + CB.esc(r.name) + '</div><div class="sub">' + r.id + ' · ' + { threshold: 'Threshold', complex: 'Multi-parameter', rolling: 'Rolling exceedance', comms: 'Comms / stale data' }[r.logic] + (r.dynamic ? ' · <span style="color:var(--accent)">dynamic</span>' : '') + '</div><div class="sub rule-sum">' + CB.esc(CB.ruleSummary(r)) + '</div></td>' +
        '<td>' + (r.client ? CB.clientChip(r.client) : '<span class="chip">All clients</span>') + '<div class="sub">' + CB.MONITORS[r.monitor] + ' · ' + (r.sites === 'all' ? 'All ' + CB.SITES.length + ' sites' : ss.length + ' site' + (ss.length > 1 ? 's' : '')) + '</div></td>' +
        '<td>' + sevChips(r) + '</td><td class="nowrap"><div>' + r.days + '</div><div class="sub">' + r.window + (r.delay ? ' · ' + r.delay + ' min delay' : '') + '</div></td>' +
        '<td class="nowrap"><span data-tip="' + CB.esc(r.email.join('<br>')) + '">' + CB.icon('mail', 'ico-i') + r.email.length + '</span> <span data-tip="' + CB.esc(r.sms.join('<br>') || 'No SMS') + '">' + CB.icon('sms', 'ico-i') + r.sms.length + '</span>' + (r.groups.length ? '<div class="sub">' + r.groups[0] + '</div>' : '') + '</td>' +
        '<td style="width:90px"><div class="mini-bar"><span style="width:' + (r.fired30 / maxF * 100) + '%"></span></div><div class="sub">' + r.fired30 + '×</div></td>' +
        '<td onclick="event.stopPropagation()">' + CB.switchHtml('', r.enabled, 'data-input="rule-enable" data-id="' + r.id + '"') + '</td><td class="right"><button class="btn btn-sm btn-ghost" aria-label="Edit">' + CB.icon('pen') + '</button></td></tr>';
    }).join('') + '</tbody></table></div>' });

  var deliv = [];
  CB.ALARMS.slice(0, 7).forEach(function (a) { a.notes.slice(0, 2).forEach(function (n) { deliv.push({ a: a, n: n }); }); });
  var delivery = CB.card({ title: 'Notification delivery', icon: 'sms', sub: 'Every message tracked queued → sent → delivered / failed', flush: true, body: '<div class="list">' + deliv.slice(0, 9).map(function (d) {
    var failed = /failed/.test(d.n.status);
    return '<div class="li"><div class="li-ico ' + (d.n.chan === 'SMS' ? 'tint-teal' : 'tint-blue') + '">' + CB.icon(d.n.chan === 'SMS' ? 'sms' : 'mail') + '</div><div class="li-main"><div class="li-t mono" style="font-size:12.5px">' + d.n.to + '</div><div class="li-s">' + d.a.id + ' · ' + CB.esc(d.a.name) + '</div></div><div class="li-r"><div class="pipe"><i class="ok"></i><i class="ok"></i>' + (failed ? '<i class="bad"></i>' : '') + '<i class="ok"></i></div>' + (failed ? 'retried · ' : '') + 'delivered ' + d.n.secs + ' s</div></div>';
  }).join('') + '</div>' });
  var gateway = CB.card({ title: 'SMS gateway', icon: 'shield', body: '<dl class="kv"><dt>Gateway</dt><dd>Dedicated AU sender ID “CBE-ALERT” · primary + failover route</dd><dt>Never blocked</dt><dd>Alarm SMS bypass marketing filters; failures retried on the second route and raised as a system event</dd><dt>Consent & opt-out</dt><dd>Handled by the gateway (STOP keyword), logged per number</dd><dt>Number checks</dt><dd>New numbers verified with a one-time code before alarms are sent</dd><dt>Last 24 h</dt><dd>412 sent · 412 delivered · 2 retried · 0 failed</dd></dl>' });
  var groups = CB.card({ title: 'Recipient groups', icon: 'users', flush: true, sub: 'Mix platform users, non-users and roles', body: '<div class="list">' + [['HVO Environment On-call', 2, 2, 'Rotates weekly'], ['NEL Site Supervisors', 3, 4, 'Day shift'], ['NEL Night Works Supervisor', 1, 1, '22:00–07:00 only'], ['Blast Crew Leads', 0, 3, 'SMS only'], ['CBE Field Technicians', 4, 0, 'Comms & battery'], ['MTW Shift Supervisors', 2, 2, '']].map(function (g) {
    return '<div class="li click" data-action="toast" data-msg="Group editor (prototype)"><div class="li-ico tint-purple">' + CB.icon('users') + '</div><div class="li-main"><div class="li-t">' + g[0] + '</div><div class="li-s">' + g[1] + ' users · ' + g[2] + ' external contacts' + (g[3] ? ' · ' + g[3] : '') + '</div></div></div>';
  }).join('') + '</div>' });

  return CB.pageHead({ title: 'Alarm & Notification Setup', sub: 'Define alarm rules, thresholds and who gets told. Proven in production: multi-tier thresholds, complex conditions, rolling exceedances, dynamic limits and guaranteed SMS delivery.',
    actions: '<button class="btn" data-go="/alarms">' + CB.icon('bell') + 'Alarm console</button><button class="btn btn-primary" data-action="rule-edit">' + CB.icon('plus') + 'New alarm rule</button>' }) +
    kpis + '<div class="mt">' + table + '</div>' +
    '<div class="grid g-3 mt">' + delivery + '<div class="stack">' + gateway + '</div>' + groups + '</div>' +
    '<div class="sec-title">Coming in Phase 2</div><div class="grid g-2">' +
    CB.placeholder('Sequential escalation & re-send', 'If an alarm is not acknowledged, re-send it and escalate through an on-call roster (e.g. supervisor → environment manager → CBE) at set intervals.', { icon: 'users', mock: '<div class="ph2-steps"><span>1 · Supervisor</span>' + CB.icon('chev') + '<span>+15 min · Env. manager</span>' + CB.icon('chev') + '<span>+30 min · CBE on-call</span></div>' }) +
    CB.placeholder('Push to Microsoft Teams', 'Post alarms into collaboration channels such as Microsoft Teams, with acknowledge from the message.', { icon: 'sms', mock: '<div class="ph2-teams"><b>#hvo-environment</b><span>⚠ Dust Warning (1 Hour) PM10 · Jerrys Plains 52.3 µg/m³</span></div>' }) + '</div>';
};
CB.actions['as-mon'] = function (el) { CB.as.monitor = el.getAttribute('data-v'); CB.render(true); };
CB.inputs['as-client'] = function (el) { CB.as.client = el.value; CB.render(true); };
CB.inputs['rule-enable'] = function (el) { var r = CB.rule(el.getAttribute('data-id')); r.enabled = el.checked; CB.toast(r.name + (r.enabled ? ' enabled' : ' disabled')); };

/* ---------------- Rule editor overlay ---------------- */
CB.re = null;
CB.actions['rule-edit'] = function (el) {
  var src = el.getAttribute('data-id') ? CB.rule(el.getAttribute('data-id')) : null;
  var r = src ? JSON.parse(JSON.stringify(src)) : { id: 'R-' + (113 + CB.RULES.length - 12), name: '', monitor: 'dust', client: 'hvo', sites: ['hvo-jp'], param: 'pm10_1h', logic: 'threshold', tiers: [{ sev: 'warning', op: '>', v: 45 }, { sev: 'critical', op: '>', v: 50 }], days: 'Every day', window: '00:00 – 24:00', delay: 10, deadband: 2, email: [], sms: [], groups: [], message: '{site}: {param} {value} {unit} above {threshold}.', interval: 60, suppressNaN: true, enabled: true, fired30: 0 };
  if (r.sites === 'all') r.sites = CB.SITES.map(function (s) { return s.id; });
  if (!r.conditions) r.conditions = [{ join: 'IF', p: 'PM10 (5 min avg)', op: '>', v: '150 µg/m³' }, { join: 'AND', p: 'Wind direction', op: 'between', v: '135° – 225°' }];
  if (!r.rolling) r.rolling = { x: 3, y: 4 };
  r.dayset = r.dayset || (r.days === 'Mon – Sat' ? [1, 1, 1, 1, 1, 1, 0] : r.days === 'Mon – Fri' ? [1, 1, 1, 1, 1, 0, 0] : [1, 1, 1, 1, 1, 1, 1]);
  r.dynOn = !!r.dynamic;
  r.dynMode = r.dynamic && /phase/i.test(r.dynamic[0].when) ? 'phase' : 'tod';
  CB.re = { r: r, isNew: !src };
  var w = CB.overlay.open({ title: src ? 'Edit alarm rule' : 'New alarm rule', size: 'xl', sub: src ? r.id + ' · ' + CB.esc(r.name) : 'Create a rule and the notifications it sends',
    chips: src ? '<span class="chip">' + CB.MONITORS[r.monitor] + '</span>' : '',
    body: '<div id="re-body"></div>',
    footer: '<span class="tiny muted" style="margin-right:auto">Changes apply from the next evaluation · every edit is written to the event log</span><button class="btn" data-action="ov-close">Cancel</button><button class="btn" data-action="re-test">' + CB.icon('sms') + 'Send test notification</button><button class="btn btn-primary" data-action="re-save">Save rule</button>' });
  CB._reWrap = w;
  CB.reRender();
};
CB.reParamsFor = function (r) {
  var keys = {};
  r.sites.forEach(function (id) { var s = CB.site(id); if (s) s.params.forEach(function (k) { keys[k] = 1; }); });
  var pref = { dust: 'Air Quality / Dust', noise: 'Noise', vibration: 'Noise', water: 'Water / Hydrology', met: 'Meteorological' }[r.monitor];
  return Object.keys(keys).sort(function (a, b) { return (CB.PARAMS[a].domain === pref ? 0 : 1) - (CB.PARAMS[b].domain === pref ? 0 : 1); });
};
/* Back-test the rule against the last 7 days of the first target site. */
CB.reBacktest = function (r) {
  var s = CB.site(r.sites[0]);
  if (!s || r.logic === 'complex' || r.logic === 'comms' || !r.param || s.params.indexOf(r.param) < 0) return null;
  var t1 = Date.now(), t0 = t1 - 7 * 86400000, step = 30;
  var arr = CB.series(s, r.param, t0, t1, step), hits = { info: 0, warning: 0, critical: 0 }, on = {};
  var p = CB.PARAMS[r.param];
  var winOk = function (t) { var d = new Date(t), dow = (d.getDay() + 6) % 7; return r.dayset[dow]; };
  r.tiers.forEach(function (tr) {
    var run = 0, need = Math.max(1, Math.round((+r.delay || 0) / step));
    arr.forEach(function (pt) {
      var v = pt[1]; if (v == null || !winOk(pt[0])) { run = 0; on[tr.sev] = false; return; }
      var th = +tr.v, hit = p.low || tr.op === '<' ? v < th : v > th, clear = p.low || tr.op === '<' ? v > th + (+r.deadband || 0) : v < th - (+r.deadband || 0);
      if (hit) { run++; if (run >= need && !on[tr.sev]) { hits[tr.sev]++; on[tr.sev] = true; } }
      else { run = 0; if (clear) on[tr.sev] = false; }
    });
  });
  return { s: s, arr: arr, hits: hits };
};
CB.reRender = function () {
  var re = CB.re, r = re.r, body = CB._reWrap.querySelector('#re-body');
  var clientSites = CB.SITES.filter(function (s) { return !r.client || s.client === r.client; });
  var mk = { dust: 'dust', noise: 'noise', vibration: 'blast', water: 'water', met: 'met' }[r.monitor];
  var preferred = clientSites.filter(function (s) { return s.kinds.indexOf(mk) >= 0; });
  var others = clientSites.filter(function (s) { return preferred.indexOf(s) < 0; });
  var siteChips = function (arr) { return arr.map(function (s) { var on = r.sites.indexOf(s.id) >= 0; return '<label class="pchk' + (on ? ' on' : '') + '"><input type="checkbox" data-input="re-site" data-v="' + s.id + '"' + (on ? ' checked' : '') + '><span>' + CB.esc(s.name) + '</span><small>' + CB.siteType(s) + '</small></label>'; }).join(''); };
  var params = CB.reParamsFor(r);
  if (r.param && params.indexOf(r.param) < 0 && params.length) r.param = params[0];
  var pOpts = params.map(function (k) { return [k, CB.PARAMS[k].name + ' (' + CB.PARAMS[k].unit + ')' + (CB.PARAMS[k].calc ? ' · calculated' : '')]; });
  var p = r.param ? CB.PARAMS[r.param] : null;

  var cond;
  if (r.logic === 'threshold' || r.logic === 'rolling') {
    cond = '<div class="form g-2"><label class="field"><span>Parameter</span>' + CB.select(pOpts, r.param, 'class="select" data-input="re-f" data-k="param"') + '</label>' +
      (r.logic === 'rolling' ? '<div class="field"><span>Rolling / exceedance</span><div class="row nowrap">True for <input class="input input-xs" value="' + r.rolling.x + '" data-input="re-roll" data-k="x"> of the last <input class="input input-xs" value="' + r.rolling.y + '" data-input="re-roll" data-k="y"> periods of ' + CB.select(['5 min', '15 min', '1 hour', '24 hours'], '15 min', 'data-input="noop"') + '</div></div>' : '<div class="field"><span>Evaluated on</span>' + CB.select(['Each new value', '5-min average', '15-min average', '1-hour rolling average', '24-hour rolling average'], 'Each new value', 'class="select" data-input="noop"') + '</div>') + '</div>' +
      '<div class="field mt"><span>Thresholds & severity tiers</span><div class="tiers">' + r.tiers.map(function (t, i) {
        return '<div class="tier tier-' + t.sev + '">' + CB.select([['info', 'Info'], ['warning', 'Warning'], ['critical', 'Critical']], t.sev, 'data-input="re-tier" data-i="' + i + '" data-k="sev"') + CB.select(['>', '≥', '<', '≤'], t.op, 'data-input="re-tier" data-i="' + i + '" data-k="op"') +
          '<input class="input input-sm mono" value="' + CB.esc(t.v) + '" data-input="re-tier" data-i="' + i + '" data-k="v"><span class="muted small">' + (p ? p.unit : '') + '</span>' + (r.tiers.length > 1 ? '<button class="ov-close" data-action="re-tier-del" data-i="' + i + '" style="width:28px;height:28px">' + CB.icon('close') + '</button>' : '') + '</div>';
      }).join('') + '<button class="btn btn-sm btn-ghost" data-action="re-tier-add">' + CB.icon('plus') + 'Add tier</button></div></div>';
  } else if (r.logic === 'complex') {
    cond = '<div class="field"><span>Conditions (any number of parameters)</span><div class="conds">' + r.conditions.map(function (c, i) {
      return '<div class="cond">' + (i === 0 ? '<span class="cj">IF</span>' : CB.select(['AND', 'OR'], c.join, 'data-input="re-cond" data-i="' + i + '" data-k="join"')) +
        CB.select(['PM10 (5 min avg)', 'PM10 (60 min avg)', 'PM2.5 (60 min avg)', 'TSP (60 min avg)', 'Wind speed (10 min avg)', 'Wind direction', 'Relative humidity', 'Rainfall (24 h)', 'LAeq (15 min)', 'Vibration PPV', 'Water level'], c.p, 'data-input="re-cond" data-i="' + i + '" data-k="p"') +
        CB.select(['>', '<', 'between', 'not between', '='], c.op, 'data-input="re-cond" data-i="' + i + '" data-k="op"') + '<input class="input input-sm" value="' + CB.esc(c.v) + '" data-input="re-cond" data-i="' + i + '" data-k="v">' +
        (i ? '<button class="ov-close" data-action="re-cond-del" data-i="' + i + '" style="width:28px;height:28px">' + CB.icon('close') + '</button>' : '<span style="width:28px"></span>') + '</div>';
    }).join('') + '<button class="btn btn-sm btn-ghost" data-action="re-cond-add">' + CB.icon('plus') + 'Add condition</button></div><small>Conditions can reference different parameters and different sites, e.g. downwind dust only when the wind blows toward receivers.</small></div>' +
      '<div class="field mt"><span>Severity when matched</span>' + CB.seg('re-csev', [['info', 'Info'], ['warning', 'Warning'], ['critical', 'Critical']], r.tiers[0].sev) + '</div>';
  } else {
    cond = '<div class="field"><span>Stale-data thresholds</span><div class="tiers">' + r.tiers.map(function (t, i) { return '<div class="tier tier-' + t.sev + '"><span class="st ' + CB.SEV[t.sev].cls + '">' + CB.SEV[t.sev].label + '</span><span class="small">when no data for</span><input class="input input-sm mono" value="' + CB.esc(t.v) + '" data-input="re-tier" data-i="' + i + '" data-k="v"></div>'; }).join('') + '</div><small>Compared with each site\'s expected cadence. Raised by the platform even when the logger is silent.</small></div>';
  }

  var dyn = '<div class="field mt"><div class="row-between"><span>Dynamic thresholds</span>' + CB.switchHtml('', r.dynOn, 'data-input="re-dyn"') + '</div>' + (r.dynOn ? '<div class="dyn">' + CB.seg('re-dynmode', [['tod', 'Time of day'], ['season', 'Season'], ['phase', 'Construction phase']], r.dynMode) +
    '<table class="tbl mt-s"><thead><tr><th>When</th><th>Warning / critical</th></tr></thead><tbody>' + ({ tod: [['Day 07:00 – 18:00', '55 / 60'], ['Evening 18:00 – 22:00', '50 / 55'], ['Night 22:00 – 07:00', '45 / 50']], season: [['Summer (Dec – Feb)', '45 / 50'], ['Autumn / spring', '45 / 50'], ['Winter (Jun – Aug) inversions', '40 / 45']], phase: [['Tunnel boring (current)', '52 / 57'], ['Surface works', '55 / 60'], ['Demobilisation', '50 / 55']] }[r.dynMode]).map(function (d) { return '<tr><td>' + d[0] + '</td><td><input class="input input-sm mono" value="' + d[1] + '" style="width:110px"> <span class="muted small">' + (p ? p.unit : '') + '</span></td></tr>'; }).join('') + '</tbody></table></div>' : '<small>Change limits by construction phase, season or time of day.</small>') + '</div>';

  var days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var timing = '<div class="field"><span>Operational days</span><div class="days">' + days.map(function (d, i) { return '<button class="day' + (r.dayset[i] ? ' on' : '') + '" data-action="re-day" data-i="' + i + '">' + d + '</button>'; }).join('') + '</div></div>' +
    '<div class="form g-2 mt"><label class="field"><span>Active window</span><div class="row nowrap"><input class="input" type="time" value="' + (r.window.match(/\d\d:\d\d/) ? r.window.match(/\d\d:\d\d/g)[0] : '00:00') + '"><span class="muted">to</span><input class="input" type="time" value="' + (r.window.match(/\d\d:\d\d/g) && r.window.match(/\d\d:\d\d/g)[1] !== '24:00' ? r.window.match(/\d\d:\d\d/g)[1] : '23:59') + '"></div></label>' +
    '<label class="field"><span>Delay / persistence</span><div class="row nowrap"><input class="input mono" value="' + r.delay + '" data-input="re-f" data-k="delay" style="width:90px"><span class="muted small">minutes the condition must hold</span></div></label>' +
    '<label class="field"><span>Deadband</span><div class="row nowrap"><input class="input mono" value="' + r.deadband + '" data-input="re-f" data-k="deadband" style="width:90px"><span class="muted small">' + (p ? p.unit : '') + ' below the threshold to clear</span></div></label>' +
    '<label class="field"><span>Repeat notifications</span><div class="row nowrap">at most every <input class="input mono" value="' + r.interval + '" data-input="re-f" data-k="interval" style="width:80px"> min</div></label></div>';

  var pill = function (txt, kind, i) { return '<span class="pill rec-pill">' + CB.icon(kind === 'sms' ? 'sms' : kind === 'group' ? 'users' : 'mail') + CB.esc(txt) + '<button data-action="re-rm" data-k="' + kind + '" data-i="' + i + '">' + CB.icon('close') + '</button></span>'; };
  var sample = CB.site(r.sites[0]);
  var msg = (r.message || '').replace('{site}', sample ? sample.name : 'Site').replace('{param}', p ? p.name : '').replace('{value}', p && sample ? CB.fmtVal(r.param, CB.latest(sample, r.param)) : '52.3').replace('{unit}', p ? p.unit : '').replace('{threshold}', r.tiers[r.tiers.length - 1].v).replace('{wd}', 'WNW').replace('{duration}', '47 min').replace('{last}', '13:42');
  var notify = '<div class="field"><span>Email recipients</span><div class="pills">' + r.email.map(function (e, i) { return pill(e, 'email', i); }).join('') + r.groups.map(function (g, i) { return pill(g, 'group', i); }).join('') + '<input class="input input-sm add-in" placeholder="+ email, user, group or role" data-input="re-add" data-k="email"></div></div>' +
    '<div class="field mt"><span>SMS recipients</span><div class="pills">' + r.sms.map(function (e, i) { return pill(e, 'sms', i); }).join('') + '<input class="input input-sm add-in" placeholder="+ mobile number or user" data-input="re-add" data-k="sms"></div><small>Non-users can receive SMS and email. New numbers are verified before first use.</small></div>' +
    '<label class="field mt"><span>Custom message</span><textarea class="input mono" rows="3" data-input="re-f" data-k="message">' + CB.esc(r.message) + '</textarea><small>Tags: {site} {param} {value} {unit} {threshold} {wd} {duration} {last}</small></label>' +
    '<div class="sms-prev"><div class="sms-b"><b>CBE-ALERT</b>' + CB.esc(msg) + '</div><span class="tiny muted">' + msg.length + ' / 160 characters · ' + Math.max(1, Math.ceil(msg.length / 153)) + ' SMS part' + (msg.length > 160 ? 's' : '') + '</span></div>' +
    '<div class="mt">' + CB.switchHtml('Suppress OFF / NaN notifications (still logged)', r.suppressNaN, 'data-input="re-chk" data-k="suppressNaN"') + '</div>' +
    '<div class="row mt" style="gap:8px">' + CB.p2Btn('Escalation & re-send', 'users') + CB.p2Btn('Post to Microsoft Teams', 'sms') + '</div>';

  // preview column
  var bt = CB.reBacktest(r), prev;
  if (bt) {
    setTimeout(function () {
      var el = document.getElementById('re-chart'); if (!el) return;
      var th = {}; r.tiers.forEach(function (t) { if (t.sev === 'warning') th.warn = +t.v; if (t.sev === 'critical') th.crit = +t.v; if (t.sev === 'info' && th.warn == null) th.warn = +t.v; });
      new CB.Trend(el, { t0: Date.now() - 7 * 86400000, t1: Date.now(), height: 190, shading: false, thresholds: true, minStep: 30, series: [{ name: p.name, short: 'limit', unit: p.unit, dp: p.dp, color: '#4f46e5', th: th, get: function (a, b, st) { return CB.series(bt.s, r.param, a, b, st); } }] });
    }, 30);
    prev = '<div id="re-chart"></div><div class="bt">' + ['critical', 'warning', 'info'].filter(function (k) { return r.tiers.some(function (t) { return t.sev === k; }); }).map(function (k) { return '<div><b>' + bt.hits[k] + '</b><span>' + CB.SEV[k].label + '</span></div>'; }).join('') + '</div><div class="tiny muted">Back-tested on ' + bt.s.name + ', last 7 days, with the delay, deadband and days above.</div>';
  } else prev = '<div class="tiny muted">' + (r.logic === 'comms' ? 'Comms rules are checked against every site\'s expected reporting interval.' : 'Multi-parameter rules are evaluated live on every incoming record.') + '</div>';

  var summary = '<p class="re-sum">' + (r.logic === 'comms' ? 'Raise a <b>warning</b> when ' : 'When ') + '<b>' + CB.esc(CB.ruleSummary(r)) + '</b> at <b>' + r.sites.length + ' site' + (r.sites.length !== 1 ? 's' : '') + '</b>' + (r.delay ? ' for ' + r.delay + ' min' : '') + ', on <b>' + (r.dayset.every(Boolean) ? 'every day' : days.filter(function (d, i) { return r.dayset[i]; }).join(', ')) + '</b>, notify <b>' + (r.email.length + r.groups.length) + ' email</b> and <b>' + r.sms.length + ' SMS</b> recipients' + (r.interval ? ', at most every ' + r.interval + ' min' : '') + '.' + (r.dynOn ? ' Limits change by ' + { tod: 'time of day', season: 'season', phase: 'construction phase' }[r.dynMode] + '.' : '') + '</p>';

  body.innerHTML = '<div class="re"><div class="re-main">' +
    '<div class="re-sec"><div class="re-h"><span>1</span>Rule</div><div class="form g-2"><label class="field"><span>Name</span><input class="input" value="' + CB.esc(r.name) + '" placeholder="e.g. Dust Warning (1 Hour) PM10" data-input="re-f" data-k="name"></label><label class="field"><span>Client</span>' + CB.select([['', 'All clients']].concat(CB.CLIENTS.map(function (c) { return [c.id, c.name]; })), r.client || '', 'class="select" data-input="re-client"') + '</label></div>' +
    '<div class="field mt"><span>Monitor type</span>' + CB.seg('re-mon', Object.keys(CB.MONITORS).map(function (k) { return [k, CB.MONITORS[k]]; }), r.monitor) + '</div>' +
    '<div class="field mt"><span>Target sites (' + r.sites.length + ')</span><div class="plist two">' + siteChips(preferred) + (others.length ? '<div class="plist-g">Other sites</div>' + siteChips(others) : '') + '</div></div></div>' +
    '<div class="re-sec"><div class="re-h"><span>2</span>Condition</div><div class="field"><span>Logic</span>' + CB.seg('re-logic', [['threshold', 'Threshold'], ['complex', 'Multi-parameter (AND / OR / IF)'], ['rolling', 'Rolling exceedance'], ['comms', 'Comms / stale data']], r.logic) + '</div><div class="mt">' + cond + '</div>' + (r.logic !== 'comms' ? dyn : '') + '</div>' +
    '<div class="re-sec"><div class="re-h"><span>3</span>Timing</div>' + timing + '</div>' +
    '<div class="re-sec"><div class="re-h"><span>4</span>Notifications</div>' + notify + '</div>' +
    '</div><div class="re-side"><div class="re-sticky"><div class="re-h"><span>' + CB.icon('eye') + '</span>Preview</div>' + summary + prev +
    CB.ctx('SMS delivery is tracked queued → sent → delivered / failed and is never silently blocked. Consent, opt-out and number verification are handled by the gateway.') + '</div></div></div>';
};
CB.inputs['re-f'] = function (el) {
  var r = CB.re.r, k = el.getAttribute('data-k');
  r[k] = el.value;
  if (k === 'param') CB.reRender();
  else { clearTimeout(CB._reT); CB._reT = setTimeout(function () { var f = document.activeElement, sel = f && f.getAttribute('data-k'); CB.reRender(); if (sel) { var n = CB._reWrap.querySelector('[data-k="' + sel + '"][data-input="re-f"]'); if (n) { n.focus(); try { n.setSelectionRange(n.value.length, n.value.length); } catch (e) { /* select */ } } } }, 500); }
};
CB.inputs['re-client'] = function (el) { var r = CB.re.r; r.client = el.value || null; r.sites = CB.SITES.filter(function (s) { return !r.client || s.client === r.client; }).slice(0, 1).map(function (s) { return s.id; }); CB.reRender(); };
CB.inputs['re-site'] = function (el) { var r = CB.re.r, v = el.getAttribute('data-v'); if (el.checked) r.sites.push(v); else if (r.sites.length > 1) r.sites = r.sites.filter(function (x) { return x !== v; }); else el.checked = true; CB.reRender(); };
CB.inputs['re-tier'] = function (el) { var r = CB.re.r, t = r.tiers[+el.getAttribute('data-i')]; t[el.getAttribute('data-k')] = el.getAttribute('data-k') === 'v' && !isNaN(+el.value) && el.value !== '' ? +el.value : el.value; clearTimeout(CB._reT); CB._reT = setTimeout(CB.reRender, el.tagName === 'SELECT' ? 0 : 600); };
CB.inputs['re-cond'] = function (el) { var r = CB.re.r; r.conditions[+el.getAttribute('data-i')][el.getAttribute('data-k')] = el.value; if (el.tagName === 'SELECT') CB.reRender(); };
CB.inputs['re-roll'] = function (el) { CB.re.r.rolling[el.getAttribute('data-k')] = +el.value || 1; clearTimeout(CB._reT); CB._reT = setTimeout(CB.reRender, 600); };
CB.inputs['re-dyn'] = function (el) { CB.re.r.dynOn = el.checked; CB.reRender(); };
CB.inputs['re-chk'] = function (el) { CB.re.r[el.getAttribute('data-k')] = el.checked; };
CB.inputs['re-add'] = function (el) {
  if (!/[,;]$/.test(el.value)) return;
  var v = el.value.replace(/[,;]$/, '').trim(), k = el.getAttribute('data-k'); if (!v) return;
  CB.re.r[k === 'sms' ? 'sms' : 'email'].push(v); CB.reRender();
};
document.addEventListener('keydown', function (e) {
  var el = e.target.closest && e.target.closest('[data-input="re-add"]');
  if (!el || e.key !== 'Enter' || !el.value.trim()) return;
  CB.re.r[el.getAttribute('data-k') === 'sms' ? 'sms' : 'email'].push(el.value.trim()); CB.reRender();
  var n = CB._reWrap.querySelector('[data-input="re-add"][data-k="' + el.getAttribute('data-k') + '"]'); if (n) n.focus();
});
CB.actions['re-rm'] = function (el) { var r = CB.re.r, k = el.getAttribute('data-k'); r[k === 'group' ? 'groups' : k === 'sms' ? 'sms' : 'email'].splice(+el.getAttribute('data-i'), 1); CB.reRender(); };
CB.actions['re-mon'] = function (el) { CB.re.r.monitor = el.getAttribute('data-v'); CB.reRender(); };
CB.actions['re-logic'] = function (el) {
  var r = CB.re.r, v = el.getAttribute('data-v'); r.logic = v;
  if (v === 'comms') r.tiers = [{ sev: 'warning', op: 'no data for', v: '30 min' }, { sev: 'critical', op: 'no data for', v: '2 h' }];
  else if (r.tiers.some(function (t) { return typeof t.v !== 'number'; })) r.tiers = v === 'complex' ? [{ sev: 'critical', op: 'match', v: null }] : [{ sev: 'warning', op: '>', v: CB.PARAMS[r.param || 'pm10'].warn || 1 }, { sev: 'critical', op: '>', v: CB.PARAMS[r.param || 'pm10'].crit || 2 }];
  if (v !== 'comms' && !r.param) r.param = CB.reParamsFor(r)[0];
  CB.reRender();
};
CB.actions['re-csev'] = function (el) { CB.re.r.tiers = [{ sev: el.getAttribute('data-v'), op: 'match', v: null }]; CB.reRender(); };
CB.actions['re-dynmode'] = function (el) { CB.re.r.dynMode = el.getAttribute('data-v'); CB.reRender(); };
CB.actions['re-day'] = function (el) { var r = CB.re.r, i = +el.getAttribute('data-i'); r.dayset[i] = r.dayset[i] ? 0 : 1; if (!r.dayset.some(Boolean)) r.dayset[i] = 1; CB.reRender(); };
CB.actions['re-tier-add'] = function () { var r = CB.re.r, last = r.tiers[r.tiers.length - 1]; r.tiers.push({ sev: 'critical', op: last.op, v: typeof last.v === 'number' ? CB.round(last.v * 1.2, 2) : last.v }); CB.reRender(); };
CB.actions['re-tier-del'] = function (el) { CB.re.r.tiers.splice(+el.getAttribute('data-i'), 1); CB.reRender(); };
CB.actions['re-cond-add'] = function () { CB.re.r.conditions.push({ join: 'AND', p: 'Relative humidity', op: '<', v: '35 %' }); CB.reRender(); };
CB.actions['re-cond-del'] = function (el) { CB.re.r.conditions.splice(+el.getAttribute('data-i'), 1); CB.reRender(); };
CB.actions['re-test'] = function () { var r = CB.re.r; CB.toast('Test sent to ' + (r.email.length + r.groups.length) + ' email and ' + r.sms.length + ' SMS recipients'); };
CB.actions['re-save'] = function () {
  var re = CB.re, r = re.r;
  if (!r.name.trim()) { var n = CB._reWrap.querySelector('[data-k="name"]'); n.classList.add('input-err'); n.focus(); return; }
  var D = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  r.days = r.dayset.every(Boolean) ? 'Every day' : r.dayset.join('') === '1111110' ? 'Mon – Sat' : r.dayset.join('') === '1111100' ? 'Mon – Fri' : D.filter(function (d, i) { return r.dayset[i]; }).join(', ');
  if (!r.dynOn) delete r.dynamic; else if (!r.dynamic) r.dynamic = [{ when: { tod: 'Time of day', season: 'Season', phase: 'Construction phase' }[r.dynMode], v: 'per table' }];
  delete r.dynOn; delete r.dynMode; delete r.dayset;
  if (re.isNew) CB.RULES.unshift(r); else { var i = CB.RULES.findIndex(function (x) { return x.id === r.id; }); CB.RULES[i] = Object.assign(CB.RULES[i], r); }
  CB.EVENTS.unshift({ id: 'EV-' + Date.now(), mins: 0, kind: 'User', cat: 'Config', text: CB.ROLES.admin.who + (re.isNew ? ' created ' : ' updated ') + r.id + ' ' + r.name, client: r.client });
  CB.overlay.close(); CB.toast('Rule saved · ' + r.name); CB.render(true);
};

/* ---------------- Client & User Administration ---------------- */
CB.cu = { tab: 'clients' };
CB.scopeText = function (u) {
  if (!u.client) return 'All clients';
  var n = CB.SITES.filter(function (s) { return s.client === u.client; }).length;
  if (u.role === 'stakeholder') return '2 dashboards (read-only)';
  if (u.role === 'client-view' && u.client === 'hvo') return '3 of ' + n + ' sites · dust & weather only';
  return 'All ' + n + ' sites';
};
CB.S.adminClients = function () {
  CB.adminCrumbs('Clients & Users');
  var cu = CB.cu;
  var tabs = '<div class="tabs" style="margin-top:0">' + [['clients', 'building', 'Clients', CB.CLIENTS.length], ['users', 'users', 'Users', CB.USERS.length], ['roles', 'key', 'Roles & permissions', CB.USER_ROLES.length]].map(function (t) { return '<button class="tab' + (cu.tab === t[0] ? ' on' : '') + '" data-action="cu-tab" data-v="' + t[0] + '">' + CB.icon(t[1]) + t[2] + '<span class="cnt">' + t[3] + '</span></button>'; }).join('') + '</div>';
  var body;
  if (cu.tab === 'clients') {
    body = CB.card({ flush: true, body: '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Client</th><th>White-label domain</th><th>Projects</th><th class="num">Sites</th><th class="num">Users</th><th class="num">Active alarms</th><th>Since</th><th></th></tr></thead><tbody>' + CB.CLIENTS.map(function (c) {
      var sites = CB.SITES.filter(function (s) { return s.client === c.id; }), users = CB.USERS.filter(function (u) { return u.client === c.id; });
      var al = CB.ALARMS.filter(function (a) { return a.client === c.id && a.state !== 'cleared'; }).length;
      return '<tr class="click" data-action="client-edit" data-id="' + c.id + '"><td><div class="name">' + c.name + '</div><div class="sub">' + c.region + ' · ' + c.contact + '</div></td><td class="mono small">' + c.domain + '</td><td>' + c.projects.map(function (p) { return '<div class="small">' + p + '</div>'; }).join('') + '</td><td class="num">' + sites.length + '</td><td class="num">' + users.length + '</td><td class="num">' + (al ? '<span class="st st-bad">' + al + '</span>' : '0') + '</td><td class="muted">' + c.since + '</td><td class="right nowrap">' + (c.id === 'hvo' ? '<button class="btn btn-sm" data-action="role" data-v="client">' + CB.icon('eye') + 'View as client</button> ' : '') + '<button class="btn btn-sm">' + CB.icon('pen') + 'Edit</button></td></tr>';
    }).join('') + '</tbody></table></div>' }) + '<div class="tiny muted mt-s">Admins can administer users, alarms and configuration on behalf of any client.</div>';
  } else if (cu.tab === 'users') {
    body = CB.card({ flush: true, body: '<div class="filters">' + CB.select([['', 'All clients'], ['cbe', 'CBased Environmental staff']].concat(CB.CLIENTS.map(function (c) { return [c.id, c.name]; })), cu.client || '', 'data-input="cu-client"') + '</div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>User</th><th>Role</th><th>Client</th><th>Visibility scope</th><th>Status</th><th>Last active</th><th></th></tr></thead><tbody>' +
      CB.USERS.filter(function (u) { return !cu.client || (cu.client === 'cbe' ? !u.client : u.client === cu.client); }).map(function (u) {
        var role = CB.USER_ROLES.find(function (r) { return r.id === u.role; });
        return '<tr class="click" data-action="user-edit" data-id="' + u.id + '"><td><div class="row" style="gap:10px;flex-wrap:nowrap"><span class="avatar sm" style="background:' + (u.client ? CB.client(u.client).color : '#1f74c4') + '">' + CB.initials(u.name) + '</span><div><div class="name">' + u.name + '</div><div class="sub">' + u.email + '</div></div></div></td><td><span class="chip ' + (u.role.indexOf('cbe') === 0 ? 'chip-cbe' : '') + '">' + role.name + '</span></td><td>' + (u.client ? CB.clientChip(u.client) : '<span class="cl-chip"><i style="background:#1f74c4"></i>CBE</span>') + '</td><td class="small">' + CB.scopeText(u) + '</td><td>' + CB.status(u.status) + '</td><td class="muted">' + u.last + '</td><td class="right"><button class="btn btn-sm">' + CB.icon('pen') + 'Edit</button></td></tr>';
      }).join('') + '</tbody></table></div>' });
  } else {
    var perms = [['View dashboards & maps', [1, 1, 1, 1, 1, 1]], ['View charts & site detail', [1, 1, 1, 1, 1, 0]], ['Acknowledge alarms', [1, 1, 0, 1, 0, 0]], ['Download data & reports', [1, 1, 1, 1, 1, 0]], ['API access (read-only)', [1, 1, 1, 1, 0, 0]], ['Listen to audio / view cameras', [1, 1, 1, 1, 1, 0]], ['Configure alarm rules', [1, 0, 0, 0, 0, 0]], ['Configure sites, parameters & sources', [1, 1, 0, 0, 0, 0]], ['Correct / annotate data', [1, 1, 0, 0, 0, 0]], ['Manage clients & users', [1, 0, 0, 0, 0, 0]]];
    body = CB.card({ flush: true, sub: 'Predefined roles applied to many users. Each user is further scoped to their entitled clients, sites and parameters.', title: 'Permission matrix', body: '<div class="tbl-wrap"><table class="tbl perm"><thead><tr><th>Permission</th>' + CB.USER_ROLES.map(function (r) { return '<th class="c">' + r.name + '<div class="sub" style="font-weight:400">' + r.scope + '</div></th>'; }).join('') + '</tr></thead><tbody>' + perms.map(function (p) { return '<tr><td>' + p[0] + '</td>' + p[1].map(function (v) { return '<td class="c">' + (v ? '<span class="pm-y">' + CB.icon('check') + '</span>' : '<span class="pm-n">–</span>') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>' });
  }
  return CB.pageHead({ title: 'Clients & Users', sub: 'Client workspaces, white-label branding, users, roles and what each user can see.',
    actions: '<button class="btn" data-action="client-edit">' + CB.icon('plus') + 'New client</button><button class="btn btn-primary" data-action="user-edit">' + CB.icon('plus') + 'Add user</button>' }) + tabs + body;
};
CB.actions['cu-tab'] = function (el) { CB.cu.tab = el.getAttribute('data-v'); CB.render(true); };
CB.inputs['cu-client'] = function (el) { CB.cu.client = el.value; CB.render(true); };
CB.actions['client-edit'] = function (el) {
  var c = el.getAttribute('data-id') ? CB.client(el.getAttribute('data-id')) : { name: '', short: '', mark: 'NEW', color: '#0f766e', color2: '#115e59', domain: '', region: '', contact: '', projects: [] };
  var prev = function (col) { return '<div class="wl-prev" style="--b:' + col + '"><div class="wl-bar"><span class="cust-logo" style="background:' + col + '">' + c.mark + '</span><b>' + (c.name || 'Client name') + '</b><span class="wl-url">' + (c.domain || 'monitoring.client.com.au') + '</span></div><div class="wl-body"><div class="wl-nav"><i class="on"></i><i></i><i></i><i></i></div><div class="wl-main"><div class="wl-k"><i></i><i></i><i></i></div><div class="wl-chart"></div></div></div></div>'; };
  CB.overlay.open({ title: c.name ? c.name : 'New client', size: 'lg', sub: c.name ? 'Client workspace · white-label branding · projects' : 'Create a client workspace',
    body: '<div class="grid g-2"><div class="form"><label class="field"><span>Client name</span><input class="input" value="' + CB.esc(c.name) + '"></label><div class="form g-2"><label class="field"><span>Short name</span><input class="input" value="' + CB.esc(c.short) + '"></label><label class="field"><span>Primary contact</span><input class="input" value="' + CB.esc(c.contact) + '"></label></div>' +
      '<div class="field"><span>Logo</span><div class="row" style="gap:12px"><span class="cust-logo xl" style="background:' + c.color + '">' + c.mark + '</span><div class="dropzone" style="flex:1;padding:12px">' + CB.icon('upload') + '<div class="small">Upload SVG / PNG</div></div></div></div>' +
      '<div class="form g-2"><label class="field"><span>Brand colour</span><div class="row"><input type="color" value="' + c.color + '" class="color-in" id="ce-col"><input class="input mono" value="' + c.color + '"></div></label><label class="field"><span>Accent colour</span><div class="row"><input type="color" value="' + c.color2 + '" class="color-in"><input class="input mono" value="' + c.color2 + '"></div></label></div>' +
      '<label class="field"><span>Custom domain</span><input class="input mono" value="' + CB.esc(c.domain) + '" placeholder="monitoring.client.com.au"><small>CNAME to wl.cbased-rayven.io · TLS certificate issued automatically</small></label>' +
      '<div class="field"><span>Projects</span><div class="pills">' + c.projects.map(function (p) { return '<span class="pill">' + p + '</span>'; }).join('') + '<span class="pill" style="border-style:dashed">+ add project</span></div></div></div>' +
      '<div><div class="field"><span>White-label preview</span><div id="wl-prev">' + prev(c.color) + '</div><small>Login page, app shell, reports and emails all use this branding.</small></div>' +
      '<div class="field mt"><span>Default dashboards for this client</span>' + CB.DASHBOARDS.filter(function (d) { return !d.admin; }).map(function (d) { return '<div class="mt-s">' + CB.switchHtml(d.name, d.id !== 'water' || c.id === 'hvo') + '</div>'; }).join('') + '</div></div></div>',
    footer: '<button class="btn" data-action="ov-close">Cancel</button><button class="btn btn-primary" data-action="save-close" data-msg="Client saved">Save client</button>',
    onMount: function (w) { var ci = w.querySelector('#ce-col'); ci.addEventListener('input', function () { w.querySelector('#wl-prev').innerHTML = prev(ci.value); }); } });
};
CB.actions['user-edit'] = function (el) {
  var u = el.getAttribute('data-id') ? CB.USERS.find(function (x) { return x.id === el.getAttribute('data-id'); }) : { name: '', email: '', role: 'client-view', client: 'hvo', status: 'Active' };
  var cs = u.client ? CB.SITES.filter(function (s) { return s.client === u.client; }) : [];
  var limited = u.role === 'client-view' && u.client === 'hvo';
  var tree = u.client ? '<div class="tree">' + CB.client(u.client).projects.map(function (p) {
    var ps = cs.filter(function (s) { return s.project === p; });
    return '<div class="tree-node"><input type="checkbox" checked>' + CB.icon('building') + '<b>' + p + '</b><span class="cap">' + ps.length + ' sites</span></div><div class="tree-children">' + ps.map(function (s, i) {
      var on = !limited || (s.kinds.indexOf('dust') >= 0 || s.kinds.indexOf('met') >= 0) && i < 4;
      return '<div class="tree-node"><input type="checkbox"' + (on ? ' checked' : '') + '>' + CB.icon('pin') + s.name + '<span class="cap">' + (limited && on ? 'dust & weather params' : 'all ' + s.params.length + ' params') + '</span></div>';
    }).join('') + '</div>';
  }).join('') + '</div>' : '<div class="note info">' + CB.icon('info') + ' CBE staff roles see every client. Scope applies to client users.</div>';
  CB.overlay.open({ title: u.name || 'Add user', size: 'lg', sub: u.email || 'Create a user and set what they can see',
    body: '<div class="grid g-2"><div class="form"><label class="field"><span>Full name</span><input class="input" value="' + CB.esc(u.name) + '"></label><label class="field"><span>Email</span><input class="input" value="' + CB.esc(u.email) + '"></label><label class="field"><span>Mobile (for SMS alarms)</span><input class="input mono" value="' + (u.name ? '+61 4' + (10 + CB.hash(u.name) % 89) + ' 555 ' + (100 + CB.hash(u.email) % 899) : '') + '"></label>' +
      '<label class="field"><span>Role</span>' + CB.select(CB.USER_ROLES.map(function (r) { return [r.id, r.name + ' · ' + r.desc]; }), u.role, 'class="select"') + '</label>' +
      '<label class="field"><span>Client</span>' + CB.select([['', 'CBased Environmental (staff)']].concat(CB.CLIENTS.map(function (c) { return [c.id, c.name]; })), u.client || '', 'class="select"') + '</label>' +
      '<div class="field"><span>Read-only dashboard access</span>' + CB.switchHtml('Can view shared dashboards without other access (stakeholders, regulators)', u.role === 'stakeholder') + '</div>' +
      '<div class="field"><span>Status</span>' + CB.seg('noop', ['Active', 'Suspended'], u.status === 'Invited' ? 'Active' : u.status) + '</div></div>' +
      '<div><div class="field"><span>Visibility scope · sites & parameters</span>' + tree + '<small>Users only ever see data inside this scope: maps, charts, exports, API and alarms.</small></div></div></div>',
    footer: '<button class="btn" data-action="ov-close">Cancel</button><button class="btn btn-primary" data-action="save-close" data-msg="User saved">Save user</button>' });
};

/* ---------------- Site & Parameter Setup ---------------- */
CB.sp = { client: null, project: null, site: null };
CB.S.adminSites = function () {
  CB.adminCrumbs('Sites & Parameters');
  var sp = CB.sp;
  var tree = '<div class="tree">' + '<div class="tree-node' + (!sp.client ? ' on' : '') + '" data-action="sp-node">' + CB.icon('globe') + '<b>CBE account</b><span class="cap">' + CB.SITES.length + '</span></div><div class="tree-children">' + CB.CLIENTS.map(function (c) {
    var cs = CB.SITES.filter(function (s) { return s.client === c.id; }), open = sp.client === c.id;
    return '<div class="tree-node' + (open && !sp.project && !sp.site ? ' on' : '') + '" data-action="sp-node" data-c="' + c.id + '"><i class="tdot" style="background:' + c.color + '"></i>' + c.name + '<span class="cap">' + cs.length + '</span></div>' +
      (open ? '<div class="tree-children">' + c.projects.map(function (p) {
        var ps = cs.filter(function (s) { return s.project === p; });
        return '<div class="tree-node' + (sp.project === p && !sp.site ? ' on' : '') + '" data-action="sp-node" data-c="' + c.id + '" data-p="' + CB.esc(p) + '">' + CB.icon('building') + p + '<span class="cap">' + ps.length + '</span></div><div class="tree-children">' + ps.map(function (s) {
          return '<div class="tree-node' + (sp.site === s.id ? ' on' : '') + '" data-action="sp-node" data-c="' + c.id + '" data-p="' + CB.esc(p) + '" data-s="' + s.id + '"><i class="tdot" style="background:' + CB.STATE[CB.siteState(s)].color + '"></i>' + s.name + '<span class="cap">' + s.params.length + '</span></div>';
        }).join('') + '</div>';
      }).join('') + '</div>' : '');
  }).join('') + '</div></div>';

  var right;
  if (sp.site) {
    var s = CB.site(sp.site), src = CB.source(s);
    var mapField = function (k) {
      var b = src.brand;
      var f = { pm10: 'PM10_Avg', pm25: 'PM2_5_Avg', tsp: 'TSP_Avg', flow: 'Flow_Avg', ws: 'WS_ms_S_WVT', wd: 'WindDir_D1_WVT', temp: 'AirTC_Avg', rh: 'RH', rain: 'Rain_mm_Tot', baro: 'BP_mbar_Avg', solar: 'SlrW_Avg', sigma: 'WindDir_SD1_WVT', laeq: 'LAeq', la10: 'LA10', la90: 'LA90', lamax: 'LAFmax', level: 'Level_m', ec: 'EC_uScm', ph: 'pH', turb: 'Turb_NTU', wtemp: 'WTemp_C', ppv: 'PPV_Peak', op: 'AirOP_dBL', batt: 'BattV_Min', ltemp: 'PTemp_C_Avg' }[k] || k;
      return b === 'Cellvisor' || b === 'YDOC' ? f.toLowerCase() : f;
    };
    right = CB.card({ title: s.name, icon: 'pin', titleExtra: CB.stateChip(CB.siteState(s)), sub: CB.client(s.client).name + ' · ' + s.project + ' · ' + CB.siteType(s),
      actions: '<button class="btn btn-sm" data-go="/sites/' + s.id + '">' + CB.icon('eye') + 'View</button><button class="btn btn-sm" data-go="/admin/sources?site=' + s.id + '">' + CB.icon('plug') + 'Data source</button><button class="btn btn-sm" data-action="site-edit" data-id="' + s.id + '">' + CB.icon('pen') + 'Edit site</button>',
      body: '<dl class="kv kv-3"><dt>Location</dt><dd class="mono">' + s.lat.toFixed(5) + ', ' + s.lng.toFixed(5) + '</dd><dt>Template</dt><dd>' + (CB.TEMPLATES.find(function (t) { return t.kinds === s.kinds.filter(function (k) { return k !== 'camera'; }).join(','); }) || CB.TEMPLATES[0]).name + '</dd><dt>Datalogger</dt><dd>' + s.logger + '</dd><dt>Time zone</dt><dd>' + s.tz + '</dd></dl>' }) +
      CB.card({ title: 'Parameters', icon: 'list', cls: 'mt', flush: true, sub: s.params.length + ' parameters · measured values map to incoming fields; calculated values are derived', actions: '<button class="btn btn-sm" data-action="param-edit" data-site="' + s.id + '" data-calc="1">' + CB.icon('plus') + 'Calculated parameter</button><button class="btn btn-sm" data-action="param-edit" data-site="' + s.id + '">' + CB.icon('plus') + 'Parameter</button>',
        body: '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Parameter</th><th>Type</th><th>Source / formula</th><th>Unit</th><th>Aggregation</th><th>Valid range</th><th>Thresholds</th><th></th></tr></thead><tbody>' + s.params.map(function (k) {
          var p = CB.PARAMS[k], th = CB.thresholds(s, k);
          return '<tr class="click" data-action="param-edit" data-site="' + s.id + '" data-k="' + k + '"><td><div class="name">' + p.name + '</div><div class="sub mono">' + k + '</div></td><td>' + (p.calc ? '<span class="chip chip-calc">Calculated</span>' : '<span class="chip">Measured</span>') + '</td><td class="mono small">' + (p.calc ? 'AVG(' + p.src + ', ' + (p.win >= 1440 ? '24 h' : '60 min') + ')' : mapField(k)) + '</td><td>' + p.unit + '</td><td class="small">' + (p.dir ? 'Vector mean' : k === 'rain' ? 'Sum' : k === 'lamax' ? 'Max' : 'Mean') + '</td><td class="small mono">' + (p.min != null ? p.min : '−∞') + ' … ' + (p.max != null ? p.max : p.dir ? 360 : '∞') + '</td><td class="small">' + (th.crit != null ? th.warn + ' / ' + th.crit : '<span class="muted">—</span>') + '</td><td class="right"><button class="btn btn-sm btn-ghost">' + CB.icon('pen') + '</button></td></tr>';
        }).join('') + '</tbody></table></div>' });
  } else {
    var list = CB.SITES.filter(function (s) { return (!sp.client || s.client === sp.client) && (!sp.project || s.project === sp.project); });
    right = CB.card({ title: sp.project || (sp.client ? CB.client(sp.client).name : 'All sites'), icon: 'tree', sub: list.length + ' sites · click to configure', flush: true,
      actions: '<button class="btn btn-sm" data-action="template-edit" data-id="tp1">' + CB.icon('copy') + 'Provision from template</button><button class="btn btn-sm btn-primary" data-action="site-edit">' + CB.icon('plus') + 'New site</button>',
      body: '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Site</th>' + (sp.client ? '' : '<th>Client</th>') + '<th>Project</th><th>Type</th><th>Datalogger</th><th class="num">Params</th><th>State</th></tr></thead><tbody>' + list.map(function (s) {
        return '<tr class="click" data-action="sp-node" data-c="' + s.client + '" data-p="' + CB.esc(s.project) + '" data-s="' + s.id + '"><td class="name">' + s.name + '<div class="sub mono">' + s.serial + '</div></td>' + (sp.client ? '' : '<td>' + CB.clientChip(s.client) + '</td>') + '<td class="small">' + s.project + '</td><td class="small">' + CB.siteType(s) + '</td><td class="small">' + s.logger + '</td><td class="num">' + s.params.length + '</td><td>' + CB.stateChip(CB.siteState(s)) + '</td></tr>';
      }).join('') + '</tbody></table></div>' });
  }
  var templates = CB.card({ title: 'Site & device templates', icon: 'copy', sub: 'Provision a new station in minutes. Template changes propagate; site-level overrides are kept.', flush: true, body: '<div class="list">' + CB.TEMPLATES.map(function (t) {
    return '<div class="li click" data-action="template-edit" data-id="' + t.id + '"><div class="li-ico tint-teal">' + CB.icon(CB.KIND[t.kinds.split(',')[0]].icon) + '</div><div class="li-main"><div class="li-t">' + t.name + '</div><div class="li-s">' + t.params + ' params · ' + t.sites + ' sites · ' + t.overrides + ' overrides · updated ' + t.updated + '</div></div></div>';
  }).join('') + '</div>' });
  var units = CB.card({ title: 'Domain units', icon: 'sliders', body: '<dl class="kv"><dt>Meteorological</dt><dd>m/s, °, °C, %, mm, hPa, W/m²</dd><dt>Water / hydrology</dt><dd>m (AHD or gauge), µS/cm, pH, NTU, °C</dd><dt>Air quality / dust</dt><dd>µg/m³ (PM10, PM2.5, TSP), L/min</dd><dt>Noise & vibration</dt><dd>dB(A), dB(L), mm/s PPV</dd></dl><div class="tiny muted mt-s">Unit conversion on ingest (e.g. mbar → hPa, knots → m/s).</div>' });
  return CB.pageHead({ title: 'Sites & Parameters', sub: 'Organise the client / project / site / parameter hierarchy, configure parameters (measured and calculated) and provision stations from templates.',
    actions: '<button class="btn" data-go="/admin/sources">' + CB.icon('plug') + 'Data sources</button>' }) +
    '<div class="grid g-side"><div class="stack">' + CB.card({ title: 'Hierarchy', icon: 'tree', body: tree }) + units + '</div><div class="stack">' + right + templates +
    CB.placeholder('Advanced calculation logic', 'Custom formulas across parameters and sites (e.g. upwind-minus-downwind PM10), and rate-of-change parameters.', { icon: 'code', mock: '<div class="ph2-code">PM10_contrib = PM10[Chandler] − PM10[Fairway] · IF wd IN 135..225</div>' }) + '</div></div>';
};
CB.actions['sp-node'] = function (el) { CB.sp = { client: el.getAttribute('data-c'), project: el.getAttribute('data-p'), site: el.getAttribute('data-s') }; CB.render(true); };
CB.actions['site-edit'] = function (el) {
  var s = el.getAttribute('data-id') ? CB.site(el.getAttribute('data-id')) : null;
  var c = s ? CB.client(s.client) : CB.client(CB.sp.client || 'hvo');
  CB.overlay.open({ title: s ? 'Edit site' : 'New site', size: 'lg', sub: s ? s.name : 'Create a station and attach it to a client and project',
    body: '<div class="grid g-2"><div class="form"><label class="field"><span>Site name</span><input class="input" value="' + (s ? CB.esc(s.name) : '') + '" placeholder="e.g. Jerrys Plains Dust & Met"></label>' +
      '<div class="form g-2"><label class="field"><span>Client</span>' + CB.select(CB.CLIENTS.map(function (x) { return [x.id, x.name]; }), c.id, 'class="select"') + '</label><label class="field"><span>Project</span>' + CB.select(c.projects, s ? s.project : c.projects[0], 'class="select"') + '</label></div>' +
      '<div class="form g-2"><label class="field"><span>Latitude</span><input class="input mono" value="' + (s ? s.lat.toFixed(5) : '-32.45') + '"></label><label class="field"><span>Longitude</span><input class="input mono" value="' + (s ? s.lng.toFixed(5) : '151.00') + '"></label></div>' +
      '<div class="field"><span>Site category</span>' + CB.seg('noop', ['Time-series monitoring', 'Camera', 'Audio source'], s && s.kinds[0] === 'camera' ? 'Camera' : 'Time-series monitoring') + '</div>' +
      '<div class="field"><span>Domains</span><div class="row">' + ['dust', 'met', 'noise', 'water', 'blast', 'camera'].map(function (k) { return CB.switchHtml(CB.KIND[k].label, s ? s.kinds.indexOf(k) >= 0 : k === 'dust'); }).join('') + '</div></div>' +
      '<div class="form g-2"><label class="field"><span>Time zone</span>' + CB.select(['Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane'], s ? s.tz : 'Australia/Sydney', 'class="select"') + '</label></div></div>' +
      '<div><div class="field"><span>Location</span><div id="se-map" class="map short"></div><small>Drag the map to position the site.</small></div></div></div>',
    footer: '<button class="btn" data-action="ov-close">Cancel</button><button class="btn btn-primary" data-action="save-close" data-msg="Site saved">Save site</button>',
    onMount: function () { var m = CB.Maps.make('se-map', { styles: false, mode: 'satellite', center: s ? [s.lat, s.lng] : [-32.45, 151], zoom: 13 }); if (m && s) CB.Maps.marker(m, s, { size: 20 }); } });
};
CB.actions['param-edit'] = function (el) {
  var s = CB.site(el.getAttribute('data-site')), k = el.getAttribute('data-k'), p = k ? CB.PARAMS[k] : null, calc = el.getAttribute('data-calc') || (p && p.calc);
  CB.overlay.open({ title: p ? p.name : calc ? 'New calculated parameter' : 'New parameter', sub: s.name, size: 'lg',
    body: '<div class="form"><div class="form g-2"><label class="field"><span>Display name</span><input class="input" value="' + (p ? CB.esc(p.name) : calc ? 'PM10 15-min rolling' : '') + '"></label><label class="field"><span>Key</span><input class="input mono" value="' + (k || (calc ? 'pm10_15m' : '')) + '"></label></div>' +
      '<div class="form g-2"><label class="field"><span>Unit</span><input class="input" value="' + (p ? p.unit : 'µg/m³') + '"></label><label class="field"><span>Domain</span>' + CB.select(['Air Quality / Dust', 'Meteorological', 'Noise', 'Water / Hydrology', 'System'], p ? p.domain : 'Air Quality / Dust', 'class="select"') + '</label></div>' +
      (calc ? '<div class="field"><span>Calculation</span><div class="calc"><select class="select select-sm"><option>Rolling average</option><option>Rolling sum</option><option>Rolling max</option><option>Daily total</option><option>Vector mean (direction)</option><option>Difference of two parameters</option></select><span>of</span>' + CB.select(s.params.filter(function (x) { return !CB.PARAMS[x].calc; }).map(function (x) { return [x, CB.PARAMS[x].name]; }), p ? p.src : 'pm10', '') + '<span>over</span><select class="select select-sm"><option>15 min</option><option' + (p && p.win === 60 ? ' selected' : '') + '>60 min</option><option' + (p && p.win === 1440 ? ' selected' : '') + '>24 h</option></select></div><small>Calculated parameters chart, alarm, report and export exactly like measured ones.</small></div>' +
        '<div class="row" style="gap:8px">' + CB.p2Btn('Custom formula', 'code') + CB.p2Btn('Rate of change', 'trend') + '</div>'
        : '<div class="form g-2"><label class="field"><span>Incoming field</span><input class="input mono" value="' + (k ? k.toUpperCase() + '_Avg' : '') + '"></label><label class="field"><span>Scale × / offset +</span><div class="row nowrap"><input class="input mono" value="1.000"><input class="input mono" value="0.00"></div></label></div>') +
      '<div class="form g-2"><label class="field"><span>Valid range (outside = flagged invalid)</span><div class="row nowrap"><input class="input mono" value="' + (p && p.min != null ? p.min : 0) + '"><span class="muted">to</span><input class="input mono" value="' + (p && p.max != null ? p.max : p && p.dir ? 360 : 1000) + '"></div></label><label class="field"><span>Summary aggregation</span>' + CB.select(['Mean', 'Sum', 'Max', 'Min', 'Vector mean'], p && p.dir ? 'Vector mean' : k === 'rain' ? 'Sum' : 'Mean', 'class="select"') + '</label></div>' +
      '<div class="row">' + CB.switchHtml('Flag flat-line (unchanged for 2 h)', true) + CB.switchHtml('Flag spikes (> 5σ)', !!(p && p.warn)) + '</div></div>',
    footer: '<button class="btn" data-action="ov-close">Cancel</button><button class="btn btn-primary" data-action="save-close" data-msg="Parameter saved">Save parameter</button>' });
};
CB.actions['template-edit'] = function (el) {
  var t = CB.TEMPLATES.find(function (x) { return x.id === el.getAttribute('data-id'); });
  var keys = []; t.kinds.split(',').forEach(function (k) { keys = keys.concat(CB.KIND_PARAMS[k]); }); keys = keys.concat(['batt', 'ltemp']);
  var using = CB.SITES.filter(function (s) { return s.kinds.filter(function (k) { return k !== 'camera'; }).join(',') === t.kinds; });
  CB.overlay.open({ title: t.name, size: 'lg', sub: t.logger + ' · used by ' + t.sites + ' sites',
    body: '<div class="grid g-2"><div><div class="field"><span>Parameters in template</span><div class="plist">' + keys.map(function (k) { return '<label class="pchk on"><input type="checkbox" checked><span>' + CB.PARAMS[k].name + '</span><small>' + CB.PARAMS[k].unit + (CB.PARAMS[k].calc ? ' · calc' : '') + '</small></label>'; }).join('') + '</div></div></div>' +
      '<div class="form"><label class="field"><span>Datalogger</span><input class="input" value="' + t.logger + '"></label><label class="field"><span>Default cadence</span>' + CB.select(['1 min', '5 min', '10 min', '15 min'], '5 min', 'class="select"') + '</label>' +
      '<div class="field"><span>Propagation</span>' + CB.switchHtml('Push template changes to all ' + t.sites + ' sites', true) + '<small>' + t.overrides + ' site-level overrides will be kept (e.g. custom thresholds at Jerrys Plains).</small></div>' +
      '<div class="field"><span>Sites using this template</span><div class="pills">' + (using.length ? using : CB.SITES.slice(0, t.sites)).slice(0, 8).map(function (s) { return '<span class="pill">' + s.name + '</span>'; }).join('') + '</div></div>' +
      '<div class="note info">' + CB.icon('info') + ' Provision a new station: pick this template, set name, client and coordinates. Parameters, field mappings, alarms and dashboards are created automatically.</div></div></div>',
    footer: '<button class="btn" data-action="ov-close">Cancel</button><button class="btn" data-action="site-edit">' + CB.icon('plus') + 'New site from template</button><button class="btn btn-primary" data-action="save-close" data-msg="Template saved · changes propagated">Save template</button>' });
};

/* ---------------- Data Sources & Integration ---------------- */
CB.S.adminSources = function () {
  CB.adminCrumbs('Data Sources');
  var srcs = CB.SITES.map(CB.source), q = CB.query();
  var byP = {}; CB.SITES.forEach(function (s) { byP[s.protocol] = (byP[s.protocol] || 0) + 1; });
  var protoIcon = { 'SFTP': 'server', 'FTP': 'server', 'HTTP webhook': 'globe', 'Email / IMAP': 'mail', 'S3': 'db', 'MQTT': 'wifi', 'CBE pipeline push': 'flow' };
  var protos = '<div class="proto-grid">' + [['FTP / SFTP', ['SFTP', 'FTP'], 'server', 'Logger or pipeline drops files'], ['HTTP / webhook', ['HTTP webhook'], 'globe', 'Devices POST JSON'], ['Email / IMAP', ['Email / IMAP'], 'mail', 'Attachments parsed on arrival'], ['Amazon S3', ['S3'], 'db', 'Bucket notifications'], ['MQTT', ['MQTT'], 'wifi', 'TLS broker, per-site topics'], ['CBE pipeline push', ['CBE pipeline push'], 'flow', 'CBE\'s own pipeline posts processed data']].map(function (p) {
    var n = CB.sum(p[1].map(function (k) { return byP[k] || 0; }));
    return '<div class="proto"><div class="li-ico tint-blue">' + CB.icon(p[2]) + '</div><div><b>' + p[0] + '</b><span>' + p[3] + '</span></div><em>' + n + '</em></div>';
  }).join('') + '</div>';
  var filt = CB.dsStatus || '';
  var shown = srcs.filter(function (x) { return !filt || x.status === filt; });
  var tiles = '<div class="grid g-4 ds-tiles">' + [['', 'All sources', 'Every configured data source', null], ['ok', 'Receiving', 'Payloads arriving on schedule', CB.STATE.normal.color], ['delayed', 'Delayed', 'Late, but still receiving', CB.STATE.warning.color], ['error', 'No data', 'Nothing for 3+ intervals, comms alarm raised', CB.STATE.alarm.color]].map(function (t) {
    var n = t[0] ? srcs.filter(function (x) { return x.status === t[0]; }).length : srcs.length;
    return '<button class="card ds-tile' + (filt === t[0] ? ' on' : '') + '" data-action="ds-filter" data-v="' + t[0] + '" aria-pressed="' + (filt === t[0]) + '"><div class="kpi"><div class="kpi-l">' + (t[3] ? '<span class="dot-lg" style="background:' + t[3] + '"></span>' : CB.icon('plug', 'ico')) + t[1] + '</div><div class="kpi-v">' + n + '</div><div class="kpi-d flat">' + t[2] + '</div></div></button>';
  }).join('') + '</div>';
  CB.onMount(function () { if (q.site && CB.site(q.site)) CB.sourceEdit(q.site); });
  return CB.pageHead({ title: 'Data Sources & Integration', sub: 'How data arrives for each site: device, protocol, format and cadence. Every payload received is stored as-is and retained, then parsed.',
    actions: '<button class="btn btn-primary" data-action="source-new">' + CB.icon('plus') + 'New data source</button>' }) +
    tiles +
    '<div class="mt">' + protos + '</div>' +
    CB.card({ title: 'Sources', icon: 'plug', flush: true, cls: 'mt', attrs: ' id="ds-table"', sub: (filt ? 'Showing ' + shown.length + ' of ' + srcs.length + ' · ' + { ok: 'Receiving', delayed: 'Delayed', error: 'No data' }[filt] + ' only · ' : '') + 'Click a source to configure it, map fields and see live ingestion', actions: filt ? '<button class="btn btn-sm" data-action="ds-filter" data-v="">' + CB.icon('close') + 'Clear filter</button>' : '', body: '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Site</th><th>Client</th><th>Datalogger</th><th>Protocol</th><th>Format</th><th>Telemetry</th><th class="num">Cadence</th><th class="num">Last received</th><th class="num">24 h</th><th>Status</th></tr></thead><tbody>' + shown.map(function (x) {
      return '<tr class="click" data-action="source-edit" data-id="' + x.site.id + '"><td class="name">' + x.site.name + '</td><td>' + CB.clientChip(x.site.client) + '</td><td class="small">' + x.site.logger + '</td><td><span class="chip">' + CB.icon(protoIcon[x.site.protocol] || 'plug') + x.site.protocol + '</span></td><td class="small">' + x.format + '</td><td class="small">' + x.site.telemetry + '</td><td class="num">' + x.site.cadence + ' min</td><td class="num">' + CB.ago(x.last) + '</td><td class="num">' + x.completeness + '%</td><td>' + CB.status(x.status) + '</td></tr>';
    }).join('') + '</tbody></table></div>' }) +
    '<div class="grid g-2 mt">' + CB.card({ title: 'Supported dataloggers', icon: 'cpu', body: '<div class="dev-grid">' + [['Campbell Scientific', 'CR1000X, CR300, CR6 · TOA5 / CSIXML'], ['Cellvisor', 'CV-Noise, CV-Cam · JSON webhook'], ['MACE', 'Envirolog · CSV'], ['Halytech', 'SpiderMAX · CSV / email'], ['dataTaker', 'DT80 · CSV'], ['YDOC', 'ML-417 · JSON / MQTT']].map(function (d) { return '<div class="dev"><b>' + d[0] + '</b><span>' + d[1] + '</span></div>'; }).join('') + '</div>' }) +
    '<div class="stack">' + CB.ctx('<b>Never lose data.</b> Every payload is written to immutable raw storage before parsing, so data can be re-processed after a mapping or calibration change. Duplicates are detected; late and out-of-order data is merged.') +
    CB.placeholder('Automatic structure detection', 'Detect the layout of a new file or payload and suggest field-to-parameter mappings automatically.', { icon: 'sparkle' }) + '</div></div>';
};
CB.actions['ds-filter'] = function (el) {
  var v = el.getAttribute('data-v');
  CB.dsStatus = CB.dsStatus === v ? '' : v;
  CB.render(true);
  var t = document.getElementById('ds-table'); // bring the table into view only when it's below the fold
  if (t && CB.dsStatus && t.getBoundingClientRect().top > window.innerHeight * 0.7) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
CB.actions['source-edit'] = function (el) { CB.sourceEdit(el.getAttribute('data-id')); };
CB.actions['source-new'] = function () { CB.sourceEdit(null); };
CB.sourceEdit = function (id) {
  var s = id ? CB.site(id) : CB.SITES[0], x = CB.source(s), isNew = !id;
  var fields = s.params.filter(function (k) { return !CB.PARAMS[k].calc; });
  var recent = CB.range(6).map(function (i) { var t = CB.lastTime(s) - i * s.cadence * CB.MIN; return '<tr><td class="mono small">' + CB.stamp24(new Date(t)) + ':00</td><td class="small">' + (x.format.indexOf('JSON') >= 0 ? 'payload.json' : s.id.toUpperCase() + '_' + CB.stamp24(new Date(t)).replace(':', '') + '.dat') + '</td><td class="num small">' + (1 + CB.hash(s.id + i) % 3) + ' rec</td><td class="num small">' + (2 + CB.hash(s.id + 'k' + i) % 9) + '.' + (CB.hash(s.id + i) % 9) + ' KB</td><td><span class="st st-ok">Stored · parsed</span></td></tr>'; }).join('');
  CB.overlay.open({ title: isNew ? 'New data source' : 'Data source · ' + s.name, size: 'xl', chips: isNew ? '' : CB.status(x.status), sub: isNew ? 'Connect a datalogger or feed to a site' : s.logger + ' · ' + s.protocol + ' · ' + s.cadence + '-min',
    body: '<label class="field" style="max-width:420px"><span>Site</span>' + CB.select(CB.SITES.map(function (y) { return [y.id, y.name + ' · ' + CB.client(y.client).short]; }), s.id, 'class="select"') + '</label>' +
      '<div class="grid g-2 mt"><div><div class="field"><span>Field mapping</span><div class="tbl-wrap map-tbl"><table class="tbl"><thead><tr><th>Incoming field</th><th></th><th>Parameter</th><th>Unit</th></tr></thead><tbody>' + fields.map(function (k) {
        var p = CB.PARAMS[k];
        return '<tr><td class="mono small">' + ({ Cellvisor: 1, YDOC: 1 }[x.brand] ? k : k.toUpperCase() + (p.dir ? '_D1_WVT' : k === 'rain' ? '_Tot' : '_Avg')) + '</td><td class="muted">→</td><td>' + CB.select(fields.map(function (f) { return [f, CB.PARAMS[f].name]; }), k, '') + '</td><td class="small muted">' + p.unit + '</td></tr>';
      }).join('') + '</tbody></table></div></div>' +
      '</div><div><div class="field"><span>Live ingestion · last payloads</span><div class="tbl-wrap"><table class="tbl ingest-tbl"><tbody>' + recent + '</tbody></table></div><small>' + x.payloads + ' payloads in 24 h · ' + x.completeness + '% complete · raw payloads retained</small></div></div></div>',
    footer: '<button class="btn" data-action="ov-close">Cancel</button><button class="btn btn-primary" data-action="save-close" data-msg="Data source saved">Save source</button>' });
};
