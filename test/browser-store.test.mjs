import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBrowserStore} from '../public/store.mjs';
import {emptyState} from '../public/core.mjs';
test('browser settings are local and rejected backups leave previous settings intact',async()=>{
 const memory=new Map(),storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
 const store=createBrowserStore(storage,'test');const s=emptyState();s.notice='나의 교실';await store.write(s);
 assert.equal((await store.read()).notice,'나의 교실');await assert.rejects(()=>store.write({}));assert.equal((await store.read()).notice,'나의 교실');
 storage.setItem('test','broken');await assert.rejects(()=>store.read());
});
