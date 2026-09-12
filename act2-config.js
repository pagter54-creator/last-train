/* ACT content and tuning remain separate from simulation. Prototype feedback wins. */
(() => {
  const D=window.GAME_DATA,C=window.COMBAT_CONFIG,B=D.BALANCE;
  B.station.turretOfferCount=2;B.station.moduleOfferCount=2;
  B.launch.impactAt=.65;
  window.ACT2_CONFIG={
    shop:{priceMultiplier:1.2,crewBonus:0,crewPrices:[110,170],advancedChance:.65},
    hook:{repairMultiplier:.55,boardingSpeed:1.25,range:.32},
    power:{seconds:8,amount:1}, shield:{radius:.2,damageMultiplier:.65},
    transport:{range:.22,count:3,laneSpacing:.035},repair:{radius:.24,hpPerSecond:8},
    suppress:{seconds:7,windup:2,rateMultiplier:.75,moduleMultiplier:.6},
    bomber:{seconds:6,trainMultiplier:.85,windup:2},
    infiltrator:{rateMultiplier:.8,moduleMultiplier:.65},
    limits:{early:2,middle:3,late:3,burst:3,eliteBurst:4,middleStage:14,lateStage:17},
    boss:{thresholds:[.7,.35,.15],rageInterval:.8,leglessInterval:.85,initialGrabDelay:4,
      grab:{windup:2.5,seconds:12,hpPerSecond:.02,interval:19,secondDelay:4,engineChance:.08,engineDamage:.6,engineSpeed:.88},
      disruption:{interval:18,seconds:8,windup:2.2},summonInterval:22},
    visual:{ringRadius:48,tetherWidth:5,footWidth:.28,footHeight:.84,footGround:.86,footTravel:.4}
  };
  D.ACTS.act1.nextAct='act2';
  D.ACTS.act2={id:'act2',label:'II',name:'포식자의 철로',stageOffset:10,boss:'arachne',
    intro:'고대 다족 추격병기 ARACHNE가 이 노선을 지키고 있습니다. 다리는 객차를 붙잡고, 교란 장치는 전력을 억제하며, 드론 격납고는 침투병을 보냅니다. 직원 이동과 수리, 부위 집중 사격을 준비하십시오.',
    stages:[{node:'battle',title:'끊어지지 않는 추격'},{node:'branch',options:['battle','event']},{node:'battle',title:'갈고리 수송대'},{node:'station'},
      {node:'elite',title:'전력 봉쇄선'},{node:'branch',options:['battle','event']},{node:'battle',title:'고대 억제 구역'},{node:'station'},
      {node:'branch',options:['battle','elite','event']},{node:'battle',title:'포식자의 둥지',allEnemies:true}]};
  const budgets=[260,275,290,310,330,350,370,390,415,440],hp=[1,1.05,1.1,1.15,1.2,1.3,1.35,1.45,1.5,1.65],damage=[1,1,1.05,1.05,1.1,1.1,1.15,1.2,1.25,1.3],durations=[110,115,120,120,125,130,130,140,140,150],base=D.STAGE_CURVE[9];
  C.stageOverrides.act2={};
  budgets.forEach((budget,i)=>{D.STAGE_CURVE.push({...base,stage:11+i,hp:base.hp*hp[i],damage:base.damage*damage[i],duration:durations[i]});C.stageOverrides.act2[i+1]={budget,duration:durations[i],eliteDuration:1};});
  const add=(id,baseId,stats,cost,tags,min)=>{D.ENEMIES[id]={...D.ENEMIES[baseId],...stats,fromStage:min,rhythmMinStage:min,threatCost:cost,tags};C.roles[id]={cost,tags,min};};
  add('hook','biker',{name:'갈고리 바이커',hp:75,carDamage:2,crewDamage:1,interval:4,behavior:'hook',color:'#c8a167'},14,['DISRUPTION','BOARDING_SUPPORT'],11);
  add('power_raider','raider',{name:'전력 약탈자',hp:100,carDamage:3,interval:9,behavior:'power',color:'#ab80df'},24,['POWER'],11);
  add('shield','buggy',{name:'방패 차량',hp:175,carDamage:2,armor:.35,behavior:'shield',color:'#66a9bb'},20,['PROTECTION'],11);
  add('transporter','raider',{name:'기습 수송차',hp:155,carDamage:0,crewDamage:0,speed:.85,behavior:'transport',color:'#c39764'},26,['BOARDING'],12);
  add('repair_drone','drone',{name:'수리 드론',hp:65,carDamage:1,crewDamage:0,interval:5,behavior:'repair',color:'#96bb94'},17,['SUPPORT'],13);
  add('suppressor','drone',{name:'고대 억제기',hp:145,carDamage:2,interval:10,behavior:'suppress',color:'#aa88cf'},27,['SYSTEM'],14);
  add('rail_bomber','mortar',{name:'선로 폭격차',hp:110,carDamage:4,crewDamage:1,interval:10,behavior:'bomber',color:'#c77a58'},23,['PURSUIT'],14);
  add('infiltrator','boarder',{name:'고대 침투병',hp:85,armor:.2,carDamage:2,crewDamage:6,behavior:'infiltrator',color:'#9d87c7'},28,['SPECIAL','BOARDING'],17);
  C.templates.push(
    {id:'power-pressure',min:11,tags:['POWER','PRESSURE']},{id:'shield-artillery',min:11,tags:['PROTECTION','ARTILLERY']},
    {id:'hook-transport',min:12,tags:['BOARDING_SUPPORT','BOARDING']},{id:'repair-armor',min:13,tags:['SUPPORT','ARMOR']},
    {id:'rail-pressure',min:14,tags:['PURSUIT','PRESSURE']},{id:'suppress-pressure',min:14,tags:['SYSTEM','PRESSURE']},
    {id:'power-transport',min:17,tags:['POWER','BOARDING','PRESSURE']});
  Object.assign(C.tagCaps,{DISRUPTION:2,BOARDING_SUPPORT:2,POWER:1,PROTECTION:2,SUPPORT:2,SYSTEM:1,PURSUIT:1});
  D.BOSSES.arachne={name:'ARACHNE',duration:390,rewardRelics:14,attack:{interval:3.2,carDamage:14,crewDamage:3},
    summon:{enemy:'infiltrator',initialDelay:22,interval:22,disabledByPart:'drone_bay'},parts:[
      {type:'core',name:'중앙 코어',hp:7500,x:.83,y:.43,victory:true},
      {type:'grab_leg_a',name:'포획 다리 A',hp:1500,x:.65,y:.62},
      {type:'grab_leg_b',name:'포획 다리 B',hp:1500,x:.95,y:.7},
      {type:'disruptor',name:'교란 장치',hp:1350,x:.7,y:.28},
      {type:'drone_bay',name:'드론 격납고',hp:1250,x:.94,y:.3}]
  };
})();
