/* =========================================================
   Monitoring Assistant: ask questions about any site, logger,
   parameter or alarm in plain language.
   Uses Claude (Anthropic SDK, loaded on first use) with a snapshot of
   the live data the current role is allowed to see. Without an API key
   it falls back to built-in answers computed from the same data.
   ========================================================= */
CB.ai = {
  open: false,
  busy: false,
  messages: [],          // [{role: 'user'|'assistant', content: string, source: 'claude'|'demo'}]
  model: 'claude-opus-5-5',
  sdkUrl: 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.133.0/+esm',
  keyStore: 'cbe_anthropic_key'
};

CB.ai.getKey = function () { try { return localStorage.getItem(CB.ai.keyStore) || ''; } catch (e) { return CB.ai._key || ''; } };
CB.ai.setKey = function (k) { CB.ai._key = k; try { if (k) localStorage.setItem(CB.ai.keyStore, k); else localStorage.removeItem(CB.ai.keyStore); } catch (e) { /* memory only */ } };

/* ---------------- Context: what the assistant knows ---------------- */
CB.ai.currentSite = function () {
  var h = location.hash || '', m = h.match(/^#\/sites\/([^/?]+)/) || h.match(/[?&]site=([^&]+)/);
  var s = m ? CB.site(decodeURIComponent(m[1])) : null;
  return s && CB.scopeSites().indexOf(s) >= 0 ? s : null;
};

CB.ai.siteSummary = function (s, detail) {
  var t1 = Date.now(), t0 = t1 - 24 * CB.HOUR, src = CB.source(s);
  var o = {
    id: s.id, name: s.name, client: CB.client(s.client).name, project: s.project, type: CB.siteType(s),
    state: CB.STATE[CB.siteState(s)].label, route: '#/sites/' + s.id,
    location: [CB.round(s.lat, 4), CB.round(s.lng, 4)], time_zone: s.tz,
    datalogger: { model: s.logger, serial: s.serial, telemetry: s.telemetry, protocol: s.protocol, cadence_min: s.cadence, last_payload_min_ago: src.last, data_completeness_24h_pct: src.completeness, ingest_status: src.status === 'ok' ? 'receiving' : src.status === 'delayed' ? 'delayed' : 'no data' },
    has_camera: s.camera, has_audio: s.audio
  };
  if (s.comms) o.comms_failure = 'No data for ' + CB.mins(s.comms) + '; values are last received';
  o.parameters = s.params.map(function (k) {
    var p = CB.PARAMS[k], v = CB.latest(s, k), th = CB.thresholds(s, k);
    var row = { key: k, name: p.name, unit: p.unit, latest: v, state: CB.paramState(s, k, v) };
    if (p.calc) row.calculated = true;
    if (th.crit != null) row.thresholds = { warning: th.warn, critical: th.crit, direction: th.low ? 'below' : 'above' };
    if (detail && !p.dir && !p.rain) {
      var arr = CB.series(s, k, t0, t1, 30).map(function (x) { return x[1]; }).filter(function (x) { return x != null; });
      if (arr.length) { row.min_24h = CB.round(Math.min.apply(null, arr), p.dp); row.avg_24h = CB.round(CB.avg(arr), p.dp); row.max_24h = CB.round(Math.max.apply(null, arr), p.dp); }
    }
    if (p.rain) row.total_24h_mm = CB.round(CB.sum(CB.series(s, k, t0, t1, 10).map(function (x) { return x[1] || 0; })), 1);
    return row;
  });
  if (detail) {
    o.chart_route = '#/charts?site=' + s.id;
    if (s.audio) o.audio_route = '#/audio?site=' + s.id;
    if (s.camera) o.camera_route = '#/media?site=' + s.id;
    if (CB.state.role === 'admin') o.data_source_route = '#/admin/sources?site=' + s.id;
  }
  return o;
};

CB.ai.context = function () {
  var isAdmin = CB.state.role === 'admin', sites = CB.scopeSites(), here = CB.ai.currentSite();
  var ctx = {
    now: new Date().toLocaleString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' }),
    viewer: { role: CB.ROLES[CB.state.role].label, name: CB.ROLES[CB.state.role].who, organisation: CB.ROLES[CB.state.role].org },
    data_scope: isAdmin ? 'All CBE clients and sites' : 'Only ' + CB.me().name + ' sites',
    current_screen: CB.current ? { route: '#' + CB.current.full, name: (CB.screen(CB.current.route.screen === 'home' ? (isAdmin ? 'admin_home' : 'client_home') : CB.current.route.screen) || {}).name } : null,
    clients: CB.scopeClients().map(function (c) { return { id: c.id, name: c.name, region: c.region, projects: c.projects }; }),
    sites: sites.map(function (s) { return CB.ai.siteSummary(s, s === here); }),
    alarms: CB.scopeAlarms().filter(function (a) { return a.state !== 'cleared' || a.mins < 7 * 1440; }).map(function (a) {
      return { id: a.id, alarm: a.name, severity: a.sev, state: a.state === 'active' ? 'active, unacknowledged' : a.state === 'acknowledged' ? 'active, acknowledged' : 'cleared',
        site: CB.site(a.site).name, site_route: '#/sites/' + a.site, parameter: a.param ? CB.PARAMS[a.param].name : 'stale data', value: a.value, unit: a.param ? CB.PARAMS[a.param].unit : null,
        threshold: a.threshold, minutes_ago: a.mins, acknowledged_by: a.ackBy || null, comment: a.ackNote || null };
    }),
    reports: CB.scopeReports().map(function (r) { return { name: r.name, schedule: r.freq + ', ' + r.when, next_run: r.next, route: '#/reports' }; }),
    routes: { map: '#/map', dashboards: '#/dashboards', charts: '#/charts', alarms: '#/alarms', reports: '#/reports', export: '#/export', audio: '#/audio', webcams: '#/media' }
  };
  if (here) ctx.site_being_viewed = { id: here.id, name: here.name };
  if (isAdmin) {
    ctx.alarm_rules = CB.RULES.map(function (r) { return { id: r.id, name: r.name, monitor: CB.MONITORS[r.monitor], client: r.client ? CB.client(r.client).short : 'all', enabled: r.enabled, logic: CB.ruleSummary(r), days: r.days, window: r.window, triggered_30d: r.fired30, email_recipients: r.email.length, sms_recipients: r.sms.length }; });
    ctx.routes.alarm_setup = '#/admin/alarms'; ctx.routes.data_sources = '#/admin/sources'; ctx.routes.sites_setup = '#/admin/sites'; ctx.routes.clients = '#/admin/clients';
  }
  return ctx;
};

CB.ai.system = [
  'You are the Monitoring Assistant built into the CBased Environmental (CBE) monitoring platform, built on Rayven.',
  'CBE runs real-time environmental monitoring for mining and construction clients: dust (PM10, PM2.5, TSP), weather, noise, blast/vibration and water stations, each with a datalogger.',
  'You answer questions from either CBE staff (who see every client) or a client user (who sees only their own sites). The data you are given is already limited to what this viewer may see; never speculate about other clients.',
  '',
  'How to answer:',
  '- Use only the JSON data supplied with each question. It is live sample data for this prototype. If the data does not contain the answer, say so plainly and point to the screen that would help.',
  '- Lead with the direct answer in the first sentence, then the few numbers that support it, with units. Keep answers under about 150 words unless asked for detail.',
  '- Do not use em dashes; use commas, colons or full stops.',
  '- Use short paragraphs or a brief bullet list, **bold** for the key figure. Use a table only when comparing three or more sites.',
  '- Link every site, alarm screen or chart you mention with a markdown link to its route from the data, e.g. [Jerrys Plains Dust & Met](#/sites/hvo-jp). Only use routes that appear in the data.',
  '- "Here" or "this site" means site_being_viewed. A "device" or "station" means the site\'s datalogger and its sensors.',
  '- Compare values with their thresholds and say whether they are normal, warning or critical. PM10 24-hour average criterion in NSW is 50 µg/m³.',
  '- Recommendations should be practical and operational (water carts, pausing works, field technician visits, checking telemetry or batteries) and tied to the numbers.',
  '- Never invent figures, sites, people or thresholds.'
].join('\n');

/* ---------------- Claude call (streaming) ---------------- */
CB.ai.askClaude = async function (onText) {
  var mod = await import(CB.ai.sdkUrl);
  var Anthropic = mod.default;
  var client = new Anthropic({ apiKey: CB.ai.getKey(), dangerouslyAllowBrowser: true });
  // the latest question carries a fresh data snapshot
  var msgs = CB.ai.messages.map(function (m, i) {
    var last = i === CB.ai.messages.length - 1;
    return { role: m.role, content: last ? '<data>\n' + JSON.stringify(CB.ai.context()) + '\n</data>\n\n' + m.content : m.content };
  });
  var stream = client.beta.messages.stream({
    model: CB.ai.model,
    max_tokens: 64000,
    output_config: { effort: 'low' }, // conversational Q&A: fast and concise
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: CB.ai.system,
    messages: msgs
  });
  stream.on('text', onText);
  var final = await stream.finalMessage();
  if (final.stop_reason === 'refusal') throw Object.assign(new Error('refusal'), { kind: 'refusal' });
  return final;
};

/* ---------------- Built-in answers (no key / offline) ---------------- */
CB.ai.STOP = ['dust', 'noise', 'weather', 'station', 'water', 'level', 'camera', 'monitor', 'blast', 'vibration', 'road', 'site', 'the', 'and', 'met', 'gauge', 'pit'];
CB.ai.findSite = function (q) {
  var best = null, score = 0;
  CB.scopeSites().forEach(function (s) {
    var words = s.name.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(function (w) { return w.length > 2 && CB.ai.STOP.indexOf(w) < 0; });
    var sc = words.filter(function (w) { return q.indexOf(w) >= 0; }).length / Math.max(1, words.length) + (q.indexOf(s.name.toLowerCase()) >= 0 ? 2 : 0);
    if (sc > score) { score = sc; best = s; }
  });
  return score >= 0.5 ? best : null;
};
CB.ai.link = function (s) { return '[' + s.name + '](#/sites/' + s.id + ')'; };
CB.ai.rank = function (key, sites) {
  return (sites || CB.scopeSites()).filter(function (s) { return s.params.indexOf(key) >= 0 && !s.comms; })
    .map(function (s) { return { s: s, v: CB.latest(s, key) }; }).sort(function (a, b) { return b.v - a.v; });
};
CB.ai.localAnswer = function (raw) {
  var q = raw.toLowerCase(), L = CB.ai.link, isAdmin = CB.state.role === 'admin';
  var site = CB.ai.findSite(q) || (/\b(here|this site|this station|this device|this logger)\b/.test(q) || !/\b(all|any|which|every|across|sites|portfolio)\b/.test(q) ? CB.ai.currentSite() : null);
  var act = CB.scopeAlarms().filter(function (a) { return a.state !== 'cleared'; });
  var who = isAdmin ? 'across the portfolio' : 'across your sites';

  if (site && !/\b(which|rank|highest|lowest|all sites)\b/.test(q)) {
    var st = CB.siteState(site), src = CB.source(site);
    var keys = site.params.filter(function (k) { return k !== 'ltemp'; });
    if (/battery|power|solar/.test(q)) keys = ['batt'];
    else if (/device|logger|telemetry|comms|online|offline|reporting|payload/.test(q)) {
      return L(site) + ' uses a **' + site.logger + '** (' + site.serial + ') reporting every ' + site.cadence + ' min over ' + site.telemetry + ' (' + site.protocol + ').\n\n' +
        (site.comms ? '- **No data for ' + CB.mins(site.comms) + '**, a comms alarm is active and CBE field technicians have been notified.\n' : '- Last payload ' + CB.ago(src.last) + ', ' + src.completeness + '% data complete over 24 h.\n') +
        '- Battery **' + CB.fmtUnit('batt', CB.latest(site, 'batt')) + '**, logger temperature ' + CB.fmtUnit('ltemp', CB.latest(site, 'ltemp')) + '.' +
        (isAdmin ? '\n\nConfigure it in [Data Sources](#/admin/sources?site=' + site.id + ').' : '');
    }
    var lines = keys.slice(0, 8).map(function (k) {
      var v = CB.latest(site, k), ps = CB.paramState(site, k, v), th = CB.thresholds(site, k);
      return '- ' + CB.PARAMS[k].name + ': **' + CB.fmtUnit(k, v) + '**' + (ps === 'normal' || th.crit == null ? '' : ' (' + CB.STATE[ps].label.toLowerCase() + (th.low ? ', below ' + (ps === 'alarm' ? th.crit : th.warn) : ', limit ' + (ps === 'alarm' ? th.crit : th.warn)) + ' ' + CB.PARAMS[k].unit + ')');
    });
    var sa = act.filter(function (a) { return a.site === site.id; });
    return L(site) + ' is **' + CB.STATE[st].label.toLowerCase() + '**' + (site.comms ? ', no data for ' + CB.mins(site.comms) : '') + '. Latest readings at ' + CB.stamp24(new Date(CB.lastTime(site))) + ':\n\n' + lines.join('\n') +
      (sa.length ? '\n\n**' + sa.length + ' active alarm' + (sa.length > 1 ? 's' : '') + ':** ' + sa.map(function (a) { return a.name + ' (' + a.sev + ', ' + (a.state === 'active' ? 'unacknowledged' : 'acknowledged by ' + a.ackBy) + ')'; }).join('; ') + '.' : '') +
      '\n\nSee the [trends](#/charts?site=' + site.id + ')' + (site.audio ? ' or [listen to recordings](#/audio?site=' + site.id + ')' : '') + '.';
  }
  if (/offline|comms|not reporting|no data|stale|down\b/.test(q)) {
    var off = CB.scopeSites().filter(function (s) { return s.comms; }), del = CB.scopeSites().filter(function (s) { return !s.comms && CB.source(s).status === 'delayed'; });
    if (!off.length && !del.length) return 'All ' + CB.scopeSites().length + ' sites are reporting normally.';
    return '**' + off.length + ' site' + (off.length === 1 ? ' is' : 's are') + ' not reporting** ' + who + ':\n\n' + off.map(function (s) { return '- ' + L(s) + ': no data for ' + CB.mins(s.comms) + ' (' + s.telemetry + ', ' + s.logger + ')'; }).join('\n') +
      (del.length ? '\n\nDelayed but receiving: ' + del.map(L).join(', ') + '.' : '') + '\n\nComms alarms are raised after three missed intervals and sent to the CBE field team.';
  }
  if (/battery|power|solar/.test(q)) {
    var b = CB.scopeSites().filter(function (s) { return !s.comms; }).map(function (s) { return { s: s, v: CB.latest(s, 'batt') }; }).sort(function (a, c) { return a.v - c.v; });
    return 'The lowest battery is ' + L(b[0].s) + ' at **' + CB.fixed(b[0].v, 2) + ' V**' + (b[0].v < 11.8 ? ', below the 11.8 V warning, so schedule a solar and battery check' : '') + '.\n\n' + b.slice(0, 5).map(function (x) { return '- ' + L(x.s) + ': ' + CB.fixed(x.v, 2) + ' V'; }).join('\n');
  }
  if (/alarm|exceed|breach|alert|ack/.test(q)) {
    if (!act.length) return 'There are no active alarms ' + who + '.';
    var un = act.filter(function (a) { return a.state === 'active'; });
    return '**' + act.length + ' alarms are active** ' + who + ', ' + un.length + ' still unacknowledged.\n\n' + act.slice(0, 8).map(function (a) { var s = CB.site(a.site); return '- **' + a.name + '** at ' + L(s) + ': ' + (a.param ? CB.fmtUnit(a.param, a.value) : 'no data') + ' · ' + a.sev + ' · ' + (a.state === 'active' ? 'unacknowledged' : 'ack ' + a.ackBy) + ' · ' + CB.ago(a.mins); }).join('\n') + '\n\nAcknowledge them in the [Alarm console](#/alarms).';
  }
  if (/dust|pm10|pm2|tsp|air quality|particulate/.test(q)) {
    var r = CB.ai.rank('pm10_1h');
    if (!r.length) return 'None of your sites measure dust.';
    return 'Highest PM10 right now is ' + L(r[0].s) + ' at **' + CB.fixed(r[0].v, 1) + ' µg/m³** (1-hour rolling)' + (r[0].v >= 50 ? ', above the 50 µg/m³ critical limit' : r[0].v >= 45 ? ', above the 45 µg/m³ warning' : '') + '.\n\n' + r.slice(0, 6).map(function (x) { return '- ' + L(x.s) + ': ' + CB.fixed(x.v, 1) + ' µg/m³ · 24-hr ' + CB.fmtVal('pm10_24h', CB.latest(x.s, 'pm10_24h')); }).join('\n') + '\n\nCheck wind direction on the [Air Quality dashboard](#/dashboards/air).';
  }
  if (/noise|laeq|db\b|loud|audio/.test(q)) {
    var n = CB.ai.rank('laeq');
    if (!n.length) return 'None of your sites measure noise.';
    return 'Loudest receiver right now is ' + L(n[0].s) + ' at **' + CB.fixed(n[0].v, 1) + ' dB(A)** LAeq(15 min) against a ' + CB.thresholds(n[0].s, 'laeq').crit + ' dB(A) limit.\n\n' + n.slice(0, 6).map(function (x) { return '- ' + L(x.s) + ': ' + CB.fixed(x.v, 1) + ' dB(A)'; }).join('\n') + '\n\nListen to what triggered it in [Noise Audio](#/audio?site=' + n[0].s.id + ').';
  }
  if (/blast|vibration|ppv|overpressure/.test(q)) {
    var v = CB.ai.rank('ppv');
    if (!v.length) return 'None of your sites monitor blasting.';
    return v.map(function (x) { return '- ' + L(x.s) + ': PPV **' + CB.fixed(x.v, 2) + ' mm/s**, overpressure ' + CB.fmtUnit('op', CB.latest(x.s, 'op')); }).join('\n') + '\n\nLimits are 2 mm/s (warning) and 5 mm/s (critical) PPV, 115 / 120 dB(L) overpressure.';
  }
  if (/water|dam|level|ec\b|turbid|ph\b/.test(q)) {
    var w = CB.ai.rank('level');
    if (!w.length) return 'None of your sites monitor water.';
    return w.map(function (x) { return '- ' + L(x.s) + ': level **' + CB.fixed(x.v, 2) + ' m**, EC ' + CB.fmtUnit('ec', CB.latest(x.s, 'ec')) + ', turbidity ' + CB.fmtUnit('turb', CB.latest(x.s, 'turb')); }).join('\n') + '\n\nAll storages are below their warning levels unless marked otherwise on the [Water dashboard](#/dashboards/water).';
  }
  if (/wind|weather|rain|temp|humid/.test(q)) {
    var met = CB.scopeSites().filter(function (s) { return s.params.indexOf('ws') >= 0 && !s.comms; });
    return 'Current weather ' + who + ':\n\n' + met.slice(0, 6).map(function (s) { var wd = CB.latest(s, 'wd'); return '- ' + L(s) + ': wind **' + CB.fmtVal('ws', CB.latest(s, 'ws')) + ' m/s from ' + CB.compass(wd) + '**' + (s.params.indexOf('temp') >= 0 ? ', ' + CB.fmtUnit('temp', CB.latest(s, 'temp')) : ''); }).join('\n') + '\n\nSee wind and dust roses in the [Chart Explorer](#/charts?view=rose).';
  }
  if (/device|logger|datalogger|sensor|telemetry|station/.test(q)) {
    var byL = {}; CB.scopeSites().forEach(function (s) { var k = s.logger.split(' ')[0] === 'Campbell' ? 'Campbell Scientific' : s.logger.split(' ')[0]; byL[k] = (byL[k] || 0) + 1; });
    var off2 = CB.scopeSites().filter(function (s) { return s.comms; });
    return '**' + CB.scopeSites().length + ' dataloggers** ' + who + ': ' + Object.keys(byL).map(function (k) { return byL[k] + ' ' + k; }).join(', ') + '.\n\n' + (off2.length ? off2.length + ' not reporting: ' + off2.map(L).join(', ') + '.' : 'All are reporting.') + '\n\nAsk about any station by name for its readings, battery and telemetry.';
  }
  if (/report/.test(q)) {
    return 'Scheduled reports:\n\n' + CB.scopeReports().map(function (r) { return '- **' + r.name + '** · ' + r.freq + ', next ' + r.next; }).join('\n') + '\n\nPreview or download them in [Reports](#/reports).';
  }
  if (/rule|threshold|limit|criteria|criterion/.test(q)) {
    if (!isAdmin) return 'Alarm limits for your sites are set by CBased Environmental. Key ones: PM10 1-hour 45 / 50 µg/m³, PM10 24-hour criterion 50 µg/m³, night noise 45 / 50 dB(A), vibration 2 / 5 mm/s PPV. Ask about a site to compare its readings with its limits.';
    return '**' + CB.RULES.filter(function (r) { return r.enabled; }).length + ' of ' + CB.RULES.length + ' alarm rules are enabled.** Most active over 30 days:\n\n' + CB.RULES.slice().sort(function (a, c) { return c.fired30 - a.fired30; }).slice(0, 5).map(function (r) { return '- **' + r.name + '** (' + r.fired30 + '×): ' + CB.ruleSummary(r); }).join('\n') + '\n\nEdit them in [Alarm & Notification Setup](#/admin/alarms).';
  }
  if (/attention|focus|priorit|worst|problem|issue|summary|overview|status/.test(q)) {
    var c = CB.siteCounts(CB.scopeSites());
    var bad = CB.scopeSites().filter(function (s) { return CB.siteState(s) !== 'normal'; });
    return '**' + bad.length + ' of ' + CB.scopeSites().length + ' sites need attention** ' + who + ' (' + c.alarm + ' alarm, ' + c.warning + ' warning, ' + c.comms + ' comms failure).\n\n' + bad.map(function (s) { var k = CB.headline(s); return '- ' + L(s) + ': ' + CB.STATE[CB.siteState(s)].label.toLowerCase() + (s.comms ? ', no data ' + CB.mins(s.comms) : ', ' + CB.PARAMS[k].name + ' ' + CB.fmtUnit(k, CB.latest(s, k))); }).join('\n');
  }
  return 'I can answer questions about any site or datalogger: current readings, alarms, dust, noise, blasting, water, weather, batteries, comms and reports. Try naming a station, for example "How is Jerrys Plains Dust & Met?".\n\n_Built-in answers are active. Add an Anthropic API key in settings for free-form answers from Claude._';
};

/* ---------------- Rendering ---------------- */
CB.ai.md = function (text) {
  var esc = CB.esc(text);
  var inline = function (t) {
    return t.replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>')
      .replace(/(^|\s)_([^_\n]+)_/g, '$1<i>$2</i>')
      .replace(/\[([^\]]+)\]\((#\/[^)\s]+|https:\/\/[^)\s]+)\)/g, function (m, label, href) {
        return href.charAt(0) === '#' ? '<a href="' + href + '" class="ai-link">' + label + '</a>' : '<a href="' + href + '" target="_blank" rel="noopener">' + label + '</a>';
      });
  };
  var out = [], list = null, table = null;
  var flushList = function () { if (list) { out.push('<' + list.tag + '>' + list.items.map(function (i) { return '<li>' + inline(i) + '</li>'; }).join('') + '</' + list.tag + '>'); list = null; } };
  var flushTable = function () {
    if (!table) return;
    var rows = table.filter(function (r) { return !/^\s*\|?\s*:?-{2,}/.test(r); }).map(function (r) { return r.replace(/^\s*\||\|\s*$/g, '').split('|').map(function (c) { return inline(c.trim()); }); });
    out.push('<div class="tbl-wrap"><table class="tbl ai-tbl"><thead><tr>' + rows[0].map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.slice(1).map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>');
    table = null;
  };
  esc.split('\n').forEach(function (line) {
    var ul = line.match(/^\s*[-*•]\s+(.*)/), ol = line.match(/^\s*\d+[.)]\s+(.*)/), h = line.match(/^#{1,4}\s+(.*)/);
    if (/^\s*\|.*\|\s*$/.test(line)) { flushList(); (table = table || []).push(line); return; }
    flushTable();
    if (ul || ol) {
      var tag = ul ? 'ul' : 'ol';
      if (!list || list.tag !== tag) { flushList(); list = { tag: tag, items: [] }; }
      list.items.push((ul || ol)[1]); return;
    }
    flushList();
    if (h) out.push('<h4>' + inline(h[1]) + '</h4>');
    else if (line.trim()) out.push('<p>' + inline(line) + '</p>');
  });
  flushList(); flushTable();
  return out.join('');
};

CB.ai.suggestions = function () {
  var here = CB.ai.currentSite(), scr = CB.current ? CB.current.route.screen : 'home';
  if (here) return ['How is ' + here.name + ' right now?', 'Is this logger reporting OK?', 'What is its battery voltage?', 'Any alarms here?'];
  if (scr === 'alarm_console' || scr === 'alarm_setup') return ['Summarise the active alarms', 'Which alarms are unacknowledged?', CB.state.role === 'admin' ? 'Which rules fire most often?' : 'What are my alarm limits?'];
  if (scr === 'admin_data_sources') return ['Which loggers are not reporting?', 'Which batteries are low?', 'What dataloggers do we have?'];
  if (scr === 'audio_browser') return ['Which receiver is loudest right now?', 'Any noise alarms?'];
  return ['Which sites need attention?', 'Where is dust highest right now?', 'Are any loggers offline?', 'Which receiver is loudest?'];
};

CB.ai.render = function () {
  var root = document.getElementById('ai-root');
  if (!root) { root = document.createElement('div'); root.id = 'ai-root'; document.body.appendChild(root); }
  var a = CB.ai, hasKey = !!a.getKey();
  var here = a.currentSite();
  var scr = CB.current && CB.current.route.screen !== 'login' ? CB.screen(CB.current.route.screen === 'home' ? (CB.state.role === 'admin' ? 'admin_home' : 'client_home') : CB.current.route.screen) : null;
  var ctxLabel = here ? here.name : scr ? scr.name : 'Home';
  var scope = CB.state.role === 'admin' ? 'All clients · ' + CB.SITES.length + ' sites' : CB.me().short + ' only · ' + CB.scopeSites().length + ' sites';
  var body;
  if (a.settings) {
    body = '<div class="ai-settings"><b>Claude connection</b><p class="small muted">Answers come from <b>Claude Opus 5.5</b> through the Anthropic API. Your key is stored only in this browser and sent only to api.anthropic.com. This is fine for a prototype; a production build would call Claude from a server.</p>' +
      '<label class="field"><span>Anthropic API key</span><input class="input mono" type="password" id="ai-key" placeholder="sk-ant-…" value="' + CB.esc(a.getKey()) + '" autocomplete="off"></label>' +
      '<div class="row mt-s"><button class="btn btn-primary btn-sm" data-action="ai-key-save">Save</button>' + (hasKey ? '<button class="btn btn-sm btn-danger" data-action="ai-key-clear">Remove key</button>' : '') + '<button class="btn btn-sm btn-ghost" data-action="ai-settings">Back</button></div>' +
      '<p class="tiny muted mt">Without a key, built-in answers computed from the same data are used.</p></div>';
  } else {
    var msgs = a.messages.map(function (m, i) {
      if (m.role === 'user') return '<div class="ai-msg me"><div class="ai-bubble">' + CB.esc(m.content) + '</div></div>';
      return '<div class="ai-msg bot"><div class="ai-av">' + CB.icon('sparkle', 'ico') + '</div><div class="ai-ans"' + (i === a.messages.length - 1 && a.busy ? ' id="ai-live"' : '') + '>' + (m.content ? CB.ai.md(m.content) : '<span class="ai-typing"><i></i><i></i><i></i></span>') +
        (m.note ? '<div class="ai-note">' + m.note + '</div>' : '') + '</div></div>';
    }).join('');
    var welcome = !a.messages.length ? '<div class="ai-hello"><div class="ai-orb">' + CB.icon('sparkle', 'ico') + '</div><h3>Ask about any site or device</h3><p>Live readings, alarms, dust, noise, blasting, water, weather, batteries and comms, answered from ' + (CB.state.role === 'admin' ? 'the whole portfolio' : 'your sites') + '.</p>' +
      '<div class="ai-scope-note">' + CB.icon('info', 'ico') + '<div><b>Not in scope</b>This assistant is a concept preview only. It is not part of the Phase 1 or Phase 2 scope for this proposal.</div></div></div>' : '';
    body = '<div class="ai-thread" id="ai-thread">' + welcome + msgs + '</div>' +
      '<div class="ai-suggest">' + CB.ai.suggestions().map(function (q) { return '<button class="ai-chip" data-action="ai-ask" data-q="' + CB.esc(q) + '">' + CB.esc(q) + '</button>'; }).join('') + '</div>' +
      '<form class="ai-input" id="ai-form"><textarea id="ai-q" rows="1" placeholder="Ask anything about ' + CB.esc(ctxLabel) + '…"' + (a.busy ? ' disabled' : '') + '></textarea><button class="ai-send" type="submit" aria-label="Send"' + (a.busy ? ' disabled' : '') + '>' + CB.icon('trend', 'ico') + '</button></form>';
  }
  root.innerHTML = '<aside class="ai-panel' + (a.open ? ' open' : '') + '" aria-label="Monitoring Assistant">' +
    '<div class="ai-head"><div class="ai-title">' + CB.icon('sparkle', 'ico') + 'Monitoring Assistant</div>' +
    '<span class="ai-src ' + (hasKey ? 'live' : '') + '" title="' + (hasKey ? 'Answers from Claude Opus 5.5' : 'Built-in answers, add an API key in settings') + '">' + (hasKey ? 'Claude' : 'Demo') + '</span>' +
    '<button class="ai-icon" data-action="ai-settings" title="Settings">' + CB.icon('settings', 'ico') + '</button>' + (a.messages.length ? '<button class="ai-icon" data-action="ai-clear" title="New conversation">' + CB.icon('refresh', 'ico') + '</button>' : '') +
    '<button class="ai-icon" data-action="ai-toggle" title="Close">' + CB.icon('close', 'ico') + '</button></div>' +
    (!a.settings ? '<div class="ai-ctx">' + CB.icon('eye', 'ico') + 'Looking at <b>' + CB.esc(ctxLabel) + '</b><span class="ai-scope">' + scope + '</span></div>' : '') +
    body + '</aside>';
  document.body.classList.toggle('ai-open', a.open);
  var th = document.getElementById('ai-thread'); if (th) th.scrollTop = th.scrollHeight;
  var form = document.getElementById('ai-form');
  if (form) {
    var ta = document.getElementById('ai-q');
    form.addEventListener('submit', function (e) { e.preventDefault(); CB.ai.ask(ta.value); });
    ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); CB.ai.ask(ta.value); } });
    ta.addEventListener('input', function () { ta.style.height = 'auto'; ta.style.height = Math.min(140, ta.scrollHeight) + 'px'; });
    if (a.open && !a.busy) setTimeout(function () { ta.focus(); }, 50);
  }
};

