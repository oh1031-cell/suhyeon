import http from 'node:http';
import {readFile,mkdir,writeFile,rename,access} from 'node:fs/promises';
import {dirname,join,resolve,extname,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {emptyState,validateState} from './public/core.mjs';

const root=dirname(fileURLToPath(import.meta.url));
const diaryDefault=resolve(root,'..','로컬 서버 일기장 2','server.mjs');
export async function createHub({dataPath=join(root,'data','hub.json'),diaryPath=diaryDefault}={}){
 let state,loadError='',diaryApp,starting;
 try{state=validateState(JSON.parse(await readFile(dataPath,'utf8')));}catch(e){if(e.code!=='ENOENT')loadError='저장 파일을 읽을 수 없습니다. 원본을 보호하기 위해 저장을 중단했습니다. data/hub.json 파일을 확인해 주세요.';state=emptyState();}
 let queue=Promise.resolve();
 const checkDiary=async()=>{try{const r=await fetch('http://127.0.0.1:3000/',{signal:AbortSignal.timeout(1200)});return r.ok&&(await r.text()).includes('하루의 조각');}catch{return false;}};
 async function startDiary(){if(!diaryPath)throw Error('일기장 경로가 없습니다.');if(await checkDiary())return;if(!starting)starting=(async()=>{await access(diaryPath);const mod=await import(pathToFileURL(diaryPath));const app=mod.createApp();try{await new Promise((ok,no)=>{app.server.once('error',no);app.server.listen(3000,'127.0.0.1',ok);});diaryApp=app;}catch(e){app.db.close();throw e;}})().finally(()=>{starting=null;});return starting;}
 const server=http.createServer(async(req,res)=>{
  const send=(code,value)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  const host=req.headers.host;
  if(!host||! /^(127\.0\.0\.1|localhost):\d+$/.test(host)||req.headers.origin&&req.headers.origin!==`http://${host}`)return send(403,{error:'이 PC의 로컬 주소로 접속해 주세요.'});
  try{
   const url=new URL(req.url,`http://${host}`);
   if(url.pathname.startsWith('/apps/diary/'))res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' https://www.gstatic.com https://apis.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://*.firebaseapp.com; frame-src https://*.firebaseapp.com https://accounts.google.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'");
   if(url.pathname==='/runtime.json')return send(200,{mode:'server'});
   if(url.pathname==='/api/status'&&req.method==='GET')return send(200,{loadError,diary:await checkDiary()});
   if(url.pathname==='/api/state'&&req.method==='GET')return send(200,state);
   if(url.pathname==='/api/state'&&req.method==='PUT'){
    if(loadError)return send(409,{error:loadError});
    let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>2_000_000)return send(413,{error:'백업 파일이 너무 큽니다.'});}
    let clean;try{clean=validateState(JSON.parse(raw));}catch(e){return send(400,{error:e.message});}
    const task=queue.catch(()=>{}).then(async()=>{await mkdir(dirname(dataPath),{recursive:true});await writeFile(dataPath+'.tmp',JSON.stringify(clean,null,2),'utf8');await rename(dataPath+'.tmp',dataPath);state=clean;});queue=task;await task;return send(200,state);
   }
   if(url.pathname==='/api/diary/start'&&req.method==='POST'){try{await startDiary();return send(200,{url:'http://127.0.0.1:3000/'});}catch(e){return send(503,{error:e.code==='EADDRINUSE'?'3000번 포트를 다른 앱이 사용 중입니다. 해당 앱을 종료한 뒤 다시 시도해 주세요.':'일기장을 시작하지 못했습니다. 기존 일기장 폴더와 Node.js 24 이상인지 확인해 주세요.'});}}
   if(url.pathname.startsWith('/api/'))return send(404,{error:'요청을 찾을 수 없어요.'});
   if(!['GET','HEAD'].includes(req.method))return send(405,{error:'지원하지 않는 요청입니다.'});
   let path;try{path=decodeURIComponent(url.pathname);}catch{return send(404,{error:'잘못된 경로입니다.'});}
   if(path.includes('\\')||path.includes('\0')||path.split('/').some(p=>p.startsWith('.')))return send(404,{error:'파일을 찾을 수 없어요.'});
   const publicRoot=join(root,'public');const file=resolve(publicRoot,'.'+path+(path.endsWith('/')?'index.html':''));
   if(!file.startsWith(publicRoot+sep))return send(404,{error:'파일을 찾을 수 없어요.'});
   let data;try{data=await readFile(file);}catch{return send(404,{error:'파일을 찾을 수 없어요.'});}
   const type={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.svg':'image/svg+xml','.json':'application/json'}[extname(file)];
   if(!type)return send(404,{error:'파일을 찾을 수 없어요.'});
   res.writeHead(200,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:data);
  }catch(e){console.error(e.message);if(!res.headersSent)send(500,{error:'저장하지 못했습니다. 디스크 공간과 폴더 권한을 확인해 주세요.'});else res.end();}
 });
 server.on('close',()=>{if(diaryApp)diaryApp.server.close(()=>diaryApp.db.close());});
 return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const server=await createHub();const port=Number(process.env.HUB_PORT||3210);
 server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`이미 실행 중이거나 포트가 사용 중입니다. http://127.0.0.1:${port} 에 접속해 주세요.`:e.message);process.exitCode=1;});
 server.listen(port,'127.0.0.1',()=>console.log(`교실 서랍: http://127.0.0.1:${port}\n종료: Ctrl+C\n설정: ${join(root,'data','hub.json')}`));
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit()));
}
