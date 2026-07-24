---
title: "How to Build a Machine-Specific Cut Chart"
description: "Use controlled test coupons to calibrate speed, pierce delay, cut height, arc voltage, and kerf for your own CNC plasma table."
category: "Testing"
author: "Steel Knight CNC"
reading_time: "Approximately 15-minute read"
---

A manufacturer’s cut chart is the correct place to begin, but it is not always the final answer for every CNC plasma table.

The published values were developed with a particular power source, torch, consumable set, gas supply, motion system, material condition, and test environment. Your table may use different cable lengths, air treatment, torch-height control, acceleration, slat condition, plate chemistry, or software behavior.

A machine-specific cut chart does not replace the manufacturer’s chart. It records the small corrections that make the published starting point repeatable on **your** machine.

A useful custom chart can include:

- Material type and actual thickness
- Consumable type and amperage
- Pierce height
- Pierce delay
- Cut height
- Cutting speed
- Arc-voltage target
- Kerf compensation
- Hole-speed percentage
- Lead-in style
- Torch-height-control behavior
- Notes about dross, bevel, and edge finish

## Begin With a Stable Machine

Do not calibrate process settings while the machine has unresolved mechanical, electrical, or air-system problems.

Before testing, verify:

- The torch is perpendicular to the plate
- The gantry moves squarely
- Belts, racks, pinions, screws, and bearings are secure
- Backlash and lost motion are under control
- The work lead has a clean electrical connection
- Air is clean, dry, oil-free, and sufficient under flow
- The plate is reasonably flat and supported
- Consumables are correct, clean, and not badly worn
- The torch-height control responds consistently
- The Z axis can repeat the commanded height
- The machine can reach the programmed speed before the measured section

If the machine is changing during the test, the chart will only document the fault.

## Use the Manufacturer’s Cut Chart as the Baseline

Record the exact published settings for:

- Material
- Thickness
- Amperage
- Consumable set
- Pierce height
- Pierce delay
- Cut height
- Speed
- Arc voltage, when supplied
- Gas requirements

Do not mix values from different amperages or consumable families.

For example, a lower-current consumable may create a narrower kerf and finer detail, while a higher-current process may cut faster. The correct choice depends on the material thickness and the manufacturer’s intended process.

> **The goal is controlled refinement, not guessing.** Start from the official process, confirm that the system is healthy, and change one variable at a time.

## Use New or Known-Good Consumables

Calibration performed with a damaged nozzle or deeply worn electrode can produce misleading results.

Ideally, begin with:

- A new nozzle
- A new or known-good electrode
- The correct swirl ring
- The correct retaining cap and shield
- Clean torch threads and seating surfaces

Record the consumable condition in the test sheet. Arc voltage and kerf can change as consumables wear, so a chart developed with worn parts may not represent the machine’s normal setup.

## Use Consistent Test Material

Material variation matters.

For each test series, use coupons from the same plate or batch when possible. Record:

- Material grade
- Nominal thickness
- Measured thickness
- Surface condition
- Coating or mill scale
- Plate temperature
- Whether the plate is dry, rusty, painted, or oily

Measure the actual thickness with calipers or a micrometer. A plate sold as a nominal thickness may vary enough to affect piercing and cutting.

## Design a Useful Test Coupon

A good coupon should test more than one behavior while remaining easy to measure.

A practical coupon can include:

- One long straight cut
- One external square or rectangle
- One internal square
- Several circles
- A narrow slot
- A sharp corner
- A lead-in and lead-out
- A section long enough for full cutting speed
- Identifying numbers cut or marked beside each variation

For initial speed testing, straight lines are especially useful because they remove the extra variables introduced by corner slowdown, circular interpolation, and torch-height-control lockout.

For dimensional calibration, use a square large enough that the machine reaches steady speed on each side. A 100 mm or 4 inch square is often easier to measure than a very small feature.

## Keep the Coupon Far From the Plate Edge

Piercing and cutting near an unsupported plate edge can change heat flow, arc behavior, and plate movement.

Leave enough surrounding material that:

