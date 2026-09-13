/* Node-start saves only. The existing meta storage is deliberately not accessed. */
(()=>{
 'use strict';
 const g=window.lastRail,D=window.GAME_DATA;
 const C=window.RUN_CHECKPOINT_CONFIG={key:'lastTrainRunCheckpoint',warningKey:'lastTrainSaveWarningAcknowledged',version:1,savedMs:1000};
 const clone=v=>JSON.parse(JSON.stringify(v)),$=s=>document.querySelector(s);
 const finite=Number.isFinite,number=(v,f=0)=>finite(v)?v:f;
 const token=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
 let pending=null,current=null,restoring=false,noticeTimer;
 g.checkpointEnabled=true;
 // Remove references to live combat entities before serializing (some form cycles).
 function stable(state){
  const omit=new Set(['battle','enemies','projectiles','particles','impacts','weaponZones','interference','systemWindups','grabs','attackWindups','combatRecord','selectedEnemy','selectedCrew','selectedCar','targetMode']);
  const source=Object.fromEntries(Object.entries(state).filter(([k])=>!omit.has(k)));
  source.orders=Object.fromEntries(Object.entries(state.orders||{}).map(([k,v])=>[k,{...v,target:null,active:0}]));
  source.crew=state.crew.map(c=>({...c,car:c.moving?.to??c.car,moving:null}));
  const s=clone(source);
  Object.assign(s,{battle:null,enemies:[],projectiles:[],particles:[],impacts:[],interference:[],systemWindups:[],grabs:[],selectedCrew:null,selectedEnemy:null,selectedCar:null,targetMode:null});
  s.cars.forEach(c=>{c.armor=0;});
  return s;
 }
 function valid(raw){
  try{
   const p=typeof raw==='string'?JSON.parse(raw):clone(raw);
   if(!p||p.version!==C.version||!p.state||!p.node||typeof p.runId!=='string'||typeof p.seed!=='string')return null;
   const s=p.state,a=D.ACTS[s.actId];
   if(!a||!Number.isInteger(s.stageIndex)||s.stageIndex<0||s.stageIndex>a.stages.length)return null;
   if(!['battle','elite','event','station','boss'].includes(p.node.type))return null;
   if(p.node.type==='boss'&&(!D.BOSSES[p.node.bossId]||a.boss!==p.node.bossId))return null;
   if(p.node.type!=='boss'&&s.stageIndex>=a.stages.length)return null;
   if(!Array.isArray(s.cars)||!s.cars.length||!Array.isArray(s.crew)||!s.crew.length)return null;
   if(!finite(s.titanDistance)||s.titanDistance<=0)return null;
   for(const k of ['money','scrap','relics'])s[k]=Math.max(0,number(s[k]));
   if(!s.metaRun||!s.metaRun.upgrades||typeof s.metaRun.upgrades!=='object'||!Array.isArray(s.metaRun.mods))return null;
   s.orders=s.orders||{};
   for(const k of ['focus','command'])s.orders[k]={...(s.orders[k]||{}),cooldown:Math.max(0,number(s.orders[k]?.cooldown)),active:0,target:null};
   s.metaRun.apocalypse=Math.max(0,Math.min(10,Math.floor(number(s.metaRun.apocalypse))));
   for(const c of s.cars){
    if(!c||typeof c.id!=='string'||!finite(c.maxHp)||c.maxHp<=0||!Array.isArray(c.equipment))return null;
    c.hp=Math.max(0,Math.min(c.maxHp,number(c.hp)));c.repair=Math.max(0,number(c.repair));c.power=Math.max(0,Math.min(4,Math.floor(number(c.power))));
    for(const e of c.equipment){if(!e||!['turret','module'].includes(e.kind)||!(e.kind==='turret'?D.TURRETS:D.MODULES)[e.type]||typeof e.id!=='string')return null;e.level=Math.max(1,Math.floor(number(e.level,1)));e.heat=Math.max(0,Math.min(D.BALANCE.heat.max,number(e.heat)));delete e.minimumCooling;if(e.kind==='turret'&&e.heat>=D.BALANCE.heat.max)e.overheated=true;e.cooldown=Math.max(0,number(e.cooldown));if(e.aux&&(e.kind!=='module'||e.level<3||e.aux.kind!=='module'||!D.MODULES[e.aux.type]||e.aux.aux||typeof e.aux.id!=='string'))return null;}
   }
   for(const c of s.crew){
    if(!c||typeof c.id!=='string'||!c.stats||!finite(c.maxHp)||c.maxHp<=0)return null;
    c.car=Math.max(0,Math.min(s.cars.length-1,Math.floor(number(c.car))));c.moving=null;c.hp=Math.max(0,Math.min(c.maxHp,number(c.hp)));
    for(const k of ['combat','operate','repair','recovery'])c.stats[k]=Math.max(0,number(c.stats[k]));
    if(!Array.isArray(c.traits))c.traits=[];
   }
   if(p.node.type==='event'){
    const event=window.EVENT_CONFIG.events.find(e=>e.id===p.event?.eventId);
    if(!event||p.event.phase!=='choices'||!p.event.prepared||!event.choices.every(c=>p.event.prepared[c.id]))return null;
    const rewardsValid=r=>!!r&&(!r.skillReward||(Array.isArray(r.skillOrder)&&r.skillOrder.every(id=>D.TRAITS[id]?.canBeEventSkill)&&Number.isInteger(r.skillReward.count)&&r.skillReward.count>=1&&r.skillReward.count<=3))&&(!r.equipment||(['turret','module'].includes(r.equipment.kind)&&!!(r.equipment.kind==='turret'?D.TURRETS:D.MODULES)[r.equipment.type]))&&(!r.offers||Array.isArray(r.offers)&&r.offers.every(o=>rewardsValid(o.reward)));
    if(!event.choices.every(c=>{const v=p.event.prepared[c.id];return finite(v.roll)&&rewardsValid(v.common)&&Array.isArray(v.outcomes)&&v.outcomes.every(rewardsValid);}))return null;
   }
   if(p.node.type==='station'){
    if(!p.shop||!Array.isArray(p.shop.gear)||!Array.isArray(p.shop.crew)||!Array.isArray(p.shop.bought))return null;
    if(p.shop.gear.some(e=>!['turret','module'].includes(e.kind)||!(e.kind==='turret'?D.TURRETS:D.MODULES)[e.id]||!e.d))return null;
    for(const o of p.shop.gear){const e=o.equipment;if(!e)continue;if(e.kind!==o.kind||e.type!==o.id||typeof e.id!=='string'||e.aux)return null;e.level=Math.max(1,Math.min((e.kind==='turret'?D.TURRETS:D.MODULES)[e.type].maxLevel||1,Math.floor(number(e.level,1))));e.investedScrap=Math.max(0,number(e.investedScrap));e.weaponBranches=e.weaponBranches&&typeof e.weaponBranches==='object'?e.weaponBranches:{};for(const [tier,id]of Object.entries(e.weaponBranches))if(!window.WEAPON_UPGRADES?.tiers[tier]?.[id])delete e.weaponBranches[tier];}
   }
   p.state=stable(s);p.preferredSpeed=[1,2,3].includes(p.preferredSpeed)?p.preferredSpeed:1;
   return p;
  }catch{return null;}
 }
 function read(){try{return valid(localStorage.getItem(C.key));}catch{return null;}}
 function status(message,failed=false){
  let el=$('#checkpoint-status');if(!el){el=document.createElement('div');el.id='checkpoint-status';el.setAttribute('role','status');document.body.append(el);}
  el.textContent=message;el.hidden=false;el.classList.toggle('failed',failed);clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>el.hidden=true,failed?6000:C.savedMs);
 }
 function commit(extra={}){
  if(!pending||restoring)return;
  const p={...pending,...extra};pending=null;
  try{const checked=valid(p);if(!checked)throw Error('Invalid node checkpoint');const json=JSON.stringify(checked);localStorage.setItem(C.key,json);status('저장됨');}
  catch(error){status('자동 저장에 실패했습니다. 이전 저장은 유지됩니다.',true);console.warn('Run checkpoint write failed',error);}
 }
 function begin(node){
  if(restoring||!g.state||g.mode==='battle')return;
  const s=g.state,id=`${s.runId}:${s.actId}:${s.stageIndex}`;
  if(current===id)return; // Opening station tabs or formation must never save purchases.
  current=id;
  try{
   // This is called only at a resolved node boundary, never by the combat loop.
   g.resetTurretHeat?.();
   const snapshot=stable(s);snapshot.runId=s.runId||token();snapshot.runSeed=s.runSeed||token();
   Object.assign(s,{runId:snapshot.runId,runSeed:snapshot.runSeed});
   pending={version:C.version,runId:s.runId,seed:s.runSeed,savedAt:Date.now(),node:{...clone(node),id:`${s.actId}:${s.stageIndex}:${node.type}`},state:snapshot,preferredSpeed:g.preferredSpeed||1};
   // Settle the old stage before event code takes its own transaction snapshot.
   Object.assign(s,{battle:null,enemies:[],projectiles:[],particles:[],impacts:[],weaponZones:[],grabs:[],interference:[],systemWindups:[],orders:clone(snapshot.orders),selectedEnemy:null,selectedCrew:null,selectedCar:null,targetMode:null});
   s.crew.forEach(c=>{if(c.moving){c.car=c.moving.to;c.moving=null;}});
   g.restoreCheckpointEvent(null);
   if(node.type==='station'){g.stationOffers=null;g.stationStage=null;}
   if(node.type==='battle'||node.type==='elite'||node.type==='boss')commit();
  }catch(error){pending=null;status('자동 저장에 실패했습니다. 이전 저장은 유지됩니다.',true);console.warn(error);}
 }
 g.resetCheckpointBoundary=()=>{current=null;pending=null;};
 g.checkpointEventReady=()=>{if(pending?.node.type==='event'){pending.state.eventHistory=clone(g.state.eventHistory||[]);pending.state.unexpectedStationSeen=!!g.state.unexpectedStationSeen;commit({event:g.exportCheckpointEvent()});}};
 g.checkpointStationReady=()=>{if(pending?.node.type==='station')commit({shop:clone({...g.stationOffers,bought:[...g.stationOffers.bought]})});};
 const initial=g.makeInitialState.bind(g);g.makeInitialState=function(){const s=initial();s.runId=token();s.runSeed=token();current=null;pending=null;return s;};
 const resolve=g.resolveNode.bind(g);g.resolveNode=function(type,node={}){begin({type,data:node});return resolve(type,node);};
 const boss=g.startBoss.bind(g);g.startBoss=function(id){begin({type:'boss',bossId:id});return boss(id);};
 function remove(){try{localStorage.removeItem(C.key);pending=null;current=null;return true;}catch{status('체크포인트를 삭제하지 못했습니다. 브라우저 저장 설정을 확인해 주세요.',true);return false;}}
 for(const name of ['gameOver','showEnding','completeAct']){const old=g[name].bind(g);g[name]=function(...args){remove();return old(...args);};}
 g.continueRun=function(){
  const p=read();if(!p){status('이어할 수 있는 저장 데이터가 없습니다.',true);this.showMainMenu();return;}
  try{
   restoring=true;this.showMainMenu();this.state=clone(p.state);this.restoreMetaRun();this.resetTurretHeat?.();this.preferredSpeed=p.preferredSpeed;this.state.speed=p.preferredSpeed;
   this.restoreCheckpointEvent(p.event||null);this.stationOffers=p.shop?{...clone(p.shop),bought:new Set(p.shop.bought)}:null;this.stationStage=p.shop?this.state.stageIndex:null;
   if(this.stationOffers&&!this.stationOffers.reformReady&&window.EQUIPMENT_REFORM){this.stationOffers.reformReady=true;for(const [i,o]of this.stationOffers.gear.entries())o.equipment??={id:`${p.runId}-legacy-offer-${i}`,kind:o.kind,type:o.id,level:1,heat:0,cooldown:0,weaponBranches:{},investedScrap:0};}
   current=`${p.runId}:${this.state.actId}:${this.state.stageIndex}`;pending=null;this.mode='run';this.closeOverlay();this.renderAll();
   if(p.node.type==='boss')this.startBoss(p.node.bossId);else this.resolveNode(p.node.type,p.node.data||{});
  }catch(error){console.warn('Run restore failed',error);this.showMainMenu();status('저장 데이터를 복원하지 못했습니다. 기존 저장은 유지됩니다.',true);}
  finally{restoring=false;}
 };
 // Native modal dialog sits above game panels without replacing their listeners.
 function dialog(title,html,confirmText,action,cancel=false){
  $('#save-notice-dialog')?.remove();const el=document.createElement('dialog');el.id='save-notice-dialog';el.innerHTML=`<h2>${title}</h2>${html}<div class="save-dialog-actions">${cancel?'<button data-cancel>취소</button>':''}<button data-confirm>${confirmText}</button></div>`;document.body.append(el);
  el.querySelector('[data-cancel]')?.addEventListener('click',()=>{el.close();el.remove();});el.querySelector('[data-confirm]').onclick=()=>{el.close();el.remove();action?.();};el.addEventListener('cancel',e=>{if(!cancel)e.preventDefault();});el.showModal();
 }
 g.showSaveWarning=()=>dialog('저장 데이터 안내',`<p>현재 게임의 진행 데이터는 이 브라우저에 저장됩니다.</p><p>브라우저의 사이트 데이터 또는 저장 데이터를 삭제하면 <strong>영구 강화와 진행상황이 사라질 수 있습니다.</strong></p><p>다음 경우 기존 데이터가 유지되지 않을 수 있습니다.</p><ul><li>브라우저 사이트 데이터 삭제</li><li>시크릿/비공개 모드 사용</li><li>다른 브라우저 또는 다른 기기에서 접속</li><li>게임 접속 주소 또는 도메인 변경</li></ul><p>현재 버전에서는 외부 백업 기능을 지원하지 않습니다. 중요한 진행 데이터가 있는 경우 브라우저의 사이트 데이터를 삭제하지 마세요.</p><p>같은 GitHub Pages 주소에서 게임 파일만 업데이트하면 일반적으로 저장 데이터는 유지됩니다. 저장 키 변경, 강제 초기화, 다른 도메인으로의 이동은 데이터 손실 또는 초기화처럼 보이는 원인이 될 수 있습니다.</p><p>이어하기는 가장 최근 스테이지의 시작 상태부터 재개합니다.</p>`,'확인',()=>{try{localStorage.setItem(C.warningKey,'true');}catch{}});
 function abandon(after){dialog('현재 런 포기','<p>현재 진행 중인 런의 체크포인트가 삭제됩니다.<br>영구 진행도는 유지됩니다.</p>','런 포기',()=>{if(remove()){g.restoreCheckpointEvent(null);after();}},true);}
 const menu=g.showMainMenu.bind(g);g.showMainMenu=function(...args){menu(...args);$('#event-resume')?.remove();const start=$('#new-run-btn');if(!start)return;const p=read();const b=document.createElement('button');b.id='continue-run-btn';b.className='secondary-btn';b.disabled=!p;b.textContent=p?`이어하기 · ${p.state.actId.toUpperCase()} · STAGE ${p.state.stageIndex+1} · 종말 단계 ${p.state.metaRun.apocalypse}`:'이어하기 · 저장 없음';b.onclick=()=>this.continueRun();start.after(b);addWarning(b);
  if(p){const a=document.createElement('button');a.className='secondary-btn';a.textContent='현재 런 포기';a.onclick=()=>abandon(()=>this.showMainMenu());b.after(a);const click=start.onclick;start.onclick=e=>abandon(()=>click?.call(start,e));}
 };
 function addWarning(anchor){const b=document.createElement('button');b.className='save-storage-note';b.textContent='⚠ 진행 데이터는 현재 브라우저에 저장됩니다.';b.onclick=g.showSaveWarning;anchor.after(b);}
 const pause=g.openPause.bind(g);g.openPause=function(...a){pause(...a);const button=$('#abandon');if(button){button.textContent='현재 런 포기';button.onclick=()=>abandon(()=>this.showMainMenu());const codex=document.createElement('button');codex.id='pause-codex';codex.textContent='도감';codex.onclick=()=>{this.pauseCodex=true;this.showCodex();};button.after(codex);}};
 // Exposed read-only helpers also support isolated, storage-safe regression tests.
 g.runCheckpoint={read,validate:valid,snapshot:stable};
 const css=document.createElement('style');css.textContent=`#checkpoint-status{position:fixed;right:16px;bottom:16px;z-index:10000;padding:7px 12px;background:#112326e8;color:#88dba2;border-radius:6px;pointer-events:none;font-size:13px}#checkpoint-status.failed{color:#ff9292}#save-notice-dialog{max-width:580px;width:calc(100% - 40px);max-height:85vh;overflow:auto;background:#142326;color:#e8ece7;border:1px solid #647571;border-radius:14px;padding:24px;box-sizing:border-box;line-height:1.6}#save-notice-dialog::backdrop{background:#02090cbf}#save-notice-dialog button{padding:10px 18px;background:#304649;color:#fff;border:1px solid #728580;border-radius:7px;cursor:pointer}.save-dialog-actions{display:flex;gap:12px;justify-content:flex-end}.save-storage-note{display:block;width:100%;padding:10px;background:transparent;border:0;color:#b9c3bd;font-size:12px;cursor:pointer}#continue-run-btn{white-space:normal;width:100%}`;document.head.append(css);
 if(g.mode==='menu')g.showMainMenu();
 try{if(localStorage.getItem(C.warningKey)!=='true')g.showSaveWarning();}catch{g.showSaveWarning();}
})();
