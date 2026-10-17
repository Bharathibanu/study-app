import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const core=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(new URL('../ssc-core.js',import.meta.url),'utf8')).toString('base64'));
const {dailyFocusSummary,weeklySubjectReview,mergeStates,sameState}=core;
const today='2026-10-17';
function state(){
 const plan=[{day:1,date:'2026-10-13',subj:'Quant',topic:'Old',min:60},{day:2,date:'2026-10-16',subj:'Reasoning',topic:'Recent',min:40},{day:3,date:today,subj:'Quant',topic:'Today',min:30},{day:4,date:'2026-10-18',subj:'English',topic:'Future',min:60}];
 return {plan,tasks:plan.map((r,i)=>({...r,id:'t'+i,pk:[r.date,r.subj,r.topic].join('|'),orig:r.date,date:today,plan:r.min,spent:0,done:false})),logs:[],practice:[],dailyFocus:{[today]:{pins:['t1'],available:80}}};
}
test('catch-up reserves today, uses pinned then oldest work, and caps partial allocation',()=>{
 const s=state(),f=dailyFocusSummary(s,today);assert.equal(f.todayMinutes,30);assert.equal(f.backlog,100);assert.equal(f.target,50);assert.deepEqual(f.chunks.map(r=>[r.id,r.minutes]),[['t1',40],['t0',10]]);
 s.dailyFocus[today].available=10;assert.equal(dailyFocusSummary(s,today).target,0);assert.equal(dailyFocusSummary(s,today).shortfall,20);
 s.dailyFocus[today].available=500;assert.equal(dailyFocusSummary(s,today).target,100);
 s.dailyFocus[today].available=0;assert.equal(dailyFocusSummary(s,today).available,0);
 delete s.dailyFocus[today].available;assert.equal(dailyFocusSummary(s,today).available,null);
});
test('pins expire by date, omit completed tasks and include manual tasks without adding them to plan gap',()=>{
 const s=state();s.tasks.push({id:'manual',subj:'English',topic:'Vocabulary',orig:today,date:today,plan:15,spent:0,done:false});s.dailyFocus[today].pins=['manual','t0','t0','t1','t2'];
 let f=dailyFocusSummary(s,today);assert.deepEqual(f.pins.map(r=>r.id),['manual','t0','t1']);assert.equal(f.backlog,100);
 s.tasks[0].spent=60;s.tasks[0].done=true;f=dailyFocusSummary(s,today);assert(!f.pins.some(r=>r.id==='t0'));assert.equal(f.backlog,40);
 assert.equal(dailyFocusSummary(s,'2026-10-18').pins.length,0);
 s.planFrom='2026-10-16';assert.equal(dailyFocusSummary(s,today).backlog,40);
});
test('weekly review uses inclusive seven days and weighted timed attempts, with current backlog separate',()=>{
 const s=state();s.logs=[{date:'2026-10-11',subj:'Quant',min:20},{date:today,subj:'Quant',min:10},{date:'2026-10-10',subj:'Quant',min:99},{date:'2026-10-18',subj:'Quant',min:99}];
 s.practice=[{date:'2026-10-11',subj:'Quant',attempted:2,correct:1,seconds:60},{date:today,subj:'Quant',attempted:8,correct:7,seconds:80},{date:today,subj:'Quant',attempted:10,correct:2,seconds:0},{date:'2026-10-10',subj:'Quant',attempted:100,correct:100,seconds:100}];
 const review=weeklySubjectReview(s,today),q=review.rows.find(r=>r.subj==='Quant');assert.equal(review.since,'2026-10-11');assert.equal(q.minutes,30);assert.equal(q.accuracy,50);assert.equal(q.seconds,14);assert.equal(q.backlogMinutes,60);
 const r=review.rows.find(r=>r.subj==='Reasoning');assert.equal(r.accuracy,null);assert.equal(r.seconds,null);assert.equal(r.backlogTopics,1);
});
test('new empty preferences preserve legacy equality; conflicting pins require review and independent days merge',()=>{
 assert(sameState({logs:[]},{logs:[],dailyFocus:{}}));
 const base=state(),left=structuredClone(base),right=structuredClone(base);left.dailyFocus[today].pins=['t0'];right.dailyFocus[today].pins=['t2'];assert(mergeStates(base,left,right).conflicts.length);
 right.dailyFocus[today].pins=['t1'];right.dailyFocus['2026-10-18']={pins:['t2']};assert.deepEqual(mergeStates(base,left,right).conflicts,[]);
});
