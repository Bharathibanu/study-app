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
  const a=await browser.newPage({viewport:{width:390,height:900},reducedMotion:'reduce'}),b=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});const errors=[];for(const p of [a,b])p.on('pageerror',e=>errors.push(e.message));
  blockServer=true;await a.goto(url);await a.locator('#app').waitFor({state:'visible'});assert.equal(await a.locator('#sync').textContent(),'Cached data · awaiting server');
  blockServer=false;await a.locator('#sync').filter({hasText:'server confirmed'}).waitFor();await b.goto(url);await b.locator('#app').waitFor({state:'visible'});await b.locator('#sync').filter({hasText:'server confirmed'}).waitFor();
  const synced=async p=>p.locator('#sync').filter({hasText:'server confirmed'}).waitFor();
  await a.locator('#side [data-v=plan]').click();await a.locator('#ptext').fill('Day,Date,Subject,Topic,Planned Hours,Notes\n1,,General Studies,Polity test,1,');await a.locator('[data-act=planPaste]').click();await synced(a);await b.waitForFunction(()=>JSON.parse(localStorage.getItem('sst_state_qa-account'))?.tasks.length===1);
  await a.locator('#backHome').click();await a.locator('#plan-backlog .backlog-group').evaluateAll(rows=>rows.forEach(row=>row.open=true));await a.locator('#plan-backlog [data-act=partial]').click();
  assert.equal(await a.locator('#f_min').inputValue(),'60');await a.locator('#f_min').fill('60');
  // A different device changes an unrelated field while this progress dialog stays open.
  await b.locator('#side [data-v=set]').click();await b.locator('#s_target').fill('7');await b.locator('#s_target').blur();await synced(b);await a.waitForFunction(()=>JSON.parse(localStorage.getItem('sst_state_qa-account')).settings.target===7);
  assert(await a.locator('#modal').isVisible());await a.locator('#msubmit').click();
  let state=await a.evaluate(()=>JSON.parse(localStorage.getItem('sst_state_qa-account')));assert.equal(state.tasks[0].spent,60);assert.equal(state.tasks[0].done,true);assert.equal(await a.locator('#plan-backlog .backlog-row').count(),0);
  await synced(a);await b.waitForFunction(()=>JSON.parse(localStorage.getItem('sst_state_qa-account')).tasks[0].done);assert.equal(serverState.logs.reduce((n,l)=>n+l.min,0),60);await a.reload();await a.locator('#app').waitFor({state:'visible'});assert.equal(await a.locator('#plan-backlog .backlog-row').count(),0);
  const seed=async(id,logs=[])=>{
    const row={...serverState.plan[0],topic:id};serverState={...serverState,_u:Date.now(),plan:[row],tasks:[{id,pk:[row.date,row.subj,row.topic].join('|'),date:row.date,orig:row.date,subj:row.subj,topic:id,plan:60,spent:0,done:false,doneDate:null}],logs};
    for(const p of [a,b])await p.waitForFunction(id=>JSON.parse(localStorage.getItem('sst_state_qa-account')).tasks[0]?.id===id,id);
  };
  await seed('partial lesson');await a.locator('#plan-backlog .backlog-group').evaluateAll(rows=>rows.forEach(row=>row.open=true));await a.locator('#plan-backlog [data-act=partial]').click();assert.equal(await a.locator('#f_min').inputValue(),'60');await a.locator('#f_min').fill('30');await a.locator('#msubmit').click();await synced(a);
  assert.equal(await a.locator('#plan-backlog .backlog-row').count(),1);await a.locator('#plan-backlog .backlog-group').evaluateAll(rows=>rows.forEach(row=>row.open=true));await a.locator('#plan-backlog [data-act=partial]').click();assert.equal(await a.locator('#f_min').inputValue(),'30');await a.locator('#msubmit').click();await synced(a);assert.equal(await a.locator('#plan-backlog .backlog-row').count(),0);assert.equal(serverState.logs.reduce((n,l)=>n+l.min,0),60);
  await seed('repair saved lesson',[{id:'saved-credit',task:'repair saved lesson',subj:'General Studies',topic:'repair saved lesson',min:60,credit:60,date:serverState.plan[0].date,at:Date.now()}]);
  await a.waitForFunction(()=>JSON.parse(localStorage.getItem('sst_state_qa-account')).tasks[0].done);await synced(a);assert.equal(serverState.tasks[0].spent,60);assert.equal(serverState.logs.length,1);assert.equal(await a.locator('#plan-backlog .backlog-row').count(),0);
  await seed('finished by other device');await a.locator('#plan-backlog .backlog-group').evaluateAll(rows=>rows.forEach(row=>row.open=true));await a.locator('#plan-backlog [data-act=partial]').click();await b.locator('#backHome').click();await b.locator('#plan-backlog .backlog-group').evaluateAll(rows=>rows.forEach(row=>row.open=true));await b.locator('#plan-backlog [data-act=partial]').click();await b.locator('#msubmit').click();await synced(b);await a.waitForFunction(()=>JSON.parse(localStorage.getItem('sst_state_qa-account')).tasks[0].done);
  await a.locator('#msubmit').click();assert.equal(await a.locator('#plan-backlog .backlog-row').count(),0);assert.equal(await a.evaluate(()=>JSON.parse(localStorage.getItem('sst_state_qa-account')).logs.length),1);assert.equal(serverState.logs.length,1);
  await a.evaluate(()=>navigator.serviceWorker.ready);await a.context().setOffline(true);await a.reload();await a.locator('#app').waitFor({state:'visible'});assert.equal(await a.locator('#plan-backlog .backlog-row').count(),0);assert.equal(await a.evaluate(()=>JSON.parse(localStorage.getItem('sst_state_qa-account')).tasks[0].spent),60);
  assert.deepEqual(errors,[]);console.log('PASS progress sync: current task updated with dialog open, partial/full defaults, old linked-credit repair, stale completion submission ignored, offline reload retained');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
