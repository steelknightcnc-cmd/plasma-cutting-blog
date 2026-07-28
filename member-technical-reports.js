(() => {
  'use strict';
  const state = { context: null, reports: [], category: 'All', search: '' };
  const $ = (s, r=document) => r.querySelector(s);
  const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const fmtDate = (v) => v ? new Date(v).toLocaleDateString('en-US', {year:'numeric',month:'short',day:'numeric'}) : 'Not dated';

  function setMessage(text, type='') {
    const el = $('#ptr-message');
    if (!el) return;
    el.textContent = text;
    el.className = `pcf-member-message${type ? ` is-${type}` : ''}`;
  }

  function categories() {
    return ['All', ...Array.from(new Set(state.reports.map(r => r.category).filter(Boolean))).sort()];
  }

  function renderFilters() {
    const box = $('#ptr-filters');
    box.innerHTML = categories().map(cat => `<button class="ptr-filter${cat===state.category?' active':''}" type="button" data-cat="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`).join('');
    box.querySelectorAll('[data-cat]').forEach(btn => btn.addEventListener('click', () => {
      state.category = btn.dataset.cat;
      renderFilters();
      render();
    }));
  }

  function visible() {
    const q = state.search.trim().toLowerCase();
    return state.reports.filter(r => {
      const category = state.category === 'All' || r.category === state.category;
      const text = `${r.title} ${r.summary} ${r.category} ${r.report_type} ${r.material} ${r.machine_name}`.toLowerCase();
      return category && (!q || text.includes(q));
    });
  }

  function render() {
    const reports = visible();
    $('#ptr-count').textContent = `${reports.length} report${reports.length===1?'':'s'} shown`;
    const grid = $('#ptr-grid');
    if (!reports.length) {
      grid.innerHTML = '<p class="ptr-empty">No premium reports match this search or category.</p>';
      return;
    }
    grid.innerHTML = reports.map(r => `
      <article class="ptr-card">
        <div class="ptr-card-top"><span class="ptr-badge">${escapeHtml(r.category)}</span><span class="ptr-badge">${escapeHtml(r.report_type)}</span></div>
        <h3>${escapeHtml(r.title)}</h3>
        <p>${escapeHtml(r.summary)}</p>
        <div class="ptr-meta">
          <span>${r.reading_minutes || 5} min read</span>
          <span>${fmtDate(r.test_date || r.published_at)}</span>
          ${r.test_count ? `<span>${r.test_count} tests</span>` : ''}
          ${r.material ? `<span>${escapeHtml(r.material)}</span>` : ''}
        </div>
        <a class="pcf-button" href="/member-technical-report.html?slug=${encodeURIComponent(r.slug)}">Open Full Report</a>
      </article>`).join('');
  }

  async function initialize(context) {
    state.context = context;
    $('#ptr-search').addEventListener('input', e => { state.search = e.target.value; render(); });
    try {
      const { data, error } = await context.client
        .from('pcf_premium_articles')
        .select('id,slug,title,category,report_type,summary,reading_minutes,published_at,test_date,machine_name,material,thickness,amperage,test_count')
        .eq('status','published')
        .order('published_at',{ascending:false});
      if (error) throw error;
      state.reports = data || [];
      $('#ptr-report-total').textContent = String(state.reports.length);
      $('#ptr-test-total').textContent = String(state.reports.reduce((sum,r)=>sum+(Number(r.test_count)||0),0));
      const { data: isAdmin } = await context.client.rpc('pcf_is_site_admin');
      if (isAdmin) $('#ptr-admin-link').style.display = 'inline-flex';
      renderFilters();
      render();
      setMessage('Premium technical report library ready.', 'success');
    } catch (error) {
      console.error(error);
      setMessage(error.message || 'Premium reports could not be loaded.', 'error');
    }
  }

  document.addEventListener('pcf:member-ready', e => initialize(e.detail), { once:true });
  if (window.PCF_MEMBER_CONTEXT) initialize(window.PCF_MEMBER_CONTEXT);
})();
