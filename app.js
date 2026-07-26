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
const machineAmpsInput = document.querySelector("#machine-amps");
const machineProfileSelect = document.querySelector("#machine-profile");
const profileHelp = machineProfileSelect.nextElementSibling;
const resultStatus = document.querySelector("#result-status");
const resultMessage = document.querySelector("#result-message");
const resultGrid = document.querySelector("#result-grid");
const resultDetails = document.querySelector("#result-details");
const cutCardActions = document.querySelector("#cut-card-actions");
const cutCardActionMessage = document.querySelector("#cut-card-action-message");
const printCutCardButton = document.querySelector("#print-cut-card");
const downloadCutCardButton = document.querySelector("#download-cut-card");
const copyCutResultsButton = document.querySelector("#copy-cut-results");

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

function getProfiles() {
  return window.PLASMA_MACHINE_PROFILES || [];
}

function getSelectedProfile() {
  return getProfiles().find(
    (profile) => profile.id === machineProfileSelect.value
  );
}

function populateMachineProfiles() {
  const profiles = getProfiles();
  const groupNames = [...new Set(profiles.map((profile) => profile.group))];

  machineProfileSelect.innerHTML = "";

  for (const groupName of groupNames) {
    const optgroup = document.createElement("optgroup");
    optgroup.label = groupName;

    for (const profile of profiles.filter(
      (item) => item.group === groupName
    )) {
      const option = document.createElement("option");
      option.value = profile.id;
      option.textContent = profile.label;
      optgroup.appendChild(option);
    }

    machineProfileSelect.appendChild(optgroup);
  }

  const requestedProfile = new URLSearchParams(window.location.search).get("profile");
  const hasRequestedProfile = profiles.some(
    (profile) => profile.id === requestedProfile
  );

  machineProfileSelect.value = hasRequestedProfile
    ? requestedProfile
    : "stamos-s-plasma-85";

  updateSelectedProfile(true);

  if (hasRequestedProfile && window.location.hash === "#calculator") {
    window.setTimeout(() => {
      document.querySelector("#calculator")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 120);
  }
}

function updateSelectedProfile(setDefaultAmps = false) {
  const profile = getSelectedProfile();
  if (!profile) return;

  profileHelp.textContent = profile.help;

  if (setDefaultAmps || profile.id !== "generic-air-plasma") {
    machineAmpsInput.value = profile.defaultMaxAmps;
  }
}

function setStatus(label, type = "") {
  resultStatus.className = `status-pill ${type}`.trim();
  resultStatus.textContent = label;
}

function clearResult() {
  resultGrid.hidden = true;
  resultDetails.hidden = true;

  if (cutCardActions) {
    cutCardActions.hidden = true;
  }

  if (cutCardActionMessage) {
    cutCardActionMessage.textContent = "";
    cutCardActionMessage.className = "cut-card-action-message";
  }
}

function interpolate(x, x1, x2, y1, y2) {
  if (x1 === x2) return y1;
  return y1 + ((x - x1) / (x2 - x1)) * (y2 - y1);
}

function selectProcessSeries({
  machineProfile,
  material,
  thicknessMm,
  machineMaxAmps
}) {
  const allRecords = (window.PLASMA_CUT_CHARTS || []).filter(
    (record) =>
      record.machineProfile === machineProfile &&
      record.material === material &&
      record.processAmps <= machineMaxAmps &&
      record.validated === true
  );

  const availableAmps = [
    ...new Set(allRecords.map((record) => record.processAmps))
  ].sort((a, b) => a - b);

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

  const upper = series.find(
    (record) => record.thicknessMm > values.thicknessMm
  );

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
    recommendedCutVoltage: interpolate(
      values.thicknessMm,
      lower.thicknessMm,
      upper.thicknessMm,
      lower.recommendedCutVoltage,
      upper.recommendedCutVoltage
    ),
    source:
      `${lower.source} Interpolated between ${lower.thicknessMm} mm and ${upper.thicknessMm} mm rows.`,
    interpolated: true
  };
}

