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

  machineProfileSelect.value = "stamos-s-plasma-85";
  updateSelectedProfile(true);
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
      result for your machine.`;
  } else {
    resultMessage.innerHTML =
      `<strong>Manufacturer profile:</strong> ${profile.label} uses the official
      Hypertherm Powermax65/85 shielded-air chart. Hypertherm normally controls
      gas pressure automatically in standard operation.`;
  }

  resultGrid.hidden = false;
  resultDetails.hidden = false;

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
