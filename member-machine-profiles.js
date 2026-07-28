(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const MATERIALS = ['Mild steel', 'Stainless steel', 'Aluminum', 'Galvanized steel', 'Copper', 'Brass', 'Other'];
  const state = { context: null, profiles: [], currentId: null, rows: [], unit: 'metric', status: 'private' };

  const els = {};
  const num = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
  const round = (value, digits = 3) => Number(num(value).toFixed(digits));
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  const slug = (value) => String(value || 'machine-profile').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'machine-profile';

  function setMessage(text, type = '') {
    if (!els.message) return;
    els.message.textContent = text;
    els.message.className = `pcf-member-message${type ? ` is-${type}` : ''}`;
  }

  function toDisplay(value, kind) {
    const v = num(value);
    if (state.unit === 'metric') return v;
    if (kind === 'length') return v / 25.4;
    if (kind === 'speed') return v / 25.4;
    if (kind === 'pressure') return v * 14.5037738;
    return v;
  }

  function toMetric(value, kind) {
    const v = num(value);
    if (state.unit === 'metric') return v;
    if (kind === 'length') return v * 25.4;
    if (kind === 'speed') return v * 25.4;
    if (kind === 'pressure') return v / 14.5037738;
    return v;
  }

  function unitLabel(kind) {
    if (state.unit === 'metric') return ({ length: 'mm', speed: 'mm/min', pressure: 'bar' })[kind] || '';
    return ({ length: 'in', speed: 'IPM', pressure: 'PSI' })[kind] || '';
  }

  function formatInput(value, kind) {
    const converted = toDisplay(value, kind);
    if (kind === 'speed') return round(converted, state.unit === 'metric' ? 0 : 1);
    if (kind === 'length') return round(converted, state.unit === 'metric' ? 2 : 4);
    if (kind === 'pressure') return round(converted, state.unit === 'metric' ? 2 : 1);
    return round(converted, 2);
  }

  function emptyRow() {
    return {
      material: 'Mild steel', thickness_mm: 2, amperage: 45, cut_speed_mm_min: 0,
      pierce_height_mm: 0, pierce_delay_s: 0, cut_height_mm: 0,
      air_pressure_bar: 0, recommended_voltage_v: 0, test_notes: ''
    };
  }

  function cacheElements() {
    Object.assign(els, {
      list: $('#mp-profile-list'), rows: $('#mp-cut-rows'), message: $('#mp-message'), heading: $('#mp-editor-heading'),
      profileName: $('#mp-profile-name'), brand: $('#mp-cutter-brand'), model: $('#mp-cutter-model'),
      torch: $('#mp-torch-type'), consumable: $('#mp-consumable-type'), unit: $('#mp-unit-system'),
      profileNotes: $('#mp-profile-notes'), publicName: $('#mp-public-display-name'),
      publicRequest: $('#mp-public-request'), status: $('#mp-publication-status')
    });
  }

  function updateStatus(status = 'private') {
    state.status = status;
    if (!els.status) return;
    const label = ({ private: 'Private', pending: 'Pending Review', approved: 'Approved Public', rejected: 'Changes Requested' })[status] || 'Private';
    els.status.textContent = label;
    els.status.className = `mp-status ${status}`;
  }

  function readProfileForm() {
    return {
      profile_name: els.profileName.value.trim(), cutter_brand: els.brand.value.trim(), cutter_model: els.model.value.trim(),
      torch_type: els.torch.value.trim(), consumable_type: els.consumable.value.trim(), unit_system: state.unit,
      profile_notes: els.profileNotes.value.trim(), public_display_name: els.publicName.value.trim(),
      publication_status: els.publicRequest.checked ? 'pending' : 'private'
    };
  }

  function writeProfileForm(profile = {}) {
    els.profileName.value = profile.profile_name || '';
    els.brand.value = profile.cutter_brand || '';
    els.model.value = profile.cutter_model || '';
    els.torch.value = profile.torch_type || '';
    els.consumable.value = profile.consumable_type || '';
    state.unit = profile.unit_system === 'imperial' ? 'imperial' : 'metric';
    els.unit.value = state.unit;
    els.profileNotes.value = profile.profile_notes || '';
    els.publicName.value = profile.public_display_name || '';
    els.publicRequest.checked = ['pending', 'approved'].includes(profile.publication_status);
    updateStatus(profile.publication_status || 'private');
    els.heading.textContent = profile.profile_name || 'New Machine Profile';
  }

  function renderRows() {
    if (!state.rows.length) state.rows = [emptyRow()];
    els.rows.innerHTML = state.rows.map((row, index) => `
      <article class="mp-cut-row" data-row-index="${index}">
        <div class="mp-cut-row-header">
          <h3>Cut setting ${index + 1}</h3>
          <button class="mp-icon-button" type="button" data-remove-row="${index}">Remove</button>
        </div>
        <div class="mp-row-grid">
          <label class="mp-field"><span>Material</span><select data-key="material">${MATERIALS.map((m) => `<option value="${esc(m)}"${row.material === m ? ' selected' : ''}>${esc(m)}</option>`).join('')}</select></label>
          <label class="mp-field"><span>Thickness <small class="mp-row-unit">${unitLabel('length')}</small></span><input data-key="thickness_mm" data-kind="length" type="number" min="0" step="${state.unit === 'metric' ? '0.1' : '0.001'}" value="${formatInput(row.thickness_mm, 'length')}"></label>
          <label class="mp-field"><span>Amperage <small class="mp-row-unit">A</small></span><input data-key="amperage" type="number" min="0" step="1" value="${round(row.amperage, 1)}"></label>
          <label class="mp-field"><span>Cut speed <small class="mp-row-unit">${unitLabel('speed')}</small></span><input data-key="cut_speed_mm_min" data-kind="speed" type="number" min="0" step="${state.unit === 'metric' ? '1' : '0.1'}" value="${formatInput(row.cut_speed_mm_min, 'speed')}"></label>
          <label class="mp-field"><span>Pierce height <small class="mp-row-unit">${unitLabel('length')}</small></span><input data-key="pierce_height_mm" data-kind="length" type="number" min="0" step="${state.unit === 'metric' ? '0.01' : '0.001'}" value="${formatInput(row.pierce_height_mm, 'length')}"></label>
          <label class="mp-field"><span>Pierce delay <small class="mp-row-unit">s</small></span><input data-key="pierce_delay_s" type="number" min="0" step="0.01" value="${round(row.pierce_delay_s, 3)}"></label>
          <label class="mp-field"><span>Cut height <small class="mp-row-unit">${unitLabel('length')}</small></span><input data-key="cut_height_mm" data-kind="length" type="number" min="0" step="${state.unit === 'metric' ? '0.01' : '0.001'}" value="${formatInput(row.cut_height_mm, 'length')}"></label>
          <label class="mp-field"><span>Air pressure <small class="mp-row-unit">${unitLabel('pressure')}</small></span><input data-key="air_pressure_bar" data-kind="pressure" type="number" min="0" step="${state.unit === 'metric' ? '0.01' : '0.1'}" value="${formatInput(row.air_pressure_bar, 'pressure')}"></label>
          <label class="mp-field"><span>Recommended voltage <small class="mp-row-unit">V</small></span><input data-key="recommended_voltage_v" type="number" min="0" step="0.1" value="${round(row.recommended_voltage_v, 1)}"></label>
          <label class="mp-field notes"><span>Test-cut notes</span><input data-key="test_notes" type="text" maxlength="2000" value="${esc(row.test_notes)}" placeholder="Dross, kerf, bevel, consumable condition, changes tested…"></label>
        </div>
      </article>`).join('');

    $$('[data-row-index]', els.rows).forEach((card) => {
      const index = Number(card.dataset.rowIndex);
      $$('[data-key]', card).forEach((input) => {
        input.addEventListener('input', () => {
          const key = input.dataset.key;
          if (input.type === 'number') {
            state.rows[index][key] = input.dataset.kind ? toMetric(input.value, input.dataset.kind) : num(input.value);
          } else state.rows[index][key] = input.value;
        });
      });
    });

    $$('[data-remove-row]', els.rows).forEach((button) => button.addEventListener('click', () => {
      if (state.rows.length === 1) return setMessage('A machine profile needs at least one cut setting.', 'warning');
      state.rows.splice(Number(button.dataset.removeRow), 1);
      renderRows();
    }));
  }

  function renderList() {
    if (!state.profiles.length) {
      els.list.innerHTML = '<p class="mp-empty">No profiles saved yet. Create the first machine profile.</p>';
      return;
    }
    els.list.innerHTML = state.profiles.map((profile) => `
      <button class="mp-profile-item${profile.id === state.currentId ? ' active' : ''}" type="button" data-profile-id="${profile.id}">
        <strong>${esc(profile.profile_name)}</strong>
        <span>${esc(profile.cutter_brand)} ${esc(profile.cutter_model)}</span>
        <small>${esc(({ private: 'Private', pending: 'Pending review', approved: 'Approved public', rejected: 'Changes requested' })[profile.publication_status] || 'Private')}</small>
      </button>`).join('');
    $$('[data-profile-id]', els.list).forEach((button) => button.addEventListener('click', () => selectProfile(button.dataset.profileId)));
  }

  function selectProfile(id) {
    const profile = state.profiles.find((item) => item.id === id);
    if (!profile) return;
    state.currentId = profile.id;
    state.rows = Array.isArray(profile.rows) && profile.rows.length ? profile.rows.map((r) => ({ ...r })) : [emptyRow()];
    writeProfileForm(profile);
    renderRows();
    renderList();
    setMessage(`Loaded ${profile.profile_name}.`, 'success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function newProfile() {
    state.currentId = null;
    state.rows = [emptyRow()];
    writeProfileForm({ unit_system: state.unit, publication_status: 'private' });
    renderRows();
    renderList();
    setMessage('New unsaved profile ready. Enter the equipment and cut-chart data.');
  }

  function validate(profile) {
    if (!profile.profile_name || !profile.cutter_brand || !profile.cutter_model) return 'Profile name, cutter brand, and cutter model are required.';
    if (!state.rows.length) return 'Add at least one cut setting.';
    for (let i = 0; i < state.rows.length; i += 1) {
      const r = state.rows[i];
      if (!r.material || num(r.thickness_mm) <= 0 || num(r.amperage) <= 0 || num(r.cut_speed_mm_min) <= 0) {
        return `Cut setting ${i + 1} needs material, thickness, amperage, and cut speed.`;
      }
    }
    return '';
  }

  async function busy(button, text, task) {
    const original = button.textContent;
    button.disabled = true;
    button.textContent = text;
    try { return await task(); } finally { button.disabled = false; button.textContent = original; }
  }

  async function loadProfiles(selectId = null) {
    if (!state.context?.client) return;
    setMessage('Loading private machine profiles…');
    const { data, error } = await state.context.client.rpc('pcf_my_machine_profiles');
    if (error) throw error;
    state.profiles = Array.isArray(data) ? data : [];
    renderList();
    const target = selectId || state.currentId;
    if (target && state.profiles.some((p) => p.id === target)) selectProfile(target);
    else if (!state.currentId && state.profiles.length) selectProfile(state.profiles[0].id);
    else if (!state.currentId && !state.profiles.length) newProfile();
    else setMessage(`${state.profiles.length} saved profile${state.profiles.length === 1 ? '' : 's'} loaded.`, 'success');
  }

  async function saveProfile({ duplicate = false } = {}) {
    const profile = readProfileForm();
    if (duplicate) {
      profile.profile_name = `${profile.profile_name || 'Machine Profile'} Copy`.slice(0, 120);
      profile.publication_status = 'private';
      els.profileName.value = profile.profile_name;
      els.publicRequest.checked = false;
    }
    const problem = validate(profile);
    if (problem) return setMessage(problem, 'error');
    const button = duplicate ? $('#mp-duplicate-profile') : $('#mp-save-profile');
    await busy(button, duplicate ? 'Duplicating…' : 'Saving…', async () => {
      try {
        const rows = state.rows.map((r, index) => ({
          sort_order: index, material: r.material, thickness_mm: round(r.thickness_mm, 3), amperage: round(r.amperage, 2),
          cut_speed_mm_min: round(r.cut_speed_mm_min, 2), pierce_height_mm: round(r.pierce_height_mm, 3),
          pierce_delay_s: round(r.pierce_delay_s, 3), cut_height_mm: round(r.cut_height_mm, 3),
          air_pressure_bar: round(r.air_pressure_bar, 3), recommended_voltage_v: round(r.recommended_voltage_v, 2),
          test_notes: r.test_notes || ''
        }));
        const { data, error } = await state.context.client.rpc('pcf_save_machine_profile', {
          p_profile_id: duplicate ? null : state.currentId,
          p_profile: profile,
          p_rows: rows
        });
        if (error) throw error;
        state.currentId = data;
        await loadProfiles(data);
        setMessage(duplicate ? 'Profile duplicated as a new private profile.' : (profile.publication_status === 'pending' ? 'Profile saved and submitted for community review.' : 'Private machine profile saved.'), 'success');
      } catch (error) {
        console.error(error);
        setMessage(error.message || 'The machine profile could not be saved.', 'error');
      }
    });
  }

  async function deleteProfile() {
    if (!state.currentId) return setMessage('This profile has not been saved yet.', 'warning');
    const profile = state.profiles.find((p) => p.id === state.currentId);
    if (!window.confirm(`Delete “${profile?.profile_name || 'this machine profile'}” and every cut-chart row? This cannot be undone.`)) return;
    const button = $('#mp-delete-profile');
    await busy(button, 'Deleting…', async () => {
      try {
        const { data, error } = await state.context.client.rpc('pcf_delete_machine_profile', { p_profile_id: state.currentId });
        if (error) throw error;
        if (!data) throw new Error('The profile was not found.');
        state.currentId = null;
        await loadProfiles();
        newProfile();
        setMessage('Machine profile deleted.', 'success');
      } catch (error) {
        console.error(error);
        setMessage(error.message || 'The profile could not be deleted.', 'error');
      }
    });
  }

  function exportRows() {
    return state.rows.map((r) => ({
      material: r.material,
      thickness: formatInput(r.thickness_mm, 'length'),
      amperage: round(r.amperage, 1),
      cut_speed: formatInput(r.cut_speed_mm_min, 'speed'),
      pierce_height: formatInput(r.pierce_height_mm, 'length'),
      pierce_delay: round(r.pierce_delay_s, 3),
      cut_height: formatInput(r.cut_height_mm, 'length'),
      air_pressure: formatInput(r.air_pressure_bar, 'pressure'),
      voltage: round(r.recommended_voltage_v, 1),
      notes: r.test_notes || ''
    }));
  }

  function currentExportData() {
    const profile = readProfileForm();
    const problem = validate(profile);
    if (problem) { setMessage(problem, 'error'); return null; }
    return { profile, rows: exportRows() };
  }

  function exportCsv() {
    const data = currentExportData();
    if (!data) return;
    const lengthUnit = unitLabel('length');
    const speedUnit = unitLabel('speed');
    const pressureUnit = unitLabel('pressure');
    const header = ['Profile name','Cutter brand','Cutter model','Torch type','Consumable type','Material',`Thickness (${lengthUnit})`,'Amperage (A)',`Cut speed (${speedUnit})`,`Pierce height (${lengthUnit})`,'Pierce delay (s)',`Cut height (${lengthUnit})`,`Air pressure (${pressureUnit})`,'Recommended voltage (V)','Test notes'];
    const csvEscape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [header.map(csvEscape).join(',')];
    data.rows.forEach((r) => lines.push([
      data.profile.profile_name, data.profile.cutter_brand, data.profile.cutter_model, data.profile.torch_type,
      data.profile.consumable_type, r.material, r.thickness, r.amperage, r.cut_speed, r.pierce_height,
      r.pierce_delay, r.cut_height, r.air_pressure, r.voltage, r.notes
    ].map(csvEscape).join(',')));
    const blob = new Blob([`\ufeff${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `${slug(data.profile.profile_name)}-cut-chart.csv`; link.click();
    URL.revokeObjectURL(url);
    setMessage('CSV cut chart exported.', 'success');
  }

  function exportPdf() {
    const data = currentExportData();
    if (!data) return;
    const jsPDF = window.jspdf?.jsPDF;
    if (!jsPDF) return setMessage('PDF library is still loading. Try again in a moment.', 'warning');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.setFillColor(7, 11, 20); doc.rect(0, 0, 210, 34, 'F');
    doc.setTextColor(0, 216, 245); doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.text('PLASMACUTFORGE', 14, 15);
    doc.setTextColor(244, 247, 251); doc.setFontSize(12); doc.text('PRIVATE MEMBER MACHINE CUT CHART', 14, 24);
    doc.setTextColor(30, 40, 55); doc.setFontSize(16); doc.text(data.profile.profile_name, 14, 46);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    const details = [
      `Plasma cutter: ${data.profile.cutter_brand} ${data.profile.cutter_model}`,
      `Torch: ${data.profile.torch_type || 'Not specified'}`,
      `Consumables: ${data.profile.consumable_type || 'Not specified'}`,
      `Working units: ${state.unit === 'metric' ? 'Metric' : 'Imperial'}`
    ];
    doc.text(details, 14, 54);
    let startY = 75;
    if (data.profile.profile_notes) {
      doc.setFont('helvetica', 'bold'); doc.text('Profile notes', 14, startY);
      doc.setFont('helvetica', 'normal');
      const notes = doc.splitTextToSize(data.profile.profile_notes, 180);
      doc.text(notes, 14, startY + 6);
      startY += 10 + notes.length * 4.5;
    }
    const head = [[
      'Material', `Thickness\n${unitLabel('length')}`, 'Amps', `Cut speed\n${unitLabel('speed')}`,
      `Pierce ht.\n${unitLabel('length')}`, 'Delay\ns', `Cut ht.\n${unitLabel('length')}`,
      `Pressure\n${unitLabel('pressure')}`, 'Voltage\nV', 'Test notes'
    ]];
    const body = data.rows.map((r) => [r.material, r.thickness, r.amperage, r.cut_speed, r.pierce_height, r.pierce_delay, r.cut_height, r.air_pressure, r.voltage, r.notes]);
    doc.autoTable({
      startY, head, body, theme: 'grid', margin: { left: 10, right: 10 },
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak', valign: 'top' },
      headStyles: { fillColor: [13, 21, 34], textColor: [0, 216, 245] },
      columnStyles: { 9: { cellWidth: 34 } }
    });
    const pages = doc.getNumberOfPages();
    for (let page = 1; page <= pages; page += 1) {
      doc.setPage(page); doc.setFontSize(8); doc.setTextColor(90, 100, 115);
      doc.text('Verify every setting on the actual machine before production cutting.', 14, 289);
      doc.text(`Page ${page} of ${pages}`, 196, 289, { align: 'right' });
    }
    doc.save(`${slug(data.profile.profile_name)}-cut-chart.pdf`);
    setMessage('PDF cut chart exported.', 'success');
  }

  function bind() {
    $('#mp-new-profile').addEventListener('click', newProfile);
    $('#mp-save-profile').addEventListener('click', () => saveProfile());
    $('#mp-duplicate-profile').addEventListener('click', () => saveProfile({ duplicate: true }));
    $('#mp-delete-profile').addEventListener('click', deleteProfile);
    $('#mp-refresh-profiles').addEventListener('click', () => loadProfiles().catch(handleLoadError));
    $('#mp-add-row').addEventListener('click', () => { state.rows.push(emptyRow()); renderRows(); });
    $('#mp-export-pdf').addEventListener('click', exportPdf);
    $('#mp-export-csv').addEventListener('click', exportCsv);
    els.unit.addEventListener('change', () => { state.unit = els.unit.value === 'imperial' ? 'imperial' : 'metric'; renderRows(); });
    els.profileName.addEventListener('input', () => { els.heading.textContent = els.profileName.value.trim() || 'New Machine Profile'; });
  }

  function handleLoadError(error) {
    console.error(error);
    setMessage(error.message || 'Machine profiles could not be loaded.', 'error');
  }

  async function initialize(context) {
    if (state.context) return;
    state.context = context;
    cacheElements();
    bind();
    state.rows = [emptyRow()];
    writeProfileForm({ unit_system: 'metric', publication_status: 'private' });
    renderRows();
    try { await loadProfiles(); } catch (error) { handleLoadError(error); }
  }

  document.addEventListener('pcf:member-ready', (event) => initialize(event.detail), { once: true });
  if (window.PCF_MEMBER_CONTEXT) initialize(window.PCF_MEMBER_CONTEXT);
})();
