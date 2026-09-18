/* 0.6.0 is the first external-save baseline. Add ordered steps; never replace them. */
(()=>{
 const g=lastRail,D=GAME_DATA,C=META_CONFIG;
 const F=window.SAVE_FORMAT={gameVersion:'1.0.2',saveFormatVersion:2,maxBytes:8*1024*1024,migrations:[],idMaps:{turrets:{},modules:{},skills:{},upgrades:{},modifications:{}},retired:{turrets:{},modules:{},upgrades:{}},fallbackEquipmentRefund:{money:100,scrap:20}};
 F.migrations.push({from:'0.6.0',fromFormat:1,to:'0.7.0',toFormat:1,migrate(){/* v0.7 asset loading does not alter save data. */}});
 F.migrations.push({from:'0.7.0',fromFormat:1,to:'0.8.0',toFormat:1,migrate(){/* v0.8 PC controls do not alter save data. */}});
 F.migrations.push({from:'0.8.0',fromFormat:1,to:'0.9.0',toFormat:1,migrate(save){
  const run=save.currentRun?.state;if(!run)return;run.powerCapacityBonus??=0;
  run.rerollCount??=0;run.titanDistance=Math.min(GAME_DATA.BALANCE.run.maxTitanDistance,run.titanDistance);
  run.loop09??=1;
  const events=EVENT_CONFIG.events.filter(e=>e.act===3).map(e=>e.id);
  if(run.metaRun?.unlocks?.events)run.metaRun.unlocks.events=[...new Set([...run.metaRun.unlocks.events,...events])];
  for(const car of run.cars||[]){car.breakerBroken=false;car.breakerRepair=0;car.overchargeLeft=0;car.specialOvercharge=false;car.lightningLocked=false;car.manualOff09=false;car.destroyed=car.hp<=0;car._lastHull09=car.hp;}
 }});
 F.migrations.push({from:'0.9.0',fromFormat:1,to:'0.9.1',toFormat:1,migrate(save){
  const run=save.currentRun?.state;if(!run)return;
  const loop=Math.max(1,Math.floor(Number(run.loop09)||1));
  const inferred=loop>=2?3:run.actId==='act3'?2:run.actId==='act2'?1:run.actId==='titan'?3:0;
  run.engineBoosts091=Math.max(0,Math.min(3,Math.floor(Number(run.engineBoosts091) || inferred)));
  if(!Number.isFinite(run.enginePowerBonus091)){
   run.enginePowerBonus091=run.engineBoosts091;
   run.powerCapacityBonus=(Number(run.powerCapacityBonus)||0)+run.enginePowerBonus091;
  }
 }});
 F.migrations.push({from:'0.9.1',fromFormat:1,to:'1.0',toFormat:2,migrate(save,notes){
  // 1.0 keeps all permanent progression while adding FINAL/TITAN, revised Apocalypse rules and lore records.
  save.records=save.records&&typeof save.records==='object'&&!Array.isArray(save.records)?save.records:{};
  save.records.codex=save.records.codex&&typeof save.records.codex==='object'&&!Array.isArray(save.records.codex)?save.records.codex:{};
  const book=save.records.codex;
  for(const key of ['gear','enemies','crew','skills','events'])if(!Array.isArray(book[key]))book[key]=[];
  if(!Array.isArray(book.loreRead))book.loreRead=[];
  if(!book.results||typeof book.results!=='object'||Array.isArray(book.results))book.results={};

  const meta=save.metaProgress||{};
  meta.apocalypseUnlocked=Math.max(0,Math.min(10,Math.floor(Number(meta.apocalypseUnlocked)||0)));
  meta.apocalypseCleared=Math.max(-1,Math.min(10,Math.floor(Number.isFinite(Number(meta.apocalypseCleared))?Number(meta.apocalypseCleared):-1)));
  meta.apocalypseSelected=Math.max(0,Math.min(meta.apocalypseUnlocked,Math.floor(Number(meta.apocalypseSelected)||0)));

  // Old node checkpoints remain valid. Only transient TITAN presentation state is discarded;
  // FINAL combat reconstructs it when the boss actually starts.
  const run=save.currentRun?.state;
  if(run){
   delete run.titanEnginePower09;
   delete run.titanWorldPace10;
   run.loop09=Math.max(1,Math.floor(Number(run.loop09)||1));
   if(run.metaRun){
    run.metaRun.apocalypse=Math.max(0,Math.min(10,Math.floor(Number(run.metaRun.apocalypse)||0)));
   }
  }
  notes?.push('1.0 정식 출시 데이터 구조로 변환: 종말 진행도·기록 보관소·FINAL ACT 호환 정보를 정리했습니다.');
 }});
 F.migrations.push({from:'1.0',fromFormat:2,to:'1.0.1',toFormat:2,migrate(save,notes){
  // 1.0.1 changes event presentation/text only; persistent progression is unchanged.
  notes?.push('1.0.1 이벤트 연출 및 설명 텍스트 호환 정보를 적용했습니다.');
 }});
 F.migrations.push({from:'1.0.1',fromFormat:2,to:'1.0.2',toFormat:2,migrate(save,notes){
  // 1.0.2 adds optional account-based cloud sync. The save payload itself is unchanged.
  notes?.push('1.0.2 계정 기반 클라우드 저장 호환 정보를 적용했습니다.');
 }});
 window.SAVE_MIGRATIONS=F.migrations;
 const obj=v=>v&&typeof v==='object'&&!Array.isArray(v),copy=v=>JSON.parse(JSON.stringify(v)),arr=v=>Array.isArray(v)?v:[],n=(v,d=0)=>Number.isFinite(v)?v:d,clamp=(v,max,min=0)=>Math.max(min,Math.min(max,Math.floor(n(v,min))));
 const version=v=>{if(typeof v!=='string'||!/^\d+\.\d+(\.\d+)?$/.test(v))throw Error('게임 버전 정보가 올바르지 않습니다.');return v.split('.').map(Number).concat([0]).slice(0,3);};
 const compare=(a,b)=>{a=version(a);b=version(b);for(let i=0;i<3;i++)if(a[i]!==b[i])return Math.sign(a[i]-b[i]);return 0;};
 const map=(kind,id)=>F.idMaps[kind]?.[id]||id;
 const registry={turrets:D.TURRETS,modules:D.MODULES,skills:D.TRAITS,events:Object.fromEntries(EVENT_CONFIG.events.map(e=>[e.id,e]))};
 F.unlocked=function(meta,book={}){const out={};for(const[k,reg]of Object.entries(registry)){const seen=k==='turrets'||k==='modules'?arr(book.gear).filter(id=>id.startsWith(k==='turrets'?'turret:':'module:')).map(id=>id.split(':')[1]):arr(book[k]);out[k]=[...new Set([...arr(meta.contentUnlocks?.[k]),...seen,...Object.entries(reg).filter(([,d])=>!d.unlockSpent||meta.spent>=d.unlockSpent).map(([id])=>id)])].filter(id=>reg[id]&&!reg[id].captainOnly);}return out;};
 function levels(values,notes,meta){const out={};for(const[id,raw]of Object.entries(values||{})){const key=map('upgrades',id),d=C.upgrades[key];if(!d){const costs=F.retired.upgrades[id]?.costs;if(costs){const refund=costs.slice(0,clamp(raw,costs.length)).reduce((a,b)=>a+b,0);meta.relics+=refund;notes.push(`삭제된 강화 ${id}: 잔해 ${refund} 환불`);}else{meta.legacyUpgrades??={};meta.legacyUpgrades[id]=raw;notes.push(`알 수 없는 강화 ${id}: 투자 기록 보관`);}continue;}const value=Math.max(0,Math.floor(n(raw)));out[key]=Math.max(out[key]||0,Math.min(value,d.max));if(value>d.max){meta.legacyUpgradeLevels??={};meta.legacyUpgradeLevels[key]=value;notes.push(`${d.name}: 초과 레벨 ${value}의 기록 보관`);}}for(const id of Object.keys(C.upgrades))out[id]??=0;return out;}
 function crew(c){if(!obj(c)||!obj(c.stats))throw Error('직원 데이터 오류');c.stars=clamp(c.stars,3,1);c.level=clamp(c.level,PROGRESSION_CONFIG.crew.maxLevel,1);c.maxHp=Math.max(1,n(c.maxHp,100));c.hp=Math.max(0,Math.min(c.maxHp,n(c.hp,c.maxHp)));for(const k of ['combat','operate','repair','recovery'])c.stats[k]=Math.max(0,n(c.stats[k]));const skills=a=>[...new Set(arr(a).map(id=>map('skills',id)))].filter(id=>D.TRAITS[id]&&!D.TRAITS[id].captainOnly);c.starTraits=skills(c.starTraits||c.normalSkills||c.traits);c.eventSkill=map('skills',c.eventSkill||c.eventTraits?.[0]);if(!D.TRAITS[c.eventSkill])c.eventSkill=null;c.eventTraits=c.eventSkill?[c.eventSkill]:[];c.normalSkills=c.starTraits;c.traits=[...c.starTraits,...c.eventTraits,...(c.captain?['fieldCaptain']:[])];c.xp=Math.max(0,n(c.xp));c.pendingStats=Math.max(0,Math.floor(n(c.pendingStats)));return c;}
 function equipment(e,state,notes){if(!obj(e)||!['turret','module'].includes(e.kind))return null;const kind=e.kind==='turret'?'turrets':'modules',id=e.type;e.type=map(kind,id);const d=registry[kind][e.type];if(!d){const value=F.retired[kind][id]||F.fallbackEquipmentRefund;const money=n(e.purchasePrice,n(value.price,n(value.money))),scrap=n(e.investedScrap,n(value.scrap));state.money+=Math.max(0,money);state.scrap+=Math.max(0,scrap);notes.push(`제거된 장비 ${id}: 돈 ${money}, 고철 ${scrap} 환불`);if(e.aux)equipment(e.aux,state,notes);return null;}const max=e.kind==='turret'?WEAPON_UPGRADES.maxLevel:EQUIPMENT_REFORM.maxModuleLevel;const level=Math.max(1,Math.floor(n(e.level,1)));if(level>max){e.legacyLevel=level;notes.push(`${d.name}: 초과 강화 기록 보관`);}e.level=Math.min(level,max);e.heat=Math.max(0,Math.min(100,n(e.heat)));e.weaponBranches=obj(e.weaponBranches)?e.weaponBranches:{};for(const[t,id]of Object.entries(e.weaponBranches))if(!WEAPON_UPGRADES.tiers[t]?.[id])delete e.weaponBranches[t];if(e.model&&!D.BALANCE.moduleUpgrade.branches[e.model])delete e.model;if(e.aux)e.aux=equipment(e.aux,state,notes);return e;}
 F.validateSave=function(input){
  const notes=[],s=copy(input);if(!obj(s)||s.game!=='last-train'||!obj(s.metaProgress)||!obj(s.upgrades))throw Error('last-train 세이브 파일이 아니거나 필수 데이터가 없습니다.');
  if(!Number.isInteger(s.saveFormatVersion)||s.saveFormatVersion<1)throw Error('저장 형식 정보가 올바르지 않습니다.');
  if(compare(s.gameVersion,'0.6.0')<0)throw Error('이 저장 파일은 지원되지 않는 이전 버전입니다. 0.6 버전 이상의 저장 파일만 불러올 수 있습니다.');
  if(s.saveFormatVersion>F.saveFormatVersion||compare(s.gameVersion,F.gameVersion)>0)throw Error('현재 게임보다 새로운 버전에서 생성된 저장 파일입니다.');
  while(compare(s.gameVersion,F.gameVersion)<0||s.saveFormatVersion<F.saveFormatVersion){const step=F.migrations.find(m=>compare(m.from,s.gameVersion)===0&&m.fromFormat===s.saveFormatVersion);if(!step||compare(step.to,step.from)<=0&&step.toFormat<=step.fromFormat)throw Error('이 버전의 순차 변환 경로가 없습니다.');step.migrate(s,notes);s.gameVersion=step.to;s.saveFormatVersion=step.toFormat;notes.push('이전 버전 저장 파일을 최신 버전으로 변환했습니다.');}
  const m=s.metaProgress;for(const k of ['relics','spent','totalEarned','clears','act2Clears','maxPoints'])m[k]=Math.max(0,n(m[k]));m.schema=C.version;m.upgrades=levels({...s.upgrades,...(s.captainUpgrades||{})},notes,m);m.discovered=obj(m.discovered)?m.discovered:{turrets:[],enemies:[]};
  const doom=obj(s.apocalypse)?s.apocalypse:{};m.apocalypseUnlocked=clamp(doom.unlocked??m.apocalypseUnlocked,C.apocalypse.length-1);m.apocalypseCleared=clamp(doom.highestClear??m.apocalypseCleared,C.apocalypse.length-1,-1);m.apocalypseSelected=clamp(doom.selected??m.apocalypseSelected,m.apocalypseUnlocked);
  const mods=obj(s.trainModifications)?s.trainModifications:{};m.modifications=Object.fromEntries(Object.entries(mods.unlocked||m.modifications||{}).map(([id,v])=>[map('modifications',id),!!v]).filter(([id])=>C.modifications[id]));let points=m.act2Clears>0?C.points.filter(([at])=>at<=m.spent).at(-1)?.[1]||0:0;m.enabledMods=[...new Set(arr(mods.enabled||m.enabledMods).map(id=>map('modifications',id)))].filter(id=>{const d=C.modifications[id];if(!d||!m.modifications[id]||points<d.points)return false;points-=d.points;return true;});
  s.records=obj(s.records)?s.records:{};const book=obj(s.records.codex)?s.records.codex:{};for(const k of ['gear','enemies','crew','skills','events'])book[k]=arr(book[k]).filter(v=>typeof v==='string');book.results=obj(book.results)?book.results:{};book.loreRead=arr(book.loreRead).filter(v=>typeof v==='string');s.records.codex=book;
  m.contentUnlocks={...(m.contentUnlocks||{}),...(s.unlocks||{})};m.contentUnlocks=F.unlocked(m,book);s.unlocks=m.contentUnlocks;
  if(s.currentRun){try{const p=s.currentRun,run=p.state;if(!obj(run)||!Array.isArray(run.cars)||!Array.isArray(run.crew))throw Error();for(const k of ['money','scrap','relics'])run[k]=Math.max(0,n(run[k]));run.metaRun??={upgrades:{},mods:[],apocalypse:0};run.metaRun.upgrades=levels(run.metaRun.upgrades,notes,{relics:0});run.metaRun.mods=arr(run.metaRun.mods).filter(id=>C.modifications[id]);run.metaRun.apocalypse=clamp(run.metaRun.apocalypse,C.apocalypse.length-1);if(run.metaRun.unlockSpent!==undefined)run.metaRun.unlockSpent=Math.max(0,n(run.metaRun.unlockSpent));if(obj(run.metaRun.unlocks)){for(const[k,reg]of Object.entries(registry))run.metaRun.unlocks[k]=[...new Set(arr(run.metaRun.unlocks[k]).filter(id=>reg[id]))];}
   if(run.cars.length>5+(run.metaRun.upgrades.extraCar?1:0))throw Error();
   run.cars.forEach((c,i)=>{c.equipment=arr(c.equipment).map(e=>equipment(e,run,notes)).filter(Boolean);if(c.equipment.length>(i===0?1:2))throw Error();});run.crew.forEach(crew);for(let i=0;i<run.cars.length;i++)if(run.crew.filter(c=>!c.captain&&c.car===i).length>(i===0?1:2))throw Error();
   if(p.shop){p.shop.crew=arr(p.shop.crew).map(crew);p.shop.gear=arr(p.shop.gear).filter(o=>{const reg=o.kind==='turret'?D.TURRETS:D.MODULES;o.id=map(o.kind==='turret'?'turrets':'modules',o.id);if(!reg[o.id])return false;o.d={...reg[o.id],price:Math.max(0,n(o.d?.price,reg[o.id].price))};if(o.equipment)o.equipment=equipment(o.equipment,run,notes);return true;});}
   s.currentRun=g.validateRunCheckpoint(p);if(!s.currentRun)throw Error();
  }catch{s.currentRun=null;notes.push('진행 중이던 런은 최신 버전과 호환되지 않아 종료되었습니다. 영구 진행도는 정상적으로 복구되었습니다.');}}
  s.settings=obj(s.settings)?s.settings:{};s.settings.volume=Math.max(0,Math.min(1,n(s.settings.volume,D.BALANCE.audio.defaultMaster)));s.gameVersion=F.gameVersion;return{save:s,notes};
 };
 // Retained unlocks affect every existing content generator, without marking discoveries.
 for(const[k,reg]of Object.entries(registry))for(const[id,d]of Object.entries(reg)){let threshold=d.unlockSpent;if(!threshold||!Number.isFinite(threshold))continue;Object.defineProperty(d,'unlockSpent',{enumerable:true,configurable:true,get(){return g.meta.contentUnlocks?.[k]?.includes(id)?0:threshold;},set(v){threshold=v;}});}
})();
