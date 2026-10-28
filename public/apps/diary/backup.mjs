export function chunkDiaryBackup(entries){
 const encoder=new TextEncoder(),out=[];let chunk=[],bytes=2;
 for(const entry of entries){const size=encoder.encode(JSON.stringify(entry)).byteLength;if(size+2>8000000)throw Error('한 기록의 크기가 백업 한도를 초과합니다.');if(chunk.length&&(chunk.length>=1000||bytes+size+1>8000000)){out.push(chunk);chunk=[];bytes=2;}bytes+=size+(chunk.length?1:0);chunk.push(entry);}
 if(chunk.length||!out.length)out.push(chunk);return out;
}
