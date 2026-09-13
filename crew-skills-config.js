/* Shared skill definitions. New numbers are provisional tuning values. */
(()=>{
 const D=GAME_DATA,C=window.CREW_SKILLS_CONFIG={eventWeight:.18,history:3,stanceSeconds:8,closeRange:.22,lowHull:.3,lastHull:.2,firstAidHp:.25,firstAidHeal:.25,toughHp:.3,toughRemain:1,maxSupport:.5,maxStatBonus:1,maxDamageReduction:.75,maxWeaponBonus:1,trainingTime:.45,rareTime:.7,failureHp:12,highFailureHp:25,baseChance:.7,highChance:.55,ancientTypes:['tesla'],fireReductionCap:.85};
 const add=(id,name,category,text,effect,exclusive=false)=>{D.TRAITS[id]={...D.TRAITS[id],id,name,category,text,description:text,effect,canBeNormalSkill:!exclusive,canBeEventSkill:true,eventExclusive:exclusive};};
 for(const[id,t]of Object.entries(D.TRAITS))Object.assign(t,{id,category:'legacy',description:t.text,effect:{},canBeNormalSkill:true,canBeEventSkill:true,eventExclusive:false});
 add('marksman','명사수','combat','기존 개인화기·포탑 피해 +15% 유지 · 개인화기 사거리 +25%',{range:.25});
 add('antiAir','대공 사격수','combat','드론 계열 적에게 개인화기 피해 +35%',{droneDamage:.35});
 add('boardingExpert','승선전 전문가','combat','승선 적 대상 개인화기 피해 +30% · 승선 공격으로 받는 피해 −25%',{boardDamage:.3,boardDefense:.25});
 add('armorAmmo','철갑탄 휴대','combat','개인화기 장갑 관통 +25%p',{pierce:.25});
 add('rapidTraining','속사 훈련','combat','개인화기 연사 +25% · 승선전은 1초 합산 피해 +25%',{rate:.25});
 add('closeTraining','근접 전투 훈련','combat','초근거리·승선 적·붙은 팔 대상 개인화기 피해 +25%',{closeDamage:.25});
 add('eliteHunter','정예 사냥꾼','combat','정예 적 대상 개인화기 피해 +35%',{eliteDamage:.35});
 add('steadyStance','고정 사격 자세','combat','같은 객차에 8초 머무르면 개인화기 사거리·피해 +20% · 이동 시 초기화',{stanceRange:.2,stanceDamage:.2});
 add('veteranGunner','숙련 포수','operation','현재 객차에서 운용 능력 효율 +20%',{operate:.2});
 add('overloadEngineer','과부하 기사','operation','현재 열과 무관하게 포탑 운용 효율 +30%',{weaponOperate:.3});
 add('coolantKeeper','냉각수 관리','operation','현재 객차 포탑 냉각 +15%',{cooling:.15});
 add('powerTechnician','전력 기술자','operation','유효 전력 2 이상인 객차에서 운용 +20%',{poweredOperate:.2});
 add('fireController','사격 통제관','operation','집중 사격 중 현재 객차 포탑 피해·연사 +12%',{focusDamage:.12,focusRate:.12});
 add('aimExpert','조준 보정 전문가','operation','현재 객차 포탑 사거리 +10%',{turretRange:.1});
 add('heatTuner','과열 조율사','operation','고열 상태 포탑 피해·연사에 추가 +10%',{hotDamage:.1,hotRate:.1});
 add('fixer','응급수리공','repair','기존 복구량 +30% 유지 · 객차 손상 비율에 따라 수리 효율 최대 +30%',{woundedRepair:.3});
 add('temporaryWeld','임시 용접','repair','객차 HP 30% 이하에서 수리 효율 +35%',{lowRepair:.35});
 add('repairForeman','정비 반장','repair','같은 객차의 다른 직원 수리 효율 +15% (합계 최대 +50%)',{repairAura:.15});
 add('partsSaver','부품 절약','repair','전투 종료 시 현재 객차 최대 HP의 3% 수리 · 파괴 객차 제외',{afterRepair:.03});
 add('dismantler','해체 전문가','repair','현재 객차 포탑 또는 본인의 개인화기로 기계형 적 처치 시 12% 확률로 고철 +2',{scrapChance:.12,scrap:2});
 add('restorationExpert','복구 전문가','repair','파괴 객차 복구 진행량 +35%',{restoration:.35});
 add('fireResistant','화염 내성','support','화재로 받는 직원 피해 −40%',{fireDefense:.4});
 add('fireTraining','소방 훈련','support','활동 중인 객차의 화재 지속시간 소모 속도 +40% (직원 합계 최대 +50%)',{fireClear:.4});
 add('tacticalMovement','전술 이동','support','객차 사이 이동속도 +25%',{move:.25});
 add('guardian','수호자','support','같은 객차의 다른 활동 직원이 받는 피해 −15% (합계 최대 −50%)',{guard:.15});
 add('fieldAid','야전 응급처치','support','스테이지당 1회 · 생존 중 HP 25% 이하에서 최대 HP의 25% 즉시 회복',{firstAid:true});
 add('toughness','강인함','support','스테이지당 1회 · 피격 직전 HP 30% 이상이면 치명타를 HP 1로 버팀',{tough:true});
 add('composure','침착함','support','객차 HP 30% 이하에서 직원이 받는 피해 −20%',{lowDefense:.2});
 add('morale','사기 진작','support','같은 객차 활동 직원 전투 +10% (합계 최대 +50%)',{combatAura:.1});
 add('independent','독립 행동','support','객차에서 혼자 활동할 때 전투·수리·운용 +20%',{solo:.2});
 add('escape','긴급 탈출','support','객차 파괴 시 생존 중이고 이동 가능한 직원은 인접한 생존 객차의 빈자리로 탈출',{escape:true});
 add('throughFlames','불길 속에서','story','화재 피해 −70% · 불타는 객차에서 전투·수리 +30%',{fireDefense:.7,burningStats:.3},true);
 add('lastStand','마지막 방어선','story','객차 HP 20% 이하에서 전투·수리·운용 +35%',{lastStats:.35},true);
 add('ancientWhisper','고대의 속삭임','story','고대 장비가 설치된 객차에서 운용 +40% (테슬라 및 ancient 태그 장비)',{ancientOperate:.4},true);
 add('railOath','철로의 맹세','story','기관실 또는 선두 객차에서 전투·수리 +25%',{frontStats:.25},true);
 add('lifeDebt','빚진 목숨','story','같은 객차에 다른 활동 직원이 있으면 본인 전투·수리·운용 +20%',{partnerStats:.2},true);
 add('wastelandHunter','황무지의 사냥꾼','story','정예 대상 개인화기 피해 +45% · 정예가 살아 있는 동안 이동속도 +30%',{eliteDamage:.45,eliteMove:.3},true);
 window.CREW_SKILLS=D.TRAITS;
 for(const [id,e]of Object.entries(D.ENEMIES)){e.mechanical??=!e.boards&&e.behavior!=='infiltrator';if(/drone/i.test(id)||e.specialBehavior==='stealth')e.family='drone';}
 const event=(id,title,pool,skill=null,extra={})=>({id,act:1,crewGrowth:true,title,text:'직원 한 명을 선택해 훈련이나 임무를 맡깁니다. 습득한 스킬은 이벤트 슬롯에 저장됩니다.',choices:[{id:'pass',label:'통과한다',time:0,reward:{}},{id:'train',label:'직원을 파견한다',dispatch:true,time:extra.time??C.trainingTime,reward:{},...(skill?{skill,chance:extra.chance??C.baseChance,outcomes:[{weight:1,title:'임무 성공',text:'새로운 경험을 얻었다.',reward:{skillReward:{pool,count:extra.count??Math.min(3,pool.length||3)}}},{weight:1,title:'부상 후 귀환',text:'훈련을 마치지 못했다.',reward:{actorDamage:extra.damage??C.failureHp}}]}:{reward:{skillReward:{pool,count:extra.count??3}}})}]});
 const combat=['marksman','armorAmmo','antiAir','closeTraining','eliteHunter','steadyStance'];
 EVENT_CONFIG.events.push(
  event('skill_abandonedSchool','폐훈련소','normal',null,{count:1}),event('skill_firingRange','군용 사격장',combat,'combat'),
  event('skill_fieldWorkshop','야전 정비소',['fixer','temporaryWeld','repairForeman','restorationExpert','partsSaver','dismantler'],'repair'),
  event('skill_railAcademy','철도 운용 교육소',['veteranGunner','coolantKeeper','powerTechnician','fireController','aimExpert','heatTuner'],'operate'),
  event('skill_survivorCamp','생존자 캠프',['fireResistant','fireTraining','tacticalMovement','guardian','fieldAid','morale']),
  event('skill_militaryBase','폐군사기지 훈련장',['boardingExpert','eliteHunter','armorAmmo','toughness','closeTraining'],'combat',{chance:C.highChance,damage:C.highFailureHp}),
  event('skill_rescue','긴급 구조 훈련',['escape','tacticalMovement','fieldAid','guardian','fireTraining'],'recovery'),
  {...event('skill_instructor','랜덤 교관','normal',null,{time:C.rareTime}),weight:.35},
  event('skill_fireRescue','불길 속 구조',['throughFlames'],'repair'),event('skill_lastDefense','붕괴 직전의 방어선',['lastStand'],'combat'),
  event('skill_neuralLink','고대 신경 접속 장치',['ancientWhisper'],'operate'),event('skill_engineDefense','철로를 지키는 맹세',['railOath'],'repair'),
  {...event('skill_lifeRescue','동료 구조 작전',['lifeDebt'],'recovery'),requiresCompanion:true},event('skill_eliteHunt','정예 추적 사냥',['wastelandHunter'],'combat',{chance:C.highChance})
 );
 const stories={skill_fireRescue:'불길에 갇힌 생존자가 구조를 요청합니다. 직원을 보내 위험을 감수하고 구조하면 불길 속에서 살아남는 법을 배웁니다.',skill_lastDefense:'붕괴 직전의 방어 객차에 사람들이 남았습니다. 마지막까지 방어선을 지킬 직원을 고르세요.',skill_neuralLink:'고대 신경 접속 장치가 작동합니다. 직원 한 명이 접속을 시도하면 고대 장비의 신호를 이해할 수 있습니다.',skill_engineDefense:'추격자들이 기관차를 노립니다. 철로와 엔진을 지킬 직원을 선택하세요.',skill_lifeRescue:'동료 한 명이 위험에 처했습니다. 구조에 나설 직원을 선택하세요. 성공하면 함께 싸우는 동료에게 힘을 얻습니다.',skill_eliteHunt:'정예 기계의 흔적을 발견했습니다. 추적과 사냥에 성공한 직원은 황무지의 사냥꾼이 됩니다.'};
 for(const e of EVENT_CONFIG.events)if(stories[e.id])e.text=stories[e.id];
})();
