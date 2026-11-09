import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../ssc-core.js',import.meta.url),'utf8');
const {MATERIAL_ROOTS,HISTORY_MATERIAL_URL,initialiseMaterials,driveMaterialLink,validateMaterialLibrary,saveMaterialFolder,saveMaterialLink,removeMaterialFolder,validateBackup,mergeStates,sameState}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const copy=x=>structuredClone(x),state=()=>{const s={logs:[],_u:1};initialiseMaterials(s);return s;};
const folder=(id,parent='materials:gs',name=id)=>({id,parent,name,date:'2026-11-09'});
const link=(id,target='materials:history',title=id)=>({id,folder:target,title,url:HISTORY_MATERIAL_URL,date:'2026-11-09'});
test('four subjects and the requested History starter initialise once with stable IDs',()=>{
 assert.deepEqual(MATERIAL_ROOTS.map(r=>r.name),['Mathematics','Reasoning','English','GS & GK']);
 const s=state();assert.equal(s.materialFolders[0].parent,'materials:gs');assert.equal(s.materialFolders[0].name,'History');assert.equal(s.materials[0].title,'History one liner');assert.equal(s.materials[0].url,HISTORY_MATERIAL_URL);
 assert.equal(initialiseMaterials(s),false);assert.equal(s.materials.length,1);s.materials=[];assert.equal(initialiseMaterials(s),false);assert.deepEqual(s.materials,[]);
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
 saveMaterialFolder(s,folder('sub','materials:history'));s.materials=[];assert.throws(()=>removeMaterialFolder(s,'materials:history'),/not empty/);removeMaterialFolder(s,'sub');removeMaterialFolder(s,'materials:history');assert.deepEqual(s.materialFolders,[]);
});
test('backups retain the hierarchy and reject malformed or unsafe material records',()=>{
 const s=state();assert.deepEqual(validateBackup(copy(s)),s);assert.deepEqual(validateBackup({logs:[]}),{logs:[]});
 for(const bad of [{...s,materials:{}},{...s,materials:[{...s.materials[0],url:'javascript:alert(1)'}]},{...s,materials:[{...s.materials[0],folder:'missing'}]},{...s,materialFolders:[{...s.materialFolders[0],parent:'materials:history'}]},{...s,materialsInitialized:'yes'},{...s,materials:[{...s.materials[0],date:'invalid'}]}])assert.throws(()=>validateBackup(bad));
});
test('two-device link additions and simultaneous first use merge without duplicate starters',()=>{
 const base=state(),a=copy(base),b=copy(base);saveMaterialLink(a,link('phone'));saveMaterialLink(b,link('desktop','materials:english'));
 const merged=mergeStates(base,a,b);assert.deepEqual(merged.conflicts,[]);assert.equal(merged.state.materials.length,3);
 const old={logs:[],_u:1};const first=copy(old),second=copy(old);initialiseMaterials(first);initialiseMaterials(second);const seeded=mergeStates(old,first,second);assert.deepEqual(seeded.conflicts,[]);assert.equal(seeded.state.materials.length,1);assert.equal(seeded.state.materialFolders.length,1);
});
test('concurrent deletion and new children stop syncing rather than create orphaned links',()=>{
 const base=state();base.materials=[];const a=copy(base),b=copy(base);removeMaterialFolder(a,'materials:history');saveMaterialLink(b,link('new child'));
 const merged=mergeStates(base,a,b);assert(merged.conflicts.some(path=>path.startsWith('materials:')));
});
