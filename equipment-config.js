/* All new equipment tuning lives here; values are provisional. */
(()=>{
 const D=GAME_DATA,B=D.BALANCE,W=WEAPON_UPGRADES;
 const C=window.EQUIPMENT_REFORM={
  maxTurretLevel:8,maxModuleLevel:5,moduleCosts:{2:25,3:45,4:75,5:110},auxUnlock:3,auxEfficiency:.7,
  baseHeatMultiplier:.9,overheatCoolingMultiplier:2.5,retargetFactor:.25,unarmoredThreshold:.12,closeDistance:.22,
  ballistics:{knockback:.035,breachPierce:.9,extraDelay:.18,extraOffset:.035,chainSeconds:.16,zonePierce:.2},
  moduleGrowth:.2,moduleCapLevel:5,lowHull:.3,zoneTick:1,maxZones:16,zoneSpreadLimit:3,
  armor:{perHit:.08,maxStacks:5,duration:12,shatterStacks:5,shatter:.3,breach:.15},
  slow:{perHit:.12,maxStacks:4,duration:4,freeze:1.2,eliteFloor:.35,bossFloor:.9,heavyHp:900,heavyKnockback:.15,stun:.4},
  extraCar:{cost:450,price:300,name:'증결 포대'},
  shop:{chance:.55,moneyPerScrap:1.15,premium:1.12,maxLevel:7,bands:[{at:1,levels:[1,2],weights:[.85,.15]},{at:3,levels:[2,3,4],weights:[.25,.5,.25]},{at:5,levels:[4,5,6],weights:[.25,.5,.25]},{at:7,levels:[5,6,7],weights:[.2,.5,.3]}]},
  turret:{
   gatling:{high:60,critical:80,highEffect:{rate:1.18},criticalEffect:{rate:1.4},heatRule:'continuous',cap:{name:'REDLINE',text:'고열 연사 +75% · 목표 변경 대기 75% 감소 · 장갑 12% 이하 피해 +30%',effect:{rate:1.75,unarmored:1.3}}},
   cannon:{high:60,critical:80,highEffect:{damage:1.2,projectileSpeed:1.3},criticalEffect:{damage:1.35,projectileSpeed:1.6},heatRule:'shell',cap:{name:'OVERCHARGED SHELL',text:'고열 피해 +65% · 소형 폭발 반경 0.07 · 관통 +25%p',effect:{damage:1.65,splash:.24,pierce:.25,projectileSpeed:1.7}}},
   mortar:{high:60,critical:80,highEffect:{splashMult:1.25},criticalEffect:{splashMult:1.5},heatRule:'shell',cap:{name:'SATURATION BOMBARDMENT',text:'고열 포격 시 피해 45%의 추가 포탄 2발 낙하',effect:{splashMult:1.5,extraShells:2,extraDamage:.45}}},
   scatter:{high:55,critical:80,highEffect:{pellets:1,pierce:.15},criticalEffect:{pellets:2,pierce:.3},heatRule:'pellets',heatPerHit:1.5,cap:{name:'BREACH SHOT',text:'초근거리 관통 90% · 장갑 15%p 약화 · 강한 후퇴',effect:{breach:true,knockback:.07}}},
   tesla:{high:60,critical:80,chainRange:.2,highEffect:{chains:1,chainRange:1.3},criticalEffect:{chains:2,chainRange:1.6},heatRule:'chains',heatPerHit:5,cap:{name:'SUPERCONDUCTOR',text:'연쇄 피해 비율 95% · 고열 3대상 이상 연쇄 시 첫 대상 재타격',effect:{chainRatio:.95,revisit:true}}},
   breaker:{high:60,critical:85,highEffect:{pierce:.15},criticalEffect:{damage:1.2,pierce:.25},heatRule:'shell',cap:{name:'ARMOR SHATTER',text:'장갑 약화 5중첩 시 추가 장갑 30%p 파쇄',effect:{shatter:true}}},
   phosphorus:{high:60,critical:80,highEffect:{zoneDamage:1.2},criticalEffect:{zoneDamage:1.4},heatRule:'zones',heatPerZone:3,zone:{radius:.13,seconds:6,damageRatio:.32},cap:{name:'WHITE INFERNO',text:'화염지대 반경 +40% · 처치 시 최대 3회 주변 확산',effect:{zoneRadius:1.4,spread:true}}},
   repulsor:{high:55,critical:80,highEffect:{knockback:.04},criticalEffect:{knockback:.06},heatRule:'pulse',cap:{name:'REPULSION WAVE',text:'충격 범위 +40% · 강한 후퇴와 0.4초 경직 (보스 면역)',effect:{waveRange:1.4,knockback:.1,stun:true}}},
   frost:{high:60,critical:80,highEffect:{slowStacks:2},criticalEffect:{slowStacks:3},heatRule:'shell',cap:{name:'DEEP FREEZE',text:'4중첩 일반 적 1.2초 동결 · 정예 강한 감속 · 보스 최대 10% 감속',effect:{freeze:true}}}
  },
  modules:{
   cooling:{cap:'Lv5: 냉각 효과량 +35%',capFactor:1.35},medical:{cap:'Lv5: 전투 후 회복 효과량 +50%',capFactor:1.5},repair:{cap:'Lv5: 직원 수리 효과량 +40%',capFactor:1.4},ammo:{cap:'Lv5: 탄약 피해 효과량 +35%',capFactor:1.35},
   overdrive:{damage:.12,rate:.08,thresholds:[60,80,95],cap:'Lv5: 고열 증폭 효과량 +50%',capFactor:1.5},
   crewArms:{damage:.2,range:.25,grip:.35,pierce:.25,cap:'Lv5: 개인화기 관통 +25%p'},
   shield:{capacity:60,recharge:14,capRecharge:.65,cap:'Lv5: 실드 재충전 시간 35% 감소'},
   autoRepair:{repair:.55,emergency:2.5,cap:'Lv5: 내구 30% 이하 수리량 ×2.5'},
   grinder:{money:8,scrap:5,elite:1.2,boss:1.5,capBonus:1.5,cap:'Lv5: 완료 보상 +50%'},
   targeting:{range:.18,edge:.8,edgeDamage:.22,cap:'Lv5: 최대 사거리 80% 이상 거리의 적 피해 +22%'}
  }
 };
 W.maxLevel=C.maxTurretLevel;Object.assign(W.costs,{6:115,7:160,8:230});B.upgrade.heatPerLevel=.025;B.moduleUpgrade.perLevel=C.moduleGrowth;
 const tuning={gatling:[1.2,10,10],cannon:[1.25,58,6],mortar:[1.25,54,5],scatter:[1.2,36,7],tesla:[1.2,30,6]};
 for(const[id,[damage,heat,cool]]of Object.entries(tuning))Object.assign(D.TURRETS[id],{damage:D.TURRETS[id].damage*damage,heat,cool});
 D.TURRETS.cannon.range='medium';D.TURRETS.scatter.armorPierce=.5;D.TURRETS.tesla.armorPierce=1;
 const add=(id,name,icon,role,damage,interval,range,heat,cool,price,extra={})=>D.TURRETS[id]={name,icon,role,damage,interval,range,heat,cool,price,ammo:true,armorPierce:0,power:REVISION_CONFIG.power.map(p=>({...p})),...extra};
 add('breaker','철갑파괴포','B','장갑 약화 / 지원',42,3.8,'long',65,6,175,{armorPierce:.6});
 add('phosphorus','백린탄포','P','지속 화염지대',32,3.2,'long',58,5,180,{trajectory:'arc',minRange:'mortarMin'});
 add('repulsor','충격파 포탑','R','접근 차단 / 넉백',18,2.1,'close',38,6,135,{ammo:false});
 add('frost','동결포','F','감속 / 군중 제어',15,1.8,'medium',33,6,145,{ammo:false});
 for(const t of Object.values(D.TURRETS))t.heat*=C.baseHeatMultiplier;
 const names={overdrive:['과열 증폭 모듈','▲',125],crewArms:['승무원 강화 모듈','✚',105],shield:['실드 모듈','◇',140],autoRepair:['자동수리 모듈','⚒',115],grinder:['분쇄기 모듈','¤',130],targeting:['조준 보조 모듈','◎',110]};
 for(const[id,[name,icon,price]]of Object.entries(names))D.MODULES[id]={name,icon,price,effect:id,range:0,description:C.modules[id].cap};
 for(const[id,t]of Object.entries(D.TURRETS)){const spec=C.turret[id]||C.turret.cannon;t.maxLevel=8;t.rangeType=t.range;t.heatGenerationRule=spec.heatRule;t.highHeatEffect=spec.highEffect;t.criticalHeatEffect=spec.criticalEffect;t.level8Capstone=spec.cap;t.baseStats={damage:t.damage,interval:t.interval,heat:t.heat,cool:t.cool};}
 for(const[id,m]of Object.entries(D.MODULES)){m.maxLevel=m.upgradeable===false?1:5;m.auxSlotUnlockLevel=m.upgradeable===false?null:3;m.auxEfficiency=C.auxEfficiency;m.level5Capstone=C.modules[id]?.cap||'기본 기능 강화';}
 B.train.carNames[5]=C.extraCar.name;B.station.carPrices[2]=C.extraCar.price;
 META_CONFIG.upgrades.extraCar={id:'extraCar',group:'advanced',name:'증결 객차',max:1,costs:[C.extraCar.cost],values:[1],text:'런 중 구매 가능한 최대 객차 5 → 6량'};
})();
