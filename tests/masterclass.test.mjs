import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const text=fs.readFileSync(new URL('../mental-masterclass.js',import.meta.url),'utf8');
const {MASTERCLASS_ADDITIONS,MERGED_EXAMPLES,MASTERCLASS_TEST,suggestedMethod,masterclassResources,mentalPracticeQuestions}=await import('data:text/javascript;base64,'+Buffer.from(text).toString('base64'));
test('all ten timed-test answers match independent multiplication',()=>{
 assert.equal(MASTERCLASS_TEST.length,10);for(const q of MASTERCLASS_TEST){const factors=q.t.match(/^(\d+) ×\s*(\d+) = \?$/);assert(factors,q.t);assert.equal(q.a,Number(factors[1])*Number(factors[2]));assert(q.explanation);}assert.deepEqual(MASTERCLASS_TEST[0].opts,[9702,9802,9602,9792]);
});
test('masterclass merges overlaps and adds omitted methods with conditions',()=>{
 assert.equal(MASTERCLASS_ADDITIONS.length,12);assert.equal(new Set(MASTERCLASS_ADDITIONS.map(m=>m.title)).size,12);
 for(const m of MASTERCLASS_ADDITIONS){assert(m.level>=1&&m.level<=5);assert(m.steps.length);assert(m.question);assert(m.solution);assert(m.condition);}
 assert(MERGED_EXAMPLES['×11 for two digits'].some(example=>example.includes('8679')));assert.equal(789*11,8679);assert.equal(997*994,991018);
});
test('method chooser enforces digit-pattern conditions and returns exact products',()=>{
 assert.match(suggestedMethod(43,47).method,/Same tens/);assert(!suggestedMethod(43,46).method.includes('Same tens'));assert.equal(suggestedMethod(12345,12).answer,148140);assert.match(suggestedMethod(48,125).method,/125/);assert.throws(()=>suggestedMethod(2.5,20));assert.throws(()=>suggestedMethod(1000000,2));
});
test('seven-day completion and square/fraction references are independent of timetable hours',()=>{
 const html=masterclassResources([{id:'day:2'}]);assert(html.includes('data-day="2" checked'));assert(html.includes('50²'));assert(html.includes('2500'));assert(html.includes('0.125'));assert(html.includes('does not award study minutes'));
});

test('expanded-level practice includes new methods and mathematically valid answers',()=>{
 for(let level=1;level<=5;level++){
  const questions=mentalPracticeQuestions(level,50);assert.equal(questions.length,50);assert.equal(new Set(questions.map(q=>q.t)).size,50);
  for(const q of questions){const [x,y]=q.operands;const expected=q.operation==='multiply'?x*y:q.operation==='percentage'?x*y/100:x/y;assert.equal(q.a,expected);assert(q.explanation);}
 }
 const special=mentalPracticeQuestions(2,28);for(const multiplier of [75,101,125,999,1001])assert(special.some(q=>q.operands[1]===multiplier));
});

test('five-question special-multiplier sets vary across all taught multipliers',()=>{
 const found=new Set();for(let seed=1;seed<=100;seed++){let current=Math.imul(seed,2654435761)>>>0;const random=()=>{current=(Math.imul(current,1664525)+1013904223)>>>0;return current/2**32;};for(const q of mentalPracticeQuestions(2,5,random))found.add(q.operands[1]);}
 assert.deepEqual(found,new Set([5,9,11,12,15,20,25,50,75,99,101,125,999,1001]));
});
