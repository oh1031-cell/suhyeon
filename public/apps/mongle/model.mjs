export function makeQuestions(tables,count,rng=Math.random){
 if(!Array.isArray(tables)||!tables.length||tables.some(a=>!Number.isInteger(a)||a<2||a>9)||!Number.isInteger(count)||count<1||count>100)throw Error('연습할 단과 문제 수를 확인해 주세요.');
 const pool=[...new Set(tables)].flatMap(a=>Array.from({length:9},(_,i)=>({a,b:i+1,answer:a*(i+1)})));let out=[];
 while(out.length<count){const deck=pool.map(q=>({...q}));for(let i=deck.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
 if(out.length&&deck[0].a===out.at(-1).a&&deck[0].b===out.at(-1).b)[deck[0],deck[1]]=[deck[1],deck[0]];
 out.push(...deck);}return out.slice(0,count).map((q,i)=>({...q,id:`${Date.now()}-${i}`,recipe:i%4}));
}
export function createRecord(q){return {...q,attempts:0,hint:0,firstCorrect:false,solved:false};}
export function submitAnswer(r,value){
 if(r.solved||!/^\d{1,2}$/.test(String(value)))return r;
 const correct=Number(value)===r.answer;
 return {...r,attempts:r.attempts+1,firstCorrect:r.attempts===0?correct:r.firstCorrect,solved:correct};
}
export function classify(r){return r.hint>0?'help':r.firstCorrect?'first':'retry';}
const fact=q=>q&&Number.isInteger(q.a)&&q.a>=2&&q.a<=9&&Number.isInteger(q.b)&&q.b>=1&&q.b<=9&&q.answer===q.a*q.b;
export function readSave(raw){try{const s=JSON.parse(raw);if(s?.version!==1||!s.settings||!Array.isArray(s.settings.tables)||!s.settings.tables.length||s.settings.tables.some(a=>!Number.isInteger(a)||a<2||a>9)||!['slow','quick'].includes(s.settings.mode)||![3,6,10].includes(s.settings.count)||!Array.isArray(s.history))return null;
 if(s.round){const r=s.round;if(!Array.isArray(r.questions)||!r.questions.length||r.questions.length>100||!r.questions.every(fact)||!Array.isArray(r.records)||r.records.length>r.questions.length||!r.records.every((q,i)=>fact(q)&&q.a===r.questions[i].a&&q.b===r.questions[i].b&&q.solved===true&&Number.isInteger(q.attempts)&&q.attempts>=1&&Number.isInteger(q.hint)&&q.hint>=0&&q.hint<=3&&typeof q.firstCorrect==='boolean')||r.index!==r.records.length||!['slow','quick'].includes(r.mode)||typeof r.review!=='boolean')return null;}
 return s;}catch{return null;}}
