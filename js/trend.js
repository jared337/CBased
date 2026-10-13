/* =========================================================
   CBased Environmental prototype, analysis charts.
   CB.Trend: interactive time-series chart (multi Y-axes per unit,
   threshold lines with breach highlighting, day/evening/night shading,
   drag-to-zoom, wheel zoom, pan, line isolation, crosshair tooltip).
   CB.Charts.rose: configurable wind / dust rose.
   ========================================================= */
CB.PALETTE = ['#4f46e5', '#0d9488', '#db2777', '#d97706', '#7c3aed', '#0284c7', '#65a30d', '#71717a'];

CB.Trend = function (el, cfg) {
  this.el = el;
  this.cfg = cfg;
  this.view = [cfg.t0, cfg.t1];
  this.hidden = {};
  this.mode = cfg.mode || 'zoom';
  var self = this;
  el.classList.add('trend');
  el.innerHTML = '<div class="trend-plot"></div><div class="trend-tip"></div><div class="c-legend trend-legend"></div>';
  this.plot = el.querySelector('.trend-plot');
  this.tipEl = el.querySelector('.trend-tip');
  this.legendEl = el.querySelector('.trend-legend');
  this.bind();
  this.render();
  if (window.ResizeObserver) {
    var w = el.clientWidth;
    this.ro = new ResizeObserver(function () { if (Math.abs(el.clientWidth - w) > 4) { w = el.clientWidth; self.render(); } });
    this.ro.observe(el);
    CB.onUnmount(function () { self.ro.disconnect(); });
  }
};

CB.Trend.prototype.set = function (patch) { Object.assign(this.cfg, patch); if (patch.t0 != null) this.view = [this.cfg.t0, this.cfg.t1]; this.render(); };
CB.Trend.prototype.reset = function () { this.view = [this.cfg.t0, this.cfg.t1]; this.render(); this.changed(); };
CB.Trend.prototype.zoomBy = function (f) {
  var c = (this.view[0] + this.view[1]) / 2, span = (this.view[1] - this.view[0]) * f;
  this.setView(c - span / 2, c + span / 2);
};
CB.Trend.prototype.panBy = function (f) { var span = this.view[1] - this.view[0]; this.setView(this.view[0] + span * f, this.view[1] + span * f); };
CB.Trend.prototype.setView = function (a, b) {
  var min = this.cfg.t0, max = this.cfg.t1, span = Math.max(b - a, 30 * CB.MIN);
  span = Math.min(span, max - min);
  a = CB.clamp(a, min, max - span);
  this.view = [a, a + span];
  this.render();
  this.changed();
};
CB.Trend.prototype.changed = function () { if (this.cfg.onView) this.cfg.onView(this.view[0], this.view[1]); };

/* Data for the current view: the step shrinks as you zoom in, down to the logger cadence. */
CB.Trend.prototype.data = function () {
  var span = (this.view[1] - this.view[0]) / CB.MIN;
  var step = Math.max(this.cfg.minStep || 5, Math.ceil(span / 480 / 5) * 5);
  this.step = step;
  var v0 = this.view[0], v1 = this.view[1];
  return this.cfg.series.map(function (s) { return s.get(v0 - step * CB.MIN, v1 + step * CB.MIN, step); });
};

