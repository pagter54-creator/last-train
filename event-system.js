/* Event transactions use an independent seeded generator. No combat clock or Math.random rolls. */
(()=>{
  'use strict';
  const g=window.lastRail,D=window.GAME_DATA,B=D.BALANCE,C=window.EVENT_CONFIG,P=window.PROGRESSION_CONFIG,A=window.LAST_RAIL_SCENE;
  const $=s=>document.querySelector(s),copy=v=>JSON.parse(JSON.stringify(v)),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),labels={money:'돈',scrap:'고철',relics:'고대 잔해',distance:'타이탄 거리',combat:'전투',operate:'운용',repair:'수리',recovery:'회복',engine:'엔진 속도',cooling:'냉각 효율',module:'모듈 효과',hull:'최대 내구'};
  let session=null,busy=false,powerBudgetRead=0;
  function rng(seed){let h=2166136261;for(const c of String(seed))h=Math.imul(h^c.charCodeAt(0),16777619);return()=>{h+=0x6D2B79F5;let t=h;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
  const integer=(r,v)=>Array.isArray(v)?Math.floor(r()*(v[1]-v[0]+1))+v[0]:v||0;
  const pick=(r,a)=>a.length?a[Math.floor(r()*a.length)]:null;
  const shuffled=(r,a)=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
  function weighted(r,weights){let n=r()*weights.reduce((a,b)=>a+b,0);for(let i=0;i<weights.length;i++){n-=weights[i];if(n<0)return i;}return weights.length-1;}
  const staff=()=>g.state.crew.filter(c=>!c.dead&&c.hp>0&&!c.moving);
  const trait=id=>staff().find(c=>c.traits.includes(id));
  const installedEquipment=()=>g.state.cars.flatMap(c=>c.equipment.flatMap(e=>e.aux?[e,e.aux]:[e]));
  const ancientGear=()=>installedEquipment().filter(e=>(e.kind==='turret'?D.TURRETS:D.MODULES)[e.type]?.ancient);
  const supportsAct=(e,act)=>Array.isArray(e.acts)?e.acts.includes(act):e.act===act;
  const ev=()=>C.events.find(e=>e.id===session.eventId);
  const definition=id=>ev().choices.find(c=>c.id===id);
  const fmt=n=>Number(n.toFixed(2));
  const newSeed=()=>Array.from(crypto.getRandomValues(new Uint32Array(4)),n=>n.toString(16).padStart(8,'0')).join('');
  function gearDetails(eq){const d=(eq.kind==='turret'?D.TURRETS:D.MODULES)[eq.type];let html=g.equipmentHTML(eq,null)+`<p>획득 장비 Lv.${eq.level} · 직원/전력 보정 전</p>`;if(eq.level>1){if(eq.kind==='turret')html+=`<p>강화 반영: 1회 피해 <span class="positive">${fmt(d.damage*(d.pellets||1)*(1+(eq.level-1)*B.upgrade.damagePerLevel))}</span> · 발열 <span class="negative">${fmt(d.heat*(1+(eq.level-1)*B.upgrade.heatPerLevel))}</span></p>`;else for(const k of ['heatMult','coolingMult','stageHealMult','repairMult','ammoDamageMult'])if(k in d)html+=`<p>${({heatMult:'발열',coolingMult:'냉각',stageHealMult:'회복',repairMult:'수리',ammoDamageMult:'실탄 피해'})[k]}: ×${fmt(1+(d[k]-1)*(1+(eq.level-1)*B.moduleUpgrade.perLevel))}</p>`;}return html;}
  function clearSave(){if(g.checkpointEnabled)return;try{localStorage.removeItem(C.storageKey);}catch{} }
  function readSave(){if(g.checkpointEnabled)return null;try{const p=JSON.parse(localStorage.getItem(C.storageKey));return p?.version===C.version&&p.state?.cars?.length&&C.events.some(e=>e.id===p.session?.eventId)?p:null;}catch{return null;}}
  function save(){if(g.checkpointEnabled)return;localStorage.setItem(C.storageKey,JSON.stringify({version:C.version,state:g.state,session,preferredSpeed:g.preferredSpeed}));}
  g.restoreCheckpointEvent=value=>{session=value?copy(value):null;busy=false;};
  g.exportCheckpointEvent=()=>session?copy(session):null;
  function transaction(action){if(busy)return;busy=true;const before=copy(g.state),previous=copy(session);try{action();g.normalizeCarElectrical09?.();save();}catch(error){g.state=before;session=previous;g.toast('이벤트 처리·저장에 실패했습니다. 저장 공간·브라우저 설정을 확인한 뒤 다시 선택해 주세요.');console.warn('Event transaction not committed',error);busy=false;render();return false;}busy=false;g.updateHUD();g.renderCars();g.playSound('select');render();return true;}
  function candidate(r,id,weights=C.survivorStars){
    const pool=D.CREW_TEMPLATES.filter(c=>!g.state.crew.some(s=>s.name===c.name)),base=pick(r,pool.length?pool:D.CREW_TEMPLATES),stars=weighted(r,weights)+1;
    const level=Math.min(P.crew.maxRecruitLevel,1+Math.floor((g.globalStage()-1)/P.crew.recruitStageStep),(P.stars.promotion[stars+1]||P.crew.maxLevel+1)-1);
    const c={...copy(base),id,stars,birthStars:stars,level,xp:0,pendingStats:0,traits:[],starTraits:[],eventTraits:[],training:{combat:0,operate:0,repair:0,recovery:0},past:base.background,maxHp:B.crew.maxHp,car:-1,moving:null,dead:false};
    c.levelGrowth09=[];for(let n=0;n<P.stars.statBonus[stars]+(level>1?level:0);n++){const k=pick(r,Object.keys(c.stats));c.stats[k]+=P.crew.statGain;c.training[k]+=P.crew.statGain;if(n>=P.stars.statBonus[stars])c.levelGrowth09.push(k);}
    const talents=shuffled(r,Object.keys(D.TRAITS).filter(k=>D.TRAITS[k].canBeNormalSkill!==false&&(g.runContentUnlocked?.('skills',k)??true)));c.starTraits=talents.slice(0,stars-1);c.traits=[...c.starTraits];c.hp=Math.round(c.maxHp*(C.survivorHp[0]+r()*(C.survivorHp[1]-C.survivorHp[0])));return c;
  }
  function gear(r,id,kind='any'){
    const rare=kind==='rare'||kind==='rareModule',wanted=kind==='rareModule'?'module':kind;
    let pool=['turret','module'].flatMap(k=>Object.entries(k==='turret'?D.TURRETS:D.MODULES).filter(([id])=>g.runContentUnlocked?.(k==='turret'?'turrets':'modules',id)??true).map(([type,data])=>({kind:k,type,data})));
    if(['turret','module'].includes(wanted))pool=pool.filter(e=>e.kind===wanted);
    if(rare){pool.sort((a,b)=>b.data.price-a.data.price);pool=pool.slice(0,Math.max(1,Math.ceil(pool.length*C.shop.rarePoolFraction)));}
    const item=pick(r,pool),eq={id,kind:item.kind,type:item.type,level:rare&&item.data.upgradeable!==false?C.shop.rareLevel:1,branch:false,heat:0,overheated:false,cooldown:0};return g.randomizeMetaEquipment?.(eq,r)||eq;
  }
  function prepareReward(raw,seed){
    const r=rng(seed),out={...raw};if(out.stationVisit)out.stationStock=g.prepareUnexpectedStation(r);if(out.survivorSupplies)Object.assign(out,pick(r,C.survivorSupplies));for(const k of ['money','scrap','relics','moneyLoss','crewDamage','actorDamage','carDamage'])if(k in out)out[k]=integer(r,out[k]);
    if(out.part09){out.part09Roll=r();if(out.part09==='lightningRod')out.equipment={id:`${seed}-rod`,kind:'module',type:'lightningRod',level:1,heat:0,cooldown:0};}
    out.carIds=shuffled(r,g.state.cars.map(c=>c.id)).slice(0,out.carCount==='all'?g.state.cars.length:out.carCount||1);
    out.crewIds=shuffled(r,g.state.crew.filter(c=>!c.dead).map(c=>c.id)).slice(0,out.crewCount||1);
    if(out.possibleCandidate&&r()<C.candidateChance)out.candidates=1;
    if(out.possibleRareGear&&r()<C.rareGearChance)out.gear='rare';
    if(out.labReward)Object.assign(out,pick(r,C.labRewards));
    if(out.medicalRescue){out.candidates=1;out.medical=true;}
    if(out.candidates)out.people=Array.from({length:out.candidates},(_,i)=>candidate(r,`${seed}-crew-${i}`,out.medical?C.medicalStars:C.survivorStars));
    if(out.people?.length>1&&out.people[0].name===out.people[1].name)out.people[1].name+=' · 동행자';
    if(out.gear)out.equipment=gear(r,`${seed}-equipment`,out.gear);
    if(out.disableGear)out.disabledId=pick(r,g.state.cars.flatMap(c=>c.equipment.map(e=>e.id)));
    if(out.buff)out.effect=pick(r,Object.entries(C.buffs));
    if(out.debuff)out.effect=pick(r,Object.entries(C.debuffs));
    if(out.skillReward){const pool=out.skillReward.pool==='normal'?Object.keys(D.TRAITS).filter(id=>D.TRAITS[id].canBeNormalSkill!==false):out.skillReward.pool;out.skillOrder=shuffled(r,pool.filter(id=>D.TRAITS[id]?.canBeEventSkill&&(g.runContentUnlocked?.('skills',id)??true)));}
    if(out.possibleTalent&&r()<C.talentChance)out.talentOrder=shuffled(r,C.combatTalents.filter(id=>g.runContentUnlocked?.('skills',id)??true));
    if(out.shop){
      if(out.shop==='exchange')out.offers=shuffled(r,C.exchanges).slice(0,C.shop.exchangeCount).map((x,i)=>({label:x.label,cost:x.cost,reward:prepareReward(x.reward,`${seed}-trade-${i}`)}));
      else out.offers=Array.from({length:C.shop.count},(_,i)=>{const equipment=gear(r,`${seed}-shop-${i}`,r()<(out.shop==='raider'?C.shop.raiderRareChance:C.shop.rareChance)?'rare':'any'),d=(equipment.kind==='turret'?D.TURRETS:D.MODULES)[equipment.type],price=out.shop==='relic'?integer(r,C.shop.relicPrice):Math.ceil(d.price*(C.shop.markup[0]+r()*(C.shop.markup[1]-C.shop.markup[0]))*(out.shopFactor||1));return{label:d.name,cost:out.freeItem&&i===0?{}:{[out.shop==='relic'?'relics':'money']:price},reward:{equipment}};});
    }
    if(out.blackoutNext)out.targetCarId=pick(r,g.state.cars.filter(c=>c.hp>0).map(c=>c.id))||g.state.cars[0]?.id;
    if(out.destroyNonEngineCar){const cars=g.state.cars.slice(1),pool=cars.filter(c=>c.hp>0);out.targetCarId=pick(r,(pool.length?pool:cars).map(c=>c.id));const car=g.state.cars.find(c=>c.id===out.targetCarId);if(out.disableDestroyedCarGear&&car?.equipment.length)out.targetEquipmentId=pick(r,car.equipment.map(e=>e.id));}
    if(out.breakAncientGear)out.targetAncientId=pick(r,ancientGear().map(e=>e.id));
    return out;
  }
  function allowed(c){const q=c.condition;if(!q)return true;if(q.trait&&!trait(q.trait))return false;if(q.stat&&!staff().some(s=>g.effectiveStat(s,q.stat)>=q.min))return false;if(q.damagedTrain&&!g.state.cars.some(s=>s.hp<s.maxHp))return false;return true;}
  function eventEligible(e,selectedAct,currentAct){
    if(!(g.runContentUnlocked?.('events',e.id)??true))return false;
    const actOk=(e.crewGrowth||e.rareStation)?e.act<=currentAct:supportsAct(e,selectedAct);if(!actOk)return false;
    if(e.rareStation&&g.state.unexpectedStationSeen)return false;
    if((e.crewGrowth||e.requiresStaff)&&!staff().length)return false;
    if(e.requiresCompanion&&staff().length<2)return false;
    if(e.minStaff&&staff().length<e.minStaff)return false;
    if(e.requiresAncientGear&&!ancientGear().length)return false;
    if(e.requiresNoAncientCoreBoost&&(g.state.eventAncientBoost||1)>1)return false;
    return true;
  }
  function chance(c,actor){let p=c.chance;if(c.scholarChance&&trait('scholar'))p=c.scholarChance;if(c.skill){const value=actor?g.effectiveStat(actor,c.skill):Math.max(0,...staff().map(s=>g.effectiveStat(s,c.skill)));p+= (value-C.skill.reference)*C.skill.step;}if(c.engineChance){const car=g.state.cars[0];p+=(g.effectiveCarPower(0)-C.engine.powerReference)*C.engine.powerStep+(car.hp/car.maxHp-1)*C.engine.hullStep;}return p===undefined?null:clamp(p,C.skill.min,C.skill.max);}
  function outcomeIndex(c,actor){const p=chance(c,actor),prepared=session.prepared[c.id];return p===null?prepared.weightedIndex:prepared.roll<p?0:1;}
  function chanceText(c,actor){const kind=c.reward?.part09;if(['generator','memoryTreat','memoryWait'].includes(kind)){
    const t=UPDATE09.events;if(kind!=='memoryWait'&&!actor)return '담당 직원의 능력에 따라 성공률 결정';
    const person=kind==='memoryWait'?g.state.crew.find(s=>s.id===session.patient09):actor;if(!person)return '대상 직원 없음';
    const generator=kind==='generator',wait=kind==='memoryWait',p=clamp((generator?t.generatorBase:wait?t.memoryWaitBase:t.memoryBase)+Math.max(0,g.effectiveStat(person,generator?'repair':'recovery'))*(generator?t.generatorPerRepair:t.memoryPerRecovery),0,generator?.95:wait?.98:.92),great=wait?0:p*(generator?t.generatorGreat:t.memoryGreat);
    return `대성공 ${Math.round(great*100)}% · 성공 ${Math.round((p-great)*100)}% · 실패 ${Math.round((1-p)*100)}%`;
   }if(!c.outcomes)return '확정';const p=chance(c,actor);if(p===null)return '결과 불확실';const label=p<.3?'매우 낮음':p<.45?'낮음':p<.65?'보통':p<.8?'높음':'매우 높음';return `성공 가능성 ${label}`;}
  const eventDistanceFactor=()=>g.state?.actId==='act3'?3.2:g.state?.actId==='act2'?2.5:1;
  const eventTimeCost=c=>c.distanceCost??((c.time||0)*eventDistanceFactor());
  function costText(c){return [`거리 −${fmt(eventTimeCost(c))} km`,...Object.entries(c.cost||{}).map(([k,v])=>`${labels[k]} −${v}`)].join(' · ');}
  function pairMembers(){return (session?.pairIds||[]).map(id=>g.state.crew.find(c=>c.id===id)).filter(Boolean);}
  function formatEventText(text,actor=null){const [a,b]=pairMembers();return String(text??'').replaceAll('{A}',a?.name||'직원 A').replaceAll('{B}',b?.name||'직원 B').replaceAll('{ACTOR}',actor?.name||'직원');}
  function forceEventSkill(person,id,partnerId=null){
    if(!person||!D.TRAITS[id])return false;g.normalizeCrewSkills(person);person.eventSkill=id;person.eventTraits=[id];person.traits=[...new Set([...person.starTraits,id,...(person.captain?['fieldCaptain']:[])])];
    if(partnerId)person.eventRelation={type:id,partnerId};else delete person.eventRelation;
    g.recordEncounter?.('skills',id);g.playSound?.('upgrade');return true;
  }
  function setPairRelation(id){const [a,b]=pairMembers();if(!a||!b)return false;forceEventSkill(a,id,b.id);forceEventSkill(b,id,a.id);log(`${a.name} · ${D.TRAITS[id].name}`,1);log(`${b.name} · ${D.TRAITS[id].name}`,1);return true;}
  function removeEquipmentById(id){
    for(const car of g.state.cars){for(let i=0;i<car.equipment.length;i++){const eq=car.equipment[i];if(eq.id===id){car.equipment.splice(i,1);return eq;}if(eq.aux?.id===id){const aux=eq.aux;eq.aux=null;return aux;}}}return null;
  }
  function rewardText(raw={}){return Object.entries(raw).flatMap(([k,v])=>{const range=Array.isArray(v)?v.join('~'):v;if(['money','scrap','relics'].includes(k))return `${labels[k]} +${range}`;if(k==='stationVisit')return '정비 스테이션 이용 가능';if(k==='distance')return `거리 ${v>=0?'+':''}${v} km`;if(k==='skillReward')return `이벤트 스킬 ${Array.isArray(v.pool)&&v.pool.length===1?'전용 1개':v.count===1?'무작위 1개':v.count+'개 후보 중 선택'}`;if(k==='moneyLoss')return `돈 −${range}`;if(k==='crewDamage')return `직원 ${raw.crewCount||1}명 HP −${range}`;if(k==='carDamage')return `${raw.carCount==='all'?'모든':raw.carCount||1} 객차 HP −${range}`;if(k==='actorDamage')return `출전 직원 HP −${range}`;if(k==='engineDamage')return `기관실 HP −${range}`;if(k==='temporaryEngine')return `다음 전투 엔진 속도 ${fmt((v-1)*100)}%`;if(k==='disableGear')return '무작위 장비 1개 다음 전투 정지';if(k==='gear'||k==='possibleRareGear')return '장비 획득 가능';if(k==='candidates'||k==='medicalRescue'||k==='possibleCandidate')return '직원 후보 확인';if(k==='shop')return '거래 창 열기';if(k==='survivorSupplies')return '돈 +20~40 또는 고철 +15~25';if(k==='firstUpgrade')return '무료 1차 포탑 강화 (Lv.1 → 2) 1회';if(k==='voucher')return '무료 포탑 강화 1회';if(k==='labReward')return '잔해 5 / 희귀 모듈 / 무료 1차 강화 중 하나';if(k==='buff')return '이번 런 무작위 성능 개선';if(k==='debuff')return '이번 런 무작위 성능 감소';if(k==='repairRatio')return `모든 객차 최대 HP의 +${v*100}%`;if(k==='healRatio')return `모든 직원 최대 HP의 +${v*100}% (만피 직원은 소량 XP)`;if(k==='forceEventSkill')return `선택 직원 이벤트 스킬 → ${D.TRAITS[v]?.name||v}`;if(k==='allCarMaxHpDamage')return `모든 객차 최대 HP의 −${v*100}%`;if(k==='allCrewDamage')return `모든 직원 HP −${v}`;if(k==='blackoutNext')return '다음 전투 랜덤 객차 1칸 암전 가능';if(k==='destroyNonEngineCar')return '랜덤 비기관실 객차 1칸 파괴';if(k==='engineDebuffBattles')return `다음 ${v}전투 엔진 속도 감소`;if(k==='pairDamage')return `두 직원 HP −${v}`;if(k==='pairRelation')return `두 직원 이벤트 스킬 → ${D.TRAITS[v]?.name||v}`;if(k==='pairBreakup')return '두 직원 Lv.−1 · 각각 무작위 능력치 −1';if(k==='forceEliteNext')return '다음 일반 전투 → 정예 전투';if(k==='ancientCoreBoost')return `이번 런 고대 장비 효율 ×${v}`;if(k==='coreRiskBattles')return `다음 ${v}전투 객차 받는 피해 증가`;if(k==='breakAncientGear')return '무작위 고대 장비 1개 파손';if(k==='enginePowerCapLoss')return `이번 런 기관실 최대 출력 −${v}`;return [];}).join(' · ');}
  function hints(){return(ev().analysis||[]).filter(a=>trait(a.trait)).map(a=>`<p class="event-hint">${esc(trait(a.trait).name)}의 분석: ${esc(a.texts[outcomeIndex(definition(a.choice))])} · 분석 비용 없음</p>`).join('');}
  function dispatchStaff(c){return staff().filter(s=>(!c.excludePatient||s.id!==session.patient09)&&(!c.condition?.trait||s.traits.includes(c.condition.trait))&&(!c.condition?.stat||g.effectiveStat(s,c.condition.stat)>=c.condition.min));}
  function rewardHTML(raw){return rewardText(raw).split(' · ').filter(Boolean).map(t=>`<span class="${/−| -|감소|정지/.test(t)?'negative':'positive'}">${esc(t)}</span>`).join(' · ');}
  function shell(title,text){g.mode='event';g.state.speed=0;const m=g.modalShell(title,'황무지 사건',text);m.classList.add('event-modal');m.querySelector('.close-btn')?.remove();return m.querySelector('.dialog-body');}
  function button(body,label,callback,disabled=false){const b=document.createElement('button');b.className='choice-card'+(disabled?' unaffordable':'');b.innerHTML=label;b.onclick=()=>{if(disabled){g.toast('자원 또는 조건이 부족합니다.');return;}callback();};body.append(b);return b;}
  function log(label,amount,unit='',tone=null){session.logs.push({label,amount,unit,tone});}
  function numeric(key,delta){delta=g.metaGain?.(key,delta)??delta;const old=g.state[key],max=key==='titanDistance'?B.run.maxTitanDistance:Infinity;g.state[key]=clamp(old+delta,0,max);log(key==='titanDistance'?'타이탄 거리':labels[key],g.state[key]-old,key==='titanDistance'?' km':'');}
  function health(target,amount,label='HP'){if(!target)return;const old=target.hp,ci=g.state.cars.indexOf(target);if(ci>=0&&amount<0)amount=-(g.preventHullDestruction09?.(ci,-amount)??-amount);target.hp=clamp(old+amount,0,target.maxHp);log(`${target.name} ${label}`,target.hp-old);}
  function apply(r,actor){
    if(r.part09)applyPart09(r,actor);
    for(const k of ['money','scrap','relics'])if(r[k])numeric(k,r[k]);if(r.moneyLoss)numeric('money',-r.moneyLoss);if(r.distance)numeric('titanDistance',r.distance<0?r.distance*eventDistanceFactor():r.distance);
    if(r.carDamage)for(const id of r.carIds)health(g.state.cars.find(c=>c.id===id),-r.carDamage);
    if(r.crewDamage)for(const id of r.crewIds)health(g.state.crew.find(c=>c.id===id),-r.crewDamage);
    if(r.actorDamage)health(actor,-r.actorDamage);if(r.engineDamage)health(g.state.cars[0],-r.engineDamage);
    if(r.repairRatio)for(const c of g.state.cars)health(c,c.maxHp*r.repairRatio);
    if(r.healRatio||r.healCrew)for(const c of g.state.crew.filter(c=>!c.dead)){if(c.hp>=c.maxHp&&c.level<P.crew.maxLevel){const xp=g.grantCrewXp(c,P.crew.fullHealXp,rng(`${session.seed}-${session.selected}-${c.id}-healing`));log(`${c.name} 경험치`,xp);}else health(c,r.healCrew||c.maxHp*r.healRatio);}
    if(r.temporaryEngine){g.state.eventNextCombat??={};g.state.eventNextCombat.engine=(g.state.eventNextCombat.engine||1)*r.temporaryEngine;log('다음 전투 엔진 속도',(r.temporaryEngine-1)*100,'%');}
    if(r.disabledId){g.state.eventNextCombat??={};g.state.eventNextCombat.disabled??=[];g.state.eventNextCombat.disabled.push(r.disabledId);const e=g.findEquipment(r.disabledId);log(`${(e.kind==='turret'?D.TURRETS:D.MODULES)[e.type].name} 다음 전투 정지`,null,'','negative');}
    if(r.effect){const [k,v]=r.effect;if(k==='hull'){const c=g.state.cars.find(c=>c.id===r.carIds[0]),old=c.maxHp;c.maxHp*=v;log(`${c.name} 최대 HP`,c.maxHp-old);health(c,0);}else{g.state.eventModifiers??={};g.state.eventModifiers[k]=(g.state.eventModifiers[k]||1)*v;log(`이번 런 ${labels[k]}`,(v-1)*100,'%');}}
    if(r.firstUpgrade){g.state.eventFirstUpgradeCredits=(g.state.eventFirstUpgradeCredits||0)+r.firstUpgrade;log('무료 1차 포탑 강화권 (Lv.1 → 2)',r.firstUpgrade);}
    if(r.voucher){g.state.eventUpgradeCredits=(g.state.eventUpgradeCredits||0)+r.voucher;log('무료 포탑 강화권',r.voucher);}
    if(r.forceEventSkill&&actor&&forceEventSkill(actor,r.forceEventSkill)){log(`${actor.name} · ${D.TRAITS[r.forceEventSkill].name}`,1);}
    if(r.pairRelation)setPairRelation(r.pairRelation);
    if(r.pairDamage)for(const person of pairMembers())health(person,-r.pairDamage);
    if(r.pairBreakup){for(const person of pairMembers()){const keys=Object.keys(person.stats||{}),rr=rng(`${session.seed}-${session.selected}-${person.id}-breakup`),key=pick(rr,keys);if(key){const old=person.stats[key];person.stats[key]=Math.max(1,old-1);if(person.training?.[key]>0)person.training[key]=Math.max(0,person.training[key]-Math.min(1,old-person.stats[key]));log(`${person.name} ${labels[key]}`,person.stats[key]-old);}const lv=person.level||1;person.level=Math.max(1,lv-1);person.xp=0;log(`${person.name} 레벨`,person.level-lv);}}
    if(r.allCrewDamage)for(const person of g.state.crew.filter(c=>!c.dead&&c.hp>0))health(person,-r.allCrewDamage);
    if(r.allCarMaxHpDamage){for(const car of g.state.cars){const old=car.hp;car.hp=Math.max(0,car.hp-car.maxHp*r.allCarMaxHpDamage);if(car.hp<=0)car.destroyed=true;log(`${car.name} HP`,car.hp-old);}g.normalizeCarElectrical09?.();}
    if(r.blackoutNext&&r.targetCarId){g.state.eventNextCombat??={};g.state.eventNextCombat.blackoutCarId=r.targetCarId;const car=g.state.cars.find(c=>c.id===r.targetCarId);log(`${car?.name||'객차'} 다음 전투 암전`,null,'','negative');}
    if(r.destroyNonEngineCar&&r.targetCarId){const car=g.state.cars.find(c=>c.id===r.targetCarId);if(car){const old=car.hp;car.hp=0;car.destroyed=true;g.clearCarElectrical09?.(car);log(`${car.name} 파괴`,-old,'','negative');if(r.targetEquipmentId){g.state.eventNextCombat??={};g.state.eventNextCombat.disabled??=[];g.state.eventNextCombat.disabled.push(r.targetEquipmentId);const eq=g.findEquipment(r.targetEquipmentId);if(eq)log(`${(eq.kind==='turret'?D.TURRETS:D.MODULES)[eq.type].name} · 다음 전투 고장`,null,'','negative');}}}
    if(r.engineDebuffBattles){g.state.eventEngineDebuff={battles:Math.max(g.state.eventEngineDebuff?.battles||0,r.engineDebuffBattles),mult:r.engineDebuff||.85};log(`엔진 출력 저하 · ${r.engineDebuffBattles}전투`,Math.round(((r.engineDebuff||.85)-1)*100),'%','negative');}
    if(r.forceEliteNext){g.state.eventForceEliteNext=true;log('다음 일반 전투 · 정예 확정',null,'','negative');}
    if(r.ancientCoreBoost){g.state.eventAncientBoost=Math.max(g.state.eventAncientBoost||1,r.ancientCoreBoost);log('고대 장비 효율',Math.round((g.state.eventAncientBoost-1)*100),'%','positive');}
    if(r.coreRiskBattles){g.state.eventCoreRiskBattles=Math.max(g.state.eventCoreRiskBattles||0,r.coreRiskBattles);g.state.eventCoreRiskDamage=r.coreRiskDamage||1.15;log(`보호계통 불안정 · ${r.coreRiskBattles}전투`,Math.round((g.state.eventCoreRiskDamage-1)*100),'%','negative');}
    if(r.breakAncientGear&&r.targetAncientId){const broken=removeEquipmentById(r.targetAncientId);if(broken){const def=(broken.kind==='turret'?D.TURRETS:D.MODULES)[broken.type];log(`${def?.name||'고대 장비'} 파손`,-1,'','negative');g.rebalancePower?.();}}
    if(r.enginePowerCapLoss){g.state.eventEnginePowerCapPenalty=(g.state.eventEnginePowerCapPenalty||0)+r.enginePowerCapLoss;g.rebalancePower?.();log('기관실 최대 출력',-r.enginePowerCapLoss,'','negative');}
    if(actor&&(r.skillOrder||r.talentOrder)){g.normalizeCrewSkills(actor);const ids=(r.skillOrder||r.talentOrder).filter(id=>D.TRAITS[id]?.canBeEventSkill&&!actor.traits.includes(id)).slice(0,r.skillReward?.count||1);if(ids.length)session.pending.push({kind:'skill',actor:actor.id,ids});else log('새롭게 배울 수 있는 스킬 없음',0);}
    if(r.stationStock)session.stationStock=copy(r.stationStock);
    if(r.people)session.pending.push({kind:'crew',candidates:r.people});if(r.equipment)session.pending.push({kind:'equipment',equipment:r.equipment});if(r.offers)session.shop={offers:r.offers,bought:[]};
    if(r.routeInfo){const act=D.ACTS[g.state.actId],next=act.stages[g.state.stageIndex+1];session.info=next?`다음 구간: ${next.title||({battle:'일반 교전',elite:'정예 교전',station:'정비 스테이션',event:'이벤트',branch:'갈림길'}[next.node])}${next.options?' ('+next.options.join(' / ')+')':''}`:`다음 상대: ${D.BOSSES[act.boss].name}. ${act.boss==='arachne'?'다리를 파괴하면 객차 포획이 해제됩니다.':'포탑 부위가 남아 있으면 강력한 공격을 받습니다.'}`;}
  }
  function applyPart09(r,actor){
    const tuning=UPDATE09.events,roll=r.part09Roll;
    if(r.part09==='generator'){
      const probability=clamp(tuning.generatorBase+Math.max(0,g.effectiveStat(actor,'repair'))*tuning.generatorPerRepair,.6,.95);
      const delta=roll<probability*tuning.generatorGreat?1:roll<probability?0:-1;
      const old=g.state.powerCapacityBonus||0,min=-(B.train.enginePower.start+(g.state.cars.length-1)*B.train.baseCarPower-B.train.enginePower.min);
      g.state.powerCapacityBonus=Math.max(min,old+delta);g.rebalancePower();log(`${delta>0?'대성공':delta<0?'실패':'성공'} · 최대 전력 공급`,g.state.powerCapacityBonus-old);return;
    }
    if(r.part09==='engineers'&&roll<tuning.engineerDemand){
      if(g.state.scrap>=tuning.engineerScrap)numeric('scrap',-tuning.engineerScrap);
      else session.pending.push({kind:'surrenderTurret'});return;
    }
    if(['memoryTreat','memoryWait'].includes(r.part09)){
      const patient=g.state.crew.find(c=>c.id===session.patient09);if(!patient)return;
      const treat=r.part09==='memoryTreat',healer=treat?actor:patient;
      const probability=clamp((treat?tuning.memoryBase:tuning.memoryWaitBase)+Math.max(0,g.effectiveStat(healer,'recovery'))*tuning.memoryPerRecovery,0,treat?.92:.98);
      const great=treat&&roll<probability*tuning.memoryGreat,failed=roll>=probability;
      if(!great&&!failed){log(`${patient.name} 기억 회복 · 변화 없음`,0);return;}
      const lost=Math.max(0,(patient.level||1)-1);
      if(failed){
        // Unspent level points count first; never remove more points than the lost levels.
        let count=Math.max(0,lost-(patient.pendingStats||0));
        const tracked=Array.isArray(patient.levelGrowth09),order=tracked?patient.levelGrowth09:[];
        // Legacy saves have aggregate training only: preserve the total birth-star bonus.
        if(!tracked){const trained=Object.values(patient.training||{}).reduce((n,v)=>n+(Number(v)||0),0),birth=P.stars.statBonus[patient.birthStars||patient.stars||1]*P.crew.statGain;count=Math.min(count,Math.max(0,Math.floor((trained-birth)/P.crew.statGain)));}
        while(count-->0){const key=tracked?order.pop():Object.keys(patient.stats).sort((a,b)=>(patient.training?.[b]||0)-(patient.training?.[a]||0)).find(k=>(patient.training?.[k]||0)>0);if(!key)break;const amount=Math.min(P.crew.statGain,patient.training?.[key]||0,patient.stats[key]);patient.stats[key]-=amount;patient.training[key]-=amount;log(`${patient.name} ${labels[key]}`, -amount);}
      }
      patient.level=1;patient.xp=0;patient.pendingStats=0;patient.levelGrowth09=[];
      log(`${patient.name} ${great?'대성공 · 성급·현재 능력 유지':'기억 손실'} · Lv.1`,-lost);return;
    }
    if(r.part09==='eliteBattle')session.combat09=true;
  }
  function commit(c,actor){if(!['choices','dispatch'].includes(session?.phase)||!allowed(c)||!g.canPay(c.cost)||!canChoose09(c))return;
    if(actor)actor=g.state.crew.find(s=>s.id===actor.id);if(c.dispatch&&(!actor||!dispatchStaff(c).includes(actor)))return;
    actor??=c.condition?.trait?trait(c.condition.trait):c.condition?.stat?staff().find(s=>g.effectiveStat(s,c.condition.stat)>=c.condition.min):undefined;
    const accepted=transaction(()=>{session.selected=c.id;session.actor=actor?.id;session.logs=[];session.pending=[];for(const [k,v]of Object.entries(c.cost||{}))numeric(k,-v);numeric('titanDistance',-eventTimeCost(c));
    const prepared=session.prepared[c.id];apply(prepared.common,actor);let result=c;
    session.chosenOutcome=-1;if(c.outcomes){const index=outcomeIndex(c,actor);session.chosenOutcome=index;result=c.outcomes[index];apply(prepared.outcomes[index],actor);}
    if(c.avoidTrap&&outcomeIndex(definition(c.avoidTrap))!==0){session.pending=[];session.info='의무병이 함정을 간파했습니다. 직원 피해 없이 철수했습니다.';}
    session.title=formatEventText(result.title||c.label,actor);const resultText=formatEventText(result.text||`${c.label}.`,actor);session.text=(actor&&!resultText.includes(actor.name)?`${actor.name}이(가) 작업을 맡았다. `:'')+resultText;session.phase='result';});if(accepted)g.recordEventResult?.(session.eventId,c.id,session.chosenOutcome);}
  function commitTurretChoice(c,eq){if(session?.phase!=='selectTurret'||!eq||eq.kind!=='turret')return;const accepted=transaction(()=>{session.logs=[];session.pending=[];for(const[k,v]of Object.entries(c.cost||{}))numeric(k,-v);numeric('titanDistance',-eventTimeCost(c));if(eq.type==='gatling'){numeric('money',120);session.title='멋진 개틀링이군!';session.text='남자는 총열과 급탄장치를 한참 살펴보더니 만족스럽게 웃었다. “멋진 개틀링이군. 관람료라네.”';}else{const oldName=D.TURRETS[eq.type]?.name||'포탑';eq.type='gatling';eq.level=1;eq.branch=false;eq.weaponBranches={};eq.heat=0;eq.overheated=false;eq.cooldown=0;log(`${oldName} → 개틀링 Lv.1`,null,'','negative');session.title='하나도 멋지지 않아!';session.text='남자는 포탑을 보자마자 얼굴을 찌푸렸다. “하나도 멋지지 않아! 내가 멋있는 아이를 하나 설치해 주지!” 정신을 차렸을 때 그 자리에는 1레벨 개틀링이 달려 있었다.';}session.selected=c.id;session.chosenOutcome=-1;session.phase='result';g.rebalancePower?.();});if(accepted)g.recordEventResult?.(session.eventId,c.id,-1);}
  function logsHTML(){const distance=session.logs.filter(x=>x.label==='타이탄 거리').reduce((n,x)=>n+x.amount,0);return '<ul class="event-results">'+session.logs.map(x=>`<li class="${x.tone||(x.amount>0?'positive':x.amount<0?'negative':'')}">${esc(x.label)} <b>${x.amount===null?'':`${x.amount>0?'+':''}${fmt(x.amount)}${x.unit||''}`}</b></li>`).join('')+`</ul><p>이번 정산 거리 변화 <b class="${distance>0?'positive':distance<0?'negative':''}">${distance>0?'+':''}${fmt(distance)} km</b> · 현재 ${fmt(g.state.titanDistance)} km</p>`;}
  function capacity(kind,ci){return kind==='crew'?g.state.crew.filter(c=>c.car===ci||c.moving?.to===ci).length<g.crewCapacity(ci):g.state.cars[ci].equipment.length<g.equipmentCapacity(ci);}
  function canChoose09(c){if(c.selectTurret&&!g.state.cars.some(car=>car.equipment.some(eq=>eq.kind==='turret')))return false;return !c.requiresTurretOrScrap||g.state.scrap>=c.requiresTurretOrScrap||g.state.cars.some(car=>car.equipment.some(eq=>eq.kind==='turret'));}
  function nextReward(){transaction(()=>{session.phase=session.pending.length?(session.pending[0].kind==='surrenderTurret'?'surrenderTurret':session.pending[0].kind==='skill'?'skill':session.pending[0].kind==='crew'?'candidate':'placement'):session.shop?'shop':'finish';});}
  function placement(){
    g.mode='event-placement';g.state.speed=0;$('#overlay').classList.remove('show');document.body.classList.add('event-placement');g.renderCars();const reward=session.pending[0];
    if(!reward){nextReward();return;}const valid=g.state.cars.map((_,i)=>i).filter(i=>capacity(reward.kind,i));
    const bar=document.createElement('section');bar.id='event-placement-panel';bar.innerHTML=`<b>${esc(reward.kind==='crew'?reward.person.name:(reward.equipment.kind==='turret'?D.TURRETS:D.MODULES)[reward.equipment.type].name)} 배치</b><p>${valid.length?'녹색 빈자리를 클릭하세요. 시간은 흐르지 않습니다.':'빈자리가 없습니다. 기존 장비·직원은 교체하거나 삭제하지 않습니다.'}</p>`;
    button(bar,valid.length?'보상 포기 · 다른 보상은 유지':'빈자리 없음 확인 · 다른 보상은 유지',()=>transaction(()=>{session.title=reward.kind==='crew'?'자리가 없다':'장비를 실을 공간이 없다';session.text=reward.kind==='crew'?'함께 가고 싶어 하는 사람과 짧게 인사를 나눈 뒤 다시 길을 떠났다.':'회수한 장비를 남겨두고 떠났다. 이미 확보한 다른 보상은 유지된다.';session.logs.push({label:'배치하지 않은 보상은 소멸했습니다',amount:0});session.pending.shift();session.phase='receipt';}));document.body.append(bar);
    for(const ci of valid){const car=$(`[data-car-index="${ci}"]`);car?.classList.add('placement-target');car?.querySelectorAll(reward.kind==='crew'?'.empty-crew':'.empty-equipment').forEach(el=>{el.classList.add('event-slot');el.disabled=false;el.setAttribute('role','button');el.tabIndex=0;el.dataset.eventSlot=ci;});}
  }
  function render(){
    $('#event-placement-panel')?.remove();document.body.classList.remove('event-placement');$('#train-cars')._markup=null;g.renderCars();if(!session)return;
    if(session.phase==='leaving'){leave();return;}if(session.phase==='placement'){placement();return;}
    const body=shell(session.phase==='choices'?formatEventText(ev().title):session.title||ev().title,session.phase==='choices'?formatEventText(ev().text):session.text||'정보를 확인하는 동안 시간은 흐르지 않습니다.');
    if(session.phase==='choices'){
      body.innerHTML=hints();
      if(session.patient09)body.innerHTML+=`<p>기억 손상 직원: ${esc(g.state.crew.find(c=>c.id===session.patient09)?.name)}</p>`;
      for(const c of ev().choices.filter(allowed)){const maybe=[c.reward,...(c.outcomes||[]).map(o=>o.reward)],noGear=maybe.some(r=>r.gear||r.possibleRareGear||r.labReward)&&!g.state.cars.some((_,i)=>capacity('equipment',i));button(body,`<div><b>${esc(c.label)}${c.dispatch?' · 직원 선택':''}${c.selectTurret?' · 포탑 선택':''}</b><p class="${eventTimeCost(c)||Object.keys(c.cost||{}).length?'negative':''}">${costText(c)}</p><p>${c.reward.part09?'결과는 담당 직원의 능력과 사건 설명을 확인하세요.':chanceText(c)}</p><p>${rewardHTML(c.reward)}</p>${noGear?'<p class="negative">장비 빈자리 없음</p>':''}${!canChoose09(c)?'<p>이 선택을 실행할 대상 또는 자원이 없습니다.</p>':''}</div>`,()=>c.dispatch?transaction(()=>{session.phase='dispatch';session.selected=c.id;}):c.selectTurret?transaction(()=>{session.phase='selectTurret';session.selected=c.id;}):commit(c),!g.canPay(c.cost)||!canChoose09(c)||(c.dispatch&&!dispatchStaff(c).length));}
    }else if(session.phase==='selectTurret'){
      const c=definition(session.selected);body.innerHTML='<p>미치광이에게 보여줄 포탑 하나를 선택하세요. 선택한 포탑이 개틀링이 아니라면 되돌릴 수 없습니다.</p>';
      for(const [ci,car]of g.state.cars.entries())for(const eq of car.equipment.filter(e=>e.kind==='turret'))button(body,`${esc(car.name)} · ${esc(D.TURRETS[eq.type].name)} Lv.${eq.level}`,()=>commitTurretChoice(c,eq));
      button(body,'선택지로 돌아가기 · 비용 없음',()=>transaction(()=>session.phase='choices'));
    }else if(session.phase==='surrenderTurret'){
      body.innerHTML='<p>수리 대금이 부족합니다. 넘길 포탑 하나를 직접 선택하세요.</p>';
      for(const car of g.state.cars)for(const eq of car.equipment.filter(e=>e.kind==='turret'))button(body,`${esc(car.name)} · ${esc(D.TURRETS[eq.type].name)} Lv.${eq.level} 넘기기`,()=>transaction(()=>{if(session.phase!=='surrenderTurret'||!car.equipment.includes(eq))return;car.equipment.splice(car.equipment.indexOf(eq),1);log(`${D.TURRETS[eq.type].name} 지불`,-1);session.pending.shift();session.phase='receipt';g.rebalancePower();}));
    }else if(session.phase==='dispatch'){
      const c=definition(session.selected);body.innerHTML='<p>파견할 직원을 고르세요.</p>';
      for(const person of dispatchStaff(c)){const article=document.createElement('article');article.className='event-person';article.innerHTML=g.crewHTML(person,true);button(article,`파견 확정: ${esc(person.name)} · ${chanceText(c,person)}<br>${costText(c)}`,()=>commit(c,person));body.append(article);}button(body,'선택지로 돌아가기 · 비용 없음',()=>transaction(()=>session.phase='choices'));
    }else if(['result','receipt'].includes(session.phase)){
      body.innerHTML=logsHTML()+(session.info?`<p class="event-hint">${esc(session.info)}</p>`:'')+session.pending.filter(p=>p.kind==='equipment').map(p=>'<details><summary>획득 장비 상세 정보 (클릭)</summary>'+gearDetails(p.equipment)+'</details>').join('');button(body,'보상 확인 계속 →',nextReward);
    }else if(session.phase==='skill'||session.phase==='skillReplace'){
      const reward=session.pending[0],actor=g.state.crew.find(c=>c.id===reward?.actor);if(!actor){button(body,'대상 없음 · 계속',()=>transaction(()=>{session.pending.shift();session.phase='receipt';}));return;}
      body.innerHTML='<h3>'+esc(actor.name)+' · 이벤트 스킬</h3>'+(actor.eventSkill?'<p>기존 스킬</p>'+g.skillDetailsHTML(actor.eventSkill):'<p>빈 이벤트 슬롯에 배웁니다.</p>');
      const finish=id=>transaction(()=>{if(id&&g.setEventSkill(actor,id))log(actor.name+' · '+D.TRAITS[id].name,1);session.pending.shift();session.phase='receipt';});
      if(session.phase==='skillReplace'){body.innerHTML+='<p>새 스킬로 교체하시겠습니까?</p>'+g.skillDetailsHTML(session.skillChoice);button(body,'기존 스킬 유지',()=>finish(null));button(body,'새 스킬로 교체',()=>finish(session.skillChoice));}
      else {for(const id of reward.ids){g.recordEncounter?.('skills',id);const card=document.createElement('article');card.className='event-person';card.innerHTML=g.skillDetailsHTML(id);button(card,esc(D.TRAITS[id].name)+' 선택',()=>actor.eventSkill?transaction(()=>{session.skillChoice=id;session.phase='skillReplace';}):finish(id));body.append(card);}button(body,'배우지 않고 기존 상태 유지',()=>finish(null));}
    }else if(session.phase==='candidate'){
      body.innerHTML='<p>동행할 직원 한 명을 고르세요.</p>';const reward=session.pending[0];
      for(const person of reward.candidates){const a=document.createElement('article');a.className='event-person';a.innerHTML=g.crewHTML(person,false)+`<p>HP ${person.hp} / ${person.maxHp}</p>`;button(a,`${esc(person.name)} 선택 후 빈자리 지정`,()=>transaction(()=>{reward.person=person;session.phase='placement';}));body.append(a);}
      button(body,'영입하지 않는다 · 다른 보상은 유지',()=>transaction(()=>{session.pending.shift();session.phase='receipt';}));
    }else if(session.phase==='shop'){
      body.innerHTML=`<p>돈 ${Math.floor(g.state.money)} · 고철 ${Math.floor(g.state.scrap)} · 고대 잔해 ${g.state.relics}</p>`;
      session.shop.offers.forEach((offer,i)=>{const a=document.createElement('article');a.className='event-person';a.innerHTML=`<h3>${esc(offer.label)}</h3><p>${Object.entries(offer.cost).map(([k,v])=>`${labels[k]} ${v}`).join(' · ')||'무료'}</p>`;if(offer.reward.equipment){const details=document.createElement('details');details.innerHTML='<summary>장비 상세 정보 (클릭)</summary>'+gearDetails(offer.reward.equipment);a.append(details);}button(a,session.shop.bought.includes(i)?'거래 완료':'거래 확정',()=>transaction(()=>{if(session.phase!=='shop'||session.shop.bought.includes(i)||!g.canPay(offer.cost))return;session.logs=[];for(const[k,v]of Object.entries(offer.cost))numeric(k,-v);apply(offer.reward);session.shop.bought.push(i);session.title='거래 완료';session.text='약속한 물자를 교환했다. 추가 시간 비용은 없다.';session.phase='receipt';}),session.shop.bought.includes(i)||!g.canPay(offer.cost));body.append(a);});
      button(body,'거래 종료 · 추가 비용 없음',()=>transaction(()=>{session.shop=null;session.phase='finish';}));
    }else if(session.phase==='finish'){body.innerHTML=logsHTML();button(body,session.stationStock?'정비소에 진입 →':'출발 →',()=>transaction(()=>session.phase='leaving'));}
  }
  function place(ci){const reward=session?.pending[0];if(session?.phase!=='placement'||!reward||!capacity(reward.kind,ci))return;transaction(()=>{if(reward.kind==='crew'){reward.person.car=ci;g.state.crew.push(reward.person);log(`${reward.person.name} 영입 · ${g.state.cars[ci].name}`,1);}else{g.state.cars[ci].equipment.push(reward.equipment);log(`${(reward.equipment.kind==='turret'?D.TURRETS:D.MODULES)[reward.equipment.type].name} 장착 · ${g.state.cars[ci].name}`,1);}session.pending.shift();session.phase='receipt';});g.playSound('upgrade');}
  $('#train-cars').addEventListener('click',e=>{if(g.mode!=='event-placement')return;e.stopImmediatePropagation();const el=e.target.closest('[data-event-slot]');if(el)place(Number(el.dataset.eventSlot));},true);
  $('#train-cars').addEventListener('keydown',e=>{if(g.mode==='event-placement'&&['Enter',' '].includes(e.key)&&e.target.matches('[data-event-slot]')){e.preventDefault();place(Number(e.target.dataset.eventSlot));}},true);
  function leave(){if(g.state.titanDistance<=0){session=null;clearSave();g.gameOver('이벤트에 시간을 쓰는 동안 타이탄이 열차를 따라잡았습니다.');return;}const stock=session.stationStock,combat09=session.combat09,eventId=session.eventId;session=null;g.state.eventDeparture=true;g.closeOverlay();if(combat09){if(eventId==='elite_encounter')window.LAST_RAIL_EVENT_VISUALS?.reset?.();g.mode='run';g.startBattle('elite',{title:eventId==='elite_encounter'?'무법자 캠프':'정예 전투'});return;}if(stock){g.stationOffers={...stock,bought:new Set(stock.bought||[])};g.stationStage=g.state.stageIndex;g.stationTab='gear';g.mode='run';g.showStation();}else g.advanceStage();}
  g.availableEvents=function(){const act=Number(this.state.actId.slice(3))||1;return C.events.filter(e=>e.crewGrowth?e.act<=act:(Array.isArray(e.acts)?e.acts.some(a=>a<=act):e.act<=act));};
  D.EVENTS=C.events;
  g.resolveEventChoice=function(choice){const c=session&&definition(choice.id);if(c)commit(c);};
  g.showEvent=function(){
    if(session){try{save();render();}catch{g.toast('브라우저 저장 공간을 확보한 뒤 다시 시도해 주세요.');}return;}A.cancelSelection();g.state.speed=0;g.mode='event';const seed=newSeed(),r=rng(seed),history=g.state.eventHistory||[],currentAct=Number(g.state.actId.slice(3))||1;let act=currentAct===3?3:g.state.actId==='act2'&&r()<C.act2Weight?2:1;
    const eligible=C.events.filter(e=>eventEligible(e,act,currentAct)),growth=eligible.filter(e=>e.crewGrowth&&!history.slice(-CREW_SKILLS_CONFIG.history).includes(e.id)),normal=eligible.filter(e=>!e.crewGrowth),all=growth.length&&r()<CREW_SKILLS_CONFIG.eventWeight?growth:normal,fresh=all.filter(e=>!history.slice(-C.historyLength).includes(e.id)),pool=fresh.length?fresh:all,event=pool[weighted(r,pool.map(e=>e.weight||1))];
    if(event.rareStation)g.state.unexpectedStationSeen=true;
    session={seed,eventId:event.id,phase:'choices',prepared:{},logs:[],pending:[],before:copy(g.state)};
    if(event.id==='memory_damage')session.patient09=pick(r,staff())?.id;
    if(event.pairEvent)session.pairIds=shuffled(r,staff()).slice(0,2).map(c=>c.id);
    for(const c of event.choices){const cr=rng(seed+c.id);session.prepared[c.id]={roll:cr(),weightedIndex:c.outcomes?weighted(cr,c.outcomes.map(o=>o.weight)):0,common:prepareReward(c.reward,`${seed}-${c.id}-common`),outcomes:(c.outcomes||[]).map((o,i)=>prepareReward(o.reward,`${seed}-${c.id}-${i}`))};}
    g.state.eventHistory=[...history,event.id].slice(-C.historyLength);g.checkpointEventReady?.();try{save();g.recordEncounter?.('events',event.id);render();}catch{const body=shell('이벤트 저장 불가','확률과 보상을 고정하려면 브라우저 저장 공간이 필요합니다.');button(body,'저장 다시 시도',()=>g.showEvent());}
  };
  const oldDeparture=g.departureDistance.bind(g);g.departureDistance=function(){return this.state?.eventDeparture?0:oldDeparture();};
  const oldEnter=g.enterNode.bind(g);g.enterNode=function(...args){if(this.state?.eventDeparture){delete this.state.eventDeparture;clearSave();}return oldEnter(...args);};
  const oldMenu=g.showMainMenu.bind(g);g.showMainMenu=function(...args){oldMenu(...args);if(readSave()){$('#event-resume')?.remove();const b=document.createElement('button');b.id='event-resume';b.className='secondary-btn';b.textContent='저장된 이벤트 이어하기';b.onclick=()=>{const saved=readSave();if(!saved)return;g.state=saved.state;session=saved.session;g.restoreMetaRun?.();g.preferredSpeed=saved.preferredSpeed||1;g.mode='event';g.state.speed=0;g.renderAll();render();};$('#new-run-btn')?.after(b);}};
  for(const name of ['newRun','gameOver','showEnding']){const old=g[name].bind(g);g[name]=function(...args){session=null;clearSave();$('#event-placement-panel')?.remove();document.body.classList.remove('event-placement');return old(...args);};}
  const modifier=k=>g.state?.eventModifiers?.[k]||1;
  const blackoutIndex=()=>{const id=g.state?.eventCombat?.blackoutCarId;return id?g.state.cars.findIndex(c=>c.id===id):-1;};
  const renderCars=g.renderCars.bind(g);g.renderCars=function(){renderCars();const dark=blackoutIndex();if(this.mode==='battle'&&dark>=0){const car=$(`[data-car-index="${dark}"]`);if(car){car.classList.add('event-blackout-car');car.querySelectorAll('button,input,select,[tabindex]').forEach(el=>{el.tabIndex=-1;if('disabled'in el)el.disabled=true;});const cover=document.createElement('div');cover.className='event-blackout-cover';cover.innerHTML='<b>암전</b><span>조작 불가</span>';cover.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();this.toast('이 객차는 전력 배선 고장으로 앞이 보이지 않습니다.');});car.append(cover);}}
    if(session?.phase!=='placement'||this.mode!=='event-placement')return;const reward=session.pending[0];if(!reward)return;this.state.cars.forEach((_,ci)=>{if(!capacity(reward.kind,ci))return;const car=$(`[data-car-index="${ci}"]`);car?.classList.add('placement-target');car?.querySelectorAll(reward.kind==='crew'?'.empty-crew':'.empty-equipment').forEach(el=>{el.classList.add('event-slot');el.disabled=false;el.setAttribute('role','button');el.tabIndex=0;el.dataset.eventSlot=ci;});});};
  g.eventEquipmentDisabled=eq=>!!g.state?.eventCombat?.disabled?.includes(eq.id);
  const readout=g.turretReadout.bind(g);g.turretReadout=function(eq,ci){const r=readout(eq,ci);if(this.eventEquipmentDisabled(eq)){r.active=false;for(const row of r.rows)if(['1회 피해','이론 DPS'].includes(row[0]))row[2]=0;}return r;};
  const engine=g.trainDisruptionMultiplier.bind(g);g.trainDisruptionMultiplier=()=>engine()*modifier('engine')*(g.state?.eventCombat?.engine||1);
  const cool=g.turretCooling.bind(g);g.turretCooling=(...args)=>cool(...args)*modifier('cooling');
  const power=g.availableEnginePower.bind(g);g.availableEnginePower=function(){powerBudgetRead++;try{return power();}finally{powerBudgetRead--;}};
  const ancientEventFactor=eq=>((eq?.kind==='turret'?D.TURRETS:D.MODULES)[eq?.type]?.ancient?(g.state?.eventAncientBoost||1):1);
  const module=g.moduleData.bind(g);g.moduleData=function(eq){const m=module(eq),factor=!powerBudgetRead&&this.eventEquipmentDisabled(eq)?0:modifier('module'),ancient=ancientEventFactor(eq);for(const k of ['heatMult','coolingMult','stageHealMult','repairMult','ammoDamageMult'])if(k in m)m[k]=1+(m[k]-1)*factor*ancient;if('extraPower'in m)m.extraPower*=factor*ancient;return m;};
  const turretStatsEvent=g.turretStats.bind(g);g.turretStats=function(eq,ci,...args){const s=turretStatsEvent(eq,ci,...args),factor=ancientEventFactor(eq);if(factor>1)s.damage*=factor;return s;};
  const effect=g.moduleEffect.bind(g);g.moduleEffect=(ci,effectId,key)=>effect(ci,effectId,key)*(key==='repairMult'?modifier('repair'):key==='stageHealMult'?modifier('recovery'):1);
  const engineCap=()=>Math.max(B.train.enginePower.min,B.train.enginePower.max-(g.state?.eventEnginePowerCapPenalty||0));
  const rebalanceEvent=g.rebalancePower.bind(g);g.rebalancePower=function(...args){const r=rebalanceEvent(...args);if(this.state?.cars?.[0])this.state.cars[0].power=Math.min(this.state.cars[0].power,engineCap());return r;};
  for(const name of ['startBattle','startBoss']){const old=g[name].bind(g);g[name]=function(...args){if(name==='startBattle'&&this.state.eventForceEliteNext){args[0]='elite';args[1]={...(args[1]||{}),title:'역추적 신호 · 정예 습격'};delete this.state.eventForceEliteNext;}this.state.eventCombat={...(this.state.eventNextCombat||{})};delete this.state.eventNextCombat;if(this.state.eventEngineDebuff?.battles>0){this.state.eventCombat.engine=(this.state.eventCombat.engine||1)*this.state.eventEngineDebuff.mult;this.state.eventCombat.engineDebuff=true;}if((this.state.eventCoreRiskBattles||0)>0){this.state.eventCombat.coreDamageMult=this.state.eventCoreRiskDamage||1.15;this.state.eventCombat.coreRisk=true;}const r=old(...args);this.rebalancePower?.();return r;};}
  for(const name of ['battleClear','bossClear']){const old=g[name].bind(g);g[name]=function(...args){const combat=this.state?.eventCombat?{...this.state.eventCombat}:null;const r=old(...args);if(combat?.engineDebuff&&this.state?.eventEngineDebuff){this.state.eventEngineDebuff.battles--;if(this.state.eventEngineDebuff.battles<=0)delete this.state.eventEngineDebuff;}if(combat?.coreRisk){this.state.eventCoreRiskBattles=Math.max(0,(this.state.eventCoreRiskBattles||0)-1);if(!this.state.eventCoreRiskBattles)delete this.state.eventCoreRiskDamage;}delete this.state.eventCombat;return r;};}
  const moveEvent=g.moveCrew.bind(g);g.moveCrew=function(id,to,...args){const dark=blackoutIndex(),person=this.state?.crew.find(c=>c.id===id);if(dark>=0&&(to===dark||person?.car===dark)){this.toast('암전된 객차는 직접 조작할 수 없습니다.');return;}return moveEvent(id,to,...args);};
  const swapEvent=g.swapCrew?.bind(g);if(swapEvent)g.swapCrew=function(a,b,...args){const dark=blackoutIndex(),one=this.state?.crew.find(c=>c.id===a),two=this.state?.crew.find(c=>c.id===b);if(dark>=0&&(one?.car===dark||two?.car===dark)){this.toast('암전된 객차의 직원은 직접 조작할 수 없습니다.');return;}return swapEvent(a,b,...args);};
  const setPowerEvent=g.setCarPower.bind(g);g.setCarPower=function(ci,...args){if(blackoutIndex()===ci){this.toast('암전된 객차의 전력은 조작할 수 없습니다.');return;}return setPowerEvent(ci,...args);};
  const commandEvent=g.executeCommand.bind(g);g.executeCommand=function(ci,...args){if(blackoutIndex()===ci){this.toast('암전된 객차에는 직접 지휘를 지정할 수 없습니다.');return;}return commandEvent(ci,...args);};
  const armorEvent=g.executeArmor.bind(g);g.executeArmor=function(ci,...args){if(blackoutIndex()===ci){this.toast('암전된 객차에는 비상 장갑을 직접 지정할 수 없습니다.');return;}return armorEvent(ci,...args);};
  const plan=g.weaponUpgradePlan.bind(g);g.weaponUpgradePlan=function(eq){const p=plan(eq);if(p&&p.cost>0&&p.level===2&&!p.tier&&this.state?.eventFirstUpgradeCredits>0)return{...p,cost:0,eventCredit:true,eventCreditKey:'eventFirstUpgradeCredits'};return p&&p.cost>0&&this.state?.eventUpgradeCredits>0?{...p,cost:0,eventCredit:true,eventCreditKey:'eventUpgradeCredits'}:p;};
  const upgrade=g.upgradeEquipment.bind(g);g.upgradeEquipment=function(id,...args){const eq=this.findEquipment(id),plan=eq?.kind==='turret'?this.weaponUpgradePlan(eq):null,ok=upgrade(id,...args);if(ok&&plan?.eventCredit)this.state[plan.eventCreditKey||'eventUpgradeCredits']--;return ok;};
  const html=g.carEffectsHTML.bind(g);g.carEffectsHTML=function(ci){let extra=Object.entries(this.state.eventModifiers||{}).map(([k,v])=>`<p class="${v>=1?'positive':'negative'}">유적 · ${labels[k]} ×${fmt(v)}</p>`).join('')+this.state.cars[ci].equipment.filter(e=>this.eventEquipmentDisabled(e)).map(e=>`<p class="negative">${(e.kind==='turret'?D.TURRETS:D.MODULES)[e.type].name} · 이번 전투 정지</p>`).join('');if(this.state?.eventCombat?.blackoutCarId===this.state.cars[ci]?.id)extra+='<p class="negative">전구 고장 · 이번 전투 직접 조작 불가</p>';if(ci===0&&(this.state.eventEnginePowerCapPenalty||0)>0)extra+=`<p class="negative">예비 부품 부족 · 최대 출력 −${this.state.eventEnginePowerCapPenalty}</p>`;if((this.state.eventAncientBoost||1)>1&&this.state.cars[ci].equipment.some(e=>(e.kind==='turret'?D.TURRETS:D.MODULES)[e.type]?.ancient))extra+=`<p class="positive">고대 코어 공명 · 고대 장비 효율 ×${fmt(this.state.eventAncientBoost)}</p>`;return html(ci)+extra;};
  const details=g.showEquipmentDetails.bind(g);g.showEquipmentDetails=function(id){details(id);const eq=this.findEquipment(id);if(eq&&this.eventEquipmentDisabled(eq))this.moduleRange=null;};
  const howto=g.showHowTo.bind(g);g.showHowTo=function(){howto();$('.dialog-body').insertAdjacentHTML('beforeend','<h3>이벤트</h3><p>확정 버튼에 표시된 거리·자원을 한 번 지불합니다. 직원 비교와 보상 배치에는 시간이 들지 않습니다. 빈 슬롯을 직접 클릭하며 기존 장비·직원을 교체할 수 없습니다. 이벤트 도중 종료했다면 메뉴의 저장된 이벤트 이어하기로 돌아올 수 있습니다. 무료 포탑 강화권은 다음 유료 강화에 자동 사용하며, 분기는 정비소에서만 선택합니다.</p>');};
  const css=document.createElement('style');css.textContent='.event-modal{max-height:90dvh;overflow:auto;background:rgba(15,25,29,.9)}.event-modal .choice-card{width:100%;margin:8px 0}.event-person{border:1px solid #65746e;padding:16px;margin:12px 0;border-radius:10px}.event-results{padding:0;list-style:none}.event-results li{display:flex;justify-content:space-between;padding:7px;border-bottom:1px solid #ffffff18}.event-hint{border-left:3px solid #d7be74;padding:12px}.event-placement #event-placement-panel{position:fixed;z-index:80;top:20%;left:50%;transform:translateX(-50%);width:min(480px,90vw);padding:18px;background:#142322ed;border:1px solid #64d68b;border-radius:12px}.event-placement .event-slot{border:3px solid #69ef91!important;background:#32bd6855!important;cursor:pointer;pointer-events:auto}.event-placement #inspector,.event-placement .order-target-bar{display:none!important}.event-modal details>summary{cursor:pointer;padding:10px}.event-modal .positive{color:#72e997}.event-modal .negative{color:#ff7878}';document.head.append(css);
  if(g.mode==='menu')g.showMainMenu();
  css.textContent+='.event-placement #train-cars{z-index:90}.event-placement #event-placement-panel{top:12px;max-height:35dvh;overflow:auto;pointer-events:none}.event-placement #event-placement-panel button{pointer-events:auto}.event-modal .event-person .stat-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}.event-modal .choice-card>div{min-width:0;text-align:left}.event-modal .choice-card small{display:block;line-height:1.7}.event-modal details{margin:12px 0}.event-blackout-car{position:relative!important}.event-blackout-cover{position:absolute;inset:0;z-index:120;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;background:rgba(0,0,0,.94);border:2px solid #272727;color:#a9a9a9;pointer-events:auto;cursor:not-allowed;text-align:center;letter-spacing:.08em}.event-blackout-cover b{font-size:22px;color:#d3d3d3}.event-blackout-cover span{font-size:11px;color:#777}';
})();
