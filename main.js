// Co Pilot Collections Manager - extracted application JavaScript
// Phase 2 modular codebase refactor: runtime JS moved out of index.html.
// Shared helpers are declared first so feature sections use one admin/config source of truth.
(function(){
  window.CoPilotApp = window.CoPilotApp || {};
  window.CoPilotApp.version = 'MODULAR_CODEBASE_REFACTOR_PHASE_2';
  window.CoPilotApp.isAdminEmail = function(email){
    return String(email || '').toLowerCase() === 'afinch2678@gmail.com';
  };
  window.CoPilotApp.safeCloseOverlays = function(){
    try {
      document.querySelectorAll('.loading,.loadingOverlay,.overlay,.modal.open').forEach(function(el){
        if (!el) return;
        if (el.classList && el.classList.contains('modal')) return;
        el.style.display = 'none';
      });
    } catch(e) {}
  };
})();

// ===== inline-script =====
// Inline fallback config for published Bolt/Vite builds.
  // This is the Supabase publishable key only, not the secret service-role key.
  window.CO_PILOT_SUPABASE_CONFIG = window.CO_PILOT_SUPABASE_CONFIG || {
    url: "https://bwvufgzbkaymffwxuuzr.supabase.co",
    publishableKey: "sb_publishable_cvwkN3fOovsYvAvzXvrmRA_TKauXT_d"
  };


// ===== inline-script =====
const ADMIN_EMAIL='afinch2678@gmail.com';
const ADMIN_EMAILS=[ADMIN_EMAIL].map(e=>e.toLowerCase());
function isAdminEmail(email){return ADMIN_EMAILS.includes(String(email||'').toLowerCase().trim())}
function isProtectedAdminEmail(email){return isAdminEmail(email)}
function isAdminProfile(profile){
  if(!profile)return false;
  let role=String(profile.role||profile.userRole||'').toLowerCase();
  let status=String(profile.approvalStatus||profile.approval_status||'').toLowerCase();
  let approved=(profile.isApproved===true || profile.is_approved===true || status==='approved');
  let active=(profile.isActive!==false && profile.is_active!==false);
  return role==='admin' && approved && active;
}

function forceCurrentUserRole(profile=null){
  if(isAdminEmail(currentUser.email)||isAdminProfile(profile)){
    currentUser.isAdmin=true;
    return 'admin';
  }
  currentUser.isAdmin=false;
  return 'employee';
}

const URL_KEY='coPilotSupabaseUrl';
const PUB_KEY='coPilotSupabasePublishableKey';
const TOKEN_KEY='coPilotSupabaseAccessToken';
const REFRESH_KEY='coPilotSupabaseRefreshToken';
const EXP_KEY='coPilotSupabaseTokenExpiresAt';
let accounts=[], appUsers=[], currentAccountId='', currentDisposition='', currentUser={email:'',isAdmin:false};
const DISPOS=['No Answer','Left Voicemail','Promise to Pay','Disputed','Bad Number','Callback','Settled','DNC'];
const FIELDS=["portfolio", "accountDescription", "clientAccountNumber", "accountId", "accountNumber", "issuerName", "firstName", "middleName", "lastName", "fullName", "ssn", "dob", "address", "address2", "city", "state", "zip", "employer", "occupation", "description", "email", "originalCreditor", "typeOfDebt", "originalBalance", "principal", "currentBalance", "openDate", "dateAccountOpened", "accountReceiveDate", "delinquencyDate", "chargeOffDate", "origLastPmtDate", "lastPaymentDate", "lastPaymentAmount", "bankRoutingNumber", "bankAccountNumber", "origEmployer", "origStoreName", "origStoreCity", "origStoreState", "origBankName", "origBankAcctLast4Digits", "origPrincipalBalance", "origOriginalLoanAmount", "origChargeOffBalance", "origLoanType", "origPrincipalLoanAmount", "origInterestAmount", "origReturnFee", "phone1", "phone1Type", "phone1LineType", "phone1Source", "phone1Note", "phone1Status", "phone2", "phone2Type", "phone2LineType", "phone2Source", "phone2Note", "phone2Status", "phone3", "phone3Type", "phone3LineType", "phone3Source", "phone3Note", "phone3Status", "phone4", "phone4Type", "phone4LineType", "phone4Source", "phone4Note", "phone4Status", "phone5", "phone5Type", "phone5LineType", "phone5Source", "phone5Note", "phone5Status", "phone6", "phone6Type", "phone6LineType", "phone6Source", "phone6Note", "phone6Status", "phone7", "phone7Type", "phone7LineType", "phone7Source", "phone7Note", "phone7Status", "phone8", "phone8Type", "phone8LineType", "phone8Source", "phone8Note", "phone8Status", "phone9", "phone9Type", "phone9LineType", "phone9Source", "phone9Note", "phone9Status", "phone10", "phone10Type", "phone10LineType", "phone10Source", "phone10Note", "phone10Status", "rawData", "status", "assignedToEmail", "assignedByEmail", "assignmentMethod"];
const map={"portfolio": "portfolio", "accountDescription": "account_description", "clientAccountNumber": "client_account_number", "accountId": "source_account_id", "accountNumber": "account_number", "issuerName": "issuer_name", "firstName": "first_name", "middleName": "middle_name", "lastName": "last_name", "fullName": "full_name", "ssn": "ssn", "dob": "dob", "address": "address", "address2": "address2", "city": "city", "state": "state", "zip": "zip", "employer": "employer", "occupation": "occupation", "description": "description", "email": "email", "originalCreditor": "original_creditor", "typeOfDebt": "type_of_debt", "originalBalance": "original_balance", "principal": "principal", "currentBalance": "current_balance", "openDate": "open_date", "dateAccountOpened": "date_account_opened", "accountReceiveDate": "account_receive_date", "delinquencyDate": "delinquency_date", "chargeOffDate": "charge_off_date", "origLastPmtDate": "orig_last_pmt_date", "lastPaymentDate": "last_payment_date", "lastPaymentAmount": "last_payment_amount", "bankRoutingNumber": "bank_routing_number", "bankAccountNumber": "bank_account_number", "origEmployer": "orig_employer", "origStoreName": "orig_store_name", "origStoreCity": "orig_store_city", "origStoreState": "orig_store_state", "origBankName": "orig_bank_name", "origBankAcctLast4Digits": "orig_bank_acct_last4_digits", "origPrincipalBalance": "orig_principal_balance", "origOriginalLoanAmount": "orig_original_loan_amount", "origChargeOffBalance": "orig_chargeoff_balance", "origLoanType": "orig_loan_type", "origPrincipalLoanAmount": "orig_principal_loan_amount", "origInterestAmount": "orig_interest_amount", "origReturnFee": "orig_return_fee", "rawData": "raw_data", "status": "status", "disposition": "disposition", "lastContactNumber": "last_contact_number", "phone1": "phone1", "phone1Type": "phone1_type", "phone1LineType": "phone1_line_type", "phone1Source": "phone1_source", "phone1Note": "phone1_note", "phone1Status": "phone1_status", "phone2": "phone2", "phone2Type": "phone2_type", "phone2LineType": "phone2_line_type", "phone2Source": "phone2_source", "phone2Note": "phone2_note", "phone2Status": "phone2_status", "phone3": "phone3", "phone3Type": "phone3_type", "phone3LineType": "phone3_line_type", "phone3Source": "phone3_source", "phone3Note": "phone3_note", "phone3Status": "phone3_status", "phone4": "phone4", "phone4Type": "phone4_type", "phone4LineType": "phone4_line_type", "phone4Source": "phone4_source", "phone4Note": "phone4_note", "phone4Status": "phone4_status", "phone5": "phone5", "phone5Type": "phone5_type", "phone5LineType": "phone5_line_type", "phone5Source": "phone5_source", "phone5Note": "phone5_note", "phone5Status": "phone5_status", "phone6": "phone6", "phone6Type": "phone6_type", "phone6LineType": "phone6_line_type", "phone6Source": "phone6_source", "phone6Note": "phone6_note", "phone6Status": "phone6_status", "phone7": "phone7", "phone7Type": "phone7_type", "phone7LineType": "phone7_line_type", "phone7Source": "phone7_source", "phone7Note": "phone7_note", "phone7Status": "phone7_status", "phone8": "phone8", "phone8Type": "phone8_type", "phone8LineType": "phone8_line_type", "phone8Source": "phone8_source", "phone8Note": "phone8_note", "phone8Status": "phone8_status", "phone9": "phone9", "phone9Type": "phone9_type", "phone9LineType": "phone9_line_type", "phone9Source": "phone9_source", "phone9Note": "phone9_note", "phone9Status": "phone9_status", "phone10": "phone10", "phone10Type": "phone10_type", "phone10LineType": "phone10_line_type", "phone10Source": "phone10_source", "phone10Note": "phone10_note", "phone10Status": "phone10_status","assignedToEmail":"assigned_to_email","assignedByEmail":"assigned_by_email","assignedAt":"assigned_at","assignmentMethod":"assignment_method","assignmentGroupId":"assignment_group_id"};
const reverse=Object.fromEntries(Object.entries(map).map(([k,v])=>[v,k]));
function cfg(){
  if(!window.CO_PILOT_SUPABASE_CONFIG)window.CO_PILOT_SUPABASE_CONFIG={url: "https://bwvufgzbkaymffwxuuzr.supabase.co",publishableKey: "sb_publishable_cvwkN3fOovsYvAvzXvrmRA_TKauXT_d"};
  return window.CO_PILOT_SUPABASE_CONFIG||{};
}
function url(){return String(cfg().url||localStorage.getItem(URL_KEY)||"https://bwvufgzbkaymffwxuuzr.supabase.co").replace(/\/$/,'')}
function pubKey(){return String(cfg().publishableKey||localStorage.getItem(PUB_KEY)||"sb_publishable_cvwkN3fOovsYvAvzXvrmRA_TKauXT_d")}
function token(){return localStorage.getItem(TOKEN_KEY)||''}
function connectionIsReady(){
  return Boolean(url() && pubKey() && !pubKey().includes('PASTE_YOUR') && pubKey().startsWith('sb_publishable_'));
}
function showConnectionNotice(){
  let el=document.getElementById('connectionNotice');
  if(!el)return;
  if(connectionIsReady()){
    el.classList.add('hidden');
  }else{
    el.textContent='System setup needed: config.js is missing the Supabase publishable key.';
    el.classList.remove('hidden');
  }
}
function saveConnection(){alert('Connection setup is already handled in config.js.')}
function fillConnection(){showConnectionNotice()}
async function authFetch(path,body){if(!connectionIsReady())throw new Error('System connection is not configured. Admin must update config.js with the Supabase Project URL and Publishable Key.');let res=await fetch(url()+path,{method:'POST',headers:{apikey:pubKey(),'Content-Type':'application/json'},body:JSON.stringify(body)});let data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.msg||data.message||data.error_description||data.error||'Auth failed');return data}
async function dbFetch(path,opt={}){
 await ensureFreshToken();
 async function run(){
   let res=await fetch(url()+'/rest/v1'+path,{...opt,headers:{apikey:pubKey(),Authorization:'Bearer '+token(),'Content-Type':'application/json',Prefer:'return=representation',...(opt.headers||{})}});
   let text=await res.text();
   let data=null;
   try{data=text?JSON.parse(text):null}catch{data=text}
   return {res,data,text};
 }
 let first=await run();
 if(first.res.ok)return first.data;
 let msg=first.data?.message||first.data?.hint||first.data||first.text||'Database failed';
 if(first.res.status===401 || /jwt|expired|invalid token|invalid claims/i.test(String(msg))){
   try{
     await refreshSession();
     let second=await run();
     if(second.res.ok)return second.data;
     let msg2=second.data?.message||second.data?.hint||second.data||second.text||'Database failed';
     throw new Error(msg2);
   }catch(e){
     clearSession();
     throw new Error('Your login session expired. Please log in again.');
   }
 }
 throw new Error(msg);
}

function applyRoleUI(){
  forceCurrentUserRole();
  const badge=document.getElementById('roleBadge');
  if(badge){
    badge.textContent=currentUser.isAdmin?'Admin':'Employee';
    badge.title=(currentUser.email||'') + (isAdminEmail(currentUser.email)?' | hard admin email':'');
  }
  document.querySelectorAll('.adminOnly').forEach(el=>el.classList.toggle('hidden',!currentUser.isAdmin));
}



let appBrandSettings={
  loaded:false,
  name:'Co Pilot Collections Manager',
  subtitle:'Private Collections CRM',
  logoDataUrl:'',
  width:0,
  height:0
};

function appBrandFromLocalStorage(){
  appBrandSettings.name=localStorage.getItem('appBrandName')||appBrandSettings.name||'Co Pilot Collections Manager';
  appBrandSettings.subtitle=localStorage.getItem('appBrandSubtitle')||appBrandSettings.subtitle||'Private Collections CRM';
  appBrandSettings.logoDataUrl=localStorage.getItem('appBrandLogoDataUrl')||'';
  appBrandSettings.width=parseInt(localStorage.getItem('appBrandLogoWidth')||'0',10)||0;
  appBrandSettings.height=parseInt(localStorage.getItem('appBrandLogoHeight')||'0',10)||0;
}
function setLogoEl(el,dataUrl,fallback='b'){
  if(!el)return;
  if(dataUrl){
    el.innerHTML=`<img src="${dataUrl}" alt="App logo">`;
  }else{
    el.textContent=fallback;
  }
}
function applyAppBranding(){
  let name=appBrandSettings.name||'Co Pilot Collections Manager';
  let sub=appBrandSettings.subtitle||'Private Collections CRM';
  let logo=appBrandSettings.logoDataUrl||'';
  let fallback=(name.trim()[0]||'b').toLowerCase();

  let n=document.getElementById('appBrandName'); if(n)n.textContent=name;
  let s=document.getElementById('appBrandSub'); if(s)s.textContent=sub;
  setLogoEl(document.getElementById('appBrandLogo'),logo,fallback);

  let ln=document.getElementById('landingBrandName'); if(ln)ln.textContent=name;
  let ls=document.getElementById('landingBrandSub'); if(ls)ls.textContent=sub;
  setLogoEl(document.getElementById('landingBrandLogo'),logo,fallback);
  setLogoEl(document.getElementById('loginBrandLogo'),logo,fallback);

  let pn=document.getElementById('brandPreviewName'); if(pn)pn.textContent=name;
  let ps=document.getElementById('brandPreviewSub'); if(ps)ps.textContent=sub;
  setLogoEl(document.getElementById('brandPreviewLogo'),logo,fallback);

  let bi=document.getElementById('brandNameInput'); if(bi)bi.value=name;
  let si=document.getElementById('brandSubInput'); if(si)si.value=sub;
  document.title=name;
}
async function loadAppBrandSettings(force=false){
  if(appBrandSettings.loaded&&!force){applyAppBranding();return appBrandSettings;}
  appBrandSettings.loaded=true;
  appBrandFromLocalStorage();
  applyAppBranding();

  // If logged in, pull shared branding from Supabase so employees see the admin settings too.
  if(token()){
    try{
      let keys='app_brand_name,app_brand_subtitle,app_brand_logo_data_url,app_brand_logo_width,app_brand_logo_height';
      let rows=(await dbFetch('/company_settings?select=setting_key,setting_value&setting_key=in.('+keys+')')).map(toCamel);
      let map={}; rows.forEach(r=>map[r.settingKey]=r.settingValue);
      if(map.app_brand_name)appBrandSettings.name=map.app_brand_name;
      if(map.app_brand_subtitle)appBrandSettings.subtitle=map.app_brand_subtitle;
      if(map.app_brand_logo_data_url)appBrandSettings.logoDataUrl=map.app_brand_logo_data_url;
      if(map.app_brand_logo_width)appBrandSettings.width=parseInt(map.app_brand_logo_width||'0',10)||0;
      if(map.app_brand_logo_height)appBrandSettings.height=parseInt(map.app_brand_logo_height||'0',10)||0;

      localStorage.setItem('appBrandName',appBrandSettings.name||'');
      localStorage.setItem('appBrandSubtitle',appBrandSettings.subtitle||'');
      localStorage.setItem('appBrandLogoDataUrl',appBrandSettings.logoDataUrl||'');
      localStorage.setItem('appBrandLogoWidth',appBrandSettings.width||'0');
      localStorage.setItem('appBrandLogoHeight',appBrandSettings.height||'0');
      applyAppBranding();
    }catch(e){
      console.warn('Brand settings load failed:',e);
    }
  }
  return appBrandSettings;
}
function openBrandingSettingsModal(){
  if(!currentUser.isAdmin)return alert('Admin only');
  appBrandFromLocalStorage();
  applyAppBranding();
  document.getElementById('brandingSettingsModal').classList.add('open');
  loadAppBrandSettings(true).then(()=>applyAppBranding()).catch(()=>{});
}
async function handleAppBrandLogoUpload(event){
  try{
    let file=event.target.files&&event.target.files[0];
    if(!file)return;
    let logo=await fileToLogoJpeg(file);
    appBrandSettings.logoDataUrl=logo.dataUrl;
    appBrandSettings.width=logo.width;
    appBrandSettings.height=logo.height;
    applyAppBranding();
    let st=document.getElementById('brandSaveStatus');
    if(st){st.className='saveStatus busy';st.textContent='Logo selected. Click Save Branding to store it.';}
  }catch(e){
    alert(e.message||String(e));
  }finally{
    if(event&&event.target)event.target.value='';
  }
}
function removeAppBrandLogo(){
  appBrandSettings.logoDataUrl='';
  appBrandSettings.width=0;
  appBrandSettings.height=0;
  applyAppBranding();
  let st=document.getElementById('brandSaveStatus');
  if(st){st.className='saveStatus busy';st.textContent='Logo removed from preview. Click Save Branding to store this change.';}
}
function resetAppBrandDefaults(){
  document.getElementById('brandNameInput').value='Co Pilot Collections Manager';
  document.getElementById('brandSubInput').value='Private Collections CRM';
  appBrandSettings.name='Co Pilot Collections Manager';
  appBrandSettings.subtitle='Private Collections CRM';
  appBrandSettings.logoDataUrl='';
  appBrandSettings.width=0;
  appBrandSettings.height=0;
  applyAppBranding();
}

function safeFileNamePart(s){
  return String(s||'brand').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,50)||'brand';
}
function downloadAppBrandBackup(){
  try{
    appBrandSettings.name=(document.getElementById('brandNameInput')?.value||appBrandSettings.name||'Co Pilot Collections Manager').trim();
    appBrandSettings.subtitle=(document.getElementById('brandSubInput')?.value||appBrandSettings.subtitle||'Private Collections CRM').trim();
    applyAppBranding();

    let backup={
      backupType:'co_pilot_collections_app_branding',
      version:1,
      exportedAt:new Date().toISOString(),
      appBrandName:appBrandSettings.name,
      appBrandSubtitle:appBrandSettings.subtitle,
      appBrandLogoDataUrl:appBrandSettings.logoDataUrl||'',
      appBrandLogoWidth:appBrandSettings.width||0,
      appBrandLogoHeight:appBrandSettings.height||0
    };
    let filename='brand-backup-'+safeFileNamePart(appBrandSettings.name)+'-'+todayISO()+'.json';
    download(filename,JSON.stringify(backup,null,2),'application/json');

    let st=document.getElementById('brandSaveStatus');
    if(st){st.className='saveStatus ok';st.textContent='Brand backup downloaded. You can restore it later.';}
  }catch(e){
    alert('Download brand backup failed: '+(e.message||String(e)));
  }
}
function restoreAppBrandBackup(event){
  let file=event.target.files&&event.target.files[0];
  if(!file)return;
  let reader=new FileReader();
  reader.onload=()=>{
    try{
      let data=JSON.parse(String(reader.result||'{}'));
      if(data.backupType!=='co_pilot_collections_app_branding'){
        throw new Error('This does not look like a Co Pilot branding backup file.');
      }
      appBrandSettings.name=data.appBrandName||'Co Pilot Collections Manager';
      appBrandSettings.subtitle=data.appBrandSubtitle||'Private Collections CRM';
      appBrandSettings.logoDataUrl=data.appBrandLogoDataUrl||'';
      appBrandSettings.width=Number(data.appBrandLogoWidth||0);
      appBrandSettings.height=Number(data.appBrandLogoHeight||0);

      applyAppBranding();

      let st=document.getElementById('brandSaveStatus');
      if(st){st.className='saveStatus busy';st.textContent='Brand backup loaded into preview. Click Save Branding to make it permanent.';}
      alert('Brand backup restored into the preview. Click Save Branding to save it to the app.');
    }catch(e){
      alert('Restore brand backup failed: '+(e.message||String(e)));
    }finally{
      if(event&&event.target)event.target.value='';
    }
  };
  reader.onerror=()=>alert('Could not read the backup file.');
  reader.readAsText(file);
}


async function saveAppBrandSettings(){
  let st=document.getElementById('brandSaveStatus');
  function status(msg,cls=''){if(st){st.className='saveStatus '+cls;st.textContent=msg;}}
  try{
    if(!currentUser.isAdmin)return alert('Admin only');
    appBrandSettings.name=(document.getElementById('brandNameInput').value||'Co Pilot Collections Manager').trim();
    appBrandSettings.subtitle=(document.getElementById('brandSubInput').value||'Private Collections CRM').trim();
    applyAppBranding();

    localStorage.setItem('appBrandName',appBrandSettings.name);
    localStorage.setItem('appBrandSubtitle',appBrandSettings.subtitle);
    localStorage.setItem('appBrandLogoDataUrl',appBrandSettings.logoDataUrl||'');
    localStorage.setItem('appBrandLogoWidth',appBrandSettings.width||'0');
    localStorage.setItem('appBrandLogoHeight',appBrandSettings.height||'0');

    status('Saving branding settings...','busy');
    let rows=[
      {setting_key:'app_brand_name',setting_value:appBrandSettings.name,updated_by_email:currentUser.email,updated_at:new Date().toISOString()},
      {setting_key:'app_brand_subtitle',setting_value:appBrandSettings.subtitle,updated_by_email:currentUser.email,updated_at:new Date().toISOString()},
      {setting_key:'app_brand_logo_data_url',setting_value:appBrandSettings.logoDataUrl||'',updated_by_email:currentUser.email,updated_at:new Date().toISOString()},
      {setting_key:'app_brand_logo_width',setting_value:String(appBrandSettings.width||0),updated_by_email:currentUser.email,updated_at:new Date().toISOString()},
      {setting_key:'app_brand_logo_height',setting_value:String(appBrandSettings.height||0),updated_by_email:currentUser.email,updated_at:new Date().toISOString()}
    ];
    await dbFetch('/company_settings?on_conflict=setting_key',{
      method:'POST',
      headers:{Prefer:'resolution=merge-duplicates,return=representation'},
      body:JSON.stringify(rows)
    });
    try{await insertAudit('Branding Updated','Updated app name/subtitle/navigation logo','company_settings','app_branding')}catch(e){}
    status('Branding saved. Employees will see this after refresh/login.','ok');
    alert('Branding saved.');
  }catch(e){
    status('Save failed: '+(e.message||String(e)),'err');
    alert('Branding save failed:\n\n'+(e.message||String(e))+'\n\nIf this is a database error, run RUN_THIS_BRANDING_SETTINGS_SQL.sql in Supabase SQL Editor, reload, and try again.');
  }
}
loadAppBrandSettings(false).catch(()=>{});


function setGlobalBusy(show,title='Working...',text='Please wait.'){
 let box=document.getElementById('globalBusy');
 if(!box)return;
 document.getElementById('globalBusyTitle').textContent=title;
 document.getElementById('globalBusyText').textContent=text;
 box.classList.toggle('hidden',!show);
}
function setLoginBusy(show,msg=''){
 let lb=document.getElementById('loginBtn'), sb=document.getElementById('signupBtn'), st=document.getElementById('loginStatus');
 if(lb)lb.disabled=!!show;
 if(sb)sb.disabled=!!show;
 if(st)st.textContent=msg||'';
}
function friendlyError(msg){
 msg=String(msg||'');
 if(/invalid login credentials/i.test(msg))return 'Email or password is incorrect.';
 if(/email not confirmed/i.test(msg))return 'Check your email and confirm your account before logging in.';
 if(/expired|jwt|token|session/i.test(msg))return 'Your login session expired. Please log in again.';
 if(/failed to fetch|network/i.test(msg))return 'Connection failed. Check internet/Supabase config, then try again.';
 if(/row-level security|policy|permission|violates/i.test(msg))return 'Database permission blocked this action. Admin should run the latest SQL file, reload, and try again.';
 return msg;
}
function openHelpModal(){
 document.getElementById('helpModal').classList.add('open');
}
function downloadSampleCSV(){
 let rows=[
  ['account_number','original_creditor','first_name','last_name','ssn','dob','address','city','state','zip','email','home_phone','cell_phone','phones','original_balance','current_balance','charge_off_date','account_open_date','description'],
  ['SAMPLE-1001','THE CASH STORE','Susan','Moore','371-78-1465','08/22/1982',"1295 O'Brien Rd",'Mayville','MI','48744','susan.moore@example.com','9896703795','5866460637','3154500758;9896735564','704.66','704.66','03/20/2025','07/14/2017','Payday Loan'],
  ['SAMPLE-1002','JCP Credit Card','Roy','Bryant','434-41-2336','12/29/1977','2990 Rocky Hollow Rd','Jacksonville','AL','36265','roy.bryant@example.com','6008896302','2055551188','2055551189','728.34','728.34','02/26/2013','11/20/2011','Credit Card'],
  ['SAMPLE-1003','Walmart Credit Card','Doris','Davidson','418-58-6683','01/25/1944','1808 Linthicum Ln','Birmingham','AL','35217','doris.davidson@example.com','6032203513','2055552244','2055552255','966.73','966.73','02/20/2013','12/20/2010','Credit Card']
 ];
 let csv=rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\n');
 let blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
 let a=document.createElement('a');
 a.href=URL.createObjectURL(blob);
 a.download='co_pilot_sample_accounts.csv';
 a.click();
 URL.revokeObjectURL(a.href);
}




function whoami(){
  let info={email:currentUser.email||'',isAdmin:currentUser.isAdmin,isAdminEmail:isAdminEmail(currentUser.email),adminEmails:ADMIN_EMAILS};
  console.log('Co Pilot role debug:',info);
  alert('Role debug:\n'+JSON.stringify(info,null,2));
}

async function login(){
 try{
   clearLoginError();
   setLoginBusy(true,'Logging in...');
   let email=val('loginEmail').trim().toLowerCase(),password=val('loginPassword');
   if(!email||!password)throw new Error('Enter email and password.');
   let data=await authFetch('/auth/v1/token?grant_type=password',{email,password});
   storeSession(data);
   await boot();
 }catch(e){
   showLoginError(friendlyError(e.message||String(e)));
 }finally{
   setLoginBusy(false,'');
 }
}

window.applyRoleUI = window.applyRoleUI || applyRoleUI;

document.addEventListener('visibilitychange', async ()=>{
  if(document.visibilityState==='visible' && token()){
    try{await ensureFreshToken()}catch(e){}
  }
});
window.addEventListener('focus', async ()=>{
  if(token()){
    try{await ensureFreshToken()}catch(e){}
  }
});


async function signup(){
 try{
   clearLoginError();
   setLoginBusy(true,'Creating access request...');
   let email=val('loginEmail').toLowerCase().trim(), password=val('loginPassword');
   if(!email||!password)throw new Error('Enter email and password.');
   if(password.length<6)throw new Error('Password must be at least 6 characters.');
   let data=await authFetch('/auth/v1/signup',{email,password});
   currentUser={email,isAdmin:isAdminEmail(email)};

   if(data.access_token){
     storeSession(data);
     let profile=await upsertCurrentUser();
     forceCurrentUserRole(profile);
     document.getElementById('loginScreen').classList.remove('open');
     if(currentUser.isAdmin || isUserApproved(profile)){
       document.getElementById('pendingScreen').classList.remove('open');
       applyRoleUI();
       await loadAccounts();
     }else{
       document.getElementById('pendingScreen').classList.add('open');
     }
   }else{
     document.getElementById('loginScreen').classList.remove('open');
     document.getElementById('pendingScreen').classList.add('open');
   }
 }catch(e){
   showLoginError(friendlyError(e.message||String(e)));
 }finally{
   setLoginBusy(false,'');
 }
}

function storeSession(data){
 localStorage.setItem(TOKEN_KEY,data.access_token||'');
 localStorage.setItem(REFRESH_KEY,data.refresh_token||localStorage.getItem(REFRESH_KEY)||'');
 if(data.expires_at){
   localStorage.setItem(EXP_KEY,String(data.expires_at));
 }else if(data.expires_in){
   localStorage.setItem(EXP_KEY,String(Math.floor(Date.now()/1000)+Number(data.expires_in)));
 }
}
function clearSession(){
 localStorage.removeItem(TOKEN_KEY);
 localStorage.removeItem(REFRESH_KEY);
 localStorage.removeItem(EXP_KEY);
}
function logout(){
 clearSession();
 location.reload();
}
function jwtPayload(tok){
 try{
   let part=String(tok||'').split('.')[1]||'';
   part=part.replace(/-/g,'+').replace(/_/g,'/');
   part += '='.repeat((4-part.length%4)%4);
   return JSON.parse(atob(part));
 }catch(e){return null}
}
function tokenIsExpiredSoon(){
 let payload=jwtPayload(token());
 let exp=payload?.exp || parseInt(localStorage.getItem(EXP_KEY)||'0',10);
 if(!exp)return false;
 return Math.floor(Date.now()/1000) >= (Number(exp)-60);
}
async function refreshSession(){
 if(!connectionIsReady())throw new Error('System connection is not configured.');
 let refreshToken=localStorage.getItem(REFRESH_KEY)||'';
 if(!refreshToken)throw new Error('No refresh token.');
 let res=await fetch(url()+'/auth/v1/token?grant_type=refresh_token',{
   method:'POST',
   headers:{apikey:pubKey(),'Content-Type':'application/json'},
   body:JSON.stringify({refresh_token:refreshToken})
 });
 let data=await res.json().catch(()=>({}));
 if(!res.ok){
   clearSession();
   throw new Error(data.msg||data.message||data.error_description||data.error||'Session expired.');
 }
 storeSession(data);
 return data;
}
async function ensureFreshToken(){
 if(!token())throw new Error('Not logged in.');
 if(tokenIsExpiredSoon()){
   await refreshSession();
 }
}
function showLoginError(msg){
 let el=document.getElementById('loginError');
 if(!el)return alert(msg);
 el.textContent=friendlyError(msg);
 el.classList.remove('hidden');
}
function clearLoginError(){
 let el=document.getElementById('loginError');
 if(el){el.textContent='';el.classList.add('hidden')}
 let st=document.getElementById('loginStatus');
 if(st)st.textContent='';
}

async function getUser(){
 await ensureFreshToken();
 async function run(){
   let res=await fetch(url()+'/auth/v1/user',{headers:{apikey:pubKey(),Authorization:'Bearer '+token()}});
   let data=await res.json().catch(()=>({}));
   return {res,data};
 }
 let first=await run();
 if(first.res.ok)return first.data;
 let msg=first.data.msg||first.data.message||'Login expired. Log in again.';
 if(first.res.status===401 || /jwt|expired|invalid token|invalid claims/i.test(String(msg))){
   try{
     await refreshSession();
     let second=await run();
     if(second.res.ok)return second.data;
   }catch(e){}
   clearSession();
   throw new Error('Your login session expired. Please log in again.');
 }
 throw new Error(msg);
}

async function upsertCurrentUser(){
 if(!currentUser.email)return null;
 try{
   let existing=await dbFetch('/app_users?email=eq.'+encodeURIComponent(currentUser.email)+'&select=*').catch(()=>[]);
   if(existing&&existing[0]){
     let profile=toCamel(existing[0]);
     if(currentUser.isAdmin || isAdminEmail(currentUser.email)){
       currentUser.isAdmin=true;
       let rows=await dbFetch('/app_users?email=eq.'+encodeURIComponent(currentUser.email),{
         method:'PATCH',
         body:JSON.stringify({role:'admin',approval_status:'approved',is_approved:true,is_active:true,last_seen_at:new Date().toISOString(),updated_at:new Date().toISOString()})
       }).catch(()=>null);
       return rows&&rows[0]?toCamel(rows[0]):{...profile,role:'admin',approvalStatus:'approved',isApproved:true,isActive:true};
     }
     return profile;
   }

   let row={
     email:currentUser.email,
     role:(currentUser.isAdmin || isAdminEmail(currentUser.email))?'admin':'employee',
     approval_status:(currentUser.isAdmin || isAdminEmail(currentUser.email))?'approved':'pending',
     is_approved:(currentUser.isAdmin || isAdminEmail(currentUser.email)),
     is_active:(currentUser.isAdmin || isAdminEmail(currentUser.email)),
     created_at:new Date().toISOString(),
     updated_at:new Date().toISOString(),
     last_seen_at:new Date().toISOString()
   };
   let rows=await dbFetch('/app_users',{method:'POST',body:JSON.stringify([row])}).catch(async err=>{
     let retry=await dbFetch('/app_users?email=eq.'+encodeURIComponent(currentUser.email)+'&select=*').catch(()=>[]);
     return retry;
   });
   return rows&&rows[0]?toCamel(rows[0]):(currentUser.isAdmin?{email:currentUser.email,approvalStatus:'approved',isApproved:true,isActive:true,role:'admin'}:null);
 }catch(err){
   console.warn('Could not load/create app user profile. Run updated SQL.',err);
   if(currentUser.isAdmin)return {email:currentUser.email,approvalStatus:'approved',isApproved:true,isActive:true,role:'admin'};
   return null;
 }
}

async function boot(){
 fillConnection();
 if(!connectionIsReady()){
   document.getElementById('loginScreen').classList.add('open');
   return;
 }
 if(!token()){
   document.getElementById('loginScreen').classList.add('open');
   return;
 }
 try{
   clearLoginError();
   let user=await getUser();
   currentUser={email:(user.email||'').toLowerCase(),isAdmin:isAdminEmail(user.email||'')};
   let profile=await upsertCurrentUser();
   forceCurrentUserRole(profile);

   if(!isUserApproved(profile)){
     document.getElementById('loginScreen').classList.remove('open');
     document.getElementById('pendingScreen').classList.add('open');
     return;
   }

   document.getElementById('pendingScreen').classList.remove('open');
   document.getElementById('loginScreen').classList.remove('open');
   applyRoleUI();
   await loadAppBrandSettings(true);
   await loadPdfLetterSettings(true);
   await loadAccounts();
 }catch(e){
   let msg=e.message||String(e);
   if(/expired|jwt|token|session/i.test(msg)){
     clearSession();
     msg='Your login session expired. Please log in again.';
   }
   showLoginError(friendlyError(msg));
   document.getElementById('pendingScreen').classList.remove('open');
   document.getElementById('loginScreen').classList.add('open');
 }
}

function isUserApproved(profile){
 if(currentUser.isAdmin)return true;
 if(!profile)return false;
 return profile.isApproved===true || profile.is_approved===true || profile.approvalStatus==='approved' || profile.approval_status==='approved';
}
async function loadAppUsers(){
 try{
   let rows=await dbFetch('/app_users?select=*&order=email.asc');
   appUsers=(rows||[]).map(toCamel);
 }catch(err){
   console.warn('Could not load app users. Run updated SQL.',err);
   appUsers=[];
 }
 return appUsers;
}
function validEmail(e){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e||'').trim().toLowerCase())}

function snakeToCamel(k){return String(k).replace(/_([a-z])/g,(_,c)=>c.toUpperCase())}function toCamel(row){let o={id:row.id};Object.entries(row||{}).forEach(([k,v])=>{o[reverse[k]||snakeToCamel(k)||k]=v??''});return o}
function toRow(a){let r={};Object.entries(map).forEach(([k,v])=>{if(a[k]!==undefined)r[v]=numKey(k)?num(a[k]):a[k]});r.full_name=r.full_name||[r.first_name,r.middle_name,r.last_name].filter(Boolean).join(' ');r.account_number=r.account_number||r.client_account_number||r.source_account_id||'';r.portfolio=r.portfolio||r.issuer_name||r.account_description||r.original_creditor||'Imported Portfolio';r.original_creditor=r.original_creditor||r.issuer_name||r.account_description||r.portfolio;r.status=r.status||'New';r.updated_at=new Date().toISOString();r.created_by_email=currentUser.email;return r}
function numKey(k){return ['originalBalance','principal','currentBalance','lastPaymentAmount','origPrincipalBalance','origOriginalLoanAmount','origChargeOffBalance','origPrincipalLoanAmount','origInterestAmount','origReturnFee'].includes(k)}function num(v){if(v===''||v==null)return null;let n=Number(String(v).replace(/[$,]/g,''));return Number.isFinite(n)?n:null}
async function loadAccounts(){
 try{
   setGlobalBusy(true,'Loading accounts','Refreshing queue and dashboards...');
   accounts=(await dbFetch('/accounts?select=*&order=created_at.asc&limit=20000')).map(toCamel);
   if(!currentUser.isAdmin)accounts=accounts.filter(a=>(a.assignedToEmail||'').toLowerCase()===currentUser.email);
   if(!currentAccountId&&accounts[0])currentAccountId=accounts[0].id;
   if(currentAccountId&&!accounts.some(a=>a.id===currentAccountId))currentAccountId=accounts[0]?.id||'';
   if(typeof runPromiseAutomation==='function')runPromiseAutomation(false,false).catch(()=>{});
   else if(typeof runBrokenPromiseAutomation==='function')runBrokenPromiseAutomation(false).catch(()=>{});
   if(typeof refreshCollectorAlertBadge==='function')refreshCollectorAlertBadge().catch(()=>{});
   render();
 }catch(e){
   alert('Could not load accounts:\n\n'+friendlyError(e.message||String(e)));
   accounts=[];
   currentAccountId='';
   render();
 }finally{
   setGlobalBusy(false);
 }
}
function queue(){
 let q=(document.getElementById('search')?.value||'').trim();
 let st=document.getElementById('statusFilter')?.value||'';
 let pf=document.getElementById('portfolioFilter')?.value||'';
 let filtered=accounts.filter(a=>{
   return (!q||accountMatchesSearch(a,q))&&(!st||a.status===st)&&(!pf||a.portfolio===pf);
 });
 if(q){
   filtered.sort((a,b)=>{
     let sb=phoneSearchScore(b,q), sa=phoneSearchScore(a,q);
     if(sb!==sa)return sb-sa;
     return nameOf(a).localeCompare(nameOf(b));
   });
 }
 return filtered;
}
let searchDebounceTimer=null;
let searchRenderSeq=0;
let lastFullRenderAccountId='';
let lastPortfolioSignature='';
let historyRenderTimer=null;

function syncSearchInputs(source){
 let main=document.getElementById('search');
 let global=document.getElementById('globalSearch');
 if(!main||!global)return;
 if(source==='global')main.value=global.value;
 else if(source==='queue')global.value=main.value;
}
function setSearchStatus(msg,busy=false){
 let el=document.getElementById('searchStatusMini');
 if(el){el.textContent=msg||'';el.classList.toggle('searchingPulse',!!busy);}
}
function handleSearchInput(source){
 syncSearchInputs(source);
 setSearchStatus('Searching...',true);
 clearTimeout(searchDebounceTimer);
 let seq=++searchRenderSeq;
 searchDebounceTimer=setTimeout(()=>{
   if(seq!==searchRenderSeq)return;
   onQueueFilterChange();
 },160);
}
function updateCenterProgressOnly(cur,q){
 if(!cur)return;
 let idx=q.findIndex(x=>x.id===cur.id)+1,total=q.length;
 let pct=total?Math.round((idx/total)*100):0;
 let cpt=document.getElementById('centerProgressTitle'); if(cpt)cpt.textContent=`${idx||1} of ${total} accounts`;
 let cpf=document.getElementById('centerProgressFill'); if(cpf)cpf.style.width=pct+'%';
 let old=document.getElementById('accountProgress'); if(old)old.textContent=`Account ${idx||1} of ${total}`;
 let oldFill=document.getElementById('progressFill'); if(oldFill)oldFill.style.width=pct+'%';
}
function scheduleHistoryLoad(id){
 clearTimeout(historyRenderTimer);
 historyRenderTimer=setTimeout(()=>loadHistory(id),220);
}
function onQueueFilterChange(){
 let q=queue();
 if(q[0]&&!q.some(a=>a.id===currentAccountId))currentAccountId=q[0].id;
 let cur=q.find(a=>a.id===currentAccountId)||q[0]||accounts[0];

 // Fast search render: update only the queue list and progress while typing.
 // Do not rebuild the whole account screen or reload history on every keystroke.
 renderQueue(q,cur);
 updateCenterProgressOnly(cur,q);

 // Only fully refresh the account panel if search changed the selected account.
 if(cur?.id && cur.id!==lastFullRenderAccountId){
   renderCurrent(cur,q);
   renderDispos(cur);
   lastFullRenderAccountId=cur.id;
   scheduleHistoryLoad(cur.id);
 }
 setSearchStatus(q.length?`${q.length} match${q.length===1?'':'es'}`:'No matches',false);
}function setCurrent(id){
 currentAccountId=id;
 document.getElementById('agentNote').value='';
 currentDisposition='';
 lastFullRenderAccountId='';
 render();
 scheduleHistoryLoad(id);
}function getCurrent(){return queue().find(a=>a.id===currentAccountId)||queue()[0]||accounts[0]}
function money(n){return Number(n||0).toLocaleString('en-US',{style:'currency',currency:'USD'})}function moneyNum(v){let n=Number(String(v??'').replace(/[^0-9.-]/g,''));return isNaN(n)?0:n}function accountBalance(a){return moneyNum(a?.currentBalance||a?.principal||a?.originalBalance)}function esc(s){return String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')}function normPhone(p){return String(p||'').replace(/\D/g,'')}function fmtPhone(p){let d=normPhone(p);return d.length===10?'('+d.slice(0,3)+') '+d.slice(3,6)+'-'+d.slice(6):(p||'')}function acctNo(a){return a?.accountNumber||a?.clientAccountNumber||a?.accountId||''}function nameOf(a){return a?.fullName||[a?.firstName,a?.middleName,a?.lastName].filter(Boolean).join(' ')||'Unknown Account'}function initials(a){return nameOf(a).split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'--'}function creditor(a){return a?.originalCreditor||a?.accountDescription||a?.portfolio||'—'}function phones(a){return[a?.phone1,a?.phone2,a?.phone3,a?.phone4,a?.phone5,a?.phone6,a?.phone7,a?.phone8,a?.phone9,a?.phone10].filter(p=>p&&normPhone(p).length>=10)}
function rawObj(a){return a?.rawData||a?.raw_data||{}}

function phoneSearchDigitsList(a){
 if(!a)return [];
 let cacheKey=[
   a.phone1,a.phone2,a.phone3,a.phone4,a.phone5,a.phone6,a.phone7,a.phone8,a.phone9,a.phone10,
   a.homePhone,a.cellPhone,a.mobilePhone,a.workPhone,
   JSON.stringify(rawObj(a)||{})
 ].join('|');
 if(a.__phoneSearchCacheKey===cacheKey && Array.isArray(a.__phoneSearchDigits))return a.__phoneSearchDigits;

 let raw=rawObj(a)||{};
 let vals=[];
 ['phone1','phone2','phone3','phone4','phone5','phone6','phone7','phone8','phone9','phone10','homePhone','cellPhone','mobilePhone','workPhone'].forEach(k=>{
   if(a?.[k])vals.push(a[k]);
 });
 Object.entries(raw).forEach(([k,v])=>{
   if(/phone|mobile|cell|tel/i.test(String(k)) && v!==undefined && v!==null)vals.push(v);
 });
 let out=[];
 vals.forEach(v=>{
   let str=String(v||'');
   let extracted=[];
   try{extracted=extractPhones(str)||[]}catch(e){extracted=[]}
   if(extracted.length){
     extracted.forEach(p=>out.push(normPhone(p)));
   }else{
     let d=normPhone(str);
     if(d.length>=7)out.push(d);
   }
 });
 let seen=new Set();
 let final=out.map(d=>d.length===11&&d.startsWith('1')?d.slice(1):d).filter(d=>{
   if(!d || d.length<7)return false;
   let key=d.slice(-10);
   if(seen.has(key))return false;
   seen.add(key);
   return true;
 });
 a.__phoneSearchCacheKey=cacheKey;
 a.__phoneSearchDigits=final;
 return final;
}
function searchableAccountText(a){
 if(!a)return '';
 let raw=rawObj(a)||{};
 let cacheKey=[
   nameOf(a), acctNo(a), a?.ssn, a?.address, a?.address2, a?.city, a?.state, a?.zip,
   a?.email, creditor(a), a?.portfolio, a?.accountDescription, a?.issuerName,
   a?.employer, a?.bankAccountNumber, a?.bankRoutingNumber,
   JSON.stringify(raw||{})
 ].join('|');
 if(a.__searchTextCacheKey===cacheKey && a.__searchText)return a.__searchText;
 let important=[
   nameOf(a), acctNo(a), a?.ssn, a?.address, a?.address2, a?.city, a?.state, a?.zip,
   a?.email, creditor(a), a?.portfolio, a?.accountDescription, a?.issuerName,
   a?.employer, a?.bankAccountNumber, a?.bankRoutingNumber
 ];
 let txt=(important.join(' ')+' '+FIELDS.map(k=>a?.[k]).join(' ')+' '+Object.keys(raw).join(' ')+' '+Object.values(raw).join(' ')).toLowerCase();
 a.__searchTextCacheKey=cacheKey;
 a.__searchText=txt;
 return txt;
}
function phoneSearchScore(a,q){
 q=String(q||'').trim().toLowerCase();
 if(!q)return 1;
 let qDigits=normPhone(q);
 if(qDigits.length===11 && qDigits.startsWith('1'))qDigits=qDigits.slice(1);
 let text=searchableAccountText(a);
 let phones=phoneSearchDigitsList(a);
 let acctDigits=normPhone(acctNo(a));
 let ssnDigits=normPhone(a?.ssn);
 let addressText=[a?.address,a?.address2,a?.city,a?.state,a?.zip].filter(Boolean).join(' ').toLowerCase();
 let nameText=nameOf(a).toLowerCase();

 // Phone is primary. Exact full phone > starts with phone > contains phone.
 if(qDigits.length>=3){
   for(let p of phones){
     let last=p.slice(-10);
     if(qDigits.length>=10 && last===qDigits.slice(-10))return 1000;
   }
   for(let p of phones){
     let last=p.slice(-10);
     if(last.startsWith(qDigits))return 920;
   }
   for(let p of phones){
     let last=p.slice(-10);
     if(last.includes(qDigits))return 860;
   }
   if(acctDigits && acctDigits.includes(qDigits))return 520;
   if(qDigits.length>=4 && ssnDigits && ssnDigits.includes(qDigits))return 500;
 }
 if(nameText.includes(q))return 420;
 if(addressText.includes(q))return 360;
 if(text.includes(q))return 250;
 return 0;
}
function accountMatchesSearch(a,q){
 if(!q)return true;
 return phoneSearchScore(a,q)>0;
}
function bestPhoneHit(a,q){
 let qDigits=normPhone(q||'');
 if(qDigits.length===11 && qDigits.startsWith('1'))qDigits=qDigits.slice(1);
 if(qDigits.length<3)return '';
 let phones=phoneSearchDigitsList(a);
 let exact=phones.find(p=>p.slice(-10)===qDigits.slice(-10) && qDigits.length>=10);
 let starts=phones.find(p=>p.slice(-10).startsWith(qDigits));
 let contains=phones.find(p=>p.slice(-10).includes(qDigits));
 return exact||starts||contains||'';
}

const EXTRA_FIELD_LABELS={
 issuerName:'Issuer Name',
 accountReceiveDate:'Account Receive Date',
 origEmployer:'Orig Employer',
 origStoreName:'Orig Store Name',
 origStoreCity:'Orig Store City',
 origStoreState:'Orig Store State',
 origBankName:'Orig Bank Name',
 origBankAcctLast4Digits:'Orig Bank Acct Last 4',
 origPrincipalBalance:'Orig Principal Balance',
 origOriginalLoanAmount:'Orig Original Loan Amount',
 origChargeOffBalance:'Orig Chargeoff Balance',
 origLoanType:'Orig Loan Type',
 origPrincipalLoanAmount:'Orig Principal Loan Amount',
 origInterestAmount:'Orig Interest Amount',
 origReturnFee:'Orig Return Fee'
};

function titleFromField(k){
 let labels={};
 try{(MANUAL_FIELDS||[]).forEach(([field,label])=>labels[field]=label)}catch{}
 return EXTRA_FIELD_LABELS[k]||labels[k]||String(k).replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase());
}
function displayVal(k,v,a){
 if(v==null||v==='')return '';
 if(typeof v==='object')return '';
 let val=String(v);
 let phone=normPhone(val);
 if(phone.length>=10 && phone.length<=11 && /phone/i.test(k))return `<a href="tel:${phone}" onclick="recordDial('${a.id}','${phone}')">${fmtPhone(phone)}</a>`;
 return esc(val);
}
function mappedEntries(a){
 let skip=new Set(['id','status','disposition','lastContactNumber','rawData']);
 let out=[], seen=new Set();
 FIELDS.forEach(k=>{
   if(skip.has(k))return;
   let v=a?.[k];
   if(v!==undefined && v!==null && String(v).trim()!==''){
     let label=titleFromField(k);
     let sig=label+'|'+String(v);
     if(!seen.has(sig)){out.push([label,k,v,'mapped']);seen.add(sig)}
   }
 });
 let raw=rawObj(a);
 Object.entries(raw).forEach(([k,v])=>{
   if(v!==undefined && v!==null && String(v).trim()!==''){
     let sig='Source: '+k+'|'+String(v);
     if(!seen.has(sig)){out.push(['Source: '+k,k,v,'raw']);seen.add(sig)}
   }
 });
 return out;
}

function pickVal(a,keys){
 let raw=rawObj(a);
 for(let key of keys){
   if(a && a[key]!==undefined && a[key]!==null && String(a[key]).trim()!=='')return a[key];
   let found=Object.keys(raw||{}).find(k=>norm(k)===norm(key));
   if(found && String(raw[found]??'').trim()!=='')return raw[found];
 }
 return '';
}
function compactMoney(v){
 if(v===undefined||v===null||String(v).trim()==='')return '';
 let n=Number(String(v).replace(/[^0-9.-]/g,''));
 return isNaN(n)?String(v):money(n);
}
function addDetail(rows,label,value,type='text'){
 if(value===undefined||value===null||String(value).trim()==='')return;
 rows.push([label,label,value,type]);
}
function renderAllImportedFields(a){
 let grid=document.getElementById('allFieldsGrid'),count=document.getElementById('allFieldsCount');
 if(!grid)return;
 if(!a){grid.innerHTML='<div class="allFieldsEmpty">No account selected.</div>';if(count)count.textContent='0 details';return}

 let borrower=[], loan=[], bank=[], dates=[];
 addDetail(borrower,'DOB / Birthdate',pickVal(a,['dob','PBirthdate','PBIRTHDATE','birthdate']));
 addDetail(borrower,'Address', [pickVal(a,['address','OrigAddress1','Orig_Address1']),pickVal(a,['address2','OrigAddress2','Orig_Address2'])].filter(Boolean).join(' '));
 addDetail(borrower,'Zip / Postal',pickVal(a,['zip','OrigZipPostal','OrigZip','zipcode']));
 addDetail(borrower,'Employer',pickVal(a,['employer','Employer','Orig_EMPLOYER','origEmployer']));
 addDetail(borrower,'Occupation',pickVal(a,['occupation','Occupation']));
 addDetail(borrower,'Description',pickVal(a,['description','Description']));

 addDetail(loan,'Store Name',pickVal(a,['origStoreName','Orig_StoreName','StoreName','store_name','IssuerName','issuerName']));
 let storeCity=pickVal(a,['origStoreCity','Orig_Store_City','StoreCity','store_city']);
 let storeState=pickVal(a,['origStoreState','Orig_StoreState','StoreState','store_state']);
 addDetail(loan,'Store City / State',[storeCity,storeState].filter(Boolean).join(' / '));
 addDetail(loan,'Product / Description',pickVal(a,['accountDescription','OrigProduct','origProduct','Product','typeOfDebt']));
 addDetail(loan,'Account Type',pickVal(a,['typeOfDebt','AccountType','accountType','Orig_LoanType','origLoanType']));
 addDetail(loan,'Principal',compactMoney(pickVal(a,['principal','Principal','COPrincipal','Orig_PRINCIPALBALANCE','origPrincipalBalance'])));
 addDetail(loan,'Original Loan Amount',compactMoney(pickVal(a,['origOriginalLoanAmount','Orig_ORIGINALLOANAMOUNT','Orig_PrincipalLoanAmount','origPrincipalLoanAmount','originalBalance'])));

 addDetail(bank,'Bank Name',pickVal(a,['origBankName','Orig_BankName','BankName','bank_name']));
 addDetail(bank,'Bank Account Last 4',pickVal(a,['origBankAcctLast4Digits','Orig_BankAcctLast4Digits','BankAccountLast4','bankAccountNumber','bank_account_number']));
 addDetail(bank,'Routing Number',pickVal(a,['bankRoutingNumber','BankRoutingNumber','routing','RoutingNumber']));
 addDetail(bank,'Last Payment Date',pickVal(a,['lastPaymentDate','Last Payment Date','IssuerLPDate','origLastPmtDate']));
 addDetail(bank,'Last Payment Amount',compactMoney(pickVal(a,['lastPaymentAmount','Last Payment Amount','last_pmt_amt'])));
 addDetail(bank,'Return Fee',compactMoney(pickVal(a,['origReturnFee','Orig_ReturnFee','ReturnFee'])));

 addDetail(dates,'Open Date',pickVal(a,['openDate','AccountOpenDate','account_open_date','dateAccountOpened']));
 addDetail(dates,'Delinquency Date',pickVal(a,['delinquencyDate','DelinquencyDate']));
 addDetail(dates,'Charge-off Date',pickVal(a,['chargeOffDate','CODate','Charge Off Date','charge_off_date']));
 addDetail(dates,'Account Receive Date',pickVal(a,['accountReceiveDate','AccountReceiveDate']));
 addDetail(dates,'Source / File',pickVal(a,['portfolio','SourceFile','fileName','FileName']));
 addDetail(dates,'Imported By',pickVal(a,['createdByEmail','created_by_email']));
 addDetail(dates,'Assigned To',a.assignedToEmail||'');
 addDetail(dates,'Assigned By',a.assignedByEmail||'');
 addDetail(dates,'Assigned At',a.assignedAt||'');
 addDetail(dates,'Assignment Method',a.assignmentMethod||'');

 let groups=[
   ['Borrower Details',borrower],
   ['Store / Loan Details',loan],
   ['Bank / Payment Details',bank],
   ['Dates / Metadata',dates]
 ].filter(g=>g[1].length);

 let total=groups.reduce((s,g)=>s+g[1].length,0);
 if(count)count.textContent=total+' details';

 grid.innerHTML=groups.map(([title,rows])=>{
   return `<div class="detailGroup"><div class="detailGroupTitle">${esc(title)}</div><div class="detailGroupGrid">`+
     rows.slice(0,8).map(([label,k,v,type])=>fieldCard(label,k,v,a)).join('')+
     `</div></div>`;
 }).join('')||'<div class="allFieldsEmpty">No extra mapped fields were saved on this account. Run SQL, clear accounts, and re-import.</div>';

 renderRawDump(a);
}
function renderRawDump(a){
 let box=document.getElementById('rawDumpBox'),grid=document.getElementById('rawDumpGrid');
 if(!grid)return;
 let raw=rawObj(a)||{};
 let entries=Object.entries(raw).filter(([k,v])=>String(v??'').trim()!=='');
 grid.innerHTML=entries.map(([k,v])=>{
   return `<div class="rawDumpItem"><div class="rawDumpKey">${esc(k)}</div><div class="rawDumpVal">${esc(v)}</div></div>`;
 }).join('')||'<div class="allFieldsEmpty">No source fields saved.</div>';
}
function toggleRawDump(){
 let box=document.getElementById('rawDumpBox');
 if(box)box.classList.toggle('open');
}
function fieldCard(label,k,v,a){
 let shown='';
 let val=String(v??'');
 let phones=[];
 try{phones=extractPhones(val)}catch(e){}
 if(phones.length && /phone|tel|mobile|cell/i.test(String(label)+' '+String(k))){
   shown=phones.map(p=>`<a href="#" onclick="event.preventDefault(); return dialPhone('${a.id}','${normPhone(p)}')">${fmtPhone(p)}</a>`).join(', ');
 }else{
   shown=displayVal(k,v,a);
 }
 return `<div class="allFieldCard"><div class="allFieldKey">${esc(label)}</div><div class="allFieldVal">${shown||'—'}</div></div>`;
}
function renderMappedFields(a){
 let grid=document.getElementById('mappedFields'),count=document.getElementById('mappedFieldCount');
 if(!grid)return;
 if(!a){grid.innerHTML='<div class="muted">No account selected.</div>';if(count)count.textContent='0 fields';return}
 let entries=mappedEntries(a);
 if(count)count.textContent=entries.length+' fields';
 grid.innerHTML=entries.map(([label,k,v,type])=>{
   let shown=displayVal(k,v,a);
   if(!shown)return '';
   return `<div class="mappedItem ${type==='raw'?'rawMapped':''}"><div class="mappedKey">${esc(label)}</div><div class="mappedVal">${shown}</div></div>`;
 }).join('')||'<div class="muted">No mapped fields found. If you imported before this fix, run SQL, clear accounts, and re-import.</div>';
}
function render(){
 let q=queue(),cur=getCurrent();
 let portfolioSignature=accounts.map(a=>a.portfolio||a.accountDescription||'').join('|');
 if(portfolioSignature!==lastPortfolioSignature){
   updatePortfolioFilter(accounts);
   lastPortfolioSignature=portfolioSignature;
 }
 renderQueue(q,cur);
 renderCurrent(cur,q);
 if(cur)renderDispos(cur);
 if(cur?.id){
   lastFullRenderAccountId=cur.id;
   scheduleHistoryLoad(cur.id);
 }
}
function updatePortfolioFilter(all){
 let sel=document.getElementById('portfolioFilter');
 if(!sel)return;
 let v=sel.value;
 let names=[...new Set(all.map(a=>a.portfolio||a.accountDescription).filter(Boolean))].sort();
 let sig=names.join('|');
 if(sel.dataset.sig===sig)return;
 sel.dataset.sig=sig;
 sel.innerHTML='<option value="">All Portfolios</option>'+names.map(n=>`<option>${esc(n)}</option>`).join('');
 sel.value=names.includes(v)?v:'';
}
function renderQueue(q,cur){
 let idx=q.findIndex(a=>a.id===cur?.id);if(idx<0)idx=0;
 let start=Math.max(0,idx-1),next=q.slice(start,start+5);
 let searchValue=document.getElementById('search')?.value||'';
 let searchDigits=normPhone(searchValue);
 if(!accounts.length){
   document.getElementById('queueList').innerHTML='<div class="emptyQueue"><b>No accounts loaded.</b><br>Admin can import a CSV portfolio to start working accounts.</div>';
   document.getElementById('remainingText').textContent='No accounts loaded';
   return;
 }
 document.getElementById('queueList').innerHTML=next.map((a,i)=>{
   let assigned=currentUser.isAdmin?(a.assignedToEmail?`<span class="assignedPill">Assigned: ${esc(a.assignedToEmail)}</span>`:`<span class="unassignedPill">Unassigned</span>`):'';
   let hit=bestPhoneHit(a,searchValue);
   let phoneLine=(searchDigits.length>=3 && hit)?`<div class="qPhoneHit">☎ ${esc(fmtPhone(hit))}<span class="searchModePill">PHONE</span></div>`:'';
   return `<div class="qItem ${a.id===cur?.id?'active':''}" onclick="setCurrent('${a.id}')"><div class="qNum">${start+i+1}</div><div><div class="qName">${esc(nameOf(a))}</div>${phoneLine}<div class="qAcct">${esc(acctNo(a))} <span class="badge">${esc(a.disposition||a.status||'New')}</span></div>${assigned}</div><div class="qBal">${money(a.currentBalance||a.principal||a.originalBalance)}</div></div>`;
 }).join('')||'<div class="emptyQueue"><b>No matching accounts.</b><br>Try a different phone number, name, SSN, address, status, or portfolio.</div>';
 let mode=searchDigits.length>=3?' — phone search first':'';
 document.getElementById('remainingText').textContent=`Showing ${next.length} of ${q.length} matching accounts${mode}`;
}
function renderCurrent(a,q){
 if(!a){
   let total=accounts.length||0;
   let cpt=document.getElementById('centerProgressTitle'); if(cpt)cpt.textContent=`0 of ${total} accounts`;
   let cpf=document.getElementById('centerProgressFill'); if(cpf)cpf.style.width='0%';
   document.getElementById('avatar').textContent='--';
   document.getElementById('accountName').innerHTML='No Account Loaded <span class="badge">Ready</span>';
   document.getElementById('accountNumber').textContent='—';
   document.getElementById('state').textContent='—';
   document.getElementById('creditor').textContent='—';
   document.getElementById('ssn').textContent='—';
   document.getElementById('balance').textContent=money(0);
   document.getElementById('statusDisplay').innerHTML='<span class="badge">—</span>';
   document.getElementById('email').textContent='—';
   renderAllImportedFields(null);
   renderComplianceBanner(null);
   let pp=document.getElementById('paymentPlanSummary'); if(pp)pp.innerHTML='<div class="emptyMain"><b>No accounts yet</b><span>Import a CSV portfolio to start the workflow.</span></div>';
   let pg=document.getElementById('phoneGrid'); if(pg)pg.innerHTML='<div class="muted">No phone numbers until an account is selected.</div>';
   let dg=document.getElementById('dispoGrid'); if(dg)dg.innerHTML='';
   let sd=document.getElementById('selectedDisposition'); if(sd)sd.textContent='Select one';
   let hist=document.getElementById('historyList'); if(hist)hist.innerHTML='No activity yet.';
   return;
 }
 let idx=q.findIndex(x=>x.id===a.id)+1,total=q.length;
 let pct=total?Math.round((idx/total)*100):0;
 let progressText=`${idx||1} of ${total} accounts`;
 let old=document.getElementById('accountProgress'); if(old)old.textContent=`Account ${idx||1} of ${total}`;
 let oldFill=document.getElementById('progressFill'); if(oldFill)oldFill.style.width=pct+'%';
 let cpt=document.getElementById('centerProgressTitle'); if(cpt)cpt.textContent=progressText;
 let cpf=document.getElementById('centerProgressFill'); if(cpf)cpf.style.width=pct+'%';

 document.getElementById('avatar').textContent=initials(a);
 document.getElementById('accountName').innerHTML=esc(nameOf(a))+` <span class="badge">${esc(a.disposition||a.status||'New')}</span>`;
 document.getElementById('accountNumber').textContent=acctNo(a)||'—';
 document.getElementById('state').textContent=[a.state,a.city].filter(Boolean).join(' / ')||'—';
 document.getElementById('creditor').textContent=creditor(a);
 document.getElementById('ssn').textContent=a.ssn||'—';
 document.getElementById('balance').textContent=money(a.currentBalance||a.principal||a.originalBalance);
 document.getElementById('statusDisplay').innerHTML=`<span class="badge">${esc(a.disposition||a.status||'New')}</span>`;
 document.getElementById('email').textContent=a.email||'—';

 renderAllImportedFields(a);
 renderComplianceBanner(a);
 renderPaymentPlanSummary(a.id);
 renderCallInsight(a);
 renderPhones(a);
 renderDispos(a);
}
function renderPhones(a){
 let ps=phones(a).map(p=>normPhone(p)).filter(p=>p.length>=10);
 let seen=new Set();
 ps=ps.filter(p=>{let key=p.slice(-10); if(seen.has(key))return false; seen.add(key); return true;}).slice(0,6);
 let blocked=phoneIsBlocked(a);
 document.getElementById('phoneGrid').innerHTML=ps.map((p,i)=>`<a class="phoneChip ${blocked?'blocked':''}" href="tel:${normPhone(p)}" data-ringcentral-extension-number="${normPhone(p)}" onclick="event.preventDefault(); return dialPhone('${a.id}','${normPhone(p)}')"><div class="phoneIcon">☎</div><div><div class="phoneNum">${fmtPhone(p)}</div><div class="phoneType">${i===0?'Primary':i===1?'Mobile':'Alternate'}</div>${blocked?'<div class="callBlockedNote">Compliance review required</div>':''}</div></a>`).join('')||'<div class="muted">No phone numbers on this account.</div>'
}
function renderDispos(a){document.getElementById('selectedDisposition').textContent=currentDisposition||a?.disposition||'Select one';document.getElementById('dispoGrid').innerHTML=DISPOS.map(d=>`<button class="dispo ${d==='Disputed'?'orangeText':['Promise to Pay','Settled'].includes(d)?'greenText':['Bad Number','DNC'].includes(d)?'redText':d==='Callback'?'purpleText':''} ${(currentDisposition||a?.disposition)===d?'selected':''}" onclick="selectDisposition('${d}')">${d}</button>`).join('')}
async function selectDisposition(d){let cur=getCurrent();if(!cur)return;currentDisposition=d;let old=cur.status,newStatus=d==='Disputed'?'Disputed':d;let body={status:newStatus,disposition:d,updated_at:new Date().toISOString()};if(d==='DNC')body.do_not_call=true;if(d==='Disputed')body.disputed_flag=true;if(d==='Bad Number')body.wrong_number_flag=true;let updated;try{updated=(await dbFetch(`/accounts?id=eq.${cur.id}`,{method:'PATCH',body:JSON.stringify(body)}))[0]}catch(e){delete body.do_not_call;delete body.disputed_flag;delete body.wrong_number_flag;updated=(await dbFetch(`/accounts?id=eq.${cur.id}`,{method:'PATCH',body:JSON.stringify(body)}))[0]}await insertActivity(cur.id,'Status Updated','Disposition set to '+d,'',old,newStatus);await insertAudit('Status Updated','Disposition set to '+d,'account',cur.id);let i=accounts.findIndex(a=>a.id===cur.id);if(i>=0)accounts[i]=toCamel(updated);render();if(d==='Callback')openFollowUpModal('Callback');if(d==='Disputed')openDisputeModal();if(d==='Promise to Pay')openPaymentPlan();}
async function insertActivity(accountId,type,text,phone='',oldStatus='',newStatus=''){await dbFetch('/activity_logs',{method:'POST',body:JSON.stringify([{account_id:accountId,action_type:type,action_text:text,phone_number:phone,old_status:oldStatus,new_status:newStatus,created_by_email:currentUser.email}])}).catch(()=>{})}
async function recordDial(id,phone){document.getElementById('callNumber').textContent=fmtPhone(phone);document.getElementById('lastDialed').textContent='Dialing '+fmtPhone(phone);await dbFetch(`/accounts?id=eq.${id}`,{method:'PATCH',body:JSON.stringify({last_contact_number:phone,updated_at:new Date().toISOString()})}).catch(()=>{});await insertActivity(id,'Outbound Call','Clicked phone number '+fmtPhone(phone),phone);await insertAudit('Outbound Call','Clicked phone '+fmtPhone(phone),'account',id)}

/* COMPLIANCE GUARD + CALL RULES */
function boolish(v){return v===true||v==='true'||v==='Yes'||v==='yes'||v===1||v==='1'}
function cgVal(a,keys,def=''){
  for(let k of keys){if(a&&a[k]!==undefined&&a[k]!==null&&String(a[k]).trim()!=='')return a[k]}
  return def;
}
function cgStateTZ(st){
  st=String(st||'').trim().toUpperCase();
  const eastern=['CT','DC','DE','FL','GA','IN','KY','MA','MD','ME','MI','NC','NH','NJ','NY','OH','PA','RI','SC','TN','VA','VT','WV'];
  const central=['AL','AR','IA','IL','KS','LA','MN','MO','MS','ND','NE','OK','SD','TX','WI'];
  const mountain=['AZ','CO','ID','MT','NM','UT','WY'];
  const pacific=['CA','NV','OR','WA'];
  if(st==='AK')return 'America/Anchorage';
  if(st==='HI')return 'Pacific/Honolulu';
  if(pacific.includes(st))return 'America/Los_Angeles';
  if(mountain.includes(st))return st==='AZ'?'America/Phoenix':'America/Denver';
  if(central.includes(st))return 'America/Chicago';
  return 'America/New_York';
}
function cgNowMinutes(tz){
  try{
    let parts=new Intl.DateTimeFormat('en-US',{timeZone:tz,hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date());
    let h=Number(parts.find(p=>p.type==='hour')?.value||0),m=Number(parts.find(p=>p.type==='minute')?.value||0);
    if(h===24)h=0;return h*60+m;
  }catch(e){let d=new Date();return d.getHours()*60+d.getMinutes()}
}
function cgTimeMinutes(v){let m=String(v||'').match(/^(\d{1,2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):null}
function cgTimeWindow(a){
  let start=String(cgVal(a,['complianceCallStart','preferredCallStart','callWindowStart'],'08:00')).slice(0,5)||'08:00';
  let end=String(cgVal(a,['complianceCallEnd','preferredCallEnd','callWindowEnd'],'21:00')).slice(0,5)||'21:00';
  let tz=String(cgVal(a,['complianceTimeZone','timeZoneOverride','timezoneOverride'],''))||cgStateTZ(a?.state);
  let now=cgNowMinutes(tz),s=cgTimeMinutes(start),e=cgTimeMinutes(end);
  let inside=s===null||e===null?true:(s<=e?(now>=s&&now<=e):(now>=s||now<=e));
  return {start,end,tz,now,inside};
}
function complianceRules(a){
  let status=String(a?.disposition||a?.status||'').toLowerCase();
  let flags=[];
  function add(cond,label,type='block'){if(cond)flags.push({label,type})}
  add(boolish(cgVal(a,['doNotCall','do_not_call','dncFlag'],false))||status==='dnc','Do Not Call','block');
  add(boolish(cgVal(a,['ceaseAndDesist','cease_and_desist'],false)),'Cease & Desist','block');
  add(boolish(cgVal(a,['bankruptcyFlag','bankruptcy_flag','bankruptcy'],false)),'Bankruptcy','block');
  add(boolish(cgVal(a,['deceasedFlag','deceased_flag','deceased'],false)),'Deceased','block');
  add(boolish(cgVal(a,['attorneyRepresented','attorney_represented'],false)),'Attorney Represented','block');
  add(boolish(cgVal(a,['wrongNumberFlag','wrong_number_flag'],false))||status==='bad number','Wrong Number','block');
  add(boolish(cgVal(a,['disputedFlag','disputed_flag'],false))||status==='disputed','Disputed / Frozen','block');
  add(boolish(cgVal(a,['needsManagerReview','needs_manager_review'],false)),'Manager Review Needed','warn');
  let win=cgTimeWindow(a);
  if(!win.inside)flags.push({label:`Outside call window ${win.start}-${win.end} (${win.tz.replace('America/','')})`,type:'warn'});
  if(boolish(cgVal(a,['consentConfirmed','consent_confirmed'],false)))flags.push({label:'Consent on File',type:'good'});
  return {flags,hard:flags.filter(f=>f.type==='block'),warn:flags.filter(f=>f.type==='warn'),good:flags.filter(f=>f.type==='good'),window:win,maxCalls:Number(cgVal(a,['maxCallsPerDay','max_calls_per_day'],2)||2)};
}
function renderComplianceBanner(a){
  let box=document.getElementById('complianceBanner'); if(!box)return;
  if(!a){box.innerHTML='<div class="complianceTop"><div><div class="complianceTitle">🛡️ Compliance Guard</div><div class="complianceSummary">No account selected.</div></div></div>';return}
  let r=complianceRules(a),state=r.hard.length?'block':r.warn.length?'warn':'good';
  let label=r.hard.length?'CALL BLOCKED':r.warn.length?'REVIEW BEFORE CALL':'CLEAR TO CALL';
  let badges=r.flags.length?r.flags.map(f=>`<span class="complianceBadge ${f.type}">${esc(f.label)}</span>`).join(''):'<span class="complianceBadge good">No restrictions saved</span>';
  box.innerHTML=`<div class="complianceTop"><div><div class="complianceTitle">🛡️ Compliance Guard <span class="complianceState ${state}">${label}</span></div><div class="complianceSummary">Call window: ${esc(r.window.start)}-${esc(r.window.end)} ${esc(r.window.tz)} · Daily call limit: ${esc(r.maxCalls)} · State: ${esc(a.state||'Unknown')}</div></div><div class="complianceActions"><button class="outline" onclick="openComplianceGuard()">Review Rules</button></div></div><div class="complianceBadges">${badges}</div>`;
}
function phoneIsBlocked(a){return complianceRules(a).hard.length>0}
async function todayCallCountForAccount(id){
  try{
    let start=todayISO()+'T00:00:00';
    let rows=await dbFetch(`/activity_logs?account_id=eq.${id}&action_type=eq.Outbound%20Call&created_at=gte.${encodeURIComponent(start)}&select=id&limit=1000`);
    return Array.isArray(rows)?rows.length:0;
  }catch(e){return 0}
}
async function complianceCheckBeforeCall(a,phone){
  if(!a)return false;
  let r=complianceRules(a),issues=[...r.hard,...r.warn];
  let calls=await todayCallCountForAccount(a.id);
  if(calls>=r.maxCalls)issues.push({label:`Daily call limit reached (${calls}/${r.maxCalls})`,type:'warn'});
  if(!issues.length)return true;
  let msg='Compliance Guard warning for '+nameOf(a)+'\n\n'+issues.map(x=>'• '+x.label).join('\n')+'\n\nPhone: '+fmtPhone(phone);
  let hard=issues.some(x=>x.type==='block');
  if(hard&&!currentUser.isAdmin){
    alert(msg+'\n\nThis call is blocked. Ask an admin to review or override.');
    await insertActivity(a.id,'Compliance Block','Blocked outbound call to '+fmtPhone(phone)+': '+issues.map(x=>x.label).join(', '),phone).catch(()=>{});
    return false;
  }
  if(hard&&currentUser.isAdmin){
    let ok=confirm(msg+'\n\nADMIN OVERRIDE: Continue and log the override?');
    if(!ok)return false;
    let reason=prompt('Admin override reason:','Reviewed and approved one-time contact attempt.')||'Admin override';
    await insertComplianceEvent(a.id,'Admin Override',reason,phone).catch(()=>{});
    await insertActivity(a.id,'Compliance Override','Admin override for '+fmtPhone(phone)+': '+reason,phone).catch(()=>{});
    return true;
  }
  let ok=confirm(msg+'\n\nContinue with this call attempt?');
  if(!ok)return false;
  await insertComplianceEvent(a.id,'Warning Acknowledged',issues.map(x=>x.label).join(', '),phone).catch(()=>{});
  return true;
}
async function insertComplianceEvent(accountId,eventType,notes,phone=''){
  await dbFetch('/compliance_events',{method:'POST',body:JSON.stringify([{account_id:accountId,event_type:eventType,phone_number:phone,notes,created_by_email:currentUser.email}])});
}
async function dialPhone(id,phone){
  let a=accountById(id)||getCurrent();
  if(!a)return false;
  phone=normPhone(phone);
  let ok=await complianceCheckBeforeCall(a,phone);
  if(!ok)return false;
  window.location.href='tel:'+phone;
  await recordDial(id,phone);
  return false;
}
function openComplianceGuard(){
  let a=getCurrent();
  if(!a)return alert('Open an account first.');
  document.getElementById('complianceGuardModal').classList.add('open');
  fillComplianceForm(a);
}
function fillComplianceForm(a){
  document.getElementById('complianceAccountTitle').textContent=`${nameOf(a)} · Acct ${acctNo(a)||'—'} · ${money(accountBalance(a))}`;
  let r=complianceRules(a);
  let warn=document.getElementById('complianceCurrentWarnings');
  warn.innerHTML=(r.flags.length?r.flags:[{label:'No restrictions saved',type:'good'}]).map(f=>`<span class="complianceBadge ${f.type}">${esc(f.label)}</span>`).join('');
  let set=(id,val)=>{let el=document.getElementById(id);if(el)el.type==='checkbox'?el.checked=boolish(val):el.value=val||''};
  set('cgDoNotCall',cgVal(a,['doNotCall','do_not_call'],false));
  set('cgCease',cgVal(a,['ceaseAndDesist','cease_and_desist'],false));
  set('cgDisputed',cgVal(a,['disputedFlag','disputed_flag'],String(a.status||a.disposition).toLowerCase()==='disputed'));
  set('cgBankruptcy',cgVal(a,['bankruptcyFlag','bankruptcy_flag'],false));
  set('cgDeceased',cgVal(a,['deceasedFlag','deceased_flag'],false));
  set('cgAttorney',cgVal(a,['attorneyRepresented','attorney_represented'],false));
  set('cgWrongNumber',cgVal(a,['wrongNumberFlag','wrong_number_flag'],String(a.status||a.disposition).toLowerCase()==='bad number'));
  set('cgNeedsReview',cgVal(a,['needsManagerReview','needs_manager_review'],false));
  set('cgConsent',cgVal(a,['consentConfirmed','consent_confirmed'],false));
  set('cgCallStart',String(cgVal(a,['complianceCallStart','preferredCallStart'],'08:00')).slice(0,5)||'08:00');
  set('cgCallEnd',String(cgVal(a,['complianceCallEnd','preferredCallEnd'],'21:00')).slice(0,5)||'21:00');
  set('cgMaxCalls',cgVal(a,['maxCallsPerDay','max_calls_per_day'],2));
  set('cgTimeZone',cgVal(a,['complianceTimeZone','timeZoneOverride'],''));
  set('cgConsentDate',String(cgVal(a,['consentDate','consent_date'],'')).slice(0,10));
  set('cgAttorneyName',cgVal(a,['attorneyName','attorney_name'],''));
  set('cgRestrictionSource',cgVal(a,['restrictionSource','restriction_source'],''));
  set('cgNotes',cgVal(a,['complianceNotes','compliance_notes'],''));
}
function resetComplianceForm(){let a=getCurrent();if(a)fillComplianceForm(a)}
async function saveComplianceGuard(){
  if(!currentUser.isAdmin)return alert('Admin only');
  let a=getCurrent(); if(!a)return;
  let body={
    do_not_call:document.getElementById('cgDoNotCall').checked,
    cease_and_desist:document.getElementById('cgCease').checked,
    disputed_flag:document.getElementById('cgDisputed').checked,
    bankruptcy_flag:document.getElementById('cgBankruptcy').checked,
    deceased_flag:document.getElementById('cgDeceased').checked,
    attorney_represented:document.getElementById('cgAttorney').checked,
    wrong_number_flag:document.getElementById('cgWrongNumber').checked,
    needs_manager_review:document.getElementById('cgNeedsReview').checked,
    consent_confirmed:document.getElementById('cgConsent').checked,
    compliance_call_start:val('cgCallStart')||'08:00',
    compliance_call_end:val('cgCallEnd')||'21:00',
    max_calls_per_day:Number(val('cgMaxCalls')||2),
    compliance_time_zone:val('cgTimeZone')||null,
    consent_date:val('cgConsentDate')||null,
    attorney_name:val('cgAttorneyName'),
    restriction_source:val('cgRestrictionSource'),
    compliance_notes:val('cgNotes'),
    compliance_updated_by_email:currentUser.email,
    compliance_updated_at:new Date().toISOString(),
    updated_at:new Date().toISOString()
  };
  if(body.do_not_call){body.status='DNC';body.disposition='DNC'}
  else if(body.disputed_flag){body.status='Disputed';body.disposition='Disputed'}
  else if(body.wrong_number_flag){body.status='Bad Number';body.disposition='Bad Number'}
  try{
    let updated=(await dbFetch(`/accounts?id=eq.${a.id}`,{method:'PATCH',body:JSON.stringify(body)}))[0];
    let i=accounts.findIndex(x=>String(x.id)===String(a.id)); if(i>=0)accounts[i]=toCamel(updated);
    await insertComplianceEvent(a.id,'Rules Updated','Compliance flags updated in Compliance Guard.');
    await insertActivity(a.id,'Compliance Updated','Compliance Guard rules updated.');
    await insertAudit('Compliance Updated','Updated compliance rules for '+nameOf(a),'account',a.id);
    closeModal('complianceGuardModal');
    render();
  }catch(e){alert('Compliance columns are not ready yet. Run RUN_THIS_COMPLIANCE_GUARD_SQL.sql in Supabase, then reload.\n\n'+e.message)}
}

async function loadHistory(id){if(!id)return;try{let notes=await dbFetch(`/account_notes?account_id=eq.${id}&select=*&order=created_at.desc&limit=20`),acts=await dbFetch(`/activity_logs?account_id=eq.${id}&select=*&order=created_at.desc&limit=20`);let events=[...acts.map(x=>({date:x.created_at,type:x.action_type,text:x.action_text})),...notes.map(x=>({date:x.created_at,type:'Note',text:x.note}))].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,8);document.getElementById('activityList').innerHTML=events.map(e=>`<div class="event"><div class="eventTitle">${esc(e.type)}</div><div>${esc(e.text)}</div><div class="eventMeta">${new Date(e.date).toLocaleString()}</div></div>`).join('')||'<div class="muted">No activity yet.</div>'}catch{}}
document.getElementById('agentNote').addEventListener('input',()=>{let v=document.getElementById('agentNote').value;document.getElementById('noteCounter').textContent=v.length+' / 2000'})


let assignmentPreviewRows=[];
function selectedEmployeeEmails(){
 let sel=document.getElementById('assignEmployeeSelect');
 let selected=sel?[...sel.selectedOptions].map(o=>o.value.toLowerCase().trim()).filter(validEmail):[];
 return [...new Set(selected.filter(e=>e!==ADMIN_EMAIL))];
}
function parseAssignEmails(){return selectedEmployeeEmails()}
function addManualEmployeeOption(){alert('Manual employee add is disabled. Employees must sign up and be approved by admin.')}
function employeeSuggestions(){
 let set=new Set();
 appUsers.forEach(u=>{
   let email=(u.email||'').toLowerCase();
   let role=(u.role||'employee').toLowerCase();
   let approved=(u.isApproved===true || u.is_approved===true || u.approvalStatus==='approved' || u.approval_status==='approved');
   let active=(u.isActive!==false && u.is_active!==false);
   if(email&&validEmail(email)&&!isAdminEmail(email)&&role!=='admin'&&approved&&active)set.add(email);
 });
 return [...set].sort();
}
function populateEmployeeSelect(){
 let sel=document.getElementById('assignEmployeeSelect'), notice=document.getElementById('employeeEmptyNotice');
 if(!sel)return;
 let previous=new Set([...sel.selectedOptions].map(o=>o.value));
 let employees=employeeSuggestions();
 sel.innerHTML=employees.map(email=>{
   let u=appUsers.find(x=>(x.email||'').toLowerCase()===email);
   let label=email+(u?.lastSeenAt?' — last login '+String(u.lastSeenAt).slice(0,10):'');
   return `<option value="${esc(email)}" ${previous.has(email)?'selected':''}>${esc(label)}</option>`;
 }).join('');
 if(notice)notice.classList.toggle('hidden',employees.length>0);
}
async function refreshEmployeeDropdown(){
 await loadAppUsers();
 populateEmployeeSelect();
 previewAssignment();
}
function normalizeList(v){return String(v||'').split(/[,;]+/).map(x=>x.trim().toLowerCase()).filter(Boolean)}
function assignedEmail(a){return (a.assignedToEmail||a.assigned_to_email||'').toLowerCase()}
async function openAssignModal(){
 if(!currentUser.isAdmin)return alert('Admin only');
 fillAssignFilterOptions();
 document.getElementById('assignModal').classList.add('open');
 await loadAppUsers();
 populateEmployeeSelect();
 previewAssignment();
}
function fillAssignFilterOptions(){
 let pf=document.getElementById('assignPortfolio'), st=document.getElementById('assignStatus');
 if(pf){
   let v=pf.value,names=[...new Set(accounts.map(a=>a.portfolio||a.accountDescription).filter(Boolean))].sort();
   pf.innerHTML='<option value="">All Portfolios</option>'+names.map(n=>`<option>${esc(n)}</option>`).join('');
   pf.value=names.includes(v)?v:'';
 }
 if(st){
   let v=st.value,names=[...new Set(accounts.map(a=>a.disposition||a.status||'New').filter(Boolean))].sort();
   st.innerHTML='<option value="">All Statuses</option>'+names.map(n=>`<option>${esc(n)}</option>`).join('');
   st.value=names.includes(v)?v:'';
 }
}
function assignmentBaseRows(){
 let useQueue=document.getElementById('assignUseCurrentQueue')?.checked;
 let rows=useQueue?queue().slice():accounts.slice();
 let onlyUn=document.getElementById('assignOnlyUnassigned')?.checked;
 let replace=document.getElementById('assignReplaceExisting')?.checked;
 if(onlyUn&&!replace)rows=rows.filter(a=>!assignedEmail(a));
 let excludeClosed=document.getElementById('assignExcludeClosed')?.checked;
 if(excludeClosed)rows=rows.filter(a=>!['settled','dnc','closed','paid'].includes(String(a.disposition||a.status||'').toLowerCase()));
 let pf=document.getElementById('assignPortfolio')?.value||'';
 if(pf)rows=rows.filter(a=>(a.portfolio||a.accountDescription||'')===pf);
 let st=document.getElementById('assignStatus')?.value||'';
 if(st)rows=rows.filter(a=>(a.disposition||a.status||'New')===st);
 let states=normalizeList(document.getElementById('assignStates')?.value);
 if(states.length)rows=rows.filter(a=>states.includes(String(a.state||'').toLowerCase()));
 let cities=normalizeList(document.getElementById('assignCities')?.value);
 if(cities.length)rows=rows.filter(a=>cities.includes(String(a.city||'').toLowerCase()));
 let min=moneyNum(document.getElementById('assignMinBalance')?.value);
 let maxRaw=document.getElementById('assignMaxBalance')?.value;
 let max=maxRaw===''?null:moneyNum(maxRaw);
 if(min)rows=rows.filter(a=>accountBalance(a)>=min);
 if(max!==null)rows=rows.filter(a=>accountBalance(a)<=max);
 let s=(document.getElementById('assignSearch')?.value||'').toLowerCase().trim();
 if(s)rows=rows.filter(a=>{
   let raw=rawObj(a);
   let text=(FIELDS.map(k=>a[k]).join(' ')+' '+Object.keys(raw).join(' ')+' '+Object.values(raw).join(' ')).toLowerCase();
   return text.includes(s);
 });
 return rows;
}
function shuffle(arr){
 let a=arr.slice();
 for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
 return a;
}
function sortAssignmentRows(rows,method){
 let r=rows.slice();
 if(method==='random')return shuffle(r);
 if(method==='balanceHigh')return r.sort((a,b)=>accountBalance(b)-accountBalance(a));
 if(method==='balanceLow')return r.sort((a,b)=>accountBalance(a)-accountBalance(b));
 if(method==='state')return r.sort((a,b)=>String(a.state||'').localeCompare(String(b.state||''))||accountBalance(b)-accountBalance(a));
 if(method==='city')return r.sort((a,b)=>String(a.city||'').localeCompare(String(b.city||''))||accountBalance(b)-accountBalance(a));
 return r;
}
function buildAssignments(){
 let employees=parseAssignEmails();
 let rows=assignmentBaseRows();
 let method=document.getElementById('assignMethod')?.value||'random';
 rows=sortAssignmentRows(rows,method);
 let count=Math.max(1,parseInt(document.getElementById('assignCount')?.value||'1',10));
 let mode=document.getElementById('assignCountMode')?.value||'total';
 let totalWanted=mode==='each'?count*employees.length:count;
 let selected=rows.slice(0,totalWanted);
 let style=document.getElementById('assignStyle')?.value||'roundRobin';
 let assignments=[];
 if(!employees.length)return {employees,rows,assignments};
 if(style==='block'){
   let per=mode==='each'?count:Math.ceil(selected.length/employees.length);
   selected.forEach((a,i)=>assignments.push({account:a,email:employees[Math.min(employees.length-1,Math.floor(i/per))]}));
 }else{
   selected.forEach((a,i)=>assignments.push({account:a,email:employees[i%employees.length]}));
 }
 return {employees,rows,assignments};
}
function previewAssignment(){
 let built=buildAssignments();
 assignmentPreviewRows=built.assignments;
 let byEmp={};
 built.assignments.forEach(x=>{byEmp[x.email]=(byEmp[x.email]||0)+1});
 let totalBal=built.assignments.reduce((s,x)=>s+accountBalance(x.account),0);
 let mc=document.getElementById('assignMatchCount'); if(mc)mc.textContent=built.rows.length;
 let wc=document.getElementById('assignWillCount'); if(wc)wc.textContent=built.assignments.length;
 let ec=document.getElementById('assignEmployeeCount'); if(ec)ec.textContent=built.employees.length;
 let pe=document.getElementById('assignPerEmployee'); if(pe)pe.textContent=built.employees.length?Object.values(byEmp).join(' / '):'0';
 let tb=document.getElementById('assignTotalBalance'); if(tb)tb.textContent=money(totalBal);
 let box=document.getElementById('assignPreview'); if(!box)return;
 let rows=built.assignments.slice(0,200);
 if(!built.assignments.length){
   let msg=!built.employees.length?'Select at least one approved employee from the dropdown. If none appear, approve employees in Manage Employees first.':(!built.rows.length?'No matching accounts. Clear filters or uncheck Only unassigned / enable Allow reassignment.':'No assignments built. Check assignment count.');
   box.innerHTML=`<div class="assignmentNoMatch">${esc(msg)}</div>`;
   return;
 }
 box.innerHTML=`<table><thead><tr><th>#</th><th>Assign To</th><th>Name</th><th>Account</th><th>State</th><th>City</th><th>Balance</th><th>Current Assignment</th></tr></thead><tbody>`+
 rows.map((x,i)=>`<tr><td>${i+1}</td><td><span class="assignTag">${esc(x.email)}</span></td><td>${esc(nameOf(x.account))}</td><td>${esc(acctNo(x.account))}</td><td>${esc(x.account.state||'')}</td><td>${esc(x.account.city||'')}</td><td>${money(accountBalance(x.account))}</td><td>${esc(assignedEmail(x.account)||'Unassigned')}</td></tr>`).join('')+
 `</tbody></table>${built.assignments.length>200?`<div class="assignWarning">Showing first 200 of ${built.assignments.length} assignments.</div>`:''}`;
}
async function saveSmartAssignment(){
 if(!currentUser.isAdmin)return alert('Admin only');
 let built=buildAssignments();
 if(!built.employees.length)return alert('Enter at least one valid employee email.');
 if(!built.assignments.length){
   let reason='No accounts matched your criteria.\n\n';
   if(!accounts.length)reason+='No accounts are loaded in the app. Reload, check Supabase RLS/SQL, or import accounts first.\n';
   else if(!built.rows.length)reason+='Your filters removed every account. Try clearing State, City, Portfolio, Status, Min/Max Balance, Search, or uncheck Only unassigned.\n';
   else reason+='Accounts matched filters, but assignment count/employees produced zero assignments. Check count and selected employees.\n';
   reason+='\nCurrent settings: Only unassigned='+Boolean(document.getElementById('assignOnlyUnassigned')?.checked)+', Allow reassignment='+Boolean(document.getElementById('assignReplaceExisting')?.checked)+'.';
   return alert(reason);
 }
 let ok=confirm('Assign '+built.assignments.length+' account(s) to '+built.employees.length+' employee(s)?');
 if(!ok)return;
 let groupId=crypto.randomUUID?crypto.randomUUID():String(Date.now());
 let method=document.getElementById('assignMethod')?.value||'random';
 let byEmail={};
 built.assignments.forEach(x=>{(byEmail[x.email]=byEmail[x.email]||[]).push(x.account.id)});
 for(let [email,ids] of Object.entries(byEmail)){
   for(let i=0;i<ids.length;i+=100){
     let chunk=ids.slice(i,i+100);
     await dbFetch(`/accounts?id=in.(${chunk.join(',')})`,{method:'PATCH',body:JSON.stringify({
       assigned_to_email:email,
       assigned_by_email:currentUser.email,
       assigned_at:new Date().toISOString(),
       assignment_method:method,
       assignment_group_id:groupId,
       updated_at:new Date().toISOString()
     })});
   }
 }
 // Activity log per first 100 assigned accounts to avoid huge log spam.
 for(let x of built.assignments.slice(0,100)){
   await insertActivity(x.account.id,'Assigned','Assigned to '+x.email+' by '+currentUser.email+' using '+method).catch(()=>{});
 }
 alert('Assigned '+built.assignments.length+' account(s).');
 closeModal('assignModal');
 await loadAccounts();
}
async function clearAssignmentsForFiltered(){
 if(!currentUser.isAdmin)return alert('Admin only');
 let built=buildAssignments();
 let ids=built.assignments.map(x=>x.account.id);
 if(!ids.length){
   ids=assignmentBaseRows().slice(0,Math.max(1,parseInt(document.getElementById('assignCount')?.value||'1',10))).map(a=>a.id);
 }
 if(!ids.length)return alert('No accounts to clear.');
 let ok=confirm('Clear assignment from '+ids.length+' account(s)?');
 if(!ok)return;
 for(let i=0;i<ids.length;i+=100){
   let chunk=ids.slice(i,i+100);
   await dbFetch(`/accounts?id=in.(${chunk.join(',')})`,{method:'PATCH',body:JSON.stringify({
     assigned_to_email:null,assigned_by_email:null,assigned_at:null,assignment_method:null,assignment_group_id:null,updated_at:new Date().toISOString()
   })});
 }
 alert('Assignments cleared for '+ids.length+' account(s).');
 await loadAccounts();
 previewAssignment();
}


async function openEmployeeAdminModal(){
 if(!currentUser.isAdmin)return alert('Admin only');
 document.getElementById('employeeAdminModal').classList.add('open');
 await loadEmployeeAdminList();
}
function userApprovalStatus(u){
 if(isProtectedAdminEmail((u.email||'').toLowerCase()))return 'admin';
 return (u.approvalStatus||u.approval_status||'pending').toLowerCase();
}
async function loadEmployeeAdminList(){
 await loadAppUsers();
 let body=document.getElementById('employeeAdminBody');
 if(!body)return;
 let users=appUsers.slice().sort((a,b)=>{
   let sa=userApprovalStatus(a), sb=userApprovalStatus(b);
   let order={pending:0,approved:1,rejected:2,removed:3,admin:4};
   return (order[sa]??9)-(order[sb]??9)||String(a.email||'').localeCompare(String(b.email||''));
 });
 let pending=users.filter(u=>userApprovalStatus(u)==='pending').length;
 let approved=users.filter(u=>userApprovalStatus(u)==='approved').length;
 let removed=users.filter(u=>userApprovalStatus(u)==='removed').length;
 document.getElementById('empStatAll').textContent=users.length+' users';
 document.getElementById('empStatPending').textContent=pending+' pending';
 document.getElementById('empStatApproved').textContent=approved+' approved'+(removed?` / ${removed} removed`:'');
 body.innerHTML=users.map(u=>{
   let email=(u.email||'').toLowerCase();
   let status=userApprovalStatus(u);
   let statusClass=status==='approved'?'statusApproved':status==='admin'?'statusAdmin':status==='rejected'?'statusRejected':status==='removed'?'statusRemoved':'statusPending';
   let active=(u.isActive!==false && u.is_active!==false);
   let assignedCount=accounts.filter(a=>(a.assignedToEmail||'').toLowerCase()===email).length;
   let removedInfo=status==='removed'?`<div class="fireNote">Removed by: ${esc(u.removedByEmail||u.removed_by_email||'—')}<br>Removed at: ${esc(String(u.removedAt||u.removed_at||'').slice(0,19)||'—')}</div>`:'';
   let actions=isProtectedAdminEmail(email)
     ? '<span class="muted">Admin account</span>'
     : `<div class="empActions">
          <button class="green" onclick="setEmployeeApproval('${esc(email)}','approved')">Approve</button>
          <button class="gray" onclick="setEmployeeApproval('${esc(email)}','pending')">Pending</button>
          <button class="red" onclick="setEmployeeApproval('${esc(email)}','rejected')">Reject</button>
          <button class="outline" onclick="toggleEmployeeActive('${esc(email)}',${active?'false':'true'})">${active?'Deactivate':'Activate'}</button>
          <button class="red" onclick="removeEmployeeFromSoftware('${esc(email)}')">Remove / Fired</button>
        </div>`;
   return `<tr class="${status==='removed'?'removedEmployeeRow':''}">
     <td><b>${esc(email)}</b>${removedInfo}</td>
     <td>${esc(u.role||'employee')}</td>
     <td><span class="employeeStatus ${statusClass}">${esc(status)}</span></td>
     <td>${active?'Yes':'No'}</td>
     <td>${esc(String(u.createdAt||u.created_at||'').slice(0,19))}</td>
     <td>${esc(String(u.lastSeenAt||u.last_seen_at||'').slice(0,19))}<div class="fireNote">Assigned accounts: ${assignedCount}</div></td>
     <td>${actions}</td>
   </tr>`;
 }).join('')||'<tr><td colspan="7">No signed-up users yet.</td></tr>';
 populateEmployeeSelect();
 previewAssignment();
}
async function setEmployeeApproval(email,status){
 if(!currentUser.isAdmin)return alert('Admin only');
 email=String(email||'').toLowerCase();
 if(isProtectedAdminEmail(email))return alert('Cannot change admin approval.');
 let body={
   approval_status:status,
   is_approved:status==='approved',
   is_active:status==='approved',
   updated_at:new Date().toISOString()
 };
 if(status!=='removed'){
   body.removed_at=null;
   body.removed_by_email=null;
   body.removal_reason=null;
 }
 await dbFetch('/app_users?email=eq.'+encodeURIComponent(email),{method:'PATCH',body:JSON.stringify(body)});
 await loadEmployeeAdminList();
}
async function toggleEmployeeActive(email,active){
 if(!currentUser.isAdmin)return alert('Admin only');
 email=String(email||'').toLowerCase();
 if(isProtectedAdminEmail(email))return alert('Cannot deactivate admin.');
 await dbFetch('/app_users?email=eq.'+encodeURIComponent(email),{method:'PATCH',body:JSON.stringify({is_active:active,updated_at:new Date().toISOString()})});
 await loadEmployeeAdminList();
}

async function removeEmployeeFromSoftware(email){
 if(!currentUser.isAdmin)return alert('Admin only');
 email=String(email||'').toLowerCase();
 if(isProtectedAdminEmail(email))return alert('You cannot remove the admin account.');
 let assigned=accounts.filter(a=>(a.assignedToEmail||'').toLowerCase()===email);
 let msg='Remove '+email+' from the software?\n\nThis will:\n- Block this employee from logging into the CRM\n- Remove them from assignment dropdowns\n- Mark them as Removed / Fired\n- Return '+assigned.length+' assigned account(s) back to unassigned queue';
 if(!confirm(msg))return;
 let reason=prompt('Optional removal reason:', 'Fired / no longer with company')||'Fired / removed';
 await dbFetch('/app_users?email=eq.'+encodeURIComponent(email),{
   method:'PATCH',
   body:JSON.stringify({
     approval_status:'removed',
     is_approved:false,
     is_active:false,
     removed_at:new Date().toISOString(),
     removed_by_email:currentUser.email,
     removal_reason:reason,
     updated_at:new Date().toISOString()
   })
 });
 if(assigned.length){
   await dbFetch('/accounts?assigned_to_email=eq.'+encodeURIComponent(email),{
     method:'PATCH',
     body:JSON.stringify({
       assigned_to_email:null,
       assigned_by_email:currentUser.email,
       assigned_at:null,
       assignment_method:'employee_removed',
       assignment_group_id:null,
       updated_at:new Date().toISOString()
     })
   });
 }
 alert(email+' was removed. '+assigned.length+' account(s) returned to unassigned queue.');
 await loadAccounts();
 await loadEmployeeAdminList();
 if(document.getElementById('employeeMonitorModal')?.classList.contains('open'))await loadEmployeeMonitor();
}



let monitorData={activities:[],notes:[],plans:[],rows:[],lastRows:[]};

function monitorRangeStart(){
 let r=document.getElementById('monitorRange')?.value||'30';
 if(r==='all')return '';
 let d=new Date();
 if(r==='today'){d.setHours(0,0,0,0);return d.toISOString()}
 d.setDate(d.getDate()-Number(r||30));
 return d.toISOString();
}
async function openEmployeeMonitorModal(){
 if(!currentUser.isAdmin)return alert('Admin only');
 document.getElementById('employeeMonitorModal').classList.add('open');
 await loadEmployeeMonitor();
}
async function loadEmployeeMonitor(){
 if(!currentUser.isAdmin)return;
 await loadAppUsers().catch(()=>{});
 if(!accounts.length)await loadAccounts();
 let start=monitorRangeStart();
 let suffix=start?'&created_at=gte.'+encodeURIComponent(start):'';
 let acts=[],notes=[],plans=[];
 try{acts=await dbFetch('/activity_logs?select=*&order=created_at.desc&limit=50000'+suffix)}catch(e){console.warn('monitor activity load failed',e)}
 try{notes=await dbFetch('/account_notes?select=*&order=created_at.desc&limit=50000'+suffix)}catch(e){console.warn('monitor notes load failed',e)}
 try{plans=await dbFetch('/payment_plans?select=*&order=created_at.desc&limit=50000'+suffix)}catch(e){plans=[]}
 monitorData.activities=(acts||[]).map(toCamel);
 monitorData.notes=(notes||[]).map(toCamel);
 monitorData.plans=(plans||[]).map(toCamel);
 fillMonitorFilters();
 renderEmployeeMonitor();
}
function monitorEmployees(){
 let set=new Set();
 appUsers.forEach(u=>{
   let email=(u.email||'').toLowerCase();
   if(email&&!isAdminEmail(email)&&u.role!=='admin')set.add(email);
 });
 accounts.forEach(a=>{let e=(a.assignedToEmail||'').toLowerCase();if(e)set.add(e)});
 monitorData.activities.forEach(a=>{let e=(a.createdByEmail||'').toLowerCase();if(e&&!isAdminEmail(e))set.add(e)});
 monitorData.notes.forEach(n=>{let e=(n.createdByEmail||'').toLowerCase();if(e&&!isAdminEmail(e))set.add(e)});
 return [...set].filter(Boolean).sort();
}
function fillMonitorFilters(){
 let empSel=document.getElementById('monitorEmployeeFilter');
 let stSel=document.getElementById('monitorStatusFilter');
 if(empSel){
   let keep=empSel.value;
   let emps=monitorEmployees();
   empSel.innerHTML='<option value="">All Employees</option>'+emps.map(e=>`<option value="${esc(e)}">${esc(e)}</option>`).join('');
   empSel.value=emps.includes(keep)?keep:'';
 }
 if(stSel){
   let keep=stSel.value;
   let statuses=[...new Set(accounts.map(a=>a.disposition||a.status||'New').filter(Boolean))].sort();
   stSel.innerHTML='<option value="">All Statuses</option>'+statuses.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('');
   stSel.value=statuses.includes(keep)?keep:'';
 }
}
function actEmail(a){return (a.createdByEmail||a.created_by_email||'').toLowerCase()}
function noteEmail(n){return (n.createdByEmail||n.created_by_email||'').toLowerCase()}
function planEmail(p){return (p.createdByEmail||p.created_by_email||'').toLowerCase()}
function isCallActivity(a){return /call|dial/i.test(a.actionType||a.action_type||'') || /clicked phone|dialing/i.test(a.actionText||a.action_text||'')}
function isStatusActivity(a){return /status|disposition/i.test(a.actionType||a.action_type||'') || /disposition set|status/i.test(a.actionText||a.action_text||'')}
function accountStatus(a){return a.disposition||a.status||'New'}
function monitorBuildRows(){
 let emps=monitorEmployees();
 let rows=emps.map(email=>{
   let assigned=accounts.filter(a=>(a.assignedToEmail||'').toLowerCase()===email);
   let acts=monitorData.activities.filter(a=>actEmail(a)===email);
   let notes=monitorData.notes.filter(n=>noteEmail(n)===email);
   let plans=monitorData.plans.filter(p=>planEmail(p)===email || assigned.some(a=>a.id===p.accountId));
   let calls=acts.filter(isCallActivity);
   let statusActs=acts.filter(isStatusActivity);
   let statusCounts={};
   assigned.forEach(a=>{let s=accountStatus(a);statusCounts[s]=(statusCounts[s]||0)+1});
   let balance=assigned.reduce((s,a)=>s+accountBalance(a),0);
   let touchedIds=new Set([...acts.map(a=>a.accountId),...notes.map(n=>n.accountId)].filter(Boolean));
   return {email,assigned,assignedCount:assigned.length,acts,notes,plans,calls,statusActs,statusCounts,balance,touchedCount:touchedIds.size};
 });
 return rows;
}
function filteredMonitorRows(){
 let rows=monitorBuildRows();
 let emp=document.getElementById('monitorEmployeeFilter')?.value||'';
 let st=document.getElementById('monitorStatusFilter')?.value||'';
 let q=(document.getElementById('monitorSearch')?.value||'').toLowerCase().trim();
 if(emp)rows=rows.filter(r=>r.email===emp);
 if(st)rows=rows.map(r=>({...r,assigned:r.assigned.filter(a=>accountStatus(a)===st),assignedCount:r.assigned.filter(a=>accountStatus(a)===st).length})).filter(r=>r.assignedCount>0);
 if(q)rows=rows.filter(r=>{
   let acctText=r.assigned.map(a=>[nameOf(a),acctNo(a),a.city,a.state,a.portfolio,a.originalCreditor,accountStatus(a)].join(' ')).join(' ');
   return (r.email+' '+acctText).toLowerCase().includes(q);
 });
 return rows;
}
function renderEmployeeMonitor(){
 let rows=filteredMonitorRows();
 monitorData.lastRows=rows;
 let totalAssigned=rows.reduce((s,r)=>s+r.assignedCount,0);
 let totalCalls=rows.reduce((s,r)=>s+r.calls.length,0);
 let totalStatused=rows.reduce((s,r)=>s+r.statusActs.length,0);
 let totalNotes=rows.reduce((s,r)=>s+r.notes.length,0);
 let totalBal=rows.reduce((s,r)=>s+r.balance,0);
 document.getElementById('monEmployees').textContent=rows.length;
 document.getElementById('monAssigned').textContent=totalAssigned;
 document.getElementById('monCalls').textContent=totalCalls;
 document.getElementById('monStatused').textContent=totalStatused;
 document.getElementById('monNotes').textContent=totalNotes;
 document.getElementById('monBalance').textContent=money(totalBal);

 let maxAssigned=Math.max(1,...rows.map(r=>r.assignedCount));
 let body=document.getElementById('employeeMonitorBody');
 if(!body)return;
 body.innerHTML=rows.map(r=>{
   let buckets=Object.entries(r.statusCounts).sort((a,b)=>b[1]-a[1]).map(([s,c])=>`<button class="monitorStatusBtn" onclick="showMonitorStatus('${esc(r.email)}','${esc(s)}')">${esc(s)}: ${c}</button>`).join('')||'<span class="muted">No assigned accounts</span>';
   let callRate=r.assignedCount?Math.round((r.calls.length/r.assignedCount)*100):0;
   return `<tr>
     <td><div class="monitorEmployee monitorClick" onclick="showMonitorEmployee('${esc(r.email)}')">${esc(r.email)}</div><div class="monitorSub">${r.touchedCount} account(s) touched</div></td>
     <td><b>${r.assignedCount}</b><div class="monitorBar"><div class="monitorBarFill" style="width:${Math.min(100,(r.assignedCount/maxAssigned)*100)}%"></div></div></td>
     <td><b>${r.calls.length}</b><div class="monitorSub">${callRate}% call/account ratio</div></td>
     <td><b>${r.statusActs.length}</b></td>
     <td><b>${r.notes.length}</b></td>
     <td><b>${r.plans.length}</b></td>
     <td class="monitorMoney">${money(r.balance)}</td>
     <td>${buckets}</td>
   </tr>`;
 }).join('')||'<tr><td colspan="8"><div class="monitorEmpty">No employee activity or assigned accounts found for this filter.</div></td></tr>';
}
function monitorAccountCard(a){
 let phone=(phones(a)[0]||'').replace(/\D/g,'');
 return `<div class="monitorAccountCard">
   <div class="monitorAccountTop">
     <div>
       <div class="monitorAccountName">${esc(nameOf(a))}</div>
       <div class="monitorAccountMeta">
        Account: ${esc(acctNo(a))}<br>
        State/City: ${esc(a.state||'—')} / ${esc(a.city||'—')}<br>
        Creditor: ${esc(creditor(a)||'—')}<br>
        Status: <span class="monitorBadge">${esc(accountStatus(a))}</span>
       </div>
     </div>
     <div style="text-align:right">
       <div class="monitorMoney">${money(accountBalance(a))}</div>
       ${phone?`<a href="tel:${phone}" onclick="recordDial('${a.id}','${phone}')">Call ${fmtPhone(phone)}</a>`:''}
     </div>
   </div>
 </div>`;
}
function showMonitorEmployee(email){
 let r=monitorBuildRows().find(x=>x.email===email);
 document.getElementById('monitorDetailTitle').textContent='All assigned accounts — '+email;
 let body=document.getElementById('monitorDetailBody');
 if(!r||!r.assigned.length){body.className='monitorEmpty';body.textContent='No assigned accounts for this employee.';return}
 body.className='';
 body.innerHTML=r.assigned.sort((a,b)=>accountBalance(b)-accountBalance(a)).map(monitorAccountCard).join('');
}
function showMonitorStatus(email,status){
 let r=monitorBuildRows().find(x=>x.email===email);
 let list=r?r.assigned.filter(a=>accountStatus(a)===status):[];
 document.getElementById('monitorDetailTitle').textContent=status+' accounts — '+email;
 let body=document.getElementById('monitorDetailBody');
 if(!list.length){body.className='monitorEmpty';body.textContent='No accounts under this status.';return}
 body.className='';
 body.innerHTML=list.sort((a,b)=>accountBalance(b)-accountBalance(a)).map(monitorAccountCard).join('');
}
function clearMonitorDetail(){
 document.getElementById('monitorDetailTitle').textContent='Employee Account Detail';
 let body=document.getElementById('monitorDetailBody');
 body.className='monitorEmpty';
 body.textContent='Click an employee or a status count to view the accounts here.';
}
function exportEmployeeMonitorCSV(){
 let rows=monitorData.lastRows||filteredMonitorRows();
 let csv=['employee,assigned_accounts,calls_made,status_updates,notes_added,payment_plans,assigned_balance,status_buckets'];
 rows.forEach(r=>{
   let buckets=Object.entries(r.statusCounts).map(([s,c])=>`${s}:${c}`).join(' | ');
   csv.push([r.email,r.assignedCount,r.calls.length,r.statusActs.length,r.notes.length,r.plans.length,r.balance.toFixed(2),buckets].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(','));
 });
 download('employee_monitor_report.csv',csv.join('\n'),'text/csv');
}


/* COLLECTIONS POWER FEATURES */
let workQueueData={followups:[],payments:[],plans:[],accounts:[]};
let promiseData={payments:[],plans:[]};

function accountById(id){return accounts.find(a=>String(a.id)===String(id))}
function currentAssignee(a){return (a?.assignedToEmail||a?.assigned_to_email||currentUser.email||'').toLowerCase()}
function ownsAccount(a){return currentUser.isAdmin || currentAssignee(a)===(currentUser.email||'').toLowerCase()}
function powerDateLabel(d){if(!d)return '—';let x=new Date(String(d)+'T00:00:00');return isNaN(x)?String(d):x.toLocaleDateString()}
function isTodayISO(d){return String(d||'')===todayISO()}
function isPastISO(d){return String(d||'') && String(d)<todayISO()}
function isFutureISO(d){return String(d||'') && String(d)>todayISO()}
async function insertAudit(action,text,targetType='',targetId=''){try{await dbFetch('/audit_logs',{method:'POST',body:JSON.stringify([{action_type:action,action_text:text,target_type:targetType,target_id:String(targetId||''),created_by_email:currentUser.email}])})}catch(e){}}
function setAccountFromModal(id,modalId=''){if(modalId)closeModal(modalId);currentAccountId=id;render()}
function priorityScore(a){let score=0,reasons=[];let bal=accountBalance(a);if(bal>=1000){score+=30;reasons.push('High balance')}else if(bal>=500){score+=20;reasons.push('Medium balance')}else if(bal>0){score+=10;reasons.push('Positive balance')}if(phones(a).length){score+=20;reasons.push('Phone available')}if(a.email){score+=8;reasons.push('Email')}if(a.employer||a.origEmployer){score+=12;reasons.push('Employer')}if(a.bankAccountNumber||a.origBankAcctLast4Digits||a.bankRoutingNumber){score+=12;reasons.push('Bank info')}if(a.lastPaymentDate||moneyNum(a.lastPaymentAmount)>0){score+=10;reasons.push('Past payment')}if(['Promise to Pay','Callback'].includes(a.disposition||a.status)){score+=15;reasons.push(a.disposition||a.status)}return{score:Math.min(100,score),reasons}}

function openFollowUpModal(type='Callback'){let a=getCurrent();if(!a)return alert('No account selected.');document.getElementById('fuType').value=type;document.getElementById('fuDate').value=todayISO();document.getElementById('fuTime').value='09:00';document.getElementById('fuStatus').value='Open';document.getElementById('fuAssigned').value=currentAssignee(a);document.getElementById('fuReason').value=type==='Callback'?'Consumer requested callback':'';document.getElementById('fuNotes').value='';document.getElementById('followUpModal').classList.add('open')}
async function saveFollowUp(){
 let btn=document.getElementById('saveFollowUpBtn');
 let status=document.getElementById('followUpSaveStatus');
 function setStatus(msg,cls=''){
   if(status){status.className='saveStatus '+cls;status.textContent=msg||'';}
 }
 try{
   let a=getCurrent();
   if(!a){alert('No account selected.');return;}
   let dueDate=val('fuDate');
   if(!dueDate){alert('Choose a due date.');return;}
   let assigned=(val('fuAssigned')||currentAssignee(a)||currentUser.email||'').trim().toLowerCase();
   if(!assigned){alert('Assigned employee is required.');return;}
   let row={
     account_id:a.id,
     follow_up_type:val('fuType')||'Callback',
     due_date:dueDate,
     due_time:val('fuTime')||null,
     status:val('fuStatus')||'Open',
     assigned_to_email:assigned,
     reason:val('fuReason'),
     notes:val('fuNotes'),
     created_by_email:(currentUser.email||'').toLowerCase()
   };

   if(btn){btn.disabled=true;btn.textContent='Saving...';}
   setStatus('Saving follow-up to database...','busy');

   let saved=await dbFetch('/follow_ups',{
     method:'POST',
     body:JSON.stringify([row])
   });

   setStatus('Follow-up saved. Updating account history...','busy');

   try{await insertActivity(a.id,'Follow-Up Scheduled',`${row.follow_up_type} scheduled for ${row.due_date} ${row.due_time||''}. ${row.reason||''}`)}catch(e){console.warn('activity failed',e)}
   try{await insertAudit('Follow-Up Scheduled',`${row.follow_up_type} for ${nameOf(a)} on ${row.due_date}`,'account',a.id)}catch(e){console.warn('audit failed',e)}
   try{await loadHistory(a.id)}catch(e){console.warn('history refresh failed',e)}

   // If Today Dashboard is open, refresh it so the new callback/promise appears immediately.
   try{
     if(document.getElementById('todayDashboardModal')?.classList.contains('open')){
       await loadTodayDashboard();
     }
   }catch(e){console.warn('today dashboard refresh failed',e)}

   setStatus('Saved successfully.','ok');
   closeModal('followUpModal');
   alert('Follow-up saved.');
 }catch(err){
   let msg=err?.message||String(err);
   setStatus('Save failed: '+msg,'err');
   alert('Save Follow-Up failed:\n\n'+msg+'\n\nIf this says table/policy/permission, run RUN_THIS_FOLLOW_UPS_SQL.sql in Supabase SQL Editor, reload Bolt, and try again.');
 }finally{
   if(btn){btn.disabled=false;btn.textContent='Save Follow-Up';}
 }
}


let todayDashboardData={followups:[],payments:[],plans:[]};
let todayActiveTab='all';

function todayEmployeeOptions(items){
 let sel=document.getElementById('todayEmployeeFilter');
 if(!sel||!currentUser.isAdmin)return;
 let selected=sel.value||'';
 let emails=new Set();
 items.followups.forEach(f=>{if(f.assignedToEmail)emails.add(String(f.assignedToEmail).toLowerCase())});
 items.payments.forEach(p=>{
   let a=accountById(p.accountId);
   if(a?.assignedToEmail)emails.add(String(a.assignedToEmail).toLowerCase());
 });
 accounts.forEach(a=>{if(a.assignedToEmail)emails.add(String(a.assignedToEmail).toLowerCase())});
 let opts=['<option value="">All Employees</option>'].concat([...emails].sort().map(e=>`<option value="${esc(e)}">${esc(e)}</option>`));
 sel.innerHTML=opts.join('');
 sel.value=selected;
}
function todayEmployeeAllowedForFollowUp(f){
 if(!currentUser.isAdmin)return (f.assignedToEmail||'').toLowerCase()===currentUser.email;
 let chosen=(document.getElementById('todayEmployeeFilter')?.value||'').toLowerCase();
 return !chosen || (f.assignedToEmail||'').toLowerCase()===chosen;
}
function todayEmployeeAllowedForPayment(p){
 let a=accountById(p.accountId);
 if(!currentUser.isAdmin)return !!a;
 let chosen=(document.getElementById('todayEmployeeFilter')?.value||'').toLowerCase();
 return !chosen || (a?.assignedToEmail||'').toLowerCase()===chosen;
}
function paymentOwed(p){return Math.max(0,moneyNum(p.amountDue)-moneyNum(p.amountPaid))}
function isUnpaidPayment(p){return !['Paid','Cancelled'].includes(p.status) && paymentOwed(p)>0}
function todayPaymentIsBroken(p){
 let status=String(p.status||'').toLowerCase();
 return status.includes('broken') || (isUnpaidPayment(p) && isPastISO(p.dueDate));
}
function todayPaymentIsDue(p){
 return isUnpaidPayment(p) && String(p.dueDate)<=todayISO();
}
function todayPaymentIsUpcoming(p){
 return isUnpaidPayment(p) && String(p.dueDate)>todayISO();
}
function todayFollowUpOpen(f){
 return !['Completed','Cancelled'].includes(f.status);
}
function todayFollowUpDue(f){
 return todayFollowUpOpen(f) && String(f.dueDate)<=todayISO();
}
function todayFollowUpUpcoming(f){
 return todayFollowUpOpen(f) && String(f.dueDate)>todayISO();
}

async function openTodayDashboard(){
 document.getElementById('todayDashboardModal').classList.add('open');
 await loadTodayDashboard();
}
async function loadTodayDashboard(){
 let fus=[],pays=[],plans=[];
 try{fus=(await dbFetch('/follow_ups?select=*&order=due_date.asc&limit=10000')).map(toCamel)}catch(e){fus=[]}
 try{pays=(await dbFetch('/payment_plan_payments?select=*&order=due_date.asc&limit=10000')).map(toCamel)}catch(e){pays=[]}
 try{plans=(await dbFetch('/payment_plans?select=*&order=created_at.desc&limit=10000')).map(toCamel)}catch(e){plans=[]}

 if(!currentUser.isAdmin){
   fus=fus.filter(todayEmployeeAllowedForFollowUp);
   let allowedIds=new Set(accounts.map(a=>String(a.id)));
   pays=pays.filter(p=>allowedIds.has(String(p.accountId)));
   plans=plans.filter(p=>allowedIds.has(String(p.accountId)));
 }
 todayDashboardData={followups:fus,payments:pays,plans};

 // Keep existing promise/work dashboards compatible with the same data.
 workQueueData={followups:fus,payments:pays,plans,accounts};
 promiseData={payments:pays,plans};

 todayEmployeeOptions(todayDashboardData);
 renderTodayDashboard(todayActiveTab||'all');
}
function todayAllWorkItems(){
 let items=[];
 todayDashboardData.followups.filter(todayEmployeeAllowedForFollowUp).forEach(f=>{
   if(todayFollowUpDue(f)){
     let overdue=isPastISO(f.dueDate);
     items.push({kind:'followup',due:f.dueDate,priority:overdue?1:2,row:f});
   }
 });
 todayDashboardData.payments.filter(todayEmployeeAllowedForPayment).forEach(p=>{
   if(todayPaymentIsBroken(p)){
     items.push({kind:'broken',due:p.dueDate,priority:0,row:p});
   }else if(todayPaymentIsDue(p)){
     items.push({kind:'payment',due:p.dueDate,priority:isPastISO(p.dueDate)?1:2,row:p});
   }
 });
 return items.sort((a,b)=>a.priority-b.priority||String(a.due).localeCompare(String(b.due)));
}
function renderTodayStats(){
 let fus=todayDashboardData.followups.filter(todayEmployeeAllowedForFollowUp);
 let pays=todayDashboardData.payments.filter(todayEmployeeAllowedForPayment);
 let overdueFollowups=fus.filter(f=>todayFollowUpOpen(f)&&isPastISO(f.dueDate)).length;
 let overduePayments=pays.filter(p=>isUnpaidPayment(p)&&isPastISO(p.dueDate)).length;
 let dueFollowups=fus.filter(f=>todayFollowUpOpen(f)&&isTodayISO(f.dueDate)).length;
 let duePayments=pays.filter(p=>isUnpaidPayment(p)&&isTodayISO(p.dueDate)).length;
 let callbacks=fus.filter(f=>todayFollowUpDue(f)&&String(f.followUpType||'').toLowerCase().includes('callback')).length;
 let paymentDue=pays.filter(todayPaymentIsDue).reduce((s,p)=>s+paymentOwed(p),0);
 let broken=pays.filter(todayPaymentIsBroken).length;
 let paidToday=pays.filter(p=>String(p.paidDate||p.paid_date||'').slice(0,10)===todayISO()||String(p.status||'')==='Paid'&&String(p.updatedAt||p.updated_at||'').slice(0,10)===todayISO()).reduce((s,p)=>s+moneyNum(p.amountPaid||p.amount_paid||p.amountDue||p.amount_due),0);

 document.getElementById('todayOverdue').textContent=overdueFollowups+overduePayments;
 document.getElementById('todayDueToday').textContent=dueFollowups+duePayments;
 document.getElementById('todayCallbacks').textContent=callbacks;
 document.getElementById('todayPaymentDue').textContent=money(paymentDue);
 document.getElementById('todayBroken').textContent=broken;
 document.getElementById('todayPaid').textContent=money(paidToday);
}
function setTodayActiveTab(tab){
 todayActiveTab=tab;
 ['All','Callbacks','Payments','Broken','Upcoming'].forEach(t=>{
   document.getElementById('todayTab'+t)?.classList.toggle('active',tab.toLowerCase()===t.toLowerCase());
 });
}
function renderTodayDashboard(tab='all'){
 todayActiveTab=tab;
 setTodayActiveTab(tab);
 renderTodayStats();
 let box=document.getElementById('todayDashboardList');
 if(!box)return;

 if(tab==='callbacks'){
   let list=todayDashboardData.followups.filter(todayEmployeeAllowedForFollowUp).filter(f=>todayFollowUpDue(f)&&String(f.followUpType||'').toLowerCase().includes('callback')).sort((a,b)=>String(a.dueDate).localeCompare(String(b.dueDate)));
   box.innerHTML=list.map(f=>todayFollowUpCard(f)).join('')||'<div class="powerEmpty">No callbacks due today.</div>';
   return;
 }
 if(tab==='payments'){
   let list=todayDashboardData.payments.filter(todayEmployeeAllowedForPayment).filter(todayPaymentIsDue).sort((a,b)=>String(a.dueDate).localeCompare(String(b.dueDate)));
   box.innerHTML=list.map(p=>todayPaymentCard(p)).join('')||'<div class="powerEmpty">No payments due today.</div>';
   return;
 }
 if(tab==='broken'){
   let list=todayDashboardData.payments.filter(todayEmployeeAllowedForPayment).filter(todayPaymentIsBroken).sort((a,b)=>String(a.dueDate).localeCompare(String(b.dueDate)));
   box.innerHTML=list.map(p=>todayPaymentCard(p,true)).join('')||'<div class="powerEmpty">No broken promises right now.</div>';
   return;
 }
 if(tab==='upcoming'){
   let payItems=todayDashboardData.payments.filter(todayEmployeeAllowedForPayment).filter(todayPaymentIsUpcoming).map(p=>({kind:'payment',due:p.dueDate,row:p}));
   let fuItems=todayDashboardData.followups.filter(todayEmployeeAllowedForFollowUp).filter(todayFollowUpUpcoming).map(f=>({kind:'followup',due:f.dueDate,row:f}));
   let list=[...payItems,...fuItems].sort((a,b)=>String(a.due).localeCompare(String(b.due))).slice(0,50);
   box.innerHTML=list.map(x=>x.kind==='payment'?todayPaymentCard(x.row):todayFollowUpCard(x.row)).join('')||'<div class="powerEmpty">No upcoming work found.</div>';
   return;
 }

 let list=todayAllWorkItems();
 box.innerHTML=list.map(x=>x.kind==='followup'?todayFollowUpCard(x.row):todayPaymentCard(x.row,x.kind==='broken')).join('')||'<div class="powerEmpty">Nothing due right now.</div>';
}
function todayFollowUpCard(f){
 let a=accountById(f.accountId);
 let overdue=isPastISO(f.dueDate);
 let type=f.followUpType||'Follow-Up';
 let badge=overdue?'<span class="todayBadge red">OVERDUE</span>':isTodayISO(f.dueDate)?'<span class="todayBadge orange">DUE TODAY</span>':'<span class="todayBadge blue">UPCOMING</span>';
 return `<div class="todayWorkCard">
   <div class="todayWorkTop">
     <div>
       <div class="todayWorkTitle">${esc(type)} — ${esc(a?nameOf(a):'Unknown Account')}</div>
       <div class="todayWorkMeta">
         Due: ${powerDateLabel(f.dueDate)} ${esc(f.dueTime||'')}<br>
         Account: ${esc(a?acctNo(a):'—')} • Balance: ${a?money(accountBalance(a)):'—'} • Assigned: ${esc(f.assignedToEmail||a?.assignedToEmail||'—')}<br>
         Reason: ${esc(f.reason||'—')} ${f.notes?'<br>Notes: '+esc(f.notes):''}
       </div>
     </div>
     ${badge}
   </div>
   <div class="todayWorkActions">
     <button class="outline" onclick="setAccountFromModal('${f.accountId}','todayDashboardModal')">Open Account</button>
     <button class="green" onclick="todayCompleteFollowUp('${f.id}')">Mark Complete</button>
   </div>
 </div>`;
}
function todayPaymentCard(p,forceBroken=false){
 let a=accountById(p.accountId);
 let owed=paymentOwed(p);
 let broken=forceBroken||todayPaymentIsBroken(p);
 let badge=broken?'<span class="todayBadge red">BROKEN</span>':isTodayISO(p.dueDate)?'<span class="todayBadge orange">DUE TODAY</span>':isPastISO(p.dueDate)?'<span class="todayBadge red">OVERDUE</span>':'<span class="todayBadge green">UPCOMING</span>';
 return `<div class="todayWorkCard">
   <div class="todayWorkTop">
     <div>
       <div class="todayWorkTitle">Payment Due — ${esc(a?nameOf(a):'Unknown Account')} — ${money(owed)}</div>
       <div class="todayWorkMeta">
         Due date: ${powerDateLabel(p.dueDate)} • Status: ${esc(p.status||'Scheduled')}<br>
         Account: ${esc(a?acctNo(a):'—')} • Account Balance: ${a?money(accountBalance(a)):'—'} • Assigned: ${esc(a?.assignedToEmail||'—')}<br>
         Amount Due: ${money(moneyNum(p.amountDue))} • Paid: ${money(moneyNum(p.amountPaid))}
       </div>
     </div>
     ${badge}
   </div>
   <div class="todayWorkActions">
     <button class="outline" onclick="setAccountFromModal('${a?.id||p.accountId}','todayDashboardModal')">Open Account</button>
     <button class="green" onclick="todayMarkPaid('${p.id}')">Mark Paid</button>
     ${broken?`<button class="outline" onclick="todayCreateBrokenFollowUp('${p.id}')">Create Follow-Up</button>`:''}
   </div>
 </div>`;
}
async function todayCompleteFollowUp(id){
 await completeFollowUp(id);
 await loadTodayDashboard();
}
async function todayMarkPaid(paymentId){
 await markPromisePaid(paymentId);
 await loadTodayDashboard();
}
async function todayCreateBrokenFollowUp(paymentId){
 let p=todayDashboardData.payments.find(x=>String(x.id)===String(paymentId));
 let a=accountById(p?.accountId);
 if(!p||!a)return alert('Payment/account not found.');
 await dbFetch('/follow_ups',{method:'POST',body:JSON.stringify([{account_id:a.id,follow_up_type:'Broken Promise Follow-Up',due_date:todayISO(),status:'Open',assigned_to_email:(a.assignedToEmail||currentUser.email||''),reason:'Missed payment promise',notes:'Created from Today Dashboard.',created_by_email:currentUser.email}])});
 await insertActivity(a.id,'Broken Promise Follow-Up','Follow-up created from Today Dashboard.');
 await insertAudit('Broken Promise Follow-Up','Created follow-up from Today Dashboard','account',a.id);
 await loadTodayDashboard();
}

async function openDailyWorkQueue(){document.getElementById('dailyWorkQueueModal').classList.add('open');await loadDailyWorkQueue()}
async function loadDailyWorkQueue(){let fus=[],pays=[],plans=[];try{fus=(await dbFetch('/follow_ups?select=*&order=due_date.asc&limit=5000')).map(toCamel)}catch(e){fus=[]}try{pays=(await dbFetch('/payment_plan_payments?select=*&order=due_date.asc&limit=5000')).map(toCamel)}catch(e){pays=[]}try{plans=(await dbFetch('/payment_plans?select=*&order=created_at.desc&limit=5000')).map(toCamel)}catch(e){plans=[]}if(!currentUser.isAdmin){fus=fus.filter(f=>(f.assignedToEmail||'').toLowerCase()===currentUser.email);let allowedIds=new Set(accounts.map(a=>String(a.id)));pays=pays.filter(p=>allowedIds.has(String(p.accountId)));plans=plans.filter(p=>allowedIds.has(String(p.accountId)))}workQueueData={followups:fus,payments:pays,plans,accounts};renderDailyWorkQueue('due')}
function unpaidPayment(p){return !['Paid','Cancelled'].includes(p.status) && moneyNum(p.amountDue)>moneyNum(p.amountPaid)}
function renderDailyWorkStats(){let fus=workQueueData.followups.filter(f=>!['Completed','Cancelled'].includes(f.status));let due=fus.filter(f=>String(f.dueDate)<=todayISO()).length;let overdue=fus.filter(f=>isPastISO(f.dueDate)).length;let duePays=workQueueData.payments.filter(p=>unpaidPayment(p)&&String(p.dueDate)<=todayISO());let promAmt=duePays.reduce((s,p)=>s+moneyNum(p.amountDue)-moneyNum(p.amountPaid),0);let high=accounts.filter(a=>ownsAccount(a)&&priorityScore(a).score>=60).length;document.getElementById('workFollowupsDue').textContent=due;document.getElementById('workOverdue').textContent=overdue;document.getElementById('workPromisesDue').textContent=duePays.length;document.getElementById('workPromiseAmount').textContent=money(promAmt);document.getElementById('workPriorityCount').textContent=high;document.getElementById('workUntouched').textContent=accounts.filter(a=>ownsAccount(a)&&!a.updatedAt&&!a.updated_at).length}
function renderDailyWorkQueue(tab='due'){renderDailyWorkStats();['Due','Promises','Priority'].forEach(t=>document.getElementById('workTab'+t)?.classList.toggle('active',tab.toLowerCase()===t.toLowerCase()||(tab==='due'&&t==='Due')));let box=document.getElementById('dailyWorkList');if(tab==='promises'){let list=workQueueData.payments.filter(unpaidPayment).filter(p=>String(p.dueDate)<=todayISO()).sort((a,b)=>String(a.dueDate).localeCompare(String(b.dueDate)));box.innerHTML=list.map(p=>promiseCard(p,'dailyWorkQueueModal')).join('')||'<div class="powerEmpty">No promises due today.</div>';return}if(tab==='priority'){let list=accounts.filter(ownsAccount).map(a=>({a,...priorityScore(a)})).sort((x,y)=>y.score-x.score).slice(0,50);box.innerHTML=list.map(x=>priorityCard(x.a,x.score,x.reasons,'dailyWorkQueueModal')).join('')||'<div class="powerEmpty">No priority accounts found.</div>';return}let list=workQueueData.followups.filter(f=>!['Completed','Cancelled'].includes(f.status)&&String(f.dueDate)<=todayISO()).sort((a,b)=>String(a.dueDate).localeCompare(String(b.dueDate)));box.innerHTML=list.map(f=>followUpCard(f,'dailyWorkQueueModal')).join('')||'<div class="powerEmpty">No callbacks or follow-ups due.</div>'}
function followUpCard(f,modalId){let a=accountById(f.accountId);let overdue=isPastISO(f.dueDate);return `<div class="powerCard"><div class="powerCardTop"><div><div class="powerTitle">${esc(f.followUpType||'Follow-Up')} — ${esc(a?nameOf(a):'Unknown Account')}</div><div class="powerMeta">Due: ${powerDateLabel(f.dueDate)} ${esc(f.dueTime||'')} • Assigned: ${esc(f.assignedToEmail||'—')}<br>Reason: ${esc(f.reason||'—')}<br>${esc(f.notes||'')}</div></div><span class="powerPill ${overdue?'red':'orange'}">${overdue?'Overdue':'Due'}</span></div><div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap"><button class="outline" onclick="setAccountFromModal('${f.accountId}','${modalId}')">Open Account</button><button class="green" onclick="completeFollowUp('${f.id}')">Mark Completed</button></div></div>`}
async function completeFollowUp(id){await dbFetch('/follow_ups?id=eq.'+id,{method:'PATCH',body:JSON.stringify({status:'Completed',completed_at:new Date().toISOString(),updated_at:new Date().toISOString()})});await insertAudit('Follow-Up Completed','Follow-up marked completed','follow_up',id);await loadDailyWorkQueue()}

async function openPromiseDashboard(){document.getElementById('promiseDashboardModal').classList.add('open');await loadPromiseDashboard()}
async function loadPromiseDashboard(){let pays=[],plans=[];try{pays=(await dbFetch('/payment_plan_payments?select=*&order=due_date.asc&limit=10000')).map(toCamel)}catch(e){pays=[]}try{plans=(await dbFetch('/payment_plans?select=*&order=created_at.desc&limit=10000')).map(toCamel)}catch(e){plans=[]}if(!currentUser.isAdmin){let ids=new Set(accounts.map(a=>String(a.id)));pays=pays.filter(p=>ids.has(String(p.accountId)));plans=plans.filter(p=>ids.has(String(p.accountId)))}promiseData={payments:pays,plans};renderPromiseDashboard('due')}
function promiseCard(p,modalId='promiseDashboardModal'){let plan=promiseData.plans.find(x=>String(x.id)===String(p.planId))||workQueueData.plans.find(x=>String(x.id)===String(p.planId));let a=accountById(p.accountId)||accountById(plan?.accountId);let due=String(p.dueDate||'');let status=p.status||'Scheduled';let owed=Math.max(0,moneyNum(p.amountDue)-moneyNum(p.amountPaid));let cls=status==='Paid'?'green':isPastISO(due)?'red':isTodayISO(due)?'orange':'gray';return `<div class="powerCard"><div class="powerCardTop"><div><div class="powerTitle">${esc(a?nameOf(a):'Unknown Account')} — ${money(owed)} due</div><div class="powerMeta">Due date: ${powerDateLabel(due)} • Status: ${esc(status)}<br>Account: ${esc(a?acctNo(a):'—')} • Balance: ${a?money(accountBalance(a)):'—'}<br>Assigned: ${esc(a?.assignedToEmail||'—')}</div></div><span class="powerPill ${cls}">${isPastISO(due)&&status!=='Paid'?'Broken/Overdue':esc(status)}</span></div><div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap"><button class="outline" onclick="setAccountFromModal('${a?.id||p.accountId}','${modalId}')">Open Account</button><button class="green" onclick="markPromisePaid('${p.id}')">Mark Paid</button></div></div>`}
async function markPromisePaid(paymentId){
 let p=[...promiseData.payments,...workQueueData.payments].find(x=>String(x.id)===String(paymentId));
 if(!p)return alert('Payment not found.');
 let a=accountById(p.accountId), amount=moneyNum(p.amountDue), balBefore=accountBalance(a), balAfter=Math.max(0,balBefore-amount), receipt=ledgerReceiptNo();
 await dbFetch('/payment_plan_payments?id=eq.'+paymentId,{method:'PATCH',body:JSON.stringify({amount_paid:amount,paid_date:todayISO(),status:'Paid',updated_at:new Date().toISOString()})});
 if(a){
   await dbFetch('/payments_ledger',{method:'POST',body:JSON.stringify([{account_id:a.id,payment_date:todayISO(),amount,payment_type:'Payment',payment_method:'Other',status:'Completed',receipt_number:receipt,balance_before:balBefore,balance_after:balAfter,plan_payment_id:paymentId,notes:'Marked paid from Promise Dashboard',created_by_email:currentUser.email}])}).catch(()=>{});
   await dbFetch(`/accounts?id=eq.${a.id}`,{method:'PATCH',body:JSON.stringify({current_balance:balAfter,status:balAfter<=0?'Settled':a.status,disposition:balAfter<=0?'Settled':a.disposition,updated_at:new Date().toISOString()})}).catch(()=>{});
 }
 await insertActivity(p.accountId,'Payment Promise Paid','Promise payment marked paid: '+money(amount)+'. Receipt '+receipt);
 await insertAudit('Promise Paid','Promise payment marked paid '+money(amount),'account',p.accountId);
 await loadAccounts();
 await loadPromiseDashboard();
 if(document.getElementById('dailyWorkQueueModal')?.classList.contains('open'))await loadDailyWorkQueue();
}
function renderPromiseDashboard(tab='due'){['Due','Overdue','Upcoming','All'].forEach(t=>document.getElementById('promTab'+t)?.classList.toggle('active',tab.toLowerCase()===t.toLowerCase()));let pays=promiseData.payments.filter(unpaidPayment);let dueToday=pays.filter(p=>isTodayISO(p.dueDate));let overdue=pays.filter(p=>isPastISO(p.dueDate));let upcoming=pays.filter(p=>isFutureISO(p.dueDate));document.getElementById('promiseDueToday').textContent=dueToday.length;document.getElementById('promiseOverdue').textContent=overdue.length;document.getElementById('promiseUpcoming').textContent=upcoming.length;document.getElementById('promiseDueAmount').textContent=money([...dueToday,...overdue].reduce((s,p)=>s+moneyNum(p.amountDue)-moneyNum(p.amountPaid),0));document.getElementById('promisePaidAmount').textContent=money(promiseData.payments.reduce((s,p)=>s+moneyNum(p.amountPaid),0));document.getElementById('promiseBroken').textContent=overdue.length;let list=tab==='due'?dueToday:tab==='overdue'?overdue:tab==='upcoming'?upcoming:promiseData.payments;document.getElementById('promiseDashboardList').innerHTML=list.map(p=>promiseCard(p)).join('')||'<div class="powerEmpty">No promises found for this view.</div>'}

function openCallResultModal(){let a=getCurrent();if(!a)return alert('No account selected.');document.getElementById('callResultPhone').value=a.lastContactNumber||phones(a)[0]||'';document.getElementById('callResultStatus').value='No Answer';document.getElementById('callDuration').value='0';document.getElementById('callCallbackDate').value='';document.getElementById('callResultNotes').value='';document.getElementById('callResultModal').classList.add('open')}
async function saveCallResult(){let a=getCurrent();if(!a)return;let result=val('callResultStatus'),phone=normPhone(val('callResultPhone')),duration=Number(val('callDuration')||0),notes=val('callResultNotes');await dbFetch('/call_results',{method:'POST',body:JSON.stringify([{account_id:a.id,phone_number:phone,call_result:result,duration_seconds:duration,notes,created_by_email:currentUser.email}])});await insertActivity(a.id,'Call Result',`${result} ${phone?fmtPhone(phone):''}. ${notes}`.trim(),phone);if(result){let updated=(await dbFetch(`/accounts?id=eq.${a.id}`,{method:'PATCH',body:JSON.stringify({status:result,disposition:result,last_contact_number:phone,updated_at:new Date().toISOString()})}))[0];let i=accounts.findIndex(x=>x.id===a.id);if(i>=0)accounts[i]=toCamel(updated)}if(result==='Callback'&&val('callCallbackDate')){await dbFetch('/follow_ups',{method:'POST',body:JSON.stringify([{account_id:a.id,follow_up_type:'Callback',due_date:val('callCallbackDate'),status:'Open',assigned_to_email:currentAssignee(a),reason:'Callback from call result',notes,created_by_email:currentUser.email}])})}await insertAudit('Call Result',`${result} for ${nameOf(a)}`,'account',a.id);closeModal('callResultModal');render()}

function openDisputeModal(){let a=getCurrent();if(!a)return alert('No account selected.');document.getElementById('disputeReason').value='';document.getElementById('disputeDate').value=todayISO();document.getElementById('disputeStatus').value='Open';document.getElementById('proofRequested').value='No';document.getElementById('accountFrozen').value='Yes';document.getElementById('disputeFollowUp').value='';document.getElementById('docsNeeded').value='';document.getElementById('disputeNotes').value='';document.getElementById('disputeModal').classList.add('open')}
async function saveDispute(){let a=getCurrent();if(!a)return;let row={account_id:a.id,dispute_reason:val('disputeReason'),received_date:val('disputeDate'),status:val('disputeStatus'),proof_requested:val('proofRequested')==='Yes',account_frozen:val('accountFrozen')==='Yes',follow_up_date:val('disputeFollowUp')||null,docs_needed:val('docsNeeded'),notes:val('disputeNotes'),created_by_email:currentUser.email};if(!row.dispute_reason)return alert('Enter dispute reason.');await dbFetch('/disputes',{method:'POST',body:JSON.stringify([row])});let updated=(await dbFetch(`/accounts?id=eq.${a.id}`,{method:'PATCH',body:JSON.stringify({status:'Disputed',disposition:'Disputed',updated_at:new Date().toISOString()})}))[0];let i=accounts.findIndex(x=>x.id===a.id);if(i>=0)accounts[i]=toCamel(updated);await insertActivity(a.id,'Dispute',`${row.dispute_reason}. Status: ${row.status}`);if(row.follow_up_date){await dbFetch('/follow_ups',{method:'POST',body:JSON.stringify([{account_id:a.id,follow_up_type:'Dispute Follow-Up',due_date:row.follow_up_date,status:'Open',assigned_to_email:currentAssignee(a),reason:'Dispute follow-up',notes:row.docs_needed,created_by_email:currentUser.email}])})}await insertAudit('Dispute Created',row.dispute_reason,'account',a.id);closeModal('disputeModal');render()}

function openSettlementModal(){let a=getCurrent();if(!a)return alert('No account selected.');let bal=accountBalance(a);document.getElementById('settleBalance').value=bal.toFixed(2);document.getElementById('settlePercent').value='50';document.getElementById('settleAmount').value=(bal*.5).toFixed(2);document.getElementById('settleDueDate').value=addDaysISO(todayISO(),7);document.getElementById('settlePaymentType').value='Lump Sum';document.getElementById('settleApproval').value='No';document.getElementById('settleNotes').value='';recalcSettlement('percent');document.getElementById('settlementModal').classList.add('open')}
function recalcSettlement(src){let bal=moneyNum(document.getElementById('settleBalance').value);let pct=moneyNum(document.getElementById('settlePercent').value);let amt=moneyNum(document.getElementById('settleAmount').value);if(src==='percent'){amt=bal*(pct/100);document.getElementById('settleAmount').value=amt.toFixed(2)}else{pct=bal?amt/bal*100:0;document.getElementById('settlePercent').value=pct.toFixed(2)}document.getElementById('settlementPreview').textContent=`Settlement offer: ${money(amt)} (${pct.toFixed(2)}%) on balance ${money(bal)}. Expires ${powerDateLabel(document.getElementById('settleDueDate').value)}.`}
async function saveSettlement(){let a=getCurrent();if(!a)return;let row={account_id:a.id,balance:moneyNum(val('settleBalance')),settlement_percent:moneyNum(val('settlePercent')),settlement_amount:moneyNum(val('settleAmount')),due_date:val('settleDueDate'),payment_type:val('settlePaymentType'),manager_approval_required:val('settleApproval')==='Yes',status:'Offered',notes:val('settleNotes'),created_by_email:currentUser.email};if(row.settlement_amount>row.balance)return alert('Settlement cannot be higher than balance.');await dbFetch('/settlements',{method:'POST',body:JSON.stringify([row])});await insertActivity(a.id,'Settlement Offer',`Offered ${money(row.settlement_amount)} (${row.settlement_percent}%) due ${row.due_date}`);await insertAudit('Settlement Offer',`Offered ${money(row.settlement_amount)} for ${nameOf(a)}`,'account',a.id);closeModal('settlementModal');alert('Settlement offer saved.')}


/* RESTORED STABLE PAYMENT PLAN ENGINE */



/* DEBTOR DOC TEMPLATE GENERATOR — pure browser PDF, no external libraries */
let pdfGeneratedDocsCache=[];


let companyLogoSettings={loaded:false,dataUrl:'',width:0,height:0};

function logoFromLocalStorage(){
 companyLogoSettings.dataUrl=localStorage.getItem('companyLogoDataUrl')||'';
 companyLogoSettings.width=parseInt(localStorage.getItem('companyLogoWidth')||'0',10)||0;
 companyLogoSettings.height=parseInt(localStorage.getItem('companyLogoHeight')||'0',10)||0;
}
function updateCompanyLogoPreview(){
 let box=document.getElementById('companyLogoPreview');
 let notice=document.getElementById('logoLoadedNotice');
 if(box){
   box.innerHTML=companyLogoSettings.dataUrl?`<img src="${companyLogoSettings.dataUrl}" alt="Company logo">`:'No logo uploaded yet.';
 }
 if(notice){
   notice.textContent=companyLogoSettings.dataUrl?'Logo status: logo loaded and will appear on downloaded letters.':'Logo status: no logo uploaded. Letters will generate without a logo.';
 }
}
async function loadCompanyLogoSettings(force=false){
 if(companyLogoSettings.loaded&&!force){updateCompanyLogoPreview();return companyLogoSettings;}
 companyLogoSettings.loaded=true;
 logoFromLocalStorage();
 try{
   let rows=(await dbFetch('/company_settings?select=setting_key,setting_value&setting_key=in.(company_logo_data_url,company_logo_width,company_logo_height)')).map(toCamel);
   let map={};
   rows.forEach(r=>map[r.settingKey]=r.settingValue);
   if(map.company_logo_data_url){
     companyLogoSettings.dataUrl=map.company_logo_data_url||'';
     companyLogoSettings.width=parseInt(map.company_logo_width||'0',10)||companyLogoSettings.width||0;
     companyLogoSettings.height=parseInt(map.company_logo_height||'0',10)||companyLogoSettings.height||0;
     localStorage.setItem('companyLogoDataUrl',companyLogoSettings.dataUrl);
     localStorage.setItem('companyLogoWidth',companyLogoSettings.width||'0');
     localStorage.setItem('companyLogoHeight',companyLogoSettings.height||'0');
   }
 }catch(e){}
 updateCompanyLogoPreview();
 return companyLogoSettings;
}
function fileToLogoJpeg(file){
 return new Promise((resolve,reject)=>{
   if(!file)return reject(new Error('No logo file selected.'));
   // Some Mac/Bolt/browser file pickers return a blank MIME type even for real images.
   // Do not reject based only on file.type. Try to load it as an image first.
   let allowedExt=/\.(png|jpg|jpeg|webp|gif|bmp|svg)$/i.test(file.name||'');
   if(file.type && !file.type.startsWith('image/') && !allowedExt){
     return reject(new Error('Upload a PNG, JPG, JPEG, WEBP, GIF, BMP, or SVG logo image.'));
   }
   let reader=new FileReader();
   reader.onerror=()=>reject(new Error('Could not read logo file.'));
   reader.onload=()=>{
     let img=new Image();
     img.crossOrigin='anonymous';
     img.onerror=()=>reject(new Error('That file could not be loaded as an image. Use PNG or JPG for best results.'));
     img.onload=()=>{
       let maxW=700,maxH=240;
       let w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;
       let scale=Math.min(1,maxW/w,maxH/h);
       let cw=Math.max(1,Math.round(w*scale)),ch=Math.max(1,Math.round(h*scale));
       let canvas=document.createElement('canvas');
       canvas.width=cw;canvas.height=ch;
       let ctx=canvas.getContext('2d');
       ctx.fillStyle='#ffffff';
       ctx.fillRect(0,0,cw,ch);
       ctx.drawImage(img,0,0,cw,ch);
       resolve({dataUrl:canvas.toDataURL('image/jpeg',0.9),width:cw,height:ch});
     };
     img.src=reader.result;
   };
   reader.readAsDataURL(file);
 });
}
async function saveCompanyLogoToDatabase(dataUrl,width,height){
 localStorage.setItem('companyLogoDataUrl',dataUrl||'');
 localStorage.setItem('companyLogoWidth',width||'0');
 localStorage.setItem('companyLogoHeight',height||'0');
 companyLogoSettings={loaded:true,dataUrl:dataUrl||'',width:width||0,height:height||0};
 updateCompanyLogoPreview();
 try{
   await dbFetch('/company_settings?on_conflict=setting_key',{
     method:'POST',
     headers:{Prefer:'resolution=merge-duplicates,return=representation'},
     body:JSON.stringify([
       {setting_key:'company_logo_data_url',setting_value:dataUrl||'',updated_by_email:currentUser.email,updated_at:new Date().toISOString()},
       {setting_key:'company_logo_width',setting_value:String(width||0),updated_by_email:currentUser.email,updated_at:new Date().toISOString()},
       {setting_key:'company_logo_height',setting_value:String(height||0),updated_by_email:currentUser.email,updated_at:new Date().toISOString()}
     ])
   });
 }catch(e){
   console.warn('Company logo database save failed:',e);
   alert('Logo is active in this browser now, but it did not save to the shared database. Run database_schema_rls.sql once in Supabase, then upload the logo again so employees can use it too.');
   return;
 }
 try{await insertAudit('Company Logo Updated','Admin updated company logo for letters','company_settings','company_logo_data_url')}catch(e){}
}
async function handleCompanyLogoUpload(event){
 try{
   if(!currentUser.isAdmin)return alert('Only admin can upload the company logo.');
   let file=event.target.files&&event.target.files[0];
   if(!file)return alert('No logo file selected.');
   let logo=await fileToLogoJpeg(file);
   await saveCompanyLogoToDatabase(logo.dataUrl,logo.width,logo.height);
   await loadCompanyLogoSettings(true);
   updateCompanyLogoPreview();
   renderPdfDocPreview();
   alert('Company logo uploaded successfully. Generate a new letter now and the logo will appear as a faint centered watermark behind the text.');
 }catch(e){
   alert(e.message||String(e));
 }
 finally{
   if(event && event.target)event.target.value='';
 }
}
async function removeCompanyLogo(){
 if(!currentUser.isAdmin)return alert('Only admin can remove the company logo.');
 if(!confirm('Remove the company logo from generated letters?'))return;
 await saveCompanyLogoToDatabase('',0,0);
 renderPdfDocPreview();
}
function logoDataUrlBytes(){
 let dataUrl=companyLogoSettings.dataUrl||'';
 if(!dataUrl.includes(','))return null;
 let b64=dataUrl.split(',')[1];
 let bin=atob(b64);
 let bytes=new Uint8Array(bin.length);
 for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
 return bytes;
}

function pdfDateLabel(d){
 try{return typeof powerDateLabel==='function'?powerDateLabel(d):String(d||'—')}catch(e){return String(d||'—')}
}
function pdfMoney(v){return moneyNum(v).toLocaleString(undefined,{style:'currency',currency:'USD'});}

const PDF_DEFAULT_AUTHORIZED_BY='Co Pilot Collections Manager';
let pdfLetterSettings={
  loaded:false,
  authorizedByDefault:PDF_DEFAULT_AUTHORIZED_BY,
  templates:{}
};

function sanitizeAuthorizedBy(v){
  v=String(v||'').trim();
  // Old builds saved the admin email. Treat any email address as invalid for letters.
  if(!v || /@/.test(v))return PDF_DEFAULT_AUTHORIZED_BY;
  return v;
}

function pdfLetterDocTypes(){
 let sel=document.getElementById('pdfDocType');
 if(sel)return [...sel.options].map(o=>o.value);
 return [
  'Stipulation - Paid In Full + Card Authorization',
  'Stipulation - Payment Plan + Card Authorization',
  'Release of Liability',
  'Standard Mailer',
  'Assignment / Notification of Debt',
  'Billing Statement - Paid In Full',
  'Billing Statement - Payment Plan',
  'Demand Letter',
  'NSF / Returned Payment Statement'
 ];
}
function loadPdfLetterSettingsFromLocal(){
 let localAuth=localStorage.getItem('pdfAuthorizedByDefault')||PDF_DEFAULT_AUTHORIZED_BY;
 pdfLetterSettings.authorizedByDefault=sanitizeAuthorizedBy(localAuth);
 if(localAuth!==pdfLetterSettings.authorizedByDefault){
   localStorage.setItem('pdfAuthorizedByDefault',pdfLetterSettings.authorizedByDefault);
 }
 try{pdfLetterSettings.templates=JSON.parse(localStorage.getItem('pdfLetterTemplatesJson')||'{}')||{}}catch(e){pdfLetterSettings.templates={}}
}
async function loadPdfLetterSettings(force=false){
 if(pdfLetterSettings.loaded&&!force)return pdfLetterSettings;
 pdfLetterSettings.loaded=true;
 loadPdfLetterSettingsFromLocal();

 if(token()){
   try{
     let keys='pdf_authorized_by_default,pdf_letter_templates_json';
     let rows=(await dbFetch('/company_settings?select=setting_key,setting_value&setting_key=in.('+keys+')')).map(toCamel);
     let map={}; rows.forEach(r=>map[r.settingKey]=r.settingValue);

     // Important: ignore any old saved email address from earlier versions.
     if(map.pdf_authorized_by_default){
       pdfLetterSettings.authorizedByDefault=sanitizeAuthorizedBy(map.pdf_authorized_by_default);
     }else{
       pdfLetterSettings.authorizedByDefault=PDF_DEFAULT_AUTHORIZED_BY;
     }

     if(map.pdf_letter_templates_json){
       try{pdfLetterSettings.templates=JSON.parse(map.pdf_letter_templates_json)||{}}catch(e){pdfLetterSettings.templates={}}
     }

     localStorage.setItem('pdfAuthorizedByDefault',pdfLetterSettings.authorizedByDefault||PDF_DEFAULT_AUTHORIZED_BY);
     localStorage.setItem('pdfLetterTemplatesJson',JSON.stringify(pdfLetterSettings.templates||{}));

     // If DB had an email saved, silently repair it when admin is logged in.
     if(currentUser.isAdmin && map.pdf_authorized_by_default && /@/.test(String(map.pdf_authorized_by_default))){
       try{await savePdfLetterSettingsToDatabase()}catch(e){console.warn('Could not auto-repair Authorized By DB value:',e)}
     }
   }catch(e){console.warn('Letter settings load failed:',e)}
 }
 return pdfLetterSettings;
}
function getPdfAuthorizedByDefault(){
 let saved=pdfLetterSettings.authorizedByDefault||localStorage.getItem('pdfAuthorizedByDefault')||PDF_DEFAULT_AUTHORIZED_BY;
 let clean=sanitizeAuthorizedBy(saved);
 if(clean!==saved)localStorage.setItem('pdfAuthorizedByDefault',clean);
 return clean;
}
async function savePdfAuthorizedByDefault(silent=false){
 try{
   if(!currentUser.isAdmin){
     if(!silent)alert('Admin only.');
     return false;
   }
   let raw=(val('pdfAuthorizedBy')||PDF_DEFAULT_AUTHORIZED_BY).trim();
   let v=sanitizeAuthorizedBy(raw);
   if(raw!==v && !silent){
     alert('Authorized By cannot be an email address. It was reset to: '+v);
   }
   pdfLetterSettings.authorizedByDefault=v;
   localStorage.setItem('pdfAuthorizedByDefault',v);
   try{
     await savePdfLetterSettingsToDatabase();
   }catch(dbErr){
     console.warn('DB save failed but local default was saved:',dbErr);
     if(!silent)alert('Saved locally, but Supabase blocked the shared save. Run RUN_THIS_FORCE_LETTER_SETTINGS_SQL.sql, reload, then save again.');
     return false;
   }
   if(!silent)alert('Authorized By default saved. New letters will use: '+v);
   return true;
 }catch(e){
   if(!silent)alert('Could not save Authorized By default:\n\n'+(e.message||String(e))+'\n\nRun RUN_THIS_FORCE_LETTER_SETTINGS_SQL.sql in Supabase SQL Editor.');
   return false;
 }
}
async function savePdfLetterSettingsToDatabase(){
 if(!currentUser.isAdmin)throw new Error('Admin only');
 let rows=[
  {setting_key:'pdf_authorized_by_default',setting_value:getPdfAuthorizedByDefault(),updated_by_email:currentUser.email,updated_at:new Date().toISOString()},
  {setting_key:'pdf_letter_templates_json',setting_value:JSON.stringify(pdfLetterSettings.templates||{}),updated_by_email:currentUser.email,updated_at:new Date().toISOString()}
 ];
 await dbFetch('/company_settings?on_conflict=setting_key',{
   method:'POST',
   headers:{Prefer:'resolution=merge-duplicates,return=representation'},
   body:JSON.stringify(rows)
 });
 try{await insertAudit('Letter Settings Updated','Updated Authorized By default or letter body templates','company_settings','letter_settings')}catch(e){}
}
function pdfSystemDefaultTemplate(docType){
 let m={
  'Demand Letter':`Our records indicate the above account remains unresolved. The total amount currently claimed due is {{currentBalance}}.

Please submit payment or contact the account representative by {{dueDate}} to discuss resolution options.

If you believe this account is inaccurate or disputed, notify the account representative so the matter can be reviewed.`,
  'Assignment / Notification of Debt':`The purpose of this communication is to notify you that the account identified above has been assigned, sold, or transferred for servicing or collection.

The amount currently claimed due is {{currentBalance}}.

Please direct account questions or payments according to the instructions provided by the account representative so payments can be accurately applied.`,
  'Standard Mailer':`Attached is information which pertains to your account. This information may be sensitive, and you should keep a copy for your records.

If you have questions or concerns, please contact the representative handling your account.`,
  'Release of Liability':`In consideration of account #{{accountNumber}}, and upon receipt and clearance of the agreed payment amount of {{settlementAmount}}, the account holder releases {{debtorName}} from further liability on the above account.

This release applies to claims or demands related to the account identified above through the date of this release.`,
  'Billing Statement - Paid In Full':`Thank you for your recent payment of {{lastPaymentAmount}}. This payment was received and applied to the account identified above.

Your account is now paid in full. We appreciate your prompt attention toward this financial obligation.`,
  'Billing Statement - Payment Plan':`Thank you for your recent payment of {{lastPaymentAmount}}{{lastPaymentDateText}}.

Your next payment of {{installmentAmount}} is due by {{dueDate}}.`,
  'NSF / Returned Payment Statement':`Notice: a recent payment in the amount of {{returnedAmount}} was returned or not honored.

Please submit replacement payment by {{dueDate}} so it can be applied to the account identified above.`,
  'Stipulation - Paid In Full + Card Authorization':`The parties agree to compromise the indebtedness on this account. The accepted paid-in-full amount is {{settlementAmount}} if received by {{dueDate}}.

Upon receipt and clearance of the agreed amount, the account will be considered satisfied in full and no further collection activity will continue on this account.

Payment method authorized: {{paymentMethod}}. Authorized card or account reference: {{cardMask}}.`,
  'Stipulation - Payment Plan + Card Authorization':`The parties agree to resolve the account through a scheduled payment arrangement.

If a scheduled payment is missed or returned, the agreement may be reviewed and the remaining balance may become due according to the account terms.

Payment method authorized: {{paymentMethod}}. Authorized card or account reference: {{cardMask}}.`
 };
 return m[docType]||`This document concerns the account identified above.

Please review the account information and contact the account representative if you have questions.`;
}
function pdfTemplateValueMap(d){
 let lastDate=d.lastPaymentDate?` received on ${pdfDateLabel(d.lastPaymentDate)}`:'';
 return {
  debtorName:d.debtorName||'Consumer',
  accountNumber:d.accountNumber||'',
  fileNumber:d.fileNumber||'',
  originalCreditor:d.originalCreditor||'—',
  currentBalance:pdfMoney(d.currentBalance),
  settlementAmount:pdfMoney(d.settlementAmount||d.currentBalance),
  initialPayment:pdfMoney(d.initialPayment),
  installmentAmount:pdfMoney(d.installmentAmount||d.minimumDue),
  frequency:d.frequency||'',
  paymentMethod:d.paymentMethod||'',
  cardMask:d.cardMask||'XXXX-XXXX-XXXX-____',
  docDate:pdfDateLabel(d.docDate),
  dueDate:pdfDateLabel(d.dueDate),
  lastPaymentAmount:pdfMoney(d.lastPaymentAmount||d.settlementAmount||d.currentBalance),
  lastPaymentDate:d.lastPaymentDate?pdfDateLabel(d.lastPaymentDate):'',
  lastPaymentDateText:lastDate,
  minimumDue:pdfMoney(d.minimumDue||d.installmentAmount),
  returnedAmount:pdfMoney(d.returnedAmount),
  authorizedBy:d.authorizedBy||getPdfAuthorizedByDefault()
 };
}
function fillPdfLetterTemplate(text,d){
 let map=pdfTemplateValueMap(d);
 return String(text||'').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,(all,key)=>map[key]!==undefined?map[key]:all);
}
function templateToParagraphs(text,d){
 return fillPdfLetterTemplate(text,d).split(/\n\s*\n/g).map(p=>p.trim()).filter(Boolean);
}
function applyLetterBodyTemplateOverride(docType,d,paragraphs){
 let custom=(pdfLetterSettings.templates||{})[docType];
 if(custom && String(custom).trim())return templateToParagraphs(custom,d);
 return paragraphs;
}
async function resetLetterSettingsHard(){
 if(!currentUser.isAdmin)return alert('Admin only.');
 if(!confirm('This will reset Authorized By to Co Pilot Collections Manager and clear all custom letter body templates. Continue?'))return;
 pdfLetterSettings.authorizedByDefault=PDF_DEFAULT_AUTHORIZED_BY;
 pdfLetterSettings.templates={};
 localStorage.setItem('pdfAuthorizedByDefault',PDF_DEFAULT_AUTHORIZED_BY);
 localStorage.setItem('pdfLetterTemplatesJson','{}');
 let field=document.getElementById('pdfAuthorizedBy'); if(field)field.value=PDF_DEFAULT_AUTHORIZED_BY;
 try{await savePdfLetterSettingsToDatabase();alert('Letter settings force-reset and saved.');}
 catch(e){alert('Reset locally, but Supabase blocked the shared save. Run RUN_THIS_FORCE_LETTER_SETTINGS_SQL.sql, reload, and click this again.');}
 try{renderPdfDocPreview()}catch(e){}
}
async function openLetterBodyEditor(){
 if(!currentUser.isAdmin)return alert('Admin only. Log in as admin to edit letter bodies.');
 try{
   await loadPdfLetterSettings(true);
   let sel=document.getElementById('letterTemplateType');
   if(!sel)throw new Error('Letter body editor modal is missing from this build.');
   let types=pdfLetterDocTypes();
   sel.innerHTML=types.map(t=>`<option>${esc(t)}</option>`).join('');
   sel.value=val('pdfDocType')||types[0];
   loadLetterBodyTemplateIntoEditor();
   document.getElementById('letterBodyEditorModal').classList.add('open');
 }catch(e){
   alert('Could not open Letter Body Editor:\n\n'+(e.message||String(e))+'\n\nThis means the latest index.html may not be loaded. Re-upload this ZIP to GitHub root and hard refresh Bolt.');
 }
}
function loadLetterBodyTemplateIntoEditor(){
 let type=val('letterTemplateType')||pdfLetterDocTypes()[0];
 let custom=(pdfLetterSettings.templates||{})[type];
 let body=document.getElementById('letterTemplateBody');
 let status=document.getElementById('letterTemplateStatus');
 body.value=custom!==undefined?custom:pdfSystemDefaultTemplate(type);
 status.textContent=custom!==undefined?'Custom body saved for this letter':'System default body';
 status.classList.toggle('custom',custom!==undefined);
}
async function saveLetterBodyTemplate(){
 try{
   if(!currentUser.isAdmin)return alert('Admin only.');
   let type=val('letterTemplateType');
   let body=(document.getElementById('letterTemplateBody').value||'').trim();
   if(!type)return alert('Choose a letter type.');
   if(!body)return alert('Body cannot be blank. Use Reset if you want the system default.');
   pdfLetterSettings.templates=pdfLetterSettings.templates||{};
   pdfLetterSettings.templates[type]=body;
   localStorage.setItem('pdfLetterTemplatesJson',JSON.stringify(pdfLetterSettings.templates));

   let dbSaved=true;
   try{
     await savePdfLetterSettingsToDatabase();
   }catch(dbErr){
     dbSaved=false;
     console.warn('Template saved locally, DB save failed:',dbErr);
   }

   loadLetterBodyTemplateIntoEditor();
   if(val('pdfDocType')===type)renderPdfDocPreview();

   if(dbSaved)alert('Letter body template saved for: '+type);
   else alert('Letter body saved locally and will work in this browser, but Supabase blocked the shared save.\n\nRun RUN_THIS_FORCE_LETTER_SETTINGS_SQL.sql, reload, then save again so employees also receive it.');
 }catch(e){
   alert('Could not save letter body:\n\n'+(e.message||String(e))+'\n\nIf this is a database error, run RUN_THIS_FORCE_LETTER_SETTINGS_SQL.sql in Supabase SQL Editor.');
 }
}
async function resetLetterBodyTemplate(){
 try{
   if(!currentUser.isAdmin)return alert('Admin only.');
   let type=val('letterTemplateType');
   if(!confirm('Reset this letter body back to the system default?'))return;
   pdfLetterSettings.templates=pdfLetterSettings.templates||{};
   delete pdfLetterSettings.templates[type];
   localStorage.setItem('pdfLetterTemplatesJson',JSON.stringify(pdfLetterSettings.templates));

   let dbSaved=true;
   try{await savePdfLetterSettingsToDatabase()}catch(dbErr){dbSaved=false;console.warn('Template reset locally, DB save failed:',dbErr)}
   loadLetterBodyTemplateIntoEditor();
   if(val('pdfDocType')===type)renderPdfDocPreview();
   alert(dbSaved?'Letter body reset to system default for: '+type:'Letter body reset locally. Run SQL and save again to sync with employees.');
 }catch(e){
   alert('Could not reset letter body:\n\n'+(e.message||String(e)));
 }
}


function pdfGetAccountOriginalCreditor(a){
 return a?.originalCreditor||a?.origCreditor||a?.creditor||a?.issuerName||a?.portfolio||a?.sourceFile||'';
}
function pdfGetFileNumber(a){
 return acctNo(a)||a?.accountNumber||a?.account_number||a?.issuerAccountNumber||a?.clientAccountNumber||a?.sourceRefNum||'';
}
function pdfGetRecipientAddress(a){
 return [nameOf(a),a?.address,a?.address2,[a?.city,a?.state,a?.zip].filter(Boolean).join(', ')].filter(Boolean).join('\n');
}
function pdfRecipientLines(d){
 return String(d.recipientAddress||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);
}
function pdfCardMask(last4){
 let s=String(last4||'').replace(/\D/g,'').slice(-4);
 return s?('XXXX-XXXX-XXXX-'+s):'XXXX-XXXX-XXXX-____';
}
function pdfDocTypeChanged(){
 let t=val('pdfDocType');
 let bal=moneyNum(val('pdfCurrentBalance'));
 if(t.includes('Paid In Full')){
   if(!moneyNum(val('pdfSettlementAmount')))document.getElementById('pdfSettlementAmount').value=bal.toFixed(2);
   document.getElementById('pdfFrequency').value='One-Time';
   document.getElementById('pdfPaymentCount').value='1';
 }
 if(t.includes('Payment Plan')){
   if(!moneyNum(val('pdfPaymentCount')))document.getElementById('pdfPaymentCount').value='3';
   if(!moneyNum(val('pdfInstallmentAmount')))document.getElementById('pdfInstallmentAmount').value=(bal/Math.max(1,moneyNum(val('pdfPaymentCount'))||3)).toFixed(2);
   document.getElementById('pdfFrequency').value=document.getElementById('pdfFrequency').value==='One-Time'?'Monthly':document.getElementById('pdfFrequency').value;
 }
 if(t.includes('NSF')){
   if(!moneyNum(val('pdfReturnedAmount')))document.getElementById('pdfReturnedAmount').value=moneyNum(val('pdfLastPaymentAmount')||val('pdfMinimumDue')||0).toFixed(2);
 }
 renderPdfDocPreview();
}
async function openDocumentGenerator(){
 let a=getCurrent(); if(!a)return alert('No account selected.');
 await loadCompanyLogoSettings(true);
 await loadPdfLetterSettings(true);
 let bal=accountBalance(a);
 document.getElementById('pdfDocType').value='Stipulation - Paid In Full + Card Authorization';
 document.getElementById('pdfDocDate').value=todayISO();
 document.getElementById('pdfDocDueDate').value=addDaysISO(todayISO(),10);
 document.getElementById('pdfFileNumber').value=pdfGetFileNumber(a);
 document.getElementById('pdfOriginalCreditor').value=pdfGetAccountOriginalCreditor(a);
 document.getElementById('pdfAccountNumber').value=acctNo(a);
 document.getElementById('pdfAuthorizedBy').value=getPdfAuthorizedByDefault();
 document.getElementById('pdfCurrentBalance').value=bal.toFixed(2);
 document.getElementById('pdfSettlementAmount').value=bal.toFixed(2);
 document.getElementById('pdfInitialPayment').value='';
 document.getElementById('pdfInstallmentAmount').value='';
 document.getElementById('pdfPaymentCount').value='1';
 document.getElementById('pdfFrequency').value='One-Time';
 document.getElementById('pdfPaymentMethod').value='Card';
 document.getElementById('pdfCardLast4').value='';
 document.getElementById('pdfLastPaymentAmount').value=moneyNum(a.lastPaymentAmount||0).toFixed(2);
 document.getElementById('pdfLastPaymentDate').value=a.lastPaymentDate||'';
 document.getElementById('pdfMinimumDue').value='';
 document.getElementById('pdfReturnedAmount').value='';
 document.getElementById('pdfRecipientAddress').value=pdfGetRecipientAddress(a);
 document.getElementById('pdfDocNotes').value='';
 document.getElementById('pdfDisclaimer').value=localStorage.getItem('pdfDisclosure')||'This is an attempt to collect a debt. Any information obtained will be used for that purpose. This is a communication from a debt collector.';
 document.getElementById('pdfAuthorizedBy').value=getPdfAuthorizedByDefault();
 document.getElementById('documentGeneratorModal').classList.add('open');
 await loadGeneratedDocsForCurrent();
 renderPdfDocPreview();
}
function pdfDocData(){
 let a=getCurrent()||{};
 let docType=val('pdfDocType')||'Stipulation - Paid In Full + Card Authorization';
 let balance=moneyNum(val('pdfCurrentBalance'));
 let settlement=moneyNum(val('pdfSettlementAmount'));
 let initial=moneyNum(val('pdfInitialPayment'));
 let installment=moneyNum(val('pdfInstallmentAmount'));
 let count=parseInt(val('pdfPaymentCount')||'0',10)||0;
 let minimumDue=moneyNum(val('pdfMinimumDue'));
 let lastPay=moneyNum(val('pdfLastPaymentAmount'));
 let returned=moneyNum(val('pdfReturnedAmount'));
 localStorage.setItem('pdfDisclosure',val('pdfDisclaimer')||'');
 return {
   docType,
   docDate:val('pdfDocDate')||todayISO(),
   dueDate:val('pdfDocDueDate')||addDaysISO(todayISO(),10),
   authorizedBy:sanitizeAuthorizedBy(val('pdfAuthorizedBy')||getPdfAuthorizedByDefault()),
   debtorName:nameOf(a),
   accountNumber:val('pdfAccountNumber')||acctNo(a),
   fileNumber:val('pdfFileNumber')||pdfGetFileNumber(a),
   originalCreditor:val('pdfOriginalCreditor')||pdfGetAccountOriginalCreditor(a),
   currentBalance:balance,
   settlementAmount:settlement,
   initialPayment:initial,
   installmentAmount:installment,
   paymentCount:count,
   frequency:val('pdfFrequency')||'One-Time',
   paymentMethod:val('pdfPaymentMethod')||'',
   cardLast4:val('pdfCardLast4'),
   cardMask:pdfCardMask(val('pdfCardLast4')),
   lastPaymentAmount:lastPay,
   lastPaymentDate:val('pdfLastPaymentDate')||'',
   minimumDue:minimumDue,
   returnedAmount:returned,
   recipientAddress:val('pdfRecipientAddress')||pdfGetRecipientAddress(a),
   notes:val('pdfDocNotes')||'',
   disclaimer:val('pdfDisclaimer')||'',
   createdBy:currentUser.email||''
 };
}
function pdfScheduleLines(d){
 let lines=[];
 let start=d.dueDate||todayISO();
 let count=Math.max(0,d.paymentCount||0);
 let amount=d.installmentAmount || (count?((d.currentBalance-(d.initialPayment||0))/count):0);
 for(let i=0;i<count;i++){
   let due=start;
   if(d.frequency==='Weekly')due=addDaysISO(start,7*i);
   if(d.frequency==='Biweekly')due=addDaysISO(start,14*i);
   if(d.frequency==='Monthly'){
     let dt=new Date(start+'T00:00:00');
     dt.setMonth(dt.getMonth()+i);
     due=dt.toISOString().slice(0,10);
   }
   lines.push([i+1,pdfDateLabel(due),pdfMoney(amount)]);
 }
 return lines;
}
function pdfTemplateSections(d){
 let sections=[];
 let partyLine=`${d.debtorName} | Account #: ${d.accountNumber} | File/Account #: ${d.fileNumber}`;
 let creditorLine=`Original Creditor: ${d.originalCreditor||'—'} | Current Balance: ${pdfMoney(d.currentBalance)}`;

 if(d.docType==='Stipulation - Paid In Full + Card Authorization'){
   sections.push(['STIPULATION OF AGREEMENT',[
     partyLine, creditorLine,
     `The parties agree to compromise the indebtedness on this account. The account balance is ${pdfMoney(d.currentBalance)}.`,
     `The accepted paid-in-full amount is ${pdfMoney(d.settlementAmount)} if received by ${pdfDateLabel(d.dueDate)}.`,
     `Upon receipt and clearance of the agreed amount, the account will be considered satisfied in full and no further collection activity will continue on this account.`,
     `Payment method authorized: ${d.paymentMethod}. Authorized debt/card reference: ${d.cardMask}.`,
     `Cardholder Name: ________________________________`,
     `Card Number: ${d.cardMask}`,
     `Expiration Date: __________  Billing ZIP: __________  Phone: __________________`,
     `Signature: ________________________________  Date: ________________`
   ]]);
 }
 else if(d.docType==='Stipulation - Payment Plan + Card Authorization'){
   let schedule=pdfScheduleLines(d);
   sections.push(['STIPULATION OF PAYMENT AGREEMENT',[
     partyLine, creditorLine,
     `The parties agree to resolve the account through a scheduled payment arrangement.`,
     `Total balance / plan amount: ${pdfMoney(d.currentBalance)}.`,
     `Initial payment: ${pdfMoney(d.initialPayment)}. Installment amount: ${pdfMoney(d.installmentAmount)}. Frequency: ${d.frequency}.`,
     `If a scheduled payment is missed or returned, the agreement may be reviewed and the remaining balance may become due according to the account terms.`,
     `Payment method authorized: ${d.paymentMethod}. Authorized card/account reference: ${d.cardMask}.`
   ]]);
   sections.push(['SCHEDULED PAYMENTS',schedule.length?schedule.map(r=>`${r[0]}. ${r[1]} — ${r[2]}`):['No schedule entered.']]);
   sections.push(['CARD AUTHORIZATION',[
     `I, ${d.debtorName}, authorize payments according to the schedule above.`,
     `Cardholder Name: ________________________________`,
     `Card Number: ${d.cardMask}`,
     `Expiration Date: __________  Billing ZIP: __________  Phone: __________________`,
     `Signature: ________________________________  Date: ________________`
   ]]);
 }
 else if(d.docType==='Release of Liability'){
   sections.push(['RELEASE OF LIABILITY',[
     partyLine, creditorLine,
     `In consideration of account #${d.accountNumber}, and upon receipt/clearance of the agreed payment amount of ${pdfMoney(d.settlementAmount||d.currentBalance)}, the account holder releases ${d.debtorName} from further liability on the above account.`,
     `This release applies to claims or demands related to the account identified above through the date of this release.`,
     `Dated: ${pdfDateLabel(d.docDate)}`,
     `Authorized Representative: ________________________________`,
     `Consumer: ________________________________`
   ]]);
 }
 else if(d.docType==='Standard Mailer'){
   sections.push(['STANDARD MAILER',[
     ...pdfRecipientLines(d),
     `Dear ${d.debtorName};`,
     `Attached is information which pertains to your account. This information may be sensitive, and you should keep a copy for your records.`,
     `If you have questions or concerns, please contact the representative handling your account.`,
     `Sincerely,`,
     `${d.authorizedBy}`
   ]]);
 }
 else if(d.docType==='Assignment / Notification of Debt'){
   sections.push(['ASSIGNMENT / NOTIFICATION OF DEBT',[
     ...pdfRecipientLines(d),
     `The purpose of this communication is to notify you that the account identified below has been assigned, sold, or transferred for servicing/collection.`,
     `Original Creditor: ${d.originalCreditor||'—'}`,
     `Account Number: ${d.accountNumber}`,
     `Amount Claimed Due: ${pdfMoney(d.currentBalance)}`,
     `Please direct account questions or payments according to the instructions provided by the account representative so payments can be accurately applied.`
   ]]);
 }
 else if(d.docType==='Billing Statement - Paid In Full'){
   sections.push(['BILLING STATEMENT - PAID IN FULL',[
     `Statement Date: ${pdfDateLabel(d.docDate)}`,
     `File/Account Number: ${d.fileNumber}`,
     `Bill To: ${d.debtorName}`,
     `Due Date: ${pdfDateLabel(d.dueDate)}`,
     `Minimum Due: $0.00`,
     `Account Balance: $0.00`,
     `Thank you for your recent payment of ${pdfMoney(d.lastPaymentAmount||d.settlementAmount||d.currentBalance)}. This payment was received and applied to account ${d.fileNumber}.`,
     `Your account is now paid in full. We appreciate your prompt attention toward this financial obligation.`
   ]]);
 }
 else if(d.docType==='Billing Statement - Payment Plan'){
   sections.push(['BILLING STATEMENT - PAYMENT PLAN',[
     `Statement Date: ${pdfDateLabel(d.docDate)}`,
     `File/Account Number: ${d.fileNumber}`,
     `Bill To: ${d.debtorName}`,
     `Due Date: ${pdfDateLabel(d.dueDate)}`,
     `Minimum Due: ${pdfMoney(d.minimumDue||d.installmentAmount)}`,
     `Account Balance: ${pdfMoney(d.currentBalance)}`,
     `Thank you for your recent payment of ${pdfMoney(d.lastPaymentAmount)}${d.lastPaymentDate?` received on ${pdfDateLabel(d.lastPaymentDate)}`:''}.`,
     `Your next payment of ${pdfMoney(d.installmentAmount||d.minimumDue)} is due by ${pdfDateLabel(d.dueDate)}.`
   ]]);
 }
 else if(d.docType==='Demand Letter'){
   sections.push(['DEMAND LETTER',[
     ...pdfRecipientLines(d),
     `Date: ${pdfDateLabel(d.docDate)}`,
     `Original Creditor: ${d.originalCreditor||'—'}`,
     `File/Account Number: ${d.fileNumber}`,
     `Dear ${d.debtorName};`,
     `Our records indicate the above account remains unresolved. The total amount currently claimed due is ${pdfMoney(d.currentBalance)}.`,
     `Please submit payment or contact the account representative by ${pdfDateLabel(d.dueDate)} to discuss resolution options.`,
     `If you believe this account is inaccurate or disputed, notify the account representative so the matter can be reviewed.`,
     `Sincerely,`,
     `${d.authorizedBy}`
   ]]);
 }
 else if(d.docType==='NSF / Returned Payment Statement'){
   sections.push(['NSF / RETURNED PAYMENT STATEMENT',[
     `Statement Date: ${pdfDateLabel(d.docDate)}`,
     `File/Account Number: ${d.fileNumber}`,
     `Bill To: ${d.debtorName}`,
     `Due Date: ${pdfDateLabel(d.dueDate)}`,
     `Minimum Due: ${pdfMoney(d.minimumDue||d.returnedAmount)}`,
     `Account Balance: ${pdfMoney(d.currentBalance)}`,
     `NOTICE: A recent payment in the amount of ${pdfMoney(d.returnedAmount)} was returned or not honored.`,
     `Please submit replacement payment by ${pdfDateLabel(d.dueDate)} so it can be applied to account ${d.fileNumber}.`
   ]]);
 }
 if(d.notes)sections.push(['ADDITIONAL NOTES', [d.notes]]);
 if(d.disclaimer)sections.push(['DISCLOSURE', [d.disclaimer]]);
 return sections;
}

function pdfProfessionalTemplate(d){
 let recipient=pdfRecipientLines(d);
 let docType=d.docType||'Demand Letter';
 let accountNumber=d.accountNumber||d.fileNumber||'';
 let meta=[
   ['Date', pdfDateLabel(d.docDate)],
   ['Original Creditor', d.originalCreditor||'—'],
   ['File/Account Number', accountNumber]
 ];
 let salutation=`Dear ${d.debtorName||'Consumer'};`;
 let closingName=d.authorizedBy||getPdfAuthorizedByDefault();
 let paragraphs=[];
 let post=[];

 if(docType==='Demand Letter'){
   paragraphs=[
     `Our records indicate the above account remains unresolved. The total amount currently claimed due is ${pdfMoney(d.currentBalance)}.`,
     `Please submit payment or contact the account representative by ${pdfDateLabel(d.dueDate)} to discuss resolution options.`,
     `If you believe this account is inaccurate or disputed, notify the account representative so the matter can be reviewed.`
   ];
 }
 else if(docType==='Assignment / Notification of Debt'){
   paragraphs=[
     `The purpose of this communication is to notify you that the account identified above has been assigned, sold, or transferred for servicing or collection.`,
     `The amount currently claimed due is ${pdfMoney(d.currentBalance)}.`,
     `Please direct account questions or payments according to the instructions provided by the account representative so payments can be accurately applied.`
   ];
 }
 else if(docType==='Standard Mailer'){
   paragraphs=[
     `Attached is information which pertains to your account. This information may be sensitive, and you should keep a copy for your records.`,
     `If you have questions or concerns, please contact the representative handling your account.`
   ];
 }
 else if(docType==='Release of Liability'){
   paragraphs=[
     `In consideration of account #${accountNumber}, and upon receipt and clearance of the agreed payment amount of ${pdfMoney(d.settlementAmount||d.currentBalance)}, the account holder releases ${d.debtorName} from further liability on the above account.`,
     `This release applies to claims or demands related to the account identified above through the date of this release.`
   ];
   post.push(['Authorized Representative', '________________________________']);
   post.push(['Consumer', '________________________________']);
 }
 else if(docType==='Billing Statement - Paid In Full'){
   meta.push(['Minimum Due','$0.00']);
   meta.push(['Account Balance','$0.00']);
   paragraphs=[
     `Thank you for your recent payment of ${pdfMoney(d.lastPaymentAmount||d.settlementAmount||d.currentBalance)}. This payment was received and applied to the account identified above.`,
     `Your account is now paid in full. We appreciate your prompt attention toward this financial obligation.`
   ];
 }
 else if(docType==='Billing Statement - Payment Plan'){
   meta.push(['Minimum Due',pdfMoney(d.minimumDue||d.installmentAmount)]);
   meta.push(['Account Balance',pdfMoney(d.currentBalance)]);
   paragraphs=[
     `Thank you for your recent payment of ${pdfMoney(d.lastPaymentAmount)}${d.lastPaymentDate?` received on ${pdfDateLabel(d.lastPaymentDate)}`:''}.`,
     `Your next payment of ${pdfMoney(d.installmentAmount||d.minimumDue)} is due by ${pdfDateLabel(d.dueDate)}.`
   ];
 }
 else if(docType==='NSF / Returned Payment Statement'){
   meta.push(['Minimum Due',pdfMoney(d.minimumDue||d.returnedAmount)]);
   meta.push(['Account Balance',pdfMoney(d.currentBalance)]);
   paragraphs=[
     `Notice: a recent payment in the amount of ${pdfMoney(d.returnedAmount)} was returned or not honored.`,
     `Please submit replacement payment by ${pdfDateLabel(d.dueDate)} so it can be applied to the account identified above.`
   ];
 }
 else if(docType==='Stipulation - Paid In Full + Card Authorization'){
   meta.push(['Current Balance',pdfMoney(d.currentBalance)]);
   meta.push(['Paid-In-Full Amount',pdfMoney(d.settlementAmount)]);
   meta.push(['Payment Method',d.paymentMethod||'—']);
   paragraphs=[
     `The parties agree to compromise the indebtedness on this account. The accepted paid-in-full amount is ${pdfMoney(d.settlementAmount)} if received by ${pdfDateLabel(d.dueDate)}.`,
     `Upon receipt and clearance of the agreed amount, the account will be considered satisfied in full and no further collection activity will continue on this account.`,
     `Payment method authorized: ${d.paymentMethod}. Authorized card or account reference: ${d.cardMask}.`
   ];
   post.push(['Cardholder Name','________________________________']);
   post.push(['Card Number',d.cardMask||'XXXX-XXXX-XXXX-____']);
   post.push(['Expiration Date','__________']);
   post.push(['Billing ZIP','__________']);
   post.push(['Signature','________________________________']);
   post.push(['Date','________________']);
 }
 else if(docType==='Stipulation - Payment Plan + Card Authorization'){
   meta.push(['Current Balance',pdfMoney(d.currentBalance)]);
   meta.push(['Initial Payment',pdfMoney(d.initialPayment)]);
   meta.push(['Installment Amount',pdfMoney(d.installmentAmount)]);
   meta.push(['Frequency',d.frequency||'—']);
   paragraphs=[
     `The parties agree to resolve the account through a scheduled payment arrangement.`,
     `If a scheduled payment is missed or returned, the agreement may be reviewed and the remaining balance may become due according to the account terms.`,
     `Payment method authorized: ${d.paymentMethod}. Authorized card or account reference: ${d.cardMask}.`
   ];
   let sched=pdfScheduleLines(d);
   if(sched.length){
     post.push(['Scheduled Payments', sched.map(r=>`${r[0]}. ${r[1]} — ${r[2]}`).join(' | ')]);
   }
   post.push(['Cardholder Name','________________________________']);
   post.push(['Card Number',d.cardMask||'XXXX-XXXX-XXXX-____']);
   post.push(['Expiration Date','__________']);
   post.push(['Billing ZIP','__________']);
   post.push(['Signature','________________________________']);
   post.push(['Date','________________']);
 }
 else{
   paragraphs=[
     `This document concerns the account identified above.`,
     `Please review the account information and contact the account representative if you have questions.`
   ];
 }

 paragraphs=applyLetterBodyTemplateOverride(docType,d,paragraphs);
 if(d.notes)paragraphs.push(d.notes);

 return {
   title:docType,
   recipient,
   meta,
   salutation,
   paragraphs,
   closing:`Sincerely,`,
   closingName,
   post,
   disclosure:d.disclaimer||''
 };
}

function renderPdfDocPreview(){
 let d=pdfDocData();
 let t=pdfProfessionalTemplate(d);
 let recipientHtml=t.recipient.map(x=>esc(x)).join('<br>');
 let metaHtml=t.meta.map(([k,v])=>`<div><b>${esc(k)}:</b> ${esc(v||'—')}</div>`).join('');
 let bodyHtml=t.paragraphs.map(p=>`<p>${esc(p)}</p>`).join('');
 let postHtml=t.post.length?`<div class="letterDisclosure"><b>ADDITIONAL INFORMATION</b>${t.post.map(([k,v])=>`<div><b>${esc(k)}:</b> ${esc(v||'—')}</div>`).join('')}</div>`:'';
 let logoHtml=companyLogoSettings.dataUrl?`<img class="letterWatermark" src="${companyLogoSettings.dataUrl}" alt="Company watermark">`:'';
 document.getElementById('pdfDocPreview').innerHTML=`<div class="letterPreview">
   ${logoHtml}
   <div class="letterTitle">${esc(t.title)}</div>
   <div class="letterAddress">${recipientHtml}</div>
   <div class="letterMeta">${metaHtml}</div>
   <div class="letterSalute">${esc(t.salutation)}</div>
   <div class="letterBody">${bodyHtml}</div>
   <div class="letterClose">${esc(t.closing)}<br><br>${esc(t.closingName)}</div>
   ${postHtml}
   ${t.disclosure?`<div class="letterDisclosure"><b>DISCLOSURE</b>${esc(t.disclosure)}</div>`:''}
 </div>`;
 updateCompanyLogoPreview();
}

async function fillPdfFromPaymentPlan(){
 let a=getCurrent(); if(!a)return;
 try{
   let plan=await loadPaymentPlanForAccount(a.id,true);
   if(!plan)return alert('No active payment plan found.');
   document.getElementById('pdfDocType').value='Stipulation - Payment Plan + Card Authorization';
   document.getElementById('pdfInitialPayment').value=moneyNum(plan.paymentToday||plan.initialPayment||0).toFixed(2);
   document.getElementById('pdfInstallmentAmount').value=moneyNum(plan.amountEach||plan.paymentAmount||0).toFixed(2);
   document.getElementById('pdfPaymentCount').value=plan.numberOfPayments||plan.payments?.length||'';
   document.getElementById('pdfFrequency').value=plan.frequency||'Monthly';
   document.getElementById('pdfSettlementAmount').value=moneyNum(plan.planTotal||0).toFixed(2);
   document.getElementById('pdfDocDueDate').value=(plan.payments&&plan.payments[0]?.dueDate)||plan.startDate||todayISO();
   document.getElementById('pdfDocNotes').value=`Active payment plan loaded. Plan total: ${pdfMoney(plan.planTotal)}. Remaining plan balance: ${pdfMoney(plan.remainingAmount)}.`;
   renderPdfDocPreview();
 }catch(e){alert('Could not load active payment plan: '+e.message)}
}
async function fillPdfFromLatestPayment(){
 let a=getCurrent(); if(!a)return;
 try{
   let rows=(await dbFetch(`/payments_ledger?account_id=eq.${a.id}&select=*&order=payment_date.desc,created_at.desc&limit=1`)).map(toCamel);
   if(!rows.length)return alert('No payment ledger entry found for this account.');
   let r=rows[0];
   document.getElementById('pdfDocType').value=moneyNum(r.balanceAfter)<=0?'Billing Statement - Paid In Full':'Billing Statement - Payment Plan';
   document.getElementById('pdfLastPaymentAmount').value=moneyNum(r.amount).toFixed(2);
   document.getElementById('pdfLastPaymentDate').value=r.paymentDate||todayISO();
   document.getElementById('pdfPaymentMethod').value=r.paymentMethod||'Other';
   document.getElementById('pdfCurrentBalance').value=moneyNum(r.balanceAfter).toFixed(2);
   document.getElementById('pdfDocNotes').value=`Receipt number: ${r.receiptNumber||'—'}. Balance before: ${pdfMoney(r.balanceBefore)}. Balance after: ${pdfMoney(r.balanceAfter)}. ${r.notes||''}`;
   renderPdfDocPreview();
 }catch(e){alert('Could not load latest payment: '+e.message)}
}
function pdfAscii(s){
 return String(s??'').normalize('NFKD').replace(/[^\x20-\x7E]/g,'').replace(/\s+/g,' ').trim();
}
function pdfEscape(s){
 return pdfAscii(s).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
}
function pdfWrapText(text,maxChars=92){
 let words=pdfAscii(text).split(/\s+/),lines=[],line='';
 words.forEach(w=>{
   if((line+' '+w).trim().length>maxChars){if(line)lines.push(line);line=w}
   else line=(line+' '+w).trim();
 });
 if(line)lines.push(line);
 return lines.length?lines:[''];
}
function makeSimplePdf(title,lines){
 let pageLines=[],pages=[],lineLimit=38;
 lines.forEach(line=>{
   if(String(line||'').trim()===''){
     pageLines.push('');
     return;
   }
   let wraps=pdfWrapText(line,82);
   wraps.forEach(w=>{
     pageLines.push(w);
     if(pageLines.length>=lineLimit){pages.push(pageLines);pageLines=[];}
   });
 });
 if(pageLines.length)pages.push(pageLines);
 let objects=[];
 function addObj(str){objects.push(str);return objects.length;}
 let fontId=addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
 let boldId=addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
 let pageIds=[];
 pages.forEach((p,idx)=>{
   let y=704,content=[];
   let titleText=idx===0?title:title+" - continued";
   let approxWidth=Math.min(420, titleText.length*8.5);
   let titleX=Math.max(72, 306-(approxWidth/2));
   content.push(`BT /F2 17 Tf ${titleX.toFixed(0)} 742 Td (${pdfEscape(titleText)}) Tj ET`);
   y=694;
   p.forEach((line)=>{
     let raw=String(line||'');
     if(raw.trim()===''){
       y-=13;
       return;
     }
     let isHead=raw.startsWith('## ');
     let font=isHead?'/F2 11 Tf':'/F1 10 Tf';
     let clean=raw.replace(/^##\s*/,'');
     if(isHead){
       y-=6;
       content.push(`BT ${font} 72 ${y} Td (${pdfEscape(clean)}) Tj ET`);
       y-=18;
     }else{
       content.push(`BT ${font} 72 ${y} Td (${pdfEscape(clean)}) Tj ET`);
       y-=15;
     }
   });
   content.push(`BT /F1 8 Tf 72 38 Td (Page ${idx+1} of ${pages.length}) Tj ET`);
   let stream=content.join("\n");
   let contentId=addObj(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
   let pageId=addObj(`<< /Type /Page /Parent 0 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldId} 0 R >> >> /Contents ${contentId} 0 R >>`);
   pageIds.push(pageId);
 });
 let pagesId=addObj(`<< /Type /Pages /Kids [${pageIds.map(id=>id+" 0 R").join(" ")}] /Count ${pageIds.length} >>`);
 objects=objects.map(o=>o.replace("/Parent 0 0 R",`/Parent ${pagesId} 0 R`));
 let catalogId=addObj(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
 let pdf="%PDF-1.4\n";
 let offsets=[0];
 objects.forEach((obj,i)=>{
   offsets.push(pdf.length);
   pdf+=`${i+1} 0 obj\n${obj}\nendobj\n`;
 });
 let xref=pdf.length;
 pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
 for(let i=1;i<=objects.length;i++)pdf+=String(offsets[i]).padStart(10,'0')+" 00000 n \n";
 pdf+=`trailer\n<< /Size ${objects.length+1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
 return new Blob([pdf],{type:'application/pdf'});
}

function asciiBytes(s){return new TextEncoder().encode(String(s));}
function pdfConcatBlob(parts){return new Blob(parts,{type:'application/pdf'});}
function makePdfObjectParts(id,bodyParts){
 let parts=[asciiBytes(`${id} 0 obj\n`)];
 bodyParts.forEach(p=>parts.push(typeof p==='string'?asciiBytes(p):p));
 parts.push(asciiBytes(`\nendobj\n`));
 return parts;
}
async function makeSimplePdfWithLogo(title,lines){
 await loadCompanyLogoSettings(false);
 let logoBytes=companyLogoSettings.dataUrl?logoDataUrlBytes():null;
 if(!logoBytes||!logoBytes.length)return makeSimplePdf(title,lines);

 let pageLines=[],pages=[],lineLimit=38;
 lines.forEach(line=>{
   if(String(line||'').trim()===''){pageLines.push('');return;}
   let wraps=pdfWrapText(line,82);
   wraps.forEach(w=>{
     pageLines.push(w);
     if(pageLines.length>=lineLimit){pages.push(pageLines);pageLines=[];}
   });
 });
 if(pageLines.length)pages.push(pageLines);

 let objects=[];
 function add(parts){objects.push(Array.isArray(parts)?parts:[parts]);return objects.length;}
 let fontId=add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
 let boldId=add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

 let imgW=companyLogoSettings.width||500;
 let imgH=companyLogoSettings.height||160;
 let logoId=add([`<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logoBytes.length} >>\nstream\n`,logoBytes,`\nendstream`]);

 // Transparent graphics state. Low opacity keeps letter text readable.
 let gsId=add("<< /Type /ExtGState /ca 0.16 /CA 0.16 >>");

 let pageIds=[];
 pages.forEach((p,idx)=>{
   let y=704,content=[];

   // Centered watermark behind all text. Aspect ratio is preserved; never stretched.
   let maxW=360;
   let maxH=330;
   let scale=Math.min(maxW/imgW,maxH/imgH);
   let wmW=imgW*scale;
   let wmH=imgH*scale;
   let wmX=(612-wmW)/2;
   let wmY=250;
   // Shift tall logos slightly upward; wide logos sit naturally center.
   if(wmH>220)wmY=230;
   content.push(`q /GSwm gs ${wmW.toFixed(2)} 0 0 ${wmH.toFixed(2)} ${wmX.toFixed(2)} ${wmY.toFixed(2)} cm /Logo Do Q`);

   let titleText=idx===0?title:title+" - continued";
   let approxWidth=Math.min(420, titleText.length*8.5);
   let titleX=Math.max(72, 306-(approxWidth/2));
   content.push(`BT /F2 17 Tf ${titleX.toFixed(0)} 742 Td (${pdfEscape(titleText)}) Tj ET`);

   p.forEach((line)=>{
     let raw=String(line||'');
     if(raw.trim()===''){
       y-=13;
       return;
     }
     let isHead=raw.startsWith('## ');
     let font=isHead?'/F2 11 Tf':'/F1 10 Tf';
     let clean=raw.replace(/^##\s*/,'');
     if(isHead){
       y-=6;
       content.push(`BT ${font} 72 ${y} Td (${pdfEscape(clean)}) Tj ET`);
       y-=18;
     }else{
       content.push(`BT ${font} 72 ${y} Td (${pdfEscape(clean)}) Tj ET`);
       y-=15;
     }
   });

   content.push(`BT /F1 8 Tf 72 38 Td (Page ${idx+1} of ${pages.length}) Tj ET`);
   let stream=content.join("\n");
   let contentId=add(`<< /Length ${asciiBytes(stream).length} >>\nstream\n${stream}\nendstream`);
   let pageId=add(`<< /Type /Page /Parent 0 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldId} 0 R >> /XObject << /Logo ${logoId} 0 R >> /ExtGState << /GSwm ${gsId} 0 R >> >> /Contents ${contentId} 0 R >>`);
   pageIds.push(pageId);
 });

 let pagesId=add(`<< /Type /Pages /Kids [${pageIds.map(id=>id+" 0 R").join(" ")}] /Count ${pages.length} >>`);
 objects=objects.map(parts=>parts.map(p=>typeof p==='string'?p.replace("/Parent 0 0 R",`/Parent ${pagesId} 0 R`):p));
 let catalogId=add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

 let pdfParts=[],offset=0,offsets=[0];
 function push(part){
   let b=part instanceof Uint8Array?part:asciiBytes(part);
   pdfParts.push(b);
   offset+=b.length;
 }
 push("%PDF-1.4\n");
 objects.forEach((bodyParts,idx)=>{
   offsets.push(offset);
   makePdfObjectParts(idx+1,bodyParts).forEach(push);
 });
 let xref=offset;
 push(`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`);
 for(let i=1;i<=objects.length;i++)push(String(offsets[i]).padStart(10,'0')+" 00000 n \n");
 push(`trailer\n<< /Size ${objects.length+1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`);
 return pdfConcatBlob(pdfParts);
}

function pdfDocumentLines(d){
 let t=pdfProfessionalTemplate(d);
 let lines=[];
 lines.push(...t.recipient);
 lines.push('');
 t.meta.forEach(([k,v])=>lines.push(`${k}: ${v||'—'}`));
 lines.push('');
 lines.push(t.salutation);
 lines.push('');
 t.paragraphs.forEach(p=>{lines.push(p);lines.push('')});
 lines.push(t.closing);
 lines.push('');
 lines.push(t.closingName);
 lines.push('');
 if(t.post.length){
   lines.push('## ADDITIONAL INFORMATION');
   t.post.forEach(([k,v])=>{
     if(String(v||'').includes(' | ')){
       lines.push(`${k}:`);
       String(v).split(' | ').forEach(x=>lines.push(x));
     }else{
       lines.push(`${k}: ${v||'—'}`);
     }
   });
   lines.push('');
 }
 if(t.disclosure){
   lines.push('## DISCLOSURE');
   lines.push(t.disclosure);
 }
 return lines;
}
function pdfFileName(d){
 let safe=(d.debtorName||'account').replace(/[^a-z0-9]+/gi,'_').replace(/^_+|_+$/g,'').slice(0,40);
 let type=d.docType.replace(/[^a-z0-9]+/gi,'_').toLowerCase();
 return `${type}_${safe}_${d.accountNumber||'account'}_${todayISO()}.pdf`;
}
async function saveGeneratedDocRecord(d,fileName,downloaded){
 let a=getCurrent(); if(!a)return;
 let title=d.docType;
 let note=`${downloaded?'Downloaded PDF and saved record':'Created document record'}: ${fileName||title}`;
 try{
   await dbFetch('/account_docs',{method:'POST',body:JSON.stringify([{account_id:a.id,doc_title:title,doc_type:d.docType,doc_url:fileName||'',notes:note,generated_file_name:fileName||'',generated_doc_type:d.docType,generated_by_email:currentUser.email,generated_at:new Date().toISOString(),created_by_email:currentUser.email}])});
 }catch(e){
   try{await dbFetch('/account_docs',{method:'POST',body:JSON.stringify([{account_id:a.id,doc_title:title,doc_type:d.docType,doc_url:fileName||'',notes:note,created_by_email:currentUser.email}])});}catch(e2){}
 }
 try{await insertActivity(a.id,'Debtor Document Created',`${d.docType}${fileName?': '+fileName:''}`)}catch(e){}
 if(typeof insertAudit==='function')try{await insertAudit('Debtor Document Created',`${d.docType} for ${nameOf(a)}${fileName?': '+fileName:''}`,'account',a.id)}catch(e){}
}
async function loadGeneratedDocsForCurrent(){
 let a=getCurrent(); if(!a)return;
 let docs=[];
 try{docs=(await dbFetch(`/account_docs?account_id=eq.${a.id}&select=*&order=created_at.desc&limit=15`)).map(toCamel).filter(d=>String(d.notes||'').includes('document')||String(d.notes||'').includes('PDF'))}catch(e){docs=[]}
 pdfGeneratedDocsCache=docs;
 let box=document.getElementById('pdfGeneratedList'); if(!box)return;
 box.innerHTML=docs.map(d=>`<div class="pdfSavedItem"><div><div class="pdfSavedTitle">${esc(d.docTitle||'Document')}</div><div class="pdfSavedMeta">${esc(d.docType||'')} • ${esc(String(d.createdAt||'').slice(0,19))}<br>${esc(d.docUrl||d.notes||'')}</div></div><button class="outline" onclick="openAccountDocs()">View Docs</button></div>`).join('')||'<div class="pdfSavedItem"><div class="pdfSavedMeta">No created document records yet.</div></div>';
}
async function saveDocumentRecordOnly(){
 let a=getCurrent(); if(!a)return alert('No account selected.');
 let d=pdfDocData();
 if(currentUser.isAdmin)await savePdfAuthorizedByDefault(true);
 await saveGeneratedDocRecord(d,'',false);
 await loadGeneratedDocsForCurrent();
 alert('Document record saved to this account.');
}
async function generateAccountPdf(){
 let a=getCurrent(); if(!a)return alert('No account selected.');
 let d=pdfDocData();
 if(currentUser.isAdmin)await savePdfAuthorizedByDefault(true);
 if(d.docType.includes('Settlement') && d.settlementAmount>d.currentBalance)return alert('Settlement amount cannot be higher than current balance.');
 if(d.docType.includes('Payment Plan') && d.paymentCount>0 && d.installmentAmount>0){
   let total=(d.initialPayment||0)+(d.installmentAmount*d.paymentCount);
   if(total>d.currentBalance+0.01)return alert('Payment plan total cannot be more than current balance.');
 }
 let lines=pdfDocumentLines(d);
 let blob=await makeSimplePdfWithLogo(d.docType,lines);
 let fileName=pdfFileName(d);
 let url=URL.createObjectURL(blob);
 let link=document.createElement('a');
 link.href=url; link.download=fileName; document.body.appendChild(link); link.click(); link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),3000);
 await saveGeneratedDocRecord(d,fileName,true);
 await loadGeneratedDocsForCurrent();
 alert(d.docType+' PDF downloaded and saved to Account Docs.');
}

/* PAYMENT LEDGER + BROKEN PROMISE AUTOMATION */
let paymentLedgerData=[];
let paymentsDashboardData={ledger:[],broken:[],payments:[],plans:[]};

function ledgerReceiptNo(){
 return 'RCPT-'+new Date().toISOString().replace(/[-:.TZ]/g,'').slice(0,14)+'-'+Math.random().toString(36).slice(2,6).toUpperCase();
}
function ledgerBalanceAfter(balance,amount,type,status){
 balance=moneyNum(balance); amount=moneyNum(amount);
 if(status!=='Completed')return balance;
 if(type==='Payment'||type==='Adjustment Credit')return Math.max(0,Number((balance-amount).toFixed(2)));
 if(type==='Reversal'||type==='Adjustment Debit')return Number((balance+amount).toFixed(2));
 return balance;
}
function openPaymentLedger(){
 let a=getCurrent(); if(!a)return alert('No account selected.');
 document.getElementById('ledgerDate').value=todayISO();
 document.getElementById('ledgerAmount').value='';
 document.getElementById('ledgerType').value='Payment';
 document.getElementById('ledgerStatus').value='Completed';
 document.getElementById('ledgerMethod').value='Card';
 document.getElementById('ledgerReceipt').value='';
 document.getElementById('ledgerApplyPlan').value='auto';
 document.getElementById('ledgerEnteredBy').value=currentUser.email||'';
 document.getElementById('ledgerNotes').value='';
 document.getElementById('paymentLedgerModal').classList.add('open');
 updateLedgerPreview();
 loadPaymentLedgerForCurrent();
}
function updateLedgerPreview(){
 let a=getCurrent(); let bal=accountBalance(a); let amt=moneyNum(val('ledgerAmount')); let type=val('ledgerType')||'Payment'; let status=val('ledgerStatus')||'Completed';
 let after=ledgerBalanceAfter(bal,amt,type,status);
 let cur=document.getElementById('ledgerCurrentBalance'), pay=document.getElementById('ledgerPaymentAmount'), aft=document.getElementById('ledgerBalanceAfter');
 if(cur)cur.textContent=money(bal);
 if(pay)pay.textContent=(type==='Reversal'||type==='Adjustment Debit'?'+':'-')+money(amt);
 if(aft)aft.textContent=money(after);
}
async function loadPaymentLedgerForCurrent(){
 let a=getCurrent(); if(!a)return;
 let rows=[];
 try{rows=(await dbFetch(`/payments_ledger?account_id=eq.${a.id}&select=*&order=payment_date.desc,created_at.desc&limit=500`)).map(toCamel)}catch(e){rows=[]}
 paymentLedgerData=rows;
 let body=document.getElementById('ledgerHistoryBody'); if(!body)return;
 body.innerHTML=rows.map(r=>`<tr>
   <td>${esc(r.paymentDate||String(r.createdAt||'').slice(0,10))}</td>
   <td><span class="ledgerPill ${r.paymentType==='Payment'||r.paymentType==='Adjustment Credit'?'green':'red'}">${esc(r.paymentType||'Payment')}</span></td>
   <td><b>${money(r.amount)}</b></td>
   <td>${esc(r.paymentMethod||'')}</td>
   <td>${esc(r.status||'')}</td>
   <td>${money(r.balanceBefore)}</td>
   <td>${money(r.balanceAfter)}</td>
   <td>${esc(r.receiptNumber||'')}</td>
   <td>${esc(r.createdByEmail||'')}</td>
   <td>${esc(r.notes||'')}</td>
 </tr>`).join('')||'<tr><td colspan="10"><div class="powerEmpty">No payment ledger entries yet.</div></td></tr>';
}
async function applyLedgerPaymentToPlan(accountId,amount){
 amount=moneyNum(amount);
 if(amount<=0)return null;
 let plan=await loadPaymentPlanForAccount(accountId,true);
 if(!plan)return null;
 let payments=(plan.payments||[]).filter(p=>!['Paid','Cancelled'].includes(p.status) && moneyNum(p.amountDue)>moneyNum(p.amountPaid)).sort((a,b)=>String(a.dueDate||'').localeCompare(String(b.dueDate||'')));
 let remainingToApply=amount, applied=[];
 for(let p of payments){
   if(remainingToApply<=0)break;
   let dueLeft=Math.max(0,moneyNum(p.amountDue)-moneyNum(p.amountPaid));
   let apply=Math.min(dueLeft,remainingToApply);
   let newPaid=Number((moneyNum(p.amountPaid)+apply).toFixed(2));
   let newStatus=newPaid+0.01>=moneyNum(p.amountDue)?'Paid':'Partial';
   await dbFetch(`/payment_plan_payments?id=eq.${p.id}`,{method:'PATCH',body:JSON.stringify({amount_paid:newPaid,paid_date:newStatus==='Paid'?todayISO():(p.paidDate||null),status:newStatus,updated_at:new Date().toISOString()})});
   remainingToApply=Number((remainingToApply-apply).toFixed(2));
   applied.push({paymentId:p.id,applied:apply,status:newStatus});
 }
 if(applied.length){
   let paidNow=applied.reduce((s,x)=>s+x.applied,0);
   let newRemaining=Math.max(0,moneyNum(plan.remainingAmount)-paidNow);
   await dbFetch(`/payment_plans?id=eq.${plan.id}`,{method:'PATCH',body:JSON.stringify({remaining_amount:newRemaining,status:newRemaining<=0?'Paid':'Active',updated_at:new Date().toISOString()})}).catch(()=>{});
   delete paymentPlanCache[accountId];
 }
 return applied;
}
async function saveLedgerPayment(){
 let a=getCurrent(); if(!a)return alert('No account selected.');
 let amount=moneyNum(val('ledgerAmount'));
 let type=val('ledgerType')||'Payment';
 let status=val('ledgerStatus')||'Completed';
 let method=val('ledgerMethod')||'Other';
 let paymentDate=val('ledgerDate')||todayISO();
 let balBefore=accountBalance(a);
 if(amount<=0)return alert('Enter a payment amount greater than zero.');
 if((type==='Payment'||type==='Adjustment Credit') && status==='Completed' && amount>balBefore+0.01)return alert('Payment cannot be more than current balance of '+money(balBefore)+'.');
 let balAfter=ledgerBalanceAfter(balBefore,amount,type,status);
 let receipt=val('ledgerReceipt')||ledgerReceiptNo();
 let row={
   account_id:a.id,
   payment_date:paymentDate,
   amount,
   payment_type:type,
   payment_method:method,
   status,
   receipt_number:receipt,
   balance_before:balBefore,
   balance_after:balAfter,
   notes:val('ledgerNotes'),
   created_by_email:currentUser.email
 };
 let saved=(await dbFetch('/payments_ledger',{method:'POST',body:JSON.stringify([row])}))[0];
 let applied=null;
 if(status==='Completed' && (type==='Payment'||type==='Adjustment Credit') && val('ledgerApplyPlan')==='auto'){
   applied=await applyLedgerPaymentToPlan(a.id,amount);
 }
 if(status==='Completed'){
   let accountPatch={current_balance:balAfter,updated_at:new Date().toISOString()};
   if(balAfter<=0){accountPatch.status='Settled';accountPatch.disposition='Settled'}
   await dbFetch(`/accounts?id=eq.${a.id}`,{method:'PATCH',body:JSON.stringify(accountPatch)});
 }
 let appliedText=applied&&applied.length?` Applied to ${applied.length} scheduled payment(s).`:'';
 await insertActivity(a.id,'Payment Ledger',`${type} ${money(amount)} via ${method}. Balance ${money(balBefore)} → ${money(balAfter)}. Receipt ${receipt}.${appliedText}`);
 if(typeof insertAudit==='function')await insertAudit('Payment Ledger',`${type} ${money(amount)} on ${nameOf(a)}. Balance ${money(balBefore)} to ${money(balAfter)}`,'account',a.id);
 await loadAccounts();
 currentAccountId=a.id;
 await loadPaymentLedgerForCurrent();
 await renderPaymentPlanSummary(a.id).catch(()=>{});
 updateLedgerPreview();
 alert('Payment saved. New account balance: '+money(balAfter));
}

/* Payments dashboard */
async function openPaymentsDashboard(){
 document.getElementById('paymentsDashboardModal').classList.add('open');
 await loadPaymentsDashboard();
}
async function loadPaymentsDashboard(){
 let ledger=[],payments=[],plans=[];
 try{ledger=(await dbFetch('/payments_ledger?select=*&order=payment_date.desc,created_at.desc&limit=10000')).map(toCamel)}catch(e){ledger=[]}
 try{payments=(await dbFetch('/payment_plan_payments?select=*&order=due_date.asc&limit=10000')).map(toCamel)}catch(e){payments=[]}
 try{plans=(await dbFetch('/payment_plans?select=*&order=created_at.desc&limit=10000')).map(toCamel)}catch(e){plans=[]}
 if(!currentUser.isAdmin){
   let ids=new Set(accounts.map(a=>String(a.id)));
   ledger=ledger.filter(r=>ids.has(String(r.accountId)));
   payments=payments.filter(p=>ids.has(String(p.accountId)));
   plans=plans.filter(p=>ids.has(String(p.accountId)));
 }
 let broken=payments.filter(p=>String(p.status||'')==='Broken Promise'||(unpaidPayment(p)&&isPastISO(p.dueDate)));
 paymentsDashboardData={ledger,broken,payments,plans};
 renderPaymentsDashboard('recent');
}
function paymentLedgerRow(r){
 let a=accountById(r.accountId);
 let cls=r.paymentType==='Payment'||r.paymentType==='Adjustment Credit'?'green':r.paymentType==='Reversal'||r.paymentType==='Adjustment Debit'?'red':'gray';
 return `<tr>
   <td>${esc(r.paymentDate||String(r.createdAt||'').slice(0,10))}</td>
   <td>${esc(a?acctNo(a):r.accountId||'')}</td>
   <td>${esc(a?nameOf(a):'Unknown')}</td>
   <td><span class="ledgerPill ${cls}">${esc(r.paymentType||'Payment')}</span></td>
   <td><b>${money(r.amount)}</b></td>
   <td>${esc(r.paymentMethod||'')}</td>
   <td>${esc(r.status||'')}</td>
   <td>${money(r.balanceAfter)}</td>
   <td>${esc(r.createdByEmail||'')}</td>
   <td>${a?`<button class="outline" onclick="setAccountFromModal('${a.id}','paymentsDashboardModal')">Open</button>`:''}</td>
 </tr>`;
}
function brokenPromiseRow(p){
 let a=accountById(p.accountId);
 let owed=Math.max(0,moneyNum(p.amountDue)-moneyNum(p.amountPaid));
 return `<tr class="brokenRow">
   <td>${esc(p.dueDate||'')}</td>
   <td>${esc(a?acctNo(a):p.accountId||'')}</td>
   <td>${esc(a?nameOf(a):'Unknown')}</td>
   <td><span class="ledgerPill red">Broken Promise</span></td>
   <td><b>${money(owed)}</b></td>
   <td>${esc(a?.assignedToEmail||'')}</td>
   <td>${esc(p.status||'Scheduled')}</td>
   <td>${a?money(accountBalance(a)):'—'}</td>
   <td>${esc(p.createdByEmail||'')}</td>
   <td>${a?`<button class="outline" onclick="setAccountFromModal('${a.id}','paymentsDashboardModal')">Open</button>`:''}</td>
 </tr>`;
}
function renderPaymentsDashboard(tab='recent'){
 ['Recent','Today','Broken'].forEach(t=>document.getElementById('payTab'+t)?.classList.toggle('active',tab.toLowerCase()===t.toLowerCase()));
 let ledger=paymentsDashboardData.ledger||[];
 let today=todayISO();
 let month=today.slice(0,7);
 let completed=ledger.filter(r=>r.status==='Completed');
 let payments=completed.filter(r=>r.paymentType==='Payment'||r.paymentType==='Adjustment Credit');
 let reversals=completed.filter(r=>r.paymentType==='Reversal'||r.paymentType==='Adjustment Debit');
 document.getElementById('payStatToday').textContent=money(payments.filter(r=>String(r.paymentDate)===today).reduce((s,r)=>s+moneyNum(r.amount),0));
 document.getElementById('payStatMonth').textContent=money(payments.filter(r=>String(r.paymentDate||'').slice(0,7)===month).reduce((s,r)=>s+moneyNum(r.amount),0));
 document.getElementById('payStatTotal').textContent=money(payments.reduce((s,r)=>s+moneyNum(r.amount),0));
 document.getElementById('payStatPending').textContent=money(ledger.filter(r=>r.status==='Pending').reduce((s,r)=>s+moneyNum(r.amount),0));
 document.getElementById('payStatReversals').textContent=money(reversals.reduce((s,r)=>s+moneyNum(r.amount),0));
 document.getElementById('payStatBroken').textContent=(paymentsDashboardData.broken||[]).length;
 let body=document.getElementById('paymentsDashboardBody');
 if(tab==='broken'){
   body.innerHTML=(paymentsDashboardData.broken||[]).map(brokenPromiseRow).join('')||'<tr><td colspan="10"><div class="powerEmpty">No broken promises found.</div></td></tr>';
   return;
 }
 let rows=tab==='today'?ledger.filter(r=>String(r.paymentDate)===today):ledger;
 body.innerHTML=rows.map(paymentLedgerRow).join('')||'<tr><td colspan="10"><div class="powerEmpty">No payment ledger records yet.</div></td></tr>';
}
function exportPaymentLedgerCSV(){
 let rows=paymentsDashboardData.ledger||[];
 let csv=['date,account,name,type,amount,method,status,balance_before,balance_after,receipt,entered_by,notes'];
 rows.forEach(r=>{
   let a=accountById(r.accountId);
   csv.push([r.paymentDate,a?acctNo(a):r.accountId,a?nameOf(a):'',r.paymentType,r.amount,r.paymentMethod,r.status,r.balanceBefore,r.balanceAfter,r.receiptNumber,r.createdByEmail,r.notes].map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(','));
 });
 download('payment_ledger_export.csv',csv.join('\n'),'text/csv');
 if(typeof insertAudit==='function')insertAudit('Export Payment Ledger','Exported '+rows.length+' payment ledger rows','payments_ledger','');
}

/* Broken promise automation */
async function runBrokenPromiseAutomation(showAlert=false){
 let today=todayISO();
 let lastKey='brokenPromiseCheck:'+today+':'+(currentUser.email||'');
 if(!showAlert && sessionStorage.getItem(lastKey))return;
 let rows=[];
 try{rows=(await dbFetch(`/payment_plan_payments?select=*&due_date=lt.${today}&limit=10000`)).map(toCamel)}catch(e){rows=[]}
 rows=rows.filter(p=>!['Paid','Cancelled','Broken Promise'].includes(p.status||'') && moneyNum(p.amountDue)>moneyNum(p.amountPaid));
 if(!currentUser.isAdmin){
   let allowed=new Set(accounts.map(a=>String(a.id)));
   rows=rows.filter(p=>allowed.has(String(p.accountId)));
 }
 let accountIds=[...new Set(rows.map(p=>p.accountId).filter(Boolean))];
 let planIds=[...new Set(rows.map(p=>p.planId).filter(Boolean))];
 for(let p of rows){
   await dbFetch(`/payment_plan_payments?id=eq.${p.id}`,{method:'PATCH',body:JSON.stringify({status:'Broken Promise',updated_at:new Date().toISOString()})}).catch(()=>{});
 }
 for(let pid of planIds){
   await dbFetch(`/payment_plans?id=eq.${pid}`,{method:'PATCH',body:JSON.stringify({status:'Broken Promise',updated_at:new Date().toISOString()})}).catch(()=>{});
 }
 for(let aid of accountIds){
   await dbFetch(`/accounts?id=eq.${aid}`,{method:'PATCH',body:JSON.stringify({status:'Broken Promise',disposition:'Broken Promise',updated_at:new Date().toISOString()})}).catch(()=>{});
   await insertActivity(aid,'Broken Promise','Missed promise payment automatically flagged. Follow-up required.').catch(()=>{});
   await dbFetch('/follow_ups',{method:'POST',body:JSON.stringify([{account_id:aid,follow_up_type:'Broken Promise Follow-Up',due_date:today,status:'Open',assigned_to_email:(accountById(aid)?.assignedToEmail||currentUser.email||''),reason:'Missed payment promise',notes:'Automatically created from broken promise automation.',created_by_email:currentUser.email}])}).catch(()=>{});
 }
 sessionStorage.setItem(lastKey,'1');
 if(rows.length){
   if(typeof insertAudit==='function')await insertAudit('Broken Promise Automation','Flagged '+rows.length+' missed payment(s) across '+accountIds.length+' account(s)','payment_plan_payments','');
   await loadAccounts();
   if(document.getElementById('paymentsDashboardModal')?.classList.contains('open'))await loadPaymentsDashboard();
   if(document.getElementById('promiseDashboardModal')?.classList.contains('open'))await loadPromiseDashboard();
   if(document.getElementById('dailyWorkQueueModal')?.classList.contains('open'))await loadDailyWorkQueue();
 }
 if(showAlert)alert(rows.length?('Broken promise check complete. Flagged '+rows.length+' missed payment(s).'):'No broken promises found.');
}


/* Promise Automation + Collector Alerts */
let collectorAlertData={alerts:[],tab:'all'};
function paStatusText(r){return String(r?.status||'').trim()||'Pending Processing'}
function paIsPaid(r){return ['paid','completed','settled'].includes(paStatusText(r).toLowerCase())||moneyNum(r?.paidAmount||r?.amountPaid)>0}
function paIsClosed(r){return ['paid','completed','settled','canceled','cancelled'].includes(paStatusText(r).toLowerCase())}
function paIsBrokenStatus(r){return ['broken promise','failed','nsf','past due / pending'].includes(paStatusText(r).toLowerCase())}
function paAmount(r){return moneyNum(r?.paymentAmount||r?.amountDue||r?.totalAmount||0)}
function paPaid(r){return moneyNum(r?.paidAmount||r?.amountPaid||0)}
function paDue(r){return String(r?.dueDate||r?.due_date||'').slice(0,10)}
function paAccountId(r){return r?.accountId||r?.account_id||''}
function paEmployee(r,a){return (r?.employeeEmail||r?.assignedToEmail||r?.createdByEmail||a?.assignedToEmail||'').toLowerCase()}
function paAccount(r){return accountById(paAccountId(r))}
function paAlertKey(x){return [x.type||'',x.sourceTable||'',x.sourceId||'',x.accountId||'',x.dueDate||''].join('|')}
function paResolvedKeys(){try{return JSON.parse(localStorage.getItem('cpcmResolvedCollectorAlerts')||'[]')}catch(e){return[]}}
function paSetResolvedKey(k){let arr=paResolvedKeys();if(!arr.includes(k)){arr.push(k);localStorage.setItem('cpcmResolvedCollectorAlerts',JSON.stringify(arr.slice(-500)))}}
function paAllowedAlert(x){if(currentUser?.isAdmin)return true;let e=(currentUser?.email||'').toLowerCase();return !x.assignedToEmail || String(x.assignedToEmail).toLowerCase()===e || accounts.some(a=>String(a.id)===String(x.accountId)&&String(a.assignedToEmail||'').toLowerCase()===e)}
function paSeverityClass(sev){sev=String(sev||'info').toLowerCase();return sev==='critical'?'critical':sev==='warning'?'warning':sev==='success'?'success':'info'}
function paDueLabel(d){if(!d)return 'No date';if(isPastISO(d))return 'Overdue '+d;if(isTodayISO(d))return 'Due today';if(isFutureISO(d))return 'Due '+d;return d}
function paDueClass(d){if(!d)return '';return isPastISO(d)?'alertDueNow':isTodayISO(d)?'alertDueToday':'alertDueSoon'}
async function createCollectorAlert(row){
 try{
   await dbFetch('/collector_alerts',{method:'POST',body:JSON.stringify([{account_id:row.accountId||null,alert_type:row.type||'General',severity:row.severity||'info',title:row.title||'Collector Alert',message:row.message||'',due_date:row.dueDate||null,status:'Open',assigned_to_email:row.assignedToEmail||'',created_by_email:currentUser?.email||'',source_table:row.sourceTable||'',source_id:String(row.sourceId||'')}])});
 }catch(e){/* optional table not installed yet or duplicate alert */}
}
async function fetchManualPromises(){try{return (await dbFetch('/payment_promises?select=*&order=due_date.asc&limit=50000')).map(toCamel)}catch(e){return[]}}
async function fetchPlanPayments(){try{return (await dbFetch('/payment_plan_payments?select=*&order=due_date.asc&limit=50000')).map(toCamel)}catch(e){return[]}}
async function runPromiseAutomation(showAlert=false,reloadAfter=false){
 let today=todayISO();let flagged=0,alertsMade=0;
 if(typeof runBrokenPromiseAutomation==='function')await runBrokenPromiseAutomation(false).catch(()=>{});
 let manual=await fetchManualPromises();
 if(!currentUser?.isAdmin){let allowed=new Set(accounts.map(a=>String(a.id)));manual=manual.filter(r=>allowed.has(String(paAccountId(r)))||paEmployee(r,paAccount(r))===(currentUser.email||'').toLowerCase())}
 let broken=manual.filter(r=>paDue(r)&&paDue(r)<today&&!paIsPaid(r)&&!paIsClosed(r)&&!paIsBrokenStatus(r));
 for(let r of broken){
   let a=paAccount(r);let amt=paAmount(r)-paPaid(r);let note='Auto-flagged missed payment promise due '+paDue(r)+'.';
   try{await dbFetch('/payment_promises?id=eq.'+encodeURIComponent(r.id),{method:'PATCH',body:JSON.stringify({status:'Broken Promise',admin_note:note,processed_by_email:currentUser?.email||'',processed_at:new Date().toISOString(),updated_at:new Date().toISOString()})});flagged++;}catch(e){}
   if(a){await dbFetch(`/accounts?id=eq.${a.id}`,{method:'PATCH',body:JSON.stringify({status:'Broken Promise',disposition:'Broken Promise',updated_at:new Date().toISOString()})}).catch(()=>{});}
   await insertActivity(paAccountId(r),'Broken Promise',`Missed manual payment promise automatically flagged: ${money(amt)} due ${paDue(r)}.`).catch(()=>{});
   await dbFetch('/follow_ups',{method:'POST',body:JSON.stringify([{account_id:paAccountId(r),follow_up_type:'Broken Promise Follow-Up',due_date:today,status:'Open',assigned_to_email:paEmployee(r,a)||currentUser?.email||'',reason:'Missed manual payment promise',notes:'Automatically created from Promise Automation.',created_by_email:currentUser?.email||''}])}).catch(()=>{});
   await createCollectorAlert({type:'Broken Promise',severity:'critical',title:'Broken promise needs follow-up',message:`${a?nameOf(a):r.debtorName||'Account'} missed ${money(amt)} due ${paDue(r)}.`,dueDate:today,accountId:paAccountId(r),assignedToEmail:paEmployee(r,a),sourceTable:'payment_promises',sourceId:r.id});alertsMade++;
 }
 if(flagged&&typeof insertAudit==='function')await insertAudit('Promise Automation','Flagged '+flagged+' manual payment promise(s) as broken.','payment_promises','').catch(()=>{});
 if(showAlert){alert((flagged||alertsMade)?`Promise automation complete. Flagged ${flagged} broken promise(s).`:'Promise automation complete. No new broken promises found.');}
 if(reloadAfter&&flagged)await loadAccounts();
 if(document.getElementById('collectorAlertsModal')?.classList.contains('open'))await loadCollectorAlerts(false);
 await refreshCollectorAlertBadge().catch(()=>{});
}
function computedAlertFromManualPromise(r){let a=paAccount(r);let due=paDue(r);let amt=Math.max(0,paAmount(r)-paPaid(r));let status=paStatusText(r);let type='Upcoming Promise',sev='info',title='Upcoming payment promise';if(paIsBrokenStatus(r)||due<todayISO()){type='Broken Promise';sev='critical';title='Broken promise needs follow-up'}else if(isTodayISO(due)){type='Promise Due Today';sev='warning';title='Promise due today'}else if(due<=addDaysISO(todayISO(),7)){type='Upcoming Promise';sev='info';title='Upcoming promise this week'}else{return null}return {key:'manual:'+r.id,type,severity:sev,title,message:`${a?nameOf(a):r.debtorName||'Account'} • ${money(amt)} • ${paDueLabel(due)} • Status: ${status}`,dueDate:due,accountId:paAccountId(r),assignedToEmail:paEmployee(r,a),sourceTable:'payment_promises',sourceId:r.id,accountName:a?nameOf(a):(r.debtorName||'Unknown'),accountNumber:a?acctNo(a):(r.accountNumber||'—')};}
function computedAlertFromPlanPayment(p){let a=paAccount(p);let due=paDue(p);let amt=Math.max(0,moneyNum(p.amountDue)-moneyNum(p.amountPaid));let type='Upcoming Plan Payment',sev='info',title='Upcoming plan payment';if(paIsPaid(p)||paIsClosed(p))return null;if(paIsBrokenStatus(p)||due<todayISO()){type='Broken Promise';sev='critical';title='Broken payment plan promise'}else if(isTodayISO(due)){type='Promise Due Today';sev='warning';title='Plan payment due today'}else if(due<=addDaysISO(todayISO(),7)){type='Upcoming Promise';sev='info';title='Upcoming plan payment this week'}else{return null}return {key:'plan:'+p.id,type,severity:sev,title,message:`${a?nameOf(a):'Account'} • ${money(amt)} • ${paDueLabel(due)} • Status: ${paStatusText(p)}`,dueDate:due,accountId:paAccountId(p),assignedToEmail:a?.assignedToEmail||currentUser?.email||'',sourceTable:'payment_plan_payments',sourceId:p.id,accountName:a?nameOf(a):'Unknown',accountNumber:a?acctNo(a):'—'};}
function computedHighBalanceAlerts(){let threshold=2500;return accounts.filter(ownsAccount).filter(a=>accountBalance(a)>=threshold&&!['Settled','Closed'].includes(a.status||'')).sort((a,b)=>accountBalance(b)-accountBalance(a)).slice(0,25).map(a=>({key:'high:'+a.id,type:'High Balance',severity:'info',title:'High-balance account needs attention',message:`${nameOf(a)} • ${money(accountBalance(a))} balance • Status: ${a.status||'New'}`,dueDate:todayISO(),accountId:a.id,assignedToEmail:a.assignedToEmail||'',sourceTable:'accounts',sourceId:a.id,accountName:nameOf(a),accountNumber:acctNo(a)}));}
async function loadCollectorAlerts(runAuto=true){
 if(runAuto)await runPromiseAutomation(false,false).catch(()=>{});
 let manual=await fetchManualPromises();let plan=await fetchPlanPayments();let alerts=[];
 manual.map(computedAlertFromManualPromise).filter(Boolean).forEach(x=>alerts.push(x));
 plan.map(computedAlertFromPlanPayment).filter(Boolean).forEach(x=>alerts.push(x));
 computedHighBalanceAlerts().forEach(x=>alerts.push(x));
 try{let dbRows=(await dbFetch('/collector_alerts?select=*&status=eq.Open&order=created_at.desc&limit=50000')).map(toCamel);dbRows.forEach(r=>alerts.push({key:'db:'+r.id,id:r.id,type:r.alertType||r.alert_type||'Alert',severity:r.severity||'info',title:r.title||'Collector Alert',message:r.message||'',dueDate:String(r.dueDate||'').slice(0,10),accountId:r.accountId||'',assignedToEmail:r.assignedToEmail||'',sourceTable:r.sourceTable||'',sourceId:r.sourceId||'',accountName:accountById(r.accountId)?nameOf(accountById(r.accountId)):'',accountNumber:accountById(r.accountId)?acctNo(accountById(r.accountId)):''}));document.getElementById('promiseAutomationNotice')?.classList.add('greenish');}catch(e){document.getElementById('promiseAutomationNotice')?.classList.remove('greenish')}
 let resolved=new Set(paResolvedKeys());let seen=new Set();alerts=alerts.filter(a=>paAllowedAlert(a)).filter(a=>{let k=paAlertKey(a);if(resolved.has(a.key)||resolved.has(k))return false;if(seen.has(k))return false;seen.add(k);return true;});
 alerts.sort((a,b)=>{let rank={critical:0,warning:1,info:2,success:3};let ra=rank[paSeverityClass(a.severity)]??2;let rb=rank[paSeverityClass(b.severity)]??2;return (ra-rb)||String(a.dueDate||'9999').localeCompare(String(b.dueDate||'9999'));});
 collectorAlertData.alerts=alerts;renderCollectorAlerts(collectorAlertData.tab||'all');refreshCollectorAlertBadgeFromData();
}
function refreshCollectorAlertBadgeFromData(){let n=(collectorAlertData.alerts||[]).length;['collectorAlertBadge','collectorAlertNavBadge'].forEach(id=>{let el=document.getElementById(id);if(el){el.textContent=n>99?'99+':String(n);el.classList.toggle('hidden',n<=0);}})}
async function refreshCollectorAlertBadge(){if(!currentUser?.email)return;let manual=await fetchManualPromises();let plan=await fetchPlanPayments();let n=0;let today=todayISO(),week=addDaysISO(today,7);manual.forEach(r=>{let a=paAccount(r),d=paDue(r);if(paAllowedAlert({accountId:paAccountId(r),assignedToEmail:paEmployee(r,a)})&&!paIsPaid(r)&&!paIsClosed(r)&&d&&d<=week)n++;});plan.forEach(p=>{let a=paAccount(p),d=paDue(p);if(paAllowedAlert({accountId:paAccountId(p),assignedToEmail:a?.assignedToEmail||''})&&!paIsPaid(p)&&!paIsClosed(p)&&d&&d<=week)n++;});accounts.filter(ownsAccount).forEach(a=>{if(accountBalance(a)>=2500&&!['Settled','Closed'].includes(a.status||''))n++;});['collectorAlertBadge','collectorAlertNavBadge'].forEach(id=>{let el=document.getElementById(id);if(el){el.textContent=n>99?'99+':String(n);el.classList.toggle('hidden',n<=0);}})}
async function openCollectorAlerts(){document.getElementById('collectorAlertsModal')?.classList.add('open');collectorAlertData.tab='all';await loadCollectorAlerts(true)}
function renderCollectorAlerts(tab='all'){collectorAlertData.tab=tab;['All','Broken','Today','Upcoming','High'].forEach(t=>document.getElementById('alertTab'+t)?.classList.toggle('active',tab.toLowerCase()===t.toLowerCase()));let rows=collectorAlertData.alerts||[];let broken=rows.filter(a=>/broken/i.test(a.type));let today=rows.filter(a=>isTodayISO(a.dueDate));let upcoming=rows.filter(a=>/upcoming/i.test(a.type));let high=rows.filter(a=>/high balance/i.test(a.type));let set=(id,v)=>{let el=document.getElementById(id);if(el)el.textContent=String(v)};set('alertStatOpen',rows.length);set('alertStatBroken',broken.length);set('alertStatDueToday',today.length);set('alertStatUpcoming',upcoming.length);set('alertStatHighBalance',high.length);let list=tab==='broken'?broken:tab==='today'?today:tab==='upcoming'?upcoming:tab==='high'?high:rows;let box=document.getElementById('collectorAlertsList');if(box)box.innerHTML=list.map(collectorAlertCard).join('')||'<div class="powerEmpty">No collector alerts for this view.</div>';}
function collectorAlertCard(a){let sev=paSeverityClass(a.severity);let acct=a.accountName||accountById(a.accountId)&&nameOf(accountById(a.accountId))||'Unknown Account';let acctNoText=a.accountNumber||accountById(a.accountId)&&acctNo(accountById(a.accountId))||'—';return `<div class="alertCard ${sev}"><div class="alertTop"><div><div class="alertTitle">${esc(a.title||a.type||'Collector Alert')}</div><div class="alertMeta"><b>${esc(acct)}</b> • Acct: ${esc(acctNoText)}<br><span class="${paDueClass(a.dueDate)}">${esc(paDueLabel(a.dueDate))}</span> • Assigned: ${esc(a.assignedToEmail||'—')}<br>${esc(a.message||'')}</div></div><span class="alertPill ${sev}">${esc(a.type||'Alert')}</span></div><div class="alertActions">${a.accountId?`<button class="outline" onclick="setAccountFromModal('${a.accountId}','collectorAlertsModal')">Open Account</button>`:''}<button class="green" onclick="resolveCollectorAlert('${esc(String(a.key||paAlertKey(a))).replace(/'/g,'&#39;')}','${esc(String(a.id||'')).replace(/'/g,'&#39;')}')">Clear</button></div></div>`}
async function resolveCollectorAlert(key,id){if(key)paSetResolvedKey(key);if(id){await dbFetch('/collector_alerts?id=eq.'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({status:'Resolved',resolved_at:new Date().toISOString(),resolved_by_email:currentUser?.email||''})}).catch(()=>{});}await loadCollectorAlerts(false)}
function exportCollectorAlertsCSV(){let rows=collectorAlertData.alerts||[];let csv=['type,severity,due_date,account,account_number,assigned_to,message'];rows.forEach(a=>csv.push([a.type,a.severity,a.dueDate,a.accountName||accountById(a.accountId)&&nameOf(accountById(a.accountId))||'',a.accountNumber||accountById(a.accountId)&&acctNo(accountById(a.accountId))||'',a.assignedToEmail,a.message].map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')));download('collector_alerts_export.csv',csv.join('\n'),'text/csv')}
setTimeout(()=>{if(typeof refreshCollectorAlertBadge==='function')refreshCollectorAlertBadge().catch(()=>{})},2500);

let paymentPlanCache={};
let paymentScheduleDraft=[];
function todayISO(){return new Date().toISOString().slice(0,10)}
function addDaysISO(dateStr,days){let d=new Date(dateStr+'T00:00:00');d.setDate(d.getDate()+days);return d.toISOString().slice(0,10)}
function addMonthsISO(dateStr,months){let d=new Date(dateStr+'T00:00:00');let day=d.getDate();d.setMonth(d.getMonth()+months);if(d.getDate()<day)d.setDate(0);return d.toISOString().slice(0,10)}
function planStatusClass(s){s=String(s||'Scheduled');return s==='Paid'?'planPaid':s==='Partial'?'planPartial':s==='Missed'?'planMissed':'planScheduled'}
async function loadPaymentPlanForAccount(accountId,force=false){
 if(!accountId)return null;
 if(paymentPlanCache[accountId]&&!force)return paymentPlanCache[accountId];
 try{
   let plans=await dbFetch(`/payment_plans?account_id=eq.${accountId}&select=*&order=created_at.desc&limit=1`);
   if(!plans||!plans[0]){paymentPlanCache[accountId]=null;return null}
   let plan=toCamel(plans[0]);
   let pays=await dbFetch(`/payment_plan_payments?plan_id=eq.${plan.id}&select=*&order=due_date.asc`);
   plan.payments=(pays||[]).map(toCamel);
   paymentPlanCache[accountId]=plan;
   return plan;
 }catch(err){
   console.warn('Payment plan load failed',err);
   paymentPlanCache[accountId]=null;
   return null;
 }
}
function renderPaymentPlanEmpty(){
 let el=document.getElementById('paymentPlanPanel');if(!el)return;
 el.innerHTML=`<div class="planEmpty"><div><div class="planTitle">Payment Plan</div><div class="hint">No active payment plan on this account.</div></div><button class="green" onclick="openPaymentPlan()">Create Payment Plan</button></div>`;
}
function renderPaymentPlanLoading(){
 let el=document.getElementById('paymentPlanPanel');if(!el)return;
 el.innerHTML=`<div class="planEmpty"><div><div class="planTitle">Payment Plan</div><div class="hint">Checking payment plan...</div></div></div>`;
}
function planPaidAmount(plan){
 return (plan?.payments||[]).reduce((s,p)=>s+moneyNum(p.amountPaid),0);
}
function planFutureAmount(plan){
 return (plan?.payments||[]).filter(p=>!['Paid','Cancelled'].includes(p.status)).reduce((s,p)=>s+moneyNum(p.amountDue)-moneyNum(p.amountPaid),0);
}
function nextUnpaidPayment(payments){
 let today=todayISO();
 return (payments||[]).find(p=>!['Paid','Cancelled'].includes(p.status) && String(p.dueDate||'')>=today) || (payments||[]).find(p=>!['Paid','Cancelled'].includes(p.status)) || null;
}
function regularPaymentAmount(payments){
 let p=(payments||[]).find(x=>!['Paid','Cancelled'].includes(x.status) && moneyNum(x.amountDue)>0) || (payments||[]).find(x=>moneyNum(x.amountDue)>0);
 return p?moneyNum(p.amountDue):0;
}
function displayPayStatus(p){
 if(p.status==='Paid')return 'Paid';
 if(p.status==='Partial')return 'Partial';
 if(p.status==='Cancelled')return 'Cancelled';
 if(p.dueDate && p.dueDate<todayISO())return 'Missed';
 return p.status||'Scheduled';
}
async function renderPaymentPlanSummary(accountId){
 let el=document.getElementById('paymentPlanPanel');if(!el||!accountId)return;
 renderPaymentPlanLoading();
 let plan=await loadPaymentPlanForAccount(accountId,true);
 if(!plan){renderPaymentPlanEmpty();return}
 let payments=(plan.payments||[]).sort((a,b)=>String(a.dueDate||'').localeCompare(String(b.dueDate||'')));
 let total=moneyNum(plan.totalAmount);
 let paid=planPaidAmount(plan);
 let remaining=Math.max(0, moneyNum(plan.remainingAmount || (total-paid)));
 let next=nextUnpaidPayment(payments);
 let freq=plan.frequency||'Custom';
 let each=regularPaymentAmount(payments);
 let scheduledCount=payments.filter(p=>!['Paid','Cancelled'].includes(p.status)).length;
 let paidCount=payments.filter(p=>p.status==='Paid').length;
 let missedCount=payments.filter(p=>displayPayStatus(p)==='Missed').length;
 let accountBal=accountBalance(getCurrent());
 let mini=payments.slice(0,6).map((p,i)=>{
   let ds=displayPayStatus(p), cls=planStatusClass(ds);
   if(next && p.id===next.id)cls+=' nextDue';
   if(ds==='Missed')cls+=' overdueDue';
   return `<div class="planMiniPay ${cls.includes('nextDue')?'nextDue':''} ${ds==='Missed'?'overdueDue':''}">
     <div class="planMiniDate">${esc(p.dueDate||'No date')}</div>
     <div class="planMiniAmount">${money(p.amountDue)}</div>
     <div class="planMiniPaid">Paid: ${money(p.amountPaid)}</div>
     <div class="planMiniStatus ${planStatusClass(ds)}">${esc(ds)}</div>
   </div>`;
 }).join('');
 el.innerHTML=`<div class="planTop">
   <div>
    <div class="planTitle">Payment Plan</div>
    <div class="hint">${esc(freq)} plan • ${scheduledCount} scheduled • ${paidCount} paid • Next due: <b>${esc(next?.dueDate||'—')}</b> for <b>${next?money(next.amountDue):'—'}</b></div>
    <div class="planMetaLine">
      <span class="planChip">${esc(freq)}</span>
      <span class="planChip">Each payment: ${each?money(each):'Varies'}</span>
      <span class="planChip greenish">Paid: ${money(paid)}</span>
      <span class="planChip orangeish">Missed: ${missedCount}</span>
    </div>
   </div>
   <div style="display:flex;gap:8px;align-items:center"><span class="planStatus">${esc(plan.status||'Active')}</span><button class="outline" onclick="openPaymentPlan()">Manage Plan</button></div>
 </div>
 <div class="planMetrics">
  <div class="planMetric"><div class="planMetricLabel">Plan Total</div><div class="planMetricValue">${money(total)}</div></div>
  <div class="planMetric"><div class="planMetricLabel">Payment Amount</div><div class="planMetricValue">${each?money(each):'Varies'}</div></div>
  <div class="planMetric"><div class="planMetricLabel">Frequency</div><div class="planMetricValue">${esc(freq)}</div></div>
  <div class="planMetric"><div class="planMetricLabel">Paid</div><div class="planMetricValue">${money(paid)}</div></div>
  <div class="planMetric"><div class="planMetricLabel">Remaining</div><div class="planMetricValue bigBalance">${money(remaining)}</div></div>
  <div class="planMetric"><div class="planMetricLabel">Account Balance</div><div class="planMetricValue">${money(accountBal)}</div></div>
 </div>
 <div class="planScheduleMini">${mini||'<div class="muted">No scheduled payments yet.</div>'}</div>
 <div class="planSummaryNote">Balance math: ${money(total)} plan total − ${money(paid)} paid = ${money(remaining)} remaining. Account balance should match remaining after paid payments are saved.</div>`;
}
async function openPaymentPlan(){
 let a=getCurrent();if(!a)return alert('No account selected.');
 document.getElementById('paymentPlanModal').classList.add('open');
 let plan=await loadPaymentPlanForAccount(a.id,true);
 let bal=accountBalance(a);
 if(plan){
   document.getElementById('planTotal').value=moneyNum(plan.totalAmount).toFixed(2);
   document.getElementById('planToday').value='0.00';
   document.getElementById('planStartDate').value=(plan.payments&&plan.payments[0]?.dueDate)||todayISO();
   document.getElementById('planFrequency').value=plan.frequency||'Monthly';
   document.getElementById('planStatus').value=plan.status||'Active';
   document.getElementById('planNotes').value=plan.notes||'';
   paymentScheduleDraft=(plan.payments||[]).map(p=>({id:p.id,dueDate:p.dueDate,amountDue:moneyNum(p.amountDue),amountPaid:moneyNum(p.amountPaid),paidDate:p.paidDate||'',status:p.status||'Scheduled'}));
   document.getElementById('planCount').value=paymentScheduleDraft.length||1;
   document.getElementById('planEach').value=paymentScheduleDraft[0]?.amountDue?.toFixed(2)||'';
 }else{
   document.getElementById('planTotal').value=bal.toFixed(2);
   document.getElementById('planToday').value='0.00';
   document.getElementById('planStartDate').value=todayISO();
   document.getElementById('planFrequency').value='Monthly';
   document.getElementById('planStatus').value='Active';
   document.getElementById('planNotes').value='';
   document.getElementById('planCount').value='1';
   document.getElementById('planEach').value=bal.toFixed(2);
   paymentScheduleDraft=[];
   recalcPlanFromInputs('count');
 }
 renderPlanSchedule();
 updatePlanRemainingPreview();
}
function planCap(){
 let bal=accountBalance(getCurrent());
 return Math.max(0, Number(bal.toFixed(2)));
}
function setInputNumber(id,val){
 let el=document.getElementById(id);
 if(el)el.value=Number(Math.max(0,val)).toFixed(2);
}
function clampPlanInputs(){
 let cap=planCap();
 let totalEl=document.getElementById('planTotal'), todayEl=document.getElementById('planToday');
 let total=moneyNum(totalEl?.value);
 if(!total || total<=0) total=cap;
 if(total>cap) total=cap;
 if(total<0) total=0;
 if(totalEl) totalEl.value=Number(total).toFixed(2);
 let today=moneyNum(todayEl?.value);
 if(today>total) today=total;
 if(today<0) today=0;
 if(todayEl) todayEl.value=Number(today).toFixed(2);
 return {cap,total,today,remaining:Number(Math.max(0,total-today).toFixed(2))};
}
function splitAmounts(total,count,preferredEach=0){
 total=Number(Math.max(0,total).toFixed(2));
 count=Math.max(1,parseInt(count||1,10));
 let amounts=[];
 if(total<=0)return amounts;
 let each=moneyNum(preferredEach);
 if(!each || each<=0) each=total/count;
 if(each>total) each=total;
 let running=0;
 for(let i=0;i<count;i++){
   let left=Number((total-running).toFixed(2));
   if(left<=0)break;
   let amt=i===count-1?left:Math.min(Number(each.toFixed(2)),left);
   amounts.push(Number(amt.toFixed(2)));
   running=Number((running+amt).toFixed(2));
 }
 return amounts;
}
function dateForIndex(start,freq,i){
 let due=start||todayISO();
 if(freq==='Weekly')due=addDaysISO(start,7*i);
 else if(freq==='Biweekly')due=addDaysISO(start,14*i);
 else if(freq==='Monthly')due=addMonthsISO(start,i);
 else if(freq==='One Time')due=start;
 return due;
}
function recalcPlanFromInputs(source='count'){
 let {cap,total,today,remaining}=clampPlanInputs();
 let countEl=document.getElementById('planCount'), eachEl=document.getElementById('planEach'), freqEl=document.getElementById('planFrequency'), startEl=document.getElementById('planStartDate');
 let freq=freqEl?.value||'Monthly';
 let start=startEl?.value||todayISO();
 let count=Math.max(1,parseInt(countEl?.value||'1',10));
 let each=moneyNum(eachEl?.value);
 if(freq==='One Time')count=1;

 if(source==='amount'){
   if(each<=0) each=remaining;
   if(each>remaining) each=remaining;
   count=remaining>0?Math.ceil(remaining/each):1;
 }else{
   each=remaining>0?remaining/count:0;
 }

 if(countEl)countEl.value=count;
 if(eachEl)eachEl.value=Number(each||0).toFixed(2);

 let amounts=splitAmounts(remaining,count,each);
 paymentScheduleDraft=amounts.map((amt,i)=>({
   dueDate:dateForIndex(start,freq,i),
   amountDue:amt,
   amountPaid:0,
   paidDate:'',
   status:'Scheduled'
 }));
 renderPlanSchedule(false);
 updatePlanRemainingPreview();
}
function updatePlanRemainingPreview(){
 let a=getCurrent();
 let {cap,total,today,remaining}=clampPlanInputs();
 let draftPaid=paymentScheduleDraft.reduce((s,p)=>s+moneyNum(p.amountPaid),0);
 let futureScheduled=paymentScheduleDraft.reduce((s,p)=>s+moneyNum(p.amountDue),0);
 let newBal=Number(Math.max(0,total-today-draftPaid).toFixed(2));

 let remainingInput=document.getElementById('planRemaining'); if(remainingInput)remainingInput.value=newBal.toFixed(2);
 let previewAccount=document.getElementById('previewAccountBalance'); if(previewAccount)previewAccount.textContent=money(cap);
 let previewToday=document.getElementById('previewPaidToday'); if(previewToday)previewToday.textContent=money(today);
 let previewNew=document.getElementById('previewNewBalance'); if(previewNew){previewNew.textContent=money(newBal); previewNew.className='paymentPreviewValue '+(newBal<=cap?'good':'danger');}
 let previewFuture=document.getElementById('previewFutureScheduled'); if(previewFuture){previewFuture.textContent=money(futureScheduled); previewFuture.className='paymentPreviewValue '+(futureScheduled<=remaining+0.01?'good':'danger');}

 let math=document.getElementById('planMathLine');
 if(math){
   let count=paymentScheduleDraft.length||0;
   let each=count?regularPaymentAmount({payments:paymentScheduleDraft}):0;
   math.textContent=`Balance limit: ${money(cap)}. Payment today: ${money(today)}. Future plan amount: ${money(remaining)} ÷ ${count||1} payment(s) = ${each?money(each):money(0)} each${count>1?' with final payment adjusted if needed':''}.`;
 }
 let hard=document.getElementById('planHardLimit');
 if(hard){
   if(total>cap+0.01 || today>total+0.01 || futureScheduled>remaining+0.01){
     hard.textContent='Blocked: payment plan total, payment today, and scheduled payments cannot exceed the account balance.';
     hard.classList.remove('hidden');
   }else hard.classList.add('hidden');
 }
}
function generatePlanSchedule(){
 recalcPlanFromInputs('count');
}
function addCustomPlanRow(){
 let {remaining}=clampPlanInputs();
 let scheduled=paymentScheduleDraft.reduce((s,p)=>s+moneyNum(p.amountDue),0);
 let left=Number(Math.max(0,remaining-scheduled).toFixed(2));
 if(left<=0)return alert('No remaining balance is available for another payment date. Lower existing scheduled payments first.');
 paymentScheduleDraft.push({dueDate:todayISO(),amountDue:left,amountPaid:0,paidDate:'',status:'Scheduled'});
 renderPlanSchedule();
 updatePlanRemainingPreview();
}
function sanitizeDraftAmounts(){
 let {remaining}=clampPlanInputs();
 let running=0;
 paymentScheduleDraft.forEach((p,i)=>{
   let maxLeft=Number(Math.max(0,remaining-running).toFixed(2));
   let due=moneyNum(p.amountDue);
   if(due>maxLeft)due=maxLeft;
   p.amountDue=Number(due.toFixed(2));
   let paid=moneyNum(p.amountPaid);
   if(paid>p.amountDue)paid=p.amountDue;
   p.amountPaid=Number(paid.toFixed(2));
   if(p.amountPaid>=p.amountDue && p.amountDue>0)p.status='Paid';
   else if(p.amountPaid>0)p.status='Partial';
   else if(p.status==='Paid')p.status='Scheduled';
   running=Number((running+p.amountDue).toFixed(2));
 });
 paymentScheduleDraft=paymentScheduleDraft.filter(p=>moneyNum(p.amountDue)>0 || moneyNum(p.amountPaid)>0);
}
function renderPlanSchedule(doSanitize=true){
 if(doSanitize)sanitizeDraftAmounts();
 let body=document.getElementById('planScheduleBody');if(!body)return;
 body.innerHTML=paymentScheduleDraft.map((p,i)=>`<tr>
   <td>${i+1}</td>
   <td><input type="date" value="${esc(p.dueDate||'')}" onchange="paymentScheduleDraft[${i}].dueDate=this.value"></td>
   <td><input type="number" step="0.01" value="${moneyNum(p.amountDue).toFixed(2)}" onchange="paymentScheduleDraft[${i}].amountDue=moneyNum(this.value);renderPlanSchedule();updatePlanRemainingPreview()"></td>
   <td><input type="number" step="0.01" value="${moneyNum(p.amountPaid).toFixed(2)}" onchange="paymentScheduleDraft[${i}].amountPaid=moneyNum(this.value);if(moneyNum(this.value)>0&&!paymentScheduleDraft[${i}].paidDate)paymentScheduleDraft[${i}].paidDate=todayISO();renderPlanSchedule();updatePlanRemainingPreview()"></td>
   <td><input type="date" value="${esc(p.paidDate||'')}" onchange="paymentScheduleDraft[${i}].paidDate=this.value"></td>
   <td><select onchange="paymentScheduleDraft[${i}].status=this.value;renderPlanSchedule()"><option ${p.status==='Scheduled'?'selected':''}>Scheduled</option><option ${p.status==='Partial'?'selected':''}>Partial</option><option ${p.status==='Paid'?'selected':''}>Paid</option><option ${p.status==='Missed'?'selected':''}>Missed</option><option ${p.status==='Cancelled'?'selected':''}>Cancelled</option></select></td>
   <td><button class="green payButtonMini" onclick="markPlanPaymentPaid(${i})">Paid</button> <button class="red payButtonMini" onclick="removePlanRow(${i})">Remove</button></td>
 </tr>`).join('')||'<tr><td colspan="7">No payments scheduled.</td></tr>';
 updatePlanRemainingPreview();
}
function markPlanPaymentPaid(i){
 let p=paymentScheduleDraft[i];if(!p)return;
 p.amountPaid=moneyNum(p.amountDue);
 p.paidDate=p.paidDate||todayISO();
 p.status='Paid';
 renderPlanSchedule();
}
function removePlanRow(i){paymentScheduleDraft.splice(i,1);renderPlanSchedule();updatePlanRemainingPreview()}
async function savePaymentPlan(){
 let a=getCurrent();if(!a)return alert('No account selected.');
 if(!paymentScheduleDraft.length)return alert('Generate or add at least one payment date.');
 sanitizeDraftAmounts();
 let acctBal=accountBalance(a);
 let total=moneyNum(document.getElementById('planTotal').value);
 if(total<=0)return alert('Plan total must be greater than zero.');
 if(total>acctBal+0.01)return alert('Not allowed: plan total cannot exceed the current account balance of '+money(acctBal)+'.');
 let paidToday=moneyNum(document.getElementById('planToday').value);
 if(paidToday>total+0.01)return alert('Payment today cannot be greater than the plan total.');
 let remainingAfterToday=Number(Math.max(0,total-paidToday).toFixed(2));
 let scheduledDue=paymentScheduleDraft.reduce((s,p)=>s+moneyNum(p.amountDue),0);
 if(scheduledDue>remainingAfterToday+0.01)return alert('Not allowed: scheduled future payments '+money(scheduledDue)+' exceed remaining balance after today '+money(remainingAfterToday)+'.');
 let status=document.getElementById('planStatus').value||'Active';
 let frequency=document.getElementById('planFrequency').value||'Custom';
 let notes=document.getElementById('planNotes').value.trim();
 let existing=await loadPaymentPlanForAccount(a.id,true);
 if(existing){
   await dbFetch(`/payment_plans?id=eq.${existing.id}`,{method:'PATCH',body:JSON.stringify({status:'Replaced',updated_at:new Date().toISOString()})}).catch(()=>{});
 }
 let paidFromSchedule=paymentScheduleDraft.reduce((s,p)=>s+moneyNum(p.amountPaid),0);
 let paidTotal=paidToday+paidFromSchedule;
 let remaining=Math.max(0,total-paidTotal);
 let planRows=await dbFetch('/payment_plans',{method:'POST',body:JSON.stringify([{
   account_id:a.id,total_amount:total,starting_balance:acctBal,remaining_amount:remaining,frequency,status,notes,created_by_email:currentUser.email,updated_at:new Date().toISOString()
 }])});
 let plan=Array.isArray(planRows)?planRows[0]:planRows;
 let pid=plan.id;
 let rows=paymentScheduleDraft.map(p=>({
   plan_id:pid,account_id:a.id,due_date:p.dueDate,amount_due:moneyNum(p.amountDue),amount_paid:moneyNum(p.amountPaid),paid_date:p.paidDate||null,status:p.status||'Scheduled',created_by_email:currentUser.email,updated_at:new Date().toISOString()
 }));
 if(rows.length)await dbFetch('/payment_plan_payments',{method:'POST',body:JSON.stringify(rows)});
 if(paidToday>0){
   await dbFetch('/payment_plan_payments',{method:'POST',body:JSON.stringify([{
     plan_id:pid,account_id:a.id,due_date:todayISO(),amount_due:paidToday,amount_paid:paidToday,paid_date:todayISO(),status:'Paid',created_by_email:currentUser.email,updated_at:new Date().toISOString()
   }])});
 }
 let acctPatch={current_balance:remaining,status:status==='Active'?'Promise to Pay':a.status,disposition:'Promise to Pay',updated_at:new Date().toISOString()};
 await dbFetch(`/accounts?id=eq.${a.id}`,{method:'PATCH',body:JSON.stringify(acctPatch)});
 await insertActivity(a.id,'Payment Plan','Payment plan saved: total '+money(total)+', payment today '+money(paidToday)+', paid total '+money(paidTotal)+', remaining '+money(remaining)+', frequency '+frequency);
 closeModal('paymentPlanModal');
 delete paymentPlanCache[a.id];
 await loadAccounts();
 currentAccountId=a.id;
 await renderPaymentPlanSummary(a.id);
 alert('Payment plan saved. Account balance updated to '+money(remaining)+'.');
}
function openContactUpdate(){
 let a=getCurrent();if(!a)return alert('No account selected.');
 document.getElementById('contactEmail').value=a.email||'';
 document.getElementById('contactPhone1').value=a.phone1||'';
 document.getElementById('contactPhone2').value=a.phone2||'';
 document.getElementById('contactAddress').value=a.address||'';
 document.getElementById('contactCity').value=a.city||'';
 document.getElementById('contactState').value=a.state||'';
 document.getElementById('contactZip').value=a.zip||'';
 document.getElementById('contactModal').classList.add('open');
}
async function saveContactUpdate(){
 let a=getCurrent();if(!a)return;
 let body={email:document.getElementById('contactEmail').value.trim(),phone1:document.getElementById('contactPhone1').value.trim(),phone2:document.getElementById('contactPhone2').value.trim(),address:document.getElementById('contactAddress').value.trim(),city:document.getElementById('contactCity').value.trim(),state:document.getElementById('contactState').value.trim(),zip:document.getElementById('contactZip').value.trim(),updatedAt:new Date().toISOString()};
 let db={};Object.entries(body).forEach(([k,v])=>{if(reverse[k])db[reverse[k]]=v});
 let updated=(await dbFetch(`/accounts?id=eq.${a.id}`,{method:'PATCH',body:JSON.stringify(db)}))[0];
 await insertActivity(a.id,'Contact Updated','Contact info updated');
 let i=accounts.findIndex(x=>x.id===a.id);if(i>=0)accounts[i]=toCamel(updated);
 closeModal('contactModal');render();
}
function openPayoffQuote(){
 let a=getCurrent();if(!a)return alert('No account selected.');
 let msg=`Payoff quote for ${nameOf(a)}\nAccount: ${acctNo(a)}\nCurrent balance: ${money(accountBalance(a))}`;
 alert(msg);
 insertActivity(a.id,'Payoff Quote','Viewed payoff quote for '+money(accountBalance(a))).catch(()=>{});
}

/* removed old openAccountDocs; enhanced version is inserted later */


async function saveCurrent(){let a=getCurrent();if(!a)return;let note=document.getElementById('agentNote').value.trim();if(note){await dbFetch('/account_notes',{method:'POST',body:JSON.stringify([{account_id:a.id,note,created_by_email:currentUser.email}])});await insertActivity(a.id,'Note',note)}document.getElementById('agentNote').value='';await loadAccounts()}async function saveAndNext(){await saveCurrent();nextAccount()}function nextAccount(){let q=queue(),cur=getCurrent(),idx=q.findIndex(a=>a.id===cur?.id);if(q[idx+1])setCurrent(q[idx+1].id)}function skipAccount(){nextAccount()}async function callPrimary(){let a=getCurrent();let p=phones(a)[0];if(p)await dialPhone(a.id,normPhone(p))}function endCall(){document.getElementById('lastDialed').textContent='Call ended';document.getElementById('callNumber').textContent='—'}
function val(id){return document.getElementById(id).value.trim()}function setVal(id,v){document.getElementById(id).value=v??''}function inputId(k){return{accountNumber:'accountNumberInput',status:'statusInput',ssn:'ssnInput',state:'stateInput',email:'emailInput'}[k]||k}function openModal(){document.querySelector('#modal form').reset();document.getElementById('id').value='';document.getElementById('modalTitle').textContent='Add Account';document.getElementById('modal').classList.add('open')}function closeModal(id){document.getElementById(id).classList.remove('open')}
async function saveAccount(e){e.preventDefault();if(!currentUser.isAdmin)return alert('Admin only');let id=val('id'),acct={};FIELDS.forEach(k=>acct[k]=val(inputId(k)));acct.fullName=acct.fullName||[acct.firstName,acct.middleName,acct.lastName].filter(Boolean).join(' ');if(id)await dbFetch(`/accounts?id=eq.${id}`,{method:'PATCH',body:JSON.stringify(toRow(acct))});else await dbFetch('/accounts',{method:'POST',body:JSON.stringify([toRow(acct)])});closeModal('modal');await loadAccounts()}


/* POWER DOCS — saved document links plus original source fields */
async function loadAccountDocs(accountId){
 try{return(await dbFetch(`/account_docs?account_id=eq.${accountId}&select=*&order=created_at.desc&limit=200`)).map(toCamel)}catch(e){return[]}
}
async function openAccountDocs(){
 let a=getCurrent();if(!a)return alert('No account selected.');
 if(document.getElementById('docTitle'))document.getElementById('docTitle').value='';
 if(document.getElementById('docUrl'))document.getElementById('docUrl').value='';
 if(document.getElementById('docNotes'))document.getElementById('docNotes').value='';
 let docs=await loadAccountDocs(a.id);
 let docsList=document.getElementById('accountDocsList');
 if(docsList){
   docsList.innerHTML=docs.map(d=>`<div class="docItem"><div class="docTitle">${esc(d.docTitle||d.docType||'Document')}</div><div class="docMeta">Type: ${esc(d.docType||'—')}<br>${d.docUrl?`<a href="${esc(d.docUrl)}" target="_blank">Open Link</a><br>`:''}${esc(d.notes||'')}<br>${esc(String(d.createdAt||'').slice(0,19))}</div></div>`).join('')||'<div class="powerEmpty">No documents saved yet.</div>';
 }
 let raw=rawObj(a);
 let body=document.getElementById('docsBody');
 if(body){
   body.innerHTML=Object.entries(raw).filter(([k,v])=>String(v??'').trim()!=='').map(([k,v])=>`<div class="rawDumpItem"><div class="rawDumpKey">${esc(k)}</div><div class="rawDumpVal">${esc(v)}</div></div>`).join('')||'<div class="muted">No source fields saved for this account.</div>';
 }
 document.getElementById('docsModal').classList.add('open');
}
async function saveAccountDoc(){
 let a=getCurrent();if(!a)return;
 let title=val('docTitle'),urlv=val('docUrl');
 if(!title&&!urlv)return alert('Enter a document title or URL.');
 await dbFetch('/account_docs',{method:'POST',body:JSON.stringify([{account_id:a.id,doc_title:title,doc_type:val('docType'),doc_url:urlv,notes:val('docNotes'),created_by_email:currentUser.email}])});
 await insertActivity(a.id,'Document Saved',title||urlv);
 if(typeof insertAudit==='function')await insertAudit('Document Saved',title||urlv,'account',a.id);
 await openAccountDocs();
}

function norm(s){return String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'')}const MAP={
 // Exact headers now supported:
 // BorrowerName, IssuerAccountNumber, AccountOpenDate, CODATE, IssuerLPDate,
 // PFName, PMiddle, PLName, PSSN SIN, PBirthdate,
 // OrigAddress1, OrigAddress2, OrigCity, OrigState, OrigZipPostal,
 // OrigProduct, AccountType, CurBalance, DelinquencyDate, PEmail,
 // OrigPhone, 1stPhone, 2ndPhone, 3rdPhone, 4thPhone, 5thPhone, 6thPhone

 portfolio:['portfolio','portfolio name','portfolioid','pool','poolname','file','filename','batch','batchname','seller','client','clientname','placement','placementname','source','sourcefile'],
 accountDescription:['accountdescription','account description','description','accounttype','account type','product','origproduct','orig product','portfolio description','portfolio_desc','filedescription'],
 clientAccountNumber:['clientaccountnumber','client account number','clientacctnumber','client acct number','clientacct','client acct','clientaccount','client account','clientref','clientreference','reference','refnumber','ref no','ref'],
 accountId:['accountid','account id','acctid','acct id','id','sourceid','source id','originalaccountid','original account id','loanid','loan id','fileid','file id','recordid','record id','customerid','customer id','debtorid','debtor id'],
 accountNumber:['issueraccountnumber','issuer account number','account_number','accountnumber','account number','acctnumber','acct number','acctno','acct no','acct','account','accountno','account no','accountnum','account num','loanaccountnumber','loan account number','loan number','loannumber','debtoraccountnumber','debtor account number','consumeraccountnumber','consumer account number'],
 firstName:['pfname','p fname','firstname','first name','first_name','fname','first','consumerfirstname','consumer first name','debtorfirstname','debtor first name','borrowerfirstname','borrower first name'],
 middleName:['pmiddle','p middle','middlename','middle name','middle_name','mname','middle','mi','middleinitial','middle initial'],
 lastName:['plname','p lname','plastname','p last name','lastname','last name','last_name','lname','last','surname','consumerlastname','consumer last name','debtorlastname','debtor last name','borrowerlastname','borrower last name'],
 fullName:['borrowername','borrower name','fullname','full name','full_name','name','consumername','consumer name','customername','customer name','debtorname','debtor name','borrower','clientname','client name','accountname','account name','consumer','customer','debtor','defendant','defendantname','defendant name'],
 ssn:['pssnsin','pssn sin','pssn','ssn','socialsecuritynumber','social security number','social','socsec','ss#','ss number','taxid','tax id'],
 dob:['pbirthdate','p birthdate','dob','dateofbirth','date of birth','birthdate','birth date'],
 address:['origaddress1','orig address1','orig address 1','address','address1','address 1','street','streetaddress','street address','addr1','addr 1','mailingaddress','mailing address'],
 address2:['origaddress2','orig address2','orig address 2','address2','address 2','addr2','addr 2','unit','apt','apartment','suite'],
 city:['origcity','orig city','city','consumer city','debtor city','mailingcity'],
 state:['origstate','orig state','state','st','consumer state','debtor state','mailingstate'],
 zip:['origzippostal','orig zip postal','origzip','orig zip','zipcode','zip code','zip','postal','postalcode','postal code'],
 employer:['employer','employername','employer name','work','placeofemployment','place of employment'],
 email:['pemail','p email','email','emailaddress','email address','e-mail','e mail'],
 originalCreditor:['original_creditor','originalcreditor','original creditor','creditor','creditorname','creditor name','lender','lendername','lender name','merchant','merchantname','merchant name','currentcreditor','current creditor','client','clientname'],
 typeOfDebt:['accounttype','account type','origproduct','orig product','typeofdebt','type of debt','debt type','debttype','producttype','product type','loan type','loantype'],
 originalBalance:['original_balance','originalbalance','original balance','origbalance','orig balance','startingbalance','starting balance','openedbalance','opened balance','chargeoffbalance','charge off balance','co balance','cobalance'],
 principal:['coprincipal','co principal','co_principal','principal','principalbalance','principal balance','principalamount','principal amount'],
 currentBalance:['curbalance','cur balance','current_balance','currentbalance','current balance','balance','accountbalance','account balance','acctbalance','acct balance','currentdue','current due','amountowed','amount owed','amountdue','amount due','totaldue','total due','totalbalance','total balance','balanceowed','balance owed','coprincipal','co principal','co_principal','principalbalance','principal balance'],
 openDate:['accountopendate','account open date','opendate','open date','dateopened','date opened','openeddate','opened date','account_open_date'],
 dateAccountOpened:['accountopendate','account open date','dateaccountopened','date account opened','accountopeneddate','account opened date','account_open_date'],
 delinquencyDate:['delinquencydate','delinquency date','dateofdelinquency','date of delinquency','dofd','dlinqdate','dlqdate'],
 chargeOffDate:['codate','co date','charge_off_date','chargeoffdate','charge off date','datechargedoff','date charged off'],
 origLastPmtDate:['issuerlpdate','issuer lp date','origlastpmtdate','orig last pmt date','original last payment date','original last pmt date'],
 lastPaymentDate:['lastpaymentdate','last payment date','lastpmtdate','last pmt date','lastpaiddate','last paid date'],
 lastPaymentAmount:['lastpaymentamount','last payment amount','lastpmtamount','last pmt amount','lastpaidamount','last paid amount'],
 bankRoutingNumber:['bankroutingnumber','bank routing number','routing','routingnumber','routing number','aba','abanumber','aba number'],
 bankAccountNumber:['bankaccountnumber','bank account number','bankacctnumber','bank acct number','accountnumberbank','bank account','checkingaccount','checking account'],
 phone1:['origphone','orig phone','1stphone','1st phone','firstphone','first phone','home_phone','homephone','home phone','phone1','phone 1','primaryphone','primary phone','phonenumber','phone number','phone','telephone','tel'],
 phone2:['2ndphone','2nd phone','secondphone','second phone','cell_phone','cellphone','cell phone','cell','mobilephone','mobile phone','mobile','phone2','phone 2','secondaryphone','secondary phone'],
 phone3:['3rdphone','3rd phone','thirdphone','third phone','phones','phone_numbers','phonenumbers','phone numbers','allphones','all phones','altphone','alt phone','alternatephone','alternate phone','workphone','work phone','custom11','phone3','phone 3'],
 phone4:['4thphone','4th phone','fourthphone','fourth phone','custom12','phone4','phone 4','phone04','phone 04'],
 phone5:['5thphone','5th phone','fifthphone','fifth phone','custom13','phone5','phone 5','phone05','phone 05'],
 phone6:['6thphone','6th phone','sixthphone','sixth phone','custom14','phone6','phone 6','phone06','phone 06']
}
let pendingImport={fileName:'',headers:[],rows:[]};
const MANUAL_FIELDS=[["portfolio", "Portfolio / File Name"], ["issuerName", "Issuer Name / Lender"], ["accountDescription", "Account Description / Product"], ["originalCreditor", "Original Creditor"], ["accountNumber", "Account Number"], ["clientAccountNumber", "Client Account Number"], ["accountId", "Account ID"], ["typeOfDebt", "Type of Debt / Account Type"], ["fullName", "Full Name / Borrower Name"], ["firstName", "First Name"], ["middleName", "Middle Name"], ["lastName", "Last Name"], ["ssn", "SSN"], ["dob", "DOB / Birthdate"], ["address", "Address 1"], ["address2", "Address 2"], ["city", "City"], ["state", "State"], ["zip", "Zip / Postal"], ["employer", "Employer"], ["occupation", "Occupation"], ["description", "Description"], ["email", "Email"], ["originalBalance", "Original Balance"], ["principal", "Principal / COPrincipal"], ["currentBalance", "Current Balance / CurBalance"], ["openDate", "Open Date"], ["dateAccountOpened", "Date Account Opened"], ["accountReceiveDate", "Account Receive Date"], ["delinquencyDate", "Delinquency Date"], ["chargeOffDate", "Charge Off Date"], ["origLastPmtDate", "Issuer/Original Last Payment Date"], ["lastPaymentDate", "Last Payment Date"], ["lastPaymentAmount", "Last Payment Amount"], ["bankRoutingNumber", "Bank Routing Number"], ["bankAccountNumber", "Bank Account Number"], ["origEmployer", "Original Employer"], ["origStoreName", "Original Store Name"], ["origStoreCity", "Original Store City"], ["origStoreState", "Original Store State"], ["origBankName", "Original Bank Name"], ["origBankAcctLast4Digits", "Original Bank Acct Last 4"], ["origPrincipalBalance", "Original Principal Balance"], ["origOriginalLoanAmount", "Original Loan Amount"], ["origChargeOffBalance", "Original Chargeoff Balance"], ["origLoanType", "Original Loan Type"], ["origPrincipalLoanAmount", "Original Principal Loan Amount"], ["origInterestAmount", "Original Interest Amount"], ["origReturnFee", "Original Return Fee"], ["phone1", "Phone 1"], ["phone1Type", "Phone 1 Type"], ["phone1LineType", "Phone 1 Line Type"], ["phone1Source", "Phone 1 Source"], ["phone1Note", "Phone 1 Note"], ["phone1Status", "Phone 1 Status"], ["phone2", "Phone 2"], ["phone2Type", "Phone 2 Type"], ["phone2LineType", "Phone 2 Line Type"], ["phone2Source", "Phone 2 Source"], ["phone2Note", "Phone 2 Note"], ["phone2Status", "Phone 2 Status"], ["phone3", "Phone 3"], ["phone3Type", "Phone 3 Type"], ["phone3LineType", "Phone 3 Line Type"], ["phone3Source", "Phone 3 Source"], ["phone3Note", "Phone 3 Note"], ["phone3Status", "Phone 3 Status"], ["phone4", "Phone 4"], ["phone4Type", "Phone 4 Type"], ["phone4LineType", "Phone 4 Line Type"], ["phone4Source", "Phone 4 Source"], ["phone4Note", "Phone 4 Note"], ["phone4Status", "Phone 4 Status"], ["phone5", "Phone 5"], ["phone5Type", "Phone 5 Type"], ["phone5LineType", "Phone 5 Line Type"], ["phone5Source", "Phone 5 Source"], ["phone5Note", "Phone 5 Note"], ["phone5Status", "Phone 5 Status"], ["phone6", "Phone 6"], ["phone6Type", "Phone 6 Type"], ["phone6LineType", "Phone 6 Line Type"], ["phone6Source", "Phone 6 Source"], ["phone6Note", "Phone 6 Note"], ["phone6Status", "Phone 6 Status"], ["phone7", "Phone 7"], ["phone7Type", "Phone 7 Type"], ["phone7LineType", "Phone 7 Line Type"], ["phone7Source", "Phone 7 Source"], ["phone7Note", "Phone 7 Note"], ["phone7Status", "Phone 7 Status"], ["phone8", "Phone 8"], ["phone8Type", "Phone 8 Type"], ["phone8LineType", "Phone 8 Line Type"], ["phone8Source", "Phone 8 Source"], ["phone8Note", "Phone 8 Note"], ["phone8Status", "Phone 8 Status"], ["phone9", "Phone 9"], ["phone9Type", "Phone 9 Type"], ["phone9LineType", "Phone 9 Line Type"], ["phone9Source", "Phone 9 Source"], ["phone9Note", "Phone 9 Note"], ["phone9Status", "Phone 9 Status"], ["phone10", "Phone 10"], ["phone10Type", "Phone 10 Type"], ["phone10LineType", "Phone 10 Line Type"], ["phone10Source", "Phone 10 Source"], ["phone10Note", "Phone 10 Note"], ["phone10Status", "Phone 10 Status"]];
const PRESETS={"pdl": {"issuerName": "IssuerName", "accountNumber": "IssuerAccountNumber", "openDate": "AccountOpenDate", "dateAccountOpened": "AccountOpenDate", "chargeOffDate": "CODate", "origLastPmtDate": "IssuerLPDate", "firstName": "PFName", "middleName": "PMiddle", "lastName": "PLName", "ssn": "PSSN_SIN", "dob": "PBirthdate", "address": "OrigAddress1", "address2": "OrigAddress2", "city": "OrigCity", "state": "OrigState", "zip": "OrigZipPostal", "accountDescription": "OrigProduct", "typeOfDebt": "AccountType", "currentBalance": "CurBalance", "delinquencyDate": "DelinquencyDate", "email": "PEmail", "phone1Type": "1stPhoneType", "phone1LineType": "1stLineType", "phone1": "OrigPhone", "employer": "Employer", "occupation": "Occupation", "description": "Description", "accountReceiveDate": "AccountReceiveDate", "principal": "Principal", "origEmployer": "Orig_EMPLOYER", "origStoreName": "Orig_StoreName", "origStoreCity": "Orig_Store_City", "origStoreState": "Orig_StoreState", "origBankName": "Orig_BankName", "origBankAcctLast4Digits": "Orig_BankAcctLast4Digits", "origPrincipalBalance": "Orig_PRINCIPALBALANCE", "origOriginalLoanAmount": "Orig_ORIGINALLOANAMOUNT", "origChargeOffBalance": "Orig_CHARGEOFFBALANCE", "origLoanType": "Orig_LoanType", "origPrincipalLoanAmount": "Orig_PrincipalLoanAmount", "origInterestAmount": "Orig_InterestAmount", "origReturnFee": "Orig_ReturnFee", "phone2Type": "1stPhoneType", "phone2LineType": "1stLineType", "phone2": "1stPhone", "phone2Source": "1stPhoneSource", "phone2Note": "1stPhoneNote", "phone2Status": "1stPhoneStatus", "phone3Type": "2ndPhoneType", "phone3LineType": "2ndLineType", "phone3": "2ndPhone", "phone3Source": "2ndPhoneSource", "phone3Note": "2ndPhoneNote", "phone3Status": "2ndPhoneStatus", "phone4Type": "3rdPhoneType", "phone4LineType": "3rdLineType", "phone4": "3rdPhone", "phone4Source": "3rdPhoneSource", "phone4Note": "3rdPhoneNote", "phone4Status": "3rdPhoneStatus", "phone5Type": "4thPhoneType", "phone5LineType": "4thLineType", "phone5": "4thPhone", "phone5Source": "4thPhoneSource", "phone5Note": "4thPhoneNote", "phone5Status": "4thPhoneStatus", "phone6Type": "5thPhoneType", "phone6LineType": "5thLineType", "phone6": "5thPhone", "phone6Source": "5thPhoneSource", "phone6Note": "5thPhoneNote", "phone6Status": "5thPhoneStatus", "phone7Type": "6thPhoneType", "phone7LineType": "6thLineType", "phone7": "6thPhone", "phone7Source": "6thPhoneSource", "phone7Note": "6thPhoneNote", "phone7Status": "6thPhoneStatus", "phone8Type": "7thPhoneType", "phone8LineType": "7thLineType", "phone8": "7thPhone", "phone8Source": "7thPhoneSource", "phone8Note": "7thPhoneNote", "phone8Status": "7thPhoneStatus", "phone9Type": "8thPhoneType", "phone9LineType": "8thLineType", "phone9": "8thPhone", "phone9Source": "8thPhoneSource", "phone9Note": "8thPhoneNote", "phone9Status": "8thPhoneStatus", "phone10Type": "9thPhoneType", "phone10LineType": "9thLineType", "phone10": "9thPhone", "phone10Source": "9thPhoneSource", "phone10Note": "9thPhoneNote", "phone10Status": "9thPhoneStatus"}, "credit": {"accountNumber": "account_number", "originalCreditor": "original_creditor", "firstName": "first_name", "middleName": "middle_name", "lastName": "last_name", "ssn": "ssn", "dob": "dob", "address": "address", "address2": "address2", "city": "city", "state": "state", "zip": "zip", "email": "email", "phone1": "home_phone", "phone2": "cell_phone", "phone3": "phones", "originalBalance": "original_balance", "currentBalance": "current_balance", "chargeOffDate": "charge_off_date", "openDate": "account_open_date", "dateAccountOpened": "account_open_date"}, "live": {"issuerName": "IssuerName", "fullName": "BorrowerName", "accountNumber": "IssuerAccountNumber", "openDate": "AccountOpenDate", "dateAccountOpened": "AccountOpenDate", "chargeOffDate": "CODATE", "origLastPmtDate": "IssuerLPDate", "firstName": "PFName", "middleName": "PMiddle", "lastName": "PLName", "ssn": "PSSN SIN", "dob": "PBirthdate", "address": "OrigAddress1", "address2": "OrigAddress2", "city": "OrigCity", "state": "OrigState", "zip": "OrigZipPostal", "accountDescription": "OrigProduct", "typeOfDebt": "AccountType", "currentBalance": "CurBalance", "delinquencyDate": "DelinquencyDate", "email": "PEmail", "phone1": "OrigPhone", "phone2": "1stPhone", "phone3": "2ndPhone", "phone4": "3rdPhone", "phone5": "4thPhone", "phone6": "5thPhone"}};
async function importCSV(e){
 if(!currentUser.isAdmin)return alert('Admin only');
 let file=e.target.files[0];
 if(!file)return;
 let rows=parseCSV(await file.text());
 e.target.value='';
 if(rows.length<2)return alert('CSV needs headers and rows.');
 pendingImport={fileName:file.name,headers:rows[0].map(h=>String(h||'').trim()),rows:rows.slice(1)};
 renderMappingModal();
 document.getElementById('mapModal').classList.add('open');
 applyMappingPreset('auto');
}
function renderMappingModal(){
 let headers=pendingImport.headers;
 let opts='<option value="">-- Do not import --</option>'+headers.map((h,i)=>`<option value="${i}">${esc(h)}</option>`).join('');
 document.getElementById('mapSummary').innerHTML=`<b>File:</b> ${esc(pendingImport.fileName)} &nbsp; <b>Rows:</b> ${pendingImport.rows.length} &nbsp; <b>Headers:</b> ${headers.length}`;
 document.getElementById('mappingGrid').innerHTML=MANUAL_FIELDS.map(([field,label])=>`<div class="mapField"><label>${esc(label)}</label><select id="map_${field}">${opts}</select><small>${esc(field)}</small></div>`).join('');
 document.querySelectorAll('#mappingGrid select').forEach(s=>s.onchange=renderMappingPreview);
 renderMappingPreview();
}
function setMap(field,headerName){
 let sel=document.getElementById('map_'+field); if(!sel)return;
 let idx=pendingImport.headers.findIndex(h=>norm(h)===norm(headerName));
 if(idx>=0)sel.value=String(idx);
}
function applyMappingPreset(type){
 if(!pendingImport.headers.length)return;
 MANUAL_FIELDS.forEach(([field])=>{let el=document.getElementById('map_'+field);if(el)el.value='';});
 if(type==='auto'){
   for(let field in MAP){
     let idx=pendingImport.headers.map(norm).findIndex(h=>MAP[field].map(norm).includes(h));
     let sel=document.getElementById('map_'+field); if(sel && idx>=0)sel.value=String(idx);
   }
 }else{
   let preset=PRESETS[type]||{};
   Object.entries(preset).forEach(([field,header])=>setMap(field,header));
 }
 document.querySelectorAll('#mappingGrid select').forEach(s=>s.onchange=renderMappingPreview);
 renderMappingPreview();
}
function getMappedAccount(cells){
 let acct={status:'New'};
 MANUAL_FIELDS.forEach(([field])=>{
   let sel=document.getElementById('map_'+field);
   if(sel && sel.value!=='') acct[field]=String(cells[Number(sel.value)]||'').trim();
   else acct[field]='';
 });
 if(acct.phone3){
   let found=extractPhones(acct.phone3);
   if(found.length>1){
     ['phone1','phone2','phone3','phone4','phone5','phone6','phone7','phone8','phone9','phone10'].forEach((slot,i)=>{if(!acct[slot]&&found[i])acct[slot]=found[i];});
   }
 }
 acct.rawData={};
 pendingImport.headers.forEach((h,i)=>{acct.rawData[h]=cells[i]??'';});
 acct.fullName=acct.fullName||[acct.firstName,acct.middleName,acct.lastName].filter(Boolean).join(' ');
 acct.accountNumber=acct.accountNumber||acct.clientAccountNumber||acct.accountId;
 acct.portfolio=acct.portfolio||acct.accountDescription||acct.originalCreditor||pendingImport.fileName.replace(/\.csv$/i,'');
 acct.originalCreditor=acct.originalCreditor||acct.accountDescription||acct.portfolio;
 acct.currentBalance=acct.currentBalance||acct.principal||acct.originalBalance;
 if(!acct.typeOfDebt && acct.accountDescription) acct.typeOfDebt=acct.accountDescription;
 return acct;
}
function renderMappingPreview(){
 if(!pendingImport.rows.length)return;
 let acct=getMappedAccount(pendingImport.rows.find(r=>r.some(c=>String(c).trim()))||pendingImport.rows[0]);
 document.getElementById('mappingPreview').innerHTML=`<div class="mapSummary"><b>Preview first mapped row:</b> Name: ${esc(acct.fullName||'—')} | Account #: ${esc(acct.accountNumber||'—')} | SSN: ${esc(acct.ssn||'—')} | Balance: ${esc(acct.currentBalance||acct.principal||acct.originalBalance||'—')} | Phone: ${esc(acct.phone1||acct.phone2||acct.phone3||'—')}</div>`;
}
const CORE_ACCOUNT_COLUMNS=['portfolio','account_description','client_account_number','source_account_id','account_number','first_name','middle_name','last_name','full_name','ssn','dob','address','address2','city','state','zip','employer','email','original_creditor','type_of_debt','original_balance','principal','current_balance','open_date','date_account_opened','delinquency_date','charge_off_date','orig_last_pmt_date','last_payment_date','last_payment_amount','bank_routing_number','bank_account_number','phone1','phone2','phone3','phone4','phone5','phone6','raw_data','status','disposition','last_contact_number','created_by_email','updated_at'];
function coreAccountRow(row){let out={};CORE_ACCOUNT_COLUMNS.forEach(k=>{if(row[k]!==undefined)out[k]=row[k]});return out}
function setImportProgress(percent,text,sub=''){
 let box=document.getElementById('importProgressBox'),bar=document.getElementById('importProgressBar'),t=document.getElementById('importProgressText'),s=document.getElementById('importProgressSub');
 if(!box||!bar||!t)return;
 box.classList.remove('hidden');
 bar.style.width=Math.max(0,Math.min(100,percent))+'%';
 t.textContent=Math.round(percent)+'%';
 if(text)t.textContent=Math.round(percent)+'% — '+text;
 if(s&&sub)s.textContent=sub;
}
function hideImportProgress(){let box=document.getElementById('importProgressBox');if(box)box.classList.add('hidden')}
async function insertAccountRows(rows){
 let mode='full';
 let total=rows.length, done=0;
 for(let i=0;i<rows.length;i+=250){
   let chunk=rows.slice(i,i+250);
   setImportProgress(Math.max(1,Math.round((done/Math.max(total,1))*100)),'Saving batch '+(Math.floor(i/250)+1),'Saving '+Math.min(i+chunk.length,total)+' of '+total+' rows to database...');
   try{
     await dbFetch('/accounts',{method:'POST',body:JSON.stringify(mode==='core'?chunk.map(coreAccountRow):chunk)});
   }catch(err){
     let msg=String(err.message||err);
     if(mode==='full' && (msg.toLowerCase().includes('schema cache') || msg.toLowerCase().includes('column') || msg.toLowerCase().includes('could not find'))){
       mode='core';
       await dbFetch('/accounts',{method:'POST',body:JSON.stringify(chunk.map(coreAccountRow))});
     }else{
       throw err;
     }
   }
   done+=chunk.length;
   setImportProgress(Math.round((done/Math.max(total,1))*100),'Saved '+done+' / '+total,'Saving rows to database...');
   await new Promise(r=>setTimeout(r,10));
 }
 return mode;
}
async function importMappedCSV(){
 if(!currentUser.isAdmin)return alert('Admin only');
 let btn=event?.target;
 let oldText=btn?.textContent;
 try{
   if(btn){btn.disabled=true;btn.textContent='Importing...';}
   setImportProgress(1,'Reading mapped rows','Preparing import...');
   let mapped=[], skipped=0;
   let importBatch=(typeof coPilotBuildImportBatchMeta==='function')?coPilotBuildImportBatchMeta():{id:'IMP-'+Date.now(),fileName:pendingImport.fileName,uploadedAt:new Date().toISOString(),uploadedBy:currentUser.email};
   pendingImport.rows.forEach((cells,idx)=>{
     if(cells.every(c=>!String(c).trim())){skipped++;return;}
     let acct=getMappedAccount(cells);
     if(!acct.fullName && !acct.accountNumber && !acct.ssn && !acct.phone1){skipped++;return;}
     acct.rawData=acct.rawData||{};
     acct.rawData._co_pilot_import_batch_id=importBatch.id;
     acct.rawData._co_pilot_import_batch_file=importBatch.fileName||pendingImport.fileName;
     acct.rawData._co_pilot_import_batch_uploaded_at=importBatch.uploadedAt||new Date().toISOString();
     acct.rawData._co_pilot_import_batch_uploaded_by=importBatch.uploadedBy||currentUser.email;
     mapped.push(toRow(acct));
     if(idx%500===0)setImportProgress(3,'Preparing rows','Prepared '+idx+' rows...');
   });
   if(!mapped.length)return alert('No rows were mapped. Choose at least name, account number, SSN, or phone.');
   let named=mapped.filter(r=>r.full_name).length, numbered=mapped.filter(r=>r.account_number).length, ssned=mapped.filter(r=>r.ssn).length, emailed=mapped.filter(r=>r.email).length, phoned=mapped.filter(r=>r.phone1||r.phone2||r.phone3||r.phone4||r.phone5||r.phone6||r.phone7||r.phone8||r.phone9||r.phone10).length;
   setImportProgress(5,'Starting database save','Found '+mapped.length+' rows to import...');
   importBatch.totalRows=pendingImport.rows.length;
   importBatch.importedRows=mapped.length;
   importBatch.goodRows=mapped.length;
   importBatch.skippedRows=skipped;
   importBatch.missingPhoneRows=mapped.filter(r=>!(r.phone1||r.phone2||r.phone3||r.phone4||r.phone5||r.phone6)).length;
   importBatch.missingSsnRows=mapped.filter(r=>!String(r.ssn||'').replace(/\D/g,'')).length;
   importBatch.missingDobRows=mapped.filter(r=>!String(r.dob||'').trim()).length;
   importBatch.duplicateRows=(typeof coPilotDuplicateRowsForImport==='function')?coPilotDuplicateRowsForImport(mapped):0;
   importBatch.totalBalance=mapped.reduce((sum,r)=>sum+moneyNum(r.current_balance||r.principal||r.original_balance),0);
   importBatch.portfolio=(mapped[0]&&mapped[0].portfolio)||pendingImport.fileName.replace(/\.csv$/i,'');
   let mode=await insertAccountRows(mapped);
   importBatch.insertMode=mode;
   if(typeof coPilotSaveImportBatchMeta==='function')coPilotSaveImportBatchMeta(importBatch);
   try{await insertAudit('Import Batch','Imported '+mapped.length+' accounts from '+(pendingImport.fileName||'CSV')+' | Batch '+importBatch.id,'import_batch',importBatch.id)}catch(e){}
   setImportProgress(100,'Import complete','Refreshing accounts...');
   closeModal('mapModal');
   let extra=mode==='core'?'\\n\\nImported using CORE fields + raw_data because Supabase is missing some new full-PDL columns. The account page will still display the original uploaded row if raw_data exists. To save extended fields as separate searchable DB columns too, run the updated database_schema_rls.sql in Supabase SQL Editor and re-import.':'';
   alert('Imported '+mapped.length+' accounts. Names found: '+named+'. Account numbers found: '+numbered+'. SSNs found: '+ssned+'. Emails found: '+emailed+'. Phone rows found: '+phoned+'. Skipped blank/unmapped rows: '+skipped+'.'+extra);
   await loadAccounts();
 }catch(err){
   alert('Import failed: '+(err.message||err)+'\\n\\nMost common fix: run the updated database_schema_rls.sql in Supabase SQL Editor, then reload Bolt and try again.');
 }finally{
   hideImportProgress();
   if(btn){btn.disabled=false;btn.textContent=oldText||'Import Mapped CSV';}
 }
}
function extractPhones(text){
 let matches=String(text||'').match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g)||[];
 return [...new Set(matches.map(p=>p.replace(/\D/g,'').replace(/^1(?=\d{10}$)/,'')))].slice(0,6);
}
function parseCSV(text){let rows=[],row=[],cell='',q=false;for(let i=0;i<text.length;i++){let ch=text[i],nx=text[i+1];if(ch=='"'&&q&&nx=='"'){cell+='"';i++}else if(ch=='"'){q=!q}else if(ch==','&&!q){row.push(cell);cell=''}else if((ch=='\n'||ch=='\r')&&!q){if(ch=='\r'&&nx=='\n')i++;row.push(cell);rows.push(row);row=[];cell=''}else cell+=ch}if(cell||row.length){row.push(cell);rows.push(row)}return rows}

async function deleteAllRows(table){
 // Fallback delete only. Small ID batches avoid browser/server URL-length failures.
 let total=0;
 while(true){
   let rows=await dbFetch('/'+table+'?select=id&limit=50');
   if(!rows || rows.length===0)break;
   let ids=rows.map(r=>r.id).filter(Boolean);
   if(ids.length===0)break;
   await dbFetch('/'+table+'?id=in.('+ids.join(',')+')',{
     method:'DELETE',
     headers:{Prefer:'return=minimal'}
   });
   total+=ids.length;
   if(ids.length<50)break;
   await new Promise(r=>setTimeout(r,20));
 }
 return total;
}

async function clearAllAccounts(){
 if(!currentUser.isAdmin)return alert('Admin only');
 let phrase=prompt('This will delete ALL accounts and all account-related records from this Supabase project. Type CLEAR to continue.');
 if(phrase!=='CLEAR')return;

 try{
   let result=null;

   // Preferred method: secure SQL function. This avoids long delete URLs and bypasses client-side fetch failures.
   try{
     result=await dbFetch('/rpc/admin_clear_accounts',{
       method:'POST',
       body:JSON.stringify({})
     });
   }catch(rpcErr){
     // Fallback for users who have not run the SQL yet.
     console.warn('admin_clear_accounts RPC failed, falling back to client deletes:', rpcErr);
     const tables=[
       'payment_plan_payments',
       'payment_plans',
       'payments_ledger',
       'account_docs',
       'account_notes',
       'activity_logs',
       'follow_ups',
       'call_results',
       'disputes',
       'settlements',
       'import_batches',
       'accounts'
     ];
     let fallbackCounts={};
     for(const table of tables){
       try{fallbackCounts[table]=await deleteAllRows(table)}
       catch(e){fallbackCounts[table]='failed: '+(e.message||e)}
     }
     result={fallback:true,counts:fallbackCounts};
   }

   accounts=[];
   currentAccountId='';
   render();

   let summary='';
   if(result && result.counts){
     summary=Object.entries(result.counts).map(([k,v])=>k+': '+v).join('\n');
   }else{
     summary='Accounts and related records were cleared.';
   }

   try{await insertAudit('Clear Accounts','Cleared accounts and related records','accounts','')}catch(e){}
   alert('Clear complete.\n\n'+summary+'\n\nNow re-import the CSV.');
   await loadAccounts();
 }catch(err){
   alert('Clear failed: '+(err.message||err)+'\n\nFix: open Supabase SQL Editor, run RUN_THIS_CLEAR_ACCOUNTS_SQL.sql from this ZIP, reload Bolt, then try Clear Accounts again.');
 }
}

function exportCSV(){if(!currentUser.isAdmin)return alert('Admin only');let headers=FIELDS,rows=[headers.join(',')].concat(accounts.map(a=>headers.map(h=>`"${String(a[h]??'').replaceAll('"','""')}"`).join(',')));insertAudit('Export CSV','Exported '+accounts.length+' accounts','accounts','');download('co-pilot-accounts-export.csv',rows.join('\n'),'text/csv')}function downloadTemplate(){let headers=FIELDS,sample=['PlainGreen LLC','PlainGreen LLC','36972835','13242556','36972835','John','','Doe','John Doe','123-45-6789','01/01/1980','123 Main St','','Las Vegas','NV','89101','Employer','email@example.com','PlainGreen LLC','installment loan','','',1000,'01/01/2020','','','02/01/2020','','','0','','','702-555-1111','','','','','','New'];download('co-pilot-import-template.csv',headers.join(',')+'\n'+sample.map(v=>`"${String(v).replaceAll('"','""')}"`).join(','),'text/csv')}function download(name,text,type){let blob=new Blob([text],{type}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();URL.revokeObjectURL(u)}

let qaLastReport=[];

function openQaHealthModal(){
  if(!currentUser.isAdmin)return alert('Admin only');
  document.getElementById('qaHealthModal').classList.add('open');
}
function qaPush(list,status,area,check,result){
  list.push({status,area,check,result,checkedAt:new Date().toISOString()});
}
function qaDomExists(id){return !!document.getElementById(id)}
async function qaDbTableCheck(table, label, list){
  try{
    await dbFetch('/'+table+'?select=*&limit=1');
    qaPush(list,'pass','Database',label||table,'Table is readable.');
  }catch(e){
    qaPush(list,'fail','Database',label||table,'Cannot read table: '+(e.message||String(e)));
  }
}
async function qaCompanySettingCheck(key, label, list, validator=null){
  try{
    let rows=await dbFetch('/company_settings?select=setting_key,setting_value&setting_key=eq.'+encodeURIComponent(key)+'&limit=1');
    if(!rows||!rows.length){
      qaPush(list,'warn','Settings',label, 'Missing setting. It may be created after admin saves it.');
      return;
    }
    let value=rows[0].setting_value||rows[0].settingValue||'';
    if(validator){
      let v=validator(value);
      qaPush(list,v.ok?'pass':'fail','Settings',label,v.message);
    }else{
      qaPush(list,'pass','Settings',label,'Found.');
    }
  }catch(e){
    qaPush(list,'fail','Settings',label,'Could not check setting: '+(e.message||String(e)));
  }
}
async function runQaHealthCheck(){
  let list=[];
  qaPush(list,'pass','App','Current user',currentUser.email||'Unknown');
  qaPush(list,currentUser.isAdmin?'pass':'fail','Permissions','Admin login',currentUser.isAdmin?'Logged in as admin.':'Not logged in as admin.');
  qaPush(list,accounts.length?'pass':'warn','Data','Loaded accounts',accounts.length+' account(s) loaded in browser.');

  // UI modules
  [
    ['loginScreen','Landing / Login page'],
    ['globalSearch','Top search box'],
    ['search','Queue search box'],
    ['queueList','Queue list'],
    ['documentGeneratorModal','Letter / PDF generator'],
    ['letterBodyEditorModal','Letter body editor'],
    ['todayDashboardModal','Today dashboard'],
    ['followUpModal','Follow-up modal'],
    ['paymentLedgerModal','Payment ledger'],
    ['paymentPlanModal','Payment plan modal'],
    ['employeeAdminModal','Manage employees'],
    ['employeeMonitorModal','Employee monitor'],
    ['brandingSettingsModal','Branding settings'],
    ['qaHealthModal','QA health modal']
  ].forEach(([id,label])=>{
    qaPush(list,qaDomExists(id)?'pass':'fail','UI Module',label,qaDomExists(id)?'Found.':'Missing DOM element #'+id);
  });

  // Critical functions
  [
    ['openDocumentGenerator','Letters open function'],
    ['openLetterBodyEditor','Letter body editor function'],
    ['openTodayDashboard','Today dashboard function'],
    ['saveFollowUp','Follow-up save function'],
    ['saveAppBrandSettings','Branding save function'],
    ['savePdfAuthorizedByDefault','Authorized By save function'],
    ['queue','Queue/search function'],
    ['handleSearchInput','Debounced search handler']
  ].forEach(([fn,label])=>{
    qaPush(list,typeof window[fn]==='function'?'pass':'fail','Code Function',label,typeof window[fn]==='function'?'Function exists.':'Missing function '+fn);
  });

  // Search/letter local cache checks
  let authLocal=localStorage.getItem('pdfAuthorizedByDefault')||'';
  qaPush(list,/@/.test(authLocal)?'fail':'pass','Local Cache','Authorized By cache',/@/.test(authLocal)?'Bad cached email found. Click Clear Bad Letter Cache.':'No email found in local Authorized By cache.');
  let templateLocal=localStorage.getItem('pdfLetterTemplatesJson')||'{}';
  try{JSON.parse(templateLocal);qaPush(list,'pass','Local Cache','Letter templates JSON','Valid JSON.')}catch(e){qaPush(list,'fail','Local Cache','Letter templates JSON','Invalid JSON. Click Clear Bad Letter Cache.')}

  // Database tables
  let tables=[
    ['accounts','Accounts'],
    ['account_notes','Notes'],
    ['activity_logs','Activity logs'],
    ['payment_plans','Payment plans'],
    ['payment_plan_payments','Plan payments'],
    ['payments_ledger','Payment ledger'],
    ['account_docs','Generated document records'],
    ['follow_ups','Follow-ups / callbacks'],
    ['call_results','Call results'],
    ['app_users','App users / employee approval'],
    ['company_settings','Company settings / branding / letters']
  ];
  for(const [table,label] of tables){
    await qaDbTableCheck(table,label,list);
  }

  // Settings
  await qaCompanySettingCheck('app_brand_name','App branding name',list);
  await qaCompanySettingCheck('pdf_authorized_by_default','Authorized By default',list,(v)=>{
    if(!v||String(v).trim()==='')return {ok:false,message:'Blank value. Run RUN_THIS_FORCE_LETTER_SETTINGS_SQL.sql.'};
    if(/@/.test(String(v)))return {ok:false,message:'Bad email value in database: '+v+'. Run RUN_THIS_FORCE_LETTER_SETTINGS_SQL.sql.'};
    return {ok:true,message:'Value: '+v};
  });
  await qaCompanySettingCheck('pdf_letter_templates_json','Letter body templates',list,(v)=>{
    try{JSON.parse(v||'{}');return {ok:true,message:'Valid JSON template storage.'}}catch(e){return {ok:false,message:'Invalid JSON in template storage.'}}
  });

  // Light feature logic checks
  try{
    let q=queue();
    qaPush(list,'pass','Search','Queue function test','Returned '+q.length+' result(s).');
  }catch(e){
    qaPush(list,'fail','Search','Queue function test','Queue failed: '+(e.message||String(e)));
  }

  try{
    let d=getPdfAuthorizedByDefault();
    qaPush(list,/@/.test(d)?'fail':'pass','Letters','Authorized By default test',/@/.test(d)?'Still returning email: '+d:'Using: '+d);
  }catch(e){
    qaPush(list,'fail','Letters','Authorized By default test','Failed: '+(e.message||String(e)));
  }

  qaLastReport=list;
  renderQaReport(list);
}
function renderQaReport(list){
  let pass=list.filter(x=>x.status==='pass').length;
  let warn=list.filter(x=>x.status==='warn').length;
  let fail=list.filter(x=>x.status==='fail').length;
  document.getElementById('qaTotal').textContent=list.length;
  document.getElementById('qaPass').textContent=pass;
  document.getElementById('qaWarn').textContent=warn;
  document.getElementById('qaFail').textContent=fail;

  let summary=document.getElementById('qaSummary');
  summary.className='qaSummary '+(fail?'fail':warn?'warn':'ok');
  summary.textContent=fail
    ? `Health check found ${fail} failure(s). Fix those before launch.`
    : warn
      ? `Health check passed with ${warn} warning(s). Review before launch.`
      : 'Health check passed. App is ready for controlled production review.';

  document.getElementById('qaHealthBody').innerHTML=list.map(r=>`<tr>
    <td><span class="qaPill ${r.status}">${r.status.toUpperCase()}</span></td>
    <td>${esc(r.area)}</td>
    <td>${esc(r.check)}</td>
    <td>${esc(r.result)}</td>
  </tr>`).join('');
}
function downloadQaReport(){
  if(!qaLastReport.length)return alert('Run the health check first.');
  let payload={
    app:'Co Pilot Collections Manager',
    reportType:'QA Health Check',
    generatedAt:new Date().toISOString(),
    user:currentUser.email||'',
    accountCount:accounts.length,
    results:qaLastReport
  };
  download('co-pilot-qa-health-check-'+todayISO()+'.json',JSON.stringify(payload,null,2),'application/json');
}
function downloadQaChecklist(){
  let text=`CO PILOT COLLECTIONS MANAGER - MANUAL QA CHECKLIST

Run this after every update before selling or using.

LOGIN / ROLES
[ ] Admin can log in.
[ ] Employee can request access.
[ ] Pending employee cannot access app before approval.
[ ] Admin can approve employee.
[ ] Employee can log in after approval.
[ ] Fired/removed employee cannot access app.

IMPORT / DATA
[ ] Admin can import a sample CSV.
[ ] Mapping works.
[ ] Accounts display in queue.
[ ] Clear Accounts works.
[ ] Re-import works after clear.
[ ] Phone-first search works.
[ ] Name search works.
[ ] SSN search works.
[ ] Address search works.

COLLECTOR WORKFLOW
[ ] Open one account.
[ ] Phone numbers display.
[ ] Add note.
[ ] Change status.
[ ] Log call result.
[ ] Schedule callback/follow-up.
[ ] Save Follow-Up works.
[ ] Today dashboard shows callback/follow-up.

PAYMENTS
[ ] Create payment plan.
[ ] Payment plan does not exceed balance.
[ ] Mark scheduled payment paid.
[ ] Balance updates correctly.
[ ] Broken promise shows when overdue.
[ ] Payment ledger records payment.

ADMIN
[ ] Assign accounts to employee.
[ ] Employee monitor shows account counts/statuses.
[ ] Manage employees works.
[ ] Audit log opens.
[ ] Branding settings save.
[ ] Brand backup download works.
[ ] Brand restore works.

LETTERS
[ ] Authorized By defaults to Co Pilot Collections Manager.
[ ] Authorized By can save default.
[ ] Bodies button opens.
[ ] Admin can edit Demand Letter body.
[ ] Edited body appears in preview/PDF.
[ ] Letter watermark logo appears.
[ ] File/account number uses debtor account number.
[ ] PDF spacing looks professional.

LIVE
[ ] No real debtor data is used.
[ ] Company logo uploaded.
[ ] Admin login works.
[ ] Employee login works.
[ ] Help page opens.
[ ] QA Health Check passes or warnings are understood.
`;
  download('co-pilot-manual-qa-checklist.txt',text,'text/plain');
}
function clearBadLetterLocalCache(){
  localStorage.removeItem('pdfAuthorizedByDefault');
  localStorage.removeItem('pdfLetterTemplatesJson');
  if(typeof pdfLetterSettings!=='undefined'){
    pdfLetterSettings.loaded=false;
    pdfLetterSettings.authorizedByDefault='Co Pilot Collections Manager';
    pdfLetterSettings.templates={};
  }
  alert('Bad local letter cache cleared. Refresh the app, then open Letters again.');
}



/* PAYMENT PROMISE TRACKER — manual admin confirmation, no processing */
let paymentPromiseData=[];
function promiseGroupId(){return 'PP-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,6).toUpperCase()}
function ptIsoAdd(start,frequency,step){let d=new Date(String(start||todayISO())+'T00:00:00');if(isNaN(d))d=new Date(todayISO()+'T00:00:00');let f=String(frequency||'One-Time').toLowerCase();if(step<=0)return d.toISOString().slice(0,10);if(f.includes('weekly')&&!f.includes('bi'))d.setDate(d.getDate()+7*step);else if(f.includes('bi'))d.setDate(d.getDate()+14*step);else if(f.includes('month'))d.setMonth(d.getMonth()+step);else d.setDate(d.getDate()+step);return d.toISOString().slice(0,10)}
function ptAccountForRow(r){return accountById(r.accountId||r.account_id)}
function ptRowAmount(r){return moneyNum(r.paymentAmount||r.payment_amount||r.amount||r.amountDue||r.amount_due)}
function ptPaidAmount(r){return moneyNum(r.paidAmount||r.paid_amount)}
function ptIsFailed(r){let s=String(r.status||'').toLowerCase();return s==='failed'||s==='nsf'||s==='broken promise'}
function ptIsPaid(r){return String(r.status||'').toLowerCase()==='paid'}
function ptIsPending(r){let s=String(r.status||'pending processing').toLowerCase();return ['pending processing','pending','scheduled','rescheduled'].includes(s)}
function ptStatusClass(status){let s=String(status||'').toLowerCase();if(s==='paid')return 'green';if(s==='failed'||s==='nsf'||s==='broken promise')return 'red';if(s==='pending processing'||s==='pending'||s==='scheduled')return 'orange';if(s==='rescheduled')return 'purple';if(s==='canceled')return 'gray';return 'blue'}
function ptSafeLast4(v){return String(v||'').replace(/\D/g,'').slice(-4)}
function openPaymentTracker(){document.getElementById('paymentTrackerModal').classList.add('open');fillPaymentPromiseForm();loadPaymentTracker()}
function openPaymentTrackerForCurrent(){let a=getCurrent();if(!a)return alert('No account selected.');document.getElementById('paymentTrackerModal').classList.add('open');fillPaymentPromiseForm(a);loadPaymentTracker()}
function fillPaymentPromiseForm(a=getCurrent()){let box=document.getElementById('ptAccountPreview');if(!a){if(box)box.innerHTML='<b>No account selected.</b><br>Open an account first, then record a payment promise.';setVal('ptAccountId','');return}setVal('ptAccountId',a.id);if(box)box.innerHTML=`<b>${esc(nameOf(a))}</b><br>Account: ${esc(acctNo(a))} • Balance: ${money(accountBalance(a))} • Assigned: ${esc(currentAssignee(a)||'—')}`;setVal('ptAmount','');setVal('ptDueDate',todayISO());setVal('ptCount','1');setVal('ptFrequency','One-Time');setVal('ptMethod','Card');setVal('ptLast4','');setVal('ptAuthMethod','Phone Authorization');setVal('ptNotes','')}
function paymentPromiseEmployeeOptions(rows){let sel=document.getElementById('ptEmployeeFilter');if(!sel)return;let keep=sel.value||'';let emps=[...new Set((rows||[]).map(r=>(r.employeeEmail||r.employee_email||r.createdByEmail||r.created_by_email||'').toLowerCase()).filter(Boolean))].sort();sel.innerHTML='<option value="">All Employees</option>'+emps.map(e=>`<option value="${esc(e)}">${esc(e)}</option>`).join('');sel.value=emps.includes(keep)?keep:''}
async function loadPaymentTracker(){let rows=[];try{rows=(await dbFetch('/payment_promises?select=*&order=due_date.asc,created_at.desc&limit=50000')).map(toCamel)}catch(e){alert('Payment Tracker table is not ready yet. Run RUN_THIS_PAYMENT_TRACKER_SQL.sql in Supabase, then reload.');rows=[]}if(!currentUser.isAdmin){let email=(currentUser.email||'').toLowerCase();let allowedIds=new Set(accounts.map(a=>String(a.id)));rows=rows.filter(r=>allowedIds.has(String(r.accountId))||String(r.employeeEmail||r.createdByEmail||'').toLowerCase()===email)}paymentPromiseData=rows;paymentPromiseEmployeeOptions(rows);renderPaymentTracker()}
function paymentPromiseFilteredRows(){let rows=[...paymentPromiseData];let status=document.getElementById('ptStatusFilter')?.value||'all';let dateFilter=document.getElementById('ptDateFilter')?.value||'all';let emp=document.getElementById('ptEmployeeFilter')?.value||'';let today=todayISO(),month=today.slice(0,7);if(status&&status!=='all')rows=rows.filter(r=>String(r.status||'Pending Processing')===status);if(dateFilter==='today')rows=rows.filter(r=>String(r.dueDate||'')===today);if(dateFilter==='upcoming')rows=rows.filter(r=>String(r.dueDate||'')>=today&&!ptIsPaid(r));if(dateFilter==='past')rows=rows.filter(r=>String(r.dueDate||'')<today&&!ptIsPaid(r));if(dateFilter==='month')rows=rows.filter(r=>String(r.dueDate||'').slice(0,7)===month||String(r.paidDate||'').slice(0,7)===month);if(emp)rows=rows.filter(r=>String(r.employeeEmail||r.createdByEmail||'').toLowerCase()===emp);return rows}
function renderPaymentTracker(){let all=paymentPromiseData||[],today=todayISO(),month=today.slice(0,7);let promised=all.filter(r=>String(r.status||'')!=='Canceled').reduce((s,r)=>s+ptRowAmount(r),0);let pending=all.filter(ptIsPending).reduce((s,r)=>s+ptRowAmount(r),0);let paid=all.filter(ptIsPaid).reduce((s,r)=>s+(ptPaidAmount(r)||ptRowAmount(r)),0);let failed=all.filter(ptIsFailed).reduce((s,r)=>s+ptRowAmount(r),0);let upcoming=all.filter(r=>String(r.dueDate||'')>=today&&!ptIsPaid(r)&&String(r.status||'')!=='Canceled').length;let paidMonth=all.filter(r=>ptIsPaid(r)&&String(r.paidDate||r.processedAt||'').slice(0,7)===month).reduce((s,r)=>s+(ptPaidAmount(r)||ptRowAmount(r)),0);['ptStatPromised','ptStatPending','ptStatPaid','ptStatFailed','ptStatUpcoming','ptStatMonth'].forEach((id,i)=>{let vals=[money(promised),money(pending),money(paid),money(failed),String(upcoming),money(paidMonth)];let el=document.getElementById(id);if(el)el.textContent=vals[i]});let body=document.getElementById('ptBody');let rows=paymentPromiseFilteredRows();if(body)body.innerHTML=rows.map(paymentPromiseRow).join('')||'<tr><td colspan="7"><div class="ptEmpty">No payment promises found for this view.</div></td></tr>';renderPaymentEmployeeTotals()}
function paymentPromiseRow(r){let a=ptAccountForRow(r),amt=ptRowAmount(r),status=r.status||'Pending Processing',employee=(r.employeeEmail||r.createdByEmail||'').toLowerCase(),method=`${r.paymentMethod||'—'}${r.methodLast4?' ending '+r.methodLast4:''}`,due=String(r.dueDate||''),overdue=due&&due<todayISO()&&!ptIsPaid(r)&&!['Canceled','Failed','NSF','Broken Promise'].includes(status),statusShow=overdue?'Past Due / Pending':status;let actions=currentUser.isAdmin?`<div class="ptActions"><button class="green" onclick="setPaymentPromiseStatus('${r.id}','Paid')">Paid</button><button class="red" onclick="setPaymentPromiseStatus('${r.id}','Failed')">Failed</button><button class="red" onclick="setPaymentPromiseStatus('${r.id}','NSF')">NSF</button><button class="outline" onclick="reschedulePaymentPromise('${r.id}')">Reschedule</button><button class="outline" onclick="setPaymentPromiseStatus('${r.id}','Canceled')">Cancel</button>${a?`<button class="outline" onclick="setAccountFromModal('${a.id}','paymentTrackerModal')">Open</button>`:''}</div>`:`<div class="ptMethod">Waiting for admin confirmation.</div>${a?`<button class="outline" onclick="setAccountFromModal('${a.id}','paymentTrackerModal')">Open</button>`:''}`;return `<tr class="${overdue?'brokenRow':''}"><td><b>${esc(due||'—')}</b><div class="ptMethod">${esc(r.paymentKind||'One-Time Payment')} ${r.scheduleIndex&&r.scheduleTotal?`#${r.scheduleIndex}/${r.scheduleTotal}`:''}</div></td><td><b>${esc(r.debtorName||a&&nameOf(a)||'Unknown')}</b><div class="ptMethod">Acct: ${esc(r.accountNumber||a&&acctNo(a)||'—')}</div></td><td><b>${money(amt)}</b><div class="ptMethod">Paid: ${money(ptPaidAmount(r))}</div></td><td>${esc(method)}<div class="ptMethod">${esc(r.authorizationMethod||'')}</div></td><td>${esc(employee||'—')}<div class="ptMethod">${esc(r.createdAt?String(r.createdAt).slice(0,10):'')}</div></td><td><span class="ptPill ${ptStatusClass(statusShow)}">${esc(statusShow)}</span>${r.adminNote?`<div class="ptMethod">${esc(r.adminNote)}</div>`:''}</td><td>${actions}</td></tr>`}
function renderPaymentEmployeeTotals(){let body=document.getElementById('ptEmployeeTotals');if(!body)return;let mapEmp={};(paymentPromiseData||[]).forEach(r=>{let e=(r.employeeEmail||r.createdByEmail||'Unassigned').toLowerCase();if(!mapEmp[e])mapEmp[e]={pending:0,paid:0,failed:0,month:0};let amt=ptRowAmount(r),paidAmt=ptPaidAmount(r)||amt;if(ptIsPaid(r)){mapEmp[e].paid+=paidAmt;if(String(r.paidDate||r.processedAt||'').slice(0,7)===todayISO().slice(0,7))mapEmp[e].month+=paidAmt}else if(ptIsFailed(r)){mapEmp[e].failed+=amt}else if(ptIsPending(r)){mapEmp[e].pending+=amt}});let rows=Object.entries(mapEmp).sort((a,b)=>b[1].paid-a[1].paid);body.innerHTML=rows.map(([e,v])=>`<tr><td><b>${esc(e)}</b></td><td>${money(v.pending)}</td><td>${money(v.paid)}</td><td>${money(v.failed)}</td><td>${money(v.month)}</td></tr>`).join('')||'<tr><td colspan="5"><div class="ptEmpty">No employee payment activity yet.</div></td></tr>'}
async function savePaymentPromise(){let a=getCurrent();let id=val('ptAccountId');if(id&&(!a||String(a.id)!==String(id)))a=accountById(id)||a;if(!a)return alert('Open an account first.');let amount=moneyNum(val('ptAmount')),due=val('ptDueDate')||todayISO(),count=Math.max(1,Math.min(60,parseInt(val('ptCount')||'1',10)||1)),frequency=val('ptFrequency')||'One-Time',kind=count>1?'Payment Plan':(val('ptPaymentKind')||'One-Time Payment'),method=val('ptMethod')||'Card',last4=ptSafeLast4(val('ptLast4')),auth=val('ptAuthMethod')||'Phone Authorization',notes=val('ptNotes');if(amount<=0)return alert('Enter a payment amount.');let gid=promiseGroupId(),rows=[];for(let i=0;i<count;i++)rows.push({account_id:a.id,promise_group_id:gid,schedule_index:i+1,schedule_total:count,debtor_name:nameOf(a),account_number:acctNo(a),payment_kind:kind,payment_amount:amount,total_amount:Number((amount*count).toFixed(2)),due_date:ptIsoAdd(due,frequency,i),payment_method:method,method_last4:last4,authorization_method:auth,status:'Pending Processing',employee_email:currentUser.email,assigned_to_email:currentAssignee(a),notes,created_by_email:currentUser.email,updated_at:new Date().toISOString()});await dbFetch('/payment_promises',{method:'POST',body:JSON.stringify(rows)});await dbFetch(`/accounts?id=eq.${a.id}`,{method:'PATCH',body:JSON.stringify({status:'Promise to Pay',disposition:'Promise to Pay',updated_at:new Date().toISOString()})}).catch(()=>{});await insertActivity(a.id,'Payment Promise Recorded',`${count} payment promise(s) recorded for ${money(amount)} each. First due ${due}. Method: ${method}${last4?' ending '+last4:''}.`);await insertAudit('Payment Promise Recorded',`${count} payment promise(s) for ${nameOf(a)} totaling ${money(amount*count)}`,'account',a.id);fillPaymentPromiseForm(a);await loadPaymentTracker();await loadAccounts()}
async function setPaymentPromiseStatus(id,status){if(!currentUser.isAdmin)return alert('Admin only.');let r=(paymentPromiseData||[]).find(x=>String(x.id)===String(id));if(!r)return alert('Payment promise not found.');let note='';if(['Failed','NSF','Canceled'].includes(status))note=prompt('Admin note / reason:',status)||status;let body={status,admin_note:note,processed_by_email:currentUser.email,processed_at:new Date().toISOString(),updated_at:new Date().toISOString()};if(status==='Paid'){let amt=ptRowAmount(r);body.paid_amount=amt;body.paid_date=todayISO();let a=ptAccountForRow(r);if(a){let balBefore=accountBalance(a),balAfter=Math.max(0,Number((balBefore-amt).toFixed(2))),receipt=ledgerReceiptNo();await dbFetch('/payments_ledger',{method:'POST',body:JSON.stringify([{account_id:a.id,payment_date:todayISO(),amount:amt,payment_type:'Payment',payment_method:r.paymentMethod||'Other',status:'Completed',receipt_number:receipt,balance_before:balBefore,balance_after:balAfter,notes:'Admin marked payment promise paid. '+(r.notes||''),created_by_email:currentUser.email}])}).catch(()=>{});await dbFetch(`/accounts?id=eq.${a.id}`,{method:'PATCH',body:JSON.stringify({current_balance:balAfter,status:balAfter<=0?'Settled':a.status,disposition:balAfter<=0?'Settled':a.disposition,updated_at:new Date().toISOString()})}).catch(()=>{})}}await dbFetch('/payment_promises?id=eq.'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify(body)});await insertActivity(r.accountId,'Payment Promise '+status,`Admin marked promise ${status}: ${money(ptRowAmount(r))}. ${note}`.trim());await insertAudit('Payment Promise '+status,`Payment promise ${id} marked ${status}`,'payment_promises',id);if(['Failed','NSF','Broken Promise'].includes(status))await dbFetch('/follow_ups',{method:'POST',body:JSON.stringify([{account_id:r.accountId,follow_up_type:status+' Payment Follow-Up',due_date:todayISO(),status:'Open',assigned_to_email:r.employeeEmail||r.assignedToEmail||currentUser.email,reason:'Payment '+status,notes:'Created from Payment Tracker. '+note,created_by_email:currentUser.email}])}).catch(()=>{});await loadPaymentTracker();await loadAccounts()}
async function reschedulePaymentPromise(id){if(!currentUser.isAdmin)return alert('Admin only.');let r=(paymentPromiseData||[]).find(x=>String(x.id)===String(id));if(!r)return alert('Payment promise not found.');let newDate=prompt('New payment date YYYY-MM-DD:',r.dueDate||todayISO());if(!newDate)return;if(!/^\d{4}-\d{2}-\d{2}$/.test(newDate))return alert('Use YYYY-MM-DD format.');await dbFetch('/payment_promises?id=eq.'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({status:'Rescheduled',rescheduled_from:r.dueDate||null,due_date:newDate,processed_by_email:currentUser.email,processed_at:new Date().toISOString(),updated_at:new Date().toISOString()})});await insertActivity(r.accountId,'Payment Promise Rescheduled',`Payment promise moved from ${r.dueDate||'—'} to ${newDate}.`);await loadPaymentTracker()}
function exportPaymentPromisesCSV(){let rows=paymentPromiseFilteredRows();let csv=['due_date,debtor,account,amount,method,last4,authorization,status,employee,processed_by,paid_date,paid_amount,notes'];rows.forEach(r=>{csv.push([r.dueDate,r.debtorName,r.accountNumber,ptRowAmount(r),r.paymentMethod,r.methodLast4,r.authorizationMethod,r.status,r.employeeEmail||r.createdByEmail,r.processedByEmail,r.paidDate,ptPaidAmount(r),r.notes].map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(','))});download('payment_promises_export.csv',csv.join('\n'),'text/csv')}


// Promise automation hooks for Pay Desk actions
if(typeof savePaymentPromise==='function' && !window.__cpcmSavePromiseAutomationWrapped){
  window.__cpcmSavePromiseAutomationWrapped=true;
  const __cpcmOriginalSavePaymentPromise=savePaymentPromise;
  savePaymentPromise=async function(){await __cpcmOriginalSavePaymentPromise.apply(this,arguments);await runPromiseAutomation(false,false).catch(()=>{});await refreshCollectorAlertBadge().catch(()=>{});};
}
if(typeof setPaymentPromiseStatus==='function' && !window.__cpcmSetPromiseStatusWrapped){
  window.__cpcmSetPromiseStatusWrapped=true;
  const __cpcmOriginalSetPaymentPromiseStatus=setPaymentPromiseStatus;
  setPaymentPromiseStatus=async function(id,status){await __cpcmOriginalSetPaymentPromiseStatus.apply(this,arguments);let sev=status==='Paid'?'success':(['Failed','NSF','Broken Promise'].includes(status)?'critical':'info');let r=(paymentPromiseData||[]).find(x=>String(x.id)===String(id));let a=r?ptAccountForRow(r):null;if(r)await createCollectorAlert({type:'Payment '+status,severity:sev,title:'Payment promise marked '+status,message:`${a?nameOf(a):r.debtorName||'Account'} • ${money(ptRowAmount(r))} marked ${status}.`,dueDate:todayISO(),accountId:r.accountId,assignedToEmail:r.employeeEmail||r.assignedToEmail||'',sourceTable:'payment_promises',sourceId:id});await runPromiseAutomation(false,false).catch(()=>{});await refreshCollectorAlertBadge().catch(()=>{});};
}


/* LEADERBOARD + CLICKABLE LEFT NAV */
let leaderboardRows=[];
function focusQueue(){
  closeAllLargeModalsForNav();
  document.querySelector('.sidebar')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function closeAllLargeModalsForNav(){
  ['complianceGuardModal','leaderboardModal','paymentTrackerModal','paymentsDashboardModal','todayDashboardModal','dailyWorkQueueModal','promiseDashboardModal','employeeMonitorModal','employeeAdminModal','brandingSettingsModal','auditModal','permissionsModal','documentGeneratorModal'].forEach(id=>{
    let el=document.getElementById(id);
    if(el)el.classList.remove('open');
  });
}
function openLeaderboard(){
  document.getElementById('leaderboardModal').classList.add('open');
  if(!document.getElementById('lbStart').value || !document.getElementById('lbEnd').value){
    setLeaderboardRange('today');
  }
  loadLeaderboard();
}
function leaderboardMonday(d){
  let x=new Date(d);
  let day=x.getDay();
  let diff=(day===0?-6:1-day);
  x.setDate(x.getDate()+diff);
  return x;
}
function isoDate(d){return new Date(d).toISOString().slice(0,10)}
function setLeaderboardRange(range){
  let now=new Date(todayISO()+'T00:00:00');
  let start=new Date(now), end=new Date(now);
  if(range==='yesterday'){
    start.setDate(start.getDate()-1); end=new Date(start);
  }else if(range==='week'){
    start=leaderboardMonday(now); end=new Date(now);
  }else if(range==='lastWeek'){
    end=leaderboardMonday(now); end.setDate(end.getDate()-1);
    start=leaderboardMonday(end);
  }else if(range==='month'){
    start=new Date(now.getFullYear(),now.getMonth(),1); end=new Date(now);
  }else if(range==='lastMonth'){
    start=new Date(now.getFullYear(),now.getMonth()-1,1);
    end=new Date(now.getFullYear(),now.getMonth(),0);
  }else if(range==='year'){
    start=new Date(now.getFullYear(),0,1); end=new Date(now);
  }
  document.getElementById('lbStart').value=isoDate(start);
  document.getElementById('lbEnd').value=isoDate(end);
}
function leaderboardRangeChanged(){
  let r=document.getElementById('lbRange').value||'today';
  if(r!=='custom')setLeaderboardRange(r);
  loadLeaderboard();
}
function lbInRangeDate(value,start,end){
  let d=String(value||'').slice(0,10);
  return d && d>=start && d<=end;
}
function lbEmployeeKey(r){
  return String(r.employeeEmail||r.employee_email||r.createdByEmail||r.created_by_email||r.assignedToEmail||r.assigned_to_email||'Unassigned').toLowerCase();
}
function lbAmt(r){return moneyNum(r.paymentAmount||r.payment_amount||r.amount||r.amountDue||r.amount_due)}
function lbPaidAmt(r){return moneyNum(r.paidAmount||r.paid_amount)||lbAmt(r)}
function lbStatus(r){return String(r.status||'Pending Processing')}
function lbEnsure(map,email){
  email=email||'Unassigned';
  if(!map[email])map[email]={email,paid:0,promised:0,pending:0,failed:0,paidCount:0,promiseCount:0};
  return map[email];
}
async function loadLeaderboard(){
  let start=document.getElementById('lbStart').value||todayISO();
  let end=document.getElementById('lbEnd').value||todayISO();
  if(start>end){let t=start;start=end;end=t;document.getElementById('lbStart').value=start;document.getElementById('lbEnd').value=end;}
  let promises=[];
  try{
    promises=(await dbFetch('/payment_promises?select=*&order=created_at.desc&limit=50000')).map(toCamel);
  }catch(e){
    promises=[];
    alert('Leaderboard needs Payment Tracker table. Run RUN_THIS_PAYMENT_TRACKER_SQL.sql first.');
  }
  if(!currentUser.isAdmin){
    let email=(currentUser.email||'').toLowerCase();
    let allowedIds=new Set(accounts.map(a=>String(a.id)));
    promises=promises.filter(r=>allowedIds.has(String(r.accountId))||lbEmployeeKey(r)===email);
  }
  let map={};
  promises.forEach(r=>{
    let email=lbEmployeeKey(r);
    let row=lbEnsure(map,email);
    let status=lbStatus(r).toLowerCase();
    let amt=lbAmt(r);

    // Promised Today = promises created in selected range.
    if(lbInRangeDate(r.createdAt||r.created_at,start,end)){
      row.promised+=amt;
      row.promiseCount+=1;
    }

    // Green = admin confirmed paid in selected range.
    if(status==='paid' && lbInRangeDate(r.paidDate||r.paid_date||r.processedAt||r.processed_at,start,end)){
      row.paid+=lbPaidAmt(r);
      row.paidCount+=1;
    }

    // Pending queue = pending due in selected range.
    if(['pending processing','pending','scheduled','rescheduled'].includes(status) && lbInRangeDate(r.dueDate||r.due_date,start,end)){
      row.pending+=amt;
    }

    // Failed / NSF = failed in selected range by processed date, or due date fallback.
    if(['failed','nsf','broken promise'].includes(status) && (lbInRangeDate(r.processedAt||r.processed_at,start,end)||lbInRangeDate(r.dueDate||r.due_date,start,end))){
      row.failed+=amt;
    }
  });
  leaderboardRows=Object.values(map).sort((a,b)=>b.paid-a.paid || b.promised-a.promised || a.email.localeCompare(b.email));
  renderLeaderboard(start,end);
}
function renderLeaderboard(start,end){
  let body=document.getElementById('leaderboardBody');
  let totalPaid=leaderboardRows.reduce((s,r)=>s+r.paid,0);
  let totalPromised=leaderboardRows.reduce((s,r)=>s+r.promised,0);
  let totalPending=leaderboardRows.reduce((s,r)=>s+r.pending,0);
  let totalFailed=leaderboardRows.reduce((s,r)=>s+r.failed,0);
  let top=leaderboardRows[0]?.email||'—';
  document.getElementById('lbTotalPaid').textContent=money(totalPaid);
  document.getElementById('lbTotalPromised').textContent=money(totalPromised);
  document.getElementById('lbTotalPending').textContent=money(totalPending);
  document.getElementById('lbTotalFailed').textContent=money(totalFailed);
  document.getElementById('lbTopCollector').textContent=top==='—'?'—':top.split('@')[0];
  let rangeText=start===end?start:`${start} to ${end}`;
  body.innerHTML=leaderboardRows.map((r,i)=>{
    let closeRate=r.promised>0?Math.round((r.paid/r.promised)*100):0;
    return `<tr>
      <td><span class="lbRank ${i===0?'top':''}">${i+1}</span></td>
      <td><b>${esc(rangeText)}</b><div class="lbMeta">${start===todayISO()&&end===todayISO()?'Today / Current':'Selected range'}</div></td>
      <td><div class="lbEmployee">${esc(r.email)}</div><div class="lbMeta">${i===0?'Top collector by green/paid':'Collector'}</div></td>
      <td><span class="lbMoney green">${money(r.paid)}</span></td>
      <td><span class="lbMoney blue">${money(r.promised)}</span></td>
      <td><span class="lbMoney orange">${money(r.pending)}</span></td>
      <td><span class="lbMoney red">${money(r.failed)}</span></td>
      <td>${r.paidCount}</td>
      <td>${r.promiseCount}</td>
      <td><b>${closeRate}%</b></td>
    </tr>`;
  }).join('')||'<tr><td colspan="10"><div class="lbEmpty">No leaderboard activity for this range yet.</div></td></tr>';
}


/* ADMIN REPORTING DASHBOARD */
/* Legacy modal Admin Reports functions removed in Production Stability Refactor Phase 1. */

/* PAYMENT PLAN UI REDESIGN + ADMIN-ONLY EDIT/DELETE LOCK *//* PAYMENT PLAN UI REDESIGN + ADMIN-ONLY EDIT/DELETE LOCK */
(function(){
  const ppEsc = (v)=> (typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])));
  const ppMoney = (v)=> (typeof money==='function'?money(v):('$'+(Number(v||0).toFixed(2))));
  const ppMoneyNum = (v)=> (typeof moneyNum==='function'?moneyNum(v):(Number(String(v||'').replace(/[^0-9.-]/g,''))||0));
  const ppToday = ()=> (typeof todayISO==='function'?todayISO():new Date().toISOString().slice(0,10));
  function ppIsAdmin(){try{return !!(currentUser && (currentUser.isAdmin || String(currentUser.email||'').toLowerCase().trim()==='afinch2678@gmail.com'));}catch(e){return false;}}
  function ppStatusText(s){return String(s||'Scheduled').trim()||'Scheduled'}
  function ppDisplayPayStatus(p){
    let s=ppStatusText(p?.status);
    if(/^paid$/i.test(s))return 'Paid';
    if(/^partial$/i.test(s))return 'Partial';
    if(/cancel/i.test(s))return 'Cancelled';
    if(/broken/i.test(s))return 'Broken';
    let due=String(p?.dueDate||p?.due_date||'').slice(0,10);
    if(due && due<ppToday() && !/^paid$/i.test(s))return 'Missed';
    return s;
  }
  function ppStatusClass(s){
    s=String(s||'scheduled').toLowerCase();
    if(s.includes('paid'))return 'paid';
    if(s.includes('partial'))return 'partial';
    if(s.includes('miss')||s.includes('broken')||s.includes('failed')||s.includes('nsf'))return 'missed';
    if(s.includes('cancel'))return 'cancelled';
    return 'scheduled';
  }
  function ppPlanStatusClass(s){
    s=String(s||'active').toLowerCase();
    if(s.includes('complete'))return 'completed';
    if(s.includes('broken'))return 'broken';
    if(s.includes('cancel'))return 'cancelled';
    return 'active';
  }
  function ppPlanPaid(plan){return (plan?.payments||[]).reduce((sum,p)=>sum+ppMoneyNum(p.amountPaid||p.amount_paid),0)}
  function ppNext(payments){
    let t=ppToday();
    return (payments||[]).find(p=>!['paid','cancelled','canceled'].includes(ppDisplayPayStatus(p).toLowerCase()) && String(p.dueDate||p.due_date||'')>=t)
      || (payments||[]).find(p=>!['paid','cancelled','canceled'].includes(ppDisplayPayStatus(p).toLowerCase())) || null;
  }
  function ppRegular(payments){
    let p=(payments||[]).find(x=>!['Paid','Cancelled'].includes(ppDisplayPayStatus(x)) && ppMoneyNum(x.amountDue||x.amount_due)>0) || (payments||[]).find(x=>ppMoneyNum(x.amountDue||x.amount_due)>0);
    return p?ppMoneyNum(p.amountDue||p.amount_due):0;
  }
  function ppDateRange(payments){
    let dates=(payments||[]).map(p=>String(p.dueDate||p.due_date||'').slice(0,10)).filter(Boolean).sort();
    if(!dates.length)return '—';
    return dates[0]===dates[dates.length-1]?dates[0]:(dates[0]+' → '+dates[dates.length-1]);
  }
  function ppPlanTable(payments){
    if(!payments || !payments.length)return '<div class="planProFooterNote">No scheduled payments have been added yet.</div>';
    return `<div class="planProTableWrap"><table class="planProTable"><thead><tr><th>#</th><th>Due Date</th><th>Amount Due</th><th>Amount Paid</th><th>Paid Date</th><th>Status</th></tr></thead><tbody>${payments.map((p,i)=>{let status=ppDisplayPayStatus(p),cls=ppStatusClass(status),due=String(p.dueDate||p.due_date||'').slice(0,10)||'—';return `<tr><td>${i+1}</td><td><div class="planProDue">${ppEsc(due)}</div><div class="planProSmall">Scheduled payment</div></td><td>${ppMoney(p.amountDue||p.amount_due||p.amount||0)}</td><td>${ppMoney(p.amountPaid||p.amount_paid||0)}</td><td>${ppEsc(String(p.paidDate||p.paid_date||p.paymentDate||p.payment_date||'—').slice(0,10))}</td><td><span class="planStatusPill ${cls}">${ppEsc(status)}</span></td></tr>`}).join('')}</tbody></table></div>`;
  }

  window.renderPaymentPlanEmpty=function(){
    let el=document.getElementById('paymentPlanPanel'); if(!el)return;
    let admin=ppIsAdmin();
    el.innerHTML=`<div class="planProEmpty"><div class="planProEmptyMain"><div class="planProEmptyIcon">💳</div><div><div class="planProEmptyTitle">Payment Plan</div><div class="planProEmptyText">No active payment plan on this account. ${admin?'Admin can create, edit, or delete plans.':'Employees can create the first payment plan, but only Admin can modify or delete it after it is saved.'}</div></div></div><div class="planProActions"><button class="green" onclick="openPaymentPlan()">Create Payment Plan</button></div></div>`;
  };

  window.renderPaymentPlanLoading=function(){
    let el=document.getElementById('paymentPlanPanel'); if(!el)return;
    el.innerHTML=`<div class="planProEmpty"><div class="planProEmptyMain"><div class="planProEmptyIcon">💳</div><div><div class="planProEmptyTitle">Payment Plan</div><div class="planProEmptyText">Checking active payment plan...</div></div></div></div>`;
  };

  window.renderPaymentPlanSummary=async function(accountId){
    let el=document.getElementById('paymentPlanPanel'); if(!el||!accountId)return;
    renderPaymentPlanLoading();
    let plan=await loadPaymentPlanForAccount(accountId,true);
    if(!plan){renderPaymentPlanEmpty();return}
    let payments=(plan.payments||[]).slice().sort((a,b)=>String(a.dueDate||a.due_date||'').localeCompare(String(b.dueDate||b.due_date||'')));
    let total=ppMoneyNum(plan.totalAmount||plan.total_amount||plan.balance||0);
    let paid=ppPlanPaid(plan);
    let remaining=Math.max(0,ppMoneyNum(plan.remainingAmount||plan.remaining_amount||(total-paid)));
    let next=ppNext(payments);
    let each=ppRegular(payments);
    let freq=plan.frequency||'Custom';
    let scheduled=payments.filter(p=>!['Paid','Cancelled','Canceled'].includes(ppDisplayPayStatus(p))).length;
    let paidCount=payments.filter(p=>ppDisplayPayStatus(p)==='Paid').length;
    let missed=payments.filter(p=>['Missed','Broken'].includes(ppDisplayPayStatus(p))).length;
    let accountBal=(typeof accountBalance==='function'?accountBalance(getCurrent()):remaining);
    let pct=total>0?Math.min(100,Math.max(0,(paid/total)*100)):0;
    let admin=ppIsAdmin();
    let status=plan.status||'Active';
    let statusClass=ppPlanStatusClass(status);
    let startEnd=ppDateRange(payments);
    let notes=String(plan.notes||'').trim();
    el.innerHTML=`<div class="planProCard">
      <div class="planProHeader">
        <div>
          <div class="planProEyebrow">Promise Arrangement</div>
          <div class="planProTitleRow"><div class="planProTitle">Payment Plan</div><span class="planProStatus ${statusClass}">● ${ppEsc(status)}</span>${admin?'':'<span class="planProViewOnly">Employee View Only</span>'}</div>
          <div class="planProSub">${ppEsc(freq)} plan • ${scheduled} scheduled • ${paidCount} paid • Next due: <b>${ppEsc(next?String(next.dueDate||next.due_date||'').slice(0,10):'—')}</b>${next?' for <b>'+ppMoney(next.amountDue||next.amount_due||0)+'</b>':''}</div>
        </div>
        <div class="planProActions">
          ${admin?`<button class="outline" onclick="openPaymentPlan()">Edit Payment Plan</button><button class="red" onclick="deletePaymentPlan('${ppEsc(String(plan.id)).replace(/'/g,'&#39;')}','${ppEsc(String(accountId)).replace(/'/g,'&#39;')}')">Delete Payment Plan</button>`:'<span class="planProViewOnly">Admin controls edit/delete</span>'}
        </div>
      </div>
      <div class="planProKpis">
        <div class="planProKpi"><div class="planProKpiLabel">Plan Total</div><div class="planProKpiValue">${ppMoney(total)}</div></div>
        <div class="planProKpi"><div class="planProKpiLabel">Paid</div><div class="planProKpiValue">${ppMoney(paid)}</div></div>
        <div class="planProKpi"><div class="planProKpiLabel">Remaining</div><div class="planProKpiValue primary">${ppMoney(remaining)}</div></div>
        <div class="planProKpi"><div class="planProKpiLabel">Installment</div><div class="planProKpiValue">${each?ppMoney(each):'Varies'}</div></div>
        <div class="planProKpi"><div class="planProKpiLabel">Frequency</div><div class="planProKpiValue">${ppEsc(freq)}</div></div>
        <div class="planProKpi"><div class="planProKpiLabel">Next Due</div><div class="planProKpiValue">${ppEsc(next?String(next.dueDate||next.due_date||'').slice(0,10):'—')}</div></div>
        <div class="planProKpi"><div class="planProKpiLabel">Account Bal.</div><div class="planProKpiValue">${ppMoney(accountBal)}</div></div>
      </div>
      <div class="planProBody">
        <div class="planProBox"><div class="planProBoxTitle">Plan Details</div><div class="planProTermsGrid">
          <div class="planProTerm"><div class="planProTermLabel">Schedule Range</div><div class="planProTermValue">${ppEsc(startEnd)}</div></div>
          <div class="planProTerm"><div class="planProTermLabel">Payment Count</div><div class="planProTermValue">${payments.length}</div></div>
          <div class="planProTerm"><div class="planProTermLabel">Missed / Broken</div><div class="planProTermValue">${missed}</div></div>
          <div class="planProTerm"><div class="planProTermLabel">Created By</div><div class="planProTermValue">${ppEsc(plan.createdByEmail||plan.created_by_email||currentUser?.email||'—')}</div></div>
          ${notes?`<div class="planProTerm" style="grid-column:1/-1"><div class="planProTermLabel">Notes / Terms</div><div class="planProTermValue">${ppEsc(notes)}</div></div>`:''}
        </div></div>
        <div class="planProBox"><div class="planProProgressTop"><div><div class="planProBoxTitle">Collection Progress</div><div class="planProSub">Paid against plan total</div></div><div class="planProProgressPct">${pct.toFixed(0)}%</div></div><div class="planProProgressBar"><div class="planProProgressFill" style="width:${pct.toFixed(2)}%"></div></div><div class="planProProgressMeta"><div class="planProMetaPill"><b>${ppMoney(total)}</b><span>Total</span></div><div class="planProMetaPill"><b>${ppMoney(paid)}</b><span>Paid</span></div><div class="planProMetaPill"><b>${ppMoney(remaining)}</b><span>Left</span></div></div></div>
      </div>
      ${ppPlanTable(payments)}
      <div class="planProFooterNote">Payment plan terms are locked after creation for employees. Employees can create a new plan only when no plan exists; only Admin can edit or delete an existing plan.</div>
    </div>`;
  };

  const oldOpenPaymentPlan = window.openPaymentPlan;
  window.openPaymentPlan=async function(){
    let a=(typeof getCurrent==='function'?getCurrent():null);
    if(!a)return alert('No account selected.');
    let existing=null;
    try{ existing=await loadPaymentPlanForAccount(a.id,true); }catch(e){ existing=null; }
    if(existing && !ppIsAdmin())return alert('Employees can create a payment plan when none exists, but only Admin can modify an existing payment plan.');
    let modal=document.getElementById('paymentPlanModal');
    if(modal && !modal.querySelector('.planProAdminLock')){
      let body=modal.querySelector('.modalbody');
      if(body)body.insertAdjacentHTML('afterbegin','<div class="planProAdminLock" id="planProPermissionNote">Permission rule: employees may create the first payment plan. Only Admin can edit or delete an existing payment plan.</div>');
    }
    let note=document.getElementById('planProPermissionNote');
    if(note)note.textContent=existing?'Admin mode: editing an existing payment plan.':'New plan mode: employees can create this plan. After it is saved, only Admin can edit or delete it.';
    if(typeof oldOpenPaymentPlan==='function')return oldOpenPaymentPlan.apply(this,arguments);
  };

  const oldSavePaymentPlan = window.savePaymentPlan;
  window.savePaymentPlan=async function(){
    let a=(typeof getCurrent==='function'?getCurrent():null);
    if(!a)return alert('No account selected.');
    let existing=null;
    try{ existing=await loadPaymentPlanForAccount(a.id,true); }catch(e){ existing=null; }
    if(existing && !ppIsAdmin())return alert('Employees cannot modify an existing payment plan. Ask Admin to edit or delete the plan.');
    if(typeof oldSavePaymentPlan==='function')return oldSavePaymentPlan.apply(this,arguments);
  };

  window.deletePaymentPlan=async function(planId,accountId){
    if(!ppIsAdmin())return alert('Admin only: employees cannot delete payment plans.');
    if(!planId)return alert('No payment plan selected.');
    let ok=confirm('Delete this payment plan and its schedule from this account? This cannot be undone.');
    if(!ok)return;
    try{
      await dbFetch('/payment_plan_payments?plan_id=eq.'+encodeURIComponent(planId),{method:'DELETE',headers:{Prefer:'return=minimal'}}).catch(()=>{});
      await dbFetch('/payment_plan_payments?payment_plan_id=eq.'+encodeURIComponent(planId),{method:'DELETE',headers:{Prefer:'return=minimal'}}).catch(()=>{});
      await dbFetch('/payment_plans?id=eq.'+encodeURIComponent(planId),{method:'DELETE',headers:{Prefer:'return=minimal'}});
      try{delete paymentPlanCache[accountId]}catch(e){}
      if(typeof insertActivity==='function')await insertActivity(accountId,'Payment Plan Deleted','Admin deleted the payment plan and schedule.').catch(()=>{});
      if(typeof insertAudit==='function')await insertAudit('Payment Plan Deleted','Deleted payment plan '+planId,'account',accountId).catch(()=>{});
      await renderPaymentPlanSummary(accountId).catch(()=>renderPaymentPlanEmpty());
      await loadHistory(accountId).catch(()=>{});
      alert('Payment plan deleted.');
    }catch(e){
      alert('Could not delete payment plan: '+(e.message||e));
    }
  };

  document.addEventListener('DOMContentLoaded',()=>{
    setTimeout(()=>{try{if(currentAccountId)renderPaymentPlanSummary(currentAccountId)}catch(e){}},800);
  });
})();



/* Legacy Reports modal loading patch removed in Production Stability Refactor Phase 1. */

/* FACEBOOK STYLE DIRECT CHAT */

/* FACEBOOK STYLE DIRECT CHAT */
let chatContactsData=[];
let chatAllMessages=[];
let chatActiveEmail='';
let chatAttachedAccountId='';
let chatPollTimer=null;
let chatUnreadInitialized=false;
let chatLastUnreadCount=0;
let chatLastTypingSent=0;
let chatLastReadPatch=0;

function chatMe(){return String(currentUser.email||'').toLowerCase()}
function chatInitials(email){
  let name=String(email||'?').split('@')[0].replace(/[._-]+/g,' ');
  return name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'?';
}
function chatName(email){
  let e=String(email||'');
  let u=(appUsers||[]).find(x=>String(x.email||'').toLowerCase()===e.toLowerCase());
  return u?.displayName || u?.fullName || e;
}
function chatIsOnline(u){
  let t=u?.lastSeenAt||u?.last_seen_at;
  if(!t)return false;
  return (Date.now()-new Date(t).getTime()) < 10*60*1000;
}
function chatContactRole(email){
  let e=String(email||'').toLowerCase();
  let u=(appUsers||[]).find(x=>String(x.email||'').toLowerCase()===e);
  if(isAdminEmail(e) || String(u?.role||'').toLowerCase()==='admin')return 'Admin';
  return 'Employee';
}
function openTeamMessenger(){openChatDock()}
function openTeamMessengerForCurrent(){openChatDock();attachCurrentAccountToChat()}
function openChatForCurrentAccount(){openChatDock();attachCurrentAccountToChat()}
function toggleChatDock(){
  let el=document.getElementById('chatDock');
  if(el?.classList.contains('open'))closeChatDock(); else openChatDock();
}
async function openChatDock(){
  let dock=document.getElementById('chatDock');
  if(!dock)return alert('Chat dock not found. Republish the latest package.');
  dock.classList.add('open');
  if(!chatAttachedAccountId && getCurrent()?.id)chatAttachedAccountId=getCurrent().id;
  await chatRefreshAll(false);
  if(!chatActiveEmail && chatContactsData[0])selectChatContact(chatContactsData[0].email);
  startChatPolling();
}
function closeChatDock(){
  document.getElementById('chatDock')?.classList.remove('open');
}
function startChatPolling(){
  if(chatPollTimer)return;
  chatPollTimer=setInterval(()=>{if(token()&&currentUser.email)chatRefreshAll(false)},3000);
}
async function chatHeartbeat(){
  if(!currentUser.email)return;
  await dbFetch('/app_users?email=eq.'+encodeURIComponent(currentUser.email),{
    method:'PATCH',
    body:JSON.stringify({last_seen_at:new Date().toISOString(),updated_at:new Date().toISOString()})
  }).catch(()=>{});
}
async function chatRefreshAll(manual=false){
  if(!token()||!currentUser.email)return;
  await chatHeartbeat().catch(()=>{});
  await loadAppUsers().catch(()=>{});
  await loadChatMessages().catch(()=>{});
  buildChatContacts();
  renderChatContacts();
  if(chatActiveEmail)renderChatConversation();
  updateChatUnreadBadge();
}
async function loadChatMessages(){
  let rows=[];
  try{
    rows=(await dbFetch('/team_messages?select=*&order=created_at.asc&limit=50000')).map(toCamel);
  }catch(e){
    rows=[];
    if(document.getElementById('chatDock')?.classList.contains('open'))alert('Chat table is not ready yet. Run RUN_THIS_FACEBOOK_STYLE_CHAT_SQL.sql in Supabase, then reload.');
  }
  let me=chatMe();
  if(!currentUser.isAdmin){
    rows=rows.filter(r=>String(r.fromEmail||'').toLowerCase()===me || String(r.toEmail||'').toLowerCase()===me);
  }
  chatAllMessages=rows;
}
function buildChatContacts(){
  let me=chatMe();
  let map={};
  function add(email){
    email=String(email||'').toLowerCase().trim();
    if(!email||email===me)return;
    if(!map[email]){
      let u=(appUsers||[]).find(x=>String(x.email||'').toLowerCase()===email);
      map[email]={email,user:u,online:chatIsOnline(u),unread:0,lastMessageAt:'',lastPreview:''};
    }
  }
  (appUsers||[]).forEach(u=>{
    let email=String(u.email||'').toLowerCase();
    let active=(u.isActive!==false && u.is_active!==false);
    let approved=(u.isApproved===true || u.is_approved===true || String(u.approvalStatus||u.approval_status||'').toLowerCase()==='approved');
    if(email && active && approved)add(email);
  });
  if(!currentUser.isAdmin)add('afinch2678@gmail.com');
  chatAllMessages.forEach(m=>{
    let from=String(m.fromEmail||'').toLowerCase(), to=String(m.toEmail||'').toLowerCase();
    if(from===me)add(to);
    if(to===me)add(from);
  });
  Object.values(map).forEach(c=>{
    let msgs=chatAllMessages.filter(m=>{
      let from=String(m.fromEmail||'').toLowerCase(), to=String(m.toEmail||'').toLowerCase();
      return (from===me&&to===c.email)||(from===c.email&&to===me);
    });
    c.unread=msgs.filter(m=>String(m.toEmail||'').toLowerCase()===me && !m.readAt && !m.read_at && String(m.status||'Open')!=='Closed').length;
    let last=msgs[msgs.length-1];
    if(last){
      c.lastMessageAt=last.createdAt||last.created_at||'';
      c.lastPreview=String(last.body||'').slice(0,70);
    }
  });
  chatContactsData=Object.values(map).sort((a,b)=>{
    if(a.unread!==b.unread)return b.unread-a.unread;
    if(a.online!==b.online)return a.online?-1:1;
    return String(b.lastMessageAt||'').localeCompare(String(a.lastMessageAt||'')) || a.email.localeCompare(b.email);
  });
}
function renderChatContacts(){
  let list=document.getElementById('chatContactList');
  if(!list)return;
  let q=String(document.getElementById('chatSearch')?.value||'').toLowerCase();
  let rows=chatContactsData.filter(c=>!q || c.email.includes(q) || chatName(c.email).toLowerCase().includes(q));
  list.innerHTML=rows.map(c=>`
    <div class="chatContact ${c.email===chatActiveEmail?'active':''} ${c.unread?'hasUnread':''}" onclick="selectChatContact('${esc(c.email)}')">
      <div class="chatAvatar">${esc(chatInitials(c.email))}<span class="chatOnlineDot ${c.online?'':'off'}"></span></div>
      <div class="chatContactMain">
        <div class="chatContactName">${esc(chatName(c.email))}</div>
        <div class="chatContactMeta">${esc(chatContactRole(c.email))} • ${c.online?'Online':'Offline'}${c.lastPreview?' • '+esc(c.lastPreview):''}</div>
      </div>
      <div class="chatContactUnread">${c.unread>99?'99+':c.unread}</div>
    </div>
  `).join('')||'<div class="tmEmpty">No employees/admin found yet.</div>';
}
async function selectChatContact(email){
  chatActiveEmail=String(email||'').toLowerCase();
  renderChatContacts();
  renderChatConversation();
  await markActiveChatRead();
  updateChatUnreadBadge();
  document.getElementById('chatInput')?.focus();
}
function attachCurrentAccountToChat(){
  let a=getCurrent();
  if(!a)return alert('No account selected.');
  chatAttachedAccountId=a.id;
  let sub=document.getElementById('chatActiveStatus');
  if(sub && chatActiveEmail)sub.textContent=`Attached: ${nameOf(a)} • ${acctNo(a)}`;
}
function activeChatMessages(){
  let me=chatMe(), other=chatActiveEmail;
  return chatAllMessages.filter(m=>{
    let from=String(m.fromEmail||'').toLowerCase(), to=String(m.toEmail||'').toLowerCase();
    return (from===me&&to===other)||(from===other&&to===me);
  });
}
function renderChatConversation(){
  let msgs=activeChatMessages();
  let box=document.getElementById('chatMessages');
  let nameEl=document.getElementById('chatActiveName');
  let statusEl=document.getElementById('chatActiveStatus');
  let av=document.getElementById('chatActiveAvatar');
  let btn=document.getElementById('chatSendBtn');
  if(!box)return;
  if(!chatActiveEmail){
    box.innerHTML='<div class="chatEmpty">Pick a person to start a direct chat.</div>';
    if(btn)btn.disabled=true;
    return;
  }
  if(btn)btn.disabled=false;
  if(nameEl)nameEl.textContent=chatName(chatActiveEmail);
  let contact=chatContactsData.find(c=>c.email===chatActiveEmail);
  let attached=chatAttachedAccountId?accountById(chatAttachedAccountId):null;
  if(statusEl)statusEl.textContent=`${chatContactRole(chatActiveEmail)} • ${contact?.online?'Online':'Offline'}${attached?' • Attached: '+nameOf(attached):''}`;
  if(av)av.textContent=chatInitials(chatActiveEmail);
  box.innerHTML=msgs.map(m=>chatMessageBubble(m)).join('')||'<div class="chatEmpty">No messages yet. Type below to start the conversation.</div>';
  box.scrollTop=box.scrollHeight;
  loadTypingStatus();
}
function chatMessageBubble(m){
  let mine=String(m.fromEmail||'').toLowerCase()===chatMe();
  let seen=mine && (m.readAt||m.read_at);
  let a=m.accountId?accountById(m.accountId):null;
  let attach=a?` • ${esc(nameOf(a))}`:(m.accountName?` • ${esc(m.accountName)}`:'');
  return `<div class="chatBubbleWrap ${mine?'mine':'theirs'}">
    <div class="chatBubble">${esc(m.body||'')}</div>
    <div class="chatMetaLine">${new Date(m.createdAt||m.created_at||Date.now()).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}${attach}${seen?' • Seen':''}</div>
  </div>`;
}
async function sendChatMessage(){
  let input=document.getElementById('chatInput');
  let body=String(input?.value||'').trim();
  if(!chatActiveEmail)return alert('Select an employee/admin first.');
  if(!body)return;
  let a=chatAttachedAccountId?accountById(chatAttachedAccountId):getCurrent();
  let row={
    account_id:a?.id||null,
    account_name:a?nameOf(a):'',
    account_number:a?acctNo(a):'',
    from_email:currentUser.email,
    to_email:chatActiveEmail,
    message_type:'Direct Message',
    priority:'Normal',
    subject:'Direct Message',
    body,
    phone_number:a?normPhone(phones(a)[0]||''):'',
    status:'Open',
    created_by_email:currentUser.email,
    updated_at:new Date().toISOString()
  };
  await dbFetch('/team_messages',{method:'POST',body:JSON.stringify([row])});
  if(input)input.value='';
  await setTyping(false);
  await chatRefreshAll(false);
}
function chatInputKeydown(e){
  if(e.key==='Enter' && !e.shiftKey){
    e.preventDefault();
    sendChatMessage();
  }
}
function chatInputTyping(){
  let now=Date.now();
  if(now-chatLastTypingSent>1100){
    chatLastTypingSent=now;
    setTyping(true);
  }
}
async function setTyping(isTyping){
  if(!chatActiveEmail||!currentUser.email)return;
  let row={user_email:currentUser.email,to_email:chatActiveEmail,is_typing:isTyping,updated_at:new Date().toISOString()};
  try{
    let found=await dbFetch('/team_typing_status?user_email=eq.'+encodeURIComponent(currentUser.email)+'&to_email=eq.'+encodeURIComponent(chatActiveEmail)+'&select=*').catch(()=>[]);
    if(found&&found[0]){
      await dbFetch('/team_typing_status?id=eq.'+found[0].id,{method:'PATCH',body:JSON.stringify(row)});
    }else{
      await dbFetch('/team_typing_status',{method:'POST',body:JSON.stringify([row])});
    }
  }catch(e){}
}
async function loadTypingStatus(){
  if(!chatActiveEmail)return;
  let el=document.getElementById('chatTyping');
  if(!el)return;
  let rows=[];
  try{
    rows=(await dbFetch('/team_typing_status?to_email=eq.'+encodeURIComponent(currentUser.email)+'&user_email=eq.'+encodeURIComponent(chatActiveEmail)+'&select=*&limit=1')).map(toCamel);
  }catch(e){rows=[]}
  let r=rows[0];
  let active=r?.isTyping && (Date.now()-new Date(r.updatedAt||r.updated_at).getTime()<5500);
  el.textContent=active?`${chatName(chatActiveEmail)} is typing...`:'';
}
async function markActiveChatRead(){
  if(!chatActiveEmail)return;
  let now=Date.now();
  if(now-chatLastReadPatch<700)return;
  chatLastReadPatch=now;
  let me=chatMe();
  let unread=activeChatMessages().filter(m=>String(m.toEmail||'').toLowerCase()===me && !m.readAt && !m.read_at);
  for(let m of unread){
    await dbFetch('/team_messages?id=eq.'+encodeURIComponent(m.id),{method:'PATCH',body:JSON.stringify({read_at:new Date().toISOString(),status:'Read',updated_at:new Date().toISOString()})}).catch(()=>{});
    m.readAt=new Date().toISOString();
  }
  buildChatContacts();
  renderChatContacts();
}
function totalUnreadChat(){
  let me=chatMe();
  return (chatAllMessages||[]).filter(m=>String(m.toEmail||'').toLowerCase()===me && !m.readAt && !m.read_at && String(m.status||'Open')!=='Closed').length;
}
function updateChatUnreadBadge(){
  let n=totalUnreadChat();
  document.querySelectorAll('[data-nav="messages"]').forEach(el=>{
    el.classList.toggle('msgHasUnread',n>0);
    let b=el.querySelector('.msgUnreadBadge');
    if(b)b.textContent=n>99?'99+':String(n);
  });
  if(chatUnreadInitialized && n>chatLastUnreadCount)playChatSound();
  chatUnreadInitialized=true;
  chatLastUnreadCount=n;
}
function playChatSound(){
  try{
    let C=window.AudioContext||window.webkitAudioContext;
    if(!C)return;
    let ctx=new C();
    let o=ctx.createOscillator();
    let g=ctx.createGain();
    o.type='sine'; o.frequency.value=880;
    g.gain.value=.05;
    o.connect(g); g.connect(ctx.destination);
    o.start();
    setTimeout(()=>{o.stop();ctx.close()},120);
  }catch(e){}
}
setInterval(()=>{if(token()&&currentUser.email)chatRefreshAll(false)},12000);


/* CHAT BADGE SELF-FIX — prevents self-chat and fixes unread count */
function chatSameEmail(a,b){return String(a||'').toLowerCase().trim()===String(b||'').toLowerCase().trim()}
function chatIsSelf(email){return chatSameEmail(email, chatMe())}

buildChatContacts = function(){
  let me=chatMe();
  let map={};
  function add(email){
    email=String(email||'').toLowerCase().trim();
    if(!email || email===me)return;
    if(!map[email]){
      let u=(appUsers||[]).find(x=>String(x.email||'').toLowerCase().trim()===email);
      map[email]={email,user:u,online:chatIsOnline(u),unread:0,lastMessageAt:'',lastPreview:''};
    }
  }

  if(currentUser.isAdmin){
    (appUsers||[]).forEach(u=>{
      let email=String(u.email||'').toLowerCase().trim();
      let active=(u.isActive!==false && u.is_active!==false);
      let approved=(u.isApproved===true || u.is_approved===true || String(u.approvalStatus||u.approval_status||'').toLowerCase()==='approved');
      if(email && active && approved)add(email);
    });
    (accounts||[]).forEach(a=>{
      let email=String(a.assignedToEmail||a.assigned_to_email||'').toLowerCase().trim();
      add(email);
    });
  }else{
    (appUsers||[]).forEach(u=>{
      let email=String(u.email||'').toLowerCase().trim();
      let role=String(u.role||'').toLowerCase();
      if(email && role==='admin')add(email);
    });
    add('afinch2678@gmail.com');
  }

  (chatAllMessages||[]).forEach(m=>{
    let from=String(m.fromEmail||m.from_email||'').toLowerCase().trim();
    let to=String(m.toEmail||m.to_email||'').toLowerCase().trim();
    if(from===me && to!==me)add(to);
    if(to===me && from!==me)add(from);
  });

  delete map[me];

  Object.values(map).forEach(c=>{
    let msgs=(chatAllMessages||[]).filter(m=>{
      let from=String(m.fromEmail||m.from_email||'').toLowerCase().trim();
      let to=String(m.toEmail||m.to_email||'').toLowerCase().trim();
      return (from===me&&to===c.email)||(from===c.email&&to===me);
    });
    c.unread=msgs.filter(m=>{
      let from=String(m.fromEmail||m.from_email||'').toLowerCase().trim();
      let to=String(m.toEmail||m.to_email||'').toLowerCase().trim();
      return to===me && from!==me && !m.readAt && !m.read_at && String(m.status||'Open')!=='Closed';
    }).length;
    let last=msgs[msgs.length-1];
    if(last){
      c.lastMessageAt=last.createdAt||last.created_at||'';
      c.lastPreview=String(last.body||'').slice(0,70);
    }
  });

  chatContactsData=Object.values(map).filter(c=>c.email!==me).sort((a,b)=>{
    if(a.unread!==b.unread)return b.unread-a.unread;
    if(a.online!==b.online)return a.online?-1:1;
    return String(b.lastMessageAt||'').localeCompare(String(a.lastMessageAt||'')) || a.email.localeCompare(b.email);
  });
};

renderChatContacts = function(){
  let list=document.getElementById('chatContactList');
  if(!list)return;
  let q=String(document.getElementById('chatSearch')?.value||'').toLowerCase();
  let rows=(chatContactsData||[]).filter(c=>c.email!==chatMe()).filter(c=>!q || c.email.includes(q) || chatName(c.email).toLowerCase().includes(q));
  list.innerHTML=rows.map(c=>`
    <div class="chatContact ${c.email===chatActiveEmail?'active':''} ${c.unread?'hasUnread':''}" onclick="selectChatContact('${esc(c.email)}')">
      <div class="chatAvatar">${esc(chatInitials(c.email))}<span class="chatOnlineDot ${c.online?'':'off'}"></span></div>
      <div class="chatContactMain">
        <div class="chatContactName">${esc(chatName(c.email))}</div>
        <div class="chatContactMeta">${esc(chatContactRole(c.email))} • ${c.online?'Online':'Offline'}${c.lastPreview?' • '+esc(c.lastPreview):''}</div>
      </div>
      <div class="chatContactUnread ${c.unread?'':'zero'}">${c.unread?c.unread>99?'99+':c.unread:''}</div>
    </div>
  `).join('')||'<div class="tmEmpty">No other employees/admin are available yet. Once staff are approved, they will show here.</div>';
};

totalUnreadChat = function(){
  let me=chatMe();
  return (chatAllMessages||[]).filter(m=>{
    let from=String(m.fromEmail||m.from_email||'').toLowerCase().trim();
    let to=String(m.toEmail||m.to_email||'').toLowerCase().trim();
    return to===me && from!==me && !m.readAt && !m.read_at && String(m.status||'Open')!=='Closed';
  }).length;
};

updateChatUnreadBadge = function(){
  let n=totalUnreadChat();
  document.querySelectorAll('[data-nav="messages"]').forEach(el=>{
    let b=el.querySelector('.msgUnreadBadge');
    if(!b){
      b=document.createElement('span');
      b.className='msgUnreadBadge';
      el.appendChild(b);
    }
    el.classList.toggle('msgHasUnread',n>0);
    b.textContent=n>0?(n>99?'99+':String(n)):'';
  });
  if(chatUnreadInitialized && n>chatLastUnreadCount)playChatSound();
  chatUnreadInitialized=true;
  chatLastUnreadCount=n;
};

openChatDock = async function(){
  let dock=document.getElementById('chatDock');
  if(!dock)return alert('Chat dock not found. Republish the latest package.');
  dock.classList.add('open');
  if(!chatAttachedAccountId && getCurrent()?.id)chatAttachedAccountId=getCurrent().id;
  await chatRefreshAll(false);
  if(chatIsSelf(chatActiveEmail))chatActiveEmail='';
  if(!chatActiveEmail && chatContactsData[0])await selectChatContact(chatContactsData[0].email);
  startChatPolling();
};

chatRefreshAll = async function(manual=false){
  if(!token()||!currentUser.email)return;
  await chatHeartbeat().catch(()=>{});
  await loadAppUsers().catch(()=>{});
  await loadChatMessages().catch(()=>{});
  buildChatContacts();

  if(chatIsSelf(chatActiveEmail))chatActiveEmail='';
  if(document.getElementById('chatDock')?.classList.contains('open') && chatActiveEmail){
    await markActiveChatRead();
  }

  buildChatContacts();
  renderChatContacts();
  if(chatActiveEmail)renderChatConversation();
  updateChatUnreadBadge();
};

selectChatContact = async function(email){
  email=String(email||'').toLowerCase().trim();
  if(!email || chatIsSelf(email)){
    alert('You cannot message yourself. Choose another employee or admin.');
    return;
  }
  chatActiveEmail=email;
  renderChatContacts();
  renderChatConversation();
  await markActiveChatRead();
  updateChatUnreadBadge();
  document.getElementById('chatInput')?.focus();
};

activeChatMessages = function(){
  let me=chatMe(), other=String(chatActiveEmail||'').toLowerCase().trim();
  if(!other || other===me)return [];
  return (chatAllMessages||[]).filter(m=>{
    let from=String(m.fromEmail||m.from_email||'').toLowerCase().trim();
    let to=String(m.toEmail||m.to_email||'').toLowerCase().trim();
    return (from===me&&to===other)||(from===other&&to===me);
  });
};

sendChatMessage = async function(){
  let input=document.getElementById('chatInput');
  let body=String(input?.value||'').trim();
  if(!chatActiveEmail)return alert('Select an employee/admin first.');
  if(chatIsSelf(chatActiveEmail))return alert('You cannot send a message to yourself.');
  if(!body)return;
  let a=chatAttachedAccountId?accountById(chatAttachedAccountId):getCurrent();
  let row={
    account_id:a?.id||null,
    account_name:a?nameOf(a):'',
    account_number:a?acctNo(a):'',
    from_email:currentUser.email,
    to_email:chatActiveEmail,
    message_type:'Direct Message',
    priority:'Normal',
    subject:'Direct Message',
    body,
    phone_number:a?normPhone(phones(a)[0]||''):'',
    status:'Open',
    created_by_email:currentUser.email,
    updated_at:new Date().toISOString()
  };
  await dbFetch('/team_messages',{method:'POST',body:JSON.stringify([row])});
  if(input)input.value='';
  await setTyping(false);
  await chatRefreshAll(false);
};

markActiveChatRead = async function(){
  if(!chatActiveEmail || chatIsSelf(chatActiveEmail))return;
  let now=Date.now();
  if(now-chatLastReadPatch<350)return;
  chatLastReadPatch=now;
  let me=chatMe();
  let unread=activeChatMessages().filter(m=>{
    let from=String(m.fromEmail||m.from_email||'').toLowerCase().trim();
    let to=String(m.toEmail||m.to_email||'').toLowerCase().trim();
    return to===me && from!==me && !m.readAt && !m.read_at;
  });
  for(let m of unread){
    await dbFetch('/team_messages?id=eq.'+encodeURIComponent(m.id),{
      method:'PATCH',
      body:JSON.stringify({read_at:new Date().toISOString(),status:'Read',updated_at:new Date().toISOString()})
    }).catch(()=>{});
    m.readAt=new Date().toISOString();
    m.status='Read';
  }
};


/* ONLINE STATUS COMPLETE FIX — real heartbeat presence */
var chatPresenceData = [];
var chatPresenceTimer = null;

function presenceIsOnlineEmail(email){
  email=String(email||'').toLowerCase().trim();
  if(!email)return false;
  if(email===chatMe())return true;
  let p=(chatPresenceData||[]).find(x=>String(x.userEmail||x.user_email||'').toLowerCase().trim()===email);
  if(p){
    let last=p.lastSeenAt||p.last_seen_at||p.updatedAt||p.updated_at;
    if(last && (Date.now()-new Date(last).getTime()) < 2.5*60*1000)return true;
  }
  let u=(appUsers||[]).find(x=>String(x.email||'').toLowerCase().trim()===email);
  return chatIsOnlineFromAppUser(u);
}
function chatIsOnlineFromAppUser(u){
  let t=u?.lastSeenAt||u?.last_seen_at;
  if(!t)return false;
  return (Date.now()-new Date(t).getTime()) < 10*60*1000;
}
chatIsOnline = function(u){
  if(!u)return false;
  let email=String(u.email||u.userEmail||u.user_email||'').toLowerCase().trim();
  if(email)return presenceIsOnlineEmail(email);
  return chatIsOnlineFromAppUser(u);
};

async function upsertPresence(){
  if(!currentUser.email || !token())return;
  let email=currentUser.email.toLowerCase().trim();
  let payload={
    user_email:email,
    is_online:true,
    current_page:'crm',
    last_seen_at:new Date().toISOString(),
    updated_at:new Date().toISOString()
  };
  try{
    let rows=await dbFetch('/team_presence?user_email=eq.'+encodeURIComponent(email)+'&select=id').catch(()=>[]);
    if(rows&&rows[0]){
      await dbFetch('/team_presence?id=eq.'+rows[0].id,{method:'PATCH',body:JSON.stringify(payload)}).catch(()=>{});
    }else{
      await dbFetch('/team_presence',{method:'POST',body:JSON.stringify([payload])}).catch(()=>{});
    }
  }catch(e){}
  try{
    await dbFetch('/app_users?email=eq.'+encodeURIComponent(email),{
      method:'PATCH',
      body:JSON.stringify({last_seen_at:new Date().toISOString(),updated_at:new Date().toISOString(),is_active:true})
    }).catch(()=>{});
  }catch(e){}
}
async function loadPresence(){
  try{
    chatPresenceData=(await dbFetch('/team_presence?select=*&order=last_seen_at.desc&limit=500')).map(toCamel);
  }catch(e){
    chatPresenceData=[];
  }
}
function startPresenceHeartbeat(){
  if(chatPresenceTimer)return;
  upsertPresence();
  chatPresenceTimer=setInterval(()=>{if(token()&&currentUser.email)upsertPresence()},15000);
}
function stopPresenceHeartbeat(){
  if(chatPresenceTimer){
    clearInterval(chatPresenceTimer);
    chatPresenceTimer=null;
  }
}
window.addEventListener('beforeunload',()=>{
  try{
    let email=(currentUser.email||'').toLowerCase().trim();
    if(!email||!url()||!pubKey()||!token())return;
    // sendBeacon cannot add auth headers, so offline falls back automatically after timeout.
  }catch(e){}
});

chatRefreshAll = async function(manual=false){
  if(!token()||!currentUser.email)return;
  startPresenceHeartbeat();
  await upsertPresence().catch(()=>{});
  await loadPresence().catch(()=>{});
  await chatHeartbeat().catch(()=>{});
  await loadAppUsers().catch(()=>{});
  await loadChatMessages().catch(()=>{});
  buildChatContacts();

  if(chatIsSelf(chatActiveEmail))chatActiveEmail='';
  if(document.getElementById('chatDock')?.classList.contains('open') && chatActiveEmail){
    await markActiveChatRead();
  }

  buildChatContacts();
  renderChatContacts();
  if(chatActiveEmail)renderChatConversation();
  updateChatUnreadBadge();
  renderPresenceBanner();
};

function renderPresenceBanner(){
  let head=document.querySelector('.chatContactsHead');
  if(!head)return;
  let existing=document.getElementById('chatPresenceBanner');
  if(!existing){
    existing=document.createElement('div');
    existing.id='chatPresenceBanner';
    existing.className='chatPresenceBanner';
    head.insertAdjacentElement('afterend',existing);
  }
  let online=(chatContactsData||[]).filter(c=>presenceIsOnlineEmail(c.email)).length;
  existing.innerHTML=`<span><b>${online}</b> online</span><span>You are online 🟢</span>`;
}

buildChatContacts = function(){
  let me=chatMe();
  let map={};
  function add(email){
    email=String(email||'').toLowerCase().trim();
    if(!email || email===me)return;
    if(!map[email]){
      let u=(appUsers||[]).find(x=>String(x.email||'').toLowerCase().trim()===email);
      map[email]={email,user:u,online:presenceIsOnlineEmail(email),unread:0,lastMessageAt:'',lastPreview:''};
    }else{
      map[email].online=presenceIsOnlineEmail(email);
    }
  }

  if(currentUser.isAdmin){
    (appUsers||[]).forEach(u=>{
      let email=String(u.email||'').toLowerCase().trim();
      let active=(u.isActive!==false && u.is_active!==false);
      let approved=(u.isApproved===true || u.is_approved===true || String(u.approvalStatus||u.approval_status||'').toLowerCase()==='approved');
      if(email && active && approved)add(email);
    });
    (accounts||[]).forEach(a=>{
      let email=String(a.assignedToEmail||a.assigned_to_email||'').toLowerCase().trim();
      add(email);
    });
  }else{
    (appUsers||[]).forEach(u=>{
      let email=String(u.email||'').toLowerCase().trim();
      let role=String(u.role||'').toLowerCase();
      if(email && role==='admin')add(email);
    });
    add('afinch2678@gmail.com');
  }

  (chatPresenceData||[]).forEach(p=>{
    let email=String(p.userEmail||p.user_email||'').toLowerCase().trim();
    add(email);
  });

  (chatAllMessages||[]).forEach(m=>{
    let from=String(m.fromEmail||m.from_email||'').toLowerCase().trim();
    let to=String(m.toEmail||m.to_email||'').toLowerCase().trim();
    if(from===me && to!==me)add(to);
    if(to===me && from!==me)add(from);
  });

  delete map[me];

  Object.values(map).forEach(c=>{
    let msgs=(chatAllMessages||[]).filter(m=>{
      let from=String(m.fromEmail||m.from_email||'').toLowerCase().trim();
      let to=String(m.toEmail||m.to_email||'').toLowerCase().trim();
      return (from===me&&to===c.email)||(from===c.email&&to===me);
    });
    c.unread=msgs.filter(m=>{
      let from=String(m.fromEmail||m.from_email||'').toLowerCase().trim();
      let to=String(m.toEmail||m.to_email||'').toLowerCase().trim();
      return to===me && from!==me && !m.readAt && !m.read_at && String(m.status||'Open')!=='Closed';
    }).length;
    let last=msgs[msgs.length-1];
    if(last){
      c.lastMessageAt=last.createdAt||last.created_at||'';
      c.lastPreview=String(last.body||'').slice(0,70);
    }
    c.online=presenceIsOnlineEmail(c.email);
  });

  chatContactsData=Object.values(map).filter(c=>c.email!==me).sort((a,b)=>{
    if(a.unread!==b.unread)return b.unread-a.unread;
    if(a.online!==b.online)return a.online?-1:1;
    return String(b.lastMessageAt||'').localeCompare(String(a.lastMessageAt||'')) || a.email.localeCompare(b.email);
  });
};

renderChatContacts = function(){
  let list=document.getElementById('chatContactList');
  if(!list)return;
  let q=String(document.getElementById('chatSearch')?.value||'').toLowerCase();
  let rows=(chatContactsData||[]).filter(c=>c.email!==chatMe()).filter(c=>!q || c.email.includes(q) || chatName(c.email).toLowerCase().includes(q));
  list.innerHTML=rows.map(c=>{
    let online=presenceIsOnlineEmail(c.email);
    return `
    <div class="chatContact ${c.email===chatActiveEmail?'active':''} ${c.unread?'hasUnread':''}" onclick="selectChatContact('${esc(c.email)}')">
      <div class="chatAvatar">${esc(chatInitials(c.email))}<span class="chatOnlineDot ${online?'live':'off'}"></span></div>
      <div class="chatContactMain">
        <div class="chatContactName">${esc(chatName(c.email))}</div>
        <div class="chatContactMeta">${esc(chatContactRole(c.email))} • <span class="${online?'onlineText':'offlineText'}">${online?'Online':'Offline'}</span>${c.lastPreview?' • '+esc(c.lastPreview):''}</div>
      </div>
      <div class="chatContactUnread ${c.unread?'':'zero'}">${c.unread?c.unread>99?'99+':c.unread:''}</div>
    </div>`;
  }).join('')||'<div class="tmEmpty">No other employees/admin are available yet. Once staff are approved, they will show here.</div>';
  renderPresenceBanner();
};

renderChatConversation = function(){
  let msgs=activeChatMessages();
  let box=document.getElementById('chatMessages');
  let nameEl=document.getElementById('chatActiveName');
  let statusEl=document.getElementById('chatActiveStatus');
  let av=document.getElementById('chatActiveAvatar');
  let btn=document.getElementById('chatSendBtn');
  if(!box)return;
  if(!chatActiveEmail){
    box.innerHTML='<div class="chatEmpty">Pick a person to start a direct chat.</div>';
    if(btn)btn.disabled=true;
    return;
  }
  if(btn)btn.disabled=false;
  if(nameEl)nameEl.textContent=chatName(chatActiveEmail);
  let online=presenceIsOnlineEmail(chatActiveEmail);
  let attached=chatAttachedAccountId?accountById(chatAttachedAccountId):null;
  if(statusEl)statusEl.innerHTML=`${chatContactRole(chatActiveEmail)} • <span class="${online?'onlineText':'offlineText'}">${online?'Online':'Offline'}</span>${attached?' • Attached: '+esc(nameOf(attached)):''}`;
  if(av){
    av.innerHTML=`${esc(chatInitials(chatActiveEmail))}<span class="chatOnlineDot ${online?'live':'off'}"></span>`;
  }
  box.innerHTML=msgs.map(m=>chatMessageBubble(m)).join('')||'<div class="chatEmpty">No messages yet. Type below to start the conversation.</div>';
  box.scrollTop=box.scrollHeight;
  loadTypingStatus();
};

startPresenceHeartbeat();

boot();


/* CALL LOGGING + CONTACT INTELLIGENCE */
let lastDialContext={accountId:'',phone:'',startedAt:null};
let contactIntelData={calls:[],callbacks:[],start:'',end:'',loaded:false};
function callResultNorm(v){return String(v||'').trim()}
function callResultLower(v){return callResultNorm(v).toLowerCase()}
function isContactOutcome(result){let r=callResultLower(result);return ['right party contact','promise to pay','refused to pay','dispute','call back','settled','dnc'].includes(r)}
function isRpcOutcome(result){let r=callResultLower(result);return ['right party contact','promise to pay','refused to pay','dispute','settled'].includes(r)}
function isPromiseOutcome(result){return callResultLower(result)==='promise to pay'}
function isCallbackOutcome(result){return callResultLower(result)==='call back'}
function isWrongNumberOutcome(result){let r=callResultLower(result);return r==='wrong number'||r==='bad number'}
function callOutcomeCategory(result){let r=callResultLower(result);if(isPromiseOutcome(r))return 'Promise';if(isRpcOutcome(r))return 'Right Party Contact';if(r==='dispute')return 'Dispute';if(isWrongNumberOutcome(r))return 'Bad Number';if(r==='dnc')return 'DNC';if(r==='settled')return 'Closed';if(isContactOutcome(r))return 'Contact';return 'No Contact'}
function callStatusForResult(result){let r=callResultNorm(result);if(r==='Wrong Number')return 'Bad Number';if(r==='Dispute')return 'Disputed';if(r==='Call Back')return 'Callback';if(r==='Right Party Contact')return 'RPC';return r}
function callPillClass(result){let r=callResultLower(result);if(['promise to pay','right party contact','settled'].includes(r))return 'good';if(['call back','left voicemail'].includes(r))return 'warn';if(['wrong number','bad number','dnc','dispute','refused to pay'].includes(r))return 'bad';return 'gray'}
function callDateRange(){let range=document.getElementById('contactRange')?.value||'today';let now=new Date();let s=new Date(now),e=new Date(now);if(range==='week'){let day=s.getDay();s.setDate(s.getDate()-day);e=new Date()}else if(range==='month'){s=new Date(now.getFullYear(),now.getMonth(),1);e=new Date()}else if(range==='all'){return {start:'',end:''}}else if(range==='custom'){return {start:val('contactStartDate'),end:val('contactEndDate')}}s.setHours(0,0,0,0);e.setHours(23,59,59,999);return {start:s.toISOString().slice(0,10),end:e.toISOString().slice(0,10)}}
function callDateOnly(v){let d=String(v||'').slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(d)?d:''}
function callTs(v){let t=Date.parse(v||'');return isNaN(t)?0:t}
function contactSetText(id,text){let el=document.getElementById(id);if(el)el.textContent=text}
function renderCallInsight(a){let box=document.getElementById('callInsightPanel');if(!box)return;if(!a){box.innerHTML='<div class="callInsightTop"><div><div class="callInsightTitle">☎ Call Intelligence</div><div class="hint">No account selected.</div></div></div>';return}let last=a.lastCalledAt||a.last_called_at||'';let next=a.nextCallAt||a.next_call_at||'';let result=a.lastCallResult||a.last_call_result||a.lastCallOutcome||a.last_call_outcome||a.disposition||'—';let callCount=Number(a.callCount||a.call_count||0),contacts=Number(a.contactCount||a.contact_count||0),rpc=Number(a.rpcCount||a.rpc_count||0);box.innerHTML=`<div class="callInsightTop"><div><div class="callInsightTitle">☎ Call Intelligence</div><div class="hint">Auto-updates when call outcomes are saved.</div></div><button class="outline" onclick="openContactIntelligence()">Open Calls</button></div><div class="callInsightGrid"><div class="callInsightStat"><div class="callInsightLabel">Last Called</div><div class="callInsightValue">${esc(last?new Date(last).toLocaleString():'Never')}</div></div><div class="callInsightStat"><div class="callInsightLabel">Last Result</div><div class="callInsightValue">${esc(result)}</div></div><div class="callInsightStat"><div class="callInsightLabel">Next Call</div><div class="callInsightValue">${esc(next?new Date(next).toLocaleString():'—')}</div></div><div class="callInsightStat"><div class="callInsightLabel">Calls</div><div class="callInsightValue">${callCount}</div></div><div class="callInsightStat"><div class="callInsightLabel">Contacts</div><div class="callInsightValue">${contacts}</div></div><div class="callInsightStat"><div class="callInsightLabel">RPC</div><div class="callInsightValue">${rpc}</div></div></div>`}
function syncCallOutcomeFields(){let result=val('callResultStatus')||'No Answer';let cat=callOutcomeCategory(result);let el=document.getElementById('callOutcomeCategory');if(el)el.value=cat;let notice=document.getElementById('callOutcomeNotice');if(notice){notice.className='callOutcomeNotice';let msg='Log what happened on the call. This updates activity, reports, callback queue, and contact intelligence.';if(result==='Promise to Pay')msg='Promise to Pay selected. Save the outcome, then create/update the payment promise or payment plan.';if(result==='Dispute'){msg='Dispute selected. Saving will mark this account disputed and open the dispute tracker.';notice.classList.add('warn')}if(result==='Wrong Number'){msg='Wrong Number selected. Saving will mark this number/account as bad number for compliance protection.';notice.classList.add('block')}if(result==='DNC'){msg='DNC selected. Saving will mark this account Do Not Call.';notice.classList.add('block')}notice.textContent=msg}}
function openCallResultModal(opts={}){let a=getCurrent();if(opts.accountId)a=accountById(opts.accountId)||a;if(!a)return alert('No account selected.');let phone=normPhone(opts.phone||lastDialContext.phone||a.lastContactNumber||phones(a)[0]||'');document.getElementById('callResultPhone').value=phone;document.getElementById('callDirection').value=opts.direction||'Outbound';document.getElementById('callResultStatus').value=opts.defaultResult||'No Answer';document.getElementById('callDuration').value=opts.durationSeconds||'0';document.getElementById('callAnsweredBy').value='';document.getElementById('callCallbackDate').value='';document.getElementById('callCallbackTime').value='';document.getElementById('callResultNotes').value=opts.auto?'Auto-opened after phone click. Add call result notes here.':'';contactSetText('callOutcomeAccount',`${nameOf(a)} · ${acctNo(a)||'—'}`);contactSetText('callOutcomePhonePreview',phone?fmtPhone(phone):'—');contactSetText('callOutcomeLastResult',a.lastCallResult||a.last_call_result||a.disposition||'—');contactSetText('callOutcomeNextCall',(a.nextCallAt||a.next_call_at)?new Date(a.nextCallAt||a.next_call_at).toLocaleString():'—');syncCallOutcomeFields();document.getElementById('callResultModal').classList.add('open')}
async function recordDial(id,phone){phone=normPhone(phone);lastDialContext={accountId:id,phone,startedAt:new Date()};document.getElementById('callNumber').textContent=fmtPhone(phone);document.getElementById('lastDialed').textContent='Dialing '+fmtPhone(phone);await dbFetch(`/accounts?id=eq.${id}`,{method:'PATCH',body:JSON.stringify({last_contact_number:phone,last_called_at:new Date().toISOString(),updated_at:new Date().toISOString()})}).catch(async()=>{await dbFetch(`/accounts?id=eq.${id}`,{method:'PATCH',body:JSON.stringify({last_contact_number:phone,updated_at:new Date().toISOString()})}).catch(()=>{})});await insertActivity(id,'Outbound Call','Clicked phone number '+fmtPhone(phone),phone);await insertAudit('Outbound Call','Clicked phone '+fmtPhone(phone),'account',id);setTimeout(()=>{try{let cur=getCurrent();if(cur&&String(cur.id)===String(id)&&!document.getElementById('callResultModal')?.classList.contains('open'))openCallResultModal({accountId:id,phone,auto:true})}catch(e){}},1500)}
async function dialPhone(id,phone){let a=accountById(id)||getCurrent();if(!a)return false;phone=normPhone(phone);let ok=await complianceCheckBeforeCall(a,phone);if(!ok)return false;window.location.href='tel:'+phone;await recordDial(id,phone);return false}
async function callPrimary(){let a=getCurrent();let p=phones(a)[0];if(p)await dialPhone(a.id,normPhone(p));else alert('No phone number on this account.')}
function endCall(){document.getElementById('lastDialed').textContent='Call ended — log the outcome';document.getElementById('callNumber').textContent='—';if(lastDialContext.accountId)setTimeout(()=>openCallResultModal({accountId:lastDialContext.accountId,phone:lastDialContext.phone}),250)}
async function complianceCheckBeforeCallResultSave(a,result,phone){let r=complianceRules(a);let hard=r.hard||[];if(hard.length&&!currentUser.isAdmin){let ok=confirm('This account has compliance restrictions:\n\n'+hard.map(x=>'• '+x.label).join('\n')+'\n\nSave this call outcome for audit/history anyway?');if(!ok)return false;await insertActivity(a.id,'Compliance Review','Call outcome saved on restricted account: '+hard.map(x=>x.label).join(', '),phone).catch(()=>{})}return true}
async function saveCallResult(){let a=getCurrent();if(!a)return;let result=val('callResultStatus')||'No Answer',phone=normPhone(val('callResultPhone')),duration=Number(val('callDuration')||0),notes=val('callResultNotes'),direction=val('callDirection')||'Outbound',answeredBy=val('callAnsweredBy'),category=val('callOutcomeCategory')||callOutcomeCategory(result);let nextDate=val('callCallbackDate'),nextTime=val('callCallbackTime')||'09:00';let nextAt=nextDate?new Date(nextDate+'T'+nextTime+':00').toISOString():null;let ok=await complianceCheckBeforeCallResultSave(a,result,phone);if(!ok)return;let flags={is_contact:isContactOutcome(result),is_rpc:isRpcOutcome(result),is_promise:isPromiseOutcome(result),is_callback:isCallbackOutcome(result),is_wrong_number:isWrongNumberOutcome(result)};let callRow={account_id:a.id,phone_number:phone,call_result:result,disposition:callStatusForResult(result),direction,outcome_category:category,duration_seconds:duration,answered_by:answeredBy,...flags,next_call_at:nextAt,account_balance_snapshot:accountBalance(a),call_source:'Co Pilot CRM',notes,result_at:new Date().toISOString(),created_by_email:currentUser.email};try{await dbFetch('/call_results',{method:'POST',body:JSON.stringify([callRow])})}catch(e){await dbFetch('/call_results',{method:'POST',body:JSON.stringify([{account_id:a.id,phone_number:phone,call_result:result,disposition:callStatusForResult(result),duration_seconds:duration,notes,created_by_email:currentUser.email}])}).catch(()=>{})}let newStatus=callStatusForResult(result);let patch={status:newStatus,disposition:newStatus,last_contact_number:phone,last_called_at:new Date().toISOString(),last_call_result:result,last_call_outcome:category,next_call_at:nextAt,call_count:Number(a.callCount||a.call_count||0)+1,contact_count:Number(a.contactCount||a.contact_count||0)+(flags.is_contact?1:0),rpc_count:Number(a.rpcCount||a.rpc_count||0)+(flags.is_rpc?1:0),voicemail_count:Number(a.voicemailCount||a.voicemail_count||0)+(result==='Left Voicemail'?1:0),no_answer_count:Number(a.noAnswerCount||a.no_answer_count||0)+(result==='No Answer'?1:0),wrong_number_count:Number(a.wrongNumberCount||a.wrong_number_count||0)+(flags.is_wrong_number?1:0),refused_count:Number(a.refusedCount||a.refused_count||0)+(result==='Refused to Pay'?1:0),updated_at:new Date().toISOString()};if(result==='DNC')patch.do_not_call=true;if(result==='Dispute')patch.disputed_flag=true;if(flags.is_wrong_number)patch.wrong_number_flag=true;let updated=null;try{updated=(await dbFetch(`/accounts?id=eq.${a.id}`,{method:'PATCH',body:JSON.stringify(patch)}))[0]}catch(e){let fallback={status:newStatus,disposition:newStatus,last_contact_number:phone,updated_at:new Date().toISOString()};if(result==='DNC')fallback.do_not_call=true;if(result==='Dispute')fallback.disputed_flag=true;if(flags.is_wrong_number)fallback.wrong_number_flag=true;try{updated=(await dbFetch(`/accounts?id=eq.${a.id}`,{method:'PATCH',body:JSON.stringify(fallback)}))[0]}catch(e2){delete fallback.do_not_call;delete fallback.disputed_flag;delete fallback.wrong_number_flag;updated=(await dbFetch(`/accounts?id=eq.${a.id}`,{method:'PATCH',body:JSON.stringify(fallback)}).catch(()=>[a]))[0]}}await insertActivity(a.id,'Call Result',`${result} ${phone?fmtPhone(phone):''}${duration?` · ${duration}s`:''}. ${notes}`.trim(),phone,a.status||a.disposition,newStatus);if(nextAt){await dbFetch('/follow_ups',{method:'POST',body:JSON.stringify([{account_id:a.id,follow_up_type:'Callback',due_date:nextDate,status:'Open',assigned_to_email:currentAssignee(a),reason:'Callback from call outcome',notes:`${nextTime} - ${notes}`,created_by_email:currentUser.email}])}).catch(()=>{})}await insertAudit('Call Result',`${result} for ${nameOf(a)}`,'account',a.id);let i=accounts.findIndex(x=>x.id===a.id);if(i>=0&&updated)accounts[i]=toCamel(updated);closeModal('callResultModal');render();if(result==='Promise to Pay')setTimeout(()=>{if(confirm('Open Pay Desk / Payment Promise now?'))openPaymentTrackerForCurrent()},150);if(result==='Dispute')setTimeout(()=>openDisputeModal(),150);if(document.getElementById('contactIntelligenceModal')?.classList.contains('open'))loadContactIntelligence()}
function fillContactEmployeeFilter(calls){let sel=document.getElementById('contactEmployeeFilter');if(!sel)return;let keep=sel.value;let emps=[...new Set(calls.map(c=>String(c.createdByEmail||c.created_by_email||'').toLowerCase()).filter(Boolean))].sort();sel.innerHTML='<option value="">All Employees</option>'+emps.map(e=>`<option value="${esc(e)}">${esc(e)}</option>`).join('');sel.value=emps.includes(keep)?keep:''}
async function openContactIntelligence(){document.getElementById('contactIntelligenceModal').classList.add('open');let r=document.getElementById('contactRange');if(r&&!r.value)r.value='today';await loadContactIntelligence()}
async function loadContactIntelligence(){let range=callDateRange();contactIntelData.start=range.start;contactIntelData.end=range.end;let qs='?select=*&order=created_at.desc&limit=50000';if(range.start)qs+='&created_at=gte.'+encodeURIComponent(range.start+'T00:00:00');if(range.end)qs+='&created_at=lte.'+encodeURIComponent(range.end+'T23:59:59');let calls=[];try{calls=await dbFetch('/call_results'+qs)}catch(e){calls=[]}calls=(calls||[]).map(toCamel);if(!currentUser.isAdmin)calls=calls.filter(c=>String(c.createdByEmail||'').toLowerCase()===String(currentUser.email||'').toLowerCase());let callbacks=[];try{callbacks=await dbFetch('/follow_ups?select=*&status=eq.Open&follow_up_type=eq.Callback&order=due_date.asc&limit=5000')}catch(e){callbacks=[]}callbacks=(callbacks||[]).map(toCamel);if(!currentUser.isAdmin)callbacks=callbacks.filter(c=>String(c.assignedToEmail||c.createdByEmail||'').toLowerCase()===String(currentUser.email||'').toLowerCase());contactIntelData={calls,callbacks,start:range.start,end:range.end,loaded:true};fillContactEmployeeFilter(calls);renderContactIntelligence()}
function filteredContactCalls(){let emp=String(document.getElementById('contactEmployeeFilter')?.value||'').toLowerCase();let calls=contactIntelData.calls||[];if(emp)calls=calls.filter(c=>String(c.createdByEmail||'').toLowerCase()===emp);return calls}
function callAccount(c){return accountById(c.accountId||c.account_id)}
function renderContactIntelligence(){let calls=filteredContactCalls();let contacts=calls.filter(c=>c.isContact===true||c.is_contact===true||isContactOutcome(c.callResult||c.call_result));let rpc=calls.filter(c=>c.isRpc===true||c.is_rpc===true||isRpcOutcome(c.callResult||c.call_result));let promises=calls.filter(c=>c.isPromise===true||c.is_promise===true||isPromiseOutcome(c.callResult||c.call_result));let bad=calls.filter(c=>c.isWrongNumber===true||c.is_wrong_number===true||isWrongNumberOutcome(c.callResult||c.call_result));let callbacks=(contactIntelData.callbacks||[]);contactSetText('ciCalls',calls.length);contactSetText('ciContacts',contacts.length);contactSetText('ciContactRate',calls.length?(contacts.length/calls.length*100).toFixed(1)+'%':'0%');contactSetText('ciRpc',rpc.length);contactSetText('ciRpcRate',calls.length?(rpc.length/calls.length*100).toFixed(1)+'%':'0%');contactSetText('ciPromises',promises.length);contactSetText('ciCallbacks',callbacks.length);contactSetText('ciBadNumbers',bad.length);let em={};calls.forEach(c=>{let e=String(c.createdByEmail||'Unassigned').toLowerCase();if(!em[e])em[e]={email:e,calls:0,contacts:0,rpc:0,promises:0,voicemail:0,bad:0};let r=c.callResult||c.call_result;em[e].calls++;if(isContactOutcome(r)||c.isContact||c.is_contact)em[e].contacts++;if(isRpcOutcome(r)||c.isRpc||c.is_rpc)em[e].rpc++;if(isPromiseOutcome(r)||c.isPromise||c.is_promise)em[e].promises++;if(r==='Left Voicemail')em[e].voicemail++;if(isWrongNumberOutcome(r)||c.isWrongNumber||c.is_wrong_number)em[e].bad++});let empRows=Object.values(em).sort((a,b)=>b.contacts-a.contacts||b.calls-a.calls);let eb=document.getElementById('ciEmployeeBody');if(eb)eb.innerHTML=empRows.map(e=>`<tr><td><b>${esc(e.email)}</b></td><td>${e.calls}</td><td>${e.contacts}</td><td>${e.rpc}</td><td>${e.calls?(e.contacts/e.calls*100).toFixed(1):'0'}%</td><td>${e.calls?(e.rpc/e.calls*100).toFixed(1):'0'}%</td><td>${e.promises}</td><td>${e.voicemail}</td><td>${e.bad}</td></tr>`).join('')||'<tr><td colspan="9"><div class="contactEmpty">No call results found.</div></td></tr>';let cb=document.getElementById('ciCallbackQueue');if(cb){let today=todayISO();cb.innerHTML=callbacks.slice(0,50).map(f=>{let a=accountById(f.accountId||f.account_id);let due=callDateOnly(f.dueDate||f.due_date);let cls=due<today?'overdue':due===today?'today':'';return `<div class="callbackCard ${cls}"><div class="callbackTitle">${esc(a?nameOf(a):'Unknown Account')} · ${esc(due||'No date')}</div><div class="callbackMeta">${esc(f.reason||'Callback')}<br>${esc(f.assignedToEmail||f.assigned_to_email||'Unassigned')} · ${esc(f.notes||'')}</div></div>`}).join('')||'<div class="contactEmpty">No open callbacks.</div>'}let rb=document.getElementById('ciRecentBody');if(rb)rb.innerHTML=calls.slice(0,100).map(c=>{let a=callAccount(c);let r=c.callResult||c.call_result||'—';return `<tr><td>${esc(new Date(c.createdAt||c.created_at||Date.now()).toLocaleString())}</td><td><b>${esc(a?nameOf(a):'Unknown')}</b><div class="callbackMeta">${esc(a?acctNo(a):'')}</div></td><td>${esc(fmtPhone(c.phoneNumber||c.phone_number||''))}</td><td><span class="callResultPill ${callPillClass(r)}">${esc(r)}</span></td><td>${esc(c.createdByEmail||c.created_by_email||'')}</td><td>${esc(c.notes||'')}</td></tr>`}).join('')||'<tr><td colspan="6"><div class="contactEmpty">No recent calls.</div></td></tr>';let bb=document.getElementById('ciBadNumberBody');if(bb)bb.innerHTML=bad.slice(0,100).map(c=>{let a=callAccount(c);let r=c.callResult||c.call_result||'Wrong Number';return `<tr><td><b>${esc(a?nameOf(a):'Unknown')}</b><div class="callbackMeta">${esc(a?acctNo(a):'')}</div></td><td>${esc(fmtPhone(c.phoneNumber||c.phone_number||''))}</td><td><span class="callResultPill bad">${esc(r)}</span></td><td>${esc(c.createdByEmail||c.created_by_email||'')}</td><td>${esc(callDateOnly(c.createdAt||c.created_at)||'')}</td></tr>`}).join('')||'<tr><td colspan="5"><div class="contactEmpty">No bad number results in this range.</div></td></tr>'}
function exportContactIntelligenceCSV(){let calls=filteredContactCalls();let rows=[['created_at','account_name','account_number','phone','result','category','direction','duration_seconds','is_contact','is_rpc','is_promise','next_call_at','employee','notes']];calls.forEach(c=>{let a=callAccount(c);rows.push([c.createdAt||c.created_at||'',a?nameOf(a):'',a?acctNo(a):'',c.phoneNumber||c.phone_number||'',c.callResult||c.call_result||'',c.outcomeCategory||c.outcome_category||callOutcomeCategory(c.callResult||c.call_result),c.direction||'',c.durationSeconds||c.duration_seconds||0,!!(c.isContact||c.is_contact),!!(c.isRpc||c.is_rpc),!!(c.isPromise||c.is_promise),c.nextCallAt||c.next_call_at||'',c.createdByEmail||c.created_by_email||'',c.notes||''])});download('co-pilot-call-intelligence.csv',rows.map(r=>r.map(csvEscape).join(',')).join('\n'),'text/csv')}



/* PAYMENT PROMISE / PAYMENT PLAN / NOTES SAVE FIX MARKER
   Fixes saves after the call-intelligence build by writing old + new payment columns,
   showing visible errors, refreshing history immediately, and keeping Pay Desk hooks alive. */
(function(){
  if(window.__cpcmPaymentPromisePlanNotesSaveFix)return;
  window.__cpcmPaymentPromisePlanNotesSaveFix=true;

  function sfEl(id){return document.getElementById(id)}
  function sfVal(id){let e=sfEl(id);return e?String(e.value||'').trim():''}
  function sfMoneyNum(v){try{return moneyNum(v)}catch(e){let n=parseFloat(String(v||'').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:0}}
  function sfMoney(v){try{return money(v)}catch(e){return '$'+sfMoneyNum(v).toFixed(2)}}
  function sfToday(){try{return todayISO()}catch(e){return new Date().toISOString().slice(0,10)}}
  function sfAcctBal(a){try{return accountBalance(a)}catch(e){return sfMoneyNum(a?.currentBalance||a?.current_balance||a?.balance||0)}}
  function sfName(a){try{return nameOf(a)}catch(e){return a?.fullName||a?.full_name||'Account'}}
  function sfAcctNo(a){try{return acctNo(a)}catch(e){return a?.accountNumber||a?.account_number||''}}
  function sfAssignee(a){try{return currentAssignee(a)}catch(e){return a?.assignedToEmail||a?.assigned_to_email||currentUser?.email||''}}
  function sfInsertActivity(accountId,type,text,phone='',oldStatus='',newStatus=''){
    if(typeof insertActivity==='function')return insertActivity(accountId,type,text,phone,oldStatus,newStatus).catch(()=>{});
    return Promise.resolve();
  }
  function sfInsertAudit(action,details,targetType,targetId){
    if(typeof insertAudit==='function')return insertAudit(action,details,targetType,targetId).catch(()=>{});
    return Promise.resolve();
  }
  function sfShowSaveError(area,e){
    console.error(area+' save failed:',e);
    let msg=(e&&e.message)?e.message:String(e||'Unknown error');
    alert(area+' did not save. Run SQL_TO_RUN_IN_SUPABASE/RUN_THIS_PROMISE_AUTOMATION_AND_CALL_INTELLIGENCE_SQL.sql in the matching Supabase project, then refresh. Supabase said: '+msg);
  }

  saveCurrent = async function(){
    let a=getCurrent();
    if(!a)return alert('No account selected.');
    let note=(sfEl('agentNote')?.value||'').trim();
    if(!note)return;
    try{
      await dbFetch('/account_notes',{method:'POST',body:JSON.stringify([{account_id:a.id,note,created_by_email:currentUser.email}])});
      await sfInsertActivity(a.id,'Note',note);
      if(sfEl('agentNote'))sfEl('agentNote').value='';
      if(sfEl('noteCounter'))sfEl('noteCounter').textContent='0 / 2000';
      await loadHistory(a.id).catch(()=>{});
      await loadAccounts().catch(()=>{});
      currentAccountId=a.id;
      render();
    }catch(e){
      sfShowSaveError('Agent note',e);
    }
  };

  saveAndNext = async function(){await saveCurrent(); nextAccount();};

  savePaymentPlan = async function(){
    let a=getCurrent();
    if(!a)return alert('No account selected.');
    try{
      if(!Array.isArray(paymentScheduleDraft) || !paymentScheduleDraft.length)return alert('Generate or add at least one payment date.');
      if(typeof sanitizeDraftAmounts==='function')sanitizeDraftAmounts();
      let acctBal=sfAcctBal(a);
      let total=sfMoneyNum(sfVal('planTotal'));
      if(total<=0)return alert('Plan total must be greater than zero.');
      if(total>acctBal+0.01)return alert('Not allowed: plan total cannot exceed the current account balance of '+sfMoney(acctBal)+'.');
      let paidToday=sfMoneyNum(sfVal('planToday'));
      if(paidToday>total+0.01)return alert('Payment today cannot be greater than the plan total.');
      let remainingAfterToday=Number(Math.max(0,total-paidToday).toFixed(2));
      let scheduledDue=paymentScheduleDraft.reduce((s,p)=>s+sfMoneyNum(p.amountDue ?? p.amount_due ?? p.amount ?? p.paymentAmount),0);
      if(scheduledDue>remainingAfterToday+0.01)return alert('Not allowed: scheduled future payments '+sfMoney(scheduledDue)+' exceed remaining balance after today '+sfMoney(remainingAfterToday)+'.');

      let status=sfVal('planStatus')||'Active';
      let frequency=sfVal('planFrequency')||'Custom';
      let notes=sfVal('planNotes');
      let existing=null;
      try{existing=await loadPaymentPlanForAccount(a.id,true)}catch(e){existing=null}
      if(existing&&existing.id){
        await dbFetch(`/payment_plans?id=eq.${existing.id}`,{method:'PATCH',body:JSON.stringify({status:'Replaced',updated_at:new Date().toISOString()})}).catch(()=>{});
      }
      let paidFromSchedule=paymentScheduleDraft.reduce((s,p)=>s+sfMoneyNum(p.amountPaid ?? p.amount_paid ?? 0),0);
      let paidTotal=Number((paidToday+paidFromSchedule).toFixed(2));
      let remaining=Number(Math.max(0,total-paidTotal).toFixed(2));
      let nextDue=(paymentScheduleDraft.find(p=>String(p.status||'Scheduled')!=='Paid')||paymentScheduleDraft[0]||{}).dueDate || sfToday();
      let each=0;
      try{each=regularPaymentAmount({payments:paymentScheduleDraft})}catch(e){each=paymentScheduleDraft.length?Number((scheduledDue/paymentScheduleDraft.length).toFixed(2)):0}
      let planPayload={
        account_id:a.id,
        total_amount:total,
        starting_balance:acctBal,
        remaining_amount:remaining,
        balance:remaining,
        payment_amount:each,
        frequency,
        start_date:(paymentScheduleDraft[0]?.dueDate||sfToday()),
        next_due_date:nextDue,
        status,
        notes,
        created_by_email:currentUser.email,
        updated_at:new Date().toISOString()
      };
      let planRows=await dbFetch('/payment_plans',{method:'POST',body:JSON.stringify([planPayload])});
      let plan=Array.isArray(planRows)?planRows[0]:planRows;
      if(!plan || !plan.id)throw new Error('Supabase did not return the saved payment plan id.');
      let pid=plan.id;
      let rows=paymentScheduleDraft.map(p=>{
        let due=sfMoneyNum(p.amountDue ?? p.amount_due ?? p.amount ?? p.paymentAmount);
        let paid=sfMoneyNum(p.amountPaid ?? p.amount_paid ?? 0);
        let paidDate=p.paidDate||p.paid_date||p.paymentDate||'';
        return {
          plan_id:pid,
          payment_plan_id:pid,
          account_id:a.id,
          due_date:p.dueDate||p.due_date||sfToday(),
          scheduled_date:p.dueDate||p.due_date||sfToday(),
          amount_due:due,
          amount:due,
          payment_amount:paid||due,
          amount_paid:paid,
          paid_date:paidDate||null,
          payment_date:paidDate||null,
          paid_at:paidDate?new Date(paidDate+'T12:00:00').toISOString():null,
          status:p.status||'Scheduled',
          notes,
          created_by_email:currentUser.email,
          updated_at:new Date().toISOString()
        };
      });
      if(rows.length)await dbFetch('/payment_plan_payments',{method:'POST',body:JSON.stringify(rows)});
      if(paidToday>0){
        await dbFetch('/payment_plan_payments',{method:'POST',body:JSON.stringify([{
          plan_id:pid,
          payment_plan_id:pid,
          account_id:a.id,
          due_date:sfToday(),
          scheduled_date:sfToday(),
          amount_due:paidToday,
          amount:paidToday,
          payment_amount:paidToday,
          amount_paid:paidToday,
          paid_date:sfToday(),
          payment_date:sfToday(),
          paid_at:new Date().toISOString(),
          status:'Paid',
          notes:'Payment made today when payment plan was created. '+notes,
          created_by_email:currentUser.email,
          updated_at:new Date().toISOString()
        }])});
      }
      await dbFetch(`/accounts?id=eq.${a.id}`,{method:'PATCH',body:JSON.stringify({current_balance:remaining,status:status==='Active'?'Promise to Pay':(a.status||'Promise to Pay'),disposition:'Promise to Pay',updated_at:new Date().toISOString()})});
      await sfInsertActivity(a.id,'Payment Plan','Payment plan saved: total '+sfMoney(total)+', payment today '+sfMoney(paidToday)+', paid total '+sfMoney(paidTotal)+', remaining '+sfMoney(remaining)+', frequency '+frequency);
      await sfInsertAudit('Payment Plan Saved','Payment plan saved for '+sfName(a)+' totaling '+sfMoney(total),'account',a.id);
      try{delete paymentPlanCache[a.id]}catch(e){}
      closeModal('paymentPlanModal');
      await loadAccounts().catch(()=>{});
      currentAccountId=a.id;
      await renderPaymentPlanSummary(a.id).catch(()=>{});
      await loadHistory(a.id).catch(()=>{});
      render();
      alert('Payment plan saved. Account balance updated to '+sfMoney(remaining)+'.');
    }catch(e){
      sfShowSaveError('Payment plan',e);
    }
  };

  const __savePaymentPromiseCore = async function(){
    let a=getCurrent();
    let id=sfVal('ptAccountId');
    if(id&&(!a||String(a.id)!==String(id)))a=accountById(id)||a;
    if(!a)return alert('Open an account first.');
    let amount=sfMoneyNum(sfVal('ptAmount')),
        due=sfVal('ptDueDate')||sfToday(),
        count=Math.max(1,Math.min(60,parseInt(sfVal('ptCount')||'1',10)||1)),
        frequency=sfVal('ptFrequency')||'One-Time',
        kind=count>1?'Payment Plan':(sfVal('ptPaymentKind')||'One-Time Payment'),
        method=sfVal('ptMethod')||'Card',
        last4=(typeof ptSafeLast4==='function'?ptSafeLast4(sfVal('ptLast4')):sfVal('ptLast4').replace(/\D/g,'').slice(-4)),
        auth=sfVal('ptAuthMethod')||'Phone Authorization',
        notes=sfVal('ptNotes');
    if(amount<=0)return alert('Enter a payment amount.');
    let gid=(typeof promiseGroupId==='function'?promiseGroupId():('promise-'+Date.now()+'-'+Math.random().toString(36).slice(2)));
    let rows=[];
    for(let i=0;i<count;i++){
      let dueDate=(typeof ptIsoAdd==='function'?ptIsoAdd(due,frequency,i):due);
      rows.push({
        account_id:a.id,
        promise_group_id:gid,
        schedule_index:i+1,
        schedule_total:count,
        debtor_name:sfName(a),
        account_number:sfAcctNo(a),
        payment_kind:kind,
        payment_amount:amount,
        total_amount:Number((amount*count).toFixed(2)),
        due_date:dueDate,
        payment_method:method,
        method_last4:last4,
        authorization_method:auth,
        status:'Pending Processing',
        employee_email:currentUser.email,
        assigned_to_email:sfAssignee(a),
        notes,
        created_by_email:currentUser.email,
        updated_at:new Date().toISOString()
      });
    }
    await dbFetch('/payment_promises',{method:'POST',body:JSON.stringify(rows)});
    await dbFetch(`/accounts?id=eq.${a.id}`,{method:'PATCH',body:JSON.stringify({status:'Promise to Pay',disposition:'Promise to Pay',updated_at:new Date().toISOString()})}).catch(()=>{});
    await sfInsertActivity(a.id,'Payment Promise Recorded',`${count} payment promise(s) recorded for ${sfMoney(amount)} each. First due ${due}. Method: ${method}${last4?' ending '+last4:''}. ${notes}`.trim());
    await sfInsertAudit('Payment Promise Recorded',`${count} payment promise(s) for ${sfName(a)} totaling ${sfMoney(amount*count)}`,'account',a.id);
    if(typeof fillPaymentPromiseForm==='function')fillPaymentPromiseForm(a);
    if(typeof loadPaymentTracker==='function')await loadPaymentTracker();
    await loadAccounts().catch(()=>{});
    currentAccountId=a.id;
    await loadHistory(a.id).catch(()=>{});
    render();
    alert('Payment promise saved.');
  };

  savePaymentPromise = async function(){
    try{
      await __savePaymentPromiseCore();
      if(typeof runPromiseAutomation==='function')await runPromiseAutomation(false,false).catch(()=>{});
      if(typeof refreshCollectorAlertBadge==='function')await refreshCollectorAlertBadge().catch(()=>{});
    }catch(e){
      sfShowSaveError('Payment promise',e);
    }
  };
})();


// ===== inline-script =====
(function(){
  function cpPlanAdmin(){
    try{
      var u = window.currentUser || {};
      var email = String(u.email || '').toLowerCase().trim();
      var role = String(u.role || '').toLowerCase().trim();
      return !!(u && (u.isAdmin || role === 'admin' || email === 'afinch2678@gmail.com' || (typeof window.isAdminEmail === 'function' && window.isAdminEmail(email))));
    }catch(e){ return false; }
  }
  window.cpPlanAdmin = cpPlanAdmin;

  window.deleteCurrentPaymentPlan = async function(){
    var a = (typeof window.getCurrent === 'function' ? window.getCurrent() : null);
    if(!a) return alert('No account selected.');
    if(!cpPlanAdmin()) return alert('Only admin can delete payment plans.');
    var plan = null;
    try{
      plan = await window.loadPaymentPlanForAccount(a.id, true);
    }catch(e){ plan = null; }
    if(!plan || !plan.id) return alert('No payment plan found on this account.');
    if(!confirm('Delete this payment plan? This cannot be undone.')) return;
    if(typeof window.deletePaymentPlan === 'function'){
      return window.deletePaymentPlan(String(plan.id), String(a.id));
    }
    try{
      await window.dbFetch('/payment_plan_payments?plan_id=eq.' + encodeURIComponent(plan.id), {method:'DELETE'}).catch(function(){});
      await window.dbFetch('/payment_plan_payments?payment_plan_id=eq.' + encodeURIComponent(plan.id), {method:'DELETE'}).catch(function(){});
      await window.dbFetch('/payment_plans?id=eq.' + encodeURIComponent(plan.id), {method:'DELETE'});
      if(typeof window.sfInsertActivity === 'function') await window.sfInsertActivity(a.id, 'Payment Plan Deleted', 'Admin deleted payment plan.').catch(function(){});
      if(typeof window.loadAccounts === 'function') await window.loadAccounts().catch(function(){});
      if(typeof window.render === 'function') window.render();
      alert('Payment plan deleted.');
    }catch(e){
      alert('Delete failed: ' + (e && e.message ? e.message : e));
    }
  };

  function addAdminPlanButtons(accountId){
    try{
      var el = document.getElementById('paymentPlanPanel');
      if(!el || !cpPlanAdmin()) return;
      if(el.querySelector('#planAdminActionBar')) return;
      var cache = window.paymentPlanCache || {};
      var plan = accountId ? cache[accountId] : null;
      if(!plan || !plan.id) return;
      var bar = document.createElement('div');
      bar.id = 'planAdminActionBar';
      bar.className = 'planProActions';
      bar.style.cssText = 'margin-top:12px;display:flex;gap:10px;align-items:center;justify-content:flex-start;border-top:1px solid #e2e8f0;padding-top:12px;flex-wrap:wrap;';
      bar.innerHTML = '<button class="outline" type="button" onclick="openPaymentPlan()">Edit Payment Plan</button><button class="red" type="button" onclick="deleteCurrentPaymentPlan()">Delete Payment Plan</button><span class="planProViewOnly">Admin controls</span>';
      var header = el.querySelector('.planProHeader') || el.querySelector('.planTop') || el.firstElementChild;
      if(header && header.parentNode) header.parentNode.insertBefore(bar, header.nextSibling);
      else el.appendChild(bar);
    }catch(e){ console.warn('Payment plan admin button visibility patch failed', e); }
  }

  var oldRenderPlanButtons = window.renderPaymentPlanSummary;
  window.renderPaymentPlanSummary = async function(accountId){
    if(typeof oldRenderPlanButtons === 'function') await oldRenderPlanButtons.apply(this, arguments);
    setTimeout(function(){ addAdminPlanButtons(accountId); }, 0);
  };

  var oldOpenPlanButtons = window.openPaymentPlan;
  window.openPaymentPlan = async function(){
    var result;
    if(typeof oldOpenPlanButtons === 'function') result = await oldOpenPlanButtons.apply(this, arguments);
    setTimeout(function(){
      try{
        var modal = document.getElementById('paymentPlanModal');
        if(!modal || !cpPlanAdmin()) return;
        var actions = modal.querySelector('.payActions');
        if(!actions || actions.querySelector('#modalDeletePaymentPlanBtn')) return;
        var btn = document.createElement('button');
        btn.id = 'modalDeletePaymentPlanBtn';
        btn.className = 'red';
        btn.type = 'button';
        btn.textContent = 'Delete Existing Plan';
        btn.onclick = function(){ window.deleteCurrentPaymentPlan(); };
        actions.appendChild(btn);
      }catch(e){ console.warn('Payment plan modal admin button patch failed', e); }
    }, 0);
    return result;
  };

  setTimeout(function(){
    try{
      var a = (typeof window.getCurrent === 'function' ? window.getCurrent() : null);
      if(a && a.id) addAdminPlanButtons(a.id);
    }catch(e){}
  }, 800);
})();



/* REPORTS PAGE REBUILD STABLE — full page, no modal stacking, no watcher loops */
(function(){
  var ADMIN_EMAIL = 'afinch2678@gmail.com';

  function reportsIsAdmin(){
    try{
      var email = String((window.currentUser && window.currentUser.email) || '').toLowerCase().trim();
      var badge = String((document.getElementById('roleBadge') || {}).textContent || '').toLowerCase();
      return !!(window.currentUser && window.currentUser.isAdmin) || email === ADMIN_EMAIL || badge.indexOf('admin') >= 0;
    }catch(e){ return false; }
  }

  function reportsEscape(v){
    return String(v == null ? '' : v).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function reportsNum(v){
    var n = Number(String(v == null ? '' : v).replace(/[^0-9.-]/g,''));
    return isFinite(n) ? n : 0;
  }
  function reportsMoney(v){
    try{return '$' + reportsNum(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});}
    catch(e){return '$0.00';}
  }
  function reportsDate(v){ return String(v || '').slice(0,10); }
  function reportsToday(){ return new Date().toISOString().slice(0,10); }
  function reportsStartOfWeek(){
    var d = new Date(reportsToday() + 'T00:00:00');
    var day = d.getDay();
    d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
    return d.toISOString().slice(0,10);
  }
  function reportsStartOfMonth(){
    var d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0,10);
  }
  function reportsInRange(value, start, end){
    var d = reportsDate(value);
    return !!d && (!start || d >= start) && (!end || d <= end);
  }
  function reportsStatus(row){ return String(row.status || row.call_result || row.disposition || '').toLowerCase(); }
  function reportsEmail(row){ return String(row.employee_email || row.assigned_to_email || row.created_by_email || row.createdByEmail || row.processed_by_email || 'Unassigned').toLowerCase().trim() || 'unassigned'; }
  function reportsAccountMap(){
    var map = {};
    (window.accounts || []).forEach(function(a){ if(a && a.id) map[String(a.id)] = a; });
    return map;
  }
  function reportsAccountName(a){
    if(!a) return 'Unknown Account';
    return a.name || a.fullName || a.debtorName || [a.firstName,a.lastName].filter(Boolean).join(' ') || a.accountNumber || 'Unknown Account';
  }
  function reportsPortfolio(a){
    if(!a) return 'Unknown';
    return a.portfolio || a.creditor || a.creditorName || a.sourceFile || a.accountDescription || 'Unknown';
  }
  function reportsAccountBalance(a){ return reportsNum(a && (a.balance || a.currentBalance || a.accountBalance || a.originalBalance || a.principal)); }

  function ensureReportsPage(){
    if(document.getElementById('reportsPageStable')) return;
    var style = document.createElement('style');
    style.id = 'reportsPageStableStyle';
    style.textContent = `
      #reportsPageStable{position:fixed;inset:0;background:#eef3f9;z-index:60000;display:none;color:#0f172a;font-family:Arial,Helvetica,sans-serif;overflow:hidden}
      #reportsPageStable.open{display:flex;flex-direction:column}
      .reportsPageTop{height:68px;background:linear-gradient(90deg,#05225f,#0b45c6);color:white;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 18px;box-shadow:0 6px 20px rgba(15,23,42,.2)}
      .reportsPageTitle{font-size:20px;font-weight:1000}.reportsPageSub{font-size:12px;color:#dbeafe;margin-top:3px}.reportsPageActions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.reportsPageActions button{height:38px;border:0;border-radius:10px;padding:0 12px;font-weight:900;cursor:pointer;background:#2563eb;color:#fff}.reportsPageActions .outline{background:#fff;color:#1d4ed8}.reportsPageActions .green{background:#16a34a}.reportsPageActions .gray{background:#334155}.reportsPageActions .red{background:#dc2626}
      .reportsPageBody{padding:16px;overflow:auto}.reportsPageNotice{border:1px solid #bfdbfe;background:#eff6ff;color:#1e3a8a;border-radius:14px;padding:10px 12px;font-size:13px;font-weight:850;margin-bottom:12px}.reportsFilters{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-bottom:12px}.reportsFilters label{font-size:11px;font-weight:900;color:#334155;margin-bottom:4px;display:block}.reportsFilters input,.reportsFilters select{height:38px;border:1px solid #cbd5e1;border-radius:10px;padding:8px;background:#fff;width:100%}
      .reportsKPIs{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin-bottom:12px}.reportsKPI{background:#fff;border:1px solid #dbe3ef;border-radius:14px;padding:12px;box-shadow:0 2px 10px rgba(15,23,42,.04)}.reportsKPILabel{font-size:10px;color:#64748b;font-weight:1000;text-transform:uppercase;letter-spacing:.04em}.reportsKPIValue{font-size:20px;font-weight:1000;margin-top:5px;color:#0f172a}.reportsKPISub{font-size:11px;color:#64748b;margin-top:4px;line-height:1.3}
      .reportsGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.reportsCard{background:#fff;border:1px solid #dbe3ef;border-radius:16px;box-shadow:0 2px 12px rgba(15,23,42,.04);overflow:hidden}.reportsCardHead{padding:12px 14px;border-bottom:1px solid #e5edf7;display:flex;align-items:center;justify-content:space-between;gap:8px;background:#f8fbff}.reportsCardHead h3{margin:0;font-size:15px}.reportsCardBody{padding:12px;max-height:360px;overflow:auto}.reportsTable{width:100%;border-collapse:collapse;font-size:12px}.reportsTable th{text-align:left;background:#f8fafc;color:#334155;font-size:10px;text-transform:uppercase;letter-spacing:.03em;padding:8px;border-bottom:1px solid #e2e8f0;position:sticky;top:0}.reportsTable td{padding:8px;border-bottom:1px solid #edf2f8;vertical-align:top}.reportsPill{display:inline-block;border-radius:999px;background:#eef2ff;color:#1d4ed8;font-size:10px;font-weight:900;padding:3px 7px}.reportsPill.green{background:#dcfce7;color:#166534}.reportsPill.red{background:#fee2e2;color:#991b1b}.reportsPill.orange{background:#fff7ed;color:#9a3412}.reportsEmpty{border:1px dashed #cbd5e1;border-radius:14px;background:#f8fafc;padding:18px;text-align:center;color:#64748b;font-weight:850}.reportsProgress{height:8px;background:#e2e8f0;border-radius:999px;overflow:hidden;margin-top:7px}.reportsProgress span{display:block;height:100%;background:#2563eb;border-radius:999px}
      @media(max-width:1200px){.reportsKPIs{grid-template-columns:repeat(3,1fr)}.reportsGrid{grid-template-columns:1fr}.reportsFilters{grid-template-columns:repeat(2,1fr)}}@media(max-width:700px){.reportsPageTop{height:auto;align-items:flex-start;flex-direction:column;padding:12px}.reportsKPIs,.reportsFilters{grid-template-columns:1fr}.reportsPageActions{width:100%}}
    `;
    document.head.appendChild(style);
    var page = document.createElement('div');
    page.id = 'reportsPageStable';
    page.innerHTML = `
      <div class="reportsPageTop">
        <div><div class="reportsPageTitle">Admin Reports</div><div class="reportsPageSub">Full page reports rebuilt outside the old modal system.</div></div>
        <div class="reportsPageActions">
          <button class="outline" onclick="refreshReportsPageStable()">Refresh</button>
          <button class="green" onclick="exportReportsPageStableCSV()">Export CSV</button>
          <button class="gray" onclick="window.print()">Print / Save PDF</button>
          <button class="red" onclick="closeReportsPageStable()">Back to Queue</button>
        </div>
      </div>
      <div class="reportsPageBody">
        <div class="reportsPageNotice" id="reportsPageStableNotice">Reports open as a full page now. No modal stacking, no delayed handler, and no Compliance panel behind it.</div>
        <div class="reportsFilters">
          <div><label>Range</label><select id="reportsStableRange" onchange="reportsPageRangeChanged()"><option value="today">Today</option><option value="week">This Week</option><option value="month">This Month</option><option value="year">This Year</option><option value="custom">Custom</option></select></div>
          <div><label>Start Date</label><input id="reportsStableStart" type="date" onchange="refreshReportsPageStable()"></div>
          <div><label>End Date</label><input id="reportsStableEnd" type="date" onchange="refreshReportsPageStable()"></div>
          <div><label>Employee</label><select id="reportsStableEmployee" onchange="refreshReportsPageStable()"><option value="">All Employees</option></select></div>
          <div><label>Portfolio</label><select id="reportsStablePortfolio" onchange="refreshReportsPageStable()"><option value="">All Portfolios</option></select></div>
        </div>
        <div class="reportsKPIs" id="reportsStableKpis"></div>
        <div class="reportsGrid">
          <div class="reportsCard"><div class="reportsCardHead"><h3>Collector Ranking</h3><span class="reportsPill">Live</span></div><div class="reportsCardBody" id="reportsStableCollectors"></div></div>
          <div class="reportsCard"><div class="reportsCardHead"><h3>Portfolio Performance</h3><span class="reportsPill">Balances</span></div><div class="reportsCardBody" id="reportsStablePortfolios"></div></div>
          <div class="reportsCard"><div class="reportsCardHead"><h3>Call Performance</h3><span class="reportsPill">Contact Intel</span></div><div class="reportsCardBody" id="reportsStableCalls"></div></div>
          <div class="reportsCard"><div class="reportsCardHead"><h3>Recent Payments / Promises</h3><span class="reportsPill">Pay Desk</span></div><div class="reportsCardBody" id="reportsStableRecent"></div></div>
        </div>
      </div>`;
    document.body.appendChild(page);
  }

  function setReportsDefaultDates(){
    var range = document.getElementById('reportsStableRange');
    var start = document.getElementById('reportsStableStart');
    var end = document.getElementById('reportsStableEnd');
    if(!range || !start || !end) return;
    var today = reportsToday();
    var s = today;
    if(range.value === 'week') s = reportsStartOfWeek();
    else if(range.value === 'month') s = reportsStartOfMonth();
    else if(range.value === 'year') s = new Date(new Date().getFullYear(),0,1).toISOString().slice(0,10);
    if(!start.value || range.value !== 'custom') start.value = s;
    if(!end.value || range.value !== 'custom') end.value = today;
  }

  function reportsPageRangeChanged(){ setReportsDefaultDates(); refreshReportsPageStable(); }

  function safeTimeoutPromise(p, ms, fallback){
    return new Promise(function(resolve){
      var done = false;
      var t = setTimeout(function(){ if(!done){ done=true; resolve(fallback); } }, ms || 3500);
      Promise.resolve(p).then(function(v){ if(!done){ done=true; clearTimeout(t); resolve(v); } }).catch(function(){ if(!done){ done=true; clearTimeout(t); resolve(fallback); } });
    });
  }
  async function safeTable(path){
    if(typeof window.dbFetch !== 'function') return [];
    return await safeTimeoutPromise(window.dbFetch(path), 3500, []);
  }

  async function loadReportsData(){
    var accs = Array.isArray(window.accounts) ? window.accounts.slice() : [];
    var results = await Promise.all([
      safeTable('/payments_ledger?select=*&limit=2000&order=created_at.desc'),
      safeTable('/payment_promises?select=*&limit=2000&order=created_at.desc'),
      safeTable('/call_results?select=*&limit=2000&order=created_at.desc'),
      safeTable('/payment_plans?select=*&limit=2000&order=created_at.desc'),
      safeTable('/account_notes?select=*&limit=1000&order=created_at.desc')
    ]);
    return {accounts:accs, ledger:results[0]||[], promises:results[1]||[], calls:results[2]||[], plans:results[3]||[], notes:results[4]||[]};
  }

  function buildReportFilters(data){
    var emp = document.getElementById('reportsStableEmployee');
    var pf = document.getElementById('reportsStablePortfolio');
    if(emp){
      var cur = emp.value;
      var set = {};
      (data.accounts||[]).forEach(function(a){ var e = String(a.assignedToEmail || a.assigned_to_email || a.createdByEmail || a.created_by_email || '').toLowerCase().trim(); if(e)set[e]=1; });
      (data.ledger||[]).concat(data.promises||[], data.calls||[]).forEach(function(r){ var e=reportsEmail(r); if(e && e !== 'unassigned')set[e]=1; });
      emp.innerHTML = '<option value="">All Employees</option>' + Object.keys(set).sort().map(function(e){return '<option value="'+reportsEscape(e)+'">'+reportsEscape(e)+'</option>';}).join('');
      emp.value = cur;
    }
    if(pf){
      var curp = pf.value;
      var pset = {};
      (data.accounts||[]).forEach(function(a){ var p = reportsPortfolio(a); if(p)pset[p]=1; });
      pf.innerHTML = '<option value="">All Portfolios</option>' + Object.keys(pset).sort().map(function(p){return '<option value="'+reportsEscape(p)+'">'+reportsEscape(p)+'</option>';}).join('');
      pf.value = curp;
    }
  }

  function filterReportData(data){
    var start = (document.getElementById('reportsStableStart')||{}).value || '';
    var end = (document.getElementById('reportsStableEnd')||{}).value || reportsToday();
    var emp = String((document.getElementById('reportsStableEmployee')||{}).value || '').toLowerCase();
    var port = String((document.getElementById('reportsStablePortfolio')||{}).value || '');
    var amap = reportsAccountMap();
    function byEmp(r){ return !emp || reportsEmail(r) === emp || String((amap[String(r.account_id)]||{}).assignedToEmail || (amap[String(r.account_id)]||{}).assigned_to_email || '').toLowerCase() === emp; }
    function byPort(r){ return !port || reportsPortfolio(amap[String(r.account_id)]) === port; }
    function byAcct(a){ return (!emp || String(a.assignedToEmail || a.assigned_to_email || '').toLowerCase() === emp) && (!port || reportsPortfolio(a) === port); }
    return {
      accounts:(data.accounts||[]).filter(byAcct),
      ledger:(data.ledger||[]).filter(function(r){return reportsInRange(r.payment_date||r.paid_at||r.created_at,start,end)&&byEmp(r)&&byPort(r);}),
      promises:(data.promises||[]).filter(function(r){return reportsInRange(r.created_at||r.due_date,start,end)&&byEmp(r)&&byPort(r);}),
      calls:(data.calls||[]).filter(function(r){return reportsInRange(r.result_at||r.created_at,start,end)&&byEmp(r)&&byPort(r);}),
      plans:(data.plans||[]).filter(function(r){return reportsInRange(r.created_at||r.start_date,start,end)&&byEmp(r)&&byPort(r);}),
      notes:(data.notes||[]).filter(function(r){return reportsInRange(r.created_at,start,end)&&byEmp(r)&&byPort(r);})
    };
  }

  function renderReports(dataRaw){
    var data = filterReportData(dataRaw);
    var totalBalance = data.accounts.reduce(function(sum,a){return sum+reportsAccountBalance(a);},0);
    var collected = data.ledger.reduce(function(sum,r){return sum + reportsNum(r.amount || r.payment_amount || r.paid_amount);},0);
    var today = reportsToday(), week = reportsStartOfWeek(), month = reportsStartOfMonth();
    var collectedToday = (dataRaw.ledger||[]).filter(function(r){return reportsInRange(r.payment_date||r.paid_at||r.created_at,today,today);}).reduce(function(s,r){return s+reportsNum(r.amount||r.payment_amount||r.paid_amount);},0);
    var collectedWeek = (dataRaw.ledger||[]).filter(function(r){return reportsInRange(r.payment_date||r.paid_at||r.created_at,week,today);}).reduce(function(s,r){return s+reportsNum(r.amount||r.payment_amount||r.paid_amount);},0);
    var collectedMonth = (dataRaw.ledger||[]).filter(function(r){return reportsInRange(r.payment_date||r.paid_at||r.created_at,month,today);}).reduce(function(s,r){return s+reportsNum(r.amount||r.payment_amount||r.paid_amount);},0);
    var promisesAmount = data.promises.reduce(function(sum,r){return sum+reportsNum(r.payment_amount||r.total_amount||r.amount);},0);
    var kept = data.promises.filter(function(r){return /paid|kept|processed|complete|settled/.test(reportsStatus(r));});
    var broken = data.promises.filter(function(r){return /broken|failed|missed|nsf|declined|default/.test(reportsStatus(r));});
    var calls = data.calls.length;
    var contacts = data.calls.filter(function(r){return r.is_contact === true || /contact|right party|rpc|promise|refused|dispute|settled/.test(reportsStatus(r));}).length;
    var rpc = data.calls.filter(function(r){return r.is_rpc === true || /right party|rpc/.test(reportsStatus(r));}).length;
    var liquidation = totalBalance ? (collected / totalBalance * 100) : 0;
    var contactRate = calls ? contacts / calls * 100 : 0;
    var rpcRate = calls ? rpc / calls * 100 : 0;
    var kpiHtml = [
      ['Collected Today',reportsMoney(collectedToday),'Week: '+reportsMoney(collectedWeek)],
      ['Collected Month',reportsMoney(collectedMonth),'Selected range: '+reportsMoney(collected)],
      ['Promises Created',data.promises.length,promisesAmount?reportsMoney(promisesAmount):'No promised dollars found'],
      ['Promises Kept',kept.length,'Broken / missed: '+broken.length],
      ['Contact Rate',contactRate.toFixed(1)+'%','RPC rate: '+rpcRate.toFixed(1)+'%'],
      ['Liquidation Rate',liquidation.toFixed(2)+'%','Balance loaded: '+reportsMoney(totalBalance)]
    ].map(function(k){return '<div class="reportsKPI"><div class="reportsKPILabel">'+reportsEscape(k[0])+'</div><div class="reportsKPIValue">'+reportsEscape(k[1])+'</div><div class="reportsKPISub">'+reportsEscape(k[2])+'</div></div>';}).join('');
    document.getElementById('reportsStableKpis').innerHTML = kpiHtml;

    var collectors = {};
    data.accounts.forEach(function(a){ var e=String(a.assignedToEmail||a.assigned_to_email||'unassigned').toLowerCase(); if(!collectors[e])collectors[e]={email:e,calls:0,contacts:0,rpc:0,promises:0,promiseAmt:0,collected:0,balance:0,accounts:0}; collectors[e].accounts++; collectors[e].balance += reportsAccountBalance(a); });
    data.calls.forEach(function(r){ var e=reportsEmail(r); if(!collectors[e])collectors[e]={email:e,calls:0,contacts:0,rpc:0,promises:0,promiseAmt:0,collected:0,balance:0,accounts:0}; collectors[e].calls++; if(r.is_contact===true || /contact|right party|rpc|promise|refused|dispute|settled/.test(reportsStatus(r))) collectors[e].contacts++; if(r.is_rpc===true || /right party|rpc/.test(reportsStatus(r))) collectors[e].rpc++; });
    data.promises.forEach(function(r){ var e=reportsEmail(r); if(!collectors[e])collectors[e]={email:e,calls:0,contacts:0,rpc:0,promises:0,promiseAmt:0,collected:0,balance:0,accounts:0}; collectors[e].promises++; collectors[e].promiseAmt += reportsNum(r.payment_amount||r.total_amount||r.amount); });
    data.ledger.forEach(function(r){ var e=reportsEmail(r); if(!collectors[e])collectors[e]={email:e,calls:0,contacts:0,rpc:0,promises:0,promiseAmt:0,collected:0,balance:0,accounts:0}; collectors[e].collected += reportsNum(r.amount||r.payment_amount||r.paid_amount); });
    var collectorRows = Object.keys(collectors).map(function(k){return collectors[k];}).sort(function(a,b){return b.collected-a.collected || b.promiseAmt-a.promiseAmt || b.calls-a.calls;}).slice(0,25);
    document.getElementById('reportsStableCollectors').innerHTML = collectorRows.length ? '<table class="reportsTable"><thead><tr><th>Collector</th><th>Accounts</th><th>Calls</th><th>Contact</th><th>RPC</th><th>Promises</th><th>Collected</th></tr></thead><tbody>'+collectorRows.map(function(r){return '<tr><td><b>'+reportsEscape(r.email)+'</b></td><td>'+r.accounts+'</td><td>'+r.calls+'</td><td>'+r.contacts+'</td><td>'+r.rpc+'</td><td>'+r.promises+'<br><small>'+reportsMoney(r.promiseAmt)+'</small></td><td><b>'+reportsMoney(r.collected)+'</b></td></tr>';}).join('')+'</tbody></table>' : '<div class="reportsEmpty">No collector activity found for this filter.</div>';

    var ports = {};
    data.accounts.forEach(function(a){ var p=reportsPortfolio(a); if(!ports[p])ports[p]={name:p,accounts:0,balance:0,collected:0,promises:0}; ports[p].accounts++; ports[p].balance += reportsAccountBalance(a); });
    var amap = reportsAccountMap();
    data.ledger.forEach(function(r){ var p=reportsPortfolio(amap[String(r.account_id)]); if(!ports[p])ports[p]={name:p,accounts:0,balance:0,collected:0,promises:0}; ports[p].collected += reportsNum(r.amount||r.payment_amount||r.paid_amount); });
    data.promises.forEach(function(r){ var p=reportsPortfolio(amap[String(r.account_id)]); if(!ports[p])ports[p]={name:p,accounts:0,balance:0,collected:0,promises:0}; ports[p].promises += reportsNum(r.payment_amount||r.total_amount||r.amount); });
    var portRows = Object.keys(ports).map(function(k){return ports[k];}).sort(function(a,b){return b.balance-a.balance;}).slice(0,25);
    document.getElementById('reportsStablePortfolios').innerHTML = portRows.length ? '<table class="reportsTable"><thead><tr><th>Portfolio</th><th>Accounts</th><th>Balance</th><th>Collected</th><th>Liquidation</th></tr></thead><tbody>'+portRows.map(function(p){var pct=p.balance?(p.collected/p.balance*100):0;return '<tr><td><b>'+reportsEscape(p.name)+'</b></td><td>'+p.accounts+'</td><td>'+reportsMoney(p.balance)+'</td><td>'+reportsMoney(p.collected)+'</td><td>'+pct.toFixed(2)+'%<div class="reportsProgress"><span style="width:'+Math.min(100,pct).toFixed(1)+'%"></span></div></td></tr>';}).join('')+'</tbody></table>' : '<div class="reportsEmpty">No portfolio data loaded.</div>';

    var outcome = {};
    data.calls.forEach(function(r){ var k=String(r.call_result || r.disposition || r.outcome_category || 'Unknown'); outcome[k]=(outcome[k]||0)+1; });
    var outcomeRows = Object.keys(outcome).sort(function(a,b){return outcome[b]-outcome[a];});
    document.getElementById('reportsStableCalls').innerHTML = '<div class="reportsKPIs" style="grid-template-columns:repeat(3,1fr);margin-bottom:10px"><div class="reportsKPI"><div class="reportsKPILabel">Total Calls</div><div class="reportsKPIValue">'+calls+'</div></div><div class="reportsKPI"><div class="reportsKPILabel">Contacts</div><div class="reportsKPIValue">'+contacts+'</div></div><div class="reportsKPI"><div class="reportsKPILabel">Right Party</div><div class="reportsKPIValue">'+rpc+'</div></div></div>' + (outcomeRows.length ? '<table class="reportsTable"><thead><tr><th>Outcome</th><th>Count</th></tr></thead><tbody>'+outcomeRows.map(function(k){return '<tr><td>'+reportsEscape(k)+'</td><td><b>'+outcome[k]+'</b></td></tr>';}).join('')+'</tbody></table>' : '<div class="reportsEmpty">No call logs found for this filter.</div>');

    var recent = [];
    data.ledger.slice(0,8).forEach(function(r){ recent.push({type:'Payment',date:reportsDate(r.payment_date||r.paid_at||r.created_at),amount:reportsNum(r.amount||r.payment_amount||r.paid_amount),status:r.status||'Paid',email:reportsEmail(r)}); });
    data.promises.slice(0,8).forEach(function(r){ recent.push({type:'Promise',date:reportsDate(r.due_date||r.created_at),amount:reportsNum(r.payment_amount||r.total_amount||r.amount),status:r.status||'Pending',email:reportsEmail(r)}); });
    recent = recent.sort(function(a,b){return String(b.date).localeCompare(String(a.date));}).slice(0,12);
    document.getElementById('reportsStableRecent').innerHTML = recent.length ? '<table class="reportsTable"><thead><tr><th>Type</th><th>Date</th><th>Amount</th><th>Status</th><th>Employee</th></tr></thead><tbody>'+recent.map(function(r){var cls=/paid|kept|complete/i.test(r.status)?'green':(/broken|failed|missed|nsf/i.test(r.status)?'red':'orange');return '<tr><td>'+reportsEscape(r.type)+'</td><td>'+reportsEscape(r.date)+'</td><td><b>'+reportsMoney(r.amount)+'</b></td><td><span class="reportsPill '+cls+'">'+reportsEscape(r.status)+'</span></td><td>'+reportsEscape(r.email)+'</td></tr>';}).join('')+'</tbody></table>' : '<div class="reportsEmpty">No recent payments or promises found.</div>';

    var n = document.getElementById('reportsPageStableNotice');
    if(n) n.textContent = 'Loaded '+data.accounts.length+' accounts, '+data.ledger.length+' payment rows, '+data.promises.length+' promises, and '+data.calls.length+' call logs for the selected filter.';
    window.reportsPageStableLastData = {raw:dataRaw,filtered:data};
  }

  async function refreshReportsPageStable(){
    ensureReportsPage();
    if(window.__reportsPageStableLoading){
      var already = document.getElementById('reportsPageStableNotice');
      if(already) already.textContent = 'Reports are already loading. Please wait a moment.';
      return;
    }
    window.__reportsPageStableLoading = true;
    try{
      setReportsDefaultDates();
      var n = document.getElementById('reportsPageStableNotice');
      if(n) n.textContent = 'Loading reports safely... If one table is empty or slow, the page will still load.';
      ['reportsStableKpis','reportsStableCollectors','reportsStablePortfolios','reportsStableCalls','reportsStableRecent'].forEach(function(id){var el=document.getElementById(id); if(el)el.innerHTML='<div class="reportsEmpty">Loading...</div>';});
      var data = await loadReportsData();
      buildReportFilters(data);
      renderReports(data);
    }catch(e){
      console.warn('Reports page failed safely', e);
      var fail = document.getElementById('reportsPageStableNotice');
      if(fail) fail.textContent = 'Reports could not load one or more sections. The app is still stable; try Refresh or check table access.';
    }finally{
      window.__reportsPageStableLoading = false;
    }
  }

  function openReportsPageStable(){
    if(!reportsIsAdmin()) return alert('Admin only.');
    ensureReportsPage();
    try{ if(typeof window.closeAllLargeModalsForNav === 'function') window.closeAllLargeModalsForNav(); }catch(e){}
    try{
      document.querySelectorAll('.modal.open').forEach(function(m){m.classList.remove('open');});
      document.querySelectorAll('[id$="PageStable"].open,.cleanupPage.open,.importPage.open,.settlementPage.open,.docsPage.open,.ticklerPage.open,.scorecardsPage.open').forEach(function(p){
        if(p.id !== 'reportsPageStable') p.classList.remove('open');
      });
    }catch(e){}
    document.getElementById('reportsPageStable').classList.add('open');
    setReportsDefaultDates();
    setTimeout(function(){ refreshReportsPageStable(); },0);
  }
  function closeReportsPageStable(){
    var el = document.getElementById('reportsPageStable');
    if(el) el.classList.remove('open');
  }
  function exportReportsPageStableCSV(){
    var data = (window.reportsPageStableLastData && window.reportsPageStableLastData.filtered) || {ledger:[],promises:[],calls:[],accounts:[]};
    var rows = [['Section','Date','Name/Type','Amount/Count','Status','Employee']];
    (data.ledger||[]).forEach(function(r){rows.push(['Payment',reportsDate(r.payment_date||r.paid_at||r.created_at),r.reference_number||r.payment_method||'Payment',reportsNum(r.amount||r.payment_amount||r.paid_amount),r.status||'Paid',reportsEmail(r)]);});
    (data.promises||[]).forEach(function(r){rows.push(['Promise',reportsDate(r.due_date||r.created_at),r.debtor_name||r.account_number||'Promise',reportsNum(r.payment_amount||r.total_amount||r.amount),r.status||'',reportsEmail(r)]);});
    (data.calls||[]).forEach(function(r){rows.push(['Call',reportsDate(r.result_at||r.created_at),r.call_result||r.disposition||'Call',1,r.outcome_category||'',reportsEmail(r)]);});
    var csv = rows.map(function(r){return r.map(function(c){return '"'+String(c==null?'':c).replace(/"/g,'""')+'"';}).join(',');}).join('\n');
    var blob = new Blob([csv],{type:'text/csv'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'co-pilot-admin-reports.csv';
    a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); },1000);
  }

  window.openReportsPageStable = openReportsPageStable;
  window.closeReportsPageStable = closeReportsPageStable;
  window.refreshReportsPageStable = refreshReportsPageStable;
  window.exportReportsPageStableCSV = exportReportsPageStableCSV;
  window.reportsPageRangeChanged = reportsPageRangeChanged;
})();


// ===== dataCleanupDuplicateFinderScript =====
(function(){
  var state={scan:null,tab:'duplicates',search:''};
  function isAdmin(){
    try{
      var email=String((typeof currentUser!=='undefined'&&currentUser&&currentUser.email)||'').toLowerCase().trim();
      var role=String((typeof currentUser!=='undefined'&&currentUser&&currentUser.role)||'').toLowerCase().trim();
      var badge=(document.getElementById('roleBadge')?.textContent||'').toLowerCase();
      return email==='afinch2678@gmail.com' || (typeof currentUser!=='undefined'&&currentUser&&currentUser.isAdmin===true) || role==='admin' || badge.includes('admin');
    }catch(e){return false;}
  }
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function digits(v){return String(v==null?'':v).replace(/\D/g,'');}
  function money(v){var n=Number(String(v==null?'':v).replace(/[^0-9.-]/g,''));return isFinite(n)?n:0;}
  function usd(n){n=Number(n||0);return n.toLocaleString(undefined,{style:'currency',currency:'USD'});}
  function val(a,keys){for(var i=0;i<keys.length;i++){var k=keys[i];if(a&&a[k]!=null&&String(a[k]).trim()!=='')return a[k];}return '';}
  function acctNum(a){return String(val(a,['accountNumber','accountId','clientAccountNumber','account','acct','accountNo'])||'').trim();}
  function name(a){try{if(typeof nameOf==='function')return nameOf(a);}catch(e){} return String(val(a,['fullName','name','debtorName'])||[a.firstName,a.lastName].filter(Boolean).join(' ')||'Unknown Account').trim();}
  function portfolio(a){return String(val(a,['portfolio','creditor','creditorName','sourceFile','source','accountDescription'])||'Unknown').trim();}
  function dob(a){return String(val(a,['dob','dateOfBirth','birthdate','birthDate'])||'').trim();}
  function ssn(a){return digits(val(a,['ssn','socialSecurityNumber','social','taxId']));}
  function bal(a){return money(val(a,['balance','currentBalance','principal','originalLoanAmount','amount','totalBalance','accountBalance']));}
  function getAccounts(){try{return Array.isArray(accounts)?accounts.slice():[];}catch(e){return [];}}
  function allPhones(a){
    var out=[]; var seen={};
    Object.keys(a||{}).forEach(function(k){
      if(/phone|mobile|cell|telephone|tel|homePhone|workPhone|alternate/i.test(k)){
        var raw=a[k]; if(raw==null)return;
        String(raw).split(/[;,|\/]+/).forEach(function(part){
          var d=digits(part); if(d.length>11&&d[0]==='1')d=d.slice(1); if(d.length>=7&&!seen[d]){seen[d]=true;out.push(d);}
        });
      }
    });
    return out;
  }
  function badPhone(d){return !d || d.length<10 || /(\d)\1{6,}/.test(d) || /^0+$/.test(d) || /^1+$/.test(d) || /^1234567/.test(d);}
  function groupBy(records, keyFn, type){
    var map={};
    records.forEach(function(a){
      var keys=keyFn(a)||[]; if(!Array.isArray(keys))keys=[keys];
      var used={};
      keys.forEach(function(k){k=String(k||'').trim().toLowerCase(); if(!k||used[k])return; used[k]=true; (map[k]=map[k]||[]).push(a);});
    });
    return Object.keys(map).filter(function(k){return map[k].length>1;}).map(function(k){
      var items=map[k];
      return {type:type,key:k,count:items.length,totalBalance:items.reduce(function(s,a){return s+bal(a);},0),items:items};
    });
  }
  function scan(){
    var accs=getAccounts();
    var dup=[];
    dup=dup.concat(groupBy(accs,function(a){var s=ssn(a);return s.length>=4?s:'';},'SSN'));
    dup=dup.concat(groupBy(accs,function(a){return acctNum(a);},'Account #'));
    dup=dup.concat(groupBy(accs,function(a){return allPhones(a).filter(function(p){return p.length>=10&&!badPhone(p);});},'Phone'));
    dup=dup.concat(groupBy(accs,function(a){var d=dob(a);var n=name(a).toLowerCase().replace(/[^a-z0-9]/g,'');return (d&&n&&n!=='unknownaccount')?n+' | '+d:'';},'Name + DOB'));
    dup.sort(function(a,b){return b.totalBalance-a.totalBalance || b.count-a.count;});
    var missingPhone=[], badPhones=[], missingSSN=[], missingDOB=[], invalidBalance=[];
    accs.forEach(function(a){
      var ps=allPhones(a); if(!ps.length)missingPhone.push(a); else if(ps.some(badPhone))badPhones.push(a);
      if(!ssn(a))missingSSN.push(a); if(!dob(a))missingDOB.push(a);
      var raw=val(a,['balance','currentBalance','principal','originalLoanAmount','amount','totalBalance','accountBalance']); var n=Number(String(raw==null?'':raw).replace(/[^0-9.-]/g,'')); if(raw!==''&&(!isFinite(n)||n<0))invalidBalance.push(a);
    });
    var ports={};
    accs.forEach(function(a){var p=portfolio(a);var o=ports[p]||(ports[p]={name:p,count:0,balance:0,missingPhone:0,duplicates:0,importedBy:{}});o.count++;o.balance+=bal(a);if(!allPhones(a).length)o.missingPhone++;var by=String(val(a,['importedBy','createdByEmail','created_by_email','assignedToEmail'])||'Unknown').trim();o.importedBy[by]=(o.importedBy[by]||0)+1;});
    var dupIds={}; dup.forEach(function(g){g.items.forEach(function(a){dupIds[String(a.id)]=true;});}); Object.keys(ports).forEach(function(p){ports[p].duplicates=accs.filter(function(a){return portfolio(a)===p&&dupIds[String(a.id)];}).length;});
    state.scan={accounts:accs,duplicates:dup,quality:{missingPhone:missingPhone,badPhones:badPhones,missingSSN:missingSSN,missingDOB:missingDOB,invalidBalance:invalidBalance},portfolios:Object.keys(ports).map(function(k){return ports[k];}).sort(function(a,b){return b.balance-a.balance;})};
    window.dataCleanupLastScan=state.scan;
    return state.scan;
  }
  function ensurePage(){
    var el=document.getElementById('dataCleanupPage'); if(el)return el;
    el=document.createElement('div'); el.id='dataCleanupPage'; el.className='dcPage';
    el.innerHTML='<div class="dcShell"><div class="dcHero"><div><div class="dcTitle">Data Cleanup + Duplicate Finder</div><div class="dcSub">Admin-only portfolio cleanup center. Find duplicate debtors, bad/missing phone numbers, missing SSN/DOB, invalid balances, and portfolio import quality issues before collectors work the file.</div></div><div class="dcActions"><button class="dcBack" onclick="closeDataCleanupDashboard()">Back to Queue</button><button class="dcRefresh" onclick="refreshDataCleanupDashboard()">Refresh Scan</button><button class="dcExport" onclick="exportDataCleanupCSV()">Export CSV</button></div></div><div id="dataCleanupBody"><div class="dcEmpty">Loading cleanup scan...</div></div></div>';
    document.body.appendChild(el); return el;
  }
  function stat(label,val,hint){return '<div class="dcStat"><div class="dcStatLabel">'+esc(label)+'</div><div class="dcStatVal">'+esc(val)+'</div><div class="dcStatHint">'+esc(hint||'')+'</div></div>';}
  function tabs(){var t=[['duplicates','Duplicates'],['quality','Data Quality'],['portfolio','Portfolio Summary'],['merge','Merge Tools']];return '<div class="dcTabs">'+t.map(function(x){return '<button class="dcTab '+(state.tab===x[0]?'active':'')+'" onclick="setDataCleanupTab(\''+x[0]+'\')">'+x[1]+'</button>';}).join('')+'<input class="dcSearch" placeholder="Search cleanup results..." value="'+esc(state.search)+'" oninput="setDataCleanupSearch(this.value)"></div>';}
  function filterText(s){var q=String(state.search||'').toLowerCase().trim(); if(!q)return true; return String(s||'').toLowerCase().includes(q);}
  function render(){var sc=state.scan||scan(); var q=sc.quality; var body=document.getElementById('dataCleanupBody'); if(!body)return;
    var duplicateAccounts={}; sc.duplicates.forEach(function(g){g.items.forEach(function(a){duplicateAccounts[String(a.id)]=true;});});
    var html='<div class="dcStats">'+[
      stat('Total Accounts',sc.accounts.length,'Loaded in this portfolio set'),
      stat('Duplicate Groups',sc.duplicates.length,'SSN, phone, account #, name+DOB'),
      stat('Duplicate Accounts',Object.keys(duplicateAccounts).length,'Accounts appearing in duplicate groups'),
      stat('Missing Phones',q.missingPhone.length,'Accounts with no detected phone'),
      stat('Bad Phones',q.badPhones.length,'Short, fake, or invalid-looking numbers'),
      stat('Missing SSN/DOB',q.missingSSN.length+' / '+q.missingDOB.length,'Missing identity fields')
    ].join('')+'</div>'+tabs();
    if(state.tab==='duplicates')html+=renderDuplicates(sc);
    if(state.tab==='quality')html+=renderQuality(sc);
    if(state.tab==='portfolio')html+=renderPortfolio(sc);
    if(state.tab==='merge')html+=renderMerge(sc);
    body.innerHTML=html;
  }
  function sampleNames(items){return items.slice(0,4).map(function(a){return name(a)+' <span class="dcMini">#'+esc(acctNum(a)||a.id)+'</span>';}).join('<br>');}
  function renderDuplicates(sc){var rows=sc.duplicates.filter(function(g){return filterText(g.type+' '+g.key+' '+g.items.map(name).join(' '));});
    if(!rows.length)return '<div class="dcEmpty">No duplicate groups found for the current search.</div>';
    return '<div class="dcGrid"><div class="dcPanel"><div class="dcPanelHead"><div><div class="dcPanelTitle">Duplicate Groups</div><div class="dcPanelSub">The first account in each group is treated as the survivor when using merge/mark actions.</div></div><span class="dcPill orange">Admin only</span></div><div class="dcPanelBody"><div class="dcTableWrap"><table class="dcTable"><thead><tr><th>Match Type</th><th>Match Value</th><th>Accounts</th><th>Total Balance</th><th>Sample</th><th>Actions</th></tr></thead><tbody>'+rows.map(function(g,i){return '<tr><td><span class="dcPill">'+esc(g.type)+'</span></td><td>'+esc(g.key)+'</td><td>'+g.count+'</td><td><b>'+usd(g.totalBalance)+'</b></td><td>'+sampleNames(g.items)+'</td><td><div class="dcRowActions"><button class="dcLink" onclick="openDataCleanupAccount(\''+esc(g.items[0].id)+'\')">Open First</button><button class="dcMerge" onclick="mergeDataCleanupGroup('+i+')">Merge</button><button class="dcMark" onclick="markDataCleanupDuplicates('+i+')">Mark Dups</button></div></td></tr>';}).join('')+'</tbody></table></div></div></div>'+renderSideHelp(sc)+'</div>';}
  function renderSideHelp(sc){return '<div class="dcPanel"><div class="dcPanelHead"><div><div class="dcPanelTitle">Cleanup Rules</div><div class="dcPanelSub">How groups are detected.</div></div></div><div class="dcPanelBody"><div class="dcWarn">Review duplicate groups before merging. This tool does not delete debtor records automatically.</div><div class="dcQualityList"><div class="dcQualityItem"><div><div class="dcQTitle">SSN Match</div><div class="dcQMeta">Same SSN or last-four style value.</div></div><span class="dcPill">High confidence</span></div><div class="dcQualityItem"><div><div class="dcQTitle">Phone Match</div><div class="dcQMeta">Same clean 10-digit phone across accounts.</div></div><span class="dcPill orange">Review</span></div><div class="dcQualityItem"><div><div class="dcQTitle">Name + DOB</div><div class="dcQMeta">Normalized name plus date of birth.</div></div><span class="dcPill">Strong</span></div><div class="dcQualityItem"><div><div class="dcQTitle">Account # Match</div><div class="dcQMeta">Same account number/client account number.</div></div><span class="dcPill green">Portfolio cleanup</span></div></div></div></div>';}
  function renderQuality(sc){var groups=[['Missing Phone',sc.quality.missingPhone,'red'],['Bad Phone',sc.quality.badPhones,'orange'],['Missing SSN',sc.quality.missingSSN,'gray'],['Missing DOB',sc.quality.missingDOB,'gray'],['Invalid Balance',sc.quality.invalidBalance,'red']];
    var rows=[];groups.forEach(function(g){g[1].forEach(function(a){var txt=g[0]+' '+name(a)+' '+acctNum(a)+' '+portfolio(a); if(filterText(txt))rows.push({type:g[0],cls:g[2],a:a});});});
    if(!rows.length)return '<div class="dcGood">No matching data quality issues found.</div>';
    return '<div class="dcPanel"><div class="dcPanelHead"><div><div class="dcPanelTitle">Data Quality Issues</div><div class="dcPanelSub">Bad records slow collectors down. Export this list or open accounts directly to fix them.</div></div></div><div class="dcPanelBody"><div class="dcTableWrap"><table class="dcTable"><thead><tr><th>Issue</th><th>Account</th><th>Portfolio</th><th>Balance</th><th>Phones</th><th>Action</th></tr></thead><tbody>'+rows.slice(0,800).map(function(r){return '<tr><td><span class="dcPill '+r.cls+'">'+esc(r.type)+'</span></td><td><b>'+esc(name(r.a))+'</b><div class="dcMini">#'+esc(acctNum(r.a)||r.a.id)+' · SSN '+esc(ssn(r.a)||'—')+' · DOB '+esc(dob(r.a)||'—')+'</div></td><td>'+esc(portfolio(r.a))+'</td><td>'+usd(bal(r.a))+'</td><td>'+esc(allPhones(r.a).join(', ')||'—')+'</td><td><button class="dcLink" onclick="openDataCleanupAccount(\''+esc(r.a.id)+'\')">Open</button></td></tr>';}).join('')+'</tbody></table></div><div class="dcMini">Showing up to 800 matching quality rows.</div></div></div>';}
  function renderPortfolio(sc){var rows=sc.portfolios.filter(function(p){return filterText(p.name);}); if(!rows.length)return '<div class="dcEmpty">No portfolios found.</div>';
    return '<div class="dcPanel"><div class="dcPanelHead"><div><div class="dcPanelTitle">Portfolio Import Summary</div><div class="dcPanelSub">Use this to judge import quality by source/portfolio.</div></div></div><div class="dcPanelBody"><div class="dcTableWrap"><table class="dcTable"><thead><tr><th>Portfolio / Source</th><th>Accounts</th><th>Total Balance</th><th>Duplicate Accounts</th><th>Missing Phones</th><th>Imported / Assigned By</th></tr></thead><tbody>'+rows.map(function(p){var by=Object.keys(p.importedBy||{}).sort(function(a,b){return p.importedBy[b]-p.importedBy[a];}).slice(0,3).map(function(k){return esc(k)+' ('+p.importedBy[k]+')';}).join('<br>');return '<tr><td><b>'+esc(p.name)+'</b></td><td>'+p.count+'</td><td><b>'+usd(p.balance)+'</b></td><td>'+p.duplicates+'</td><td>'+p.missingPhone+'</td><td>'+by+'</td></tr>';}).join('')+'</tbody></table></div></div></div>';}
  function renderMerge(sc){return '<div class="dcGrid"><div class="dcPanel"><div class="dcPanelHead"><div><div class="dcPanelTitle">Merge Tools</div><div class="dcPanelSub">Safe merge approach: keep one survivor account, mark the rest as Duplicate, and write activity history.</div></div></div><div class="dcPanelBody"><div class="dcWarn">This does not hard-delete records. It changes duplicate records to status <b>Duplicate</b> and logs what happened.</div><div class="dcQualityList"><div class="dcQualityItem"><div><div class="dcQTitle">1. Review duplicate group</div><div class="dcQMeta">Use Duplicate Groups tab and open the survivor account.</div></div></div><div class="dcQualityItem"><div><div class="dcQTitle">2. Merge group</div><div class="dcQMeta">The first account remains active. Other accounts are marked duplicate.</div></div></div><div class="dcQualityItem"><div><div class="dcQTitle">3. Export cleanup report</div><div class="dcQMeta">Keep CSV proof of what was found and cleaned.</div></div></div></div></div></div>'+renderSideHelp(sc)+'</div>';}
  async function patchAccount(id,body){return await dbFetch('/accounts?id=eq.'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify(body)});}
  async function doMarkGroup(index,merge){var sc=state.scan||scan(); var g=sc.duplicates[index]; if(!g)return alert('Duplicate group not found. Refresh and try again.'); if(!isAdmin())return alert('Admin only.'); var keep=g.items[0]; var dups=g.items.slice(1); if(!dups.length)return alert('Nothing to mark.'); var msg=(merge?'Merge':'Mark')+' '+dups.length+' duplicate account(s) into survivor '+name(keep)+'?'; if(!confirm(msg))return;
    try{setBusy(true,'Cleaning duplicates','Updating duplicate statuses...');
      for(var i=0;i<dups.length;i++){var a=dups[i]; await patchAccount(a.id,{status:'Duplicate',disposition:'Duplicate',updated_at:new Date().toISOString()}).catch(async function(){await patchAccount(a.id,{status:'Duplicate',updated_at:new Date().toISOString()});}); try{await insertActivity(a.id,merge?'Duplicate Merged':'Duplicate Marked','Marked as duplicate of '+name(keep)+' / '+(acctNum(keep)||keep.id),'');}catch(e){} }
      try{await insertActivity(keep.id,merge?'Duplicate Merge Survivor':'Duplicate Review','Kept as survivor for '+dups.length+' duplicate account(s). Match: '+g.type+' '+g.key,'');}catch(e){}
      if(typeof loadAccounts==='function')await loadAccounts(); state.scan=null; refreshDataCleanupDashboard(); alert('Cleanup complete. Duplicate records were marked.');
    }catch(e){alert('Cleanup failed: '+(e.message||String(e)));}finally{setBusy(false);}}
  function setBusy(show,t,x){try{if(typeof setGlobalBusy==='function')setGlobalBusy(show,t||'Working...',x||'Please wait...');}catch(e){}}
  function openAccount(id){try{currentAccountId=id;if(typeof render==='function')render();closeDataCleanupDashboard();}catch(e){alert('Could not open account: '+(e.message||String(e)));}}
  function csv(){var sc=state.scan||scan(); var rows=[['Section','Issue/Type','Match/Portfolio','Account Name','Account Number','Balance','Extra']]; sc.duplicates.forEach(function(g){g.items.forEach(function(a){rows.push(['Duplicate',g.type,g.key,name(a),acctNum(a),bal(a),portfolio(a)]);});}); Object.keys(sc.quality).forEach(function(k){sc.quality[k].forEach(function(a){rows.push(['Data Quality',k,'',name(a),acctNum(a),bal(a),portfolio(a)]);});}); sc.portfolios.forEach(function(p){rows.push(['Portfolio','Summary',p.name,'',p.count,p.balance,'Missing phones: '+p.missingPhone+'; duplicate accounts: '+p.duplicates]);}); var out=rows.map(function(r){return r.map(function(c){return '"'+String(c==null?'':c).replace(/"/g,'""')+'"';}).join(',');}).join('\n'); var blob=new Blob([out],{type:'text/csv'}); var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='co-pilot-data-cleanup-report.csv'; a.click(); setTimeout(function(){URL.revokeObjectURL(a.href);},1000);}
  window.openDataCleanupDashboard=async function(){if(!isAdmin())return alert('Admin only.'); ensurePage().classList.add('open'); try{if(!getAccounts().length && typeof loadAccounts==='function')await loadAccounts();}catch(e){} state.scan=null; refreshDataCleanupDashboard();};
  window.closeDataCleanupDashboard=function(){var el=document.getElementById('dataCleanupPage'); if(el)el.classList.remove('open');};
  window.refreshDataCleanupDashboard=function(){scan();render();};
  window.setDataCleanupTab=function(t){state.tab=t;render();};
  window.setDataCleanupSearch=function(q){state.search=q;render();};
  window.openDataCleanupAccount=openAccount;
  window.markDataCleanupDuplicates=function(i){doMarkGroup(i,false);};
  window.mergeDataCleanupGroup=function(i){doMarkGroup(i,true);};
  window.exportDataCleanupCSV=csv;
})();


// ===== communicationCenterTrackingScript =====
(function(){
  if(window.__COMMUNICATION_CENTER_TRACKING__)return; window.__COMMUNICATION_CENTER_TRACKING__=true;
  var commState={logs:[],filtered:[],currentAccountId:'',lastLoaded:false};
  function h(v){try{return (typeof esc==='function'?esc(v):String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]}));}catch(e){return String(v||'')}}
  function camel(row){try{return (typeof toCamel==='function')?toCamel(row):row}catch(e){return row||{}}}
  function currentEmail(){try{return String(currentUser&&currentUser.email||'').toLowerCase()}catch(e){return ''}}
  function isCommAdmin(){try{return !!(currentUser&&(currentUser.isAdmin||String(currentUser.role||'').toLowerCase()==='admin'||currentEmail()==='afinch2678@gmail.com'))}catch(e){return false}}
  function allAccounts(){try{return Array.isArray(accounts)?accounts:[]}catch(e){return []}}
  function acctById(id){id=String(id||'');return allAccounts().find(function(a){return String(a.id)===id})||null}
  function acctName(a){try{return a?(typeof nameOf==='function'?nameOf(a):(a.fullName||[a.firstName,a.lastName].filter(Boolean).join(' ')||'Account')):'General'}catch(e){return 'Account'}}
  function acctNum(a){try{return a?(typeof window.acctNo==='function'?acctNo(a):(a.accountNumber||a.clientAccountNumber||a.sourceAccountId||'')):''}catch(e){return ''}}
  function today(){return new Date().toISOString().slice(0,10)}
  function daysAgo(n){var d=new Date();d.setDate(d.getDate()-n);return d.toISOString().slice(0,10)}
  function val(id){var el=document.getElementById(id);return el?String(el.value||''):''}
  function setVal(id,v){var el=document.getElementById(id);if(el)el.value=v==null?'':String(v)}
  function normType(t){t=String(t||'').toLowerCase(); if(t.indexOf('cert')>=0)return 'certified'; if(t.indexOf('sms')>=0)return 'sms'; if(t.indexOf('email')>=0)return 'email'; return 'letter'}
  function parseType(log){var t=String(log.actionType||log.action_type||'').replace(/^Communication\s*-\s*/i,'');return t||'Communication'}
  function parseTextPart(text,key){var re=new RegExp(key+'\\s*:\\s*([^|]+)','i');var m=String(text||'').match(re);return m?m[1].trim():''}
  function logTypeClass(t){return normType(t)}
  function isCommLog(l){return /^Communication/i.test(String(l.actionType||l.action_type||''));}
  function ensurePage(){var el=document.getElementById('communicationCenterPage'); if(el)return el; el=document.createElement('div'); el.id='communicationCenterPage'; el.className='commPage'; document.body.appendChild(el); el.innerHTML='<div class="commShell"><div class="commHero"><div><div class="commTitle">Communication Center</div><div class="commSub">Track every debtor letter, email, SMS attempt, printed letter, mailed letter, certified mail number, result, and employee note. Records are saved into the account activity history.</div></div><div class="commActions"><button class="commRefresh" onclick="refreshCommunicationCenter()">Refresh</button><button class="commExport" onclick="exportCommunicationCenterCSV()">Export CSV</button><button class="commLogBtn" onclick="focusCommunicationLogForm()">Log Communication</button><button class="commBack" onclick="closeCommunicationCenter()">Back to Queue</button></div></div><div id="commNotice" class="commGood">Communication Center is open. Admin sees all logs; employees see their own saved communication activity.</div><div class="commStats" id="commStats"></div><div class="commGrid"><div><div class="commPanel"><div class="commPanelHead"><div><div class="commPanelTitle">Log Communication</div><div class="commPanelSub">Save manual letter, email, SMS, print, mail, or certified mail history.</div></div><span class="commType">Account timeline</span></div><div class="commPanelBody"><div id="commSelectedAccount" class="commSelectedAccount">No account selected. Open an account first or search below.</div><div class="commFormGrid"><div class="full"><label>Find Account</label><input id="commAccountSearch" placeholder="Search name, account number, phone, SSN" oninput="searchCommunicationAccounts(this.value)"><div id="commAccountResults" class="commAccountResults"></div></div><div><label>Type</label><select id="commType"><option>Letter</option><option>Email</option><option>SMS</option><option>Printed Letter</option><option>Mailed Letter</option><option>Certified Mail</option><option>Payoff Quote</option><option>Dispute Notice</option></select></div><div><label>Result</label><select id="commResult"><option>Logged</option><option>Printed</option><option>Sent</option><option>Mailed</option><option>Certified Sent</option><option>Opened</option><option>Bounced</option><option>Failed</option><option>Returned</option></select></div><div><label>Recipient / Address / Number</label><input id="commRecipient" placeholder="Email, phone, mailing address, or recipient"></div><div><label>Certified / Tracking #</label><input id="commCertified" placeholder="Optional certified mail or tracking number"></div><div class="full"><label>Subject / Template</label><input id="commSubject" placeholder="Example: Settlement Offer Letter, Verification Request, Payoff Quote"></div><div class="full"><label>Notes</label><textarea id="commNotes" placeholder="What was sent or logged? Include important details."></textarea></div></div><div class="commSaveRow"><button class="commClear" onclick="clearCommunicationForm()">Clear</button><button class="commSave" onclick="saveCommunicationLog()">Save Communication</button></div></div></div><div class="commRightTools"><div class="commPanel"><div class="commPanelHead"><div><div class="commPanelTitle">Employee Activity</div><div class="commPanelSub">Manual communication volume by user.</div></div></div><div class="commPanelBody"><div id="commEmployeeActivity" class="commEmpList"></div></div></div></div></div><div class="commPanel"><div class="commPanelHead"><div><div class="commPanelTitle">Communication History</div><div class="commPanelSub">Filter letter, email, SMS, printed, mailed, and certified mail records.</div></div></div><div class="commPanelBody"><div class="commFilters"><div><label>Start</label><input id="commStart" type="date" onchange="renderCommunicationCenter()"></div><div><label>End</label><input id="commEnd" type="date" onchange="renderCommunicationCenter()"></div><div><label>Type</label><select id="commFilterType" onchange="renderCommunicationCenter()"><option value="">All Types</option><option>Letter</option><option>Email</option><option>SMS</option><option>Printed Letter</option><option>Mailed Letter</option><option>Certified Mail</option></select></div><div><label>Employee</label><select id="commEmployee" onchange="renderCommunicationCenter()"><option value="">All Employees</option></select></div><div><label>Search</label><input id="commSearch" placeholder="Name, account, result, note" oninput="renderCommunicationCenter()"></div></div><div id="commTableBox"></div></div></div></div></div></div>'; return el;}
  function setSelectedAccount(id){commState.currentAccountId=String(id||''); var a=acctById(id); var box=document.getElementById('commSelectedAccount'); if(box){box.innerHTML=a?'<b>'+h(acctName(a))+'</b><br>#'+h(acctNum(a)||a.id)+' · '+h(a.portfolio||a.originalCreditor||''):'No account selected. This communication will be logged without an account link.';} }
  function openCurrentAccount(){try{var a=(typeof getCurrent==='function')?getCurrent():null; if(a&&a.id)setSelectedAccount(a.id);}catch(e){} }
  async function readLogs(){var rows=[]; try{rows=await dbFetch('/activity_logs?select=*&order=created_at.desc&limit=5000');}catch(e){var n=document.getElementById('commNotice'); if(n){n.className='commNotice'; n.textContent='Could not load activity_logs yet: '+(e.message||String(e));} rows=[];} rows=(rows||[]).map(camel).filter(isCommLog); if(!isCommAdmin()){var me=currentEmail(); rows=rows.filter(function(r){return String(r.createdByEmail||r.created_by_email||'').toLowerCase()===me;});} commState.logs=rows; commState.lastLoaded=true; return rows;}
  function filters(){return {start:val('commStart'),end:val('commEnd'),type:val('commFilterType'),employee:val('commEmployee').toLowerCase(),q:val('commSearch').toLowerCase()};}
  function applyFilters(rows){var f=filters(); return (rows||[]).filter(function(r){var created=String(r.createdAt||r.created_at||'').slice(0,10); var typ=parseType(r); var emp=String(r.createdByEmail||r.created_by_email||'').toLowerCase(); var a=acctById(r.accountId||r.account_id); var hay=[typ,r.actionText||r.action_text,r.phoneNumber||r.phone_number,emp,acctName(a),acctNum(a),a&&a.portfolio].join(' ').toLowerCase(); if(f.start&&created<f.start)return false; if(f.end&&created>f.end)return false; if(f.type&&typ!==f.type)return false; if(f.employee&&emp!==f.employee)return false; if(f.q&&hay.indexOf(f.q)<0)return false; return true;});}
  function renderEmployeeOptions(rows){var sel=document.getElementById('commEmployee'); if(!sel)return; var cur=sel.value||''; var set={}; (rows||[]).forEach(function(r){var e=String(r.createdByEmail||r.created_by_email||'').toLowerCase(); if(e)set[e]=true;}); sel.innerHTML='<option value="">All Employees</option>'+Object.keys(set).sort().map(function(e){return '<option value="'+h(e)+'">'+h(e)+'</option>';}).join(''); sel.value=cur;}
  function renderStats(rowsAll,rows){var now=today(); var month=now.slice(0,7); var byType={}; (rows||[]).forEach(function(r){var t=parseType(r); byType[t]=(byType[t]||0)+1;}); var printed=(rows||[]).filter(function(r){return /print/i.test(parseType(r)+' '+String(r.actionText||''));}).length; var mailed=(rows||[]).filter(function(r){return /mail|certified/i.test(parseType(r)+' '+String(r.actionText||''));}).length; var failed=(rows||[]).filter(function(r){return /failed|bounce|returned/i.test(String(r.actionText||''));}).length; var todayCount=(rows||[]).filter(function(r){return String(r.createdAt||'').slice(0,10)===now;}).length; var monthCount=(rows||[]).filter(function(r){return String(r.createdAt||'').slice(0,7)===month;}).length; var html=[['Total Logs',rows.length,'Filtered history'],['Today',todayCount,'Communication entries'],['This Month',monthCount,'Current month'],['Printed/Mailed',printed+' / '+mailed,'Letter workflow'],['Failed/Bounced',failed,'Needs review'],['Top Type',Object.keys(byType).sort(function(a,b){return byType[b]-byType[a];})[0]||'—','Most used']].map(function(x){return '<div class="commStat"><div class="commStatLabel">'+h(x[0])+'</div><div class="commStatValue">'+h(x[1])+'</div><div class="commStatSub">'+h(x[2])+'</div></div>';}).join(''); var box=document.getElementById('commStats'); if(box)box.innerHTML=html;}
  function renderEmployees(rows){var counts={}; (rows||[]).forEach(function(r){var e=String(r.createdByEmail||r.created_by_email||'unknown').toLowerCase(); counts[e]=(counts[e]||0)+1;}); var html=Object.keys(counts).sort(function(a,b){return counts[b]-counts[a];}).slice(0,8).map(function(e){return '<div class="commEmpItem"><div><div class="commEmpName">'+h(e)+'</div><div class="commEmpMeta">Letters, emails, SMS, mail, certified logs</div></div><div class="commEmpCount">'+counts[e]+'</div></div>';}).join('')||'<div class="commEmpty">No communication activity yet.</div>'; var box=document.getElementById('commEmployeeActivity'); if(box)box.innerHTML=html;}
  function renderTable(rows){var box=document.getElementById('commTableBox'); if(!box)return; if(!rows.length){box.innerHTML='<div class="commEmpty">No communication records match the current filters.</div>';return;} box.innerHTML='<div class="commTableWrap"><table class="commTable"><thead><tr><th>Date</th><th>Type</th><th>Account</th><th>Result / Recipient</th><th>Employee</th><th>Notes</th><th>Action</th></tr></thead><tbody>'+rows.slice(0,1000).map(function(r){var a=acctById(r.accountId||r.account_id); var typ=parseType(r); var text=String(r.actionText||r.action_text||''); var result=parseTextPart(text,'Result')||'Logged'; var recipient=parseTextPart(text,'Recipient')||String(r.phoneNumber||r.phone_number||''); var cert=parseTextPart(text,'Certified')||parseTextPart(text,'Tracking'); var subj=parseTextPart(text,'Subject'); return '<tr><td>'+h(String(r.createdAt||r.created_at||'').replace('T',' ').slice(0,19))+'</td><td><span class="commType '+logTypeClass(typ)+'">'+h(typ)+'</span></td><td><b>'+h(acctName(a))+'</b><div class="commMini">#'+h(acctNum(a)||(a&&a.id)||'—')+'</div></td><td><span class="commResult">'+h(result)+'</span><div class="commMini">'+h(recipient||'—')+(cert?'<br>Tracking: '+h(cert):'')+'</div></td><td>'+h(r.createdByEmail||r.created_by_email||'')+'</td><td>'+h(subj||text).slice(0,240)+'</td><td>'+(a?'<button class="commLink" onclick="openCommunicationAccount(\''+h(a.id)+'\')">Open</button>':'—')+'</td></tr>';}).join('')+'</tbody></table></div><div class="commMini">Showing up to 1,000 filtered communication rows.</div>';}
  window.renderCommunicationCenter=function(){var rowsAll=commState.logs||[]; renderEmployeeOptions(rowsAll); var rows=applyFilters(rowsAll); commState.filtered=rows; renderStats(rowsAll,rows); renderEmployees(rows); renderTable(rows);};
  window.refreshCommunicationCenter=async function(){ensurePage(); var n=document.getElementById('commNotice'); if(n){n.className='commGood';n.textContent='Loading communication history...';} await readLogs(); renderCommunicationCenter(); if(n){n.className='commGood';n.textContent='Communication history loaded. Admin sees all logs; employees see their own activity.';}};
  window.openCommunicationCenter=function(){ensurePage().classList.add('open'); if(!val('commStart'))setVal('commStart',daysAgo(30)); if(!val('commEnd'))setVal('commEnd',today()); if(!commState.currentAccountId)openCurrentAccount(); refreshCommunicationCenter();};
  window.openCommunicationCenterForCurrent=function(){ensurePage().classList.add('open'); openCurrentAccount(); focusCommunicationLogForm(); if(!commState.lastLoaded)refreshCommunicationCenter();};
  window.closeCommunicationCenter=function(){var el=document.getElementById('communicationCenterPage'); if(el)el.classList.remove('open');};
  window.focusCommunicationLogForm=function(){try{document.getElementById('commType').focus();}catch(e){}};
  window.clearCommunicationForm=function(){['commRecipient','commCertified','commSubject','commNotes','commAccountSearch'].forEach(function(id){setVal(id,'');}); var r=document.getElementById('commAccountResults'); if(r)r.innerHTML=''; openCurrentAccount();};
  window.searchCommunicationAccounts=function(q){var box=document.getElementById('commAccountResults'); if(!box)return; q=String(q||'').toLowerCase().trim(); if(q.length<2){box.innerHTML='';return;} var rows=allAccounts().filter(function(a){var hay=[acctName(a),acctNum(a),a.ssn,a.phone1,a.phone2,a.phone3,a.email,a.portfolio].join(' ').toLowerCase(); return hay.indexOf(q)>=0;}).slice(0,20); box.innerHTML=rows.map(function(a){return '<div class="commAccountSearchResult" onclick="setCommunicationAccount(\''+h(a.id)+'\')"><b>'+h(acctName(a))+'</b><div class="commMini">#'+h(acctNum(a)||a.id)+' · '+h(a.portfolio||a.originalCreditor||'')+'</div></div>';}).join('')||'<div class="commMini">No matching loaded accounts.</div>';};
  window.setCommunicationAccount=function(id){setSelectedAccount(id); setVal('commAccountSearch',''); var r=document.getElementById('commAccountResults'); if(r)r.innerHTML='';};
  window.saveCommunicationLog=async function(){var type=val('commType')||'Letter'; var result=val('commResult')||'Logged'; var recipient=val('commRecipient'); var cert=val('commCertified'); var subject=val('commSubject'); var notes=val('commNotes'); var accountId=commState.currentAccountId||''; var a=acctById(accountId); if(!a){try{var cur=(typeof getCurrent==='function')?getCurrent():null;if(cur&&cur.id){a=cur;accountId=cur.id;}}catch(e){}} if(!subject&&!notes&&!recipient&&!cert)return alert('Add a subject, recipient, tracking number, or note before saving.'); var text='Type: '+type+' | Result: '+result+(recipient?' | Recipient: '+recipient:'')+(cert?' | Certified/Tracking: '+cert:'')+(subject?' | Subject: '+subject:'')+(notes?' | Notes: '+notes:''); var row={account_id:accountId||null,action_type:'Communication - '+type,action_text:text,phone_number:recipient||'',created_by_email:currentEmail()}; try{await dbFetch('/activity_logs',{method:'POST',body:JSON.stringify([row])}); if(typeof insertAudit==='function')await insertAudit('Communication Logged',type+' '+result+(a?' for '+acctName(a):''),'account',accountId||'').catch(function(){}); if(a&&typeof insertActivity==='function'){} try{if(typeof render==='function')render();}catch(e){} clearCommunicationForm(); await refreshCommunicationCenter(); alert('Communication saved.');}catch(e){alert('Could not save communication: '+(e.message||String(e)));}};
  window.openCommunicationAccount=function(id){try{currentAccountId=id;if(typeof render==='function')render();closeCommunicationCenter();}catch(e){alert('Could not open account: '+(e.message||String(e)));}};
  window.exportCommunicationCenterCSV=function(){var rows=commState.filtered&&commState.filtered.length?commState.filtered:applyFilters(commState.logs||[]); var out=[['Date','Type','Account','Account Number','Result','Recipient','Certified/Tracking','Subject','Employee','Notes']]; rows.forEach(function(r){var a=acctById(r.accountId||r.account_id); var text=String(r.actionText||r.action_text||''); out.push([String(r.createdAt||r.created_at||'').slice(0,19),parseType(r),acctName(a),acctNum(a),parseTextPart(text,'Result'),parseTextPart(text,'Recipient')||String(r.phoneNumber||r.phone_number||''),parseTextPart(text,'Certified/Tracking')||parseTextPart(text,'Tracking'),parseTextPart(text,'Subject'),String(r.createdByEmail||r.created_by_email||''),parseTextPart(text,'Notes')||text]);}); var csv=out.map(function(row){return row.map(function(c){return '"'+String(c==null?'':c).replace(/"/g,'""')+'"';}).join(',');}).join('\n'); var blob=new Blob([csv],{type:'text/csv'}); var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='co-pilot-communication-history.csv'; a.click(); setTimeout(function(){URL.revokeObjectURL(a.href);},1000);};
})();


// ===== importHistoryRollbackScript =====
(function(){
  if(window.__IMPORT_HISTORY_ROLLBACK__)return; window.__IMPORT_HISTORY_ROLLBACK__=true;
  var IH_KEY='coPilotImportBatches_v1';
  var ihState={batches:[],selectedId:'',filtered:[]};
  function h(v){try{return (typeof esc==='function'?esc(v):String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]}));}catch(e){return String(v||'')}}
  function currentEmail(){try{return String(currentUser&&currentUser.email||'').toLowerCase()}catch(e){return ''}}
  function isImportAdmin(){try{return !!(currentUser&&(currentUser.isAdmin||String(currentUser.role||'').toLowerCase()==='admin'||currentEmail()==='afinch2678@gmail.com'))}catch(e){return false}}
  function allAccounts(){try{return Array.isArray(accounts)?accounts:[]}catch(e){return []}}
  function raw(a){try{return (typeof rawObj==='function'?rawObj(a):(a.rawData||a.raw_data||{}))||{}}catch(e){return {}}}
  function acctName(a){try{return a?(typeof nameOf==='function'?nameOf(a):(a.fullName||[a.firstName,a.lastName].filter(Boolean).join(' ')||'Account')):'Account'}catch(e){return 'Account'}}
  function acctNum(a){try{return a?(typeof window.acctNo==='function'?acctNo(a):(a.accountNumber||a.clientAccountNumber||a.sourceAccountId||'')):''}catch(e){return ''}}
  function moneyVal(v){try{return typeof moneyNum==='function'?moneyNum(v):Number(String(v||'').replace(/[^0-9.-]/g,''))||0}catch(e){return 0}}
  function fmtMoney(v){try{return typeof money==='function'?money(v):Number(v||0).toLocaleString('en-US',{style:'currency',currency:'USD'})}catch(e){return '$0.00'}}
  function acctBalance(a){try{return typeof accountBalance==='function'?accountBalance(a):moneyVal(a.currentBalance||a.current_balance||a.principal||a.originalBalance)}catch(e){return 0}}
  function normPhoneImport(p){try{return typeof normPhone==='function'?normPhone(p):String(p||'').replace(/\D/g,'')}catch(e){return ''}}
  function batchIdFromAccount(a){var r=raw(a)||{};return String(r._co_pilot_import_batch_id||r.co_pilot_import_batch_id||r.import_batch_id||a.importBatchId||a.import_batch_id||'')}
  function fileFromAccount(a){var r=raw(a)||{};return String(r._co_pilot_import_batch_file||r.co_pilot_import_batch_file||r.source_file||a.importFileName||'')}
  function uploadedAtFromAccount(a){var r=raw(a)||{};return String(r._co_pilot_import_batch_uploaded_at||r.co_pilot_import_batch_uploaded_at||a.importedAt||a.createdAt||a.created_at||'')}
  function uploadedByFromAccount(a){var r=raw(a)||{};return String(r._co_pilot_import_batch_uploaded_by||r.co_pilot_import_batch_uploaded_by||a.createdByEmail||a.created_by_email||'')}
  function readStore(){try{return JSON.parse(localStorage.getItem(IH_KEY)||'[]')||[]}catch(e){return []}}
  function writeStore(rows){try{localStorage.setItem(IH_KEY,JSON.stringify((rows||[]).slice(0,500)))}catch(e){}}
  function saveBatchMeta(meta){if(!meta||!meta.id)return; var rows=readStore().filter(function(x){return String(x.id)!==String(meta.id)}); rows.unshift(meta); writeStore(rows);}
  function buildBatchFromPending(){var id='IMP-'+new Date().toISOString().replace(/[-:.TZ]/g,'').slice(0,14)+'-'+Math.random().toString(36).slice(2,7).toUpperCase();return {id:id,fileName:(pendingImport&&pendingImport.fileName)||'Imported CSV',uploadedAt:new Date().toISOString(),uploadedBy:currentEmail(),totalRows:(pendingImport&&pendingImport.rows&&pendingImport.rows.length)||0,importedRows:0,skippedRows:0,goodRows:0,duplicateRows:0,missingPhoneRows:0,missingSsnRows:0,missingDobRows:0,totalBalance:0,portfolio:'',insertMode:'full',status:'Imported'};}
  function duplicateKeysForRows(rows){var seenAcct={},seenSsn={},seenPhone={},dups=0; (rows||[]).forEach(function(r){var acct=String(r.account_number||'').trim().toLowerCase(); var ssn=String(r.ssn||'').replace(/\D/g,''); var ph=normPhoneImport(r.phone1||r.phone2||r.phone3||'').slice(-10); var hit=false; if(acct){if(seenAcct[acct])hit=true;seenAcct[acct]=1;} if(ssn){if(seenSsn[ssn])hit=true;seenSsn[ssn]=1;} if(ph){if(seenPhone[ph])hit=true;seenPhone[ph]=1;} if(hit)dups++;}); return dups;}
  window.coPilotBuildImportBatchMeta=buildBatchFromPending;
  window.coPilotSaveImportBatchMeta=saveBatchMeta;
  window.coPilotDuplicateRowsForImport=duplicateKeysForRows;
  function inferLegacyBatches(){var grouped={}; allAccounts().forEach(function(a){var id=batchIdFromAccount(a); if(!id){id='LEGACY-'+String(a.portfolio||a.originalCreditor||a.accountDescription||'Unknown Portfolio').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').slice(0,40).toUpperCase();} if(!grouped[id])grouped[id]={id:id,fileName:fileFromAccount(a)||String(a.portfolio||a.originalCreditor||a.accountDescription||'Legacy / Unknown Import'),uploadedAt:uploadedAtFromAccount(a)||String(a.createdAt||a.created_at||''),uploadedBy:uploadedByFromAccount(a)||String(a.createdByEmail||a.created_by_email||''),totalRows:0,importedRows:0,skippedRows:0,goodRows:0,duplicateRows:0,missingPhoneRows:0,missingSsnRows:0,missingDobRows:0,totalBalance:0,portfolio:String(a.portfolio||a.originalCreditor||a.accountDescription||''),insertMode:'inferred',status:id.indexOf('LEGACY-')===0?'Legacy / Inferred':'Imported'}; var g=grouped[id]; g.importedRows++; g.goodRows++; g.totalRows=Math.max(g.totalRows,g.importedRows); g.totalBalance+=acctBalance(a); if(!(a.phone1||a.phone2||a.phone3||a.phone4||a.phone5||a.phone6))g.missingPhoneRows++; if(!String(a.ssn||'').replace(/\D/g,''))g.missingSsnRows++; if(!String(a.dob||'').trim())g.missingDobRows++;}); return Object.values(grouped);}
  function getBatches(){var stored=readStore(); var inferred=inferLegacyBatches(); var map={}; inferred.forEach(function(b){map[String(b.id)]=b;}); stored.forEach(function(b){var inf=map[String(b.id)]||{}; map[String(b.id)]={...inf,...b,importedRows:inf.importedRows||b.importedRows||0,totalBalance:inf.totalBalance||b.totalBalance||0,missingPhoneRows:inf.missingPhoneRows||b.missingPhoneRows||0,missingSsnRows:inf.missingSsnRows||b.missingSsnRows||0,missingDobRows:inf.missingDobRows||b.missingDobRows||0};}); return Object.values(map).sort(function(a,b){return String(b.uploadedAt||'').localeCompare(String(a.uploadedAt||''));});}
  function accountsForBatch(id){id=String(id||''); return allAccounts().filter(function(a){var bid=batchIdFromAccount(a); if(bid)return String(bid)===id; var legacy='LEGACY-'+String(a.portfolio||a.originalCreditor||a.accountDescription||'Unknown Portfolio').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').slice(0,40).toUpperCase(); return legacy===id;});}
  function ensurePage(){var el=document.getElementById('importHistoryPage'); if(el)return el; el=document.createElement('div'); el.id='importHistoryPage'; el.className='importPage'; document.body.appendChild(el); el.innerHTML='<div class="importShell"><div class="importHero"><div><div class="importTitle">Import History + Rollback</div><div class="importSub">Admin-only control center for uploaded portfolios. Review CSV batch totals, quality counts, imported accounts, rollback a bad file, hard-delete a mistaken batch, and export proof of what was uploaded.</div></div><div class="importActions"><button class="importRefresh" onclick="refreshImportHistory()">Refresh</button><button class="importExport" onclick="exportImportHistoryCSV()">Export CSV</button><button class="importBack" onclick="closeImportHistoryPage()">Back to Queue</button></div></div><div id="importNotice" class="importGood">Import History is ready. New uploads are tagged with a batch ID inside the account source fields.</div><div id="importStats" class="importStats"></div><div class="importGrid"><div class="importPanel"><div class="importPanelHead"><div><div class="importPanelTitle">Import Batches</div><div class="importPanelSub">Select a batch to review accounts and rollback options.</div></div></div><div class="importPanelBody"><div class="importFilters"><div class="full"><label>Search</label><input id="importSearch" placeholder="File, portfolio, batch ID, uploader" oninput="renderImportHistory()"></div><div><label>Status</label><select id="importStatusFilter" onchange="renderImportHistory()"><option value="">All</option><option>Imported</option><option>Legacy</option><option>Rolled Back</option></select></div><div><label>Sort</label><select id="importSort" onchange="renderImportHistory()"><option value="newest">Newest</option><option value="balance">Highest Balance</option><option value="rows">Most Rows</option><option value="quality">Most Issues</option></select></div></div><div id="importBatchList" class="importBatchList"></div></div></div><div class="importPanel"><div class="importPanelHead"><div><div class="importPanelTitle" id="importDetailTitle">Batch Details</div><div class="importPanelSub" id="importDetailSub">Choose an import batch on the left.</div></div></div><div class="importPanelBody" id="importDetailBody"><div class="importEmpty">Select an import batch to view accounts.</div></div></div></div></div>'; return el;}
  function stats(batches){var totalAccounts=allAccounts().length; var totalBatches=batches.length; var totalBalance=batches.reduce(function(s,b){return s+moneyVal(b.totalBalance);},0); var issues=batches.reduce(function(s,b){return s+Number(b.missingPhoneRows||0)+Number(b.missingSsnRows||0)+Number(b.missingDobRows||0)+Number(b.duplicateRows||0);},0); var rolled=batches.filter(function(b){return /rolled/i.test(String(b.status||''));}).length; var newest=batches[0]&&batches[0].uploadedAt?String(batches[0].uploadedAt).slice(0,10):'—'; var html=[['Import Batches',totalBatches,'CSV uploads tracked'],['Loaded Accounts',totalAccounts,'Current queue/database'],['Total Balance',fmtMoney(totalBalance),'Across imports'],['Quality Issues',issues,'Missing/duplicate warnings'],['Rolled Back',rolled,'Safe rollback records'],['Newest Import',newest,'Latest upload']].map(function(x){return '<div class="importStat"><div class="importStatLabel">'+h(x[0])+'</div><div class="importStatValue">'+h(x[1])+'</div><div class="importStatSub">'+h(x[2])+'</div></div>';}).join(''); var box=document.getElementById('importStats'); if(box)box.innerHTML=html;}
  function filters(){return {q:String((document.getElementById('importSearch')||{}).value||'').toLowerCase().trim(),status:String((document.getElementById('importStatusFilter')||{}).value||''),sort:String((document.getElementById('importSort')||{}).value||'newest')}}
  function filteredBatches(){var f=filters(); var rows=(ihState.batches||[]).filter(function(b){var hay=[b.id,b.fileName,b.portfolio,b.uploadedBy,b.status].join(' ').toLowerCase(); if(f.q&&hay.indexOf(f.q)<0)return false; if(f.status&&String(b.status||'').toLowerCase().indexOf(f.status.toLowerCase())<0)return false; return true;}); rows.sort(function(a,b){if(f.sort==='balance')return moneyVal(b.totalBalance)-moneyVal(a.totalBalance); if(f.sort==='rows')return Number(b.importedRows||0)-Number(a.importedRows||0); if(f.sort==='quality')return (Number(b.missingPhoneRows||0)+Number(b.missingSsnRows||0)+Number(b.missingDobRows||0)+Number(b.duplicateRows||0))-(Number(a.missingPhoneRows||0)+Number(a.missingSsnRows||0)+Number(a.missingDobRows||0)+Number(a.duplicateRows||0)); return String(b.uploadedAt||'').localeCompare(String(a.uploadedAt||''));}); return rows;}
  function renderBatchList(rows){var box=document.getElementById('importBatchList'); if(!box)return; if(!rows.length){box.innerHTML='<div class="importEmpty">No import batches match the current filters.</div>';return;} box.innerHTML=rows.map(function(b){var issues=Number(b.missingPhoneRows||0)+Number(b.missingSsnRows||0)+Number(b.missingDobRows||0)+Number(b.duplicateRows||0);return '<div class="importBatchCard '+(String(ihState.selectedId)===String(b.id)?'active':'')+'" onclick="selectImportBatch(\''+h(b.id)+'\')"><div class="importBatchTitle">'+h(b.fileName||b.portfolio||b.id)+'</div><div class="importBatchMeta">Batch: '+h(b.id)+'<br>'+h(String(b.uploadedAt||'').replace('T',' ').slice(0,19)||'—')+' · '+h(b.uploadedBy||'unknown')+'</div><span class="importPill green">'+h(b.importedRows||0)+' accounts</span><span class="importPill">'+h(fmtMoney(b.totalBalance||0))+'</span><span class="importPill '+(issues?'orange':'gray')+'">'+h(issues)+' issues</span><span class="importPill '+(/rolled/i.test(String(b.status||''))?'red':'gray')+'">'+h(b.status||'Imported')+'</span></div>';}).join('');}
  function renderDetail(){var box=document.getElementById('importDetailBody'); var title=document.getElementById('importDetailTitle'); var sub=document.getElementById('importDetailSub'); if(!box)return; var b=(ihState.batches||[]).find(function(x){return String(x.id)===String(ihState.selectedId)}); if(!b){box.innerHTML='<div class="importEmpty">Select an import batch to view accounts.</div>'; if(title)title.textContent='Batch Details'; if(sub)sub.textContent='Choose an import batch on the left.'; return;} var rows=accountsForBatch(b.id); if(title)title.textContent=b.fileName||b.portfolio||b.id; if(sub)sub.textContent='Batch '+b.id+' · '+rows.length+' loaded accounts'; var dupeCount=Number(b.duplicateRows||0), issues=Number(b.missingPhoneRows||0)+Number(b.missingSsnRows||0)+Number(b.missingDobRows||0)+dupeCount; var buttons='<div class="importActionRow"><button class="importOpen" onclick="exportSelectedImportBatchCSV()">Export Batch Accounts</button><button class="importArchive" onclick="rollbackImportBatch(\''+h(b.id)+'\')">Rollback / Hide Batch</button><button class="importDelete" onclick="hardDeleteImportBatch(\''+h(b.id)+'\')">Hard Delete Batch</button></div>'; var summary='<div class="importStats" style="grid-template-columns:repeat(4,1fr)"><div class="importStat"><div class="importStatLabel">Imported</div><div class="importStatValue">'+h(rows.length||b.importedRows||0)+'</div><div class="importStatSub">Accounts in batch</div></div><div class="importStat"><div class="importStatLabel">Balance</div><div class="importStatValue">'+h(fmtMoney(rows.reduce(function(s,a){return s+acctBalance(a)},0)||b.totalBalance))+'</div><div class="importStatSub">Current loaded balance</div></div><div class="importStat"><div class="importStatLabel">Issues</div><div class="importStatValue">'+h(issues)+'</div><div class="importStatSub">Missing/duplicate flags</div></div><div class="importStat"><div class="importStatLabel">Status</div><div class="importStatValue">'+h(b.status||'Imported')+'</div><div class="importStatSub">Batch state</div></div></div>'; var warn='<div class="importNotice">Rollback marks accounts as <b>Rolled Back</b> so they leave normal work queues without destroying history. Hard Delete removes accounts from the database and should only be used for mistaken uploads.</div>'; var table=rows.length?'<div class="importTableWrap"><table class="importTable"><thead><tr><th>Name</th><th>Account #</th><th>Portfolio</th><th>Balance</th><th>Status</th><th>Phone</th><th>Quality</th><th>Action</th></tr></thead><tbody>'+rows.slice(0,1200).map(function(a){var missing=[]; if(!(a.phone1||a.phone2||a.phone3||a.phone4||a.phone5||a.phone6))missing.push('No phone'); if(!String(a.ssn||'').replace(/\D/g,''))missing.push('No SSN'); if(!String(a.dob||'').trim())missing.push('No DOB'); if(acctBalance(a)<0)missing.push('Bad balance'); return '<tr><td><b>'+h(acctName(a))+'</b><div class="importMini">'+h(a.address||'')+'</div></td><td>'+h(acctNum(a)||a.id)+'</td><td>'+h(a.portfolio||a.originalCreditor||'')+'</td><td>'+h(fmtMoney(acctBalance(a)))+'</td><td><span class="importPill '+(/rolled|duplicate/i.test(String(a.status||a.disposition||''))?'red':'gray')+'">'+h(a.status||a.disposition||'New')+'</span></td><td>'+h(a.phone1||a.phone2||a.phone3||'—')+'</td><td>'+h(missing.join(', ')||'OK')+'</td><td><button class="importOpen" onclick="openImportAccount(\''+h(a.id)+'\')">Open</button></td></tr>';}).join('')+'</tbody></table></div><div class="importMini">Showing up to 1,200 accounts from this batch.</div>':'<div class="importEmpty">No currently loaded accounts are tagged to this batch. This may be a legacy batch or it was already rolled back/deleted.</div>'; var danger='<div class="importDangerZone"><div class="importDangerTitle">Admin danger zone</div><div class="importDangerText">Rollback is safer than delete. Use Hard Delete only when a CSV was uploaded by mistake and you do not need the account records.</div></div>'; box.innerHTML=summary+buttons+warn+table+danger;}
  window.renderImportHistory=function(){ihState.filtered=filteredBatches(); stats(ihState.batches); renderBatchList(ihState.filtered); renderDetail();};
  window.refreshImportHistory=async function(){ensurePage(); var n=document.getElementById('importNotice'); if(n){n.className='importGood';n.textContent='Refreshing import history...';} try{if(!allAccounts().length && typeof loadAccounts==='function')await loadAccounts();}catch(e){} ihState.batches=getBatches(); if(!ihState.selectedId&&ihState.batches[0])ihState.selectedId=ihState.batches[0].id; renderImportHistory(); if(n){n.className='importGood';n.textContent='Import History loaded. New CSV imports will now be tagged with a batch ID automatically.';}};
  window.openImportHistoryPage=function(){if(!isImportAdmin())return alert('Admin only.'); ensurePage().classList.add('open'); refreshImportHistory();};
  window.closeImportHistoryPage=function(){var el=document.getElementById('importHistoryPage'); if(el)el.classList.remove('open');};
  window.selectImportBatch=function(id){ihState.selectedId=id; renderImportHistory();};
  window.openImportAccount=function(id){try{currentAccountId=id;if(typeof render==='function')render();closeImportHistoryPage();}catch(e){alert('Could not open account: '+(e.message||String(e)));}};
  window.exportImportHistoryCSV=function(){var batches=ihState.filtered&&ihState.filtered.length?ihState.filtered:getBatches(); var out=[['batch_id','file_name','uploaded_at','uploaded_by','portfolio','imported_rows','skipped_rows','missing_phone','missing_ssn','missing_dob','duplicate_rows','total_balance','status']]; batches.forEach(function(b){out.push([b.id,b.fileName,b.uploadedAt,b.uploadedBy,b.portfolio,b.importedRows,b.skippedRows,b.missingPhoneRows,b.missingSsnRows,b.missingDobRows,b.duplicateRows,b.totalBalance,b.status]);}); var csv=out.map(function(r){return r.map(function(c){return '"'+String(c==null?'':c).replace(/"/g,'""')+'"';}).join(',');}).join('\n'); var blob=new Blob([csv],{type:'text/csv'}); var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='co-pilot-import-history.csv'; a.click(); setTimeout(function(){URL.revokeObjectURL(a.href);},1000);};
  window.exportSelectedImportBatchCSV=function(){var rows=accountsForBatch(ihState.selectedId); var out=[['batch_id','name','account_number','portfolio','balance','status','phone1','phone2','ssn','dob','address','city','state','zip']]; rows.forEach(function(a){out.push([ihState.selectedId,acctName(a),acctNum(a),a.portfolio||a.originalCreditor||'',acctBalance(a),a.status||a.disposition||'',a.phone1||'',a.phone2||'',a.ssn||'',a.dob||'',a.address||'',a.city||'',a.state||'',a.zip||'']);}); var csv=out.map(function(r){return r.map(function(c){return '"'+String(c==null?'':c).replace(/"/g,'""')+'"';}).join(',');}).join('\n'); var blob=new Blob([csv],{type:'text/csv'}); var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='co-pilot-import-batch-'+String(ihState.selectedId||'accounts')+'.csv'; a.click(); setTimeout(function(){URL.revokeObjectURL(a.href);},1000);};
  async function patchIds(ids,body){for(var i=0;i<ids.length;i+=80){var chunk=ids.slice(i,i+80); await dbFetch('/accounts?id=in.('+chunk.map(encodeURIComponent).join(',')+')',{method:'PATCH',body:JSON.stringify(body)});}}
  async function deleteIds(ids){for(var i=0;i<ids.length;i+=80){var chunk=ids.slice(i,i+80); await dbFetch('/accounts?id=in.('+chunk.map(encodeURIComponent).join(',')+')',{method:'DELETE'});}}
  window.rollbackImportBatch=async function(id){if(!isImportAdmin())return alert('Admin only.'); var rows=accountsForBatch(id); if(!rows.length)return alert('No loaded accounts found for this batch.'); if(!confirm('Rollback this entire import batch?\n\nThis will mark '+rows.length+' accounts as Rolled Back and remove them from normal work queues.'))return; try{if(typeof setGlobalBusy==='function')setGlobalBusy(true,'Rolling back import','Marking accounts as Rolled Back...'); await patchIds(rows.map(function(a){return a.id}),{status:'Rolled Back',disposition:'Rolled Back',updated_at:new Date().toISOString()}); var store=readStore().map(function(b){if(String(b.id)===String(id))return {...b,status:'Rolled Back',rolledBackAt:new Date().toISOString(),rolledBackBy:currentEmail()};return b;}); writeStore(store); try{if(typeof insertAudit==='function')await insertAudit('Import Batch Rolled Back','Rolled back '+rows.length+' accounts from batch '+id,'import_batch',id);}catch(e){} await loadAccounts(); ihState.batches=getBatches(); renderImportHistory(); alert('Rollback complete. '+rows.length+' accounts marked Rolled Back.');}catch(e){alert('Rollback failed: '+(e.message||String(e)));}finally{try{if(typeof setGlobalBusy==='function')setGlobalBusy(false)}catch(e){}}};
  window.hardDeleteImportBatch=async function(id){if(!isImportAdmin())return alert('Admin only.'); var rows=accountsForBatch(id); if(!rows.length)return alert('No loaded accounts found for this batch.'); var phrase=prompt('Hard delete '+rows.length+' accounts from this import batch?\n\nType DELETE to confirm.'); if(phrase!=='DELETE')return; try{if(typeof setGlobalBusy==='function')setGlobalBusy(true,'Deleting import batch','Removing accounts from database...'); await deleteIds(rows.map(function(a){return a.id})); var store=readStore().map(function(b){if(String(b.id)===String(id))return {...b,status:'Deleted',deletedAt:new Date().toISOString(),deletedBy:currentEmail(),importedRows:0};return b;}); writeStore(store); try{if(typeof insertAudit==='function')await insertAudit('Import Batch Deleted','Hard deleted '+rows.length+' accounts from batch '+id,'import_batch',id);}catch(e){} await loadAccounts(); ihState.batches=getBatches(); ihState.selectedId=''; renderImportHistory(); alert('Hard delete complete. '+rows.length+' accounts removed.');}catch(e){alert('Hard delete failed: '+(e.message||String(e)));}finally{try{if(typeof setGlobalBusy==='function')setGlobalBusy(false)}catch(e){}}};
})();


// ===== settlementWorkflowApprovalScript =====
(function(){
  if(window.__coPilotSettlementWorkflowApproval) return;
  window.__coPilotSettlementWorkflowApproval = true;

  function sEl(id){return document.getElementById(id)}
  function sVal(id){var e=sEl(id);return e?String(e.value||'').trim():''}
  function sEsc(v){try{return esc(v)}catch(e){return String(v==null?'':v).replace(/[&<>\"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}}
  function sNum(v){try{return moneyNum(v)}catch(e){var n=parseFloat(String(v||'').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:0}}
  function sMoney(v){try{return money(v)}catch(e){return '$'+sNum(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}}
  function sToday(){try{return todayISO()}catch(e){return new Date().toISOString().slice(0,10)}}
  function sAddDays(days){try{return addDaysISO(sToday(),days)}catch(e){var d=new Date();d.setDate(d.getDate()+days);return d.toISOString().slice(0,10)}}
  function sName(a){try{return nameOf(a)}catch(e){return a?.fullName||a?.full_name||a?.debtor_name||'Account'}}
  function sAcct(a){try{return acctNo(a)}catch(e){return a?.accountNumber||a?.account_number||''}}
  function sBalance(a){try{return accountBalance(a)}catch(e){return sNum(a?.currentBalance||a?.current_balance||a?.balance||a?.originalBalance||a?.original_balance)}}
  function sCurrent(){try{return getCurrent()}catch(e){return null}}
  function sAccountById(id){try{return accountById(id)}catch(e){return (window.accounts||[]).find(function(a){return String(a.id)===String(id)})}}
  function sEmail(){try{return String(currentUser?.email||'').toLowerCase().trim()}catch(e){return ''}}
  function isSettlementAdmin(){
    try{
      var email=sEmail();
      var role=String(currentUser?.role||'').toLowerCase();
      var badge=String(sEl('roleBadge')?.textContent||'').toLowerCase();
      return email==='afinch2678@gmail.com' || currentUser?.isAdmin===true || role==='admin' || badge.includes('admin');
    }catch(e){return false;}
  }
  function sStatusClass(status){
    var s=String(status||'Pending Approval').toLowerCase();
    if(s.includes('approved')||s.includes('paid')) return 'settleGreen';
    if(s.includes('reject')||s.includes('broken')) return 'settleRed';
    if(s.includes('pending')) return 'settleOrange';
    return 'settleBlue';
  }
  function normalizeSettlement(r){
    if(!r) return null;
    var o = (typeof toCamel==='function') ? toCamel(r) : r;
    o.id = o.id || r.id;
    o.accountId = o.accountId || o.account_id;
    o.settlementAmount = sNum(o.settlementAmount ?? o.settlement_amount);
    o.settlementPercent = sNum(o.settlementPercent ?? o.settlement_percent);
    o.balance = sNum(o.balance);
    o.dueDate = o.dueDate || o.due_date || '';
    o.paymentType = o.paymentType || o.payment_type || 'Lump Sum';
    o.status = o.status || 'Pending Approval';
    o.notes = o.notes || '';
    o.createdByEmail = o.createdByEmail || o.created_by_email || '';
    o.createdAt = o.createdAt || o.created_at || '';
    o.updatedAt = o.updatedAt || o.updated_at || '';
    return o;
  }
  function settlementAccountMap(){var m={};(window.accounts||[]).forEach(function(a){m[String(a.id)]=a});return m;}
  async function settlementFetchAll(){
    if(typeof dbFetch!=='function') return [];
    try{return (await dbFetch('/settlements?select=*&order=created_at.desc&limit=2000')).map(normalizeSettlement)}catch(e){console.warn('settlements load failed',e);return []}
  }
  async function settlementFetchForAccount(accountId){
    if(!accountId || typeof dbFetch!=='function') return [];
    try{return (await dbFetch('/settlements?account_id=eq.'+encodeURIComponent(accountId)+'&select=*&order=created_at.desc&limit=20')).map(normalizeSettlement)}catch(e){return []}
  }
  async function settlementActivity(accountId,type,text){try{if(typeof insertActivity==='function')await insertActivity(accountId,type,text)}catch(e){} try{if(typeof insertAudit==='function')await insertAudit(type,text,'settlement',String(accountId||''))}catch(e){}}

  function ensureSettlementStyles(){
    if(sEl('settlementWorkflowStyles')) return;
    var style=document.createElement('style');
    style.id='settlementWorkflowStyles';
    style.textContent = `
      .settlementAccountPanel{grid-column:1/-1;background:#fff;border:1px solid #dbe3ef;border-radius:16px;box-shadow:0 2px 10px rgba(15,23,42,.035);padding:14px 16px;min-width:0}
      .settleTop{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}.settleTitle{font-size:16px;font-weight:1000;color:#0f172a}.settleSub{font-size:12px;color:#64748b;margin-top:4px}.settleActions{display:flex;gap:8px;flex-wrap:wrap}.settleActions button{height:34px;border-radius:9px;padding:0 10px;font-size:12px}
      .settleMetrics{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;margin-top:12px}.settleMetric{border:1px solid #e2e8f0;background:#f8fbff;border-radius:12px;padding:9px}.settleLabel{font-size:10px;text-transform:uppercase;font-weight:1000;color:#64748b;letter-spacing:.03em}.settleValue{font-size:14px;font-weight:1000;color:#0f172a;margin-top:4px;overflow-wrap:anywhere}.settlePill{display:inline-block;border-radius:999px;padding:4px 8px;font-size:11px;font-weight:1000}.settleGreen{background:#dcfce7;color:#166534}.settleRed{background:#fee2e2;color:#991b1b}.settleOrange{background:#fff7ed;color:#9a3412}.settleBlue{background:#eef2ff;color:#1d4ed8}.settleNote{margin-top:10px;border:1px solid #edf2f8;background:#f8fafc;border-radius:12px;padding:9px;font-size:12px;color:#475569;line-height:1.35}
      #settlementApprovalPage{position:fixed;inset:0;background:#eef3f9;z-index:61000;display:none;color:#0f172a;font-family:Arial,Helvetica,sans-serif;overflow:hidden}#settlementApprovalPage.open{display:flex;flex-direction:column}
      .settlePageTop{height:68px;background:linear-gradient(90deg,#05225f,#0b45c6);color:#fff;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 18px;box-shadow:0 6px 20px rgba(15,23,42,.2)}.settlePageTitle{font-size:20px;font-weight:1000}.settlePageSub{font-size:12px;color:#dbeafe;margin-top:3px}.settlePageActions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.settlePageActions button{height:38px;border:0;border-radius:10px;padding:0 12px;font-weight:900;cursor:pointer;background:#2563eb;color:white}.settlePageActions .outline{background:white;color:#1d4ed8}.settlePageActions .green{background:#16a34a}.settlePageActions .red{background:#dc2626}.settlePageActions .gray{background:#334155}
      .settlePageBody{padding:16px;overflow:auto}.settleNotice{border:1px solid #bfdbfe;background:#eff6ff;color:#1e3a8a;border-radius:14px;padding:10px 12px;font-size:13px;font-weight:850;margin-bottom:12px}.settleFilters{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-bottom:12px}.settleFilters label{font-size:11px;font-weight:900;color:#334155;margin-bottom:4px;display:block}.settleFilters input,.settleFilters select{height:38px;border:1px solid #cbd5e1;border-radius:10px;padding:8px;background:white;width:100%}
      .settleKpis{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin-bottom:12px}.settleKpi{background:#fff;border:1px solid #dbe3ef;border-radius:14px;padding:12px;box-shadow:0 2px 10px rgba(15,23,42,.04)}.settleKpiLabel{font-size:10px;color:#64748b;font-weight:1000;text-transform:uppercase;letter-spacing:.04em}.settleKpiValue{font-size:20px;font-weight:1000;margin-top:5px;color:#0f172a}.settleKpiSub{font-size:11px;color:#64748b;margin-top:4px;line-height:1.3}
      .settleCard{background:#fff;border:1px solid #dbe3ef;border-radius:16px;box-shadow:0 2px 12px rgba(15,23,42,.04);overflow:hidden}.settleCardHead{padding:12px 14px;border-bottom:1px solid #e5edf7;display:flex;align-items:center;justify-content:space-between;background:#f8fbff}.settleCardHead h3{margin:0;font-size:15px}.settleCardBody{padding:12px;max-height:550px;overflow:auto}.settleTable{width:100%;border-collapse:collapse;font-size:12px}.settleTable th{text-align:left;background:#f8fafc;color:#334155;font-size:10px;text-transform:uppercase;letter-spacing:.03em;padding:8px;border-bottom:1px solid #e2e8f0;position:sticky;top:0;z-index:1}.settleTable td{padding:8px;border-bottom:1px solid #edf2f8;vertical-align:top}.settleTable input,.settleTable textarea,.settleTable select{width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:7px;font-size:12px}.settleTinyBtns{display:flex;gap:6px;flex-wrap:wrap}.settleTinyBtns button{height:30px;border-radius:8px;padding:0 8px;font-size:11px}.settleEmpty{border:1px dashed #cbd5e1;border-radius:14px;background:#f8fafc;padding:18px;text-align:center;color:#64748b;font-weight:850}
      .settleModalNotice{background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;border-radius:12px;padding:10px;font-size:12px;font-weight:850;margin:0 0 12px}.settleApprovalLine{background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a8a;border-radius:12px;padding:10px;font-size:12px;font-weight:850;margin-top:10px}
      @media(max-width:1250px){.settleMetrics,.settleKpis{grid-template-columns:repeat(3,1fr)}.settleFilters{grid-template-columns:repeat(2,1fr)}}@media(max-width:750px){.settlePageTop{height:auto;align-items:flex-start;flex-direction:column;padding:12px}.settleMetrics,.settleKpis,.settleFilters{grid-template-columns:1fr}.settlePageActions{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function ensureSettlementCard(){
    ensureSettlementStyles();
    if(sEl('settlementAccountPanel')) return sEl('settlementAccountPanel');
    var panel=document.createElement('section');
    panel.id='settlementAccountPanel';
    panel.className='settlementAccountPanel';
    var anchor=sEl('paymentPlanPanel');
    if(anchor && anchor.parentNode) anchor.parentNode.insertBefore(panel, anchor.nextSibling);
    return panel;
  }

  async function renderSettlementAccountCard(){
    var a=sCurrent();
    var panel=ensureSettlementCard();
    if(!panel) return;
    if(!a){panel.innerHTML='<div class="settleTop"><div><div class="settleTitle">Settlement Workflow</div><div class="settleSub">No account selected.</div></div></div>';return;}
    var rows=await settlementFetchForAccount(a.id);
    var latest=rows[0];
    if(!latest){
      panel.innerHTML='<div class="settleTop"><div><div class="settleTitle">Settlement Workflow</div><div class="settleSub">No settlement offer on this account yet.</div></div><div class="settleActions"><button class="green" onclick="openSettlementModal()">Propose Settlement</button><button class="outline" onclick="openSettlementApprovalPage()">Settlement Dashboard</button></div></div>';
      return;
    }
    var status=latest.status||'Pending Approval';
    panel.innerHTML='<div class="settleTop"><div><div class="settleTitle">Settlement Workflow <span class="settlePill '+sStatusClass(status)+'">'+sEsc(status)+'</span></div><div class="settleSub">Latest offer for '+sEsc(sName(a))+' • Account '+sEsc(sAcct(a)||'—')+'</div></div><div class="settleActions"><button class="green" onclick="openSettlementModal()">New Offer</button><button class="outline" onclick="openSettlementApprovalPage()">Settlement Dashboard</button></div></div>'+ 
      '<div class="settleMetrics"><div class="settleMetric"><div class="settleLabel">Current Balance</div><div class="settleValue">'+sMoney(sBalance(a))+'</div></div><div class="settleMetric"><div class="settleLabel">Settlement Amount</div><div class="settleValue">'+sMoney(latest.settlementAmount)+'</div></div><div class="settleMetric"><div class="settleLabel">Settlement %</div><div class="settleValue">'+(latest.settlementPercent||0).toFixed(2)+'%</div></div><div class="settleMetric"><div class="settleLabel">Due Date</div><div class="settleValue">'+sEsc(latest.dueDate||'—')+'</div></div><div class="settleMetric"><div class="settleLabel">Proposed By</div><div class="settleValue">'+sEsc(latest.createdByEmail||'—')+'</div></div></div>'+ 
      '<div class="settleNote"><b>Notes:</b> '+sEsc(latest.notes||'No notes saved.')+'</div>';
  }

  function ensureSettlementNav(){
    if(sEl('settlementTopNavBtn')) return;
    var top=document.querySelector('.topActions');
    if(top){
      var b=document.createElement('button');
      b.id='settlementTopNavBtn'; b.className='gray'; b.type='button'; b.textContent='Settlements'; b.onclick=function(){openSettlementApprovalPage()};
      var ref=top.querySelector('button[onclick*="openImportHistoryPage"],button[onclick*="openDataCleanupDashboard"]');
      top.insertBefore(b, ref||top.firstChild);
    }
    var rail=document.querySelector('.navRail');
    if(rail && !sEl('settlementSideNavBtn')){
      var n=document.createElement('button');
      n.id='settlementSideNavBtn'; n.className='navIcon'; n.title='Settlement Workflow'; n.type='button'; n.innerHTML='<span class="navEmoji">%</span>'; n.onclick=function(){openSettlementApprovalPage()};
      var spacer=rail.querySelector('.navSpacer'); rail.insertBefore(n, spacer||rail.lastChild);
    }
  }

  function ensureSettlementPage(){
    ensureSettlementStyles();
    if(sEl('settlementApprovalPage')) return sEl('settlementApprovalPage');
    var page=document.createElement('div');
    page.id='settlementApprovalPage';
    page.innerHTML=`
      <div class="settlePageTop">
        <div><div class="settlePageTitle">Settlement Workflow</div><div class="settlePageSub">Employees propose settlements. Admin approves, rejects, modifies, or converts to a plan.</div></div>
        <div class="settlePageActions">
          <button class="outline" onclick="refreshSettlementApprovalPage()">Refresh</button>
          <button class="green" onclick="exportSettlementsCSV()">Export CSV</button>
          <button class="gray" onclick="window.print()">Print / Save PDF</button>
          <button class="red" onclick="closeSettlementApprovalPage()">Back to Queue</button>
        </div>
      </div>
      <div class="settlePageBody">
        <div class="settleNotice" id="settlementPageNotice">Pending settlements need admin approval before they become final.</div>
        <div class="settleFilters">
          <div><label>Status</label><select id="settleFilterStatus" onchange="renderSettlementApprovalPage()"><option value="">All</option><option>Pending Approval</option><option>Approved</option><option>Rejected</option><option>Paid</option><option>Broken</option></select></div>
          <div><label>Employee</label><select id="settleFilterEmployee" onchange="renderSettlementApprovalPage()"><option value="">All Employees</option></select></div>
          <div><label>Search</label><input id="settleFilterSearch" placeholder="Name, account, notes" oninput="renderSettlementApprovalPage()"></div>
          <div><label>Start Date</label><input id="settleFilterStart" type="date" onchange="renderSettlementApprovalPage()"></div>
          <div><label>End Date</label><input id="settleFilterEnd" type="date" onchange="renderSettlementApprovalPage()"></div>
        </div>
        <div class="settleKpis" id="settlementKpis"></div>
        <div class="settleCard"><div class="settleCardHead"><h3>Settlement Offers</h3><span class="settlePill settleBlue" id="settleRowCount">0 rows</span></div><div class="settleCardBody" id="settlementRows"><div class="settleEmpty">Loading settlements...</div></div></div>
      </div>`;
    document.body.appendChild(page);
    return page;
  }

  function settlementMatchesDate(row){
    var st=sVal('settleFilterStart'), en=sVal('settleFilterEnd');
    var d=String(row.createdAt||row.updatedAt||'').slice(0,10);
    if(st && d < st) return false;
    if(en && d > en) return false;
    return true;
  }
  function fillSettlementEmployees(rows){
    var sel=sEl('settleFilterEmployee'); if(!sel) return;
    var cur=sel.value, seen={}; rows.forEach(function(r){var e=String(r.createdByEmail||'').toLowerCase().trim(); if(e)seen[e]=1;});
    var opts='<option value="">All Employees</option>'+Object.keys(seen).sort().map(function(e){return '<option value="'+sEsc(e)+'">'+sEsc(e)+'</option>';}).join('');
    if(sel.innerHTML!==opts) sel.innerHTML=opts;
    sel.value=cur;
  }
  function filteredSettlements(rows){
    var status=sVal('settleFilterStatus').toLowerCase(), emp=sVal('settleFilterEmployee').toLowerCase(), q=sVal('settleFilterSearch').toLowerCase();
    var amap=settlementAccountMap();
    return rows.filter(function(r){
      var a=amap[String(r.accountId)]||{};
      if(status && String(r.status||'').toLowerCase()!==status) return false;
      if(emp && String(r.createdByEmail||'').toLowerCase()!==emp) return false;
      if(!settlementMatchesDate(r)) return false;
      if(q){
        var hay=[sName(a),sAcct(a),r.notes,r.status,r.createdByEmail,r.settlementAmount].join(' ').toLowerCase();
        if(!hay.includes(q)) return false;
      }
      if(!isSettlementAdmin() && String(r.createdByEmail||'').toLowerCase()!==sEmail()) return false;
      return true;
    });
  }
  function settlementKpis(rows){
    var pending=rows.filter(function(r){return String(r.status).toLowerCase()==='pending approval'});
    var approved=rows.filter(function(r){return String(r.status).toLowerCase()==='approved'});
    var rejected=rows.filter(function(r){return String(r.status).toLowerCase()==='rejected'});
    var paid=rows.filter(function(r){return String(r.status).toLowerCase()==='paid'});
    var expected=approved.reduce(function(s,r){return s+sNum(r.settlementAmount)},0);
    var pendingAmt=pending.reduce(function(s,r){return s+sNum(r.settlementAmount)},0);
    var paidAmt=paid.reduce(function(s,r){return s+sNum(r.settlementAmount)},0);
    return {pending:pending.length,approved:approved.length,rejected:rejected.length,paid:paid.length,expected:expected,pendingAmt:pendingAmt,paidAmt:paidAmt,total:rows.length};
  }
  function renderSettlementKpis(rows){
    var k=settlementKpis(rows), el=sEl('settlementKpis'); if(!el) return;
    el.innerHTML = [
      ['Pending',k.pending,sMoney(k.pendingAmt)],['Approved',k.approved,sMoney(k.expected)],['Rejected',k.rejected,'Needs review'],['Paid',k.paid,sMoney(k.paidAmt)],['Total Offers',k.total,'All statuses'],['Expected Dollars',sMoney(k.expected),'Approved not paid']
    ].map(function(x){return '<div class="settleKpi"><div class="settleKpiLabel">'+sEsc(x[0])+'</div><div class="settleKpiValue">'+sEsc(x[1])+'</div><div class="settleKpiSub">'+sEsc(x[2])+'</div></div>';}).join('');
  }
  function renderSettlementApprovalPage(){
    var all=window.settlementWorkflowRows||[];
    fillSettlementEmployees(all);
    var rows=filteredSettlements(all);
    renderSettlementKpis(rows);
    var count=sEl('settleRowCount'); if(count) count.textContent=rows.length+' rows';
    var body=sEl('settlementRows'); if(!body) return;
    var amap=settlementAccountMap();
    if(!rows.length){body.innerHTML='<div class="settleEmpty">No settlements found for this filter.</div>';return;}
    body.innerHTML='<table class="settleTable"><thead><tr><th>Account</th><th>Status</th><th>Balance</th><th>Offer</th><th>Due</th><th>Proposed By</th><th>Admin Amount / Notes</th><th>Actions</th></tr></thead><tbody>'+rows.map(function(r){
      var a=amap[String(r.accountId)]||{}; var status=r.status||'Pending Approval'; var admin=isSettlementAdmin();
      var canAdmin=admin; var pending=String(status).toLowerCase()==='pending approval'; var approved=String(status).toLowerCase()==='approved';
      var action='';
      if(canAdmin && pending){
        action='<div class="settleTinyBtns"><button class="green" onclick="approveSettlement(\''+sEsc(r.id)+'\')">Approve</button><button class="purple" onclick="approveSettlementAsPlan(\''+sEsc(r.id)+'\')">Approve + Plan</button><button class="red" onclick="rejectSettlement(\''+sEsc(r.id)+'\')">Reject</button><button class="gray" onclick="deleteSettlementOffer(\''+sEsc(r.id)+'\')">Delete</button></div>';
      }else if(canAdmin && approved){
        action='<div class="settleTinyBtns"><button class="purple" onclick="convertApprovedSettlementToPlan(\''+sEsc(r.id)+'\')">Create Plan</button><button class="green" onclick="markSettlementStatus(\''+sEsc(r.id)+'\',\'Paid\')">Mark Paid</button><button class="red" onclick="markSettlementStatus(\''+sEsc(r.id)+'\',\'Broken\')">Mark Broken</button><button class="gray" onclick="deleteSettlementOffer(\''+sEsc(r.id)+'\')">Delete</button></div>';
      }else if(canAdmin){
        action='<div class="settleTinyBtns"><button class="gray" onclick="deleteSettlementOffer(\''+sEsc(r.id)+'\')">Delete</button></div>';
      }else{
        action='<span class="settlePill settleBlue">View Only</span>';
      }
      return '<tr><td><b>'+sEsc(sName(a))+'</b><br><small>'+sEsc(sAcct(a)||r.accountId||'—')+'</small></td><td><span class="settlePill '+sStatusClass(status)+'">'+sEsc(status)+'</span></td><td>'+sMoney(r.balance||sBalance(a))+'</td><td><b>'+sMoney(r.settlementAmount)+'</b><br><small>'+(r.settlementPercent||0).toFixed(2)+'%</small></td><td>'+sEsc(r.dueDate||'—')+'</td><td>'+sEsc(r.createdByEmail||'—')+'<br><small>'+sEsc(String(r.createdAt||'').slice(0,16).replace('T',' '))+'</small></td><td><input id="settleAmount_'+sEsc(r.id)+'" type="number" step="0.01" value="'+sEsc(r.settlementAmount.toFixed(2))+'" '+(!pending||!admin?'disabled':'')+'><textarea id="settleAdminNotes_'+sEsc(r.id)+'" placeholder="Admin notes" '+(!pending||!admin?'disabled':'')+'></textarea><small>'+sEsc(r.notes||'')+'</small></td><td>'+action+'</td></tr>';
    }).join('')+'</tbody></table>';
  }
  async function refreshSettlementApprovalPage(){
    ensureSettlementPage();
    var n=sEl('settlementPageNotice'); if(n)n.textContent='Loading settlements...';
    window.settlementWorkflowRows=await settlementFetchAll();
    renderSettlementApprovalPage();
    if(n)n.textContent=(isSettlementAdmin()?'Admin view: approve, reject, modify, or convert settlements to a plan.':'Employee view: showing your settlement proposals only.');
  }
  function openSettlementApprovalPage(){
    ensureSettlementNav(); ensureSettlementPage();
    try{if(typeof closeAllLargeModalsForNav==='function')closeAllLargeModalsForNav()}catch(e){}
    sEl('settlementApprovalPage').classList.add('open');
    refreshSettlementApprovalPage();
  }
  function closeSettlementApprovalPage(){var p=sEl('settlementApprovalPage');if(p)p.classList.remove('open')}

  async function patchSettlement(id, payload){
    payload.updated_at=new Date().toISOString();
    return await dbFetch('/settlements?id=eq.'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify(payload)});
  }
  async function approveSettlement(id){
    var rows=window.settlementWorkflowRows||await settlementFetchAll(); var r=rows.find(function(x){return String(x.id)===String(id)}); if(!r)return alert('Settlement not found.');
    if(!isSettlementAdmin())return alert('Admin approval required.');
    if(String(r.createdByEmail||'').toLowerCase()===sEmail() && !confirm('You proposed this settlement. Admin approval is still required. Continue as admin?')) return;
    var amt=sNum(sVal('settleAmount_'+id)||r.settlementAmount), a=sAccountById(r.accountId), bal=sNum(r.balance||sBalance(a));
    if(amt<=0)return alert('Settlement amount must be greater than zero.');
    if(bal && amt>bal+0.01)return alert('Settlement cannot exceed balance.');
    var note=sVal('settleAdminNotes_'+id);
    var pct=bal?amt/bal*100:r.settlementPercent;
    var notes=(r.notes||'')+'\nAdmin Approved by '+(currentUser?.email||'Admin')+' on '+new Date().toLocaleString()+(note?': '+note:'');
    await patchSettlement(id,{status:'Approved',settlement_amount:amt,settlement_percent:pct,notes:notes});
    await dbFetch('/accounts?id=eq.'+encodeURIComponent(r.accountId),{method:'PATCH',body:JSON.stringify({status:'Settlement Approved',disposition:'Settlement Approved',updated_at:new Date().toISOString()})}).catch(function(){});
    await settlementActivity(r.accountId,'Settlement Approved','Approved settlement '+sMoney(amt)+' for '+sName(a));
    await refreshSettlementApprovalPage(); await renderSettlementAccountCard(); alert('Settlement approved.');
  }
  async function approveSettlementAsPlan(id){await approveSettlement(id); setTimeout(function(){convertApprovedSettlementToPlan(id)},300)}
  async function rejectSettlement(id){
    if(!isSettlementAdmin())return alert('Admin only.');
    var rows=window.settlementWorkflowRows||await settlementFetchAll(); var r=rows.find(function(x){return String(x.id)===String(id)}); if(!r)return;
    var note=sVal('settleAdminNotes_'+id)||prompt('Rejection reason / admin note:','');
    var notes=(r.notes||'')+'\nAdmin Rejected by '+(currentUser?.email||'Admin')+' on '+new Date().toLocaleString()+(note?': '+note:'');
    await patchSettlement(id,{status:'Rejected',notes:notes});
    await settlementActivity(r.accountId,'Settlement Rejected','Rejected settlement '+sMoney(r.settlementAmount)+(note?' — '+note:''));
    await refreshSettlementApprovalPage(); await renderSettlementAccountCard();
  }
  async function markSettlementStatus(id,status){
    if(!isSettlementAdmin())return alert('Admin only.');
    var rows=window.settlementWorkflowRows||await settlementFetchAll(); var r=rows.find(function(x){return String(x.id)===String(id)}); if(!r)return;
    await patchSettlement(id,{status:status,notes:(r.notes||'')+'\nMarked '+status+' by '+(currentUser?.email||'Admin')+' on '+new Date().toLocaleString()});
    await settlementActivity(r.accountId,'Settlement '+status,'Marked settlement '+status+': '+sMoney(r.settlementAmount));
    await refreshSettlementApprovalPage(); await renderSettlementAccountCard();
  }
  async function deleteSettlementOffer(id){
    if(!isSettlementAdmin())return alert('Admin only.');
    if(!confirm('Delete this settlement offer? This cannot be undone.'))return;
    await dbFetch('/settlements?id=eq.'+encodeURIComponent(id),{method:'DELETE'});
    await refreshSettlementApprovalPage(); await renderSettlementAccountCard();
  }
  async function convertApprovedSettlementToPlan(id){
    var rows=window.settlementWorkflowRows||await settlementFetchAll(); var r=rows.find(function(x){return String(x.id)===String(id)}); if(!r)return alert('Settlement not found.');
    var a=sAccountById(r.accountId); if(!a)return alert('Account is not loaded. Refresh accounts then try again.');
    currentAccountId=a.id; try{render()}catch(e){}
    closeSettlementApprovalPage();
    if(typeof openPaymentPlan==='function'){
      await openPaymentPlan();
      setTimeout(function(){
        if(sEl('planTotal'))sEl('planTotal').value=sNum(r.settlementAmount).toFixed(2);
        if(sEl('planEach'))sEl('planEach').value=sNum(r.settlementAmount).toFixed(2);
        if(sEl('planCount'))sEl('planCount').value='1';
        if(sEl('planStartDate'))sEl('planStartDate').value=r.dueDate||sToday();
        if(sEl('planFrequency'))sEl('planFrequency').value='One-Time';
        if(sEl('planNotes'))sEl('planNotes').value='Approved settlement converted to payment plan. Settlement ID: '+r.id+'\n'+(r.notes||'');
        try{if(typeof recalcPlanFromInputs==='function')recalcPlanFromInputs('count'); if(typeof renderPlanSchedule==='function')renderPlanSchedule()}catch(e){}
      },300);
    }
  }
  function exportSettlementsCSV(){
    var rows=filteredSettlements(window.settlementWorkflowRows||[]), amap=settlementAccountMap();
    var out=[['Created','Status','Debtor','Account Number','Balance','Settlement Amount','Settlement Percent','Due Date','Payment Type','Proposed By','Notes']];
    rows.forEach(function(r){var a=amap[String(r.accountId)]||{};out.push([r.createdAt||'',r.status||'',sName(a),sAcct(a),r.balance||sBalance(a),r.settlementAmount,(r.settlementPercent||0).toFixed(2),r.dueDate||'',r.paymentType||'',r.createdByEmail||'',r.notes||'']);});
    var csv=out.map(function(row){return row.map(function(c){return '"'+String(c==null?'':c).replace(/"/g,'""')+'"';}).join(',')}).join('\n');
    var blob=new Blob([csv],{type:'text/csv'});var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='co-pilot-settlement-report.csv';a.click();setTimeout(function(){URL.revokeObjectURL(a.href)},1000);
  }

  var oldOpenSettlementModal=window.openSettlementModal;
  window.openSettlementModal=function(){
    var a=sCurrent(); if(!a)return alert('No account selected.');
    try{if(typeof oldOpenSettlementModal==='function')oldOpenSettlementModal()}catch(e){var m=sEl('settlementModal'); if(m)m.classList.add('open')}
    setTimeout(function(){
      var bal=sBalance(a); if(sEl('settleBalance'))sEl('settleBalance').value=bal.toFixed(2);
      if(sEl('settlePercent'))sEl('settlePercent').value='50';
      if(sEl('settleAmount'))sEl('settleAmount').value=(bal*0.50).toFixed(2);
      if(sEl('settleDueDate'))sEl('settleDueDate').value=sAddDays(7);
      if(sEl('settleApproval'))sEl('settleApproval').value='Yes';
      var body=sEl('settlementModal')?.querySelector('.modalbody');
      if(body && !sEl('settleWorkflowNotice')){
        var notice=document.createElement('div'); notice.id='settleWorkflowNotice'; notice.className='settleModalNotice';
        notice.textContent='Settlement offers save as Pending Admin Approval. Employees can propose settlements, but admin must approve, reject, modify, or convert the offer before it becomes final.';
        body.insertBefore(notice, body.firstChild);
      }
      var btn=sEl('settlementModal')?.querySelector('button[onclick="saveSettlement()"]'); if(btn)btn.textContent=isSettlementAdmin()?'Save Settlement Proposal':'Submit for Admin Approval';
      try{if(typeof recalcSettlement==='function')recalcSettlement('percent')}catch(e){}
    },100);
  };
  window.saveSettlement=async function(){
    var a=sCurrent(); if(!a)return alert('No account selected.');
    var bal=sNum(sVal('settleBalance')||sBalance(a)), amt=sNum(sVal('settleAmount')), pct=sNum(sVal('settlePercent'));
    if(amt<=0)return alert('Settlement amount must be greater than zero.');
    if(amt>bal+0.01)return alert('Settlement cannot be higher than balance.');
    if(!pct && bal)pct=amt/bal*100;
    var row={account_id:a.id,balance:bal,settlement_percent:pct,settlement_amount:amt,due_date:sVal('settleDueDate')||sAddDays(7),payment_type:sVal('settlePaymentType')||'Lump Sum',manager_approval_required:true,status:'Pending Approval',notes:sVal('settleNotes'),created_by_email:currentUser?.email||'',updated_at:new Date().toISOString()};
    try{
      await dbFetch('/settlements',{method:'POST',body:JSON.stringify([row])});
      await dbFetch('/accounts?id=eq.'+encodeURIComponent(a.id),{method:'PATCH',body:JSON.stringify({status:'Settlement Pending',disposition:'Settlement Pending',updated_at:new Date().toISOString()})}).catch(function(){});
      await settlementActivity(a.id,'Settlement Proposed','Proposed settlement '+sMoney(amt)+' ('+pct.toFixed(2)+'%) due '+row.due_date+' — pending admin approval.');
      try{closeModal('settlementModal')}catch(e){}
      await renderSettlementAccountCard();
      alert(isSettlementAdmin()?'Settlement proposal saved pending approval. Open Settlement Dashboard to approve it.':'Settlement submitted for admin approval.');
    }catch(e){
      console.error('settlement save failed',e);
      alert('Settlement did not save. Make sure RUN_THIS_FINAL_SECURITY_CLEANUP_SQL.sql has been run in Supabase so the settlements table exists. Supabase said: '+(e.message||e));
    }
  };

  var oldRender=window.render;
  if(typeof oldRender==='function' && !window.__settlementRenderWrapped){
    window.__settlementRenderWrapped=true;
    window.render=function(){var r=oldRender.apply(this,arguments); setTimeout(function(){renderSettlementAccountCard().catch(function(){})},0); return r;};
  }
  document.addEventListener('DOMContentLoaded',function(){ensureSettlementNav(); ensureSettlementCard(); setTimeout(function(){renderSettlementAccountCard().catch(function(){})},600);});
  setTimeout(function(){ensureSettlementNav(); ensureSettlementCard(); renderSettlementAccountCard().catch(function(){})},800);

  window.openSettlementApprovalPage=openSettlementApprovalPage;
  window.closeSettlementApprovalPage=closeSettlementApprovalPage;
  window.refreshSettlementApprovalPage=refreshSettlementApprovalPage;
  window.renderSettlementApprovalPage=renderSettlementApprovalPage;
  window.exportSettlementsCSV=exportSettlementsCSV;
  window.approveSettlement=approveSettlement;
  window.approveSettlementAsPlan=approveSettlementAsPlan;
  window.rejectSettlement=rejectSettlement;
  window.markSettlementStatus=markSettlementStatus;
  window.deleteSettlementOffer=deleteSettlementOffer;
  window.convertApprovedSettlementToPlan=convertApprovedSettlementToPlan;
})();


// ===== inline-script =====
/* RECEIPTS + SETTLEMENT/PAYMENT LETTERS — stable full-page document center */
(function(){
  if(window.__coPilotReceiptsLettersPatch)return;
  window.__coPilotReceiptsLettersPatch=true;
  const DOC_ADMIN_EMAIL='afinch2678@gmail.com';
  function dEl(id){return document.getElementById(id)}
  function dEsc(v){return String(v==null?'':v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')}
  function dVal(id){let el=dEl(id);return el?String(el.value||'').trim():''}
  function dEmail(){try{return String((window.currentUser&&currentUser.email)||localStorage.getItem('coPilotUserEmail')||'').toLowerCase().trim()}catch(e){return ''}}
  function dIsAdmin(){try{return !!(window.currentUser&&(currentUser.isAdmin||currentUser.role==='admin'||String(currentUser.email||'').toLowerCase()===DOC_ADMIN_EMAIL))||dEmail()===DOC_ADMIN_EMAIL}catch(e){return false}}
  function dCurrent(){try{return (typeof getCurrent==='function'&&getCurrent()) || (window.accounts||[]).find(a=>String(a.id)===String(window.currentAccountId)) || (window.accounts||[])[0] || null}catch(e){return null}}
  function dName(a){try{return typeof nameOf==='function'?nameOf(a):(a?.fullName||[a?.firstName,a?.middleName,a?.lastName].filter(Boolean).join(' ')||'Unknown Account')}catch(e){return 'Unknown Account'}}
  function dAcct(a){try{return typeof acctNo==='function'?acctNo(a):(a?.accountNumber||a?.clientAccountNumber||a?.accountId||'')}catch(e){return ''}}
  function dMoneyNum(v){try{return typeof moneyNum==='function'?moneyNum(v):(Number(String(v??'').replace(/[^0-9.-]/g,''))||0)}catch(e){return 0}}
  function dMoney(v){try{return typeof money==='function'?money(v):Number(v||0).toLocaleString('en-US',{style:'currency',currency:'USD'})}catch(e){return '$0.00'}}
  function dBalance(a){try{return typeof accountBalance==='function'?accountBalance(a):dMoneyNum(a?.currentBalance||a?.principal||a?.originalBalance)}catch(e){return 0}}
  function dToday(){let x=new Date();return x.toISOString().slice(0,10)}
  function dDate(v){if(!v)return '—'; let d=new Date(v); return isNaN(d)?String(v):d.toLocaleDateString()}
  function dDateTime(v){if(!v)return '—'; let d=new Date(v); return isNaN(d)?String(v):d.toLocaleString()}
  function dId(prefix){return prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7).toUpperCase()}
  function dDownload(name,text,type='text/csv'){let blob=new Blob([text],{type});let a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
  function dCsvCell(v){return '"'+String(v==null?'':v).replace(/"/g,'""')+'"'}
  async function dFetch(path){try{if(typeof dbFetch!=='function')return [];let r=await dbFetch(path);return Array.isArray(r)?r:[]}catch(e){console.warn('document center fetch failed',path,e);return []}}
  function dCamel(row){let o={};Object.keys(row||{}).forEach(k=>{let ck=k.replace(/_([a-z])/g,(_,c)=>c.toUpperCase());o[ck]=row[k]});return o}
  async function dActivity(accountId,type,text){try{if(typeof insertActivity==='function')await insertActivity(accountId,type,text)}catch(e){}try{if(typeof insertAudit==='function')await insertAudit(type,text,'documents',String(accountId||''))}catch(e){}}

  function ensureDocStyles(){
    if(dEl('receiptsLettersStyles'))return;
    let style=document.createElement('style');
    style.id='receiptsLettersStyles';
    style.textContent=`
      .docAccountPanel{grid-column:1/-1;background:#fff;border:1px solid #dbe3ef;border-radius:16px;box-shadow:0 2px 10px rgba(15,23,42,.035);padding:14px 16px;min-width:0}
      .docTop{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}.docTitle{font-size:16px;font-weight:1000;color:#0f172a}.docSub{font-size:12px;color:#64748b;margin-top:4px}.docActions{display:flex;gap:8px;flex-wrap:wrap}.docPill{display:inline-block;border-radius:999px;padding:4px 8px;font-size:11px;font-weight:900;background:#eef2ff;color:#1d4ed8}.docMiniGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:12px}.docMini{border:1px solid #e2e8f0;border-radius:13px;background:#f8fbff;padding:10px}.docMiniLabel{font-size:10px;font-weight:900;text-transform:uppercase;color:#64748b;margin-bottom:5px}.docMiniValue{font-size:13px;font-weight:1000;color:#0f172a}
      #receiptsLettersPage{display:none;position:fixed;inset:0;z-index:9300;background:#eef3f9;color:#0f172a;overflow:auto}#receiptsLettersPage.open{display:block}.docPageTop{min-height:76px;background:linear-gradient(90deg,#05225f,#07379a,#0b45c6);color:#fff;display:flex;justify-content:space-between;gap:14px;align-items:center;padding:14px 18px;box-shadow:0 4px 18px rgba(15,23,42,.2)}.docPageTitle{font-size:23px;font-weight:1000;letter-spacing:-.4px}.docPageSub{font-size:12px;color:#dbeafe;margin-top:3px}.docPageActions{display:flex;gap:9px;flex-wrap:wrap}.docPageBody{padding:16px;display:grid;grid-template-columns:1.05fr .95fr;gap:14px}.docCard{background:#fff;border:1px solid #dbe3ef;border-radius:16px;box-shadow:0 3px 14px rgba(15,23,42,.055);overflow:hidden}.docCardHead{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:14px 16px;border-bottom:1px solid #edf2f8;background:#f8fbff}.docCardHead h3{margin:0;font-size:16px}.docCardBody{padding:14px 16px}.docNotice{background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a8a;border-radius:12px;padding:10px;font-size:12px;font-weight:850}.docGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.docGrid label{display:block;font-size:11px;font-weight:900;color:#334155;margin-bottom:5px}.docGrid input,.docGrid select,.docGrid textarea{width:100%;border:1px solid #cbd5e1;border-radius:10px;padding:10px;background:#fff;font:inherit;font-size:13px}.docGrid textarea{min-height:78px;resize:vertical}.docWide{grid-column:1/-1}.docHalf{grid-column:span 2}.docTemplateGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.docTemplate{border:1px solid #dbe3ef;background:#fff;border-radius:14px;padding:12px;cursor:pointer;transition:.12s ease}.docTemplate:hover{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.10)}.docTemplate.active{border:2px solid #2563eb;background:#eff6ff}.docTemplateTitle{font-weight:1000;color:#0f172a}.docTemplateText{font-size:12px;color:#64748b;margin-top:4px;line-height:1.35}.docMetrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:12px}.docMetric{border:1px solid #e2e8f0;border-radius:13px;background:#f8fbff;padding:10px}.docMetricLabel{font-size:10px;font-weight:900;text-transform:uppercase;color:#64748b;margin-bottom:5px}.docMetricValue{font-size:15px;font-weight:1000;color:#0f172a}.docHistoryTable{width:100%;border-collapse:collapse;font-size:12px}.docHistoryTable th{position:sticky;top:0;background:#f8fafc;text-align:left;padding:9px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:10px;text-transform:uppercase;z-index:1}.docHistoryTable td{padding:8px 9px;border-bottom:1px solid #edf2f8;vertical-align:top}.docTableWrap{border:1px solid #e2e8f0;border-radius:13px;overflow:auto;max-height:360px}.docPreview{font-family:Arial,Helvetica,sans-serif;background:white;border:1px solid #dbe3ef;border-radius:14px;padding:18px;min-height:420px;line-height:1.45}.docPreview h1{font-size:22px;margin:0;color:#0f172a}.docPreview h2{font-size:18px;margin:18px 0 8px;color:#0f172a}.docPreview .muted{color:#64748b}.docPreview table{width:100%;border-collapse:collapse;margin:12px 0;font-size:13px}.docPreview th,.docPreview td{border:1px solid #e2e8f0;padding:8px;text-align:left}.docPreview th{background:#f8fafc}.docSignLine{margin-top:36px;border-top:1px solid #0f172a;width:260px;padding-top:6px;font-size:12px}.docWatermark{font-size:11px;color:#94a3b8;text-align:right;margin-top:18px}.docButtonRow{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.navIcon.documentIcon{background:#0ea5e9;color:#fff}.topActions .documentCenterBtn{background:#0ea5e9!important;color:white!important;font-weight:1000!important}
      @media(max-width:1300px){.docPageBody{grid-template-columns:1fr}.docMiniGrid,.docMetrics{grid-template-columns:repeat(2,1fr)}.docGrid,.docTemplateGrid{grid-template-columns:repeat(2,1fr)}.docHalf{grid-column:span 1}}@media(max-width:760px){.docPageTop{height:auto;align-items:flex-start;flex-direction:column}.docMiniGrid,.docMetrics,.docGrid,.docTemplateGrid{grid-template-columns:1fr}.docPageActions{width:100%}}
      @media print{#receiptsLettersPage{position:static!important;display:block!important;background:white!important}.docPageTop,.docCard:not(.printableDocCard),.docActions,.docPageActions,.navRail,.topbar,.bottom{display:none!important}.docPageBody{display:block!important;padding:0!important}.printableDocCard{border:0!important;box-shadow:none!important}.printableDocCard .docCardHead{display:none!important}.docPreview{border:0!important;border-radius:0!important}}
    `;
    document.head.appendChild(style);
  }

  function ensureDocAccountPanel(){
    ensureDocStyles();
    if(dEl('docAccountPanel'))return dEl('docAccountPanel');
    let panel=document.createElement('section');
    panel.id='docAccountPanel'; panel.className='docAccountPanel';
    let anchor=dEl('settlementAccountPanel')||dEl('paymentPlanPanel')||document.querySelector('.notePanel');
    if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(panel,anchor.nextSibling);
    return panel;
  }
  function renderDocAccountPanel(){
    let a=dCurrent(), p=ensureDocAccountPanel(); if(!p)return;
    if(!a){p.innerHTML='<div class="docTop"><div><div class="docTitle">Receipts & Letters</div><div class="docSub">No account selected.</div></div></div>';return;}
    p.innerHTML='<div class="docTop"><div><div class="docTitle">Receipts & Letters <span class="docPill">Document Center</span></div><div class="docSub">Generate receipts, settlement letters, payment-plan agreements, and keep document history for '+dEsc(dName(a))+'.</div></div><div class="docActions"><button class="green" onclick="openReceiptsLettersPage(\'receipt\')">Payment Receipt</button><button class="outline" onclick="openReceiptsLettersPage(\'settlement\')">Settlement Letter</button><button class="outline" onclick="openReceiptsLettersPage(\'plan\')">Plan Agreement</button><button class="gray" onclick="openReceiptsLettersPage()">Documents</button></div></div><div class="docMiniGrid"><div class="docMini"><div class="docMiniLabel">Account</div><div class="docMiniValue">'+dEsc(dAcct(a)||'—')+'</div></div><div class="docMini"><div class="docMiniLabel">Current Balance</div><div class="docMiniValue">'+dMoney(dBalance(a))+'</div></div><div class="docMini"><div class="docMiniLabel">Company Docs</div><div class="docMiniValue">Receipts / Letters</div></div><div class="docMini"><div class="docMiniLabel">Access</div><div class="docMiniValue">'+(dIsAdmin()?'Admin + Employees':'Employee')+'</div></div></div>';
  }
  function ensureDocNav(){
    ensureDocStyles();
    let top=document.querySelector('.topActions');
    if(top&&!dEl('documentCenterTopBtn')){
      let b=document.createElement('button'); b.id='documentCenterTopBtn'; b.type='button'; b.className='gray documentCenterBtn'; b.textContent='Docs'; b.onclick=function(){openReceiptsLettersPage()};
      let ref=top.querySelector('button[onclick*="openDocumentGenerator"]'); top.insertBefore(b, ref?ref.nextSibling:top.firstChild);
    }
    let rail=document.querySelector('.navRail');
    if(rail&&!dEl('documentCenterSideBtn')){
      let n=document.createElement('button'); n.id='documentCenterSideBtn'; n.className='navIcon documentIcon'; n.type='button'; n.title='Receipts & Letters'; n.innerHTML='<span class="navEmoji">📄</span>'; n.onclick=function(){openReceiptsLettersPage()};
      let spacer=rail.querySelector('.navSpacer'); rail.insertBefore(n, spacer||rail.lastChild);
    }
    let q=document.querySelector('.quickActions');
    if(q&&!dEl('docQuickAction')){
      let div=document.createElement('div'); div.id='docQuickAction'; div.className='qaItem'; div.onclick=function(){openReceiptsLettersPage()}; div.innerHTML='<span class="qaLeft"><span class="qaIcon">📄</span>Receipts & Letters</span><span>›</span>';
      q.appendChild(div);
    }
  }

  function ensureDocPage(){
    ensureDocStyles();
    if(dEl('receiptsLettersPage'))return dEl('receiptsLettersPage');
    let page=document.createElement('div'); page.id='receiptsLettersPage';
    page.innerHTML=`
      <div class="docPageTop">
        <div><div class="docPageTitle">Receipts & Settlement Letters</div><div class="docPageSub">Generate receipts, settlement approvals, payment-plan agreements, and document account history.</div></div>
        <div class="docPageActions"><button class="outline" onclick="refreshReceiptsLettersPage()">Refresh</button><button class="green" onclick="exportDocumentHistoryCSV()">Export History CSV</button><button class="gray" onclick="printCurrentDocument()">Print / Save PDF</button><button class="red" onclick="closeReceiptsLettersPage()">Back to Queue</button></div>
      </div>
      <div class="docPageBody">
        <div class="docCard"><div class="docCardHead"><h3>Document Builder</h3><span class="docPill" id="docBuilderAccount">No account</span></div><div class="docCardBody">
          <div class="docNotice">Choose a document type, verify the amounts, then generate/print. Every generated document is logged to the account activity.</div>
          <div class="docTemplateGrid" id="docTemplateGrid" style="margin-top:12px"></div>
          <div class="docGrid" style="margin-top:12px">
            <div><label>Document Date</label><input id="docDate" type="date"></div>
            <div><label>Due / Valid Until</label><input id="docDueDate" type="date"></div>
            <div><label>Receipt / Document #</label><input id="docNumber"></div>
            <div><label>Payment Amount</label><input id="docPaymentAmount" type="number" step="0.01"></div>
            <div><label>Settlement Amount</label><input id="docSettlementAmount" type="number" step="0.01"></div>
            <div><label>Remaining Balance</label><input id="docRemainingBalance" type="number" step="0.01"></div>
            <div><label>Installment Amount</label><input id="docInstallmentAmount" type="number" step="0.01"></div>
            <div><label>Frequency</label><select id="docFrequency"><option>One-Time</option><option>Weekly</option><option>Bi-Weekly</option><option>Monthly</option></select></div>
            <div><label>Authorized By</label><input id="docAuthorizedBy" placeholder="Antonio Finch / Data Market House"></div>
            <div class="docWide"><label>Notes / Terms</label><textarea id="docNotes" placeholder="Document-specific terms, authorization language, or payment instructions."></textarea></div>
          </div>
          <div class="docButtonRow"><button class="green" onclick="generateReceiptDocument()">Generate Receipt</button><button class="purple" onclick="generateSettlementLetter()">Generate Settlement Letter</button><button class="gray" onclick="generatePaymentPlanAgreement()">Generate Plan Agreement</button><button class="outline" onclick="openDocumentGenerator()">Open Letter Builder</button></div>
        </div></div>
        <div class="docCard printableDocCard"><div class="docCardHead"><h3>Preview</h3><span class="docPill" id="docPreviewType">Ready</span></div><div class="docCardBody"><div class="docPreview" id="docPreview"><h1>Document Preview</h1><p class="muted">Select a document type or generate a receipt/letter for the active account.</p></div></div></div>
        <div class="docCard"><div class="docCardHead"><h3>Account Document Metrics</h3><span class="docPill" id="docMetricsCount">0 docs</span></div><div class="docCardBody"><div class="docMetrics" id="docMetrics"></div></div></div>
        <div class="docCard"><div class="docCardHead"><h3>Document History</h3><span class="docPill" id="docHistoryCount">0 rows</span></div><div class="docCardBody"><div class="docTableWrap" id="docHistoryWrap"><div class="docNotice">Loading document history...</div></div></div></div>
      </div>`;
    document.body.appendChild(page); return page;
  }

  function addDays(days){let d=new Date();d.setDate(d.getDate()+days);return d.toISOString().slice(0,10)}
  function currentDocAccount(){let a=dCurrent(); if(!a)alert('No account selected.'); return a;}
  function setTemplateActive(kind){document.querySelectorAll('.docTemplate').forEach(x=>x.classList.toggle('active',x.dataset.kind===kind)); window.__docTemplateKind=kind; let t=dEl('docPreviewType'); if(t)t.textContent=kind==='receipt'?'Payment Receipt':kind==='settlement'?'Settlement Letter':kind==='plan'?'Payment Plan Agreement':'Document';}
  function renderTemplates(){let box=dEl('docTemplateGrid'); if(!box)return; let templates=[['receipt','Payment Receipt','Receipt number, payment amount, date, remaining balance, and company authorization.'],['settlement','Settlement Approval Letter','Approved settlement amount, discount, deadline, and terms.'],['plan','Payment Plan Agreement','Balance, down payment, installment schedule, frequency, and missed-payment terms.'],['letter','Open Letter Builder','Use the existing letter builder for custom collection letters.']]; box.innerHTML=templates.map(t=>'<div class="docTemplate" data-kind="'+t[0]+'" onclick="selectDocTemplate(\''+t[0]+'\')"><div class="docTemplateTitle">'+dEsc(t[1])+'</div><div class="docTemplateText">'+dEsc(t[2])+'</div></div>').join('');}
  async function hydrateDocInputs(kind){
    let a=dCurrent(); if(!a)return;
    if(!dEl('docDate'))return;
    dEl('docDate').value=dToday(); dEl('docDueDate').value=addDays(10); dEl('docNumber').value=dId(kind==='receipt'?'RCPT':kind==='settlement'?'SETTLE':'PLAN'); dEl('docAuthorizedBy').value=(window.currentUser&&currentUser.email)||'Authorized Representative';
    dEl('docRemainingBalance').value=dBalance(a).toFixed(2); dEl('docPaymentAmount').value='0.00'; dEl('docSettlementAmount').value='0.00'; dEl('docInstallmentAmount').value='0.00'; dEl('docFrequency').value='Monthly'; dEl('docNotes').value='';
    let rows=await dFetch('/payment_ledger?account_id=eq.'+encodeURIComponent(a.id)+'&select=*&order=created_at.desc&limit=1'); let pay=dCamel(rows[0]||{});
    if(pay.amount)dEl('docPaymentAmount').value=dMoneyNum(pay.amount).toFixed(2); if(pay.balanceAfter!=null)dEl('docRemainingBalance').value=dMoneyNum(pay.balanceAfter).toFixed(2);
    let settlements=await dFetch('/settlements?account_id=eq.'+encodeURIComponent(a.id)+'&select=*&order=created_at.desc&limit=1'); let set=dCamel(settlements[0]||{});
    if(set.settlementAmount)dEl('docSettlementAmount').value=dMoneyNum(set.settlementAmount).toFixed(2); if(set.dueDate)dEl('docDueDate').value=String(set.dueDate).slice(0,10); if(set.notes)dEl('docNotes').value=String(set.notes).slice(0,600);
    let plans=await dFetch('/payment_plans?account_id=eq.'+encodeURIComponent(a.id)+'&select=*&order=created_at.desc&limit=1'); let plan=dCamel(plans[0]||{});
    if(plan.paymentAmount||plan.installmentAmount||plan.amount)dEl('docInstallmentAmount').value=dMoneyNum(plan.paymentAmount||plan.installmentAmount||plan.amount).toFixed(2); if(plan.frequency)dEl('docFrequency').value=String(plan.frequency); if(plan.remainingAmount!=null)dEl('docRemainingBalance').value=dMoneyNum(plan.remainingAmount).toFixed(2);
    if(kind==='receipt')generateReceiptDocument(false); else if(kind==='settlement')generateSettlementLetter(false); else if(kind==='plan')generatePaymentPlanAgreement(false); else renderDefaultPreview();
  }
  window.selectDocTemplate=async function(kind){if(kind==='letter'){if(typeof openDocumentGenerator==='function')return openDocumentGenerator();} setTemplateActive(kind); await hydrateDocInputs(kind);};

  function companyHeader(title,docNo){let brand=(dEl('appBrandName')?.textContent||'Co Pilot Collections Manager'); return '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:18px"><div><h1>'+dEsc(title)+'</h1><div class="muted">'+dEsc(brand)+'</div></div><div style="text-align:right"><b>Document #</b><br>'+dEsc(docNo||'—')+'<br><span class="muted">'+dEsc(dDate(dVal('docDate')||dToday()))+'</span></div></div><hr style="border:0;border-top:1px solid #e2e8f0;margin:16px 0">'}
  function accountBlock(a){return '<table><tr><th>Consumer</th><td>'+dEsc(dName(a))+'</td><th>Account #</th><td>'+dEsc(dAcct(a)||'—')+'</td></tr><tr><th>Original Creditor</th><td>'+dEsc(a?.originalCreditor||a?.issuerName||a?.portfolio||'—')+'</td><th>Current Balance</th><td>'+dMoney(dBalance(a))+'</td></tr><tr><th>Address</th><td colspan="3">'+dEsc([a?.address,a?.address2,a?.city,a?.state,a?.zip].filter(Boolean).join(', ')||'—')+'</td></tr></table>'}
  function scheduleTable(rows){if(!rows||!rows.length)return '<p class="muted">No saved schedule rows found. Use the payment-plan section to create the schedule.</p>'; return '<table><thead><tr><th>Due Date</th><th>Amount Due</th><th>Amount Paid</th><th>Status</th><th>Paid Date</th></tr></thead><tbody>'+rows.slice(0,24).map(r=>{let x=dCamel(r);return '<tr><td>'+dEsc(dDate(x.dueDate))+'</td><td>'+dMoney(dMoneyNum(x.amountDue||x.amount||x.paymentAmount))+'</td><td>'+dMoney(dMoneyNum(x.amountPaid||0))+'</td><td>'+dEsc(x.status||'Scheduled')+'</td><td>'+dEsc(dDate(x.paidDate||x.paymentDate))+'</td></tr>'}).join('')+'</tbody></table>'}
  function renderDefaultPreview(){let a=dCurrent(); let el=dEl('docPreview'); if(!el)return; el.innerHTML=companyHeader('Document Preview',dVal('docNumber'))+(a?accountBlock(a):'<p>No account selected.</p>')+'<p class="muted">Choose a document type to generate a receipt, settlement approval letter, or payment plan agreement.</p>';}
  function setPreview(html,type){let p=dEl('docPreview'); if(p)p.innerHTML=html; let t=dEl('docPreviewType'); if(t)t.textContent=type||'Preview';}
  async function logGenerated(type,summary){let a=dCurrent(); if(!a)return; await dActivity(a.id,type,summary+' • Document # '+(dVal('docNumber')||'—')); await loadDocumentHistory(a.id);}
  window.generateReceiptDocument=async function(shouldLog=true){let a=currentDocAccount(); if(!a)return; setTemplateActive('receipt'); let amt=dMoneyNum(dVal('docPaymentAmount')), rem=dMoneyNum(dVal('docRemainingBalance')); let html=companyHeader('Payment Receipt',dVal('docNumber'))+accountBlock(a)+'<h2>Receipt Details</h2><table><tr><th>Payment Amount</th><td>'+dMoney(amt)+'</td><th>Payment Date</th><td>'+dEsc(dDate(dVal('docDate')))+' </td></tr><tr><th>Remaining Balance</th><td>'+dMoney(rem)+'</td><th>Created By</th><td>'+dEsc((currentUser&&currentUser.email)||'—')+'</td></tr></table><p>This receipt confirms that the payment listed above was recorded on the account shown. This receipt does not modify any agreement unless separately authorized in writing.</p><div class="docSignLine">'+dEsc(dVal('docAuthorizedBy')||'Authorized Representative')+'</div><div class="docWatermark">Generated by Co Pilot Collections Manager</div>'; setPreview(html,'Payment Receipt'); if(shouldLog)await logGenerated('Payment Receipt Generated','Generated payment receipt for '+dMoney(amt));};
  window.generateSettlementLetter=async function(shouldLog=true){let a=currentDocAccount(); if(!a)return; setTemplateActive('settlement'); let bal=dBalance(a), amt=dMoneyNum(dVal('docSettlementAmount')), discount=Math.max(0,bal-amt), pct=bal?amt/bal*100:0; let html=companyHeader('Settlement Approval Letter',dVal('docNumber'))+accountBlock(a)+'<h2>Approved Settlement Terms</h2><table><tr><th>Original / Current Balance</th><td>'+dMoney(bal)+'</td><th>Approved Settlement</th><td>'+dMoney(amt)+'</td></tr><tr><th>Settlement Percentage</th><td>'+pct.toFixed(2)+'%</td><th>Discount</th><td>'+dMoney(discount)+'</td></tr><tr><th>Valid Until</th><td>'+dEsc(dDate(dVal('docDueDate')))+'</td><th>Payment Frequency</th><td>'+dEsc(dVal('docFrequency'))+'</td></tr></table><p>This settlement is valid only if payment is made according to the terms above and by the valid-until date. If payment is not received by the deadline, the settlement may be void and the account may return to the prior balance, less any payments actually received, subject to applicable law and account terms.</p><h2>Notes / Terms</h2><p>'+dEsc(dVal('docNotes')||'No additional terms entered.').replace(/\n/g,'<br>')+'</p><div class="docSignLine">'+dEsc(dVal('docAuthorizedBy')||'Authorized Representative')+'</div><div class="docWatermark">Generated by Co Pilot Collections Manager</div>'; setPreview(html,'Settlement Letter'); if(shouldLog)await logGenerated('Settlement Letter Generated','Generated settlement letter for '+dMoney(amt));};
  window.generatePaymentPlanAgreement=async function(shouldLog=true){let a=currentDocAccount(); if(!a)return; setTemplateActive('plan'); let rows=await dFetch('/payment_plan_payments?account_id=eq.'+encodeURIComponent(a.id)+'&select=*&order=due_date.asc&limit=100'); let total=dMoneyNum(dVal('docRemainingBalance')||dBalance(a)), each=dMoneyNum(dVal('docInstallmentAmount')), freq=dVal('docFrequency'); let html=companyHeader('Payment Plan Agreement',dVal('docNumber'))+accountBlock(a)+'<h2>Payment Plan Terms</h2><table><tr><th>Plan Balance</th><td>'+dMoney(total)+'</td><th>Installment Amount</th><td>'+dMoney(each)+'</td></tr><tr><th>Frequency</th><td>'+dEsc(freq||'Monthly')+'</td><th>First / Next Due</th><td>'+dEsc(dDate(dVal('docDueDate')))+'</td></tr></table><h2>Schedule</h2>'+scheduleTable(rows)+'<p>If a payment is missed, returned, or paid late, the plan may be marked broken and the account may require admin review. Payment-plan terms remain subject to the account notes and applicable law.</p><h2>Notes / Terms</h2><p>'+dEsc(dVal('docNotes')||'No additional terms entered.').replace(/\n/g,'<br>')+'</p><div class="docSignLine">'+dEsc(dVal('docAuthorizedBy')||'Authorized Representative')+'</div><div class="docWatermark">Generated by Co Pilot Collections Manager</div>'; setPreview(html,'Plan Agreement'); if(shouldLog)await logGenerated('Payment Plan Agreement Generated','Generated payment plan agreement for '+dMoney(total));};

  async function loadDocumentHistory(accountId){
    let wrap=dEl('docHistoryWrap'); if(!wrap)return;
    let rows=await dFetch('/activity_logs?account_id=eq.'+encodeURIComponent(accountId)+'&select=*&order=created_at.desc&limit=200');
    rows=rows.map(dCamel).filter(r=>/Receipt|Letter|Agreement|Document|Communication|Certified|Mailed|Printed/i.test(String(r.actionType||''))+(/Receipt|Letter|Agreement|Document|Certified|Mailed|Printed/i.test(String(r.actionText||''))?1:0));
    window.__docHistoryRows=rows;
    let count=dEl('docHistoryCount'); if(count)count.textContent=rows.length+' rows'; let m=dEl('docMetricsCount'); if(m)m.textContent=rows.length+' docs';
    renderDocMetrics(rows);
    if(!rows.length){wrap.innerHTML='<div class="docNotice">No receipt or letter history has been logged for this account yet.</div>';return;}
    wrap.innerHTML='<table class="docHistoryTable"><thead><tr><th>Date</th><th>Type</th><th>Summary</th><th>Created By</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+dEsc(dDateTime(r.createdAt))+'</td><td>'+dEsc(r.actionType||'Document')+'</td><td>'+dEsc(r.actionText||'')+'</td><td>'+dEsc(r.createdByEmail||'—')+'</td></tr>').join('')+'</tbody></table>';
  }
  function renderDocMetrics(rows){let box=dEl('docMetrics'); if(!box)return; let receipts=rows.filter(r=>/receipt/i.test(r.actionType||r.actionText||'')).length, letters=rows.filter(r=>/letter|settlement/i.test(r.actionType||r.actionText||'')).length, plans=rows.filter(r=>/agreement|plan/i.test(r.actionType||r.actionText||'')).length, comms=rows.filter(r=>/mail|printed|certified|communication/i.test(r.actionType||r.actionText||'')).length; box.innerHTML=[['Receipts',receipts],['Letters',letters],['Plan Agreements',plans],['Comms Docs',comms]].map(x=>'<div class="docMetric"><div class="docMetricLabel">'+dEsc(x[0])+'</div><div class="docMetricValue">'+dEsc(x[1])+'</div></div>').join('')}
  window.exportDocumentHistoryCSV=function(){let rows=window.__docHistoryRows||[]; let csv=[['Date','Type','Summary','Created By'].map(dCsvCell).join(',')].concat(rows.map(r=>[r.createdAt,r.actionType,r.actionText,r.createdByEmail].map(dCsvCell).join(','))).join('\n'); dDownload('co-pilot-document-history.csv',csv)};
  window.printCurrentDocument=function(){let p=dEl('docPreview'); if(!p)return; let w=window.open('','_blank','width=900,height=1100'); let html='<!doctype html><html><head><title>Co Pilot Document</title></head><body>'+p.innerHTML+'

<script id="productionStabilityPhase1Script">
(function(){
  if(window.__cpcmProductionStabilityPhase1Loaded) return;
  window.__cpcmProductionStabilityPhase1Loaded = true;
  window.CPCM_ADMIN_EMAIL = 'afinch2678@gmail.com';
  window.cpcmCurrentEmail = function(){
    try{return String((window.currentUser && window.currentUser.email) || '').toLowerCase().trim();}catch(e){return '';}
  };
  window.cpcmIsAdmin = function(){
    try{
      var email = window.cpcmCurrentEmail();
      var role = String((window.currentUser && (window.currentUser.role || window.currentUser.userRole)) || '').toLowerCase();
      var badge = String((document.getElementById('roleBadge') || {}).textContent || '').toLowerCase();
      return email === window.CPCM_ADMIN_EMAIL || !!(window.currentUser && window.currentUser.isAdmin) || role === 'admin' || badge.indexOf('admin') >= 0;
    }catch(e){return false;}
  };
  window.cpcmCloseAllOverlays = function(exceptId){
    try{
      document.querySelectorAll('.modal.open').forEach(function(el){if(el.id !== exceptId) el.classList.remove('open');});
      ['reportsPageStable','cleanupPage','importHistoryPage','settlementDashboardPage','documentCenterPage','ticklerCommandCenterPage','managerQaScorecardsPage'].forEach(function(id){
        var el=document.getElementById(id);
        if(el && id !== exceptId) el.classList.remove('open');
      });
    }catch(e){}
  };
})();


// ===== ticklerFollowupCommandCenterScript =====
(function(){
  if(window.__ticklerCCInstalled) return; window.__ticklerCCInstalled=true;
  var tick={tab:'today',type:'all',search:'',emp:'all',tasks:[]};
  function u(){try{return (typeof currentUser!=='undefined'&&currentUser)?currentUser:{}}catch(e){return {}}}
  function email(){return String(u().email||'').toLowerCase().trim()}
  function admin(){try{return !!(u().isAdmin||email()==='afinch2678@gmail.com'||(typeof isAdminEmail==='function'&&isAdminEmail(email())))}catch(e){return false}}
  function accs(){try{return (typeof accounts!=='undefined'&&Array.isArray(accounts))?accounts:[]}catch(e){return []}}
  function cur(){try{return typeof getCurrent==='function'?getCurrent():null}catch(e){return null}}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
  function camel(o){if(!o||typeof o!=='object')return o;var r={};Object.keys(o).forEach(function(k){r[k.replace(/_([a-z])/g,function(_,c){return c.toUpperCase()})]=o[k]});return r}
  function money(v){var n=Number(String(v||0).replace(/[^0-9.-]/g,''));return (isFinite(n)?n:0).toLocaleString('en-US',{style:'currency',currency:'USD'})}
  function num(v){var n=Number(String(v||0).replace(/[^0-9.-]/g,''));return isFinite(n)?n:0}
  function iso(v){if(!v)return '';var d=new Date(v);return isNaN(d)?String(v).slice(0,10):d.toISOString().slice(0,10)}
  function today(){var d=new Date();d.setHours(0,0,0,0);return d.toISOString().slice(0,10)}
  function add(days){var d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()+Number(days||0));return d.toISOString().slice(0,10)}
  function label(v){if(!v)return 'No date';var d=new Date(String(v).slice(0,10)+'T12:00:00');return isNaN(d)?v:d.toLocaleDateString()}
  function name(a){try{return typeof nameOf==='function'?nameOf(a):(a&&((a.fullName||a.name)||[a.firstName,a.lastName].filter(Boolean).join(' ')||a.accountNumber))||'Unknown'}catch(e){return 'Unknown'}}
  function acct(a){try{return typeof acctNo==='function'?acctNo(a):((a&&(a.accountNumber||a.clientAccountNumber||a.accountId))||'')}catch(e){return ''}}
  function bal(a){return num(a&&(a.currentBalance||a.balance||a.originalBalance||a.principal||a.accountBalance))}
  function aid(r){return r.accountId||r.account_id||''}
  function assigned(r,a){return String(r.assignedToEmail||r.assigned_to_email||r.employeeEmail||r.createdByEmail||r.created_by_email||(a&&(a.assignedToEmail||a.assigned_to_email))||'unassigned').toLowerCase().trim()}
  function allowed(r,a){if(admin())return true;var e=email();return assigned(r,a)===e || accs().some(function(x){return String(x.id)===String(aid(r))})}
  function closed(s){return /paid|complete|completed|closed|cancel|void|resolved|rejected|rolled back/i.test(String(s||''))}
  async function sf(path){try{if(typeof dbFetch!=='function')return [];var data=await Promise.race([dbFetch(path),new Promise(function(_,rej){setTimeout(function(){rej(new Error('timeout'))},7000)})]);return (Array.isArray(data)?data:[]).map(camel)}catch(e){return []}}
  function mapAccounts(){var m={};accs().forEach(function(a){if(a&&a.id)m[String(a.id)]=a});return m}
  function bucket(d){var t=today();if(d&&d<t)return 'overdue';if(d===t)return 'today';if(d&&d<=add(7))return 'week';if(d&&d<=add(31))return 'month';return 'future'}
  function priority(t){if(t.bucket==='overdue'||/broken|overdue/i.test(t.type+' '+t.status))return 'critical';if(t.bucket==='today'||t.balance>=5000)return 'high';if(t.bucket==='week')return 'medium';return 'normal'}
  function pushTask(list,t,map){var a=map[String(t.accountId||'')];t.account=a;t.accountName=t.accountName||name(a);t.accountNumber=t.accountNumber||acct(a);t.balance=t.balance==null?bal(a):t.balance;t.assignedTo=String(t.assignedTo||assigned(t,a)||'unassigned').toLowerCase();if(!allowed(t,a))return;t.dueDate=iso(t.dueDate);t.bucket=bucket(t.dueDate);t.priority=t.priority||priority(t);t.status=t.status||'Open';t.key=t.key||[t.source,t.sourceId,t.accountId,t.type,t.dueDate].join(':');list.push(t)}
  async function loadTasks(){
    if(!accs().length && typeof loadAccounts==='function') await loadAccounts().catch(function(){});
    var map=mapAccounts(), list=[];
    var rows=await Promise.all([sf('/follow_ups?select=*&order=due_date.asc&limit=20000'),sf('/payment_plan_payments?select=*&order=due_date.asc&limit=20000'),sf('/payment_promises?select=*&order=due_date.asc&limit=20000'),sf('/settlements?select=*&order=created_at.desc&limit=10000'),sf('/disputes?select=*&order=created_at.desc&limit=10000')]);
    rows[0].forEach(function(r){if(closed(r.status))return;pushTask(list,{source:'follow_ups',sourceId:r.id,accountId:aid(r),type:/call/i.test(r.followUpType||'')?'Callback':'Follow-Up',title:r.followUpType||'Follow-Up',description:r.reason||r.notes||'Scheduled follow-up',dueDate:r.dueDate,status:r.status,assignedTo:assigned(r,map[String(aid(r))]),raw:r},map)});
    rows[1].forEach(function(r){if(closed(r.status))return;var due=iso(r.dueDate||r.paymentDate);var amt=num(r.amountDue||r.amount||r.paymentAmount);pushTask(list,{source:'payment_plan_payments',sourceId:r.id,accountId:aid(r),type:due&&due<today()?'Broken Payment Plan':'Payment Plan Due',title:'Payment Plan Due',description:'Installment due '+label(due)+' for '+money(amt),dueDate:due,status:r.status||'Scheduled',amount:amt,raw:r},map)});
    rows[2].forEach(function(r){if(closed(r.status))return;var due=iso(r.dueDate||r.promiseDate);var amt=num(r.paymentAmount||r.promiseAmount||r.amount);pushTask(list,{source:'payment_promises',sourceId:r.id,accountId:aid(r),type:due&&due<today()?'Broken Promise':'Promise Due',title:due&&due<today()?'Broken Promise':'Promise Due',description:'Promise due '+label(due)+' for '+money(amt),dueDate:due,status:r.status||'Open',amount:amt,raw:r},map)});
    rows[3].forEach(function(r){if(closed(r.status))return;var due=iso(r.dueDate||r.settlementDueDate||r.paymentDueDate||r.createdAt);var amt=num(r.settlementAmount||r.approvedAmount);pushTask(list,{source:'settlements',sourceId:r.id,accountId:aid(r),type:/pending/i.test(r.status||'')?'Settlement Pending':'Settlement Due Soon',title:'Settlement',description:'Settlement '+(r.status||'Open')+' for '+money(amt),dueDate:due,status:r.status||'Open',amount:amt,raw:r},map)});
    rows[4].forEach(function(r){if(closed(r.status))return;var due=iso(r.followUpDate||r.dueDate||r.createdAt);pushTask(list,{source:'disputes',sourceId:r.id,accountId:aid(r),type:'Dispute Follow-Up',title:'Dispute Follow-Up',description:r.disputeReason||r.notes||'Dispute needs follow-up',dueDate:due,status:r.status||'Open',raw:r},map)});
    accs().forEach(function(a){if(/closed|paid|settled/i.test(String(a.status||'')))return;var next=iso(a.nextCallAt||a.next_call_at);if(next)pushTask(list,{source:'accounts',sourceId:a.id,accountId:a.id,type:'Callback',title:'Next Call Due',description:'Scheduled next call from call outcome',dueDate:next,status:a.status||'Open'},map);var b=bal(a), last=a.lastCalledAt||a.last_called_at||a.updatedAt||a.updated_at||a.createdAt||a.created_at;var days=999;if(last){var d=new Date(last);if(!isNaN(d))days=Math.floor((Date.now()-d.getTime())/86400000)}if(days>=14&&b>0)pushTask(list,{source:'accounts',sourceId:a.id+':nocontact',accountId:a.id,type:'No Contact',title:'No Contact in '+days+' Days',description:'No recent logged call/contact',dueDate:today(),status:a.status||'Open',priority:days>=30?'high':'medium'},map);if(b>=5000&&days>=7)pushTask(list,{source:'accounts',sourceId:a.id+':highbal',accountId:a.id,type:'High Balance',title:'High Balance Needs Action',description:'Balance '+money(b)+' with no recent contact',dueDate:today(),status:a.status||'Open',priority:'high'},map)});
    tick.tasks=list.sort(function(a,b){var r={critical:0,high:1,medium:2,normal:3};return (r[a.priority]-r[b.priority])||String(a.dueDate||'9999').localeCompare(String(b.dueDate||'9999'))});return tick.tasks;
  }
  function ensureStyle(){if(document.getElementById('ticklerCCStyle'))return;var st=document.createElement('style');st.id='ticklerCCStyle';st.textContent='#ticklerPage{position:fixed;inset:0;background:#eef3f9;z-index:64000;display:none;color:#0f172a;font-family:Arial,Helvetica,sans-serif;overflow:hidden}#ticklerPage.open{display:flex;flex-direction:column}.tickTop{background:linear-gradient(90deg,#05225f,#0b45c6);color:#fff;min-height:70px;display:flex;justify-content:space-between;gap:12px;align-items:center;padding:12px 18px}.tickTitle{font-size:21px;font-weight:1000}.tickSub{font-size:12px;color:#dbeafe}.tickActions{display:flex;gap:8px;flex-wrap:wrap}.tickActions button,.tickBtn{height:38px;border:0;border-radius:10px;padding:0 12px;font-weight:900;background:#2563eb;color:#fff;cursor:pointer}.tickActions .outline,.tickBtn.outline{background:#fff;color:#1d4ed8}.tickActions .green,.tickBtn.green{background:#16a34a}.tickActions .gray,.tickBtn.gray{background:#334155}.tickBody{padding:16px;overflow:auto}.tickNotice{border:1px solid #bfdbfe;background:#eff6ff;color:#1e3a8a;border-radius:14px;padding:10px 12px;font-size:13px;font-weight:850;margin-bottom:12px}.tickMetrics{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:10px;margin-bottom:12px}.tickMetric,.tickCard{background:#fff;border:1px solid #dbe3ef;border-radius:14px;box-shadow:0 3px 10px rgba(15,23,42,.04)}.tickMetric{padding:12px}.tickMetricLabel{font-size:10px;text-transform:uppercase;color:#64748b;font-weight:1000}.tickMetricVal{font-size:20px;font-weight:1000;margin-top:4px}.tickFilters{display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;gap:10px;margin-bottom:12px}.tickFilters label{font-size:11px;font-weight:900;color:#334155;display:block;margin-bottom:4px}.tickFilters input,.tickFilters select{height:38px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;padding:8px 10px;width:100%}.tickTabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}.tickTab{border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;border-radius:999px;padding:8px 12px;font-size:12px;font-weight:1000;cursor:pointer}.tickTab.active{background:#2563eb;color:#fff}.tickGrid{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(340px,.75fr);gap:12px}.tickCardHead{display:flex;justify-content:space-between;align-items:center;padding:13px 14px;border-bottom:1px solid #e5edf7;background:#f8fbff}.tickCardTitle{font-weight:1000}.tickPill{border-radius:999px;padding:4px 8px;font-size:11px;font-weight:900;background:#f1f5f9;color:#334155;display:inline-block}.tickPill.red{background:#fee2e2;color:#991b1b}.tickPill.orange{background:#fff7ed;color:#9a3412}.tickPill.blue{background:#dbeafe;color:#1d4ed8}.tickPill.green{background:#dcfce7;color:#166534}.tickList{max-height:575px;overflow:auto;padding:10px}.tickItem{border:1px solid #e2e8f0;border-left:5px solid #64748b;border-radius:14px;padding:12px;margin-bottom:9px;display:grid;grid-template-columns:1fr auto;gap:10px}.tickItem.critical{border-left-color:#dc2626}.tickItem.high{border-left-color:#f97316}.tickItem.medium{border-left-color:#2563eb}.tickItemTitle{font-weight:1000}.tickMeta{display:flex;gap:6px;flex-wrap:wrap;margin-top:7px}.tickDesc{font-size:12px;color:#475569;margin-top:7px;line-height:1.35}.tickMini{display:flex;flex-direction:column;gap:6px}.tickMini button{height:30px;border-radius:8px;border:0;padding:0 9px;font-size:11px;font-weight:900;background:#2563eb;color:#fff;cursor:pointer}.tickMini .outline{background:#fff;color:#1d4ed8;border:1px solid #bfdbfe}.tickMini .green{background:#16a34a}.tickSide{padding:12px}.tickSideRow{display:flex;justify-content:space-between;border-bottom:1px solid #edf2f8;padding:9px 0;font-size:13px}.tickEmpty{border:1px dashed #cbd5e1;background:#f8fafc;color:#64748b;border-radius:14px;padding:18px;text-align:center;font-weight:850}.tickNew{display:none;grid-template-columns:repeat(4,1fr);gap:8px;padding:12px;border-top:1px solid #e5edf7;background:#f8fbff}.tickNew.open{display:grid}.tickNew input,.tickNew select{height:36px;border:1px solid #cbd5e1;border-radius:9px;padding:7px}.topActions .ticklerTopBtn{background:#0f766e!important}.navIcon.ticklerNavBtn{background:#0f766e;color:#fff}.ticklerBadge{background:#dc2626;color:#fff;border-radius:999px;min-width:18px;height:18px;display:inline-grid;place-items:center;font-size:10px;font-weight:1000;margin-left:4px}.ticklerBadge.hidden{display:none!important}@media(max-width:1300px){.tickMetrics{grid-template-columns:repeat(4,1fr)}.tickGrid{grid-template-columns:1fr}.tickFilters{grid-template-columns:repeat(2,1fr)}}@media(max-width:760px){.tickTop{align-items:flex-start;flex-direction:column}.tickMetrics,.tickFilters,.tickNew{grid-template-columns:1fr}.tickItem{grid-template-columns:1fr}.tickMini{flex-direction:row}}';document.head.appendChild(st)}
  function ensureNav(){ensureStyle();var top=document.querySelector('.topActions');if(top&&!document.getElementById('ticklerTopBtn')){var b=document.createElement('button');b.id='ticklerTopBtn';b.className='gray ticklerTopBtn';b.innerHTML='Tickler <span id="ticklerTopBadge" class="ticklerBadge hidden">0</span>';b.onclick=openTicklerCommandCenter;var ref=Array.from(top.querySelectorAll('button')).find(function(x){return /Queue/i.test(x.textContent||'')});ref&&ref.parentNode?ref.parentNode.insertBefore(b,ref.nextSibling):top.insertBefore(b,top.firstChild)}var rail=document.querySelector('.navRail');if(rail&&!document.getElementById('ticklerNavBtn')){var n=document.createElement('button');n.id='ticklerNavBtn';n.className='navIcon ticklerNavBtn';n.title='Tickler / Follow-Up Command Center';n.innerHTML='<span class="navEmoji">📅</span><span id="ticklerNavBadge" class="ticklerBadge hidden">0</span>';n.onclick=openTicklerCommandCenter;var rr=Array.from(rail.querySelectorAll('button')).find(function(x){return /Daily Work Queue/i.test(x.title||'')});rr&&rr.parentNode?rr.parentNode.insertBefore(n,rr.nextSibling):rail.insertBefore(n,rail.firstChild)}}
  function ensurePage(){ensureNav();var p=document.getElementById('ticklerPage');if(p)return p;p=document.createElement('div');p.id='ticklerPage';p.innerHTML='<div class="tickTop"><div><div class="tickTitle">Tickler Calendar + Follow-Up Command Center</div><div class="tickSub">Today\'s follow-ups, callbacks, promises, plan payments, settlements, disputes, broken promises, stale accounts, and high-balance action items.</div></div><div class="tickActions"><button class="outline" onclick="closeTicklerCommandCenter()">Back to Queue</button><button class="gray" onclick="refreshTicklerCommandCenter()">Refresh</button><button class="green" onclick="toggleTicklerNew()">New Follow-Up</button><button onclick="exportTicklerCSV()">Export CSV</button></div></div><div class="tickBody"><div id="tickNotice" class="tickNotice">Loading command center...</div><div id="tickMetrics" class="tickMetrics"></div><div class="tickFilters"><div><label>Search</label><input id="tickSearch" placeholder="Search task, account, notes..." oninput="setTicklerSearch(this.value)"></div><div><label>Type</label><select id="tickType" onchange="setTicklerType(this.value)"><option value="all">All Types</option><option>Follow-Up</option><option>Callback</option><option>Promise</option><option>Payment Plan</option><option>Settlement</option><option>Dispute</option><option>No Contact</option><option>High Balance</option><option>Broken</option></select></div><div><label>Employee</label><select id="tickEmp" onchange="setTicklerEmployee(this.value)"><option value="all">All Employees</option></select></div><div><label>View</label><select id="tickView" onchange="setTicklerTab(this.value)"><option value="today">Today</option><option value="week">This Week</option><option value="month">This Month</option><option value="overdue">Overdue</option><option value="all">All Open</option></select></div><button class="tickBtn green" onclick="runTicklerAutomation()">Promise Check</button></div><div id="tickTabs" class="tickTabs"></div><div class="tickGrid"><div class="tickCard"><div class="tickCardHead"><div class="tickCardTitle">Work List</div><span id="tickCount" class="tickPill blue">0 tasks</span></div><div id="tickList" class="tickList"></div><div id="tickNew" class="tickNew"></div></div><div><div class="tickCard"><div class="tickCardHead"><div class="tickCardTitle">Calendar View</div><span class="tickPill blue">By Due Date</span></div><div id="tickCal" class="tickSide"></div></div><div class="tickCard" style="margin-top:12px"><div class="tickCardHead"><div class="tickCardTitle">Summary</div><span class="tickPill green">Live</span></div><div id="tickSummary" class="tickSide"></div></div></div></div></div>';document.body.appendChild(p);return p}
  function filtered(){var q=String(tick.search||'').toLowerCase(), type=String(tick.type||'all').toLowerCase(), emp=String(tick.emp||'all').toLowerCase();return tick.tasks.filter(function(t){if(tick.tab==='today'&&t.bucket!=='today')return false;if(tick.tab==='week'&&!['overdue','today','week'].includes(t.bucket))return false;if(tick.tab==='month'&&!['overdue','today','week','month'].includes(t.bucket))return false;if(tick.tab==='overdue'&&t.bucket!=='overdue')return false;if(type!=='all'&&!String(t.type).toLowerCase().includes(type))return false;if(emp!=='all'&&String(t.assignedTo).toLowerCase()!==emp)return false;if(q&&!String([t.type,t.title,t.accountName,t.accountNumber,t.description,t.status,t.assignedTo].join(' ')).toLowerCase().includes(q))return false;return true})}
  function m(label,val){return '<div class="tickMetric"><div class="tickMetricLabel">'+esc(label)+'</div><div class="tickMetricVal">'+esc(val)+'</div></div>'}
  function render(){var rows=filtered(), all=tick.tasks, todayC=all.filter(function(t){return t.bucket==='today'}).length, over=all.filter(function(t){return t.bucket==='overdue'}).length;document.getElementById('tickMetrics').innerHTML=[m('Due Today',todayC),m('Overdue',over),m('Promises',all.filter(function(t){return /promise/i.test(t.type)}).length),m('Plan Payments',all.filter(function(t){return /payment plan/i.test(t.type)}).length),m('Callbacks',all.filter(function(t){return /callback/i.test(t.type)}).length),m('Broken',all.filter(function(t){return /broken/i.test(t.type)}).length),m('Settlements',all.filter(function(t){return /settlement/i.test(t.type)}).length),m('Total Open',all.length)].join('');document.getElementById('tickTabs').innerHTML=[['today','Today',todayC],['week','This Week',all.filter(function(t){return ['overdue','today','week'].includes(t.bucket)}).length],['month','This Month',all.filter(function(t){return ['overdue','today','week','month'].includes(t.bucket)}).length],['overdue','Overdue',over],['all','All Open',all.length]].map(function(x){return '<button class="tickTab '+(tick.tab===x[0]?'active':'')+'" onclick="setTicklerTab(\''+x[0]+'\')">'+x[1]+' <b>'+x[2]+'</b></button>'}).join('');var emp=document.getElementById('tickEmp'), cur=emp.value||'all', emps=Array.from(new Set(all.map(function(t){return t.assignedTo||'unassigned'}))).sort();emp.innerHTML='<option value="all">All Employees</option>'+emps.map(function(e){return '<option value="'+esc(e)+'">'+esc(e)+'</option>'}).join('');emp.value=emps.includes(cur)?cur:'all';document.getElementById('tickCount').textContent=rows.length+' tasks';var list=document.getElementById('tickList');list.innerHTML=rows.length?rows.map(function(t){return '<div class="tickItem '+t.priority+'"><div><div class="tickItemTitle">'+esc(t.title)+' — '+esc(t.accountName)+'</div><div class="tickMeta"><span class="tickPill '+(t.bucket==='overdue'?'red':t.bucket==='today'?'orange':'blue')+'">'+esc(t.bucket==='overdue'?'Overdue':label(t.dueDate))+'</span><span class="tickPill blue">'+esc(t.type)+'</span><span class="tickPill green">'+esc(t.assignedTo)+'</span><span class="tickPill">'+esc(t.status)+'</span>'+(t.amount?'<span class="tickPill">'+esc(money(t.amount))+'</span>':'')+'</div><div class="tickDesc">'+esc(t.description)+'<br>Acct: '+esc(t.accountNumber||'—')+' • Balance: '+esc(money(t.balance))+'</div></div><div class="tickMini"><button class="outline" onclick="openTicklerAccount(\''+esc(t.accountId)+'\')">Open</button><button onclick="snoozeTicklerTask(\''+esc(t.key)+'\')">Snooze</button><button class="green" onclick="completeTicklerTask(\''+esc(t.key)+'\')">Done</button></div></div>'}).join(''):'<div class="tickEmpty">No follow-ups match this view.</div>';var groups={};rows.forEach(function(t){(groups[t.dueDate||'No Date']||(groups[t.dueDate||'No Date']=[])).push(t)});document.getElementById('tickCal').innerHTML=Object.keys(groups).sort().slice(0,8).map(function(d){return '<div class="tickSideRow"><span><b>'+esc(d==='No Date'?d:label(d))+'</b><br><small>'+esc(groups[d].slice(0,3).map(function(t){return t.title}).join(', '))+'</small></span><b>'+groups[d].length+'</b></div>'}).join('')||'<div class="tickEmpty">Calendar clear.</div>';var amount=rows.reduce(function(s,t){return s+num(t.amount)},0);document.getElementById('tickSummary').innerHTML='<div class="tickSideRow"><span>Visible tasks</span><b>'+rows.length+'</b></div><div class="tickSideRow"><span>Visible dollars</span><b>'+esc(money(amount))+'</b></div><div class="tickNotice" style="margin-top:10px">Admin sees all employees. Employees see only assigned work. Computed tasks can be opened and worked from the account.</div>';updateBadge();document.getElementById('tickNotice').textContent=admin()?'Admin view: all employee follow-ups and portfolio action items.':'Employee view: assigned follow-ups and accounts only.'}
  function updateBadge(){var c=tick.tasks.filter(function(t){return t.bucket==='today'||t.bucket==='overdue'}).length;['ticklerTopBadge','ticklerNavBadge'].forEach(function(id){var e=document.getElementById(id);if(e){e.textContent=c>99?'99+':c;e.classList.toggle('hidden',!c)}})}
  window.openTicklerCommandCenter=async function(){var p=ensurePage();p.classList.add('open');await window.refreshTicklerCommandCenter()};
  window.closeTicklerCommandCenter=function(){var p=document.getElementById('ticklerPage');if(p)p.classList.remove('open')};
  window.refreshTicklerCommandCenter=async function(){ensurePage();document.getElementById('tickNotice').textContent='Loading follow-ups, promises, plans, settlements, disputes, and reminders...';await loadTasks();render()};
  window.setTicklerTab=function(v){tick.tab=v||'today';var x=document.getElementById('tickView');if(x)x.value=tick.tab;render()}; window.setTicklerSearch=function(v){tick.search=v||'';render()}; window.setTicklerType=function(v){tick.type=v||'all';render()}; window.setTicklerEmployee=function(v){tick.emp=v||'all';render()};
  window.openTicklerAccount=function(id){try{if(id&&typeof setCurrent==='function')setCurrent(id);closeTicklerCommandCenter()}catch(e){alert('Could not open account.')}};
  window.toggleTicklerNew=function(){var box=document.getElementById('tickNew'), a=cur();if(!box)return;if(box.classList.contains('open')){box.classList.remove('open');box.innerHTML='';return}box.classList.add('open');box.innerHTML='<input id="tickNewAcct" value="'+esc(a?name(a):'No account selected')+'" disabled><select id="tickNewType"><option>Callback</option><option>Promise Follow-Up</option><option>Payment Plan Follow-Up</option><option>Settlement Follow-Up</option><option>Dispute Follow-Up</option><option>General Follow-Up</option></select><input id="tickNewDate" type="date" value="'+today()+'"><input id="tickNewTime" type="time"><input id="tickNewNotes" placeholder="Reason / notes"><input id="tickNewAssigned" value="'+esc((a&&(a.assignedToEmail||a.assigned_to_email))||email())+'"><button class="tickBtn green" onclick="saveTicklerQuickFollowUp()">Save</button><button class="tickBtn gray" onclick="toggleTicklerNew()">Cancel</button>'};
  window.saveTicklerQuickFollowUp=async function(){var a=cur();if(!a)return alert('Select an account first.');var row={account_id:a.id,follow_up_type:document.getElementById('tickNewType').value,due_date:document.getElementById('tickNewDate').value||today(),due_time:document.getElementById('tickNewTime').value||null,status:'Open',assigned_to_email:String(document.getElementById('tickNewAssigned').value||email()).toLowerCase(),reason:document.getElementById('tickNewNotes').value||'',notes:document.getElementById('tickNewNotes').value||'',created_by_email:email()};try{await dbFetch('/follow_ups',{method:'POST',body:JSON.stringify([row])});if(typeof insertActivity==='function')await insertActivity(a.id,'Follow-Up Scheduled',row.follow_up_type+' scheduled for '+row.due_date+'. '+row.notes).catch(function(){});document.getElementById('tickNew').classList.remove('open');await refreshTicklerCommandCenter()}catch(e){alert('Follow-up save failed: '+(e.message||e))}};
  window.completeTicklerTask=async function(key){var t=tick.tasks.find(function(x){return x.key===key});if(!t)return;if(t.source==='follow_ups'&&t.sourceId){try{await dbFetch('/follow_ups?id=eq.'+encodeURIComponent(t.sourceId),{method:'PATCH',body:JSON.stringify({status:'Completed',completed_at:new Date().toISOString(),completed_by_email:email(),updated_at:new Date().toISOString()})});if(typeof insertActivity==='function')await insertActivity(t.accountId,'Follow-Up Completed',t.title+' completed from Tickler.').catch(function(){});await refreshTicklerCommandCenter()}catch(e){alert('Could not complete: '+(e.message||e))}}else alert('This is a computed task. Open the account to work it, or Snooze to create a saved follow-up.')};
  window.snoozeTicklerTask=async function(key){var t=tick.tasks.find(function(x){return x.key===key});if(!t)return;var nd=add(1);try{if(t.source==='follow_ups'&&t.sourceId){await dbFetch('/follow_ups?id=eq.'+encodeURIComponent(t.sourceId),{method:'PATCH',body:JSON.stringify({due_date:nd,status:'Open',updated_at:new Date().toISOString()})})}else{await dbFetch('/follow_ups',{method:'POST',body:JSON.stringify([{account_id:t.accountId,follow_up_type:t.type,due_date:nd,status:'Open',assigned_to_email:t.assignedTo||email(),reason:'Snoozed computed task: '+t.title,notes:t.description||'',created_by_email:email()}])})}if(typeof insertActivity==='function')await insertActivity(t.accountId,'Follow-Up Snoozed',t.title+' snoozed to '+nd+'.').catch(function(){});await refreshTicklerCommandCenter()}catch(e){alert('Could not snooze: '+(e.message||e))}};
  window.runTicklerAutomation=async function(){try{if(typeof runPromiseAutomation==='function')await runPromiseAutomation(true,true);await refreshTicklerCommandCenter()}catch(e){alert('Promise check unavailable: '+(e.message||e))}};
  window.exportTicklerCSV=function(){var rows=filtered();var csv=[['Due Date','Bucket','Priority','Type','Title','Account','Account Number','Balance','Amount','Status','Assigned To','Description','Source'].map(function(x){return '"'+String(x).replace(/"/g,'""')+'"'}).join(',')].concat(rows.map(function(t){return [t.dueDate,t.bucket,t.priority,t.type,t.title,t.accountName,t.accountNumber,t.balance,t.amount||'',t.status,t.assignedTo,t.description,t.source].map(function(x){return '"'+String(x==null?'':x).replace(/"/g,'""')+'"'}).join(',')})).join('\n');var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='co-pilot-tickler-followups.csv';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},250)};
  window.refreshTicklerBadge=async function(){await loadTasks();updateBadge()};
  document.addEventListener('DOMContentLoaded',function(){ensureNav();setTimeout(function(){window.refreshTicklerBadge().catch(function(){})},1800)}); setTimeout(ensureNav,500);
})();


// ===== managerQaCollectorScorecardsScript =====
(function(){
  if(window.__managerQaCollectorScorecardsLoaded) return;
  window.__managerQaCollectorScorecardsLoaded = true;
  var qaState = { data:null, reviews:[], range:'month', employee:'all', rating:'all', search:'' };
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function lower(v){return String(v==null?'':v).toLowerCase().trim();}
  function email(){try{return lower((typeof currentUser!=='undefined'&&currentUser&&currentUser.email)||'')}catch(e){return ''}}
  function isAdmin(){try{var e=email(), r=lower((typeof currentUser!=='undefined'&&currentUser&&currentUser.role)||''), badge=lower(document.getElementById('roleBadge')&&document.getElementById('roleBadge').textContent);return e==='afinch2678@gmail.com'||(typeof currentUser!=='undefined'&&currentUser&&currentUser.isAdmin===true)||r==='admin'||badge.indexOf('admin')>=0}catch(x){return false}}
  function moneyNum(v){var n=Number(String(v==null?'':v).replace(/[^0-9.-]/g,''));return isFinite(n)?n:0}
  function usd(n){n=Number(n||0);return n.toLocaleString(undefined,{style:'currency',currency:'USD'});}
  function dt(v){if(!v)return null;var d=new Date(v);if(isNaN(d))return null;return d}
  function iso(v){var d=dt(v);return d?d.toISOString().slice(0,10):''}
  function nowIso(){return new Date().toISOString()}
  function startOfRange(range){var d=new Date();d.setHours(0,0,0,0);if(range==='today')return d; if(range==='week'){var day=d.getDay();d.setDate(d.getDate()-(day===0?6:day-1));return d} if(range==='month')return new Date(d.getFullYear(),d.getMonth(),1); if(range==='year')return new Date(d.getFullYear(),0,1); var s=document.getElementById('qaStart')&&document.getElementById('qaStart').value;return s?new Date(s+'T00:00:00'):new Date(0)}
  function endOfRange(range){var e=document.getElementById('qaEnd')&&document.getElementById('qaEnd').value;if(range==='custom'&&e)return new Date(e+'T23:59:59');return new Date('2999-12-31T23:59:59')}
  function inRange(row){var range=(document.getElementById('qaRange')&&document.getElementById('qaRange').value)||qaState.range||'month';var keys=['created_at','createdAt','result_at','resultAt','payment_date','paymentDate','due_date','dueDate','completed_at','completedAt','processed_at','processedAt','updated_at','updatedAt'];var when='';for(var i=0;i<keys.length;i++){if(row&&row[keys[i]]){when=row[keys[i]];break}}var d=dt(when);if(!d)return true;return d>=startOfRange(range)&&d<=endOfRange(range)}
  function rowEmail(row){return lower(row&&(row.employee_email||row.employeeEmail||row.created_by_email||row.createdByEmail||row.processed_by_email||row.processedByEmail||row.completed_by_email||row.completedByEmail||row.assigned_to_email||row.assignedToEmail))||'unassigned'}
  function aid(row){return String((row&&(row.account_id||row.accountId||row.id))||'')}
  function val(row,keys){for(var i=0;i<keys.length;i++){var k=keys[i];if(row&&row[k]!=null&&String(row[k]).trim()!=='')return row[k]}return ''}
  function acctName(a){try{if(typeof nameOf==='function')return nameOf(a)}catch(e){}return String(val(a,['fullName','full_name','name','debtorName','firstName','first_name'])||'Unknown Account')}
  function qaAcctNoLocal(a){return String(val(a,['accountNumber','account_number','clientAccountNumber','client_account_number','sourceAccountId','source_account_id'])||'—')}
  function getAccounts(){try{return Array.isArray(accounts)?accounts.slice():[]}catch(e){return []}}
  function reviewKey(){return 'coPilotManagerQaReviews.v1'}
  function loadReviews(){try{return JSON.parse(localStorage.getItem(reviewKey())||'[]')||[]}catch(e){return []}}
  function saveReviews(rows){try{localStorage.setItem(reviewKey(),JSON.stringify(rows||[]))}catch(e){}}
  async function fetchTable(name){try{if(typeof dbFetch==='function'){var d=await dbFetch('/'+name+'?select=*&limit=5000');return Array.isArray(d)?d:[]}}catch(e){}return []}
  function addEmp(map,e){e=lower(e)||'unassigned';if(!map[e])map[e]={email:e,calls:0,contacts:0,rpc:0,voicemail:0,wrong:0,promises:0,kept:0,broken:0,promiseDollars:0,paidDollars:0,payments:0,settlements:0,settlementsApproved:0,notes:0,followupsDone:0,accountsWorked:{},compliance:0,activityCount:0,lastTouch:'',score:0,avgHours:'—'};return map[e]}
  function status(row){return lower(row&&(row.status||row.call_result||row.callResult||row.disposition||row.outcome_category||row.outcomeCategory||''))}
  function callResult(row){return lower(row&&(row.call_result||row.callResult||row.disposition||''))}
  function isContact(row){var r=callResult(row), cat=status(row);return row&&row.is_contact===true||cat.indexOf('contact')>=0||cat.indexOf('rpc')>=0||/right party|promise|refused|settled|paid|callback/.test(r)}
  function isRpc(row){var r=callResult(row), cat=status(row);return row&&row.is_rpc===true||cat.indexOf('rpc')>=0||/right party|promise|refused|settled|paid/.test(r)}
  function isKept(row){var s=status(row);return /paid|kept|completed|complete|settled/.test(s)}
  function isBroken(row){var s=status(row);return /broken|failed|missed|nsf|canceled|cancelled|overdue/.test(s)}
  function countAcct(emp,row){var id=aid(row);if(id)emp.accountsWorked[id]=true}
  function buildScores(raw){var map={};var me=email();var admin=isAdmin();
    (raw.users||[]).forEach(function(u){addEmp(map, rowEmail(u)||u.email||u.email_address)});
    (raw.calls||[]).filter(inRange).forEach(function(r){var e=addEmp(map,rowEmail(r));e.calls++;if(isContact(r))e.contacts++;if(isRpc(r))e.rpc++;if(/voicemail/.test(callResult(r)))e.voicemail++;if(/wrong|bad/.test(callResult(r)))e.wrong++;countAcct(e,r);e.activityCount++;});
    (raw.promises||[]).filter(inRange).forEach(function(r){var e=addEmp(map,rowEmail(r));var amt=moneyNum(r.payment_amount||r.paymentAmount||r.total_amount||r.totalAmount||r.amount);e.promises++;e.promiseDollars+=amt;if(isKept(r))e.kept++;if(isBroken(r))e.broken++;countAcct(e,r);e.activityCount++;});
    (raw.ledger||[]).filter(inRange).forEach(function(r){var e=addEmp(map,rowEmail(r));var amt=moneyNum(r.amount||r.payment_amount||r.paymentAmount||r.paid_amount||r.paidAmount);if(!/void|revers|failed|nsf|cancel/.test(status(r))){e.payments++;e.paidDollars+=amt}countAcct(e,r);e.activityCount++;});
    (raw.settlements||[]).filter(inRange).forEach(function(r){var e=addEmp(map,rowEmail(r));e.settlements++;if(/approved|paid|settled/.test(status(r)))e.settlementsApproved++;countAcct(e,r);e.activityCount++;});
    (raw.notes||[]).filter(inRange).forEach(function(r){var e=addEmp(map,rowEmail(r));e.notes++;countAcct(e,r);e.activityCount++;});
    (raw.followups||[]).filter(inRange).forEach(function(r){var e=addEmp(map,rowEmail(r));if(/complete|done/.test(status(r)))e.followupsDone++;countAcct(e,r);e.activityCount++;});
    (raw.activity||[]).filter(inRange).forEach(function(r){var e=addEmp(map,rowEmail(r));var txt=lower((r.action_type||r.actionType||'')+' '+(r.action_text||r.actionText||r.notes||''));if(/compliance|dnc|do not call|cease|bankruptcy|dispute|attorney|deceased|wrong number/.test(txt))e.compliance++;countAcct(e,r);e.activityCount++;var d=dt(r.created_at||r.createdAt);if(d&&(!e.lastTouch||d>dt(e.lastTouch)))e.lastTouch=d.toISOString();});
    var touchesByEmp={};(raw.activity||[]).filter(inRange).forEach(function(r){var em=rowEmail(r);(touchesByEmp[em]=touchesByEmp[em]||[]).push(dt(r.created_at||r.createdAt))});
    Object.keys(map).forEach(function(k){var e=map[k];var arr=(touchesByEmp[k]||[]).filter(Boolean).sort(function(a,b){return a-b});if(arr.length>1){var sum=0;for(var i=1;i<arr.length;i++)sum+=(arr[i]-arr[i-1])/3600000;e.avgHours=(sum/(arr.length-1)).toFixed(1)+'h'}var contactRate=e.calls?e.contacts/e.calls:0, rpcRate=e.calls?e.rpc/e.calls:0, keptRate=e.promises?e.kept/e.promises:0;var score=0;score+=Math.min(25,e.calls*1.2);score+=Math.min(20,contactRate*20);score+=Math.min(20,rpcRate*30);score+=Math.min(20,keptRate*20);score+=Math.min(20,e.paidDollars/100);score+=Math.min(10,e.followupsDone*1.5);score-=Math.min(15,e.broken*1.5);score-=Math.min(12,e.compliance*1.5);e.score=Math.max(0,Math.min(100,Math.round(score)));e.accountsWorkedCount=Object.keys(e.accountsWorked).length;e.contactRate=contactRate;e.rpcRate=rpcRate;e.keptRate=keptRate;});
    var rows=Object.keys(map).map(function(k){return map[k]}).filter(function(e){return admin||e.email===me}).sort(function(a,b){return b.score-a.score||b.paidDollars-a.paidDollars||b.calls-a.calls});
    return rows;
  }
  async function loadData(){var raw={};var localAcc=getAccounts();var fetchedAcc=await fetchTable('accounts');raw.accounts=(fetchedAcc.length?fetchedAcc:localAcc);var all=await Promise.all([fetchTable('app_users'),fetchTable('call_results'),fetchTable('payment_promises'),fetchTable('payments_ledger'),fetchTable('settlements'),fetchTable('account_notes'),fetchTable('follow_ups'),fetchTable('activity_logs')]);raw.users=all[0];raw.calls=all[1];raw.promises=all[2];raw.ledger=all[3];raw.settlements=all[4];raw.notes=all[5];raw.followups=all[6];raw.activity=all[7];qaState.reviews=loadReviews();qaState.raw=raw;qaState.data=buildScores(raw);return qaState.data}
  function ensureStyle(){if(document.getElementById('managerQaScorecardsStyle'))return;var st=document.createElement('style');st.id='managerQaScorecardsStyle';st.textContent='#managerQaPage{position:fixed;inset:0;background:#eef3f9;z-index:65000;display:none;color:#0f172a;font-family:Arial,Helvetica,sans-serif;overflow:hidden}#managerQaPage.open{display:flex;flex-direction:column}.qaTop{min-height:70px;background:linear-gradient(90deg,#05225f,#0b45c6);color:#fff;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 18px;box-shadow:0 6px 22px rgba(15,23,42,.22)}.qaTitle{font-size:21px;font-weight:1000}.qaSub{font-size:12px;color:#dbeafe;margin-top:3px}.qaActions{display:flex;gap:8px;flex-wrap:wrap}.qaActions button,.qaBtn2{height:38px;border:0;border-radius:10px;padding:0 12px;font-weight:900;background:#2563eb;color:#fff;cursor:pointer}.qaActions .outline,.qaBtn2.outline{background:#fff;color:#1d4ed8}.qaActions .green,.qaBtn2.green{background:#16a34a}.qaActions .gray,.qaBtn2.gray{background:#334155}.qaBody{padding:16px;overflow:auto}.qaNotice{border:1px solid #bfdbfe;background:#eff6ff;color:#1e3a8a;border-radius:14px;padding:10px 12px;font-size:13px;font-weight:850;margin-bottom:12px}.qaFilters{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin-bottom:12px}.qaFilters label{font-size:11px;font-weight:900;color:#334155;margin-bottom:4px;display:block}.qaFilters input,.qaFilters select{height:38px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;padding:8px;width:100%}.qaMetrics{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:10px;margin-bottom:12px}.qaMetric,.qaCard{background:#fff;border:1px solid #dbe3ef;border-radius:14px;box-shadow:0 3px 10px rgba(15,23,42,.04)}.qaMetric{padding:12px}.qaMetricLabel{font-size:10px;color:#64748b;text-transform:uppercase;font-weight:1000;letter-spacing:.04em}.qaMetricVal{font-size:20px;font-weight:1000;margin-top:4px}.qaGrid{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(360px,.75fr);gap:12px}.qaCardHead{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:13px 14px;background:#f8fbff;border-bottom:1px solid #e5edf7}.qaCardTitle{font-weight:1000}.qaCardBody{padding:12px;max-height:560px;overflow:auto}.qaTable{width:100%;border-collapse:collapse;font-size:12px}.qaTable th{position:sticky;top:0;background:#f8fafc;color:#334155;text-align:left;padding:8px;border-bottom:1px solid #e2e8f0;font-size:10px;text-transform:uppercase;z-index:1}.qaTable td{padding:8px;border-bottom:1px solid #edf2f8;vertical-align:middle}.qaEmp{font-weight:1000;max-width:190px;overflow:hidden;text-overflow:ellipsis}.qaPill{display:inline-block;border-radius:999px;padding:4px 8px;font-size:11px;font-weight:900;background:#f1f5f9;color:#334155}.qaPill.green{background:#dcfce7;color:#166534}.qaPill.orange{background:#fff7ed;color:#9a3412}.qaPill.red{background:#fee2e2;color:#991b1b}.qaPill.blue{background:#dbeafe;color:#1d4ed8}.qaPill.purple{background:#ede9fe;color:#5b21b6}.qaScoreBar{height:8px;border-radius:99px;background:#e2e8f0;overflow:hidden;margin-top:5px;min-width:80px}.qaScoreFill{height:100%;background:#2563eb;border-radius:99px}.qaReviewForm{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}.qaReviewForm .full{grid-column:1/-1}.qaReviewForm input,.qaReviewForm select,.qaReviewForm textarea{border:1px solid #cbd5e1;border-radius:10px;padding:9px;width:100%;font:inherit}.qaReviewForm textarea{min-height:72px;resize:vertical}.qaReview{border:1px solid #e2e8f0;border-radius:13px;padding:10px;margin-bottom:9px;background:#fff}.qaReviewTop{display:flex;justify-content:space-between;gap:8px}.qaReviewEmp{font-weight:1000}.qaReviewNote{font-size:12px;color:#475569;margin-top:6px;line-height:1.4}.qaEmpty{border:1px dashed #cbd5e1;background:#f8fafc;color:#64748b;border-radius:14px;padding:18px;text-align:center;font-weight:850}.topActions .qaScorecardTopBtn{background:#4f46e5!important;color:#fff!important}.navIcon.qaScorecardNavBtn{background:linear-gradient(145deg,#4f46e5,#312e81)!important;color:#fff!important}@media(max-width:1350px){.qaMetrics{grid-template-columns:repeat(4,1fr)}.qaGrid{grid-template-columns:1fr}.qaFilters{grid-template-columns:repeat(3,1fr)}}@media(max-width:820px){.qaTop{align-items:flex-start;flex-direction:column}.qaMetrics,.qaFilters,.qaReviewForm{grid-template-columns:1fr}.qaGrid{grid-template-columns:1fr}}';document.head.appendChild(st)}
  function ensureNav(){ensureStyle();var top=document.querySelector('.topActions');if(top&&!document.getElementById('qaScorecardTopBtn')){var b=document.createElement('button');b.id='qaScorecardTopBtn';b.className='gray qaScorecardTopBtn';b.textContent=isAdmin()?'Scorecards':'My Score';b.onclick=openManagerQaScorecards;var ref=Array.from(top.querySelectorAll('button')).find(function(x){return /Monitor/i.test(x.textContent||'')})||Array.from(top.querySelectorAll('button')).find(function(x){return /Alerts/i.test(x.textContent||'')});ref&&ref.parentNode?ref.parentNode.insertBefore(b,ref.nextSibling):top.insertBefore(b,top.firstChild)}var rail=document.querySelector('.navRail');if(rail&&!document.getElementById('qaScorecardNavBtn')){var n=document.createElement('button');n.id='qaScorecardNavBtn';n.className='navIcon qaScorecardNavBtn';n.title=isAdmin()?'Manager QA / Collector Scorecards':'My Collector Scorecard';n.innerHTML='<span class="navEmoji">📈</span>';n.onclick=openManagerQaScorecards;var rr=Array.from(rail.querySelectorAll('button')).find(function(x){return /Collector Alerts|Daily Work Queue/i.test(x.title||'')});rr&&rr.parentNode?rr.parentNode.insertBefore(n,rr.nextSibling):rail.insertBefore(n,rail.firstChild)}}
  function ensurePage(){ensureNav();var p=document.getElementById('managerQaPage');if(p)return p;p=document.createElement('div');p.id='managerQaPage';document.body.appendChild(p);p.innerHTML='<div class="qaTop"><div><div class="qaTitle">Manager QA + Collector Scorecards</div><div class="qaSub">Performance, quality review, coaching notes, compliance concerns, promises, payments, contacts, follow-ups, and account work.</div></div><div class="qaActions"><button class="outline" onclick="closeManagerQaScorecards()">Back to Queue</button><button class="gray" onclick="refreshManagerQaScorecards()">Refresh</button><button class="green" onclick="saveManagerQaReview()">Save QA Note</button><button onclick="exportManagerQaCSV()">Export CSV</button></div></div><div class="qaBody"><div id="qaNotice" class="qaNotice">Loading scorecards...</div><div class="qaFilters"><div><label>Range</label><select id="qaRange" onchange="qaRangeChanged()"><option value="today">Today</option><option value="week">This Week</option><option value="month" selected>This Month</option><option value="year">This Year</option><option value="custom">Custom</option></select></div><div><label>Start</label><input id="qaStart" type="date" onchange="refreshManagerQaScorecards()"></div><div><label>End</label><input id="qaEnd" type="date" onchange="refreshManagerQaScorecards()"></div><div><label>Employee</label><select id="qaEmployee" onchange="renderManagerQaScorecards()"><option value="all">All Employees</option></select></div><div><label>QA Rating</label><select id="qaRatingFilter" onchange="renderManagerQaScorecards()"><option value="all">All Ratings</option><option>Good</option><option>Needs Review</option><option>Compliance Concern</option><option>Coaching Needed</option></select></div><div><label>Search</label><input id="qaSearch" placeholder="Search employee or note" oninput="renderManagerQaScorecards()"></div></div><div id="qaMetrics" class="qaMetrics"></div><div class="qaGrid"><div class="qaCard"><div class="qaCardHead"><div class="qaCardTitle">Collector Scorecards</div><span id="qaCount" class="qaPill blue">0 employees</span></div><div class="qaCardBody"><div id="qaScorecardTable"></div></div></div><div><div class="qaCard"><div class="qaCardHead"><div class="qaCardTitle">QA Review / Coaching Note</div><span class="qaPill purple">Admin Tool</span></div><div class="qaCardBody"><div id="qaReviewLock" class="qaNotice">Admin can save QA notes. Employees can view their own scorecard.</div><div class="qaReviewForm"><div><label>Employee</label><select id="qaReviewEmployee"></select></div><div><label>Rating</label><select id="qaReviewRating"><option>Good</option><option>Needs Review</option><option>Compliance Concern</option><option>Coaching Needed</option></select></div><div class="full"><label>QA Note</label><textarea id="qaReviewNote" placeholder="Coaching note, concern, praise, or review finding..."></textarea></div><div class="full"><button class="qaBtn2 green" onclick="saveManagerQaReview()">Save QA Note</button></div></div></div></div><div class="qaCard" style="margin-top:12px"><div class="qaCardHead"><div class="qaCardTitle">Recent QA Notes</div><span class="qaPill blue">History</span></div><div class="qaCardBody" id="qaReviewsList"></div></div></div></div></div>';return p}
  function setDefaultDates(){var r=document.getElementById('qaRange')&&document.getElementById('qaRange').value;if(r==='custom')return;var s=startOfRange(r||'month');var start=document.getElementById('qaStart'), end=document.getElementById('qaEnd');if(start)start.value=s.toISOString().slice(0,10);if(end)end.value=new Date().toISOString().slice(0,10)}
  function metric(label,val,sub){return '<div class="qaMetric"><div class="qaMetricLabel">'+esc(label)+'</div><div class="qaMetricVal">'+esc(val)+'</div>'+(sub?'<div style="font-size:11px;color:#64748b;margin-top:4px">'+esc(sub)+'</div>':'')+'</div>'}
  function pct(n){return (Number(n||0)*100).toFixed(1)+'%'}
  function gradeClass(score){return score>=80?'green':score>=55?'orange':'red'}
  function filteredRows(){var rows=(qaState.data||[]).slice(), emp=(document.getElementById('qaEmployee')&&document.getElementById('qaEmployee').value)||'all', q=lower(document.getElementById('qaSearch')&&document.getElementById('qaSearch').value);if(emp!=='all')rows=rows.filter(function(r){return r.email===emp});if(q)rows=rows.filter(function(r){return r.email.indexOf(q)>=0});return rows}
  function renderReviews(rows){var list=document.getElementById('qaReviewsList');if(!list)return;var filter=lower(document.getElementById('qaRatingFilter')&&document.getElementById('qaRatingFilter').value);var emp=(document.getElementById('qaEmployee')&&document.getElementById('qaEmployee').value)||'all';var q=lower(document.getElementById('qaSearch')&&document.getElementById('qaSearch').value);var reviews=(qaState.reviews||[]).filter(function(r){return isAdmin()||lower(r.employee)===email()}).filter(function(r){return (filter==='all'||lower(r.rating)===filter)&&(emp==='all'||lower(r.employee)===emp)&&(!q||lower(r.employee+' '+r.note+' '+r.rating).indexOf(q)>=0)}).sort(function(a,b){return String(b.createdAt).localeCompare(String(a.createdAt))}).slice(0,40);list.innerHTML=reviews.length?reviews.map(function(r){var cls=/good/i.test(r.rating)?'green':/compliance/i.test(r.rating)?'red':/coaching|review/i.test(r.rating)?'orange':'blue';return '<div class="qaReview"><div class="qaReviewTop"><div><div class="qaReviewEmp">'+esc(r.employee)+'</div><div style="font-size:11px;color:#64748b">'+esc(new Date(r.createdAt).toLocaleString())+' by '+esc(r.createdBy)+'</div></div><span class="qaPill '+cls+'">'+esc(r.rating)+'</span></div><div class="qaReviewNote">'+esc(r.note)+'</div></div>'}).join(''):'<div class="qaEmpty">No QA notes match this view.</div>'}
  function renderManagerQaScorecards(){ensurePage();var rows=filteredRows();var all=(qaState.data||[]).slice();var totalCalls=rows.reduce(function(s,r){return s+r.calls},0), totalRpc=rows.reduce(function(s,r){return s+r.rpc},0), paid=rows.reduce(function(s,r){return s+r.paidDollars},0), promises=rows.reduce(function(s,r){return s+r.promises},0), kept=rows.reduce(function(s,r){return s+r.kept},0), broken=rows.reduce(function(s,r){return s+r.broken},0), compliance=rows.reduce(function(s,r){return s+r.compliance},0), avg=rows.length?Math.round(rows.reduce(function(s,r){return s+r.score},0)/rows.length):0;document.getElementById('qaMetrics').innerHTML=[metric('Avg Score',avg),metric('Calls',totalCalls),metric('RPC',totalRpc,pct(totalCalls?totalRpc/totalCalls:0)),metric('Collected',usd(paid)),metric('Promises',promises),metric('Kept / Broken',kept+' / '+broken),metric('Compliance Flags',compliance),metric('Employees',rows.length)].join('');
    var empSel=document.getElementById('qaEmployee'), reviewEmp=document.getElementById('qaReviewEmployee'), keep=empSel.value||'all';var emps=all.map(function(r){return r.email}).sort();empSel.innerHTML=(isAdmin()?'<option value="all">All Employees</option>':'')+emps.map(function(e){return '<option value="'+esc(e)+'">'+esc(e)+'</option>'}).join('');if(isAdmin()){empSel.value=emps.indexOf(keep)>=0?keep:'all'}else{empSel.value=email();empSel.disabled=true}reviewEmp.innerHTML=emps.map(function(e){return '<option value="'+esc(e)+'">'+esc(e)+'</option>'}).join('');reviewEmp.disabled=!isAdmin();document.getElementById('qaReviewNote').disabled=!isAdmin();document.getElementById('qaReviewRating').disabled=!isAdmin();document.getElementById('qaReviewLock').textContent=isAdmin()?'Admin view: save coaching notes, mark compliance concerns, and export team performance.':'Employee view: you can see your own scorecard only.';
    document.getElementById('qaCount').textContent=rows.length+' employees';var table=document.getElementById('qaScorecardTable');table.innerHTML=rows.length?'<table class="qaTable"><thead><tr><th>Employee</th><th>Score</th><th>Calls</th><th>Contact %</th><th>RPC %</th><th>Promises</th><th>Kept</th><th>Broken</th><th>Collected</th><th>Settlements</th><th>Notes</th><th>Follow-Ups</th><th>Accounts</th><th>Compliance</th><th>Avg Touch</th></tr></thead><tbody>'+rows.map(function(r){return '<tr><td><div class="qaEmp">'+esc(r.email)+'</div></td><td><span class="qaPill '+gradeClass(r.score)+'">'+r.score+'</span><div class="qaScoreBar"><div class="qaScoreFill" style="width:'+Math.max(0,Math.min(100,r.score))+'%"></div></div></td><td>'+r.calls+'</td><td>'+pct(r.contactRate)+'</td><td>'+pct(r.rpcRate)+'</td><td>'+r.promises+'</td><td>'+r.kept+'</td><td>'+r.broken+'</td><td><b>'+usd(r.paidDollars)+'</b></td><td>'+r.settlements+' / '+r.settlementsApproved+'</td><td>'+r.notes+'</td><td>'+r.followupsDone+'</td><td>'+r.accountsWorkedCount+'</td><td><span class="qaPill '+(r.compliance?'red':'green')+'">'+r.compliance+'</span></td><td>'+esc(r.avgHours)+'</td></tr>'}).join('')+'</tbody></table>':'<div class="qaEmpty">No scorecard data found for this filter.</div>';renderReviews(rows);var n=document.getElementById('qaNotice');if(n)n.textContent=(isAdmin()?'Manager view':'Employee view')+': scorecards loaded from calls, promises, payments, settlements, notes, follow-ups, and activity logs.'}
  window.openManagerQaScorecards=async function(){var p=ensurePage();p.classList.add('open');setDefaultDates();await window.refreshManagerQaScorecards()};
  window.closeManagerQaScorecards=function(){var p=document.getElementById('managerQaPage');if(p)p.classList.remove('open')};
  window.refreshManagerQaScorecards=async function(){ensurePage();var n=document.getElementById('qaNotice');if(n)n.textContent='Loading calls, promises, payments, settlements, notes, follow-ups, and activity logs...';try{await loadData();renderManagerQaScorecards()}catch(e){if(n)n.textContent='Scorecards could not load every table yet. Showing any available local data. '+(e.message||e);qaState.data=buildScores({accounts:getAccounts(),users:[],calls:[],promises:[],ledger:[],settlements:[],notes:[],followups:[],activity:[]});renderManagerQaScorecards()}};
  window.qaRangeChanged=function(){setDefaultDates();refreshManagerQaScorecards()};
  window.saveManagerQaReview=async function(){if(!isAdmin())return alert('Admin only.');var emp=lower(document.getElementById('qaReviewEmployee')&&document.getElementById('qaReviewEmployee').value), rating=document.getElementById('qaReviewRating')&&document.getElementById('qaReviewRating').value, note=document.getElementById('qaReviewNote')&&document.getElementById('qaReviewNote').value.trim();if(!emp)return alert('Select an employee.');if(!note)return alert('Enter a QA note.');var r={id:'qa_'+Date.now(),employee:emp,rating:rating,note:note,createdBy:email(),createdAt:nowIso()};var rows=loadReviews();rows.push(r);saveReviews(rows);qaState.reviews=rows;document.getElementById('qaReviewNote').value='';try{if(typeof insertAudit==='function')await insertAudit('Manager QA Review',rating+' for '+emp+': '+note,'employee',emp)}catch(e){}renderManagerQaScorecards();alert('QA note saved.')};
  window.exportManagerQaCSV=function(){var rows=filteredRows();var csv=[['Employee','Score','Calls','Contacts','RPC','Contact Rate','RPC Rate','Promises','Kept','Broken','Collected','Payments','Settlements','Settlements Approved','Notes','Follow Ups Done','Accounts Worked','Compliance Flags','Average Hours Between Touches'].join(',')].concat(rows.map(function(r){return [r.email,r.score,r.calls,r.contacts,r.rpc,pct(r.contactRate),pct(r.rpcRate),r.promises,r.kept,r.broken,r.paidDollars,r.payments,r.settlements,r.settlementsApproved,r.notes,r.followupsDone,r.accountsWorkedCount,r.compliance,r.avgHours].map(function(x){return '"'+String(x==null?'':x).replace(/"/g,'""')+'"'}).join(',')})).join('\n');var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='co-pilot-manager-qa-scorecards.csv';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500)};
  document.addEventListener('DOMContentLoaded',function(){ensureNav()}); setTimeout(ensureNav,600);
})();

