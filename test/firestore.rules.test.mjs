import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,getDocs,collection,updateDoc,deleteDoc,serverTimestamp,Timestamp} from 'firebase/firestore';

test('Firestore: private Google accounts, strict create/update schema, owner-only access',{skip:!process.env.FIRESTORE_EMULATOR_HOST},async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-classroom-drawer',firestore:{rules:await readFile('firestore.rules','utf8')}});
 try{
  const claims={email_verified:true,firebase:{sign_in_provider:'google.com'}};
  const alice=env.authenticatedContext('alice',claims).firestore(),bob=env.authenticatedContext('bob',claims).firestore(),anon=env.unauthenticatedContext().firestore();
  const path='users/alice/entries/a',a=doc(alice,path),b=doc(bob,path),u=doc(anon,path);
  const valid=()=>({title:'오늘',content:'한글\n기록',date:'2026-10-28',mood:'good',tags:['감사'],favorite:false,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
  await assertFails(getDocs(collection(anon,'users/alice/entries')));
  await assertFails(setDoc(u,valid()));await assertFails(setDoc(b,valid()));
  await assertSucceeds(setDoc(a,valid()));await assertSucceeds(getDoc(a));await assertSucceeds(getDocs(collection(alice,'users/alice/entries')));
  await assertFails(getDoc(b));await assertFails(getDocs(collection(bob,'users/alice/entries')));await assertFails(deleteDoc(b));
  for(const changes of [{content:'x'.repeat(100001)},{title:123},{tags:[123]},{tags:['x'.repeat(25)]},{tags:Array(11).fill('a')},{ownerId:'bob'},{isAdmin:true},{favorite:'yes'},{createdAt:Timestamp.fromMillis(0)},{updatedAt:Timestamp.fromMillis(0)}]){
   await assertFails(updateDoc(a,{...changes,updatedAt:changes.updatedAt??serverTimestamp()}));
  }
  const omitted=valid();delete omitted.title;await assertFails(setDoc(a,omitted));
  await assertFails(setDoc(doc(alice,'users/alice/entries/b'),{...valid(),content:'a'.repeat(100001)}));
  await assertFails(getDoc(doc(alice,'users/bob/entries/a')));
  const unverified=env.authenticatedContext('alice',{...claims,email_verified:false}).firestore();await assertFails(getDoc(doc(unverified,path)));
  const password=env.authenticatedContext('alice',{email_verified:true,firebase:{sign_in_provider:'password'}}).firestore();await assertFails(getDoc(doc(password,path)));
  await assertSucceeds(updateDoc(a,{title:'수정',updatedAt:serverTimestamp()}));assert.equal((await getDoc(a)).data().title,'수정');await assertSucceeds(deleteDoc(a));
  await assertSucceeds(setDoc(a,valid()));
  await assertSucceeds(setDoc(doc(alice,'users/alice'),{deleting:true,updatedAt:serverTimestamp()}));
  await assertFails(setDoc(doc(alice,'users/alice/entries/new'),valid()));
  await assertFails(updateDoc(a,{title:'삭제와 경합하는 저장',updatedAt:serverTimestamp()}));
  await assertFails(deleteDoc(doc(alice,'users/alice')));
  await assertFails(setDoc(doc(bob,'users/alice'),{deleting:true,updatedAt:serverTimestamp()}));
  await assertSucceeds(deleteDoc(a));
 }finally{await env.cleanup();}
});
