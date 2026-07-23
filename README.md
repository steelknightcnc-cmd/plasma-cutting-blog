# Plasma Cut Lab — Website Starter v0.1

This package contains a responsive plasma-cutting blog homepage and calculator framework.

## Files

- `index.html` — website structure
- `styles.css` — responsive visual design
- `app.js` — calculator behavior and unit conversions
- `cut-chart-data.js` — machine-specific cutting records

## Safety design

The calculator displays a result only when a matching record has:

```js
validated: true
```

The included development record is deliberately marked `validated: false`.
Its numerical values are placeholders for testing the interface and must not be
published as cutting recommendations.

## Test locally

Open `index.html` in a modern web browser.

For more reliable local testing, run a simple local server from this folder:

```bash
python -m http.server 8000
```

Then visit:

```text
http://localhost:8000
```

## Add cut-chart records

Edit `cut-chart-data.js`. Keep separate records for each:

- Machine or plasma source
- Torch and consumable family
- Material
- Thickness
- Process amperage
- Plasma/shield gas

Document the source manual and page number or the controlled test record.

## Publish free

The entire folder is a static website and can be published on GitHub Pages,
Cloudflare Pages, or Netlify.

## Planned v0.2

- Validated Stamos S-Plasma 85 CNC dataset
- Thickness interpolation within one process amperage
- Cut height and pierce height
- Arc-voltage recommendation
- Kerf width
- Airflow requirement
- More machine profiles
