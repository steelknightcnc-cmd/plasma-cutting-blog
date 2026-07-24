# Plasma Cut Lab — Feedback Vote Update v0.4

Replace these files in the root of your GitHub repository:

- `app.js`
- `styles.css`

## New feature

A “Did this calculator help?” section appears beneath the safety warning with:

- Yes button
- No button
- Saved choice using browser localStorage
- Thank-you response after voting
- Mobile-friendly layout

## Important limitation

This version remembers each visitor’s choice only on that browser/device.
It does not create a public or global vote total because GitHub Pages is a
static host and does not include a database.

A future version can connect the buttons to a free form or analytics service
to collect aggregated results.
