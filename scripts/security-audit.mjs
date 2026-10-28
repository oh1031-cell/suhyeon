import {readdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
export async function publicationFiles(){
 const files=[];
 async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const path=join(dir,e.name).replaceAll('\\','/');if(e.isDirectory())await walk(path);else if(e.isFile())files.push(path);else throw Error('심볼릭 링크는 공개 목록에 포함할 수 없습니다: '+path);}}
 for(const dir of ['public','test','scripts','.github','docs'])await walk(dir);
 files.push('README.md','package.json','pnpm-lock.yaml','pnpm-workspace.yaml','.gitignore','.firebaserc','server.mjs','start.cmd','firebase.json','firestore.rules','firestore.indexes.json');
 return files.sort();
}
const files=await publicationFiles();
const patterns=[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/\bgh[pousr]_[A-Za-z0-9]{30,}\b/,/\bgithub_pat_[A-Za-z0-9_]{40,}\b/,/"type"\s*:\s*"service_account"/,/"refresh_token"\s*:\s*"[^"\s]{15,}"/];
for(const path of files){if(/(?:^|\/)(data|node_modules|\.firebase|qa|tools|\.env)(?:\/|$)|\.sqlite|debug\.log|credential|service-account/.test(path))throw Error('비공개 파일이 업로드 목록에 있습니다: '+path);const content=await readFile(path,'utf8');if(patterns.some(p=>p.test(content)))throw Error('비밀 인증정보 의심 내용 발견: '+path);}
console.log(`공개 예정 ${files.length}개 파일 검사 통과. 데이터베이스·기록·인증 토큰·환경 파일은 포함하지 않습니다.`);
if(process.argv.includes('--manifest'))console.log(JSON.stringify(files));
