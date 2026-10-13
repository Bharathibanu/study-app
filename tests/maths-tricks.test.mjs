import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const source=fs.readFileSync(new URL('../maths-tricks.js',import.meta.url),'utf8');
const {multiplicationQuestions,VISUAL_TRICKS,SSC_MATHS,modelExercise,trickVisual,sscMathHTML}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
test('every table from 12 through 30 is complete and numerically correct',()=>{
 for(let base=12;base<=30;base++){const questions=multiplicationQuestions(String(base),20,20);assert.equal(questions.length,20);assert.equal(new Set(questions.map(q=>q.multiplier)).size,20);for(const q of questions){assert.equal(q.base,base);assert.equal(q.a,base*q.multiplier);assert(q.multiplier>=1&&q.multiplier<=20);}}
});
test('mixed tables include all 19 bases and extended multipliers, with no repeats',()=>{
 const questions=multiplicationQuestions('mixed',50,950);assert.equal(questions.length,950);assert.equal(new Set(questions.map(q=>q.t)).size,950);assert.equal(new Set(questions.map(q=>q.base)).size,19);assert(questions.some(q=>q.base===30&&q.multiplier===50&&q.a===1500));
 assert.throws(()=>multiplicationQuestions(11,20,15));assert.throws(()=>multiplicationQuestions(31,20,15));assert.throws(()=>multiplicationQuestions(12,10,15));
});
test('original shortcut topics all have diagrams, worked models and applicability conditions',()=>{
 const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');const block=app.slice(app.indexOf('const TRICKS = ['),app.indexOf('const dr ='));
 const titles=[...block.matchAll(/\['([^']+)',/g)].map(m=>m[1]);assert.equal(titles.length,16);for(const title of titles){assert(VISUAL_TRICKS[title],title);assert(trickVisual(title).includes('role="img"'));assert(trickVisual(title).includes('Model question'));assert(VISUAL_TRICKS[title].condition);}
});
test('SSC interactive model answers follow independently calculated results',()=>{
 const expected={successive:1,profit:(460-400)/400*100,work:1/(1/10+1/15),speed:72*5/18,'average-speed':2*40*60/(40+60),ratio:560*4/7,alligation:(70-50)/(50-40),average:(4*20+30)/5,interest:2000*(.1**2),algebra:12**2-2*20,triangle:Math.sqrt(5**2+12**2),area:21,trig:1};
 assert.equal(SSC_MATHS.length,13);for(const d of SSC_MATHS){const exercise=modelExercise(d.id);assert(Math.abs(exercise.a-expected[d.id])<1e-9,d.id);assert(exercise.explanation);assert(d.condition);}
 assert(sscMathHTML({'math:work':true}).includes('Unmark mastered'));assert(sscMathHTML().includes('not official PYQs'));
});
