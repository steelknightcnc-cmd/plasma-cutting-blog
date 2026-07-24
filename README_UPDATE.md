# Plasma Cut Lab — Multi-Profile Update v0.3

Upload and replace these two files in the root of the GitHub repository:

- `cut-chart-data.js`
- `app.js`

No `index.html` change is required. JavaScript rebuilds the profile selector
automatically and organizes machines by manufacturer.

## Working profiles

- Generic air plasma — Hypertherm reference
- Stamos S-Plasma 85 CNC — Hypertherm reference with 5.5 bar displayed
- Hypertherm Powermax65 — official 45 A and 65 A shielded-air rows
- Hypertherm Powermax85 — official 45 A, 65 A, and 85 A shielded-air rows

## Listed for future chart data

- Hypertherm Powermax45 XP
- Hypertherm Powermax SYNC
- ESAB Thermal Dynamics Cutmaster 60i
- ESAB Thermal Dynamics Cutmaster 82
- Lincoln Electric Tomahawk 45
- Lincoln Electric Tomahawk 1000
- Miller Spectrum 625 X-TREME
- Miller Spectrum 875
- Everlast PowerPlasma 62i
- Everlast PowerPlasma 82i

Selecting a future profile displays "Chart coming soon." It does not silently
reuse another manufacturer's settings.

## Source

Hypertherm Powermax65/85 Operator Manual 806650, Revision 4,
shielded-air mechanized cut charts.