- The coupon remains flat
- The arc is not immediately cutting into open air
- Heat is distributed consistently
- The part does not tip during the test
- The lead-in remains in stable material

Test pieces should be separated enough that one cut does not strongly preheat the next.

## Create a Baseline Test

The first coupon should use the manufacturer’s published values without modification, except where your control system requires an equivalent entry.

Record:

| Item | Baseline value |
|---|---|
| Material and thickness | Manufacturer chart selection |
| Amperage | Published value |
| Pierce height | Published value |
| Pierce delay | Published value |
| Cut height | Published value |
| Speed | Published value |
| Arc voltage | Published value, if provided |
| Kerf compensation | Published estimate or zero for a measurement coupon |
| THC | Enabled only after the proper delay and speed are established |

Photograph both the top and bottom of the coupon. Label the coupon so it can be matched to the recorded settings later.

## Change Only One Variable at a Time

This is the most important rule in the process.

If speed, voltage, delay, and kerf are all changed together, a better result does not reveal which change helped. A worse result does not reveal which change caused the problem.

Use a sequence such as:

1. Confirm piercing
2. Calibrate cutting speed
3. Confirm physical cut height
4. Determine the matching arc-voltage target
5. Measure kerf
6. Calibrate dimensional compensation
7. Refine holes and small features
8. Confirm the result with a repeat coupon

The order matters because later values depend on earlier ones.

## Step 1: Calibrate Pierce Height and Pierce Delay

Piercing is different from steady-state cutting.

At pierce start, molten metal is forced upward before the arc breaks through the plate. The torch normally starts at a greater height to protect the nozzle and shield from blowback.

### Pierce height

Use the manufacturer’s value first. Do not lower the pierce height merely because the torch fails to transfer or because a delay is incorrect.

A pierce height that is too low can increase:

- Molten-metal blowback
- Shield and nozzle damage
- Double arcing
- Premature consumable failure

A pierce height that is unnecessarily high can cause transfer problems or unreliable starting.

### Pierce delay

The delay must be long enough for the arc to penetrate the material before XY motion begins.

Possible signs of too little delay:

- The torch begins moving before breakthrough
- A deep gouge follows the pierce
- Heavy sparks travel across the top of the plate
- The arc fails to cut fully at the start
- The lead-in begins with an incomplete section

Possible signs of excessive delay:

- The pierce hole becomes unnecessarily large
- Heat input increases
- The arc remains stationary after breakthrough
- Consumables experience more stress
- The lead-in starts from an oversized crater

Adjust the delay in small increments. Use the shortest delay that produces reliable full penetration before motion begins.

## Step 2: Calibrate Straight-Line Cutting Speed

Speed should be tested before kerf compensation because speed changes the kerf and dross pattern.

Cut several straight lines at controlled speed steps around the manufacturer’s value. For example, the series might use:

- Baseline minus 15%
- Baseline minus 10%
- Baseline minus 5%
- Baseline
- Baseline plus 5%
- Baseline plus 10%
- Baseline plus 15%

The exact range can be smaller when the published setting is already close.

Keep amperage, cut height, consumables, and air supply unchanged.

### Signs that speed may be too slow

- Heavy, rounded low-speed dross
- A wider kerf
- Excessive heat input
- More top-edge rounding
- A large heat-affected zone
- The arc appears to move nearly straight down or forward

### Signs that speed may be too fast

- Hard, narrow high-speed dross
- Incomplete penetration
- Sparks spray backward across the top
- Increased positive bevel
- The arc trails strongly behind the torch
- Corners or the end of the cut fail to separate

The best production speed is not always the visually cleanest single edge. Select the speed that gives repeatable penetration, manageable dross, acceptable bevel, and stable consumable behavior.

## Use the Spark Direction as a Diagnostic

During a straight cut, observe the stream beneath the plate from a safe position.

A generally downward spark stream suggests that the arc is passing through the plate efficiently. A stream that trails strongly behind the torch can indicate excessive speed or insufficient cutting energy.

Do not watch the plasma arc without proper eye protection. Do not place any part of the body beneath the table or near the cutting path.

## Step 3: Establish the Physical Cut Height

The cut chart’s cut height is a physical torch-to-work distance.

