const API = {
  jsonp(params) {
    return new Promise((resolve,reject)=>{
      if(!window.SURVEY_ENDPOINT) return reject(new Error('Приём ответов ещё не подключён.'));
      const cb='ch_'+crypto.randomUUID().replaceAll('-',''); const script=document.createElement('script');
      const clean=()=>{clearTimeout(timer);delete window[cb];script.remove();};
      const timer=setTimeout(()=>{clean();reject(new Error('Не удалось связаться с таблицей. Проверьте интернет и повторите.'));},20000);
      window[cb]=data=>{clean();data.ok?resolve(data):reject(new Error(data.error||'Ошибка приёма данных.'));};
      script.onerror=()=>{clean();reject(new Error('Нет соединения. Проверьте интернет.'));};
      script.src=window.SURVEY_ENDPOINT+'?'+new URLSearchParams({...params,callback:cb,t:Date.now()});document.head.appendChild(script);
    });
  },
  async send(payload){
    if(!window.SURVEY_ENDPOINT)throw new Error('Приём ответов ещё не подключён.');
    const frame=document.createElement('iframe'),form=document.createElement('form'),field=document.createElement('input');
    frame.name='send_'+crypto.randomUUID().replaceAll('-','');frame.hidden=true;frame.title='Отправка ответа';
    form.method='POST';form.action=window.SURVEY_ENDPOINT;form.target=frame.name;form.hidden=true;
    field.type='hidden';field.name='payload';field.value=JSON.stringify(payload);form.appendChild(field);
    document.body.append(frame,form);form.submit();
    // A normal cross-origin form submits reliably without CORS; the receipt proves persistence.
    try{for(let i=0;i<10;i++){const r=await this.jsonp({action:'receipt',id:payload.id,revision:payload.revision});if(r.saved)return r;await new Promise(r=>setTimeout(r,1500));}
      throw new Error('Запись пока не подтверждена. Нажмите «Отправить» ещё раз — повторного голоса не будет.');
    }finally{form.remove();frame.remove();}
  }
};
