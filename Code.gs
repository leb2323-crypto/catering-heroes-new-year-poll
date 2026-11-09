// Catering Heroes — отдельный приём ответов. Выполните setup() один раз.
function setup() {
  var props=PropertiesService.getScriptProperties();
  if(!props.getProperty('SPREADSHEET_ID')){
    var ss=SpreadsheetApp.getActiveSpreadsheet();
    if(!ss)throw Error('Откройте скрипт через Расширения → Apps Script в новой таблице опроса.');
    var sheet=ss.getSheets()[0];sheet.setName('Ответы');
    sheet.appendRow(['ID','Версия','Получено','Регион','Чек, ₽/гость','Изменение чека, %','Причины','Тренд','Изменение алкоголя','Вино и игристое, л/гость','Крепкий алкоголь, л/гость','Пиво, л/гость','Комментарий','Имя','Компания','Контакт','Разрешение на цитирование']);
    sheet.setFrozenRows(1);sheet.getRange(1,1,1,17).setFontWeight('bold').setBackground('#BE1419').setFontColor('#ffffff');
    props.setProperty('SPREADSHEET_ID',ss.getId());
  }
  if(!props.getProperty('ADMIN_TOKEN'))props.setProperty('ADMIN_TOKEN',Utilities.getUuid()+Utilities.getUuid());
  console.log('Таблица: https://docs.google.com/spreadsheets/d/'+props.getProperty('SPREADSHEET_ID')+'/edit');
  console.log('Ключ ведущего: '+props.getProperty('ADMIN_TOKEN'));
}
function sheet_(){var id=PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');if(!id)throw Error('Сначала выполните setup().');return SpreadsheetApp.openById(id).getSheetByName('Ответы');}
function safe_(v,n){return String(v||'').trim().slice(0,n||200);}
function textCell_(v,n){var s=safe_(v,n);return /^[=+@\-\t\r]/.test(s)?"'"+s:s;}
function numeric_(v,min,max){if(v===null||v===undefined||v==='')return '';if(typeof v!=='number'||!isFinite(v)||v<min||v>max)throw Error('Некорректное числовое значение.');return v;}
var OPTIONS_={reasons:['Стоимость продуктов','Оплата персонала','Логистика и оборудование','Изменение меню и набора услуг','Изменение бюджета клиентов','Другое','Чек существенно не изменился','Нет данных'],trend:['Экономия и контроль бюджета','ЗОЖ и специальные рационы','Гастрономические впечатления','Локальные продукты','Экологичность и сокращение отходов','Небольшие / офисные форматы','Другое','Явного тренда не вижу'],alcohol:['Снизился','Примерно не изменился','Вырос','Алкоголь предоставляет заказчик, нет данных','Не работаем с такими мероприятиями']};
function doPost(e){var lock=LockService.getScriptLock();try{
  var raw=e&&e.parameter&&e.parameter.payload||e&&e.postData&&e.postData.contents;if(!raw||raw.length>16000)throw Error('Некорректный запрос.');var p=JSON.parse(raw),a=p.answers||{},x=p.expert||{};
  if(!/^[a-f0-9-]{36}$/.test(p.id)||!/^[a-f0-9-]{36}$/.test(p.revision))throw Error('Некорректный ID.');
  if(!safe_(a.region,160))throw Error('Нужен регион.');
  if(!Array.isArray(a.reasons)||a.reasons.length<1||a.reasons.length>2||new Set(a.reasons).size!==a.reasons.length||a.reasons.some(function(i){return !Number.isInteger(i)||i<0||i>7;}))throw Error('Выберите до двух причин.');
  ['trend','alcohol'].forEach(function(k){if(!Number.isInteger(a[k])||!OPTIONS_[k][a[k]])throw Error('Нужен ответ: '+k);});
  var row=[p.id,p.revision,new Date(),textCell_(a.region,160),numeric_(a.check,100,200000),numeric_(a.change,-100,500),a.reasons.map(function(i){return OPTIONS_.reasons[i];}).join(' | '),OPTIONS_.trend[a.trend],OPTIONS_.alcohol[a.alcohol],numeric_(a.wine,0,5),numeric_(a.spirits,0,3),numeric_(a.beer,0,5),textCell_(x.comment,3000),textCell_(x.name,120),textCell_(x.company,160),textCell_(x.contact,200),x.consent===true];
  if(row[12]&&(!row[13]||!row[14]))throw Error('Укажите имя и компанию для комментария.');
  lock.waitLock(25000);var s=sheet_(),last=s.getLastRow(),ids=last>1?s.getRange(2,1,last-1,1).getValues():[],index=ids.findIndex(function(r){return r[0]===p.id;});
  s.getRange(index<0?last+1:index+2,1,1,row.length).setValues([row]);SpreadsheetApp.flush();CacheService.getScriptCache().remove('stats');
  return output_({ok:true});
}catch(err){return output_({ok:false,error:err.message});}finally{if(lock.hasLock())lock.releaseLock();}}
function output_(data,cb){var json=JSON.stringify(data).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');if(cb&&/^ch_[a-f0-9]+$/.test(cb))return ContentService.createTextOutput(cb+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);}
function doGet(e){var p=e&&e.parameter||{};try{
  var action=p.action||'ping',result;
  if(action==='ping'){sheet_();result={ok:true};}
  else if(action==='receipt'){var s=sheet_(),n=s.getLastRow(),found=false;if(/^[a-f0-9-]{36}$/.test(p.id)&&n>1){var rows=s.getRange(2,1,n-1,2).getValues();found=rows.some(function(r){return r[0]===p.id&&r[1]===p.revision;});}result={ok:true,saved:found};}
  else if(action==='stats'){var cache=CacheService.getScriptCache(),cached=cache.get('stats');if(cached)result=JSON.parse(cached);else{result=stats_(rows_());cache.put('stats',JSON.stringify(result),4);}}
  else if(action==='comments'){if(!p.token||p.token!==PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN'))throw Error('Неверный ключ ведущего.');result={ok:true,comments:rows_().filter(function(r){return r[12];}).map(function(r){return {comment:r[12],name:r[13],company:r[14],contact:r[15],consent:r[16]===true};})};}
  else throw Error('Неизвестный запрос.');return output_(result,p.callback);
}catch(err){return output_({ok:false,error:err.message},p.callback);}}
function rows_(){var s=sheet_(),n=s.getLastRow();return n>1?s.getRange(2,1,n-1,17).getValues():[];}
function stats_(rows){var q={};[['check',4],['change',5],['wine',9],['spirits',10],['beer',11]].forEach(function(pair){var v=rows.map(function(r){return r[pair[1]];}).filter(function(n){return typeof n==='number'&&isFinite(n);}).sort(function(a,b){return a-b;}),n=v.length;q[pair[0]]={n:n,mean:n?v.reduce(function(a,b){return a+b;},0)/n:null,median:n?(v[Math.floor((n-1)/2)]+v[Math.floor(n/2)])/2:null,min:n?v[0]:null,max:n?v[n-1]:null};});
  [['reasons',6],['trend',7],['alcohol',8],['region',3]].forEach(function(pair){var counts={},n=0;rows.forEach(function(r){if(!r[pair[1]])return;n++;var vals=pair[0]==='reasons'?String(r[pair[1]]).split(' | '):[String(r[pair[1]])];vals.forEach(function(v){counts[v]=(counts[v]||0)+1;});});q[pair[0]]={n:n,counts:Object.keys(counts).map(function(k){return {label:k,count:counts[k]};}).sort(function(a,b){return b.count-a.count;})};});
  return {ok:true,total:rows.length,questions:q};}
