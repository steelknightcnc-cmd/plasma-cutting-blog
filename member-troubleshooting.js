(() => {
  'use strict';

  const PHOTO_BUCKET = 'troubleshooting-photos';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
  const round = (value, digits = 3) => Number(number(value).toFixed(digits));
  const today = () => new Date().toISOString().slice(0, 10);
  const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const slug = (value) => String(value || 'troubleshooting-report').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'troubleshooting-report';

  const GUIDES = {
    bottom_dross: {
      label: 'Bottom dross',
      summary: 'Determine whether the deposit is thick and easily removed (commonly low-speed / excess energy) or a small hard bead (commonly high-speed / insufficient energy), then test one cause at a time.',
      causes: ['Cut speed', 'Cut height / arc voltage', 'Amperage and nozzle rating', 'Worn consumables', 'Air pressure or moisture', 'Corner slowdown'],
      steps: [
        ['Classify the dross', 'Photograph it and record whether it is thick and rounded, fine and hard, continuous, or mainly in corners.'],
        ['Verify the correct process', 'Confirm material, thickness, amperage and consumable set against the plasma-cutter manufacturer cut chart.'],
        ['Inspect consumables first', 'Check the nozzle orifice, electrode pit, shield, swirl ring and O-rings; replace damaged matched parts as required.'],
        ['Check air under flow', 'Measure pressure while cutting and inspect separators, dryers and final filters for water, oil or restriction.'],
        ['Verify physical cut height', 'Measure torch-to-plate distance instead of relying only on commanded height or displayed voltage.'],
        ['Run a baseline coupon', 'Use constant geometry, lead-in and cut direction. Record speed, height, voltage and dross type.'],
        ['Adjust speed in small steps', 'For thick rounded low-speed dross, increase speed. For a hard high-speed bead, reduce speed. Keep other settings fixed.'],
        ['Check energy balance', 'Confirm amperage is appropriate for the nozzle and thickness; do not exceed the consumable rating.'],
        ['Review corners and deceleration', 'Separate normal corner dross from straight-line dross and verify anti-dive / slowdown behavior.'],
        ['Verify the final setting', 'Repeat the best test on a fresh coupon and inspect kerf, bevel, dross and consumables before production.']
      ]
    },
    top_spatter: {
      label: 'Top spatter / top dross',
      summary: 'Top-side spatter is commonly associated with excessive speed, high torch standoff or a worn nozzle. Confirm consumables and physical height before tuning speed.',
      causes: ['High cut height', 'Excessive speed', 'Worn nozzle', 'Incorrect process', 'Air-flow instability'],
      steps: [
        ['Photograph the top edge', 'Record whether the deposit is light removable spatter or heavy rounded material.'],
        ['Confirm consumable set and rating', 'Verify the nozzle and shield are correct for the selected amperage and process.'],
        ['Inspect the nozzle orifice', 'Look for elongation, nicks, gouging or an oversized opening.'],
        ['Measure physical cut height', 'Confirm the torch is not cutting higher than the manufacturer value.'],
        ['Confirm arc-voltage scaling', 'If THC is enabled, verify divider ratio, polarity and voltage response.'],
        ['Run one test with THC inhibited', 'On a flat coupon, hold verified physical cut height to separate voltage-control problems from process problems.'],
        ['Reduce speed incrementally', 'Make small controlled speed reductions while keeping height and amperage fixed.'],
        ['Check air pressure under flow', 'Verify stable pressure and no contamination or restriction.'],
        ['Repeat with fresh consumables if needed', 'A worn nozzle can make all later adjustments misleading.'],
        ['Record the final accepted test', 'Save settings, photographs and the effect on top spatter, bevel and bottom dross.']
      ]
    },
    bevel: {
      label: 'Excessive bevel / cut angularity',
      summary: 'Separate consistent all-around bevel from one-sided bevel. The first points toward process height, speed, amperage or consumables; the second often points toward torch squareness, cut direction or motion alignment.',
      causes: ['Torch not square', 'Cut direction', 'Cut height', 'Worn nozzle', 'Speed / amperage', 'Air flow', 'Mechanical alignment'],
      steps: [
        ['Map the bevel direction', 'Measure all four sides of a square coupon and identify whether the bevel follows the torch path or one machine axis.'],
        ['Verify cut direction', 'Confirm the good side of the cut is on the intended side of torch travel for external and internal contours.'],
        ['Square the torch mechanically', 'Check front-to-back and side-to-side with a reliable reference.'],
        ['Inspect nozzle and shield', 'Replace an elliptical or damaged nozzle before judging alignment.'],
        ['Measure physical cut height', 'High and low standoff produce different angularity patterns; use a physical measurement.'],
        ['Check speed against the cut chart', 'Run a straight-line coupon at the recommended baseline speed.'],
        ['Verify amperage and nozzle rating', 'Confirm the selected current is suitable for the thickness and consumable.'],
        ['Check air pressure and flow', 'Inadequate or excessive gas flow can change arc shape and kerf.'],
        ['Inspect mechanical motion', 'Check gantry square, slat support, backlash, torch mount flex and axis calibration.'],
        ['Repeat in both travel directions', 'Use paired tests to distinguish plasma swirl effects from machine alignment.']
      ]
    },
    incomplete_cut: {
      label: 'Incomplete cut / failure to sever',
      summary: 'First confirm the process has enough energy and stable gas flow for the thickness, then verify speed, height, consumables, work lead and arc transfer.',
      causes: ['Speed too high', 'Amperage too low', 'Incorrect consumables', 'Pressure drop', 'High cut height', 'Poor work-lead connection', 'Material beyond capacity'],
      steps: [
        ['Confirm machine capacity', 'Verify the thickness is within the cutter’s rated production-cut capability, not only its maximum severance rating.'],
        ['Verify the process selection', 'Check amperage, nozzle, gas / air and manufacturer cut-chart row.'],
        ['Inspect consumables', 'Check electrode, nozzle, shield, swirl ring and torch cap seating.'],
        ['Inspect the work lead', 'Attach to clean bare metal close to the cutting area and check cable / clamp condition.'],
        ['Measure pressure while flowing', 'A static gauge can look normal while pressure collapses during the cut.'],
        ['Measure cut height', 'Excessive standoff reduces energy density at the plate.'],
        ['Reduce speed incrementally', 'Use a straight coupon and small reductions until the arc exits cleanly beneath the plate.'],
        ['Check amperage within rating', 'Increase only when allowed by the nozzle and machine cut chart.'],
        ['Observe arc and sparks', 'Record instability, rooster-tail behavior, delayed transfer or arc extinction.'],
        ['Verify on the longest expected cut', 'Confirm compressor recovery and machine duty cycle do not cause failure later in the job.']
      ]
    },
    rough_face: {
      label: 'Rough / striated cut face',
      summary: 'Treat roughness as a system problem: consumables, speed, height, gas quality and motion must all remain stable through the test.',
      causes: ['Worn consumables', 'Incorrect speed', 'Height instability', 'Wet / oily air', 'Motion vibration', 'Wrong process'],
      steps: [
        ['Photograph and label the cut face', 'Record drag-line angle, rough zones, arc marks and whether the defect changes around corners.'],
        ['Verify correct process and consumables', 'Use the manufacturer row for material and thickness.'],
        ['Install known-good consumables', 'Eliminate nozzle and electrode wear as variables.'],
        ['Check compressed-air quality', 'Drain and inspect the complete air system, including the final point-of-use filter.'],
        ['Verify physical cut height', 'Check IHS repeatability and THC stability along a flat coupon.'],
        ['Run a speed sweep', 'Test small speed changes using identical straight cuts.'],
        ['Inspect motion smoothness', 'Check bearings, racks, belts / screws, acceleration and torch-mount rigidity.'],
        ['Check material condition', 'Record mill scale, rust, coating, warpage and plate temperature.'],
        ['Compare THC on versus fixed height', 'Use a flat coupon to identify height-control oscillation.'],
        ['Repeat the best setting', 'Confirm the improvement on both straight cuts and corners.']
      ]
    },
    consumable_life: {
      label: 'Short consumable life',
      summary: 'Protect the nozzle and electrode by checking pierce height, torch contact, air contamination, ramp-down behavior, process selection and part quality before adjusting cutting parameters.',
      causes: ['Piercing too low', 'Torch contact / diving', 'Wet or oily air', 'Wrong amperage / nozzle', 'Excessive pilot arc', 'Improper shutdown / ramp-down'],
      steps: [
        ['Inspect failed parts', 'Photograph the electrode pit, nozzle exterior and orifice; record cut and pierce count.'],
        ['Verify pierce height', 'Measure the actual pierce standoff and confirm the torch does not start too close to the plate.'],
        ['Observe the full pierce sequence', 'Confirm IHS, retract, arc start, delay and plunge to cut height occur in the correct order.'],
        ['Check for torch contact', 'Look for scraping, plate dives, slat collisions or cap-switch problems.'],
        ['Inspect air quality', 'Check water, oil, filter condition, dryer operation and pressure under flow.'],
        ['Confirm amperage and consumable rating', 'Do not run a nozzle above its rated current.'],
        ['Review starts and stops', 'Minimize unnecessary pilot-arc time and confirm the torch remains over the plate during ramp-down where required.'],
        ['Check O-rings and gas paths', 'Use only approved lubricant and avoid excess grease that can contaminate gas flow.'],
        ['Install a new matched consumable set', 'Record the starting condition and begin a controlled life test.'],
        ['Track life by cuts and pierces', 'Separate damage from piercing, long cuts, air contamination and operator handling.']
      ]
    },
    thc_instability: {
      label: 'Torch diving / THC instability',
      summary: 'Verify voltage polarity and scaling, physical cut height, anti-dive behavior, IHS repeatability and Z-axis response before changing target voltage.',
      causes: ['Incorrect voltage scaling', 'THC active during slowdown', 'Poor work lead', 'IHS inconsistency', 'Z tuning', 'Arc voltage noise', 'Plate warp'],
      steps: [
        ['Record the exact event', 'Note whether the dive occurs on lead-in, corners, holes, end-of-cut, warped plate or long straight cuts.'],
        ['Verify physical cut height with THC off', 'Use a flat coupon and establish the correct mechanical height first.'],
        ['Check voltage-divider ratio and polarity', 'Compare raw / divided voltage behavior with the controller configuration.'],
        ['Verify target-voltage logic', 'Determine whether the controller uses a fixed cut-chart voltage or sampled voltage.'],
        ['Check anti-dive and slowdown lockout', 'THC should not chase increased voltage during deceleration, small holes or arc stretching.'],
        ['Test IHS repeatability', 'Probe multiple table locations and record variation.'],
        ['Inspect work lead and bonding', 'A poor electrical path can destabilize voltage feedback.'],
        ['Check Z mechanics and tuning', 'Inspect backlash, binding, maximum speed, acceleration and motor / drive faults.'],
        ['Separate EMI from process behavior', 'Repeat with controlled cable routing and note resets, false inputs or voltage spikes.'],
        ['Verify on representative geometry', 'Test straight lines, corners and holes before releasing the final voltage setting.']
      ]
    },
    arc_transfer: {
      label: 'Arc will not transfer / intermittent arc',
      summary: 'Confirm work-lead continuity, torch-to-work distance, consumable assembly, air flow, material conductivity and machine fault status.',
      causes: ['Poor work-lead contact', 'Torch too high', 'Incorrect consumable assembly', 'Low / unstable air', 'Dirty material', 'Torch cap or internal fault'],
      steps: [
        ['Record fault codes and timing', 'Note whether pilot arc starts, transfers briefly, or fails before the machine begins motion.'],
        ['Inspect the work lead', 'Connect to clean bare metal near the cut and test clamp / cable continuity.'],
        ['Verify pierce height', 'An excessive start distance can prevent reliable transfer.'],
        ['Inspect consumable assembly', 'Confirm correct parts, orientation, cap seating and O-ring condition.'],
        ['Check air pressure and flow', 'Verify stable pressure while the start sequence is active.'],
        ['Clean the material contact area', 'Remove heavy scale, paint or contamination where the work lead and arc must establish.'],
        ['Check torch-cap and safety interlocks', 'Confirm the cap sensor and machine-ready chain remain satisfied.'],
        ['Test a manual edge start if allowed', 'Use the equipment manual procedure to separate pierce-distance problems from power-source faults.'],
        ['Inspect torch lead and connectors', 'Look for damage, loose pins, overheating or intermittent connections.'],
        ['Escalate documented faults', 'If the fault persists, preserve codes and measurements for the manufacturer or qualified service technician.']
      ]
    },
    hole_quality: {
      label: 'Poor hole quality / out-of-round holes',
      summary: 'Small holes require controlled lead-in, direction, speed, fixed height and THC lockout. Separate process limitations from mechanical backlash and programming errors.',
      causes: ['THC movement in hole', 'Lead-in / lead-out', 'Hole speed', 'Cut direction', 'Backlash', 'Height', 'Kerf compensation'],
      steps: [
        ['Measure the hole', 'Record top and bottom diameter, roundness, taper and lead-in witness.'],
        ['Confirm cut direction', 'Verify internal contours travel in the correct direction for the good side of the cut.'],
        ['Review lead-in geometry', 'Check lead-in type, length, entry point and whether the lead-out creates a divot.'],
        ['Lock out THC during the hole', 'Use verified fixed cut height so voltage control does not chase the small feature.'],
        ['Verify hole-specific speed', 'Test a reduced hole speed appropriate to the diameter and thickness.'],
        ['Check torch height and pierce placement', 'Confirm the pierce clears before entering the finished contour.'],
        ['Inspect backlash and axis reversal', 'Test circular interpolation and check motion components.'],
        ['Verify kerf compensation', 'Compare programmed diameter, top diameter and bottom diameter.'],
        ['Use fresh consumables', 'Nozzle wear has an outsized effect on small features.'],
        ['Repeat a hole matrix', 'Test several diameters and document the minimum acceptable hole for the process.']
      ]
    },
    kerf_dimension: {
      label: 'Kerf width / dimensional error',
      summary: 'Separate plasma-process kerf variation from axis calibration, backlash, CAD/CAM compensation and heat distortion.',
      causes: ['Kerf compensation', 'Cut height', 'Nozzle wear', 'Axis calibration', 'Backlash', 'Heat distortion', 'Cut direction'],
      steps: [
        ['Measure a reference coupon', 'Record programmed size, top size, bottom size and kerf at multiple locations.'],
        ['Verify machine calibration', 'Check axis travel against a reliable long-distance reference.'],
        ['Check backlash and squareness', 'Measure both axes and diagonals; inspect direction reversals.'],
        ['Confirm kerf compensation', 'Verify CAM offset direction and entered kerf value.'],
        ['Inspect consumables', 'A worn nozzle can enlarge or destabilize the kerf.'],
        ['Measure physical cut height', 'Standoff changes arc width and bevel.'],
        ['Confirm cut direction', 'Ensure the desired finished side is on the correct side of torch travel.'],
        ['Control heat input', 'Use consistent sequence, spacing and cooling for thin or closely nested parts.'],
        ['Run a kerf test at baseline speed', 'Measure several straight cuts before changing CAM compensation.'],
        ['Validate a finished part', 'Re-cut representative geometry and record the final compensation value.']
      ]
    },
    other: {
      label: 'Other / custom problem',
      summary: 'Start with the universal process checks, define a measurable symptom and build a one-variable-at-a-time test sequence.',
      causes: ['Process selection', 'Consumables', 'Air system', 'Work lead', 'Height control', 'Motion', 'Programming', 'Material condition'],
      steps: [
        ['Define the symptom precisely', 'Record when it starts, where it occurs and how it can be measured.'],
        ['Capture the baseline', 'Photograph the defect and record all current settings before changing anything.'],
        ['Check the manufacturer process row', 'Verify material, thickness, amperage, consumables, speed, height and pressure.'],
        ['Inspect consumables and torch assembly', 'Remove damaged or incorrectly assembled parts as variables.'],
        ['Verify compressed-air quality and flow', 'Measure under operating conditions.'],
        ['Inspect work lead, grounding and bonding', 'Confirm a clean and stable electrical path.'],
        ['Check physical torch height and IHS', 'Measure actual values and repeatability.'],
        ['Check motion and program behavior', 'Review direction, acceleration, slowdown, backlash and file geometry.'],
        ['Change one variable', 'State the hypothesis, old value, new value and expected result.'],
        ['Repeat and verify', 'Confirm the improvement on a second coupon before marking the problem resolved.']
      ]
    }
  };

  const state = {
    context: null,
    sessions: [],
    profiles: [],
    currentId: null,
    currentCode: '',
    unit: 'metric',
    data: null,
    signedUrls: new Map(),
    dirty: false
  };

  const els = {};

  function defaultData() {
    return {
      title: 'Bottom dross diagnostic', status: 'open', severity: 'moderate', symptom: 'bottom_dross',
      opened_date: today(), unit_system: 'metric',
      equipment: { machine_profile_id: '', machine_profile_name: '', cutter_brand: '', cutter_model: '', torch_type: '', consumables: '', controller_thc: '' },
      settings: { material: 'Mild steel', thickness_mm: 2, amperage: 45, cut_speed_mm_min: 0, arc_voltage_v: 0, air_pressure_bar: 0, pierce_height_mm: 0, pierce_delay_s: 0, cut_height_mm: 0, thc_enabled: true, table_type: 'water', consumable_condition: 'unknown', notes: '' },
      guided: { symptom: '', path_version: 1, steps: [] },
      before_notes: '', after_notes: '', photos: [], tests: [], actions: [],
      resolution: { final_diagnosis: '', root_cause: '', corrective_action: '', verification: '', resolved_date: '', production_verified: false }
    };
  }

  function normalizeData(raw = {}) {
    const base = defaultData();
    return {
      ...base, ...raw,
      equipment: { ...base.equipment, ...(raw.equipment || {}) },
      settings: { ...base.settings, ...(raw.settings || {}) },
      guided: { ...base.guided, ...(raw.guided || {}), steps: Array.isArray(raw.guided?.steps) ? raw.guided.steps : [] },
      photos: Array.isArray(raw.photos) ? raw.photos : [],
      tests: Array.isArray(raw.tests) ? raw.tests : [],
      actions: Array.isArray(raw.actions) ? raw.actions : [],
      resolution: { ...base.resolution, ...(raw.resolution || {}) }
    };
  }

  function cacheElements() {
    const ids = [
      'tr-session-list','tr-session-search','tr-session-filter','tr-new-session','tr-session-code','tr-unsaved-state','tr-save','tr-duplicate','tr-export-pdf','tr-export-csv','tr-delete','tr-message',
      'tr-title','tr-status','tr-severity','tr-symptom','tr-opened-date','tr-unit','tr-machine-profile','tr-profile-row','tr-apply-profile','tr-cutter-brand','tr-cutter-model','tr-torch','tr-consumables','tr-controller',
      'tr-guide-title','tr-guide-summary','tr-progress-value','tr-likely-causes','tr-build-path','tr-add-step','tr-guide-steps',
      'tr-material','tr-thickness','tr-amperage','tr-cut-speed','tr-voltage','tr-pressure','tr-pierce-height','tr-pierce-delay','tr-cut-height','tr-thc','tr-table-type','tr-consumable-condition','tr-settings-notes',
      'tr-before-notes','tr-after-notes','tr-before-files','tr-after-files','tr-before-photos','tr-after-photos','tr-add-test','tr-tests','tr-add-action','tr-actions',
      'tr-final-diagnosis','tr-root-cause','tr-final-action','tr-verification','tr-resolved-date','tr-production-verified'
    ];
    ids.forEach((id) => { els[id.replace(/^tr-/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = $(`#${id}`); });
  }

  function setMessage(text, type = '') {
    els.message.textContent = text;
    els.message.className = `pcf-member-message${type ? ` is-${type}` : ''}`;
  }

  function markDirty() {
    state.dirty = true;
    els.unsavedState.textContent = state.currentId ? 'Unsaved changes' : 'New unsaved session';
  }

  function markSaved() {
    state.dirty = false;
    els.unsavedState.textContent = state.currentId ? 'Saved to member account' : 'New unsaved session';
  }

  function guideFor(symptom = state.data?.symptom) { return GUIDES[symptom] || GUIDES.other; }
  function unitLabel(kind) {
    if (state.unit === 'imperial') return ({length:'in', speed:'IPM', pressure:'PSI'})[kind] || '';
    return ({length:'mm', speed:'mm/min', pressure:'bar'})[kind] || '';
  }
  function toDisplay(value, kind) {
    const v = number(value);
    if (state.unit === 'metric') return v;
    if (kind === 'length' || kind === 'speed') return v / 25.4;
    if (kind === 'pressure') return v * 14.5037738;
    return v;
  }
  function toMetric(value, kind) {
    const v = number(value);
    if (state.unit === 'metric') return v;
    if (kind === 'length' || kind === 'speed') return v * 25.4;
    if (kind === 'pressure') return v / 14.5037738;
    return v;
  }
  function inputValue(value, kind) {
    const v = toDisplay(value, kind);
    if (kind === 'speed') return round(v, state.unit === 'metric' ? 0 : 1);
    if (kind === 'length') return round(v, state.unit === 'metric' ? 2 : 4);
    if (kind === 'pressure') return round(v, state.unit === 'metric' ? 2 : 1);
    return round(v, 2);
  }

  function populateSymptoms() {
    els.symptom.innerHTML = Object.entries(GUIDES).map(([value, guide]) => `<option value="${esc(value)}">${esc(guide.label)}</option>`).join('');
  }

  function collectForm() {
    if (!state.data) return;
    const d = state.data;
    d.title = els.title.value.trim();
    d.status = els.status.value;
    d.severity = els.severity.value;
    d.symptom = els.symptom.value;
    d.opened_date = els.openedDate.value || today();
    d.unit_system = state.unit;
    d.equipment = {
      ...d.equipment,
      machine_profile_id: els.machineProfile.value || '',
      cutter_brand: els.cutterBrand.value.trim(), cutter_model: els.cutterModel.value.trim(),
      torch_type: els.torch.value.trim(), consumables: els.consumables.value.trim(), controller_thc: els.controller.value.trim()
    };
    d.settings = {
      material: els.material.value,
      thickness_mm: toMetric(els.thickness.value, 'length'),
      amperage: number(els.amperage.value),
      cut_speed_mm_min: toMetric(els.cutSpeed.value, 'speed'),
      arc_voltage_v: number(els.voltage.value),
      air_pressure_bar: toMetric(els.pressure.value, 'pressure'),
      pierce_height_mm: toMetric(els.pierceHeight.value, 'length'),
      pierce_delay_s: number(els.pierceDelay.value),
      cut_height_mm: toMetric(els.cutHeight.value, 'length'),
      thc_enabled: els.thc.value === 'true', table_type: els.tableType.value,
      consumable_condition: els.consumableCondition.value, notes: els.settingsNotes.value.trim()
    };
    d.before_notes = els.beforeNotes.value.trim();
    d.after_notes = els.afterNotes.value.trim();
    d.resolution = {
      final_diagnosis: els.finalDiagnosis.value.trim(), root_cause: els.rootCause.value.trim(), corrective_action: els.finalAction.value.trim(),
      verification: els.verification.value.trim(), resolved_date: els.resolvedDate.value, production_verified: els.productionVerified.value === 'true'
    };
  }

  function writeForm() {
    const d = state.data;
    state.unit = d.unit_system === 'imperial' ? 'imperial' : 'metric';
    els.title.value = d.title || '';
    els.status.value = d.status || 'open';
    els.severity.value = d.severity || 'moderate';
    els.symptom.value = d.symptom || 'other';
    els.openedDate.value = d.opened_date || today();
    els.unit.value = state.unit;
    els.machineProfile.value = d.equipment.machine_profile_id || '';
    els.cutterBrand.value = d.equipment.cutter_brand || '';
    els.cutterModel.value = d.equipment.cutter_model || '';
    els.torch.value = d.equipment.torch_type || '';
    els.consumables.value = d.equipment.consumables || '';
    els.controller.value = d.equipment.controller_thc || '';
    els.material.value = d.settings.material || 'Mild steel';
    els.thickness.value = inputValue(d.settings.thickness_mm, 'length');
    els.amperage.value = round(d.settings.amperage, 1);
    els.cutSpeed.value = inputValue(d.settings.cut_speed_mm_min, 'speed');
    els.voltage.value = round(d.settings.arc_voltage_v, 1);
    els.pressure.value = inputValue(d.settings.air_pressure_bar, 'pressure');
    els.pierceHeight.value = inputValue(d.settings.pierce_height_mm, 'length');
    els.pierceDelay.value = round(d.settings.pierce_delay_s, 3);
    els.cutHeight.value = inputValue(d.settings.cut_height_mm, 'length');
    els.thc.value = String(Boolean(d.settings.thc_enabled));
    els.tableType.value = d.settings.table_type || 'water';
    els.consumableCondition.value = d.settings.consumable_condition || 'unknown';
    els.settingsNotes.value = d.settings.notes || '';
    els.beforeNotes.value = d.before_notes || '';
    els.afterNotes.value = d.after_notes || '';
    els.finalDiagnosis.value = d.resolution.final_diagnosis || '';
    els.rootCause.value = d.resolution.root_cause || '';
    els.finalAction.value = d.resolution.corrective_action || '';
    els.verification.value = d.resolution.verification || '';
    els.resolvedDate.value = d.resolution.resolved_date || '';
    els.productionVerified.value = String(Boolean(d.resolution.production_verified));
    els.sessionCode.textContent = state.currentCode || 'NEW REPORT';
    updateUnitLabels();
    updateProfileRows();
    renderGuide();
    renderTests();
    renderActions();
    renderPhotos();
    markSaved();
  }

  function updateUnitLabels() {
    $$('[data-unit-label="length"]').forEach((el) => { el.textContent = unitLabel('length'); });
    $$('[data-unit-label="speed"]').forEach((el) => { el.textContent = unitLabel('speed'); });
    $$('[data-unit-label="pressure"]').forEach((el) => { el.textContent = unitLabel('pressure'); });
  }

  function buildPath(confirmReplace = true) {
    collectForm();
    const hasProgress = state.data.guided.steps.some((step) => step.completed || step.note);
    if (confirmReplace && hasProgress && !window.confirm('Replace the current guided path and its progress with a new recommended path?')) return;
    const guide = guideFor();
    state.data.guided = {
      symptom: state.data.symptom, path_version: 1,
      steps: guide.steps.map(([label, why], index) => ({ id: `${state.data.symptom}-${index}-${uid()}`, label, why, completed: false, note: '' }))
    };
    renderGuide();
    markDirty();
  }

  function renderGuide() {
    const guide = guideFor();
    els.guideTitle.textContent = guide.label;
    els.guideSummary.textContent = guide.summary;
    els.likelyCauses.innerHTML = guide.causes.map((cause) => `<span class="tr-cause">${esc(cause)}</span>`).join('');
    const steps = state.data.guided.steps || [];
    const completed = steps.filter((step) => step.completed).length;
    els.progressValue.textContent = `${steps.length ? Math.round(completed / steps.length * 100) : 0}%`;
    if (!steps.length) {
      els.guideSteps.innerHTML = '<p class="tr-empty">Build the recommended path for this symptom, or add a custom diagnostic step.</p>';
      return;
    }
    els.guideSteps.innerHTML = steps.map((step, index) => `
      <article class="tr-guide-step${step.completed ? ' completed' : ''}" data-step-index="${index}">
        <input class="tr-step-check" type="checkbox" ${step.completed ? 'checked' : ''} aria-label="Complete diagnostic step ${index + 1}">
        <div><h4>${index + 1}. ${esc(step.label)}</h4><p>${esc(step.why || '')}</p><input class="tr-field tr-step-note" data-step-note type="text" maxlength="1500" value="${esc(step.note || '')}" placeholder="Evidence, measurement or result for this step"></div>
        <button class="tr-step-remove" type="button" data-step-remove>Remove</button>
      </article>`).join('');
    $$('[data-step-index]', els.guideSteps).forEach((card) => {
      const index = Number(card.dataset.stepIndex);
      $('.tr-step-check', card).addEventListener('change', (event) => { state.data.guided.steps[index].completed = event.target.checked; renderGuide(); markDirty(); });
      $('[data-step-note]', card).addEventListener('input', (event) => { state.data.guided.steps[index].note = event.target.value; markDirty(); });
      $('[data-step-remove]', card).addEventListener('click', () => { state.data.guided.steps.splice(index, 1); renderGuide(); markDirty(); });
    });
  }

  function addCustomStep() {
    const label = window.prompt('Custom diagnostic step:');
    if (!label?.trim()) return;
    state.data.guided.steps.push({ id: uid(), label: label.trim(), why: 'Member-defined test or inspection step.', completed: false, note: '' });
    renderGuide(); markDirty();
  }

  function newTest() {
    return { id: uid(), date: today(), hypothesis: '', variable: '', old_value: '', new_value: '', action: '', outcome: 'same', observations: '' };
  }
  function renderTests() {
    if (!state.data.tests.length) { els.tests.innerHTML = '<p class="tr-empty">No tests recorded yet. Add the first controlled test.</p>'; return; }
    els.tests.innerHTML = state.data.tests.map((test, index) => `
      <article class="tr-record tr-record-outcome ${esc(test.outcome || 'same')}" data-test-index="${index}">
        <div class="tr-record-head"><h3>Test ${index + 1}</h3><button class="tr-record-remove" type="button" data-remove-test>Remove</button></div>
        <div class="tr-grid four">
          <label class="tr-field"><span>Date</span><input data-test-key="date" type="date" value="${esc(test.date || today())}"></label>
          <label class="tr-field span-2"><span>Hypothesis</span><input data-test-key="hypothesis" maxlength="500" value="${esc(test.hypothesis || '')}" placeholder="Example: Hard bead is high-speed dross"></label>
          <label class="tr-field"><span>Outcome</span><select data-test-key="outcome"><option value="better"${test.outcome==='better'?' selected':''}>Better</option><option value="same"${test.outcome==='same'?' selected':''}>No change</option><option value="worse"${test.outcome==='worse'?' selected':''}>Worse</option><option value="resolved"${test.outcome==='resolved'?' selected':''}>Resolved</option></select></label>
          <label class="tr-field"><span>Variable changed</span><input data-test-key="variable" maxlength="120" value="${esc(test.variable || '')}"></label>
          <label class="tr-field"><span>Previous value</span><input data-test-key="old_value" maxlength="120" value="${esc(test.old_value || '')}"></label>
          <label class="tr-field"><span>New value</span><input data-test-key="new_value" maxlength="120" value="${esc(test.new_value || '')}"></label>
          <label class="tr-field"><span>Action / coupon</span><input data-test-key="action" maxlength="500" value="${esc(test.action || '')}"></label>
          <label class="tr-field span-4"><span>Observation and measurement</span><textarea data-test-key="observations" rows="3" maxlength="5000">${esc(test.observations || '')}</textarea></label>
        </div>
      </article>`).join('');
    $$('[data-test-index]', els.tests).forEach((card) => {
      const index = Number(card.dataset.testIndex);
      $$('[data-test-key]', card).forEach((input) => input.addEventListener('input', () => { state.data.tests[index][input.dataset.testKey] = input.value; markDirty(); if (input.dataset.testKey === 'outcome') renderTests(); }));
      $('[data-remove-test]', card).addEventListener('click', () => { state.data.tests.splice(index, 1); renderTests(); markDirty(); });
    });
  }

  function newAction() { return { id: uid(), date: today(), type: 'corrective', action: '', parts_used: '', outcome: '', next_due: '' }; }
  function renderActions() {
    if (!state.data.actions.length) { els.actions.innerHTML = '<p class="tr-empty">No maintenance or corrective actions recorded yet.</p>'; return; }
    els.actions.innerHTML = state.data.actions.map((action, index) => `
      <article class="tr-record" data-action-index="${index}">
        <div class="tr-record-head"><h3>Action ${index + 1}</h3><button class="tr-record-remove" type="button" data-remove-action>Remove</button></div>
        <div class="tr-grid four">
          <label class="tr-field"><span>Date</span><input data-action-key="date" type="date" value="${esc(action.date || today())}"></label>
          <label class="tr-field"><span>Type</span><select data-action-key="type"><option value="maintenance"${action.type==='maintenance'?' selected':''}>Maintenance</option><option value="corrective"${action.type==='corrective'?' selected':''}>Corrective action</option><option value="inspection"${action.type==='inspection'?' selected':''}>Inspection</option><option value="replacement"${action.type==='replacement'?' selected':''}>Part replacement</option></select></label>
          <label class="tr-field span-2"><span>Work performed</span><input data-action-key="action" maxlength="1000" value="${esc(action.action || '')}"></label>
          <label class="tr-field span-2"><span>Parts / consumables used</span><input data-action-key="parts_used" maxlength="500" value="${esc(action.parts_used || '')}"></label>
          <label class="tr-field"><span>Next due</span><input data-action-key="next_due" type="date" value="${esc(action.next_due || '')}"></label>
          <label class="tr-field"><span>Outcome</span><input data-action-key="outcome" maxlength="500" value="${esc(action.outcome || '')}"></label>
        </div>
      </article>`).join('');
    $$('[data-action-index]', els.actions).forEach((card) => {
      const index = Number(card.dataset.actionIndex);
      $$('[data-action-key]', card).forEach((input) => input.addEventListener('input', () => { state.data.actions[index][input.dataset.actionKey] = input.value; markDirty(); }));
      $('[data-remove-action]', card).addEventListener('click', () => { state.data.actions.splice(index, 1); renderActions(); markDirty(); });
    });
  }

  async function signedUrl(path) {
    if (state.signedUrls.has(path)) return state.signedUrls.get(path);
    const { data, error } = await state.context.client.storage.from(PHOTO_BUCKET).createSignedUrl(path, 3600);
    if (error) throw error;
    state.signedUrls.set(path, data.signedUrl);
    return data.signedUrl;
  }

  async function renderPhotos() {
    const stages = [['before', els.beforePhotos], ['after', els.afterPhotos]];
    for (const [stage, container] of stages) {
      const photos = state.data.photos.filter((photo) => photo.stage === stage);
      if (!photos.length) { container.innerHTML = '<p class="tr-empty">No photos attached.</p>'; continue; }
      container.innerHTML = photos.map((photo) => `
        <article class="tr-photo" data-photo-id="${esc(photo.id)}">
          <div class="tr-photo-placeholder">Loading photo…</div>
          <div class="tr-photo-body"><input data-photo-caption maxlength="500" value="${esc(photo.caption || '')}" placeholder="Photo caption"><div class="tr-photo-actions"><span>${esc(photo.name || 'photo')}</span><button type="button" data-photo-delete>Delete</button></div></div>
        </article>`).join('');
      for (const card of $$('[data-photo-id]', container)) {
        const photo = state.data.photos.find((item) => item.id === card.dataset.photoId);
        try {
          const url = await signedUrl(photo.path);
          const img = document.createElement('img'); img.src = url; img.alt = photo.caption || `${stage} troubleshooting photo`;
          $('.tr-photo-placeholder', card).replaceWith(img);
        } catch (error) { $('.tr-photo-placeholder', card).textContent = 'Photo could not be loaded.'; }
        $('[data-photo-caption]', card).addEventListener('input', (event) => { photo.caption = event.target.value; markDirty(); });
        $('[data-photo-delete]', card).addEventListener('click', async () => deletePhoto(photo));
      }
    }
  }

  async function ensureSaved() {
    if (state.currentId) return state.currentId;
    return saveSession(true);
  }

  async function uploadPhotos(stage, files) {
    if (!files?.length) return;
    if (state.data.photos.length + files.length > 20) return setMessage('A troubleshooting session is limited to 20 photos.', 'warning');
    try {
      const sessionId = await ensureSaved();
      if (!sessionId) return;
      setMessage(`Uploading ${files.length} photo${files.length === 1 ? '' : 's'}…`);
      for (const file of files) {
        if (!file.type.startsWith('image/')) throw new Error(`${file.name} is not an image file.`);
        if (file.size > 8 * 1024 * 1024) throw new Error(`${file.name} is larger than 8 MB.`);
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-100);
        const path = `${state.context.user.id}/${sessionId}/${uid()}-${safeName}`;
        const { error } = await state.context.client.storage.from(PHOTO_BUCKET).upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
        if (error) throw error;
        state.data.photos.push({ id: uid(), stage, path, name: file.name, mime: file.type, size: file.size, caption: '', created_at: new Date().toISOString() });
      }
      state.signedUrls.clear();
      await saveSession(true);
      await renderPhotos();
      setMessage('Photos uploaded and saved privately.', 'success');
    } catch (error) { console.error(error); setMessage(error.message || 'Photo upload failed.', 'error'); }
    finally { els.beforeFiles.value = ''; els.afterFiles.value = ''; }
  }

  async function deletePhoto(photo) {
    if (!window.confirm('Delete this photo from the private troubleshooting report?')) return;
    try {
      const { error } = await state.context.client.storage.from(PHOTO_BUCKET).remove([photo.path]);
      if (error) throw error;
      state.data.photos = state.data.photos.filter((item) => item.id !== photo.id);
      state.signedUrls.delete(photo.path);
      await saveSession(true);
      await renderPhotos();
      setMessage('Photo deleted.', 'success');
    } catch (error) { console.error(error); setMessage(error.message || 'Photo could not be deleted.', 'error'); }
  }

  function renderSessionList() {
    const term = els.sessionSearch.value.trim().toLowerCase();
    const status = els.sessionFilter.value;
    const items = state.sessions.filter((session) => {
      const text = `${session.title} ${session.session_code} ${guideFor(session.symptom).label}`.toLowerCase();
      return (!term || text.includes(term)) && (status === 'all' || session.status === status);
    });
    if (!items.length) { els.sessionList.innerHTML = '<p class="tr-empty">No saved sessions match this view.</p>'; return; }
    els.sessionList.innerHTML = items.map((session) => `
      <button class="tr-session-item${session.id === state.currentId ? ' active' : ''}" type="button" data-session-id="${session.id}">
        <strong>${esc(session.title)}</strong><span>${esc(guideFor(session.symptom).label)}</span>
        <small><span>${esc(session.session_code)}</span><span class="tr-status ${esc(session.status)}">${esc(session.status)}</span></small>
      </button>`).join('');
    $$('[data-session-id]', els.sessionList).forEach((button) => button.addEventListener('click', () => selectSession(button.dataset.sessionId)));
  }

  async function loadSessions(selectId = null) {
    const { data, error } = await state.context.client.rpc('pcf_my_troubleshooting_sessions');
    if (error) throw error;
    state.sessions = Array.isArray(data) ? data : [];
    renderSessionList();
    if (selectId) selectSession(selectId);
  }

  function selectSession(id) {
    if (state.dirty && !window.confirm('Discard unsaved changes and load another session?')) return;
    const session = state.sessions.find((item) => item.id === id);
    if (!session) return;
    state.currentId = session.id;
    state.currentCode = session.session_code;
    state.data = normalizeData(session.session_data);
    state.data.title = session.title;
    state.data.symptom = session.symptom;
    state.data.status = session.status;
    state.signedUrls.clear();
    writeForm();
    renderSessionList();
    setMessage(`Loaded ${session.session_code}.`, 'success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function newSession(force = false) {
    if (!force && state.dirty && !window.confirm('Discard the unsaved session and start a new one?')) return;
    state.currentId = null; state.currentCode = ''; state.data = defaultData(); state.signedUrls.clear();
    writeForm(); renderSessionList(); setMessage('New private troubleshooting session ready.');
  }

  async function saveSession(silent = false) {
    collectForm();
    if (!state.data.title) { setMessage('Enter a session title before saving.', 'warning'); return null; }
    const button = els.save;
    const original = button.textContent;
    button.disabled = true; button.textContent = 'Saving…';
    try {
      const { data, error } = await state.context.client.rpc('pcf_save_troubleshooting_session', { p_session_id: state.currentId, p_payload: state.data });
      if (error) throw error;
      state.currentId = data;
      state.dirty = false;
      await loadSessions(data);
      markSaved();
      if (!silent) setMessage('Troubleshooting session saved.', 'success');
      return data;
    } catch (error) { console.error(error); setMessage(error.message || 'Session could not be saved.', 'error'); return null; }
    finally { button.disabled = false; button.textContent = original; }
  }

  async function duplicateSession() {
    collectForm();
    const copy = structuredClone(state.data);
    copy.title = `${copy.title || 'Troubleshooting session'} - Copy`;
    copy.status = 'open'; copy.opened_date = today(); copy.photos = [];
    copy.resolution = { final_diagnosis: '', root_cause: '', corrective_action: '', verification: '', resolved_date: '', production_verified: false };
    try {
      const { data, error } = await state.context.client.rpc('pcf_save_troubleshooting_session', { p_session_id: null, p_payload: copy });
      if (error) throw error;
      state.dirty = false;
      await loadSessions(data);
      setMessage('Session duplicated without copying private photos.', 'success');
    } catch (error) { console.error(error); setMessage(error.message || 'Session could not be duplicated.', 'error'); }
  }

  async function deleteSession() {
    if (!state.currentId) return setMessage('There is no saved session to delete.', 'warning');
    if (!window.confirm(`Permanently delete ${state.currentCode} and its private photos?`)) return;
    try {
      collectForm();
      const paths = state.data.photos.map((photo) => photo.path).filter(Boolean);
      if (paths.length) {
        const { error: photoError } = await state.context.client.storage.from(PHOTO_BUCKET).remove(paths);
        if (photoError) throw photoError;
      }
      const { data, error } = await state.context.client.rpc('pcf_delete_troubleshooting_session', { p_session_id: state.currentId });
      if (error) throw error;
      if (!data) throw new Error('Session was not deleted.');
      state.dirty = false;
      await loadSessions(); newSession(true); setMessage('Troubleshooting session deleted.', 'success');
    } catch (error) { console.error(error); setMessage(error.message || 'Session could not be deleted.', 'error'); }
  }

  async function loadProfiles() {
    try {
      const { data, error } = await state.context.client.rpc('pcf_my_machine_profiles');
      if (error) throw error;
      state.profiles = Array.isArray(data) ? data : [];
      els.machineProfile.innerHTML = '<option value="">Manual entry</option>' + state.profiles.map((profile) => `<option value="${profile.id}">${esc(profile.profile_name)} — ${esc(profile.cutter_brand)} ${esc(profile.cutter_model)}</option>`).join('');
      if (state.data.equipment.machine_profile_id) els.machineProfile.value = state.data.equipment.machine_profile_id;
      updateProfileRows();
    } catch (error) {
      console.warn('Machine profiles unavailable:', error);
      els.machineProfile.innerHTML = '<option value="">Manual entry</option>';
    }
  }

  function selectedProfile() { return state.profiles.find((profile) => profile.id === els.machineProfile.value); }
  function updateProfileRows() {
    const profile = selectedProfile();
    const rows = profile?.rows || [];
    els.profileRow.disabled = !rows.length;
    els.profileRow.innerHTML = '<option value="">Select a saved setting</option>' + rows.map((row, index) => `<option value="${index}">${esc(row.material)} — ${inputValue(row.thickness_mm, 'length')} ${unitLabel('length')} — ${round(row.amperage,0)} A</option>`).join('');
  }

  function applyProfile() {
    const profile = selectedProfile();
    if (!profile) return setMessage('Choose a personal machine profile first.', 'warning');
    state.data.equipment.machine_profile_id = profile.id;
    state.data.equipment.machine_profile_name = profile.profile_name;
    els.cutterBrand.value = profile.cutter_brand || '';
    els.cutterModel.value = profile.cutter_model || '';
    els.torch.value = profile.torch_type || '';
    els.consumables.value = profile.consumable_type || '';
    const row = els.profileRow.value === '' ? null : profile.rows?.[Number(els.profileRow.value)];
    if (row) {
      state.unit = profile.unit_system === 'imperial' ? 'imperial' : state.unit;
      els.unit.value = state.unit;
      Object.assign(state.data.settings, row);
      els.material.value = row.material || 'Mild steel';
      els.thickness.value = inputValue(row.thickness_mm, 'length');
      els.amperage.value = round(row.amperage,1);
      els.cutSpeed.value = inputValue(row.cut_speed_mm_min, 'speed');
      els.pierceHeight.value = inputValue(row.pierce_height_mm, 'length');
      els.pierceDelay.value = round(row.pierce_delay_s,3);
      els.cutHeight.value = inputValue(row.cut_height_mm, 'length');
      els.pressure.value = inputValue(row.air_pressure_bar, 'pressure');
      els.voltage.value = round(row.recommended_voltage_v,1);
      updateUnitLabels();
    }
    markDirty(); setMessage('Saved machine profile data applied.', 'success');
  }

  function csvCell(value) { const text = String(value ?? ''); return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; }
  function exportCsv() {
    collectForm();
    const d = state.data;
    const rows = [['Section','Item','Value']];
    const add = (section, item, value) => rows.push([section, item, value]);
    add('Report','Report ID',state.currentCode || 'Unsaved'); add('Report','Title',d.title); add('Report','Status',d.status); add('Report','Symptom',guideFor().label); add('Report','Opened date',d.opened_date);
    Object.entries(d.equipment).forEach(([key, value]) => add('Equipment', key, value));
    Object.entries(d.settings).forEach(([key, value]) => add('Settings', key, value));
    d.guided.steps.forEach((step, index) => { add(`Diagnostic step ${index+1}`,'Step',step.label); add(`Diagnostic step ${index+1}`,'Completed',step.completed); add(`Diagnostic step ${index+1}`,'Evidence',step.note); });
    add('Evidence','Before notes',d.before_notes); add('Evidence','After notes',d.after_notes);
    d.tests.forEach((test,index) => Object.entries(test).forEach(([key,value]) => key !== 'id' && add(`Test ${index+1}`,key,value)));
    d.actions.forEach((action,index) => Object.entries(action).forEach(([key,value]) => key !== 'id' && add(`Action ${index+1}`,key,value)));
    Object.entries(d.resolution).forEach(([key,value]) => add('Resolution',key,value));
    const blob = new Blob([rows.map((row) => row.map(csvCell).join(',')).join('\n')], {type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${state.currentCode || 'PCF-troubleshooting'}-${slug(d.title)}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  function wrap(doc, text, width) { return doc.splitTextToSize(String(text || '—'), width); }
  async function photoData(photo) {
    const { data, error } = await state.context.client.storage.from(PHOTO_BUCKET).download(photo.path);
    if (error) throw error;
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(data);
      const image = new Image();
      image.onload = () => {
        try {
          const maxSide = 1400;
          const scale = Math.min(1, maxSide / Math.max(image.naturalWidth || 1, image.naturalHeight || 1));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(objectUrl);
          resolve(canvas.toDataURL('image/jpeg', 0.78));
        } catch (error) { URL.revokeObjectURL(objectUrl); reject(error); }
      };
      image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Photo could not be prepared for PDF.')); };
      image.src = objectUrl;
    });
  }

  async function exportPdf() {
    collectForm();
    const d = state.data;
    if (!window.jspdf?.jsPDF) return setMessage('PDF library is not available. Refresh the page and try again.', 'error');
    const button = els.exportPdf; const original = button.textContent; button.disabled = true; button.textContent = 'Building PDF…';
    try {
      const { jsPDF } = window.jspdf; const doc = new jsPDF({unit:'mm',format:'a4'}); const pageW = 210; const pageH = 297; const margin = 15; let y = 18;
      const addHeader = (subtitle='PRIVATE MEMBER DIAGNOSTIC REPORT') => {
        doc.setFillColor(7,17,29); doc.rect(0,0,pageW,30,'F');
        doc.setFont('helvetica','bold'); doc.setFontSize(15); doc.setTextColor(255,255,255); doc.text('PLASMA',margin,12); const px=margin+doc.getTextWidth('PLASMA'); doc.setTextColor(0,207,239); doc.text('CUT',px,12); doc.setTextColor(255,255,255); doc.text('FORGE',px+doc.getTextWidth('CUT'),12);
        doc.setFontSize(6.8); doc.setTextColor(155,180,207); doc.text('CNC PLASMA TOOLS & SHOP-FLOOR GUIDES',margin,18);
        doc.setTextColor(0,207,239); doc.text(subtitle,pageW-margin,12,{align:'right'}); doc.setFillColor(0,207,239); doc.rect(0,30,pageW,1.4,'F'); y=39;
      };
      const newPage = (subtitle) => { doc.addPage(); addHeader(subtitle); };
      const ensure = (need=20, subtitle='PRIVATE MEMBER DIAGNOSTIC REPORT') => { if (y+need > pageH-18) newPage(subtitle); };
      const section = (title) => { ensure(13); doc.setFillColor(13,27,42); doc.roundedRect(margin,y,pageW-margin*2,8,1.5,1.5,'F'); doc.setTextColor(0,207,239); doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.text(title.toUpperCase(),margin+4,y+5.4); y+=12; };
      const line = (label, value, width=pageW-margin*2) => { const lines=wrap(doc,value,width-42); ensure(7+lines.length*4); doc.setFontSize(7); doc.setFont('helvetica','bold'); doc.setTextColor(64,83,105); doc.text(label.toUpperCase(),margin,y); doc.setFont('helvetica','normal'); doc.setTextColor(18,29,42); doc.text(lines,margin+42,y); y+=Math.max(6,lines.length*4.2); };
      const tableRows = (headers, rows, widths) => {
        const total=widths.reduce((a,b)=>a+b,0); const x0=margin;
        ensure(14); doc.setFillColor(13,27,42); doc.rect(x0,y,total,8,'F'); doc.setFontSize(6.2); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255); let x=x0; headers.forEach((h,i)=>{doc.text(wrap(doc,h,widths[i]-2),x+1,y+3.4);x+=widths[i];}); y+=8;
        for (const row of rows) { const cells=row.map((v,i)=>wrap(doc,v,widths[i]-2)); const rh=Math.max(8,...cells.map(c=>c.length*3.5+2)); ensure(rh+2); x=x0; doc.setDrawColor(190,205,220); doc.setFont('helvetica','normal'); doc.setTextColor(20,31,44); doc.setFontSize(6.2); cells.forEach((cell,i)=>{doc.rect(x,y,widths[i],rh);doc.text(cell,x+1,y+3.5);x+=widths[i];}); y+=rh; }
        y+=4;
      };
      addHeader();
      doc.setTextColor(7,17,29); doc.setFont('helvetica','bold'); doc.setFontSize(20); doc.text('ADVANCED TROUBLESHOOTING REPORT',margin,y); y+=8;
      doc.setFontSize(8); doc.setTextColor(80,103,128); doc.text(`${state.currentCode || 'UNSAVED REPORT'}  |  ${d.status.toUpperCase()}  |  ${d.opened_date || today()}`,margin,y); y+=10;
      section('Problem summary'); line('Title',d.title); line('Primary symptom',guideFor().label); line('Severity',d.severity); line('Before notes',d.before_notes);
      section('Equipment'); line('Plasma cutter',`${d.equipment.cutter_brand} ${d.equipment.cutter_model}`.trim()); line('Torch',d.equipment.torch_type); line('Consumables',d.equipment.consumables); line('Controller / THC',d.equipment.controller_thc);
      section('Machine settings');
      const s=d.settings; tableRows(['Material','Thickness','Amps','Speed','Voltage','Pressure','Pierce ht.','Delay','Cut ht.','THC'], [[s.material,`${round(s.thickness_mm,3)} mm`,`${round(s.amperage,1)} A`,`${round(s.cut_speed_mm_min,0)} mm/min`,`${round(s.arc_voltage_v,1)} V`,`${round(s.air_pressure_bar,2)} bar`,`${round(s.pierce_height_mm,2)} mm`,`${round(s.pierce_delay_s,3)} s`,`${round(s.cut_height_mm,2)} mm`,s.thc_enabled?'Yes':'No']], [24,18,14,22,16,18,18,14,17,14]); line('Additional conditions',s.notes);
      section('Guided diagnostic path');
      tableRows(['#','Done','Recommended check','Evidence / measurement'], d.guided.steps.map((step,index)=>[String(index+1),step.completed?'Yes':'No',step.label,step.note || step.why || '']), [8,13,58,101]);
      section('Controlled test sequence');
      if (d.tests.length) tableRows(['#','Date','Variable / values','Outcome','Observation'],d.tests.map((t,i)=>[String(i+1),t.date,`${t.variable}: ${t.old_value} → ${t.new_value}\n${t.action}`,t.outcome,t.observations]),[8,20,55,22,75]); else line('Tests','No tests recorded.');
      section('Maintenance and corrective actions');
      if (d.actions.length) tableRows(['#','Date / type','Work performed','Parts used','Outcome / next due'],d.actions.map((a,i)=>[String(i+1),`${a.date}\n${a.type}`,a.action,a.parts_used,`${a.outcome}\nNext: ${a.next_due||'—'}`]),[8,25,65,35,47]); else line('Actions','No maintenance or corrective actions recorded.');
      section('Resolution'); line('Final diagnosis',d.resolution.final_diagnosis); line('Root cause',d.resolution.root_cause); line('Corrective action',d.resolution.corrective_action); line('Verification',d.resolution.verification); line('Resolved date',d.resolution.resolved_date || 'Open'); line('Production verified',d.resolution.production_verified?'Yes':'No'); line('After notes',d.after_notes);

      const photoGroups=[['Before photographs',d.photos.filter(p=>p.stage==='before')],['After photographs',d.photos.filter(p=>p.stage==='after')]];
      for (const [title,photos] of photoGroups) {
        if (!photos.length) continue;
        newPage(title.toUpperCase()); doc.setFont('helvetica','bold'); doc.setFontSize(16); doc.setTextColor(7,17,29); doc.text(title.toUpperCase(),margin,y); y+=10;
        for (const photo of photos) {
          ensure(72,title.toUpperCase());
          try { const dataUrl=await photoData(photo); doc.addImage(dataUrl,'JPEG',margin,y,82,58,undefined,'FAST'); } catch (error) { doc.setDrawColor(180,190,205); doc.rect(margin,y,82,58); doc.setFontSize(8); doc.text('Photo unavailable',margin+22,y+30); }
          doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.setTextColor(7,17,29); doc.text(wrap(doc,photo.caption || photo.name || 'Troubleshooting photo',82),margin,y+63); y+=72;
        }
      }
      const pages=doc.internal.getNumberOfPages();
      for(let p=1;p<=pages;p++){doc.setPage(p);doc.setDrawColor(205,216,228);doc.line(margin,286,pageW-margin,286);doc.setFontSize(6.5);doc.setTextColor(95,115,137);doc.text('PRIVATE MEMBER RECORD — Verify all settings on the actual machine and follow manufacturer instructions.',margin,291);doc.text(`Page ${p} of ${pages}`,pageW-margin,291,{align:'right'});}
      doc.save(`${state.currentCode || 'PCF-troubleshooting'}-${slug(d.title)}.pdf`);
      setMessage('Private diagnostic PDF exported.', 'success');
    } catch (error) { console.error(error); setMessage(error.message || 'PDF could not be generated.', 'error'); }
    finally { button.disabled=false; button.textContent=original; }
  }

  function bind() {
    els.newSession.addEventListener('click', () => newSession());
    els.save.addEventListener('click', () => saveSession());
    els.duplicate.addEventListener('click', duplicateSession);
    els.delete.addEventListener('click', deleteSession);
    els.exportPdf.addEventListener('click', exportPdf);
    els.exportCsv.addEventListener('click', exportCsv);
    els.sessionSearch.addEventListener('input', renderSessionList);
    els.sessionFilter.addEventListener('change', renderSessionList);
    els.symptom.addEventListener('change', () => { collectForm(); renderGuide(); markDirty(); });
    els.buildPath.addEventListener('click', () => buildPath(true));
    els.addStep.addEventListener('click', addCustomStep);
    els.addTest.addEventListener('click', () => { state.data.tests.push(newTest()); renderTests(); markDirty(); });
    els.addAction.addEventListener('click', () => { state.data.actions.push(newAction()); renderActions(); markDirty(); });
    els.machineProfile.addEventListener('change', () => { updateProfileRows(); markDirty(); });
    els.applyProfile.addEventListener('click', applyProfile);
    els.beforeFiles.addEventListener('change', () => uploadPhotos('before', Array.from(els.beforeFiles.files || [])));
    els.afterFiles.addEventListener('change', () => uploadPhotos('after', Array.from(els.afterFiles.files || [])));
    els.unit.addEventListener('change', () => { collectForm(); state.unit=els.unit.value; state.data.unit_system=state.unit; writeForm(); markDirty(); });
    $$('input,select,textarea', $('.tr-workspace')).forEach((input) => {
      if (['tr-unit','tr-symptom','tr-machine-profile','tr-profile-row','tr-before-files','tr-after-files'].includes(input.id)) return;
      input.addEventListener('input', markDirty);
    });
    window.addEventListener('beforeunload', (event) => { if (state.dirty) { event.preventDefault(); event.returnValue=''; } });
  }

  async function initialize(context) {
    state.context = context; cacheElements(); populateSymptoms(); state.data = defaultData(); bind(); writeForm(); buildPath(false);
    try { await Promise.all([loadSessions(), loadProfiles()]); setMessage('Private troubleshooting workspace ready.', 'success'); }
    catch (error) { console.error(error); setMessage(error.message || 'Saved troubleshooting sessions could not be loaded.', 'error'); }
  }

  document.addEventListener('pcf:member-ready', (event) => initialize(event.detail), { once: true });
  if (window.PCF_MEMBER_CONTEXT) initialize(window.PCF_MEMBER_CONTEXT);
})();
