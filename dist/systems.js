/* Shared gameplay/UI rules for inspection, station transactions and feedback. */
(() => {
  'use strict';
  const g=window.lastRail,D=window.GAME_DATA,B=D.BALANCE,A=window.LAST_RAIL_SCENE;
  const $=s=>document.querySelector(s), clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=v=>Number(v).toFixed(2).replace(/\.00$/,'');
  const pct=v=>`${num(v*100)}%`;
  const labels={combat:'전투',operate:'운용',repair:'수리',recovery:'회복'};
  const guide=(label,text)=>`<button type="button" class="guide-button" data-guide="${esc(text)}" data-guide-title="${esc(label)}">${esc(label)} ⓘ</button>`;
  // Native details stay keyboard/touch accessible; hover opens a temporary guide.
  document.addEventListener('pointerover',e=>{const d=e.target.closest('.shop-detail');if(d&&!d.open){d.open=true;d.dataset.hoverOpen='true';}});
  document.addEventListener('pointerout',e=>{const d=e.target.closest('.shop-detail');if(d&&(!e.relatedTarget||!d.contains(e.relatedTarget))&&d.dataset.hoverOpen){d.open=false;delete d.dataset.hoverOpen;}});
  document.addEventListener('click',e=>{const summary=e.target.closest('.shop-detail>summary');if(!summary)return;const d=summary.parentElement;if(d.dataset.hoverOpen){e.preventDefault();delete d.dataset.hoverOpen;d.open=true;}});
  const old={};for(const k of ['update','renderCars','updateHUD','showMainMenu','showHowTo','newRun'])old[k]=g[k].bind(g);

  g.operatorFor=function(ci){return this.state.crew.filter(c=>!c.dead&&c.hp>0&&!c.moving&&c.car===ci).sort((a,b)=>this.effectiveStat(b,'operate')-this.effectiveStat(a,'operate'))[0]||null;};
  g.equipmentActive=function(ci){const c=this.state.cars[ci];return c.hp>0&&c.power>0&&c.armor<=0;};
  g.turretReadout=function(eq,ci){
    const t=D.TURRETS[eq.type],op=this.operatorFor(ci),active=this.equipmentActive(ci),s=this.turretStats(eq,ci,op);
    const cooling=t.cool*(1+clamp((op?this.effectiveStat(op,'operate'):0)*B.heat.operatorCoolingBonusPerPoint,0,B.heat.maxOperatorModifier))*this.moduleEffect(ci,'cooling','coolingMult')*(this.state.cars[ci].armor>0?B.armor.coolingMultiplier:1);
    const focus=this.state.orders.focus.active>0;
    return {active,operator:op,rows:[
      ['1회 피해',t.damage*(t.pellets||1),active?s.damage:0,false],
      ['발사 간격 (초)',t.interval,s.interval,true],['이론 DPS',t.damage*(t.pellets||1)/t.interval,active?s.damage/s.interval:0,false],
      ['발사당 발열',t.heat,s.heat,true],['초당 냉각',t.cool,this.state.cars[ci].power>0?cooling:0,false],
      ['최대 사거리',B.targeting[t.range],B.targeting[t.range]*(focus?1+B.focus.rangeBonus+(this.meta.upgrades.focus?B.meta.focusRangeBonus:0):1),false],
      ['장갑 관통 (%)',(t.armorPierce||0)*100,s.armorPierce*100,false],
      ['연쇄 대상',t.chains||1,s.chains,false],['광역 반경 (전장 거리)',(t.splash||0)*B.projectile.splashRadiusScale,s.splash*B.projectile.splashRadiusScale,false]
    ]};
  };
  function comparison(rows){return `<table class="comparison"><thead><tr><th>항목</th><th>기본</th><th>현재</th></tr></thead><tbody>${rows.map(([name,base,current,lower])=>{const same=Math.abs(base-current)<.00001,good=lower?current<base:current>base;return `<tr><td>${name}</td><td>${num(base)}</td><td class="${same?'neutral':good?'positive':'negative'}">${num(current)}${same?'':` <small>(${current>base?'+':''}${num(current-base)})</small>`}</td></tr>`;}).join('')}</tbody></table>`;}
  const moduleKeys={heatMult:['발열 배율',true],coolingMult:['냉각 배율',false],stageHealMult:['회복 배율',false],repairMult:['수리 배율',false],ammoDamageMult:['실탄 피해 배율',false],extraPower:['추가 전력',false]};
  g.moduleReadout=function(eq,ci){const m=D.MODULES[eq.type],current=this.moduleData(eq),active=this.equipmentActive(ci);return Object.entries(moduleKeys).filter(([key])=>key in m).map(([key,[name,lower]])=>[name,m[key],active?current[key]:key==='extraPower'?0:1,lower]);};
  g.carEffectsHTML=function(ci){
    const car=this.state.cars[ci],crew=this.state.crew.filter(c=>!c.dead&&c.hp>0&&!c.moving&&c.car===ci);
    const modules=this.state.cars.flatMap((c,i)=>c.equipment.filter(e=>e.kind==='module'&&this.equipmentActive(i)&&Math.abs(ci-i)<=this.moduleData(e).range).map(e=>`${D.MODULES[e.type].name} (${c.name})`));
    return `<div class="effect-sources"><b>객차 적용 효과</b><p>전력 ${car.power} · ${car.power===0?'장비 완전 정지':car.hp<=0?'파괴 · 장비 정지':car.armor>0?'비상 장갑 · 사격 및 모듈 정지':'가동 중'}</p><p>직원: ${crew.map(c=>`${c.name} (운용 ${this.effectiveStat(c,'operate')})`).join(', ')||'없음'}</p><p>특성: ${crew.flatMap(c=>c.traits.map(t=>`${c.name} · ${D.TRAITS[t].name}`)).join(', ')||'없음'}</p><p>모듈: ${modules.join(', ')||'없음'}</p>${this.state.orders.command.active>0&&this.state.orders.command.car===ci?`<p class="positive">열차장 지휘: 전투·운용·수리 +${B.crew.directCommandBonus}</p>`:''}${this.state.runDamageMult!==1?`<p class="positive">런 피해 배율 ×${num(this.state.runDamageMult)}</p>`:''}${this.state.orders.focus.active>0?`<p class="positive">집중 사격 피해 +${pct(B.focus.damageBonus)}</p>`:''}</div>`;
  };
  g.equipmentHTML=function(eq,ci=null){
    const data=(eq.kind==='turret'?D.TURRETS:D.MODULES)[eq.type];
    let rows,extra='';
    if(ci===null){rows=eq.kind==='turret'?[
      ['1회 피해',data.damage*(data.pellets||1),data.damage*(data.pellets||1),false],['발사 간격 (초)',data.interval,data.interval,true],['발열',data.heat,data.heat,true],['초당 냉각',data.cool,data.cool,false],['사거리',B.targeting[data.range],B.targeting[data.range],false],['최소 사거리',data.minRange?B.targeting[data.minRange]:0,data.minRange?B.targeting[data.minRange]:0,true],['관통 (%)',(data.armorPierce||0)*100,(data.armorPierce||0)*100,false]
    ]:Object.entries(moduleKeys).filter(([k])=>k in data).map(([k,[n,l]])=>[n,data[k],data[k],l]);}
    else if(eq.kind==='turret'){
      const r=this.turretReadout(eq,ci);rows=r.rows;extra=`<p>운용 담당: ${r.operator?.name||'없음'} · Lv.${eq.level}${eq.branch?' / '+data.branch.name:''}</p><p class="${r.active&&!eq.overheated?'positive':'negative'}">${!r.active?'장비 정지':eq.overheated?'과열 · 냉각 중':'자동 사격'} · 현재 발열 ${num(eq.heat)} / ${B.heat.max}</p><p class="fineprint">DPS는 과열 휴지·적 장갑을 제외한 값입니다. 낮은 간격·발열은 유리하므로 녹색으로 표시합니다.</p>`;
    }else{rows=this.moduleReadout(eq,ci);extra=`<p>Lv.${eq.level||1} · ${B.moduleUpgrade.branches[eq.model]?.name||'미분기'} · 직원 능력·출력 2 이상은 모듈을 추가 증폭하지 않습니다.</p><p>분기는 기본값 1 대비 효과량에 적용됩니다. 발전 전력은 범위 내 객차 수만큼 합산 후 총합의 소수점을 버립니다.</p>`;}
    return `<h3>${esc(data.name)}</h3><div class="detail-art">${A.equipmentArt(eq)}</div><p>${esc(data.role||this.moduleDescription(data))}${eq.kind==='module'?` · 범위: ${eq.model==='wide'?'모든 객차':`좌우 ${this.moduleData(eq).range}량`}`:''}</p>${comparison(rows)}${extra}${ci!==null?this.carEffectsHTML(ci):'<p>구매 전 기본 수치입니다. 배치 후 직원·출력·모듈 효과가 반영됩니다.</p>'}`;
  };
  g.showEquipmentDetails=function(id){const eq=this.findEquipment(id);if(!eq)return;const ci=this.state.cars.findIndex(c=>c.equipment.includes(eq));this.inspectedEquipment=id;this.inspectedCrew=null;this.moduleRange=eq.kind==='module'&&this.equipmentActive(ci)?{from:ci,range:this.moduleData(eq).range}:null;$('#inspector').innerHTML=this.equipmentHTML(eq,ci);};
  g.crewHTML=function(c,live=true){
    const values=Object.values(c.stats),max=Math.max(...values),min=Math.min(...values);
    const statText={combat:`능력 1당 승선병 대상 개인화기 DPS +${B.crew.personalDpsPerCombat}. 직원이 받는 피해 ${pct(B.crew.boarderDamageReductionPerCombat)} 감소 (최대 ${pct(B.crew.maxDamageReduction)}). 전투 수치 자체는 포탑 피해를 올리지 않으며 명사수 등의 특성이 별도 적용됩니다.`,operate:`객차에서 운용이 가장 높은 활동 직원 1명이 포탑을 담당합니다. 능력 1당 발열 ${pct(B.heat.operatorHeatReductionPerPoint)} 감소, 냉각 ${pct(B.heat.operatorCoolingBonusPerPoint)} 증가 (각 최대 ${pct(B.heat.maxOperatorModifier)}).`,repair:`파괴 객차 복구: 초당 ${B.train.repairBasePerSecond} + 수리 × ${B.train.repairStatScale}. 복구 진행 ${B.train.repairGoal} 도달 시 내구 ${pct(B.train.restoredHpRatio)}로 복원. 자동 수리 교리: 수리 ${B.battle.doctrineMinRepairStat} 이상, 내구 ${pct(B.battle.doctrineRepairThreshold)} 미만일 때 작동.`,recovery:`전투 종료 시 회복 1당 최대 HP의 ${pct(B.crew.stageHealPerRecovery)} 회복. 의료 모듈과 야전의무병 배율이 추가 적용됩니다.`};
    return `<h3>${esc(c.name)}</h3>${guide(c.background,`${c.background}: 직업은 인물의 배경을 나타냅니다. 별도 숨은 직업 보너스는 없으며 아래 능력치와 특성으로 효과가 결정됩니다.`)}<div class="trait-guides">${c.traits.map(t=>guide(D.TRAITS[t].name,D.TRAITS[t].text)).join('')}</div><div class="stat-grid">${Object.entries(c.stats).map(([k,v])=>`<div class="stat-cell ${max!==min&&v===max?'stat-best':''} ${max!==min&&v===min?'stat-worst':''}"><b>${live?this.effectiveStat(c,k):v}</b>${guide(labels[k],statText[k])}</div>`).join('')}</div><p class="fineprint">최고 기본 능력: 녹색 테두리 · 최저: 붉은 테두리 (동률 모두 표시). 숫자는 ${live?'현재 적용':'기본'} 능력입니다.</p>${live?`<p>HP ${Math.ceil(c.hp)} / ${c.maxHp} · ${this.state.cars[c.car].name}</p>`:''}`;
  };
  g.inspectCrew=function(c){this.inspectedEquipment=null;this.inspectedCrew=c.id;this.moduleRange=null;$('#inspector').innerHTML=this.crewHTML(c);};
  g.swapCrew=function(aId,bId,instant=false){
    const a=this.state.crew.find(c=>c.id===aId),b=this.state.crew.find(c=>c.id===bId);
    if(!a||!b||a===b||a.dead||b.dead||a.hp<=0||b.hp<=0||a.moving||b.moving||this.state.cars[a.car].armor>0||this.state.cars[b.car].armor>0)return this.toast('지금은 두 직원의 자리를 교환할 수 없습니다.');
    if(a.car===b.car){A.cancelSelection();return false;}
    const from=a.car,to=b.car,total=Math.abs(from-to)*B.train.moveSecondsPerCar;
    if(instant){a.car=to;b.car=from;}else{a.moving={from,to,left:total,total};b.moving={from:to,to:from,left:total,total};}
    A.cancelSelection();this.log(`${a.name} ↔ ${b.name} 자리 교환`);this.renderCars();return true;
  };
  g.activateArmor=function(){if(!this.state||this.mode!=='battle'||$('#overlay').classList.contains('show')||this.state.armorCharge<B.armor.maxCharge)return;A.cancelSelection();this.state.targetMode='armor';this.setTactical(true);$('#inspector').innerHTML=`<h3>비상 장갑</h3><p>보호할 객차 한 량을 누르세요.</p><p>${B.armor.duration}초 무적 · 해당 객차 사격/모듈/직원 이동 정지 · 냉각 ×${B.armor.coolingMultiplier}</p><p>해당 칸에 승선병이나 이동 중인 직원이 있으면 사용할 수 없습니다.</p>`;this.renderCars();};
  g.executeArmor=function(ci){const s=this.state,c=s.cars[ci];if(s.targetMode!=='armor'||!c||s.armorCharge<B.armor.maxCharge)return;if(c.hp<=0||s.enemies.some(e=>!e.dead&&e.boarded&&e.targetCar===ci)||s.crew.some(x=>x.moving&&(x.moving.from===ci||x.moving.to===ci)))return this.toast('이 객차에는 지금 비상 장갑을 사용할 수 없습니다.');s.armorCharge=0;c.armor=B.armor.duration;s.crew.filter(x=>!x.dead&&x.hp>0&&!x.moving&&x.car===ci).forEach(x=>x.hp=Math.min(x.maxHp,x.hp+x.maxHp*B.armor.healRatio));A.cancelSelection();this.log(`${c.name} 비상 장갑 전개`,'hot');this.renderAll();};
  g.upgradeCost=eq=>eq.kind==='module'?(eq.model?null:(eq.level||1)>=3?0:B.moduleUpgrade.costs[(eq.level||1)-1]):eq.branch?null:eq.level===1?B.upgrade.level2Scrap:eq.level===2?B.upgrade.level3Scrap:B.upgrade.branchScrap;
  g.upgradeEquipment=function(id,model){const eq=this.findEquipment(id);if(!eq)return false;const cost=this.upgradeCost(eq);if(cost===null)return false;if(eq.kind==='module'&&(eq.level||1)>=2&&!B.moduleUpgrade.branches[model])return false;if(this.state.scrap<cost){this.toast('고철이 부족합니다.');return false;}this.state.scrap-=cost;eq.investedScrap=(eq.investedScrap||0)+cost;if(eq.kind==='module'){eq.level=Math.min(3,(eq.level||1)+1);if(eq.level===3)eq.model=model;}else if(eq.level<3)eq.level++;else eq.branch=true;this.rebalancePower();this.renderAll();return true;};
  g.upgradeHTML=function(){return this.state.cars.flatMap(c=>c.equipment.map(e=>{const d=(e.kind==='turret'?D.TURRETS:D.MODULES)[e.type],cost=this.upgradeCost(e),branching=e.kind==='module'&&(e.level||1)>=2&&!e.model;return `<article class="upgrade-entry"><b>${d.name} Lv.${e.level||1} · ${c.name}${e.model?' · '+B.moduleUpgrade.branches[e.model].name:''}</b>${branching?Object.entries(B.moduleUpgrade.branches).map(([id,m])=>`<button data-upgrade-id="${e.id}" data-module-model="${id}" title="효과량 ×${m.factor} · ${m.range==='self'?'현재 객차':m.range==='all'?'모든 객차':'기본 범위'}">${m.name} ▰ ${cost}</button>`).join(''):`<button data-upgrade-id="${e.id}" ${cost===null?'disabled':''}>${cost===null?'최종 강화 완료':`강화 ▰ ${cost}`}</button>`}</article>`;})).join('')||'<p>강화할 장비가 없습니다.</p>';};
  g.openCaptain=function(){if(this.mode!=='battle')return;A.cancelSelection();this.setTactical(true);$('#inspector').innerHTML=`<h3>열차장</h3><p>고철 ▰ ${Math.floor(this.state.scrap)} · 현장 즉시 강화</p><p>직접 지휘 중에만 지정 객차로 이동하고, 종료 시 기관실로 복귀합니다.</p>${this.upgradeHTML()}`;$('#inspector').onclick=e=>{const b=e.target.closest('[data-upgrade-id]');if(b&&this.upgradeEquipment(b.dataset.upgradeId,b.dataset.moduleModel))this.openCaptain();};};

  g.titanSpeedNow=function(){return B.titan.speedBase+Math.min(this.state.stageIndex,D.STAGE_CURVE.length-1)*B.titan.speedPerStage;};
  g.timePreview=function(seconds,dist=0,departure=false){const s=this.state,before=s.titanDistance;let after=clamp(before+dist,0,B.run.maxTitanDistance);after=clamp(after-this.titanSpeedNow()*seconds/60,0,B.run.maxTitanDistance);if(after>0&&departure)after=clamp(after+B.run.branchDistanceBonus,0,B.run.maxTitanDistance);return {seconds,delta:after-before,after};};
  g.timeHTML=function(seconds,dist=0,departure=false){const p=this.timePreview(seconds,dist,departure);return `<span class="time-cost ${p.delta<0?'negative':p.delta>0?'positive':'neutral'}">${seconds}초 소모 · 거리 ${p.delta>0?'+':''}${p.delta.toFixed(2)} km → ${p.after.toFixed(2)} km${departure?' (출발 포함)':''}</span>`;};
  g.spendTime=function(seconds){this.state.titanDistance=clamp(this.state.titanDistance-this.titanSpeedNow()*seconds/60,0,B.run.maxTitanDistance);this.updateHUD();if(this.state.titanDistance<=B.titan.forcedBattleAt){this.gameOver('정비·탐색 중 타이탄이 열차를 따라잡았습니다.');return false;}return true;};
  g.repairCost=function(){return Math.ceil(this.state.cars.reduce((n,c)=>n+c.maxHp-c.hp,0)*B.station.repairMoneyPerHp);};
  g.buyCar=function(){const s=this.state,n=s.cars.length;if(n>=B.train.maxCars)return false;const price=B.station.carPrices[n-B.train.startingCars];if(price===undefined||s.money<price)return false;const hp=B.train.carHp*(1+((Number(this.meta.upgrades.hull)||0)*B.meta.hullHpBonus));s.money-=price;s.cars.push({id:`car-purchased-${n}`,name:B.train.carNames[n]||`${n+1}번 객차`,type:'car',hp,maxHp:hp,power:B.train.baseCarPower,equipment:[],repair:0,armor:0});this.rebalancePower();return true;};
  g.rearrange=function(kind,id,to){
    if(this.mode!=='station'||!this.state.cars[to])return false;
    if(kind==='crew') {const c=this.state.crew.find(x=>x.id===id);if(!c||c.dead||c.moving||c.car===to)return false;const occupants=this.state.crew.filter(x=>!x.dead&&x.car===to);if(occupants.length>=this.crewCapacity(to))return false;c.car=to;return true;}
    const from=this.state.cars.find(c=>c.equipment.some(e=>e.id===id));if(!from||from===this.state.cars[to]||this.state.cars[to].equipment.length>=this.equipmentCapacity(to))return false;const i=from.equipment.findIndex(e=>e.id===id);this.state.cars[to].equipment.push(from.equipment.splice(i,1)[0]);this.rebalancePower();return true;
  };
  g.showStation=function(){
    this.mode='station';this.setSpeed(0);this.inspectedEquipment=null;this.inspectedCrew=null;
    this.state.crew.forEach(c=>{if(c.moving){c.car=c.moving.to;c.moving=null;}});
    if(this.stationStage!==this.state.stageIndex||!this.stationOffers){this.stationStage=this.state.stageIndex;const available=reg=>Object.entries(reg).filter(([,d])=>!d.unlockSpent||this.meta.spent>=d.unlockSpent).sort(()=>Math.random()-.5);this.stationOffers={gear:[...available(D.TURRETS).slice(0,B.station.turretOfferCount).map(([id,d])=>({id,d,kind:'turret'})),...available(D.MODULES).slice(0,B.station.moduleOfferCount).map(([id,d])=>({id,d,kind:'module'}))],crew:D.CREW_TEMPLATES.filter(c=>!this.state.crew.some(x=>x.name===c.name)).slice(0,B.station.crewOfferCount),bought:new Set()};}
    const modal=this.modalShell('정비 스테이션',`구간 ${this.state.stageIndex+1}`,'열차는 정차 중입니다. 구매·강화·재배치·수리·출발에 시간이 들며, 정보 확인에는 시간이 들지 않습니다.');
    modal.querySelector('.dialog-body').innerHTML='<div class="station-summary"></div><div class="tabs station-tabs"></div><div id="shop-content"></div><div class="station-actions"></div>';
    this.stationTab=this.stationTab||'gear';this.renderStation();
    modal.onclick=e=>{
      const tab=e.target.closest('[data-station-tab]');if(tab){if(tab.dataset.stationTab==='formation'){this.enterFormation();return;}this.stationTab=tab.dataset.stationTab;this.renderStation();return;}
      const action=e.target.closest('[data-station-action]');if(action){this.stationAction(action);return;}
      const up=e.target.closest('[data-upgrade-id]');if(up&&this.upgradeEquipment(up.dataset.upgradeId,up.dataset.moduleModel)){if(this.spendTime(B.station.actionSeconds.upgrade))this.renderStation();}
    };
  };
  g.renderStation=function(){
    if(this.mode!=='station')return;const s=this.state,offers=this.stationOffers,seconds=B.station.actionSeconds;
    $('.station-summary').innerHTML=`¤ ${Math.floor(s.money)} · ▰ ${Math.floor(s.scrap)} · 타이탄 ${s.titanDistance.toFixed(2)} km`;
    $('.station-tabs').innerHTML=[['gear','장비'],['crew','직원'],['formation','편성 / 재배치'],['car','객차 구매'],['upgrade','강화']].map(([id,n])=>`<button data-station-tab="${id}" class="${id===this.stationTab?'active':''}">${n}</button>`).join('');
    let html='';
if(this.stationTab==='gear')html=`<div class="shop-grid">${offers.gear.map((o,i)=>`<article class="shop-item"><h3>${o.d.name} · ¤ ${o.d.price}</h3><div class="shop-preview">${A.equipmentArt({kind:o.kind,type:o.id})}</div><details class="shop-detail"><summary>세부 스탯 보기</summary>${this.equipmentHTML({kind:o.kind,type:o.id})}</details>${this.timeHTML(seconds.buy)}<button data-station-action="buy" data-index="${i}" ${offers.bought.has('gear'+i)?'disabled':''}>${offers.bought.has('gear'+i)?'구매 완료':'구매 및 빈 슬롯 배치'}</button></article>`).join('')}</div>`;
    if(this.stationTab==='crew')html=`<div class="shop-grid">${offers.crew.map((c,i)=>`<article class="shop-item">${this.crewHTML(c,false)}<b>¤ ${B.station.crewPrices[Math.min(i,B.station.crewPrices.length-1)]}</b>${this.timeHTML(seconds.recruit)}<button data-station-action="recruit" data-index="${i}" ${s.crew.some(x=>x.name===c.name)?'disabled':''}>영입</button></article>`).join('')}</div>`;
    if(this.stationTab==='upgrade')html=`${this.timeHTML(seconds.upgrade)}${this.upgradeHTML()}`;
    if(this.stationTab==='car'){const index=s.cars.length-B.train.startingCars,price=B.station.carPrices[index];html=s.cars.length>=B.train.maxCars?'<p class="positive">모든 객차를 연결했습니다.</p>':`<article class="shop-item"><h3>${s.cars.length+1}번 · ${B.train.carNames[s.cars.length]}</h3><p>빈 객차 · 장비 ${B.train.equipmentSlots}칸 / 직원 ${B.train.crewSlots}명 / 기본 전력 ${B.train.baseCarPower}</p><b>¤ ${price}</b>${this.timeHTML(seconds.car)}<button data-station-action="car">객차 구매·연결</button></article>`;}
    if(this.stationTab==='formation'){
      const options=(selected)=>s.cars.map((c,i)=>`<option value="${i}" ${i===selected?'selected':''}>${i+1} · ${c.name}</option>`).join('');
      html=`<p>대상을 선택하고 목적 객차로 옮기세요. 가득 찬 슬롯은 아래 교환 기능을 사용하세요.</p>${this.timeHTML(seconds.rearrange)}<div class="formation-grid">${s.cars.map((c,ci)=>`<article class="shop-item"><h3>${ci+1} · ${c.name}</h3><p>장비 ${c.equipment.length}/${B.train.equipmentSlots} · 직원 ${s.crew.filter(x=>!x.dead&&x.car===ci).length}/${B.train.crewSlots}</p>${c.equipment.map(eq=>`<div class="formation-entry"><b>${(eq.kind==='turret'?D.TURRETS:D.MODULES)[eq.type].name}</b><label>목적 객차<select id="move-${eq.id}">${options(ci)}</select></label><button data-station-action="move" data-kind="equipment" data-id="${eq.id}">장비 이동</button></div>`).join('')}${s.crew.filter(x=>!x.dead&&x.car===ci).map(cr=>`<div class="formation-entry"><details><summary>${cr.name} 정보</summary>${this.crewHTML(cr)}</details><label>목적 객차<select id="move-${cr.id}">${options(ci)}</select></label><button data-station-action="move" data-kind="crew" data-id="${cr.id}">직원 이동</button></div>`).join('')}</article>`).join('')}</div>`;
      const gear=s.cars.flatMap(c=>c.equipment),crew=s.crew.filter(c=>!c.dead);
      html+=`<div class="swap-row"><h3>슬롯이 가득 차도 교환 가능</h3><label>장비 A<select id="swap-gear-a">${gear.map(e=>`<option value="${e.id}">${(e.kind==='turret'?D.TURRETS:D.MODULES)[e.type].name} · ${s.cars.find(c=>c.equipment.includes(e)).name}</option>`).join('')}</select></label><label>장비 B<select id="swap-gear-b">${gear.map(e=>`<option value="${e.id}">${(e.kind==='turret'?D.TURRETS:D.MODULES)[e.type].name} · ${s.cars.find(c=>c.equipment.includes(e)).name}</option>`).join('')}</select></label><button data-station-action="swap-gear">장비 교환</button><label>직원 A<select id="swap-crew-a">${crew.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></label><label>직원 B<select id="swap-crew-b">${crew.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></label><button data-station-action="swap-crew">직원 교환</button></div>`;
    }
    $('#shop-content').innerHTML=html;
    $('.station-actions').innerHTML=`<div><button data-station-action="repair" ${this.repairCost()===0?'disabled':''}>전 객차 수리 · ¤ ${this.repairCost()}</button>${this.timeHTML(seconds.repair)}</div><div><button class="depart" data-station-action="depart">정비 완료 →</button>${this.timeHTML(seconds.depart,0,true)}</div>`;
    this.renderAll();
  };
  g.stationAction=function(button){
    if(this.mode!=='station')return;const s=this.state,act=button.dataset.stationAction,t=B.station.actionSeconds;let ok=false,seconds=t.rearrange;
    if(act==='buy'){const i=Number(button.dataset.index),o=this.stationOffers.gear[i];if(this.stationOffers.bought.has('gear'+i))return;if(s.money>=o.d.price&&this.giveRandomGear(o.id,o.kind)){s.money-=o.d.price;this.stationOffers.bought.add('gear'+i);ok=true;}seconds=t.buy;}
    if(act==='recruit'){const i=Number(button.dataset.index),c=this.stationOffers.crew[i],price=B.station.crewPrices[Math.min(i,B.station.crewPrices.length-1)];if(s.crew.some(x=>x.name===c.name))return;if(s.money>=price&&this.recruitCrew(c)){s.money-=price;ok=true;}seconds=t.recruit;}
    if(act==='car'){ok=this.buyCar();seconds=t.car;}
    if(act==='repair'){const cost=this.repairCost();if(cost>0&&s.money>=cost){s.money-=cost;s.cars.forEach(c=>{c.hp=c.maxHp;c.repair=0;c.destroyedLogged=false;});ok=true;}seconds=t.repair;}
    if(act==='move')ok=this.rearrange(button.dataset.kind,button.dataset.id,Number($('#move-'+button.dataset.id).value));
    if(act==='swap-crew')ok=this.swapCrew($('#swap-crew-a').value,$('#swap-crew-b').value,true);
    if(act==='swap-gear'){const a=$('#swap-gear-a').value,b=$('#swap-gear-b').value,ca=s.cars.find(c=>c.equipment.some(e=>e.id===a)),cb=s.cars.find(c=>c.equipment.some(e=>e.id===b));if(ca&&cb&&ca!==cb){const ai=ca.equipment.findIndex(e=>e.id===a),bi=cb.equipment.findIndex(e=>e.id===b);[ca.equipment[ai],cb.equipment[bi]]=[cb.equipment[bi],ca.equipment[ai]];this.rebalancePower();ok=true;}}
    if(act==='depart'){if(this.spendTime(t.depart)){this.closeOverlay();this.advanceStage();}return;}
    if(!ok){this.toast('자원·빈 슬롯·서로 다른 목적지를 확인하세요.');return;}
    if(this.spendTime(seconds))this.renderStation();
  };
  g.eventSuccess=function(choice){return (!choice.req||this.state.crew.some(c=>!c.dead&&c.hp>0&&this.effectiveStat(c,choice.req)>=choice.value))&&(!choice.reqTrait||this.state.crew.some(c=>!c.dead&&c.hp>0&&c.traits.includes(choice.reqTrait)));};
  g.showEvent=function(node={}){const ev=D.EVENTS[Math.floor(Math.random()*D.EVENTS.length)];this.mode='event';this.setSpeed(0);this.eventPending=false;this.showDialog(ev.title,node.dangerousEvent?'위험 신호':'황무지 사건',ev.text,ev.choices.map((c,i)=>({...c,icon:String(i+1),text:c.hint})),c=>this.resolveEventChoice(c));document.querySelectorAll('.choice-card').forEach((el,i)=>{const c=ev.choices[i],success=this.eventSuccess(c),result=success?c.result:c.risk||{};el.insertAdjacentHTML('beforeend',`<div class="event-preview"><span class="${success?'positive':'negative'}">${success?'조건 충족':'조건 미충족 · 위험 결과'}</span>${this.timeHTML(c.seconds??B.event.choiceSeconds,result.distance||0,true)}</div>`);});};
  g.resolveEventChoice=function(choice){if(this.eventPending||!this.canPay(choice.cost))return this.toast('자원이 부족하거나 이미 선택했습니다.');this.eventPending=true;const ok=this.eventSuccess(choice),before=this.state.titanDistance;this.pay(choice.cost);this.applyResult(ok?choice.result:choice.risk||{});if(!this.spendTime(choice.seconds??B.event.choiceSeconds))return;const delta=this.state.titanDistance-before;this.showDialog(ok?'보급 확보':'예상 밖의 변수','선택 결과',`타이탄 거리 ${delta>=0?'+':''}${delta.toFixed(2)} km · 현재 ${this.state.titanDistance.toFixed(2)} km`,[{label:'다음 구간으로',text:`출발 거리 +${B.run.branchDistanceBonus} km (최대 ${B.run.maxTitanDistance} km)`,icon:'→'}],()=>{this.eventPending=false;this.closeOverlay();this.advanceStage();});};

  g.renderCars=function(){old.renderCars();if(!this.state)return;const s=this.state;
    const captainCar=s.orders.command.active>0?s.orders.command.car:0;
    document.querySelectorAll('[data-captain]').forEach(el=>{if(Number(el.closest('[data-car-index]').dataset.carIndex)!==captainCar)el.remove();});
    const car=$(`[data-car-index="${captainCar}"] .car-window`);
    if(car&&!car.querySelector('[data-captain]')){const el=document.createElement('button');el.className='crew-sprite captain';el.dataset.captain='true';el.setAttribute('aria-label','열차장 · 즉시 포탑 강화');el.innerHTML=`${A.portrait({name:'열차장'})}<span class="crew-tag">열차장</span>`;car.append(el);}
    document.querySelectorAll('[data-car-index]').forEach(el=>{const i=Number(el.dataset.carIndex),c=s.cars[i];el.classList.toggle('module-affected',!!this.moduleRange&&Math.abs(i-this.moduleRange.from)<=this.moduleRange.range);el.classList.toggle('car-hit',c.hitFlash>0);el.classList.toggle('power-off',c.power===0);el.classList.toggle('armor-target',s.targetMode==='armor');el.classList.toggle('commanded',s.orders.command.active>0&&s.orders.command.car===i);});
  };
  g.update=function(dt){
    const s=this.state;if(s){if(this.mode==='run'&&s.launchElapsed<B.launch.seconds){s.launchElapsed=Math.min(B.launch.seconds,s.launchElapsed+dt);const p=s.launchElapsed/B.launch.seconds;s.titanDistance=B.launch.startDistance+(B.run.startingTitanDistance-B.launch.startDistance)*p*p;}
      const elapsed=this.mode==='battle'&&!$('#overlay').classList.contains('show')?dt*s.speed:0;
      for(const e of [...s.enemies,...(s.battle?.parts||[])]){e.age=(e.age||0)+elapsed;e.hitFlash=Math.max(0,(e.hitFlash||0)-elapsed);}
      s.cars.forEach(c=>c.hitFlash=Math.max(0,(c.hitFlash||0)-elapsed));this.rebalancePower();
    }old.update(dt);
  };
  g.updateHUD=function(){old.updateHUD();if(!this.state)return;
    if(this.inspectedEquipment&&document.body.classList.contains('is-tactical'))this.showEquipmentDetails(this.inspectedEquipment);
    // Preserve open help panels while the live crew numbers update.
    if(this.inspectedCrew&&document.body.classList.contains('is-tactical')){const c=this.state.crew.find(x=>x.id===this.inspectedCrew);if(c)$('#inspector').querySelectorAll('.stat-cell>b').forEach((el,i)=>el.textContent=this.effectiveStat(c,Object.keys(labels)[i]));}
  };
  g.newRun=function(){this.stationOffers=null;this.stationTab='gear';this.stationStage=null;this.eventPending=false;old.newRun();};
  g.showMainMenu=function(){this.inspectedEquipment=null;this.inspectedCrew=null;this.moduleRange=null;old.showMainMenu();};
  g.showHowTo=function(){old.showHowTo();$('.dialog-body').insertAdjacentHTML('beforeend','<p>추가 조작: 직원 → 다른 직원으로 자리 교환 · 비상 장갑 → 객차 한 량 지정 · 열차장 클릭 → 고철 즉시 강화 · 전력 0 → 포탑과 모듈 정지 · 정비소 편성 탭에서 장비/직원 재배치. ⓘ 항목은 마우스를 올리거나 클릭하면 설명을 볼 수 있습니다.</p>');};
  g.renderCars();
})();
