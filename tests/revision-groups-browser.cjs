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
  const nav=async view=>{const direct=page.locator('#side [data-v='+view+']');if(await direct.isVisible())await direct.click();else{await page.locator('#side [data-v=more]').click();await page.locator('#view [data-v='+view+']').first().click();}};
  await page.locator('[data-act=addTask]').first().click();await page.locator('#f_topic').fill('Seed');await page.locator('#msubmit').click();
  await page.evaluate(()=>{
    const key='sst_state_local',s=JSON.parse(localStorage.getItem(key));
    const date=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
    s.tasks=[];s.revisionHistory=[];s.mistakeBook=[];const stages=[1,3,7,15,30];
    stages.forEach((interval,step)=>{const id='stage-'+interval;s.tasks.push({id,subj:'Reasoning',topic:'Stage lesson '+interval,orig:date(-40),date:date(-40),done:true,doneDate:date(-40),plan:30,spent:30});
      for(let i=0;i<step;i++)s.revisionHistory.push({id:id+'-pass-'+i,sourceKey:'lesson:'+id,step:i,passed:true,date:date(-40+stages[i]),at:i+1,topic:'Stage lesson '+interval});
    });
    for(let i=0;i<61;i++)s.tasks.push({id:'batch-'+i,subj:'Quant',topic:'Batch '+i,orig:date(-3),date:date(-3),done:true,doneDate:date(-3),plan:15,spent:15});
    s.tasks.push({id:'upcoming',subj:'English',topic:'Upcoming lesson',orig:date(0),date:date(0),done:true,doneDate:date(0),plan:15,spent:15});
    s.mistakeBook.push({id:'mistake',subj:'Quant',topic:'Review mistake',question:'Test question',correctAnswer:'Test answer',method:'Method',date:date(-2),archived:false});localStorage.setItem(key,JSON.stringify(s));
  });await page.reload();await nav('revisionQueue');
  assert.equal(await page.locator('.revision-stage').count(),5);assert.equal(await page.locator('.revision-item').count(),68);
  for(const n of [1,3,7,15,30]){const stage=page.locator('.revision-stage[data-stage="'+n+'"]');await stage.getByRole('heading',{name:'Day '+n,exact:true}).waitFor();await stage.getByText('Stage lesson '+n,{exact:true}).waitFor();}
  const one=page.locator('.revision-stage[data-stage="1"]');assert.equal(await one.locator('.revision-item').count(),64);
  assert.equal(await one.locator('.revision-item small').first().evaluate(el=>getComputedStyle(el).display),'block');
  assert.equal(await one.getByRole('button',{name:'See mistake',exact:true}).count(),1);
  const upcoming=one.locator('.revision-item').filter({has:page.getByText('Upcoming lesson',{exact:true})});assert.equal(await upcoming.getByRole('button',{name:'Recalled',exact:true}).count(),0);
  const source=one.locator('.revision-item').filter({has:page.getByText('Stage lesson 1',{exact:true})});await source.getByRole('button',{name:'Recalled',exact:true}).click();
  await page.locator('.revision-stage[data-stage="3"]').getByText('Stage lesson 1',{exact:true}).waitFor();
  await page.locator('[data-act=sscDeleteReview]').first().click();await one.getByText('Stage lesson 1',{exact:true}).waitFor();
  await one.locator('.revision-item').filter({has:page.getByText('Stage lesson 1',{exact:true})}).getByRole('button',{name:'Needs review',exact:true}).click();
  const retry=one.locator('.revision-item').filter({has:page.getByText('Stage lesson 1',{exact:true})});await retry.getByText('Upcoming',{exact:true}).waitFor();assert.equal(await retry.getByRole('button',{name:'Recalled',exact:true}).count(),0);
  await page.evaluate(()=>navigator.serviceWorker.ready);await page.context().setOffline(true);await page.reload();await page.locator('.revision-stage').first().waitFor();assert.equal(await page.locator('.revision-stage').count(),5);assert.equal(await page.locator('.revision-item').count(),68);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);await page.context().setOffline(false);
  console.log('PASS '+width+'px: five labelled stage boxes, all 68 reviews, readable metadata, due/upcoming actions, pass/undo/retry and offline reload');await page.close();
 }}finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
