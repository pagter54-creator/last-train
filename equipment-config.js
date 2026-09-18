/* All new equipment tuning lives here; values are provisional. */
(()=>{
 const D=GAME_DATA,B=D.BALANCE,W=WEAPON_UPGRADES;
 const C=window.EQUIPMENT_REFORM={
  maxTurretLevel:8,maxModuleLevel:5,moduleCosts:{2:25,3:45,4:75,5:110},auxUnlock:3,auxEfficiency:.7,
  baseHeatMultiplier:.9,overheatCoolingMultiplier:2.5,retargetFactor:.25,unarmoredThreshold:.12,closeDistance:.22,
  ballistics:{knockback:.035,breachPierce:.9,extraDelay:.18,extraOffset:.035,chainSeconds:.16,zonePierce:.2},
  moduleGrowth:.2,moduleCapLevel:5,heatCapacityBonus:{6:10,7:25,8:50},lowHull:.3,zoneTick:1,maxZones:16,zoneSpreadLimit:3,
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
   cooling:{},medical:{},repair:{},ammo:{},
   overdrive:{damage:.12,rate:.08,thresholds:[60,80,95]},
   crewArms:{damage:.2,range:.25,grip:.35},
   shield:{capacity:60,recharge:14},
   autoRepair:{repair:.55},
   grinder:{interval:5,money:5,scrap:3},
   targeting:{range:.10,rangeGrowth:.25}
  }
 };
 W.maxLevel=C.maxTurretLevel;Object.assign(W.costs,{6:115,7:160,8:230});B.upgrade.heatPerLevel=.025;B.moduleUpgrade.perLevel=C.moduleGrowth;
 const tuning={gatling:[1.2,10,10],cannon:[1.25,58,6],mortar:[1.25,54,5],scatter:[1.2,36,7],tesla:[1.2,30,6]};
 for(const[id,[damage,heat,cool]]of Object.entries(tuning))Object.assign(D.TURRETS[id],{damage:D.TURRETS[id].damage*damage,heat,cool});
 B.targeting.cannon=1;D.TURRETS.cannon.range='cannon';D.TURRETS.scatter.armorPierce=.5;D.TURRETS.tesla.armorPierce=1;
 const add=(id,name,icon,role,damage,interval,range,heat,cool,price,extra={})=>D.TURRETS[id]={name,icon,role,damage,interval,range,heat,cool,price,ammo:true,armorPierce:0,power:REVISION_CONFIG.power.map(p=>({...p})),...extra};
 add('breaker','철갑파괴포','B','장갑 약화 / 지원',42,3.8,'long',65,6,175,{armorPierce:.6});
 add('phosphorus','백린탄포','P','지속 화염지대',32,3.2,'long',58,5,180,{trajectory:'arc',minRange:'mortarMin'});
 B.targeting.repulsor=.55;add('repulsor','충격파 포탑','R','광역 제압 / 넉백',18,2.1,'repulsor',38,6,135,{ammo:false,splash:D.TURRETS.mortar.splash});
 add('frost','동결포','F','광역 감속 / 군중 제어',15,1.8,'medium',33,6,145,{ammo:false,splash:D.TURRETS.mortar.splash});
 for(const t of Object.values(D.TURRETS))t.heat*=C.baseHeatMultiplier;
 const names={overdrive:['과열 증폭 모듈','▲',125],crewArms:['승무원 강화 모듈','✚',105],shield:['실드 모듈','◇',140],autoRepair:['자동수리 모듈','⚒',115],grinder:['분쇄기 모듈','¤',130],targeting:['조준 보조 모듈','◎',110]};
 for(const[id,[name,icon,price]]of Object.entries(names))D.MODULES[id]={name,icon,price,effect:id,range:0,description:C.modules[id].cap};
 // Crew Arms is a support module with a base reach of one car to either side.
 D.MODULES.crewArms.range=1;
 // Ancient equipment is a real gameplay/category flag, not just a codex label.
 // Later update files add more marked equipment using the same shared flavor table.
 const ancientFlavor=window.LAST_RAIL_ANCIENT_GEAR_FLAVOR={
  tesla:'코일의 권선 수와 입력 전압은 계산이 맞지 않는다. 그런데 전류는 손실 없이 다음 표적으로 뛰어간다. 정비반은 원리를 설명하는 대신 절연 장갑을 두 겹 낀다.',
  repulsor:'폭약도 탄체도 없는데 공기가 먼저 밀려난다. 내부의 검은 공진판을 분해한 사람은 있었지만, 같은 배열로 다시 조립해 작동시킨 사람은 없었다.',
  frost:'냉매 탱크도 압축기도 보이지 않는다. 전원을 넣으면 포신의 안쪽부터 서리가 피고, 맞은 금속은 한겨울처럼 굳는다. 어디로 열이 사라지는지는 아직 모른다.',
  interceptor:'사격통제 장치는 표적이 나타나기 전부터 포신을 움직일 때가 있다. 오작동으로 기록하려 했지만, 몇 초 뒤 늘 그 방향에서 무언가가 날아왔다.',
  penetrator:'탄체가 장갑을 뚫었다기보다 장갑이 아주 짧은 순간 비켜난 것처럼 흔적이 남는다. 포수들은 관통포라 부르지만, 기술자들은 그 이름부터 정확하지 않다고 말한다.',
  overdrive:'보통 장비는 열을 버려야 오래 버틴다. 이 모듈은 반대로 열이 쌓일수록 더 많은 출력을 끌어낸다. 왜 녹지 않는지는 설명서에도 적혀 있지 않다.',
  swiftWarp:'이동 명령 뒤 직원은 분명 다음 객차에서 발견된다. 문제는 두 객차 사이의 감시 기록에서 몇 프레임이 통째로 비어 있다는 것이다.',
  makeshiftRepair:'파손된 철판에 장치를 대면 용접도 하지 않았는데 균열이 닫힌다. 재료를 채워 넣는 것이 아니라, 객차가 멀쩡했던 모양을 잠깐 기억해내는 것처럼 보인다.',
  recoveryDrone:'의무반은 이 드론의 처치 순서를 이해하지 못한다. 맥박보다 먼저 신경 반응이 돌아오고, 약물 투여 기록 없이 호흡이 안정된다. 그래도 살아난 사람은 이유를 묻지 않는다.',
  cooling:'열교환기에서 바깥으로 빠져나가는 열이 측정되지 않는다. 그런데 포신의 온도는 내려간다. 정비반은 장치 주변에서 장시간 잠들지 말라는 규칙만 추가했다.'
 };
 const markAncient=id=>{const d=D.TURRETS[id]||D.MODULES[id];if(!d)return;d.ancient=true;d.flavor=ancientFlavor[id]||d.flavor;};
 for(const id of ['tesla','repulsor','frost','overdrive','cooling'])markAncient(id);
 for(const[id,t]of Object.entries(D.TURRETS)){const spec=C.turret[id]||C.turret.cannon;t.maxLevel=8;t.rangeType=t.range;t.heatGenerationRule=spec.heatRule;t.highHeatEffect=spec.highEffect;t.criticalHeatEffect=spec.criticalEffect;t.level8Capstone=null;t.baseStats={damage:t.damage,interval:t.interval,heat:t.heat,cool:t.cool};}
 for(const[id,m]of Object.entries(D.MODULES)){m.maxLevel=m.upgradeable===false?1:5;m.auxSlotUnlockLevel=m.upgradeable===false?null:3;m.auxEfficiency=C.auxEfficiency;m.level5Capstone=null;}
 B.train.carNames[5]=C.extraCar.name;B.station.carPrices[2]=C.extraCar.price;
 META_CONFIG.upgrades.extraCar={id:'extraCar',group:'advanced',name:'증결 객차',max:1,costs:[C.extraCar.cost],values:[1],text:'런 중 구매 가능한 최대 객차 5 → 6량'};
})();
