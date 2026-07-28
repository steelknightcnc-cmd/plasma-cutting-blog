(() => {
  'use strict';
  const BUCKET='member-article-downloads';
  const state={context:null,articles:[],currentId:null,attachments:[],sections:[]};
  const $=(s,r=document)=>r.querySelector(s);
  const escapeHtml=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const slugify=(v)=>String(v||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100);
  function message(text,type=''){const el=$('#pa-message');el.textContent=text;el.className=`pcf-member-message${type?` is-${type}`:''}`;}
  function emptyArticle(){return{id:null,title:'',slug:'',category:'Material Testing',report_type:'Technical Report',summary:'',public_teaser:'',status:'draft',reading_minutes:8,test_date:'',machine_name:'',material:'',thickness:'',amperage:'',test_count:0,key_findings_json:[],results_json:{columns:[],rows:[]},limitations:'',content_json:[{heading:'Overview',paragraphs:[''],bullets:[],callout:''}]};}
  function csvParse(text){
    const lines=String(text||'').split(/\r?\n/).filter(l=>l.trim());
    if(!lines.length)return{columns:[],rows:[]};
    const parseLine=(line)=>{const out=[];let cur='',quoted=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(quoted&&line[i+1]==='"'){cur+='"';i++;}else quoted=!quoted;}else if(ch===','&&!quoted){out.push(cur.trim());cur='';}else cur+=ch;}out.push(cur.trim());return out;};
    const columns=parseLine(lines[0]);return{columns,rows:lines.slice(1).map(parseLine)};
  }
  function csvString(data){const quote=v=>{const s=String(v??'');return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;};if(!data?.columns?.length)return'';return[data.columns.map(quote).join(','),...(data.rows||[]).map(r=>r.map(quote).join(','))].join('\n');}
  function sectionFromEditor(el){
    const heading=$('[data-section-heading]',el).value.trim();
    const body=$('[data-section-body]',el).value;
    const callout=$('[data-section-callout]',el).value.trim();
    const paragraphs=[],bullets=[];
    body.split(/\r?\n/).forEach(line=>{const value=line.trim();if(!value)return;if(value.startsWith('- '))bullets.push(value.slice(2).trim());else paragraphs.push(value);});
    return{heading,paragraphs,bullets,callout};
  }
  function renderSections(){
    const box=$('#pa-sections');
    box.innerHTML=state.sections.map((s,i)=>`
      <div class="ptr-section-editor" data-section-index="${i}">
        <div class="ptr-section-editor-top"><strong>Section ${i+1}</strong><button class="pcf-button secondary" type="button" data-remove-section="${i}">Remove</button></div>
        <label class="ptr-field"><span>Heading</span><input data-section-heading value="${escapeHtml(s.heading||'')}"></label>
        <label class="ptr-field"><span>Body - one paragraph per line; begin bullets with "- "</span><textarea data-section-body>${escapeHtml([...(s.paragraphs||[]),...(s.bullets||[]).map(v=>`- ${v}`)].join('\n'))}</textarea></label>
        <label class="ptr-field"><span>Optional callout</span><input data-section-callout value="${escapeHtml(s.callout||'')}"></label>
      </div>`).join('');
    box.querySelectorAll('[data-remove-section]').forEach(btn=>btn.addEventListener('click',()=>{collectSections();state.sections.splice(Number(btn.dataset.removeSection),1);renderSections();}));
  }
  function collectSections(){state.sections=Array.from($('#pa-sections').querySelectorAll('[data-section-index]')).map(sectionFromEditor);}
  function writeForm(a){
    state.currentId=a.id||null; state.sections=Array.isArray(a.content_json)?a.content_json:[];
    const ids={title:'pa-title',slug:'pa-slug',category:'pa-category',report_type:'pa-report-type',summary:'pa-summary',public_teaser:'pa-public-teaser',status:'pa-status',reading_minutes:'pa-reading-minutes',test_date:'pa-test-date',machine_name:'pa-machine',material:'pa-material',thickness:'pa-thickness',amperage:'pa-amperage',test_count:'pa-test-count',limitations:'pa-limitations'};
    Object.entries(ids).forEach(([key,id])=>{$(`#${id}`).value=a[key]??'';});
    $('#pa-findings').value=(a.key_findings_json||[]).join('\n');
    $('#pa-results').value=csvString(a.results_json);
    $('#pa-preview').href=a.slug?`/member-technical-report.html?slug=${encodeURIComponent(a.slug)}`:'#';
    renderSections();renderAttachments();
  }
  function collect(){
    collectSections();
    const title=$('#pa-title').value.trim();
    const slug=$('#pa-slug').value.trim()||slugify(title);
    return{
      ...(state.currentId?{id:state.currentId}:{}),title,slug,category:$('#pa-category').value,report_type:$('#pa-report-type').value.trim()||'Technical Report',
      summary:$('#pa-summary').value.trim(),public_teaser:$('#pa-public-teaser').value.trim(),status:$('#pa-status').value,
      reading_minutes:Number($('#pa-reading-minutes').value)||5,test_date:$('#pa-test-date').value||null,machine_name:$('#pa-machine').value.trim(),
      material:$('#pa-material').value.trim(),thickness:$('#pa-thickness').value.trim(),amperage:$('#pa-amperage').value.trim(),
      test_count:Number($('#pa-test-count').value)||0,key_findings_json:$('#pa-findings').value.split(/\r?\n/).map(v=>v.trim()).filter(Boolean),
      results_json:csvParse($('#pa-results').value),limitations:$('#pa-limitations').value.trim(),content_json:state.sections,
      published_at:$('#pa-status').value==='published'?new Date().toISOString():null
    };
  }
  function renderList(){
    $('#ptr-admin-list').innerHTML=state.articles.map(a=>`<button class="ptr-admin-item${a.id===state.currentId?' active':''}" type="button" data-id="${a.id}"><strong>${escapeHtml(a.title)}</strong><br><small>${escapeHtml(a.status)} · ${escapeHtml(a.category)}</small></button>`).join('');
    $('#ptr-admin-list').querySelectorAll('[data-id]').forEach(b=>b.addEventListener('click',()=>selectArticle(b.dataset.id)));
  }
  function renderAttachments(){
    const box=$('#pa-attachments');
    if(!state.attachments.length){box.innerHTML='<p>No private downloads attached.</p>';return;}
    box.innerHTML=state.attachments.map(d=>`<div class="ptr-attachment"><span><strong>${escapeHtml(d.label)}</strong><br><small>${escapeHtml(d.file_type)} · ${escapeHtml(d.storage_path)}</small></span><button class="pcf-button secondary" type="button" data-delete-download="${d.id}">Delete</button></div>`).join('');
    box.querySelectorAll('[data-delete-download]').forEach(b=>b.addEventListener('click',()=>deleteAttachment(b.dataset.deleteDownload)));
  }
  async function loadArticles(){
    const {data,error}=await state.context.client.from('pcf_premium_articles').select('*').order('updated_at',{ascending:false});if(error)throw error;
    state.articles=data||[];renderList();
  }
  async function loadAttachments(){
    if(!state.currentId){state.attachments=[];renderAttachments();return;}
    const {data,error}=await state.context.client.from('pcf_premium_article_downloads').select('*').eq('article_id',state.currentId).order('sort_order');if(error)throw error;
    state.attachments=data||[];renderAttachments();
  }
  async function selectArticle(id){
    const a=state.articles.find(v=>v.id===id);if(!a)return;writeForm(a);renderList();await loadAttachments();
  }
  async function save(){
    const payload=collect();if(!payload.title||!payload.slug){message('Title and slug are required.','error');return;}
    try{
      let result;
      if(state.currentId) result=await state.context.client.from('pcf_premium_articles').update(payload).eq('id',state.currentId).select().single();
      else result=await state.context.client.from('pcf_premium_articles').insert(payload).select().single();
      if(result.error)throw result.error;
      state.currentId=result.data.id;message('Technical report saved.','success');await loadArticles();await selectArticle(state.currentId);
    }catch(error){console.error(error);message(error.message||'Report could not be saved.','error');}
  }
  async function removeArticle(){
    if(!state.currentId||!confirm('Delete this technical report and its download records?'))return;
    try{const{error}=await state.context.client.from('pcf_premium_articles').delete().eq('id',state.currentId);if(error)throw error;writeForm(emptyArticle());await loadArticles();message('Report deleted.','success');}
    catch(error){console.error(error);message(error.message||'Report could not be deleted.','error');}
  }
  async function uploadFiles(files){
    if(!state.currentId){message('Save the report before uploading files.','error');return;}
    for(const file of files){
      const safe=file.name.toLowerCase().replace(/[^a-z0-9._-]+/g,'-');
      const path=`${state.currentId}/${Date.now()}-${safe}`;
      const{error:upError}=await state.context.client.storage.from(BUCKET).upload(path,file,{upsert:false,contentType:file.type||undefined});if(upError)throw upError;
      const ext=(safe.split('.').pop()||'FILE').toUpperCase();
      const{error:rowError}=await state.context.client.from('pcf_premium_article_downloads').insert({article_id:state.currentId,label:file.name.replace(/\.[^.]+$/,''),description:'Private testing download.',storage_path:path,file_type:ext,sort_order:state.attachments.length+1});if(rowError)throw rowError;
    }
    await loadAttachments();message('Private download file uploaded.','success');
  }
  async function deleteAttachment(id){
    const item=state.attachments.find(v=>v.id===id);if(!item||!confirm(`Delete ${item.label}?`))return;
    try{const{error:storageError}=await state.context.client.storage.from(BUCKET).remove([item.storage_path]);if(storageError)throw storageError;const{error}=await state.context.client.from('pcf_premium_article_downloads').delete().eq('id',id);if(error)throw error;await loadAttachments();message('Attachment deleted.','success');}
    catch(error){console.error(error);message(error.message||'Attachment could not be deleted.','error');}
  }
  function bind(){
    $('#ptr-new-article').addEventListener('click',()=>{writeForm(emptyArticle());renderList();});
    $('#pa-title').addEventListener('input',()=>{if(!state.currentId&&!$('#pa-slug').value)$('#pa-slug').value=slugify($('#pa-title').value);});
    $('#pa-add-section').addEventListener('click',()=>{collectSections();state.sections.push({heading:'New Section',paragraphs:[''],bullets:[],callout:''});renderSections();});
    $('#pa-save').addEventListener('click',save);$('#pa-delete').addEventListener('click',removeArticle);
    $('#pa-files').addEventListener('change',async e=>{try{await uploadFiles(Array.from(e.target.files||[]));}catch(error){console.error(error);message(error.message||'Upload failed.','error');}finally{e.target.value='';}});
  }
  async function initialize(context){
    state.context=context;
    const{data:isAdmin,error}=await context.client.rpc('pcf_is_site_admin');
    if(error||!isAdmin){$('#ptr-admin-tool').hidden=true;$('#ptr-admin-denied').hidden=false;return;}
    bind();writeForm(emptyArticle());
    try{await loadArticles();message('Owner publishing workspace ready.','success');}
    catch(error2){console.error(error2);message(error2.message||'Admin records could not be loaded.','error');}
  }
  document.addEventListener('pcf:member-ready',e=>initialize(e.detail),{once:true});
  if(window.PCF_MEMBER_CONTEXT)initialize(window.PCF_MEMBER_CONTEXT);
})();
