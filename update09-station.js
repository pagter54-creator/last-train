/* A station owns its name history; the run owns the increasing restock count. */
(()=>{
 'use strict';
 const g=lastRail,D=GAME_DATA,C=UPDATE09_PART2,copy=x=>JSON.parse(JSON.stringify(x));
 const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
 const initial=g.makeInitialState.bind(g);g.makeInitialState=function(...args){const s=initial(...args);s.rerollCount=0;return s;};
 g.restockCost09=function(){return C.restock.baseCost+Math.max(0,Math.floor(this.state.rerollCount||0))*C.restock.increment;};
 const name=o=>(o.equipment?.kind==='module'?D.MODULES[o.equipment.type]:o.equipment?D.TURRETS[o.equipment.type]:o.d)?.name;
 const shop=g.prepareActShop.bind(g);
 g.prepareActShop=function(){shop();const o=this.stationOffers;if(!o||o.historyReady09)return;
  const gear=new Set(o.seenGear09||[]),crew=new Set(o.seenCrew09||[]);
  if(this.restockPreparing09){
   // A deliberate restock may reuse previously seen names after the finite unique pool
   // has been exhausted. Keep the offers and simply extend the history.
   for(const e of o.gear){const n=name(e);if(n)gear.add(n);}
   for(const c of o.crew)if(c?.name)crew.add(c.name);
  }else{
   o.gear=o.gear.filter(e=>{const n=name(e);if(gear.has(n))return false;gear.add(n);return true;});
   o.crew=o.crew.filter(c=>{if(crew.has(c.name))return false;crew.add(c.name);return true;});
  }
  o.seenGear09=[...gear];o.seenCrew09=[...crew];o.historyReady09=true;
 };
 g.restockPool09=function(){
  const o=this.stationOffers,seen=new Set(o.seenGear09||[]),crewSeen=new Set(o.seenCrew09||[]),currentGear=new Set((o.gear||[]).map(name).filter(Boolean)),currentCrew=new Set((o.crew||[]).map(c=>c.name));
  const allGear=['turret','module'].flatMap(kind=>Object.entries(kind==='turret'?D.TURRETS:D.MODULES).filter(([id])=>this.runContentUnlocked(kind==='turret'?'turrets':'modules',id)).map(([id,d])=>({id,kind,d})));
  const allCrew=D.CREW_TEMPLATES.filter(c=>!this.state.crew.some(x=>x.name===c.name));
  // Prefer names not yet shown at this station. Once that finite pool is exhausted,
  // reopen previously seen names (except the currently displayed offer) instead of
  // letting the shop shrink to zero entries after several restocks.
  const gear=allGear.filter(e=>!seen.has(e.d.name));
  const crew=allCrew.filter(c=>!crewSeen.has(c.name));
  const fallbackGear=allGear.filter(e=>!currentGear.has(e.d.name));
  const fallbackCrew=allCrew.filter(c=>!currentCrew.has(c.name));
  return {gear:gear.length?gear:fallbackGear,crew:crew.length?crew:fallbackCrew,allGear,allCrew};
 };
 g.restockStation09=function(){if(this.mode!=='station')return false;const cost=this.restockCost09(),pool=this.restockPool09();if(!pool.gear.length&&!pool.crew.length)return false;if(this.state.money<cost){this.toast('재입고 비용이 부족합니다.');return false;}
  const old=this.stationOffers;
  const pickGear=kind=>{const count=D.BALANCE.station[kind==='turret'?'turretOfferCount':'moduleOfferCount'];let candidates=pool.gear.filter(e=>e.kind===kind);if(candidates.length<count){const current=new Set((old.gear||[]).map(name).filter(Boolean));const fallback=pool.allGear.filter(e=>e.kind===kind&&!current.has(e.d.name)&&!candidates.some(x=>x.d.name===e.d.name));candidates=[...candidates,...fallback];}return shuffle(candidates).slice(0,count);};
  let crewCandidates=[...pool.crew];if(crewCandidates.length<D.BALANCE.station.crewOfferCount){const current=new Set((old.crew||[]).map(c=>c.name));crewCandidates.push(...pool.allCrew.filter(c=>!current.has(c.name)&&!crewCandidates.some(x=>x.name===c.name)));}
  const o={gear:['turret','module'].flatMap(pickGear),crew:shuffle(crewCandidates).slice(0,D.BALANCE.station.crewOfferCount),bought:new Set(),seenGear09:[...old.seenGear09],seenCrew09:[...old.seenCrew09],act2:true};
  this.stationOffers=o;
  // Prevent a meta variant from changing an unseen offer into an already displayed name.
  this.restockPreparing09=true;try{this.prepareActShop();}finally{this.restockPreparing09=false;}
  if(!o.gear.length&&!o.crew.length){this.stationOffers=old;this.renderStation();return false;}
  this.state.money-=cost;this.state.rerollCount=(this.state.rerollCount||0)+1;this.renderStation();this.playSound('purchase');return true;
 };
 const randomize=g.randomizeMetaEquipment.bind(g);
 g.randomizeMetaEquipment=function(eq,...args){const original=copy(eq),result=randomize(eq,...args);if(this.restockPreparing09){const n=(eq.kind==='turret'?D.TURRETS:D.MODULES)[eq.type]?.name;if(this.stationOffers.seenGear09.includes(n)){for(const key of Object.keys(eq))delete eq[key];Object.assign(eq,original);}}return result;};
 const render=g.renderStation.bind(g);
 g.renderStation=function(...args){const r=render(...args);if(this.mode!=='station'||!this.stationOffers)return r;this.prepareActShop();
  const summary=document.querySelector('.station-summary');if(summary){const cost=this.restockCost09(),pool=this.restockPool09();summary.innerHTML=`<span class="station-resources09">¤ ${Math.floor(this.state.money)} · ▰ ${Math.floor(this.state.scrap)} · 타이탄 ${this.state.titanDistance.toFixed(2)} km</span>`;const b=document.createElement('button');b.className='station-restock09';b.dataset.restock09='true';b.textContent=`재입고 · ¤ ${cost}`;b.disabled=this.state.money<cost||(!pool.gear.length&&!pool.crew.length);b.title=`판매 장비와 직원을 전부 갱신합니다. 새로운 항목을 우선 표시하며, 전체 후보를 모두 본 뒤에는 기존 후보를 다시 순환합니다. · 누적 ${this.state.rerollCount||0}회`;b.onclick=()=>this.restockStation09();summary.append(b);}
  if(this.state.actId==='titan'){const h=document.querySelector('#modal h2');if(h)h.textContent='최후의 정비 스테이션';const b=document.querySelector('[data-station-action="depart"]');if(b)b.textContent='정비 완료 → Titan 최종전';}
  this.saveStationCheckpoint09?.();return r;
 };
 const clear=g.bossClear.bind(g);
 g.bossClear=function(...args){const s=this.state,b=s?.battle;if(this.mode==='battle'&&b&&!b.rewardPaid09&&s.actId!=='titan'){b.rewardPaid09=true;const reward=Math.round((D.BALANCE.rewards.battleScrapBase+this.globalStage()*D.BALANCE.rewards.battleScrapPerStage)*C.bossRewardMultiplier);s.scrap+=this.metaGain?.('scrap',reward)??reward;this.log(`보스 격파 · 고철 +${reward} · 고대 잔해 +${D.BOSSES[b.bossId].rewardRelics}`,'hot');}return clear(...args);};
 g.deferTitanBattle09=function(){
  if(!this.state||this.state.actId!=='act3')return;
  const cleared=Math.max(0,Number(this.state.metaRun?.apocalypse)||0),beforeRelics=Number(this.meta?.relics)||0;
  // Reuse the normal clear pipeline so rewards, clear counts, checkpoint cleanup, and
  // apocalypse progression remain identical to a completed run. Titan combat itself
  // stays disabled until the 1.0 implementation is ready.
  this.completeAct();
  const earned=Math.max(0,(Number(this.meta?.relics)||0)-beforeRelics),unlocked=Math.max(0,Number(this.meta?.apocalypseUnlocked)||0);
  const unlockText=unlocked>cleared?`종말 단계 ${unlocked}이(가) 해금되었습니다.`:`현재 해금 가능한 최고 종말 단계까지 도달했습니다.`;
  return this.showDialog('TITAN BATTLE','0.9 · 최종전 준비 중',`타이탄 전투는 아직 준비되지 않았습니다.<br><b>완성된 타이탄 최종전은 LAST RAIL 1.0에서 공개됩니다.</b><br><br>이번 원정은 <b>종말 단계 ${cleared} 클리어</b>로 정상 처리되었습니다.<br>${unlockText}<br>획득한 고대 잔해 ◆ ${earned}`,[
   {label:'메인 메뉴로',text:'이번 런을 종료하고 해금된 진행도를 저장합니다.',icon:'✓'}
  ],()=>this.returnMenu());
 };
 const dialog=g.showDialog.bind(g);
 g.showDialog=function(title,sub,text,choices,callback,...rest){if(this.state?.actId==='act3'&&this.mode==='result'&&title==='ACT III CLEAR'){
   return dialog(title,'JANUS 격파 · 마지막 결단','계속 달려 다음 회차로 진입하거나, 도망을 멈추고 타이탄에 맞설 수 있습니다.',[
    {label:'더 이상 도망치지 않는다.',text:'Titan에 맞선다. ※ 0.9에서는 최종전 대신 현재 종말 단계 클리어로 처리됩니다.',icon:'⚔'},
    {label:'더 멀리 달린다.',text:'직원·장비·자원·재입고 횟수를 유지하고 다음 회차 ACT I 진입. 더 높은 성장과 파밍을 위해 위험을 누적합니다.',icon:'→'}],(choice,index)=>{if(index===1||choice.label==='더 멀리 달린다.')this.nextEscalation09();else this.deferTitanBattle09();});
  }return dialog(title,sub,text,choices,callback,...rest);};
})();
