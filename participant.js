const $=id=>document.getElementById(id),KEY='ch-new-year-poll-2026-v2';
let saved={};try{saved=JSON.parse(localStorage.getItem(KEY)||'{}');}catch{}
let state={id:saved.id||crypto.randomUUID(),answers:saved.answers||{},index:Math.min(saved.index||0,SURVEY.questions.length-1),submitted:!!saved.submitted};
const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(){
 $('intro').hidden=true;$('survey').hidden=false;$('success').hidden=true;$('error').textContent='';
 const q=SURVEY.questions[state.index],val=state.answers[q.id];
 $('step').textContent=`Вопрос ${state.index+1} из ${SURVEY.questions.length}`;$('progress').style.width=((state.index+1)/SURVEY.questions.length*100)+'%';
 $('next').textContent=state.index===SURVEY.questions.length-1?'Отправить ответы':'Далее';$('back').textContent=state.index?'Назад':'К началу';let body='';
 if(q.type==='group')body=q.fields.map(f=>`<label class="field" for="${f.id}">${esc(f.label)}</label><input id="${f.id}" type="number" min="${q.min}" max="${q.max}" step="any" inputmode="decimal" placeholder="Введите сумму" value="${esc(state.answers[f.id]??'')}"><div class="unit">${q.unit}</div>`).join('')+'<p class="hint">Можно оставить все три поля пустыми, если данных пока нет.</p>';
 else if(q.options){body=q.options.map((x,i)=>`<label class="choice"><input type="${q.type==='multi'?'checkbox':'radio'}" name="answer" value="${i}" ${(Array.isArray(val)?val.includes(i):val===i)?'checked':''}><span>${esc(x)}</span></label>`).join('');if(q.otherIndex!==undefined)body+=`<div id="other-wrap" ${Array.isArray(val)&&val.includes(q.otherIndex)?'':'hidden'}><label class="field" for="other">Другое — укажите причину</label><textarea id="other" maxlength="1500">${esc(state.answers.other)}</textarea></div>`;}
 else if(q.type==='textarea')body=`<label class="field" for="value">Ваш ответ</label><textarea id="value" maxlength="3000" placeholder="${esc(q.placeholder)}">${esc(val)}</textarea>`;
 else body=`<label class="field" for="value">${q.type==='number'?'Изменение чека':'Регион'}</label><input id="value" type="${q.type}" ${q.type==='number'?`min="${q.min}" max="${q.max}" step="any" inputmode="decimal"`:'maxlength="160"'} placeholder="${esc(q.placeholder||'Введите число')}" value="${esc(val??'')}" ${val===null?'disabled':''}>${q.unit?`<div class="unit">${q.unit}</div>`:''}${q.skip?`<label class="choice"><input type="checkbox" id="skip" ${val===null?'checked':''}><span>${esc(q.skip)}</span></label>`:''}`;
 $('question').innerHTML=`<h2>${esc(q.title)}</h2><p class="hint">${esc(q.hint)}</p>${body}`;
 if($('skip'))$('skip').onchange=()=>{$('value').disabled=$('skip').checked;};
}
function capture(validate=true){const q=SURVEY.questions[state.index];let v;
 if(q.type==='group'){for(const f of q.fields){const raw=$(f.id).value.trim(),n=Number(raw.replace(',','.'));if(validate&&raw&&(!Number.isFinite(n)||n<q.min||n>q.max))throw Error(`«${f.label}»: введите сумму от ${q.min} до ${q.max} рублей или оставьте поле пустым.`);state.answers[f.id]=raw?n:null;}persist();return;}
 if(q.options){const selected=[...document.querySelectorAll('[name=answer]:checked')].map(x=>Number(x.value));if(validate&&(!selected.length||(q.max&&selected.length>q.max)))throw Error(q.max?`Выберите от одного до ${q.max} вариантов.`:'Выберите один вариант.');v=q.type==='multi'?selected:selected[0];
 if(q.otherIndex!==undefined){const chosen=selected.includes(q.otherIndex);$('other-wrap').hidden=!chosen;state.answers.other=chosen?$('other').value.trim():'';if(validate&&chosen&&!state.answers.other)throw Error('Напишите свою причину в поле «Другое».');}}
 else if($('skip')?.checked)v=null;
 else{const raw=$('value').value.trim();v=q.type==='number'?Number(raw.replace(',','.')):raw;if(validate&&(!raw||(q.type==='number'&&(!Number.isFinite(v)||v<q.min||v>q.max))))throw Error(q.type==='number'?`Введите число от ${q.min} до ${q.max} или выберите «${q.skip}».`:q.id==='region'?'Укажите основной регион.':'Напишите ответ. Если данных нет, укажите это.');}
 state.answers[q.id]=v;persist();}
$('start').onclick=render;
$('back').onclick=()=>{capture(false);if(state.index){state.index--;render();}else{$('survey').hidden=true;$('intro').hidden=false;}};
$('question').addEventListener('input',()=>{try{capture(false);}catch{}});
$('survey').onsubmit=async e=>{e.preventDefault();try{capture();if(state.index<SURVEY.questions.length-1){state.index++;persist();render();window.scrollTo(0,0);return;}$('next').disabled=true;$('back').disabled=true;$('next').textContent='Сохраняем…';await API.send({schema:2,id:state.id,revision:crypto.randomUUID(),answers:state.answers});state.submitted=true;persist();$('survey').hidden=true;$('success').hidden=false;window.scrollTo(0,0);}catch(err){$('error').textContent=err.message;}finally{$('next').disabled=false;$('back').disabled=false;$('next').textContent=state.index===SURVEY.questions.length-1?'Отправить ответы':'Далее';}};
$('edit').onclick=()=>{state.index=0;render();};
API.jsonp({action:'ping'}).then(r=>{$('connection').textContent=r.schema===2?'Приём ответов открыт':'Обновляем анкету. Приём ответов скоро откроется.';}).catch(e=>{$('connection').textContent=e.message;});
