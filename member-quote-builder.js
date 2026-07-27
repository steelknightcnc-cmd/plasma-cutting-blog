(() => {
  'use strict';

  const MM_PER_INCH = 25.4;
  const PROFILE_KEY = 'pcf_member_company_profile_v1';
  const CURRENCIES = {
    USD: { symbol: '$', label: 'USD' },
    CAD: { symbol: 'CA$', label: 'CAD' },
    AUD: { symbol: 'A$', label: 'AUD' },
    EUR: { symbol: '€', label: 'EUR' }
  };

  // Same conservative starting data used by the public Plasma Cut Forge cost estimator.
  // These are starting points only; members should verify against their machine cut chart.
  const SPEED_TABLE = {
    'Mild steel': [
      [1, 6500, 0.25], [2, 4500, 0.35], [3, 3200, 0.45], [4, 2500, 0.55],
      [6, 1800, 0.8], [8, 1350, 1.0], [10, 1050, 1.2], [12, 850, 1.5],
      [16, 600, 2.0], [20, 430, 2.8], [25, 300, 3.8], [32, 190, 5.0], [40, 120, 6.5]
    ],
    'Stainless steel': [
      [1, 5200, 0.35], [2, 3400, 0.45], [3, 2400, 0.6], [4, 1900, 0.75],
      [6, 1300, 1.0], [8, 950, 1.3], [10, 720, 1.7], [12, 560, 2.1],
      [16, 390, 2.9], [20, 280, 3.8], [25, 190, 5.0], [32, 120, 6.5]
    ],
    Aluminum: [
      [1, 7000, 0.25], [2, 5000, 0.35], [3, 3600, 0.45], [4, 2800, 0.6],
      [6, 1950, 0.85], [8, 1450, 1.1], [10, 1100, 1.4], [12, 880, 1.8],
      [16, 620, 2.4], [20, 450, 3.2], [25, 320, 4.2], [32, 210, 5.5]
    ]
  };

  const state = {
    context: null,
    currentQuoteId: null,
    items: [],
    logoDataUrl: '',
    logoDimensions: null,
    fileCache: new Map(),
    calculations: null
  };

  const $ = (id) => document.getElementById(id);
  const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const value = (id, fallback = '') => $(id)?.value ?? fallback;
  const number = (id, fallback = 0) => {
    const parsed = Number.parseFloat(value(id));
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  const escapeHtml = (text) => String(text ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));

  function currency() {
    const code = value('mq-currency', 'USD');
    return CURRENCIES[code] ? code : 'USD';
  }

  function money(amount, code = currency()) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'symbol'
    }).format(Number(amount) || 0);
  }

  function fixed(valueToFormat, digits = 2) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(Number(valueToFormat) || 0);
  }


  function toMm(valueToConvert, unit) {
    return (Number(valueToConvert) || 0) * (unit === 'in' ? MM_PER_INCH : 1);
  }

  function recommendedProcess(material, thickness, unit) {
    const rows = SPEED_TABLE[material];
    if (!rows) return null;
    const thicknessMm = toMm(thickness, unit);
    if (thicknessMm <= rows[0][0]) return { speed: rows[0][1], pierce: rows[0][2] };
    if (thicknessMm >= rows[rows.length - 1][0]) {
      const row = rows[rows.length - 1];
      return { speed: row[1], pierce: row[2] };
    }
    for (let i = 1; i < rows.length; i += 1) {
      const low = rows[i - 1];
      const high = rows[i];
      if (thicknessMm <= high[0]) {
        const ratio = (thicknessMm - low[0]) / (high[0] - low[0]);
        return {
          speed: Math.round(low[1] + ratio * (high[1] - low[1])),
          pierce: Number((low[2] + ratio * (high[2] - low[2])).toFixed(2))
        };
      }
    }
    return null;
  }

  function applyProcessDefaults(item) {
    if (!item.autoProcess) return;
    const defaults = recommendedProcess(item.material, item.thickness, item.thicknessUnit);
    if (!defaults) return;
    item.cutSpeed = defaults.speed;
    item.pierceTime = defaults.pierce;
  }

  function parsePairs(text) {
    const lines = String(text || '').replace(/\r/g, '').split('\n');
    const pairs = [];
    for (let i = 0; i + 1 < lines.length; i += 2) {
      const code = Number.parseInt(lines[i].trim(), 10);
      if (!Number.isFinite(code)) continue;
      pairs.push({ code, value: lines[i + 1].trim() });
    }
    return pairs;
  }

  function readNumber(fields, code, fallback = 0) {
    const field = fields.find((entry) => entry.code === code);
    const parsed = field ? Number.parseFloat(field.value) : fallback;
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function readInt(fields, code, fallback = 0) {
    const field = fields.find((entry) => entry.code === code);
    const parsed = field ? Number.parseInt(field.value, 10) : fallback;
    return Number.isFinite(parsed) ? parsed : fallback;
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

  function dxfScaleFromHeader(pairs) {
    const scales = {
      1: MM_PER_INCH, 2: 304.8, 4: 1, 5: 10, 6: 1000,
      8: 0.0000254, 9: 0.000001, 10: 914.4, 14: 100, 15: 1000
    };
    for (let i = 0; i < pairs.length - 1; i += 1) {
      if (pairs[i].code === 9 && pairs[i].value === '$INSUNITS') {
        const unitPair = pairs.slice(i + 1, i + 5).find((pair) => pair.code === 70);
        const code = Number.parseInt(unitPair?.value, 10);
        if (scales[code]) return { scale: scales[code], detected: code === 1 ? 'in' : 'mm' };
      }
    }
    return null;
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
    if (!chord || Math.abs(bulge) < 1e-12) return { length: chord, points: [p1, p2] };
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
    const steps = Math.max(8, Math.ceil(Math.abs(theta) / (Math.PI / 18)));
    const points = [];
    for (let i = 0; i <= steps; i += 1) {
      const angle = start + theta * (i / steps);
      points.push({ x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
    }
    return { length: Math.abs(theta * radius), points };
  }

  function parseDxf(text, unitPreference = 'auto') {
    const pairs = parsePairs(text);
    const detected = dxfScaleFromHeader(pairs);
    const scale = unitPreference === 'in' ? MM_PER_INCH : unitPreference === 'mm' ? 1 : (detected?.scale || 1);
    const blocks = collectEntityBlocks(pairs);
    const paths = [];
    const unsupported = new Set();
    let lengthMm = 0;
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
        lengthMm += Math.hypot(p2.x - p1.x, p2.y - p1.y);
        addPath([p1, p2]);
      } else if (block.type === 'CIRCLE') {
        const cx = readNumber(f, 10) * scale;
        const cy = readNumber(f, 20) * scale;
        const radius = Math.abs(readNumber(f, 40) * scale);
        const points = [];
        for (let i = 0; i <= 72; i += 1) points.push(pointOnArc(cx, cy, radius, i * 5));
        lengthMm += 2 * Math.PI * radius;
        pierces += 1;
        addPath(points, true);
      } else if (block.type === 'ARC') {
        const cx = readNumber(f, 10) * scale;
        const cy = readNumber(f, 20) * scale;
        const radius = Math.abs(readNumber(f, 40) * scale);
        const start = readNumber(f, 50);
        const end = readNumber(f, 51);
        const delta = angleDelta(start, end);
        const points = [];
        const steps = Math.max(4, Math.ceil(delta / 5));
        for (let i = 0; i <= steps; i += 1) points.push(pointOnArc(cx, cy, radius, start + delta * (i / steps)));
        lengthMm += radius * delta * Math.PI / 180;
        addPath(points);
      } else if (block.type === 'LWPOLYLINE') {
        const vertices = [];
        let current = null;
        for (const field of f) {
          if (field.code === 10) {
            if (current) vertices.push(current);
            current = { x: Number.parseFloat(field.value) * scale, y: 0, bulge: 0 };
          } else if (current && field.code === 20) current.y = Number.parseFloat(field.value) * scale;
          else if (current && field.code === 42) current.bulge = Number.parseFloat(field.value) || 0;
        }
        if (current) vertices.push(current);
        const closed = Boolean(readInt(f, 70) & 1);
        const polyPoints = [];
        const segmentCount = closed ? vertices.length : Math.max(0, vertices.length - 1);
        for (let i = 0; i < segmentCount; i += 1) {
          const a = vertices[i];
          const b = vertices[(i + 1) % vertices.length];
          const arc = bulgeArc(a, b, a.bulge || 0);
          lengthMm += arc.length;
          if (polyPoints.length) arc.points.shift();
          polyPoints.push(...arc.points);
        }
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
              bulge: readNumber(blocks[j].fields, 42)
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
          lengthMm += arc.length;
          if (polyPoints.length) arc.points.shift();
          polyPoints.push(...arc.points);
        }
        if (closed) pierces += 1;
        addPath(polyPoints, closed);
      } else if (!['VERTEX', 'SEQEND', 'POINT', 'TEXT', 'MTEXT', 'INSERT', 'HATCH'].includes(block.type)) {
        unsupported.add(block.type);
      }
    }

    if (!Number.isFinite(minX)) minX = minY = maxX = maxY = 0;
    const warnings = [];
    if (unitPreference === 'auto' && !detected) warnings.push('DXF units were not declared; millimetres were assumed.');
    if (unsupported.size) warnings.push(`Ignored unsupported DXF entities: ${Array.from(unsupported).sort().join(', ')}.`);
    return {
      kind: 'DXF',
      lengthMm,
      pierces: Math.max(pierces, paths.length ? 1 : 0),
      areaMm2: Math.max(0, (maxX - minX) * (maxY - minY)),
      warnings,
      unitLabel: unitPreference === 'auto' ? (detected?.detected || 'mm assumed') : unitPreference
    };
  }

  function stripGcodeComments(line) {
    return line.replace(/\([^)]*\)/g, ' ').replace(/;.*$/, ' ').trim();
  }

  function arcLengthFromRadius(x1, y1, x2, y2, radiusValue) {
    const chord = Math.hypot(x2 - x1, y2 - y1);
    const radius = Math.abs(radiusValue);
    if (!radius || chord > radius * 2 + 1e-8) return chord;
    let sweep = 2 * Math.asin(Math.min(1, chord / (2 * radius)));
    if (radiusValue < 0) sweep = Math.PI * 2 - sweep;
    return radius * sweep;
  }

  function arcLengthFromCenter(x1, y1, x2, y2, i, j, clockwise) {
    const cx = x1 + i;
    const cy = y1 + j;
    const radius = Math.hypot(i, j);
    if (!radius) return Math.hypot(x2 - x1, y2 - y1);
    const start = Math.atan2(y1 - cy, x1 - cx);
    const end = Math.atan2(y2 - cy, x2 - cx);
    let sweep = clockwise ? start - end : end - start;
    while (sweep < 0) sweep += Math.PI * 2;
    while (sweep >= Math.PI * 2) sweep -= Math.PI * 2;
    if (Math.abs(x2 - x1) < 1e-9 && Math.abs(y2 - y1) < 1e-9) sweep = Math.PI * 2;
    return radius * sweep;
  }

  function parseGcode(text, unitPreference = 'auto') {
    const source = String(text || '');
    const hasTorchCommands = /\bM0?[34]\b/im.test(source) || /\bM6[24]\b/im.test(source);
    let unitScale = unitPreference === 'in' ? MM_PER_INCH : 1;
    let unitLabel = unitPreference === 'in' ? 'in' : 'mm';
    let absolute = true;
    let motion = 0;
    let x = 0;
    let y = 0;
    let torchOn = false;
    let inCutSequence = false;
    let lengthMm = 0;
    let pierces = 0;
    let cutMoves = 0;
    let rapidMoves = 0;
    let arcFallbacks = 0;

    const lines = source.replace(/\r/g, '').split('\n');
    for (const rawLine of lines) {
      const line = stripGcodeComments(rawLine).toUpperCase();
      if (!line || line === '%') continue;
      const words = [];
      const regex = /([A-Z])\s*([-+]?(?:\d+\.?\d*|\.\d+))/g;
      let match;
      while ((match = regex.exec(line))) words.push({ letter: match[1], value: Number.parseFloat(match[2]) });
      if (!words.length) continue;
      const gCodes = words.filter((word) => word.letter === 'G').map((word) => Math.round(word.value));
      const mCodes = words.filter((word) => word.letter === 'M').map((word) => Math.round(word.value));
      if (unitPreference === 'auto' && gCodes.includes(20)) { unitScale = MM_PER_INCH; unitLabel = 'in (G20)'; }
      if (unitPreference === 'auto' && gCodes.includes(21)) { unitScale = 1; unitLabel = 'mm (G21)'; }
      if (gCodes.includes(90)) absolute = true;
      if (gCodes.includes(91)) absolute = false;
      const nextMotion = gCodes.find((code) => [0, 1, 2, 3].includes(code));
      if (nextMotion !== undefined) motion = nextMotion;

      if (mCodes.some((code) => [3, 4, 62, 64].includes(code)) && !torchOn) {
        torchOn = true;
        pierces += 1;
        inCutSequence = true;
      }
      if (mCodes.some((code) => [5, 63, 65].includes(code))) {
        torchOn = false;
        inCutSequence = false;
      }

      const xWord = words.find((word) => word.letter === 'X');
      const yWord = words.find((word) => word.letter === 'Y');
      if (!xWord && !yWord) continue;
      const targetX = xWord ? (absolute ? xWord.value * unitScale : x + xWord.value * unitScale) : x;
      const targetY = yWord ? (absolute ? yWord.value * unitScale : y + yWord.value * unitScale) : y;
      const isCutMotion = [1, 2, 3].includes(motion);
      const countAsCut = isCutMotion && (hasTorchCommands ? torchOn : true);

      if (motion === 0) {
        rapidMoves += 1;
        if (!hasTorchCommands) inCutSequence = false;
      } else if (countAsCut) {
        if (!hasTorchCommands && !inCutSequence) {
          pierces += 1;
          inCutSequence = true;
        }
        let moveLength = Math.hypot(targetX - x, targetY - y);
        if ([2, 3].includes(motion)) {
          const iWord = words.find((word) => word.letter === 'I');
          const jWord = words.find((word) => word.letter === 'J');
          const rWord = words.find((word) => word.letter === 'R');
          if (iWord || jWord) {
            moveLength = arcLengthFromCenter(x, y, targetX, targetY, (iWord?.value || 0) * unitScale, (jWord?.value || 0) * unitScale, motion === 2);
          } else if (rWord) {
            moveLength = arcLengthFromRadius(x, y, targetX, targetY, rWord.value * unitScale);
          } else {
            arcFallbacks += 1;
          }
        }
        lengthMm += moveLength;
        cutMoves += 1;
      }
      x = targetX;
      y = targetY;
    }

    const warnings = [];
    if (unitPreference === 'auto' && !/\bG2[01]\b/im.test(source)) warnings.push('No G20/G21 unit command was found; millimetres were assumed.');
    if (!hasTorchCommands) warnings.push('No M3/M4 torch-on commands were found; pierces were estimated from separate feed-move groups.');
    if (arcFallbacks) warnings.push(`${arcFallbacks} arc move(s) lacked I/J or R data and were measured as straight chords.`);
    if (!cutMoves) warnings.push('No supported XY cutting moves were found.');
    return { kind: 'NC / G-code', lengthMm, pierces: Math.max(0, pierces), warnings, unitLabel, cutMoves, rapidMoves };
  }

  function parseGeometryFile(fileName, text, unitPreference) {
    const extension = String(fileName || '').toLowerCase().split('.').pop();
    if (extension === 'dxf') return parseDxf(text, unitPreference);
    return parseGcode(text, unitPreference);
  }

  async function processGeometryFile(item, file) {
    if (!file) return;
    if (file.size > 8_000_000) {
      item.fileStatus = 'File is too large. Use a DXF, NC, TAP, NGC, or G-code text file smaller than 8 MB.';
      item.fileWarning = true;
      renderItems();
      return;
    }
    try {
      const text = await file.text();
      state.fileCache.set(item.id, { name: file.name, text });
      const parsed = parseGeometryFile(file.name, text, item.fileUnit || 'auto');
      item.geometryMode = 'file';
      item.fileName = file.name;
      item.fileType = parsed.kind;
      item.cutLength = Number(parsed.lengthMm.toFixed(3));
      item.lengthUnit = 'mm';
      item.pierces = Math.max(0, Math.round(parsed.pierces));
      item.fileStatus = `${parsed.kind}: ${fixed(parsed.lengthMm, 2)} mm cut length, approximately ${fixed(item.pierces, 0)} pierce${item.pierces === 1 ? '' : 's'}, units ${parsed.unitLabel}.`;
      item.fileWarnings = parsed.warnings || [];
    } catch (error) {
      item.fileStatus = `Could not read ${file.name}: ${error?.message || 'unsupported file'}`;
      item.fileWarnings = ['Verify that the file is plain-text DXF or standard XY G-code.'];
    }
    renderItems();
    calculateQuote();
  }

  async function reprocessCachedFile(item) {
    const cached = state.fileCache.get(item.id);
    if (!cached) {
      item.fileWarnings = ['The original file is not stored in saved quotes. Upload it again to recalculate with different units.'];
      renderItems();
      return;
    }
    const parsed = parseGeometryFile(cached.name, cached.text, item.fileUnit || 'auto');
    item.cutLength = Number(parsed.lengthMm.toFixed(3));
    item.lengthUnit = 'mm';
    item.pierces = Math.max(0, Math.round(parsed.pierces));
    item.fileStatus = `${parsed.kind}: ${fixed(parsed.lengthMm, 2)} mm cut length, approximately ${fixed(item.pierces, 0)} pierce${item.pierces === 1 ? '' : 's'}, units ${parsed.unitLabel}.`;
    item.fileWarnings = parsed.warnings || [];
    renderItems();
    calculateQuote();
  }

  function formatDateInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function generateQuoteNumber() {
    const now = new Date();
    const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return `PCF-${date}-${suffix}`;
  }

  function blankItem(index = 1) {
    const item = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      description: `Plasma cut part ${index}`,
      material: 'Mild steel',
      thickness: 6,
      thicknessUnit: 'mm',
      geometryMode: 'manual',
      fileUnit: 'auto',
      fileName: '',
      fileType: '',
      fileStatus: '',
      fileWarnings: [],
      cutLength: 1000,
      lengthUnit: 'mm',
      pierces: 1,
      quantity: 1,
      autoProcess: true,
      cutSpeed: 1800,
      pierceTime: 0.8,
      machineRate: 120,
      consumablePerPart: 0,
      materialPerPart: 0,
      laborMinutesPerPart: 0,
      laborRate: 65
    };
    applyProcessDefaults(item);
    return item;
  }

  function normalizeItem(raw, index = 1) {
    const item = { ...blankItem(index), ...(raw || {}) };
    item.fileWarnings = Array.isArray(item.fileWarnings) ? item.fileWarnings : [];
    item.geometryMode = item.geometryMode === 'file' ? 'file' : 'manual';
    item.fileUnit = ['auto', 'mm', 'in'].includes(item.fileUnit) ? item.fileUnit : 'auto';
    const savedAutoSetting = raw && Object.prototype.hasOwnProperty.call(raw, 'autoProcess');
    item.autoProcess = savedAutoSetting ? raw.autoProcess !== false : false;
    if (item.autoProcess) applyProcessDefaults(item);
    return item;
  }

  function itemField(item, key, label, type = 'number', extras = '') {
    const inputValue = escapeHtml(item[key]);
    return `<label class="mq-field"><span>${label}</span><input data-item-field="${key}" type="${type}" value="${inputValue}" ${extras}></label>`;
  }

  function renderItems() {
    const container = $('mq-items');
    if (!container) return;

    container.innerHTML = state.items.map((item, index) => {
      const calc = calculateItem(item);
      const recommended = recommendedProcess(item.material, item.thickness, item.thicknessUnit);
      const fileMode = item.geometryMode === 'file';
      const fileStatus = item.fileStatus || (item.fileName
        ? `${item.fileType || 'Uploaded geometry'}: using saved totals from ${item.fileName}. Upload the file again to recalculate.`
        : 'Upload one DXF, .NC, .TAP, .NGC, or G-code file for this part.');
      const warningHtml = item.fileWarnings?.length
        ? `<div class="mq-file-warning">${item.fileWarnings.map((warning) => `<div>${escapeHtml(warning)}</div>`).join('')}</div>`
        : '';
      return `
        <article class="mq-item" data-item-id="${escapeHtml(item.id)}">
          <div class="mq-item-header">
            <div><h3>Part ${index + 1}</h3>${item.fileName ? `<small>${escapeHtml(item.fileName)}</small>` : ''}</div>
            <button class="mq-button danger" type="button" data-remove-item="${escapeHtml(item.id)}">Remove</button>
          </div>

          <div class="mq-geometry-box">
            <label class="mq-field"><span>Geometry source</span><select data-item-field="geometryMode">
              <option value="manual" ${!fileMode ? 'selected' : ''}>Manual entry</option>
              <option value="file" ${fileMode ? 'selected' : ''}>DXF / NC / G-code upload</option>
            </select></label>
            ${fileMode ? `
              <label class="mq-field"><span>File units</span><select data-item-field="fileUnit">
                <option value="auto" ${item.fileUnit === 'auto' ? 'selected' : ''}>Auto-detect</option>
                <option value="mm" ${item.fileUnit === 'mm' ? 'selected' : ''}>Millimetres</option>
                <option value="in" ${item.fileUnit === 'in' ? 'selected' : ''}>Inches</option>
              </select></label>
              <label class="mq-field mq-file-field"><span>Part file</span><input data-item-file type="file" accept=".dxf,.nc,.cnc,.tap,.ngc,.gcode,.txt,text/plain,application/dxf"></label>
              <div class="mq-file-status full"><strong>${escapeHtml(fileStatus)}</strong>${warningHtml}<small>Geometry parsing is an estimate. Verify cut length, pierces, lead-ins, and post-processor behavior before issuing the quote.</small></div>
            ` : `<div class="mq-file-status full"><strong>Enter cut length and pierces manually for this part.</strong></div>`}
          </div>

          <div class="mq-grid three">
            ${itemField(item, 'description', 'Part description', 'text')}
            <label class="mq-field"><span>Material</span><select data-item-field="material">
              ${['Mild steel', 'Stainless steel', 'Aluminum', 'Other'].map((material) => `<option ${item.material === material ? 'selected' : ''}>${material}</option>`).join('')}
            </select></label>
            ${itemField(item, 'thickness', 'Thickness', 'number', 'min="0" step="0.1"')}
            <label class="mq-field"><span>Thickness unit</span><select data-item-field="thicknessUnit">
              <option value="mm" ${item.thicknessUnit === 'mm' ? 'selected' : ''}>mm</option>
              <option value="in" ${item.thicknessUnit === 'in' ? 'selected' : ''}>inches</option>
            </select></label>
            ${itemField(item, 'cutLength', fileMode ? 'Calculated cut length' : 'Cut length per part', 'number', `min="0" step="0.01" ${fileMode ? 'readonly' : ''}`)}
            <label class="mq-field"><span>Cut length unit</span><select data-item-field="lengthUnit" ${fileMode ? 'disabled' : ''}>
              <option value="mm" ${item.lengthUnit === 'mm' ? 'selected' : ''}>mm</option>
              <option value="in" ${item.lengthUnit === 'in' ? 'selected' : ''}>inches</option>
            </select></label>
            ${itemField(item, 'pierces', fileMode ? 'Estimated pierces per part' : 'Pierces per part', 'number', `min="0" step="1" ${fileMode ? 'readonly' : ''}`)}
            ${itemField(item, 'quantity', 'Quantity', 'number', 'min="1" step="1"')}

            <label class="mq-check-field full">
              <input data-item-autoprocess type="checkbox" ${item.autoProcess ? 'checked' : ''} ${recommended ? '' : 'disabled'}>
              <span>Automatically use Plasma Cut Forge starting speed and pierce time for this material and thickness</span>
            </label>
            ${itemField(item, 'cutSpeed', 'Cut speed (mm/min)', 'number', `min="1" step="1" ${item.autoProcess && recommended ? 'readonly' : ''}`)}
            ${itemField(item, 'pierceTime', 'Pierce time (sec)', 'number', `min="0" step="0.05" ${item.autoProcess && recommended ? 'readonly' : ''}`)}
            <div class="mq-process-note">${recommended
              ? `Recommended start: <strong>${fixed(recommended.speed, 0)} mm/min</strong> and <strong>${fixed(recommended.pierce, 2)} sec</strong>. Verify against the plasma manufacturer cut chart.`
              : 'No automatic starting data is available for Other. Enter machine-specific speed and pierce time.'}</div>

            ${itemField(item, 'machineRate', 'Machine rate / hour', 'number', 'min="0" step="0.01"')}
            ${itemField(item, 'consumablePerPart', 'Consumables / part', 'number', 'min="0" step="0.01"')}
            <label class="mq-field"><span>Raw material cost / part</span><input data-item-field="materialPerPart" type="number" value="${escapeHtml(item.materialPerPart)}" min="0" step="0.01"><small class="mq-field-help">Your actual sheet or plate cost allocated to one part, including nesting and expected waste. Enter cost, not selling price; leave 0 if material is customer-supplied.</small></label>
            ${itemField(item, 'laborMinutesPerPart', 'Handling labor min / part', 'number', 'min="0" step="0.1"')}
            ${itemField(item, 'laborRate', 'Handling labor / hour', 'number', 'min="0" step="0.01"')}
          </div>
          <div class="mq-item-costs">
            <div><span>Machine time</span><strong data-item-cost="time">${fixed(calc.totalMachineMinutes, 2)} min</strong></div>
            <div><span>Direct cost</span><strong data-item-cost="direct">${money(calc.directCost)}</strong></div>
            <div><span>Sell total</span><strong data-item-cost="sell">${money(itemSellTotal(calc))}</strong></div>
            <div><span>Sell / part</span><strong data-item-cost="unit">${money(itemSellTotal(calc) / Math.max(1, calc.quantity))}</strong></div>
          </div>
        </article>`;
    }).join('');

    container.querySelectorAll('[data-item-field]').forEach((input) => {
      input.addEventListener('input', handleItemInput);
      input.addEventListener('change', handleItemInput);
    });
    container.querySelectorAll('[data-item-autoprocess]').forEach((input) => {
      input.addEventListener('change', (event) => {
        const card = event.target.closest('[data-item-id]');
        const item = state.items.find((entry) => entry.id === card?.dataset.itemId);
        if (!item) return;
        item.autoProcess = event.target.checked;
        if (item.autoProcess) applyProcessDefaults(item);
        renderItems();
        calculateQuote();
      });
    });
    container.querySelectorAll('[data-item-file]').forEach((input) => {
      input.addEventListener('change', (event) => {
        const card = event.target.closest('[data-item-id]');
        const item = state.items.find((entry) => entry.id === card?.dataset.itemId);
        processGeometryFile(item, event.target.files?.[0]);
      });
    });
    container.querySelectorAll('[data-remove-item]').forEach((button) => {
      button.addEventListener('click', () => {
        if (state.items.length === 1) return;
        state.fileCache.delete(button.dataset.removeItem);
        state.items = state.items.filter((item) => item.id !== button.dataset.removeItem);
        renderItems();
        calculateQuote();
      });
    });
  }

  function handleItemInput(event) {
    const card = event.target.closest('[data-item-id]');
    const item = state.items.find((entry) => entry.id === card?.dataset.itemId);
    if (!item) return;
    const key = event.target.dataset.itemField;
    if (!key) return;
    const numericKeys = new Set(['thickness', 'cutLength', 'pierces', 'quantity', 'cutSpeed', 'pierceTime', 'machineRate', 'consumablePerPart', 'materialPerPart', 'laborMinutesPerPart', 'laborRate']);
    item[key] = numericKeys.has(key) ? Number.parseFloat(event.target.value) || 0 : event.target.value;

    if (key === 'geometryMode') {
      if (item.geometryMode === 'manual') {
        item.fileStatus = '';
        item.fileWarnings = [];
      }
      renderItems();
      calculateQuote();
      return;
    }
    if (key === 'fileUnit') {
      reprocessCachedFile(item);
      return;
    }
    if (['material', 'thickness', 'thicknessUnit'].includes(key)) {
      if (item.material === 'Other') item.autoProcess = false;
      applyProcessDefaults(item);
      renderItems();
      calculateQuote();
      return;
    }

    const calc = calculateItem(item);
    const sell = itemSellTotal(calc);
    const setCost = (role, text) => {
      const target = card.querySelector(`[data-item-cost="${role}"]`);
      if (target) target.textContent = text;
    };
    setCost('time', `${fixed(calc.totalMachineMinutes, 2)} min`);
    setCost('direct', money(calc.directCost));
    setCost('sell', money(sell));
    setCost('unit', money(sell / Math.max(1, calc.quantity)));
    calculateQuote();
  }

  function calculateItem(item) {
    const lengthMm = (Number(item.cutLength) || 0) * (item.lengthUnit === 'in' ? MM_PER_INCH : 1);
    const speed = Math.max(1, Number(item.cutSpeed) || 1);
    const quantity = Math.max(1, Math.round(Number(item.quantity) || 1));
    const cutSecondsPerPart = lengthMm / speed * 60;
    const pierceSecondsPerPart = Math.max(0, Number(item.pierces) || 0) * Math.max(0, Number(item.pierceTime) || 0);
    const machineSeconds = (cutSecondsPerPart + pierceSecondsPerPart) * quantity;
    const machineCost = machineSeconds / 3600 * Math.max(0, Number(item.machineRate) || 0);
    const consumableCost = Math.max(0, Number(item.consumablePerPart) || 0) * quantity;
    const materialCost = Math.max(0, Number(item.materialPerPart) || 0) * quantity;
    const laborCost = Math.max(0, Number(item.laborMinutesPerPart) || 0) / 60 * Math.max(0, Number(item.laborRate) || 0) * quantity;
    const directCost = machineCost + consumableCost + materialCost + laborCost;
    return {
      ...item,
      quantity,
      lengthMm,
      cutSecondsPerPart,
      pierceSecondsPerPart,
      machineSeconds,
      totalMachineMinutes: machineSeconds / 60,
      machineCost,
      consumableCost,
      materialCost,
      laborCost,
      directCost
    };
  }

  function pricingMethod() {
    return value('mq-pricing-method', 'markup');
  }

  function itemSellTotal(calc) {
    if (pricingMethod() === 'margin') {
      const margin = Math.min(95, Math.max(0, number('mq-profit-margin', 0))) / 100;
      return calc.directCost / Math.max(.05, 1 - margin);
    }
    const materialMultiplier = 1 + Math.max(0, number('mq-material-markup', 0)) / 100;
    const processingMultiplier = 1 + Math.max(0, number('mq-processing-markup', 0)) / 100;
    const processing = calc.machineCost + calc.consumableCost + calc.laborCost;
    return calc.materialCost * materialMultiplier + processing * processingMultiplier;
  }

  function additionalCosts() {
    const setup = number('mq-setup-hours') * number('mq-setup-rate');
    const design = number('mq-design-hours') * number('mq-design-rate');
    const finishing = number('mq-finishing-hours') * number('mq-finishing-rate');
    const delivery = number('mq-delivery');
    const other = number('mq-other-cost');
    return { setup, design, finishing, delivery, other, total: setup + design + finishing + delivery + other };
  }

  function sellAdditional(additional) {
    if (pricingMethod() === 'margin') {
      const margin = Math.min(95, Math.max(0, number('mq-profit-margin', 0))) / 100;
      return additional.total / Math.max(.05, 1 - margin);
    }
    return additional.total * (1 + Math.max(0, number('mq-processing-markup', 0)) / 100);
  }

  function calculateQuote() {
    const itemCalcs = state.items.map(calculateItem);
    const additional = additionalCosts();
    const itemsDirect = itemCalcs.reduce((sum, item) => sum + item.directCost, 0);
    const directCost = itemsDirect + additional.total;
    const itemSelling = itemCalcs.reduce((sum, item) => sum + itemSellTotal(item), 0);
    const grossSelling = itemSelling + sellAdditional(additional);
    const discount = grossSelling * Math.min(100, Math.max(0, number('mq-discount-percent'))) / 100 + Math.max(0, number('mq-discount-fixed'));
    const afterDiscount = Math.max(0, grossSelling - discount);
    const minimumCharge = Math.max(0, number('mq-minimum-charge'));
    const minimumAdjustment = Math.max(0, minimumCharge - afterDiscount);
    const taxableSubtotal = afterDiscount + minimumAdjustment;
    const tax = taxableSubtotal * Math.max(0, number('mq-tax-rate')) / 100;
    const total = taxableSubtotal + tax;
    const deposit = total * Math.min(100, Math.max(0, number('mq-deposit-percent'))) / 100;
    const grossProfit = total - tax - directCost;
    const actualMargin = taxableSubtotal > 0 ? grossProfit / taxableSubtotal * 100 : 0;

    state.calculations = {
      itemCalcs,
      additional,
      directCost,
      itemSelling,
      grossSelling,
      discount,
      minimumAdjustment,
      taxableSubtotal,
      tax,
      total,
      deposit,
      grossProfit,
      actualMargin
    };

    $('mq-direct-cost').textContent = money(directCost);
    $('mq-gross-profit').textContent = money(grossProfit);
    $('mq-actual-margin').textContent = `${fixed(actualMargin, 1)}%`;
    $('mq-deposit').textContent = money(deposit);
    $('mq-customer-total').textContent = money(total);

    $('mq-summary-breakdown').innerHTML = [
      ['Parts selling total', itemSelling],
      ['Additional work selling total', sellAdditional(additional)],
      ['Discount', -discount],
      ['Minimum-charge adjustment', minimumAdjustment],
      ['Tax / VAT', tax]
    ].map(([label, amount]) => `<div class="mq-summary-row"><span>${label}</span><strong>${money(amount)}</strong></div>`).join('');

    return state.calculations;
  }

  function updatePricingFields() {
    const method = pricingMethod();
    qsa('[data-pricing-field="material-markup"], [data-pricing-field="processing-markup"]').forEach((element) => element.classList.toggle('mq-hidden', method !== 'markup'));
    qsa('[data-pricing-field="margin"]').forEach((element) => element.classList.toggle('mq-hidden', method !== 'margin'));
    renderItems();
    calculateQuote();
  }

  function companyProfile() {
    return {
      name: value('mq-company-name'),
      contact: value('mq-company-contact'),
      email: value('mq-company-email'),
      phone: value('mq-company-phone'),
      address: value('mq-company-address'),
      taxId: value('mq-company-tax-id')
    };
  }

  function saveCompanyProfile() {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(companyProfile()));
    } catch (error) {
      console.warn('Company profile could not be saved locally.', error);
    }
  }

  function loadCompanyProfile() {
    try {
      const profile = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
      const mapping = {
        name: 'mq-company-name', contact: 'mq-company-contact', email: 'mq-company-email',
        phone: 'mq-company-phone', address: 'mq-company-address', taxId: 'mq-company-tax-id'
      };
      Object.entries(mapping).forEach(([key, id]) => {
        if (profile[key]) $(id).value = profile[key];
      });
    } catch (error) {
      console.warn('Saved company profile could not be loaded.', error);
    }
  }

  function collectQuoteData() {
    const calculations = calculateQuote();
    return {
      version: 2,
      quoteTitle: value('mq-quote-title'),
      quoteNumber: value('mq-quote-number'),
      quoteDate: value('mq-quote-date'),
      validThrough: value('mq-valid-through'),
      company: companyProfile(),
      customer: {
        name: value('mq-customer-name'),
        contact: value('mq-customer-contact'),
        email: value('mq-customer-email'),
        address: value('mq-customer-address')
      },
      currency: currency(),
      items: state.items,
      additional: {
        setupHours: number('mq-setup-hours'), setupRate: number('mq-setup-rate'),
        designHours: number('mq-design-hours'), designRate: number('mq-design-rate'),
        finishingHours: number('mq-finishing-hours'), finishingRate: number('mq-finishing-rate'),
        delivery: number('mq-delivery'), otherCost: number('mq-other-cost'),
        otherDescription: value('mq-other-description')
      },
      pricing: {
        method: pricingMethod(),
        materialMarkup: number('mq-material-markup'),
        processingMarkup: number('mq-processing-markup'),
        profitMargin: number('mq-profit-margin'),
        minimumCharge: number('mq-minimum-charge'),
        discountPercent: number('mq-discount-percent'),
        discountFixed: number('mq-discount-fixed'),
        taxRate: number('mq-tax-rate'),
        depositPercent: number('mq-deposit-percent')
      },
      customerNotes: value('mq-customer-notes'),
      terms: value('mq-terms'),
      totals: calculations
    };
  }

  function applyQuoteData(data) {
    const set = (id, val) => { if ($(id) && val !== undefined && val !== null) $(id).value = val; };
    set('mq-quote-title', data.quoteTitle);
    set('mq-quote-number', data.quoteNumber);
    set('mq-quote-date', data.quoteDate);
    set('mq-valid-through', data.validThrough);
    set('mq-company-name', data.company?.name);
    set('mq-company-contact', data.company?.contact);
    set('mq-company-email', data.company?.email);
    set('mq-company-phone', data.company?.phone);
    set('mq-company-address', data.company?.address);
    set('mq-company-tax-id', data.company?.taxId);
    set('mq-customer-name', data.customer?.name);
    set('mq-customer-contact', data.customer?.contact);
    set('mq-customer-email', data.customer?.email);
    set('mq-customer-address', data.customer?.address);
    set('mq-currency', data.currency);
    state.fileCache.clear();
    state.items = Array.isArray(data.items) && data.items.length ? data.items.map((item, index) => normalizeItem(item, index + 1)) : [blankItem()];
    const additional = data.additional || {};
    set('mq-setup-hours', additional.setupHours);
    set('mq-setup-rate', additional.setupRate);
    set('mq-design-hours', additional.designHours);
    set('mq-design-rate', additional.designRate);
    set('mq-finishing-hours', additional.finishingHours);
    set('mq-finishing-rate', additional.finishingRate);
    set('mq-delivery', additional.delivery);
    set('mq-other-cost', additional.otherCost);
    set('mq-other-description', additional.otherDescription);
    const pricing = data.pricing || {};
    set('mq-pricing-method', pricing.method);
    set('mq-material-markup', pricing.materialMarkup);
    set('mq-processing-markup', pricing.processingMarkup);
    set('mq-profit-margin', pricing.profitMargin);
    set('mq-minimum-charge', pricing.minimumCharge);
    set('mq-discount-percent', pricing.discountPercent);
    set('mq-discount-fixed', pricing.discountFixed);
    set('mq-tax-rate', pricing.taxRate);
    set('mq-deposit-percent', pricing.depositPercent);
    set('mq-customer-notes', data.customerNotes);
    set('mq-terms', data.terms);
    updatePricingFields();
    renderItems();
    calculateQuote();
  }

  function newQuote() {
    state.currentQuoteId = null;
    state.fileCache.clear();
    state.items = [blankItem()];
    $('mq-quote-title').value = 'CNC Plasma Cutting Quote';
    $('mq-quote-number').value = generateQuoteNumber();
    const today = new Date();
    const valid = new Date(today);
    valid.setDate(valid.getDate() + 30);
    $('mq-quote-date').value = formatDateInput(today);
    $('mq-valid-through').value = formatDateInput(valid);
    ['mq-customer-name', 'mq-customer-contact', 'mq-customer-email', 'mq-customer-address', 'mq-customer-notes'].forEach((id) => { $(id).value = ''; });
    renderItems();
    calculateQuote();
    setSaveMessage('New unsaved quote created.');
  }

  function setSaveMessage(text, type = '') {
    const target = $('mq-save-message');
    target.textContent = text;
    target.className = `pcf-member-message${type ? ` is-${type}` : ''}`;
  }

  async function saveQuote() {
    const context = state.context;
    if (!context) return;
    const data = collectQuoteData();
    saveCompanyProfile();
    const payload = {
      user_id: context.user.id,
      quote_number: data.quoteNumber || generateQuoteNumber(),
      quote_title: data.quoteTitle,
      customer_name: data.customer.name,
      status: 'draft',
      currency: data.currency,
      direct_cost: round2(data.totals.directCost),
      quoted_total: round2(data.totals.total),
      quote_data: data
    };
    if (state.currentQuoteId) payload.id = state.currentQuoteId;

    const button = $('mq-save-quote');
    button.disabled = true;
    button.textContent = 'Saving…';
    setSaveMessage('Saving quote to the member cloud…');
    try {
      const { data: saved, error } = await context.client
        .from('pcf_member_quotes')
        .upsert(payload)
        .select('id, quote_number')
        .single();
      if (error) throw error;
      state.currentQuoteId = saved.id;
      $('mq-quote-number').value = saved.quote_number;
      setSaveMessage('Quote saved successfully.', 'success');
      await loadSavedQuotes();
    } catch (error) {
      console.error(error);
      setSaveMessage(error?.message || 'The quote could not be saved.', 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'Save Quote';
    }
  }

  async function loadSavedQuotes() {
    const container = $('mq-saved-list');
    if (!state.context || !container) return;
    container.innerHTML = '<p class="mq-empty">Loading saved quotes…</p>';
    try {
      const { data, error } = await state.context.client
        .from('pcf_member_quotes')
        .select('id, quote_number, quote_title, customer_name, currency, quoted_total, updated_at')
        .order('updated_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      if (!data?.length) {
        container.innerHTML = '<p class="mq-empty">No saved quotes yet.</p>';
        return;
      }
      container.innerHTML = data.map((quote) => `
        <article class="mq-saved-quote">
          <div>
            <strong>${escapeHtml(quote.quote_number)} · ${escapeHtml(quote.customer_name || 'No customer')}</strong>
            <small>${escapeHtml(quote.quote_title || 'Quote')} · ${money(quote.quoted_total, quote.currency)} · Updated ${new Date(quote.updated_at).toLocaleDateString()}</small>
          </div>
          <div class="mq-actions">
            <button class="mq-button secondary" type="button" data-load-quote="${quote.id}">Load</button>
            <button class="mq-button danger" type="button" data-delete-quote="${quote.id}">Delete</button>
          </div>
        </article>`).join('');
      container.querySelectorAll('[data-load-quote]').forEach((button) => button.addEventListener('click', () => loadQuote(button.dataset.loadQuote)));
      container.querySelectorAll('[data-delete-quote]').forEach((button) => button.addEventListener('click', () => deleteQuote(button.dataset.deleteQuote)));
    } catch (error) {
      console.error(error);
      container.innerHTML = '<p class="mq-empty">Saved quotes could not be loaded.</p>';
    }
  }

  async function loadQuote(id) {
    const { data, error } = await state.context.client
      .from('pcf_member_quotes')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      setSaveMessage(error.message, 'error');
      return;
    }
    state.currentQuoteId = data.id;
    applyQuoteData(data.quote_data || {});
    setSaveMessage(`Loaded ${data.quote_number}.`, 'success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteQuote(id) {
    if (!window.confirm('Delete this saved quote permanently?')) return;
    const { error } = await state.context.client.from('pcf_member_quotes').delete().eq('id', id);
    if (error) {
      setSaveMessage(error.message, 'error');
      return;
    }
    if (state.currentQuoteId === id) state.currentQuoteId = null;
    setSaveMessage('Saved quote deleted.', 'success');
    await loadSavedQuotes();
  }

  function csvCell(valueToEscape) {
    const text = String(valueToEscape ?? '');
    return `"${text.replace(/"/g, '""')}"`;
  }

  function downloadBlob(content, type, filename) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function exportCsv() {
    const data = collectQuoteData();
    const rows = [
      ['Plasma Cut Forge Advanced Quote Builder'],
      ['Quote number', data.quoteNumber],
      ['Quote title', data.quoteTitle],
      ['Customer', data.customer.name],
      ['Currency', data.currency],
      [],
      ['Part', 'Description', 'Geometry source', 'File name', 'Material', 'Thickness', 'Quantity', 'Cut length/part mm', 'Pierces/part', 'Cut speed mm/min', 'Machine minutes', 'Machine cost', 'Consumables', 'Raw material', 'Labor', 'Direct cost', 'Selling total']
    ];
    data.totals.itemCalcs.forEach((item, index) => {
      rows.push([
        index + 1, item.description, item.geometryMode === 'file' ? item.fileType || 'File upload' : 'Manual entry', item.fileName || '', item.material, `${item.thickness} ${item.thicknessUnit}`, item.quantity,
        round2(item.lengthMm), item.pierces, round2(item.cutSpeed), round2(item.totalMachineMinutes), round2(item.machineCost),
        round2(item.consumableCost), round2(item.materialCost), round2(item.laborCost), round2(item.directCost), round2(itemSellTotal(item))
      ]);
    });
    rows.push(
      [],
      ['Direct cost', round2(data.totals.directCost)],
      ['Gross selling amount', round2(data.totals.grossSelling)],
      ['Discount', round2(data.totals.discount)],
      ['Minimum adjustment', round2(data.totals.minimumAdjustment)],
      ['Tax / VAT', round2(data.totals.tax)],
      ['Customer total', round2(data.totals.total)],
      ['Gross profit before tax', round2(data.totals.grossProfit)],
      ['Actual margin %', round2(data.totals.actualMargin)],
      ['Deposit', round2(data.totals.deposit)]
    );
    downloadBlob(rows.map((row) => row.map(csvCell).join(',')).join('\n'), 'text/csv;charset=utf-8', `${data.quoteNumber || 'plasma-quote'}-details.csv`);
  }

  function wrapLines(doc, text, width) {
    return doc.splitTextToSize(String(text || ''), width);
  }

  function exportPdf() {
    const data = collectQuoteData();
    const jsPDF = window.jspdf?.jsPDF;
    if (!jsPDF) {
      setSaveMessage('PDF export library is not available. Refresh the page and try again.', 'error');
      return;
    }

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const left = 16;
    const right = pageWidth - 16;
    let y = 18;

    function ensure(space = 20) {
      if (y + space > pageHeight - 18) {
        doc.addPage();
        y = 18;
      }
    }

    if (state.logoDataUrl) {
      try {
        const format = state.logoDataUrl.includes('image/png') ? 'PNG' : 'JPEG';
        const properties = doc.getImageProperties(state.logoDataUrl);
        const sourceWidth = state.logoDimensions?.width || properties.width || 1;
        const sourceHeight = state.logoDimensions?.height || properties.height || 1;
        const maxLogoWidth = 48;
        const maxLogoHeight = 22;
        const scale = Math.min(maxLogoWidth / sourceWidth, maxLogoHeight / sourceHeight);
        const logoWidth = sourceWidth * scale;
        const logoHeight = sourceHeight * scale;
        doc.addImage(state.logoDataUrl, format, left, y, logoWidth, logoHeight, undefined, 'FAST');
      } catch (error) {
        console.warn('Logo could not be added to PDF.', error);
      }
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('PLASMA CUT FORGE', left, y + 8);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('QUOTATION', right, y + 7, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Quote: ${data.quoteNumber}`, right, y + 13, { align: 'right' });
    doc.text(`Date: ${data.quoteDate || '—'}`, right, y + 18, { align: 'right' });
    doc.text(`Valid through: ${data.validThrough || '—'}`, right, y + 23, { align: 'right' });
    y += 32;

    doc.setDrawColor(0, 190, 220);
    doc.line(left, y, right, y);
    y += 9;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(data.company.name || 'Your Company', left, y);
    doc.text('Prepared for', 112, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const companyText = [data.company.address, data.company.phone, data.company.email, data.company.taxId ? `Tax/VAT: ${data.company.taxId}` : ''].filter(Boolean).join('\n');
    const customerText = [data.customer.name, data.customer.contact, data.customer.address, data.customer.email].filter(Boolean).join('\n');
    const companyLines = wrapLines(doc, companyText, 80);
    const customerLines = wrapLines(doc, customerText, 80);
    doc.text(companyLines, left, y + 6);
    doc.text(customerLines, 112, y + 6);
    y += Math.max(companyLines.length, customerLines.length, 2) * 4.2 + 13;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('DESCRIPTION', left, y);
    doc.text('QTY', 123, y, { align: 'right' });
    doc.text('UNIT', 151, y, { align: 'right' });
    doc.text('TOTAL', right, y, { align: 'right' });
    y += 3;
    doc.setDrawColor(100, 120, 145);
    doc.line(left, y, right, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    data.totals.itemCalcs.forEach((item) => {
      ensure(17);
      const sellTotal = itemSellTotal(item);
      const unitPrice = sellTotal / Math.max(1, item.quantity);
      const description = `${item.description} — ${item.material}, ${item.thickness} ${item.thicknessUnit}`;
      const lines = wrapLines(doc, description, 92);
      doc.text(lines, left, y);
      doc.text(String(item.quantity), 123, y, { align: 'right' });
      doc.text(money(unitPrice, data.currency), 151, y, { align: 'right' });
      doc.text(money(sellTotal, data.currency), right, y, { align: 'right' });
      y += Math.max(1, lines.length) * 4.3 + 4;
    });

    const extraSell = sellAdditional(data.totals.additional);
    if (extraSell > 0) {
      ensure(12);
      doc.text('Setup, programming, design, finishing, delivery and other shop charges', left, y);
      doc.text('1', 123, y, { align: 'right' });
      doc.text(money(extraSell, data.currency), 151, y, { align: 'right' });
      doc.text(money(extraSell, data.currency), right, y, { align: 'right' });
      y += 9;
    }

    ensure(48);
    doc.line(110, y, right, y);
    y += 7;
    const totals = [
      ['Subtotal', data.totals.grossSelling],
      ['Discount', -data.totals.discount],
      ['Minimum charge adjustment', data.totals.minimumAdjustment],
      [`Tax / VAT (${fixed(number('mq-tax-rate'), 1)}%)`, data.totals.tax]
    ];
    totals.forEach(([label, amount]) => {
      doc.text(label, 112, y);
      doc.text(money(amount, data.currency), right, y, { align: 'right' });
      y += 6;
    });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('TOTAL', 112, y + 2);
    doc.text(money(data.totals.total, data.currency), right, y + 2, { align: 'right' });
    y += 12;
    if (data.totals.deposit > 0) {
      doc.setFontSize(10);
      doc.text(`Deposit required: ${money(data.totals.deposit, data.currency)}`, right, y, { align: 'right' });
      y += 9;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    if (data.customerNotes) {
      ensure(24);
      doc.setFont('helvetica', 'bold'); doc.text('Notes', left, y); y += 5;
      doc.setFont('helvetica', 'normal');
      const noteLines = wrapLines(doc, data.customerNotes, right - left);
      doc.text(noteLines, left, y); y += noteLines.length * 4.2 + 7;
    }
    if (data.terms) {
      ensure(24);
      doc.setFont('helvetica', 'bold'); doc.text('Terms & Conditions', left, y); y += 5;
      doc.setFont('helvetica', 'normal');
      const termLines = wrapLines(doc, data.terms, right - left);
      doc.text(termLines, left, y); y += termLines.length * 4.2 + 7;
    }

    const pages = doc.getNumberOfPages();
    for (let page = 1; page <= pages; page += 1) {
      doc.setPage(page);
      doc.setFontSize(7.5);
      doc.setTextColor(95, 105, 120);
      doc.text('Generated with the Plasma Cut Forge Advanced Cut Cost & Quote Builder.', left, pageHeight - 9);
      doc.text(`Page ${page} of ${pages}`, right, pageHeight - 9, { align: 'right' });
    }

    doc.save(`${data.quoteNumber || 'plasma-quote'}.pdf`);
  }

  function trimLogoMargins(image) {
    const maxDimension = 1800;
    const reduction = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * reduction));
    const height = Math.max(1, Math.round(image.naturalHeight * reduction));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * 4;
        const red = pixels[offset];
        const green = pixels[offset + 1];
        const blue = pixels[offset + 2];
        const alpha = pixels[offset + 3];
        const plainMargin = alpha < 20 || (red > 246 && green > 246 && blue > 246);
        if (!plainMargin) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
    if (maxX < minX || maxY < minY) return { dataUrl: canvas.toDataURL('image/png'), width, height };
    const padding = Math.max(3, Math.round(Math.max(width, height) * 0.012));
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(width - 1, maxX + padding);
    maxY = Math.min(height - 1, maxY + padding);
    const cropWidth = maxX - minX + 1;
    const cropHeight = maxY - minY + 1;
    const cropped = document.createElement('canvas');
    cropped.width = cropWidth;
    cropped.height = cropHeight;
    cropped.getContext('2d').drawImage(canvas, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
    return { dataUrl: cropped.toDataURL('image/png'), width: cropWidth, height: cropHeight };
  }

  function handleLogo(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg)$/.test(file.type) || file.size > 2_000_000) {
      setSaveMessage('Use a PNG or JPEG logo smaller than 2 MB.', 'error');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const trimmed = trimLogoMargins(image);
        state.logoDataUrl = trimmed.dataUrl;
        state.logoDimensions = { width: trimmed.width, height: trimmed.height };
        $('mq-logo-preview').innerHTML = `<img src="${state.logoDataUrl}" alt="Company logo preview"><span>White or transparent margins are trimmed automatically; the PDF preserves the logo aspect ratio.</span>`;
      };
      image.onerror = () => setSaveMessage('The logo image could not be read.', 'error');
      image.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  }

  function bindGlobalInputs() {
    const ids = [
      'mq-currency', 'mq-pricing-method', 'mq-material-markup', 'mq-processing-markup', 'mq-profit-margin',
      'mq-minimum-charge', 'mq-discount-percent', 'mq-discount-fixed', 'mq-tax-rate', 'mq-deposit-percent',
      'mq-setup-hours', 'mq-setup-rate', 'mq-design-hours', 'mq-design-rate', 'mq-finishing-hours',
      'mq-finishing-rate', 'mq-delivery', 'mq-other-cost'
    ];
    ids.forEach((id) => {
      $(id)?.addEventListener('input', () => {
        if (id === 'mq-pricing-method') updatePricingFields();
        else {
          renderItems();
          calculateQuote();
        }
      });
      $(id)?.addEventListener('change', () => {
        if (id === 'mq-pricing-method') updatePricingFields();
        else {
          renderItems();
          calculateQuote();
        }
      });
    });

    qsa('#mq-company-name, #mq-company-contact, #mq-company-email, #mq-company-phone, #mq-company-address, #mq-company-tax-id').forEach((input) => {
      input.addEventListener('change', saveCompanyProfile);
    });
  }

  function initialize(context) {
    if (state.context) return;
    state.context = context;
    loadCompanyProfile();
    newQuote();
    bindGlobalInputs();
    $('mq-company-logo').addEventListener('change', handleLogo);
    $('mq-add-item').addEventListener('click', () => {
      state.items.push(blankItem(state.items.length + 1));
      renderItems();
      calculateQuote();
    });
    $('mq-new-quote').addEventListener('click', () => {
      if (window.confirm('Start a new quote? Unsaved changes will be cleared.')) newQuote();
    });
    $('mq-save-quote').addEventListener('click', saveQuote);
    $('mq-refresh-quotes').addEventListener('click', loadSavedQuotes);
    $('mq-export-pdf').addEventListener('click', exportPdf);
    $('mq-export-csv').addEventListener('click', exportCsv);
    loadSavedQuotes();
  }

  window.PCFQuoteGeometry = { parseDxf, parseGcode, recommendedProcess };

  document.addEventListener('pcf:member-ready', (event) => initialize(event.detail), { once: true });
  if (window.PCF_MEMBER_CONTEXT) initialize(window.PCF_MEMBER_CONTEXT);
})();
