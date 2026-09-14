/* Node-start saves only. The existing meta storage is deliberately not accessed. */
(()=>{
 'use strict';
 const g=window.lastRail,D=window.GAME_DATA;
 const C=window.RUN_CHECKPOINT_CONFIG={key:'lastTrainRunCheckpoint',warningKey:'lastTrainSaveGuideV2Acknowledged',legacyWarningKey:'lastTrainSaveWarningAcknowledged',saveGuideVersion:2,version:1,savedMs:1000};
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
 g.validateRunCheckpoint=valid;
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
 function acknowledgeSaveGuide(){try{localStorage.setItem(C.warningKey,'true');}catch{}}
 g.showSaveWarning=()=>{
  $('#save-notice-dialog')?.remove();
  const el=document.createElement('dialog');el.id='save-notice-dialog';el.className='save-guide-dialog';
  el.innerHTML=`<div class="save-guide-heading"><small>LOCAL SAVE · BACKUP</small><h2>저장 및 백업 안내</h2><p>LAST RAIL은 진행 상황을 자동으로 저장합니다. 다만 기본 저장 위치는 클라우드 계정이 아니라 <strong>현재 브라우저의 사이트 저장공간</strong>입니다.</p></div><div class="save-guide-grid"><article><b>자동 저장</b><p>영구 성장과 설정은 자동 저장됩니다. 진행 중인 런은 가장 최근 <strong>스테이지 시작 체크포인트</strong>에서 이어지며, 전투 도중의 순간 상태는 저장하지 않습니다.</p></article><article><b>브라우저 저장</b><p>사이트 데이터 삭제, 시크릿·비공개 모드, 다른 브라우저·기기 사용, 게임 주소 변경 시 기존 로컬 저장을 찾지 못할 수 있습니다.</p></article><article><b>파일 백업 지원</b><p>메인 메뉴의 <strong>세이브 관리</strong>에서 JSON 저장 파일을 내보내고 다시 불러올 수 있습니다. 기기 이동이나 중요한 진행 전에는 파일 백업을 권장합니다.</p></article></div><section class="save-guide-section"><h3>업데이트할 때는?</h3><p>같은 게임 주소에서 파일만 업데이트하는 경우 저장 데이터는 일반적으로 그대로 유지됩니다. 이미지·음악 같은 리소스 버전 변경도 세이브 초기화와는 별개입니다.</p></section><section class="save-guide-section save-guide-warning"><h3>데이터를 지키는 가장 안전한 방법</h3><ul><li>큰 업데이트 전이나 브라우저·기기 변경 전에는 <strong>저장 파일 내보내기</strong>를 사용하세요.</li><li>내보낸 파일은 브라우저 저장공간과 별개이므로 원하는 위치에 따로 보관할 수 있습니다.</li><li>저장 파일을 불러올 때는 현재 로컬 진행이 교체되며, 적용 직전에 복구용 내부 백업이 생성됩니다.</li></ul></section><p class="save-guide-footnote">파일 백업은 자동으로 생성되지 않습니다. 중요한 진행은 직접 내보내 보관해 주세요.</p><div class="save-dialog-actions"><button data-manage class="save-guide-secondary">세이브 관리 열기</button><button data-confirm class="save-guide-primary">확인</button></div>`;
  document.body.append(el);
  const close=()=>{el.close();el.remove();};
  el.querySelector('[data-confirm]').onclick=()=>{acknowledgeSaveGuide();close();};
  el.querySelector('[data-manage]').onclick=()=>{acknowledgeSaveGuide();close();setTimeout(()=>{if(typeof g.showSaveManager==='function')g.showSaveManager();else g.toast?.('메인 메뉴의 세이브 관리에서 백업할 수 있습니다.');},0);};
  el.addEventListener('cancel',e=>e.preventDefault());el.showModal();
 };
 function abandon(after){dialog('현재 런 포기','<p>현재 진행 중인 런의 체크포인트가 삭제됩니다.<br>영구 진행도는 유지됩니다.</p>','런 포기',()=>{if(remove()){g.restoreCheckpointEvent(null);after();}},true);}
 const menu=g.showMainMenu.bind(g);g.showMainMenu=function(...args){menu(...args);$('#event-resume')?.remove();const start=$('#new-run-btn');if(!start)return;const p=read();const b=document.createElement('button');b.id='continue-run-btn';b.className='secondary-btn';b.disabled=!p;b.textContent=p?`이어하기 · ${p.state.actId.toUpperCase()} · STAGE ${p.state.stageIndex+1} · 종말 단계 ${p.state.metaRun.apocalypse}`:'이어하기 · 저장 없음';b.onclick=()=>this.continueRun();start.after(b);addWarning(b);
  if(p){const click=start.onclick;start.onclick=e=>abandon(()=>click?.call(start,e));}
 };
 function addWarning(anchor){const b=document.createElement('button');b.className='save-storage-note';b.textContent='💾 자동 저장 · 백업 및 불러오기 안내';b.onclick=g.showSaveWarning;anchor.after(b);}
 const pause=g.openPause.bind(g);g.openPause=function(...a){pause(...a);const button=$('#abandon');if(button){button.textContent='현재 런 포기';button.onclick=()=>abandon(()=>this.showMainMenu());const codex=document.createElement('button');codex.id='pause-codex';codex.textContent='도감';codex.onclick=()=>{this.pauseCodex=true;this.showCodex();};button.after(codex);}};
 // Exposed read-only helpers also support isolated, storage-safe regression tests.
 g.runCheckpoint={read,validate:valid,snapshot:stable};
 const css=document.createElement('style');css.textContent=`#checkpoint-status{position:fixed;right:16px;bottom:16px;z-index:10000;padding:7px 12px;background:#112326e8;color:#88dba2;border-radius:6px;pointer-events:none;font-size:13px}#checkpoint-status.failed{color:#ff9292}#save-notice-dialog{max-width:760px;width:calc(100% - 32px);max-height:88vh;overflow:auto;background:linear-gradient(180deg,#16292b,#101d20);color:#e8ece7;border:1px solid #657a76;border-radius:16px;padding:0;box-sizing:border-box;line-height:1.65;box-shadow:0 24px 80px #000a}#save-notice-dialog::backdrop{background:#02090cd9;backdrop-filter:blur(3px)}#save-notice-dialog .save-guide-heading{padding:24px 26px 18px;border-bottom:1px solid #ffffff18;background:#1c3234}#save-notice-dialog .save-guide-heading small{letter-spacing:.16em;color:#9db6b2;font-size:11px}#save-notice-dialog .save-guide-heading h2{margin:4px 0 8px}#save-notice-dialog .save-guide-heading p{margin:0;color:#ced8d4}#save-notice-dialog .save-guide-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:18px 22px 6px}#save-notice-dialog .save-guide-grid article{padding:14px;border:1px solid #ffffff17;border-radius:10px;background:#ffffff08}#save-notice-dialog .save-guide-grid b{color:#e7d29b}#save-notice-dialog .save-guide-grid p{margin:7px 0 0;font-size:13px;color:#c8d1ce}#save-notice-dialog .save-guide-section{margin:12px 22px;padding:14px 16px;border-left:3px solid #6c9f98;background:#0d181a88}#save-notice-dialog .save-guide-section h3{margin:0 0 6px;font-size:15px}#save-notice-dialog .save-guide-section p,#save-notice-dialog .save-guide-section ul{margin:0;color:#cbd5d1}#save-notice-dialog .save-guide-section ul{padding-left:20px}#save-notice-dialog .save-guide-warning{border-left-color:#d8b66d}#save-notice-dialog .save-guide-footnote{margin:10px 22px 0;font-size:12px;color:#9eaaa6}#save-notice-dialog button{padding:10px 18px;color:#fff;border:1px solid #728580;border-radius:7px;cursor:pointer}#save-notice-dialog .save-dialog-actions{display:flex;gap:10px;justify-content:flex-end;padding:18px 22px 22px}#save-notice-dialog .save-guide-secondary{background:#24383b}#save-notice-dialog .save-guide-primary{background:#496760;border-color:#85a89f}.save-dialog-actions{display:flex;gap:12px;justify-content:flex-end}.save-storage-note{display:block;width:100%;padding:10px;background:transparent;border:0;color:#b9c3bd;font-size:12px;cursor:pointer}.save-storage-note:hover{color:#e3d5aa}#continue-run-btn{white-space:normal;width:100%}@media(max-width:680px){#save-notice-dialog .save-guide-grid{grid-template-columns:1fr}#save-notice-dialog .save-dialog-actions{flex-direction:column-reverse}#save-notice-dialog .save-dialog-actions button{width:100%}}`;document.head.append(css);
 if(g.mode==='menu')g.showMainMenu();
 const showInitialSaveWarning=()=>{try{if(localStorage.getItem(C.warningKey)!=='true')g.showSaveWarning();}catch{g.showSaveWarning();}};
 if(window.LAST_RAIL_ASSETS?.ready)window.LAST_RAIL_ASSETS.ready.then(showInitialSaveWarning);else showInitialSaveWarning();
})();
