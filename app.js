// app.js — client-side PDF merge (pdf-lib + SortableJS)
'use strict';

const { PDFDocument } = PDFLib;
const MAX_FILES = 5;

const dropArea = document.getElementById('dropArea');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const mergeBtn = document.getElementById('mergeBtn');
const clearBtn = document.getElementById('clearBtn');
const countEl = document.getElementById('count');
const pagesEl = document.getElementById('pages');
const sizeEl = document.getElementById('size');

// Map id -> { file, pages, size }
const filesMap = new Map();

function humanSize(bytes){ return (bytes/1024/1024).toFixed(2) + ' MB'; }

function refreshStats(){
  const count = filesMap.size;
  let totalPages = 0;
  let totalBytes = 0;
  for(const v of filesMap.values()){ totalPages += (v.pages||0); totalBytes += v.size; }
  countEl.textContent = count;
  pagesEl.textContent = totalPages;
  sizeEl.textContent = (totalBytes/1024/1024).toFixed(2) + ' MB';
  mergeBtn.disabled = count === 0;
  clearBtn.disabled = count === 0;
}

function escapeHtml(s){
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '\\': '\\\\'
  };
  return String(s).replace(/[&<>"'\\]/g, c => map[c] || c);
}

function createFileCard(id, name, size, pages){
  const el = document.createElement('div');
  el.className = 'card';
  el.dataset.id = id;
  el.innerHTML = `
    <div style="width:44px;height:44px;border-radius:8px;background:linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));display:flex;align-items:center;justify-content:center;font-weight:800">PDF</div>
    <div class="file-info">
      <div class="name" title="${escapeHtml(name)}">${escapeHtml(name)}</div>
      <div class="meta">${pages} pages • ${humanSize(size)}</div>
    </div>
    <div class="actions">
      <button class="icon-btn updown" title="Move up" data-action="up">▲</button>
      <button class="icon-btn updown" title="Move down" data-action="down">▼</button>
      <button class="icon-btn remove" title="Remove" data-action="remove">✕</button>
    </div>
  `;
  return el;
}

// Sortable for drag-reorder (no specific handle — drag anywhere on item)
new Sortable(fileList, { animation: 150 });

async function addFiles(list){
  const arr = Array.from(list).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
  if (!arr.length) return;
  if (arr.length + filesMap.size > MAX_FILES){ alert(`Max ${MAX_FILES} files allowed.`); return; }

  for(const file of arr){
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
    let buffer;
    try{
      buffer = await file.arrayBuffer();
    }catch(e){
      alert(`Cannot read ${file.name}.`);
      continue;
    }

    let pages = 0;
    try{
      const src = await PDFDocument.load(buffer);
      pages = src.getPageCount();
    }catch(e){
      alert(`Failed to read ${file.name}. It might be encrypted or corrupted.`);
      continue;
    }

    filesMap.set(id, { file, pages, size: file.size });
    const card = createFileCard(id, file.name, file.size, pages);
    fileList.appendChild(card);
  }

  attachCardHandlers();
  refreshStats();
  showToast('Files added', 1200);
}

function attachCardHandlers(){
  fileList.querySelectorAll('.card').forEach(card => {
    const id = card.dataset.id;
    card.querySelectorAll('[data-action]').forEach(btn => {
      btn.onclick = () => {
        const action = btn.dataset.action;
        if(action === 'remove'){ filesMap.delete(id); card.remove(); refreshStats(); showToast('Removed',900); }
        if(action === 'up'){ moveCard(card, -1); }
        if(action === 'down'){ moveCard(card, +1); }
      };
    });
  });
}

function moveCard(card, delta){
  const sibling = delta < 0 ? card.previousElementSibling : card.nextElementSibling;
  if(!sibling) return;
  if(delta < 0) card.parentNode.insertBefore(card, sibling);
  else card.parentNode.insertBefore(sibling, card);
}

// Drag & drop
['dragenter','dragover'].forEach(evt => {
  dropArea.addEventListener(evt, ev => { ev.preventDefault(); dropArea.classList.add('dragover'); });
});
['dragleave','drop'].forEach(evt => {
  dropArea.addEventListener(evt, ev => { ev.preventDefault(); dropArea.classList.remove('dragover'); });
});
dropArea.addEventListener('drop', e => { const dt = e.dataTransfer; if(dt && dt.files) addFiles(dt.files); });

// File input
fileInput.addEventListener('change', e => { addFiles(e.target.files); fileInput.value = ''; });

// Accessibility: Enter/Space opens file picker
dropArea.addEventListener('keydown', (e) => { if(e.key === 'Enter' || e.key === ' ') { fileInput.click(); e.preventDefault(); } });

// Merge
mergeBtn.addEventListener('click', async () => {
  mergeBtn.disabled = true; mergeBtn.textContent = 'Merging...';
  try{
    const ids = Array.from(fileList.children).map(c => c.dataset.id).filter(Boolean);
    if(ids.length === 0){ alert('No files selected'); return; }
    const mergedPdf = await PDFDocument.create();

    for(const id of ids){
      const entry = filesMap.get(id);
      if(!entry) continue;
      const arr = await entry.file.arrayBuffer();
      const src = await PDFDocument.load(arr);
      const pageCount = src.getPageCount();
      const indices = Array.from({length: pageCount}, (_,i) => i);
      const copied = await mergedPdf.copyPages(src, indices);
      copied.forEach(p => mergedPdf.addPage(p));
    }

    const bytes = await mergedPdf.save();
    const blob = new Blob([bytes], {type:'application/pdf'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g,'-');
    a.download = `merged-${timestamp}.pdf`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    showToast('Merged & downloaded!', 2000);
  }catch(err){
    console.error(err);
    alert('Merge failed: ' + (err && err.message ? err.message : err));
  }finally{
    mergeBtn.disabled = false; mergeBtn.textContent = 'Merge & Download';
  }
});

// Clear
clearBtn.addEventListener('click', () => {
  if(!filesMap.size) return;
  if(!confirm('Clear all selected files?')) return;
  filesMap.clear(); fileList.innerHTML = ''; refreshStats(); showToast('Cleared',900);
});

function showToast(msg, time=1200){
  const t = document.createElement('div'); t.className='toast'; t.textContent = msg; document.body.appendChild(t);
  setTimeout(()=>{ t.style.opacity = '0'; t.style.transform='translateY(6px)'; setTimeout(()=>t.remove(),400); }, time);
}

// Init
refreshStats();
