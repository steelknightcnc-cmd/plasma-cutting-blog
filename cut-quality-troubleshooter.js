const SYMPTOM_LABELS = {
  "low-speed-dross": "Large bubbly bottom dross",
  "high-speed-dross": "Small hard bottom bead",
  "top-spatter": "Top spatter",
  "positive-bevel": "Positive bevel",
  "negative-bevel": "Negative bevel",
  "directional-bevel": "Directional or one-sided bevel",
  "incomplete-cut": "Incomplete cut",
  "poor-holes": "Poor hole quality",
  "rough-cut": "Rough or inconsistent cut face",
  "wide-kerf": "Kerf too wide",
  "narrow-kerf": "Kerf too narrow",
  "consumable-wear": "Rapid consumable wear"
};

const CAUSES = {
  speedSlow: {
    title: "Cutting speed is too slow",
    why:
      "Excess heat input can widen the kerf and allow molten metal to collect and solidify beneath the plate.",
    inspect:
      "Compare the programmed feed rate with the selected cut-chart row and confirm the machine is actually reaching that speed.",
    adjust:
      "Increase speed in small controlled steps while keeping height, amperage, air, and consumables unchanged.",
    avoid:
      "Do not raise amperage at the same time or you will not know which change improved the cut."
  },
  speedFast: {
    title: "Cutting speed is too fast",
    why:
      "The arc can trail behind the torch and fail to clear molten metal through the bottom of the kerf.",
    inspect:
      "Watch the spark stream during a straight test cut. Strong trailing sparks and a narrow lower kerf support this diagnosis.",
    adjust:
      "Reduce speed in small steps and repeat the same coupon.",
    avoid:
      "Do not immediately lower the torch to compensate for a speed problem."
  },
  torchHigh: {
    title: "Physical cut height is too high",
    why:
      "A long arc loses energy density and contacts more of the upper kerf, increasing positive bevel and top spatter.",
    inspect:
      "Measure or verify the actual torch-to-plate distance during a steady straight cut. Do not rely only on the displayed voltage.",
    adjust:
      "Correct cut height or lower the THC target only after confirming the manufacturer’s physical-height specification.",
    avoid:
      "Do not chase voltage without verifying the real torch height."
  },
  torchLow: {
    title: "Physical cut height is too low",
    why:
      "The torch may over-concentrate heat at the lower kerf, increase negative bevel, or risk shield contact.",
    inspect:
      "Verify initial height sensing, Z-axis motion, cut height, and whether the THC is driving downward.",
    adjust:
      "Restore the specified physical cut height and confirm it on a controlled straight cut.",
    avoid:
      "Do not continue cutting if the shield or nozzle is contacting the plate."
  },
  wornNozzle: {
    title: "Nozzle is worn, damaged, or off-center",
    why:
      "An enlarged or oval nozzle orifice changes arc shape and can create dross, bevel, wide kerf, and inconsistent edge quality.",
    inspect:
      "Power down the system and inspect the nozzle orifice for oval wear, nicks, deposits, and off-center damage.",
    adjust:
      "Replace damaged consumables with the correct matched parts for the selected process.",
    avoid:
      "Do not calibrate kerf compensation around a damaged nozzle."
  },
  wornElectrode: {
    title: "Electrode or consumable stack is worn",
    why:
      "Excessive electrode wear or a damaged swirl ring can destabilize the arc and shorten nozzle life.",
    inspect:
      "Inspect electrode pit depth, swirl-ring holes, shield, retaining cap, and correct part numbers.",
    adjust:
      "Replace the worn components and confirm the complete consumable stack is assembled correctly.",
    avoid:
      "Do not install a new nozzle into an obviously damaged or contaminated consumable stack."
  },
  poorAir: {
    title: "Air contains moisture, oil, or contamination",
    why:
      "Contaminated air destabilizes the arc and accelerates wear of the nozzle and electrode.",
    inspect:
      "Drain the receiver and inspect separators, coalescing filters, dryer performance, and contamination at the torch supply.",
    adjust:
      "Restore clean, dry air before making fine speed or voltage adjustments.",
    avoid:
      "Do not judge new consumable life until the air problem is corrected."
  },
  lowAirflow: {
    title: "Flowing air pressure or volume is inadequate",
    why:
      "Static pressure can look correct while pressure drops during the cut, weakening arc stability and material ejection.",
    inspect:
      "Check pressure while air is flowing and inspect hose diameter, fittings, filters, regulators, and compressor capacity.",
    adjust:
      "Correct restrictions or insufficient delivered airflow and retest at the manufacturer’s specified setting.",
    avoid:
      "Do not increase pressure beyond the machine specification to hide a flow restriction."
  },
  currentLow: {
    title: "Cutting current is too low for the process",
    why:
      "Insufficient arc energy can cause positive bevel, incomplete cuts, hard dross, and a narrow lower kerf.",
    inspect:
      "Confirm the selected amperage, nozzle rating, material thickness, and machine profile match one another.",
    adjust:
      "Use the correct manufacturer process or select the proper consumable and amperage combination.",
    avoid:
      "Do not exceed the nozzle or power-source rating."
  },
  currentHigh: {
    title: "Cutting current is too high for the nozzle or material",
    why:
      "Excess current can widen the kerf, increase heat input, and accelerate consumable wear.",
    inspect:
      "Confirm the nozzle amp rating and the chart process selected for the measured material thickness.",
    adjust:
      "Return to the correct matched nozzle and amperage process.",
    avoid:
      "Do not use amperage as the first correction for a speed or height problem."
  },
  wrongChart: {
    title: "Wrong process, material thickness, or consumable selection",
    why:
      "A chart row only works when material, thickness, amperage, nozzle, gas, height, and speed belong to the same process.",
    inspect:
      "Measure the plate thickness and verify the exact material, machine profile, consumable set, and cut-chart row.",
    adjust:
      "Restart from the correct chart process before fine tuning.",
    avoid:
      "Do not mix speed from one process with amperage or consumables from another."
  },
  torchSquare: {
    title: "Torch is not perpendicular to the plate",
    why:
      "A tilted torch produces direction-dependent bevel even when speed and height are otherwise correct.",
    inspect:
      "Check torch mounting, Z-axis carriage play, gantry alignment, and perpendicularity in both machine axes.",
    adjust:
      "Square the torch mechanically and cut a marked square to compare +X, -X, +Y, and -Y edges.",
    avoid:
      "Do not correct a directional mechanical error with global kerf compensation."
  },
  cutDirection: {
    title: "Contour direction places the poor side on the saved part",
    why:
      "Plasma swirl creates a better side and a more beveled side of the kerf.",
    inspect:
      "Verify inside and outside contour directions in CAM against the plasma-source guidance.",
    adjust:
      "Reverse the affected contour direction if the good side is being placed on the scrap.",
    avoid:
      "Do not assume all inside and outside paths should run in the same direction."
  },
  motion: {
    title: "Machine motion, vibration, or lost accuracy",
    why:
      "Loose components, damaged rack or belt teeth, bearing roughness, or poor tuning can create repeating striations and directional defects.",
    inspect:
      "Check gantry play, torch-mount rigidity, rack and pinion, belts, couplers, bearings, acceleration, and repeated mark spacing.",
    adjust:
      "Repair the mechanical source and verify motion with straight and diagonal test cuts.",
    avoid:
      "Do not tune plasma parameters around mechanical chatter."
  },
  thcDive: {
    title: "THC is diving during corners or short moves",
    why:
      "The machine slows while arc voltage changes, causing the THC to drive the torch below the intended cut height.",
    inspect:
      "Review minimum THC speed, anti-dive, voltage sampling delay, and whether the defect appears near corners or kerf crossings.",
    adjust:
      "Lock or inhibit THC during unsuitable motion and tune anti-dive according to the controller documentation.",
    avoid:
      "Do not lower global voltage to fix a corner-only dive."
  },
  holeStrategy: {
    title: "Hole speed, lead-in, or lead-out strategy is unsuitable",
    why:
      "Small holes may never reach straight-line chart speed, and poor lead geometry can create divots, bumps, taper, and out-of-round shapes.",
    inspect:
      "Check hole diameter, hole speed percentage, lead-in type, lead-out, overburn, and THC behavior during the circle.",
    adjust:
      "Use a dedicated hole process and test changes on a repeatable hole coupon.",
    avoid:
      "Do not judge small-hole performance from long straight-cut settings alone."
  },
  workLead: {
    title: "Work-lead connection is poor or inconsistent",
    why:
      "Rust, paint, weak clamping, or current traveling through dirty slats can destabilize the arc and voltage.",
    inspect:
      "Attach the work lead to clean conductive material and inspect cable, clamp, and connection points.",
    adjust:
      "Restore a solid low-resistance connection close to the work when practical.",
    avoid:
      "Do not rely on heavily oxidized or dross-covered slats as the only current path."
  },
  slatsPlate: {
    title: "Plate support, slats, or material flatness is changing height",
    why:
      "Bent or dross-covered slats and warped plate make a correct voltage target maintain the wrong physical distance in some areas.",
    inspect:
      "Check plate flatness, slat height, dross buildup, table level, and whether the problem changes by table location.",
    adjust:
      "Clean or replace damaged slats and stabilize the plate before recalibrating height.",
    avoid:
      "Do not tune a single voltage value around an uneven cutting surface."
  },
  pierceDelay: {
    title: "Pierce delay or pierce sequence is inadequate",
    why:
      "Moving before the arc fully penetrates can leave an incomplete start and damage the following cut.",
    inspect:
      "Check the chart pierce delay, pierce height, torch movement timing, and whether the defect begins at the lead-in.",
    adjust:
      "Restore the correct pierce height and delay, then verify with a test coupon.",
    avoid:
      "Do not increase delay excessively because that can damage consumables and enlarge the pierce."
  }
};

