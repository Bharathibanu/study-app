import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const core=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(new URL('../ssc-core.js',import.meta.url),'utf8')).toString('base64'));
const {DEFAULT_RECOVERY,validateRecovery,backlogRecovery,addDays}=core;
const today='2026-10-20';
function fixture(){
 const plan=[{day:1,date:'2026-10-18',subj:'Quant',topic:'Older',min:140},{day:2,date:'2026-10-19',subj:'Reasoning',topic:'Pinned',min:70},...Array.from({length:7},(_,i)=>({day:i+3,date:addDays(today,i),subj:'English',topic:'Daily '+i,min:120}))];
 return {settings:{},plan,tasks:plan.map(r=>({...r,id:r.topic,pk:[r.date,r.subj,r.topic].join('|'),orig:r.date,plan:r.min,spent:0,done:false})),logs:[],dailyFocus:{[today]:{pins:['Pinned']}}};
}
function check(r){
 const assigned=new Map();
 for(const d of r.days){assert(d.target<=d.capacity);assert(d.reserved+d.buffer+d.target<=d.available);assert.equal(d.chunks.reduce((n,c)=>n+c.minutes,0),d.target);
  let end=0;for(const c of d.chunks){assert(c.start>=end);end=c.end;assert.equal(c.end-c.start,c.minutes);assert(d.windows.some(w=>c.start>=w.from && c.end<=w.to));assigned.set(c.id,(assigned.get(c.id)||0)+c.minutes);}
 }
 assert.equal([...assigned.values()].reduce((n,m)=>n+m,0),r.scheduled);assert.equal(r.total,r.scheduled+r.unscheduled);
}
test('390-minute windows reserve daily work and revision, spread backlog evenly and prioritise pins',()=>{
 const state=fixture(),before=structuredClone(state),r=backlogRecovery(state,today);
 assert.equal(r.dailyMinutes,390);assert.equal(r.days.length,7);assert.deepEqual(r.days.map(d=>d.target),[30,30,30,30,30,30,30]);assert.equal(r.days[0].regular,120);assert.equal(r.days[0].buffer,30);assert.equal(r.days[0].chunks[0].id,'Pinned');assert.equal(r.days[0].chunks[0].start,390);assert.equal(r.unscheduled,0);check(r);assert.deepEqual(state,before);
});
test('today ignores elapsed windows and manual remaining-time limit cannot overbook actual windows',()=>{
 const s=fixture();s.plan=s.plan.filter(r=>r.date!==today);s.tasks=s.tasks.filter(t=>t.date!==today);
 let r=backlogRecovery(s,today,19*60+30);assert.equal(r.days[0].available,120);assert(r.days[0].chunks.every(c=>c.start>=1170));check(r);
 s.dailyFocus[today].available=15;r=backlogRecovery(s,today,1170);assert.equal(r.days[0].available,15);assert.equal(r.days[0].target,0);check(r);
 r=backlogRecovery(s,today,23*60);assert.equal(r.days[0].available,0);assert.equal(r.days[0].target,0);assert.equal(r.scheduled,210);check(r);
});
test('overloaded days, partial progress, skipped dates, manual tasks and excess backlog are explicit',()=>{
 const s=fixture();s.settings.recovery={...structuredClone(DEFAULT_RECOVERY),days:2};s.plan.find(r=>r.date===today).min=400;
 s.tasks.find(t=>t.id==='Pinned').spent=20;s.tasks.push({id:'manual',date:addDays(today,1),orig:addDays(today,1),plan:250,spent:0,done:false});
 let r=backlogRecovery(s,today);assert.equal(r.days[0].shortfall,10);assert.equal(r.days[0].target,0);assert.equal(r.days[1].regular,370);assert.equal(r.scheduled,0);assert.equal(r.unscheduled,190);check(r);
 s.planFrom='2026-10-19';r=backlogRecovery(s,today);assert.equal(r.total,50);
});
test('time ranges stay inside windows even when a lesson crosses the evening gap',()=>{
 const s=fixture();s.settings.recovery={...structuredClone(DEFAULT_RECOVERY),days:1,buffer:0};s.plan=s.plan.filter(r=>r.date<today);s.plan[0].min=400;s.tasks[0].plan=400;
 const r=backlogRecovery(s,today);assert.equal(r.scheduled,390);assert.equal(r.unscheduled,80);assert(r.days[0].chunks.some(c=>c.start===1140));assert(r.days[0].chunks.some(c=>c.start===1260));check(r);
});
test('window validation rejects overlaps, overnight ranges and invalid recovery horizons',()=>{
 assert.equal(validateRecovery(DEFAULT_RECOVERY).windows.length,3);
 for(const edit of [{days:0},{days:31},{buffer:-1},{buffer:1.5},{windows:[{start:'04:00',end:'03:00'},...DEFAULT_RECOVERY.windows.slice(1)]},{windows:[DEFAULT_RECOVERY.windows[0],{start:'07:00',end:'09:00'},DEFAULT_RECOVERY.windows[2]]}])assert.throws(()=>validateRecovery({...structuredClone(DEFAULT_RECOVERY),...edit}));
});
