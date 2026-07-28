(() => {
  'use strict';
  const BUCKET='atlas-member-assets';
  let initialized=false;
  const state={context:null,update:null,assets:[]};
  const $=(s,r=document)=>r.querySelector(s);
  const escapeHtml=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const formatDate=(v)=>v?new Date(v).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}):'Not dated';

  function message(text,type=''){
    const el=$('#atlas-update-message');if(!el)return;
    el.textContent=text;el.className=`pcf-member-message${type?` is-${type}`:''}`;
  }

  function renderSection(section){
    const paragraphs=(section.paragraphs||[]).map(p=>`<p>${escapeHtml(p)}</p>`).join('');
    const bullets=(section.bullets||[]).length?`<ul>${section.bullets.map(b=>`<li>${escapeHtml(b)}</li>`).join('')}</ul>`:'';
    const callout=section.callout?`<div class="atlas-callout">${escapeHtml(section.callout)}</div>`:'';
    return `<section class="atlas-content-section"><h2>${escapeHtml(section.heading||'Update Section')}</h2>${paragraphs}${bullets}${callout}</section>`;
  }

  async function downloadAsset(asset,button){
    const original=button.textContent;button.disabled=true;button.textContent='Preparing…';
    try{
      const {data,error}=await state.context.client.storage.from(BUCKET).download(asset.storage_path);
      if(error)throw error;
      const url=URL.createObjectURL(data);
      const a=document.createElement('a');a.href=url;a.download=asset.storage_path.split('/').pop();
      document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
      message(`${asset.label} downloaded.`,'success');
    }catch(error){console.error(error);message(error.message||'The private asset could not be downloaded.','error');}
    finally{button.disabled=false;button.textContent=original;}
  }

  async function renderAssets(){
    if(!state.assets.length)return;
    $('#atlas-assets').hidden=false;
    const cards=[];
    for(const asset of state.assets){
      if(asset.asset_kind==='photo'){
        const {data,error}=await state.context.client.storage.from(BUCKET).createSignedUrl(asset.storage_path,900);
        cards.push(`<article class="atlas-asset">${!error&&data?.signedUrl?`<img src="${escapeHtml(data.signedUrl)}" alt="${escapeHtml(asset.label)}">`:''}<span class="atlas-badge">Prototype photo</span><h3>${escapeHtml(asset.label)}</h3><p>${escapeHtml(asset.description)}</p></article>`);
      }else if(asset.asset_kind==='demo_link'){
        cards.push(`<article class="atlas-asset"><span class="atlas-badge">Early demonstration</span><h3>${escapeHtml(asset.label)}</h3><p>${escapeHtml(asset.description)}</p><a class="pcf-button secondary" href="${escapeHtml(asset.external_url)}" target="_blank" rel="noopener noreferrer">Open Demonstration</a></article>`);
      }else{
        cards.push(`<article class="atlas-asset"><span class="atlas-badge">Private document</span><h3>${escapeHtml(asset.label)}</h3><p>${escapeHtml(asset.description)}</p><button class="pcf-button secondary" type="button" data-asset-id="${asset.id}">Download Document</button></article>`);
      }
    }
    const grid=$('#atlas-asset-grid');grid.innerHTML=cards.join('');
    grid.querySelectorAll('[data-asset-id]').forEach(btn=>btn.addEventListener('click',()=>{
      const asset=state.assets.find(a=>a.id===btn.dataset.assetId);if(asset)downloadAsset(asset,btn);
    }));
  }

  async function initialize(context){
    if(initialized)return;initialized=true;state.context=context;
    const slug=new URLSearchParams(location.search).get('slug');
    if(!slug){message('No Atlas development update was selected.','error');return;}
    $('#atlas-print').addEventListener('click',()=>window.print());
    try{
      const {data:update,error}=await context.client.from('pcf_atlas_updates').select('*').eq('slug',slug).single();
      if(error)throw error;state.update=update;
      const {data:assets,error:assetError}=await context.client.from('pcf_atlas_assets').select('*').eq('update_id',update.id).order('sort_order');
      if(assetError)throw assetError;state.assets=assets||[];

      document.title=`${update.title} | Atlas Development`;
      $('#atlas-update-kicker').textContent=`${update.update_type} · ${update.phase}`;
      $('#atlas-update-title').textContent=update.title;
      $('#atlas-update-summary').textContent=update.summary;
      const meta=[formatDate(update.development_date||update.published_at),`${update.progress_percent||0}% reported progress`,String(update.milestone_status||'in-progress').replace(/-/g,' '),`By ${update.author_name||'Dom'}`];
      $('#atlas-update-meta').innerHTML=meta.map(v=>`<span class="atlas-chip">${escapeHtml(v)}</span>`).join('');
      const sections=Array.isArray(update.content_json)?update.content_json:[];
      $('#atlas-update-content').innerHTML=sections.map(renderSection).join('');
      await renderAssets();
      message('Atlas development update loaded.','success');
    }catch(error){console.error(error);message(error.message||'The Atlas update could not be loaded.','error');}
  }

  document.addEventListener('pcf:member-ready',e=>initialize(e.detail),{once:true});
  if(window.PCF_MEMBER_CONTEXT)initialize(window.PCF_MEMBER_CONTEXT);
})();