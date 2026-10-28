import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {validateState,drawNumbers,makeGroups,emptyState} from '../public/core.mjs';
import {createHub} from '../server.mjs';

test('backup validation rejects unsafe URLs and malformed nested state',()=>{
 const s=emptyState(); s.apps.push({id:'a',title:'도구',description:'',category:'수업',url:'javascript:alert(1)',favorite:false});
 assert.throws(()=>validateState(s)); s.apps[0].url='https://example.com'; assert.equal(validateState(s).apps.length,1);
 s.tasks=[{id:'x',text:'할일',date:'2026-02-30',done:false}]; assert.throws(()=>validateState(s));
 assert.throws(()=>validateState({...emptyState(),timetable:{월:['수학',123]}}));
});
test('number draw excludes absences and groups are balanced with no duplicates',()=>{
 const drawn=drawNumbers(25,[2,4],23); assert.equal(new Set(drawn).size,23); assert.ok(!drawn.includes(2));
 assert.throws(()=>drawNumbers(25,[2],25)); assert.throws(()=>makeGroups(3,[],4));
 const groups=makeGroups(25,[2,4],5); assert.equal(groups.flat().length,23); assert.equal(new Set(groups.flat()).size,23); assert.ok(Math.max(...groups.map(g=>g.length))-Math.min(...groups.map(g=>g.length))<=1);
});
test('HTTP persists across restart and rejects external origins and traversal',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'drawer-test-')); let hub;
 const open=async()=>{hub=await createHub({dataPath:join(dir,'hub.json'),diaryPath:null});await new Promise(r=>hub.listen(0,'127.0.0.1',r));return `http://127.0.0.1:${hub.address().port}`;};
 try {let base=await open(); const state=emptyState();state.tasks=[{id:'t',text:'내일 준비',date:'2026-10-28',done:false}];
 assert.equal((await fetch(base+'/api/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(state)})).status,200);
 assert.equal((await fetch(base+'/api/state',{headers:{Origin:'https://evil.example'}})).status,403);
 assert.equal((await fetch(base+'/api/state',{method:'PUT',body:'{}'})).status,400);
 assert.equal((await fetch(base+'/..%2fserver.mjs')).status,404);
 assert.equal((await fetch(base+'/apps/onclass/')).status,200);
 const diary=await fetch(base+'/apps/diary/');assert.match(diary.headers.get('content-security-policy'),/www\.gstatic\.com/);
 assert.equal((await fetch(base+'/apps/diary/firebase-config.json')).status,200);
 await new Promise(r=>hub.close(r)); base=await open();assert.equal((await (await fetch(base+'/api/state')).json()).tasks[0].text,'내일 준비');
 assert.equal(JSON.parse(await readFile(join(dir,'hub.json'),'utf8')).tasks.length,1);
 } finally{if(hub?.listening)await new Promise(r=>hub.close(r));await rm(dir,{recursive:true,force:true});}
});
