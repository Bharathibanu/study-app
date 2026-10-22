import { clone, applyRecordEdit, REVISION_DAYS, SSC_SUBJECTS, EXAMS, topicKey, topicStats, revisionQueue, mockResult, validateMockSections, validateBank, validateAttempt } from './ssc-core.js';

/* SSC tools use the existing account state. The question bank stays on this device. */
export function installSsc(c) {
  const { state, persist, render, show, card, esc, today, uid, openForm, toast, ACT, CHG, VIEWS } = c;
  const arrays=['practice','mistakeBook','revisionHistory','mockAnalyses'];
  const ensure=()=>{ const s=state(); for(const key of arrays)if(!Array.isArray(s[key]))s[key]=[];return s; };
  let bank=[],bankReady=false,bankError='',filters={subj:'All',topic:'',exam:'All',year:'All',kind:'all'},session=null,mistFilter='open';
  let loadPromise=null;
  const button=(action,label,extra='')=>`<button class="btn sm ghost" data-act="${action}" ${extra}>${label}</button>`;
  const number=(k,label,value,min=0)=>({k,label,type:'number',value,min,req:1});
  const select=(k,label,options,value)=>({k,label,type:'select',options,value});
  const dateField={k:'date',label:'Date',type:'date',value:today(),req:1};
  const planTopics=()=>[...new Set((state().plan || []).map(row=>row.topic))];
  function form(title,fields,label,save) {
    fields=fields.map(f=>f.k==='date' && f===dateField ? {...f,value:today()} : f);
    openForm(title,fields,label,save);
  }
  function bankStore(mode,value) {
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open('sst_question_bank',1);
      req.onupgradeneeded=()=>req.result.createObjectStore('bank');
      req.onerror=()=>reject(req.error);
      req.onsuccess=()=>{
        const db=req.result,tx=db.transaction('bank',mode==='read'?'readonly':'readwrite'),store=tx.objectStore('bank');
        const operation=mode==='read'?store.get('questions'):store.put(value,'questions');let result;
        operation.onsuccess=()=>{result=operation.result;};tx.oncomplete=()=>{db.close();resolve(result);};tx.onerror=()=>{db.close();reject(tx.error);};
      };
    });
  }
  async function loadBank() {
    if(loadPromise)return loadPromise;
    loadPromise=(async()=>{
      let custom=[];try{custom=validateBank(await bankStore('read') || []);}catch{}
      try{const response=await fetch('./questions/starter.json');if(!response.ok)throw new Error('Question bank unavailable');const starter=validateBank(await response.json());bank=[...starter,...custom.filter(q=>!starter.some(s=>s.id===q.id))];bankReady=true;bankError='';}
      catch(e){bank=custom;bankReady=true;bankError='Starter questions could not load. Reopen when online; imported questions remain available.';}
      if(state() && ['practice','pyq'].includes(c.current()))render();
    })();return loadPromise;
  }
  function available() {
    return bank.filter(q=>(filters.subj==='All'||q.subj===filters.subj)&&(!filters.topic||topicKey(q.topic).includes(topicKey(filters.topic)))&&(filters.exam==='All'||q.exam===filters.exam)&&(filters.year==='All'||String(q.year)===filters.year)&&(filters.kind==='all'||q.kind===filters.kind));
  }
  const source=(q)=>q.kind==='pyq'?`<span class="badge amber">Imported PYQ · ${esc(q.exam)} ${q.year}</span><p class="quiet">${esc(q.tier)} · ${esc(q.paperDate)} · shift ${esc(q.shift)} · question ${esc(q.questionNumber)}. Source supplied by importer; not independently verified.</p><a target="_blank" rel="noopener noreferrer" href="${esc(q.sourceUrl)}">${esc(q.sourceTitle)}</a>`:'<span class="badge">Original practice · not a PYQ</span>';
  function statsHTML() {
    const rows=topicStats(ensure().practice);
    return card('Topic accuracy and speed', `<p class="quiet">Based on recorded question attempts, separate from study hours. Weak = below 70% after at least 10 attempts. Speed has no exam-wide target.</p>${rows.length?`<div class="tablewrap"><table><thead><tr><th>Subject / Topic</th><th>Attempted</th><th>Accuracy</th><th>Avg seconds / attempt</th><th>Skipped</th></tr></thead><tbody>${rows.map(r=>`<tr><td><b>${esc(r.subj)}</b><br>${esc(r.topic)} ${r.weak?'<span class="badge red">Needs practice</span>':''}</td><td>${r.attempted}</td><td>${r.accuracy==null?'—':r.accuracy.toFixed(1)+'%'}</td><td>${r.averageSeconds==null?'Not timed':r.averageSeconds.toFixed(1)}</td><td>${r.skipped}</td></tr>`).join('')}</tbody></table></div>`:'<p class="empty">No question attempts recorded yet.</p>'}`);
  }
  function practiceView() {
    ensure();loadBank();
    if(session) {
      const q=session.questions[session.index];
      if(!q)return card('Practice complete',`<p>${session.correct} correct out of ${session.answered} attempted; ${session.skipped} skipped.</p><div class="actions">${button('sscEnd','Return to topic practice')}${button('sscWrong','Retry wrong answers')}</div>`)+statsHTML();
      const solved=session.result!==null;
      return card('Topic practice',`<p class="label">Question ${session.index+1} of ${session.questions.length} · ${esc(q.subj)} · ${esc(q.topic)}</p>${source(q)}<h3 class="ssc-question">${esc(q.question)}</h3><div class="ssc-options">${q.options.map((option,i)=>`<button class="btn ghost ssc-answer" data-act="sscAnswer" data-answer="${i}" ${solved?'disabled':''}>${String.fromCharCode(65+i)}. ${esc(option)}</button>`).join('')}</div>${solved?`<div class="ssc-feedback" role="status"><b>${session.result.correct?'Correct':session.result.skipped?'Skipped':'Review this answer'}</b><p>Answer: ${esc(q.options[q.answer])}</p><p>${esc(q.explanation)}</p>${!session.result.correct&&!session.result.skipped?'<p class="quiet">Added to Mistake notebook. Open it to classify the mistake and add your method.</p>':''}${button('sscNext','Next question')}</div>`:`<p class="quiet">Time runs until you answer. Leaving the page does not record an unanswered question.</p>${button('sscSkip','Skip question')}`}${button('sscEnd','End practice')}`);
    }
    const opts=(key,label,values)=>`<div><label class="label" for="ssc_${key}">${label}</label><select class="inp" id="ssc_${key}" data-chg="sscFilter" data-key="${key}">${values.map(v=>`<option value="${esc(v)}" ${filters[key]===v?'selected':''}>${esc(v)}</option>`).join('')}</select></div>`;
    return card('SSC CGL topic practice',`<p class="quiet">Start with original practice or use a sourced question bank. Lessons completed, questions attempted and accuracy are separate measures.</p><div class="ssc-filters">${opts('subj','Subject',['All',...SSC_SUBJECTS])}${opts('exam','Exam',['All',...EXAMS])}${opts('year','Year',['All','2024','2025'])}<div><label class="label" for="ssc_topic">Topic</label><input class="inp" id="ssc_topic" value="${esc(filters.topic)}" placeholder="e.g. Number Series" data-chg="sscTopic"></div></div><p>${bankReady?available().length+' matching questions':'Loading questions…'}</p>${bankError?`<p class="err">${esc(bankError)}</p>`:''}<div class="actions">${button('sscStart','Start topic practice')}${button('sscWrong','Retry wrong answers')}${button('sscLog','Log questions from a book / test')}${button('nav','PYQ bank','data-v="pyq"')}</div>`)+statsHTML()+card('Recent attempts',`<div class="list">${ensure().practice.slice().sort((a,b)=>b.at-a.at).slice(0,15).map(r=>`<div class="li"><div class="l"><b>${esc(r.topic)}</b><small>${esc(r.subj)} · ${esc(r.date)} · ${r.correct}/${r.attempted} correct · ${r.seconds>0?r.seconds+' seconds':'not timed'} · ${r.kind==='pyq'?'imported PYQ':'practice / manual'}</small></div>${button('sscDeleteAttempt','Delete','data-id="'+esc(r.id)+'"')}</div>`).join('')||'<p class="quiet">No attempts yet.</p>'}</div>`);
  }
  function bankView() {
    loadBank();const pyqs=bank.filter(q=>q.kind==='pyq');
    return card('2024–2025 SSC PYQ bank',`<p><b>${pyqs.length} imported PYQs</b> · ${bank.filter(q=>q.kind==='original').length} original practice questions.</p><p class="quiet">A complete verified collection is not installed. SSC papers could not be fetched during development. Original practice is never labelled as PYQ. Imported sources are not independently verified.</p><p>Use papers and answer keys you are permitted to reuse. Each PYQ must identify exam, year, tier, paper date, shift, question number and source.</p><div class="actions">${button('nav','Practice questions','data-v="practice"')}<label class="btn sm ghost">Import question JSON<input type="file" accept=".json,application/json" data-chg="sscImportBank" hidden></label>${button('sscBankTemplate','Download import template')}${button('sscResetBank','Remove imported bank')}</div><p class="quiet">The question bank stays on this device, outside your Firebase account document. Import the same bank on other devices if needed. Your attempts and mistake notes do sync.</p><p><a href="https://ssc.gov.in/" target="_blank" rel="noopener noreferrer">SSC official website</a> — availability of old response sheets and reuse permission must be checked.</p>${bankError?`<p class="err">${esc(bankError)}</p>`:''}<div class="tablewrap"><table><thead><tr><th>Exam / year</th><th>Subject / topic</th><th>Source</th></tr></thead><tbody>${pyqs.slice(0,50).map(q=>`<tr><td>${esc(q.exam)} ${q.year}<br>${esc(q.tier)} / ${esc(q.shift)}</td><td>${esc(q.subj)} / ${esc(q.topic)}</td><td><a href="${esc(q.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(q.sourceTitle)}</a></td></tr>`).join('')}</tbody></table></div>`);
  }
  function mistakeForm(entry) {
    const e=entry||{}, original=clone(e);
    const fields=[
      select('subj','Subject',SSC_SUBJECTS,e.subj||'Quant'),{k:'topic',label:'Topic',value:e.topic||'',req:1},
      select('lesson','Link to timetable lesson (optional)',['',...planTopics()],e.lesson||''),
      {k:'question',label:'Question',type:'textarea',value:e.question||'',req:1},{k:'yourAnswer',label:'Your wrong answer',value:e.yourAnswer||''},{k:'correctAnswer',label:'Correct answer',value:e.correctAnswer||'',req:1},
      {k:'method',label:'Correct method / explanation',type:'textarea',value:e.method||'',req:1},
      select('cause','Mistake type',['Unclassified','Concept','Calculation','Reading','Time pressure'],e.cause||'Unclassified'),
      {...dateField,value:e.date||today()},{k:'source',label:'Book / test / source reference',value:e.source||''}
    ];
    const initial=Object.fromEntries(fields.map(f=>[f.k,f.value ?? '']));
    form(e.id?'Edit mistake':'Add mistake',fields,'Save mistake',v=>{const s=ensure();if(e.id){const saved=applyRecordEdit(s.mistakeBook,e.id,original,v,initial);saved.at=Date.now();}else s.mistakeBook.push({...v,id:uid(),at:Date.now(),archived:false});persist();render();});
  }
  function mistakesView() {
    const s=ensure(),rows=s.mistakeBook.filter(m=>mistFilter==='all'||!m.archived).slice().sort((a,b)=>b.at-a.at);
    return card('Mistake notebook',`<p class="quiet">Wrong answers from topic practice arrive here automatically. Record the cause and correct method. Archived mistakes leave the revision queue.</p><div class="actions">${button('sscMistake','Add mistake')}${button('sscMistFilter',mistFilter==='all'?'Show open only':'Show all')}</div>${rows.map(m=>`<details class="ssc-mistake"><summary>${esc(m.subj)} · ${esc(m.topic)} <span class="badge ${m.archived?'green':'amber'}">${esc(m.cause||'Unclassified')}${m.archived?' · archived':''}</span></summary><p>${esc(m.question)}</p><p><b>Your answer:</b> ${esc(m.yourAnswer||'—')}</p><p><b>Correct:</b> ${esc(m.correctAnswer)}</p><p class="pre"><b>Method:</b> ${esc(m.method)}</p><p class="quiet">${esc(m.date)} · ${esc(m.lesson||'Not linked to a lesson')} · ${esc(m.source||'Manual entry')}</p><div class="actions">${button('sscEditMistake','Edit','data-id="'+esc(m.id)+'"')}${button('sscArchiveMistake',m.archived?'Reopen':'Archive','data-id="'+esc(m.id)+'"')}${button('sscDeleteMistake','Delete','data-id="'+esc(m.id)+'"')}</div></details>`).join('')||'<p class="empty">No mistakes recorded. Add one from a test or practise questions.</p>'}`);
  }
  function revisionsView() {
    const s=ensure(),queue=revisionQueue(s,today()),due=queue.filter(r=>r.isDue);
    const stages=REVISION_DAYS.map(interval=>{
      const rows=queue.filter(r=>r.interval===interval), dueCount=rows.filter(r=>r.isDue).length;
      return `<section class="revision-stage" aria-labelledby="revision-day-${interval}" data-stage="${interval}"><div class="revision-stage-heading"><h4 id="revision-day-${interval}">Day ${interval}</h4><span class="quiet">${dueCount} due now · ${rows.length-dueCount} upcoming</span></div>
        ${rows.map(r=>`<article class="revision-item"><div class="revision-item-heading"><b>${esc(r.topic)}</b><span class="badge${r.isDue?' amber':''}">${r.isDue?r.due<today()?'Overdue':'Due today':'Upcoming'}</span></div><small>${esc(r.subj)} · ${r.kind==='mistake'?'Mistake':'Lesson'} · Due ${esc(r.due)} · Day ${interval} review</small><div class="actions">${r.isDue?`${button('sscReviewPass','Recalled','data-key="'+esc(r.key)+'"')}${button('sscReviewFail','Needs review','data-key="'+esc(r.key)+'"')}`:''}${r.kind==='mistake'?button('sscReviewMistake','See mistake','data-id="'+esc(r.id)+'"'):''}</div></article>`).join('') || '<p class="quiet">No reviews at this stage.</p>'}
      </section>`;
    }).join('');
    return card('Automatic revision queue',`<p class="quiet">Completed lessons and open mistakes return at Days 1, 3, 7, 15 and 30 from their completion/entry date. Each box is a review stage, not a timetable day. A failed review comes back tomorrow. Only marking “Recalled” advances a stage.</p><p><b>${due.length} due now</b> · ${queue.length-due.length} upcoming</p>${!queue.length?'<p class="empty">Complete a lesson or record a mistake to begin revision.</p>':''}<div class="revision-stages">${stages}</div>`)+card('Recent reviews',s.revisionHistory.slice().sort((a,b)=>b.at-a.at).slice(0,12).map(r=>`<p>${esc(r.topic)} · ${esc(r.date)} · ${r.passed?'Recalled':'Needs review'}${button('sscDeleteReview','Undo','data-id="'+esc(r.id)+'"')}</p>`).join('')||'<p class="quiet">No reviews recorded yet.</p>');
  }
  function mockForm() {
    const fields=[{k:'name',label:'Test name / provider',req:1},select('tier','CGL tier',['Tier I','Tier II / custom'],'Tier I'),dateField];
    SSC_SUBJECTS.forEach((subj,i)=>fields.push(number('total'+i,subj+' — total questions',25,1),number('correct'+i,subj+' — correct',0),number('wrong'+i,subj+' — wrong',0),number('minutes'+i,subj+' — minutes spent',0),{...number('marks'+i,subj+' — marks per correct answer',2,.01),step:.01},{...number('penalty'+i,subj+' — penalty per wrong answer',.5),step:.01},{k:'weak'+i,label:subj+' — weak topics / notes',value:''}));
    fields.push({k:'notes',label:'Overall lessons learned',type:'textarea'});
    form('CGL mock section analysis',fields,'Save analysis',v=>{
      const sections=validateMockSections(SSC_SUBJECTS.map((subj,i)=>({subj,total:v['total'+i],correct:v['correct'+i],wrong:v['wrong'+i],minutes:v['minutes'+i],marks:v['marks'+i],penalty:v['penalty'+i],weak:v['weak'+i]})));
      const s=ensure();s.mockAnalyses.push({id:uid(),name:v.name,tier:v.tier,date:v.date,sections,notes:v.notes,at:Date.now()});persist();render();
    });
  }
  function mocksView() {
    const s=ensure();
    return card('CGL mock-test analysis',`<p class="quiet">Record all four subject sections. The Tier I starting values are editable; verify the current exam notice. For Tier II/custom tests enter the applicable question counts and marking per section. This does not claim a complete Tier II test blueprint or percentile.</p>${button('sscMock','Add section analysis')}`)+s.mockAnalyses.slice().sort((a,b)=>b.at-a.at).map(m=>{
      const total=mockResult(m.sections);
      return card(esc(m.name),`<p>${esc(m.tier)} · ${esc(m.date)}</p><div class="stats"><div class="stat"><span class="label">Net score</span><b>${total.score.toFixed(2)} / ${total.max}</b></div><div class="stat"><span class="label">Negative marks</span><b>${total.negative.toFixed(2)}</b></div><div class="stat"><span class="label">Skipped</span><b>${total.skipped}</b></div><div class="stat"><span class="label">Time</span><b>${total.minutes} min</b></div></div><div class="tablewrap"><table><thead><tr><th>Section</th><th>Score</th><th>Accuracy</th><th>Skipped</th><th>Time</th><th>Weak topics</th></tr></thead><tbody>${m.sections.map(section=>{const t=mockResult([section]);return `<tr><td>${esc(section.subj)}</td><td>${t.score.toFixed(2)}</td><td>${t.attempted?(t.correct/t.attempted*100).toFixed(1)+'%':'—'}</td><td>${t.skipped}</td><td>${t.minutes} min</td><td>${esc(section.weak||'—')}</td></tr>`;}).join('')}</tbody></table></div><p class="pre">${esc(m.notes||'')}</p>${button('sscDeleteMock','Delete analysis','data-id="'+esc(m.id)+'"')}`,' style="margin-top:14px"');
    }).join('');
  }
  function dailyHTML() {
    const s=ensure(),t=today(),reviews=revisionQueue(s,t).filter(r=>r.isDue),pending=s.tasks.filter(k=>!k.done&&k.date<=t).sort((a,b)=>a.orig.localeCompare(b.orig));
    const weak=topicStats(s.practice).filter(r=>r.weak);const items=[];
    reviews.slice(0,2).forEach(r=>items.push(`<li><b>Review:</b> ${esc(r.topic)} ${button('nav','Open revision queue','data-v="revisionQueue"')}</li>`));
    pending.slice(0,3).forEach(k=>items.push(`<li><b>${k.orig<t?'Catch up':'Today’s lesson'}:</b> ${esc(k.topic)} · ${Math.max(0,k.plan-k.spent)} min left ${button('partial','Log progress','data-id="'+esc(k.id)+'"')} ${button('sscTopicPractice','Practise topic','data-topic="'+esc(k.topic)+'" data-subj="'+esc(k.subj)+'"')}</li>`));
    weak.slice(0,1).forEach(r=>items.push(`<li><b>Weak topic:</b> ${esc(r.topic)} · ${r.accuracy.toFixed(0)}% accuracy ${button('sscTopicPractice','Practise','data-topic="'+esc(r.topic)+'" data-subj="'+esc(r.subj)+'"')}</li>`));
    return card('What should I study today?',`<p class="quiet">SSC CGL · due reviews first, then overdue/today’s lessons and a weak topic. Start with this short list; your full schedule remains below.</p><ol class="ssc-daily">${items.join('')||'<li>No due work yet. Load your plan or begin topic practice.</li>'}</ol><div class="actions">${button('nav','Mistake notebook','data-v="mistakes"')}${button('nav','Topic practice','data-v="practice"')}${button('nav','Mock analysis','data-v="mockAnalysis"')}</div>`,' style="margin-bottom:14px"');
  }
  function startQuestions(questions) {
    if(!questions.length){toast('No matching questions. Change filters or import a sourced bank.');return;}
    session={questions:questions.slice(0,50),index:0,answered:0,correct:0,skipped:0,result:null,started:performance.now()};show('practice');
  }
  function answer(index,skip=false) {
    if(!session || session.result!==null)return;
    const q=session.questions[session.index];if(!q)return;
    const s=ensure(),seconds=Math.max(1,Math.round((performance.now()-session.started)/1000)),correct=!skip&&index===q.answer;
    const record={id:uid(),date:today(),at:Date.now(),subj:q.subj,topic:q.topic,questionId:q.id,kind:q.kind,exam:q.exam,year:q.year,attempted:skip?0:1,correct:correct?1:0,skipped:skip?1:0,seconds:skip?0:seconds,answer:skip?null:index};
    s.practice.push(record);if(skip)session.skipped++;else{session.answered++;if(correct)session.correct++;}
    if(!correct&&!skip){
      const mistake=s.mistakeBook.find(m=>m.questionId===q.id&&!m.archived);
      if(mistake){mistake.yourAnswer=q.options[index];mistake.at=Date.now();mistake.errorCount=(mistake.errorCount||1)+1;}
      else s.mistakeBook.push({id:uid(),questionId:q.id,date:today(),at:Date.now(),subj:q.subj,topic:q.topic,question:q.question,yourAnswer:q.options[index],correctAnswer:q.options[q.answer],method:q.explanation,cause:'Unclassified',source:q.kind==='pyq'?q.exam+' '+q.year+' '+q.sourceTitle:'Original practice — not a PYQ',lesson:'',archived:false});
    }
    session.result={correct,skipped:skip};persist();render();
  }
  ACT.sscStart=()=>startQuestions(available());
  ACT.sscWrong=()=>{const wrong=new Set(ensure().practice.filter(r=>r.questionId&&r.attempted>r.correct).map(r=>r.questionId));startQuestions(bank.filter(q=>wrong.has(q.id)));};
  ACT.sscAnswer=d=>answer(Number(d.answer));ACT.sscSkip=()=>answer(null,true);
  ACT.sscNext=()=>{if(session){session.index++;session.result=null;session.started=performance.now();render();}};
  ACT.sscEnd=()=>{session=null;render();};
  ACT.sscTopicPractice=d=>{session=null;filters={...filters,subj:SSC_SUBJECTS.includes(d.subj)?d.subj:'All',topic:topicKey(d.topic),exam:'All',year:'All',kind:'all'};show('practice');};
  ACT.sscLog=()=>form('Record topic practice',[select('subj','Subject',SSC_SUBJECTS,'Quant'),{k:'topic',label:'Topic',req:1},dateField,number('attempted','Questions attempted (correct + wrong)',10),number('correct','Correct answers',0),number('skipped','Questions skipped',0),number('seconds','Total seconds on attempted questions (0 = not timed)',0),{k:'source',label:'Book / test / source',value:''}],'Save attempts',v=>{validateAttempt(v);ensure().practice.push({...v,id:uid(),at:Date.now(),kind:'manual'});persist();render();});
  ACT.sscDeleteAttempt=d=>{if(!confirm('Delete this attempt record? This changes accuracy statistics.'))return;ensure().practice=state().practice.filter(r=>r.id!==d.id);persist();render();};
  ACT.sscMistake=()=>mistakeForm();ACT.sscEditMistake=d=>mistakeForm(ensure().mistakeBook.find(m=>m.id===d.id));
  ACT.sscMistFilter=()=>{mistFilter=mistFilter==='all'?'open':'all';render();};
  ACT.sscArchiveMistake=d=>{const m=ensure().mistakeBook.find(m=>m.id===d.id);if(m){m.archived=!m.archived;persist();render();}};
  ACT.sscDeleteMistake=d=>{if(!confirm('Delete this mistake?'))return;ensure().mistakeBook=state().mistakeBook.filter(m=>m.id!==d.id);persist();render();};
  ACT.sscReviewMistake=d=>{show('mistakes');mistakeForm(ensure().mistakeBook.find(m=>m.id===d.id));};
  function review(d,passed){const s=ensure(),r=revisionQueue(s,today()).find(r=>r.key===d.key&&r.isDue);if(!r)return;s.revisionHistory.push({id:uid(),sourceKey:r.key,topic:r.topic,subj:r.subj,step:r.step,date:today(),at:Date.now(),passed});persist();render();}
  ACT.sscReviewPass=d=>review(d,true);ACT.sscReviewFail=d=>review(d,false);
  ACT.sscDeleteReview=d=>{ensure().revisionHistory=state().revisionHistory.filter(r=>r.id!==d.id);persist();render();};
  ACT.sscMock=mockForm;ACT.sscDeleteMock=d=>{if(!confirm('Delete this mock analysis?'))return;ensure().mockAnalyses=state().mockAnalyses.filter(m=>m.id!==d.id);persist();render();};
  ACT.sscBankTemplate=()=>c.download('ssc-question-import-template.json',JSON.stringify({template:true,questions:[{id:'unique-question-id',kind:'pyq',exam:'CGL',year:2025,tier:'Tier I',paperDate:'2025-09-12',shift:'1',questionNumber:'1',subj:'Reasoning',topic:'Number Series',question:'Replace with a question you are permitted to reuse',options:['Option A','Option B','Option C','Option D'],answer:0,explanation:'Replace with the verified solution',sourceUrl:'https://ssc.gov.in/',sourceTitle:'Replace with exact paper / answer key title',reuseBasis:'Describe permission or licence'}]},null,2),'application/json');
  ACT.sscResetBank=async()=>{if(!confirm('Remove this device’s imported question bank? Attempts and mistakes will remain.'))return;try{await bankStore('write',[]);loadPromise=null;bankReady=false;await loadBank();render();}catch(e){toast('Could not change question storage on this device.');}};
  CHG.sscFilter=el=>{filters[el.dataset.key]=el.value;session=null;render();};CHG.sscTopic=el=>{filters.topic=el.value;session=null;render();};
  CHG.sscImportBank=async el=>{
    const file=el.files?.[0];if(!file)return;
    try{if(file.size>5*1024*1024)throw new Error('Keep each import below 5 MB.');const imported=validateBank(JSON.parse(await file.text()));await bankStore('write',imported);loadPromise=null;bankReady=false;await loadBank();toast(imported.length+' questions imported on this device');render();}catch(e){toast(e.message||'Import failed.');}finally{el.value='';}
  };
  VIEWS.practice=practiceView;VIEWS.pyq=bankView;VIEWS.mistakes=mistakesView;VIEWS.revisionQueue=revisionsView;VIEWS.mockAnalysis=mocksView;
  return {dailyHTML,statsHTML,ensure,loadBank,resetSession:()=>{session=null;}};
}
