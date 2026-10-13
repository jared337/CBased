# CBased Environmental Monitoring Platform — clickable prototype

Built on Rayven. A navigable front-end prototype built from `CBased_Build_Spec.md` and `CBased_Prototype_Scope.md`, in the same design system as the Place Performance prototype. It's plain HTML, CSS and JavaScript with no build step, and uses sample data only (no backend).

## Run it

```bash
python .claude/serve.py 5181
```

Then open http://localhost:5181. Map tiles and the Inter font need an internet connection. Everything else works offline.

## Roles

Use **View as** in the header (or the floating **Prototype** pill) to switch between:

- **CBE Admin** — the whole portfolio (6 clients, 36 sites), plus the Configuration screens.
- **App User (Client)** — white-labelled as Hunter Valley Operations. It's read-focused, scoped to HVO's 9 sites, and has no configuration screens.

The login page is white-labelled per role too. No credentials are checked.

## Phase markers

- Phase 1 screens and features are fully built.
- The Phase 2 previews are built and clickable, and carry an amber **Phase 2** badge: the configurable wind/dust rose (Chart Explorer), the Webcam Gallery, and the simplified Report builder.
- Other Phase 2 items are shown as greyed **Phase 2** placeholders that do nothing.
- Future-phase items are left out.

## Mock data model

Values aren't random. `js/data.js` models each parameter with a diurnal cycle, smooth noise and scripted events, such as the PM10 peak at Jerrys Plains, the night-noise exceedance at Bulga, blasts at about 1pm on weekdays, rain storms and comms failures. That means the live tiles, charts, alarms, exports, camera images (the dust plume follows PM10) and audio all agree with each other, and values keep moving as time passes. Exports produce real CSV/JSON files, and audio playback is synthesised in the browser.

## Files

| File | Purpose |
|---|---|
| `css/app.css` | Shared design system (from Place Performance) |
| `css/cbe.css` | CBased additions |
| `js/util.js`, `js/charts.js` | Shared helpers, icons and SVG chart kit |
| `js/trend.js` | Interactive trend chart (multi-axis, zoom/pan, thresholds, shading) and wind/dust rose |
| `js/maps.js` | Leaflet maps (street / satellite / terrain) |
| `js/data.js` | Screens, clients, sites, parameter model, alarm rules and events, users, reports, sources |
| `js/ui.js` | Cards, Phase 2 markers, overlays, screen map |
| `js/screens-home.js` | Login, Portfolio Overview, Client Home, Site Map, Site Detail |
| `js/screens-analysis.js` | Chart Explorer, Dashboards |
| `js/screens-ops.js` | Alarms & Events, Reports, Data Export & API, Webcam Gallery, Noise Audio |
| `js/screens-admin.js` | Alarm & Notification Setup, Clients & Users, Sites & Parameters, Data Sources, Platform Settings |
| `js/app.js` | Router, shell, role switcher, live ticker |

## Image credits

Camera placeholder photos are loaded from Wikimedia Commons, not stored in this folder. Each is credited in the Webcam Gallery and the image viewer:

- Max Phillips (CC BY 2.0)
- CSIRO (CC BY 3.0)
- Marcus Wong (CC BY-SA 3.0)
- Stephen Codrington (CC BY 2.5)

If you're offline, the drawn scene shows instead.
