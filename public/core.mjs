export const weekdays=['월','화','수','목','금'];
export const categories=['수업','학급운영','개인','기타'];
export const emptyState=()=>({version:1,apps:[],tasks:[],timetable:Object.fromEntries(weekdays.map(d=>[d,Array(6).fill('')])),notice:'좋은 아침이에요!\n가방을 정리하고 오늘의 배움을 준비해요.'});
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v);
const text=(v,n,empty=false)=>{if(typeof v!=='string'||v.length>n||(!empty&&!v.trim()))throw Error('입력 내용의 길이와 형식을 확인해 주세요.');return v.trim();};
const id=v=>text(v,100);
export function validURL(value){const url=new URL(value);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('HTTP 또는 HTTPS 주소만 사용할 수 있어요.');return url.href;}
export function validateState(s){
 if(!obj(s)||s.version!==1||!Array.isArray(s.apps)||s.apps.length>200||!Array.isArray(s.tasks)||s.tasks.length>3000||!obj(s.timetable))throw Error('교실 서랍 백업 파일 형식이 아닙니다.');
 const apps=s.apps.map(a=>{if(!obj(a)||!categories.includes(a.category)||typeof a.favorite!=='boolean')throw Error('앱 정보를 확인해 주세요.');return {id:id(a.id),title:text(a.title,60),description:text(a.description,200,true),category:a.category,url:validURL(text(a.url,2000)),favorite:a.favorite};});
 const tasks=s.tasks.map(t=>{if(!obj(t)||typeof t.done!=='boolean'||typeof t.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(t.date)||!Number.isFinite(Date.parse(t.date))||new Date(t.date).toISOString().slice(0,10)!==t.date)throw Error('할 일 날짜를 확인해 주세요.');return {id:id(t.id),text:text(t.text,200),date:t.date,done:t.done};});
 for(const list of [apps,tasks])if(new Set(list.map(i=>i.id)).size!==list.length)throw Error('중복된 항목이 있습니다.');
 const timetable=Object.fromEntries(weekdays.map(d=>{if(!Array.isArray(s.timetable[d])||s.timetable[d].length!==6)throw Error('시간표는 요일별 6교시로 구성해 주세요.');return [d,s.timetable[d].map(v=>text(v,40,true))];}));
 return {version:1,apps,tasks,timetable,notice:text(s.notice,2000,true)};
}
export function pool(total,excluded=[]){if(!Number.isInteger(total)||total<1||total>100||!Array.isArray(excluded)||excluded.some(n=>!Number.isInteger(n)||n<1||n>total))throw Error('전체 인원은 1~100명, 제외 번호는 범위 안에서 입력해 주세요.');return Array.from({length:total},(_,i)=>i+1).filter(n=>!excluded.includes(n));}
export function drawNumbers(total,excluded,count){const p=pool(total,excluded);if(!Number.isInteger(count)||count<1||count>p.length)throw Error('뽑을 수 있는 번호가 부족해요. 인원과 제외 번호를 확인해 주세요.');for(let i=p.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[p[i],p[j]]=[p[j],p[i]];}return p.slice(0,count);}
export function makeGroups(total,excluded,count){const p=pool(total,excluded);if(!Number.isInteger(count)||count<1||count>p.length)throw Error('모둠 수는 참여 인원 이하여야 해요.');const mixed=drawNumbers(total,excluded,p.length);const groups=Array.from({length:count},()=>[]);mixed.forEach((n,i)=>groups[i%count].push(n));return groups;}
export function parseExcluded(value){if(!value.trim())return [];const parts=value.trim().split(/[,\s]+/);if(parts.some(x=>!/^\d+$/.test(x)))throw Error('제외 번호는 쉼표나 공백으로 나누어 입력해 주세요.');return [...new Set(parts.map(Number))];}
