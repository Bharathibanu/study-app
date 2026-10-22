import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const core=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(new URL('../ssc-core.js',import.meta.url),'utf8')).toString('base64'));
const {applyRecordEdit,logBookPages}=core;
test('an open form updates the current record and preserves independent remote edits',()=>{
 const original={id:'one',title:'Old',note:'Old note',done:false},latest={...original,note:'Remote note',done:true};
 const rows=[latest];applyRecordEdit(rows,'one',original,{title:'Local title',note:'Old note'},{title:'Old',note:'Old note'});
 assert.equal(latest.title,'Local title');assert.equal(latest.note,'Remote note');assert(latest.done);assert.equal(original.title,'Old');
});
test('conflicting or deleted records retain data; edits are atomic',()=>{
 const original={id:'one',title:'Old',note:'Old note'},current={...original,note:'Remote note'},rows=[current],before=structuredClone(current);
 assert.throws(()=>applyRecordEdit(rows,'one',original,{title:'Local title',note:'Other note'}),/changed on another device/);assert.deepEqual(current,before);
 assert.throws(()=>applyRecordEdit([],'one',original,{title:'Local title'}),/deleted on another device/);
});
test('unchanged fields and form defaults do not overwrite current data',()=>{
 const original={id:'one',title:'Old'},latest={...original,note:'Remote note'},rows=[latest];
 applyRecordEdit(rows,'one',original,{title:'Old',note:''},{title:'Old',note:''});assert.equal(latest.note,'Remote note');
 applyRecordEdit(rows,'one',{...latest},{title:'Same remote title'},{title:'Old'});assert.equal(latest.title,'Same remote title');
});
test('book pages are credited to the latest book and never exceed the remaining pages',()=>{
 const state={books:[{id:'b',total:20,start:0,log:[]}]};let result=logBookPages(state,'b',12,'2026-10-22');assert.equal(result.pages,12);
 state.books=structuredClone(state.books);result=logBookPages(state,'b',12,'2026-10-22');assert.equal(result.pages,8);assert.equal(state.books[0].log.reduce((n,l)=>n+l.pages,0),20);
 result=logBookPages(state,'b',10,'2026-10-22');assert.equal(result.pages,0);assert.equal(state.books[0].log.length,2);assert.equal(logBookPages(state,'missing',10,'2026-10-22').book,null);
});
test('invalid book entries leave history unchanged',()=>{
 const s={books:[{id:'b',total:20,start:5,log:[]}]};for(const [pages,date] of [[0,'2026-10-22'],[-1,'2026-10-22'],[5,'2026-02-30']])assert.throws(()=>logBookPages(s,'b',pages,date));assert.deepEqual(s.books[0].log,[]);
});
