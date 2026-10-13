/* =========================================================
   CBased Environmental prototype, geographic maps (Leaflet).
   Street / satellite / terrain base styles and crisp state-coloured
   markers whose names appear on hover. Maps are created after a
   screen mounts and removed on unmount.
   ========================================================= */
CB.Maps = {
  STYLES: {
    street: { label: 'Street', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', attr: '&copy; Esri, HERE, Garmin, OpenStreetMap', cls: 'pp-base', native: 16 },
    satellite: { label: 'Satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: 'Imagery &copy; Esri, Maxar, Earthstar Geographics', native: 18 },
    terrain: { label: 'Terrain', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', attr: '&copy; Esri, USGS, NOAA', native: 18 }
  },
  mode: 'satellite',

  make: function (elId, opts) {
    opts = opts || {};
    var el = document.getElementById(elId);
    if (!el) return null;
    if (typeof L === 'undefined') {
      el.innerHTML = '<div class="map-fallback">Map tiles need an internet connection.<br>Everything else in the prototype works offline.</div>';
      return null;
    }
    el.classList.add('pp-map');
    var m = L.map(el, { scrollWheelZoom: !!opts.wheel, zoomControl: false, attributionControl: true, minZoom: 3, zoomSnap: 0.25 });
    m.attributionControl.setPrefix(false);
    L.control.zoom({ position: 'bottomright' }).addTo(m);
    m._cb = { markers: {}, layers: {}, mode: opts.mode || CB.Maps.mode, padLeft: 0, home: null };
    Object.keys(CB.Maps.STYLES).forEach(function (k) {
      var st = CB.Maps.STYLES[k];
      m._cb.layers[k] = L.tileLayer(st.url, { attribution: st.attr, maxZoom: 19, maxNativeZoom: st.native, className: st.cls || '' });
    });
    if (opts.styles !== false) {
      var Toggle = L.Control.extend({
        options: { position: 'topright' },
        onAdd: function () {
          var d = L.DomUtil.create('div', 'map-seg');
          d.innerHTML = Object.keys(CB.Maps.STYLES).map(function (k) { return '<button data-mode="' + k + '">' + CB.Maps.STYLES[k].label + '</button>'; }).join('');
          L.DomEvent.disableClickPropagation(d);
          d.querySelectorAll('button').forEach(function (b) {
            b.addEventListener('click', function () { m._cb.mode = CB.Maps.mode = b.getAttribute('data-mode'); CB.Maps.sync(m); });
          });
          m._cb.toggle = d;
          return d;
        }
      });
      new Toggle().addTo(m);
      var Home = L.Control.extend({
        options: { position: 'topright' },
        onAdd: function () {
          var b = L.DomUtil.create('button', 'map-home');
          b.innerHTML = CB.icon('back', 'ico') + 'All sites';
          L.DomEvent.disableClickPropagation(b);
          b.addEventListener('click', function () { CB.Maps.fit(m, m._cb.home.points, m._cb.home.pad, true); });
          m._cb.homeBtn = b;
          return b;
        }
      });
      new Home().addTo(m);
    }
    m.setView(opts.center || [-32.45, 151.0], opts.zoom || 10);
    CB.Maps.sync(m);
    m.on('zoomend', function () { if (m._cb.homeBtn) m._cb.homeBtn.style.display = m._cb.home && m._cb.home.points.length > 1 && m.getZoom() >= 12 ? '' : 'none'; });
    CB.onUnmount(function () { try { m.stop(); m.off(); m.remove(); } catch (e) { /* removed mid-animation */ } });
    setTimeout(function () { try { m.invalidateSize(); } catch (e) { /* map was removed */ } }, 60);
    return m;
  },

  sync: function (m) {
    var p = m._cb;
    Object.keys(p.layers).forEach(function (k) {
      if (k === p.mode && !m.hasLayer(p.layers[k])) p.layers[k].addTo(m);
      if (k !== p.mode && m.hasLayer(p.layers[k])) m.removeLayer(p.layers[k]);
    });
    m.getContainer().classList.toggle('is-sat', p.mode === 'satellite');
    if (p.toggle) p.toggle.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-mode') === p.mode); });
  },

  /* State-coloured site marker. o = { state, label, value, onClick, key, size, permanent } */
  marker: function (m, s, o) {
    if (!m) return null;
    o = o || {};
    var st = CB.STATE[o.state || CB.siteState(s)];
    var size = o.size || 18;
    var html = '<div class="mk' + (o.state === 'alarm' ? ' mk-halo' : '') + (o.permanent ? ' mk-on' : '') + '" style="--c:' + st.color + ';--s:' + size + 'px">' +
      '<span class="mk-dot">' + (o.glyph ? CB.icon(o.glyph, 'mk-g') : '') + '</span>' +
      '<span class="mk-lbl"><b>' + CB.esc(s.name) + '</b>' + (o.value ? '<em>' + o.value + '</em>' : '') + '</span></div>';
    var mk = L.marker([s.lat, s.lng], {
      icon: L.divIcon({ className: 'mk-icon', html: html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] }),
      riseOnHover: true, keyboard: false
    }).addTo(m);
    if (o.onClick) mk.on('click', function () { o.onClick(s, mk); });
    m._cb.markers[s.id] = mk;
    return mk;
  },

  fit: function (m, points, pad, animate) {
    if (!m || !points.length) return;
    pad = pad || 40;
    m._cb.home = { points: points, pad: pad };
    var apply = function (fly) {
      m.invalidateSize();
      if (points.length === 1) { m[fly ? 'flyTo' : 'setView'](points[0], 14); return; }
      var opt = { paddingTopLeft: [pad + m._cb.padLeft, pad], paddingBottomRight: [pad + 30, pad], maxZoom: 14 };
      if (fly) m.flyToBounds(L.latLngBounds(points), Object.assign(opt, { duration: 1.1 })); else m.fitBounds(L.latLngBounds(points), opt);
    };
    if (animate) { apply(true); return; }
    apply();
    setTimeout(function () { try { apply(); } catch (e) { /* map was removed */ } }, 80);
  },

  flyTo: function (m, s, zoom) {
    if (!m) return;
    var target = m.unproject(m.project([s.lat, s.lng], zoom || 14).subtract([m._cb.padLeft / 2, 0]), zoom || 14);
    m.flyTo(target, zoom || 14, { duration: 1.1 });
  },

  highlight: function (m, id, on) {
    var mk = m && m._cb.markers[id], n = mk && mk.getElement();
    if (n) { n.querySelector('.mk').classList.toggle('mk-on', on); n.style.zIndex = on ? 2000 : ''; }
  }
};