/* ---------------- Asking ---------------- */
CB.ai.ask = async function (q) {
  q = (q || '').trim();
  var a = CB.ai;
  if (!q || a.busy) return;
  a.messages.push({ role: 'user', content: q });
  var reply = { role: 'assistant', content: '' };
  a.messages.push(reply);
  a.busy = true;
  CB.ai.render();
  var paint = function () {
    var el = document.getElementById('ai-live');
    if (el) el.innerHTML = CB.ai.md(reply.content) || '<span class="ai-typing"><i></i><i></i><i></i></span>';
    var th = document.getElementById('ai-thread'); if (th) th.scrollTop = th.scrollHeight;
  };
  var useDemo = function (note) { reply.content = CB.ai.localAnswer(q); reply.source = 'demo'; if (note) reply.note = note; };
  if (!a.getKey()) {
    await new Promise(function (r) { setTimeout(r, 450); });
    useDemo();
  } else {
    var pending = false;
    try {
      // the API needs strictly alternating turns: send history without the empty reply placeholder
      a.messages.pop();
      await CB.ai.askClaude(function (delta) {
        reply.content += delta;
        if (!pending) { pending = true; requestAnimationFrame(function () { pending = false; paint(); }); }
      });
      a.messages.push(reply);
      reply.source = 'claude';
    } catch (err) {
      if (a.messages[a.messages.length - 1] !== reply) a.messages.push(reply);
      var status = err && err.status;
      var why = err && err.kind === 'refusal' ? 'Claude declined this question'
        : status === 401 ? 'The API key was rejected'
        : status === 429 ? 'Rate limited by the API'
        : status >= 500 ? 'The API is temporarily unavailable'
        : /import|Failed to fetch|NetworkError|module/i.test(String(err && err.message)) ? 'Couldn\'t reach Claude (offline?)'
        : 'Claude request failed';
      reply.content = '';
      useDemo(why + ', showing a built-in answer instead.');
    }
  }
  a.busy = false;
  CB.ai.render();
};

