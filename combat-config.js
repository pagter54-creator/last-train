/* Rhythm and feedback tuning: content can extend these tables without changing the director. */
window.COMBAT_CONFIG = {
  stageOverrides:{}, // Optional { actId: { stageNumber: { budget, duration, phases } } }.
  swarm:{budgetMultiplier:1.6,min:2,max:5,intervalMin:2,intervalMax:3},
  mobility:{global:1.05,referenceHp:100,hpWeight:.3,armorWeight:.2,min:-.2,max:.2},
  emptyFieldClock:8,
  emptyReinforcement:{type:'biker',interval:1},
  budgets:[100,110,125,140,155,170,185,205,225,250],
  durations:[60,65,80,90,95,100,110,115,120,130],
  eliteBudget:1.25,eliteDuration:1.15,lateStage:9,midStage:6,
  limits:[1,1,2,2,2,2,2,2,3,3],lateEliteLimit:4,burstSeconds:6,
  roles:{biker:{cost:6,tags:['PRESSURE'],min:1},raider:{cost:12,tags:['PRESSURE'],min:1},boarder:{cost:10,tags:['BOARDING'],min:1},buggy:{cost:18,tags:['ARMOR'],min:4},mortar:{cost:20,tags:['ARTILLERY'],min:1},drone:{cost:22,tags:['SPECIAL'],min:7}},
  templates:[
    {id:'boarding',name:'승선 돌격',min:1,tags:['BOARDING','PRESSURE']},
    {id:'artillery',name:'포격 진지',min:1,tags:['ARTILLERY','PRESSURE']},
    {id:'split',name:'양방향 습격',min:3,tags:['BOARDING','PRESSURE'],split:true},
    {id:'armor',name:'장갑 돌파',min:4,tags:['ARMOR','PRESSURE']},
    {id:'mixed',name:'포격·승선 협공',min:5,tags:['ARTILLERY','BOARDING']},
    {id:'siege',name:'중장갑 포격',min:6,tags:['ARTILLERY','ARMOR']},
    {id:'ancient',name:'고대 기습',min:7,tags:['SPECIAL','ARMOR']}
  ],
  phases:{
    normal:[['ENTRY',.15,.15],['BUILDUP',.2,.2],['CRISIS',.15,.25],['RECOVERY',.15,.08],['BUILDUP',.15,.12],['FINAL',.2,.2]],
    elite:[['ENTRY',.12,.1],['CRISIS',.19,.23],['RECOVERY',.09,.05],['CRISIS',.19,.23],['RECOVERY',.09,.05],['BUILDUP',.12,.1],['FINAL',.2,.24]],
    late:[['ENTRY',.1,.1],['CRISIS',.18,.22],['RECOVERY',.1,.06],['CRISIS',.18,.22],['RECOVERY',.1,.06],['BUILDUP',.14,.12],['FINAL',.2,.22]]
  },
  phaseBounds:{ENTRY:[5,25],BUILDUP:[5,35],CRISIS:[8,25],RECOVERY:[6,18],FINAL:[8,30]},
  labels:{ENTRY:'진입 · 편성 확인',BUILDUP:'접근 증가',CRISIS:'위기 파동',RECOVERY:'회복 · 수리와 냉각',FINAL:'최종 위기'},
  tagCaps:{BOARDING:4,ARTILLERY:2,ARMOR:3,SPECIAL:2},
  director:{maxAdjustment:.15,delaySeconds:5,advanceSeconds:1.5,lowIntegrity:.3,stableIntegrity:.9,destroyed:2,incapacitated:2,specialChance:.45,eliteSpecialChance:.65,earlySpecialTypes:1,earlyStage:2,maxSpawnPerFrame:2,jitter:.2,leftEntryChance:.8,leftEntryDistance:.7},
  windup:{ARTILLERY:2.2,SPECIAL:1.8,BOSS:1.8},
  feedback:{recoilSeconds:.18,recoilPixels:8,criticalHull:.25,hotRatio:.8,alarmInterval:2.8,engineInterval:.45,metalInterval:.7,commandSeconds:1.4,particleSeconds:.85,particleCount:14,maxParticles:240,dustCount:20,tumbleCount:4,smokeCount:6,smokeCycle:2.5},
  actionTargets:{early:{moves:1,focus:1,power:0},normal:{moves:2,focus:2,power:1}},historyLimit:30
};
Object.entries(window.COMBAT_CONFIG.roles).forEach(([id,r])=>Object.assign(window.GAME_DATA.ENEMIES[id],{threatCost:r.cost,tags:r.tags,rhythmMinStage:r.min}));
Object.assign(window.GAME_DATA.BALANCE.audio,{
  engine:{frequency:48,end:38,duration:.55,gain:.28},
  metal:{frequency:1700,end:210,duration:.16,gain:.5},
  shotCrack:{frequency:2600,duration:.09,noise:true,gain:.6},
  cannonBass:{frequency:80,end:24,duration:.35,gain:.85},
  debris:{frequency:1100,duration:.6,noise:true,gain:.5},
  alarm:{frequency:760,end:1100,duration:.35,gain:.6},
  boardingAlarm:{frequency:1250,end:550,duration:.25,gain:.65},
  heatHiss:{frequency:3200,duration:.5,noise:true,gain:.4},
  commandRise:{frequency:170,end:1250,duration:.6,gain:.7}
});
