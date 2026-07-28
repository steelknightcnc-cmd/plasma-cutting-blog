(() => {
  'use strict';
  const state={reports:[],category:'All',search:''};
  const $=(s,r=document)=>r.querySelector(s);
  const escapeHtml=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  function msg(text,type=''){const el=$('#public-ptr-message');el.textContent=text;el.className=`pcf-member-message${type?` is-${type}`:''}`;}
  function cats(){return ['All',...Array.from(new Set(state.reports.map(r=>r.category).filter(Boolean))).sort()];}
  function filters(){
    const box=$('#public-ptr-filters');
    box.innerHTML=cats().map(c=>`<button class="ptr-filter${c===state.category?' active':''}" type="button" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('');
    box.querySelectorAll('[data-cat]').forEach(b=>b.addEventListener('click',()=>{state.category=b.dataset.cat;filters();render();}));
  }
  function render(){
    const q=state.search.trim().toLowerCase();
    const rows=state.reports.filter(r=>(state.category==='All'||r.category===state.category)&&(!q||`${r.title} ${r.summary} ${r.public_teaser} ${r.category}`.toLowerCase().includes(q)));
    $('#public-ptr-count').textContent=`${rows.length} preview${rows.length===1?'':'s'}`;
    $('#public-ptr-grid').innerHTML=rows.length?rows.map(r=>`
      <article class="ptr-card">
        <div class="ptr-card-top"><span class="ptr-badge">${escapeHtml(r.category)}</span><span class="ptr-badge">${escapeHtml(r.report_type)}</span></div>
        <h3>${escapeHtml(r.title)}</h3>
        <p>${escapeHtml(r.summary)}</p>
        <p class="ptr-teaser">${escapeHtml(r.public_teaser)}</p>
        <div class="ptr-meta"><span>${r.reading_minutes||5} min</span>${r.test_count?`<span>${r.test_count} tests</span>`:''}${r.material?`<span>${escapeHtml(r.material)}</span>`:''}</div>
        <a class="pcf-button" href="/members.html">Unlock Member Report</a>
      </article>`).join(''):'<p class="ptr-empty">No report previews match this search.</p>';
  }
  async function init(){
    const search=$('#public-ptr-search'); search.addEventListener('input',()=>{state.search=search.value;render();});
    try{
      const config=window.PCF_SUPABASE_CONFIG||window.supabaseConfig||window.SUPABASE_CONFIG;
      if(!config?.url||!config?.anonKey) throw new Error('Supabase configuration is unavailable.');
      const client=window.supabase.createClient(config.url,config.anonKey);
      const {data,error}=await client.rpc('pcf_public_premium_article_teasers');
      if(error)throw error;
      state.reports=data||[];filters();render();msg('Technical report previews loaded.','success');
    }catch(error){console.error(error);msg(error.message||'Previews could not be loaded.','error');}
  }
  window.addEventListener('DOMContentLoaded',init);
})();
