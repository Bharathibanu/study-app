/* Responsive Home workflow using local test data; no production Firebase access. */
const {chromium}=require('playwright'),assert=require('assert/strict'),http=require('http'),fs=require('fs'),path=require('path');
(async()=>{
 const root=path.resolve(__dirname,'..'),server=http.createServer((req,res)=>{
  const name=new URL(req.url,'http://test').pathname;
  if(name==='/firebase-config.js'){res.setHeader('Content-Type','text/javascript');res.end('export const firebaseConfig = {};');return;}
  const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':file.endsWith('.json')?'application/json':'image/png');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{for(const width of [320,390,768,1440]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('#user').fill('DesignQA');await page.locator('#pass').fill('test-only-password');await page.locator('#lbtn').click();await page.locator('#app').waitFor({state:'visible'});await page.locator('#welcome').waitFor({state:'hidden'});
  await page.locator('[data-act=addTask]').first().click();await page.locator('#f_topic').fill('Seed');await page.locator('#msubmit').click();
  await page.evaluate(()=>{
   const key='sst_state_local',s=JSON.parse(localStorage.getItem(key));
   const date=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
   s.name='Bharathi';s.plan=[{day:1,date:date(-2),subj:'Quant',topic:'Percentage 1',min:60},{day:2,date:date(-1),subj:'General Studies',topic:'Polity 11',min:60},{day:3,date:date(0),subj:'Reasoning',topic:'Number Series 3',min:60},{day:3,date:date(0),subj:'English',topic:'Reading comprehension',min:60}];s.tasks=[];s.logs=[];localStorage.setItem(key,JSON.stringify(s));
  });await page.reload();await page.locator('.next-lesson').waitFor();
  assert.match(await page.locator('.next-lesson').textContent(),/Number Series 3/);
  if(width<860){const visible=await page.locator('#side .nav:visible').allTextContents();assert.deepEqual(visible,['Home','Plan','Practice','Revise','More']);}
  assert.equal(await page.locator('.schedule-group[open]').count(),0);assert.equal(await page.locator('.backlog-group[open]').count(),0);
  assert.equal(await page.locator('[data-disclosure=weekly]').evaluate(el=>el.open),false);
  await page.screenshot({path:'/tmp/study-home-'+width+'.png',fullPage:true});
  const next=page.locator('.next-lesson');await next.getByRole('button',{name:'Continue studying'}).click();assert.equal(await page.locator('#ttopic').inputValue(),'Number Series 3');await page.locator('[data-act=tToggle]').click();await page.locator('#backHome').click();await page.locator('.next-lesson').waitFor();
  const row=page.locator('.lesson-card').filter({hasText:'Reading comprehension'}).first();await row.locator('.lesson-menu summary').click();await row.getByRole('button',{name:'Pin today',exact:true}).click();assert.match(await next.textContent(),/Reading comprehension/);
  // An existing timer cannot be silently moved to the newly pinned lesson.
  await next.getByRole('button',{name:'Continue studying'}).click();assert.equal(await page.locator('#ttopic').inputValue(),'Number Series 3');
  await page.evaluate(()=>{globalThis.__designNow=Date.now;Date.now=()=>globalThis.__designNow()+61000;});await page.waitForTimeout(650);await page.locator('[data-act=tSave]').click();await page.evaluate(()=>{Date.now=globalThis.__designNow;});
  assert.equal(await page.locator('#f_min').inputValue(),'1');assert.notEqual(await page.locator('#f_task').inputValue(),'');assert.match(await page.locator('#f_task option:checked').textContent(),/Number Series 3/);await page.locator('#msubmit').click();await page.locator('#backHome').click();await next.waitFor();
  const group=page.locator('.schedule-group').filter({hasText:'Carried 2 days'}).first();await group.locator('summary').first().click();assert(await group.evaluate(el=>el.open));
  await next.getByRole('button',{name:'Log progress',exact:true}).click();await page.locator('#f_min').fill('30');await page.locator('#msubmit').click();assert(await group.evaluate(el=>el.open));assert.match(await next.textContent(),/30 min left/);
  await next.getByRole('button',{name:'Log progress',exact:true}).click();await page.locator('#msubmit').click();assert.match(await next.textContent(),/Number Series 3/);
  const completed=page.locator('[data-disclosure=completed-today]');await completed.locator('summary').first().click();assert.match(await completed.textContent(),/Reading comprehension/);
  const report=page.locator('[data-disclosure=weekly]');await report.locator('summary').click();assert(await report.evaluate(el=>el.open));
  // Subject filtering expands matches without changing actual progress.
  await page.selectOption('#backlog-subject','Quant');assert.equal(await page.locator('.backlog-group[open]').count(),1);assert.equal(await page.locator('#plan-backlog .backlog-row').count(),1);
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('sst_state_local')));assert.equal(stored.logs.reduce((n,l)=>n+l.min,0),61);assert.equal(stored.tasks.filter(t=>t.done).length,1);
  for(const theme of ['light','dark']){await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  // All action targets on the next card can be tapped comfortably.
  for(const button of await next.locator('button').all())assert((await button.boundingBox()).height>=44);
  if(width===390){await page.locator('#side [data-v=more]').click();await page.locator('#view [data-v=rep]').click();await page.goBack();await next.waitFor();assert.equal(await page.locator('h3').filter({hasText:'Achievement against my plan'}).count(),1);}
  await page.evaluate(()=>navigator.serviceWorker.ready);await page.context().setOffline(true);await page.reload();await next.waitFor();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('sst_state_local')).logs.reduce((n,l)=>n+l.min,0)),61);assert.deepEqual(errors,[]);await page.context().setOffline(false);
  console.log('PASS '+width+'px: five-tab navigation, focused Home, grouped lessons, contextual timer, pin/progress/disclosure retention, completion, subject filters, themes and offline data');await page.close();
 }}finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
