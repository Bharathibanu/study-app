import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../vocabulary.js',import.meta.url),'utf8');
const {VOCABULARY,dailyVocabulary,VOCABULARY_CYCLE_DAYS}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const ids=date=>dailyVocabulary(date).words.map(w=>w.id);
const advance=(date,n)=>{const day=new Date(date+'T00:00:00Z');day.setUTCDate(day.getUTCDate()+n);return day.toISOString().slice(0,10);};
test('bank has 300 unique words with nonempty definitions',()=>{
 assert.equal(VOCABULARY.length,300);assert.equal(VOCABULARY_CYCLE_DAYS,30);assert.equal(new Set(VOCABULARY.map(w=>w.id)).size,300);
 assert(VOCABULARY.every(w=>w.word.trim()&&w.meaning.trim()&&w.id===w.word.toLowerCase()));assert(Object.isFrozen(VOCABULARY));
});
test('each day has ten words and no words repeat in a full 30-day cycle',()=>{
 const seen=new Set();for(let offset=0;offset<30;offset++){
  const batch=dailyVocabulary(advance('2026-10-28',offset));assert.equal(batch.words.length,10);assert(batch.set>=1&&batch.set<=30);
  for(const word of batch.words){assert(!seen.has(word.id));seen.add(word.id);}
 }assert.equal(seen.size,300);
});
test('same date is stable across calls and repeats only after the documented cycle',()=>{
 assert.deepEqual(ids('2026-10-28'),ids('2026-10-28'));assert.deepEqual(ids('2026-10-28'),ids(advance('2026-10-28',30)));
 assert.notDeepEqual(ids('2026-10-28'),ids('2026-10-30'));
});
test('month/year/leap/DST boundaries always advance to a distinct set',()=>{
 for(const [date,next] of [['2026-10-31','2026-11-01'],['2026-12-31','2027-01-01'],['2028-02-28','2028-02-29'],['2028-02-29','2028-03-01'],['2026-03-08','2026-03-09']]){
  const first=new Set(ids(date));assert(ids(next).every(id=>!first.has(id)));
 }
});
test('impossible or malformed dates are rejected before choosing a set',()=>{
 for(const value of ['2026-02-29','2026-04-31','2026-13-01','2026-00-10','2026-1-01','2026-10-28T12:00:00Z','',null,{},undefined])assert.throws(()=>dailyVocabulary(value),/valid vocabulary date/);
});
