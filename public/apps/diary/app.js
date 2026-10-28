import {chunkDiaryBackup} from './backup.mjs';
import {initialize,login,logout,api,exportEntries,importEntries,deleteAccount,friendlyError} from './cloud.mjs';
import {parseDiaryBackup} from './validation.mjs';
const drafts=new Map();const draftStorage={getItem:k=>drafts.get(k)||null,setItem:(k,v)=>drafts.set(k,v),removeItem:k=>drafts.delete(k)};
const $ = selector => document.querySelector(selector);
const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const moods = { great: ['아주 좋아요', '☀'], good: ['좋아요', '☺'], okay: ['평온해요', '◡'], low: ['지쳤어요', '☁'], sad: ['속상해요', '☂'] };
const esc = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const today = localDate();
let entries = [], view = 'all', selectedDate = '', calendar = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let cloudOperation = false;
let editingId = null, selectedMood = 'okay', original = '', saving = false, toastTimer;
const draftKey = 'haru-diary-draft-v1';
const fmtDate = date => new Date(date + 'T12:00:00').toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });

function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').hidden = true, 3500); }
async function load() {
  try { entries = await api('/api/entries'); $('#load-error').hidden = true; render(); }
  catch { $('#load-error').textContent = '일기를 불러오지 못했어요. 인터넷 연결과 로그인 상태를 확인해 주세요.'; $('#load-error').hidden = false; }
}
function render() {
  $('#nav-count').textContent = entries.length;
  $('#stat-total').innerHTML = `${entries.length} <small>편</small>`;
  $('#stat-month').innerHTML = `${entries.filter(e => e.date.startsWith(today.slice(0, 7))).length} <small>편</small>`;
  $('#stat-favorites').innerHTML = `${entries.filter(e => e.favorite).length} <small>편</small>`;
  const query = $('#search').value.trim().toLocaleLowerCase(), mood = $('#mood-filter').value;
  const filtered = entries.filter(e => (view !== 'favorites' || e.favorite) && (!selectedDate || e.date === selectedDate) && (!mood || e.mood === mood) && (!query || `${e.title} ${e.content} ${e.tags.join(' ')}`.toLocaleLowerCase().includes(query)));
  filtered.sort((a, b) => $('#sort').value === 'oldest' ? a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt) : b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  $('#list-title').innerHTML = `${selectedDate ? esc(fmtDate(selectedDate)) : view === 'favorites' ? '소중한 일기' : '나의 모든 날들'} <span>${filtered.length}</span>`;
  $('#list-description').textContent = selectedDate ? '이날의 순간들을 다시 만나 보세요.' : view === 'favorites' ? '오래도록 간직하고 싶은 나의 순간들.' : '작은 순간들이 모여 나만의 이야기가 됩니다.';
  $('#reset-filters').hidden = !(selectedDate || query || mood || view !== 'all');
  document.querySelectorAll('[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === view));
  $('#entries').innerHTML = filtered.length ? filtered.map(e => `<article class="entry-card" data-mood="${e.mood}"><div class="card-meta"><time datetime="${e.date}">${esc(fmtDate(e.date))}</time><span class="mood-tag">${moods[e.mood][1]} ${moods[e.mood][0]}</span></div><button class="entry-open" data-open="${esc(e.id)}" aria-label="${esc(e.title)} 읽기 및 수정"><h3>${esc(e.title)}</h3><p>${esc(e.content)}</p></button><div class="card-bottom"><div class="tags">${e.tags.map(t => `<span>#${esc(t)}</span>`).join('')}</div><button class="star-button" data-star="${esc(e.id)}" aria-label="${e.favorite ? '소중한 일기에서 해제' : '소중한 일기로 간직'}" aria-pressed="${e.favorite}">${icon('star')}</button></div></article>`).join('') : `<div class="empty"><div class="empty-symbol">${icon(entries.length ? 'search' : 'pen')}</div><div class="empty-kicker">a little moment, a lasting memory</div><h3>${entries.length ? '아직 이곳에 남긴 기록이 없어요' : '나의 첫 번째 조각을 남겨 볼까요?'}</h3><p>${entries.length ? '다른 날짜나 검색어로 찾아보거나, 새로운 이야기를 남겨 주세요.' : '거창하지 않아도 괜찮아요. 오늘 기억하고 싶은 한 가지부터 시작해 보세요.'}</p><button class="primary new-entry">${icon('plus')} ${entries.length ? '새로운 일기 쓰기' : '첫 일기 쓰기'}</button></div>`;
  renderCalendar();
}
function renderCalendar() {
  $('#calendar-month').textContent = `${calendar.getFullYear()}년 ${calendar.getMonth() + 1}월`;
  const dates = new Set(entries.map(e => e.date));
  const days = new Date(calendar.getFullYear(), calendar.getMonth() + 1, 0).getDate();
  let html = '<span></span>'.repeat(calendar.getDay());
  for (let day = 1; day <= days; day++) {
    const date = localDate(new Date(calendar.getFullYear(), calendar.getMonth(), day));
    html += `<button data-date="${date}" class="${date === today ? 'today ' : ''}${date === selectedDate ? 'selected ' : ''}${dates.has(date) ? 'has-entry' : ''}" aria-label="${date}${dates.has(date) ? ', 일기 있음' : ''}" aria-pressed="${date === selectedDate}">${day}</button>`;
  }
  $('#calendar-days').innerHTML = html;
}
function formValue() {
  return { title: $('#entry-title').value, content: $('#entry-content').value, date: $('#entry-date').value, mood: selectedMood, tags: $('#entry-tags').value.split(',').map(t => t.trim()).filter(Boolean), favorite: $('#entry-favorite').checked };
}
const fingerprint = () => JSON.stringify(formValue());
function renderMoods() { $('#mood-options').innerHTML = Object.entries(moods).map(([key, value]) => `<button class="mood-choice" type="button" data-mood="${key}" aria-pressed="${key === selectedMood}"><span class="mood-face" aria-hidden="true">${value[1]}</span>${value[0]}</button>`).join(''); }
function updateDraft() {
  $('#char-count').textContent = `${$('#entry-content').value.length.toLocaleString()}자`;
  if (!editingId) {
    try {
      if ($('#entry-title').value || $('#entry-content').value) { draftStorage.setItem(draftKey, JSON.stringify(formValue())); $('#draft-status').textContent = '이 탭에만 초안을 보관했어요. 새로고침 전 저장해 주세요.'; }
      else draftStorage.removeItem(draftKey);
    } catch { $('#draft-status').textContent = '브라우저 임시 보관이 꺼져 있어요. 닫기 전에 저장해 주세요.'; }
  }
}
function openEditor(id = null) {
  if(cloudOperation)return toast('가져오기 또는 계정 삭제가 끝날 때까지 기다려 주세요.');
  editingId = id;
  let value = entries.find(e => e.id === id);
  let restored = false;
  if (!value) {
    try { const draft = JSON.parse(draftStorage.getItem(draftKey)); if (draft && typeof draft.title === 'string' && typeof draft.content === 'string' && Array.isArray(draft.tags) && moods[draft.mood]) { value = draft; restored = true; } } catch {}
  }
  value ||= { title: '', content: '', date: selectedDate || today, mood: 'okay', tags: [], favorite: false };
  $('#entry-title').value = value.title; $('#entry-content').value = value.content; $('#entry-date').value = value.date;
  $('#entry-tags').value = value.tags.join(', '); $('#entry-favorite').checked = value.favorite;
  selectedMood = value.mood; renderMoods();
  $('#editor-heading').textContent = id ? '그날의 조각을 다시 만나요' : '오늘은 어떤 하루였나요?';
  $('#delete-entry').hidden = !id; $('#save-error').hidden = true;
  $('#draft-status').textContent = id ? '수정 후 저장하기를 눌러 주세요.' : restored ? '이전에 작성하던 초안을 불러왔어요.' : '초안은 이 탭의 메모리에만 유지돼요. 새로고침하면 사라집니다.';
  $('#char-count').textContent = `${value.content.length.toLocaleString()}자`;
  original = fingerprint(); $('#editor').showModal(); $('#entry-title').focus();
}
function closeEditor() {
  if (saving) return;
  if (fingerprint() !== original && !confirm(editingId ? '저장하지 않은 수정 내용을 닫을까요?' : '작성을 잠시 멈출까요? 초안은 현재 탭에만 남아요. 새로고침하거나 로그아웃하면 사라집니다.')) return;
  $('#editor').close();
}
document.addEventListener('click', async event => {
  if (event.target.closest('.new-entry')) openEditor();
  const opener = event.target.closest('[data-open]'); if (opener) openEditor(opener.dataset.open);
  const star = event.target.closest('[data-star]');
  if (star) {
    if(cloudOperation||saving)return toast('진행 중인 작업이 끝날 때까지 기다려 주세요.');
    const entry = entries.find(e => e.id === star.dataset.star); star.disabled = true;
    try { const saved = await api(`/api/entries/${entry.id}`, 'PUT', { ...entry, favorite: !entry.favorite }); entries = entries.map(e => e.id === saved.id ? saved : e); render(); toast(saved.favorite ? '소중한 일기로 간직했어요.' : '소중한 일기에서 해제했어요.'); }
    catch (error) { toast(error.message); star.disabled = false; }
  }
});
document.querySelectorAll('[data-view]').forEach(el => el.addEventListener('click', () => { view = el.dataset.view; selectedDate = ''; render(); }));
$('#calendar-days').addEventListener('click', event => { const day = event.target.closest('[data-date]'); if (day) { selectedDate = selectedDate === day.dataset.date ? '' : day.dataset.date; render(); } });
$('#prev-month').addEventListener('click', () => { calendar = new Date(calendar.getFullYear(), calendar.getMonth() - 1, 1); renderCalendar(); });
$('#next-month').addEventListener('click', () => { calendar = new Date(calendar.getFullYear(), calendar.getMonth() + 1, 1); renderCalendar(); });
$('#mobile-calendar-toggle').addEventListener('click', () => { const open = $('.sidebar').classList.toggle('calendar-open'); $('#mobile-calendar-toggle').setAttribute('aria-expanded', String(open)); });
['search', 'mood-filter', 'sort'].forEach(id => $(`#${id}`).addEventListener('input', render));
$('#reset-filters').addEventListener('click', () => { view = 'all'; selectedDate = ''; $('#search').value = ''; $('#mood-filter').value = ''; render(); });
$('#mood-options').addEventListener('click', event => { const el = event.target.closest('[data-mood]'); if (el) { selectedMood = el.dataset.mood; renderMoods(); updateDraft(); } });
$('#entry-form').addEventListener('input', updateDraft);
document.querySelectorAll('.close-editor').forEach(el => el.addEventListener('click', closeEditor));
$('#editor').addEventListener('cancel', event => { event.preventDefault(); closeEditor(); });
$('#entry-form').addEventListener('submit', async event => {
  event.preventDefault(); if (saving||cloudOperation) return;
  saving = true; $('#save-entry').disabled = true; $('#save-entry').textContent = '저장하는 중…'; $('#save-error').hidden = true;
  try {
    const saved = await api(editingId ? `/api/entries/${editingId}` : '/api/entries', editingId ? 'PUT' : 'POST', formValue());
    entries = [saved, ...entries.filter(e => e.id !== saved.id)];
    if (!editingId) { try { draftStorage.removeItem(draftKey); } catch {} }
    $('#editor').close(); render(); toast('오늘의 조각을 안전하게 저장했어요.');
  } catch (error) { $('#save-error').textContent = `${error.message} 입력 내용은 유지돼요.`; $('#save-error').hidden = false; }
  finally { saving = false; $('#save-entry').disabled = false; $('#save-entry').textContent = '일기 저장하기'; }
});
$('#delete-entry').addEventListener('click', async () => {
  if (saving || !confirm('이 일기를 삭제할까요? 삭제한 일기는 되돌릴 수 없어요.')) return;
  saving = true; $('#delete-entry').disabled = true;
  try { await api(`/api/entries/${editingId}`, 'DELETE'); entries = entries.filter(e => e.id !== editingId); $('#editor').close(); render(); toast('일기를 삭제했어요.'); }
  catch (error) { $('#save-error').textContent = error.message; $('#save-error').hidden = false; }
  finally { saving = false; $('#delete-entry').disabled = false; }
});
window.addEventListener('beforeunload', event => { if ($('#editor').open && fingerprint() !== original) { event.preventDefault(); event.returnValue = ''; } });
$('#today-label').textContent = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

function cloudDownload(values,part=1){const url=URL.createObjectURL(new Blob([JSON.stringify(values,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`하루의조각-${today}-${part}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function backup(){try{const chunks=chunkDiaryBackup(await exportEntries());if(chunks.length===1){cloudDownload(chunks[0]);toast('일기를 백업했어요. 파일은 본인이 안전하게 보관해 주세요.');return;}const dialog=document.createElement('dialog');const heading=document.createElement('h2');heading.textContent='나누어 보관하는 일기 백업';dialog.append(heading);const message=document.createElement('p');message.textContent=`용량과 편수에 맞춰 ${chunks.length}개 파일로 나눴어요. 각 파일을 모두 내려받아 보관해 주세요. 복원할 때는 파일을 하나씩 가져오면 됩니다.`;dialog.append(message);chunks.forEach((chunk,i)=>{const button=document.createElement('button');button.className='secondary';button.textContent=`${i+1}번 파일 · ${chunk.length}편 내려받기`;button.onclick=()=>{cloudDownload(chunk,i+1);button.textContent=`${i+1}번 파일 내려받음`;};dialog.append(button);});const close=document.createElement('button');close.className='primary';close.textContent='닫기';close.onclick=()=>dialog.close();dialog.append(close);dialog.onclose=()=>dialog.remove();document.body.append(dialog);dialog.showModal();}catch(e){toast(friendlyError(e));}}

$('#cloud-export').onclick=backup;$('#sidebar-backup').onclick=e=>{e.preventDefault();backup();};
$('#cloud-import').onclick=()=>$('#diary-import').click();
$('#diary-import').onchange=async e=>{if(saving||cloudOperation)return toast('진행 중인 작업이 끝난 후 다시 시도해 주세요.');cloudOperation=true;const file=e.target.files[0];e.target.value='';if(!file){cloudOperation=false;return;}try{if(file.size>10000000)throw Error('10MB 이하의 파일을 선택해 주세요.');const raw=await file.text(),values=parseDiaryBackup(raw);if(!confirm(`${values.length}편의 일기 내용을 현재 로그인한 계정의 Firebase로 업로드할까요? 기존 일기는 유지되고 새 기록으로 추가됩니다. 같은 파일을 다시 가져오면 중복될 수 있어요.`))return;$('#cloud-import').disabled=true;const count=await importEntries(raw,(n,t)=>$('#cloud-import').textContent=`가져오는 중 ${n}/${t}`);toast(`${count}편을 가져왔어요.`);}catch(e){toast(e.message+' 이미 가져온 기록은 유지됩니다.');}finally{cloudOperation=false;$('#cloud-import').disabled=false;$('#cloud-import').textContent='로컬 백업 가져오기';}};
$('#google-login').onclick=async()=>{try{$('#auth-error').textContent='';await login();}catch(e){$('#auth-error').textContent=friendlyError(e);}};
$('#google-logout').onclick=async()=>{if(saving||cloudOperation)return toast('진행 중인 작업이 끝난 뒤 로그아웃해 주세요.');if($('#editor').open&&fingerprint()!==original&&!confirm('저장하지 않은 초안을 지우고 로그아웃할까요?'))return;try{await logout();}catch(e){toast(friendlyError(e));}};
$('#cloud-delete-account').onclick=async()=>{if(saving||cloudOperation)return toast('진행 중인 작업이 끝난 후 다시 시도해 주세요.');if(!confirm('현재 계정의 모든 일기와 Firebase 로그인 연결을 삭제할까요? 삭제 후 복구할 수 없습니다. 먼저 백업해 주세요.'))return;cloudOperation=true;try{await deleteAccount();}catch(e){toast(e.message);}finally{cloudOperation=false;}};
initialize(user=>{drafts.clear();entries=[];editingId=null;$('#entry-form').reset();$('#editor').close();document.body.classList.toggle('cloud-locked',!user);$('#auth-gate').hidden=!!user;$('#account-bar').hidden=!user;$('#account-label').textContent=user?'내 Google 계정으로 연결됨':'';$('#auth-error').textContent='';render();},values=>{entries=values;render();},error=>{$('#load-error').textContent=friendlyError(error);$('#load-error').hidden=false;}).then(()=>{$('#google-login').disabled=false;}).catch(e=>{$('#auth-error').textContent=e.message;});
