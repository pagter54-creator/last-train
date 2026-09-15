/* Persistent same-run loops. Stage-local combat remains on the 45-stage baseline. */
(()=>{
 'use strict';
 const g=lastRail,D=GAME_DATA,C=ESCALATION09,EC=ELITE_CONFIG;
 const baseBoarders=COMBAT_CONFIG.tagCaps.BOARDING;
 g.escalationRules09=function(){const loop=Math.max(1,Math.floor(this.state?.loop09||1));return C.tiers.filter(t=>t.at<=loop).at(-1);};
 const initial=g.makeInitialState.bind(g);g.makeInitialState=function(...args){const s=initial(...args);s.loop09=1;return s;};
 g.nextEscalation09=function(){const s=this.state;if(this.mode!=='result'||s?.actId!=='act3'||s.battle?.bossId!=='janus'||!s.battle.parts.every(p=>p.destroyed))return false;
  // Reuse the state object: no newRun/makeInitialState, no liquidation, no free distance refill.
  s.loop09=Math.min(Number.MAX_SAFE_INTEGER-1,Math.max(1,Math.floor(s.loop09||1))+1);
  s.actId='act1';s.stageIndex=-1;s.act3Recorded09=false;s.stationCrewHealKey=null;
  this.stationOffers=null;this.stationStage=null;this.eventPending=false;
  this.clearCombatPresentation?.();s.battle=null;this.restoreCheckpointEvent?.(null);this.resetCheckpointBoundary?.();
  this.closeOverlay();this.mode='run';this.advanceStage();return true;
 };
 g.eliteCap09=()=>g.escalationRules09().slots;
 g.eliteStage09=()=>Math.min(45,g.globalStage()+Math.max(0,(g.state.loop09||1)-1)*15);
 g.allowElite09=function(id,list){const rule=this.escalationRules09(),d=D.ENEMIES[id],ids=[...list.map(e=>e.type),id];
  if(d.eliteMinStage>=31&&this.state.actId!=='act3'&&rule.combo<3)return false;
  if(ids.reduce((n,key)=>n+(D.ENEMIES[key].eliteSlots||1),0)>rule.slots)return false;
  if(rule.combo<1&&ids.includes('sniperElite')&&ids.includes('fireElite'))return false;
  if(rule.combo<2&&ids.filter(k=>['stealthElite','siegeElite','parasiteElite'].includes(k)).length>1)return false;
  if(rule.combo<2&&ids.includes('airdropElite')&&ids.includes('signalElite'))return false;
  if(rule.combo<3&&ids.includes('airdropElite')&&ids.includes('assaultElite'))return false;
  if(rule.combo<3&&ids.includes('parasiteElite')&&ids.includes('signalElite'))return false;
  if(rule.combo<3&&id==='airdropElite'&&this.state.enemies.some(e=>!e.dead&&e.type==='connectorBlocker'))return false;
  if(rule.combo<3&&ids.includes('assaultElite')&&this.state.enemies.filter(e=>!e.dead&&e.boarded).length>=EC.boarderDanger)return false;
  if(rule.combo<2&&ids.filter(k=>['airdropElite','signalElite','parasiteElite','siegeElite','stealthElite'].includes(k)).length>=3)return false;
  return true;
 };
 // This hook replaces the legacy late-stage combination restrictions, not the slot checks.
 g.eliteComboAllowed09=function(id){const r=this.escalationRules09();return r.combo>=2||this.state.enemies.filter(e=>!e.dead&&e.boarded).length<EC.boarderDanger||!['sniperElite','fireElite'].includes(id);};
 const limit=g.threatLimit.bind(g);g.threatLimit=function(){return Math.max(limit(),this.escalationRules09().slots+this.escalationRules09().boarders);};
 const battle=g.startBattle.bind(g);g.startBattle=function(...args){const r=this.escalationRules09();COMBAT_CONFIG.tagCaps.BOARDING=baseBoarders+r.boarders;const out=battle(...args),b=this.state.battle;
  b.elitePlan={left:b.elite||Math.random()<r.chance?r.count+(b.elite?EC.eliteExtra:0):0,gap:r.gap,next:EC.firstDelay};return out;};
 const boss=g.startBoss.bind(g);g.startBoss=function(...args){COMBAT_CONFIG.tagCaps.BOARDING=baseBoarders+this.escalationRules09().boarders;return boss(...args);};
 const spawn=g.spawnEnemy.bind(g);g.spawnEnemy=function(id,...args){if(id==='connectorBlocker'&&this.escalationRules09().combo<3&&this.state.enemies.some(e=>!e.dead&&e.type==='airdropElite'))return;return spawn(id,...args);};
 g.tickEscalationLightning09=function(dt){const s=this.state,b=s.battle,r=this.escalationRules09(),interval=r.lightning*(b.elite?r.eliteLightning:1);
  const bits=b.lightning09??={};if(!bits.escalated09){Object.assign(bits,{escalated09:true,left:interval,warning:null,warnings09:[],flashes09:[]});}
  if(b.defeated){bits.warnings09=[];bits.flashes09=[];return;}
  const intact=i=>s.cars[i]?.hp>0&&!s.cars[i].destroyed;
  bits.flashes09=bits.flashes09.map(f=>({...f,left:f.left-dt})).filter(f=>f.left>0);
  bits.warnings09=bits.warnings09.filter(w=>intact(w.car)&&intact(w.original));
  for(const w of bits.warnings09){w.left-=dt;if(w.left<=0&&this.strikeLightning09(w))bits.flashes09.push({car:w.car,left:.25});}
  bits.warnings09=bits.warnings09.filter(w=>w.left>0);bits.left-=dt;if(bits.left>0)return;bits.left+=interval;
  const cars=s.cars.map((_,i)=>i).filter(intact);for(let i=cars.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cars[i],cars[j]]=[cars[j],cars[i]];}
  for(let wave=0;wave<r.strikes;wave++)for(const ci of cars.slice(0,r.targets)){const target=this.lightningTarget09(ci);if(target){const delay=C.warning+wave*C.burstGap;bits.warnings09.push({...target,left:delay,total:delay});}}
  if(bits.warnings09.length)this.playSound('alarm');
 };
 const node=g.resolveNode.bind(g);g.resolveNode=function(type,data={}){if(type==='battle'&&this.escalationRules09().extraBattles.includes(this.state.stageIndex+1)){type='elite';data={...data,node:'elite',title:(data.title||'회차 교전')+' · ESCALATION 정예'};}return node(type,data);};
 const metaGain=g.metaGain.bind(g);
 g.escalationRewardFactor09=function(){const r=this.escalationRules09();return r.reward*(this.state?.battle?.elite&&!this.state.battle.boss?r.eliteReward:1);};
 g.metaGain=function(key,n){const value=metaGain(key,n);if(value>0&&key==='relics')return this.rewardRelics09(value);return value>0&&['money','scrap'].includes(key)?Math.round(value*this.escalationRewardFactor09()):value;};
 // Fractional relic rewards are retained; only permanent settlement uses the existing rounding rule.
 g.rewardRelics09=function(n){return Math.round(n*this.escalationRewardFactor09()*100)/100;};
 const stars=g.rollCrewStars.bind(g);g.rollCrewStars=function(){const star=stars(),boost=this.escalationRules09().starBoost;return boost&&Math.random()<boost?Math.min(3,star+1):star;};

})();
