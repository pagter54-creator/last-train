/* Event values are tuning data, not elapsed simulation seconds. Distances are km. */
window.EVENT_CONFIG=(()=>{
  const outcome=(title,text,reward={},weight=1)=>({title,text,reward,weight});
  const choice=(id,label,time,reward={},extra={})=>({id,label,time,reward,...extra});
  const pass=(distance=.2)=>choice('pass','멈추지 않고 통과한다',0,{distance},{title:'뒤돌아보지 않는다',text:'열차는 속도를 유지하며 사건 현장을 지나쳤다.'});
  const risk=(chance,good,bad)=>({chance,outcomes:[good,bad]});
  const event=(id,act,title,text,choices)=>({id,act,title,text,choices});
  const events=[
    event('abandoned_station',1,'버려진 정거장','녹슨 급수탑 아래, 닫힌 창고와 군수품 상자가 남아 있다.',[
      pass(.3),choice('search','정거장을 수색한다',.5,{},risk(.7,outcome('아직 쓸 만한 게 있군','먼지 속에서 보급품을 찾아냈다.',{money:[40,80],scrap:[15,30]}),outcome('잠긴 창고','창고를 열다가 직원이 다쳤다.',{crewDamage:[10,20]}))),
      choice('scholar','연구자에게 군수품 식별을 맡긴다',.3,{relics:2,scrap:25,gear:'any'},{condition:{trait:'scholar'},title:'군수 보관소',text:'연구자가 남겨진 표식을 읽고 보관소를 열었다.'})]),
    event('wreck_train',1,'파괴된 수송열차','탈선한 열차에서 연기가 새어 나온다. 깊이 들어갈수록 위험해 보인다.',[
      pass(),choice('quick','주변 부품만 빠르게 회수한다',.3,{scrap:[20,35],money:[20,40]},{title:'빠른 수색'}),
      choice('cargo','화물칸을 수색한다',.5,{scrap:[10,15]},risk(.65,outcome('그럭저럭 쓸 만하군','추가 화물을 확보했다.',{scrap:[25,40]}),outcome('화물칸이 폭발했다!','폭발 파편이 객차를 때렸다.',{carDamage:[20,35]}))),
      choice('engine','기관실까지 들어간다',.6,{scrap:[10,20]},risk(.45,outcome('기관실이 노다지였어','고대 부품이 아직 남아 있었다.',{relics:[2,3],scrap:[30,50]}),outcome('먼저 온 손님','선객에게 습격당했다.',{crewDamage:[15,25]}))),
      choice('repair','숙련공에게 해체를 맡긴다',.5,{scrap:55},{condition:{stat:'repair',min:7},title:'쓸 수 있는 것만 골라내지'})]),
    event('injured_survivors',1,'부상당한 생존자들','선로 옆에서 구조를 요청한다. 부상자 뒤의 그림자가 수상하다.',[
      pass(),choice('aid','치료 물자를 건넨다',.3,{}, {cost:{money:30},...risk(.25,outcome('뜻밖의 답례','생존자가 잔해를 답례로 건넸다.',{relics:1}),outcome('짧은 선의','물자를 건네고 열차로 돌아왔다.'))}),
      choice('one','한 명을 구조한다',.4,{candidates:1},{title:'새로운 승객'}),
      choice('all','모두 구조하러 간다',.7,{},risk(.55,outcome('사람은 짐이 아니다','생존자 두 명 중 함께할 동료를 고를 수 있다.',{candidates:2,money:[30,50]}),outcome('함정이었다','매복한 약탈자들에게 당했다.',{moneyLoss:[30,60],crewDamage:20}))),
      choice('medic','의무병에게 부상을 확인하게 한다',.4,{medicalRescue:true},{condition:{trait:'medic'},title:'상처는 거짓말하지 않는다'})]),
    event('raider_trade',1,'약탈자 거래단','백기를 단 장갑차가 나란히 달린다. 장비는 좋아 보이지만 가격은 비싸다.',[
      pass(),choice('shop','거래한다',.3,{shop:'raider'},{title:'황무지의 장사꾼'}),
      choice('haggle','가격을 흥정한다',.4,{},risk(.5,outcome('좋아, 그 가격으로 하지','흥정에 성공했다.',{shop:'raider',shopFactor:.8}),outcome('기분 상하게 하는군','상인이 가격을 더 올렸다.',{shop:'raider',shopFactor:1.1}))),
      choice('threat','무력으로 위협한다',.3,{}, {skill:'combat',...risk(.5,outcome('말보다 빠른 협상','물품 하나를 공짜로 받고 나머지도 할인받는다.',{shop:'raider',shopFactor:.9,freeItem:true}),outcome('허세가 들켰다','물러나는 동안 돈과 거리를 잃었다.',{moneyLoss:[20,40],distance:-.2}))})]),
    event('broken_rails',1,'끊어진 철로','무너진 철로 너머로 길이 이어진다. 수리하거나 우회하거나 도약해야 한다.',[
      choice('detour','안전하게 우회한다',.4,{}, {title:'느리지만 안전하게'}),
      choice('fix','임시 선로를 설치한다',.4,{}, {cost:{scrap:15},...risk(.75,outcome('임시 선로','안전하게 건넜다.'),outcome('계산 착오','선로가 휘어 두 객차가 충격을 받았다.',{carDamage:[15,20],carCount:2}))}),
      choice('jump','전속력으로 뛰어넘는다',0,{distance:.2},risk(.4,outcome('전속력으로','가속을 유지해 거리를 벌렸다.',{distance:.5}),outcome('거친 착지','열차 전체가 크게 흔들렸다.',{carDamage:[10,15],carCount:'all'}))),
      choice('expert','숙련공이 최소한만 고친다',.2,{}, {condition:{stat:'repair',min:8},cost:{scrap:8},title:'최소한만 고치면'})]),
    event('suspicious_fuel',1,'수상한 연료','출처를 알 수 없는 연료통이 놓여 있다. 출력은 강하지만 엔진이 버틸까?',[
      pass(0),choice('little','조금만 사용한다',.2,{},risk(.8,outcome('엔진이 힘을 낸다','짧은 가속으로 추격자를 따돌렸다.',{distance:.7}),outcome('불안정한 연소','다음 전투 동안 엔진 속도 −10%.',{temporaryEngine:.9}))),
      choice('all','전부 주입한다',.3,{},risk(.45,outcome('폭발적인 가속','황무지를 가르며 멀어졌다.',{distance:1.5}),outcome('엔진 과부하','기관실이 손상되고 다음 전투 동안 엔진 속도 −15%.',{engineDamage:25,temporaryEngine:.85})))]),
    event('distress',1,'조난 신호','잡음 사이로 구조 신호가 들린다. 사람의 목소리인지, 녹음인지 알 수 없다.',[
      pass(),choice('investigate','신호를 따라간다',.5,{}, {outcomes:[outcome('살아 있는 목소리','생존자의 보급품을 나눠 받았다.',{money:[30,60],possibleCandidate:true},.5),outcome('녹음된 함정','기계가 재생한 목소리에 속았다.',{crewDamage:[15,25],moneyLoss:[20,40]},.3),outcome('고대의 메아리','신호를 보내던 고대 장치를 회수했다.',{relics:[2,3]},.2)]})]),
    event('ancient_wreck',2,'고대병기 잔해','거대한 기계의 잔해 안쪽에서 아직 빛이 맥동한다.',[
      pass(),choice('surface','겉의 잔해만 줍는다',.3,{relics:1,scrap:[10,20]},{title:'노출된 잔해'}),
      choice('inside','안쪽을 수색한다',.6,{relics:1},risk(.6,outcome('남아 있는 동력','고대 잔해를 추가 회수했다.',{relics:[2,4]}),outcome('잔류 방어 장치','방어 장치가 작동했다.',{carDamage:25,crewDamage:15}))),
      choice('core','핵심부를 해체한다',.9,{relics:2},{scholarChance:.75,...risk(.3,outcome('고대의 심장','핵심 부품을 손에 넣었다.',{relics:[4,6],possibleRareGear:true}),outcome('동력 역류','객차 손상과 함께 장비 하나가 다음 전투 동안 정지한다.',{carDamage:[35,45],disableGear:true}))})]),
    event('military_base',2,'폐군사기지','폐쇄된 격납고 뒤에 무기고와 지하 실험실이 있다.',[
      pass(),choice('outside','바깥 보급품을 챙긴다',.4,{scrap:25,money:30},{title:'군수품 회수'}),
      choice('armory','무기고를 연다',.7,{scrap:15},risk(.55,outcome('잠든 포대','포탑을 확보했다.',{gear:'turret'}),outcome('자동 방어 체계','직원들이 방어 장치에 다쳤다.',{crewDamage:[15,25],crewCount:2}))),
      choice('lab','지하 실험실에 진입한다',1,{scrap:10},risk(.35,outcome('비밀 연구 자료','실험실의 보상을 회수했다.',{labReward:true}),outcome('격리 절차','경보 속에서 간신히 탈출했다.',{crewDamage:20,crewCount:2,carDamage:20,distance:-.2})))]),
    event('other_train',2,'다른 생존자 열차','상처 입은 열차 한 대가 속도를 맞춘다. 물자와 정보를 나눌 수 있을 것 같다.',[
      pass(),choice('exchange','물자를 교환한다',.3,{shop:'exchange'},{title:'선로 위의 물물교환'}),
      choice('rest','물자를 보태 함께 정비한다',.6,{repairRatio:.15,healRatio:.1},{cost:{money:30},condition:{damagedTrain:true},title:'잠깐의 동행'}),
      choice('info','다음 노선 정보를 묻는다',.3,{routeInfo:true},{title:'앞선 열차의 이야기'})]),
    event('mystery_merchant',2,'정체불명의 상인','상인은 돈 대신 고대 잔해를 원한다. 밀봉된 상자도 진열되어 있다.',[
      pass(0),choice('shop','고대 잔해로 거래한다',.2,{shop:'relic'},{title:'기이한 거래'}),
      choice('box','밀봉된 상자를 구입한다',.2,{}, {cost:{relics:2},outcomes:[outcome('강한 에너지','상자에 고급 장비가 있었다.',{gear:'rare'},.2),outcome('묵직한 장비','쓸 만한 장비를 얻었다.',{gear:'any'},.4),outcome('금속의 무게','고철이 가득했다.',{scrap:[25,40]},.25),outcome('텅 빈 상자','아무것도 들어 있지 않았다.',{},.15)]})]),
    event('ruins',2,'이상한 유적','열차 장치와 공명하는 유적이다. 건드리면 무엇이 바뀔지 알 수 없다.',[
      pass(),choice('search','주변을 조사한다',.5,{relics:1},risk(.6,outcome('잊힌 흔적','잔해를 더 발견했다.',{relics:[1,3]}),outcome('보이지 않는 덫','조사하던 직원이 다쳤다.',{crewDamage:[15,25]}))),
      choice('activate','장치를 가동한다',.8,{},risk(.35,outcome('열차와의 공명','이번 런 동안 유지되는 개선을 얻었다.',{buff:true}),outcome('불완전한 공명','이번 런 동안 장치에 이상이 남는다.',{debuff:true})))]),
    event('biker_race',2,'폭주족의 경주 제안','오토바이 무리가 열차 옆에서 도발한다. 엔진의 한계를 시험할 것인가?',[
      pass(0),choice('race','정면으로 경주한다',0,{}, {engineChance:true,...risk(.5,outcome('선로의 승자','상금을 받고 거리를 벌렸다.',{money:70,distance:.5}),outcome('뒤처진 열차','경주에 밀리며 추격자와 가까워졌다.',{distance:-.3}))}),
      choice('overdrive','엔진을 혹사하며 달린다',0,{},risk(.65,outcome('붉은 한계선','상금을 챙기고 멀리 도주했다.',{money:100,distance:1}),outcome('승부보다 생존','엔진이 손상됐지만 거리는 조금 벌렸다.',{engineDamage:20,distance:.2})))]),
    event('arena',2,'황무지 투기장','열차를 따라붙은 투기장 차량에서 승부를 제안한다. 출전할 직원을 고르자.',[
      pass(),choice('fight','직원 한 명을 출전시킨다',.5,{}, {dispatch:true,skill:'combat',...risk(.5,outcome('첫 승리','출전한 직원이 상금을 받아 돌아왔다.',{money:[80,150]}),outcome('상처뿐인 귀환','출전한 직원이 패배했다.',{actorDamage:[30,50]}))}),
      choice('bet','판돈을 걸고 출전한다',.6,{}, {cost:{money:50},dispatch:true,skill:'combat',...risk(.5,outcome('관중의 환호','큰 상금과 실전 경험을 얻었다.',{money:200,possibleTalent:true}),outcome('무거운 패배','판돈을 잃고 출전 직원도 다쳤다.',{actorDamage:50}))})])
  ];
  // Optional analysis and dispatch rules are data; new events can reuse them.
  events.find(e=>e.id==='distress').analysis=[{trait:'scholar',choice:'investigate',texts:['사람이 보내는 구조 신호','반복 재생되는 인공 신호','고대 장치의 신호']}];
  events.find(e=>e.id==='mystery_merchant').analysis=[{trait:'scholar',choice:'box',texts:['상자에서 강한 에너지 감지','상자에서 일반 장비의 진동 감지','상자에서 금속의 울림 감지','상자에서 아무 반응도 없음']}];
  const survivors=events.find(e=>e.id==='injured_survivors');survivors.analysis=[{trait:'medic',choice:'all',texts:['실제 부상자입니다','부상을 가장한 함정입니다']}];survivors.choices.find(c=>c.id==='medic').avoidTrap='all';
  for(const e of events)for(const c of e.choices)if(c.skill||c.condition?.trait||c.condition?.stat)c.dispatch=true;
  return {events,version:1,storageKey:'lastRailEventCheckpointV1',act2Weight:.7,historyLength:3,
    skill:{reference:5,step:.05,min:.1,max:.95},engine:{powerReference:2,powerStep:.05,hullStep:.2},
    survivorStars:[.65,.3,.05],medicalStars:[.25,.6,.15],survivorHp:[.3,.6],candidateChance:.5,rareGearChance:.4,talentChance:.15,
    shop:{count:4,exchangeCount:3,markup:[1.1,1.2],rareChance:.45,relicPrice:[3,6],rareLevel:2,rarePoolFraction:1/3},
    labRewards:[{relics:4},{gear:'rareModule'},{voucher:1}],combatTalents:['marksman','gunner','lonewolf'],
    buffs:{engine:1.05,cooling:1.1,recovery:1.1,repair:1.1,module:1.05},debuffs:{engine:.95,cooling:.9,recovery:.9,hull:.9},
    exchanges:[{cost:{money:40},reward:{scrap:30},label:'돈 40 → 고철 30'},{cost:{scrap:25},reward:{healCrew:10},label:'고철 25 → 모든 직원 HP +10'},{cost:{money:80},reward:{gear:'any'},label:'돈 80 → 장비 한 개'},{cost:{relics:1},reward:{scrap:40},label:'잔해 1 → 고철 40'},{cost:{scrap:20},reward:{money:50},label:'고철 20 → 돈 50'}]};
})();
