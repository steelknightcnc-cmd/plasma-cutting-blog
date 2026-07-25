---
title: "How to Diagnose Dross, Bevel, and Rough Plasma Cuts"
description: "Read the cut edge to identify speed, height, air, consumable, and motion problems on a CNC plasma table."
category: "Cut quality"
author: "Steel Knight CNC"
reading_time: "Approximately 15-minute read"
---

A plasma-cut part contains evidence.

The dross, bevel angle, kerf width, striation pattern, pierce mark, and edge finish can reveal whether the real problem is speed, torch height, air quality, consumables, motion, or setup.

The difficult part is that several faults can create similar symptoms. A worn nozzle can resemble incorrect height. Low airflow can resemble excessive speed. A tilted torch can resemble a bad kerf setting.

The best troubleshooting method is therefore not to change random settings. It is to inspect the cut systematically and eliminate one cause at a time.

## Start With the Entire Cut, Not One Defect

Before adjusting anything, inspect:

- Top edge
- Bottom edge
- Cut face
- Kerf width
- Bevel direction
- Dross type
- Striation direction
- Pierce point
- Lead-in and lead-out
- Corners and holes
- Whether the problem appears on every side or only one direction

Also compare:

- Long straight cuts
- Short segments
- X-axis cuts
- Y-axis cuts
- Internal contours
- External contours

A defect that appears everywhere usually points toward the plasma process. A defect that changes with direction may point toward torch alignment, motion, or cut direction.

## Follow a Fixed Troubleshooting Order

A useful order is:

1. Confirm the material and chart selection
2. Inspect the consumables
3. Verify air quality and flowing pressure
4. Check work-lead contact
5. Confirm the torch is perpendicular
6. Confirm physical cut height
7. Verify speed
8. Verify amperage and nozzle match
9. Check cut direction
10. Test the change on a controlled coupon

This order prevents software adjustments from hiding a mechanical or consumable problem.

## What Dross Is

Dross is molten metal that was not fully removed from the kerf before it solidified.

Not all dross is the same. The shape, hardness, and location matter.

The main categories are:

- Low-speed dross
- High-speed dross
- Top spatter
- Intermittent or irregular dross

## Low-Speed Dross

Low-speed dross usually appears as a large, rounded, bubbly accumulation along the bottom edge.

It is often easier to remove than high-speed dross.

### Common causes

- Cutting speed too slow
- Excessive heat input
- Torch too close in some processes
- Excessive current for the nozzle or material
- Corner slowdown without proper THC or anti-dive behavior

### What is happening

When the torch moves too slowly, the arc removes more material than necessary and the molten metal can circulate beneath the plate before solidifying.

The kerf may also become wider, and the top edge may look rounded.

### First correction

Increase cutting speed in small steps while keeping height, amperage, air, and consumables unchanged.

Do not make a large speed jump. Use controlled test lines around the current setting.

## High-Speed Dross

High-speed dross usually appears as a small, narrow, hard bead attached to the bottom edge.

It can be difficult to remove.

### Common causes

- Cutting speed too fast
- Torch standoff too high
- Insufficient current
- Worn nozzle
- Inadequate gas flow
- Machine failing to maintain the selected process

### What is happening

The plasma arc trails behind the torch and does not fully clear the molten metal before the torch moves onward.

The cut can also show:

- Positive bevel
- Narrow lower kerf
- Trailing sparks
- Incomplete separation
- A hard bottom bead

### First correction

Reduce cutting speed in small steps.

If slowing down does not improve the cut, check the physical cut height, nozzle condition, current, and airflow.

## Top Spatter

Top spatter is re-solidified metal sprayed onto the top surface near the kerf.

It is often easy to remove, but it indicates that the process is not directing molten metal cleanly downward.

### Common causes

- Cutting speed too fast
- Torch too high
- Worn or damaged nozzle
- Incorrect consumable combination
- Unstable air flow

### First correction

Inspect the nozzle first, then verify cut height and reduce speed slightly.

## Intermittent Dross

When dross appears only in certain locations, the problem may not be a simple chart setting.

Look for:

- Warped or uneven plate
- Bent or heavily loaded table slats
- THC diving near corners
- Crossing an existing kerf
- Compressor cycling or pressure loss
- Loose work-lead contact
- Acceleration and corner slowdown
- Damaged rack, belt, bearing, or drive component
- Consumables beginning to fail