function calculateFeedRate(record, priority) {
  const blend = PRIORITY_BLEND[priority];

  return (
    record.qualitySpeedMmMin +
    blend *
      (record.productionSpeedMmMin - record.qualitySpeedMmMin)
  );
}

function renderGasPressure(record) {
  document.querySelector("#gas-bar").textContent =
    record.gasPressurePrimary || "Machine-specific";

  document.querySelector("#gas-psi").textContent =
    record.gasPressureSecondary || "Use manufacturer setting";
}

function renderCutVoltage(record) {
  const voltageValue = Number(record.recommendedCutVoltage);
  const voltageTarget = document.querySelector("#cut-voltage");
  const voltageNote = document.querySelector("#cut-voltage-note");

  if (Number.isFinite(voltageValue)) {
    voltageTarget.textContent = `${Math.round(voltageValue)} V`;
    voltageNote.textContent = "Starting THC value — verify on your table";
    return;
  }

  voltageTarget.textContent = "Machine-specific";
  voltageNote.textContent = "Set from test cuts and actual cut height";
}

function renderResult(record, values, profile) {
  const feedMmMin = calculateFeedRate(record, values.priority);

  document.querySelector("#feed-mm").textContent =
    `${Math.round(feedMmMin).toLocaleString()} mm/min`;

  document.querySelector("#feed-ipm").textContent =
    `${round(mmMinToIpm(feedMmMin), 1).toFixed(1)} IPM`;

  document.querySelector("#pierce-delay").textContent =
    `${round(record.pierceDelaySeconds, 2).toFixed(2)} sec`;

  renderGasPressure(record);

  document.querySelector("#cutting-amps").textContent =
    `${record.processAmps} A`;

  renderCutVoltage(record);

  document.querySelector("#result-material").textContent =
    MATERIAL_LABELS[values.material];

  document.querySelector("#result-thickness").textContent =
    `${round(values.thicknessMm, 2).toFixed(2)} mm / ${round(
      toInches(values.thicknessMm),
      3
    ).toFixed(3)} in`;

  document.querySelector("#result-priority").textContent =
    PRIORITY_LABELS[values.priority];

  document.querySelector("#result-source").textContent =
    `${profile.label}. ${record.source}`;

  resultMessage.hidden = false;

  if (record.referenceOnly) {
    resultMessage.innerHTML =
      `<strong>Reference profile:</strong> ${profile.label} uses Hypertherm
      shielded-air speed and pierce-delay data as a starting point. It is not
      factory data for every torch or plasma source. Test a coupon and tune the
      result for your machine. Recommended cut voltage is a practical THC starting value and must be verified with test coupons.`;
  } else {
    resultMessage.innerHTML =
      `<strong>Manufacturer profile:</strong> ${profile.label} uses the official
      Hypertherm Powermax65/85 shielded-air chart. Hypertherm normally controls
      gas pressure automatically in standard operation. Recommended cut voltage is still a machine-specific THC starting value and must be confirmed on your table.`;
  }

  resultGrid.hidden = false;
  resultDetails.hidden = false;

  if (cutCardActions) {
    cutCardActions.hidden = false;
  }

  if (cutCardActionMessage) {
    cutCardActionMessage.textContent = "";
    cutCardActionMessage.className = "cut-card-action-message";
  }

  if (record.interpolated && record.referenceOnly) {
    setStatus("Interpolated reference", "success");
  } else if (record.interpolated) {
    setStatus("Interpolated chart", "success");
  } else if (record.referenceOnly) {
    setStatus("Reference chart", "success");
  } else {
    setStatus("Manufacturer chart", "success");
  }
}

