const MATERIAL_LABELS = {
  "mild-steel": "Mild steel",
  "stainless-steel": "Stainless steel",
  "aluminum": "Aluminum"
};

const PRIORITY_LABELS = {
  quality: "Quality priority",
  balanced: "Balanced",
  speed: "Speed priority"
};

const PRIORITY_BLEND = {
  quality: 0,
  balanced: 0.45,
  speed: 1
};

const form = document.querySelector("#cut-form");
const thicknessInput = document.querySelector("#thickness");
const thicknessUnit = document.querySelector("#thickness-unit");
const convertedThickness = document.querySelector("#converted-thickness");
const resultStatus = document.querySelector("#result-status");
const resultMessage = document.querySelector("#result-message");
const resultGrid = document.querySelector("#result-grid");
const resultDetails = document.querySelector("#result-details");

document.querySelector("#current-year").textContent = new Date().getFullYear();

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function toMillimeters(value, unit) {
  return unit === "in" ? value * 25.4 : value;
}

function toInches(valueMm) {
  return valueMm / 25.4;
}

function mmMinToIpm(value) {
  return value / 25.4;
}

function barToPsi(value) {
  return value * 14.5037738;
}

function updateConvertedThickness() {
  const entered = Number.parseFloat(thicknessInput.value);
  if (!Number.isFinite(entered) || entered <= 0) {
    convertedThickness.textContent = "Enter a valid thickness.";
    return;
  }

  const mm = toMillimeters(entered, thicknessUnit.value);
  convertedThickness.textContent =
    `${round(mm, 2).toFixed(2)} mm / ${round(toInches(mm), 3).toFixed(3)} in`;
}

function setStatus(label, type = "") {
  resultStatus.className = `status-pill ${type}`.trim();
  resultStatus.textContent = label;
}

function clearResult() {
  resultGrid.hidden = true;
  resultDetails.hidden = true;
}

function interpolate(x, x1, x2, y1, y2) {
  if (x1 === x2) return y1;
  return y1 + ((x - x1) / (x2 - x1)) * (y2 - y1);
}

function selectProcessSeries({ machineProfile, material, thicknessMm, machineMaxAmps }) {
  const allRecords = (window.PLASMA_CUT_CHARTS || []).filter((record) =>
    record.machineProfile === machineProfile &&
    record.material === material &&
    record.processAmps <= machineMaxAmps &&
    record.validated === true
  );

  const availableAmps = [...new Set(allRecords.map((record) => record.processAmps))]
    .sort((a, b) => a - b);

  for (const amps of availableAmps) {
    const series = allRecords
      .filter((record) => record.processAmps === amps)
      .sort((a, b) => a.thicknessMm - b.thicknessMm);

    const minimum = series[0]?.thicknessMm;
    const maximum = series.at(-1)?.thicknessMm;

    if (thicknessMm >= minimum && thicknessMm <= maximum) {
      return series;
    }
  }

  return null;
}

function getCalculatedRecord(values) {
  const series = selectProcessSeries(values);
  if (!series) return null;

  const exact = series.find(
    (record) => Math.abs(record.thicknessMm - values.thicknessMm) < 0.001
  );

  if (exact) {
    return { ...exact, interpolated: false };
  }

  const lower = [...series]
    .reverse()
    .find((record) => record.thicknessMm < values.thicknessMm);
  const upper = series.find((record) => record.thicknessMm > values.thicknessMm);

  if (!lower || !upper) return null;

  return {
    ...lower,
    id: `interpolated-${lower.id}-${upper.id}`,
    thicknessMm: values.thicknessMm,
    qualitySpeedMmMin: interpolate(
      values.thicknessMm,
      lower.thicknessMm,
      upper.thicknessMm,
      lower.qualitySpeedMmMin,
      upper.qualitySpeedMmMin
    ),
    productionSpeedMmMin: interpolate(
      values.thicknessMm,
      lower.thicknessMm,
      upper.thicknessMm,
      lower.productionSpeedMmMin,
      upper.productionSpeedMmMin
    ),
    pierceDelaySeconds: interpolate(
      values.thicknessMm,
      lower.thicknessMm,
      upper.thicknessMm,
      lower.pierceDelaySeconds,
      upper.pierceDelaySeconds
    ),
    source:
      `${lower.source} Interpolated between ${lower.thicknessMm} mm and ${upper.thicknessMm} mm rows.`,
    interpolated: true
  };
}

