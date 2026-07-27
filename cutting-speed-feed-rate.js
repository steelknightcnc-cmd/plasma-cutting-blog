(() => {
  "use strict";

  const DIAMETERS = [1,2,3,4,5,6,8,10,12];

  const DATA = {
    "cast-aluminum": {
      vc:500, fz:[0.010,0.010,0.010,0.015,0.015,0.025,0.030,0.038,0.050],
      group:"nonferrous", unitHp:0.35
    },
    "wrought-aluminum": {
      vc:500, fz:[0.010,0.020,0.025,0.050,0.050,0.050,0.064,0.080,0.100],
      group:"nonferrous", unitHp:0.35
    },
    "soft-plastic": {
      vc:600, fz:[0.025,0.030,0.035,0.045,0.065,0.090,0.100,0.200,0.300],
      group:"woodplastic", unitHp:0.18
    },
    "hard-plastic": {
      vc:550, fz:[0.015,0.020,0.025,0.050,0.060,0.080,0.089,0.100,0.150],
      group:"woodplastic", unitHp:0.22
    },
    "hard-wood": {
      vc:450, fz:[0.020,0.025,0.030,0.035,0.045,0.055,0.065,0.080,0.090],
      group:"woodplastic", unitHp:0.20
    },
    "soft-wood": {
      vc:500, fz:[0.025,0.030,0.035,0.040,0.050,0.060,0.070,0.085,0.100],
      group:"woodplastic", unitHp:0.16
    },
    "mdf": {
      vc:450, fz:[0.030,0.040,0.045,0.050,0.060,0.070,0.080,0.090,0.110],
      group:"woodplastic", unitHp:0.22
    },
    "brass": {
      vc:365, fz:[0.015,0.020,0.025,0.025,0.030,0.050,0.056,0.065,0.080],
      group:"nonferrous", unitHp:0.45
    },
    "steel": {
      vc:90, fz:[0.010,0.010,0.012,0.025,0.030,0.038,0.045,0.050,0.080],
      group:"steel", unitHp:1.00
    }
  };

  const MODES = {
    conservative:{speed:0.85, chip:0.85, engagement:0.80},
    balanced:{speed:1.00, chip:1.00, engagement:1.00},
    aggressive:{speed:1.10, chip:1.10, engagement:1.10}
  };

  const form = document.querySelector("#speed-feed-form");
  const results = document.querySelector("#sf-results");
  const message = document.querySelector("#speed-feed-message");
  const cutType = document.querySelector("#sf-cut-type");
  const customAxialField = document.querySelector("#sf-custom-axial-field");
  const customRadialField = document.querySelector("#sf-custom-radial-field");

  if (!form || !results) return;

  function interpolate(values, diameter) {
    if (diameter <= DIAMETERS[0]) return values[0];
    if (diameter >= DIAMETERS.at(-1)) return values.at(-1);

    for (let i = 0; i < DIAMETERS.length - 1; i += 1) {
      const d1 = DIAMETERS[i];
      const d2 = DIAMETERS[i + 1];
      if (diameter >= d1 && diameter <= d2) {
        const t = (diameter - d1) / (d2 - d1);
        return values[i] + (values[i + 1] - values[i]) * t;
      }
    }
    return values[0];
  }

  const fmt = (value, digits=0) => Number(value).toLocaleString("en-US", {
    minimumFractionDigits:digits,
    maximumFractionDigits:digits
  });

  function addNote(text) {
    const li = document.createElement("li");
    li.textContent = text;
    document.querySelector("#sf-notes").append(li);
  }

  function updateCustomFields() {
    const custom = cutType.value === "custom";
    customAxialField.hidden = !custom;
    customRadialField.hidden = !custom;
  }

  cutType.addEventListener("change", updateCustomFields);
  updateCustomFields();

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    message.textContent = "";

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const fd = new FormData(form);
    const metric = fd.get("units") === "metric";
    const material = DATA[fd.get("material")];
    const modeName = String(fd.get("mode"));
    const mode = MODES[modeName];
    const cut = String(fd.get("cut_type"));

    const diameterInput = Number(fd.get("diameter"));
    const diameterMm = metric ? diameterInput : diameterInput * 25.4;
    const diameterIn = diameterMm / 25.4;
    const flutes = Number(fd.get("flutes"));
    const customSpeed = Number(fd.get("custom_speed"));
    const minRpm = Number(fd.get("min_rpm"));
    const maxRpm = Number(fd.get("max_rpm"));
    const spindleKw = Number(fd.get("spindle_kw"));
    const powerFactor = Number(fd.get("power_factor"));

    if (diameterMm < 1 || diameterMm > 12) {
      message.textContent = "The Sorotec table covers cutter diameters from 1 to 12 mm.";
      return;
    }

    if (minRpm > maxRpm) {
      message.textContent = "Minimum spindle RPM cannot exceed maximum spindle RPM.";
      return;
    }

    const tableFz = interpolate(material.fz, diameterMm);
    const toothFeedMm = tableFz * mode.chip;
    const selectedVc = customSpeed > 0
      ? (metric ? customSpeed : customSpeed * 0.3048)
      : material.vc * mode.speed;

    const theoreticalRpm = (selectedVc * 1000) / (Math.PI * diameterMm);
    const rpm = Math.min(maxRpm, Math.max(minRpm, theoreticalRpm));
    let feedMmMin = rpm * flutes * toothFeedMm;

    let axialMm;
    let radialMm;

    if (cut === "custom") {
      const a = Number(fd.get("custom_axial"));
      const r = Number(fd.get("custom_radial"));
      axialMm = metric ? a : a * 25.4;
      radialMm = metric ? r : r * 25.4;
      if (!(axialMm > 0) || !(radialMm > 0)) {
        message.textContent = "Enter both custom axial and radial engagement.";
        return;
      }
    } else if (cut === "contour") {
      axialMm = diameterMm * 1.0 * mode.engagement;
      radialMm = diameterMm * 0.25 * mode.engagement;
    } else {
      radialMm = diameterMm;
      if (material.group === "nonferrous") {
        axialMm = diameterMm * 0.5 * mode.engagement;
      } else if (material.group === "woodplastic") {
        axialMm = diameterMm * 2.0 * mode.engagement;
      } else {
        // Sorotec does not state a steel slotting depth on page 2.
        axialMm = diameterMm * 0.25 * mode.engagement;
      }
    }

    const mrrMm3Min = axialMm * radialMm * feedMmMin;
    const mrrIn3Min = mrrMm3Min / 16387.064;
    let powerKw = mrrIn3Min * material.unitHp * 0.7457;
    const usableKw = spindleKw * powerFactor;

    let powerLimited = false;
    if (powerKw > usableKw && powerKw > 0) {
      const scale = usableKw / powerKw;
      feedMmMin *= scale;
      powerKw = usableKw;
      powerLimited = true;
    }

    const actualVc = Math.PI * diameterMm * rpm / 1000;
    const finalMrrMm3Min = axialMm * radialMm * feedMmMin;

    const feedDisplay = metric ? feedMmMin : feedMmMin / 25.4;
    const chipDisplay = metric ? toothFeedMm : toothFeedMm / 25.4;
    const vcDisplay = metric ? actualVc : actualVc / 0.3048;
    const axialDisplay = metric ? axialMm : axialMm / 25.4;
    const radialDisplay = metric ? radialMm : radialMm / 25.4;
    const mrrDisplay = metric ? finalMrrMm3Min : finalMrrMm3Min / 16387.064;

    document.querySelector("#sf-rpm").textContent = `${fmt(rpm)} RPM`;
    document.querySelector("#sf-feed").textContent =
      `${fmt(feedDisplay, metric ? 1 : 2)} ${metric ? "mm/min" : "IPM"}`;
    document.querySelector("#sf-chip").textContent =
      `${fmt(chipDisplay, metric ? 3 : 4)} ${metric ? "mm/tooth" : "in/tooth"}`;
    document.querySelector("#sf-surface").textContent =
      `${fmt(vcDisplay)} ${metric ? "m/min" : "SFM"}`;
    document.querySelector("#sf-axial").textContent =
      `${fmt(axialDisplay, metric ? 2 : 3)} ${metric ? "mm" : "in"}`;
    document.querySelector("#sf-radial").textContent =
      `${fmt(radialDisplay, metric ? 2 : 3)} ${metric ? "mm" : "in"}`;
    document.querySelector("#sf-mrr").textContent =
      `${fmt(mrrDisplay, metric ? 0 : 3)} ${metric ? "mm³/min" : "in³/min"}`;
    document.querySelector("#sf-power").textContent = `${fmt(powerKw,2)} kW`;

    const rpmNote = document.querySelector("#sf-rpm-note");
    if (theoreticalRpm < minRpm) {
      rpmNote.textContent = `Raised from ${fmt(theoreticalRpm)} RPM to machine minimum`;
    } else if (theoreticalRpm > maxRpm) {
      rpmNote.textContent = `Limited from ${fmt(theoreticalRpm)} RPM to machine maximum`;
    } else {
      rpmNote.textContent = "Inside entered spindle range";
    }

    const status = document.querySelector("#sf-power-status");
    status.className = "speed-feed-power-status";
    const title = document.querySelector("#sf-power-title");
    const copy = document.querySelector("#sf-power-copy");

    if (powerLimited) {
      status.classList.add("warning");
      title.textContent = "Feed reduced by spindle-power allowance";
      copy.textContent =
        `The estimated cut exceeded ${fmt(usableKw,2)} kW of usable power. Feed was reduced automatically.`;
    } else {
      title.textContent = "Estimated cutting power is inside the entered allowance";
      copy.textContent =
        `The estimate is below the ${fmt(usableKw,2)} kW usable-power planning limit.`;
    }

    const notes = document.querySelector("#sf-notes");
    notes.replaceChildren();

    addNote(`Sorotec table cutting speed: ${material.vc} m/min.`);
    addNote(`Interpolated Sorotec tooth feed before mode adjustment: ${fmt(tableFz,3)} mm/tooth.`);
    addNote(`Mode: ${modeName.charAt(0).toUpperCase() + modeName.slice(1)}.`);
    addNote("Use the shortest practical cutter to reduce vibration and deflection.");
    addNote("Confirm flute length safely exceeds the axial depth.");
    addNote("Reduce engagement for weak workholding, long stickout, poor chip evacuation, or chatter.");

    if (cut === "slot" && material.group === "steel") {
      addNote("The PDF does not provide a steel slotting depth; the calculator uses a conservative 0.25 × diameter planning value.");
    }

    if (theoreticalRpm < minRpm) {
      addNote("The calculated Sorotec RPM is below the entered spindle minimum. The resulting cutting speed is higher than the selected target.");
    }

    if (theoreticalRpm > maxRpm) {
      addNote("RPM was capped at the machine maximum; feed was recalculated from the capped RPM.");
    }

    results.hidden = false;
    results.scrollIntoView({behavior:"smooth", block:"start"});
  });

  form.addEventListener("reset", () => {
    setTimeout(() => {
      results.hidden = true;
      message.textContent = "";
      updateCustomFields();
    }, 0);
  });
})();