const BASE_SCORES = {
  "low-speed-dross": {
    speedSlow: 100,
    torchLow: 55,
    currentHigh: 45,
    thcDive: 35,
    wrongChart: 30
  },
  "high-speed-dross": {
    speedFast: 100,
    torchHigh: 80,
    currentLow: 65,
    wornNozzle: 60,
    lowAirflow: 45,
    wrongChart: 35
  },
  "top-spatter": {
    wornNozzle: 95,
    torchHigh: 90,
    speedFast: 75,
    poorAir: 55,
    lowAirflow: 45
  },
  "positive-bevel": {
    torchHigh: 100,
    speedFast: 85,
    currentLow: 65,
    wornNozzle: 60,
    cutDirection: 45,
    wrongChart: 35
  },
  "negative-bevel": {
    torchLow: 100,
    speedSlow: 80,
    currentHigh: 60,
    wrongChart: 35
  },
  "directional-bevel": {
    torchSquare: 100,
    wornNozzle: 75,
    motion: 70,
    cutDirection: 65,
    slatsPlate: 45
  },
  "incomplete-cut": {
    speedFast: 95,
    currentLow: 90,
    wrongChart: 85,
    lowAirflow: 75,
    torchHigh: 65,
    workLead: 60,
    pierceDelay: 55
  },
  "poor-holes": {
    holeStrategy: 100,
    thcDive: 85,
    motion: 70,
    torchHigh: 55,
    pierceDelay: 50,
    wornNozzle: 45
  },
  "rough-cut": {
    wornNozzle: 90,
    poorAir: 85,
    lowAirflow: 75,
    motion: 70,
    wrongChart: 60,
    torchHigh: 50,
    workLead: 45
  },
  "wide-kerf": {
    wornNozzle: 100,
    torchHigh: 90,
    speedSlow: 75,
    currentHigh: 65,
    wrongChart: 45
  },
  "narrow-kerf": {
    speedFast: 90,
    torchLow: 85,
    currentLow: 70,
    wrongChart: 45
  },
  "consumable-wear": {
    poorAir: 100,
    wornElectrode: 90,
    torchLow: 75,
    currentHigh: 70,
    wrongChart: 65,
    pierceDelay: 50
  }
};