function showUnavailable(message, status = "No chart data") {
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
  const profile = getSelectedProfile();

  if (!profile) {
    showUnavailable("Select a valid machine profile.", "Check profile");
    return;
  }

  if (!profile.supported) {
    showUnavailable(
      `<strong>${profile.label}</strong> is included in the machine list, but
      its official cut-chart rows have not been loaded yet. The calculator will
      not substitute Hypertherm values and label them as this manufacturer's
      factory settings.`,
      "Chart coming soon"
    );
    return;
  }

  if (!Number.isFinite(enteredThickness) || enteredThickness <= 0) {
    showUnavailable("Enter a thickness greater than zero.", "Check input");
    return;
  }

  if (!Number.isFinite(machineMaxAmps) || machineMaxAmps <= 0) {
    showUnavailable(
      "Enter the plasma cutter’s maximum amperage.",
      "Check input"
    );
    return;
  }

  const values = {
    material: data.get("material"),
    thicknessMm: toMillimeters(
      enteredThickness,
      data.get("thickness-unit")
    ),
    machineMaxAmps,
    priority: data.get("priority"),
    machineProfile: profile.id
  };

  const record = getCalculatedRecord(values);

  if (!record) {
    showUnavailable(
      `No supported process was found for
      <strong>${MATERIAL_LABELS[values.material]}</strong> at
      <strong>${round(values.thicknessMm, 2)} mm</strong> with a limit of
      <strong>${machineMaxAmps} A</strong> in the
      <strong>${profile.label}</strong> profile.`,
      "Outside chart range"
    );
    return;
  }

  renderResult(record, values, profile);
});

thicknessInput.addEventListener("input", updateConvertedThickness);
thicknessUnit.addEventListener("change", updateConvertedThickness);
machineProfileSelect.addEventListener("change", () =>
  updateSelectedProfile(true)
);




function readResultText(selector, fallback = "—") {
  const value = document.querySelector(selector)?.textContent?.trim();
  return value || fallback;
}

function getCutCardData() {
  if (resultGrid.hidden || resultDetails.hidden) {
    return null;
  }

  const selectedMachine =
    machineProfileSelect.options[machineProfileSelect.selectedIndex]?.textContent?.trim() ||
    "Selected plasma profile";

  return {
    generatedAt: new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date()),
    machineProfile: selectedMachine,
    machineMaximumAmps: `${machineAmpsInput.value || "—"} A`,
    material: readResultText("#result-material"),
    thickness: readResultText("#result-thickness"),
    priority: readResultText("#result-priority"),
    feedRateMetric: readResultText("#feed-mm"),
    feedRateImperial: readResultText("#feed-ipm"),
    pierceDelay: readResultText("#pierce-delay"),
    gasPressurePrimary: readResultText("#gas-bar"),
    gasPressureSecondary: readResultText("#gas-psi"),
    cuttingCurrent: readResultText("#cutting-amps"),
    recommendedVoltage: readResultText("#cut-voltage"),
    voltageNote: readResultText("#cut-voltage-note"),
    dataSource: readResultText("#result-source"),
    resultStatus: readResultText("#result-status")
  };
}

function escapeCutCardHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createCutCardFilename(data, extension) {
  const material = data.material
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const thickness = data.thickness
    .split("/")[0]
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9.-]+/g, "-");

  const amps = data.cuttingCurrent
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9.-]+/g, "");

  return `plasma-cut-forge-${material || "cut"}-${thickness || "settings"}-${amps || "amps"}.${extension}`;
}

