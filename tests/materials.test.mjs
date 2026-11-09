import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../ssc-core.js',import.meta.url),'utf8');
const {MATERIAL_ROOTS,HISTORY_MATERIAL_URL,GRAMMAR_MATERIAL_URL,GS_MATERIAL_FOLDERS,initialiseMaterials,driveMaterialLink,validateMaterialLibrary,saveMaterialFolder,saveMaterialLink,removeMaterialFolder,validateBackup,mergeStates,sameState}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const copy=x=>structuredClone(x),state=()=>{const s={logs:[],_u:1};initialiseMaterials(s);return s;};
const folder=(id,parent='materials:gs',name=id)=>({id,parent,name,date:'2026-11-09'});
const link=(id,target='materials:history',title=id)=>({id,folder:target,title,url:HISTORY_MATERIAL_URL,date:'2026-11-09'});
test('four subjects, seven GS folders and both PDF starters initialise once with stable IDs',()=>{
 assert.deepEqual(MATERIAL_ROOTS.map(r=>r.name),['Mathematics','Reasoning','English','GS & GK']);
 const s=state();assert.equal(s.materialFolders[0].parent,'materials:gs');assert.equal(s.materialFolders[0].name,'History');assert.equal(s.materials[0].title,'History one liner');assert.equal(s.materials[0].url,HISTORY_MATERIAL_URL);
 assert.equal(initialiseMaterials(s),false);assert.equal(s.materials.length,2);assert.equal(s.materialsVersion,3);assert.deepEqual(s.materialFolders.filter(f=>f.parent==='materials:gs').map(f=>f.name).sort(),[...GS_MATERIAL_FOLDERS].sort());assert.equal(s.materials.find(f=>f.title==='ENGLISH GRAMMAR').url,GRAMMAR_MATERIAL_URL);s.materials=[];assert.equal(initialiseMaterials(s),false);assert.deepEqual(s.materials,[]);
 const other=state();assert.deepEqual(other.materialFolders,state().materialFolders);
});
test('legacy accounts with no materials compare equally to empty default collections',()=>{
 assert(sameState({logs:[]},{logs:[],materials:[],materialFolders:[],materialsInitialized:false}));assert(!sameState({logs:[]},state()));
});
test('Drive links retain resource keys and accept file, folder and open links',()=>{
 for(const url of [HISTORY_MATERIAL_URL,'https://drive.google.com/file/d/test_123/view?resourcekey=secret&usp=sharing','https://drive.google.com/drive/folders/folder-id','https://drive.google.com/drive/u/1/folders/folder-id','https://drive.google.com/open?id=test_123'])assert.equal(driveMaterialLink(url).url,url);
 assert.equal(driveMaterialLink('https://drive.google.com/drive/folders/folder-id').kind,'folder');assert.equal(driveMaterialLink(HISTORY_MATERIAL_URL).kind,'file');
 for(const url of ['javascript:alert(1)','http://drive.google.com/file/d/a/view','https://drive.google.com.evil.example/file/d/a/view','https://evil.example/file/d/a/view','https://name:password@drive.google.com/file/d/a/view','https://drive.google.com:444/file/d/a/view','https://drive.google.com/drive/my-drive','https://drive.google.com/open?id=%3Cscript%3E','not a link'])assert.throws(()=>driveMaterialLink(url));
});
test('nested folders reject duplicate names, cycles and missing parents atomically',()=>{
 const s=state();saveMaterialFolder(s,folder('ancient','materials:history','Ancient India'));saveMaterialFolder(s,folder('math-ancient','materials:math','Ancient India'));validateMaterialLibrary(s);
 const before=copy(s);assert.throws(()=>saveMaterialFolder(s,folder('duplicate','materials:history',' ancient INDIA ')),/already exists/);
 assert.throws(()=>saveMaterialFolder(s,folder('orphan','missing')),/parent folder/);assert.throws(()=>saveMaterialFolder(s,folder('bad','')),/parent folder/);
 const original=copy(s.materialFolders[0]);assert.throws(()=>saveMaterialFolder(s,{...original,parent:'ancient'},original),/inside itself/);assert.deepEqual(s,before);
});
test('materials can move between subjects and invalid links leave state unchanged',()=>{
 const s=state(),row=saveMaterialLink(s,link('custom'));assert.equal(row.folder,'materials:history');const original=copy(row);
 saveMaterialLink(s,{...original,folder:'materials:math',title:'Math notes'},original);assert.equal(s.materials.at(-1).folder,'materials:math');
 const before=copy(s);assert.throws(()=>saveMaterialLink(s,{...link('unsafe'),url:'https://example.com/file.pdf'}));assert.throws(()=>saveMaterialLink(s,link('bad-parent','missing')),/folder/);assert.deepEqual(s,before);
});
test('open editors preserve independent remote fields and reject same-field conflicts',()=>{
 const s=state(),original=copy(s.materials[0]);s.materials[0].folder='materials:math';
 saveMaterialLink(s,{...original,title:'Phone title'},original);assert.equal(s.materials[0].folder,'materials:math');assert.equal(s.materials[0].title,'Phone title');
 const before=copy(s);assert.throws(()=>saveMaterialLink(s,{...original,title:'Conflicting title'},original),/changed on another device/);assert.deepEqual(s,before);
 s.materials=[];assert.throws(()=>saveMaterialLink(s,{...original,title:'Deleted'},original),/deleted on another device/);
});
test('only empty custom folders can be removed',()=>{
 const s=state();assert.throws(()=>removeMaterialFolder(s,'materials:gs'),/permanently/);assert.throws(()=>removeMaterialFolder(s,'materials:history'),/not empty/);
 saveMaterialFolder(s,folder('sub','materials:history'));s.materials=[];assert.throws(()=>removeMaterialFolder(s,'materials:history'),/not empty/);removeMaterialFolder(s,'sub');removeMaterialFolder(s,'materials:history');assert(!s.materialFolders.some(f=>f.id==='materials:history'));
});
test('backups retain the hierarchy and reject malformed or unsafe material records',()=>{
 const s=state();assert.deepEqual(validateBackup(copy(s)),s);assert.deepEqual(validateBackup({logs:[]}),{logs:[]});
 for(const bad of [{...s,materials:{}},{...s,materials:[{...s.materials[0],url:'javascript:alert(1)'}]},{...s,materials:[{...s.materials[0],folder:'missing'}]},{...s,materialFolders:[{...s.materialFolders[0],parent:'materials:history'}]},{...s,materialsInitialized:'yes'},{...s,materials:[{...s.materials[0],date:'invalid'}]}])assert.throws(()=>validateBackup(bad));
});
test('two-device link additions and simultaneous first use merge without duplicate starters',()=>{
 const base=state(),a=copy(base),b=copy(base);saveMaterialLink(a,link('phone'));saveMaterialLink(b,link('desktop','materials:english'));
 const merged=mergeStates(base,a,b);assert.deepEqual(merged.conflicts,[]);assert.equal(merged.state.materials.length,4);
 const old={logs:[],_u:1};const first=copy(old),second=copy(old);initialiseMaterials(first);initialiseMaterials(second);const seeded=mergeStates(old,first,second);assert.deepEqual(seeded.conflicts,[]);assert.equal(seeded.state.materials.length,2);assert.equal(seeded.state.materialFolders.length,8);
});
test('concurrent deletion and new children stop syncing rather than create orphaned links',()=>{
 const base=state();base.materials=[];const a=copy(base),b=copy(base);removeMaterialFolder(a,'materials:history');saveMaterialLink(b,link('new child'));
 const merged=mergeStates(base,a,b);assert(merged.conflicts.some(path=>path.startsWith('materials:')));
});

