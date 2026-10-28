import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateEntry,parseDiaryBackup} from '../public/apps/diary/validation.mjs';
const entry={title:'오늘',content:'행복한 하루\n기억하기',date:'2026-10-28',mood:'good',tags:['일상'],favorite:false};
test('diary payload rejects invalid dates, oversized text and malformed tags',()=>{
 assert.equal(validateEntry(entry).content,entry.content);
 for(const value of [{...entry,date:'2026-02-30'},{...entry,content:'a'.repeat(100001)},{...entry,tags:[123]},{...entry,title:''}])assert.throws(()=>validateEntry(value));
 assert.equal(parseDiaryBackup(JSON.stringify([entry])).length,1);assert.equal(parseDiaryBackup(JSON.stringify({entries:[entry]})).length,1);assert.throws(()=>parseDiaryBackup('{}'));
});