A consistent chart setting should normally produce a consistent pattern on a stable machine.

## Positive Bevel

Positive bevel means the top of the cut is wider than the bottom. The finished edge slopes inward toward the bottom.

### Common causes

- Torch too high
- Arc voltage target too high
- Speed too fast
- Current too low
- Worn nozzle
- Inadequate gas flow
- Incorrect cut direction

### What is happening

The arc column is contacting more of the upper edge than the lower edge, or it is lagging behind the torch.

A positive bevel may be accompanied by hard high-speed dross.

### First correction

Verify the actual physical cut height before changing the THC voltage.

If height is correct, inspect consumables and reduce speed slightly.

## Negative Bevel

Negative bevel means the bottom of the cut is wider than the top. The finished edge undercuts toward the bottom.

### Common causes

- Torch too low
- Arc voltage target too low
- Current too high
- Cutting speed too slow

### First correction

Verify that the torch is not being driven below the specified cut height.

Then confirm amperage and increase speed slightly if low-speed dross is also present.

## Bevel on Only One Side

A cut with excessive bevel on one side but not the opposite side often points toward alignment or direction rather than a universal speed setting.

Check:

- Torch perpendicularity
- Bent torch mount
- Loose Z-axis carriage
- Gantry squareness
- Plate not sitting flat
- Damaged nozzle orifice
- Incorrect cut direction
- Direction-dependent mechanical play

### Simple alignment test

Cut a square large enough for the machine to reach steady speed.

Mark the machine directions on the coupon:

```text
+X
-X
+Y
-Y
```

Compare the bevel on all four sides.

If one direction is consistently worse, inspect mechanical alignment and torch perpendicularity before changing the global kerf value.

## The Good Side and Bad Side of a Plasma Cut

The swirling plasma gas produces a better-quality side and a more beveled side.

The saved part must be on the correct side of the torch path.

CAM software normally handles this through contour direction:

- Outside contours use one direction
- Inside contours use the opposite direction

The exact direction depends on the torch and process, so follow the plasma-system and CAM documentation.

An incorrect cut direction can make a properly tuned process look badly beveled.

## Rough Cut Faces and Striations

Vertical or slightly curved lines on the cut face are called striations.

Some striation is normal in plasma cutting. The pattern becomes diagnostic when it changes sharply, becomes irregular, or is accompanied by heavy dross and bevel.

### Possible causes of roughness

- Cutting speed too high or too low
- Worn nozzle or electrode
- Dirty or wet air
- Incorrect gas pressure
- Torch vibration
- Loose motion components
- Incorrect cut height
- Material surface contamination
- Incorrect current for the consumable
- Poor work-lead contact

### Smooth top, rough bottom

This often indicates that the upper part of the kerf is receiving sufficient energy while the arc is lagging or losing effectiveness toward the bottom.

Check speed, current, height, and air flow.

### Roughness that repeats at regular intervals

A repeating pattern may indicate a motion problem:

- Rack or pinion damage
- Belt tooth or pulley issue
- Bearing roughness
- Motor tuning
- Mechanical vibration
- Slat movement

Measure the distance between repeating marks and compare it with belt pitch, pinion rotation, screw lead, or wheel spacing.

## Kerf Too Wide

A kerf that is wider than expected can result in undersized outside parts or oversized holes, depending on compensation and contour type.

### Possible causes

- Torch too high
- Worn nozzle
- Current too high
- Speed too slow
- Inadequate gas flow
- Incorrect kerf compensation
- Wrong consumable set

Do not immediately change CAM kerf compensation.

First confirm that the physical kerf is stable and that the process is healthy. Kerf compensation should account for a repeatable kerf, not hide a damaged nozzle.

## Kerf Too Narrow

A narrow kerf can result from:

- Torch too low
- Current too low
- Speed too fast
- Excessive gas flow
- Incorrect consumable set
- Incorrect CAM compensation

A narrow kerf combined with hard bottom dross and positive bevel strongly suggests that the torch is moving too fast or the arc is underpowered.

## Rounded Top Edge

A rounded top edge can indicate:

- Speed too slow
- Torch too high
- Excessive heat input
- Worn consumables
- Incorrect gas setting

First compare the cut against the manufacturer’s chart and inspect consumables.

## Incomplete Cuts

When the part does not separate completely, possible causes include:

- Speed too fast
- Current too low
- Material thicker than entered
- Incorrect nozzle
- Low air pressure or airflow
- Worn electrode
- Torch too high
- Poor work-lead connection
- Pierce delay too short
- Plasma cutter operating beyond its production range

Do not compensate by repeatedly lowering the torch. That can damage consumables and create collision risk.

## Cut Quality Changes Near Corners

The machine slows for corners, but the plasma power remains active.

This can create:

- Low-speed dross
- Wider kerf
- Rounded corners
- Overburn
- THC diving
- Excessive bevel near direction changes

Check:

- Corner acceleration
- Minimum THC speed
- Anti-dive settings
- Voltage sampling delay
- CAM corner loops
- Whether the machine can reach the chart speed

A chart speed that works on a long straight line may not be reached on a small part.

## Cut Quality Changes Across the Plate

When one area of the table cuts well and another does not, inspect:

- Plate flatness
- Slat height
- Slat dross buildup
- Table level
- Gantry twist
- Z-axis repeatability
- Work-lead placement
- Cable drag
- Air hose restriction
- Material surface condition

Bent or heavily coated slats can prevent the plate from sitting level, which makes a correct voltage target produce an incorrect physical height.

## Holes Look Worse Than External Profiles

Small holes are difficult because the machine may never reach full cutting speed.

Common symptoms include:

- Tapered holes
- Out-of-round holes
- Lead-in divot
- Excessive dross
- Oversized or undersized diameter
- THC movement during the circle

Test separately:

- Hole speed percentage
- Lead-in type
- Lead-out or negative overburn
- THC lockout
- Pierce location
- Hole diameter relative to material thickness
- Machine acceleration

Do not use a single straight-line result to judge small-hole performance.

## Consumable Inspection

Inspect the entire consumable stack, not only the nozzle.

### Nozzle

Look for:

- Oval or enlarged orifice
- Nicks
- Internal deposits
- Heat damage
- Off-center wear

A damaged nozzle changes arc shape and can cause bevel, dross, and an irregular kerf.

### Electrode

Look for:

- Excessive pit depth
- Uneven wear
- Cracking
- Loose insert
- Contamination

### Swirl ring

Look for:

- Blocked holes
- Cracks
- Dirt
- Heat damage
- Incorrect part number

### Shield and retaining cap

Check for:

- Spatter
- Damage
- Incorrect assembly
- Loose seating
- Blocked gas passages

Replace consumables as a matched process when needed. A new nozzle paired with a badly worn electrode may still produce poor results.

## Air-System Checks

Verify pressure while air is flowing, not only when the system is idle.

Check:

- Receiver drain
- Water separator
- Coalescing filter
- Dryer
- Filter restriction
- Hose inside diameter
- Quick-connect fittings
- Compressor delivered airflow
- Oil contamination

Water, oil, and unstable flow can shorten consumable life and make every other adjustment inconsistent.

## Torch-Height and Voltage Checks

The THC voltage target is not the same thing as the physical cut-height specification.

Use this sequence:

1. Disable or hold automatic height correction for a short test when safe and supported.
2. Establish the chart’s physical cut height.
3. Cut at the selected speed.
4. Observe stable arc voltage.
5. Use that voltage as the machine-specific starting target.
6. Re-enable THC and verify that it maintains the intended physical height.

If voltage is adjusted without confirming actual height, the system may consistently maintain the wrong distance.

## Work-Lead and Electrical Checks

A poor work-lead connection can cause:

- Unstable arc
- Difficult starts
- Incomplete cuts
- Erratic voltage
- Increased consumable wear
- Cut-quality variation across the plate

Attach the work lead to clean conductive material. Do not rely on current traveling through rust, paint, loose slats, or heavily oxidized contact points.

## Controlled Troubleshooting Coupon

Use a coupon that contains:

- Long straight cuts
- External square
- Internal square
- Several holes
- Sharp corner
- Lead-in and lead-out
- Labels for test numbers

Change one variable at a time.

A practical speed series might be:

```text
Test 1: Current speed −10%
Test 2: Current speed −5%
Test 3: Current speed
Test 4: Current speed +5%
Test 5: Current speed +10%
```

Record:

- Material and measured thickness
- Amperage
- Consumables
- Speed
- Pierce height and delay
- Cut height
- Arc voltage
- Air pressure under flow
- Dross type
- Bevel
- Kerf
- Photos

