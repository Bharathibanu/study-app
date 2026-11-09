import { MATERIAL_ROOTS, initialiseMaterials, validateMaterialLibrary, driveMaterialLink, saveMaterialFolder, saveMaterialLink, removeMaterialFolder, clone, same } from './ssc-core.js';

// Stores bookmarks only. Opening a link uses the user's normal Google Drive permissions.
export function installMaterials({state,persist,render,esc,openForm,toast,uid,today,ACT,INP,VIEWS,accountToken}) {
  let folder='', query='';
  const folderIcon='<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><path d="M3 6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v10H3z"/></svg>';
  const folders=()=>[...MATERIAL_ROOTS,...(state().materialFolders || [])];
  const folderMap=()=>new Map(folders().map(f=>[f.id,f]));
  function path(id) {
    const map=folderMap(), result=[], seen=new Set();
    while(id && map.has(id) && !seen.has(id)){seen.add(id);const row=map.get(id);result.unshift(row);id=row.parent;}
    return result;
  }
  const pathName=id=>path(id).map(f=>f.name).join(' / ');
  function options(excluded='') {
    return folders().filter(f=>!path(f.id).some(p=>p.id===excluded)).map(f=>[f.id,pathName(f.id)]).sort((a,b)=>a[1].localeCompare(b[1]));
  }
  const guard=token=>{if(token!==accountToken())throw new Error('Your account changed. Close this form and reopen Materials.');};
  const finish=message=>{persist();render();toast(message);};
  function folderForm(id='') {
    const original=id?clone((state().materialFolders || []).find(f=>f.id===id)):null;
    if(id && !original){toast('This folder is no longer available.');render();return;}
    const token=accountToken();
    openForm(original?'Edit folder':'Create folder',[
      {k:'name',label:'Folder name',req:1,value:original?.name || '',ph:'e.g. History'},
      {k:'parent',label:'Inside folder',type:'select',options:options(id),value:original?.parent || folder || MATERIAL_ROOTS[0].id}
    ],original?'Save folder':'Create folder',v=>{
      guard(token);const row=saveMaterialFolder(state(),{id:original?.id || 'folder:'+uid(),name:v.name,parent:v.parent,date:original?.date || today()},original);
      query='';if(!original)folder=row.parent;finish(original?'Folder updated':'Folder created');
    });
  }
  function linkForm(id='') {
    const original=id?clone((state().materials || []).find(f=>f.id===id)):null;
    if(id && !original){toast('This material is no longer available.');render();return;}
    const token=accountToken();
    openForm(original?'Edit or move material':'Add PDF / Drive link',[
      {k:'title',label:'Material title',req:1,value:original?.title || '',ph:'e.g. History one liner'},
      {k:'folder',label:'Save in folder',type:'select',options:options(),value:original?.folder || folder || MATERIAL_ROOTS[0].id},
      {k:'url',label:'Google Drive sharing link',type:'url',req:1,value:original?.url || '',ph:'https://drive.google.com/file/d/.../view'}
    ],original?'Save changes':'Add material',v=>{
      guard(token);const row=saveMaterialLink(state(),{id:original?.id || 'material:'+uid(),title:v.title,folder:v.folder,url:v.url,date:original?.date || today()},original);
      folder=row.folder;query='';finish(original?'Material updated':'Material added');
    });
  }
  ACT.materialFolder=d=>{folder=d.id || '';query='';render();window.scrollTo(0,0);};
  ACT.materialNewFolder=()=>folderForm();
  ACT.materialEditFolder=d=>folderForm(d.id);
  ACT.materialAdd=()=>linkForm();
  ACT.materialEdit=d=>linkForm(d.id);
  ACT.materialRemove=d=>{
    const original=clone((state().materials || []).find(f=>f.id===d.id));if(!original)return;
    const token=accountToken();
    openForm('Remove saved link',[],'Remove link',()=>{
      guard(token);const current=(state().materials || []).find(f=>f.id===d.id);
      if(current && !same(original,current))throw new Error('This material changed on another device. Close and reopen it before removing.');
      state().materials=(state().materials || []).filter(f=>f.id!==d.id);finish('Link removed from app');
    });
    document.getElementById('mbody').innerHTML=`<p>Remove <b>${esc(original.title)}</b> from this app? Your file stays in Google Drive.</p>`;
  };
  ACT.materialRemoveFolder=d=>{
    const original=clone((state().materialFolders || []).find(f=>f.id===d.id));if(!original)return;
    const token=accountToken();
    openForm('Remove empty folder',[],'Remove folder',()=>{
      guard(token);const current=(state().materialFolders || []).find(f=>f.id===d.id);
      if(current && !same(original,current))throw new Error('This folder changed on another device. Close and reopen it before removing.');
      removeMaterialFolder(state(),d.id);folder=original.parent;finish('Empty folder removed');
    });
    document.getElementById('mbody').innerHTML=`<p>Remove <b>${esc(original.name)}</b>? Move or remove its saved links and subfolders first. Google Drive files stay unchanged.</p>`;
  };
  INP.materialSearch=el=>{
    query=el.value;const cursor=el.selectionStart;render();const search=document.getElementById('material-search');search.focus({preventScroll:true});search.setSelectionRange(cursor,cursor);
  };
  function folderCard(f) {
    const total=(state().materials || []).filter(file=>path(file.folder).some(p=>p.id===f.id)).length;
    const children=(state().materialFolders || []).filter(child=>child.parent===f.id).length;
    return `<button class="material-folder" data-act="materialFolder" data-id="${esc(f.id)}"><span class="material-folder-icon">${folderIcon}</span><span><b>${esc(f.name)}</b><small>${total} saved ${total===1?'link':'links'}${children?' · '+children+' subfolders':''}</small></span><span aria-hidden="true">→</span></button>`;
  }
  function fileCard(file) {
    const link=driveMaterialLink(file.url);
    return `<article class="material-file"><div class="material-file-heading"><span class="badge">${link.kind==='folder'?'Drive folder':'Drive file'}</span><details class="material-menu"><summary aria-label="More actions for ${esc(file.title)}">⋯</summary><button class="btn sm ghost" data-act="materialRemove" data-id="${esc(file.id)}">Remove link</button></details></div><h4>${esc(file.title)}</h4><p class="quiet material-path">${esc(pathName(file.folder))}</p><div class="actions"><a class="btn sm" href="${esc(link.url)}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">Open in Drive <span aria-hidden="true">↗</span></a><button class="btn sm ghost" data-act="materialEdit" data-id="${esc(file.id)}">Edit / move</button></div></article>`;
  }
  VIEWS.materials=()=>{
    const s=state();
    try{if(initialiseMaterials(s))persist();validateMaterialLibrary(s);}catch(error){return `<div class="card"><h3>Materials need review</h3><p>${esc(error.message)}</p><p class="quiet">Export a backup from Settings before correcting your saved library.</p></div>`;}
    const map=folderMap();if(folder && !map.has(folder))folder='';
    const current=map.get(folder), term=query.trim().toLowerCase();
    const shownFolders=(term?folders().filter(f=>pathName(f.id).toLowerCase().includes(term)):folder?(s.materialFolders || []).filter(f=>f.parent===folder):MATERIAL_ROOTS);
    if(folder || term)shownFolders.sort((a,b)=>a.name.localeCompare(b.name));
    const shownFiles=(s.materials || []).filter(f=>term?(f.title+' '+pathName(f.folder)).toLowerCase().includes(term):f.folder===folder).sort((a,b)=>a.title.localeCompare(b.title));
    return `<div class="materials-library"><section class="card materials-intro${current?' materials-compact':''}">${current?'':'<span class="eyebrow">Your study bookshelf</span><h3>PDF Materials</h3><p class="quiet">Organise your Google Drive PDFs by subject and topic. Open them with the Google account that has access—even if it differs from your study-app account.</p>'}<div class="actions"><button class="btn sm" data-act="materialAdd">+ Add PDF link</button><button class="btn sm ghost" data-act="materialNewFolder">+ Create folder</button></div></section>
      <div><label class="label" for="material-search">Search all materials and folders</label><input class="inp" type="search" id="material-search" data-inp="materialSearch" value="${esc(query)}" placeholder="Search History, algebra, notes…"></div>
      <nav class="material-breadcrumbs" aria-label="Material folders"><button data-act="materialFolder"${!folder?' aria-current="page"':''}>All subjects</button>${path(folder).map(p=>`<span aria-hidden="true">/</span><button data-act="materialFolder" data-id="${esc(p.id)}"${p.id===folder?' aria-current="page"':''}>${esc(p.name)}</button>`).join('')}</nav>
      <div class="section-heading"><h3>${term?'Search results':esc(current?.name || 'Choose a subject')}</h3>${current && !MATERIAL_ROOTS.some(f=>f.id===folder)?`<div class="actions"><button class="btn sm ghost" data-act="materialEditFolder" data-id="${esc(folder)}">Edit folder</button><button class="btn sm ghost" data-act="materialRemoveFolder" data-id="${esc(folder)}">Remove empty folder</button></div>`:''}</div>
      ${shownFolders.length?`<div class="material-folders">${shownFolders.map(folderCard).join('')}</div>`:''}
      ${shownFiles.length?`<div class="material-files">${shownFiles.map(fileCard).join('')}</div>`:''}
      ${!shownFiles.length && !shownFolders.length?`<div class="empty"><b>${term?'No materials found':'This folder is ready for your notes'}</b>${term?'Try another title or subject.':'Use Add PDF link or Create folder above.'}</div>`:''}
      <p class="quiet materials-help">Only folders and links are saved in your study account. PDFs stay in Google Drive. To read a restricted file, switch to its Drive account or share it privately with your other email. For offline PDFs, use “Make available offline” in the Drive phone app.</p></div>`;
  };
  return {resetSession:()=>{folder='';query='';}};
}
