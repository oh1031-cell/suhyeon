export function validateEntry(v){
 if(!v||typeof v!=='object'||Array.isArray(v))throw Error('일기 형식을 확인해 주세요.');
 const {title,content,date,mood,tags,favorite}=v;
 if(typeof title!=='string'||!title.trim()||title.length>120)throw Error('제목은 1~120자로 적어 주세요.');
 if(typeof content!=='string'||!content.trim()||content.length>100000)throw Error('내용은 1~100,000자로 적어 주세요.');
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw Error('날짜를 확인해 주세요.');
 if(!['great','good','okay','low','sad'].includes(mood)||typeof favorite!=='boolean')throw Error('기분과 즐겨찾기를 확인해 주세요.');
 if(!Array.isArray(tags)||tags.length>10||tags.some(t=>typeof t!=='string'||!t.trim()||t.length>24))throw Error('태그는 24자 이하로 최대 10개까지 적어 주세요.');
 return {title:title.trim(),content:content.trim(),date,mood,tags:[...new Set(tags.map(t=>t.trim()))],favorite};
}
export function parseDiaryBackup(raw){const data=JSON.parse(raw),list=Array.isArray(data)?data:data?.entries;if(!Array.isArray(list)||list.length>1000)throw Error('1,000편 이하의 일기 백업을 선택해 주세요.');return list.map(validateEntry);}