Before calibrating voltage, command the Z axis to the published cut height and verify it physically as accurately as the torch and shield design allow.

Possible methods include:

- Precision feeler gauges
- A known shim
- A gauge block
- A manufacturer-supplied height tool
- A carefully measured Z-axis movement from a known reference

The machine should complete initial height sensing, move to pierce height, pierce, descend to cut height, and begin cutting without the torch-height control immediately overriding the commanded position.

For a short calibration cut, temporarily holding the THC at a fixed height can help separate mechanical cut-height problems from voltage-control problems.

## Step 4: Calibrate Arc Voltage to the Verified Height

Arc voltage is related to the electrical length of the plasma arc. As the torch moves farther from the plate, arc voltage normally increases. As the torch moves closer, voltage normally decreases.

This makes voltage useful for automatic height control, but voltage is not the primary specification—the correct physical cut height is.

To determine the machine-specific voltage:

1. Install new or known-good consumables.
2. Use the selected cutting speed.
3. Establish the correct physical cut height.
4. Cut a sufficiently long straight line.
5. Allow the arc to stabilize.
6. Observe the actual divided or raw arc-voltage reading used by the THC.
7. Record the stable value.
8. Repeat the cut to confirm it.

Use the confirmed average as the starting voltage target for that material, thickness, amperage, speed, and consumable set.

### Why the published voltage may differ

The displayed value can be affected by:

- Consumable condition
- Cutting speed
- Actual cut height
- Plate surface
- Gas pressure and flow
- Voltage-divider accuracy
- Wiring and electrical calibration
- Power-source design
- THC filtering and sampling
- Material composition

A machine-specific voltage is therefore only valid when the rest of the process remains consistent.

### Consumable wear and voltage

As the electrode wears, the arc can become longer and the operating voltage can rise. A traditional THC that blindly holds the original voltage may gradually move the torch closer to the plate.

This is one reason to inspect consumables and periodically verify actual cut height rather than continually increasing or decreasing voltage to hide another problem.

## Step 5: Measure the Actual Kerf

Kerf is the width of material removed by the plasma arc.

Do not assume that one kerf value applies to every thickness and amperage.

Kerf changes with:

- Consumable type
- Amperage
- Speed
- Cut height
- Gas flow
- Nozzle wear
- Material and thickness

### Method A: Direct kerf measurement

Cut a long slot or straight line and measure the gap at several locations with suitable gauges.

This can provide a useful starting value, but slag and edge taper can make direct measurement difficult.

### Method B: Dimensional coupon

Cut an external square without compensation, measure it, and calculate the correction.

For an outside contour:

```text
Effective kerf ≈ programmed size − measured outside size
```

Cut an internal square or circle and compare the programmed and measured internal dimensions as a second check.

Repeat the test because a single measurement can be influenced by backlash, heat movement, or measurement error.

## Step 6: Enter and Verify Kerf Compensation

CAM software normally offsets the toolpath by half the kerf width from the programmed contour.

After entering the estimated kerf:

1. Cut a new external square.
2. Let it cool.
3. Remove loose dross without grinding away the measured edge.
4. Measure each side at multiple locations.
5. Compare X and Y dimensions.
6. Adjust the kerf value in small increments.
7. Repeat until the result is acceptably consistent.

If X and Y errors differ substantially, do not keep changing kerf. Investigate:

- Axis calibration
- Backlash
- Gantry squareness
- Acceleration
- Torch perpendicularity
- Plate movement
- Direction-dependent bevel

Kerf compensation should correct the plasma process, not disguise a motion-system error.

## Step 7: Calibrate Holes Separately

Small holes are not simply short straight cuts.

During a circular path:

- The machine may not reach full programmed speed
- The plasma arc trails behind motion
- THC movement may distort the hole
- Lead-ins and lead-outs affect roundness
- The good and bad sides of the cut remain directional
- Heat becomes concentrated in a small area

A useful hole test coupon can include hole diameters such as:

- 1.0 × material thickness
- 1.5 × material thickness
- 2.0 × material thickness
- 3.0 × material thickness

