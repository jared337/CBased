/* =========================================================
   CBased Environmental prototype, spec registry and mock data.
   Values are generated from a seeded model of each parameter
   (diurnal cycle, smooth noise, scripted events) so every screen
   agrees with every other and the "live" values move over time.
   ========================================================= */
CB.T0 = Date.now();
CB.MIN = 60000;
CB.HOUR = 3600000;

CB.state = { role: 'admin', client: 'hvo', pvOpen: false, refresh: 30 };

/* ---------------- Roles ---------------- */
CB.ROLES = {
  admin: { label: 'CBE Admin', who: 'Sarah Mitchell', title: 'Monitoring Operations Lead', org: 'CBased Environmental' },
  client: { label: 'App User (Client)', who: 'Daniel Hughes', title: 'Environment & Community Superintendent', org: 'Hunter Valley Operations' }
};

/* ---------------- Screens (spec ids, phase, nav) ---------------- */
CB.SCREENS = [
  { id: 'login', name: 'Login', phase: 1, roles: ['admin', 'client'] },
  { id: 'admin_home', name: 'Portfolio Overview', phase: 1, roles: ['admin'], route: '/home', icon: 'home', section: 'view' },
  { id: 'client_home', name: 'Home', phase: 1, roles: ['client'], route: '/home', icon: 'home', section: 'view' },
  { id: 'site_map', name: 'Site Map', phase: 1, roles: ['admin', 'client'], route: '/map', icon: 'map', section: 'view' },
  { id: 'dashboards', name: 'Dashboards', phase: 1, roles: ['admin', 'client'], route: '/dashboards', icon: 'dash', section: 'view' },
  { id: 'chart_explorer', name: 'Chart Explorer', phase: 1, roles: ['admin', 'client'], route: '/charts', icon: 'trend', section: 'view' },
  { id: 'alarm_console', name: 'Alarms & Events', phase: 1, roles: ['admin', 'client'], route: '/alarms', icon: 'bell', section: 'view' },
  { id: 'audio_browser', name: 'Noise Audio', phase: 1, roles: ['admin', 'client'], route: '/audio', icon: 'volume', section: 'view' },
  { id: 'media_gallery', name: 'Webcam Gallery', phase: 2, roles: ['admin', 'client'], route: '/media', icon: 'camera', section: 'view' },
  { id: 'reports', name: 'Reports', phase: 1, roles: ['admin', 'client'], route: '/reports', icon: 'file', section: 'view' },
  { id: 'data_export', name: 'Data Export & API', phase: 1, roles: ['admin', 'client'], route: '/export', icon: 'download', section: 'view' },
  { id: 'site_detail', name: 'Site Detail', phase: 1, roles: ['admin', 'client'], nav: false },
  { id: 'alarm_setup', name: 'Alarm & Notification Setup', phase: 1, roles: ['admin'], route: '/admin/alarms', icon: 'bolt', section: 'admin' },
  { id: 'admin_clients', name: 'Clients & Users', phase: 1, roles: ['admin'], route: '/admin/clients', icon: 'users', section: 'admin' },
  { id: 'admin_sites', name: 'Sites & Parameters', phase: 1, roles: ['admin'], route: '/admin/sites', icon: 'tree', section: 'admin' },
  { id: 'admin_data_sources', name: 'Data Sources', phase: 1, roles: ['admin'], route: '/admin/sources', icon: 'plug', section: 'admin' },
  { id: 'admin_settings', name: 'Platform Settings', phase: 1, roles: ['admin'], route: '/admin/settings', icon: 'settings', section: 'admin' }
];
CB.screen = function (id) { return CB.SCREENS.find(function (s) { return s.id === id; }); };

/* ---------------- Clients ---------------- */
CB.CLIENTS = [
  { id: 'hvo', name: 'Hunter Valley Operations', short: 'HVO', mark: 'HVO', color: '#0f766e', color2: '#115e59', soft: '#f0fdfa', domain: 'monitoring.hvo.com.au', region: 'Hunter Valley, NSW', contact: 'Daniel Hughes', since: 'Mar 2019', projects: ['HVO North Compliance', 'HVO South Compliance', 'Tailings & Water Management'] },
  { id: 'mtw', name: 'Mount Thorley Warkworth', short: 'MTW', mark: 'MTW', color: '#1d4ed8', color2: '#1e40af', soft: '#eff6ff', domain: 'enviro.mtw.com.au', region: 'Hunter Valley, NSW', contact: 'Rebecca Lawson', since: 'Jul 2018', projects: ['Bulga Community Monitoring', 'Warkworth Extension'] },
  { id: 'bengalla', name: 'Bengalla Mining', short: 'Bengalla', mark: 'BMC', color: '#b45309', color2: '#92400e', soft: '#fffbeb', domain: 'monitoring.bengalla.com.au', region: 'Muswellbrook, NSW', contact: 'Tom Gallagher', since: 'Feb 2020', projects: ['Continuation Project EA Compliance'] },
  { id: 'mangoola', name: 'Mangoola Coal', short: 'Mangoola', mark: 'MGC', color: '#7c3aed', color2: '#6d28d9', soft: '#f5f3ff', domain: 'air.mangoola.com.au', region: 'Wybong, NSW', contact: 'Priya Raman', since: 'Nov 2021', projects: ['Mangoola Open Cut', 'Mangoola Water Program'] },
  { id: 'ravensworth', name: 'Ravensworth', short: 'Ravensworth', mark: 'RAV', color: '#be123c', color2: '#9f1239', soft: '#fff1f2', domain: 'env.ravensworth.com.au', region: 'Ravensworth, NSW', contact: 'Alan Pritchard', since: 'Aug 2017', projects: ['Ravensworth Operations'] },
  { id: 'nel', name: 'North East Link Project', short: 'NEL', mark: 'NEL', color: '#0369a1', color2: '#075985', soft: '#f0f9ff', domain: 'monitoring.nelp-construction.com.au', region: 'Kew & Bulleen, VIC', contact: 'Hannah Ortiz', since: 'Jan 2023', projects: ['Southern Section Construction', 'Bulleen Rd Interchange'] }
];
CB.client = function (id) { return CB.CLIENTS.find(function (c) { return c.id === id; }); };

/* ---------------- Parameter catalogue ----------------
   base / amp (diurnal swing) / peak (hour of max) / jitter (smooth noise) / warn / crit thresholds */
