/* Pure SSC preparation calculations, import validation and conflict-safe merging. */
export const REVISION_DAYS = [1, 3, 7, 15, 30];
export const SSC_SUBJECTS = ['Quant', 'Reasoning', 'English', 'General Studies'];
export const EXAMS = ['CGL', 'CHSL', 'MTS', 'CPO', 'GD', 'Other SSC'];
export const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const stable = value => value === undefined ? 'undefined' : JSON.stringify(value, (_, v) => object(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k,v[k]])) : v);
export const same = (a,b) => stable(a) === stable(b);
export function content(state) { const copy = clone(state); if (copy) { delete copy._u; delete copy._sync; if (!copy.dailyFocus || object(copy.dailyFocus) && !Object.keys(copy.dailyFocus).length) delete copy.dailyFocus; for (const key of ['practice','mistakeBook','revisionHistory','mockAnalyses','masterclassDays']) if (!copy[key] || Array.isArray(copy[key]) && !copy[key].length) delete copy[key]; } return copy; }
export const sameState = (a,b) => same(content(a),content(b));
const identity = (row,path) => row && row.id != null ? String(row.id) : path === 'plan' && row ? [row.date,row.subj,row.topic].join('|') : null;
export function mergeStates(base, local, remote) {
  const conflicts = [];
  if (!base) {
    if (!remote || sameState(local,remote)) return { state: clone(local), conflicts };
    if (!local || !local._u) return { state: clone(remote), conflicts };
    return { state: clone(local), conflicts: ['Account data changed before a shared baseline was established'] };
  }
  if (!remote) { if (sameState(local,base)) return { state: clone(local), conflicts }; return { state: clone(local), conflicts: ['Cloud account document was deleted; review before restoring it'] }; }
  function merge(b,l,r,path) {
    if (same(l,b)) return clone(r);
    if (same(r,b) || same(l,r)) return clone(l);
    if (object(l) && object(r) && (object(b) || b === undefined)) {
      const result = {};
      for (const key of new Set([...Object.keys(b || {}), ...Object.keys(l), ...Object.keys(r)])) {
        if (!path && ['_u','_sync'].includes(key)) continue;
        const value = merge(b?.[key],l[key],r[key],path ? path+'.'+key : key);
        if (value !== undefined) result[key] = value;
      }
      return result;
    }
    if (Array.isArray(l) && Array.isArray(r) && (Array.isArray(b) || b === undefined)) {
      const all = [...(b || []),...l,...r];
      if (all.every(item=>identity(item,path)!==null)) {
        const maps = [b || [],l,r].map(rows => new Map(rows.map(row=>[identity(row,path),row])));
        if ([b || [],l,r].some((rows,i)=>maps[i].size!==rows.length)) { conflicts.push(path+': duplicate identifiers'); return clone(l); }
        const result = [];
        for (const key of new Set([...maps[2].keys(),...maps[1].keys(),...maps[0].keys()])) {
          const value = merge(maps[0].get(key),maps[1].get(key),maps[2].get(key),path+'['+key+']');
          if (value!==undefined) result.push(value);
        }
        return result;
      }
    }
    conflicts.push(path); return clone(l);
  }
  // Separate sessions against the same task cannot be safely combined by a scalar spent field.
  // Even identical minute totals represent two edits when their linked logs differ.
  const taskIds = new Set([...(local.logs || []), ...(remote.logs || [])].map(log=>log.task).filter(Boolean));
  const taskLogs = (value,id) => (value.logs || []).filter(log=>log.task===id).slice().sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  for (const id of taskIds) {
    const before=taskLogs(base,id), left=taskLogs(local,id), right=taskLogs(remote,id);
    if (!same(left,before) && !same(right,before) && !same(left,right)) conflicts.push('task-progress['+id+']');
  }
  const state = merge(base,local,remote,'');
  state._u = Math.max(Date.now(),local?._u || 0,remote?._u || 0);
  return { state, conflicts };
}
export function addDays(date,n) { const d = new Date(date+'T12:00:00'); d.setDate(d.getDate()+n); return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'); }
export const topicKey = topic => String(topic || '').trim().toLowerCase().replace(/\s+\d+(?:\s*,\s*\d+)*$/,'').replace(/\s+/g,' ');
export function topicStats(attempts) {
  const groups = new Map();
  for (const entry of attempts || []) {
    const key = entry.subj+'|'+topicKey(entry.topic);
    const row = groups.get(key) || { key, subj:entry.subj, topic:topicKey(entry.topic), attempted:0,correct:0,skipped:0,seconds:0,samples:0 };
    row.attempted += Number(entry.attempted)||0; row.correct += Number(entry.correct)||0; row.skipped += Number(entry.skipped)||0;
    if (Number(entry.attempted)>0 && Number(entry.seconds)>0) { row.seconds += Number(entry.seconds); row.samples += Number(entry.attempted); }
    groups.set(key,row);
  }
  return [...groups.values()].map(row=>({...row,accuracy:row.attempted ? row.correct/row.attempted*100 : null,averageSeconds:row.samples ? row.seconds/row.samples : null,weak:row.attempted>=10 && row.correct/row.attempted<.7})).sort((a,b)=>(a.accuracy??100)-(b.accuracy??100));
}
export function revisionQueue(state,today) {
  const sources = [];
  for (const task of state.tasks || []) if (task.done && task.doneDate) sources.push({key:'lesson:'+task.id,kind:'lesson',id:task.id,date:task.doneDate,subj:task.subj,topic:task.topic});
  for (const mistake of state.mistakeBook || []) if (!mistake.archived) sources.push({key:'mistake:'+mistake.id,kind:'mistake',id:mistake.id,date:mistake.date,subj:mistake.subj,topic:mistake.topic});
  return sources.flatMap(source=>{
    const history=(state.revisionHistory || []).filter(row=>row.sourceKey===source.key).sort((a,b)=>(a.at || 0)-(b.at || 0));
    const passed=new Set(history.filter(row=>row.passed).map(row=>row.step));
    const step=REVISION_DAYS.findIndex((_,i)=>!passed.has(i)); if(step<0)return [];
    let due=addDays(source.date,REVISION_DAYS[step]);
    const latest=history.at(-1);
    if(latest && !latest.passed && latest.step===step) due=addDays(latest.date,1);
    if(latest?.passed && latest.step<step && due<=latest.date) due=addDays(latest.date,1);
    return [{...source,step,due,interval:REVISION_DAYS[step],isDue:due<=today}];
  }).sort((a,b)=>a.due.localeCompare(b.due)||a.key.localeCompare(b.key));
}
export function mockResult(sections) {
  return (sections || []).reduce((total,section)=>{
    const attempted=section.correct+section.wrong;
    return { questions:total.questions+section.total,correct:total.correct+section.correct,wrong:total.wrong+section.wrong,skipped:total.skipped+section.total-attempted,attempted:total.attempted+attempted,negative:total.negative+section.wrong*section.penalty,score:total.score+section.correct*section.marks-section.wrong*section.penalty,max:total.max+section.total*section.marks,minutes:total.minutes+section.minutes };
  },{questions:0,correct:0,wrong:0,skipped:0,attempted:0,negative:0,score:0,max:0,minutes:0});
}
export function validateMockSections(sections) {
  if (!sections.length) throw new Error('Add at least one section.');
  for (const s of sections) {
    if (!SSC_SUBJECTS.includes(s.subj) || !Number.isInteger(s.total) || s.total<=0 || !Number.isInteger(s.correct) || !Number.isInteger(s.wrong) || s.correct<0 || s.wrong<0 || s.correct+s.wrong>s.total) throw new Error('Correct + wrong must not exceed the section’s total questions.');
    if (![s.marks,s.penalty,s.minutes].every(Number.isFinite) || s.marks<=0 || s.penalty<0 || s.minutes<0) throw new Error('Enter valid marks, penalty and minutes.');
  }
  return sections;
}
export function validateBank(input) {
  if (input?.template === true) throw new Error('This is an import template, not a question bank. Replace the placeholders with sourced questions and remove the template flag.');
  const rows=Array.isArray(input)?input:input?.questions;
  if (!Array.isArray(rows) || rows.length>5000) throw new Error('Use a question array with at most 5,000 entries.');
  const ids=new Set();
  return rows.map((q,index)=>{
    if(!q || typeof q.id!=='string' || !q.id.trim() || ids.has(q.id)) throw new Error('Every question needs a unique text ID (row '+(index+1)+').');
    ids.add(q.id);
    if(!SSC_SUBJECTS.includes(q.subj) || typeof q.topic!=='string' || !q.topic.trim() || typeof q.question!=='string' || !q.question.trim() || !Array.isArray(q.options) || q.options.length!==4 || q.options.some(o=>typeof o!=='string'||!o.trim()) || !Number.isInteger(q.answer) || q.answer<0 || q.answer>3 || typeof q.explanation!=='string') throw new Error('Question '+q.id+' needs subject, topic, question, four options, answer index 0–3 and explanation.');
    if(q.kind==='pyq') {
      if(![2024,2025].includes(q.year) || !EXAMS.includes(q.exam) || !q.tier || !q.sourceUrl || !q.sourceTitle || !q.paperDate || !q.shift || !q.questionNumber || !q.reuseBasis) throw new Error('PYQ '+q.id+' requires 2024/2025 exam, tier, date, shift, question number, source and reuse basis.');
      let url;try{url=new URL(q.sourceUrl);}catch{throw new Error('Invalid source link for '+q.id);}if(url.protocol!=='https:')throw new Error('PYQ source links must use HTTPS.');
    } else if(q.kind!=='original') throw new Error('Question kind must be original or pyq.');
    return {id:q.id,subj:q.subj,topic:q.topic.trim(),question:q.question,options:q.options,answer:q.answer,explanation:q.explanation,kind:q.kind,exam:q.exam || 'CGL',year:q.year || null,tier:q.tier || '',paperDate:q.paperDate || '',shift:q.shift || '',questionNumber:q.questionNumber || '',sourceUrl:q.sourceUrl || '',sourceTitle:q.sourceTitle || '',reuseBasis:q.reuseBasis || ''};
  });
}
export function validateAttempt(v) {
  if(!Number.isInteger(v.attempted)||v.attempted<0||!Number.isInteger(v.correct)||v.correct<0||v.correct>v.attempted||!Number.isInteger(v.skipped)||v.skipped<0||!Number.isFinite(v.seconds)||v.seconds<0||v.attempted+v.skipped<1)throw new Error('Enter whole question counts; correct cannot exceed attempted. Time must be non-negative.');
  return v;
}


// Plan gaps stay separate from unrelated study logs and practice results.
export function pendingPlan(state, today) {
  const tasks = new Map((state.tasks || []).filter(t=>t.pk).map(t=>[t.pk,t]));
  return (state.plan || []).filter(r=>r.date<=today && (!state.planFrom || r.date>=state.planFrom)).map(r=>{
    const key=[r.date,r.subj,r.topic].join('|'), task=tasks.get(key);
    return {...r,id:task?.id || 'plan:'+key,gap:Math.max(0,r.min-Math.max(0,Number(task?.spent)||0))};
  }).filter(r=>r.gap>0).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
}
export function dailyFocusSummary(state,today) {
  const pending=pendingPlan(state,today), prefs=state.dailyFocus?.[today] || {};
  const manual=(state.tasks || []).filter(t=>!t.pk && !t.done && t.date<=today && t.plan>t.spent)
    .map(t=>({...t,gap:t.plan-t.spent,date:t.orig || t.date}));
  const active=new Map([...pending,...manual].map(r=>[r.id,r]));
  const pins=[...new Set(prefs.pins || [])].map(id=>active.get(id)).filter(Boolean).slice(0,3);
  const available=Number.isFinite(prefs.available) && prefs.available>=0 ? prefs.available : null;
  const todayMinutes=pending.filter(r=>r.date===today).reduce((s,r)=>s+r.gap,0);
  const overdue=pending.filter(r=>r.date<today), backlog=overdue.reduce((s,r)=>s+r.gap,0);
  let budget=available===null?0:Math.max(0,available-todayMinutes);
  const target=Math.min(backlog,budget), chunks=[];
  overdue.sort((a,b)=>Number(pins.some(p=>p.id===b.id))-Number(pins.some(p=>p.id===a.id))||a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
  for(const r of overdue){const minutes=Math.min(r.gap,budget);if(minutes>0)chunks.push({...r,minutes});budget-=minutes;}
  return {pins,available,todayMinutes,backlog,target,chunks,shortfall:available===null?0:Math.max(0,todayMinutes-available)};
}
export function weeklySubjectReview(state,today) {
  const since=addDays(today,-6), groups=new Map();
  const row=subj=>{if(!groups.has(subj))groups.set(subj,{subj,minutes:0,backlogMinutes:0,backlogTopics:0,attempted:0,correct:0,timedSeconds:0,timedAttempts:0});return groups.get(subj);};
  for(const r of pendingPlan(state,today)){const g=row(r.subj);if(r.date<today){g.backlogMinutes+=r.gap;g.backlogTopics++;}}
  for(const log of state.logs || [])if(log.date>=since && log.date<=today)row(log.subj).minutes+=Math.max(0,Number(log.min)||0);
  for(const a of state.practice || [])if(a.date>=since && a.date<=today){
    const g=row(a.subj), attempted=Math.max(0,Number(a.attempted)||0);g.attempted+=attempted;g.correct+=Math.max(0,Number(a.correct)||0);
    if(attempted>0 && a.seconds>0){g.timedAttempts+=attempted;g.timedSeconds+=Number(a.seconds);}
  }
  return {since,rows:[...groups.values()].sort((a,b)=>a.subj.localeCompare(b.subj)).map(g=>({...g,accuracy:g.attempted?g.correct/g.attempted*100:null,seconds:g.timedAttempts?g.timedSeconds/g.timedAttempts:null}))};
}

// Moving a plan keeps each task's identity, study credit and linked logs intact.
export function postponePlan(state,fromDate) {
  const moved=new Map();
  for(const row of state.plan || [])if(row.date>=fromDate){
    const key=[row.date,row.subj,row.topic].join('|');row.date=addDays(row.date,1);moved.set(key,row);
  }
  for(const task of state.tasks || []){
    const row=moved.get(task.pk);if(!row)continue;
    task.pk=[row.date,row.subj,row.topic].join('|');task.orig=row.date;
    task.date=addDays(task.date,1);
  }
  return moved.size;
}
export function validateBackup(value) {
  const fail=message=>{throw new Error('Invalid backup: '+message);};
  if(!object(value) || !Array.isArray(value.logs))fail('expected an account object with study logs.');
  const stack=[value];while(stack.length){const item=stack.pop();for(const [key,child] of Object.entries(item)){if(['__proto__','prototype','constructor'].includes(key))fail('unsupported object key.');if(child && typeof child==='object')stack.push(child);}}
  if(value.name!==undefined && typeof value.name!=='string')fail('name must be text.');
  const collections=['plan','tasks','logs','rev','exp','meet','qr','mist','mocks','notes','practice','mistakeBook','revisionHistory','mockAnalyses','masterclassDays','todos','books','learn','diary'];

  for(const key of collections){
    if(value[key]===undefined)continue;
    if(!Array.isArray(value[key]) || value[key].some(row=>!object(row)))fail(key+' must contain records.');
    if(!['plan','tasks','todos','books'].includes(key) && value[key].some(row=>!validStudyDate(row.date)))fail(key+' needs valid record dates.');
    for(const row of value[key])for(const field of ['date','orig','doneDate','created','due'])if(row[field]!==undefined && row[field]!==null && row[field]!=='' && !validStudyDate(row[field]))fail(key+' has an invalid '+field+'.');
  }
  for(const key of ['settings','mastered','dailyFocus','canteen'])if(value[key]!==undefined && !object(value[key]))fail(key+' must be an object.');
  for(const row of value.plan || [])if(!validStudyDate(row.date) || !Number.isInteger(row.day) || row.day<1 || !Number.isFinite(row.min) || row.min<0 || typeof row.subj!=='string' || typeof row.topic!=='string')fail('a plan lesson is malformed.');
  for(const row of value.tasks || [])if(typeof row.id!=='string' || !validStudyDate(row.date) || !validStudyDate(row.orig) || !Number.isFinite(row.plan) || row.plan<0 || !Number.isFinite(row.spent) || row.spent<0 || typeof row.done!=='boolean' || typeof row.subj!=='string' || typeof row.topic!=='string')fail('a task is malformed.');
  for(const row of value.logs)if(!validStudyDate(row.date) || !Number.isFinite(row.min) || row.min<0 || typeof row.subj!=='string')fail('a study log is malformed.');
  for(const row of value.books || [])if(!Number.isFinite(row.total) || row.total<=0 || !Array.isArray(row.log) || row.log.some(r=>!object(r) || !validStudyDate(r.date) || !Number.isFinite(r.pages)))fail('a book log is malformed.');
  for(const row of value.todos || [])if(!validStudyDate(row.created))fail('a to-do creation date is missing.');
  for(const row of value.mist || [])if(typeof row.q!=='string' || typeof row.a!=='string')fail('a quick-revision mistake is malformed.');
  for(const row of value.practice || [])validateAttempt(row);
  for(const row of value.mockAnalyses || []){if(!Array.isArray(row.sections))fail('mock sections are malformed.');validateMockSections(row.sections);}
  if(value.canteen){if(!object(value.canteen.prices) || !object(value.canteen.days) || Object.values(value.canteen.days).some(r=>!object(r) || !object(r.p)))fail('canteen data is malformed.');}
  for(const entry of Object.values(value.dailyFocus || {}))if(!object(entry) || entry.pins!==undefined && (!Array.isArray(entry.pins) || entry.pins.some(id=>typeof id!=='string')) || entry.available!==undefined && (!Number.isFinite(entry.available) || entry.available<0))fail('daily priorities are malformed.');
  return value;
}

export const validStudyDate=date=>{if(typeof date!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(date))return false;const d=new Date(date+'T12:00:00Z');return Number.isFinite(+d) && d.toISOString().slice(0,10)===date;};
export function validatePlanRows(rows) {
  const keys=new Set();
  for(const row of rows){
    if(!validStudyDate(row.date) || !Number.isInteger(row.day) || row.day<1 || !Number.isFinite(row.min) || row.min<=0 || typeof row.subj!=='string' || !row.subj.trim() || typeof row.topic!=='string' || !row.topic.trim())throw new Error('Each plan row needs a positive day, valid date, subject, topic and positive study minutes.');
    const key=[row.date,row.subj,row.topic].join('|');if(keys.has(key))throw new Error('Duplicate plan lesson: '+row.topic+' on '+row.date+'.');keys.add(key);
  }
  return rows;
}

export const lessonMinutes = state => state.settings?.lessonMinutes===45 ? 45 : 60;
// Retain finished history and actual study minutes; change estimates for unfinished work.
export function setPlanLessonMinutes(state,minutes,today) {
  if(![45,60].includes(minutes))throw new Error('Choose 45 or 60 minutes per lesson.');
  const byKey=new Map((state.tasks || []).filter(t=>t.pk).map(t=>[t.pk,t]));let changed=false;
  for(const row of state.plan || []){
    const task=byKey.get([row.date,row.subj,row.topic].join('|'));
    if(task?.done)continue;
    if(row.min!==minutes){row.min=minutes;changed=true;}
    if(task && task.plan!==minutes){
      task.plan=minutes;changed=true;
      if(task.spent>=minutes){task.done=true;task.doneDate=(state.logs || []).filter(l=>l.task===task.id && l.date).map(l=>l.date).sort().at(-1) || today;}
    }
  }
  return changed;
}

// Recover summary credit from saved linked sessions without inventing study minutes.
export function repairTaskProgress(state) {
  const totals=new Map(),dates=new Map(),seen=new Set();let changed=false;
  for(const log of state.logs || []){
    if(!log.task || log.id && seen.has(log.id))continue;
    if(log.id)seen.add(log.id);
    const credit=Number(log.credit ?? log.min);if(!Number.isFinite(credit) || credit<=0)continue;
    totals.set(log.task,(totals.get(log.task) || 0)+credit);
    if(validStudyDate(log.date) && log.date>(dates.get(log.task) || ''))dates.set(log.task,log.date);
  }
  for(const task of state.tasks || []){
    const recorded=totals.get(task.id) || 0, previous=Number(task.spent) || 0;
    if(recorded<=previous)continue;
    task.spent=recorded;changed=true;
    if(recorded>=task.plan){task.done=true;task.doneDate=task.doneDate || dates.get(task.id) || task.orig || task.date;}
  }
  return changed;
}
export function logTaskProgress(state,taskId,minutes,metadata) {
  const task=(state.tasks || []).find(t=>t.id===taskId);
  if(!task)return {task:null,minutes:0,reason:'missing'};
  const remaining=Math.max(0,task.plan-task.spent);
  if(task.done || !remaining)return {task,minutes:0,reason:'finished'};
  if(!Number.isFinite(minutes) || minutes<=0)throw new Error('Enter positive study minutes.');
  if(state.logs.some(l=>l.id===metadata.id))return {task,minutes:0,reason:'saved'};
  const credit=Math.min(minutes,remaining);
  state.logs.push({...metadata,subj:task.subj,topic:task.topic,min:credit,credit,focus:0,task:task.id});
  task.spent+=credit;
  if(task.spent>=task.plan){task.done=true;task.doneDate=metadata.date;}
  return {task,minutes:credit,reason:'saved'};
}