Conventional air plasma may struggle with holes near or below the material thickness, depending on the machine and process.

Record for each hole:

- Programmed diameter
- Top diameter
- Bottom diameter
- Roundness
- Taper
- Lead-in mark
- Dross
- Whether the hole accepts the intended fastener

### Hole-speed percentage

Many CNC plasma processes reduce speed for holes. Test several percentages of the selected straight-line speed rather than assuming one universal value.

Keep hole settings separate from the main straight-cut speed in the chart.

### THC lockout for small features

A torch-height control may react to rapid voltage changes caused by speed reduction, crossing a kerf, or entering a small circle. Depending on the control, it may be helpful to inhibit automatic height correction during small holes, corners, or short features.

Use the control manufacturer’s recommended method. Do not disable initial height sensing unless the specific process requires it.

## Step 8: Refine Lead-Ins and Lead-Outs

A good lead-in starts the pierce in scrap material and allows the arc to stabilize before it reaches the finished contour.

Test:

- Straight lead-in
- Arc lead-in
- Tangential lead-in
- Different lengths
- Different approach angles

For holes, a poorly chosen lead-out can create a divot when the arc crosses the starting kerf. In some processes, ending without a conventional lead-out produces a better hole.

Keep separate lead-in rules for:

- External contours
- Internal contours
- Small holes
- Thick plate
- Fine-feature consumables

## Step 9: Test Corner and Acceleration Behavior

A cut chart speed assumes that the machine can reach and maintain that speed.

Short segments and sharp corners may be dominated by acceleration rather than commanded feed rate.

Possible signs of motion limitations include:

- Dross concentrated near corners
- Overburn at direction changes
- Rounded corners
- Different kerf widths on short and long segments
- Good long cuts but poor small parts
- Hole dimensions that change with diameter

Record the machine’s acceleration settings with the test results. A chart developed before changing acceleration may need to be verified again afterward.

## Build a Controlled Test Matrix

Avoid creating hundreds of random combinations.

Use a staged matrix.

### Stage A: Baseline

One coupon at the manufacturer’s values.

### Stage B: Speed series

Several straight cuts with only speed changed.

### Stage C: Height confirmation

Several cuts at the selected speed with small, controlled physical-height changes only when needed.

### Stage D: Voltage capture

Repeated cuts at the confirmed physical height to record stable operating voltage.

### Stage E: Dimensional test

External and internal shapes for kerf compensation.

### Stage F: Feature test

Holes, slots, corners, lead-ins, and THC lockout behavior.

### Stage G: Confirmation

Repeat the final coupon on a fresh area of plate and, ideally, on another piece from the same material batch.

## Example Test Record

| Test | Speed | Pierce delay | Cut height | Arc voltage | Kerf | Result |
|---|---:|---:|---:|---:|---:|---|
| A1 | Manufacturer value | Manufacturer value | Manufacturer value | Observed | Not compensated | Baseline |
| S1 | −10% | Same | Same | Observed | — | Low-speed dross |
| S2 | −5% | Same | Same | Observed | — | Light removable dross |
| S3 | Baseline | Same | Same | Observed | — | Acceptable |
| S4 | +5% | Same | Same | Observed | — | Slight trailing sparks |
| V1 | Selected speed | Same | Verified | Recorded | — | Stable height |
| K1 | Selected speed | Same | Verified | Target | Initial value | Part undersize |
| K2 | Selected speed | Same | Verified | Target | Revised value | Dimension accepted |

The values should be written in the units used by the CNC so that no conversion is required during production.

## Record More Than the Final Number

A useful chart should include enough context to reproduce the result.

Recommended columns include:

| Category | What to record |
|---|---|
| Machine | Table name, controller, software version |
| Plasma system | Brand, model, torch, firmware |
| Material | Grade, thickness, surface condition |
| Consumables | Type, amperage, part numbers, condition |
| Air | Flowing pressure, dryer/filter condition |
| Piercing | IHS method, pierce height, delay |
| Cutting | Cut height, speed, amperage |
| THC | Voltage, delay, anti-dive or lockout behavior |
| CAM | Kerf, lead-in, lead-out, hole rule |
| Motion | Acceleration, corner slowdown |
| Results | Dross, bevel, dimensions, photos |
| Date | Test date and operator |

