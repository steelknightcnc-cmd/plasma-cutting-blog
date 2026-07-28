(() => {
  'use strict';
  const BUCKET='atlas-member-assets';
  let initialized=false;
  const state={context:null,tab:'updates',updates:[],polls:[],currentUpdateId:null,currentPollId:null,sections:[],assets:[]};
  const $=(s,r=document)=>r.querySelector(s);
  const escapeHtml=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const slugify=(v)=>String(v||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100);
  const toLocalInput=(v)=>v?new Date(new Date(v).getTime()-new Date(v).getTimezoneOffset()*60000).toISOString().slice(0,16):'';
  const fromLocalInput=(v)=>v?new Date(v).toISOString():null;

  function msg(id,text,type=''){
    const el=$(id);if(!el)return;el.textContent=text;el.className=`pcf-member-message${type?` is-${type}`:''}`;
  }
  function emptyUpdate(){return{id:null,title:'',slug:'',update_type:'Development Log',phase:'Architecture & Requirements',milestone_status:'in-progress',progress_percent:0,summary:'',status:'draft',featured:false,development_date:'',content_json:[{heading:'Overview',paragraphs:[''],bullets:[],callout:''}]};}
  function emptyPoll(){return{id:null,question:'',description:'',status:'draft',opens_at:'',closes_at:'',options:[]};}
  function sectionFromEditor(el){
    const heading=$('[data-heading]',el).value.trim();
    const body=$('[data-body]',el).value;
    const callout=$('[data-callout]',el).value.trim();
    const paragraphs=[],bullets=[];
    body.split(/\r?\n/).forEach(line=>{const v=line.trim();if(!v)return;if(v.startsWith('- '))bullets.push(v.slice(2).trim());else paragraphs.push(v);});
    return{heading,paragraphs,bullets,callout};
  }
  function collectSections(){state.sections=Array.from($('#aa-sections').querySelectorAll('[data-index]')).map(sectionFromEditor);}
  function renderSections(){
    $('#aa-sections').innerHTML=state.sections.map((s,i)=>`<div class="atlas-section-editor" data-index="${i}">
      <div class="atlas-section-editor-top"><strong>Section ${i+1}</strong><button class="pcf-button secondary" type="button" data-remove="${i}">Remove</button></div>
      <label class="atlas-field"><span>Heading</span><input data-heading value="${escapeHtml(s.heading||'')}"></label>
      <label class="atlas-field"><span>Body - one paragraph per line; begin bullets with "- "</span><textarea data-body>${escapeHtml([...(s.paragraphs||[]),...(s.bullets||[]).map(v=>`- ${v}`)].join('\n'))}</textarea></label>
      <label class="atlas-field"><span>Optional callout</span><input data-callout value="${escapeHtml(s.callout||'')}"></label>
    </div>`).join('');
    $('#aa-sections').querySelectorAll('[data-remove]').forEach(btn=>btn.addEventListener('click',()=>{collectSections();state.sections.splice(Number(btn.dataset.remove),1);renderSections();}));
  }
  function writeUpdate(u){
    state.currentUpdateId=u.id||null;state.sections=Array.isArray(u.content_json)?u.content_json:[];
    $('#aa-title').value=u.title||'';$('#aa-slug').value=u.slug||'';$('#aa-type').value=u.update_type||'Development Log';
    $('#aa-phase').value=u.phase||'';$('#aa-milestone').value=u.milestone_status||'in-progress';$('#aa-progress').value=u.progress_percent||0;
    $('#aa-date').value=u.development_date||'';$('#aa-status').value=u.status||'draft';$('#aa-featured').value=String(Boolean(u.featured));
    $('#aa-summary').value=u.summary||'';$('#aa-preview').href=u.slug?`/member-atlas-update.html?slug=${encodeURIComponent(u.slug)}`:'#';
    renderSections();loadAssets();
  }
  function collectUpdate(){
    collectSections();const title=$('#aa-title').value.trim();
    return{...(state.currentUpdateId?{id:state.currentUpdateId}:{}),title,slug:$('#aa-slug').value.trim()||slugify(title),update_type:$('#aa-type').value,phase:$('#aa-phase').value.trim(),milestone_status:$('#aa-milestone').value,progress_percent:Number($('#aa-progress').value)||0,development_date:$('#aa-date').value||null,status:$('#aa-status').value,featured:$('#aa-featured').value==='true',summary:$('#aa-summary').value.trim(),content_json:state.sections,published_at:$('#aa-status').value==='published'?new Date().toISOString():null};
  }
  function writePoll(p){
    state.currentPollId=p.id||null;$('#ap-question').value=p.question||'';$('#ap-description').value=p.description||'';$('#ap-status').value=p.status||'draft';$('#ap-opens').value=toLocalInput(p.opens_at);$('#ap-closes').value=toLocalInput(p.closes_at);$('#ap-options').value=(p.options||[]).map(o=>o.option_text||o).join('\n');
  }
  function collectPoll(){return{question:$('#ap-question').value.trim(),description:$('#ap-description').value.trim(),status:$('#ap-status').value,opens_at:fromLocalInput($('#ap-opens').value),closes_at:fromLocalInput($('#ap-closes').value)};}
  function switchTab(tab){
    state.tab=tab;document.querySelectorAll('[data-atlas-tab]').forEach(b=>b.classList.toggle('active',b.dataset.atlasTab===tab));
    $('#atlas-update-editor').hidden=tab!=='updates';$('#atlas-poll-editor').hidden=tab!=='polls';
    $('#atlas-new-record').textContent=tab==='updates'?'New Update':'New Poll';renderList();
  }
  function renderList(){
    const rows=state.tab==='updates'?state.updates:state.polls;
    $('#atlas-admin-list').innerHTML=rows.map(r=>`<button class="atlas-admin-item${(state.tab==='updates'?r.id===state.currentUpdateId:r.id===state.currentPollId)?' active':''}" type="button" data-id="${r.id}"><strong>${escapeHtml(state.tab==='updates'?r.title:r.question)}</strong><br><small>${escapeHtml(r.status)}${state.tab==='updates'?` · ${escapeHtml(r.update_type)}`:''}</small></button>`).join('');
    $('#atlas-admin-list').querySelectorAll('[data-id]').forEach(btn=>btn.addEventListener('click',()=>state.tab==='updates'?selectUpdate(btn.dataset.id):selectPoll(btn.dataset.id)));
  }
  async function loadAll(){
    const {data:updates,error}=await state.context.client.from('pcf_atlas_updates').select('*').order('updated_at',{ascending:false});if(error)throw error;state.updates=updates||[];
    const {data:polls,error:pollError}=await state.context.client.from('pcf_atlas_polls').select('*').order('updated_at',{ascending:false});if(pollError)throw pollError;
    for(const p of polls||[]){const {data:options}=await state.context.client.from('pcf_atlas_poll_options').select('*').eq('poll_id',p.id).order('sort_order');p.options=options||[];}
    state.polls=polls||[];renderList();
  }
  async function selectUpdate(id){const u=state.updates.find(v=>v.id===id);if(!u)return;writeUpdate(u);renderList();}
  async function selectPoll(id){const p=state.polls.find(v=>v.id===id);if(!p)return;writePoll(p);renderList();}
  async function saveUpdate(){
    const payload=collectUpdate();if(!payload.title||!payload.slug){msg('#aa-message','Title and slug are required.','error');return;}
    try{
      let result=state.currentUpdateId?await state.context.client.from('pcf_atlas_updates').update(payload).eq('id',state.currentUpdateId).select().single():await state.context.client.from('pcf_atlas_updates').insert(payload).select().single();
      if(result.error)throw result.error;state.currentUpdateId=result.data.id;await loadAll();await selectUpdate(state.currentUpdateId);msg('#aa-message','Atlas update saved.','success');
    }catch(error){console.error(error);msg('#aa-message',error.message||'Update could not be saved.','error');}
  }
  async function deleteUpdate(){
    if(!state.currentUpdateId||!confirm('Delete this Atlas update and its attached asset records?'))return;
    try{const{error}=await state.context.client.from('pcf_atlas_updates').delete().eq('id',state.currentUpdateId);if(error)throw error;writeUpdate(emptyUpdate());await loadAll();msg('#aa-message','Atlas update deleted.','success');}
    catch(error){console.error(error);msg('#aa-message',error.message||'Update could not be deleted.','error');}
  }
  async function loadAssets(){
    if(!state.currentUpdateId){state.assets=[];renderAssets();return;}
    const{data,error}=await state.context.client.from('pcf_atlas_assets').select('*').eq('update_id',state.currentUpdateId).order('sort_order');if(error){msg('#aa-message',error.message,'error');return;}state.assets=data||[];renderAssets();
  }
  function renderAssets(){
    $('#aa-assets').innerHTML=state.assets.length?state.assets.map(a=>`<div class="atlas-attachment"><span><strong>${escapeHtml(a.label)}</strong><br><small>${escapeHtml(a.asset_kind)} · ${escapeHtml(a.storage_path||a.external_url||'')}</small></span><button class="pcf-button secondary" type="button" data-delete-asset="${a.id}">Delete</button></div>`).join(''):'<p>No assets attached.</p>';
    $('#aa-assets').querySelectorAll('[data-delete-asset]').forEach(btn=>btn.addEventListener('click',()=>deleteAsset(btn.dataset.deleteAsset)));
  }
  async function uploadFiles(files){
    if(!state.currentUpdateId){msg('#aa-message','Save the update before uploading files.','error');return;}
    for(const file of files){
      const safe=file.name.toLowerCase().replace(/[^a-z0-9._-]+/g,'-');const path=`${state.currentUpdateId}/${Date.now()}-${safe}`;
      const{error:upError}=await state.context.client.storage.from(BUCKET).upload(path,file,{upsert:false,contentType:file.type||undefined});if(upError)throw upError;
      const kind=file.type.startsWith('image/')?'photo':'document';
      const{error:rowError}=await state.context.client.from('pcf_atlas_assets').insert({update_id:state.currentUpdateId,asset_kind:kind,label:file.name.replace(/\.[^.]+$/,''),description:kind==='photo'?'Private prototype or development photograph.':'Private Atlas development document.',storage_path:path,mime_type:file.type||null,sort_order:state.assets.length+1});if(rowError)throw rowError;
    }
    await loadAssets();msg('#aa-message','Atlas asset uploaded.','success');
  }
  async function addDemo(){
    if(!state.currentUpdateId){msg('#aa-message','Save the update before adding a demonstration link.','error');return;}
    const label=$('#aa-demo-label').value.trim(),url=$('#aa-demo-url').value.trim();if(!label||!url){msg('#aa-message','Demo label and URL are required.','error');return;}
    try{const{error}=await state.context.client.from('pcf_atlas_assets').insert({update_id:state.currentUpdateId,asset_kind:'demo_link',label,description:'Early Atlas development demonstration.',external_url:url,sort_order:state.assets.length+1});if(error)throw error;$('#aa-demo-label').value='';$('#aa-demo-url').value='';await loadAssets();msg('#aa-message','Demonstration link added.','success');}
    catch(error){console.error(error);msg('#aa-message',error.message||'Demo link could not be added.','error');}
  }
  async function deleteAsset(id){
    const asset=state.assets.find(a=>a.id===id);if(!asset||!confirm(`Delete ${asset.label}?`))return;
    try{if(asset.storage_path){const{error:se}=await state.context.client.storage.from(BUCKET).remove([asset.storage_path]);if(se)throw se;}const{error}=await state.context.client.from('pcf_atlas_assets').delete().eq('id',id);if(error)throw error;await loadAssets();msg('#aa-message','Asset deleted.','success');}
    catch(error){console.error(error);msg('#aa-message',error.message||'Asset could not be deleted.','error');}
  }
  async function savePoll(){
    const payload=collectPoll();const options=$('#ap-options').value.split(/\r?\n/).map(v=>v.trim()).filter(Boolean);
    if(!payload.question||options.length<2){msg('#ap-message','A question and at least two options are required.','error');return;}
    try{
      let pollResult=state.currentPollId?await state.context.client.from('pcf_atlas_polls').update(payload).eq('id',state.currentPollId).select().single():await state.context.client.from('pcf_atlas_polls').insert(payload).select().single();
      if(pollResult.error)throw pollResult.error;state.currentPollId=pollResult.data.id;
      const{error:deleteError}=await state.context.client.from('pcf_atlas_poll_options').delete().eq('poll_id',state.currentPollId);if(deleteError)throw deleteError;
      const rows=options.map((option_text,index)=>({poll_id:state.currentPollId,option_text,sort_order:index+1}));
      const{error:insertError}=await state.context.client.from('pcf_atlas_poll_options').insert(rows);if(insertError)throw insertError;
      await loadAll();await selectPoll(state.currentPollId);msg('#ap-message','Atlas member poll saved.','success');
    }catch(error){console.error(error);msg('#ap-message',error.message||'Poll could not be saved.','error');}
  }
  async function deletePoll(){
    if(!state.currentPollId||!confirm('Delete this poll and all votes?'))return;
    try{const{error}=await state.context.client.from('pcf_atlas_polls').delete().eq('id',state.currentPollId);if(error)throw error;writePoll(emptyPoll());await loadAll();msg('#ap-message','Poll deleted.','success');}
    catch(error){console.error(error);msg('#ap-message',error.message||'Poll could not be deleted.','error');}
  }
  function bind(){
    document.querySelectorAll('[data-atlas-tab]').forEach(btn=>btn.addEventListener('click',()=>switchTab(btn.dataset.atlasTab)));
    $('#atlas-new-record').addEventListener('click',()=>{if(state.tab==='updates'){writeUpdate(emptyUpdate());}else{writePoll(emptyPoll());}renderList();});
    $('#aa-title').addEventListener('input',()=>{if(!state.currentUpdateId&&!$('#aa-slug').value)$('#aa-slug').value=slugify($('#aa-title').value);});
    $('#aa-add-section').addEventListener('click',()=>{collectSections();state.sections.push({heading:'New Section',paragraphs:[''],bullets:[],callout:''});renderSections();});
    $('#aa-save').addEventListener('click',saveUpdate);$('#aa-delete').addEventListener('click',deleteUpdate);$('#aa-add-demo').addEventListener('click',addDemo);
    $('#aa-files').addEventListener('change',async e=>{try{await uploadFiles(Array.from(e.target.files||[]));}catch(error){console.error(error);msg('#aa-message',error.message||'Upload failed.','error');}finally{e.target.value='';}});
    $('#ap-save').addEventListener('click',savePoll);$('#ap-delete').addEventListener('click',deletePoll);
  }
  async function initialize(context){
    if(initialized)return;initialized=true;state.context=context;
    const{data:isAdmin,error}=await context.client.rpc('pcf_is_site_admin');
    if(error||!isAdmin){$('#atlas-admin-tool').hidden=true;$('#atlas-admin-denied').hidden=false;return;}
    bind();writeUpdate(emptyUpdate());writePoll(emptyPoll());
    try{await loadAll();msg('#aa-message','Atlas owner publishing workspace ready.','success');}
    catch(error2){console.error(error2);msg('#aa-message',error2.message||'Atlas admin records could not be loaded.','error');}
  }
  document.addEventListener('pcf:member-ready',e=>initialize(e.detail),{once:true});
  if(window.PCF_MEMBER_CONTEXT)initialize(window.PCF_MEMBER_CONTEXT);
})();