function buildCutCardDocument(data, autoPrint = false) {
  const printScript = autoPrint
    ? `<script>
        window.addEventListener("load", () => {
          setTimeout(() => window.print(), 300);
        });
      <\/script>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Plasma Cut Forge Cut Card</title>
  <style>
    :root {
      --ink: #111827;
      --muted: #5f6b7a;
      --line: #cbd5e1;
      --panel: #f7fafc;
      --accent: #0089b5;
      --accent-dark: #005c7a;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: #edf2f7;
      color: var(--ink);
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1.45;
    }

    .sheet {
      width: min(920px, calc(100% - 32px));
      margin: 24px auto;
      padding: 32px;
      border: 1px solid var(--line);
      border-top: 8px solid var(--accent);
      background: #fff;
      box-shadow: 0 20px 60px rgba(15, 23, 42, 0.12);
    }

    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 24px;
      padding-bottom: 20px;
      border-bottom: 2px solid var(--ink);
    }

    .brand {
      margin: 0;
      font-size: 15px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .brand span {
      color: var(--accent);
    }

    h1 {
      margin: 8px 0 0;
      font-size: clamp(30px, 6vw, 52px);
      line-height: 0.95;
      text-transform: uppercase;
    }

    .generated {
      min-width: 210px;
      color: var(--muted);
      font-size: 13px;
      text-align: right;
    }

    .summary {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin: 24px 0;
    }

    .item {
      min-width: 0;
      padding: 14px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
    }

    .item.featured {
      border-color: var(--accent);
      background: #eefbff;
    }

    .label {
      display: block;
      margin-bottom: 5px;
      color: var(--muted);
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .value {
      display: block;
      overflow-wrap: anywhere;
      font-size: 19px;
      font-weight: 800;
    }

    .subvalue {
      display: block;
      margin-top: 3px;
      color: var(--muted);
      font-size: 13px;
    }

    .source,
    .warning,
    .notes {
      margin-top: 18px;
      padding: 16px;
      border: 1px solid var(--line);
      border-radius: 8px;
    }

    .source p,
    .warning p {
      margin: 5px 0 0;
    }

    .warning {
      border-left: 5px solid #d97706;
      background: #fffaf0;
    }

    .notes {
      display: grid;
      gap: 14px;
    }

    .note-line {
      min-height: 34px;
      padding-bottom: 6px;
      border-bottom: 1px solid #94a3b8;
    }

    .footer {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      margin-top: 24px;
      padding-top: 14px;
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 12px;
    }

    @page {
      size: auto;
      margin: 0.45in;
    }

    @media print {
      body {
        background: #fff;
      }

      .sheet {
        width: 100%;
        margin: 0;
        padding: 0;
        border-right: 0;
        border-bottom: 0;
        border-left: 0;
        box-shadow: none;
      }
    }

    @media (max-width: 650px) {
      .header,
      .footer {
        flex-direction: column;
      }

      .generated {
        text-align: left;
      }

      .summary {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <main class="sheet">
    <header class="header">
      <div>
        <p class="brand">PLASMA<span>CUT</span>FORGE</p>
        <h1>CNC Plasma Cut Card</h1>
      </div>
      <div class="generated">
        <strong>Generated</strong><br>
        ${escapeCutCardHtml(data.generatedAt)}
      </div>
    </header>

    <section class="summary">
      <div class="item">
        <span class="label">Machine profile</span>
        <span class="value">${escapeCutCardHtml(data.machineProfile)}</span>
        <span class="subvalue">Machine maximum: ${escapeCutCardHtml(data.machineMaximumAmps)}</span>
      </div>

      <div class="item">
        <span class="label">Material and thickness</span>
        <span class="value">${escapeCutCardHtml(data.material)}</span>
        <span class="subvalue">${escapeCutCardHtml(data.thickness)}</span>
      </div>

      <div class="item featured">
        <span class="label">Feed rate</span>
        <span class="value">${escapeCutCardHtml(data.feedRateMetric)}</span>
        <span class="subvalue">${escapeCutCardHtml(data.feedRateImperial)}</span>
      </div>

      <div class="item">
        <span class="label">Pierce delay</span>
        <span class="value">${escapeCutCardHtml(data.pierceDelay)}</span>
      </div>

      <div class="item">
        <span class="label">Gas pressure</span>
        <span class="value">${escapeCutCardHtml(data.gasPressurePrimary)}</span>
        <span class="subvalue">${escapeCutCardHtml(data.gasPressureSecondary)}</span>
      </div>

      <div class="item">
        <span class="label">Cutting current</span>
        <span class="value">${escapeCutCardHtml(data.cuttingCurrent)}</span>
      </div>

      <div class="item featured">
        <span class="label">Recommended cut voltage</span>
        <span class="value">${escapeCutCardHtml(data.recommendedVoltage)}</span>
        <span class="subvalue">${escapeCutCardHtml(data.voltageNote)}</span>
      </div>

      <div class="item">
        <span class="label">Cutting priority</span>
        <span class="value">${escapeCutCardHtml(data.priority)}</span>
        <span class="subvalue">${escapeCutCardHtml(data.resultStatus)}</span>
      </div>
    </section>

    <section class="source">
      <strong>Data source</strong>
      <p>${escapeCutCardHtml(data.dataSource)}</p>
    </section>

    <section class="warning">
      <strong>Starting recommendation—not a guaranteed final setting</strong>
      <p>
        Confirm these values with the plasma-source manual and a controlled test
        coupon. Actual results vary with torch height, air quality, consumables,
        table motion, material condition, work-lead connection, and machine setup.
      </p>
    </section>

    <section class="notes">
      <strong>Shop-floor test notes</strong>
      <div class="note-line">Actual tested feed rate:</div>
      <div class="note-line">Actual stable cut voltage:</div>
      <div class="note-line">Measured kerf:</div>
      <div class="note-line">Consumable condition / air-system notes:</div>
      <div class="note-line">Dross, bevel, and cut-quality observations:</div>
    </section>

    <footer class="footer">
      <span>PlasmaCutForge.com</span>
      <span>Calculator results should always be verified through test cuts.</span>
    </footer>
  </main>
  ${printScript}
</body>
</html>`;
}

