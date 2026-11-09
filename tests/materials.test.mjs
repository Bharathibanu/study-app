import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../ssc-core.js',import.meta.url),'utf8');
const {MATERIAL_ROOTS,HISTORY_MATERIAL_URL,GRAMMAR_MATERIAL_URL,GS_MATERIAL_FOLDERS,GS_MATERIAL_LINKS,initialiseMaterials,driveMaterialLink,validateMaterialLibrary,saveMaterialFolder,saveMaterialLink,removeMaterialFolder,validateBackup,mergeStates,sameState}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const copy=x=>structuredClone(x),state=()=>{const s={logs:[],_u:1};initialiseMaterials(s);return s;};
const folder=(id,parent='materials:gs',name=id)=>({id,parent,name,date:'2026-11-09'});
const link=(id,target='materials:history',title=id)=>({id,folder:target,title,url:HISTORY_MATERIAL_URL,date:'2026-11-09'});
test('four subjects, seven GS folders and both PDF starters initialise once with stable IDs',()=>{
 assert.deepEqual(MATERIAL_ROOTS.map(r=>r.name),['Mathematics','Reasoning','English','GS & GK']);
 const s=state();assert.equal(s.materialFolders[0].parent,'materials:gs');assert.equal(s.materialFolders[0].name,'History');assert.equal(s.materials[0].title,'History one liner');assert.equal(s.materials[0].url,HISTORY_MATERIAL_URL);
 assert.equal(initialiseMaterials(s),false);assert.equal(s.materials.length,9);assert.equal(s.materialsVersion,4);assert.deepEqual(s.materialFolders.filter(f=>f.parent==='materials:gs').map(f=>f.name).sort(),[...GS_MATERIAL_FOLDERS].sort());assert.equal(s.materials.find(f=>f.title==='ENGLISH GRAMMAR').url,GRAMMAR_MATERIAL_URL);s.materials=[];assert.equal(initialiseMaterials(s),false);assert.deepEqual(s.materials,[]);
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
 const merged=mergeStates(base,a,b);assert.deepEqual(merged.conflicts,[]);assert.equal(merged.state.materials.length,11);
 const old={logs:[],_u:1};const first=copy(old),second=copy(old);initialiseMaterials(first);initialiseMaterials(second);const seeded=mergeStates(old,first,second);assert.deepEqual(seeded.conflicts,[]);assert.equal(seeded.state.materials.length,9);assert.equal(seeded.state.materialFolders.length,8);
});
test('concurrent deletion and new children stop syncing rather than create orphaned links',()=>{
 const base=state();base.materials=[];const a=copy(base),b=copy(base);removeMaterialFolder(a,'materials:history');saveMaterialLink(b,link('new child'));
 const merged=mergeStates(base,a,b);assert(merged.conflicts.some(path=>path.startsWith('materials:')));
});

const legacy=()=>({logs:[],_u:1,materialsInitialized:true,materialFolders:[folder('materials:history','materials:gs','History')],materials:[{...link('materials:history-one-liner'),title:'History one liner'}]});
test('existing version-one libraries receive Grammar and GS folders without replacing personal data',()=>{
 const s=legacy();s.notes=[{id:'personal',text:'Keep my notes'}];s.materials[0].title='My edited History title';s.materialFolders.push(folder('custom','materials:math','My maths notes'));const before=copy(s);
 assert(initialiseMaterials(s));assert.equal(s.materialsVersion,4);assert.equal(s.materials.length,9);assert.deepEqual(s.materials[0],before.materials[0]);assert.deepEqual(s.notes,before.notes);assert.deepEqual(s.materialFolders.find(f=>f.id==='custom'),before.materialFolders[1]);
 assert.equal(s.materials.find(f=>f.url===GRAMMAR_MATERIAL_URL).folder,'materials:grammar');assert.equal(s.materialFolders.filter(f=>f.parent==='materials:gs').length,7);assert.equal(initialiseMaterials(s),false);
});
test('updates reuse existing subject folders and detect an already saved Grammar file',()=>{
 const s=legacy();s.materialFolders.push(folder('user-grammar','materials:english','Grammar'),folder('user-economy','materials:gs','economy'));
 s.materials.push({...link('user-grammar-pdf','user-grammar','My grammar bookmark'),url:'https://drive.google.com/open?id=1AjpRzJa_-wdlxsoT1eiq2ULUn0yrpLW7&usp=sharing'});
 initialiseMaterials(s);assert.equal(s.materials.length,9);assert.equal(s.materialFolders.filter(f=>f.parent==='materials:english' && f.name==='Grammar').length,1);assert.equal(s.materialFolders.filter(f=>f.parent==='materials:gs' && f.name.toLowerCase()==='economy').length,1);assert.equal(s.materials.find(f=>f.id==='user-grammar-pdf').title,'My grammar bookmark');
});
test('deleted History links remain deleted and new starters are not re-added after removal',()=>{
 const s=legacy();s.materials=[];s.materialFolders=[];initialiseMaterials(s);assert.equal(s.materials.length,8);assert.equal(s.materials[0].title,'ENGLISH GRAMMAR');assert(s.materialFolders.some(f=>f.name==='History'));
 s.materials=[];assert.equal(initialiseMaterials(s),false);assert.equal(s.materials.length,0);
});
test('version-two accounts receive GS folders without restoring a removed Grammar link',()=>{
 const s=legacy();s.materialsVersion=2;initialiseMaterials(s);assert.equal(s.materialsVersion,4);assert.equal(s.materials.length,8);assert.equal(s.materialFolders.filter(f=>f.parent==='materials:gs').length,7);
 for(const version of [0,-1,1.5,'3',null])assert.throws(()=>validateBackup({...s,materialsVersion:version}),/version/);
});
test('simultaneous upgrades from the existing History-only release merge without duplicates',()=>{
 const before=legacy(),phone=copy(before),desktop=copy(before);initialiseMaterials(phone);initialiseMaterials(desktop);const result=mergeStates(before,phone,desktop);assert.deepEqual(result.conflicts,[]);assert.equal(result.state.materials.length,9);assert.equal(result.state.materialFolders.length,8);assert.equal(result.state.materialsVersion,4);
});

