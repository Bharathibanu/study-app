const {chromium}=require('playwright');const assert=require('assert/strict');const http=require('http'),fs=require('fs'),path=require('path');
(async()=>{
 const root=path.resolve(__dirname,'..'),server=http.createServer((req,res)=>{
  const name=new URL(req.url,'http://test').pathname;if(name==='/firebase-config.js'){res.setHeader('Content-Type','text/javascript');res.end('export const firebaseConfig = {};');return;}
  const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':file.endsWith('.json')?'application/json':'image/png');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base);await page.locator('#user').fill('NavigationQA');await page.locator('#pass').fill('test-only-password');await page.locator('#lbtn').click();await page.locator('#app').waitFor({state:'visible'});await page.locator('#welcome').waitFor({state:'hidden'});
  // Save a real task first so the local account has a persisted state.
  await page.locator('[data-act=addTask]').first().click();await page.locator('#f_topic').fill('Seed');await page.locator('#msubmit').click();
  await page.evaluate(()=>{
    const key='sst_state_local',s=JSON.parse(localStorage.getItem(key));
    const day=age=>{const d=new Date();d.setDate(d.getDate()-age);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
    s.plan=Array.from({length:15},(_,i)=>({day:i+1,date:day(i),subj:i%2?'Reasoning':'Quant',topic:'Lesson '+i,min:30}));
    s.plan.push({day:99,date:day(-1),subj:'English',topic:'Future',min:60},{day:100,date:day(16),subj:'English',topic:'Skipped',min:60},{day:98,date:day(2),subj:'English',topic:'Finished',min:30});
    const r=s.plan.at(-1);s.tasks=[{id:'finished',pk:r.date+'|'+r.subj+'|'+r.topic,orig:r.date,date:day(0),subj:r.subj,topic:r.topic,plan:30,spent:30,done:true,doneDate:day(0)}];s.planFrom=day(15);localStorage.setItem(key,JSON.stringify(s));
  });await page.reload();const list=page.locator('#plan-backlog');await list.waitFor();
  const recovery=page.locator('#recovery-plan');await recovery.waitFor();assert.equal(await recovery.locator('.recovery-day').count(),7);assert.match(await recovery.textContent(),/04:00–08:00/);assert.match(await recovery.textContent(),/19:00–20:00/);assert.match(await recovery.textContent(),/21:00–22:30/);assert.match(await recovery.textContent(),/6.5 hours/);
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('sst_state_local')));
  await recovery.getByRole('button',{name:'Edit study windows'}).click();await page.locator('#f_start1').fill('07:00');await page.locator('#f_end1').fill('09:00');await page.locator('#msubmit').click();await page.locator('#toast').filter({hasText:'must not overlap'}).waitFor();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('sst_state_local')).settings.recovery || null),null);
  await recovery.getByRole('button',{name:'Edit study windows'}).click();await page.locator('#f_days').fill('3');await page.locator('#f_buffer').fill('45');await page.locator('#f_start0').fill('05:00');await page.locator('#msubmit').click();
  assert.equal(await recovery.locator('.recovery-day').count(),3);assert.match(await recovery.textContent(),/05:00–08:00/);assert.match(await recovery.textContent(),/5.5 hours/);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('sst_state_local')));assert.deepEqual(saved.plan,before.plan);assert.deepEqual(saved.logs,before.logs);assert.deepEqual(saved.tasks,before.tasks);
  assert.equal(saved.settings.recovery.days,3);assert.equal(saved.settings.recovery.buffer,45);
  const dates=await recovery.locator('.recovery-day').evaluateAll(els=>els.map(e=>e.dataset.date));assert(dates[1]>dates[0]);
  await recovery.locator('.recovery-day').nth(1).locator('summary').click();assert.equal(await recovery.locator('.recovery-day').nth(1).getByRole('button',{name:'Log progress'}).count(),0);
  assert(await recovery.locator('.recovery-chunk').count()>0);await recovery.getByRole('button',{name:'Refresh plan'}).click();assert.equal(await recovery.locator('.recovery-day').count(),3);
  await page.evaluate(()=>navigator.serviceWorker.ready);await page.context().setOffline(true);await page.reload();await recovery.waitFor();assert.match(await recovery.textContent(),/05:00–08:00/);assert.equal(await recovery.locator('.recovery-day').count(),3);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);await page.context().setOffline(false);
  console.log('PASS '+width+'px: exact study windows, recovery dates/chunks, overlap validation, saved edits, unchanged lessons/progress, refresh and offline reload');await page.close();
 }}finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
