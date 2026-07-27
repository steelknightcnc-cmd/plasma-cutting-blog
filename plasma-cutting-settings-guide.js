(() => {
  'use strict';

  const IN_TO_MM = 25.4;
  const PSI_TO_BAR = 0.0689476;
  const CFM_TO_L_MIN = 28.3168;

  // Requested thickness sequence: 1, 1.5, 2, 2.5, 3 mm, then every whole millimetre through 30 mm.
  const GUIDE_THICKNESSES_MM = [1, 1.5, 2, 2.5, 3, ...Array.from({ length: 27 }, (_, index) => index + 4)];

  const materialProfiles = {
    'mild-steel': {
      title: 'Mild steel',
      description: 'General air-plasma starting ranges for common mild-steel plate and sheet.',
      anchors: [
        { mm: 1.5, pressure: [55, 60], speed: [150, 200], standoff: [0.0625, 0.0625] },
        { mm: 1.9, pressure: [58, 62], speed: [120, 160], standoff: [0.0625, 0.0625] },
        { mm: 3.4, pressure: [60, 65], speed: [80, 100], standoff: [0.125, 0.125] },
        { mm: 4.8, pressure: [62, 68], speed: [45, 65], standoff: [0.125, 0.125] },
        { mm: 6.3, pressure: [65, 70], speed: [55, 75], standoff: [0.125, 0.125] },
        { mm: 9.5, pressure: [68, 75], speed: [30, 45], standoff: [0.125, 0.125] },
        { mm: 12.7, pressure: [70, 78], speed: [22, 35], standoff: [0.125, 0.1875] },
        { mm: 19.0, pressure: [75, 80], speed: [12, 18], standoff: [0.1875, 0.1875] },
        { mm: 25.4, pressure: [78, 85], speed: [8, 12], standoff: [0.1875, 0.1875] },
        { mm: 30.0, pressure: [82, 90], speed: [6, 9], standoff: [0.1875, 0.2500] }
      ],
      amps(mm) {
        if (mm <= 1.5) return '20–30 A';
        if (mm <= 2.5) return '30–40 A';
        if (mm <= 4) return '40 A';
        if (mm <= 5) return '40–50 A';
        if (mm <= 7) return '60 A';
        if (mm <= 10) return '60–80 A';
        if (mm <= 13) return '80 A';
        if (mm <= 19) return '80–100 A';
        return '100 A+';
      }
    },
    stainless: {
      title: 'Stainless steel',
      description: 'Conservative starting ranges for air-plasma cutting on stainless steel.',
      anchors: [
        { mm: 1.5, pressure: [55, 60], speed: [120, 160], standoff: [0.0625, 0.0625] },
        { mm: 3.4, pressure: [60, 65], speed: [60, 80], standoff: [0.125, 0.125] },
        { mm: 6.3, pressure: [65, 70], speed: [40, 55], standoff: [0.125, 0.125] },
        { mm: 9.5, pressure: [70, 75], speed: [25, 35], standoff: [0.125, 0.125] },
        { mm: 12.7, pressure: [72, 78], speed: [14, 20], standoff: [0.1875, 0.1875] },
        { mm: 19.0, pressure: [75, 82], speed: [8, 13], standoff: [0.1875, 0.1875] },
        { mm: 25.4, pressure: [80, 88], speed: [5, 8], standoff: [0.1875, 0.2500] },
        { mm: 30.0, pressure: [84, 92], speed: [4, 6], standoff: [0.2500, 0.2500] }
      ],
      amps(mm) {
        if (mm <= 1.5) return '20–30 A';
        if (mm <= 3.5) return '40 A';
        if (mm <= 7) return '60 A';
        if (mm <= 13) return '80 A';
        if (mm <= 19) return '100 A';
        return '100 A+';
      }
    },
    aluminum: {
      title: 'Aluminum',
      description: 'Starting ranges for air-plasma cutting on common aluminum plate thicknesses.',
      anchors: [
        { mm: 1.0, pressure: [58, 64], speed: [180, 240], standoff: [0.0625, 0.0625] },
        { mm: 3.2, pressure: [62, 68], speed: [150, 200], standoff: [0.0625, 0.125] },
        { mm: 4.8, pressure: [65, 70], speed: [100, 140], standoff: [0.125, 0.125] },
        { mm: 6.3, pressure: [68, 72], speed: [80, 100], standoff: [0.125, 0.125] },
        { mm: 9.5, pressure: [70, 76], speed: [40, 60], standoff: [0.125, 0.125] },
        { mm: 12.7, pressure: [72, 78], speed: [20, 30], standoff: [0.1875, 0.1875] },
        { mm: 19.0, pressure: [75, 82], speed: [10, 16], standoff: [0.1875, 0.1875] },
        { mm: 25.4, pressure: [80, 88], speed: [6, 10], standoff: [0.1875, 0.2500] },
        { mm: 30.0, pressure: [84, 92], speed: [4, 7], standoff: [0.2500, 0.2500] }
      ],
      amps(mm) {
        if (mm <= 3.5) return '40 A';
        if (mm <= 5) return '40–50 A';
        if (mm <= 7) return '60 A';
        if (mm <= 13) return '80 A';
        if (mm <= 19) return '100 A';
        return '100 A+';
      }
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

  function interpolateNumber(first, second, amount) {
    return first + ((second - first) * amount);
  }

  function interpolatePair(first, second, amount) {
    return [
      interpolateNumber(first[0], second[0], amount),
      interpolateNumber(first[1], second[1], amount)
    ];
  }

  function valuesAtThickness(anchors, thicknessMm) {
    if (thicknessMm <= anchors[0].mm) return { ...anchors[0] };
    if (thicknessMm >= anchors[anchors.length - 1].mm) return { ...anchors[anchors.length - 1] };

    for (let index = 0; index < anchors.length - 1; index += 1) {
      const lower = anchors[index];
      const upper = anchors[index + 1];
      if (thicknessMm >= lower.mm && thicknessMm <= upper.mm) {
        const amount = (thicknessMm - lower.mm) / (upper.mm - lower.mm);
        return {
          pressure: interpolatePair(lower.pressure, upper.pressure, amount),
          speed: interpolatePair(lower.speed, upper.speed, amount),
          standoff: interpolatePair(lower.standoff, upper.standoff, amount)
        };
      }
    }

    return { ...anchors[anchors.length - 1] };
  }

  function materialRows(profile) {
    return GUIDE_THICKNESSES_MM.map(thicknessMm => {
      const values = valuesAtThickness(profile.anchors, thicknessMm);
      return {
        thicknessMm,
        amps: profile.amps(thicknessMm),
        pressure: values.pressure,
        speed: values.speed,
        standoff: values.standoff
      };
    });
  }

  function thicknessText(row, system) {
    if (system === 'metric') return `${rounded(row.thicknessMm, 1)} mm`;
    return `${rounded(row.thicknessMm / IN_TO_MM, 3)} in`;
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
    const material = materialProfiles[key];
    const rowsData = materialRows(material);
    const rows = rowsData.map(row => `
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
          <span>${rowsData.length} thicknesses</span>
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

    const keys = material === 'all' ? Object.keys(materialProfiles) : [material];
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
