/* Offline vocabulary and date rollover, with a local account and no real Firebase. */
const {chromium}=require('playwright'),assert=require('assert/strict'),http=require('http'),fs=require('fs'),path=require('path');
(async()=>{
 const root=path.resolve(__dirname,'..'),server=http.createServer((req,res)=>{
  const name=new URL(req.url,'http://test').pathname;if(name==='/firebase-config.js'){res.setHeader('Content-Type','text/javascript');res.end('export const firebaseConfig = {};');return;}
  const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':file.endsWith('.json')?'application/json':'image/png');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});let deviceWords;
 try{for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900},timezoneId:'Asia/Kolkata',reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install();await page.clock.setFixedTime(new Date('2026-10-31T12:00:00+05:30'));await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('#user').fill('VocabularyQA');await page.locator('#pass').fill('test-only-password');await page.locator('#lbtn').click();await page.locator('#app').waitFor({state:'visible'});await page.locator('#welcome').waitFor({state:'hidden'});
  const nav=async view=>{const direct=page.locator('#side [data-v='+view+']');if(await direct.isVisible())await direct.click();else{await page.locator('#side [data-v=more]').click();await page.locator('#view [data-v='+view+']').first().click();}};
  await nav('notes');const panel=page.locator('#vocabulary');await panel.waitFor();const words=()=>panel.locator('[data-word]').evaluateAll(rows=>rows.map(r=>r.dataset.word));
  const first=await words();assert.equal(first.length,10);assert.equal(await panel.getAttribute('data-date'),'2026-10-31');assert.match(await panel.textContent(),/300 words across 30 sets/);
  await page.locator('[data-act=addNote]').click();await page.locator('#f_tag').fill('Retain');await page.locator('#f_text').fill('My existing note');await page.locator('#msubmit').click();await page.reload();await panel.waitFor();assert.deepEqual(await words(),first);
  // Focus after a date change refreshes just the vocabulary, preserving a modal draft.
  await page.locator('[data-act=addNote]').click();await page.locator('#f_text').fill('My unsaved midnight draft');await page.clock.setFixedTime(new Date('2026-11-01T00:01:00+05:30'));await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  const second=await words();assert.equal(second.length,10);assert(second.every(id=>!first.includes(id)));assert.equal(await panel.getAttribute('data-date'),'2026-11-01');assert.equal(await page.locator('#f_text').inputValue(),'My unsaved midnight draft');assert(await page.locator('#modal').isVisible());await page.locator('#msubmit').click();
  await page.reload();await panel.waitFor();assert.deepEqual(await words(),second);await page.getByText('My existing note',{exact:true}).waitFor();await page.getByText('My unsaved midnight draft',{exact:true}).waitFor();
  // An app left open also refreshes through its existing 20-second background check.
  await page.clock.setFixedTime(new Date('2026-11-02T00:01:00+05:30'));await page.clock.runFor(21000);assert.equal(await panel.getAttribute('data-date'),'2026-11-02');assert.notDeepEqual(await words(),second);
  await page.clock.setFixedTime(new Date('2026-11-03T00:01:00+05:30'));await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));assert.equal(await panel.getAttribute('data-date'),'2026-11-03');const third=await words();if(deviceWords)assert.deepEqual(third,deviceWords);else deviceWords=third;
  await page.evaluate(()=>navigator.serviceWorker.ready);await page.context().setOffline(true);await page.reload();await panel.waitFor();assert.deepEqual(await words(),third);
  await page.clock.setFixedTime(new Date('2026-11-04T00:01:00+05:30'));await page.evaluate(()=>window.dispatchEvent(new Event('focus')));assert.equal(await panel.getAttribute('data-date'),'2026-11-04');assert.notDeepEqual(await words(),third);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('sst_state_local')).notes.length),2);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);await page.context().setOffline(false);
  console.log('PASS '+width+'px: ten stable daily words, month-boundary rotation, focus/visibility/idle rollover, draft/notes preserved, matching devices and offline next-day words');await page.close();
 }}finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
