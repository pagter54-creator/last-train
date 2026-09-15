/* LAST RAIL v0.7 staged asset preloader with deduplication, retry and content gates. */
(()=>{
 'use strict';
 const C=window.LAST_RAIL_ASSET_CONFIG;
 if(!C)return;
 const cache=new Map(),groupStates=new Map(),listeners=new Set();
 let initialResolve,statusTimer=0,backgroundStarted=false,gateToken=0;
 const ready=new Promise(resolve=>{initialResolve=resolve;});
 const $=s=>document.querySelector(s);
 const screen=()=>$('#asset-loading-screen');
 const fill=()=>$('#asset-loading-fill');
 const percent=()=>$('#asset-loading-percent');
 const status=()=>$('#asset-loading-status');
 const errorBox=()=>$('#asset-loading-error');
 const retryBtn=()=>$('#asset-loading-retry');
 const normalize=src=>String(src||'').replace(/^\.\//,'');
 function versioned(src){
  if(!src||/^(data:|blob:)/i.test(src))return src;
  try{
   const u=new URL(src,location.href);u.searchParams.set('av',C.assetVersion);return u.href;
  }catch{return src+(src.includes('?')?'&':'?')+'av='+encodeURIComponent(C.assetVersion);}
 }
 function key(entry){return entry.type==='font'?`font:${entry.family}`:`${entry.type}:${normalize(entry.src)}`;}
 function uniqueEntries(groups){
  const out=[],seen=new Set();
  for(const name of groups){for(const entry of C.manifest[name]||[]){const k=key(entry);if(seen.has(k))continue;seen.add(k);out.push(entry);}}
  return out;
 }
 function emit(detail){for(const fn of listeners){try{fn(detail);}catch{}}document.dispatchEvent(new CustomEvent('last-rail-asset-state',{detail}));}
 function timeout(promise,ms,label){return new Promise((resolve,reject)=>{const id=setTimeout(()=>reject(Error(`${label||'asset'} timeout`)),ms);promise.then(v=>{clearTimeout(id);resolve(v);},e=>{clearTimeout(id);reject(e);});});}
 async function rawLoad(entry){
  if(entry.type==='image'){
   const load=src=>{const img=new Image();img.decoding='async';const p=new Promise((resolve,reject)=>{img.onload=()=>resolve(img);img.onerror=()=>reject(Error(`image load failed: ${src}`));});img.src=versioned(src);return timeout(p,C.timeoutMs,src);};
   try{return await load(entry.src);}catch(error){if(!entry.fallbackSrc)throw error;return load(entry.fallbackSrc);}
  }
  if(entry.type==='audio'){
   // Fetching the entire response primes the normal HTTP browser cache without trying to autoplay it.
   if(location.protocol==='file:'){
    const audio=new Audio();audio.preload='auto';
    const p=new Promise((resolve,reject)=>{const done=()=>resolve(audio);audio.addEventListener('canplaythrough',done,{once:true});audio.addEventListener('loadeddata',done,{once:true});audio.addEventListener('error',()=>reject(Error(`audio load failed: ${entry.src}`)),{once:true});});
    audio.src=versioned(entry.src);audio.load();return timeout(p,C.timeoutMs,entry.src);
   }
   const response=await timeout(fetch(versioned(entry.src),{cache:'default',credentials:'same-origin'}),C.timeoutMs,entry.src);
   if(!response.ok)throw Error(`audio ${response.status}: ${entry.src}`);
   await response.arrayBuffer();return true;
  }
  if(entry.type==='font'){
   if(!document.fonts?.load)return true;
   const faces=await timeout(document.fonts.load(`16px "${entry.family}"`),C.timeoutMs,entry.family);
   if(!faces?.length)throw Error(`font load failed: ${entry.family}`);
   return faces;
  }
  const response=await timeout(fetch(versioned(entry.src),{cache:'default',credentials:'same-origin'}),C.timeoutMs,entry.src);
  if(!response.ok)throw Error(`asset ${response.status}: ${entry.src}`);
  await response.arrayBuffer();return true;
 }
 function loadAsset(entry,{forceRetry=false}={}){
  const k=key(entry),existing=cache.get(k);
  if(existing&&!forceRetry&&(existing.status==='loading'||existing.status==='loaded'))return existing.promise;
  if(existing&&!forceRetry&&existing.status==='failed')return Promise.reject(existing.error);
  const rec=existing||{key:k,entry,status:'notLoaded',value:null,error:null,attempts:0,promise:null};
  rec.entry=entry;rec.status='loading';rec.error=null;
  rec.promise=(async()=>{
   let last;
   const tries=Math.max(1,Number(entry.retries)||C.autoRetries);
   for(let i=0;i<tries;i++){
    rec.attempts++;
    try{const value=await rawLoad(entry);rec.status='loaded';rec.value=value;rec.error=null;emit({kind:'asset',key:k,status:'loaded',entry});return value;}
    catch(error){last=error;if(i<tries-1)await new Promise(r=>setTimeout(r,180*(i+1)));}
   }
   rec.status='failed';rec.error=last||Error(`asset load failed: ${k}`);emit({kind:'asset',key:k,status:'failed',entry,error:rec.error});throw rec.error;
  })();
  cache.set(k,rec);return rec.promise;
 }
 function setProgress(done,total){const value=total?Math.round(done/total*100):100;if(fill())fill().style.width=`${value}%`;if(percent())percent().textContent=`${value}%`;}
 function setStatus(text){if(status())status().textContent=text;}
 function startStatusCycle(prefix=''){
  stopStatusCycle();let i=Math.floor(Math.random()*C.statusMessages.length);const tick=()=>{const message=C.statusMessages[i++%C.statusMessages.length];setStatus(prefix?`${prefix} · ${message}`:message);};tick();statusTimer=setInterval(tick,C.statusIntervalMs);
 }
 function stopStatusCycle(){if(statusTimer){clearInterval(statusTimer);statusTimer=0;}}
 function showScreen({gate=false,title='LAST RAIL',statusText='' }={}){
  const el=screen();if(!el)return;el.hidden=false;el.classList.remove('is-fading');el.classList.toggle('is-gate',gate);const t=$('#asset-loading-title');if(t)t.firstChild.nodeValue=title+'\n';if(errorBox()){errorBox().hidden=true;errorBox().textContent='';}if(retryBtn())retryBtn().hidden=true;setProgress(0,1);startStatusCycle(statusText);
 }
 function hideScreen(){const el=screen();if(!el)return;stopStatusCycle();el.classList.add('is-fading');setTimeout(()=>{el.hidden=true;el.classList.remove('is-fading','is-gate');},C.fadeMs);}
 async function loadGroups(groups,{display=false,gate=false,title,statusText,forceRetry=false,waitForOptional=false}={}){
  const names=[...new Set(groups.filter(Boolean))],entries=uniqueEntries(names),required=entries.filter(e=>e.required),optional=entries.filter(e=>!e.required);
  for(const name of names)groupStates.set(name,'loading');
  if(display)showScreen({gate,title,statusText});
  let done=0;setProgress(0,required.length);
  // Optional resources never block entry. Background passes can still await them to preserve priority order.
  const optionalJobs=optional.map(entry=>loadAsset(entry,{forceRetry:forceRetry&&cache.get(key(entry))?.status==='failed'}).catch(error=>{console.warn('[LAST RAIL assets] optional asset failed',entry.id||entry.src||entry.family,error);return null;}));
  const failures=[];
  await Promise.all(required.map(async entry=>{
   try{await loadAsset(entry,{forceRetry:forceRetry&&cache.get(key(entry))?.status==='failed'});done++;setProgress(done,required.length);}
   catch(error){failures.push({entry,error});setProgress(done,required.length);}
  }));
  if(!required.length)setProgress(1,1);
  if(waitForOptional&&optionalJobs.length)await Promise.allSettled(optionalJobs);
  const state=failures.length?'failed':'loaded';for(const name of names)groupStates.set(name,state);emit({kind:'groups',groups:names,status:state,failures});
  if(failures.length)throw Object.assign(Error('required assets failed'),{failures,groups:names});
  return true;
 }
 function showFailure(error,retry){
  stopStatusCycle();setStatus('필수 리소스를 준비하지 못했습니다.');const box=errorBox();if(box){box.hidden=false;box.textContent=`네트워크 연결을 확인한 후 다시 시도해 주십시오. (${error.failures?.length||1}개 실패)`;}const btn=retryBtn();if(btn){btn.hidden=false;btn.onclick=retry;}
 }
 async function loadInitial(){
  try{await loadGroups(C.initialGroups,{display:true,title:'LAST RAIL',statusText:'선로 상태 확인 중'});if(document.readyState==='loading')await new Promise(r=>document.addEventListener('DOMContentLoaded',r,{once:true}));setProgress(1,1);setStatus('출발 준비 완료');initialResolve(true);setTimeout(()=>{hideScreen();startBackground();document.dispatchEvent(new CustomEvent('last-rail-assets-ready'));},0);}
  catch(error){showFailure(error,()=>retryInitial());}
 }
 async function retryInitial(){
  // Replace the public ready promise behavior with actual state: callers can also wait for the event/group state.
  try{if(retryBtn())retryBtn().hidden=true;if(errorBox())errorBox().hidden=true;startStatusCycle('재시도 중');await loadGroups(C.initialGroups,{display:false,forceRetry:true});if(document.readyState==='loading')await new Promise(r=>document.addEventListener('DOMContentLoaded',r,{once:true}));setProgress(1,1);setStatus('출발 준비 완료');initialResolve(true);setTimeout(()=>{hideScreen();startBackground();document.dispatchEvent(new CustomEvent('last-rail-assets-ready'));},0);}
  catch(error){showFailure(error,()=>retryInitial());}
 }
 async function startBackground(){
  if(backgroundStarted)return;backgroundStarted=true;
  const run=async()=>{for(const name of C.backgroundQueue){if(groupStates.get(name)==='loaded')continue;try{await loadGroups([name],{waitForOptional:true});}catch(error){console.warn(`[LAST RAIL assets] background group ${name} failed`,error);}}};
  if('requestIdleCallback'in window)requestIdleCallback(()=>run(),{timeout:1200});else setTimeout(run,0);
 }
 function isGroupReady(name){return !name||groupStates.get(name)==='loaded';}
 async function ensureGroups(groups,{title='다음 구간 준비 중...',statusText='필요 리소스 확인 중'}={}){
  const needed=[...new Set(groups.filter(Boolean))].filter(name=>!isGroupReady(name));if(!needed.length)return true;
  const token=++gateToken;showScreen({gate:true,title,statusText});
  while(token===gateToken){
   try{await loadGroups(needed,{display:false,forceRetry:true});setProgress(1,1);hideScreen();return true;}
   catch(error){
    await new Promise(resolve=>showFailure(error,()=>{if(retryBtn())retryBtn().hidden=true;if(errorBox())errorBox().hidden=true;startStatusCycle('재시도 중');resolve();}));
   }
  }
  return false;
 }
 async function withGate(groups,action,options){const list=Array.isArray(groups)?groups:[groups];await ensureGroups(list,options);return action();}
 function groupForAct(id){return C.contentGroups.acts[id]||null;}function groupForBoss(id){return C.contentGroups.bosses[id]||null;}
 window.LAST_RAIL_ASSETS={
  config:C,cache,groupStates,ready,url:versioned,loadAsset,loadGroups,loadInitial,retryInitial,startBackground,isGroupReady,ensureGroups,withGate,groupForAct,groupForBoss,
  get(src,type='image'){return cache.get(`${type}:${normalize(src)}`)?.value||null;},
  state(name){return groupStates.get(name)||'notLoaded';},
  subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);}
 };
 loadInitial();
})();
