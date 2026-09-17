/* PART 2: editable tuning, loaded before the immutable run baseline. */
(()=>{
 'use strict';
 const D=GAME_DATA,B=D.BALANCE,E=EQUIPMENT_REFORM;
 const C=window.UPDATE09_PART2={
  restock:{baseCost:60,increment:35},bossRewardMultiplier:2,
  interceptor:{priorityDamage:2.4,pierce:.05},sludge:{radius:.22,damageMultiplier:2.6,burstPierce:.85},
  penetrator:{initialPierce:1,flatLoss:.05,armorLoss:.5,lineWidth:.075},
  warp:{cooldown:24,specialized:8,wide:65,levelReduction:1},
  recoveryDrone:{cooldown:100,levelReduction:4,hpRatio:.35},medical:{interval:3,hp:2},
  makeshift:{restoreRatio:.5},
  titan:{
   travelSpring:8,travelDamping:5,rearSafe:.28,frontSafe:-.28,reverseSafe:.42,
   interval:[3.4,3.0,2.8],
   telegraph:{
    missile:2.7,stomp:3.0,debris:1.8,walk:2.2,
    arm:2.8,laser:3.0,railCrush:7.5,trackDebris:1.8,droneApproach:3.4,droneCut:4.0,
    guidedTrack:3.0,guidedLock:1.8,exhaust:2.6,predictiveMissile:3.0
   },
   damage:{
    missile:{type:'current',rate:.37,min:.10,splash:.040},
    stomp:{type:'current',rate:.44,min:.11,edge:.040},debris:{type:'max',rate:.035},
    arm:{type:'current',rate:.42,min:.11},laser:{type:'current',rate:.40,min:.10},
    railCrush:{type:'current',rate:.60,min:.15},trackDebris:{type:'max',rate:.033},
    exhaust:{type:'current',rate:.39,min:.10},predictiveMissile:{type:'current',rate:.36,min:.09},
    guidedCharge:{type:'current',rate:.55,min:.13}
   },
   drone:{hp:150,armor:.18,facilityRate:.025,crewDamage:5,approach:3.4,cut:4.0,count:2},
   switch:{minHp:360,dpsSeconds:2.15,hpCap:1900},
   core:{openSeconds:5.5,finaleRatio:.22}
  }
 };
 B.run.maxTitanDistance=99.9;
 for(const[id,name,icon,damage,interval,range,heat,price,pierce]of [
  ['interceptor','요격 포탑','I',18,.7,'long',9,180,.05],
  ['sludge','슬러지포','S',48,3.7,'long',55,220,.30],
  ['penetrator','관통포','→',62,3.4,'long',60,240,1]]){
  const spec=E.turret[id]={...E.turret.cannon,highEffect:{damage:1.15},criticalEffect:{damage:1.3},cap:{name:'최종 화력',text:'피해 +40%',effect:{damage:1.4}}};
  D.TURRETS[id]={name,icon,role:name,damage,interval,range,heat,cool:6,price,ammo:true,armorPierce:pierce,power:REVISION_CONFIG.power.map(p=>({...p})),maxLevel:8,rangeType:range,heatGenerationRule:'shell',highHeatEffect:spec.highEffect,criticalHeatEffect:spec.criticalEffect,level8Capstone:null,baseStats:{damage,interval,heat,cool:6},intercepts:id==='interceptor'};
 }
 for(const[id,name,icon,price,description]of [
  ['swiftWarp','신속 워프','↗',210,'출발 객차의 직원을 즉시 이동 · 차단 통로 무시. 집중형 8초 / 표준형 24초 / 광역형 단체 이동 65초.'],
  ['makeshiftRepair','임시변통 수리 모듈','!',650,'치명적 피해를 취소하고 객차 HP 50% 복구 · 소모형 · 강화 불가 · 전원 없이 작동.'],
  ['recoveryDrone','회복 드론','✚',250,'직원 선택 후 회복 버튼 · 전투불능 직원 HP 35%로 복귀 · 재사용 100초.']]){
  const one=id==='makeshiftRepair';D.MODULES[id]={name,icon,price,description,effect:id,range:0,upgradeable:!one,maxLevel:one?1:5,auxSlotUnlockLevel:one?null:3,auxEfficiency:E.auxEfficiency,level5Capstone:null};
  E.modules[id]=E.modules[id]||{};
 }
 // Extend the ancient-equipment category to late-game recovered hardware.
 const ancientFlavor=window.LAST_RAIL_ANCIENT_GEAR_FLAVOR||{};
 for(const id of ['interceptor','penetrator','swiftWarp','makeshiftRepair','recoveryDrone']){const d=D.TURRETS[id]||D.MODULES[id];if(d){d.ancient=true;d.flavor=ancientFlavor[id]||d.flavor;}}
 delete D.MODULES.medical.stageHealMult;
 D.MODULES.medical.description='전투 중 범위 내 살아 있는 직원을 3초마다 지속 회복 (전투불능 복귀는 회복 드론).';
 D.MODULES.medical.level5Capstone=null;
 D.ACTS.act3.nextAct='titan';
 D.ACTS.titan={id:'titan',label:'FINAL',name:'최후의 정비',finalAct:true,stageOffset:45,boss:'titan',intro:'도망의 끝. 마지막 정비를 마치고 Titan에 도전합니다.',stages:[{node:'station',title:'최후의 정비 스테이션'}]};
 const part=(id,name,hp,armor,x,y,phase,weapon=false)=>({id,name,hp,armor:.35,x,y,type:id,phase,weapon,victory:false});
 D.ENEMIES.titanAssaultDrone={...D.ENEMIES.boarder,name:'TITAN 강습 드론',icon:'◆',hp:C.titan.drone.hp,armor:C.titan.drone.armor,speed:0,carDamage:0,crewDamage:C.titan.drone.crewDamage,interval:2.2,boards:true,special:true,fromStage:999,rhythmMinStage:999,threatCost:0,tags:['BOARDING','SPECIAL']};
 D.BOSSES.titan={name:'TITAN',title:'TITAN · 더 이상 도망치지 않는다',duration:420,attack:{interval:4},sharedHp:23000,rewardRelics:12,parts:[
  part('titanLegL','왼쪽 다리',3000,.45,.17,.45,1),part('titanLegR','오른쪽 다리',3000,.45,.31,.45,1),
  part('titanBody','무한궤도 동력부',7200,.52,.24,.34,2),part('titanArm','강습 팔',1800,.34,.14,.31,2,true),part('titanHeadGun','머리 레이저',1700,.30,.34,.26,2,true),
  part('titanCore','로켓 추진 코어',6300,.28,.23,.28,3)]};
 for(const[id,b]of Object.entries(D.BOSSES))if(id!=='titan')b.rewardRelics=Math.round(B.rewards.battleRelics*C.bossRewardMultiplier);
 const schedule=window.configureStationSchedule;
 window.configureStationSchedule=function(level){schedule(level);D.ACTS.titan.stages=[{node:'station',title:'최후의 정비 스테이션'}];};
})();