const form = document.querySelector("#quality-form");
const results = document.querySelector("#quality-results");
const resultTitle = document.querySelector("#quality-result-title");
const resultSummary = document.querySelector("#quality-result-summary");
const sequence = document.querySelector("#quality-check-sequence");
const causeList = document.querySelector("#quality-cause-list");
const message = document.querySelector("#quality-form-message");
const resetButton = document.querySelector("#quality-reset");

function addScore(scores, key, amount) {
  scores[key] = (scores[key] || 0) + amount;
}

function applyContext(scores, pattern, consumables, air) {
  if (pattern === "one-direction") {
    addScore(scores, "torchSquare", 60);
    addScore(scores, "motion", 45);
    addScore(scores, "cutDirection", 40);
  }

  if (pattern === "corners-holes") {
    addScore(scores, "thcDive", 65);
    addScore(scores, "holeStrategy", 55);
    addScore(scores, "motion", 25);
  }

  if (pattern === "intermittent") {
    addScore(scores, "poorAir", 45);
    addScore(scores, "lowAirflow", 40);
    addScore(scores, "workLead", 50);
    addScore(scores, "motion", 40);
    addScore(scores, "slatsPlate", 55);
  }

  if (consumables === "used") {
    addScore(scores, "wornNozzle", 60);
    addScore(scores, "wornElectrode", 45);
  } else if (consumables === "known-good") {
    addScore(scores, "wornNozzle", -35);
    addScore(scores, "wornElectrode", -30);
  } else {
    addScore(scores, "wornNozzle", 20);
    addScore(scores, "wornElectrode", 15);
  }

  if (air === "problem") {
    addScore(scores, "poorAir", 80);
    addScore(scores, "lowAirflow", 65);
  } else if (air === "known-good") {
    addScore(scores, "poorAir", -45);
    addScore(scores, "lowAirflow", -35);
  } else {
    addScore(scores, "poorAir", 20);
    addScore(scores, "lowAirflow", 20);
  }
}

