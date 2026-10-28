import {validateEntry,parseDiaryBackup} from './validation.mjs';
import {deleteAccountData} from './account-delete.mjs';
let sdk,auth,db,config;
const requireUser=()=>{if(!auth?.currentUser)throw Error('먼저 Google 계정으로 로그인해 주세요.');return auth.currentUser.uid;};
const decode=d=>({id:d.id,...d.data(),createdAt:d.data().createdAt?.toDate().toISOString()||new Date().toISOString(),updatedAt:d.data().updatedAt?.toDate().toISOString()||new Date().toISOString()});
export async function initialize(onUser,onEntries,onError){
 config=await (await fetch('./firebase-config.json')).json();if(!config.enabled||!config.firebase?.projectId)throw Error('Firebase 연결 설정을 준비 중이에요. 배포 설정이 완료되면 로그인할 수 있어요.');
 const [app,a,f]=await Promise.all([import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js'),import('https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js')]);
 sdk={...a,...f};const instance=app.initializeApp(config.firebase);auth=a.getAuth(instance);await a.setPersistence(auth,a.browserSessionPersistence);db=f.initializeFirestore(instance,{localCache:f.memoryLocalCache()},config.databaseId);
 let unsubscribe;let generation=0;
 a.onAuthStateChanged(auth,user=>{generation++;const current=generation;if(unsubscribe)unsubscribe();onEntries([]);onUser(user);if(user){const entries=f.collection(db,'users',user.uid,'entries');unsubscribe=f.onSnapshot(f.query(entries,f.orderBy('createdAt','desc')),snapshot=>{if(current===generation)onEntries(snapshot.docs.map(decode));},onError);}});
}
export async function login(){if(!auth)throw Error('Firebase 연결을 먼저 확인해 주세요.');const provider=new sdk.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});return sdk.signInWithPopup(auth,provider);}
export async function logout(){return sdk.signOut(auth);}
export async function deleteAccount(){
 requireUser();
 return deleteAccountData({getUser:()=>auth.currentUser,reauthenticate:async user=>{try{await sdk.reauthenticateWithPopup(user,new sdk.GoogleAuthProvider());}catch{throw Error('계정 삭제를 위한 본인 확인을 완료하지 못했어요.');}},beginDelete:async uid=>{const ref=sdk.doc(db,'users',uid);if(!(await sdk.getDoc(ref)).exists())await sdk.setDoc(ref,{deleting:true,updatedAt:sdk.serverTimestamp()});},listBatch:async uid=>(await sdk.getDocs(sdk.query(sdk.collection(db,'users',uid,'entries'),sdk.limit(200)))).docs,deleteBatch:async rows=>{const batch=sdk.writeBatch(db);rows.forEach(d=>batch.delete(d.ref));await batch.commit();},deleteUser:user=>sdk.deleteUser(user)});
}
export async function api(path,method='GET',body){
 const uid=requireUser(),base=sdk.collection(db,'users',uid,'entries');
 const id=path.split('/')[3];if(id&&!/^[a-zA-Z0-9_-]{1,128}$/.test(id))throw Error('일기 ID를 확인해 주세요.');
 if(method==='GET')return (await sdk.getDocs(sdk.query(base,sdk.orderBy('createdAt','desc')))).docs.map(decode);
 const ref=id?sdk.doc(base,id):sdk.doc(base);
 if(method==='DELETE'){await sdk.deleteDoc(ref);return {ok:true};}
 const value=validateEntry(body);
 if(method==='POST')await sdk.setDoc(ref,{...value,createdAt:sdk.serverTimestamp(),updatedAt:sdk.serverTimestamp()});
 else if(method==='PUT')await sdk.updateDoc(ref,{...value,updatedAt:sdk.serverTimestamp()});
 else throw Error('지원하지 않는 요청이에요.');
 if(auth.currentUser?.uid!==uid)throw Error('계정이 변경되어 화면을 갱신했어요.');
 const saved=await sdk.getDoc(ref);if(auth.currentUser?.uid!==uid)throw Error('계정이 변경되어 화면을 갱신했어요.');return decode(saved);
}
export async function exportEntries(){const uid=requireUser(),all=[];let cursor;while(true){const constraints=[sdk.orderBy('createdAt','asc'),sdk.limit(200)];if(cursor)constraints.push(sdk.startAfter(cursor));const result=await sdk.getDocs(sdk.query(sdk.collection(db,'users',uid,'entries'),...constraints));all.push(...result.docs.map(decode));if(result.size<200)break;cursor=result.docs.at(-1);}if(auth.currentUser?.uid!==uid)throw Error('계정이 변경되었어요. 다시 시도해 주세요.');return all;}
export async function importEntries(raw,onProgress){const values=parseDiaryBackup(raw),uid=requireUser();for(let i=0;i<values.length;i++){if(auth.currentUser?.uid!==uid)throw Error('계정이 변경되어 가져오기를 중단했어요.');await sdk.setDoc(sdk.doc(sdk.collection(db,'users',uid,'entries')),{...values[i],createdAt:sdk.serverTimestamp(),updatedAt:sdk.serverTimestamp()});onProgress(i+1,values.length);}return values.length;}
export function friendlyError(e){return ({'auth/popup-blocked':'로그인 팝업이 차단됐어요. 팝업을 허용하고 다시 눌러 주세요.','auth/popup-closed-by-user':'로그인 창을 닫았어요. 다시 로그인할 수 있어요.','auth/unauthorized-domain':'이 사이트의 로그인 도메인 설정을 확인해야 해요.','auth/operation-not-allowed':'Firebase에서 Google 로그인을 활성화해야 해요.','permission-denied':'이 기록에 접근할 권한이 없거나 보안 설정이 준비되지 않았어요.','unavailable':'연결할 수 없어요. 인터넷을 확인해 주세요.'})[e.code]||'요청을 처리하지 못했어요. 연결 상태와 Firebase 설정을 확인해 주세요.';}