CB.Trend.prototype.render = function () {
  var cfg = this.cfg, self = this;
  var W = Math.max(320, this.el.clientWidth || 800), H = cfg.height || 340;
  var series = cfg.series, data = this.data();
  // axes per unit, in order of first appearance among visible series
  var units = [];
  series.forEach(function (s, i) { if (!self.hidden[i] && units.indexOf(s.unit) < 0) units.push(s.unit); });
  if (!units.length) units = [series[0] ? series[0].unit : ''];
  var nRight = Math.max(0, units.length - 1);
  var pl = 52, pr = 16 + nRight * 50, pt = 12, pb = 28, iw = W - pl - pr, ih = H - pt - pb;
  this.geom = { pl: pl, pr: pr, pt: pt, pb: pb, iw: iw, ih: ih, W: W, H: H };
  var t0 = this.view[0], t1 = this.view[1];
  var x = function (t) { return pl + (t - t0) / (t1 - t0) * iw; };
  // y domains
  var dom = {};
  units.forEach(function (u) {
    var lo = Infinity, hi = -Infinity;
    series.forEach(function (s, i) {
      if (self.hidden[i] || s.unit !== u) return;
      data[i].forEach(function (p) { if (p[1] != null && p[0] >= t0 && p[0] <= t1) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); } });
      if (cfg.thresholds && s.th) [s.th.warn, s.th.crit].forEach(function (v) { if (v != null && v < hi * 1.6 + 1) hi = Math.max(hi, v * 1.04); });
    });
    if (!isFinite(lo)) { lo = 0; hi = 1; }
    var man = (cfg.scale || {})[u];
    if (man && man.min !== '' && man.min != null && !isNaN(+man.min)) lo = +man.min;
    else { var pad = (hi - lo) * 0.08 || Math.abs(hi) * 0.1 || 1; lo = lo >= 0 && lo - pad < 0 ? 0 : lo - pad; }
    if (man && man.max !== '' && man.max != null && !isNaN(+man.max)) hi = +man.max;
    else hi = hi + ((hi - lo) * 0.08 || 1);
    if (u === '°') { lo = 0; hi = 360; }
    dom[u] = [lo, hi];
  });
  var y = function (u, v) { var d = dom[u]; return pt + ih - (v - d[0]) / (d[1] - d[0]) * ih; };
  this.x = x; this.y = y; this.units = units; this.dataCache = data;

  var cid = CB.uid('cl');
  var s = '<svg class="chart trend-svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '"><defs><clipPath id="' + cid + '"><rect x="' + pl + '" y="' + pt + '" width="' + iw + '" height="' + ih + '"/></clipPath>';
  // breach clip regions per threshold
  var breach = [];
  if (cfg.thresholds) series.forEach(function (sr, i) {
    if (self.hidden[i] || !sr.th || units.indexOf(sr.unit) < 0) return;
    if (sr.th.crit != null) { var yc = y(sr.unit, sr.th.crit); if (yc > pt) { var id = CB.uid('bc'); s += '<clipPath id="' + id + '"><rect x="' + pl + '" y="' + pt + '" width="' + iw + '" height="' + Math.max(0, yc - pt) + '"/></clipPath>'; breach.push({ i: i, clip: id, color: '#ef4444' }); } }
    if (sr.th.warn != null) { var yw = y(sr.unit, sr.th.warn), yc2 = sr.th.crit != null ? Math.max(pt, y(sr.unit, sr.th.crit)) : pt; if (yw > yc2) { var id2 = CB.uid('bw'); s += '<clipPath id="' + id2 + '"><rect x="' + pl + '" y="' + yc2 + '" width="' + iw + '" height="' + (yw - yc2) + '"/></clipPath>'; breach.push({ i: i, clip: id2, color: '#f59e0b' }); } }
  });
  s += '</defs>';

  // time-of-day shading
  if (cfg.shading) {
    var d = new Date(t0); d.setHours(0, 0, 0, 0);
    s += '<g clip-path="url(#' + cid + ')">';
    for (var day = d.getTime() - 86400000; day < t1; day += 86400000) {
      [[0, 7, 'night'], [18, 22, 'evening'], [22, 31, 'night']].forEach(function (b) {
        var a = day + b[0] * CB.HOUR, z = day + b[1] * CB.HOUR;
        if (z < t0 || a > t1) return;
        s += '<rect class="tod-' + b[2] + '" x="' + x(Math.max(a, t0)) + '" y="' + pt + '" width="' + Math.max(0, x(Math.min(z, t1)) - x(Math.max(a, t0))) + '" height="' + ih + '"/>';
      });
    }
    s += '</g>';
  }
  // grid + axes
  units.forEach(function (u, ai) {
    var dd = dom[u], ax = ai === 0 ? pl : W - pr + 8 + (ai - 1) * 50;
    for (var k = 0; k <= 4; k++) {
      var v = dd[0] + (dd[1] - dd[0]) * k / 4, yy = y(u, v);
      if (ai === 0) s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + yy + '" y2="' + yy + '" class="' + (k ? 'c-grid' : 'c-base') + '"/>';
      s += '<text x="' + (ai === 0 ? ax - 8 : ax) + '" y="' + (yy + 3.5) + '" class="c-ax" text-anchor="' + (ai === 0 ? 'end' : 'start') + '">' + CB.Trend.fmt(v, dd[1] - dd[0]) + '</text>';
    }
    var col = series.find(function (sr, i) { return sr.unit === u && !self.hidden[i]; });
    s += '<text x="' + (ai === 0 ? 6 : ax) + '" y="' + (pt - 2) + '" class="c-ax" style="font-weight:600;fill:' + (units.length > 1 && col ? col.color : '#a1a1aa') + '" text-anchor="start">' + CB.esc(u) + '</text>';
  });
  // x ticks
  var span = t1 - t0, stepH = span <= 6 * CB.HOUR ? 1 : span <= 26 * CB.HOUR ? 3 : span <= 4 * 86400000 ? 12 : span <= 16 * 86400000 ? 24 : 24 * 7;
  var tk = new Date(t0); tk.setMinutes(0, 0, 0); tk.setHours(Math.ceil(tk.getHours() / Math.min(stepH, 24)) * Math.min(stepH, 24));
  for (var tt = tk.getTime(); tt <= t1; tt += stepH * CB.HOUR) {
    var dt = new Date(tt), lab = stepH >= 24 ? CB.dateLabel(dt) : (dt.getHours() === 0 ? CB.dateLabel(dt) : CB.stamp24(dt));
    s += '<line x1="' + x(tt) + '" x2="' + x(tt) + '" y1="' + (pt + ih) + '" y2="' + (pt + ih + 4) + '" class="c-base"/><text x="' + x(tt) + '" y="' + (H - 8) + '" class="c-ax" text-anchor="middle">' + lab + '</text>';
  }
  // thresholds
  if (cfg.thresholds) series.forEach(function (sr, i) {
    if (self.hidden[i] || !sr.th) return;
    [['warn', '#f59e0b', 'Warning'], ['crit', '#ef4444', 'Critical']].forEach(function (k) {
      var v = sr.th[k[0]]; if (v == null) return;
      var yy = y(sr.unit, v); if (yy < pt || yy > pt + ih) return;
      s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + yy + '" y2="' + yy + '" stroke="' + k[1] + '" stroke-width="1.2" stroke-dasharray="6 4" opacity=".85"/>' +
        '<text x="' + (W - pr - 4) + '" y="' + (k[0] === 'warn' ? yy + 11 : yy - 4) + '" class="c-ax" text-anchor="end" style="fill:' + k[1] + ';font-weight:600">' + k[2] + ' ' + v + ' · ' + CB.esc(sr.short || sr.name) + '</text>';
    });
  });
  // lines
  s += '<g clip-path="url(#' + cid + ')">';
  var paths = series.map(function (sr, i) {
    if (self.hidden[i]) return '';
    var dd = '', pen = false;
    data[i].forEach(function (p) {
      if (p[1] == null) { pen = false; return; }
      dd += (pen ? 'L' : 'M') + x(p[0]).toFixed(1) + ',' + y(sr.unit, p[1]).toFixed(1); pen = true;
    });
    return dd;
  });
  series.forEach(function (sr, i) {
    if (self.hidden[i] || !paths[i]) return;
    if (sr.area) s += '<path d="' + paths[i] + 'V' + (pt + ih) + 'H' + pl + 'Z" fill="' + sr.color + '" opacity=".06"/>';
    s += '<path d="' + paths[i] + '" fill="none" stroke="' + sr.color + '" stroke-width="' + (sr.width || 1.7) + '" stroke-linejoin="round" stroke-linecap="round"' + (sr.dash ? ' stroke-dasharray="4 4"' : '') + '/>';
  });
  breach.forEach(function (b) { if (paths[b.i]) s += '<g clip-path="url(#' + b.clip + ')"><path d="' + paths[b.i] + '" fill="none" stroke="' + b.color + '" stroke-width="2.6" stroke-linejoin="round"/></g>'; });
  // markers (e.g. alarm times or audio)
  (cfg.markers || []).forEach(function (mk) {
    if (mk.t < t0 || mk.t > t1) return;
    s += '<line x1="' + x(mk.t) + '" x2="' + x(mk.t) + '" y1="' + pt + '" y2="' + (pt + ih) + '" stroke="' + (mk.color || '#ef4444') + '" stroke-width="1" stroke-dasharray="2 3"/><circle cx="' + x(mk.t) + '" cy="' + (pt + 5) + '" r="4" fill="' + (mk.color || '#ef4444') + '"/>';
  });
  s += '</g>';
  s += '<line class="trend-guide" x1="0" x2="0" y1="' + pt + '" y2="' + (pt + ih) + '"/><g class="trend-dots"></g><rect class="trend-sel" x="0" y="' + pt + '" width="0" height="' + ih + '"/>';
  s += '<rect class="trend-hit" x="' + pl + '" y="' + pt + '" width="' + iw + '" height="' + ih + '" style="cursor:' + (this.mode === 'pan' ? 'grab' : 'crosshair') + '"/></svg>';
  this.plot.innerHTML = s;
  this.svg = this.plot.querySelector('svg');

  // legend
  this.legendEl.innerHTML = series.map(function (sr, i) {
    return '<button class="lg-item' + (self.hidden[i] ? ' off' : '') + '" data-i="' + i + '" title="Click to show/hide · double-click to isolate"><i style="background:' + sr.color + '"></i>' + CB.esc(sr.name) + ' <span class="muted">' + CB.esc(sr.unit) + '</span></button>';
  }).join('') + (cfg.shading ? '<span class="lg-tod"><i class="tod-day"></i>Day 07–18<i class="tod-evening"></i>Evening 18–22<i class="tod-night"></i>Night 22–07</span>' : '');
};