CB.PARAMS = {
  pm10: { name: 'PM10', unit: 'µg/m³', dp: 1, base: 17, amp: 7, peak: 15, jitter: 5, warn: 45, crit: 50, domain: 'Air Quality / Dust', min: 0 },
  pm25: { name: 'PM2.5', unit: 'µg/m³', dp: 1, base: 7, amp: 2.5, peak: 19, jitter: 2, warn: 20, crit: 25, domain: 'Air Quality / Dust', min: 0 },
  tsp: { name: 'TSP', unit: 'µg/m³', dp: 1, base: 34, amp: 14, peak: 15, jitter: 9, warn: 80, crit: 90, domain: 'Air Quality / Dust', min: 0 },
  pm10_1h: { name: 'PM10 1-hr rolling', unit: 'µg/m³', dp: 1, calc: 'avg', src: 'pm10', win: 60, warn: 45, crit: 50, domain: 'Air Quality / Dust' },
  pm10_24h: { name: 'PM10 24-hr rolling', unit: 'µg/m³', dp: 1, calc: 'avg', src: 'pm10', win: 1440, warn: 40, crit: 50, domain: 'Air Quality / Dust' },
  flow: { name: 'Sample flow', unit: 'L/min', dp: 2, base: 16.67, amp: 0.02, peak: 12, jitter: 0.04, domain: 'Air Quality / Dust', min: 0 },
  ws: { name: 'Wind speed', unit: 'm/s', dp: 1, base: 3.4, amp: 2.1, peak: 15, jitter: 1.4, domain: 'Meteorological', min: 0 },
  wd: { name: 'Wind direction', unit: '°', dp: 0, base: 300, amp: 0, peak: 0, jitter: 40, domain: 'Meteorological', dir: true },
  temp: { name: 'Temperature', unit: '°C', dp: 1, base: 19, amp: 7.5, peak: 15, jitter: 1.2, domain: 'Meteorological' },
  rh: { name: 'Relative humidity', unit: '%', dp: 0, base: 58, amp: -20, peak: 15, jitter: 5, domain: 'Meteorological', min: 5, max: 100 },
  rain: { name: 'Rainfall', unit: 'mm', dp: 1, rain: true, domain: 'Meteorological', min: 0 },
  baro: { name: 'Barometric pressure', unit: 'hPa', dp: 1, base: 1014, amp: 1.2, peak: 10, jitter: 2.5, domain: 'Meteorological' },
  solar: { name: 'Solar radiation', unit: 'W/m²', dp: 0, solar: true, domain: 'Meteorological', min: 0 },
  sigma: { name: 'Sigma theta', unit: '°', dp: 1, base: 18, amp: 7, peak: 14, jitter: 4, domain: 'Meteorological', min: 2 },
  laeq: { name: 'LAeq (15 min)', unit: 'dB(A)', dp: 1, base: 39, amp: 5, peak: 13, jitter: 2.6, warn: 45, crit: 50, domain: 'Noise', min: 22 },
  la10: { name: 'LA10', unit: 'dB(A)', dp: 1, base: 42, amp: 5, peak: 13, jitter: 2.8, domain: 'Noise', min: 24 },
  la90: { name: 'LA90', unit: 'dB(A)', dp: 1, base: 33, amp: 4, peak: 13, jitter: 2, domain: 'Noise', min: 18 },
  lamax: { name: 'LAmax', unit: 'dB(A)', dp: 1, base: 56, amp: 7, peak: 13, jitter: 5, warn: 65, crit: 70, domain: 'Noise', min: 30 },
  level: { name: 'Water level', unit: 'm', dp: 2, base: 3.18, amp: 0.02, peak: 16, jitter: 0.05, warn: 4.2, crit: 4.6, domain: 'Water / Hydrology', min: 0 },
  ec: { name: 'Electrical conductivity', unit: 'µS/cm', dp: 0, base: 1460, amp: 25, peak: 15, jitter: 60, warn: 2200, crit: 2500, domain: 'Water / Hydrology', min: 0 },
  ph: { name: 'pH', unit: 'pH', dp: 2, base: 7.62, amp: 0.08, peak: 15, jitter: 0.06, domain: 'Water / Hydrology' },
  turb: { name: 'Turbidity', unit: 'NTU', dp: 1, base: 11, amp: 1, peak: 15, jitter: 3, warn: 50, crit: 100, domain: 'Water / Hydrology', min: 0 },
  wtemp: { name: 'Water temperature', unit: '°C', dp: 1, base: 17.5, amp: 1.6, peak: 17, jitter: 0.3, domain: 'Water / Hydrology' },
  ppv: { name: 'Vibration PPV', unit: 'mm/s', dp: 2, base: 0.06, amp: 0.02, peak: 13, jitter: 0.03, warn: 2, crit: 5, domain: 'Noise', min: 0.01, blast: 'ppv' },
  op: { name: 'Overpressure', unit: 'dB(L)', dp: 1, base: 88, amp: 3, peak: 13, jitter: 2, warn: 115, crit: 120, domain: 'Noise', min: 70, blast: 'op' },
  batt: { name: 'Battery', unit: 'V', dp: 2, base: 12.95, amp: 0.35, peak: 13, jitter: 0.05, warn: 11.8, crit: 11.5, low: true, domain: 'System' },
  ltemp: { name: 'Logger temperature', unit: '°C', dp: 1, base: 26, amp: 9, peak: 15, jitter: 1, domain: 'System' }
};
CB.KIND_PARAMS = {
  dust: ['pm10', 'pm25', 'tsp', 'pm10_1h', 'pm10_24h', 'flow'],
  met: ['ws', 'wd', 'temp', 'rh', 'rain', 'baro', 'solar', 'sigma'],
  noise: ['laeq', 'la10', 'la90', 'lamax'],
  water: ['level', 'ec', 'ph', 'turb', 'wtemp'],
  blast: ['ppv', 'op'],
  camera: []
};
CB.KIND = {
  dust: { label: 'Dust', icon: 'dust', domain: 'Air Quality / Dust' },
  met: { label: 'Weather', icon: 'wind', domain: 'Meteorological' },
  noise: { label: 'Noise', icon: 'volume', domain: 'Noise / Audio' },
  water: { label: 'Water', icon: 'drop', domain: 'Water / Hydrology' },
  blast: { label: 'Blast & vibration', icon: 'wave', domain: 'Noise / Audio' },
  camera: { label: 'Camera', icon: 'camera', domain: 'Camera' }
};

/* ---------------- Sites ----------------
   [id, name, client, project index, kinds, lat, lng, logger, protocol, telemetry, cadence, extras] */
