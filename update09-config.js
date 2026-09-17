/* Part 1 data. Must precede meta-system's immutable per-run snapshot. */
(()=>{
 'use strict';
 const D=GAME_DATA,C=COMBAT_CONFIG,R=REVISION_CONFIG;
 window.UPDATE09={
  lightning:{interval:30,warning:5.0,repairSeconds:12,repairPerStat:.08,overcharge:10,rodSeconds:12,rodPerLevel:2},
  enemies:{droneRepair:.65,droneMove:.65,airdropSeconds:3,airdropCount:3,jamSeconds:5,jamInterval:12,forwardInterval:13},
  janus:{wallHp:320,wallDpsPerCombat:1.2,wallRetaliation:1,wallVisual:.25,reposition:6,swapAfter:25,swapSeconds:1.2,mergeAfter:50,wallDeployDelay:2.4,splitSeconds:28,mergeSeconds:14,splitAttackDelay:3.2,mergeAttackDelay:2.4,attackInterval:5.2,mergeAttackInterval:5.5,warning:1.8,heavyWarning:2.2,multiWarning:1.8,heatWarning:1.5,droneWarning:2,heavyCurrentHpRatio:.10,multiMaxHpRatio:.055,multiTargets:3,crewDamage:1,heatShot:50,heatDroneHp:30,heatDroneCoolingMult:.55,verdictDelay:5.5,verdictWarning:3,verdictFlipAt:1.2,verdictFlipRatio:.34,verdictCurrentHpRatio:.08,verdictHeat:45,verdictCoolingDebuff:4,verdictCoolingMult:.65,vulnerableSeconds:3.5,vulnerableDamageMult:1.25},
  events:{generatorBase:.60,generatorPerRepair:.025,generatorGreat:.15,engineerDemand:.4,engineerScrap:100,memoryBase:.65,memoryPerRecovery:.025,memoryWaitBase:.85,memoryGreat:.2}
 };
 D.ACTS.act2.nextAct='act3';
 D.ACTS.act3={id:'act3',label:'III',name:'뇌우의 경계',stageOffset:30,boss:'janus',intro:'낙뢰 경고 중 전력을 끄면 과충전됩니다. 봉쇄와 공습에 대응하고 중앙 봉쇄벽을 직원의 개인화기로 파괴하세요.',stages:[
  {node:'battle',title:'뇌우 진입'},{node:'branch',options:['battle','elite','event']},{node:'battle',title:'끊긴 연결부'},{node:'station'},
  {node:'elite',title:'공습 경보'},{node:'event'},{node:'battle',title:'견인 드론 편대'},{node:'branch',options:['battle','elite','event']},
  {node:'elite',title:'신호 교란선'},{node:'station'},{node:'event'},{node:'elite',title:'전진 강습 기지'},
  {node:'branch',options:['battle','elite','event']},{node:'battle',title:'JANUS 방어선'},{node:'station'}]};
 // Preserve the opening baseline. HP growth rises slightly each ACT while Threat growth stays unchanged.
 const firstHp=D.STAGE_CURVE[0].hp,firstBudget=C.stageOverrides.act1[1].budget;
 const hpStepByAct=[.028,.032,.036];
 // 1.0 difficulty pass: ACT III was too soft relative to the player's accumulated build.
 // Raise only enemy durability, not enemy damage, so the pressure comes from kill time / target backlog.
 const ACT3_HP_MULTIPLIER=1.35;
 D.STAGE_CURVE.length=0;
 let hp=firstHp;
 for(let i=0;i<45;i++){
  const actIndex=Math.floor(i/15),act='act'+(actIndex+1),local=i%15+1,duration=75+i*1.25;
  if(i>0)hp+=hpStepByAct[actIndex];
  const stageHp=actIndex===2?hp*ACT3_HP_MULTIPLIER:hp;
  D.STAGE_CURVE.push({stage:i+1,targetPI:65+i*3,hp:stageHp,damage:.7+i*.018,count:1+i*.008,duration});
  C.stageOverrides[act]??={};C.stageOverrides[act][local]={budget:firstBudget+i*5+actIndex*50,duration,eliteDuration:1};
 }
 C.eliteBudget=1.3;R.elite.hp=1.12;R.elite.damage=1.18;
 D.BALANCE.battle.eliteHp=1;D.BALANCE.battle.eliteDamage=1;
 // 1.0 apocalypse tiers are defined authoritatively in meta-config.js.
 PROGRESSION_CONFIG.stars.progressStages=45;ELITE_CONFIG.fireCaps.act3=ELITE_CONFIG.fireCaps.act2;
 const add=(id,base,stats,cost,tags)=>{D.ENEMIES[id]={...D.ENEMIES[base],...stats,fromStage:31,rhythmMinStage:31,threatCost:cost,tags};C.roles[id]={cost,tags,min:31};};
 add('connectorBlocker','biker',{name:'차단병',hp:90,armor:.15,carDamage:2,crewDamage:1,behavior:'connectorBlocker'},18,['DISRUPTION']);
 add('saboteur','raider',{name:'파괴공',hp:105,carDamage:12,crewDamage:1,behavior:'saboteur'},20,['PRESSURE']);
 add('tetherDrone','drone',{name:'구속·견인 드론',hp:75,carDamage:1,crewDamage:0,behavior:'tetherDrone'},18,['DISRUPTION']);
 const elite=(id,name,hp,armor,behavior,hold,slots=1)=>{D.ENEMIES[id]={...D.ENEMIES.raider,name,icon:'◆',hp,armor,speed:.7,carDamage:0,crewDamage:0,interval:12,elite:true,eliteMinStage:31,fromStage:31,rhythmMinStage:31,threatCost:0,tags:['SPECIAL'],specialBehavior:behavior,hold,eliteSlots:slots,help:{airdrop:'여러 객차로 낙하합니다. 착지 전 포탑으로 요격하세요.',signalJammer:'포탑 또는 모듈 하나를 잠시 정지시킵니다. 직원 이동은 방해하지 않습니다.',assaultCarrier:'열차 가까이에서 승선병을 반복 투입합니다. 정예 슬롯 2개를 사용합니다.'}[behavior]};};
 elite('airdropElite','공습 부대',270,.20,'airdrop',.45);D.ENEMIES.airdropElite.speed=1.35;
 elite('signalElite','신호 교란차',300,.25,'signalJammer',.55);
 elite('assaultElite','중장 돌격차',750,.72,'assaultCarrier',.2,2);
 add('airdropSoldier','boarder',{name:'공습 승선병',hp:60,carDamage:1,crewDamage:6,behavior:'airdropSoldier'},0,['BOARDING']);
 D.MODULES.lightningRod={name:'피뢰침',icon:'ϟ',price:160,effect:'lightningRod',range:1,eventOnly:true,upgradeable:true,maxLevel:5,auxSlotUnlockLevel:3,auxEfficiency:EQUIPMENT_REFORM.auxEfficiency,level5Capstone:'특수 과충전 20초',role:'범위 내 낙뢰를 유도해 특수 과충전 · 강화당 지속시간 +2초'};

 D.ENEMIES.janusHeatDrone={...D.ENEMIES.raider,name:'발열 드론',icon:'◇',hp:30,armor:0,speed:0,carDamage:0,crewDamage:0,interval:999,boards:false,ranged:false,special:true,fromStage:999,rhythmMinStage:999,threatCost:0,tags:['SPECIAL']};

 D.BOSSES.janus={name:'JANUS',duration:420,rewardRelics:22,sharedHp:18700,attack:{interval:4,carDamage:23,crewDamage:1},parts:[
  {type:'janusCrusher',name:'JANUS · 파괴형',hp:9350,armor:.40,x:.68,y:.35},
  {type:'janusHeater',name:'JANUS · 과열형',hp:9350,armor:.40,x:.92,y:.58}]};
 const ch=(id,label,reward={},extra={})=>({id,label,time:extra.time??0,reward,...extra});
 const ev=(id,title,text,choices,extra={})=>({id,act:3,title,text,choices,...extra});
 const pass=()=>ch('pass','지나간다');
 EVENT_CONFIG.events.push(
  ev('relic_converter','고대 잔해 변환기','벼락에 그을린 자동 교환기가 아직 희미하게 작동하고 있다. 투입구 옆에는 돈과 고철, 고대 잔해의 낡은 교환표가 붙어 있다.',[
   ch('money','잔해 5 → 돈 150',{money:150},{cost:{relics:5},time:.45}),ch('scrap','잔해 5 → 고철 75',{scrap:75},{cost:{relics:5},time:.45}),ch('relicMoney','돈 180 → 잔해 5',{relics:5},{cost:{money:180},time:.45}),ch('relicScrap','고철 90 → 잔해 5',{relics:5},{cost:{scrap:90},time:.45}),pass()]),
  ev('generator_explosion','발전기 폭발','객차 아래에서 굉음과 함께 불꽃이 튀었다. 타버린 발전기 내부에서 전선이 계속 스파크를 일으키고 있다.',[ch('repair','발전기 복구 담당 선택',{part09:'generator'},{dispatch:true,time:.65})],{requiresStaff:true}),
  ev('engineer_group','엔지니어 집단','폭풍을 피해 선로 옆에 자리 잡은 기술자들이 우리 열차를 훑어본다. "고칠 수는 있어. 문제는 대가가 뭐냐는 거지."',[ch('accept','수리를 의뢰한다',{repairRatio:.7,part09:'engineers'},{requiresTurretOrScrap:100,time:.55}),pass()]),
  ev('memory_damage','직원 기억 손상','낙뢰 충격이 지나간 뒤, 직원 한 명이 자신의 이름조차 제대로 떠올리지 못한다. 익숙한 객차를 낯선 곳처럼 둘러보고 있다.',[ch('treat','다른 직원에게 적극 치료를 맡긴다',{part09:'memoryTreat'},{dispatch:true,excludePatient:true,time:.65}),ch('wait','기억이 돌아오기를 믿는다',{part09:'memoryWait'},{time:.45})],{requiresStaff:true}),
  ev('elite_encounter','무법자 캠프','선로를 가로질러 폐차와 철판으로 만든 무법자 캠프가 길을 막고 있다. 망루 위의 총구가 우리를 따라 움직이고, 입구에서는 통행료를 요구하는 손짓이 보인다.',[ch('fight','정예 부대와 전투한다',{part09:'eliteBattle'},{time:.35}),ch('pay','돈 160을 지불하고 통과한다',{}, {cost:{money:160},time:.30})]),
  ev('relic_cache','고대 잔해 대량 발견','연속된 낙뢰가 지반을 갈라 오래된 저장고를 드러냈다. 깨진 문틈 사이로 고대 잔해 특유의 희미한 빛이 새어 나온다.',[ch('take','잔해를 회수한다',{relics:[18,28]},{time:.60})],{weight:.15}),
  ev('lightning_rod','피뢰침 획득','버려진 낙뢰 관측소의 철탑이 폭풍 속에서도 홀로 서 있다. 제어실에는 열차에 장착할 수 있을 법한 특수 피뢰 장치가 남아 있다.',[ch('take','피뢰침을 회수한다',{part09:'lightningRod'},{time:.50}),pass()])
 );
})();