function buildCutCardText(data) {
  return [
    "PLASMA CUT FORGE — CNC PLASMA CUT CARD",
    "========================================",
    `Generated: ${data.generatedAt}`,
    "",
    `Machine profile: ${data.machineProfile}`,
    `Machine maximum amperage: ${data.machineMaximumAmps}`,
    `Material: ${data.material}`,
    `Thickness: ${data.thickness}`,
    `Priority: ${data.priority}`,
    "",
    `Feed rate: ${data.feedRateMetric} (${data.feedRateImperial})`,
    `Pierce delay: ${data.pierceDelay}`,
    `Gas pressure: ${data.gasPressurePrimary} (${data.gasPressureSecondary})`,
    `Cutting current: ${data.cuttingCurrent}`,
    `Recommended cut voltage: ${data.recommendedVoltage}`,
    `Voltage note: ${data.voltageNote}`,
    `Chart status: ${data.resultStatus}`,
    "",
    `Data source: ${data.dataSource}`,
    "",
    "IMPORTANT:",
    "These are starting recommendations. Confirm them with the plasma-source",
    "manual and a controlled test coupon before production cutting.",
    "",
    "Shop-floor test notes:",
    "Actual tested feed rate: ______________________________",
    "Actual stable cut voltage: _____________________________",
    "Measured kerf: ________________________________________",
    "Consumable / air notes: ________________________________",
    "Dross / bevel observations: ____________________________",
    "",
    "https://plasmacutforge.com"
  ].join("\n");
}

function setCutCardActionMessage(text, type = "") {
  if (!cutCardActionMessage) return;

  cutCardActionMessage.textContent = text;
  cutCardActionMessage.className =
    `cut-card-action-message ${type}`.trim();
}

function printCurrentCutCard() {
  const data = getCutCardData();

  if (!data) {
    setCutCardActionMessage(
      "Calculate a valid set of results before printing.",
      "warning"
    );
    return;
  }

  const printWindow = window.open("", "_blank", "width=1000,height=820");

  if (!printWindow) {
    setCutCardActionMessage(
      "Your browser blocked the print window. Allow pop-ups for this site and try again.",
      "warning"
    );
    return;
  }

  printWindow.opener = null;
  printWindow.document.open();
  printWindow.document.write(buildCutCardDocument(data, true));
  printWindow.document.close();

  setCutCardActionMessage(
    "The printable cut card opened in a new window.",
    "success"
  );
}

