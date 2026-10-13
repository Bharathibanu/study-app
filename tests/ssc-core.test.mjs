import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
// Browser files are ESM without changing repository package declarations.
const source=fs.readFileSync(new URL('../ssc-core.js',import.meta.url),'utf8');
const core=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const {mergeStates,sameState,topicStats,revisionQueue,mockResult,validateBank,validateAttempt,validateMockSections}=core;
const copy=x=>JSON.parse(JSON.stringify(x));
test('two devices append different records without losing either',()=>{
 const base={_u:1,todos:[{id:'a',title:'old'}],logs:[],settings:{target:6}};
 const local=copy(base),remote=copy(base);local.todos.push({id:'b',title:'local'});remote.todos.push({id:'c',title:'remote'});
 const result=mergeStates(base,local,remote);assert.deepEqual(result.conflicts,[]);assert.deepEqual(new Set(result.state.todos.map(t=>t.id)),new Set(['a','b','c']));
});
test('same-record collisions stop overwrite; different fields can merge',()=>{
 const base={_u:1,todos:[{id:'a',title:'old',done:false}]};
 const local=copy(base),remote=copy(base);local.todos[0].title='mine';remote.todos[0].title='theirs';assert(mergeStates(base,local,remote).conflicts.length);
 remote.todos[0].title='old';remote.todos[0].done=true;const result=mergeStates(base,local,remote);assert.deepEqual(result.conflicts,[]);assert.equal(result.state.todos[0].title,'mine');assert.equal(result.state.todos[0].done,true);
});
test('deletions survive stale reads and conflict with simultaneous edits',()=>{
 const base={_u:1,todos:[{id:'a',title:'old'}]},local={_u:2,todos:[]};assert.equal(mergeStates(base,local,base).state.todos.length,0);
 const remote=copy(base);remote.todos[0].title='new';assert(mergeStates(base,local,remote).conflicts.length);
});
test('unknown baseline is conservative and legacy empty arrays do not cause conflicts',()=>{
 assert(sameState({_u:1,logs:[]},{_u:2,logs:[],practice:[],mistakeBook:[],revisionHistory:[],mockAnalyses:[]}));
 assert(mergeStates(null,{_u:2,logs:[{id:'local'}]},{_u:1,logs:[]}).conflicts.length);
 assert.equal(mergeStates(null,{_u:0,logs:[]},{_u:4,logs:[{id:'remote'}]}).state.logs[0].id,'remote');
});
test('study minutes and revision accuracy remain separate from question attempts',()=>{
 const stats=topicStats([{subj:'Quant',topic:'Percentage 1',attempted:5,correct:4,skipped:1,seconds:100},{subj:'Quant',topic:'Percentage 2',attempted:5,correct:2,skipped:0,seconds:150}]);
 assert.equal(stats.length,1);assert.equal(stats[0].accuracy,60);assert.equal(stats[0].averageSeconds,25);assert.equal(stats[0].weak,true);
 assert.throws(()=>validateAttempt({attempted:5,correct:6,skipped:0,seconds:10}));
});
test('automatic revision follows 1/3/7/15/30 and retries failed reviews tomorrow',()=>{
 const state={tasks:[{id:'t',done:true,doneDate:'2026-10-01',subj:'Quant',topic:'Ratio'}],mistakeBook:[],revisionHistory:[]};
 let queue=revisionQueue(state,'2026-10-02');assert.equal(queue[0].due,'2026-10-02');assert.equal(queue[0].step,0);
 state.revisionHistory.push({sourceKey:'lesson:t',step:0,passed:false,date:'2026-10-02',at:1});assert.equal(revisionQueue(state,'2026-10-02')[0].due,'2026-10-03');
 state.revisionHistory.push({sourceKey:'lesson:t',step:0,passed:true,date:'2026-10-03',at:2});queue=revisionQueue(state,'2026-10-03');assert.equal(queue[0].due,'2026-10-04');
 for(let step=1;step<5;step++)state.revisionHistory.push({sourceKey:'lesson:t',step,passed:true,date:'2026-11-01',at:step+2});assert.equal(revisionQueue(state,'2026-12-01').length,0);
});
test('mock scores include negative marking and skipped questions',()=>{
 const sections=validateMockSections([{subj:'Quant',total:25,correct:18,wrong:4,marks:2,penalty:.5,minutes:15}]);const result=mockResult(sections);assert.equal(result.score,34);assert.equal(result.negative,2);assert.equal(result.skipped,3);
 assert.throws(()=>validateMockSections([{subj:'Quant',total:25,correct:25,wrong:1,marks:2,penalty:.5,minutes:15}]));
});
test('question provenance is mandatory; no originals can masquerade as PYQs',()=>{
 const starter=JSON.parse(fs.readFileSync(new URL('../questions/starter.json',import.meta.url)));const rows=validateBank(starter);assert.equal(rows.length,16);assert(rows.every(q=>q.kind==='original'));assert.throws(()=>validateBank({template:true,questions:rows}),/template/);
 assert.throws(()=>validateBank([{...rows[0],kind:'pyq',year:2025}]),/requires/);
 assert.throws(()=>validateBank([rows[0],rows[0]]),/unique/);
 assert.throws(()=>validateBank([{...rows[0],answer:5}]),/four options/);
});

test('different concurrent sessions on the same task require review even for equal minute totals',()=>{
 const base={_u:1,tasks:[{id:'t',spent:0}],logs:[]};
 const local={_u:2,tasks:[{id:'t',spent:30}],logs:[{id:'l',task:'t',min:30}]};
 const remote={_u:2,tasks:[{id:'t',spent:30}],logs:[{id:'r',task:'t',min:30}]};
 assert(mergeStates(base,local,remote).conflicts.some(path=>path.startsWith('task-progress')));
});