(function () {
  var rows = [
    ['hvo-jp', 'Jerrys Plains Dust & Met', 'hvo', 0, 'dust,met,camera', -32.4968, 150.9113, 'Campbell Scientific CR1000X', 'SFTP', '4G cellular', 5, { events: [{ p: 'pm10', ago: 0.55, w: 1.1, mag: 44 }, { p: 'tsp', ago: 0.55, w: 1.1, mag: 60 }, { p: 'pm10', ago: 98, w: 1.4, mag: 38 }], audio: false }],
    ['hvo-md', 'Maison Dieu Rd Dust', 'hvo', 1, 'dust', -32.5262, 151.0712, 'MACE Envirolog', 'HTTP webhook', '4G cellular', 10, { events: [{ p: 'pm10', ago: 0.3, w: 1.4, mag: 27 }] }],
    ['hvo-np', 'North Pit Weather Station', 'hvo', 0, 'met', -32.4186, 150.9902, 'Campbell Scientific CR1000X', 'CBE pipeline push', 'Iridium satellite', 10, { comms: 47 }],
    ['hvo-td', 'Tailings Dam Water Level', 'hvo', 2, 'water', -32.4511, 150.9584, 'YDOC ML-417', 'MQTT', '4G cellular', 15, { scale: { level: 1.18 } }],
    ['hvo-jpn', 'Jerrys Plains Noise', 'hvo', 0, 'noise', -32.4981, 150.9208, 'Cellvisor CV-Noise', 'HTTP webhook', '4G cellular', 15, { events: [{ p: 'laeq', ago: 0.3, w: 1.5, mag: 6 }, { p: 'la10', ago: 0.3, w: 1.5, mag: 6 }, { p: 'lamax', ago: 0.3, w: 1.0, mag: 10 }], audio: true }],
    ['hvo-kb', 'Kilburnie Noise', 'hvo', 1, 'noise', -32.4702, 150.9204, 'Cellvisor CV-Noise', 'HTTP webhook', '4G cellular', 15, { audio: true }],
    ['hvo-cam', 'Cheshunt Pit Camera', 'hvo', 0, 'camera', -32.4402, 151.0213, 'Cellvisor CV-Cam', 'FTP', '4G cellular', 15, {}],
    ['hvo-lb', 'Lemington Rd Blast Monitor', 'hvo', 1, 'blast', -32.4710, 151.0034, 'dataTaker DT80', 'Email / IMAP', '4G cellular', 5, {}],
    ['hvo-wr', 'Warkworth Rd Dust', 'hvo', 1, 'dust,met', -32.5480, 151.0310, 'Campbell Scientific CR300', 'SFTP', '4G cellular', 5, {}],

    ['mtw-bv', 'Bulga Village Noise', 'mtw', 0, 'noise', -32.6538, 151.0200, 'Cellvisor CV-Noise', 'HTTP webhook', '4G cellular', 15, { events: [{ p: 'laeq', ago: 0.25, w: 1.6, mag: 14 }, { p: 'la10', ago: 0.25, w: 1.6, mag: 13 }], audio: true }],
    ['mtw-ws', 'Wallaby Scrub Rd Dust & Met', 'mtw', 0, 'dust,met,camera', -32.6122, 151.0507, 'Campbell Scientific CR1000X', 'SFTP', '4G cellular', 5, {}],
    ['mtw-cam', 'Warkworth Pit Camera', 'mtw', 1, 'camera', -32.5941, 151.0698, 'Cellvisor CV-Cam', 'S3', '4G cellular', 15, {}],
    ['mtw-cr', 'Charlton Rd Weather', 'mtw', 1, 'met', -32.6301, 151.0988, 'Campbell Scientific CR1000X', 'CBE pipeline push', '4G cellular', 10, {}],
    ['mtw-pr', 'Putty Rd Dust', 'mtw', 0, 'dust', -32.6240, 151.1203, 'MACE Envirolog', 'HTTP webhook', '4G cellular', 10, {}],
    ['mtw-wb', 'Wollombi Brook Gauge', 'mtw', 1, 'water', -32.6412, 151.0398, 'Halytech SpiderMAX', 'Email / IMAP', 'Iridium satellite', 15, {}],
    ['mtw-ir', 'Inlet Rd Vibration', 'mtw', 1, 'blast', -32.6011, 151.1104, 'dataTaker DT80', 'MQTT', '4G cellular', 5, { ppvEvent: { ago: 0.4, mag: 2.6 } }],

    ['ben-br', 'Bengalla Rd Dust & Met', 'bengalla', 0, 'dust,met', -32.2902, 150.8221, 'Campbell Scientific CR1000X', 'SFTP', '4G cellular', 5, {}],
    ['ben-mn', 'Muswellbrook West Noise', 'bengalla', 0, 'noise', -32.2706, 150.8789, 'Cellvisor CV-Noise', 'HTTP webhook', '4G cellular', 15, { audio: true }],
    ['ben-wy', 'Wybong Rd Bore', 'bengalla', 0, 'water', -32.2995, 150.7895, 'YDOC ML-417', 'MQTT', '4G cellular', 15, {}],
    ['ben-cam', 'Bengalla Pit Camera', 'bengalla', 0, 'camera', -32.2851, 150.8401, 'Cellvisor CV-Cam', 'FTP', '4G cellular', 15, {}],

    ['man-ww', 'Wybong Weather', 'mangoola', 0, 'met', -32.3302, 150.6603, 'Campbell Scientific CR1000X', 'CBE pipeline push', '4G cellular', 10, {}],
    ['man-nd', 'Mangoola North Dust', 'mangoola', 0, 'dust', -32.3101, 150.6422, 'MACE Envirolog', 'HTTP webhook', '4G cellular', 10, { batt: 11.62 }],
    ['man-rr', 'Ridgelands Rd Noise', 'mangoola', 0, 'noise', -32.3488, 150.6195, 'Cellvisor CV-Noise', 'HTTP webhook', '4G cellular', 15, { audio: true }],
    ['man-dam', 'Mangoola Clean Water Dam', 'mangoola', 1, 'water', -32.3254, 150.6705, 'Halytech SpiderMAX', 'S3', '4G cellular', 15, {}],

    ['rav-met', 'Ravensworth Met Station', 'ravensworth', 0, 'met', -32.4310, 151.0605, 'Campbell Scientific CR1000X', 'SFTP', '4G cellular', 10, {}],
    ['rav-cv', 'Camberwell Village Dust', 'ravensworth', 0, 'dust', -32.4721, 151.0902, 'MACE Envirolog', 'HTTP webhook', '4G cellular', 10, {}],
    ['rav-void', 'Ravensworth Void 5 Level', 'ravensworth', 0, 'water', -32.4402, 151.0450, 'YDOC ML-417', 'MQTT', '4G cellular', 15, {}],
    ['rav-ll', 'Lake Liddell Noise', 'ravensworth', 0, 'noise', -32.4120, 151.0002, 'Cellvisor CV-Noise', 'HTTP webhook', '4G cellular', 15, { comms: 182 }],

    ['nel-cc', 'Chandler Compound', 'nel', 0, 'dust,met,camera', -37.7952, 145.0183, 'Campbell Scientific CR1000X', 'SFTP', '4G cellular', 1, { events: [{ p: 'pm10', ago: 0.4, w: 0.9, mag: 41 }, { p: 'tsp', ago: 0.4, w: 0.9, mag: 70 }] }],
    ['nel-fd', '7 Fairway Drive', 'nel', 1, 'dust', -37.7728, 145.0698, 'MACE Envirolog', 'HTTP webhook', '4G cellular', 1, {}],
    ['nel-yr', 'Yarra River GHFF', 'nel', 0, 'noise', -37.7911, 145.0312, 'Cellvisor CV-Noise', 'HTTP webhook', '4G cellular', 15, { audio: true }],
    ['nel-ob', 'Old Burke Rd', 'nel', 0, 'noise,blast', -37.7853, 145.0451, 'Cellvisor CV-Noise', 'HTTP webhook', '4G cellular', 15, { audio: true, ppvEvent: { ago: 0.15, mag: 2.3 } }],
    ['nel-wg', 'Willow Grove', 'nel', 0, 'noise', -37.7952, 145.0503, 'Cellvisor CV-Noise', 'HTTP webhook', '4G cellular', 15, { audio: true, events: [{ p: 'laeq', ago: 0.4, w: 1.3, mag: 10 }] }],
    ['nel-gd', 'Guide Dogs Noise 5', 'nel', 0, 'noise', -37.7976, 145.0402, 'Cellvisor CV-Noise', 'HTTP webhook', '4G cellular', 15, { audio: true }],
    ['nel-ps', 'Princess Street', 'nel', 0, 'noise', -37.8021, 145.0298, 'Cellvisor CV-Noise', 'HTTP webhook', '4G cellular', 15, { audio: true }],
    ['nel-lsa', 'LSA 2', 'nel', 1, 'dust', -37.7752, 145.0611, 'MACE Envirolog', 'HTTP webhook', '4G cellular', 1, { events: [{ p: 'pm10', ago: 30, w: 0.6, mag: 120 }] }]
  ];
  CB.SITES = rows.map(function (r) {
    var x = r[11] || {};
    var kinds = r[4].split(',');
    var keys = [];
    kinds.forEach(function (k) { keys = keys.concat(CB.KIND_PARAMS[k]); });
    if (kinds.indexOf('dust') >= 0 && kinds.indexOf('met') < 0 && kinds.length === 1) keys = keys.concat(['ws', 'wd']); // dust-only stations carry a sonic anemometer
    keys = keys.concat(['batt', 'ltemp']);
    var c = CB.client(r[2]);
    return {
      id: r[0], name: r[1], client: r[2], project: c.projects[r[3]], kinds: kinds, lat: r[5], lng: r[6],
      logger: r[7], protocol: r[8], telemetry: r[9], cadence: r[10], params: keys,
      events: x.events || [], comms: x.comms || 0, audio: !!x.audio, scale: x.scale || {}, ppvEvent: x.ppvEvent, batt: x.batt,
      camera: kinds.indexOf('camera') >= 0,
      tz: c.id === 'nel' ? 'Australia/Melbourne' : 'Australia/Sydney',
      elev: Math.round(CB.between(CB.rng(r[0] + 'el'), 60, 190)),
      installed: ['Mar 2019', 'Jun 2020', 'Sep 2021', 'Feb 2022', 'Oct 2023', 'Apr 2024'][CB.hash(r[0]) % 6],
      serial: 'CBE-' + (1000 + CB.hash(r[0]) % 8999)
    };
  });
})();
CB.site = function (id) { return CB.SITES.find(function (s) { return s.id === id; }); };
CB.siteType = function (s) {
  return s.kinds.map(function (k) { return CB.KIND[k].label; }).join(' + ');
};

/* ---------------- Value model ---------------- */
CB._ph = {};
CB.phases = function (key) {
  if (CB._ph[key]) return CB._ph[key];
  var r = CB.rng(key);
  return (CB._ph[key] = [r() * 6.28, r() * 6.28, r() * 6.28, r() * 6.28, 0.85 + r() * 0.3]);
};
CB.noise = function (key, t) {
  var p = CB.phases(key), m = t / CB.MIN;
  return 0.42 * Math.sin(m / 23 + p[0]) + 0.3 * Math.sin(m / 97 + p[1]) + 0.2 * Math.sin(m / 410 + p[2]) + 0.25 * Math.sin(m / 1700 + p[3]);
};
CB.hourOf = function (t) { var d = new Date(t); return d.getHours() + d.getMinutes() / 60; };