Attach photographs or label physical coupons with the test number.

## Use Version Control for the Cut Chart

A machine-specific chart should be treated like a controlled technical document.

Use revisions such as:

```text
Cut Chart Rev A
Cut Chart Rev B
Cut Chart Rev C
```

Record what changed:

- New consumables
- New torch
- Different plasma cutter
- Air-system upgrade
- New THC
- Software update
- New acceleration settings
- Mechanical rebuild
- Different material supplier

Do not overwrite a proven chart without keeping the previous revision.

## Recalibrate After Major Changes

Retest the relevant material range after changing:

- Plasma power source
- Torch or consumable family
- Voltage divider
- THC or Z-axis control
- Air compressor, dryer, or filters
- Hose diameter or length
- CNC controller
- Motion tuning
- Gear ratio
- Table slats or water-pan arrangement
- CAM software or post processor

A full recalibration may not always be necessary, but the established values should be confirmed.

## Common Testing Mistakes

### Changing several variables together

This prevents a clear conclusion.

### Testing with worn consumables

The chart then describes worn parts rather than the intended process.

### Measuring a hot coupon

Thermal expansion and plate distortion can affect dimensions.

### Using tiny shapes for speed calibration

The machine may never reach the programmed speed.

### Calibrating voltage before confirming physical height

The THC may faithfully maintain the wrong height.

### Using kerf compensation to fix axis errors

Kerf cannot correct backlash, scale error, or an unsquared gantry.

### Ignoring cut direction

Plasma swirl creates a better-quality side of the kerf. Outside and inside contours must use the correct direction for the desired finished edge.

### Judging only the top surface

Inspect the bottom dross, bevel, striation angle, hole taper, and dimensional result.

### Building the chart from one coupon

Repeatability is more important than one unusually good result.

## A Practical Acceptance Standard

Define what “good” means for the work the machine actually performs.

Possible acceptance criteria include:

- Complete separation on every cut
- Dross removable with light scraping
- Dimensional error within the shop’s tolerance
- Repeatable kerf in X and Y
- Acceptable bevel on the saved side
- Reliable pierces without nozzle damage
- Stable THC behavior
- Holes that accept the specified fastener
- Consistent results across repeated coupons
- Consumable life appropriate for the process

A decorative sign, a welded frame component, and a precision bolt plate may require different acceptance limits.

## Final Thoughts

The best machine-specific cut chart is not the one with the most numbers. It is the one that can be repeated.

Build it methodically:

1. Start with the manufacturer’s process
2. Stabilize the machine and air supply
3. Use known-good consumables
4. Test consistent material
5. Change one variable at a time
6. Select straight-cut speed first
7. Verify physical cut height
8. Record the voltage that maintains that height
9. Measure and confirm kerf
10. Develop separate rules for holes and short features
11. Repeat the final coupon
12. Save the result as a controlled revision

That process converts a generic starting chart into a dependable production reference for your own CNC plasma table.

## Sources and Further Reading

- [Hypertherm — Basic tips to improve plasma cut quality](https://www.hypertherm.com/resources/more-resources/articles/basic-tips-to-improve-plasma-cut-quality/)
- [Hypertherm — Troubleshooting cut angularity and kerf](https://www.hypertherm.com/resources/system-support/maintenance-and-use/cut-quality/cut-angularity/)
- [Hypertherm — Troubleshooting hole quality](https://www.hypertherm.com/resources/system-support/maintenance-and-use/cut-quality/hole-quality/)
- [Hypertherm — Torch height control for plasma cutting](https://www.hypertherm.com/resources/more-resources/articles/torch-height-control-for-plasma-cutting/)
- [Hypertherm — Powermax125 machine-torch cut-chart guidance](https://xnet.hypertherm.com/Xnet/library/library.jsp?file=HYP117344)
- [ESAB — How plasma cutters work and how speed and standoff affect the cut](https://esab.com/us/nam_en/esab-university/articles/how-does-a-plasma-cutter-work/)
