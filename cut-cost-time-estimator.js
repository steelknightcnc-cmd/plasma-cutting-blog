(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const qsa = (selector) => Array.from(document.querySelectorAll(selector));
  const MM_PER_INCH = 25.4;
  const MM2_PER_M2 = 1_000_000;
  const MM2_PER_FT2 = 92_903.04;
  const MM2_PER_IN2 = 645.16;
  const CURRENCY_CONFIG = {
    USD: { name: 'US Dollar', inputSymbol: '$' },
    CAD: { name: 'Canadian Dollar', inputSymbol: 'CA$' },
    AUD: { name: 'Australian Dollar', inputSymbol: 'A$' },
    EUR: { name: 'Euro', inputSymbol: '€' },
  };

  const state = {
    geometryMode: 'manual',
    dxf: null,
    estimate: null,
  };

  const SPEED_TABLE = {
    'mild-steel': [
      [1, 6500, 0.25], [2, 4500, 0.35], [3, 3200, 0.45], [4, 2500, 0.55],
      [6, 1800, 0.8], [8, 1350, 1.0], [10, 1050, 1.2], [12, 850, 1.5],
      [16, 600, 2.0], [20, 430, 2.8], [25, 300, 3.8], [32, 190, 5.0], [40, 120, 6.5],
    ],
    stainless: [
      [1, 5200, 0.35], [2, 3400, 0.45], [3, 2400, 0.6], [4, 1900, 0.75],
      [6, 1300, 1.0], [8, 950, 1.3], [10, 720, 1.7], [12, 560, 2.1],
      [16, 390, 2.9], [20, 280, 3.8], [25, 190, 5.0], [32, 120, 6.5],
    ],
    aluminum: [
      [1, 7000, 0.25], [2, 5000, 0.35], [3, 3600, 0.45], [4, 2800, 0.6],
      [6, 1950, 0.85], [8, 1450, 1.1], [10, 1100, 1.4], [12, 880, 1.8],
      [16, 620, 2.4], [20, 450, 3.2], [25, 320, 4.2], [32, 210, 5.5],
    ],
  };

  function numberValue(id, fallback = 0) {
    const value = Number.parseFloat($(id).value);
    return Number.isFinite(value) ? value : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function toMm(value, unit) {
    return unit === 'in' ? value * MM_PER_INCH : value;
  }

  function toMm2(value, unit) {
    switch (unit) {
      case 'cm2': return value * 100;
      case 'm2': return value * MM2_PER_M2;
      case 'in2': return value * MM2_PER_IN2;
      case 'ft2': return value * MM2_PER_FT2;
      default: return value;
    }
  }

  function selectedCurrency() {
    const currency = $('currency')?.value || 'USD';
    return CURRENCY_CONFIG[currency] ? currency : 'USD';
  }

  function money(value, currency = selectedCurrency()) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      currencyDisplay: 'symbol',
    }).format(value);
  }

  function updateCurrencyUi() {
    const currency = selectedCurrency();
    const symbol = CURRENCY_CONFIG[currency].inputSymbol;
    qsa('[data-currency-symbol]').forEach((element) => {
      element.textContent = symbol;
    });
  }

  function fixed(value, digits = 2) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
  }

  function duration(seconds) {
    if (seconds < 60) return `${fixed(seconds, 1)} sec`;
    if (seconds < 3600) return `${fixed(seconds / 60, 2)} min`;
    return `${fixed(seconds / 3600, 2)} hr`;
  }

  function interpolateDefaults(material, thicknessMm) {
    const rows = SPEED_TABLE[material] || SPEED_TABLE['mild-steel'];
    if (thicknessMm <= rows[0][0]) return { speed: rows[0][1], pierce: rows[0][2] };
    if (thicknessMm >= rows[rows.length - 1][0]) {
      const row = rows[rows.length - 1];
      return { speed: row[1], pierce: row[2] };
    }
    for (let i = 1; i < rows.length; i += 1) {
      const high = rows[i];
      const low = rows[i - 1];
      if (thicknessMm <= high[0]) {
        const ratio = (thicknessMm - low[0]) / (high[0] - low[0]);
        return {
          speed: Math.round(low[1] + ratio * (high[1] - low[1])),
          pierce: Number((low[2] + ratio * (high[2] - low[2])).toFixed(1)),
        };
      }
    }
    return { speed: 1800, pierce: 0.8 };
  }

  function updateProcessDefaults() {
    const thicknessMm = toMm(numberValue('thickness', 6), $('thickness-unit').value);
    const defaults = interpolateDefaults($('material').value, thicknessMm);
    $('cut-speed').value = defaults.speed;
    $('pierce-time').value = defaults.pierce;
  }

  function setGeometryMode(mode) {
    state.geometryMode = mode;
    qsa('[data-geometry-mode]').forEach((button) => {
      const active = button.dataset.geometryMode === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    qsa('[data-geometry-panel]').forEach((panel) => {
      panel.hidden = panel.dataset.geometryPanel !== mode;
    });
  }

  function updateMaterialFields() {
    const basis = $('material-basis').value;
    const visible = new Set();
    if (basis === 'area') {
      ['price', 'price-unit', 'part-area', 'area-unit', 'waste'].forEach((key) => visible.add(key));
    } else if (basis === 'sheet') {
      ['price', 'sheet-width', 'sheet-height', 'sheet-unit', 'part-area', 'area-unit', 'waste'].forEach((key) => visible.add(key));
    }
    qsa('[data-material-field]').forEach((field) => {
      field.hidden = !visible.has(field.dataset.materialField);
    });
  }

  function validatePositive(value, label, allowZero = false) {
    if (!Number.isFinite(value) || (allowZero ? value < 0 : value <= 0)) {
      throw new Error(`${label} must be ${allowZero ? 'zero or greater' : 'greater than zero'}.`);
    }
  }

  function calculateMaterialCost(partAreaMm2, quantity, wasteFactor) {
    const basis = $('material-basis').value;
    if (basis === 'none') return 0;

    const price = numberValue('material-price');
    validatePositive(price, 'Material price', true);
    validatePositive(partAreaMm2, 'Part area');
    validatePositive(wasteFactor, 'Waste factor');

    const requiredAreaMm2 = partAreaMm2 * quantity * wasteFactor;
    if (basis === 'area') {
      const unit = $('price-area-unit').value;
      const unitAreaMm2 = unit === 'm2' ? MM2_PER_M2 : unit === 'ft2' ? MM2_PER_FT2 : MM2_PER_IN2;
      return (requiredAreaMm2 / unitAreaMm2) * price;
    }

    const sheetWidthMm = toMm(numberValue('sheet-width'), $('sheet-unit').value);
    const sheetHeightMm = toMm(numberValue('sheet-height'), $('sheet-unit').value);
    validatePositive(sheetWidthMm, 'Sheet width');
    validatePositive(sheetHeightMm, 'Sheet length');
    const sheetAreaMm2 = sheetWidthMm * sheetHeightMm;
    return (requiredAreaMm2 / sheetAreaMm2) * price;
  }

  function calculateEstimate() {
    const cutLengthMm = state.geometryMode === 'dxf' && state.dxf
      ? state.dxf.lengthMm
      : toMm(numberValue('cut-length'), $('length-unit').value);
    const pierces = state.geometryMode === 'dxf' && state.dxf
      ? numberValue('pierces', state.dxf.pierces)
      : numberValue('pierces');
    const speedMmMin = numberValue('cut-speed');
    const pierceSeconds = numberValue('pierce-time');
    const quantity = numberValue('quantity');
    const machineRate = numberValue('machine-rate');
    const consumablePerPierce = numberValue('consumable-per-pierce');
    const setupMinutes = numberValue('setup-minutes');

    validatePositive(cutLengthMm, 'Cut length');
    validatePositive(pierces, 'Pierces', true);
    validatePositive(speedMmMin, 'Cutting speed');
    validatePositive(pierceSeconds, 'Pierce time', true);
    validatePositive(quantity, 'Quantity');
    validatePositive(machineRate, 'Machine rate', true);
    validatePositive(consumablePerPierce, 'Consumable cost', true);
    validatePositive(setupMinutes, 'Setup time', true);

    const cutSecondsPerPart = (cutLengthMm / speedMmMin) * 60;
    const pierceSecondsPerPart = pierces * pierceSeconds;
    const runSeconds = (cutSecondsPerPart + pierceSecondsPerPart) * quantity;
    const setupSeconds = setupMinutes * 60;
    const totalShopSeconds = runSeconds + setupSeconds;
    const machineCost = (totalShopSeconds / 3600) * machineRate;
    const consumableCost = pierces * quantity * consumablePerPierce;

    let partAreaMm2 = toMm2(numberValue('part-area'), $('part-area-unit').value);
    if (state.geometryMode === 'dxf' && state.dxf && state.dxf.areaMm2 > 0) {
      partAreaMm2 = state.dxf.areaMm2;
    }
    const wasteFactor = numberValue('waste-factor', 1.2);
    const materialCost = calculateMaterialCost(partAreaMm2, quantity, wasteFactor);
    const totalCost = machineCost + consumableCost + materialCost;

    return {
      generatedAt: new Date(),
      geometrySource: state.geometryMode === 'dxf' ? 'DXF upload' : 'Manual entry',
      fileName: state.dxf?.fileName || '',
      material: $('material').selectedOptions[0].textContent,
      thicknessMm: toMm(numberValue('thickness'), $('thickness-unit').value),
      cutLengthMm,
      pierces,
      speedMmMin,
      pierceSeconds,
      quantity,
      currency: selectedCurrency(),
      machineRate,
      setupMinutes,
      consumablePerPierce,
      partAreaMm2,
      wasteFactor,
      materialBasis: $('material-basis').value,
      cutSecondsPerPart,
      pierceSecondsPerPart,
      runSeconds,
      setupSeconds,
      totalShopSeconds,
      machineCost,
      consumableCost,
      materialCost,
      totalCost,
      costPerPart: totalCost / quantity,
    };
  }

  function renderEstimate(estimate, shouldScroll = true) {
    $('result-cut-time').textContent = duration(estimate.cutSecondsPerPart);
    $('result-pierce-time').textContent = duration(estimate.pierceSecondsPerPart);
    $('result-total-time').textContent = `${duration(estimate.totalShopSeconds)} (${fixed(estimate.totalShopSeconds / 3600, 3)} hr)`;
    $('result-machine-cost').textContent = money(estimate.machineCost, estimate.currency);
    $('result-consumable-cost').textContent = money(estimate.consumableCost, estimate.currency);
    $('result-material-cost').textContent = money(estimate.materialCost, estimate.currency);
    $('result-total-cost').textContent = money(estimate.totalCost, estimate.currency);
    $('result-per-part').textContent = money(estimate.costPerPart, estimate.currency);

    $('estimate-summary').innerHTML = `
      <div><span>Geometry source</span><strong>${escapeHtml(estimate.geometrySource)}</strong></div>
      <div><span>Material / thickness</span><strong>${escapeHtml(estimate.material)} — ${fixed(estimate.thicknessMm, 2)} mm</strong></div>
      <div><span>Cut length per part</span><strong>${fixed(estimate.cutLengthMm, 2)} mm</strong></div>
      <div><span>Pierces per part</span><strong>${fixed(estimate.pierces, 0)}</strong></div>
      <div><span>Cutting speed</span><strong>${fixed(estimate.speedMmMin, 0)} mm/min</strong></div>
      <div><span>Quantity</span><strong>${fixed(estimate.quantity, 0)}</strong></div>
    `;
    $('pcf-results').hidden = false;
    if (shouldScroll) $('pcf-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function downloadBlob(content, mimeType, fileName) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function csvCell(value) {
    const text = String(value ?? '');
    return `"${text.replaceAll('"', '""')}"`;
  }

  function downloadCsv() {
    const e = state.estimate;
    if (!e) return;
    const rows = [
      ['PLASMACUTFORGE', 'CNC plasma tools & shop-floor guides'],
      ['Plasma Cut Cost & Time Estimate', ''],
      ['Generated', e.generatedAt.toLocaleString('en-US')],
      ['Geometry source', e.geometrySource],
      ['DXF file', e.fileName],
      ['Material', e.material],
      ['Thickness (mm)', fixed(e.thicknessMm, 2)],
      ['Cut length per part (mm)', fixed(e.cutLengthMm, 2)],
      ['Pierces per part', fixed(e.pierces, 0)],
      ['Cutting speed (mm/min)', fixed(e.speedMmMin, 0)],
      ['Pierce time each (sec)', fixed(e.pierceSeconds, 2)],
      ['Quantity', fixed(e.quantity, 0)],
      ['Currency', `${e.currency} — ${CURRENCY_CONFIG[e.currency].name}`],
      [`Machine rate (${e.currency}/hr)`, fixed(e.machineRate, 2)],
      ['Setup / programming time (min)', fixed(e.setupMinutes, 2)],
      ['Cut time per part', duration(e.cutSecondsPerPart)],
      ['Pierce time per part', duration(e.pierceSecondsPerPart)],
      ['Total shop time', duration(e.totalShopSeconds)],
      ['Machine & setup cost', fixed(e.machineCost, 2)],
      ['Consumable cost', fixed(e.consumableCost, 2)],
      ['Material cost', fixed(e.materialCost, 2)],
      ['TOTAL ESTIMATE', fixed(e.totalCost, 2)],
      ['Cost per part', fixed(e.costPerPart, 2)],
      ['Notice', 'ESTIMATE ONLY — verify geometry, settings, material usage, and all shop costs before quoting.'],
    ];
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
    downloadBlob(csv, 'text/csv;charset=utf-8', 'plasma-cut-forge-cut-cost-estimate.csv');
  }

  function pdfLine(doc, label, value, y, bold = false) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(label, 16, y);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(String(value), 194, y, { align: 'right' });
  }

  function downloadPdf() {
    const e = state.estimate;
    if (!e) return;
    const jsPdf = window.jspdf?.jsPDF;
    if (!jsPdf) {
      window.print();
      return;
    }

    const doc = new jsPdf({ unit: 'mm', format: 'a4' });
    doc.setFillColor(7, 11, 20);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(243, 248, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('PLASMACUTFORGE', 16, 17);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('CNC plasma tools & shop-floor guides', 16, 25);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Plasma Cut Cost & Time Estimate', 16, 49);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Generated ${e.generatedAt.toLocaleString('en-US')}`, 16, 56);

    doc.setDrawColor(190, 200, 215);
    doc.line(16, 62, 194, 62);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('JOB PARAMETERS', 16, 71);

    let y = 79;
    const parameterRows = [
      ['Process', 'CNC plasma'],
      ['Material / thickness', `${e.material} — ${fixed(e.thicknessMm, 2)} mm`],
      ['Geometry source', e.geometrySource],
      ['Cut length per part', `${fixed(e.cutLengthMm, 2)} mm`],
      ['Pierces per part', fixed(e.pierces, 0)],
      ['Cutting speed used', `${fixed(e.speedMmMin, 0)} mm/min`],
      ['Quantity', `× ${fixed(e.quantity, 0)}`],
      ['Currency', `${e.currency} — ${CURRENCY_CONFIG[e.currency].name}`],
      ['Machine rate', `${money(e.machineRate, e.currency)} / hr`],
      ['Setup / programming', `${fixed(e.setupMinutes, 1)} min`],
    ];
    parameterRows.forEach(([label, value]) => {
      pdfLine(doc, label, value, y);
      y += 7;
    });

    doc.line(16, y, 194, y);
    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('TIME & COST BREAKDOWN', 16, y);
    y += 9;

    const costRows = [
      ['Cut time per part', duration(e.cutSecondsPerPart)],
      ['Pierce time per part', duration(e.pierceSecondsPerPart)],
      ['Total shop time', `${duration(e.totalShopSeconds)} (${fixed(e.totalShopSeconds / 3600, 3)} hr)`],
      ['Machine & setup cost', money(e.machineCost, e.currency)],
      ['Consumable cost', money(e.consumableCost, e.currency)],
      ['Material cost', money(e.materialCost, e.currency)],
    ];
    costRows.forEach(([label, value]) => {
      pdfLine(doc, label, value, y);
      y += 7;
    });

    y += 2;
    doc.setFillColor(229, 248, 255);
    doc.roundedRect(16, y - 5, 178, 27, 2, 2, 'F');
    doc.setTextColor(15, 23, 42);
    pdfLine(doc, `TOTAL ESTIMATE (${fixed(e.quantity, 0)} parts)`, money(e.totalCost, e.currency), y + 4, true);
    pdfLine(doc, 'Cost per part', money(e.costPerPart, e.currency), y + 13, true);

    y += 33;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const notice = 'ESTIMATE ONLY — actual costs may vary based on programming, setup, nesting, material waste, loading, unloading, secondary operations, and machine-specific performance. Verify DXF geometry, pierce count, cutting speed, and material use before quoting.';
    const wrapped = doc.splitTextToSize(notice, 178);
    doc.text(wrapped, 16, y);
    doc.setFont('helvetica', 'bold');
    doc.text('Generated with PlasmaCutForge.com', 16, 286);

    doc.save('plasma-cut-forge-cut-cost-estimate.pdf');
  }

  function parsePairs(text) {
    const lines = text.replace(/\r/g, '').split('\n');
    const pairs = [];
    for (let i = 0; i + 1 < lines.length; i += 2) {
      const code = Number.parseInt(lines[i].trim(), 10);
      if (!Number.isFinite(code)) continue;
      pairs.push({ code, value: lines[i + 1].trim() });
    }
    return pairs;
  }

  function readNumber(fields, code, fallback = 0) {
    const field = fields.find((item) => item.code === code);
    const value = field ? Number.parseFloat(field.value) : fallback;
    return Number.isFinite(value) ? value : fallback;
  }

  function readInt(fields, code, fallback = 0) {
    const field = fields.find((item) => item.code === code);
    const value = field ? Number.parseInt(field.value, 10) : fallback;
    return Number.isFinite(value) ? value : fallback;
  }

  function angleDelta(startDeg, endDeg) {
    let delta = endDeg - startDeg;
    while (delta < 0) delta += 360;
    while (delta >= 360) delta -= 360;
    return delta;
  }

  function pointOnArc(cx, cy, radius, degrees) {
    const radians = degrees * Math.PI / 180;
    return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
  }

  function bulgeArc(p1, p2, bulge) {
    const chord = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    if (chord === 0 || Math.abs(bulge) < 1e-12) {
      return { length: chord, points: [p1, p2] };
    }
    const theta = 4 * Math.atan(bulge);
    const radius = chord * (1 + bulge * bulge) / (4 * Math.abs(bulge));
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    const ux = (p2.x - p1.x) / chord;
    const uy = (p2.y - p1.y) / chord;
    const offset = chord * (1 - bulge * bulge) / (4 * bulge);
    const cx = midX - uy * offset;
    const cy = midY + ux * offset;
    const start = Math.atan2(p1.y - cy, p1.x - cx);
    const samples = [];
    const steps = Math.max(8, Math.ceil(Math.abs(theta) / (Math.PI / 18)));
    for (let i = 0; i <= steps; i += 1) {
      const angle = start + theta * (i / steps);
      samples.push({ x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
    }
    return { length: Math.abs(theta * radius), points: samples };
  }

  function collectEntityBlocks(pairs) {
    const blocks = [];
    let inEntities = false;
    let current = null;
    for (let i = 0; i < pairs.length; i += 1) {
      const pair = pairs[i];
      if (pair.code === 0 && pair.value === 'SECTION') {
        const next = pairs[i + 1];
        inEntities = Boolean(next && next.code === 2 && next.value === 'ENTITIES');
        continue;
      }
      if (inEntities && pair.code === 0 && pair.value === 'ENDSEC') {
        if (current) blocks.push(current);
        current = null;
        inEntities = false;
        continue;
      }
      if (!inEntities) continue;
      if (pair.code === 0) {
        if (current) blocks.push(current);
        current = { type: pair.value.toUpperCase(), fields: [] };
      } else if (current) {
        current.fields.push(pair);
      }
    }
    if (current) blocks.push(current);
    return blocks;
  }

  function parseDxf(text, unit = 'mm') {
    const scale = unit === 'in' ? MM_PER_INCH : 1;
    const blocks = collectEntityBlocks(parsePairs(text));
    const paths = [];
    const unsupported = new Set();
    let length = 0;
    let pierces = 0;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    function includePoint(point) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }

    function addPath(points, closed = false) {
      if (points.length < 2) return;
      points.forEach(includePoint);
      paths.push({ points, closed });
    }

    for (let index = 0; index < blocks.length; index += 1) {
      const block = blocks[index];
      const f = block.fields;
      if (block.type === 'LINE') {
        const p1 = { x: readNumber(f, 10) * scale, y: readNumber(f, 20) * scale };
        const p2 = { x: readNumber(f, 11) * scale, y: readNumber(f, 21) * scale };
        length += Math.hypot(p2.x - p1.x, p2.y - p1.y);
        addPath([p1, p2]);
      } else if (block.type === 'CIRCLE') {
        const cx = readNumber(f, 10) * scale;
        const cy = readNumber(f, 20) * scale;
        const radius = Math.abs(readNumber(f, 40) * scale);
        const points = [];
        for (let i = 0; i <= 72; i += 1) points.push(pointOnArc(cx, cy, radius, i * 5));
        length += 2 * Math.PI * radius;
        pierces += 1;
        addPath(points, true);
      } else if (block.type === 'ARC') {
        const cx = readNumber(f, 10) * scale;
        const cy = readNumber(f, 20) * scale;
        const radius = Math.abs(readNumber(f, 40) * scale);
        const start = readNumber(f, 50);
        const end = readNumber(f, 51);
        const delta = angleDelta(start, end);
        const steps = Math.max(4, Math.ceil(delta / 5));
        const points = [];
        for (let i = 0; i <= steps; i += 1) points.push(pointOnArc(cx, cy, radius, start + delta * (i / steps)));
        length += radius * delta * Math.PI / 180;
        addPath(points);
      } else if (block.type === 'LWPOLYLINE') {
        const vertices = [];
        let current = null;
        for (const field of f) {
          if (field.code === 10) {
            if (current) vertices.push(current);
            current = { x: Number.parseFloat(field.value) * scale, y: 0, bulge: 0 };
          } else if (current && field.code === 20) {
            current.y = Number.parseFloat(field.value) * scale;
          } else if (current && field.code === 42) {
            current.bulge = Number.parseFloat(field.value) || 0;
          }
        }
        if (current) vertices.push(current);
        const closed = Boolean(readInt(f, 70) & 1);
        const polyPoints = [];
        const segmentCount = closed ? vertices.length : Math.max(0, vertices.length - 1);
        for (let i = 0; i < segmentCount; i += 1) {
          const a = vertices[i];
          const b = vertices[(i + 1) % vertices.length];
          const arc = bulgeArc(a, b, a.bulge || 0);
          length += arc.length;
          if (polyPoints.length) arc.points.shift();
          polyPoints.push(...arc.points);
        }
        if (!closed && vertices.length === 1) polyPoints.push(vertices[0]);
        if (closed) pierces += 1;
        addPath(polyPoints, closed);
      } else if (block.type === 'POLYLINE') {
        const vertices = [];
        const closed = Boolean(readInt(f, 70) & 1);
        let j = index + 1;
        while (j < blocks.length && blocks[j].type !== 'SEQEND') {
          if (blocks[j].type === 'VERTEX') {
            vertices.push({
              x: readNumber(blocks[j].fields, 10) * scale,
              y: readNumber(blocks[j].fields, 20) * scale,
              bulge: readNumber(blocks[j].fields, 42),
            });
          }
          j += 1;
        }
        index = j;
        const polyPoints = [];
        const segmentCount = closed ? vertices.length : Math.max(0, vertices.length - 1);
        for (let i = 0; i < segmentCount; i += 1) {
          const a = vertices[i];
          const b = vertices[(i + 1) % vertices.length];
          const arc = bulgeArc(a, b, a.bulge || 0);
          length += arc.length;
          if (polyPoints.length) arc.points.shift();
          polyPoints.push(...arc.points);
        }
        if (closed) pierces += 1;
        addPath(polyPoints, closed);
      } else if (!['VERTEX', 'SEQEND', 'POINT', 'TEXT', 'MTEXT', 'INSERT', 'HATCH'].includes(block.type)) {
        unsupported.add(block.type);
      }
    }

    if (!Number.isFinite(minX)) {
      minX = minY = maxX = maxY = 0;
    }
    return {
      lengthMm: length,
      pierces: Math.max(pierces, paths.length ? 1 : 0),
      areaMm2: Math.max(0, (maxX - minX) * (maxY - minY)),
      bounds: { minX, minY, maxX, maxY },
      paths,
      unsupported: Array.from(unsupported).sort(),
      entityCount: blocks.length,
    };
  }

  function drawDxf(parsed) {
    const canvas = $('dxf-preview');
    const ctx = canvas.getContext('2d');
    const cssWidth = canvas.clientWidth || canvas.width;
    const scaleFactor = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssWidth * scaleFactor);
    canvas.height = Math.round(Math.min(460, Math.max(260, cssWidth * 0.43)) * scaleFactor);
    ctx.setTransform(scaleFactor, 0, 0, scaleFactor, 0, 0);
    const width = canvas.width / scaleFactor;
    const height = canvas.height / scaleFactor;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#07101b';
    ctx.fillRect(0, 0, width, height);

    if (!parsed?.paths.length) {
      ctx.fillStyle = '#9fb0c8';
      ctx.font = '15px system-ui';
      ctx.fillText('No supported cut geometry found in this DXF.', 24, 42);
      return;
    }

    const b = parsed.bounds;
    const drawingWidth = Math.max(1e-6, b.maxX - b.minX);
    const drawingHeight = Math.max(1e-6, b.maxY - b.minY);
    const padding = 28;
    const s = Math.min((width - padding * 2) / drawingWidth, (height - padding * 2) / drawingHeight);
    const offsetX = (width - drawingWidth * s) / 2;
    const offsetY = (height - drawingHeight * s) / 2;

    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const path of parsed.paths) {
      if (!path.points.length) continue;
      ctx.beginPath();
      path.points.forEach((p, i) => {
        const x = offsetX + (p.x - b.minX) * s;
        const y = height - (offsetY + (p.y - b.minY) * s);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      if (path.closed) ctx.closePath();
      ctx.stroke();
    }
  }

  async function handleDxfFile(file) {
    if (!file) return;
    const status = $('dxf-status');
    status.textContent = 'Reading DXF…';
    try {
      const text = await file.text();
      const parsed = parseDxf(text, $('dxf-unit').value);
      parsed.fileName = file.name;
      state.dxf = parsed;
      $('pierces').value = parsed.pierces;
      $('part-area').value = fixed(parsed.areaMm2, 2).replaceAll(',', '');
      $('part-area-unit').value = 'mm2';
      status.innerHTML = `<strong>${escapeHtml(file.name)}</strong> — ${fixed(parsed.lengthMm, 2)} mm cut length · approximately ${fixed(parsed.pierces, 0)} pierces · ${fixed(parsed.areaMm2, 0)} mm² bounding-box area.`;
      const warning = $('dxf-warning');
      if (parsed.unsupported.length) {
        warning.hidden = false;
        warning.textContent = `Unsupported entity types were ignored: ${parsed.unsupported.join(', ')}. Verify the preview and totals before quoting.`;
      } else {
        warning.hidden = true;
        warning.textContent = '';
      }
      drawDxf(parsed);
    } catch (error) {
      state.dxf = null;
      status.textContent = `Could not read this DXF: ${error.message}`;
      drawDxf(null);
    }
  }

  function resetForm() {
    $('pcf-cost-form').reset();
    state.dxf = null;
    state.estimate = null;
    setGeometryMode('manual');
    updateMaterialFields();
    updateProcessDefaults();
    updateCurrencyUi();
    $('dxf-status').textContent = 'Choose a DXF file to calculate path length and approximate pierce count.';
    $('dxf-warning').hidden = true;
    $('pcf-results').hidden = true;
    drawDxf(null);
  }

  function showError(message) {
    window.alert(message);
  }

  document.addEventListener('DOMContentLoaded', () => {
    qsa('[data-geometry-mode]').forEach((button) => {
      button.addEventListener('click', () => setGeometryMode(button.dataset.geometryMode));
    });
    $('material-basis').addEventListener('change', updateMaterialFields);
    $('currency').addEventListener('change', () => {
      updateCurrencyUi();
      if (state.estimate) {
        try {
          state.estimate = calculateEstimate();
          renderEstimate(state.estimate, false);
        } catch (error) {
          showError(error.message);
        }
      }
    });
    $('material').addEventListener('change', updateProcessDefaults);
    $('thickness').addEventListener('change', updateProcessDefaults);
    $('thickness-unit').addEventListener('change', updateProcessDefaults);
    $('dxf-file').addEventListener('change', (event) => handleDxfFile(event.target.files?.[0]));
    $('dxf-unit').addEventListener('change', () => {
      const file = $('dxf-file').files?.[0];
      if (file) handleDxfFile(file);
    });
    window.addEventListener('resize', () => {
      if (state.dxf) drawDxf(state.dxf);
    });

    $('pcf-cost-form').addEventListener('submit', (event) => {
      event.preventDefault();
      try {
        if (state.geometryMode === 'dxf' && !state.dxf) throw new Error('Choose a DXF file or switch to Manual entry.');
        const estimate = calculateEstimate();
        state.estimate = estimate;
        renderEstimate(estimate);
      } catch (error) {
        showError(error.message);
      }
    });
    $('reset-estimator').addEventListener('click', resetForm);
    $('download-csv').addEventListener('click', downloadCsv);
    $('download-pdf').addEventListener('click', downloadPdf);

    setGeometryMode('manual');
    updateMaterialFields();
    updateProcessDefaults();
    updateCurrencyUi();
    drawDxf(null);
  });

  window.PCFEstimator = { calculateEstimate, parseDxf, interpolateDefaults };
})();