function calculateFeedRate(record, priority) {
  const blend = PRIORITY_BLEND[priority];
  return record.qualitySpeedMmMin +
    blend * (record.productionSpeedMmMin - record.qualitySpeedMmMin);
}

function renderResult(record, values) {
  const feedMmMin = calculateFeedRate(record, values.priority);

  document.querySelector("#feed-mm").textContent =
    `${Math.round(feedMmMin).toLocaleString()} mm/min`;
  document.querySelector("#feed-ipm").textContent =
    `${round(mmMinToIpm(feedMmMin), 1).toFixed(1)} IPM`;
  document.querySelector("#pierce-delay").textContent =
    `${round(record.pierceDelaySeconds, 2).toFixed(2)} sec`;
  document.querySelector("#gas-bar").textContent =
    `${round(record.gasPressureBar, 1).toFixed(1)} bar`;
  document.querySelector("#gas-psi").textContent =
    `${round(barToPsi(record.gasPressureBar), 1).toFixed(1)} PSI`;
  document.querySelector("#cutting-amps").textContent =
    `${record.processAmps} A`;

  document.querySelector("#result-material").textContent =
    MATERIAL_LABELS[values.material];
  document.querySelector("#result-thickness").textContent =
    `${round(values.thicknessMm, 2).toFixed(2)} mm / ${round(toInches(values.thicknessMm), 3).toFixed(3)} in`;
  document.querySelector("#result-priority").textContent =
    PRIORITY_LABELS[values.priority];
  document.querySelector("#result-source").textContent = record.source;

  resultMessage.hidden = false;
  resultMessage.innerHTML =
    `<strong>Reference profile:</strong> Speed and pierce delay are based on the
    Hypertherm Powermax65/85 shielded-air chart. They are not Stamos factory
    settings. Begin with a test coupon and tune your machine from this starting point.`;

  resultGrid.hidden = false;
  resultDetails.hidden = false;

  setStatus(
    record.interpolated ? "Interpolated reference" : "Reference chart",
    "success"
  );
}

function showUnavailable(message, status = "No reference data") {
  clearResult();
  resultMessage.hidden = false;
  resultMessage.innerHTML = message;
  setStatus(status, "warning");
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const data = new FormData(form);
  const enteredThickness = Number.parseFloat(data.get("thickness"));
  const machineMaxAmps = Number.parseFloat(data.get("machine-amps"));

  if (!Number.isFinite(enteredThickness) || enteredThickness <= 0) {
    showUnavailable("Enter a thickness greater than zero.", "Check input");
    return;
  }

  if (!Number.isFinite(machineMaxAmps) || machineMaxAmps <= 0) {
    showUnavailable("Enter the plasma cutter’s maximum amperage.", "Check input");
    return;
  }

  const values = {
    material: data.get("material"),
    thicknessMm: toMillimeters(enteredThickness, data.get("thickness-unit")),
    machineMaxAmps,
    priority: data.get("priority"),
    machineProfile: data.get("machine-profile")
  };

  const record = getCalculatedRecord(values);

  if (!record) {
    showUnavailable(
      `No supported Hypertherm reference process was found for
      <strong>${MATERIAL_LABELS[values.material]}</strong> at
      <strong>${round(values.thicknessMm, 2)} mm</strong> with a machine limit of
      <strong>${machineMaxAmps} A</strong>. Increase machine capacity only if your
      actual plasma cutter supports it, or use an edge-start procedure for material
      beyond the piercing range.`,
      "Outside chart range"
    );
    return;
  }

  renderResult(record, values);
});

thicknessInput.addEventListener("input", updateConvertedThickness);
thicknessUnit.addEventListener("change", updateConvertedThickness);
updateConvertedThickness();