CB.Trend.fmt = function (v, range) {
  if (range < 0.5) return v.toFixed(2);
  if (range < 5) return v.toFixed(1);
  if (Math.abs(v) >= 10000) return CB.short(v);
  return String(Math.round(v));
};

CB.Trend.prototype.pointAt = function (clientX) {
  var r = this.svg.getBoundingClientRect(), sx = (clientX - r.left) * (this.geom.W / r.width);
  var t = this.view[0] + (sx - this.geom.pl) / this.geom.iw * (this.view[1] - this.view[0]);
  return { sx: sx, t: t };
};

CB.Trend.prototype.bind = function () {
  var self = this, drag = null;
  this.legendEl.addEventListener('click', function (e) {
    var b = e.target.closest('.lg-item'); if (!b) return;
    var i = +b.getAttribute('data-i');
    clearTimeout(self._lgT);
    self._lgT = setTimeout(function () { self.hidden[i] = !self.hidden[i]; self.render(); }, 180);
  });
  this.legendEl.addEventListener('dblclick', function (e) {
    var b = e.target.closest('.lg-item'); if (!b) return;
    clearTimeout(self._lgT);
    var i = +b.getAttribute('data-i'), only = Object.keys(self.cfg.series).every(function (k) { return +k === i ? !self.hidden[k] : self.hidden[k]; });
    self.cfg.series.forEach(function (_, k) { self.hidden[k] = only ? false : k !== i; });
    self.render();
  });
  this.plot.addEventListener('mousedown', function (e) {
    if (!e.target.classList.contains('trend-hit')) return;
    e.preventDefault();
    var p = self.pointAt(e.clientX);
    drag = { x0: p.sx, cx: e.clientX, v: self.view.slice(), pan: self.mode === 'pan' || e.shiftKey };
  });
  var onMove = function (e) {
    if (!self.svg || !document.body.contains(self.el)) return;
    if (drag) {
      var p = self.pointAt(e.clientX);
      if (drag.pan) {
        var r = self.svg.getBoundingClientRect(), dtt = (e.clientX - drag.cx) / r.width * (self.geom.W / self.geom.iw) * (drag.v[1] - drag.v[0]);
        var min = self.cfg.t0, max = self.cfg.t1, sp = drag.v[1] - drag.v[0], a = CB.clamp(drag.v[0] - dtt, min, max - sp);
        self.view = [a, a + sp]; self.render();
      } else {
        var sel = self.svg.querySelector('.trend-sel'), a2 = Math.max(self.geom.pl, Math.min(drag.x0, p.sx)), b2 = Math.min(self.geom.pl + self.geom.iw, Math.max(drag.x0, p.sx));
        sel.setAttribute('x', a2); sel.setAttribute('width', b2 - a2);
      }
      return;
    }
  };
  var onUp = function (e) {
    if (!drag) return;
    var d = drag; drag = null;
    if (d.pan) { self.changed(); return; }
    var p = self.pointAt(e.clientX);
    if (Math.abs(p.sx - d.x0) < 8) { self.render(); return; }
    var t = function (sx) { return self.view[0] + (sx - self.geom.pl) / self.geom.iw * (self.view[1] - self.view[0]); };
    self.setView(t(Math.min(d.x0, p.sx)), t(Math.max(d.x0, p.sx)));
  };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  CB.onUnmount(function () { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); });
  this.plot.addEventListener('wheel', function (e) {
    if (!e.target.classList.contains('trend-hit') || !(e.ctrlKey || e.metaKey || self.cfg.wheel)) return;
    e.preventDefault();
    var p = self.pointAt(e.clientX), f = e.deltaY > 0 ? 1.25 : 0.8, span = (self.view[1] - self.view[0]) * f, frac = (p.t - self.view[0]) / (self.view[1] - self.view[0]);
    self.setView(p.t - span * frac, p.t + span * (1 - frac));
  }, { passive: false });
  this.plot.addEventListener('mousemove', function (e) {
    if (drag || !e.target.classList.contains('trend-hit')) return;
    var p = self.pointAt(e.clientX), g = self.geom, rows = [], dots = '';
    var guide = self.svg.querySelector('.trend-guide');
    var tSnap = null;
    self.cfg.series.forEach(function (sr, i) {
      if (self.hidden[i]) return;
      var arr = self.dataCache[i], best = null;
      for (var k = 0; k < arr.length; k++) if (best == null || Math.abs(arr[k][0] - p.t) < Math.abs(arr[best][0] - p.t)) best = k;
      if (best == null) return;
      var pt = arr[best]; tSnap = pt[0];
      rows.push('<div class="tr"><span><i style="background:' + sr.color + '"></i>' + CB.esc(sr.name) + '</span><span>' + (pt[1] == null ? 'no data' : CB.fixed(pt[1], sr.dp != null ? sr.dp : 1) + ' ' + CB.esc(sr.unit)) + '</span></div>');
      if (pt[1] != null) dots += '<circle cx="' + self.x(pt[0]) + '" cy="' + self.y(sr.unit, pt[1]) + '" r="3.5" fill="#fff" stroke="' + sr.color + '" stroke-width="2"/>';
    });
    if (tSnap == null) return;
    guide.setAttribute('x1', self.x(tSnap)); guide.setAttribute('x2', self.x(tSnap)); guide.style.opacity = 1;
    self.svg.querySelector('.trend-dots').innerHTML = dots;
    var dt = new Date(tSnap), h = dt.getHours(), tod = h >= 7 && h < 18 ? 'Day' : h >= 18 && h < 22 ? 'Evening' : 'Night';
    self.tipEl.innerHTML = '<b>' + CB.dateLabel(dt) + ' ' + CB.stamp24(dt) + ' <span style="opacity:.6;font-weight:500">· ' + tod + ' · ' + self.step + '-min</span></b>' + rows.join('');
    var r = self.el.getBoundingClientRect(), w = self.tipEl.offsetWidth;
    var lx = e.clientX - r.left + 14; if (lx + w > r.width) lx = e.clientX - r.left - w - 14;
    self.tipEl.style.left = lx + 'px'; self.tipEl.style.top = '10px'; self.tipEl.classList.add('on');
  });
  this.plot.addEventListener('mouseleave', function () {
    self.tipEl.classList.remove('on');
    if (self.svg) { var gd = self.svg.querySelector('.trend-guide'); if (gd) gd.style.opacity = 0; var dd = self.svg.querySelector('.trend-dots'); if (dd) dd.innerHTML = ''; }
  });
};

