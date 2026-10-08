'use strict';
(()=>{
 const frame=document.getElementById('app'),status=document.getElementById('status'),reload=document.getElementById('reload');
 const namespace='wallmann-v2:'+location.pathname.replace(/index\.html$/,'');
 const read=(store,key)=>{try{return JSON.parse(store.getItem(namespace+key)||'null');}catch{return null;}};
 let state={admin:read(sessionStorage,':admin'),kiosk:read(localStorage,':kiosk'),pending:read(sessionStorage,':pending'),mode:read(sessionStorage,':mode')||'kiosk'};
 let challenge='',peer=null,origin='',timer;
 const write=(store,key,value)=>{try{if(value==null)store.removeItem(namespace+key);else store.setItem(namespace+key,JSON.stringify(value));return true;}catch{return false;}};
 function save(){const persistent=write(localStorage,':kiosk',state.kiosk);write(sessionStorage,':admin',state.admin);write(sessionStorage,':pending',state.pending);write(sessionStorage,':mode',state.mode);if(!persistent&&state.kiosk){status.textContent='Browseren kan ikke gemme kioskadgangen. Godkendelsen varer kun, mens denne side er åben.';status.hidden=false;}}
 function nonce(){const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);return Array.from(bytes,n=>n.toString(16).padStart(2,'0')).join('');}
 let url;try{url=new URL(window.WALLMANN_CONFIG.appsScriptUrl);if(url.origin!=='https://script.google.com'||!/^\/macros\/s\/[^/]+\/exec$/.test(url.pathname))throw Error();}catch{status.textContent='V2 mangler test-webappens adresse. Udfyld appsScriptUrl i config.js efter installationen.';frame.hidden=true;return;}
 function open(page){peer=null;origin='';challenge=nonce();const target=new URL(url);target.searchParams.set('page',page);target.searchParams.set('bridge',challenge);frame.src=target.href;status.textContent='Åbner Wallmann v2…';status.hidden=false;reload.hidden=true;clearTimeout(timer);timer=setTimeout(()=>{status.textContent='Appen svarer ikke endnu. Kontrollér internetforbindelsen og webappens adgangsindstillinger.';reload.hidden=false;},25000);}
 window.addEventListener('message',event=>{
   const data=event.data;
   if(!data||data.app!=='wallmann-v2'||data.bridge!==challenge)return;
   // HtmlService executes in a nested sandbox iframe. Pin its real WindowProxy
   // after a nonce challenge, not the outer Apps Script iframe WindowProxy.
   if(!/^https:\/\/(?:[a-z0-9-]+[.-])?script\.googleusercontent\.com$/.test(event.origin))return;
   if(!peer){if(data.action!=='ready')return;peer=event.source;origin=event.origin;}
   if(event.source!==peer||event.origin!==origin)return;
   if(data.action==='ready'){clearTimeout(timer);status.hidden=true;reload.hidden=true;peer.postMessage({app:'wallmann-v2',bridge:challenge,action:'bootstrap',state},origin);return;}
   if(data.action==='state'){
     const s=data.state||{};state={admin:s.admin||null,kiosk:s.kiosk||null,pending:s.pending||null,mode:s.mode==='admin'?'admin':'kiosk'};save();
   }
   if(data.action==='navigate'&&['home','login','admin'].includes(data.page)){history.replaceState(null,'',location.pathname+'?page='+data.page);open(data.page);}
 });
 reload.onclick=()=>open(new URLSearchParams(location.search).get('page')||'home');
 window.addEventListener('offline',()=>{status.textContent='Ingen internetforbindelse. Stemplinger kan først gemmes, når forbindelsen er tilbage.';status.hidden=false;});
 window.addEventListener('online',()=>{status.textContent='Forbindelsen er tilbage. Genindlæs, hvis appen ikke svarer.';status.hidden=false;reload.hidden=false;});
 const requested=new URLSearchParams(location.search).get('page');open(['home','login','admin'].includes(requested)?requested:'home');
 if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).catch(()=>{});
})();
