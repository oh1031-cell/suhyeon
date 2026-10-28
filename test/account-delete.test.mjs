import {test} from 'node:test';
import assert from 'node:assert/strict';
import {deleteAccountData} from '../public/apps/diary/account-delete.mjs';
test('account deletion stops if identity changes while final empty batch is pending',async()=>{
 const first={uid:'alice'},second={uid:'bob'};let current=first,deleted=[];
 await assert.rejects(()=>deleteAccountData({getUser:()=>current,reauthenticate:async()=>{},beginDelete:async()=>{},listBatch:async()=>{current=second;return [];},deleteBatch:async()=>{},deleteUser:async user=>deleted.push(user.uid)}));
 assert.deepEqual(deleted,[]);
});
test('account deletion removes all batches then only the captured authenticated account',async()=>{
 const user={uid:'alice'},batches=[[1,2],[3],[]],removed=[];let deleted;
 await deleteAccountData({getUser:()=>user,reauthenticate:async()=>{},beginDelete:async()=>{},listBatch:async()=>batches.shift(),deleteBatch:async rows=>removed.push(...rows),deleteUser:async u=>deleted=u});
 assert.deepEqual(removed,[1,2,3]);assert.equal(deleted,user);
});
