/* Serves test-only local auth endpoints so it never creates real Firebase accounts. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http=require('node:http'), fs=require('node:fs'), path=require('node:path');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const server=http.createServer((req,res)=>{
  const name=new URL(req.url,'http://test').pathname;
  if(name==='/firebase-config.js'){res.setHeader('Content-Type','text/javascript');res.end('export const firebaseConfig = {};');return;}
  const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':file.endsWith('.json')?'application/json':file.endsWith('.png')?'image/png':'text/plain');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
 try {
  for (const width of [390,1440]) {
   const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base);await page.locator('#user').fill('QA');await page.locator('#pass').fill('test-only-password');await page.locator('#lbtn').click();await page.locator('#app').waitFor({state:'visible'});await page.locator('#welcome').waitFor({state:'hidden'});
   const nav=async view=>{const direct=page.locator('#side [data-v="'+view+'"]');if(await direct.isVisible())await direct.click();else{await page.locator('#side [data-v="more"]').click();await page.locator('#view [data-v="'+view+'"] ').first().click();}};
   await nav('practice');await page.getByText('16 matching questions',{exact:true}).waitFor();await page.locator('[data-act=sscStart]').click();await page.locator('[data-act=sscAnswer][data-answer="0"]').click();await page.getByText('Review this answer',{exact:true}).waitFor();
   let s=await page.evaluate(()=>JSON.parse(localStorage.getItem('sst_state_local')));assert.equal(s.practice.length,1);assert.equal(s.practice[0].correct,0);assert.equal(s.mistakeBook.length,1);assert.equal(s.mistakeBook[0].cause,'Unclassified');
   await nav('mistakes');await page.locator('details.ssc-mistake summary').click();await page.locator('[data-act=sscEditMistake]').click();await page.locator('#f_cause').selectOption('Calculation');await page.locator('#msubmit').click();
   await nav('practice');await page.locator('[data-act=sscEnd]').click();await page.locator('[data-act=sscLog]').click();await page.locator('#f_topic').fill('Percentage');await page.locator('#f_attempted').fill('10');await page.locator('#f_correct').fill('6');await page.locator('#f_seconds').fill('200');await page.locator('#msubmit').click();await page.getByText('Needs practice',{exact:true}).waitFor();
   await page.evaluate(()=>{const key='sst_state_local',s=JSON.parse(localStorage.getItem(key));s.tasks.push({id:'test-lesson',orig:'2026-01-01',date:'2026-01-01',done:true,doneDate:'2026-01-01',subj:'Quant',topic:'Ratio 1',plan:20,spent:20});localStorage.setItem(key,JSON.stringify(s));});
   await page.reload();await page.locator('#app').waitFor({state:'visible'});await nav('revisionQueue');await page.locator('[data-act=sscReviewPass]').first().click();
   s=await page.evaluate(()=>JSON.parse(localStorage.getItem('sst_state_local')));assert.equal(s.revisionHistory.length,1);assert.equal(s.revisionHistory[0].passed,true);
   await nav('mockAnalysis');await page.locator('[data-act=sscMock]').click();await page.locator('#f_name').fill('Section QA');await page.locator('#f_correct0').fill('18');await page.locator('#f_wrong0').fill('4');await page.locator('#f_minutes0').fill('15');await page.locator('#msubmit').click();
   s=await page.evaluate(()=>JSON.parse(localStorage.getItem('sst_state_local')));assert.equal(s.mockAnalyses.length,1);assert.equal(s.mockAnalyses[0].sections[0].wrong,4);await page.getByText('34.00 / 200',{exact:true}).waitFor();
   await nav('pyq');await page.getByText('0 imported PYQs',{exact:true}).waitFor();assert.equal(await page.getByText('Original practice · not a PYQ',{exact:true}).count(),0);
   const sourced={questions:[{id:'test-source',kind:'pyq',subj:'Quant',topic:'Ratio',exam:'CGL',year:2025,tier:'Tier I',paperDate:'2025-09-12',shift:'1',questionNumber:'1',sourceTitle:'QA fixture — not an actual paper',sourceUrl:'https://ssc.gov.in/',reuseBasis:'Test fixture only',question:'QA question',options:['a','b','c','d'],answer:0,explanation:'QA answer'}]};
   await page.locator('[data-chg=sscImportBank]').setInputFiles({name:'source-test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(sourced))});await page.getByText('1 imported PYQs',{exact:true}).waitFor();
   await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await page.context().setOffline(true);await page.reload();await page.locator('#app').waitFor({state:'visible'});await nav('mistakes');await page.locator('details.ssc-mistake summary').waitFor();
   s=await page.evaluate(()=>JSON.parse(localStorage.getItem('sst_state_local')));assert.equal(s.mistakeBook[0].cause,'Calculation');assert.equal(s.mockAnalyses.length,1);
   await nav('pyq');await page.getByText('1 imported PYQs',{exact:true}).waitFor();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   assert.deepEqual(errors,[]);console.log('PASS '+width+'px: question attempt, mistake edit, weak-topic stats, revision, mock scoring, sourced bank import, persistence and offline reload');await page.close();
  }
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
