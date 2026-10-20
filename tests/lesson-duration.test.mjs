import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const core=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(new URL('../ssc-core.js',import.meta.url),'utf8')).toString('base64'));
const {setPlanLessonMinutes,lessonMinutes,pendingPlan}=core;
function state(){const plan=[{day:1,date:'2026-10-20',subj:'Quant',topic:'Partial',min:15},{day:1,date:'2026-10-20',subj:'Reasoning',topic:'Finished',min:12},{day:2,date:'2026-10-21',subj:'English',topic:'Future',min:20}];return {settings:{},plan,tasks:plan.slice(0,2).map((r,i)=>({...r,id:'t'+i,pk:[r.date,r.subj,r.topic].join('|'),orig:r.date,plan:r.min,spent:i?12:5,done:!!i,doneDate:i?'2026-10-20':null})),logs:[{id:'log',date:'2026-10-20',task:'t0',min:5,credit:5}],revisionHistory:[{id:'r',sourceKey:'lesson:t1',step:0,passed:true,date:'2026-10-21'}]};}
test('existing short lessons become 60 minutes without altering completed history or actual study',()=>{
 const s=state(),logs=structuredClone(s.logs),finished=structuredClone(s.tasks[1]),reviews=structuredClone(s.revisionHistory);
 assert.equal(lessonMinutes(s),60);assert(setPlanLessonMinutes(s,60,'2026-10-20'));assert.deepEqual(s.plan.map(r=>r.min),[60,12,60]);assert.equal(s.tasks[0].plan,60);assert.equal(s.tasks[0].spent,5);assert.equal(pendingPlan(s,'2026-10-20')[0].gap,55);assert.deepEqual(s.tasks[1],finished);assert.deepEqual(s.logs,logs);assert.deepEqual(s.revisionHistory,reviews);assert.equal(setPlanLessonMinutes(s,60,'2026-10-20'),false);
});
test('45-minute selection applies to pending work and preserves manual tasks and keys',()=>{
 const s=state();s.settings.lessonMinutes=45;s.tasks.push({id:'manual',plan:20,spent:0,done:false});const manual=structuredClone(s.tasks.at(-1)),key=s.tasks[0].pk;
 assert.equal(lessonMinutes(s),45);setPlanLessonMinutes(s,45,'2026-10-20');assert.equal(s.tasks[0].pk,key);assert.equal(s.tasks[0].id,'t0');assert.equal(s.plan[0].min,45);assert.deepEqual(s.tasks.at(-1),manual);assert.throws(()=>setPlanLessonMinutes(s,15,'2026-10-20'));
});
test('reducing an estimate uses already-recorded minutes and the linked study date',()=>{
 const s=state();s.plan[0].min=90;s.tasks[0].plan=90;s.tasks[0].spent=50;s.logs[0].min=50;s.logs[0].credit=50;
 setPlanLessonMinutes(s,45,'2026-10-22');assert(s.tasks[0].done);assert.equal(s.tasks[0].spent,50);assert.equal(s.tasks[0].doneDate,'2026-10-20');assert.equal(s.logs[0].min,50);
});
