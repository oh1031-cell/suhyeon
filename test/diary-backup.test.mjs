import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chunkDiaryBackup} from '../public/apps/diary/backup.mjs';
import {parseDiaryBackup} from '../public/apps/diary/validation.mjs';
const entry={title:'오늘',content:'이야기',date:'2026-10-28',mood:'good',tags:[],favorite:false};
test('large exports split into individually restorable count and UTF8 byte limits',()=>{
 for(const list of [Array(1001).fill(entry),Array(40).fill({...entry,content:'가'.repeat(100000)})]){
  const chunks=chunkDiaryBackup(list);assert.ok(chunks.length>1);assert.equal(chunks.flat().length,list.length);
  for(const chunk of chunks){const raw=JSON.stringify(chunk);assert.ok(Buffer.byteLength(raw)<=8000000);assert.ok(chunk.length<=1000);assert.equal(parseDiaryBackup(raw).length,chunk.length);}
 }
});
