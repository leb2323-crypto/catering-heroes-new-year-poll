const $=id=>document.getElementById(id);const KEY='ch-new-year-poll-2026-v1';
let saved={};try{saved=JSON.parse(localStorage.getItem(KEY)||'{}');}catch{}
let state={id:saved.id||crypto.randomUUID(),answers:saved.answers||{},expert:saved.expert||{},index:saved.index||0,submitted:!!saved.submitted};
const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(){
  $('intro').hidden=true;$('survey').hidden=false;$('success').hidden=true;$('error').textContent='';
  const q=SURVEY.questions[state.index];$('step').textContent=`Вопрос ${state.index+1} из ${SURVEY.questions.length+1}`;$('progress').style.width=(state.index/(SURVEY.questions.length+1)*100)+'%';
  $('next').textContent=q?'Далее':'Отправить ответы';$('back').textContent=state.index?'Назад':'К началу';
  if(!q){const e=state.expert;$('question').innerHTML=`<h2>Добавите экспертный комментарий?</h2><p class="hint">Необязательно. Почему меняются чеки, потребление алкоголя или формат корпоративов? Приведите один пример из практики.</p><label class="field" for="comment">Ваше мнение</label><textarea id="comment" maxlength="3000">${esc(e.comment)}</textarea><label class="field" for="name">Имя и фамилия</label><input id="name" type="text" maxlength="120" value="${esc(e.name)}"><label class="field" for="company">Компания</label><input id="company" type="text" maxlength="160" value="${esc(e.company)}"><label class="field" for="contact">Контакт для уточнения комментария</label><input id="contact" type="text" maxlength="200" value="${esc(e.contact)}" placeholder="Telegram или email, необязательно"><label class="choice"><input id="consent" type="checkbox" ${e.consent?'checked':''}><span>Разрешаю использовать мой комментарий в материалах Catering Heroes и СМИ с указанием имени и компании.</span></label><p class="hint">Имя, компания и контакт доступны организатору. Контакт не выводится на экран и не включается в публикацию.</p>`;return;}
  const val=state.answers[q.id];let body='';
  if(q.options)body=q.options.map((x,i)=>`<label class="choice"><input type="${q.type==='multi'?'checkbox':'radio'}" name="answer" value="${i}" ${(Array.isArray(val)?val.includes(i):val===i)?'checked':''}><span>${esc(x)}</span></label>`).join('');
  else body=`<label class="field" for="value">${q.type==='number'?'Значение':'Регион'}</label><input id="value" type="${q.type}" ${q.type==='number'?`min="${q.min}" max="${q.max}" step="any" inputmode="decimal"`:'maxlength="160"'} placeholder="${esc(q.placeholder||'Введите число')}" value="${esc(val??'')}" ${val===null?'disabled':''}>${q.unit?`<div class="unit">${q.unit}</div>`:''}${q.skip?`<label class="choice"><input type="checkbox" id="skip" ${val===null?'checked':''}><span>${esc(q.skip)}</span></label>`:''}`;
  $('question').innerHTML=`<h2>${esc(q.title)}</h2><p class="hint">${esc(q.hint)}</p>${body}`;
  if($('skip'))$('skip').onchange=()=>{$('value').disabled=$('skip').checked;};
}
function capture(validate=true){const q=SURVEY.questions[state.index];if(!q){state.expert=Object.fromEntries(['comment','name','company','contact'].map(k=>[k,$(k).value.trim()]));state.expert.consent=$('consent').checked;persist();if(validate&&state.expert.comment&&(!state.expert.name||!state.expert.company))throw new Error('Для комментария укажите имя и компанию или оставьте комментарий пустым.');return;}
 let v;if(q.options){const selected=[...document.querySelectorAll('[name=answer]:checked')].map(x=>Number(x.value));if(validate&&(!selected.length||(q.max&&selected.length>q.max)))throw new Error(q.max?`Выберите от одного до ${q.max} вариантов.`:'Выберите один вариант.');v=q.type==='multi'?selected:selected[0];}
 else if($('skip')?.checked)v=null;else{const raw=$('value').value.trim();v=q.type==='number'?Number(raw.replace(',','.')):raw;if(validate&&(!raw||(q.type==='number'&&(!Number.isFinite(v)||v<q.min||v>q.max))))throw new Error(q.type==='number'?`Введите число от ${q.min} до ${q.max} или выберите «${q.skip}».`:'Укажите основной регион.');}
 state.answers[q.id]=v;persist();}
$('start').onclick=render;
$('back').onclick=()=>{capture(false);if(state.index){state.index--;render();}else{$('survey').hidden=true;$('intro').hidden=false;}};
$('question').addEventListener('input',()=>{try{capture(false);}catch{}});
$('survey').onsubmit=async e=>{e.preventDefault();try{capture();if(state.index<SURVEY.questions.length){state.index++;persist();render();window.scrollTo(0,0);return;}$('next').disabled=true;$('back').disabled=true;$('next').textContent='Сохраняем…';const revision=crypto.randomUUID();await API.send({id:state.id,revision,answers:state.answers,expert:state.expert});state.submitted=true;persist();$('survey').hidden=true;$('success').hidden=false;window.scrollTo(0,0);}catch(err){$('error').textContent=err.message;}finally{$('next').disabled=false;$('back').disabled=false;$('next').textContent=state.index===SURVEY.questions.length?'Отправить ответы':'Далее';}};
$('edit').onclick=()=>{state.index=0;render();};
API.jsonp({action:'ping'}).then(()=>{$('connection').textContent='Приём ответов открыт';}).catch(e=>{$('connection').textContent=e.message;});
if(state.submitted){$('intro').hidden=true;$('success').hidden=false;}
