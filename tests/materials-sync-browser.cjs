/* Materials sync integration against a fake server; no real Firebase or Drive access. */
const {chromium}=require('playwright');const assert=require('assert/strict');const http=require('http'),fs=require('fs'),path=require('path');
(async()=>{
 const root=path.resolve(__dirname,'..'),src=fs.readFileSync(path.join(root,'ssc-core.js'),'utf8');
 const {mergeStates}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
 let serverState=null,blockServer=false;
 const adapter=`export const enabled=true;
 export async function init(){}
 export function onUser(cb){setTimeout(()=>cb({uid:'qa-account',email:'qa@example.invalid'}),0);}
 export async function signIn(){} export async function signUp(){} export async function signOut(){}
 export function subscribe(uid,cb){let stopped=false,last='';cb(null,false,false,true);const poll=async()=>{try{const res=await fetch('/__read',{method:'POST'});if(!res.ok)return;const state=await res.json();const str=JSON.stringify(state);if(!stopped&&last!==str){last=str;cb(state?{data:JSON.stringify(state)}:null,false,false,false);}}catch{}};const timer=setInterval(poll,150);poll();return ()=>{stopped=true;clearInterval(timer);};}
 export async function save(uid,obj,base,force){const res=await fetch('/__save',{method:'POST',body:JSON.stringify({obj,base,force})});const result=await res.json();if(!res.ok){const error=new Error(result.message);Object.assign(error,result);throw error;}return result;}
 export async function readServer(){const res=await fetch('/__read',{method:'POST'});if(!res.ok)throw new Error('offline');return res.json();}`;
 const server=http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.url==='/cloud.js'){res.setHeader('Content-Type','text/javascript');res.end(adapter);return;}
  if(req.url==='/__read'){res.setHeader('Content-Type','application/json');if(blockServer){res.writeHead(503);res.end('{}');}else res.end(JSON.stringify(serverState));return;}
  if(req.url==='/__save'){
   if(blockServer){res.writeHead(503);res.end(JSON.stringify({message:'offline'}));return;}
   let body='';for await(const chunk of req)body+=chunk;const {obj,base,force}=JSON.parse(body);const result=force?{state:obj,conflicts:[]}:mergeStates(base,obj,serverState);
   res.setHeader('Content-Type','application/json');if(result.conflicts.length){res.writeHead(409);res.end(JSON.stringify({code:'sync/conflict',remote:serverState,conflicts:result.conflicts,message:'conflict'}));}else{serverState=result.state;res.end(JSON.stringify(serverState));}return;
  }
  const name=new URL(req.url,'http://test').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':file.endsWith('.json')?'application/json':'image/png');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try {
  const a=await browser.newPage({viewport:{width:390,height:900},reducedMotion:'reduce'}),b=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});const errors=[];for(const p of [a,b])p.on('pageerror',e=>errors.push(e.message));
  blockServer=true;await a.goto(url);await a.locator('#app').waitFor({state:'visible'});assert.equal(await a.locator('#sync').textContent(),'Cached data · awaiting server');
  blockServer=false;await a.locator('#sync').filter({hasText:'server confirmed'}).waitFor();await b.goto(url);await b.locator('#app').waitFor({state:'visible'});await b.locator('#sync').filter({hasText:'server confirmed'}).waitFor();
  const synced=async p=>p.locator('#sync').filter({hasText:'server confirmed'}).waitFor();
  const nav=async(p,view)=>{const direct=p.locator('#side [data-v='+view+']');if(await direct.isVisible())await direct.click();else{await p.locator('#side [data-v=more]').click();await p.locator('#view [data-v='+view+']').first().click();}};
  await nav(a,'materials');await synced(a);await b.waitForFunction(()=>JSON.parse(localStorage.getItem('sst_state_qa-account'))?.materialsInitialized);await nav(b,'materials');await synced(b);assert.equal(serverState.materials.length,1);assert.equal(serverState.materialFolders.length,1);
  const newFolder=async(p,name,parent)=>{await p.locator('[data-act=materialNewFolder]').click();await p.locator('#f_name').fill(name);await p.locator('#f_parent').selectOption(parent);await p.locator('#msubmit').click();await synced(p);return serverState.materialFolders.find(f=>f.name===name).id;};
  const modern=await newFolder(a,'Modern History','materials:history');await b.waitForFunction(id=>JSON.parse(localStorage.getItem('sst_state_qa-account')).materialFolders.some(f=>f.id===id),modern);
  const algebra=await newFolder(b,'Algebra','materials:math');await a.waitForFunction(id=>JSON.parse(localStorage.getItem('sst_state_qa-account')).materialFolders.some(f=>f.id===id),algebra);
  const addLink=async(p,title,folder)=>{await p.locator('[data-act=materialAdd]').click();await p.locator('#f_title').fill(title);await p.locator('#f_folder').selectOption(folder);await p.locator('#f_url').fill('https://drive.google.com/file/d/sync-test/view?resourcekey=keep');await p.locator('#msubmit').click();};
  await addLink(a,'Modern notes',modern);await synced(a);const fileId=serverState.materials.find(f=>f.title==='Modern notes').id;
  await b.waitForFunction(id=>JSON.parse(localStorage.getItem('sst_state_qa-account')).materials.some(f=>f.id===id),fileId);
  await a.locator('[data-act=materialEdit]').click();await a.locator('#f_title').fill('Phone edited title');await nav(b,'set');await b.locator('#s_target').fill('8');await b.locator('#s_target').blur();await synced(b);await a.waitForFunction(()=>JSON.parse(localStorage.getItem('sst_state_qa-account')).settings.target===8);await a.locator('#msubmit').click();await synced(a);assert.equal(serverState.materials.find(f=>f.id===fileId).title,'Phone edited title');
  await b.waitForFunction(id=>JSON.parse(localStorage.getItem('sst_state_qa-account')).materials.find(f=>f.id===id).title==='Phone edited title',fileId);
  // A folder move on PC must survive an independent title edit on the phone.
  await a.locator('[data-act=materialEdit]').click();await a.locator('#f_title').fill('Phone title plus PC move');await nav(b,'materials');await b.locator('#material-search').fill('Phone edited title');await b.locator('[data-act=materialEdit]').click();await b.locator('#f_folder').selectOption('materials:english');await b.locator('#msubmit').click();await synced(b);await a.waitForFunction(id=>JSON.parse(localStorage.getItem('sst_state_qa-account')).materials.find(f=>f.id===id).folder==='materials:english',fileId);await a.locator('#msubmit').click();await synced(a);assert.equal(serverState.materials.find(f=>f.id===fileId).folder,'materials:english');assert.equal(serverState.materials.find(f=>f.id===fileId).title,'Phone title plus PC move');
  await b.waitForFunction(id=>JSON.parse(localStorage.getItem('sst_state_qa-account')).materials.find(f=>f.id===id).title==='Phone title plus PC move',fileId);
  await a.locator('[data-act=materialEdit]').click();await a.locator('#f_title').fill('Phone conflicting draft');await b.locator('[data-act=materialEdit]').click();await b.locator('#f_title').fill('Desktop title');await b.locator('#msubmit').click();await synced(b);await a.waitForFunction(id=>JSON.parse(localStorage.getItem('sst_state_qa-account')).materials.find(f=>f.id===id).title==='Desktop title',fileId);await a.locator('#msubmit').click();await a.locator('#merr').filter({hasText:'changed on another device'}).waitFor();assert.equal(await a.locator('#f_title').inputValue(),'Phone conflicting draft');assert.equal(serverState.materials.find(f=>f.id===fileId).title,'Desktop title');await a.locator('[data-act=closeModal]').first().click();
  await a.evaluate(()=>navigator.serviceWorker.ready);await b.evaluate(()=>navigator.serviceWorker.ready);await a.context().setOffline(true);await b.context().setOffline(true);await addLink(a,'Offline phone PDF','materials:english');await addLink(b,'Offline desktop PDF',algebra);
  await a.context().setOffline(false);await synced(a);await b.context().setOffline(false);await synced(b);assert(serverState.materials.some(f=>f.title==='Offline phone PDF'));assert(serverState.materials.some(f=>f.title==='Offline desktop PDF'));assert.equal(serverState.materials.filter(f=>f.title==='History one liner').length,1);
  await a.waitForFunction(()=>JSON.parse(localStorage.getItem('sst_state_qa-account')).materials.some(f=>f.title==='Offline desktop PDF'));await a.context().setOffline(true);await a.reload();await a.locator('.materials-library').waitFor();assert.equal(await a.evaluate(()=>JSON.parse(localStorage.getItem('sst_state_qa-account')).materials.length),4);assert.deepEqual(errors,[]);
  console.log('PASS materials sync: shared hierarchy, one-time starter, current-record edits, independent title/folder changes, conflict draft retained, two-device offline additions and persistence');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