## Diagnostic Table

| Symptom | Most likely first checks |
|---|---|
| Large bubbly bottom dross | Speed too slow, excessive heat |
| Small hard bottom bead | Speed too fast, torch too high, low current |
| Top spatter | Worn nozzle, high standoff, speed too fast |
| Positive bevel everywhere | High torch, high voltage, speed too fast, low current |
| Negative bevel everywhere | Torch too low, speed too slow, current too high |
| Bevel on one direction only | Torch alignment, gantry, nozzle, cut direction |
| Wide kerf | High torch, worn nozzle, slow speed, high current |
| Narrow kerf | Low torch, fast speed, low current |
| Rough repeating pattern | Motion vibration, rack, belt, bearing, tuning |
| Good straight cuts, bad corners | Acceleration, THC dive, corner slowdown |
| Good short cuts, bad long cuts | Airflow or compressor capacity |
| Random quality changes | Air contamination, work lead, loose motion, consumables |
| Incomplete cut | Fast speed, low current, low flow, high torch, short delay |
| Holes out of round | Acceleration, lead-in, hole speed, THC movement |

## What Not to Do

Avoid these common mistakes:

### Changing speed, voltage, and amperage together

You will not know which change affected the cut.

### Correcting every problem with voltage

Voltage controls torch height; it does not repair worn consumables, poor air, or mechanical play.

### Using kerf compensation to correct bevel

Kerf compensation changes dimensions, not edge angle.

### Judging only by whether the part falls out

A separated part can still have excessive bevel, poor dimensions, and damaging settings.

### Grinding the coupon before inspection

Inspect and photograph the original edge first.

### Continuing to tune with damaged consumables

Replace or verify the consumable set before calibration.

## A Practical Troubleshooting Decision Path

Use this sequence:

### 1. Is the arc stable?

If no, check air, consumables, work lead, and power source.

### 2. Is the torch physically at the correct height?

If no, correct IHS, Z motion, cut height, and THC.

### 3. Is the defect the same in every direction?

If no, inspect alignment, motion, plate support, and cut direction.

### 4. What type of dross is present?

- Large and bubbly: increase speed
- Small and hard: reduce speed and verify height/current
- Top spatter: inspect nozzle, height, and speed

### 5. Is the kerf repeatable?

If no, inspect consumables, air, and motion before changing compensation.

### 6. Do repeated coupons produce the same result?

If no, find the unstable machine or process condition first.

## Final Thoughts

Good plasma troubleshooting is a process of reading evidence.

The most reliable order is:

1. Confirm the chart and material
2. Inspect consumables
3. Verify clean, dry air under flow
4. Check the work lead
5. Square the torch
6. Verify physical height
7. Tune speed
8. Confirm current and nozzle
9. Confirm cut direction
10. Measure kerf only after the process is stable
11. Repeat the coupon

The goal is not to create one perfect cut by accident. The goal is to identify a stable combination that produces the same acceptable result repeatedly.

## Sources and Further Reading

- [Hypertherm — Troubleshooting cut quality problems](https://www.hypertherm.com/resources/system-support/maintenance-and-use/cut-quality/)
- [Hypertherm — Troubleshooting excessive dross](https://www.hypertherm.com/resources/system-support/maintenance-and-use/cut-quality/too-much-dross/)
- [Hypertherm — Troubleshooting cut angularity](https://www.hypertherm.com/resources/system-support/maintenance-and-use/cut-quality/cut-angularity/)
- [Hypertherm — Basic tips to improve plasma cut quality](https://www.hypertherm.com/resources/more-resources/articles/basic-tips-to-improve-plasma-cut-quality/)
- [Hypertherm — Ten common plasma-cutting mistakes](https://www.hypertherm.com/resources/more-resources/articles/10-common-plasma-cutting-mistakes/)
- [Hypertherm — Troubleshooting hole quality](https://www.hypertherm.com/resources/system-support/maintenance-and-use/cut-quality/hole-quality/)
- [Hypertherm — Table slats and plasma cut quality](https://www.hypertherm.com/resources/more-resources/blogs/table-slats-and-plasma-cut-quality/)
- [ESAB — How air pressure affects plasma cut quality](https://esab.com/us/nam_en/esab-university/articles/how-air-pressure-affects-plasma-cut-quality/)
