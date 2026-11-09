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
    await fetch(window.SURVEY_ENDPOINT,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)});
    // no-cors hides the POST response: confirm actual persistence using a non-personal receipt.
    for(let i=0;i<8;i++){const r=await this.jsonp({action:'receipt',id:payload.id,revision:payload.revision});if(r.saved)return r;await new Promise(r=>setTimeout(r,1200));}
    throw new Error('Запись пока не подтверждена. Нажмите «Отправить» ещё раз — повторного голоса не будет.');
  }
};
