import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const core=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(new URL('../ssc-core.js',import.meta.url),'utf8')).toString('base64'));
const {logTaskProgress,repairTaskProgress,pendingPlan}=core;
const state=()=>({tasks:[{id:'lesson',pk:'2026-10-20|Quant|Ratio',orig:'2026-10-20',date:'2026-10-22',subj:'Quant',topic:'Ratio',plan:60,spent:0,done:false,doneDate:null}],plan:[{day:1,date:'2026-10-20',subj:'Quant',topic:'Ratio',min:60}],logs:[]});
const meta=id=>({id,date:'2026-10-22',at:1});
test('saving against latest task survives replacement of state objects',()=>{
 const s=state(),oldTask=s.tasks[0];s.tasks=s.tasks.map(t=>({...t}));const result=logTaskProgress(s,'lesson',60,meta('save'));
 assert(result.task.done);assert.equal(s.tasks[0].spent,60);assert.equal(oldTask.spent,0);assert.equal(s.logs[0].credit,60);assert.equal(pendingPlan(s,'2026-10-22').length,0);
});
test('partial progress stays partial, full remaining progress finishes once, stale submissions do not double-count',()=>{
 const s=state();logTaskProgress(s,'lesson',30,meta('part'));assert.equal(s.tasks[0].spent,30);assert(!s.tasks[0].done);assert.equal(pendingPlan(s,'2026-10-22')[0].gap,30);
 assert.equal(logTaskProgress(s,'lesson',30,meta('part')).minutes,0);assert.equal(s.logs.length,1);
 logTaskProgress(s,'lesson',60,meta('finish'));assert(s.tasks[0].done);assert.equal(s.tasks[0].spent,60);assert.equal(s.logs.reduce((n,l)=>n+l.min,0),60);
 assert.equal(logTaskProgress(s,'lesson',60,meta('stale')).minutes,0);assert.equal(s.logs.length,2);assert.equal(logTaskProgress(s,'removed',60,meta('missing')).reason,'missing');
});
test('saved linked study repairs lost completion without changing or inventing logs',()=>{
 const s=state();s.logs=[{id:'one',task:'lesson',min:30,date:'2026-10-20'},{id:'two',task:'lesson',min:30,credit:30,date:'2026-10-21'}];const logs=structuredClone(s.logs);
 assert(repairTaskProgress(s));assert(s.tasks[0].done);assert.equal(s.tasks[0].spent,60);assert.equal(s.tasks[0].doneDate,'2026-10-21');assert.deepEqual(s.logs,logs);assert.equal(pendingPlan(s,'2026-10-22').length,0);assert.equal(repairTaskProgress(s),false);
});
test('repair excludes uncredited extra study and duplicate IDs; partial work remains unfinished',()=>{
 const s=state();s.logs=[{id:'one',task:'lesson',min:30,credit:30,date:'2026-10-20'},{id:'one',task:'lesson',min:30,credit:30,date:'2026-10-20'},{id:'extra',task:'lesson',min:90,credit:0,date:'2026-10-22'},{id:'unrelated',min:90,date:'2026-10-22'}];
 repairTaskProgress(s);assert.equal(s.tasks[0].spent,30);assert(!s.tasks[0].done);assert.equal(pendingPlan(s,'2026-10-22')[0].gap,30);
});