/* A new role starts a new conversation, so a client never sees answers given to CBE staff. */
CB.ai.reset = function () { if (!CB.ai.busy) CB.ai.messages = []; CB.ai.render(); };

CB.actions['ai-toggle'] = function () { CB.ai.open = !CB.ai.open; CB.ai.settings = false; CB.ai.render(); };
CB.actions['ai-ask'] = function (el) { CB.ai.ask(el.getAttribute('data-q')); };
CB.actions['ai-clear'] = function () { if (!CB.ai.busy) { CB.ai.messages = []; CB.ai.render(); } };
CB.actions['ai-settings'] = function () { CB.ai.settings = !CB.ai.settings; CB.ai.render(); };
CB.actions['ai-key-save'] = function () {
  var v = (document.getElementById('ai-key').value || '').trim();
  CB.ai.setKey(v); CB.ai.settings = false; CB.ai.render();
  CB.toast(v ? 'Connected, answers now come from Claude' : 'Key cleared');
};
CB.actions['ai-key-clear'] = function () { CB.ai.setKey(''); CB.ai.settings = false; CB.ai.render(); CB.toast('Key removed, using built-in answers'); };

// keep the context label and suggestions in step with navigation; Ctrl/Cmd+J toggles the panel
window.addEventListener('hashchange', function () { setTimeout(CB.ai.render, 0); });
document.addEventListener('keydown', function (e) {
  if ((e.ctrlKey || e.metaKey) && (e.key === 'j' || e.key === 'J')) { e.preventDefault(); CB.actions['ai-toggle'](); }
});