function downloadCurrentCutCard() {
  const data = getCutCardData();

  if (!data) {
    setCutCardActionMessage(
      "Calculate a valid set of results before downloading.",
      "warning"
    );
    return;
  }

  const documentText = buildCutCardDocument(data, false);
  const blob = new Blob([documentText], {
    type: "text/html;charset=utf-8"
  });
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = downloadUrl;
  link.download = createCutCardFilename(data, "html");
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);

  setCutCardActionMessage(
    "Cut card downloaded. Open the HTML file to view or print it.",
    "success"
  );
}

async function copyCurrentCutResults() {
  const data = getCutCardData();

  if (!data) {
    setCutCardActionMessage(
      "Calculate a valid set of results before copying.",
      "warning"
    );
    return;
  }

  const resultText = buildCutCardText(data);

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(resultText);
    } else {
      const temporaryField = document.createElement("textarea");
      temporaryField.value = resultText;
      temporaryField.setAttribute("readonly", "");
      temporaryField.style.position = "fixed";
      temporaryField.style.opacity = "0";
      document.body.appendChild(temporaryField);
      temporaryField.select();

      const copied = document.execCommand("copy");
      temporaryField.remove();

      if (!copied) {
        throw new Error("Clipboard fallback failed.");
      }
    }

    setCutCardActionMessage(
      "Calculator results copied to your clipboard.",
      "success"
    );
  } catch (error) {
    console.error(error);
    setCutCardActionMessage(
      "The browser could not copy the results. Use Print Settings or Download Cut Card instead.",
      "warning"
    );
  }
}

printCutCardButton?.addEventListener("click", printCurrentCutCard);
downloadCutCardButton?.addEventListener("click", downloadCurrentCutCard);
copyCutResultsButton?.addEventListener("click", copyCurrentCutResults);

