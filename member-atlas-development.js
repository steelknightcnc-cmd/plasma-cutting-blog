(() => {
  'use strict';
  let initialized = false;
  const state = { context:null, updates:[], polls:[], type:'All', search:'' };
  const $ = (s,r=document)=>r.querySelector(s);
  const escapeHtml = (v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const formatDate = (v)=>v?new Date(v).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'}):'Not dated';

  function message(text,type=''){
    const el=$('#atlas-message'); if(!el)return;
    el.textContent=text; el.className=`pcf-member-message${type?` is-${type}`:''}`;
  }

  function types(){
    return ['All',...Array.from(new Set(state.updates.map(u=>u.update_type).filter(Boolean))).sort()];
  }

  function renderFilters(){
    const box=$('#atlas-filters');
    box.innerHTML=types().map(t=>`<button class="atlas-filter${t===state.type?' active':''}" type="button" data-type="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join('');
    box.querySelectorAll('[data-type]').forEach(btn=>btn.addEventListener('click',()=>{
      state.type=btn.dataset.type; renderFilters(); renderUpdates();
    }));
  }

  function visibleUpdates(){
    const q=state.search.trim().toLowerCase();
    return state.updates.filter(u=>{
      const typeMatch=state.type==='All'||u.update_type===state.type;
      const text=`${u.title} ${u.summary} ${u.phase} ${u.update_type} ${u.milestone_status}`.toLowerCase();
      return typeMatch&&(!q||text.includes(q));
    });
  }

  function statusLabel(value){
    return String(value||'in-progress').replace(/-/g,' ');
  }

  function renderUpdates(){
    const rows=visibleUpdates();
    $('#atlas-count').textContent=`${rows.length} development update${rows.length===1?'':'s'} shown`;
    const grid=$('#atlas-grid');
    if(!rows.length){
      grid.innerHTML='<p class="atlas-empty">No Atlas development updates match this search or filter.</p>';
      return;
    }
    grid.innerHTML=rows.map(u=>`
      <article class="atlas-card">
        <div class="atlas-card-top">
          <span class="atlas-badge">${escapeHtml(u.update_type)}</span>
          <span class="atlas-badge atlas-status-${escapeHtml(u.milestone_status)}">${escapeHtml(statusLabel(u.milestone_status))}</span>
        </div>
        <h3>${escapeHtml(u.title)}</h3>
        <p>${escapeHtml(u.summary)}</p>
        <div class="atlas-meta">
          <span>${escapeHtml(u.phase)}</span>
          <span>${Number(u.progress_percent)||0}% progress</span>
          <span>${formatDate(u.development_date||u.published_at)}</span>
        </div>
        <div class="atlas-progress"><span style="width:${Math.max(0,Math.min(100,Number(u.progress_percent)||0))}%"></span></div>
        <a class="pcf-button" href="/member-atlas-update.html?slug=${encodeURIComponent(u.slug)}">Open Update</a>
      </article>`).join('');
  }

  async function loadPollResults(pollId){
    const {data,error}=await state.context.client.rpc('pcf_atlas_poll_results',{p_poll_id:pollId});
    if(error)throw error;
    return data||[];
  }

  async function castVote(pollId, optionId, button){
    const original=button.textContent;
    button.disabled=true; button.textContent='Saving vote…';
    try{
      const {error}=await state.context.client.rpc('pcf_cast_atlas_vote',{p_poll_id:pollId,p_option_id:optionId});
      if(error)throw error;
      const poll=state.polls.find(p=>p.id===pollId);
      if(poll)poll.results=await loadPollResults(pollId);
      renderPolls();
      message('Your Atlas member vote was saved.','success');
    }catch(error){
      console.error(error); message(error.message||'The vote could not be saved.','error');
    }finally{button.disabled=false;button.textContent=original;}
  }

  function renderPolls(){
    const box=$('#atlas-polls');
    if(!state.polls.length){
      box.innerHTML='<p class="atlas-empty">No Atlas member polls are currently published.</p>';
      return;
    }
    box.innerHTML=state.polls.map(p=>{
      const closed=p.status!=='open'||(p.closes_at&&new Date(p.closes_at)<=new Date());
      const total=(p.results||[]).reduce((sum,r)=>sum+Number(r.vote_count||0),0);
      return `<article class="atlas-poll">
        <span class="atlas-badge">${closed?'Closed':'Open poll'}</span>
        <h3>${escapeHtml(p.question)}</h3>
        <p>${escapeHtml(p.description)}</p>
        <div>${(p.results||[]).map(r=>`
          <div class="atlas-option${r.user_selected?' selected':''}">
            <button type="button" data-vote-poll="${p.id}" data-vote-option="${r.option_id}" ${closed?'disabled':''}>${escapeHtml(r.option_text)}</button>
            <strong>${Number(r.vote_percent||0).toFixed(1)}%</strong>
            <span>${Number(r.vote_count||0)} vote${Number(r.vote_count||0)===1?'':'s'}</span>
            <div class="atlas-option-bar"><span style="width:${Math.max(0,Math.min(100,Number(r.vote_percent)||0))}%"></span></div>
          </div>`).join('')}</div>
        <p class="atlas-meta">${total} total vote${total===1?'':'s'}${p.closes_at?` · closes ${formatDate(p.closes_at)}`:''}</p>
      </article>`;
    }).join('');
    box.querySelectorAll('[data-vote-option]').forEach(btn=>btn.addEventListener('click',()=>castVote(btn.dataset.votePoll,btn.dataset.voteOption,btn)));
  }

  async function initialize(context){
    if(initialized)return; initialized=true; state.context=context;
    $('#atlas-search').addEventListener('input',e=>{state.search=e.target.value;renderUpdates();});
    try{
      const {data:updates,error}=await context.client.from('pcf_atlas_updates')
        .select('id,slug,title,update_type,phase,milestone_status,progress_percent,summary,featured,development_date,published_at')
        .eq('status','published').order('featured',{ascending:false}).order('published_at',{ascending:false});
      if(error)throw error;
      state.updates=updates||[];

      const {data:polls,error:pollError}=await context.client.from('pcf_atlas_polls')
        .select('*').in('status',['open','closed']).order('created_at',{ascending:false});
      if(pollError)throw pollError;
      state.polls=polls||[];
      for(const poll of state.polls)poll.results=await loadPollResults(poll.id);

      const featured=state.updates.find(u=>u.featured)||state.updates[0];
      $('#atlas-phase').textContent=featured?.phase||'Architecture & Requirements';
      const progress=Number(featured?.progress_percent)||0;
      $('#atlas-progress-value').textContent=`${progress}%`;
      $('#atlas-progress-bar').style.width=`${Math.max(0,Math.min(100,progress))}%`;
      $('#atlas-update-count').textContent=String(state.updates.length);
      $('#atlas-open-polls').textContent=String(state.polls.filter(p=>p.status==='open'&&(!p.closes_at||new Date(p.closes_at)>new Date())).length);

      const {data:isAdmin}=await context.client.rpc('pcf_is_site_admin');
      if(isAdmin)$('#atlas-admin-link').style.display='inline-flex';

      renderFilters(); renderUpdates(); renderPolls();
      message('Atlas member development access ready.','success');
    }catch(error){
      console.error(error); message(error.message||'Atlas development access could not be loaded.','error');
    }
  }

  document.addEventListener('pcf:member-ready',e=>initialize(e.detail),{once:true});
  if(window.PCF_MEMBER_CONTEXT)initialize(window.PCF_MEMBER_CONTEXT);
})();