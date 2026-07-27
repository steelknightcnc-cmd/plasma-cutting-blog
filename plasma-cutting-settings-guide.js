(() => {
  'use strict';

  const IN_TO_MM = 25.4;
  const PSI_TO_BAR = 0.0689476;
  const CFM_TO_L_MIN = 28.3168;

  const materials = {
    'mild-steel': {
      title: 'Mild steel',
      description: 'General air-plasma starting ranges for common mild-steel plate and sheet.',
      rows: [
        { label: '16 ga', thickness: 0.060, amps: '20–30 A', pressure: [55, 60], speed: [150, 200], standoff: [0.0625, 0.0625] },
        { label: '14 ga', thickness: 0.075, amps: '30–40 A', pressure: [58, 62], speed: [120, 160], standoff: [0.0625, 0.0625] },
        { label: '10 ga', thickness: 0.135, amps: '40 A', pressure: [60, 65], speed: [80, 100], standoff: [0.125, 0.125] },
        { label: '3/16 in', thickness: 0.188, amps: '40–50 A', pressure: [62, 68], speed: [45, 65], standoff: [0.125, 0.125] },
        { label: '1/4 in', thickness: 0.250, amps: '60 A', pressure: [65, 70], speed: [55, 75], standoff: [0.125, 0.125] },
        { label: '3/8 in', thickness: 0.375, amps: '60–80 A', pressure: [68, 75], speed: [30, 45], standoff: [0.125, 0.125] },
        { label: '1/2 in', thickness: 0.500, amps: '80 A', pressure: [70, 78], speed: [22, 35], standoff: [0.125, 0.1875] },
        { label: '3/4 in', thickness: 0.750, amps: '80–100 A', pressure: [75, 80], speed: [12, 18], standoff: [0.1875, 0.1875] },
        { label: '1 in', thickness: 1.000, amps: '100 A+', pressure: [78, 85], speed: [8, 12], standoff: [0.1875, 0.1875] }
      ]
    },
    stainless: {
      title: 'Stainless steel',
      description: 'Conservative starting ranges for air-plasma cutting on stainless steel.',
      rows: [
        { label: '16 ga', thickness: 0.060, amps: '20–30 A', pressure: [55, 60], speed: [120, 160], standoff: [0.0625, 0.0625] },
        { label: '10 ga', thickness: 0.135, amps: '40 A', pressure: [60, 65], speed: [60, 80], standoff: [0.125, 0.125] },
        { label: '1/4 in', thickness: 0.250, amps: '60 A', pressure: [65, 70], speed: [40, 55], standoff: [0.125, 0.125] },
        { label: '3/8 in', thickness: 0.375, amps: '80 A', pressure: [70, 75], speed: [25, 35], standoff: [0.125, 0.125] },
        { label: '1/2 in', thickness: 0.500, amps: '80 A', pressure: [72, 78], speed: [14, 20], standoff: [0.1875, 0.1875] },
        { label: '3/4 in', thickness: 0.750, amps: '100 A', pressure: [75, 82], speed: [8, 13], standoff: [0.1875, 0.1875] }
      ]
    },
    aluminum: {
      title: 'Aluminum',
      description: 'Starting ranges for air-plasma cutting on common aluminum plate thicknesses.',
      rows: [
        { label: '1/8 in', thickness: 0.125, amps: '40 A', pressure: [62, 68], speed: [150, 200], standoff: [0.0625, 0.125] },
        { label: '3/16 in', thickness: 0.188, amps: '40–50 A', pressure: [65, 70], speed: [100, 140], standoff: [0.125, 0.125] },
        { label: '1/4 in', thickness: 0.250, amps: '60 A', pressure: [68, 72], speed: [80, 100], standoff: [0.125, 0.125] },
        { label: '3/8 in', thickness: 0.375, amps: '80 A', pressure: [70, 76], speed: [40, 60], standoff: [0.125, 0.125] },
        { label: '1/2 in', thickness: 0.500, amps: '80 A', pressure: [72, 78], speed: [20, 30], standoff: [0.1875, 0.1875] },
        { label: '3/4 in', thickness: 0.750, amps: '100 A', pressure: [75, 82], speed: [10, 16], standoff: [0.1875, 0.1875] }
      ]
    }
  };

  const airRows = [
    { amps: '20–30 A', pressure: [55, 65], flow: [3.5, 4.5], compressor: '2–3 hp class' },
    { amps: '30–50 A', pressure: [60, 70], flow: [4.5, 6.0], compressor: '3–5 hp class' },
    { amps: '50–70 A', pressure: [65, 75], flow: [6.0, 7.5], compressor: '5 hp class' },
    { amps: '70–100 A', pressure: [70, 85], flow: [7.5, 10.0], compressor: '5–7.5 hp class' },
    { amps: '100 A+', pressure: [80, 95], flow: [10, 15], compressor: '7.5–10 hp class' }
  ];

  const unitSelect = document.getElementById('guide-unit-system');
  const materialSelect = document.getElementById('guide-material-filter');
  const tableHost = document.getElementById('plasma-settings-tables');
  const unitBadge = document.getElementById('guide-unit-badge');
  const airBody = document.getElementById('plasma-air-table-body');
  const airPressureHeading = document.getElementById('air-pressure-heading');
  const airFlowHeading = document.getElementById('air-flow-heading');

  if (!unitSelect || !materialSelect || !tableHost || !airBody) return;

  const rounded = (value, decimals = 1) => Number(value.toFixed(decimals)).toLocaleString('en-US', {
    maximumFractionDigits: decimals
  });

  function range(values, formatter) {
    const first = formatter(values[0]);
    const second = formatter(values[1]);
    return first === second ? first : `${first}–${second}`;
  }

  function thicknessText(row, system) {
    if (system === 'metric') {
      return `${rounded(row.thickness * IN_TO_MM, 1)} mm${row.label.includes('ga') ? ` (${row.label})` : ''}`;
    }
    return `${row.label.includes('ga') ? `${row.label} · ` : ''}${rounded(row.thickness, 3)} in`;
  }

  function speedText(values, system) {
    if (system === 'metric') return `${range(values, value => rounded(value * IN_TO_MM, 0))} mm/min`;
    return `${range(values, value => rounded(value, 0))} IPM`;
  }

  function pressureText(values, system) {
    if (system === 'metric') return `${range(values, value => rounded(value * PSI_TO_BAR, 1))} bar`;
    return `${range(values, value => rounded(value, 0))} PSI`;
  }

  function standoffText(values, system) {
    if (system === 'metric') return `${range(values, value => rounded(value * IN_TO_MM, 1))} mm`;
    return `${range(values, value => rounded(value, 3))} in`;
  }

  function renderMaterialTable(key, system) {
    const material = materials[key];
    const rows = material.rows.map(row => `
      <tr>
        <td data-label="Thickness"><strong>${thicknessText(row, system)}</strong></td>
        <td data-label="Amperage">${row.amps}</td>
        <td data-label="Air pressure">${pressureText(row.pressure, system)}</td>
        <td data-label="Cut speed">${speedText(row.speed, system)}</td>
        <td data-label="Cut standoff">${standoffText(row.standoff, system)}</td>
      </tr>`).join('');

    return `
      <article class="plasma-guide-material-card">
        <header>
          <div><p>Material reference</p><h3>${material.title}</h3></div>
          <span>${material.rows.length} thicknesses</span>
        </header>
        <p class="plasma-guide-material-description">${material.description}</p>
        <div class="plasma-guide-table-wrap">
          <table class="plasma-guide-table">
            <thead><tr><th>Thickness</th><th>Amperage</th><th>Air pressure</th><th>Cut speed</th><th>Cut standoff</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </article>`;
  }

  function renderAirTable(system) {
    airPressureHeading.textContent = system === 'metric' ? 'Pressure (bar)' : 'Pressure (PSI)';
    airFlowHeading.textContent = system === 'metric' ? 'Flow (L/min)' : 'Flow (SCFM)';
    airBody.innerHTML = airRows.map(row => {
      const pressure = system === 'metric'
        ? range(row.pressure, value => rounded(value * PSI_TO_BAR, 1))
        : range(row.pressure, value => rounded(value, 0));
      const flow = system === 'metric'
        ? range(row.flow, value => rounded(value * CFM_TO_L_MIN, 0))
        : range(row.flow, value => rounded(value, 1));
      return `<tr><td><strong>${row.amps}</strong></td><td>${pressure}</td><td>${flow}</td><td>${row.compressor}</td></tr>`;
    }).join('');
  }

  function render() {
    const system = unitSelect.value;
    const material = materialSelect.value;
    unitBadge.textContent = system === 'metric' ? 'Metric · mm' : 'Imperial · in';
    unitBadge.dataset.system = system;

    const keys = material === 'all' ? Object.keys(materials) : [material];
    tableHost.innerHTML = keys.map(key => renderMaterialTable(key, system)).join('');
    renderAirTable(system);

    try {
      localStorage.setItem('pcf-plasma-guide-units', system);
      localStorage.setItem('pcf-plasma-guide-material', material);
    } catch (error) {
      // The guide still works when browser storage is unavailable.
    }
  }

  try {
    const savedUnits = localStorage.getItem('pcf-plasma-guide-units');
    const savedMaterial = localStorage.getItem('pcf-plasma-guide-material');
    if (savedUnits && [...unitSelect.options].some(option => option.value === savedUnits)) unitSelect.value = savedUnits;
    if (savedMaterial && [...materialSelect.options].some(option => option.value === savedMaterial)) materialSelect.value = savedMaterial;
  } catch (error) {
    // Ignore storage restrictions.
  }

  unitSelect.addEventListener('change', render);
  materialSelect.addEventListener('change', render);
  render();
})();