function installHelpfulnessVote() {
  const resultCard = document.querySelector(".result-card");
  const safetyWarning = resultCard?.querySelector(".safety-warning");

  if (!resultCard || !safetyWarning) {
    return;
  }

  let section = document.querySelector("#helpfulness-vote");

  if (!section) {
    section = document.createElement("section");
    section.className = "helpfulness-vote";
    section.id = "helpfulness-vote";
    section.setAttribute("aria-labelledby", "helpfulness-question");

    section.innerHTML = `
      <div class="helpfulness-copy">
        <p class="eyebrow">Your feedback</p>
        <h4 id="helpfulness-question">Did this calculator help?</h4>
        <p>Your answer helps improve future cut-chart profiles and calculator features.</p>
      </div>

      <div class="helpfulness-actions" role="group" aria-label="Was this calculator helpful?">
        <button type="button" class="vote-button" data-vote="yes" aria-pressed="false">
          <span aria-hidden="true">👍</span>
          Yes
        </button>

        <button type="button" class="vote-button" data-vote="no" aria-pressed="false">
          <span aria-hidden="true">👎</span>
          No
        </button>
      </div>

      <div class="vote-totals" aria-live="polite" aria-label="Community vote totals">
        <span><strong id="likes-count">—</strong> likes</span>
        <span><strong id="dislikes-count">—</strong> dislikes</span>
      </div>

      <p class="vote-message" id="vote-message" aria-live="polite"></p>
    `;

    safetyWarning.insertAdjacentElement("afterend", section);
  }

  if (section.dataset.voteReady === "true") {
    return;
  }

  section.dataset.voteReady = "true";

  const storageKey = "plasma-cut-lab-helpfulness-vote";
  const buttons = [...section.querySelectorAll(".vote-button")];
  const message = section.querySelector("#vote-message");
  const likesCount = section.querySelector("#likes-count");
  const dislikesCount = section.querySelector("#dislikes-count");
  const config = window.PLASMA_FEEDBACK_CONFIG || {};
  const projectUrl = String(config.supabaseUrl || "").replace(/\/+$/, "");
  const publishableKey = String(config.supabasePublishableKey || "");
  const configured =
    projectUrl.startsWith("https://") &&
    !projectUrl.includes("YOUR-PROJECT") &&
    publishableKey.length > 20 &&
    !publishableKey.includes("YOUR_PUBLISHABLE_KEY");

  function readSavedVote() {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved === "yes" || saved === "no" ? saved : null;
    } catch (error) {
      return null;
    }
  }

  function saveVote(vote) {
    try {
      localStorage.setItem(storageKey, vote);
    } catch (error) {
      // Voting still works for this page view when storage is restricted.
    }
  }

  function applySelectedVote(vote) {
    buttons.forEach((button) => {
      const selected = button.dataset.vote === vote;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  function setButtonsDisabled(disabled) {
    buttons.forEach((button) => {
      button.disabled = disabled;
    });
  }

  function renderTotals(totals) {
    const likes = Number(totals?.likes);
    const dislikes = Number(totals?.dislikes);

    likesCount.textContent = Number.isFinite(likes)
      ? Math.max(0, likes).toLocaleString()
      : "—";

    dislikesCount.textContent = Number.isFinite(dislikes)
      ? Math.max(0, dislikes).toLocaleString()
      : "—";
  }

  function apiHeaders(includeJson = false) {
    const headers = {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`
    };

    if (includeJson) {
      headers["Content-Type"] = "application/json";
    }

    return headers;
  }

  async function loadTotals() {
    if (!configured) {
      message.textContent =
        "Global vote totals need the Supabase connection details in supabase-config.js.";
      return;
    }

    try {
      const response = await fetch(
        `${projectUrl}/rest/v1/calculator_feedback?id=eq.main&select=likes,dislikes`,
        {
          method: "GET",
          headers: apiHeaders()
        }
      );

      if (!response.ok) {
        throw new Error(`Vote totals request failed: ${response.status}`);
      }

      const rows = await response.json();
      renderTotals(rows[0]);
    } catch (error) {
      console.error(error);
      message.textContent =
        "The community vote totals could not be loaded right now.";
    }
  }

  async function submitVote(vote) {
    if (!configured) {
      message.textContent =
        "Connect Supabase first so this vote can be added to the public totals.";
      return;
    }

    const previousVote = readSavedVote();

    if (previousVote === vote) {
      applySelectedVote(vote);
      message.textContent = "Your vote is already included in the totals.";
      return;
    }

    setButtonsDisabled(true);
    message.textContent = "Saving your vote…";

    try {
      const response = await fetch(
        `${projectUrl}/rest/v1/rpc/register_calculator_vote`,
        {
          method: "POST",
          headers: apiHeaders(true),
          body: JSON.stringify({
            p_vote: vote,
            p_previous_vote: previousVote
          })
        }
      );

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(
          `Vote request failed: ${response.status} ${detail}`
        );
      }

      const rows = await response.json();
      const totals = Array.isArray(rows) ? rows[0] : rows;

      saveVote(vote);
      applySelectedVote(vote);
      renderTotals(totals);

      message.textContent =
        vote === "yes"
          ? "Thanks! Your like was added to the community total."
          : "Thanks! Your dislike was added to the community total.";
    } catch (error) {
      console.error(error);
      message.textContent =
        "Your vote could not be saved. Please try again.";
    } finally {
      setButtonsDisabled(false);
    }
  }

  const savedVote = readSavedVote();
  if (savedVote) {
    applySelectedVote(savedVote);
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      submitVote(button.dataset.vote);
    });
  });

  loadTotals();
}

populateMachineProfiles();
updateConvertedThickness();
installHelpfulnessVote();
