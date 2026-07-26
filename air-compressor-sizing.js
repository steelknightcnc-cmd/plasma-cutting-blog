(() => {
  "use strict";

  const form = document.querySelector("#compressor-sizing-form");
  const results = document.querySelector("#compressor-results");
  const resetButton = document.querySelector("#compressor-reset");
  const printButton = document.querySelector("#compressor-print-guide");
  const message = document.querySelector("#compressor-form-message");

  if (!form || !results) return;

  const status = document.querySelector("#compressor-result-status");
  const title = document.querySelector("#compressor-result-title");
  const description = document.querySelector("#compressor-result-description");
  const target = document.querySelector("#compressor-target-scfm");
  const coverage = document.querySelector("#compressor-coverage");
  const tankRuntime = document.querySelector("#compressor-tank-runtime");
  const deficitRuntime = document.querySelector("#compressor-deficit-runtime");
  const actions = document.querySelector("#compressor-result-actions");

  function n(data, key) {
    const value = Number(data.get(key));
    return Number.isFinite(value) ? value : 0;
  }

  function minutes(value) {
    if (!Number.isFinite(value)) return "Sustained*";
    if (value < 0.1) return "< 0.1 min";
    if (value < 10) return `${value.toFixed(1)} min`;
    return `${Math.round(value)} min`;
  }

  function addAction(text) {
    const li = document.createElement("li");
    li.textContent = text;
    actions.append(li);
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    message.textContent = "";

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const data = new FormData(form);
    const cutter = n(data, "cutter_scfm");
    const pressure = n(data, "required_psi");
    const margin = n(data, "usage");
    const compressor = n(data, "compressor_scfm");
    const gallons = n(data, "tank_gallons");
    const start = n(data, "start_psi");
    const end = n(data, "end_psi");
    const other = n(data, "other_scfm");

    if (start <= end) {
      message.textContent = "Starting tank pressure must be higher than the lowest usable pressure.";
      return;
    }

    const demand = cutter + other;
    const planning = demand * margin;
    const ratio = demand > 0 ? compressor / demand : 0;
    const planningRatio = planning > 0 ? compressor / planning : 0;

    const freeAir = gallons * 0.133681 * Math.max(0, start - end) / 14.7;
    const tankOnly = demand > 0 ? freeAir / demand : 0;
    const deficit = Math.max(0, demand - compressor);
    const withPump = deficit > 0 ? freeAir / deficit : Infinity;

    target.textContent = `${planning.toFixed(1)} SCFM @ ${pressure.toFixed(0)} PSI`;
    coverage.textContent = `${Math.round(ratio * 100)}%`;
    tankRuntime.textContent = minutes(tankOnly);
    deficitRuntime.textContent = minutes(withPump);

    actions.replaceChildren();

    if (compressor < demand) {
      status.textContent = "Undersized for sustained cutting";
      status.className = "compressor-status-danger";
      title.textContent = "The pump falls behind active demand";
      description.textContent =
        `The compressor is short by ${(demand - compressor).toFixed(1)} SCFM before planning margin. The tank only delays the pressure drop.`;

      addAction(`Choose at least ${planning.toFixed(1)} SCFM at ${pressure.toFixed(0)} PSI for this usage pattern.`);
      addAction("Reduce simultaneous shop-air loads.");
      addAction("Treat calculated tank time as temporary reserve only.");
    } else if (compressor < planning) {
      status.textContent = "Meets demand with limited margin";
      status.className = "compressor-status-warning";
      title.textContent = "The compressor covers demand but misses the planning target";
      description.textContent =
        `Output reaches ${Math.round(planningRatio * 100)}% of the selected planning target.`;

      addAction("Confirm compressor duty cycle supports the longest expected cut.");
      addAction("Measure pressure at the plasma inlet while air is flowing.");
      addAction("Check hose, couplers, filters, and regulator for pressure loss.");
    } else {
      status.textContent = "Planning target met";
      status.className = "compressor-status-good";
      title.textContent = "The entered compressor meets the selected planning target";
      description.textContent =
        `Output reaches ${Math.round(planningRatio * 100)}% of the planning target. Final suitability still depends on duty cycle and dynamic pressure.`;

      addAction("Verify the SCFM rating applies at the entered pressure.");
      addAction("Confirm stable dynamic pressure during a long flowing-air test.");
      addAction("Complete the moisture-control and duty-cycle checks.");
    }

    if (end < pressure) {
      addAction("The lowest usable tank pressure is below the cutter's required inlet pressure.");
    }

    results.hidden = false;
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  resetButton?.addEventListener("click", () => {
    form.reset();
    results.hidden = true;
    message.textContent = "";
  });

  printButton?.addEventListener("click", () => window.print());
})();
