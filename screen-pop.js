/* Co Pilot Collections — Dedicated Live Transfer Screen Pop
   Build: R8N19.16
   This module is intentionally independent from the 14k+ line application file.
*/
(function(){
  'use strict';
  const BUILD='R8N19.16';
  const TOKEN_KEY='coPilotSupabaseAccessToken';
  const POLL_MS=750;
  let current=null, busy=false, lastOpened='', hiddenIds=new Set(), timer=null;
  const originalTitle=document.title;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const txt=v=>v==null?'':String(v);
  function phone(v){let d=txt(v).replace(/\D/g,'');if(d.length===11&&d[0]==='1')d=d.slice(1);return d.length===10?`(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`:(txt(v)||'Number unavailable')}
  function money(v){const n=Number(v||0);return Number.isFinite(n)?n.toLocaleString('en-US',{style:'currency',currency:'USD'}):'$0.00'}

  function getBase(){
    try{if(typeof window.url==='function')return txt(window.url()).replace(/\/$/,'')}catch(_){ }
    return txt(window.CO_PILOT_SUPABASE_CONFIG?.url).replace(/\/$/,'');
  }
  function getKey(){
    try{if(typeof window.pubKey==='function')return txt(window.pubKey())}catch(_){ }
    return txt(window.CO_PILOT_SUPABASE_CONFIG?.publishableKey);
  }
  function getToken(){
    try{if(typeof window.token==='function'){const t=window.token();if(t)return t}}catch(_){ }
    const direct=localStorage.getItem(TOKEN_KEY); if(direct)return direct;
    // Fallback for Supabase auth keys if the app's canonical token key changes later.
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i)||'';
      if(!k.startsWith('sb-')||!k.endsWith('-auth-token'))continue;
      try{const j=JSON.parse(localStorage.getItem(k)||'{}');const t=j?.access_token||j?.currentSession?.access_token;if(t)return t}catch(_){ }
    }
    return '';
  }
  async function api(path,opt={}){
    if(typeof window.dbFetch==='function') return window.dbFetch(path,opt);
    const base=getBase(), key=getKey(), access=getToken();
    if(!base||!key||!access)throw new Error('Waiting for Co Pilot login session');
    const r=await fetch(base+'/rest/v1'+path,{method:opt.method||'GET',headers:{apikey:key,Authorization:'Bearer '+access,'Content-Type':'application/json',Prefer:'return=representation',...(opt.headers||{})},body:opt.body});
    const raw=await r.text();let data=null;try{data=raw?JSON.parse(raw):null}catch(_){data=raw}
    if(!r.ok)throw new Error(data?.message||txt(data)||`HTTP ${r.status}`);
    return data;
  }

  function mount(){
    if(document.getElementById('cpcm-screen-pop-root'))return;
    const style=document.createElement('style');style.id='cpcm-screen-pop-style';style.textContent=`
#cpcm-screen-pop-status{position:fixed;left:50%;top:8px;transform:translateX(-50%);z-index:2147483646;padding:8px 13px;border-radius:999px;background:#14532d;color:#dcfce7;font:900 11px/1 Arial,sans-serif;box-shadow:0 8px 25px rgba(0,0,0,.25);cursor:pointer;letter-spacing:.2px}
#cpcm-screen-pop-status.wait{background:#334155;color:#e2e8f0}#cpcm-screen-pop-status.err{background:#991b1b;color:#fee2e2}
#cpcm-screen-pop-tray{position:fixed;right:18px;bottom:78px;z-index:2147483647;width:min(450px,calc(100vw - 24px));display:none;font-family:Arial,sans-serif}
.csp-card{background:#07111f;color:white;border:3px solid #2dd4bf;border-radius:16px;overflow:hidden;box-shadow:0 28px 90px rgba(0,0,0,.68)}
.csp-head{padding:13px 15px;display:flex;justify-content:space-between;align-items:center;background:linear-gradient(90deg,#0f766e,#0f172a);font-size:13px;font-weight:950}.csp-pulse{display:inline-block;width:11px;height:11px;border-radius:50%;background:#5eead4;margin-right:9px;animation:cspPulse 1.1s infinite}@keyframes cspPulse{70%{box-shadow:0 0 0 13px rgba(94,234,212,0)}0%{box-shadow:0 0 0 0 rgba(94,234,212,.7)}}
.csp-body{padding:17px}.csp-name{font-size:23px;font-weight:1000}.csp-phone{font-size:29px;font-weight:1000;color:#5eead4;margin:9px 0}.csp-meta{font-size:15px;line-height:1.7;color:#dbeafe}.csp-note{margin-top:11px;padding:10px;border-radius:9px;background:#0f2f2c;color:#99f6e4;font-size:12px;font-weight:850}.csp-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.csp-btn{border:0;border-radius:10px;padding:12px 14px;font-weight:950;cursor:pointer}.csp-open{background:#22c55e;color:#052e16;flex:1}.csp-claim{background:#f59e0b;color:#451a03;flex:1}.csp-hide{background:#334155;color:white}
`;document.head.appendChild(style);
    const root=document.createElement('div');root.id='cpcm-screen-pop-root';root.innerHTML='<div id="cpcm-screen-pop-status" class="wait" title="Click to check now">SCREEN POP MODULE LOADING</div><div id="cpcm-screen-pop-tray"></div>';document.body.appendChild(root);
    document.getElementById('cpcm-screen-pop-status').onclick=()=>poll(true);
  }
  function status(message,kind='ok'){
    const e=document.getElementById('cpcm-screen-pop-status');if(!e)return;e.textContent=message;e.className=kind==='err'?'err':kind==='wait'?'wait':'';
  }
  function appAccounts(){try{return Array.isArray(window.accounts)?window.accounts:(typeof accounts!=='undefined'&&Array.isArray(accounts)?accounts:[])}catch(_){return[]}}
  function localAccount(id){return appAccounts().find(a=>String(a.id)===String(id))||null}
  async function accountFor(row){
    let a=localAccount(row.account_id);if(a)return a;
    const rows=await api('/accounts?id=eq.'+encodeURIComponent(row.account_id)+'&select=*&limit=1');
    if(rows?.[0]){
      a=typeof window.toCamel==='function'?window.toCamel(rows[0]):rows[0];
      try{if(typeof accounts!=='undefined'&&Array.isArray(accounts)&&!accounts.some(x=>String(x.id)===String(a.id)))accounts.push(a)}catch(_){ }
      return a;
    }
    return null;
  }
  function debtorName(row,a){return row.consumer_name||a?.fullName||a?.full_name||[a?.firstName||a?.first_name,a?.lastName||a?.last_name].filter(Boolean).join(' ')||'Unknown consumer'}
  function acctNo(row,a){return row.account_number||a?.accountNumber||a?.account_number||a?.clientAccountNumber||a?.client_account_number||'Unavailable'}
  function bal(row,a){return row.balance??a?.currentBalance??a?.current_balance??a?.originalBalance??a?.original_balance??0}

  function render(){
    const tray=document.getElementById('cpcm-screen-pop-tray');if(!tray)return;
    if(!current){tray.style.display='none';tray.innerHTML='';document.title=originalTitle;return}
    const a=localAccount(current.account_id), p=current.called_number||current.phone_number;
    document.title='INCOMING '+phone(p)+' — '+originalTitle;
    tray.style.display='block';tray.innerHTML=`<div class="csp-card"><div class="csp-head"><span><span class="csp-pulse"></span>INCOMING DEBTOR ACCOUNT</span><span>${esc(current.status||'')}</span></div><div class="csp-body"><div class="csp-name">${esc(debtorName(current,a))}</div><div class="csp-phone">${esc(phone(p))}</div><div class="csp-meta"><b>Account #:</b> ${esc(acctNo(current,a))}<br><b>Balance:</b> ${esc(money(bal(current,a)))}<br><b>Call record:</b> ${esc(current.call_id||'—')}</div><div class="csp-note">This is the exact account attached to the number Twilio called.</div><div class="csp-actions"><button class="csp-btn csp-open" id="csp-open">OPEN ACCOUNT</button><button class="csp-btn csp-claim" id="csp-claim">CLAIM CALL</button><button class="csp-btn csp-hide" id="csp-hide">HIDE</button></div></div></div>`;
    document.getElementById('csp-open').onclick=()=>openAccount(current);
    document.getElementById('csp-claim').onclick=claim;
    document.getElementById('csp-hide').onclick=()=>{hiddenIds.add(current.id);current=null;render()};
  }
  async function openAccount(row){
    const a=await accountFor(row);if(!a)throw new Error('The account row could not be loaded.');
    try{if(typeof window.closeVoiceBroadcast==='function')window.closeVoiceBroadcast()}catch(_){ }
    try{window.currentAccountId=a.id;if(typeof currentAccountId!=='undefined')currentAccountId=a.id}catch(_){ }
    const search=document.getElementById('search');if(search){search.value=row.called_number||row.phone_number||acctNo(row,a);search.dispatchEvent(new Event('input',{bubbles:true}))}
    try{if(typeof window.setCurrent==='function')window.setCurrent(a.id);else if(typeof setCurrent==='function')setCurrent(a.id)}catch(_){ }
    try{if(typeof window.renderCurrent==='function')window.renderCurrent(a,[a]);else if(typeof renderCurrent==='function')renderCurrent(a,[a])}catch(_){ }
    try{if(typeof window.renderDispos==='function')window.renderDispos(a);else if(typeof renderDispos==='function')renderDispos(a)}catch(_){ }
    try{if(typeof window.scheduleHistoryLoad==='function')window.scheduleHistoryLoad(a.id);else if(typeof scheduleHistoryLoad==='function')scheduleHistoryLoad(a.id)}catch(_){ }
    lastOpened=row.id;
    return true;
  }
  async function claim(){
    if(!current||busy)return;const row=current;busy=true;
    try{
      let email='';try{email=txt(window.currentUser?.email||(typeof currentUser!=='undefined'&&currentUser.email)||'').toLowerCase()}catch(_){ }
      const result=await api('/voice_broadcast_live_transfers?id=eq.'+encodeURIComponent(row.id)+'&status=in.(waiting,connected)',{method:'PATCH',body:JSON.stringify({status:'claimed',claimed_by_email:email||null,claimed_at:new Date().toISOString(),updated_at:new Date().toISOString()})});
      if(!result?.length)throw new Error('Another collector already claimed this call.');
      await openAccount(row);current=null;render();
    }catch(e){alert(e.message||String(e))}finally{busy=false;setTimeout(()=>poll(),150)}
  }
  async function poll(manual=false){
    if(busy)return;busy=true;
    try{
      const now=encodeURIComponent(new Date().toISOString());
      const rows=await api('/voice_broadcast_live_transfers?status=in.(waiting,connected)&expires_at=gt.'+now+'&select=id,call_id,account_id,called_number,phone_number,consumer_name,account_number,balance,status,expires_at,created_at&order=created_at.desc&limit=20');
      status('SCREEN POP ONLINE · '+BUILD,'ok');
      const row=(rows||[]).find(r=>!hiddenIds.has(r.id))||null;current=row;render();
      if(row&&lastOpened!==row.id){try{await openAccount(row)}catch(e){console.error('Screen pop auto-open failed:',e)}}
      if(manual&&!row)status('SCREEN POP ONLINE · NO ACTIVE CALL','ok');
    }catch(e){
      const waiting=/Waiting for Co Pilot login session/i.test(e.message||'');status(waiting?'SCREEN POP WAITING FOR LOGIN':'SCREEN POP ERROR · CLICK',''+(waiting?'wait':'err'));console.error('Dedicated screen pop:',e);
    }finally{busy=false}
  }
  function start(){mount();status('SCREEN POP MODULE LOADING','wait');setTimeout(()=>poll(),300);timer=setInterval(()=>poll(),POLL_MS);window.addEventListener('focus',()=>poll());document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll()});window.CPCM_SCREEN_POP={build:BUILD,poll,open:()=>current&&openAccount(current),test:row=>{current=row;render()}}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
