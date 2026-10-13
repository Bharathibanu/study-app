/* Integration test with a fake server: never contacts real Firebase. */
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
  const a=await browser.newPage({reducedMotion:'reduce'}),b=await browser.newPage({reducedMotion:'reduce'});const errors=[];for(const p of [a,b])p.on('pageerror',e=>errors.push(e.message));
  blockServer=true;await a.goto(url);await a.locator('#app').waitFor({state:'visible'});assert.equal(await a.locator('#sync').textContent(),'Cached data · awaiting server');
  blockServer=false;await a.locator('#sync').filter({hasText:'server confirmed'}).waitFor();await b.goto(url);await b.locator('#app').waitFor({state:'visible'});await b.locator('#sync').filter({hasText:'server confirmed'}).waitFor();
  const add=async(p,title)=>{await p.locator('#side [data-v="todo"]').click();await p.locator('[data-act=addTodo]').click();await p.locator('#f_title').fill(title);await p.locator('#msubmit').click();};
  await a.context().setOffline(true);await b.context().setOffline(true);await add(a,'Device A');await add(b,'Device B');
  assert.match(await a.locator('#sync').textContent(),/offline/);await a.context().setOffline(false);await a.locator('#sync').filter({hasText:'server confirmed'}).waitFor();await b.context().setOffline(false);await b.locator('#sync').filter({hasText:'server confirmed'}).waitFor();
  assert.deepEqual(new Set(serverState.todos.map(t=>t.title)),new Set(['Device A','Device B']));await a.waitForFunction(()=>JSON.parse(localStorage.getItem('sst_state_qa-account')).todos.length===2);
  // Two offline edits to the same settings field must not overwrite silently.
  await a.context().setOffline(true);await b.context().setOffline(true);
  for(const [p,value] of [[a,'7'],[b,'8']]){await p.locator('#side [data-v="set"]').click();await p.locator('#s_target').fill(value);await p.locator('#s_target').blur();}
  await a.context().setOffline(false);await a.locator('#sync').filter({hasText:'server confirmed'}).waitFor();await b.context().setOffline(false);await b.getByText('Two device copies need review',{exact:true}).waitFor();assert.equal(serverState.settings.target,7);
  b.once('dialog',d=>d.accept());await b.locator('[data-act=syncUseServer]').click();await b.locator('#sync').filter({hasText:'server confirmed'}).waitFor();await b.waitForFunction(()=>document.querySelector('#s_target')?.value==='7');assert.equal(await b.locator('#s_target').inputValue(),'7');
  assert.deepEqual(errors,[]);console.log('PASS browser sync: cached snapshot not confirmed; offline edits retained; two-device additions merged; same-field conflict paused; server-copy resolution');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
