/* Teaching material integrated from the user's masterclass, with original model practice. */
const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const MASTERCLASS_ADDITIONS = [
 { level:1,title:'Split into convenient parts',text:'47 × 6 = (40 + 7) × 6 = 240 + 42 = 282. Splitting works for any number.',steps:['47 = 40 + 7','40×6 = 240','7×6 = 42','240+42 = 282'],question:'Find 234 × 12.',solution:'234 × (10 + 2) = 2340 + 468 = 2808.',answer:'2808',condition:'Keep place values aligned and add all partial products.' },
 { level:1,title:'Left-to-right mental multiplication',text:'43 × 26 = 43 × 20 + 43 × 6 = 860 + 258 = 1118. Keep a running partial sum.',steps:['26 = 20 + 6','43×20 = 860','43×6 = 258','860+258 = 1118'],question:'Find 347 × 26.',solution:'347 × 20 = 6940; 347 × 6 = 2082; sum = 9022.',answer:'9022',condition:'The multiplier is split by place value; this is the distributive law, not a different multiplication rule.' },
 { level:2,title:'×12, ×15 and ×20',text:'×12 = ×10 + ×2. ×15 = ×10 + half of ×10. ×20 = double then ×10.',steps:['64 × 15','64×10 = 640','Half of 640 = 320','640+320 = 960'],question:'Find 46 × 12.',solution:'460 + 92 = 552. Also, 73 × 20 = 1460.',answer:'552',condition:'Half of ×10 is ×5; do not halve the original number instead of the partial product.' },
 { level:2,title:'Multiply by 75',text:'×75 = ×100 − one quarter of ×100, or ×3 ×25. The existing ×50 method remains in the powers-of-ten shortcuts.',steps:['64 × 75','64×100 = 6400','6400÷4 = 1600','6400−1600 = 4800'],question:'Find 84 × 75.',solution:'8400 − 2100 = 6300.',answer:'6300',condition:'75 = 3/4 of 100; keep exact fractions when necessary.' },
 { level:2,title:'×101 and ×1001',text:'×101 = ×100 + the original number. ×1001 = ×1000 + the original number.',steps:['84 × 101','8400 + 84','8484'],question:'Find 36 × 1001.',solution:'36000 + 36 = 36036.',answer:'36036',condition:'Always add the original number, not just its final digits.' },
 { level:3,title:'Numbers above 100',text:'103 × 106: excesses 3 and 6. Left = 103 + 6 = 109; right = 3 × 6 = 18; answer = 10918.',steps:['103 = 100 + 3','106 = 100 + 6','Left: 103+6 = 109','Right: 3×6 = 18','109×100 + 18 = 10918'],question:'Find 108 × 112.',solution:'Excesses 8 and 12. Left = 108 + 12 = 120; right = 96. Answer = 12096.',answer:'12096',condition:'For base 100 reserve two right-hand digits. Carry any right-part hundreds to the left.' },
 { level:3,title:'Numbers near 1,000',text:'997 × 994: deficits 3 and 6. Left = 997 − 6 = 991; right = 018; result = 991018.',steps:['997 = 1000 − 3','994 = 1000 − 6','Left: 991','Right: 3×6 = 018','991 | 018 = 991018'],question:'Find 998 × 997.',solution:'Left = 998 − 3 = 995; right = 2 × 3 = 006. Answer = 995006.',answer:'995006',condition:'Base 1,000 needs three digits on the right, including leading zeros; carry when the right product is at least 1,000.' },
 { level:3,title:'Same tens digit; units add to 10',text:'43 × 47: same tens 4, and 3 + 7 = 10. Left = 4 × 5 = 20; right = 3 × 7 = 21; result 2021.',steps:['43 × 47','Tens: 4×5 = 20','Units: 3×7 = 21','20 | 21 = 2021'],question:'Find 62 × 68.',solution:'6 × 7 = 42; 2 × 8 = 16; result = 4216.',answer:'4216',condition:'Both conditions must hold: same tens digit and units totaling 10. Matching first digits alone is not sufficient.' },
 { level:4,title:'Compensation around a round number',text:'49 × 68 = 50 × 68 − 68 = 3332. 198 × 34 = 200 × 34 − 2 × 34 = 6732.',steps:['49 = 50 − 1','50×68 = 3400','Subtract 1×68','3400−68 = 3332'],question:'Find 198 × 34.',solution:'6800 − 68 = 6732.',answer:'6732',condition:'Correct by the full difference multiplied by the other factor; a difference of 2 requires subtracting twice that factor.' },
 { level:4,title:'Factorization for easy intermediate products',text:'125 × 24 = 125 × 8 × 3 = 1000 × 3 = 3000. Choose useful factors instead of multiplying blindly.',steps:['24 = 8×3','125×8 = 1000','1000×3 = 3000'],question:'Find 36 × 125.',solution:'36 = 9 × 4. Then 4 × 125 = 500 and 9 × 500 = 4500.',answer:'4500',condition:'Use a true factorization: factors multiply to the original number; they are not added.' },
 { level:4,title:'Chunking 3-, 4- and 5-digit numbers',text:'12345 × 12 = 123450 + 24690 = 148140. For ×25, multiply by 100 then divide by 4.',steps:['12345 × (10+2)','123450 + 24690','148140'],question:'Find 1234 × 25.',solution:'123400 ÷ 4 = 30850.',answer:'30850',condition:'Chunking is exact at any digit length. Keep zero positions and partial sums clear.' },
 { level:5,title:'Estimate, then verify exactly',text:'198 × 51 is near 200 × 50 = 10000. Exact working: 9900 + 198 = 10098.',steps:['Estimate: 200×50 ≈ 10000','Exact: 198×50 = 9900','Add 198','10098'],question:'Can estimation distinguish 10098 from 10099 here?',solution:'No. Those values are too close. Use exact multiplication; the correct answer is 10098.',answer:'No',condition:'Estimation rejects implausible magnitudes, but does not prove an exact answer or separate very close options.' }
];
export const MERGED_EXAMPLES = {
 'Double and double again':['×8 doubles three times; ×16 four times; ×32 five times.','37 ×16: 37 →74 →148 →296 →592.'],
 'Double and halve':['16 ×45 = 8 ×90 = 4 ×180 = 720.','25 ×48 = 50 ×24 = 100 ×12 = 1200.'],
 '×5 is ×10 then halve':['368 ×5 = 3680 ÷2 = 1840.'],
 '×25, ×50, ×125':['48 ×25 = 4800 ÷4 = 1200.','48 ×125 = 48000 ÷8 = 6000.'],
 '×9 and ×99':['×999 = ×1000 − the original number.','76 ×9 = 684; 83 ×99 = 8217; 246 ×999 = 245754.'],
 '×11 for two digits':['For three digits, add adjacent pairs and carry from right to left.','314 ×11: 3 | 3+1 | 1+4 | 4 →3454.','789 ×11: 7 | 15 | 17 | 9 →8679 after carrying.'],
 'Numbers near 100':['98 ×96: left 94, right 08 →9408. Base 10 reserves one digit; base 100 two; base 1000 three.'],
 'Squares ending in 5':['35² = 1225; 65² = 4225; 115² = 13225.','For 115², use all digits before the 5: 11 ×12 =132, then append25.'],
 'Difference of squares':['97 ×103 =100² −3² =9991.'],
 'Criss-cross (two digits)':['23 ×14 from the right: 3×4=12, write2 carry1; cross 2×4+3×1+1=12, write2 carry1; left 2×1+1=3 →322.'],
 'Three digits':['Equal-length n-digit multiplication has 2n−1 diagonal stages: 3-digit →5; 4-digit →7; 5-digit →9.','Track all carries; chunking or compensation can be easier mentally than many cross products.']
};
export function suggestedMethod(x,y) {
 if(![x,y].every(n=>Number.isSafeInteger(n)&&n>=1&&n<=999999))throw new Error('Enter positive whole numbers from 1 to 999999.');
 if(x>=10&&x<=99&&y>=10&&y<=99&&Math.floor(x/10)===Math.floor(y/10)&&x%10+y%10===10)return {method:'Same tens; units add to 10',reason:'Both required digit-pattern conditions hold.',answer:x*y};
 for(const multiplier of [5,25,50,75,125,9,99,999,11,12,15,20,101,1001])if(x===multiplier||y===multiplier)return {method:'Special multiplier ×'+multiplier,reason:'Use its powers-of-ten, addition/subtraction or adjacent-digit rule.',answer:x*y};
 for(const base of [10,100,1000])if(Math.abs(x-base)<=base*.1&&Math.abs(y-base)<=base*.1)return {method:'Base '+base+' or difference of squares',reason:x+y===2*base?'The factors are equally spaced around '+base+'.':'Both factors are near '+base+'; track signed gaps and carry/borrow carefully.',answer:x*y};
 if(x===y && x%10===5)return {method:'Square ending in 5',reason:'Multiply the prefix by its next integer and append25.',answer:x*y};
 return {method:'Splitting, factorization or compensation',reason:'No simple special pattern is guaranteed. Choose easy partial products and verify the sum.',answer:x*y};
}
export const MASTERCLASS_TEST = [
 {t:'99 ×98 = ?',a:9702,opts:[9702,9802,9602,9792],topic:'Mental Multiplication',explanation:'Base100: left99−2=97; right1×2=02 →9702.'},
 {t:'78 ×11 = ?',a:858,topic:'Mental Multiplication',explanation:'7 |15 |8; carry1 →858.'},
 {t:'64 ×75 = ?',a:4800,topic:'Mental Multiplication',explanation:'6400 −1600 =4800.'},
 {t:'997 ×994 = ?',a:991018,topic:'Mental Multiplication',explanation:'Left991, right018 →991018.'},
 {t:'115 ×115 = ?',a:13225,topic:'Mental Multiplication',explanation:'11×12=132; append25 →13225.'},
 {t:'43 ×47 = ?',a:2021,topic:'Mental Multiplication',explanation:'Same tens4, units3+7=10: 4×5 |3×7 =20 |21.'},
 {t:'198 ×34 = ?',a:6732,topic:'Mental Multiplication',explanation:'200×34 −2×34 =6800−68.'},
 {t:'125 ×24 = ?',a:3000,topic:'Mental Multiplication',explanation:'125×8×3 =1000×3.'},
 {t:'12345 ×12 = ?',a:148140,topic:'Mental Multiplication',explanation:'123450 +24690 =148140.'},
 {t:'347 ×26 = ?',a:9022,topic:'Mental Multiplication',explanation:'6940 +2082 =9022.'}
];
export const COURSE_DAYS = [
 'Tables up to20, ×5, ×9 and ×11',
 '×12, ×15, ×25, ×50 and ×125',
 'Near100 and near1000',
 'Squares and difference of squares',
 'Compensation, factorization, doubling/halving',
 '3-, 4- and5-digit mental multiplication',
 'Mixed timed test and error correction'
];
export function masterclassIntro(days=[]) {
 return `<div class="card" style="margin-bottom:14px"><h3>Mental Maths Masterclass</h3><p class="quiet">Your uploaded course is integrated into the five levels below. There is no single fastest trick: recognise the pattern, use exact steps, then check. Existing mastery flags are retained; review the newly added methods before treating an expanded level as mastered.</p><div class="actions">${['Foundations','Special multipliers','Number patterns','Advanced multiplication','SSC speed training'].map((name,i)=>`<button class="btn sm ghost" data-act="openTrickLevel" data-level="${i+1}">${i+1}. ${name}</button>`).join('')}<button class="btn sm" data-act="masterclassTest">Start 10-question timed test</button></div><div id="masterclass-test"></div></div>`;
}
export function masterclassResources(days=[]) {
 return `<div class="grid g2" style="margin-top:16px"><div class="card"><h3>Which method fits these numbers?</h3><p class="quiet">This is a suggestion, not a universal fastest-method guarantee.</p><div class="actions"><input class="inp" id="method-x" type="number" min="1" max="999999" value="43" aria-label="First factor"><input class="inp" id="method-y" type="number" min="1" max="999999" value="47" aria-label="Second factor"><button class="btn sm" data-act="suggestMathMethod">Show method</button></div><div id="method-result" role="status"></div></div><div class="card"><h3>Seven-day practice checklist</h3><p class="quiet">Aim for 15–20 minutes per day. This checklist is independent of your SSC timetable; it does not award study minutes.</p>${COURSE_DAYS.map((text,i)=>`<label class="course-day"><input type="checkbox" data-chg="masterclassDay" data-day="${i+1}" ${days.some(d=>d.id==='day:'+String(i+1))?'checked':''}><span><b>Day ${i+1}</b> ${esc(text)}</span></label>`).join('')}</div></div><div class="grid g2" style="margin-top:16px"><div class="card"><h3>Square memory map: 11–50</h3><p class="quiet">Start with 11–30, then build to 50. For the full square drill, open Revise → Squares.</p><div class="refgrid">${Array.from({length:40},(_,i)=>i+11).map(n=>`<div><span>${n}²</span><b>${n*n}</b></div>`).join('')}</div><button class="btn sm ghost" data-act="revKindFromTricks" data-kind="sq">Open square drill</button></div><div class="card"><h3>Fraction multipliers</h3><div class="tablewrap"><table><thead><tr><th>Fraction</th><th>Decimal</th><th>Operation</th></tr></thead><tbody>${[[2,'0.5'],[4,'0.25'],[5,'0.2'],[8,'0.125'],[10,'0.1'],[20,'0.05'],[25,'0.04']].map(([n,decimal])=>`<tr><td>1/${n}</td><td>${decimal}</td><td>Divide by ${n}</td></tr>`).join('')}</tbody></table></div><p class="quiet">These decimals are exact. Decimal 0.125 is 12.5%, not 0.125%.</p></div></div>`;
}
export function mergedExampleHTML(title) {
 return MERGED_EXAMPLES[title]?`<div class="masterclass-examples"><b>More from your masterclass</b>${MERGED_EXAMPLES[title].map(text=>`<p>${esc(text)}</p>`).join('')}</div>`:'';
}

