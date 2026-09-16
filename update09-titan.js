/* LAST RAIL 1.0 TITAN final battle rework.
   - Keeps the normal train/crew/turret UI at full size.
   - Adds a separate chase foreground to the world canvas.
   - Uses engine output, lane interaction, boarding combat and prediction baiting.
   - All TITAN hull damage is ratio based. */
(()=>{
 'use strict';
 const g=window.lastRail,D=window.GAME_DATA,B=D.BALANCE,C=window.UPDATE09_PART2.titan;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const alive=e=>e&&!e.dead&&!e.destroyed&&e.hp>0;
 const active=()=>g.mode==='battle'&&g.state?.battle?.bossId==='titan';
 const titanState=()=>g.state?.battle?.titan10||null;
 const uid=prefix=>`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
 const phaseName=['보행 추격','무한궤도 추격','로켓 추격'];
 const patternName={
  missile:'대각 미사일',stomp:'발 구르기',walk:'연속 보행',debris:'비산 잔해',
  arm:'팔 내려찍기',laser:'머리 레이저',railCrush:'선로 분쇄',trackDebris:'궤도 파편',drone:'강습 드론',
  guided:'유도 돌진',exhaust:'로켓 배기',predictiveMissile:'예측 미사일'
 };
 const phasePatterns={
  1:['missile','walk','stomp','debris','missile','stomp'],
  2:['arm','trackDebris','laser','drone','railCrush','arm','laser'],
  3:['guided','laser','predictiveMissile','drone','exhaust','guided','predictiveMissile']
 };

 function maxHpDamage(car,rate){return Math.max(0,car.maxHp*rate);}
 function currentHpDamage(car,rate,minRate){return Math.max(Math.max(0,car.hp)*rate,Math.max(0,car.maxHp)*minRate);}
 function damageByRule(car,rule){return rule?.type==='max'?maxHpDamage(car,rule.rate):currentHpDamage(car,rule?.rate||0,rule?.min||0);}
 function intactCars(){return g.state.cars.map((car,index)=>({car,index})).filter(x=>x.car.hp>0);}
 function nearestCarByNorm(norm){
  const list=intactCars();if(!list.length)return 0;
  // The visual chase train faces right, but the real car array starts with the engine/front car.
  // Invert screen-space X so a rear warning hitting the left side damages rear cars and a front
  // warning hitting the right side damages the engine/front cars.
  const pos=(1-clamp(norm,0,1))*(g.state.cars.length-1);
  return list.sort((a,b)=>Math.abs(a.index-pos)-Math.abs(b.index-pos))[0].index;
 }
 function hitCar(index,rule,kind='TITAN 공격'){
  const s=g.state,car=s.cars[index];if(!car||car.hp<=0)return 0;
  if(car.armor>0){g.fx?.(.22+index*.12,.78,'#f1c56b');return 0;}
  const before={car:car.hp,crew:s.crew.map(c=>({id:c.id,hp:c.hp,dead:c.dead}))};
  const raw=damageByRule(car,rule),absorbed=g.absorbHullDamage?.(index,raw)??raw;
  car.hp=Math.max(0,car.hp-absorbed);car.hitFlash=.45;
  g.onHullImpact?.(index,before);g.playSound?.('explosion');
  if(car.hp<=0&&!car.destroyedLogged){car.destroyedLogged=true;g.log(`${car.name} 파괴! ${kind}`,'bad');}
  return absorbed;
 }
 function hitAll(rule,kind){for(const {index}of intactCars())hitCar(index,rule,kind);}
 function hitAdjacent(norm,rule,count=1,kind='TITAN 공격'){
  const primary=nearestCarByNorm(norm),indices=[primary];
  for(let d=1;indices.length<count&&d<g.state.cars.length;d++)for(const i of [primary-d,primary+d])if(i>=0&&i<g.state.cars.length&&g.state.cars[i].hp>0&&!indices.includes(i)&&indices.length<count)indices.push(i);
  for(const i of indices)hitCar(i,rule,kind);
 }
 function quake(px=9,ms=320){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  // HOTFIX 11: keep the chase scenery stable and shake only the command/HUD layers.
  // `translate` is used instead of `transform` so existing train/health-bar transforms are preserved.
  const upper=[
   document.querySelector('.topbar'),
   document.querySelector('.threat-strip'),
   document.querySelector('.battle-clock'),
   document.querySelector('.speed-controls'),
   document.querySelector('.titan-health10')
  ].filter(Boolean);
  const lower=[
   document.querySelector('#train-cars'),
   document.querySelector('.orders-dock')
  ].filter(Boolean);
  if(!upper.length&&!lower.length)return;
  const speed=Math.max(1,g.state?.speed||1),d=Math.max(90,ms/speed);
  const frames=(sign=1)=>[
   {translate:'0px 0px'},
   {translate:`${-px*sign}px ${Math.round(px*.45)}px`},
   {translate:`${px*sign}px ${-Math.round(px*.35)}px`},
   {translate:`${-Math.round(px*.65)*sign}px ${Math.round(px*.25)}px`},
   {translate:`${Math.round(px*.45)*sign}px ${-Math.round(px*.15)}px`},
   {translate:'0px 0px'}
  ];
  for(const target of upper)target.animate(frames(1),{duration:d,easing:'ease-out'});
  // A slightly opposed lower-HUD kick makes the impact readable without moving the world itself.
  for(const target of lower)target.animate(frames(-1),{duration:d,easing:'ease-out'});
 }
 function pushTitanFx(kind,data={}){
  const t=titanState();if(!t)return;
  t.fx??=[];t.fx.push({kind,age:0,life:data.life??.62,...data});
  if(t.fx.length>18)t.fx.splice(0,t.fx.length-18);
 }
 function updateTitanFx(dt){
  const t=titanState();if(!t?.fx)return;
  for(const fx of t.fx)fx.age+=dt;
  t.fx=t.fx.filter(fx=>fx.age<fx.life);
 }
 function impactCue(type,a={}){
  switch(type){
   case 'missile':pushTitanFx('blast',{zone:'front',life:.7});g.playSound?.('explosion');quake(6,260);break;
   case 'stomp':pushTitanFx('stomp',{leg:a.leg,zone:'rear',life:.82});g.playSound?.('titan');g.playSound?.('cannonBass');g.playSound?.('debris');quake(15,520);break;
   case 'walk':pushTitanFx('walk',{life:.45});g.playSound?.('titan');quake(3,180);break;
   case 'debris':pushTitanFx('debris',{life:.72});g.playSound?.('debris');quake(4,240);break;
   case 'arm':pushTitanFx('slam',{zone:'rear',life:.78});g.playSound?.('cannonBass');g.playSound?.('metal');g.playSound?.('explosion');quake(13,460);break;
   case 'laser':pushTitanFx('laser',{zone:'front',life:.58});g.playSound?.('blastHit');g.playSound?.('explosion');quake(7,300);break;
   case 'trackDebris':pushTitanFx('trackDebris',{life:.68});g.playSound?.('debris');quake(5,260);break;
   case 'railCrush':pushTitanFx('railCrush',{lane:a.lane??0,life:.86});g.playSound?.('titan');g.playSound?.('cannonBass');g.playSound?.('debris');quake(16,560);break;
   case 'drone':pushTitanFx('droneLaunch',{life:.55});g.playSound?.('boardingAlarm');g.playSound?.('metal');break;
   case 'exhaust':pushTitanFx('exhaust',{zone:'rear',life:.68});g.playSound?.('titan');g.playSound?.('explosion');quake(9,340);break;
   case 'predictiveMissile':pushTitanFx('blast',{position:a.predicted??0,life:.72});g.playSound?.('explosion');quake(7,280);break;
   case 'guided':pushTitanFx('guidedCrash',{position:a.locked??0,life:.95});g.playSound?.('titan');g.playSound?.('cannonBass');g.playSound?.('explosion');quake(18,620);break;
  }
 }
 function executionCue(a){
  if(a.fireCue)return;a.fireCue=true;
  if(a.type==='missile'||a.type==='predictiveMissile')g.playSound?.('mortarShot');
  else if(a.type==='laser')g.playSound?.('teslaShot');
  else if(a.type==='railCrush'||a.type==='arm')g.playSound?.('cannonBass');
  else if(a.type==='exhaust'||a.type==='guided')g.playSound?.('titan');
  else if(a.type==='debris'||a.type==='trackDebris')g.playSound?.('debris');
 }
 function posState(){const p=g.state?.battle?.titan10?.position||0;return p<-.33?'후방':p>.33?'전방':'중앙';}
 function actualEngine(){return Math.max(1,Math.floor(g.state?.cars?.[0]?.power??2));}
 function attackOf(){return g.state?.battle?.titan10?.attack||null;}
 function stepDuration(type){return C.telegraph[type]||2.5;}
 const INTRO={reverse:5,stop:.65,zoom:1.05,enter:1.8,launch:1.25};
 const PHASE_SHIFT={exit:1.35,gap:.5,enter:1.65};
 const introTotal=()=>INTRO.reverse+INTRO.stop+INTRO.zoom+INTRO.enter+INTRO.launch;
 const shiftTotal=()=>PHASE_SHIFT.exit+PHASE_SHIFT.gap+PHASE_SHIFT.enter;

 // HOTFIX 07: one shared chase-scene layout drives rails, miniature train, TITAN art
 // and target projection. Keeping these coordinates in one place prevents visual/hit mismatches.
 const CHASE={railLeft:.05,railRight:.96,trackY:.55,laneGap:.07,titanX:.20,trainX:.56,trainTravel:.14,titanScale:1.70};
 const miniTrainScale=w=>Math.max(.58,Math.min(.85,w/1450));
 function chaseTrackY(h,phase,lane=0){
  if(phase===2)return h*(CHASE.trackY-CHASE.laneGap*.5+CHASE.laneGap*clamp(lane,0,1));
  return h*CHASE.trackY;
 }
 function chaseTrainX(w,position=0){return w*(CHASE.trainX+clamp(position,-1,1)*CHASE.trainTravel);}
 function titanAnchor(w,h,phase,offset=0){
  const track=chaseTrackY(h,phase,0);
  const localBottom=phase===1?80:130;
  return{x:w*CHASE.titanX+offset,y:track-localBottom*CHASE.titanScale};
 }


 // Visible phase-health HUD.  The bar tracks only the parts that actually gate phase progression.
 const titanHealth=document.createElement('section');
 titanHealth.className='titan-health10';
 titanHealth.hidden=true;
 titanHealth.innerHTML='<div class="titan-health10-row"><span class="titan-health10-name">TITAN</span><b class="titan-health10-value">0 / 0</b></div><div class="titan-health10-track"><i></i></div><small class="titan-health10-parts"></small>';
 (document.querySelector('.canvas-wrap')||document.body).append(titanHealth);
 function phaseHealthParts(){
  const b=g.state?.battle;if(!b?.parts)return[];
  if(b.phase===1)return b.parts.filter(p=>p.phase===1);
  if(b.phase===2)return b.parts.filter(p=>p.type==='titanBody');
  return b.parts.filter(p=>p.type==='titanCore');
 }
 function updateTitanHealth(){
  const t=titanState();if(!active()||!t||t.intro||t.transition){titanHealth.hidden=true;return;}
  const b=g.state.battle,parts=phaseHealthParts(),max=parts.reduce((n,p)=>n+(p.maxHp||0),0),hp=parts.reduce((n,p)=>n+Math.max(0,p.hp||0),0),ratio=max>0?clamp(hp/max,0,1):0;
  titanHealth.hidden=false;
  titanHealth.querySelector('.titan-health10-name').textContent=`TITAN · PHASE ${b.phase}`;
  titanHealth.querySelector('.titan-health10-value').textContent=`${Math.ceil(hp)} / ${Math.ceil(max)}`;
  titanHealth.querySelector('.titan-health10-track i').style.width=`${ratio*100}%`;
  titanHealth.querySelector('.titan-health10-parts').textContent=parts.map(p=>`${p.name} ${Math.ceil(Math.max(0,p.hp||0))}`).join('  ·  ');
 }
 function titanMotionClock(b,t){return t.transition&&!t.transition.swapped?t.transition.frozenVisual:(t.visualClock??b.elapsed);}
 function titanPartLocal(e,b,t,phase){
  const a=t.attack;
  if(phase===1){
   const side=e.type==='titanLegL'?-1:e.type==='titanLegR'?1:0;
   if(!side)return[0,-58];
   const stomp=a?.type==='stomp'?1-a.left/a.total:0,which=a?.leg==='titanLegL'?-1:1,walk=Math.sin(titanMotionClock(b,t)*2.4);
   const lift=(a?.type==='stomp'&&side===which)?Math.sin(Math.min(1,stomp)*Math.PI)*55:Math.max(0,side*walk)*18;
   return[side*96,8-lift];
  }
  if(phase===2){
   const armLift=a?.type==='arm'?Math.sin((1-a.left/a.total)*Math.PI)*75:0;
   if(e.type==='titanBody')return[0,-6];
   if(e.type==='titanArm')return[-164,-48-armLift];
   if(e.type==='titanHeadGun')return[128,-74];
   return[0,0];
  }
  if(e.type==='titanCore')return[0,-8];
  return[0,0];
 }
 function titanPartScreen(e,w,h){
  const b=g.state?.battle,t=b?.titan10;if(!b||!t)return null;
  const visual=titanVisual(w),phase=visual.phase||b.phase,anchor=titanAnchor(w,h,phase,visual.offset),local=titanPartLocal(e,b,t,phase),S=CHASE.titanScale;
  return{x:anchor.x+local[0]*S,y:anchor.y+local[1]*S,r:(e.weapon?44:72)*S,scale:S};
 }

 function initTitanState(){
  const b=g.state.battle,startDistance=Math.max(.1,Number(g.state.titanDistance)||.1);
  // TITAN uses its own phase state machine.  Disable the generic boss-rework layer here;
  // otherwise its arrival gate treats TITAN parts as sealed and silently rejects turret damage.
  b.rework=false;b.arrivalLeft=0;b.phase=1;b.previousPhase09=null;b.phaseTransition09=0;b.defeated=false;b.defeatFadeLeft=0;
  b.titan10={position:0,velocity:0,lane:0,laneVisual:0,patternIndex:0,next:2.5,attack:null,vulnerablePart:null,vulnerableLeft:0,coreOpen:0,switchId:null,switchChanged:false,droneSerial:0,finale:false,travelClock:0,visualClock:0,intro:{elapsed:0,startDistance},transition:null};
  for(const p of b.parts){p.titanPart09=true;p.bossPart=false;p.dead=false;p.destroyed=p.phase!==1;p.grip=0;p.repairLeft=0;if(p.phase===1)p.hp=p.maxHp;}
  b.sharedHp=b.parts.filter(p=>p.phase===1).reduce((sum,p)=>sum+Math.max(0,p.hp||0),0);
  g.state.projectiles=[];g.state.enemies=g.state.enemies.filter(e=>!e.titanDrone10&&!e.titanSwitch10);g.state.orders.focus.target=null;
 }
 function activatePhase(n){
  const b=g.state.battle,t=b.titan10;b.previousPhase09=b.phase;b.phase=n;t.patternIndex=0;t.next=1.8;t.attack=null;t.vulnerablePart=null;t.vulnerableLeft=0;t.coreOpen=0;t.switchId=null;t.switchChanged=false;t.lane=0;
  g.state.enemies=g.state.enemies.filter(e=>!e.titanDrone10&&!e.titanSwitch10);
  for(const p of b.parts){p.bossPart=false;p.dead=false;p.destroyed=p.phase!==n;p.grip=0;p.repairLeft=0;if(p.phase===n)p.hp=p.maxHp;}
  b.sharedHp=b.parts.filter(p=>p.phase===n).reduce((sum,p)=>sum+Math.max(0,p.hp||0),0);
  g.state.orders.focus.target=null;
 }
 function phase(n){
  const b=g.state.battle,t=b.titan10;if(t.transition)return;
  t.attack=null;t.vulnerablePart=null;t.vulnerableLeft=0;t.coreOpen=0;t.switchId=null;t.switchChanged=false;
  g.state.enemies=g.state.enemies.filter(e=>!e.titanDrone10&&!e.titanSwitch10);g.state.orders.focus.target=null;
  t.transition={from:b.phase,to:n,elapsed:0,swapped:false,frozenClock:t.travelClock||0,frozenVisual:t.visualClock||0};b.phaseTransition09=shiftTotal();
 }

 const start=g.startBoss.bind(g);
 g.startBoss=function(id){
  const r=start(id);if(id!=='titan')return r;
  initTitanState();this.state.cars.forEach(c=>this.clearCarElectrical09?.(c));this.renderAll();return r;
 };

 const oldTitan=g.updateTitan.bind(g);
 g.updateTitan=function(dt){
  if(!active())return oldTitan(dt);
  const s=this.state,t=titanState();if(!t)return;
  const p=actualEngine(),normalSpeed=B.train.speedByPower[p]||B.train.speedByPower[3]||2.4;
  const baseSceneSpeed=B.train.speedByPower[B.train.enginePower?.start]||B.train.speedByPower[3]||2.4;
  if(t.intro){
   const realDt=dt/Math.max(.01,s.speed||1);t.intro.elapsed+=realDt;t.visualClock=(t.visualClock||0)+realDt;const e=t.intro.elapsed,start=t.intro.startDistance;
   if(e<INTRO.reverse){
    const q=clamp(e/INTRO.reverse,0,1);
    s.titanDistance=start+(0.1-start)*q;
    s.currentTrainSpeed=-Math.max(1.7,normalSpeed*.9)/Math.max(.01,s.speed||1);
    s.currentTitanSpeed=0;
    // Signed world pace: negative makes the real scenery move left-to-right,
    // so the player's actual train reads as travelling left during the FINAL approach.
    s.titanWorldPace10=-1.15;
    t.travelClock-=realDt*Math.max(1.7,normalSpeed*.9);
   }
   else if(e<INTRO.reverse+INTRO.stop+INTRO.zoom+INTRO.enter){
    s.titanDistance=.1;s.currentTrainSpeed=0;s.currentTitanSpeed=0;s.titanWorldPace10=0;
   }
   else if(e<introTotal()){
    const launchStart=INTRO.reverse+INTRO.stop+INTRO.zoom+INTRO.enter;
    const q=clamp((e-launchStart)/INTRO.launch,0,1);
    s.titanDistance=.1;s.currentTrainSpeed=normalSpeed/Math.max(.01,s.speed||1);s.currentTitanSpeed=s.currentTrainSpeed;
    // Once TITAN has entered, smoothly reverse the scenery back to normal rightward travel.
    s.titanWorldPace10=.35+.75*(q*q*(3-2*q));
    t.travelClock+=realDt*normalSpeed;
   }
   else{
    t.intro=null;s.titanDistance=.1;s.currentTrainSpeed=normalSpeed;s.currentTitanSpeed=normalSpeed;
    s.titanWorldPace10=(normalSpeed/baseSceneSpeed)*Math.max(0,s.speed||1);
    t.next=1.5;this.showBanner('TITAN · PHASE 1','추격 개시');
   }
   s.trainSpeed=s.currentTrainSpeed*1000/60;s.titanSpeed=Math.max(0,s.currentTitanSpeed)*1000/60;return;
  }
  t.visualClock=(t.visualClock||0)+dt;
  const target=p<=1?-1:p===2?0:1;
  const responsiveness=1+Math.max(0,p-3)*.10;
  t.velocity+=(target-t.position)*C.travelSpring*responsiveness*dt-t.velocity*C.travelDamping*dt;
  t.position=clamp(t.position+t.velocity*dt,-1,1);
  t.laneVisual+=((t.lane||0)-t.laneVisual)*Math.min(1,dt*3.2);
  t.travelClock+=dt*normalSpeed;
  s.currentTrainSpeed=normalSpeed;s.currentTitanSpeed=normalSpeed;s.trainSpeed=normalSpeed*1000/60;s.titanSpeed=s.trainSpeed;
  // Keep scenery moving for the entire boss fight even if a legacy wrapper rewrites currentTrainSpeed.
  // This is the explicit source consumed by scene.js from HOTFIX 04 onward.
  s.titanWorldPace10=(normalSpeed/baseSceneSpeed)*Math.max(0,s.speed||1);
  s.titanDistance=Math.max(.1,s.titanDistance);
 };

 function estimateDps(){
  let dps=0;
  for(const [ci,car]of g.state.cars.entries())for(const eq of car.equipment||[])if(eq.kind==='turret'&&car.hp>0){
   try{const st=g.turretStats(eq,ci,g.operatorFor?.(ci));if(st?.interval>0)dps+=Math.max(0,st.damage||0)/st.interval;}catch{}
  }
  return dps;
 }
 function spawnSwitch(){
  const s=g.state,b=s.battle,t=b.titan10;
  const hp=clamp(estimateDps()*C.switch.dpsSeconds,C.switch.minHp,C.switch.hpCap);
  const e={id:uid('titan-switch'),type:'titanAssaultDrone',name:'선로 변환 장치',hp,maxHp:hp,armor:0,x:.9,y:.34,dead:false,boarded:false,titanSwitch10:true,targetCar:0};
  s.enemies.push(e);t.switchId=e.id;t.switchChanged=false;return e;
 }
 function switchTarget(){const t=titanState();return t?g.state.enemies.find(e=>e.titanSwitch10&&!e.dead&&e.id===t.switchId):null;}
 function spawnDrone(target,delay=0){
  const t=g.state.battle.titan10,d=C.drone;
  const e={id:uid('titan-drone'),type:'titanAssaultDrone',name:'TITAN 강습 드론',hp:d.hp,maxHp:d.hp,armor:d.armor,x:.8,y:.28,carDamage:0,crewDamage:d.crewDamage,interval:2.2,attackTimer:2.2,targetCar:target,boarded:false,dead:false,titanDrone10:true,titanDroneState:'approach',approachLeft:d.approach+delay,approachTotal:d.approach+delay,cutLeft:d.cut,cutTotal:d.cut,serial:t.droneSerial++};
  g.state.enemies.push(e);return e;
 }
 function startDrones(){
  const live=intactCars();if(!live.length)return;
  const shuffled=[...live].sort(()=>Math.random()-.5).slice(0,Math.min(C.drone.count,live.length));
  shuffled.forEach((x,i)=>spawnDrone(x.index,i*.55));
 }

 function beginPattern(type){
  const b=g.state.battle,t=b.titan10,total=type==='guided'?C.telegraph.guidedTrack:type==='drone'?(C.telegraph.droneApproach+C.telegraph.droneCut):stepDuration(type);
  const a={type,state:'warning',left:total,total,started:b.elapsed};
  if(type==='stomp')a.leg=(t.patternIndex%2?'titanLegL':'titanLegR');
  if(type==='railCrush'){a.lane=t.lane;spawnSwitch();}
  if(type==='guided'){a.state='tracking';a.left=C.telegraph.guidedTrack;a.total=C.telegraph.guidedTrack;a.predicted=t.position;a.locked=null;}
  if(type==='predictiveMissile'){a.predicted=clamp(t.position+t.velocity*1.1,-1,1);}
  if(type==='drone'){startDrones();impactCue('drone',a);}
  t.attack=a;g.playSound?.('alarm');
 }
 function nextPattern(){
  const b=g.state.battle,t=b.titan10,seq=phasePatterns[b.phase];let type=seq[t.patternIndex++%seq.length];
  if(b.phase===2&&type==='railCrush'&&g.state.orders.focus.cooldown>Math.max(0,C.telegraph.railCrush-1.2))type='arm';
  if(b.phase===3&&t.coreOpen>0){t.next=Math.max(t.next,t.coreOpen+.5);return;}
  if(b.phase===3&&t.finale)type='guided';
  beginPattern(type);
 }
 function dodgeRear(){return g.state.battle.titan10.position>C.rearSafe;}
 function dodgeFront(){return g.state.battle.titan10.position<C.frontSafe;}
 function splashAround(index,rate){
  for(const i of [index-1,index+1])if(i>=0&&i<g.state.cars.length&&g.state.cars[i].hp>0)hitCar(i,{type:'max',rate},'폭발 파편');
 }
 function resolvePattern(a){
  const b=g.state.battle,t=b.titan10;
  if(!a.fireCue&&['missile','laser','predictiveMissile','railCrush','arm','exhaust','debris','trackDebris'].includes(a.type))executionCue(a);
  switch(a.type){
   case 'missile':{
    impactCue('missile',a);const safe=dodgeFront(),ci=nearestCarByNorm(.82);if(!safe){hitCar(ci,C.damage.missile,'대각 미사일');splashAround(ci,C.damage.missile.splash);}else g.log('대각 미사일 회피','hot');break;
   }
   case 'stomp':{
    impactCue('stomp',a);const safe=dodgeRear();if(!safe)hitAdjacent(.18,C.damage.stomp,1,'발 구르기');else{g.log('발 구르기 회피 · 다리 노출','hot');t.vulnerablePart=a.leg;t.vulnerableLeft=2.8;}break;
   }
   case 'debris':impactCue('debris',a);hitAll(C.damage.debris,'비산 잔해');break;
   case 'walk':impactCue('walk',a);break;
   case 'arm':{
    impactCue('arm',a);const safe=dodgeRear();if(!safe)hitAdjacent(.20,C.damage.arm,1,'팔 내려찍기');else{g.log('팔 내려찍기 회피 · 강습 팔 노출','hot');t.vulnerablePart='titanArm';t.vulnerableLeft=2.5;}break;
   }
   case 'laser':{
    impactCue('laser',a);const safe=dodgeFront();if(!safe)hitAdjacent(.80,C.damage.laser,1,'머리 레이저');else g.log('머리 레이저 회피','hot');break;
   }
   case 'trackDebris':impactCue('trackDebris',a);hitAll(C.damage.trackDebris,'궤도 파편');break;
   case 'railCrush':{
    impactCue('railCrush',a);const changed=t.switchChanged&&t.lane!==a.lane;if(!changed)hitAll(C.damage.railCrush,'선로 분쇄');else g.log('선로 분쇄 회피','hot');
    const sw=switchTarget();if(sw)sw.dead=true;t.switchId=null;break;
   }
   case 'drone':break;
   case 'exhaust':{
    impactCue('exhaust',a);const safe=dodgeRear();if(!safe)hitAdjacent(.15,C.damage.exhaust,1,'로켓 배기');else g.log('로켓 배기 회피','hot');break;
   }
   case 'predictiveMissile':{
    impactCue('predictiveMissile',a);const safe=Math.abs(t.position-a.predicted)>=C.reverseSafe;if(!safe)hitAdjacent((a.predicted+1)/2,C.damage.predictiveMissile,1,'예측 미사일');else g.log('예측 미사일 회피','hot');break;
   }
  }
 }
 function resolveGuided(a){
  const t=g.state.battle.titan10,safe=Math.abs(t.position-a.locked)>=C.reverseSafe;
  if(!a.fireCue)executionCue(a);impactCue('guided',a);
  if(safe){t.coreOpen=C.core.openSeconds;g.log('유도 돌진 회피 · 추진 코어 노출','hot');g.showBanner('CORE EXPOSED','로켓 추진부가 열린다');}
  else hitAdjacent((a.locked+1)/2,C.damage.guidedCharge,2,'유도 돌진');
 }
 function updateAttack(dt){
  const b=g.state.battle,t=b.titan10,a=t.attack;if(!a)return;
  if(a.type==='guided'){
   if(a.state==='tracking'){
    a.predicted=clamp(t.position+t.velocity*.9,-1,1);a.left-=dt;
    if(a.left<=0){a.state='locked';a.locked=a.predicted;a.left=C.telegraph.guidedLock;a.total=C.telegraph.guidedLock;a.fireCue=false;g.playSound?.('alarm');}
    return;
   }
   if(1-a.left/a.total>=.46)executionCue(a);
   a.left-=dt;if(a.left<=0){resolveGuided(a);t.attack=null;t.next=C.interval[2]+(t.coreOpen>0?t.coreOpen:0);}
   return;
  }
  const progress=1-a.left/a.total;
  if(progress>=.48&&['missile','laser','predictiveMissile','railCrush','arm','exhaust','debris','trackDebris'].includes(a.type))executionCue(a);
  a.left-=dt;if(a.left<=0){resolvePattern(a);t.attack=null;t.next=C.interval[b.phase-1];}
 }

 const oldSpecial=g.updateSpecialEnemy?.bind(g);
 g.updateSpecialEnemy=function(e,dt){
  if(e?.titanSwitch10)return true;
  if(e?.titanDrone10){
   if(e.boarded)return oldSpecial?.(e,dt)||false;
   const car=this.state.cars[e.targetCar];if(!car||car.hp<=0){const target=intactCars()[0];if(!target){e.dead=true;return true;}e.targetCar=target.index;}
   if(e.titanDroneState==='approach'){
    e.approachLeft=Math.max(0,e.approachLeft-dt);e.x=.22+.58*(e.approachLeft/e.approachTotal);
    if(e.approachLeft<=0){e.titanDroneState='cut';e.x=B.battle.boardDistance+.01;this.playSound?.('boardingAlarm');this.log(`${this.state.cars[e.targetCar].name} · 강습 드론 외벽 절단`,'bad');}
    return true;
   }
   if(e.titanDroneState==='cut'){
    e.cutLeft=Math.max(0,e.cutLeft-dt);
    if(e.cutLeft<=0){e.boarded=true;e.x=B.battle.boardDistance;e.attackTimer=e.interval;this.onBoarding?.(e);this.log(`${e.name} 침입!`,'bad');}
    return true;
   }
  }
  return oldSpecial?.(e,dt)||false;
 };
 const oldEnemyAttack=g.enemyAttack.bind(g);
 g.enemyAttack=function(e){
  if(e?.titanDrone10){const car=this.state.cars[e.targetCar];if(!car)return;const saved=e.carDamage;e.carDamage=car.maxHp*C.drone.facilityRate;const r=oldEnemyAttack(e);e.carDamage=saved;return r;}
  return oldEnemyAttack(e);
 };

 const oldPick=g.pickTurretTarget.bind(g);
 g.pickTurretTarget=function(ci,turret){
  if(!active())return oldPick(ci,turret);
  const b=this.state.battle,t=b?.titan10,focus=this.state.orders.focus,sw=switchTarget();
  // Rail-crush switches remain a Focus Fire-only environmental target.
  if(sw&&focus.active>0&&focus.target===sw.id)return sw;

  // During the actual chase every turret can engage TITAN regardless of world distance,
  // its normal min/max range, or the relative chase position.  The currently focused
  // TITAN part still wins when Focus Fire is active.
  if(t&&!t.intro&&!t.transition&&b.phaseTransition09<=0){
   const parts=(b.parts||[]).filter(p=>p.titanPart09&&p.phase===b.phase&&alive(p));
   if(focus.active>0&&focus.target){const chosen=parts.find(p=>p.id===focus.target);if(chosen)return chosen;}
   const vulnerable=t.vulnerableLeft>0&&t.vulnerablePart?parts.find(p=>p.type===t.vulnerablePart):null;
   const victory=parts.find(p=>p.victory);
   const body=parts.find(p=>!p.weapon);
   const target=vulnerable||victory||body||parts[0];
   if(target)return target;
  }

  // Keep the switch out of autonomous targeting when it is not explicitly focused.
  if(!sw)return oldPick(ci,turret);
  const arr=this.state.enemies,idx=arr.indexOf(sw);if(idx>=0)arr.splice(idx,1);
  try{return oldPick(ci,turret);}finally{if(idx>=0)arr.splice(idx,0,sw);}
 };

 const oldDamage=g.damageEnemy.bind(g);
 g.damageEnemy=function(target,amount,pierce=0){
  if(target?.titanSwitch10){
   if(!active())return;
   const focus=this.state.orders.focus;if(!(focus.active>0&&focus.target===target.id))return;
   target.hp=Math.max(0,target.hp-amount);target.hitFlash=.2;
   if(target.hp<=0&&!target.dead){target.dead=true;const t=this.state.battle.titan10;t.lane=1-t.lane;t.switchChanged=true;t.switchId=null;focus.target=null;this.log('선로 변환 장치 작동 · 열차 선로 변경','hot');this.playSound?.('purchase');}
   return;
  }
  if(!target?.titanPart09)return oldDamage(target,amount,pierce);
  if(!active()||!alive(target)||target.phase!==this.state.battle.phase||this.state.battle.phaseTransition09>0||this.state.battle.titan10?.intro||this.state.battle.titan10?.transition)return;
  const b=this.state.battle,t=b.titan10;
  if(target.type==='titanCore'){
   if(t.coreOpen<=0)return;
   if(t.finale){const focus=this.state.orders.focus;if(!(focus.active>0&&focus.target===target.id))return;}
  }
  let mult=1;if(t.vulnerableLeft>0&&target.type===t.vulnerablePart)mult=1.35;
  const before=target.hp;
  oldDamage(target,amount*mult,pierce);
  // Safety fallback: no generic boss wrapper is allowed to nullify TITAN damage.
  // This also protects old saves that still carry bossPart/rework flags from pre-hotfix builds.
  if(target.hp===before&&amount>0&&alive(target)){
   const mitigation=clamp((target.armor||0)*(1-clamp(pierce||0,0,1)),0,.9);
   const dealt=Math.max(0,amount*mult*(1-mitigation));
   target.hp=Math.max(0,before-dealt);target.hitFlash=B.feedback?.enemyFlashSeconds||.16;this.playSound?.('hit');
   if(target.hp<=0){target.hp=0;target.destroyed=true;this.log(`TITAN ${target.name} 파괴`,'hot');}
  }
  // Keep legacy shared HP informational only; TITAN phase progression is driven by the real part HP below.
  b.sharedHp=b.parts.filter(p=>p.phase===b.phase).reduce((sum,p)=>sum+Math.max(0,p.hp||0),0);
  return before-target.hp;
 };

 const oldRange=g.targetInRange.bind(g);
 g.targetInRange=function(e,r){
  if(e?.titanPart09){
   if(!active()||e.phase!==this.state.battle.phase||this.state.battle.phaseTransition09>0||this.state.battle.titan10?.intro||this.state.battle.titan10?.transition)return false;
   return true;
  }
  return oldRange(e,r);
 };
 const oldOnScreen=g.enemyOnScreen?.bind(g);
 if(oldOnScreen)g.enemyOnScreen=function(e){
  if(e?.titanPart09&&active()&&e.phase===this.state.battle.phase&&this.state.battle.phaseTransition09<=0&&!this.state.battle.titan10?.intro&&!this.state.battle.titan10?.transition)return true;
  return oldOnScreen(e);
 };

 const oldProject=g.projectBossEntity?.bind(g);
 g.projectBossEntity=function(e,w,h){
  const b=this.state?.battle,t=b?.titan10,phase=b?.phase||1;
  if(e?.titanSwitch10){
   const a=attackOf(),p=a?.type==='railCrush'?clamp(1-a.left/a.total,0,1):1;
   return{x:w*(.84-.10*p),y:chaseTrackY(h,2,a?.lane??t?.lane??0)-22,r:34,scale:.9};
  }
  if(e?.titanDrone10&&!e.boarded){
   if(!t)return oldProject?.(e,w,h);
   const displayPhase=visualPhase(),scale=miniTrainScale(w),targetX=chaseTrainX(w,t.position),targetTrack=chaseTrackY(h,displayPhase,t.laneVisual??t.lane??0),targetY=targetTrack-40*scale;
   const p=e.titanDroneState==='approach'?1-e.approachLeft/e.approachTotal:1;
   const source=titanAnchor(w,h,displayPhase,titanVisual(w).offset);
   return{x:source.x+(targetX-source.x)*clamp(p,0,1),y:source.y+(targetY-source.y)*clamp(p,0,1),r:24,scale:.8};
  }
  if(e?.titanPart09){
   if(t?.intro||t?.transition)return{x:-9999,y:-9999,r:0,scale:1};
   return titanPartScreen(e,w,h)||{x:-9999,y:-9999,r:0,scale:1};
  }
  return oldProject?.(e,w,h);
 };
 const oldRenderCars=g.renderCars.bind(g);
 g.renderCars=function(){
  const r=oldRenderCars();document.querySelectorAll('.titan-drone-target10').forEach(el=>el.classList.remove('titan-drone-target10'));
  if(active()){const targets=new Set(this.state.enemies.filter(e=>e.titanDrone10&&!e.dead&&!e.boarded).map(e=>e.targetCar));for(const i of targets)document.querySelector(`[data-car-index="${i}"]`)?.classList.add('titan-drone-target10');}
  return r;
 };

 const oldInspect=g.inspectEnemy.bind(g);
 g.inspectEnemy=function(e){
  if(e?.titanSwitch10){document.querySelector('#inspector').innerHTML=`<h3>선로 변환 장치</h3><p>내구 ${Math.ceil(e.hp)} / ${Math.ceil(e.maxHp)}</p><p>타이탄의 공격 전방에서 접근 중인 선로 설비.</p>`;return;}
  if(!e?.titanPart09)return oldInspect(e);
  const t=this.state.battle.titan10,locked=e.type==='titanCore'&&t.coreOpen<=0;
  document.querySelector('#inspector').innerHTML=`<h3>TITAN · ${e.name}</h3><p>HP ${Math.ceil(e.hp)} / ${Math.ceil(e.maxHp)} · 장갑 ${Math.round(e.armor*100)}%</p><p>${locked?'장갑판이 닫혀 있어 현재 피해를 줄 수 없습니다.':t.vulnerableLeft>0&&t.vulnerablePart===e.type?'공격 직후 구조가 노출되어 있습니다.':'공격 가능한 타이탄 부위입니다.'}</p>`;
 };

 function updatePhaseTransition(dt){
  const b=g.state.battle,t=b.titan10,tr=t.transition;if(!tr)return false;
  const realDt=dt/Math.max(.01,g.state.speed||1);tr.elapsed+=realDt;b.phaseTransition09=Math.max(0,shiftTotal()-tr.elapsed);
  if(!tr.swapped&&tr.elapsed>=PHASE_SHIFT.exit+PHASE_SHIFT.gap){tr.swapped=true;activatePhase(tr.to);g.showBanner(`TITAN · PHASE ${tr.to}`,tr.to===2?'무한궤도 전개 · 복선 진입':'몸통 분리 · 로켓 추격');}
  if(tr.elapsed>=shiftTotal()){t.transition=null;b.phaseTransition09=0;t.next=1.5;}
  return true;
 }

 const oldBossUpdate=g.updateBoss.bind(g);
 g.updateBoss=function(dt){
  if(!active())return oldBossUpdate(dt);
  const b=this.state.battle,t=titanState();if(!t)return;
  if(b.defeated){b.defeatFadeLeft-=dt;return;}
  t.vulnerableLeft=Math.max(0,t.vulnerableLeft-dt);t.coreOpen=Math.max(0,t.coreOpen-dt);updateTitanFx(dt);
  if(t.vulnerableLeft<=0)t.vulnerablePart=null;
  if(t.intro)return;
  if(updatePhaseTransition(dt))return;
  if(b.phase===3){const core=b.parts.find(p=>p.type==='titanCore');t.finale=!!core&&core.hp/core.maxHp<=C.core.finaleRatio;}
  updateAttack(dt);if(t.attack)return;
  t.next-=dt;if(t.next<=0)nextPattern();
 };

 const oldCheck=g.checkBattleState.bind(g);
 g.checkBattleState=function(){
  if(!active())return oldCheck();
  const s=this.state,b=s.battle,t=titanState();if(!t)return;
  if(t.intro||t.transition)return;
  if(s.cars.every(c=>c.hp<=0))return this.gameOver('TITAN의 공격으로 모든 객차가 파괴되었습니다.');
  if(this.hasTrainMod?.('captain')&&s.crew.some(c=>c.captain&&c.dead))return this.gameOver('현장 열차장이 사망했습니다.');
  if(b.defeated){if(b.defeatFadeLeft<=0)this.bossClear();return;}
  let down=false;
  if(b.phase===1)down=b.parts.filter(p=>p.phase===1).every(p=>p.destroyed);
  else if(b.phase===2)down=!!b.parts.find(p=>p.type==='titanBody')?.destroyed;
  else down=!!b.parts.find(p=>p.type==='titanCore')?.destroyed;
  if(!down)return;
  if(b.phase<3){phase(b.phase+1);return;}
  b.defeated=true;b.defeatFadeLeft=2.4;b.titan10.attack=null;this.showBanner('TITAN DESTROYED','추격의 끝');
 };

 function rounded(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
 function warningZone(ctx,x,y,w,h,color='#ff3b30'){
  ctx.save();ctx.globalAlpha=.14+.12*(.5+.5*Math.sin(g.state.battle.elapsed*9));ctx.fillStyle=color;rounded(ctx,x,y,w,h,12);ctx.fill();ctx.globalAlpha=.8;ctx.strokeStyle=color;ctx.lineWidth=2;ctx.setLineDash([9,6]);rounded(ctx,x,y,w,h,12);ctx.stroke();ctx.restore();
 }
 function introStage(t){
  if(!t.intro)return null;const e=t.intro.elapsed;
  if(e<INTRO.reverse)return{name:'reverse',p:clamp(e/INTRO.reverse,0,1)};
  if(e<INTRO.reverse+INTRO.stop)return{name:'stop',p:clamp((e-INTRO.reverse)/INTRO.stop,0,1)};
  if(e<INTRO.reverse+INTRO.stop+INTRO.zoom)return{name:'zoom',p:clamp((e-INTRO.reverse-INTRO.stop)/INTRO.zoom,0,1)};
  if(e<INTRO.reverse+INTRO.stop+INTRO.zoom+INTRO.enter)return{name:'enter',p:clamp((e-INTRO.reverse-INTRO.stop-INTRO.zoom)/INTRO.enter,0,1)};
  return{name:'launch',p:clamp((e-INTRO.reverse-INTRO.stop-INTRO.zoom-INTRO.enter)/INTRO.launch,0,1)};
 }
 function visualPhase(){
  const b=g.state.battle,t=b.titan10,tr=t.transition;
  if(!tr)return b.phase;
  return tr.swapped?tr.to:tr.from;
 }
 function titanVisual(w){
  const b=g.state.battle,t=b.titan10,intro=introStage(t),tr=t.transition;
  if(intro){
   if(['reverse','stop','zoom'].includes(intro.name))return{visible:false,phase:1,offset:-w*.42};
   if(intro.name==='enter')return{visible:true,phase:1,offset:-w*.42*(1-(intro.p*intro.p*(3-2*intro.p)))};
   return{visible:true,phase:1,offset:0};
  }
  if(tr){
   if(tr.elapsed<PHASE_SHIFT.exit){const p=clamp(tr.elapsed/PHASE_SHIFT.exit,0,1);return{visible:true,phase:tr.from,offset:-w*.43*(p*p*(3-2*p))};}
   if(tr.elapsed<PHASE_SHIFT.exit+PHASE_SHIFT.gap)return{visible:false,phase:tr.from,offset:-w*.43};
   const p=clamp((tr.elapsed-PHASE_SHIFT.exit-PHASE_SHIFT.gap)/PHASE_SHIFT.enter,0,1);return{visible:true,phase:tr.to,offset:-w*.43*(1-(p*p*(3-2*p)))};
  }
  return{visible:true,phase:b.phase,offset:0};
 }
 function drawMiniTrain(ctx,w,h){
  const b=g.state.battle,t=b.titan10,phase=visualPhase(),intro=introStage(t);let introOffset=0;
  if(intro){if(intro.name==='reverse')introOffset=-w*.18*intro.p;else if(['stop','zoom','enter'].includes(intro.name))introOffset=-w*.18;else introOffset=-w*.18*(1-intro.p);}
  const scale=miniTrainScale(w),trackY=chaseTrackY(h,phase,t.laneVisual??t.lane??0),x=chaseTrainX(w,t.position)+introOffset,y=trackY-40*scale;
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.fillStyle='#233e46';ctx.strokeStyle='#8fa19a';ctx.lineWidth=2;rounded(ctx,-170,-24,340,48,10);ctx.fill();ctx.stroke();
  ctx.fillStyle='#5c746f';for(let i=0;i<3;i++){rounded(ctx,-145+i*94,-15,74,23,4);ctx.fill();}
  ctx.fillStyle='#d3b46e';ctx.fillRect(105,-16,42,8);
  const wheelAngle=(t.travelClock||0)*5.6;for(let i=0;i<6;i++){const wx=-135+i*54,wy=29;ctx.fillStyle='#1b2427';ctx.beginPath();ctx.arc(wx,wy,11,0,Math.PI*2);ctx.fill();ctx.save();ctx.translate(wx,wy);ctx.rotate(wheelAngle+i*.17);ctx.strokeStyle='#7d8a84';ctx.lineWidth=2;for(let k=0;k<4;k++){ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,8);ctx.stroke();ctx.rotate(Math.PI/2);}ctx.restore();}
  ctx.fillStyle='#e8d8ae';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillText('LAST RAIL',0,-34);ctx.restore();
  return{x,y,trackY,scale};
 }
 function drawTracks(ctx,w,h){
  const b=g.state.battle,t=b.titan10,phase=visualPhase(),dual=phase===2,ys=dual?[chaseTrackY(h,2,0),chaseTrackY(h,2,1)]:[chaseTrackY(h,phase,0)],spacing=34,shift=(((t.travelClock||0)*26)%spacing+spacing)%spacing;ctx.save();ctx.lineWidth=3;
  const x0=w*CHASE.railLeft,x1=w*CHASE.railRight;
  for(const y of ys){ctx.strokeStyle='#54605d';ctx.beginPath();ctx.moveTo(x0,y);ctx.lineTo(x1,y);ctx.stroke();ctx.strokeStyle='#252e2e';for(let x=x0-shift;x<x1;x+=spacing){ctx.beginPath();ctx.moveTo(x,y-5);ctx.lineTo(x+10,y+5);ctx.stroke();}}
  if(dual){const y=chaseTrackY(h,2,t.laneVisual??t.lane??0);ctx.strokeStyle='#d0b16f';ctx.lineWidth=2;ctx.globalAlpha=.65;ctx.beginPath();ctx.moveTo(w*.48,y);ctx.lineTo(x1,y);ctx.stroke();}
  ctx.restore();
 }
 function titanPanel(ctx,x,y,w,h,r=10,fill='#6c6c67',stroke='#263032',lw=4){
  ctx.fillStyle=fill;ctx.strokeStyle=stroke;ctx.lineWidth=lw;rounded(ctx,x,y,w,h,r);ctx.fill();ctx.stroke();
 }
 function titanChamfer(ctx,x,y,w,h,cut=16,fill='#6c6c67',stroke='#263032',lw=4){
  ctx.save();ctx.fillStyle=fill;ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.beginPath();
  ctx.moveTo(x+cut,y);ctx.lineTo(x+w-cut,y);ctx.lineTo(x+w,y+cut);ctx.lineTo(x+w,y+h-cut);ctx.lineTo(x+w-cut,y+h);ctx.lineTo(x+cut,y+h);ctx.lineTo(x,y+h-cut);ctx.lineTo(x,y+cut);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
 }
 function titanGlowSlot(ctx,x,y,w,h,color='#de9b52'){
  ctx.save();ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=14;rounded(ctx,x,y,w,h,Math.min(w,h)*.3);ctx.fill();ctx.restore();
 }
 function titanBoltLine(ctx,x,y,count,step,vertical=false,color='#454d4f'){
  ctx.save();ctx.fillStyle=color;for(let i=0;i<count;i++){ctx.beginPath();ctx.arc(x+(vertical?0:i*step),y+(vertical?i*step:0),2.4,0,Math.PI*2);ctx.fill();}ctx.restore();
 }
 function titanCable(ctx,points,color='#252d30',lw=6){
  if(points.length<2)return;ctx.save();ctx.strokeStyle=color;ctx.lineWidth=lw;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
  for(let i=1;i<points.length-1;i++){const mx=(points[i][0]+points[i+1][0])*.5,my=(points[i][1]+points[i+1][1])*.5;ctx.quadraticCurveTo(points[i][0],points[i][1],mx,my);}ctx.lineTo(points[points.length-1][0],points[points.length-1][1]);ctx.stroke();ctx.restore();
 }
 function titanTrackModule(ctx,x,y,w,h,wheels=7,fill='#4c524f'){
  titanChamfer(ctx,x,y,w,h,18,fill,'#263032',4);
  ctx.fillStyle='#20292a';rounded(ctx,x-8,y+h-4,w+16,18,8);ctx.fill();
  const step=w/(wheels+.2),wheelY=y+h*.6;for(let i=0;i<wheels;i++){
   const wx=x+step*.6+i*step;ctx.fillStyle='#70736c';ctx.beginPath();ctx.arc(wx,wheelY,18,0,Math.PI*2);ctx.fill();
   ctx.strokeStyle='#2a3335';ctx.lineWidth=3;ctx.beginPath();ctx.arc(wx,wheelY,8,0,Math.PI*2);ctx.stroke();
  }
  ctx.fillStyle='#1c2526';ctx.fillRect(x-10,y+h-14,w+20,8);
 }
 function drawTitanBody(ctx,w,h){
  const b=g.state.battle,t=b.titan10,a=t.attack,tt=b.elapsed,visual=titanVisual(w);if(!visual.visible)return;
  const phase=visual.phase,frozen=t.transition&&!t.transition.swapped,motionClock=frozen?t.transition.frozenVisual:(t.visualClock??tt),wheelClock=frozen?t.transition.frozenClock:(t.travelClock??tt),anchor=titanAnchor(w,h,phase,visual.offset);ctx.save();ctx.translate(anchor.x,anchor.y);ctx.scale(CHASE.titanScale,CHASE.titanScale);
  ctx.lineJoin='round';ctx.lineCap='round';
  if(phase===1){
   const stomp=a?.type==='stomp'?1-a.left/a.total:0,which=a?.leg==='titanLegL'?-1:1,walk=Math.sin(motionClock*2.4);
   const rearWalk=Math.sin(motionClock*2.4+Math.PI*.9);
   // rear support legs for scale/depth
   for(const side of [-1,1]){
    const lift=Math.max(0,side*rearWalk)*12;ctx.save();ctx.globalAlpha=.45;ctx.translate(side*156,-12-lift);ctx.scale(.84,.84);
    titanPanel(ctx,-26,-120,52,96,8,'#706d66','#273134',4);titanPanel(ctx,-18,-20,36,86,7,'#86837b','#2a3436',4);
    ctx.fillStyle='#363f41';ctx.beginPath();ctx.arc(0,-18,17,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(0,70,15,0,Math.PI*2);ctx.fill();
    titanChamfer(ctx,-40,68,80,30,10,'#7a766d','#283235',4);ctx.restore();
   }
   // PHASE 1 now carries the same fortress-like upper body seen before the track conversion.
   // It is deliberately the PHASE 2 hull with every tread/wheel assembly removed and mounted on the walking frame.
   ctx.save();ctx.translate(0,-112);
   titanChamfer(ctx,-156,-88,312,152,18,'#636863','#263032',5);
   titanChamfer(ctx,-104,-116,118,80,16,'#6c706d','#263032',5);
   titanPanel(ctx,-46,-68,92,114,12,'#4d5659','#1f292c',4);titanGlowSlot(ctx,-21,-50,42,78,'#d99953');
   titanChamfer(ctx,-218,-42,104,84,12,'#5a6163','#263032',4);
   titanChamfer(ctx,96,-34,118,92,14,'#5f6668','#263032',4);
   titanPanel(ctx,-256,-74,34,72,8,'#515a5d','#263032',4);
   titanPanel(ctx,-252,-120,12,46,4,'#414a4d','#263032',3);titanPanel(ctx,-236,-128,12,54,4,'#414a4d','#263032',3);titanPanel(ctx,-220,-118,12,44,4,'#414a4d','#263032',3);
   // Long main cannon and side gun make the walker read as the intact TITAN body, not only a pair of legs.
   titanChamfer(ctx,-8,-144,110,62,12,'#6f726e','#263032',4);
   titanPanel(ctx,86,-132,168,32,8,'#495254','#20292c',4);titanPanel(ctx,246,-128,38,40,6,'#5d6465','#20292c',4);
   titanChamfer(ctx,110,-40,96,70,12,'#72746f','#263032',4);
   titanPanel(ctx,188,-18,84,16,6,'#465052','#20292c',4);titanPanel(ctx,188,4,84,16,6,'#465052','#20292c',4);
   titanGlowSlot(ctx,136,-14,26,26,'#d99a55');
   // Walking-frame couplers replace the PHASE 2 tread mounts.
   titanChamfer(ctx,-128,46,86,38,10,'#555d5b','#242e31',4);titanChamfer(ctx,42,46,86,38,10,'#555d5b','#242e31',4);
   titanCable(ctx,[[-112,18],[-132,54],[-118,94]],'#232c30',7);titanCable(ctx,[[112,18],[132,54],[118,94]],'#232c30',7);
   titanBoltLine(ctx,-128,-18,8,30,false);ctx.restore();
   // armoured forelegs
   for(const side of [-1,1]){
    const lift=(a?.type==='stomp'&&side===which)?Math.sin(Math.min(1,stomp)*Math.PI)*55:Math.max(0,side*walk)*18;
    const lean=side===-1?-.08:.08;ctx.save();ctx.translate(side*96,-lift);
    ctx.fillStyle='#31393b';ctx.beginPath();ctx.arc(0,-96,23,0,Math.PI*2);ctx.fill();
    titanPanel(ctx,-34,-94,68,92,10,'#8a857d','#2a3436',4);
    ctx.save();ctx.translate(0,2);ctx.rotate(lean);titanPanel(ctx,-27,0,54,92,10,'#77746d','#2a3436',4);ctx.restore();
    ctx.fillStyle='#394244';ctx.beginPath();ctx.arc(0,2,18,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(0,98,17,0,Math.PI*2);ctx.fill();
    titanPanel(ctx,-22,96,44,92,9,'#8d8880','#2a3436',4);
    titanChamfer(ctx,-46,184,92,40,12,'#7d7971','#2a3436',4);
    titanPanel(ctx,-58,214,116,26,10,'#666962','#20292c',4);
    titanBoltLine(ctx,-18,16,5,16,false);
    ctx.restore();
    titanCable(ctx,[[side*70,-114],[side*96,-72],[side*92,-20],[side*90,58-lift*.15]],'#232c2f',6);
   }
   titanCable(ctx,[[-72,-108],[-118,-92],[-146,-54],[-144,22]],'#242d31',7);
   titanCable(ctx,[[72,-108],[118,-92],[146,-54],[144,22]],'#242d31',7);
   ctx.fillStyle='rgba(122,98,74,.26)';ctx.beginPath();ctx.ellipse(-112,236,54,19,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(112,236,54,19,0,0,Math.PI*2);ctx.fill();
  }else if(phase===2){
   const armLift=a?.type==='arm'?Math.sin((1-a.left/a.total)*Math.PI)*75:0;
   // track bases
   titanTrackModule(ctx,-220,48,170,94,4,'#5d625e');
   titanTrackModule(ctx,50,48,174,94,4,'#5d625e');
   titanTrackModule(ctx,-130,88,260,60,7,'#4d5451');
   // body fortress
   titanChamfer(ctx,-156,-88,312,152,18,'#636863','#263032',5);
   titanChamfer(ctx,-104,-116,118,80,16,'#6c706d','#263032',5);
   titanPanel(ctx,-46,-68,92,114,12,'#4d5659','#1f292c',4);titanGlowSlot(ctx,-21,-50,42,78,'#d99953');
   titanChamfer(ctx,-218,-42,104,84,12,'#5a6163','#263032',4);
   titanChamfer(ctx,96,-34,118,92,14,'#5f6668','#263032',4);
   titanPanel(ctx,-256,-74,34,72,8,'#515a5d','#263032',4);
   titanPanel(ctx,-252,-120,12,46,4,'#414a4d','#263032',3);titanPanel(ctx,-236,-128,12,54,4,'#414a4d','#263032',3);titanPanel(ctx,-220,-118,12,44,4,'#414a4d','#263032',3);
   // main cannon
   titanChamfer(ctx,-8,-144,110,62,12,'#6f726e','#263032',4);
   titanPanel(ctx,86,-132,168,32,8,'#495254','#20292c',4);titanPanel(ctx,246,-128,38,40,6,'#5d6465','#20292c',4);
   // side turret / head gun
   titanChamfer(ctx,110,-40,96,70,12,'#72746f','#263032',4);
   titanPanel(ctx,188,-18,84,16,6,'#465052','#20292c',4);titanPanel(ctx,188,4,84,16,6,'#465052','#20292c',4);
   if(a?.type==='laser'){
    const p=1-a.left/a.total;titanGlowSlot(ctx,132,-18,34,34,`rgba(255,96,74,${.58+.42*p})`);ctx.save();ctx.globalAlpha=.35+.45*p;ctx.strokeStyle='#ff584b';ctx.lineWidth=3;ctx.beginPath();ctx.arc(150,-1,26+22*p,0,Math.PI*2);ctx.stroke();ctx.restore();
   }else titanGlowSlot(ctx,136,-14,26,26,'#d99a55');
   // demolisher arm
   ctx.save();ctx.translate(-176,-8-armLift);ctx.rotate(-.34);titanPanel(ctx,-28,-18,56,132,10,'#7a776f','#263032',4);ctx.fillStyle='#31393b';ctx.beginPath();ctx.arc(0,-10,18,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(0,112,17,0,Math.PI*2);ctx.fill();titanChamfer(ctx,-18,108,36,46,8,'#5c605c','#263032',4);ctx.restore();
   titanCable(ctx,[[-106,-20],[-146,0],[-166,32],[-182,86-armLift*.2]],'#232c30',7);
   // underbody details
   titanPanel(ctx,-186,26,56,28,8,'#4a5356','#20292c',3);titanPanel(ctx,-112,28,42,24,8,'#4a5356','#20292c',3);titanPanel(ctx,64,30,44,24,8,'#4a5356','#20292c',3);
  }else{
   const charge=a?.type==='guided'?1-a.left/a.total:0;
   // damaged flying head / core block
   titanChamfer(ctx,-96,-88,192,146,22,'#6a6d68','#263032',5);
   titanChamfer(ctx,-62,-54,124,104,16,'#4a5255','#20292c',4);titanGlowSlot(ctx,-26,-42,52,88,t.coreOpen>0?'#ffd07b':'#de9851');
   titanPanel(ctx,-132,-38,44,74,10,'#5b6366','#263032',4);titanPanel(ctx,88,-34,44,78,10,'#5b6366','#263032',4);
   // thruster pods
   for(const side of [-1,1]){
    ctx.save();ctx.translate(side*132,-2);titanChamfer(ctx,-38,-34,76,68,12,'#666a66','#263032',4);titanPanel(ctx,-30,-26,60,52,10,'#51585b','#20292c',4);titanGlowSlot(ctx,-20,-12,40,24,'#ff9a4c');
    ctx.fillStyle='#ff8d45';ctx.globalAlpha=.95;ctx.beginPath();ctx.moveTo(side<0?-12:12,34);ctx.lineTo(side<0?-58:58,124+Math.sin(tt*18+side)*10);ctx.lineTo(side<0?18:-18,42);ctx.closePath();ctx.fill();ctx.restore();
   }
   titanPanel(ctx,-24,-126,48,42,8,'#5f6669','#263032',4);titanPanel(ctx,-8,-154,8,28,4,'#384144','#263032',3);titanPanel(ctx,10,-154,8,28,4,'#384144','#263032',3);titanPanel(ctx,28,-148,8,22,4,'#384144','#263032',3);
   // exposed wreckage / hanging claws
   titanCable(ctx,[[72,-10],[102,10],[124,48],[136,82]],'#232c2f',7);titanCable(ctx,[[58,2],[88,24],[98,64],[96,92]],'#232c2f',6);titanCable(ctx,[[-28,36],[-22,72],[-10,98]],'#232c2f',6);
   ctx.fillStyle='#2f373a';ctx.beginPath();ctx.moveTo(86,-42);ctx.lineTo(128,-68);ctx.lineTo(114,-8);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(104,30);ctx.lineTo(138,54);ctx.lineTo(92,70);ctx.closePath();ctx.fill();
   if(a?.type==='guided'){ctx.strokeStyle='#ff5145';ctx.globalAlpha=.45+.5*charge;ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-6,102+charge*24,0,Math.PI*2);ctx.stroke();}
  }
  ctx.restore();
 }
 function smoothstep(t){t=clamp(t,0,1);return t*t*(3-2*t);}
 function drawProjectile(ctx,fromX,fromY,toX,toY,p,kind='missile'){
  const q=smoothstep(p),x=fromX+(toX-fromX)*q,y=fromY+(toY-fromY)*q;
  ctx.save();ctx.lineCap='round';ctx.globalAlpha=.96;
  const dx=x-fromX,dy=y-fromY,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len;
  const trail=kind==='laser'?0:44;
  if(trail){ctx.strokeStyle='#ffb0a9';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x-ux*trail,y-uy*trail);ctx.lineTo(x,y);ctx.stroke();}
  ctx.translate(x,y);ctx.rotate(Math.atan2(dy,dx));ctx.fillStyle=kind==='predictive'?'#ff3b30':'#ff594d';ctx.beginPath();ctx.moveTo(13,0);ctx.lineTo(-10,-6);ctx.lineTo(-6,0);ctx.lineTo(-10,6);ctx.closePath();ctx.fill();
  ctx.fillStyle='#ffd2c9';ctx.beginPath();ctx.arc(7,0,3,0,Math.PI*2);ctx.fill();ctx.restore();
 }
 function drawExplosion(ctx,x,y,r,p){
  const q=clamp(p,0,1),fade=1-q;ctx.save();ctx.globalCompositeOperation='lighter';
  ctx.globalAlpha=fade;ctx.fillStyle='#ff3b30';ctx.beginPath();ctx.arc(x,y,r*(.28+.72*q),0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=.9*fade;ctx.strokeStyle='#ffd0c7';ctx.lineWidth=4;ctx.beginPath();ctx.arc(x,y,r*(.55+1.15*q),0,Math.PI*2);ctx.stroke();
  ctx.globalAlpha=.65*fade;ctx.strokeStyle='#ff6257';ctx.lineWidth=2;for(let i=0;i<8;i++){const a=i*Math.PI/4+q*.7;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*r*.35,y+Math.sin(a)*r*.35);ctx.lineTo(x+Math.cos(a)*r*(1.2+q),y+Math.sin(a)*r*(1.2+q));ctx.stroke();}
  ctx.restore();
 }
 function drawShockwave(ctx,x,y,rx,ry,p){
  const q=clamp(p,0,1);ctx.save();ctx.globalAlpha=(1-q)*.9;ctx.strokeStyle='#ff4a3d';ctx.lineWidth=5*(1-q)+1;ctx.beginPath();ctx.ellipse(x,y,rx*(.2+.8*q),ry*(.2+.8*q),0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=(1-q)*.25;ctx.fillStyle='#ff3b30';ctx.beginPath();ctx.ellipse(x,y,rx*(.16+.72*q),ry*(.12+.5*q),0,0,Math.PI*2);ctx.fill();ctx.restore();
 }
 function attackScreenPoint(w,h,fx){
  const b=g.state.battle,t=b.titan10,phase=visualPhase(),trainY=chaseTrackY(h,phase,t.laneVisual??t.lane??0)-40*miniTrainScale(w);
  if(fx.position!==undefined)return{x:chaseTrainX(w,fx.position),y:trainY};
  if(fx.zone==='front')return{x:w*.73,y:trainY};
  if(fx.zone==='rear')return{x:w*.50,y:trainY};
  return{x:w*.62,y:trainY};
 }
 function drawTitanAttackFx(ctx,w,h){
  const t=titanState();if(!t?.fx?.length)return;ctx.save();
  for(const fx of t.fx){
   const p=clamp(fx.age/fx.life,0,1),pt=attackScreenPoint(w,h,fx);
   if(fx.kind==='blast')drawExplosion(ctx,pt.x,pt.y,42,p);
   else if(fx.kind==='stomp'){
    const phase=1,visual=titanVisual(w),anchor=titanAnchor(w,h,phase,visual.offset),side=fx.leg==='titanLegR'?1:-1,footX=anchor.x+side*78*CHASE.titanScale,ground=chaseTrackY(h,1,0)-4;
    drawShockwave(ctx,footX,ground,170,48,p);drawExplosion(ctx,footX,ground-2,28,p);
   }else if(fx.kind==='walk'){
    const anchor=titanAnchor(w,h,1,titanVisual(w).offset),ground=chaseTrackY(h,1,0)-4;drawShockwave(ctx,anchor.x,ground,120,32,p);
   }else if(fx.kind==='debris'||fx.kind==='trackDebris'){
    for(let i=0;i<7;i++){const x=w*(.38+i*.07),y=chaseTrackY(h,visualPhase(),0)-8;drawExplosion(ctx,x,y,16+(i%3)*4,clamp(p+i*.03,0,1));}
   }else if(fx.kind==='slam'){
    drawShockwave(ctx,pt.x,pt.y+20,150,44,p);drawExplosion(ctx,pt.x,pt.y,38,p);
   }else if(fx.kind==='laser'){
    const source=titanAnchor(w,h,visualPhase(),titanVisual(w).offset);ctx.save();ctx.globalAlpha=(1-p)*.95;ctx.strokeStyle='#ff2118';ctx.lineWidth=18*(1-p)+4;ctx.beginPath();ctx.moveTo(source.x+96*CHASE.titanScale,source.y-62*CHASE.titanScale);ctx.lineTo(pt.x,pt.y);ctx.stroke();ctx.strokeStyle='#ffd4cf';ctx.lineWidth=5;ctx.stroke();ctx.restore();drawExplosion(ctx,pt.x,pt.y,30,p);
   }else if(fx.kind==='railCrush'){
    const y=chaseTrackY(h,2,fx.lane??0);ctx.save();ctx.globalAlpha=(1-p)*.9;ctx.fillStyle='#ff2a20';ctx.fillRect(w*CHASE.railLeft,y-24,w*(CHASE.railRight-CHASE.railLeft),48);ctx.restore();for(let i=0;i<8;i++)drawExplosion(ctx,w*(CHASE.railLeft+.05+i*.11),y,22,p);
   }else if(fx.kind==='droneLaunch'){
    const source=titanAnchor(w,h,2,titanVisual(w).offset);drawShockwave(ctx,source.x+120*CHASE.titanScale,source.y-30*CHASE.titanScale,85,45,p);
   }else if(fx.kind==='exhaust'){
    const source=titanAnchor(w,h,3,titanVisual(w).offset);ctx.save();ctx.globalAlpha=(1-p)*.9;ctx.fillStyle='#ff3b30';ctx.beginPath();ctx.moveTo(source.x-75*CHASE.titanScale,source.y+25*CHASE.titanScale);ctx.lineTo(pt.x-90,pt.y+28);ctx.lineTo(pt.x+45,pt.y-28);ctx.closePath();ctx.fill();ctx.restore();drawShockwave(ctx,pt.x,pt.y,115,42,p);
   }else if(fx.kind==='guidedCrash'){
    drawExplosion(ctx,pt.x,pt.y,58,p);drawShockwave(ctx,pt.x,pt.y+18,210,58,p);
   }
  }
  ctx.restore();
 }
 function drawPatternTelegraph(ctx,w,h,train){
  const b=g.state.battle,t=b.titan10,a=t.attack;if(!a)return;const rearX=w*.50,frontX=w*.73,zoneW=w*.20,zoneH=h*.10,y=train.y-zoneH*.45,phase=visualPhase(),source=titanAnchor(w,h,phase,titanVisual(w).offset);
  ctx.save();
  if(['stomp','arm','exhaust'].includes(a.type))warningZone(ctx,rearX-zoneW*.5,y,zoneW,zoneH,a.type==='exhaust'?'#ff453a':'#ff3b30');
  if(['missile','laser'].includes(a.type))warningZone(ctx,frontX-zoneW*.5,y,zoneW,zoneH,a.type==='laser'?'#ff2d20':'#ff453a');
  if(a.type==='missile'){
   const progress=1-a.left/a.total;ctx.strokeStyle='#ff4a3d';ctx.lineWidth=4;ctx.setLineDash([12,8]);ctx.beginPath();ctx.moveTo(source.x,source.y-h*.12);ctx.lineTo(frontX,train.y);ctx.stroke();
   if(progress>.42)drawProjectile(ctx,source.x,source.y-h*.12,frontX,train.y,(progress-.42)/.58,'missile');
  }
  if(a.type==='laser'){
   ctx.strokeStyle='#ff3328';ctx.lineWidth=3;ctx.globalAlpha=.65+.25*Math.sin(b.elapsed*12);ctx.beginPath();ctx.moveTo(source.x+96*CHASE.titanScale,source.y-62*CHASE.titanScale);ctx.lineTo(w*.80,train.y);ctx.stroke();
  }
  if(a.type==='railCrush'){
   const laneY=chaseTrackY(h,2,a.lane),progress=1-a.left/a.total;warningZone(ctx,w*CHASE.railLeft,laneY-h*.028,w*(CHASE.railRight-CHASE.railLeft),h*.056,'#ff3028');ctx.fillStyle='#ff766b';ctx.font='bold 12px sans-serif';ctx.fillText('TRACK IMPACT',w*.51,laneY-12);
   ctx.strokeStyle='#ff392f';ctx.lineWidth=3+progress*5;ctx.globalAlpha=.35+.45*progress;ctx.beginPath();ctx.moveTo(source.x,source.y);ctx.lineTo(w*.60,laneY);ctx.stroke();ctx.globalAlpha=1;
  }
  if(a.type==='predictiveMissile'){
   const x=chaseTrainX(w,a.predicted),progress=1-a.left/a.total;warningZone(ctx,x-55,train.y-42,110,84,'#ff3b30');ctx.strokeStyle='#ff5145';ctx.setLineDash([8,6]);ctx.beginPath();ctx.moveTo(source.x,source.y-h*.08);ctx.lineTo(x,train.y);ctx.stroke();
   if(progress>.42)drawProjectile(ctx,source.x,source.y-h*.08,x,train.y,(progress-.42)/.58,'predictive');
  }
  if(a.type==='guided'){
   const p=a.state==='tracking'?a.predicted:a.locked,x=chaseTrainX(w,p);ctx.strokeStyle=a.state==='locked'?'#ff2018':'#ff6257';ctx.lineWidth=a.state==='locked'?4:2;ctx.setLineDash(a.state==='locked'?[4,3]:[10,7]);ctx.beginPath();ctx.moveTo(source.x,source.y);ctx.lineTo(x,train.y);ctx.stroke();warningZone(ctx,x-68,train.y-44,136,88,a.state==='locked'?'#ff2018':'#ff4a3d');ctx.fillStyle='#ffd0cc';ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.fillText(a.state==='locked'?'LOCK':'PREDICT',x,train.y-52);
  }
  if(a.type==='arm'){
   const progress=1-a.left/a.total;ctx.strokeStyle='#ff4137';ctx.lineWidth=3;ctx.globalAlpha=.35+.45*progress;ctx.beginPath();ctx.moveTo(source.x-125*CHASE.titanScale,source.y-55*CHASE.titanScale);ctx.lineTo(rearX,train.y);ctx.stroke();ctx.globalAlpha=1;
  }
  if(a.type==='exhaust'){
   const progress=1-a.left/a.total;ctx.fillStyle=`rgba(255,45,32,${.18+.42*progress})`;ctx.beginPath();ctx.moveTo(source.x-76*CHASE.titanScale,source.y+26*CHASE.titanScale);ctx.lineTo(rearX-zoneW*.45,train.y+zoneH*.35);ctx.lineTo(rearX+zoneW*.25,train.y-zoneH*.35);ctx.closePath();ctx.fill();
  }
  if(a.type==='debris'||a.type==='trackDebris'){
   const progress=1-a.left/a.total;ctx.strokeStyle='#ff5a4dcc';ctx.lineWidth=2;ctx.fillStyle='#ff5a4d99';for(let i=0;i<11;i++){const x=w*(.36+((i*79)%40)/100),startY=h*(.23+((i*37)%10)/100),yy=startY+(train.y-startY)*smoothstep(progress*.9);ctx.beginPath();ctx.moveTo(x-8,yy-22);ctx.lineTo(x,yy);ctx.stroke();ctx.beginPath();ctx.arc(x,yy,3+(i%4),0,Math.PI*2);ctx.fill();}
  }
  ctx.restore();
 }
 function drawDroneWarnings(ctx,w,h){
  const drones=g.state.enemies.filter(e=>e.titanDrone10&&!e.dead&&!e.boarded);if(!drones.length)return;ctx.save();
  for(const e of drones){const p=g.projectBossEntity(e,w,h);ctx.strokeStyle=e.titanDroneState==='cut'?'#ff241a':'#ff5a4d';ctx.lineWidth=2;ctx.setLineDash([5,4]);ctx.beginPath();ctx.arc(p.x,p.y,24,0,Math.PI*2);ctx.stroke();if(e.titanDroneState==='cut'){ctx.fillStyle='#ffd0cc';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillText(`CUT ${e.cutLeft.toFixed(1)}`,p.x,p.y-31);}}
  ctx.restore();
 }
 function drawSwitch(ctx,w,h){const sw=switchTarget();if(!sw)return;const p=g.projectBossEntity(sw,w,h);ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle='#36494c';ctx.strokeStyle='#e0b872';ctx.lineWidth=3;ctx.rotate(Math.PI/4);ctx.fillRect(-20,-20,40,40);ctx.strokeRect(-20,-20,40,40);ctx.rotate(-Math.PI/4);ctx.fillStyle='#101719';ctx.fillRect(-28,31,56,5);ctx.fillStyle='#f0bd74';ctx.fillRect(-28,31,56*(sw.hp/sw.maxHp),5);ctx.restore();}

 const oldBossArt=g.drawBoss.bind(g);
 g.drawBoss=function(ctx,w,h){
  if(!active())return oldBossArt(ctx,w,h);
  const t=titanState();if(!t)return oldBossArt(ctx,w,h);
  const intro=introStage(t);
  // During the FINAL approach the real, player-controlled train remains the only train on screen.
  // The chase-foreground duplicate appears only after the cinematic has completely handed control back.
  if(intro){drawTitanBody(ctx,w,h);return;}
  drawTracks(ctx,w,h);drawTitanBody(ctx,w,h);const train=drawMiniTrain(ctx,w,h);
  if(!t.transition){drawPatternTelegraph(ctx,w,h,train);drawTitanAttackFx(ctx,w,h);drawSwitch(ctx,w,h);drawDroneWarnings(ctx,w,h);}
 };

 const oldCodex=g.bossCodexHTML.bind(g);
 g.bossCodexHTML=function(id){if(id!=='titan')return oldCodex(id);return '<p>TITAN은 엔진 출력에 반응하는 추격전 보스입니다. 전투 화면 상단의 전경은 실제 열차 상태를 복제한 추격 표시이며, 직원·포탑·객차 조작은 기존 열차 UI에서 그대로 수행합니다.</p><p>PHASE 1은 보행 추격, PHASE 2는 복선과 강습 드론, PHASE 3은 움직임을 예측하는 로켓 추격으로 발전합니다. 위험 동작은 애니메이션과 공격 예정 영역으로 먼저 드러납니다.</p><p>대형 공격은 현재 내구 비례 피해와 최소 피해를 함께 사용합니다. 큰 실수를 수리로 복구할 여지는 있지만 손상을 방치하면 결국 객차가 파괴됩니다.</p>';};

 const oldEnding=g.showEnding.bind(g);
 g.showEnding=function(earned){const r=oldEnding(earned);if(this.state?.actId==='titan'){const box=document.querySelector('.ending');if(box){box.querySelector('.clear').textContent='LAST RAIL · TITAN CLEAR';box.querySelector('h2').textContent='이제, 쫓기지 않는다.';box.querySelector('p').innerHTML='거대한 추격자의 마지막 추진광이 황무지 너머로 사라졌다.<br>선로 위에는 엔진과 바퀴 소리만 남았다.<br><b>마지막 열차는 더 이상 도망치지 않는다.</b>';}}return r;};

 const oldHud=g.updateHUD.bind(g);
 g.updateHUD=function(){
  const r=oldHud();if(!this.state)return r;
  if(this.state.actId==='titan'){const stage=document.querySelector('#stage-label');if(stage)stage.textContent=active()?'TITAN':'FINAL';}
  const t=titanState();if(!active()||!t)return r;
  const b=this.state.battle,dist=document.querySelector('#titan-distance'),label=document.querySelector('.threat-copy span'),kind=document.querySelector('#battle-kind'),timer=document.querySelector('#battle-timer');
  const trainSpeed=document.querySelector('#train-speed'),titanSpeed=document.querySelector('#titan-speed'),intro=introStage(t);
  if(intro){
   if(label)label.textContent=intro.name==='reverse'?'TITAN 접근 거리':'최종 교전 전개';
   if(dist){dist.textContent=intro.name==='reverse'?`${this.state.titanDistance.toFixed(2)} km`:'0.10 km';dist.style.color='';}
   if(kind)kind.textContent=intro.name==='reverse'?'FINAL APPROACH':intro.name==='enter'?'TITAN · 진입':'TITAN · 교전 준비';
   if(timer)timer.textContent=`PHASE 1`;
   if(trainSpeed)trainSpeed.textContent=Math.abs(this.state.currentTrainSpeed||0).toFixed(2);if(titanSpeed)titanSpeed.textContent='0.00';
  }else{
   if(label)label.textContent='TITAN 상대 위치';if(dist){dist.textContent=`${posState()} · 엔진 ${actualEngine()}`;dist.style.color='';}if(kind)kind.textContent=`TITAN · PHASE ${b.phase}`;
   if(trainSpeed)trainSpeed.textContent=(this.state.currentTrainSpeed||0).toFixed(2);if(titanSpeed)titanSpeed.textContent=(this.state.currentTitanSpeed||0).toFixed(2);
  }
  const fill=document.querySelector('#threat-fill');if(fill)fill.style.width=intro&&intro.name==='reverse'?`${Math.max(0,100-intro.p*100)}%`:`${(t.position+1)*50}%`;
  const trainPin=document.querySelector('.train-pin'),titanPin=document.querySelector('.titan-pin');if(trainPin){trainPin.style.left=`${50+t.position*34}%`;trainPin.style.right='auto';}if(titanPin){titanPin.style.left='2%';titanPin.style.right='auto';}
  updateTitanHealth();
  return r;
 };

 const oldDraw=g.draw.bind(g);
 g.draw=function(){
  const t=titanState(),on=active()&&!!t;document.body.classList.toggle('titan-final09',on);if(!on)titanHealth.hidden=true;
  const intro=on?introStage(t):null;
  document.body.classList.toggle('titan-intro10',!!intro);
  document.body.classList.toggle('titan-intro-reverse10',!!intro&&intro.name==='reverse');
  document.body.classList.toggle('titan-intro-prezoom10',!!intro&&['reverse','stop'].includes(intro.name));
  document.body.classList.toggle('titan-intro-zoom10',!!intro&&['zoom','enter','launch'].includes(intro.name));
  document.body.classList.toggle('titan-intro-ui10',!!intro&&['zoom','enter','launch'].includes(intro.name));
  document.body.classList.toggle('titan-phase-shift10',!!(on&&t.transition));
  const deck=document.querySelector('#train-cars');
  if(deck?.dataset.titanTransformed09){deck.style.removeProperty('transform');deck.style.removeProperty('transform-origin');delete deck.dataset.titanTransformed09;}
  const result=oldDraw();if(on)updateTitanHealth();
  // The cinematic moves the actual train deck the player has been operating.
  // Background direction comes from currentTrainSpeed: negative during reverse approach, positive after launch.
  if(deck&&intro){
   const maxShift=Math.min(360,(this.view?.w||1440)*.18);
   const smooth=p=>p*p*(3-2*p);
   let shift=0;
   if(intro.name==='reverse')shift=-maxShift*smooth(intro.p);
   else if(['stop','zoom','enter'].includes(intro.name))shift=-maxShift;
   else if(intro.name==='launch')shift=-maxShift*(1-smooth(intro.p));
   deck.style.translate=`${shift}px 0`;
  }else if(deck&&!this.sceneTransition){
   // scene.js owns translate outside the TITAN cinematic; clear only our residual value.
   if(!document.body.classList.contains('train-stopped'))deck.style.translate='';
  }
  return result;
 };
})();
