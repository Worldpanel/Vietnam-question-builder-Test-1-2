
(function(){
  // --- State ---
  const state = {
    meta: { title: 'Proctored Test', durationMin: 48 },
    questions: []
  };

  // --- DOM helpers ---
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const cardsEl = $('#cards');

  // --- ID generator ---
  const uid = (p='q') => `${p}_${Math.random().toString(36).slice(2,8)}${Date.now().toString(36).slice(-3)}`;

  // --- Templating ---
  const cloneTpl = id => document.getElementById(id).content.firstElementChild.cloneNode(true);

  // --- Meta bindings ---
  const metaTitle = $('#metaTitle');
  const metaDuration = $('#metaDuration');
  metaTitle.addEventListener('input', () => state.meta.title = metaTitle.value.trim() || '');
  metaDuration.addEventListener('input', () => state.meta.durationMin = Math.max(1, parseInt(metaDuration.value||'48',10)) );

  // --- Add question factories ---
  function addMcq(data){
    const q = Object.assign({ id: uid('mcq'), type: 'mcq', prompt:'', required:false, options:['Option A','Option B'], image:null }, data||{});
    state.questions.push(q); render(); scrollToEnd(); return q;
  }
  function addMatrix(data){
    const q = Object.assign({ id: uid('matrix'), type: 'matrix', prompt:'', required:false, columns:['1','2','3','4','5'], rows:['Row 1','Row 2','Row 3'], image:null }, data||{});
    state.questions.push(q); render(); scrollToEnd(); return q;
  }
  function addGroup(data){
    const q = Object.assign({ id: uid('group'), type:'group', prompt:'', required:false, image:null, items:[{ id: uid('sub'), type:'mcq', prompt:'Sub question', options:['A','B','C','D'] }] }, data||{});
    state.questions.push(q); render(); scrollToEnd(); return q;
  }
  function addShort(data){
    const q = Object.assign({ id: uid('short'), type:'short', prompt:'', required:false, maxLength:200 }, data||{});
    state.questions.push(q); render(); scrollToEnd(); return q;
  }
  function addParagraph(data){
    const q = Object.assign({ id: uid('paragraph'), type:'paragraph', prompt:'', required:false, maxLength:800 }, data||{});
    state.questions.push(q); render(); scrollToEnd(); return q;
  }

  // --- Render ---
  function render(){
    cardsEl.innerHTML = '';
    metaTitle.value = state.meta.title || '';
    metaDuration.value = state.meta.durationMin || 48;

    state.questions.forEach((q, idx)=>{
      let card;
      if(q.type==='mcq') card = renderMcq(q, idx);
      else if(q.type==='matrix') card = renderMatrix(q, idx);
      else if(q.type==='group') card = renderGroup(q, idx);
      else if(q.type==='short') card = renderShort(q, idx);
      else if(q.type==='paragraph') card = renderParagraph(q, idx);
      if(card) cardsEl.appendChild(card);
    });
  }

  function headerWiring(card, q, idx){
    // move up/down
    card.querySelector('.icon.up').addEventListener('click', ()=>{ move(idx, -1); });
    card.querySelector('.icon.down').addEventListener('click', ()=>{ move(idx, +1); });
    // duplicate
    card.querySelector('.duplicate').addEventListener('click', ()=>{ duplicate(idx); });
    // delete
    card.querySelector('.delete').addEventListener('click', ()=>{ del(idx); });
    return card;
  }

  function renderMcq(q, idx){
    const card = cloneTpl('tpl-mcq');
    headerWiring(card, q, idx);
    const prompt = card.querySelector('.q-prompt');
    const required = card.querySelector('.q-required');
    const list = card.querySelector('.options-list');
    const addBtn = card.querySelector('.add-option');
    const imgInput = card.querySelector('.q-image');
    const imgPreview = card.querySelector('.q-image-preview');

    prompt.value = q.prompt || '';
    required.checked = !!q.required;
    prompt.addEventListener('input', ()=>{ q.prompt = prompt.value; saveDraftLocal(); });
    required.addEventListener('change', ()=>{ q.required = required.checked; saveDraftLocal(); });

    function paintOptions(){
      list.innerHTML = '';
      q.options = q.options || [];
      q.options.forEach((opt, i)=>{
        const row = cloneTpl('tpl-option');
        const input = row.querySelector('.opt-input');
        const remove = row.querySelector('.remove');
        input.value = opt;
        input.addEventListener('input', ()=>{ q.options[i] = input.value; saveDraftLocal(); });
        remove.addEventListener('click', ()=>{ q.options.splice(i,1); paintOptions(); saveDraftLocal(); });
        list.appendChild(row);
      });
    }
    paintOptions();
    addBtn.addEventListener('click', ()=>{ q.options.push(`Option ${String.fromCharCode(65 + (q.options.length||0))}`); paintOptions(); saveDraftLocal(); });

    // image
    if(q.image){ imgPreview.src = q.image; imgPreview.style.display = 'block'; }
    imgInput.addEventListener('change', async (e)=>{
      const file = e.target.files && e.target.files[0];
      if(!file) return;
      const dataUrl = await fileToDataURL(file);
      q.image = dataUrl; imgPreview.src = dataUrl; imgPreview.style.display = 'block'; saveDraftLocal();
    });

    return card;
  }

  function renderMatrix(q, idx){
    const card = cloneTpl('tpl-matrix');
    headerWiring(card, q, idx);
    const prompt = card.querySelector('.q-prompt');
    const required = card.querySelector('.q-required');
    const colList = card.querySelector('.col-list');
    const rowList = card.querySelector('.row-list');
    const addCol = card.querySelector('.add-col');
    const addRow = card.querySelector('.add-row');
    const imgInput = card.querySelector('.q-image');
    const imgPreview = card.querySelector('.q-image-preview');

    prompt.value = q.prompt || '';
    required.checked = !!q.required;
    prompt.addEventListener('input', ()=>{ q.prompt = prompt.value; saveDraftLocal(); });
    required.addEventListener('change', ()=>{ q.required = required.checked; saveDraftLocal(); });

    function paintCols(){
      colList.innerHTML = '';
      q.columns = q.columns || [];
      q.columns.forEach((c, i)=>{
        const row = cloneTpl('tpl-col');
        const input = row.querySelector('.col-input');
        const remove = row.querySelector('.remove');
        input.value = c;
        input.addEventListener('input', ()=>{ q.columns[i] = input.value; saveDraftLocal(); });
        remove.addEventListener('click', ()=>{ q.columns.splice(i,1); paintCols(); saveDraftLocal(); });
        colList.appendChild(row);
      });
    }
    function paintRows(){
      rowList.innerHTML = '';
      q.rows = q.rows || [];
      q.rows.forEach((r, i)=>{
        const row = cloneTpl('tpl-row');
        const input = row.querySelector('.row-input');
        const remove = row.querySelector('.remove');
        input.value = r;
        input.addEventListener('input', ()=>{ q.rows[i] = input.value; saveDraftLocal(); });
        remove.addEventListener('click', ()=>{ q.rows.splice(i,1); paintRows(); saveDraftLocal(); });
        rowList.appendChild(row);
      });
    }
    paintCols(); paintRows();
    addCol.addEventListener('click', ()=>{ q.columns.push(`C${(q.columns.length||0)+1}`); paintCols(); saveDraftLocal(); });
    addRow.addEventListener('click', ()=>{ q.rows.push(`Row ${(q.rows.length||0)+1}`); paintRows(); saveDraftLocal(); });

    // image
    if(q.image){ imgPreview.src = q.image; imgPreview.style.display = 'block'; }
    imgInput.addEventListener('change', async (e)=>{
      const file = e.target.files && e.target.files[0];
      if(!file) return;
      const dataUrl = await fileToDataURL(file);
      q.image = dataUrl; imgPreview.src = dataUrl; imgPreview.style.display = 'block'; saveDraftLocal();
    });

    return card;
  }

  function renderGroup(q, idx){
    const card = cloneTpl('tpl-group');
    headerWiring(card, q, idx);
    const prompt = card.querySelector('.q-prompt');
    const required = card.querySelector('.q-required');
    const subList = card.querySelector('.subq-list');
    const addSub = card.querySelector('.add-subq');
    const imgInput = card.querySelector('.q-image');
    const imgPreview = card.querySelector('.q-image-preview');

    prompt.value = q.prompt || '';
    required.checked = !!q.required;
    prompt.addEventListener('input', ()=>{ q.prompt = prompt.value; saveDraftLocal(); });
    required.addEventListener('change', ()=>{ q.required = required.checked; saveDraftLocal(); });

    function paintSubQs(){
      subList.innerHTML = '';
      q.items = q.items || [];
      q.items.forEach((sub, si)=>{
        const row = cloneTpl('tpl-subq');
        const prompt = row.querySelector('.subq-prompt');
        const list = row.querySelector('.options-list');
        const addOpt = row.querySelector('.add-option');
        const remove = row.querySelector('.remove');

        prompt.value = sub.prompt || '';
        prompt.addEventListener('input', ()=>{ sub.prompt = prompt.value; saveDraftLocal(); });
        function paintOpts(){
          list.innerHTML = '';
          sub.options = sub.options || [];
          sub.options.forEach((opt, oi)=>{
            const orow = cloneTpl('tpl-option');
            const input = orow.querySelector('.opt-input');
            const rem = orow.querySelector('.remove');
            input.value = opt;
            input.addEventListener('input', ()=>{ sub.options[oi] = input.value; saveDraftLocal(); });
            rem.addEventListener('click', ()=>{ sub.options.splice(oi,1); paintOpts(); saveDraftLocal(); });
            list.appendChild(orow);
          });
        }
        paintOpts();
        addOpt.addEventListener('click', ()=>{ sub.options.push(`Option ${(sub.options.length||0)+1}`); paintOpts(); saveDraftLocal(); });
        remove.addEventListener('click', ()=>{ q.items.splice(si,1); paintSubQs(); saveDraftLocal(); });
        subList.appendChild(row);
      });
    }
    paintSubQs();
    addSub.addEventListener('click', ()=>{ q.items.push({ id: uid('sub'), type:'mcq', prompt:'Sub question', options:['A','B','C','D'] }); paintSubQs(); saveDraftLocal(); });

    // image
    if(q.image){ imgPreview.src = q.image; imgPreview.style.display = 'block'; }
    imgInput.addEventListener('change', async (e)=>{
      const file = e.target.files && e.target.files[0];
      if(!file) return;
      const dataUrl = await fileToDataURL(file);
      q.image = dataUrl; imgPreview.src = dataUrl; imgPreview.style.display = 'block'; saveDraftLocal();
    });

    return card;
  }

  function renderShort(q, idx){
    const card = cloneTpl('tpl-short');
    headerWiring(card, q, idx);
    const prompt = card.querySelector('.q-prompt');
    const required = card.querySelector('.q-required');
    const maxlen = card.querySelector('.q-maxlen');

    prompt.value = q.prompt || '';
    required.checked = !!q.required;
    maxlen.value = q.maxLength || '';

    prompt.addEventListener('input', ()=>{ q.prompt = prompt.value; saveDraftLocal(); });
    required.addEventListener('change', ()=>{ q.required = required.checked; saveDraftLocal(); });
    maxlen.addEventListener('input', ()=>{ q.maxLength = parseInt(maxlen.value||'0',10) || undefined; saveDraftLocal(); });

    return card;
  }

  function renderParagraph(q, idx){
    const card = cloneTpl('tpl-paragraph');
    headerWiring(card, q, idx);
    const prompt = card.querySelector('.q-prompt');
    const required = card.querySelector('.q-required');
    const maxlen = card.querySelector('.q-maxlen');

    prompt.value = q.prompt || '';
    required.checked = !!q.required;
    maxlen.value = q.maxLength || '';

    prompt.addEventListener('input', ()=>{ q.prompt = prompt.value; saveDraftLocal(); });
    required.addEventListener('change', ()=>{ q.required = required.checked; saveDraftLocal(); });
    maxlen.addEventListener('input', ()=>{ q.maxLength = parseInt(maxlen.value||'0',10) || undefined; saveDraftLocal(); });

    return card;
  }

  // --- Move / Duplicate / Delete ---
  function move(idx, delta){
    const n = idx + delta;
    if(n < 0 || n >= state.questions.length) return;
    const [q] = state.questions.splice(idx,1);
    state.questions.splice(n,0,q);
    render(); saveDraftLocal();
  }
  function duplicate(idx){
    const q = JSON.parse(JSON.stringify(state.questions[idx]));
    // regenerate ids
    q.id = uid(q.type);
    if(q.type==='group' && Array.isArray(q.items)){
      q.items.forEach(it=> it.id = uid('sub'));
    }
    state.questions.splice(idx+1,0,q);
    render(); saveDraftLocal();
  }
  function del(idx){
    if(!confirm('Delete this question?')) return;
    state.questions.splice(idx,1);
    render(); saveDraftLocal();
  }

  // --- File utils ---
  function download(filename, text){
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], {type:'application/json'}));
    a.download = filename; a.click(); URL.revokeObjectURL(a.href);
  }
  function fileToDataURL(file){
    return new Promise((res, rej)=>{
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = rej; fr.readAsDataURL(file);
    });
  }

  // --- Import / Export / Draft ---
  const importInput = document.getElementById('importJson');
  document.getElementById('btnExportJson').addEventListener('click', ()=>{
    const payload = JSON.stringify(state, null, 2);
    download('questions.json', payload);
  });
  document.getElementById('btnSaveDraft').addEventListener('click', ()=>{
    saveDraftLocal(true);
  });
  document.getElementById('btnClearAll').addEventListener('click', ()=>{
    if(!confirm('Clear all questions?')) return;
    state.questions = []; render(); saveDraftLocal();
  });
  importInput.addEventListener('change', (e)=>{
    const file = e.target.files && e.target.files[0];
    if(!file) return;
    const fr = new FileReader();
    fr.onload = ()=>{
      try{
        const data = JSON.parse(fr.result);
        if(!data || !Array.isArray(data.questions)) throw new Error('Invalid JSON');
        state.meta = Object.assign({title:'', durationMin:48}, data.meta||{});
        state.questions = data.questions;
        render(); saveDraftLocal();
        alert('Imported successfully.');
      }catch(err){
        alert('Failed to import JSON: '+err.message);
      }
    };
    fr.readAsText(file);
    importInput.value = '';
  });

  function saveDraftLocal(showToast){
    localStorage.setItem('qb_draft', JSON.stringify(state));
    if(showToast) alert('Draft saved locally.');
  }
  function loadDraft(){
    try{
      const raw = localStorage.getItem('qb_draft');
      if(!raw) return;
      const data = JSON.parse(raw);
      if(data){
        state.meta = Object.assign({title:'Proctored Test', durationMin:48}, data.meta||{});
        if(Array.isArray(data.questions)) state.questions = data.questions;
      }
    }catch{}
  }

  // --- Add buttons ---
  document.getElementById('btnAddMcq').addEventListener('click', ()=> addMcq());
  document.getElementById('btnAddMatrix').addEventListener('click', ()=> addMatrix());
  document.getElementById('btnAddGroup').addEventListener('click', ()=> addGroup());
  document.getElementById('btnAddShort').addEventListener('click', ()=> addShort());
  document.getElementById('btnAddParagraph').addEventListener('click', ()=> addParagraph());

  function scrollToEnd(){
    requestAnimationFrame(()=> window.scrollTo({top: document.body.scrollHeight, behavior:'smooth'}));
  }

  // --- Init ---
  loadDraft();
  render();
})();