/* Raw value of a parameter at time t (ms). Returns null when the site wasn't reporting. */
CB.val = function (s, key, t) {
  if (s.comms && t > CB.T0 - s.comms * CB.MIN) return null;
  var p = CB.PARAMS[key];
  if (p.calc) {
    var n = p.win <= 60 ? 6 : 24, stepM = p.win / n, acc = 0, cnt = 0;
    for (var i = 0; i < n; i++) { var v0 = CB.val(s, p.src, t - i * stepM * CB.MIN); if (v0 != null) { acc += v0; cnt++; } }
    return cnt ? CB.round(acc / cnt, p.dp) : null;
  }
  var h = CB.hourOf(t), k = s.id + key, ph = CB.phases(k), v;
  if (p.dir) {
    // prevailing NW in the morning swinging to SE sea-breeze in the afternoon
    v = 300 + 195 * Math.max(0, Math.sin((h - 9) / 24 * 6.283)) + p.jitter * CB.noise(k, t);
    v = ((v % 360) + 360) % 360;
  } else if (p.rain) {
    var blk = Math.floor(t / (3 * CB.HOUR)), r = CB.rng(s.client + 'rain' + blk)();
    v = r < 0.07 ? Math.max(0, (r * 40) * (0.6 + 0.4 * Math.sin(t / CB.MIN / 13 + ph[0]))) : 0;
  } else if (p.solar) {
    v = Math.max(0, 920 * Math.sin((h - 6) / 13.5 * Math.PI)) * (h > 6 && h < 19.5 ? 1 : 0) * (0.85 + 0.15 * CB.noise(k, t));
  } else {
    v = (p.base * (s.scale[key] || 1) * (key === 'pm10' || key === 'tsp' ? ph[4] : 1)) + p.amp * Math.cos((h - p.peak) / 24 * 6.283) + p.jitter * CB.noise(k, t);
    if (key === 'batt' && s.batt) v = s.batt + 0.05 * CB.noise(k, t);
    if (p.blast) {
      // weekday production blasts around 1pm, plus any scripted recent event
      var day = new Date(t); day.setHours(13, 4 + CB.hash(s.id) % 20, 0, 0);
      var dt = (t - day.getTime()) / CB.MIN, dow = day.getDay();
      if (dow > 0 && dow < 6 && Math.abs(dt) < 15) {
        var mag = CB.rng(s.id + CB.isoDate(day))();
        v += (p.blast === 'ppv' ? 0.4 + mag * 1.4 : 14 + mag * 9) * Math.exp(-dt * dt / 8);
      }
      if (s.ppvEvent) {
        var de = (t - (CB.T0 - s.ppvEvent.ago * CB.HOUR)) / CB.MIN;
        v += (p.blast === 'ppv' ? s.ppvEvent.mag : 24) * Math.exp(-de * de / 40);
      }
    }
  }
  s.events.forEach(function (e) {
    if (e.p !== key) return;
    var d = (t - (CB.T0 - e.ago * CB.HOUR)) / (e.w * CB.HOUR);
    v += e.mag * Math.exp(-d * d);
  });
  if (p.min != null) v = Math.max(p.min, v);
  if (p.max != null) v = Math.min(p.max, v);
  return CB.round(v, p.dp);
};
CB.align = function (t, mins) { var ms = (mins || 5) * CB.MIN; return Math.floor(t / ms) * ms; };
CB.lastTime = function (s) {
  var t = CB.align(Date.now(), s.cadence);
  return s.comms ? CB.align(CB.T0 - s.comms * CB.MIN, s.cadence) : t;
};
CB.latest = function (s, key) { return CB.val(s, key, CB.lastTime(s)); };
/* Series of [t, v] from t0 to t1 at stepMin. */
CB.series = function (s, key, t0, t1, stepMin) {
  var out = [], step = stepMin * CB.MIN;
  for (var t = CB.align(t0, stepMin); t <= t1; t += step) out.push([t, CB.val(s, key, t)]);
  return out;
};
CB.thresholds = function (s, key) {
  var p = CB.PARAMS[key];
  if (key === 'laeq' && s.client === 'nel') return { warn: 50, crit: 55 };
  return { warn: p.warn, crit: p.crit, low: p.low };
};
CB.paramState = function (s, key, v) {
  if (v === undefined) v = CB.latest(s, key);
  if (v == null) return 'comms';
  var th = CB.thresholds(s, key);
  if (th.low) return v <= th.crit ? 'alarm' : v <= th.warn ? 'warning' : 'normal';
  if (th.crit != null && v >= th.crit) return 'alarm';
  if (th.warn != null && v >= th.warn) return 'warning';
  return 'normal';
};
CB.quality = function (s, key, v) {
  if (v == null) return 'Missing';
  if (key === 'flow' && Math.abs(v - 16.67) > 0.3) return 'Suspect';
  if (key === 'wd' && CB.latest(s, 'ws') < 0.5) return 'Calm';
  return 'Valid';
};
CB.fmtVal = function (key, v) { var p = CB.PARAMS[key]; return v == null ? '—' : CB.fixed(v, p.dp); };
CB.fmtUnit = function (key, v) { var p = CB.PARAMS[key]; return v == null ? '—' : CB.fixed(v, p.dp) + (p.unit === '°' ? '°' : ' ' + p.unit); };
CB.compass = function (deg) { return ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'][Math.round(deg / 22.5) % 16]; };

/* Headline parameter for a site, used on markers and lists. */
CB.headline = function (s) {
  if (s.kinds[0] === 'dust') return 'pm10';
  if (s.kinds[0] === 'noise') return 'laeq';
  if (s.kinds[0] === 'water') return 'level';
  if (s.kinds[0] === 'blast') return 'ppv';
  if (s.kinds[0] === 'met') return 'ws';
  return 'batt';
};

/* ---------------- Alarm rules ---------------- */
CB.RULES = [
  { id: 'R-101', name: 'Dust Warning (1 Hour) PM10', monitor: 'dust', client: 'hvo', sites: ['hvo-jp', 'hvo-md', 'hvo-wr'], param: 'pm10_1h', logic: 'threshold',
    tiers: [{ sev: 'warning', op: '>', v: 45 }, { sev: 'critical', op: '>', v: 50 }], days: 'Every day', window: '00:00 – 24:00', delay: 10, deadband: 3,
    email: ['env.team@hvo.com.au', 'daniel.hughes@hvo.com.au'], sms: ['+61 412 555 018', '+61 438 555 241'], groups: ['HVO Environment On-call'],
    message: '{site}: PM10 1-hr average {value} µg/m³ exceeds {threshold}. Check haul road watering and wind direction ({wd}).', interval: 60, suppressNaN: true, enabled: true, fired30: 14 },
  { id: 'R-102', name: 'Dust Exceedance (5 & 60 min) - LSA 135/136', monitor: 'dust', client: 'nel', sites: ['nel-lsa', 'nel-fd', 'nel-cc'], param: 'pm10', logic: 'complex',
    conditions: [{ join: 'IF', p: 'PM10 (5 min avg)', op: '>', v: '150 µg/m³' }, { join: 'AND', p: 'PM10 (60 min avg)', op: '>', v: '50 µg/m³' }, { join: 'AND', p: 'Wind direction', op: 'between', v: '135° – 225° (upwind of receivers)' }, { join: 'OR', p: 'TSP (60 min avg)', op: '>', v: '90 µg/m³' }],
    tiers: [{ sev: 'critical', op: 'match', v: null }], days: 'Mon – Sat', window: '07:00 – 18:00', delay: 5, deadband: 5,
    email: ['nel.enviro@spark-nel.com.au', 'compliance@cbased.com.au'], sms: ['+61 402 555 771'], groups: ['NEL Site Supervisors'],
    message: 'LSA 135/136 dust exceedance at {site}. 5-min {value} µg/m³. Stop dust-generating works and apply suppression.', interval: 30, suppressNaN: true, enabled: true, fired30: 6 },
  { id: 'R-103', name: 'Vibration Warning (15 min)', monitor: 'vibration', client: 'nel', sites: ['nel-ob', 'mtw-ir', 'hvo-lb'], param: 'ppv', logic: 'threshold',
    tiers: [{ sev: 'warning', op: '>', v: 2 }, { sev: 'critical', op: '>', v: 5 }], days: 'Every day', window: '00:00 – 24:00', delay: 0, deadband: 0.2,
    email: ['blast.results@cbased.com.au'], sms: ['+61 455 555 902'], groups: ['Blast Crew Leads'],
    message: 'Vibration {value} mm/s PPV at {site} (15-min peak).', interval: 15, suppressNaN: true, enabled: true, fired30: 9 },
  { id: 'R-104', name: 'EHBA Noise', monitor: 'noise', client: 'nel', sites: ['nel-yr', 'nel-ob', 'nel-wg', 'nel-gd', 'nel-ps'], param: 'laeq', logic: 'rolling', rolling: { x: 3, y: 4 },
    tiers: [{ sev: 'warning', op: '>', v: 50 }, { sev: 'critical', op: '>', v: 55 }], days: 'Every day', window: 'Day / evening / night', delay: 0, deadband: 1,
    dynamic: [{ when: 'Day 07:00 – 18:00', v: '55 / 60 dB(A)' }, { when: 'Evening 18:00 – 22:00', v: '50 / 55 dB(A)' }, { when: 'Night 22:00 – 07:00', v: '45 / 50 dB(A)' }],
    email: ['nel.enviro@spark-nel.com.au'], sms: ['+61 402 555 771', '+61 419 555 334'], groups: ['NEL Night Works Supervisor'],
    message: '{site}: LAeq(15) {value} dB(A) above {threshold} for 3 of the last 4 periods.', interval: 60, suppressNaN: true, enabled: true, fired30: 21 },
  { id: 'R-105', name: 'Comms Fail - North Pit', monitor: 'met', client: 'hvo', sites: ['hvo-np'], param: null, logic: 'comms', stale: 30,
    tiers: [{ sev: 'warning', op: 'no data for', v: '30 min' }, { sev: 'critical', op: 'no data for', v: '2 h' }], days: 'Every day', window: '00:00 – 24:00', delay: 0, deadband: 0,
    email: ['field.ops@cbased.com.au'], sms: ['+61 400 555 118'], groups: ['CBE Field Technicians'],
    message: 'No data received from {site} for {duration}. Last payload {last}.', interval: 120, suppressNaN: false, enabled: true, fired30: 3 },
  { id: 'R-106', name: 'Tailings Dam High Level', monitor: 'water', client: 'hvo', sites: ['hvo-td'], param: 'level', logic: 'threshold',
    tiers: [{ sev: 'info', op: '>', v: 3.9 }, { sev: 'warning', op: '>', v: 4.2 }, { sev: 'critical', op: '>', v: 4.6 }], days: 'Every day', window: '00:00 – 24:00', delay: 15, deadband: 0.05,
    email: ['tailings@hvo.com.au'], sms: ['+61 438 555 241'], groups: ['HVO Dam Safety'],
    message: 'Tailings dam level {value} m (freeboard trigger {threshold}).', interval: 240, suppressNaN: true, enabled: true, fired30: 0 },
  { id: 'R-107', name: 'EA Night Noise - Bulga', monitor: 'noise', client: 'mtw', sites: ['mtw-bv'], param: 'laeq', logic: 'threshold',
    tiers: [{ sev: 'warning', op: '>', v: 45 }, { sev: 'critical', op: '>', v: 50 }], days: 'Every day', window: '22:00 – 07:00', delay: 15, deadband: 1,
    email: ['community@mtw.com.au'], sms: ['+61 401 555 662'], groups: ['MTW Shift Supervisors'],
    message: 'Bulga Village LAeq(15) {value} dB(A). Review dozer and dump locations on the western face.', interval: 30, suppressNaN: true, enabled: true, fired30: 11 },
  { id: 'R-108', name: 'High Wind Dust Risk', monitor: 'met', client: 'hvo', sites: ['hvo-np', 'hvo-jp', 'hvo-wr'], param: 'ws', logic: 'complex',
    conditions: [{ join: 'IF', p: 'Wind speed (10 min avg)', op: '>', v: '8 m/s' }, { join: 'AND', p: 'Wind direction', op: 'between', v: '270° – 330°' }, { join: 'AND', p: 'Relative humidity', op: '<', v: '35 %' }],
    tiers: [{ sev: 'info', op: 'match', v: null }], days: 'Every day', window: '05:00 – 21:00', delay: 30, deadband: 0.5,
    email: ['production.supervisors@hvo.com.au'], sms: [], groups: ['HVO Production'],
    message: 'Predictive: high-wind dust conditions at {site}. Pre-emptively increase watering.', interval: 180, suppressNaN: true, enabled: true, fired30: 4 },
  { id: 'R-109', name: 'Blast Overpressure', monitor: 'vibration', client: 'hvo', sites: ['hvo-lb', 'mtw-ir'], param: 'op', logic: 'threshold',
    tiers: [{ sev: 'warning', op: '>', v: 115 }, { sev: 'critical', op: '>', v: 120 }], days: 'Mon – Fri', window: '09:00 – 17:00', delay: 0, deadband: 0,
    email: ['blast.results@cbased.com.au', 'drill.blast@hvo.com.au'], sms: ['+61 455 555 902'], groups: ['Blast Crew Leads'],
    message: 'Overpressure {value} dB(L) at {site}.', interval: 15, suppressNaN: true, enabled: true, fired30: 1 },
  { id: 'R-110', name: 'Low Battery', monitor: 'met', client: null, sites: 'all', param: 'batt', logic: 'threshold',
    tiers: [{ sev: 'info', op: '<', v: 11.8 }, { sev: 'warning', op: '<', v: 11.5 }], days: 'Every day', window: '00:00 – 24:00', delay: 60, deadband: 0.1,
    email: ['field.ops@cbased.com.au'], sms: [], groups: ['CBE Field Technicians'],
    message: '{site} battery at {value} V. Schedule a solar/battery check.', interval: 720, suppressNaN: true, enabled: true, fired30: 2 },
  { id: 'R-111', name: 'Construction Phase Noise (NEL)', monitor: 'noise', client: 'nel', sites: ['nel-wg', 'nel-gd', 'nel-ps'], param: 'laeq', logic: 'threshold',
    tiers: [{ sev: 'warning', op: '>', v: 52 }, { sev: 'critical', op: '>', v: 57 }], days: 'Mon – Sat', window: '07:00 – 18:00', delay: 15, deadband: 1,
    dynamic: [{ when: 'Construction phase: Tunnel boring (current)', v: '52 / 57 dB(A)' }, { when: 'Construction phase: Surface works', v: '55 / 60 dB(A)' }, { when: 'Construction phase: Demobilisation', v: '50 / 55 dB(A)' }],
    email: ['nel.enviro@spark-nel.com.au'], sms: ['+61 419 555 334'], groups: ['NEL Site Supervisors'],
    message: '{site}: construction noise {value} dB(A) above phase limit {threshold}.', interval: 60, suppressNaN: true, enabled: true, fired30: 7 },
  { id: 'R-112', name: 'Rainfall Discharge Sampling', monitor: 'water', client: 'mangoola', sites: ['man-ww'], param: 'rain', logic: 'rolling', rolling: { x: 1, y: 1 },
    tiers: [{ sev: 'info', op: '>', v: '20 mm / 24 h' }], days: 'Every day', window: '00:00 – 24:00', delay: 0, deadband: 0,
    email: ['water@mangoola.com.au', 'field.ops@cbased.com.au'], sms: [], groups: ['Mangoola Water'],
    message: '{value} mm in 24 h at Wybong. Sediment dam discharge sampling required within 24 h.', interval: 1440, suppressNaN: true, enabled: false, fired30: 0 }
];
CB.rule = function (id) { return CB.RULES.find(function (r) { return r.id === id; }); };
CB.MONITORS = { dust: 'Dust', noise: 'Noise', vibration: 'Vibration / blast', water: 'Water', met: 'Meteorological' };

/* ---------------- Alarm events ---------------- */
(function () {
  var A = [], n = 4810;
  function add(o) { o.id = 'AL-' + (n++); A.push(o); }
  var people = { hvo: ['Daniel Hughes', 'Kate Sullivan'], mtw: ['Rebecca Lawson', 'Josh Kerr'], nel: ['Hannah Ortiz', 'Liam Chen'], bengalla: ['Tom Gallagher'], mangoola: ['Priya Raman'], ravensworth: ['Alan Pritchard'] };
  // currently active, matching live values
  add({ rule: 'R-101', site: 'hvo-jp', param: 'pm10_1h', sev: 'critical', state: 'active', mins: 22, threshold: 50 });
  add({ rule: 'R-101', site: 'hvo-md', param: 'pm10_1h', sev: 'warning', state: 'acknowledged', mins: 14, threshold: 45, ackBy: 'Kate Sullivan', ackMins: 6, ackNote: 'Water cart dispatched to MD haul road ramp. Monitoring.' });
  add({ rule: 'R-105', site: 'hvo-np', param: null, sev: 'warning', state: 'active', mins: 17, threshold: '30 min' });
  add({ rule: 'R-104', site: 'nel-wg', param: 'laeq', sev: 'warning', state: 'active', mins: 11, threshold: 50 });
  add({ rule: 'R-107', site: 'mtw-bv', param: 'laeq', sev: 'critical', state: 'acknowledged', mins: 9, threshold: 50, ackBy: 'Josh Kerr', ackMins: 3, ackNote: 'Dozer D11-04 relocated behind bund. Will review next 15-min period.' });
  add({ rule: 'R-102', site: 'nel-cc', param: 'pm10', sev: 'critical', state: 'active', mins: 18, threshold: '150 / 50' });
  add({ rule: 'R-103', site: 'mtw-ir', param: 'ppv', sev: 'warning', state: 'active', mins: 24, threshold: 2 });
  add({ rule: 'R-103', site: 'nel-ob', param: 'ppv', sev: 'warning', state: 'acknowledged', mins: 9, threshold: 2, ackBy: 'Liam Chen', ackMins: 4, ackNote: 'Rock breaker at OB shaft. Swapped to smaller hammer.' });
  add({ rule: 'R-105', site: 'rav-ll', param: null, sev: 'critical', state: 'active', mins: 152, threshold: '2 h' });
  add({ rule: 'R-110', site: 'man-nd', param: 'batt', sev: 'info', state: 'active', mins: 95, threshold: 11.8 });
  add({ rule: 'R-104', site: 'hvo-jpn', param: 'laeq', sev: 'warning', state: 'active', mins: 13, threshold: 45, ruleName: 'Night Noise - Jerrys Plains' });
  // history: cleared events over the last 21 days
  var cleared = [['R-101', 'hvo-jp', 'pm10_1h'], ['R-101', 'hvo-wr', 'pm10_1h'], ['R-101', 'hvo-md', 'pm10_1h'], ['R-104', 'nel-yr', 'laeq'], ['R-104', 'nel-gd', 'laeq'], ['R-104', 'nel-ps', 'laeq'], ['R-107', 'mtw-bv', 'laeq'], ['R-103', 'hvo-lb', 'ppv'], ['R-103', 'nel-ob', 'ppv'], ['R-102', 'nel-lsa', 'pm10'], ['R-102', 'nel-fd', 'pm10'], ['R-108', 'hvo-np', 'ws'], ['R-109', 'hvo-lb', 'op'], ['R-111', 'nel-wg', 'laeq'], ['R-105', 'hvo-np', null], ['R-110', 'ben-wy', 'batt']];
  var r = CB.rng('alarm-history');
  for (var i = 0; i < 46; i++) {
    var c = cleared[Math.floor(r() * cleared.length)], rule = CB.rule(c[0]), site = CB.site(c[1]);
    var tier = rule.tiers[Math.floor(r() * rule.tiers.length)];
    var mins = Math.round(60 + r() * 21 * 1440), dur = Math.round(10 + r() * 140);
    var who = people[site.client] || ['CBE Operations'];
    var acked = r() < 0.86;
    add({ rule: c[0], site: c[1], param: c[2], sev: tier.sev, state: 'cleared', mins: mins, clearedMins: mins - dur, threshold: tier.v, ackBy: acked ? who[Math.floor(r() * who.length)] : null, ackMins: acked ? mins - Math.round(dur * r()) : null,
      ackNote: acked ? CB.pick(r, ['Checked, wind shift from NW. Watering increased.', 'Source identified, works paused 20 min.', 'Community complaint logged and responded.', 'Sensor maintenance by CBE field tech.', 'Within licence limits once averaged.', 'Blast fired 13:07, results within criteria.', '']) : null });
  }
  A.forEach(function (a) {
    var rule = CB.rule(a.rule), s = CB.site(a.site), t = CB.T0 - a.mins * CB.MIN;
    a.name = a.ruleName || rule.name;
    a.client = s.client;
    a.t = t;
    var v = a.param ? CB.val(s, a.param, a.state === 'cleared' ? t : CB.lastTime(s)) : null;
    if (a.param && a.state === 'cleared') { // historic peaks read as genuine exceedances
      var th = typeof a.threshold === 'number' ? a.threshold : null;
      if (th != null && (v == null || (CB.PARAMS[a.param].low ? v > th : v < th))) v = CB.round(CB.PARAMS[a.param].low ? th - 0.08 : th * (1.04 + 0.12 * CB.rng(a.id)()), CB.PARAMS[a.param].dp);
    }
    if (a.param === 'ppv' && a.state !== 'cleared') v = CB.round(Math.max(v || 0, 2.12 + CB.rng(a.id)() * 0.5), 2);
    a.value = v;
    var rr = CB.rng(a.id + 'n');
    a.notes = [];
    rule.sms.forEach(function (to) { a.notes.push({ chan: 'SMS', to: to, status: rr() < 0.05 ? 'failed → retried → delivered' : 'delivered', secs: Math.round(4 + rr() * 9) }); });
    rule.email.forEach(function (to) { a.notes.push({ chan: 'Email', to: to, status: 'delivered', secs: Math.round(2 + rr() * 5) }); });
  });
  CB.ALARMS = A.sort(function (a, b) { return a.mins - b.mins; });
})();
CB.alarm = function (id) { return CB.ALARMS.find(function (a) { return a.id === id; }); };
CB.SEV = { critical: { cls: 'st-bad', label: 'Critical' }, warning: { cls: 'st-warn', label: 'Warning' }, info: { cls: 'st-info', label: 'Info' } };

/* ---------------- Site state ---------------- */
CB.siteState = function (s) {
  if (s.comms) return 'comms';
  var st = 'normal';
  CB.ALARMS.forEach(function (a) {
    if (a.site !== s.id || a.state === 'cleared') return;
    if (a.sev === 'critical') st = 'alarm';
    else if (a.sev === 'warning' && st !== 'alarm') st = 'warning';
  });
  s.params.forEach(function (k) {
    if (k === 'batt' || k === 'ltemp') return;
    var ps = CB.paramState(s, k);
    if (ps === 'alarm' && st !== 'alarm') st = 'warning'; // a live breach not yet escalated by a rule still shows amber
    if (ps === 'warning' && st === 'normal') st = 'warning';
  });
  return st;
};

/* ---------------- Event log ---------------- */
CB.EVENTS = (function () {
  var E = [
    [3, 'System', 'Ingestion', 'SFTP batch received from Jerrys Plains Dust & Met (12 records, TOA5)', 'hvo'],
    [4, 'User', 'Alarm', 'Kate Sullivan acknowledged AL-4811 Dust Warning (1 Hour) PM10 at Maison Dieu Rd Dust', 'hvo'],
    [6, 'System', 'Notification', 'SMS to +61 438 555 241 delivered (AL-4810, 6 s)', 'hvo'],
    [7, 'User', 'Alarm', 'Josh Kerr acknowledged AL-4814 EA Night Noise - Bulga', 'mtw'],
    [12, 'System', 'Comms', 'North Pit Weather Station missed 3 expected payloads (Iridium). Comms alarm raised.', 'hvo'],
    [19, 'System', 'Notification', 'Email to field.ops@cbased.com.au delivered (AL-4812)', 'hvo'],
    [26, 'System', 'Ingestion', 'Webhook payload from Willow Grove (Cellvisor) stored, 1 audio file attached', 'nel'],
    [34, 'User', 'Config', 'Sarah Mitchell changed deadband on R-101 from 2 to 3 µg/m³', 'hvo'],
    [58, 'System', 'Report', 'Daily Dust & Weather Summary emailed to 6 recipients (PDF, 14 pages)', 'hvo'],
    [71, 'System', 'Ingestion', 'Re-processed 288 raw payloads for Charlton Rd Weather after calibration factor update', 'mtw'],
    [95, 'System', 'Alarm', 'Low Battery raised at Mangoola North Dust (11.62 V)', 'mangoola'],
    [128, 'User', 'Export', 'Daniel Hughes exported 30 days PM10/PM2.5 for 3 sites (CSV, 1.2 MB)', 'hvo'],
    [152, 'System', 'Comms', 'Lake Liddell Noise offline for 2 h. Critical comms alarm raised, escalated to field team.', 'ravensworth'],
    [190, 'User', 'Access', 'Rebecca Lawson signed in (enviro.mtw.com.au)', 'mtw'],
    [240, 'System', 'Ingestion', 'Backfill import completed: Wollombi Brook Gauge 2019–2021 (315,360 records)', 'mtw'],
    [320, 'User', 'Config', 'Sarah Mitchell created site template "Noise Monitor (Cellvisor) v3"', null],
    [410, 'System', 'Report', 'Weekly Noise Compliance - Bulga generated (PDF) and emailed', 'mtw'],
    [520, 'User', 'Data', 'Ben Walsh flagged 4 PM10 values at LSA 2 as invalid (instrument zero check)', 'nel'],
    [610, 'System', 'Notification', 'SMS gateway: 412 messages delivered in 24 h, 0 failed, 2 retried', null],
    [780, 'User', 'Access', 'Hannah Ortiz invited 2 stakeholder viewers to NEL Community Dashboard', 'nel'],
    [1020, 'System', 'Storage', 'Nightly integrity check passed: 41.8M raw payloads, 0 missing', null],
    [1300, 'System', 'Media', 'Image retention: 2,184 camera images older than 90 days deleted per policy', null]
  ];
  return E.map(function (e, i) { return { id: 'EV-' + (90210 + i), mins: e[0], kind: e[1], cat: e[2], text: e[3], client: e[4] }; });
})();

/* ---------------- Users ---------------- */
CB.USER_ROLES = [
  { id: 'cbe-admin', name: 'CBE Administrator', desc: 'Full platform configuration across all clients', scope: 'All clients' },
  { id: 'cbe-tech', name: 'CBE Field Technician', desc: 'Sites, data sources, data validation; no client admin', scope: 'All clients' },
  { id: 'cbe-analyst', name: 'CBE Analyst', desc: 'View, export and reports across clients', scope: 'All clients' },
  { id: 'client-mgr', name: 'Client Manager', desc: 'View, acknowledge alarms, reports and downloads', scope: 'Own client' },
  { id: 'client-view', name: 'Client Viewer', desc: 'Read-only dashboards, maps and charts', scope: 'Entitled sites' },
  { id: 'stakeholder', name: 'Stakeholder (read-only)', desc: 'Selected dashboards only, e.g. community or regulator', scope: 'Selected dashboards' }
];
CB.USERS = [
  ['Sarah Mitchell', 'sarah.mitchell@cbased.com.au', 'cbe-admin', null, 'Active', '2 min ago'],
  ['Colin Davies', 'colin.davies@cbased.com.au', 'cbe-admin', null, 'Active', '1 h ago'],
  ['Ben Walsh', 'ben.walsh@cbased.com.au', 'cbe-tech', null, 'Active', '9 min ago'],
  ['Mia Fraser', 'mia.fraser@cbased.com.au', 'cbe-tech', null, 'Active', 'Yesterday'],
  ['Ryan Nguyen', 'ryan.nguyen@cbased.com.au', 'cbe-analyst', null, 'Active', '3 h ago'],
  ['Daniel Hughes', 'daniel.hughes@hvo.com.au', 'client-mgr', 'hvo', 'Active', '6 min ago'],
  ['Kate Sullivan', 'kate.sullivan@hvo.com.au', 'client-mgr', 'hvo', 'Active', '6 min ago'],
  ['Mark Ellis', 'mark.ellis@hvo.com.au', 'client-view', 'hvo', 'Active', '2 d ago'],
  ['Upper Hunter CCC', 'ccc@upperhunter.org.au', 'stakeholder', 'hvo', 'Active', '5 d ago'],
  ['Rebecca Lawson', 'rebecca.lawson@mtw.com.au', 'client-mgr', 'mtw', 'Active', '3 h ago'],
  ['Josh Kerr', 'josh.kerr@mtw.com.au', 'client-mgr', 'mtw', 'Active', '9 min ago'],
  ['Tom Gallagher', 'tom.gallagher@bengalla.com.au', 'client-mgr', 'bengalla', 'Active', 'Yesterday'],
  ['Priya Raman', 'priya.raman@mangoola.com.au', 'client-mgr', 'mangoola', 'Active', '4 h ago'],
  ['Alan Pritchard', 'alan.pritchard@ravensworth.com.au', 'client-mgr', 'ravensworth', 'Active', '2 d ago'],
  ['Hannah Ortiz', 'hannah.ortiz@spark-nel.com.au', 'client-mgr', 'nel', 'Active', '40 min ago'],
  ['Liam Chen', 'liam.chen@spark-nel.com.au', 'client-view', 'nel', 'Active', '9 min ago'],
  ['EPA Victoria Officer', 'officer@epa.vic.gov.au', 'stakeholder', 'nel', 'Invited', '—']
].map(function (u, i) { return { id: 'u' + i, name: u[0], email: u[1], role: u[2], client: u[3], status: u[4], last: u[5] }; });

/* ---------------- Reports ---------------- */
CB.REPORTS = [
  { id: 'rp1', name: 'Monthly Air Quality Compliance Report', client: 'hvo', freq: 'Monthly', when: '1st of month, 06:00', next: '1 Nov 2026 06:00', recips: 8, pages: 22, blocks: ['Summary', 'PM10 24-hr averages', 'Wind rose', 'Exceedance table', 'Alarm summary'] },
  { id: 'rp2', name: 'Daily Dust & Weather Summary', client: 'hvo', freq: 'Daily', when: 'Every day, 07:00', next: 'Tomorrow 07:00', recips: 6, pages: 14, blocks: ['PM10 trends', 'Wind rose', 'Rainfall', 'Alarm summary'] },
  { id: 'rp3', name: 'Quarterly Tailings Water Report', client: 'hvo', freq: 'Quarterly', when: '5th of Jan / Apr / Jul / Oct', next: '5 Jan 2027 08:00', recips: 3, pages: 11, blocks: ['Water level', 'EC & pH', 'Rainfall'] },
  { id: 'rp4', name: 'Weekly Noise Compliance - Bulga', client: 'mtw', freq: 'Weekly', when: 'Mondays, 08:00', next: 'Mon 19 Oct 08:00', recips: 5, pages: 9, blocks: ['LAeq nightly', 'Exceedances', 'Audio log'] },
  { id: 'rp5', name: 'Blast Monitoring Results', client: 'mtw', freq: 'Custom', when: 'After each blast (+2 h)', next: 'On next blast', recips: 4, pages: 3, blocks: ['PPV', 'Overpressure', 'Met at time of blast'] },
  { id: 'rp6', name: 'Construction Noise & Vibration Monthly', client: 'nel', freq: 'Monthly', when: '3rd of month, 09:00', next: '3 Nov 2026 09:00', recips: 11, pages: 31, blocks: ['Noise by receiver', 'Vibration', 'Exceedance register'] },
  { id: 'rp7', name: 'Dust Deposition & PM10 Annual Review', client: 'bengalla', freq: 'Yearly', when: '15 Jan, 09:00', next: '15 Jan 2027 09:00', recips: 4, pages: 46, blocks: ['Annual averages', 'Wind & dust roses'] },
  { id: 'rp8', name: 'Weekly Environmental Snapshot', client: 'mangoola', freq: 'Weekly', when: 'Fridays, 16:00', next: 'Fri 16 Oct 16:00', recips: 5, pages: 8, blocks: ['Dust', 'Noise', 'Water'] }
];
CB.report = function (id) { return CB.REPORTS.find(function (r) { return r.id === id; }); };

/* ---------------- Baseline dashboards ---------------- */
CB.DASHBOARDS = [
  { id: 'air', name: 'Air Quality Overview', icon: 'dust', desc: 'PM10 / PM2.5 / TSP across every dust station, with wind' },
  { id: 'noise', name: 'Noise Network', icon: 'volume', desc: 'LAeq at every receiver against its current limit' },
  { id: 'water', name: 'Water & Hydrology', icon: 'drop', desc: 'Storage levels, EC and turbidity' },
  { id: 'weather', name: 'Weather', icon: 'wind', desc: 'Wind, temperature and rainfall across met stations' },
  { id: 'ops', name: 'Network Health', icon: 'server', desc: 'Comms, battery and data completeness', admin: true }
];

/* ---------------- Site / device templates ---------------- */
CB.TEMPLATES = [
  { id: 'tp1', name: 'Dust + Met Station (CR1000X) v4', kinds: 'dust,met', logger: 'Campbell Scientific CR1000X', params: 16, sites: 6, overrides: 3, updated: '12 Sep 2026' },
  { id: 'tp2', name: 'Dust Monitor (MACE Envirolog) v2', kinds: 'dust', logger: 'MACE Envirolog', params: 10, sites: 6, overrides: 1, updated: '3 Aug 2026' },
  { id: 'tp3', name: 'Noise Monitor (Cellvisor) v3', kinds: 'noise', logger: 'Cellvisor CV-Noise', params: 6, sites: 11, overrides: 4, updated: '8 Oct 2026' },
  { id: 'tp4', name: 'Water Level Logger (YDOC)', kinds: 'water', logger: 'YDOC ML-417', params: 7, sites: 3, overrides: 0, updated: '21 May 2026' },
  { id: 'tp5', name: 'Webcam (Cellvisor CV-Cam)', kinds: 'camera', logger: 'Cellvisor CV-Cam', params: 2, sites: 3, overrides: 0, updated: '14 Feb 2026' },
  { id: 'tp6', name: 'Blast Monitor (dataTaker DT80)', kinds: 'blast', logger: 'dataTaker DT80', params: 4, sites: 2, overrides: 1, updated: '30 Jun 2026' }
];

/* ---------------- Data sources ---------------- */
CB.PROTOCOLS = ['FTP / SFTP', 'HTTP / webhook', 'Email / IMAP', 'Amazon S3', 'MQTT', 'CBE pipeline push'];
CB.LOGGERS = ['Campbell Scientific', 'Cellvisor', 'MACE', 'Halytech', 'dataTaker', 'YDOC'];
CB.FORMATS = { 'Campbell Scientific': 'TOA5 (.dat)', Cellvisor: 'JSON', MACE: 'CSV', Halytech: 'CSV', dataTaker: 'CSV (DT80 format)', YDOC: 'JSON' };
CB.source = function (s) {
  var r = CB.rng(s.id + 'src'), brand = s.logger.split(' ')[0] === 'Campbell' ? 'Campbell Scientific' : s.logger.split(' ')[0];
  var st = s.comms ? 'error' : r() < 0.08 ? 'delayed' : 'ok';
  return {
    site: s, brand: brand, format: CB.FORMATS[brand] || 'CSV', status: st,
    last: s.comms || Math.round(r() * s.cadence) + 1,
    payloads: s.comms ? Math.round(1440 / s.cadence * 0.9) : Math.round(1440 / s.cadence),
    completeness: s.comms ? 96.2 : CB.round(99.2 + r() * 0.8, 1),
    endpoint: { 'SFTP': 'sftp://ingest.cbased-rayven.io/' + s.client + '/' + s.id, 'HTTP webhook': 'https://ingest.cbased-rayven.io/hooks/' + s.id, 'Email / IMAP': s.id + '@data.cbased-rayven.io', 'S3': 's3://cbe-ingest/' + s.client + '/' + s.id + '/', 'FTP': 'ftp://ingest.cbased-rayven.io/' + s.id, 'MQTT': 'mqtts://mqtt.cbased-rayven.io/cbe/' + s.client + '/' + s.id, 'CBE pipeline push': 'https://ingest.cbased-rayven.io/pipeline/v1/' + s.id }[s.protocol]
  };
};

/* ---------------- Audio recordings ---------------- */
CB.audioFor = function (s, days) {
  var out = [], r = CB.rng(s.id + 'audio');
  var sources = ['Haul truck reversing alarm', 'Dozer tracking', 'Excavator loading', 'Light vehicle pass-by', 'Bird chorus', 'Wind gusts on mic', 'Dog barking', 'Train on Main North line', 'Rock breaker', 'Distant blasting siren'];
  if (s.client === 'nel') sources = ['Rock breaker', 'Concrete truck', 'Piling rig', 'Reversing beeper', 'Eastern Fwy traffic', 'Bird chorus', 'Tram on Princess St', 'Excavator loading', 'Generator hum', 'Wind gusts on mic'];
  var now = CB.align(Date.now(), 15);
  for (var i = 0; i < (days || 3) * 96; i++) {
    var t = now - i * 15 * CB.MIN;
    var laeq = CB.val(s, 'laeq', t), lamax = CB.val(s, 'lamax', t);
    var trig = laeq != null && laeq >= CB.thresholds(s, 'laeq').warn + 1.5 ? 'Alarm trigger' : lamax != null && lamax > 66 ? 'LAmax event' : (i % 4 === 0 ? 'Scheduled' : null);
    if (!trig || laeq == null) continue;
    out.push({ id: s.id + '-' + t, site: s, t: t, laeq: laeq, lamax: lamax, dur: trig === 'Scheduled' ? 60 : 120, trig: trig, src: CB.pick(r, sources), size: CB.round((trig === 'Scheduled' ? 0.9 : 1.8) + r() * 0.4, 1) });
  }
  return out;
};
CB.audioSites = function () { return CB.scopeSites().filter(function (s) { return s.audio; }); };

/* ---------------- Camera images ---------------- */
CB.camSites = function () { return CB.scopeSites().filter(function (s) { return s.camera; }); };
CB.camFrames = function (s, from, to, everyMin) {
  var out = [], step = (everyMin || 15) * CB.MIN;
  for (var t = CB.align(to, everyMin || 15); t >= from; t -= step) out.push(t);
  return out;
};

/* ---------------- Scope (role-based) ---------------- */
CB.scopeSites = function () {
  return CB.state.role === 'client' ? CB.SITES.filter(function (s) { return s.client === CB.state.client; }) : CB.SITES;
};
CB.scopeAlarms = function () {
  var ids = CB.scopeSites().map(function (s) { return s.id; });
  return CB.ALARMS.filter(function (a) { return ids.indexOf(a.site) >= 0; });
};
CB.scopeClients = function () { return CB.state.role === 'client' ? [CB.client(CB.state.client)] : CB.CLIENTS; };
CB.scopeReports = function () { return CB.state.role === 'client' ? CB.REPORTS.filter(function (r) { return r.client === CB.state.client; }) : CB.REPORTS; };
CB.scopeEvents = function () { return CB.state.role === 'client' ? CB.EVENTS.filter(function (e) { return e.client === CB.state.client; }) : CB.EVENTS; };
CB.me = function () { return CB.state.role === 'client' ? CB.client(CB.state.client) : null; };