const requestedLinks=[
 ['Art and Culture','Art and Culture','1JATHdQU8GoHqG6gO7X0-liv_7_lh1xKv','sharing'],
 ['Economy','Economy','1lRZdz7LH-BjVYUIB1pgN2izK4ZTR67P6','drive_link'],
 ['Environment','Environment','15oKdLKui5GzeWxZZx3M2EMPuDoeM7n5v','sharing'],
 ['General Science','General Science','1uJzOSYDjwzYNY-AUQqEfhv4kRvL5EgEV','drive_link'],
 ['Geography','Geography','1-4SZOnXY_SJiMu-x90JFwKDu1Q7wsg0s','drive_link'],
 ['Polity','Notes','1ASGttkiuAe4kn-i5ObEOfdxYP5eWd4Xf','drive_link'],
 ['History','Notes','15g9uJzFdjBXhTQL0TvL-8FLVwkrkSBFa','drive_link']
];
const previousRelease=()=>{const s=state();s.materials=s.materials.filter(f=>[HISTORY_MATERIAL_URL,GRAMMAR_MATERIAL_URL].includes(f.url));s.materialsVersion=3;return s;};
test('all seven requested PDF URLs are saved under their exact subject folders',()=>{
 const s=state();assert.equal(GS_MATERIAL_LINKS.length,7);
 for(const [subject,title,id,usp] of requestedLinks){const f=s.materialFolders.find(f=>f.parent==='materials:gs'&&f.name===subject);assert(f);const rows=s.materials.filter(m=>m.folder===f.id&&m.title===title);assert.equal(rows.length,1);assert.equal(rows[0].url,`https://drive.google.com/file/d/${id}/view?usp=${usp}`);}
 assert.equal(s.materials.length,9);assert(s.materials.some(f=>f.url===HISTORY_MATERIAL_URL));assert(s.materials.some(f=>f.url===GRAMMAR_MATERIAL_URL));
});
test('existing version-three accounts receive seven PDFs without changing folders or personal bookmarks',()=>{
 const s=previousRelease();saveMaterialLink(s,link('my-notes','materials:math','My own notes'));s.notes=[{id:'keep',text:'Personal text'}];const before=copy(s);assert(initialiseMaterials(s));assert.equal(s.materials.length,10);assert.deepEqual(s.materialFolders,before.materialFolders);assert.deepEqual(s.materials.slice(0,3),before.materials);assert.deepEqual(s.notes,before.notes);assert.equal(s.materialsVersion,4);
 const updated=copy(s);assert.equal(initialiseMaterials(s),false);assert.deepEqual(s,updated);
});
test('an existing GS PDF is recognised by file ID and is not duplicated or moved',()=>{
 const s=previousRelease(),id=requestedLinks[2][2];s.materials.push({...link('my-environment','materials:math','My environment highlights'),url:`https://drive.google.com/open?id=${id}&usp=sharing`});initialiseMaterials(s);assert.equal(s.materials.length,9);const rows=s.materials.filter(f=>f.url.includes(id));assert.equal(rows.length,1);assert.equal(rows[0].folder,'materials:math');assert.equal(rows[0].title,'My environment highlights');
});
test('two-device version-three upgrades merge once and deleted new PDFs stay deleted',()=>{
 const before=previousRelease(),phone=copy(before),pc=copy(before);initialiseMaterials(phone);initialiseMaterials(pc);const result=mergeStates(before,phone,pc);assert.deepEqual(result.conflicts,[]);assert.equal(result.state.materials.length,9);
 result.state.materials=result.state.materials.filter(f=>!f.url.includes(requestedLinks[0][2]));assert.equal(initialiseMaterials(result.state),false);assert.equal(result.state.materials.length,8);
});