const legacy=()=>({logs:[],_u:1,materialsInitialized:true,materialFolders:[folder('materials:history','materials:gs','History')],materials:[{...link('materials:history-one-liner'),title:'History one liner'}]});
test('existing version-one libraries receive Grammar and GS folders without replacing personal data',()=>{
 const s=legacy();s.notes=[{id:'personal',text:'Keep my notes'}];s.materials[0].title='My edited History title';s.materialFolders.push(folder('custom','materials:math','My maths notes'));const before=copy(s);
 assert(initialiseMaterials(s));assert.equal(s.materialsVersion,3);assert.equal(s.materials.length,2);assert.deepEqual(s.materials[0],before.materials[0]);assert.deepEqual(s.notes,before.notes);assert.deepEqual(s.materialFolders.find(f=>f.id==='custom'),before.materialFolders[1]);
 assert.equal(s.materials.find(f=>f.url===GRAMMAR_MATERIAL_URL).folder,'materials:grammar');assert.equal(s.materialFolders.filter(f=>f.parent==='materials:gs').length,7);assert.equal(initialiseMaterials(s),false);
});
test('updates reuse existing subject folders and detect an already saved Grammar file',()=>{
 const s=legacy();s.materialFolders.push(folder('user-grammar','materials:english','Grammar'),folder('user-economy','materials:gs','economy'));
 s.materials.push({...link('user-grammar-pdf','user-grammar','My grammar bookmark'),url:'https://drive.google.com/open?id=1AjpRzJa_-wdlxsoT1eiq2ULUn0yrpLW7&usp=sharing'});
 initialiseMaterials(s);assert.equal(s.materials.length,2);assert.equal(s.materialFolders.filter(f=>f.parent==='materials:english' && f.name==='Grammar').length,1);assert.equal(s.materialFolders.filter(f=>f.parent==='materials:gs' && f.name.toLowerCase()==='economy').length,1);assert.equal(s.materials.find(f=>f.id==='user-grammar-pdf').title,'My grammar bookmark');
});
test('deleted History links remain deleted and new starters are not re-added after removal',()=>{
 const s=legacy();s.materials=[];s.materialFolders=[];initialiseMaterials(s);assert.equal(s.materials.length,1);assert.equal(s.materials[0].title,'ENGLISH GRAMMAR');assert(s.materialFolders.some(f=>f.name==='History'));
 s.materials=[];assert.equal(initialiseMaterials(s),false);assert.equal(s.materials.length,0);
});
test('version-two accounts receive GS folders without restoring a removed Grammar link',()=>{
 const s=legacy();s.materialsVersion=2;initialiseMaterials(s);assert.equal(s.materialsVersion,3);assert.equal(s.materials.length,1);assert.equal(s.materialFolders.filter(f=>f.parent==='materials:gs').length,7);
 for(const version of [0,-1,1.5,'3',null])assert.throws(()=>validateBackup({...s,materialsVersion:version}),/version/);
});
test('simultaneous upgrades from the existing History-only release merge without duplicates',()=>{
 const before=legacy(),phone=copy(before),desktop=copy(before);initialiseMaterials(phone);initialiseMaterials(desktop);const result=mergeStates(before,phone,desktop);assert.deepEqual(result.conflicts,[]);assert.equal(result.state.materials.length,2);assert.equal(result.state.materialFolders.length,8);assert.equal(result.state.materialsVersion,3);
});
