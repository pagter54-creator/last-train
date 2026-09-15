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
  titan:{travelSpring:8,travelDamping:5,nearLimit:-.3,farLimit:.3,warning:[2.8,2.5,1.8],interval:[4,3.4,1.5],
   damage:[{near:115,center:26,far:105},{near:135,center:32,far:125},{near:120,center:24,far:115}],crewDamage:4}
 };
 B.run.maxTitanDistance=99.9;
 for(const[id,name,icon,damage,interval,range,heat,price,pierce]of [
  ['interceptor','요격 포탑','I',18,.7,'long',9,180,.05],
  ['sludge','슬러지포','S',48,3.7,'long',55,220,.30],
  ['penetrator','관통포','→',62,3.4,'long',60,240,1]]){
  const spec=E.turret[id]={...E.turret.cannon,highEffect:{damage:1.15},criticalEffect:{damage:1.3},cap:{name:'최종 화력',text:'피해 +40%',effect:{damage:1.4}}};
  D.TURRETS[id]={name,icon,role:name,damage,interval,range,heat,cool:6,price,ammo:true,armorPierce:pierce,power:REVISION_CONFIG.power.map(p=>({...p})),maxLevel:8,rangeType:range,heatGenerationRule:'shell',highHeatEffect:spec.highEffect,criticalHeatEffect:spec.criticalEffect,level8Capstone:spec.cap,baseStats:{damage,interval,heat,cool:6},intercepts:id==='interceptor'};
 }
 for(const[id,name,icon,price,description]of [
  ['swiftWarp','신속 워프','↗',210,'출발 객차의 직원을 즉시 이동 · 차단 통로 무시. 집중형 8초 / 표준형 24초 / 광역형 단체 이동 65초.'],
  ['makeshiftRepair','임시변통 수리 모듈','!',650,'치명적 피해를 취소하고 객차 HP 50% 복구 · 소모형 · 강화 불가 · 전원 없이 작동.'],
  ['recoveryDrone','회복 드론','✚',250,'직원 선택 후 회복 버튼 · 전투불능 직원 HP 35%로 복귀 · 재사용 100초.']]){
  const one=id==='makeshiftRepair';D.MODULES[id]={name,icon,price,description,effect:id,range:0,upgradeable:!one,maxLevel:one?1:5,auxSlotUnlockLevel:one?null:3,auxEfficiency:E.auxEfficiency,level5Capstone:one?'강화 불가':'재사용 시간 감소'};
  E.modules[id]={cap:D.MODULES[id].level5Capstone};
 }
 delete D.MODULES.medical.stageHealMult;
 D.MODULES.medical.description='전투 중 범위 내 살아 있는 직원을 3초마다 지속 회복 (전투불능 복귀는 회복 드론).';
 E.modules.medical.cap='Lv5: 전투 중 회복량 +50%';D.MODULES.medical.level5Capstone=E.modules.medical.cap;
 D.ACTS.act3.nextAct='titan';
 D.ACTS.titan={id:'titan',label:'FINAL',name:'최후의 정비',finalAct:true,stageOffset:45,boss:'titan',intro:'도망의 끝. 마지막 정비를 마치고 Titan에 도전합니다.',stages:[{node:'station',title:'최후의 정비 스테이션'}]};
 const part=(id,name,hp,armor,x,y,phase,weapon=false)=>({id,name,hp,armor,x,y,type:id,phase,weapon,victory:false});
 D.BOSSES.titan={name:'TITAN',title:'TITAN · 더 이상 도망치지 않는다',duration:300,attack:{interval:4},sharedHp:21000,rewardRelics:12,parts:[
  part('titanLegL','왼쪽 다리',2800,.45,.2,.5,1),part('titanLegR','오른쪽 다리',2800,.45,.3,.5,1),
  part('titanBody','상체 동력부',6500,.55,.25,.35,2),part('titanMortar','거대 곡사포',1500,.3,.15,.25,2,true),part('titanGun','제압 기관포',1400,.25,.36,.3,2,true),
  part('titanHead','비행 머리',6000,.3,.27,.27,3)]};
 for(const[id,b]of Object.entries(D.BOSSES))if(id!=='titan')b.rewardRelics=Math.round(B.rewards.battleRelics*C.bossRewardMultiplier);
 const schedule=window.configureStationSchedule;
 window.configureStationSchedule=function(level){schedule(level);D.ACTS.titan.stages=[{node:'station',title:'최후의 정비 스테이션'}];};
})();
