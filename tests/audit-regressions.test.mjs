import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const core=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(new URL('../ssc-core.js',import.meta.url),'utf8')).toString('base64'));
test('postponing plan moves linked task keys/dates without losing progress, pins, revisions or logs',()=>{
 const s={plan:[{date:'2026-10-20',day:1,subj:'Quant',topic:'Ratio',min:60},{date:'2026-10-21',day:2,subj:'Quant',topic:'Ratio',min:60}],tasks:[{id:'stable',pk:'2026-10-20|Quant|Ratio',orig:'2026-10-20',date:'2026-10-20',plan:60,spent:15,done:false}],logs:[{id:'l',task:'stable',min:15}],dailyFocus:{'2026-10-20':{pins:['stable']}},revisionHistory:[]};
 const logs=structuredClone(s.logs);assert.equal(core.postponePlan(s,'2026-10-20'),2);assert.equal(s.tasks[0].id,'stable');assert.equal(s.tasks[0].pk,'2026-10-21|Quant|Ratio');assert.equal(s.tasks[0].orig,'2026-10-21');assert.equal(s.tasks[0].date,'2026-10-21');assert.equal(s.tasks[0].spent,15);assert.deepEqual(s.logs,logs);
 assert.equal(core.pendingPlan(s,'2026-10-21')[0].gap,45);
});
test('invalid backups are rejected before replacing active state; older valid backups remain supported',()=>{
 const valid={logs:[{date:'2026-10-20',subj:'Quant',min:15}],plan:[],tasks:[]};assert.equal(core.validateBackup(valid),valid);assert(core.validateBackup({logs:[]}));
 for(const bad of [{logs:[],tasks:null},{logs:[],plan:[null]},{logs:[],settings:[]},{logs:[{date:'2026-02-30',subj:'Quant',min:15}]},{logs:[],tasks:[{id:'bad',date:'2026-10-20',orig:'2026-10-20',plan:30,spent:-1,done:false}]},{logs:[],dailyFocus:{'2026-10-20':{pins:7}}}])assert.throws(()=>core.validateBackup(bad));
});
test('service-worker activation preserves caches belonging to other apps on the same origin',async()=>{
 const handlers={},removed=[];let completed;const source=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8'),current=source.match(/const CACHE = '([^']+)'/)[1];
 vm.runInNewContext(source,{self:{addEventListener:(name,fn)=>handlers[name]=fn,clients:{claim:async()=>{}}},caches:{keys:async()=>['study-tracker-v1',current,'other-app-v2'],delete:async key=>removed.push(key)}});
 handlers.activate({waitUntil:p=>completed=p});await completed;assert.deepEqual(removed,['study-tracker-v1']);
});
test('CSV plan validation rejects impossible dates, negative durations and duplicate lesson keys',()=>{
 const row={day:1,date:'2026-10-20',subj:'Quant',topic:'Ratio',min:60};assert.equal(core.validatePlanRows([row])[0],row);
 for(const edit of [{date:'2026-02-30'},{day:0},{min:-60},{min:0},{subj:''}])assert.throws(()=>core.validatePlanRows([{...row,...edit}]));
 assert.throws(()=>core.validatePlanRows([row,{...row}]));assert(core.validStudyDate('2028-02-29'));assert(!core.validStudyDate('2026-02-29'));
});
