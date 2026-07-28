(() => {
  'use strict';
  const BUCKET = 'member-article-downloads';
  const state = { context:null, article:null, downloads:[] };
  const $ = (s,r=document)=>r.querySelector(s);
  const escapeHtml = (v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const fmtDate = (v)=>v?new Date(v).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}):'Not dated';

  function setMessage(text,type='') {
    const el=$('#ptr-article-message'); if(!el)return;
    el.textContent=text; el.className=`pcf-member-message${type?` is-${type}`:''}`;
  }

  function renderSection(section) {
    const paragraphs = (section.paragraphs || []).map(p=>`<p>${escapeHtml(p)}</p>`).join('');
    const bullets = (section.bullets || []).length ? `<ul>${section.bullets.map(b=>`<li>${escapeHtml(b)}</li>`).join('')}</ul>` : '';
    const callout = section.callout ? `<div class="ptr-callout">${escapeHtml(section.callout)}</div>` : '';
    return `<section class="ptr-section"><h2>${escapeHtml(section.heading || 'Section')}</h2>${paragraphs}${bullets}${callout}</section>`;
  }

  function renderResults(results) {
    const columns = Array.isArray(results?.columns) ? results.columns : [];
    const rows = Array.isArray(results?.rows) ? results.rows : [];
    if (!columns.length) return;
    $('#ptr-results').hidden=false;
    $('#ptr-results-head').innerHTML=`<tr>${columns.map(c=>`<th>${escapeHtml(c)}</th>`).join('')}</tr>`;
    $('#ptr-results-body').innerHTML=rows.map(row=>`<tr>${columns.map((_,i)=>`<td>${escapeHtml(row?.[i] ?? '')}</td>`).join('')}</tr>`).join('');
  }

  async function download(item, button) {
    const original=button.textContent;
    button.disabled=true; button.textContent='Preparing…';
    try {
      const { data, error } = await state.context.client.storage.from(BUCKET).download(item.storage_path);
      if(error) throw error;
      const url=URL.createObjectURL(data);
      const a=document.createElement('a'); a.href=url; a.download=item.storage_path.split('/').pop();
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),30000);
      setMessage(`${item.label} downloaded.`, 'success');
    } catch(error) {
      console.error(error); setMessage(error.message || 'Download failed.', 'error');
    } finally { button.disabled=false; button.textContent=original; }
  }

  function renderDownloads() {
    if (!state.downloads.length) return;
    $('#ptr-downloads').hidden=false;
    const list=$('#ptr-download-list');
    list.innerHTML=state.downloads.map((d,i)=>`
      <article class="ptr-download-item">
        <span class="ptr-badge">${escapeHtml(d.file_type)}</span>
        <strong>${escapeHtml(d.label)}</strong>
        <p>${escapeHtml(d.description)}</p>
        <button class="pcf-button secondary" type="button" data-download="${i}">Download ${escapeHtml(d.file_type)}</button>
      </article>`).join('');
    list.querySelectorAll('[data-download]').forEach(btn=>btn.addEventListener('click',()=>download(state.downloads[Number(btn.dataset.download)],btn)));
  }

  async function initialize(context) {
    state.context=context;
    const slug=new URLSearchParams(location.search).get('slug');
    if(!slug){ setMessage('No report was selected.','error'); return; }
    $('#ptr-print').addEventListener('click',()=>window.print());
    try {
      const { data:article,error }=await context.client.from('pcf_premium_articles').select('*').eq('slug',slug).single();
      if(error) throw error;
      state.article=article;
      const { data:downloads,error:downloadError }=await context.client.from('pcf_premium_article_downloads').select('*').eq('article_id',article.id).order('sort_order');
      if(downloadError) throw downloadError;
      state.downloads=downloads||[];

      document.title=`${article.title} | Plasma Cut Forge`;
      $('#ptr-article-kicker').textContent=`${article.category} · ${article.report_type}`;
      $('#ptr-article-title').textContent=article.title;
      $('#ptr-article-summary').textContent=article.summary;
      const meta=[
        `${article.reading_minutes||5} min read`,
        article.author_name ? `By ${article.author_name}` : '',
        article.test_date ? `Test date ${fmtDate(article.test_date)}` : `Published ${fmtDate(article.published_at)}`,
        article.machine_name, article.material, article.thickness, article.amperage,
        article.test_count ? `${article.test_count} recorded tests` : ''
      ].filter(Boolean);
      $('#ptr-article-meta').innerHTML=meta.map(v=>`<span class="ptr-chip">${escapeHtml(v)}</span>`).join('');

      const findings=Array.isArray(article.key_findings_json)?article.key_findings_json:[];
      if(findings.length){
        $('#ptr-findings').hidden=false;
        $('#ptr-findings-list').innerHTML=findings.map(v=>`<li>${escapeHtml(v)}</li>`).join('');
      }
      const sections=Array.isArray(article.content_json)?article.content_json:[];
      $('#ptr-content').innerHTML=sections.map(renderSection).join('');
      renderResults(article.results_json || {});
      renderDownloads();
      if(article.limitations){
        $('#ptr-limitations').hidden=false;
        $('#ptr-limitations-text').textContent=article.limitations;
      }
      setMessage('Full member report loaded.', 'success');
    } catch(error) {
      console.error(error); setMessage(error.message || 'The selected report could not be loaded.','error');
    }
  }

  document.addEventListener('pcf:member-ready',e=>initialize(e.detail),{once:true});
  if(window.PCF_MEMBER_CONTEXT) initialize(window.PCF_MEMBER_CONTEXT);
})();