/* Series transform: raw / zeroed / cumulative / rate of change (per hour). */
CB.transform = function (arr, mode, stepMin) {
  if (mode === 'raw' || !mode) return arr;
  var first = null, acc = 0, prev = null;
  return arr.map(function (p) {
    if (p[1] == null) return [p[0], null];
    if (mode === 'zeroed') { if (first == null) first = p[1]; return [p[0], CB.round(p[1] - first, 3)]; }
    if (mode === 'cumulative') { acc += p[1]; return [p[0], CB.round(acc, 2)]; }
    if (mode === 'rate') { var r = prev == null ? 0 : (p[1] - prev) * (60 / stepMin); prev = p[1]; return [p[0], CB.round(r, 3)]; }
    return p;
  });
};

/* ---------------- Wind / dust rose ----------------
   samples = [{dir, speed, value}] ; o = { sectors, buckets:[edges], calm, calmMode:'centre'|'exclude', mode:'wind'|'dust', size } */
CB.Charts.rose = function (samples, o) {
  o = o || {};
  var N = o.sectors || 16, size = o.size || 360, cx = size / 2, cy = size / 2, R = size / 2 - 34;
  var dust = o.mode === 'dust';
  var edges = o.buckets || (dust ? [0, 10, 20, 30, 45, 50] : [0.5, 2, 4, 6, 8, 10]);
  var calmT = o.calm != null ? o.calm : 0.5;
  var ramp = dust ? ['#fde68a', '#fbbf24', '#f59e0b', '#ea580c', '#dc2626', '#991b1b', '#7f1d1d'] : ['#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#3730a3', '#1e1b4b'];
  var calm = 0, total = 0, bins = CB.range(N).map(function () { return CB.range(edges.length).map(function () { return 0; }); });
  samples.forEach(function (sm) {
    if (sm.dir == null || sm.speed == null) return;
    if (sm.speed < calmT) { calm++; if (o.calmMode !== 'exclude') total++; return; }
    var val = dust ? sm.value : sm.speed;
    if (val == null) return;
    total++;
    var sec = Math.floor(((sm.dir + 180 / N) % 360) / (360 / N));
    var b = 0; for (var k = edges.length - 1; k >= 0; k--) if (val >= edges[k]) { b = k; break; }
    bins[sec][b]++;
  });
  total = total || 1;
  var maxPct = Math.max.apply(null, bins.map(function (s) { return CB.sum(s) / total * 100; }).concat([1]));
  var ringStep = maxPct > 20 ? 10 : maxPct > 10 ? 5 : maxPct > 4 ? 2 : 1, ringMax = Math.ceil(maxPct / ringStep) * ringStep;
  var calmPct = calm / (o.calmMode === 'exclude' ? (total + calm) : total) * 100;
  var r0 = o.calmMode === 'exclude' ? 0 : Math.min(R * 0.18, 8 + calmPct * 0.6);
  var rr = function (pct) { return r0 + (R - r0) * (pct / ringMax); };
  var s = '<svg class="rose" viewBox="0 0 ' + size + ' ' + size + '" style="width:100%;max-width:' + size + 'px">';
  for (var g = ringStep; g <= ringMax; g += ringStep) {
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + rr(g) + '" fill="none" stroke="#ececef"/>';
    s += '<text x="' + (cx + 3) + '" y="' + (cy - rr(g) - 2) + '" class="c-ax">' + g + '%</text>';
  }
  for (var a = 0; a < 16; a++) {
    var an = a * 22.5 * Math.PI / 180;
    s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + R * Math.sin(an)) + '" y2="' + (cy - R * Math.cos(an)) + '" stroke="#f0f0f2"/>';
  }
  ['N', 'E', 'S', 'W'].forEach(function (l, i) {
    var an = i * Math.PI / 2;
    s += '<text x="' + (cx + (R + 16) * Math.sin(an)) + '" y="' + (cy - (R + 16) * Math.cos(an) + 4) + '" text-anchor="middle" style="font:600 12px Inter,sans-serif;fill:#52525b">' + l + '</text>';
  });
  var wdt = 360 / N, gap = N > 24 ? 0.6 : 2;
  bins.forEach(function (sec, i) {
    var acc = 0, mid = i * wdt;
    sec.forEach(function (cnt, b) {
      if (!cnt) return;
      var p0 = acc / total * 100, p1 = (acc + cnt) / total * 100; acc += cnt;
      var a0 = (mid - wdt / 2 + gap / 2) * Math.PI / 180, a1 = (mid + wdt / 2 - gap / 2) * Math.PI / 180;
      var ri = rr(p0), ro = rr(p1);
      var d = 'M' + (cx + ri * Math.sin(a0)) + ',' + (cy - ri * Math.cos(a0)) + 'L' + (cx + ro * Math.sin(a0)) + ',' + (cy - ro * Math.cos(a0)) +
        'A' + ro + ',' + ro + ' 0 0 1 ' + (cx + ro * Math.sin(a1)) + ',' + (cy - ro * Math.cos(a1)) + 'L' + (cx + ri * Math.sin(a1)) + ',' + (cy - ri * Math.cos(a1)) +
        'A' + ri + ',' + ri + ' 0 0 0 ' + (cx + ri * Math.sin(a0)) + ',' + (cy - ri * Math.cos(a0)) + 'Z';
      var lab = b < edges.length - 1 ? edges[b] + '–' + edges[b + 1] : '≥ ' + edges[b];
      s += '<path class="c-arc" d="' + d + '" fill="' + ramp[b] + '" stroke="#fff" stroke-width=".6" data-tip="' + CB.tip('From ' + CB.compass(mid) + ' (' + Math.round(mid) + '°)', [[ramp[b], lab + (dust ? ' µg/m³' : ' m/s'), CB.fixed(cnt / total * 100, 1) + '%'], ['', 'Sector total', CB.fixed(CB.sum(sec) / total * 100, 1) + '%']]) + '"/>';
    });
  });
  if (r0 > 0) s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r0 + '" fill="#fff" stroke="#e0e0e5"/><text x="' + cx + '" y="' + (cy + 3) + '" text-anchor="middle" style="font:600 9.5px Inter,sans-serif;fill:#71717a">' + CB.fixed(calmPct, 1) + '%</text>';
  s += '</svg>';
  var lg = '<div class="rose-legend">' + edges.map(function (e, b) {
    return '<span><i style="background:' + ramp[b] + '"></i>' + (b < edges.length - 1 ? e + '–' + edges[b + 1] : '≥ ' + e) + '</span>';
  }).join('') + '<span class="muted">' + (dust ? 'PM10 µg/m³' : 'm/s') + '</span></div>' +
    '<div class="tiny muted" style="margin-top:6px">Calms (&lt; ' + calmT + ' m/s): ' + CB.fixed(calmPct, 1) + '% · ' + (o.calmMode === 'exclude' ? 'excluded from frequencies' : 'shown in centre circle') + ' · ' + samples.length.toLocaleString('en-AU') + ' samples</div>';
  return '<div class="rose-wrap">' + s + lg + '</div>';
};

/* Rose samples for a site over a period. */
CB.roseSamples = function (s, t0, t1, stepMin) {
  var out = [];
  for (var t = CB.align(t0, stepMin); t <= t1; t += stepMin * CB.MIN) {
    var dir = CB.val(s, 'wd', t);
    if (dir == null) continue;
    out.push({ dir: dir, speed: CB.val(s, 'ws', t), value: s.params.indexOf('pm10') >= 0 ? CB.val(s, 'pm10', t) : null });
  }
  return out;
};
