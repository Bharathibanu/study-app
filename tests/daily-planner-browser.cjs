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
  const priority=page.locator('.card').filter({has:page.getByRole('heading',{name:'My three priorities today',exact:true})});
  const catchup=page.locator('.card').filter({has:page.getByRole('heading',{name:'Daily catch-up target',exact:true})});
  const weekly=page.locator('.card').filter({has:page.getByRole('heading',{name:'Weekly subject review',exact:true})});
  for(let i=0;i<3;i++)await list.getByRole('button',{name:'Pin today',exact:true}).first().click();
  assert.equal(await priority.locator('li').count(),3);await list.getByRole('button',{name:'Pin today',exact:true}).first().click();assert.equal(await priority.locator('li').count(),3);
  await priority.getByRole('button',{name:'Unpin',exact:true}).first().click();assert.equal(await priority.getByRole('button',{name:'Unpin',exact:true}).count(),2);
  await list.getByRole('button',{name:'Pin today',exact:true}).first().click();assert.equal(await priority.locator('li').count(),3);
  await catchup.getByRole('button',{name:'Set remaining time'}).click();await page.locator('#f_minutes').fill('105');await page.locator('#msubmit').click();assert.match(await catchup.textContent(),/Catch-up target: 45 min/);assert.match(await catchup.textContent(),/Today’s unfinished plan: 60 min/);
  await page.selectOption('#backlog-age','14');await list.getByRole('button',{name:'Log progress'}).click();await page.locator('#f_min').fill('60');await page.locator('#msubmit').click();assert.equal(await priority.getByRole('button',{name:'Unpin',exact:true}).count(),2);
  // Seed weekly attempts with known weighted accuracy/speed; add no study hours.
  await page.evaluate(()=>{const key='sst_state_local',s=JSON.parse(localStorage.getItem(key)),date=s.logs.at(-1).date;s.practice=[{id:'weekly-a',subj:'Quant',topic:'Test',date,attempted:10,correct:8,seconds:200},{id:'weekly-b',subj:'Quant',topic:'Test',date,attempted:10,correct:4,seconds:0}];localStorage.setItem(key,JSON.stringify(s));});
  await page.reload();await priority.waitFor();assert.equal(await priority.getByRole('button',{name:'Unpin',exact:true}).count(),2);assert.match(await catchup.textContent(),/Catch-up target: 45 min/);
  const quant=weekly.locator('tbody tr').filter({has:page.getByRole('cell',{name:'Quant',exact:true})});assert.match(await quant.textContent(),/60.0%/);assert.equal(await quant.locator('td').last().textContent(),'20.0');
  await page.evaluate(()=>navigator.serviceWorker.ready);await page.context().setOffline(true);await page.reload();await priority.waitFor();assert.equal(await priority.getByRole('button',{name:'Unpin',exact:true}).count(),2);assert.match(await catchup.textContent(),/Catch-up target: 45 min/);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);await page.context().setOffline(false);
  console.log('PASS '+width+'px: three-pin limit, unpin/completion, catch-up budget, weekly weighted metrics, saved preferences and offline reload');await page.close();
 }}finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
