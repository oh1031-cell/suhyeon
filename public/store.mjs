import {emptyState,validateState} from './core.mjs';
export function createBrowserStore(storage,key='classroom-drawer-v1'){
 return {mode:'browser',async read(){const raw=storage.getItem(key);return raw?validateState(JSON.parse(raw)):emptyState();},async write(next){const clean=validateState(next);storage.setItem(key,JSON.stringify(clean));return clean;}};
}
export async function openStore(){
 let mode='browser';
 try{const r=await fetch(new URL('./runtime.json',import.meta.url));if(r.ok)mode=(await r.json()).mode;}catch{}
 if(mode!=='server')return createBrowserStore(localStorage,`classroom-drawer-v1:${new URL('./',location.href).pathname}`);
 return {mode:'server',async read(){const r=await fetch('/api/state');if(!r.ok)throw Error('저장 파일을 읽지 못했어요.');return r.json();},async write(next){const r=await fetch('/api/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(validateState(next))});const v=await r.json();if(!r.ok)throw Error(v.error);return v;}};
}