function buildSequence(rankedCauses) {
  const preferredOrder = [
    "wrongChart",
    "wornNozzle",
    "wornElectrode",
    "poorAir",
    "lowAirflow",
    "workLead",
    "torchSquare",
    "slatsPlate",
    "torchHigh",
    "torchLow",
    "speedFast",
    "speedSlow",
    "currentLow",
    "currentHigh",
    "thcDive",
    "holeStrategy",
    "motion",
    "pierceDelay",
    "cutDirection"
  ];

  const rankedKeys = new Set(rankedCauses.map(([key]) => key));
  const ordered = preferredOrder.filter((key) => rankedKeys.has(key)).slice(0, 5);

  return ordered.map((key) => CAUSES[key].inspect);
}

function renderResults(symptom, pattern, consumables, air) {
  const scores = { ...(BASE_SCORES[symptom] || {}) };
  applyContext(scores, pattern, consumables, air);

  const ranked = Object.entries(scores)
    .filter(([key, score]) => CAUSES[key] && score > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  resultTitle.textContent = SYMPTOM_LABELS[symptom];
  resultSummary.textContent =
    "These are the highest-priority checks based on the symptom and context you selected. They are ranked starting points—not a substitute for the plasma-source manual or a controlled test coupon.";

  sequence.innerHTML = "";
  for (const stepText of buildSequence(ranked)) {
    const item = document.createElement("li");
    item.textContent = stepText;
    sequence.appendChild(item);
  }

  causeList.innerHTML = "";

  ranked.forEach(([key], index) => {
    const cause = CAUSES[key];
    const article = document.createElement("article");
    article.className = "quality-cause-card";

    article.innerHTML = `
      <div class="quality-cause-rank">${index + 1}</div>
      <div class="quality-cause-content">
        <h3>${cause.title}</h3>
        <p class="quality-cause-why">${cause.why}</p>

        <dl>
          <div>
            <dt>Inspect</dt>
            <dd>${cause.inspect}</dd>
          </div>
          <div>
            <dt>Adjustment</dt>
            <dd>${cause.adjust}</dd>
          </div>
          <div>
            <dt>Avoid</dt>
            <dd>${cause.avoid}</dd>
          </div>
        </dl>
      </div>
    `;

    causeList.appendChild(article);
  });

  results.hidden = false;
  results.scrollIntoView({ behavior: "smooth", block: "start" });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const data = new FormData(form);
  const symptom = data.get("symptom");

  if (!symptom) {
    message.textContent = "Select the cut defect that most closely matches what you see.";
    return;
  }

  message.textContent = "";
  renderResults(
    symptom,
    data.get("pattern"),
    data.get("consumables"),
    data.get("air")
  );
});

resetButton.addEventListener("click", () => {
  form.reset();
  results.hidden = true;
  message.textContent = "";
  form.scrollIntoView({ behavior: "smooth", block: "start" });
});
