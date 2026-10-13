import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const coreSource=fs.readFileSync(new URL('../ssc-core.js',import.meta.url),'utf8');
const coreUrl='data:text/javascript;base64,'+Buffer.from(coreSource).toString('base64');
let source=fs.readFileSync(new URL('../cloud.js',import.meta.url),'utf8');
source=source.replace("import { firebaseConfig } from './firebase-config.js';",'const firebaseConfig = {};').replace("from './ssc-core.js'",'from '+JSON.stringify(coreUrl));
source+='\nexport function qaConfigure(fs) { m = { fs }; db = {}; }';
const cloud=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
function fixture(state){let writes=0,stored=state?{data:JSON.stringify(state)}:null;const fs={doc:(_,collection,id)=>({collection,id}),serverTimestamp:()=>({server:true}),runTransaction:async(_,callback)=>callback({get:async()=>({exists:()=>stored!==null,data:()=>stored}),set:(ref,value)=>{writes++;stored=value;}})};cloud.qaConfigure(fs);return {get stored(){return stored},get writes(){return writes},fs};}
test('cloud save returns a server-confirmed merged copy and timestamp',async()=>{
 const base={_u:1,logs:[],todos:[]},remote={...base,todos:[{id:'r',title:'remote'}]},local={...base,todos:[{id:'l',title:'local'}]};const f=fixture(remote);const saved=await cloud.save('qa',local,base);assert.equal(saved.todos.length,2);assert.equal(f.writes,1);assert.deepEqual(f.stored.serverUpdated,{server:true});
});
test('cloud conflict rejects without writing and returns the server recovery copy',async()=>{
 const base={_u:1,name:'old',logs:[]},f=fixture({_u:2,name:'remote',logs:[]});await assert.rejects(cloud.save('qa',{_u:3,name:'local',logs:[]},base),e=>e.code==='sync/conflict'&&e.remote.name==='remote');assert.equal(f.writes,0);
});
test('oversized and corrupt cloud records are never silently overwritten',async()=>{
 let f=fixture(null);await assert.rejects(cloud.save('qa',{_u:1,text:'x'.repeat(950001)}),e=>e.code==='sync/size');assert.equal(f.writes,0);
 f=fixture({_u:1});f.fs.runTransaction=async(_,cb)=>cb({get:async()=>({exists:()=>true,data:()=>({data:'invalid JSON'})}),set:()=>assert.fail('No overwrite allowed')});await assert.rejects(cloud.save('qa',{_u:2}),e=>e.code==='sync/corrupt');
});
test('cached snapshots are distinguishable from server snapshots',()=>{
 const f=fixture(null);let received;f.fs.onSnapshot=(ref,options,onNext)=>{assert.equal(options.includeMetadataChanges,true);onNext({exists:()=>true,data:()=>({data:'{}'}),metadata:{fromCache:true,hasPendingWrites:false}});return ()=>{};};cloud.subscribe('qa',(...args)=>{received=args});assert.equal(received[3],true);
});
