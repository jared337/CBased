/* =========================================================
   CBased Environmental prototype, SVG chart kit.
   Every function returns an HTML/SVG string. Hover detail uses
   data-tip attributes, rendered by the shared tooltip in app.js.
   ========================================================= */
/* Restrained palette: indigo for data, neutral grey for comparison; green/amber/red stay semantic. */
CB.C = { blue: '#4f46e5', teal: '#6366f1', purple: '#4f46e5', orange: '#a1a1aa', pink: '#818cf8', slate: '#a1a1aa', green: '#10b981', red: '#ef4444', amber: '#f59e0b', light: '#c7d2fe' };

/* Build tooltip markup: title plus rows of [colour, label, value]. */
CB.tip = function (title, rows) {
  return CB.esc('<b>' + CB.esc(title) + '</b>' + (rows || []).map(function (r) {
    return '<div class="tr"><span>' + (r[0] ? '<i style="background:' + r[0] + '"></i>' : '') + CB.esc(r[1]) + '</span><span>' + CB.esc(r[2]) + '</span></div>';
  }).join(''));
};

/* Reverse CB.esc, for setting a CB.tip value through setAttribute. */
CB.decodeTip = function (s) {
  return s.replace(/&(amp|lt|gt|quot|#39);/g, function (m, k) { return { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" }[k]; });
};

CB.Charts = (function () {
  var W = 600;

  function niceMax(v) {
    if (!(v > 0)) return 1;
    var p = Math.pow(10, Math.floor(Math.log10(v)));
    var n = v / p;
    var m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
    return m * p;
  }

  function yAxis(max, pl, pr, pt, ih, fmt) {
    var s = '';
    for (var k = 0; k <= 4; k++) {
      var v = max * k / 4, y = pt + ih - ih * k / 4;
      s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y + '" y2="' + y + '" class="' + (k ? 'c-grid' : 'c-base') + '"/>';
      s += '<text x="' + (pl - 8) + '" y="' + (y + 3.5) + '" class="c-ax" text-anchor="end">' + fmt(v) + '</text>';
    }
    return s;
  }

  function legend(series) {
    return '<div class="c-legend">' + series.filter(function (s) { return s.name; }).map(function (s) {
      return '<span style="color:' + s.color + '"><i class="' + (s.dash ? 'dash' : '') + '" style="background:' + s.color + '"></i><span style="color:var(--ink-2)">' + CB.esc(s.name) + '</span></span>';
    }).join('') + '</div>';
  }

  /* Smooth curve through points (Catmull-Rom → Bézier), clamped to the plot area. */
  function smooth(pts, top, bottom) {
    if (pts.length < 3) return pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join('');
    var d = 'M' + pts[0][0].toFixed(1) + ',' + pts[0][1].toFixed(1);
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      var c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = CB.clamp(p1[1] + (p2[1] - p0[1]) / 6, top, bottom);
      var c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = CB.clamp(p2[1] - (p3[1] - p1[1]) / 6, top, bottom);
      d += 'C' + c1x.toFixed(1) + ',' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ',' + c2y.toFixed(1) + ' ' + p2[0].toFixed(1) + ',' + p2[1].toFixed(1);
    }
    return d;
  }

  /* Line / area chart. o = { labels, series:[{name,values,color,area,dash,width,dots}], height, yFmt, band:{lo,hi,color}, marker, markerLabel, xTicks, max, legend, wide } */
  function line(o) {
    W = o.wide ? 1000 : 600; // wide charts keep a sensible height at full card width
    var H = o.height || 220, pl = 44, pr = 12, pt = 14, pb = 26, iw = W - pl - pr, ih = H - pt - pb;
    var n = o.labels.length, fmt = o.yFmt || CB.short;
    var vals = [];
    o.series.forEach(function (s) { s.values.forEach(function (v) { if (v != null) vals.push(v); }); });
    if (o.band) o.band.hi.forEach(function (v) { if (v != null) vals.push(v); });
    var max = o.max || niceMax(Math.max.apply(null, vals.concat([1])) * 1.05);
    var x = function (i) { return pl + (n <= 1 ? iw / 2 : i * iw / (n - 1)); };
    var y = function (v) { return pt + ih - (v / max) * ih; };
    var gid = CB.uid('g');
    var s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img"><defs>' +
      o.series.map(function (sr, j) { return '<linearGradient id="' + gid + j + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + sr.color + '" stop-opacity=".22"/><stop offset="1" stop-color="' + sr.color + '" stop-opacity="0"/></linearGradient>'; }).join('') +
      '</defs>';
    s += yAxis(max, pl, pr, pt, ih, fmt);

    if (o.band) {
      var hiPts = [], loPts = [];
      o.band.hi.forEach(function (v, i) { if (v != null) { hiPts.push(x(i) + ',' + y(v)); loPts.unshift(x(i) + ',' + y(o.band.lo[i])); } });
      if (hiPts.length) s += '<polygon class="c-area" points="' + hiPts.concat(loPts).join(' ') + '" fill="' + (o.band.color || CB.C.blue) + '" fill-opacity=".1"/>';
    }

    o.series.forEach(function (sr, j) {
      // split into runs of non-null values
      var runs = [], cur = [];
      sr.values.forEach(function (v, i) {
        if (v == null) { if (cur.length) runs.push(cur); cur = []; return; }
        cur.push([x(i), y(v)]);
      });
      if (cur.length) runs.push(cur);
      runs.forEach(function (run) {
        var d = smooth(run, pt, pt + ih);
        if (sr.area) s += '<path class="c-area" d="' + d + 'L' + run[run.length - 1][0] + ',' + (pt + ih) + 'L' + run[0][0] + ',' + (pt + ih) + 'Z" fill="url(#' + gid + j + ')"/>';
        s += '<path ' + (sr.dash ? 'class="c-area"' : 'class="c-line" pathLength="1"') + ' d="' + d + '" fill="none" stroke="' + sr.color + '" stroke-width="' + (sr.width || 2.2) + '" stroke-linejoin="round" stroke-linecap="round"' + (sr.dash ? ' stroke-dasharray="5 5"' : '') + '/>';
        if (sr.dots) { var last = run[run.length - 1]; s += '<circle class="c-area" cx="' + last[0] + '" cy="' + last[1] + '" r="4.5" fill="#fff" stroke="' + sr.color + '" stroke-width="2.5"/>'; }
      });
    });

    if (o.marker != null) {
      s += '<line x1="' + x(o.marker) + '" x2="' + x(o.marker) + '" y1="' + pt + '" y2="' + (pt + ih) + '" stroke="#a1a1aa" stroke-dasharray="3 4" stroke-width="1"/>';
      if (o.markerLabel) s += '<text x="' + (x(o.marker) + 6) + '" y="' + (pt + 10) + '" class="c-ax" style="font-weight:600;fill:#52525b">' + o.markerLabel + '</text>';
    }

    var step = Math.max(1, Math.ceil(n / (o.xTicks || 8)));
    o.labels.forEach(function (l, i) {
      if (i % step === 0) s += '<text x="' + x(i) + '" y="' + (H - 7) + '" class="c-ax" text-anchor="middle">' + CB.esc(l) + '</text>';
    });

    // hover columns: guide line, dots and tooltip per x position
    var hw = n > 1 ? iw / (n - 1) : iw;
    o.labels.forEach(function (l, i) {
      var rows = o.series.filter(function (sr) { return sr.values[i] != null && sr.name; }).map(function (sr) { return [sr.color, sr.name, fmt(sr.values[i])]; });
      if (o.band && o.band.hi[i] != null && o.band.lo[i] != null) rows.push(['', 'Range', fmt(o.band.lo[i]) + '–' + fmt(o.band.hi[i])]);
      if (!rows.length) return;
      s += '<g class="c-col" data-tip="' + CB.tip(l, rows) + '"><rect class="c-hit" x="' + (x(i) - hw / 2) + '" y="' + pt + '" width="' + hw + '" height="' + ih + '"/>' +
        '<line class="c-guide" x1="' + x(i) + '" x2="' + x(i) + '" y1="' + pt + '" y2="' + (pt + ih) + '"/>' +
        o.series.filter(function (sr) { return sr.values[i] != null && sr.name; }).map(function (sr) { return '<circle class="c-dot" cx="' + x(i) + '" cy="' + y(sr.values[i]) + '" r="4" fill="#fff" stroke="' + sr.color + '" stroke-width="2"/>'; }).join('') + '</g>';
    });
    s += '</svg>';
    if (o.legend !== false && o.series.length > 1) s += legend(o.series);
    return s;
  }

  /* Grouped / single vertical bars. o = { labels, series:[{name,values,color}], height, yFmt, colorFn, xTicks, max, wide } */
  function bars(o) {
    W = o.wide ? 1000 : 600;
    var H = o.height || 200, pl = 44, pr = 8, pt = 14, pb = 26, iw = W - pl - pr, ih = H - pt - pb;
    var n = o.labels.length, fmt = o.yFmt || CB.short, k = o.series.length;
    var vals = [];
    o.series.forEach(function (s) { s.values.forEach(function (v) { if (v != null) vals.push(v); }); });
    var max = o.max || niceMax(Math.max.apply(null, vals.concat([1])) * 1.05);
    var gw = iw / n, bw = Math.min(30, gw * 0.7 / k);
    var s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img">' + yAxis(max, pl, pr, pt, ih, fmt);
    for (var i = 0; i < n; i++) {
      var gx = pl + gw * i + (gw - bw * k) / 2;
      var rows = [];
      o.series.forEach(function (sr, j) {
        var v = sr.values[i];
        if (v == null) return;
        var h = Math.max(0, (v / max) * ih);
        var c = o.colorFn ? o.colorFn(v, i, j) : sr.color;
        rows.push([c, sr.name || 'Value', fmt(v)]);
        var r = Math.min(4, (bw - 2) / 2, h / 2);
        var bx = gx + j * bw, by = pt + ih - h, w = bw - 2;
        // rounded top corners only
        var d = 'M' + bx + ',' + (pt + ih) + 'V' + (by + r) + 'Q' + bx + ',' + by + ' ' + (bx + r) + ',' + by + 'H' + (bx + w - r) + 'Q' + (bx + w) + ',' + by + ' ' + (bx + w) + ',' + (by + r) + 'V' + (pt + ih) + 'Z';
        s += '<path class="c-bar" style="animation-delay:' + Math.min(i * 14, 420) + 'ms" d="' + d + '" fill="' + c + '"/>';
      });
      if (rows.length) s += '<rect class="c-hit" data-tip="' + CB.tip(o.labels[i], rows) + '" x="' + (pl + gw * i) + '" y="' + pt + '" width="' + gw + '" height="' + ih + '"/>';
    }
    var step = Math.max(1, Math.ceil(n / (o.xTicks || 12)));
    o.labels.forEach(function (l, i) {
      if (i % step === 0) s += '<text x="' + (pl + gw * i + gw / 2) + '" y="' + (H - 7) + '" class="c-ax" text-anchor="middle">' + CB.esc(l) + '</text>';
    });
    s += '</svg>';
    if (k > 1 && o.legend !== false) s += legend(o.series);
    return s;
  }

  /* Horizontal bar list (HTML). items = [{label, value, color, go, display}] */
  function hbars(items, o) {
    o = o || {};
    var max = o.max || Math.max.apply(null, items.map(function (i) { return i.value; }).concat([1]));
    return '<div class="hb">' + items.map(function (it, i) {
      var attrs = it.go ? ' data-go="' + it.go + '"' : '';
      return '<div class="hb-row' + (it.go ? ' click' : '') + '"' + attrs + '><span class="hb-lbl" title="' + CB.esc(it.label) + '">' + CB.esc(it.label) + '</span><span class="hb-track"><span class="hb-fill" style="width:' + CB.clamp(it.value / max * 100, 0, 100) + '%;background:' + (it.color || CB.C.blue) + ';animation-delay:' + i * 40 + 'ms"></span></span><span class="hb-val">' + (it.display != null ? it.display : (o.fmt || CB.fmt)(it.value)) + '</span></div>';
    }).join('') + '</div>';
  }

  function spark(values, o) {
    o = o || {};
    var w = o.width || 160, h = o.height || 40, c = o.color || CB.C.blue;
    var v = values.filter(function (x) { return x != null; });
    if (!v.length) return '';
    var mx = Math.max.apply(null, v), mn = Math.min.apply(null, v);
    var span = mx - mn || 1;
    var pts = v.map(function (x, i) { return [i * (w - 4) / Math.max(1, v.length - 1) + 2, h - 4 - (x - mn) / span * (h - 8)]; });
    var d = smooth(pts, 2, h - 2);
    var last = pts[pts.length - 1], gid = CB.uid('sp');
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="' + h + '" preserveAspectRatio="none" style="max-width:' + w + 'px;overflow:visible">' +
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c + '" stop-opacity=".18"/><stop offset="1" stop-color="' + c + '" stop-opacity="0"/></linearGradient></defs>' +
      '<path class="c-area" d="' + d + 'L' + last[0] + ',' + h + 'L2,' + h + 'Z" fill="url(#' + gid + ')"/>' +
      '<path class="c-line" pathLength="1" d="' + d + '" fill="none" stroke="' + c + '" stroke-width="1.8" stroke-linecap="round" vector-effect="non-scaling-stroke"/>' +
      '</svg>';
  }

  /* Donut. segs = [{label, value, color}] */
  function donut(segs, o) {
    o = o || {};
    var size = o.size || 150, th = o.thickness || 16, r = (size - th) / 2, C = 2 * Math.PI * r;
    var total = CB.sum(segs.map(function (s) { return s.value; })) || 1;
    var acc = 0;
    var s = '<svg viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" style="flex-shrink:0">';
    s += '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="#f2f2f4" stroke-width="' + th + '"/>';
    segs.forEach(function (sg) {
      var len = sg.value / total * C;
      s += '<circle class="c-arc" data-tip="' + CB.tip(sg.label, [[sg.color, 'Share', Math.round(sg.value / total * 100) + '%']]) + '" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + sg.color + '" stroke-width="' + th + '" stroke-dasharray="' + Math.max(0, len - 3) + ' ' + (C - len + 3) + '" stroke-dashoffset="' + (-acc) + '" transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')"/>';
      acc += len;
    });
    if (o.center) s += '<text x="50%" y="' + (size / 2 + (o.sub ? 3 : 8)) + '" text-anchor="middle" style="font:600 24px Inter,sans-serif;fill:#18181b;letter-spacing:-.03em">' + o.center + '</text>';
    if (o.sub) s += '<text x="50%" y="' + (size / 2 + 21) + '" text-anchor="middle" style="font:500 11px Inter,sans-serif;fill:#a1a1aa">' + o.sub + '</text>';
    s += '</svg>';
    var lg = '<div class="donut-legend">' + segs.map(function (sg) { return '<div><i style="background:' + sg.color + '"></i>' + CB.esc(sg.label) + '<b>' + Math.round(sg.value / total * 100) + '%</b></div>'; }).join('') + '</div>';
    return '<div class="donut-wrap">' + s + (o.legend === false ? '' : lg) + '</div>';
  }

  /* Semicircle gauge. */
  function gauge(value, max, o) {
    o = o || {};
    var p = CB.clamp(value / max, 0, 1);
    var c = o.color || '#4f46e5';
    var s = '<svg viewBox="0 0 220 128" style="width:100%;max-width:' + (o.width || 260) + 'px;margin:0 auto">';
    s += '<path d="M20 112 A90 90 0 0 1 200 112" fill="none" stroke="#f2f2f4" stroke-width="14" stroke-linecap="round"/>';
    s += '<path d="M20 112 A90 90 0 0 1 200 112" fill="none" stroke="' + c + '" stroke-width="14" stroke-linecap="round" pathLength="100" stroke-dasharray="' + (p * 100) + ' 100" style="transition:stroke-dasharray .8s cubic-bezier(.2,.8,.2,1), stroke .8s"/>';
    var a = Math.PI * (1 - 0.85);
    s += '<line x1="' + (110 + 80 * Math.cos(a)) + '" y1="' + (112 - 80 * Math.sin(a)) + '" x2="' + (110 + 100 * Math.cos(a)) + '" y2="' + (112 - 100 * Math.sin(a)) + '" stroke="#a1a1aa" stroke-width="1.5" stroke-linecap="round"/>';
    s += '<text x="110" y="94" text-anchor="middle" style="font:600 30px Inter,sans-serif;fill:#18181b;letter-spacing:-.03em">' + (o.center || Math.round(p * 100) + '%') + '</text>';
    s += '<text x="110" y="113" text-anchor="middle" style="font:500 11px Inter,sans-serif;fill:#a1a1aa">' + (o.sub || '') + '</text>';
    s += '</svg>';
    return s;
  }

  /* Day x hour heat grid. grid = 7 rows x 24 cols */
  var HEAT = ['#f4f4fb', '#dfe1fc', '#b4b9f8', '#8187f0', '#5b54e3', '#3f35c9'];
  function heat(grid, o) {
    o = o || {};
    W = o.wide ? 1000 : 600;
    var rows = o.rowLabels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    var h0 = o.from || 5, h1 = o.to || 23;
    var cols = h1 - h0;
    var pl = 36, pt = 4, cw = (W - pl - 4) / cols, ch = o.wide ? 30 : 22, H = pt + rows.length * ch + 22;
    var max = Math.max.apply(null, grid.map(function (r) { return Math.max.apply(null, r); }));
    var s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '">';
    grid.forEach(function (row, ri) {
      s += '<text x="' + (pl - 8) + '" y="' + (pt + ri * ch + ch / 2 + 4) + '" class="c-ax" text-anchor="end">' + rows[ri] + '</text>';
      for (var h = h0; h < h1; h++) {
        var v = row[h] / max;
        var col = HEAT[Math.min(5, Math.floor(v * 5.99))];
        s += '<rect class="c-cell" data-tip="' + CB.tip(rows[ri] + ' · ' + CB.hourLabel(h), [[col, 'Activity', Math.round(v * 100) + '% of peak']]) + '" x="' + (pl + (h - h0) * cw + 1.5) + '" y="' + (pt + ri * ch + 1.5) + '" width="' + (cw - 3) + '" height="' + (ch - 3) + '" rx="4" fill="' + col + '"/>';
      }
    });
    for (var hh = h0; hh < h1; hh += 2) s += '<text x="' + (pl + (hh - h0) * cw + cw / 2) + '" y="' + (H - 6) + '" class="c-ax" text-anchor="middle">' + CB.hourLabel(hh) + '</text>';
    s += '</svg>';
    s += '<div class="c-legend" style="align-items:center;gap:6px">Quiet' + HEAT.map(function (c) { return '<i style="background:' + c + ';border-radius:3px;width:16px;margin:0"></i>'; }).join('') + 'Busiest</div>';
    return s;
  }

  /* Score ring */
  function ring(score, o) {
    o = o || {};
    var size = o.size || 140, th = 10, r = (size - th) / 2, C = 2 * Math.PI * r;
    var c = CB.scoreColor(score);
    return '<div class="score-ring" style="width:' + size + 'px;height:' + size + 'px"><svg viewBox="0 0 ' + size + ' ' + size + '"><circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="#f2f2f4" stroke-width="' + th + '"/><circle class="c-line" pathLength="1" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + c + '" stroke-width="' + th + '" stroke-linecap="round" style="stroke-dasharray:' + (score / 100) + ' 1;stroke-dashoffset:0;animation:none" transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')"/></svg><div class="v"><div>' + score + '<small>' + (o.label || 'of 100') + '</small></div></div></div>';
  }

  function meter(p, color) {
    return '<div class="meter"><span style="width:' + CB.clamp(p * 100, 0, 100) + '%;background:' + (color || '#4f46e5') + '"></span></div>';
  }

  return { line: line, bars: bars, hbars: hbars, spark: spark, donut: donut, gauge: gauge, heat: heat, ring: ring, meter: meter, niceMax: niceMax };
})();
