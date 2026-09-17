/* 0.9.1: ACT boss engine progression, chase relief, clear rewards and engine-upgrade cap extension. */
(()=>{
 'use strict';
 const g=window.lastRail,D=window.GAME_DATA,B=D.BALANCE,C=window.UPDATE09_PART2;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const ACT_BOOST={act1:1,act2:2,act3:3};
 const BOOST_DISTANCE=.2;
 const SPEEDS={4:2.8,5:3.2,6:3.4};
 const loopOf=()=>Math.max(1,Math.floor(Number(g.state?.loop09)||1));
 const inferBoost=s=>{
  if(!s)return 0;
  const loop=Math.max(1,Math.floor(Number(s.loop09)||1));
  if(loop>=2||s.actId==='titan')return 3;
  if(s.actId==='act3')return 2;
  if(s.actId==='act2')return 1;
  return 0;
 };
 function applyCurve(){
  Object.assign(B.train.speedByPower,SPEEDS);
  const s=g.state;if(!s)return;
  const boost=Math.max(0,Math.min(3,Math.floor(Number(s.engineBoosts091)||0)));
  B.train.enginePower.max=Math.max(B.train.enginePower.max,3+boost);
 }
 function ensure(){
  const s=g.state;if(!s)return 0;
  if(!Number.isFinite(s.engineBoosts091))s.engineBoosts091=inferBoost(s);
  s.engineBoosts091=clamp(Math.floor(s.engineBoosts091),0,3);
  if(!Number.isFinite(s.enginePowerBonus091)){
   s.enginePowerBonus091=s.engineBoosts091;
   s.powerCapacityBonus=(Number(s.powerCapacityBonus)||0)+s.enginePowerBonus091;
  }
  s.enginePowerBonus091=clamp(Math.floor(s.enginePowerBonus091),0,3);
  applyCurve();
  return s.engineBoosts091;
 }
 function grantActBoost(){
  const s=g.state,target=ACT_BOOST[s?.actId]||0;
  if(!s||loopOf()!==1||!target)return 0;
  ensure();
  if(s.engineBoosts091>=target)return 0;
  const delta=target-s.engineBoosts091;
  s.engineBoosts091=target;
  s.enginePowerBonus091=(s.enginePowerBonus091||0)+delta;
  s.powerCapacityBonus=(Number(s.powerCapacityBonus)||0)+delta;
  applyCurve();
  g.rebalancePower?.();
  g.log?.(`보스 부품 엔진 강화 · 전력 +${delta} · 엔진 최대 전력 +${delta} · 구간 거리 +${(BOOST_DISTANCE*delta).toFixed(1)} km`,'hot');
  return delta;
 }
 function rewardForBoss(){
  const s=g.state,b=s?.battle;if(!b)return {money:0,scrap:0,relics:0};
  if(b.clearReward091)return b.clearReward091;
  const mult=C?.bossRewardMultiplier||2,stage=g.globalStage();
  const moneyRaw=Math.round((B.rewards.battleMoneyBase+stage*B.rewards.battleMoneyPerStage)*mult);
  const scrapRaw=Math.round((B.rewards.battleScrapBase+stage*B.rewards.battleScrapPerStage)*mult);
  const relicRaw=D.BOSSES[b.bossId]?.rewardRelics||0;
  return {money:g.metaGain?.('money',moneyRaw)??moneyRaw,scrap:g.metaGain?.('scrap',scrapRaw)??scrapRaw,relics:g.rewardRelics09?.(relicRaw)??relicRaw};
 }
 const initial=g.makeInitialState.bind(g);
 g.makeInitialState=function(...args){const s=initial(...args);s.engineBoosts091=0;s.enginePowerBonus091=0;applyCurve();return s;};
 const depart=g.departureDistance.bind(g);
 g.departureDistance=function(){return depart()+ensure()*BOOST_DISTANCE;};
 const hud=g.updateHUD.bind(g);
 g.updateHUD=function(...args){ensure();return hud(...args);};
 const bossClear=g.bossClear.bind(g);
 g.bossClear=function(...args){
  const s=this.state,b=s?.battle;
  if(this.mode==='battle'&&b&&s.actId!=='titan'&&!b.rewardPaid091){
   b.rewardPaid091=true;
   const reward=rewardForBoss();b.clearReward091=reward;
   s.money+=reward.money;s.scrap+=reward.scrap;
   // The 0.9 station wrapper normally grants boss scrap. Mark its guard so this
   // single 0.9.1 reward payment remains the only money/scrap settlement.
   b.rewardPaid09=true;
   this.log(`보스 격파 · 돈 +${reward.money} · 고철 +${reward.scrap} · 고대 잔해 +${reward.relics}`,'hot');
  }
  return bossClear(...args);
 };
 const dialog=g.showDialog.bind(g);
 g.showDialog=function(title,kicker,text,choices,onChoice,...rest){
  const match=/^ACT (I|II|III) CLEAR$/.test(title);
  if(!match)return dialog(title,kicker,text,choices,onChoice,...rest);
  const s=this.state,reward=rewardForBoss(),delta=grantActBoost();
  const upgradeText=delta>0
   ?'보스의 부품으로 엔진이 강화되었다. 더 멀리 갈 수 있을 것 같다.<br>스테이지 통과 시 확보 거리 +0.2km, 전력 +1, 엔진의 최대 전력 +1'
   :`엔진은 이미 1회차의 보스 부품으로 최대 단계까지 강화되어 있다.<br>추가 전력 증가는 없으며, 스테이지 통과 시 엔진 강화 거리 +${(ensure()*BOOST_DISTANCE).toFixed(1)}km를 유지한다.`;
  const rewardText=`돈 ${reward.money}, 고철 ${reward.scrap}, 고대잔해 ${reward.relics} 획득`;
  const nextChoices=(choices||[]).map((c,i)=>i===0?{...c,text:rewardText,hint:delta>0?'스테이지 통과 시 확보 거리 +0.2 km · 전력 +1 · 엔진 최대 전력 +1':c.hint}:c);
  const modal=dialog(title,kicker,upgradeText,nextChoices,onChoice,...rest);
  // ACT III is replaced by the existing Janus decision dialog. Preserve its two
  // choices, but show the same reward/engine result above them.
  if(s?.actId==='act3'){
   const head=modal?.querySelector('.dialog-head p');if(head)head.innerHTML=upgradeText;
   const body=modal?.querySelector('.dialog-body');if(body&&!body.querySelector('.act-clear-reward091')){
    const note=document.createElement('p');note.className='act-clear-reward091';note.innerHTML=`<b>${rewardText}</b>${delta>0?'<br>ACT III 엔진 강화 적용 · 2회차부터 엔진 최대 전력 6':''}`;body.prepend(note);
   }
  }
  return modal;
 };
 // 1.0 chase curve. ACT III has a deliberate acceleration arc, while endless can keep
 // escalating for one more full loop before reaching the 4.0 km/min hard cap.
 const TITAN_SPEED={act3Start:2.5,act3End:3.0,endlessCap:4.0,act3FirstStage:31,act3LastStage:45};
 function titanChaseSpeed(){
  const s=g.state;if(!s)return B.titan.speedBase;
  const loop=loopOf(),stage=Math.max(1,Math.min(45,g.globalStage?.()||1));
  if(loop>=2){
   // Loop 2: 3.0 -> 4.0 over its 45 stages. Loop 3+ stays at the 4.0 cap.
   const endlessIndex=(loop-2)*45+(stage-1);
   const progress=clamp(endlessIndex/44,0,1);
   return TITAN_SPEED.act3End+(TITAN_SPEED.endlessCap-TITAN_SPEED.act3End)*progress;
  }
  if(stage>=TITAN_SPEED.act3FirstStage){
   const progress=clamp((stage-TITAN_SPEED.act3FirstStage)/(TITAN_SPEED.act3LastStage-TITAN_SPEED.act3FirstStage),0,1);
   return TITAN_SPEED.act3Start+(TITAN_SPEED.act3End-TITAN_SPEED.act3Start)*progress;
  }
  // Keep ACT I-II monotonic into the new ACT III entry point instead of letting the
  // old curve briefly exceed 2.5 and then drop when ACT III begins. Stage 30 reaches 2.5.
  const preProgress=clamp((stage-1)/(TITAN_SPEED.act3FirstStage-2),0,1);
  return B.titan.speedBase+(TITAN_SPEED.act3Start-B.titan.speedBase)*preProgress;
 }
 g.titanSpeedNow=function(){return titanChaseSpeed();};
 const updateTitan=g.updateTitan.bind(g);
 g.updateTitan=function(dt){
  const s=this.state;if(!s)return updateTitan(dt);
  const result=updateTitan(dt);
  // The FINAL TITAN fight owns its own synchronized chase speed. Do not override it here.
  if(s.actId==='titan')return result;
  const oldSpeed=Number(s.currentTitanSpeed)||0,desired=titanChaseSpeed();
  // The wrapped update already applied distance using oldSpeed. Correct only that delta so
  // travel, station previews and live chase all agree on the same speed curve.
  if(dt>0&&Number.isFinite(oldSpeed))s.titanDistance=clamp(s.titanDistance+(oldSpeed-desired)*dt/60,0,B.run.maxTitanDistance);
  s.currentTitanSpeed=desired;
  if(window.MOVEMENT_CONFIG)s.titanSpeed=desired*MOVEMENT_CONFIG.unitsPerKm/MOVEMENT_CONFIG.secondsPerMinute;
  else s.titanSpeed=desired*1000/60;
  return result;
 };

 // Boss combat loop support: dealing actual boss HP damage recharges Emergency Armor.
 // 5,000 effective boss damage = 100% charge. Excess charge is not banked past 100%.
 const damageEnemy091=g.damageEnemy.bind(g);
 g.damageEnemy=function(e,amount,pierce,...rest){
  const s=this.state,b=s?.battle;
  const bossFight=this.mode==='battle'&&!!b?.bossId;
  const before=bossFight&&Number.isFinite(b.sharedHp)?b.sharedHp:null;
  const out=damageEnemy091(e,amount,pierce,...rest);
  if(bossFight&&before!==null&&Number.isFinite(b.sharedHp)){
   const dealt=Math.max(0,before-b.sharedHp);
   if(dealt>0){
    const gain=dealt/50; // 5000 damage -> 100 charge
    s.armorCharge=clamp((Number(s.armorCharge)||0)+gain,0,B.armor.maxCharge);
   }
  }
  return out;
 };

 applyCurve();
})();