export function mentalPracticeQuestions(level,count,random=Math.random) {
 const int=(min,max)=>min+Math.floor(random()*(max-min+1));
 const build=(x,y,method)=>({t:x+' × '+y+' = ?',a:x*y,show:String(x*y),explanation:method,operation:'multiply',operands:[x,y]});
 const templates={
  1:[()=>build(int(11,99),int(2,9),'Split the first number into tens and units.'),()=>build(int(111,499),int(12,29),'Multiply left to right by tens, then units, and add.'),()=>build(int(12,99),[4,8,16,32][int(0,3)],'Use repeated doubling.'),()=>build(int(6,49)*2,[15,25,35,45][int(0,3)],'Halve the even factor and double the other factor.'),()=>build(int(12,499),5,'Multiply by10, then halve.')],
  2:[5,9,11,12,15,20,25,50,75,99,101,125,999,1001].map(multiplier=>()=>build(int(12,199),multiplier,'Use the special multiplier rule for ×'+multiplier+'.')),
  3:[()=>{const n=int(1,19)*10+5;return {...build(n,n,'Multiply the prefix by its next integer, then append25.'),t:n+'² = ?'};},()=>build(int(80,99),int(80,99),'Use deficits from100 and carry the right part if necessary.'),()=>build(int(101,119),int(101,119),'Use excesses above100; reserve two right-hand digits.'),()=>build(int(970,999),int(970,999),'Use base1000 and reserve three right-hand digits.'),()=>{const tens=int(1,9),units=int(1,9);return build(tens*10+units,tens*10+10-units,'Same tens and complementary units: prefix×(prefix+1), then the units product.');},()=>{const mid=int(2,10)*10,gap=int(1,9);return build(mid-gap,mid+gap,'Use midpoint² minus gap².');},()=>{const n=int(91,109);return {...build(n,n,'Expand (100±gap)² including the middle term.'),t:n+'² = ?'};}],
  4:[()=>build([49,99,198,499,998][int(0,4)],int(12,99),'Round one factor, then compensate by the complete difference.'),()=>build(125,int(2,20)*8,'Factor out8 because125×8=1000.'),()=>build(int(11,99),int(11,99),'Use three vertical/crosswise columns with carries.'),()=>build(int(111,499),int(111,199),'Use five crosswise stages, or split into hundreds, tens and units.'),()=>build(int(1000,9999),25,'Multiply by100, then divide by4.'),()=>build(int(10000,49999),12,'Chunk into ×10 and ×2, then add.')],
  5:[()=>build(int(90,199),[49,51,99,101][int(0,3)],'Estimate the magnitude, then compute an exact answer.'),()=>{const x=int(11,50);return {...build(x,x,'Use a remembered square or expand around a round number.'),t:x+'² = ?'};},()=>{const percent=[6.25,12.5,25,37.5,62.5,75][int(0,5)],value=int(5,60)*16,answer=percent*value/100;return {t:percent+'% of '+value+' = ?',a:answer,show:String(answer),explanation:'Convert the exact percentage into a fraction.',operation:'percentage',operands:[percent,value]};},()=>{const denominator=[2,4,5,8,10,20,25][int(0,6)],value=int(10,99)*denominator;return {t:'1/'+denominator+' of '+value+' = ?',a:value/denominator,show:String(value/denominator),explanation:'Divide the whole value by the denominator.',operation:'fraction',operands:[value,denominator]};}]
 };
 if(!templates[level])throw new Error('Choose a masterclass level from1 to5.');
 const choices=[...templates[level]];
 for(let i=choices.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[choices[i],choices[j]]=[choices[j],choices[i]];}
 const questions=[],seen=new Set();
 for(let i=0;i<1000&&questions.length<count;i++) {const q=choices[i%choices.length]();if(!seen.has(q.t)){seen.add(q.t);questions.push(q);}}
 for(let i=questions.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[questions[i],questions[j]]=[questions[j],questions[i]];}
 return questions;
}
