# Hypertherm Reference Update v0.2

Replace these two files in the root of your GitHub repository:

- `cut-chart-data.js`
- `app.js`

## What changes

- Adds shielded-air reference records for mild steel, stainless steel, and aluminum
- Includes 45 A, 65 A, and 85 A process charts
- Automatically selects the lowest supported process current
- Interpolates between neighboring thickness rows
- Keeps Stamos gas pressure at 5.5 bar / approximately 79.8 PSI
- Clearly labels results as Hypertherm reference settings

## Source

Cut speeds and pierce delays are transcribed from:

Hypertherm Powermax65/85 Operator Manual  
Document 806650, Revision 4  
Shielded-air cut charts, 45 A, 65 A, and 85 A

## Important limitation

Hypertherm and Stamos use different power supplies, torches, consumables, gas
management, and arc characteristics. These values are reference starting points,
not guaranteed Stamos settings. Test-cut and calibrate each combination.
