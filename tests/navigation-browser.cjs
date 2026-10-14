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
  await nav('notes');assert.equal(await page.getByText('Formula vault',{exact:true}).count(),0);await page.locator('[data-act=addNote]').click();await page.locator('#f_tag').fill('Retain');await page.locator('#f_text').fill('My personal note stays');await page.locator('#msubmit').click();
  await page.evaluate(()=>{const key='sst_state_local',s=JSON.parse(localStorage.getItem(key));s.plan=[{day:1,date:'2099-01-01',subj:'Quant',topic:'Ratio 1',min:60}];localStorage.setItem(key,JSON.stringify(s));});await page.reload();await page.locator('#vtitle').filter({hasText:'Notes & Vocabulary'}).waitFor();await page.getByText('My personal note stays',{exact:true}).waitFor();
  await page.locator('#backHome').click();await page.locator('#vtitle').filter({hasText:'Home'}).waitFor();await page.getByText('Achievement against my plan',{exact:true}).waitFor();assert.equal(await page.locator('#backHome').isVisible(),false);
  await nav('rep');const sectionLength=await page.evaluate(()=>history.length);
  for(const view of ['study','tricks','plan','revisionQueue']){await nav(view);assert.equal(await page.getByText('Achievement against my plan',{exact:true}).count(),0);}
  assert.equal(await page.evaluate(()=>history.length),sectionLength);await page.goBack();await page.locator('#vtitle').filter({hasText:'Home'}).waitFor();assert(await page.locator('#app').isVisible());
  await page.goForward();await page.locator('#vtitle').filter({hasText:'Automatic Revision Queue'}).waitFor();await page.reload();await page.locator('#vtitle').filter({hasText:'Automatic Revision Queue'}).waitFor();await page.goBack();await page.locator('#vtitle').filter({hasText:'Home'}).waitFor();
  await nav('notes');await page.locator('[data-act=addNote]').click();await page.locator('#modal').waitFor({state:'visible'});await page.goBack();await page.locator('#vtitle').filter({hasText:'Home'}).waitFor();assert.equal(await page.locator('#modal').isVisible(),false);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);await page.goBack();await page.waitForURL('about:blank');console.log('PASS '+width+'px: Home-only achievement, vault removed/personal notes retained, one section history entry, Back/Forward/reload, Home button and modal Back');await page.close();
 }}finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
