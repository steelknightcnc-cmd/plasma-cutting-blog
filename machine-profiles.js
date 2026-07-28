(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const config = window.PLASMA_FEEDBACK_CONFIG || {};
  const projectUrl = String(config.supabaseUrl || '').replace(/\/+$/, '');
  const publishableKey = String(config.supabasePublishableKey || '');
  const state = { profiles: [], unit: 'metric' };
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  const num = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
  const round = (value, digits = 2) => Number(num(value).toFixed(digits));

  function toDisplay(value, kind) {
    const v = num(value);
    if (state.unit === 'metric') return v;
    if (kind === 'length' || kind === 'speed') return v / 25.4;
    if (kind === 'pressure') return v * 14.5037738;
    return v;
  }
  function unitLabel(kind) {
    if (state.unit === 'metric') return ({ length: 'mm', speed: 'mm/min', pressure: 'bar' })[kind];
    return ({ length: 'in', speed: 'IPM', pressure: 'PSI' })[kind];
  }
  function fmt(value, kind) {
    const v = toDisplay(value, kind);
    if (kind === 'speed') return round(v, state.unit === 'metric' ? 0 : 1);
    if (kind === 'length') return round(v, state.unit === 'metric' ? 2 : 4);
    if (kind === 'pressure') return round(v, state.unit === 'metric' ? 2 : 1);
    return round(v, 1);
  }

  function populateFilters() {
    const brands = [...new Set(state.profiles.map((p) => p.cutter_brand).filter(Boolean))].sort();
    const materials = [...new Set(state.profiles.flatMap((p) => (p.rows || []).map((r) => r.material)).filter(Boolean))].sort();
    $('#public-brand-filter').innerHTML = '<option value="">All brands</option>' + brands.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
    $('#public-material-filter').innerHTML = '<option value="">All materials</option>' + materials.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
  }

  function filteredProfiles() {
    const q = $('#public-profile-search').value.trim().toLowerCase();
    const brand = $('#public-brand-filter').value;
    const material = $('#public-material-filter').value;
    return state.profiles.filter((p) => {
      const haystack = [p.profile_name, p.cutter_brand, p.cutter_model, p.torch_type, p.consumable_type, p.profile_notes, ...(p.rows || []).flatMap((r) => [r.material, r.test_notes])].join(' ').toLowerCase();
      return (!q || haystack.includes(q)) && (!brand || p.cutter_brand === brand) && (!material || (p.rows || []).some((r) => r.material === material));
    });
  }

  function render() {
    const profiles = filteredProfiles();
    $('#public-profile-count').textContent = profiles.length;
    const list = $('#public-profile-list');
    if (!profiles.length) {
      list.innerHTML = '<p class="mp-empty">No approved profiles match those filters. Approved community profiles will appear here after review.</p>';
      return;
    }
    list.innerHTML = profiles.map((p) => {
      const rows = Array.isArray(p.rows) ? p.rows : [];
      const approvedDate = p.approved_at ? new Date(p.approved_at).toLocaleDateString('en-US') : 'Approved profile';
      return `<article class="mp-public-card">
        <header class="mp-public-card-header">
          <div><p class="mp-kicker">Approved community cut chart</p><h2>${esc(p.profile_name)}</h2><p class="mp-public-meta">${esc(p.cutter_brand)} ${esc(p.cutter_model)} · Shared by ${esc(p.public_display_name || 'Community Member')}</p></div>
          <span class="mp-status approved">Approved ${esc(approvedDate)}</span>
        </header>
        <div class="mp-grid three">
          <div><strong>Torch</strong><p class="mp-public-meta">${esc(p.torch_type || 'Not specified')}</p></div>
          <div><strong>Consumables</strong><p class="mp-public-meta">${esc(p.consumable_type || 'Not specified')}</p></div>
          <div><strong>Chart rows</strong><p class="mp-public-meta">${rows.length}</p></div>
        </div>
        ${p.profile_notes ? `<p class="mp-public-profile-notes">${esc(p.profile_notes)}</p>` : ''}
        <div class="mp-table-wrap"><table class="mp-public-table">
          <thead><tr><th>Material</th><th>Thickness (${unitLabel('length')})</th><th>Amps</th><th>Cut speed (${unitLabel('speed')})</th><th>Pierce height (${unitLabel('length')})</th><th>Delay (s)</th><th>Cut height (${unitLabel('length')})</th><th>Pressure (${unitLabel('pressure')})</th><th>Voltage</th><th>Test notes</th></tr></thead>
          <tbody>${rows.map((r) => `<tr><td>${esc(r.material)}</td><td>${fmt(r.thickness_mm, 'length')}</td><td>${round(r.amperage, 1)}</td><td>${fmt(r.cut_speed_mm_min, 'speed')}</td><td>${fmt(r.pierce_height_mm, 'length')}</td><td>${round(r.pierce_delay_s, 3)}</td><td>${fmt(r.cut_height_mm, 'length')}</td><td>${fmt(r.air_pressure_bar, 'pressure')}</td><td>${round(r.recommended_voltage_v, 1)} V</td><td class="notes">${esc(r.test_notes || '')}</td></tr>`).join('')}</tbody>
        </table></div>
      </article>`;
    }).join('');
  }

  async function initialize() {
    const list = $('#public-profile-list');
    if (!window.supabase || !projectUrl || !publishableKey) {
      list.innerHTML = '<p class="mp-empty">The community profile library is not connected to Supabase.</p>';
      return;
    }
    const client = window.supabase.createClient(projectUrl, publishableKey);
    try {
      const { data, error } = await client.rpc('pcf_public_machine_profiles');
      if (error) throw error;
      state.profiles = Array.isArray(data) ? data : [];
      populateFilters(); render();
    } catch (error) {
      console.error(error);
      list.innerHTML = `<p class="mp-empty">Approved machine profiles could not be loaded. ${esc(error.message || '')}</p>`;
    }
    ['#public-profile-search','#public-brand-filter','#public-material-filter'].forEach((selector) => $(selector).addEventListener('input', render));
    $('#public-unit-system').addEventListener('change', () => { state.unit = $('#public-unit-system').value === 'imperial' ? 'imperial' : 'metric'; render(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
