/* Permanent progression v1.1. Arrays describe cumulative effects at each level. */
(() => {
 const upgrades={},add=(id,group,name,costs,values,text,requires)=>upgrades[id]={id,group,name,costs,values,text,requires,max:costs.length};
 add('hull','basic','열차 내구 강화',[5,8,12,18,25],[.08,.16,.24,.32,.4],'객차 최대 HP +{percent}%');
 add('engine','basic','엔진 개선',[5,8,12,18,25],[.06,.12,.18,.24,.3],'열차 기본 속도 +{percent}%');
 for(const [id,name,field]of [['scrap','철거술 숙련','고철 획득량'],['money','보물 찾기','돈 획득량']])add(id,'basic',name,[4,7,10,14,20],[.03,.06,.09,.12,.15],field+' +{percent}%');
 for(const[id,name,text]of [['gearPrice','흥정술 숙련','포탑·모듈 가격'],['crewPrice','협상의 대가','직원 영입 비용'],['upgradePrice','재료 절약','포탑 강화 고철 비용']])add(id,'basic',name,[4,8,12,16,20],[.02,.04,.06,.08,.1],text+' −{percent}%');
 add('engineHeal','advanced','엔지니어 출신 열차장',[10,12,14,16,18,20,22,24,26,30],[1,2,3,4,5,6,7,8,9,10],'기관실 초당 HP +{value} · 직접 지휘 중/파괴 시 제외');
 add('tools','advanced','더 많은 도구들',[180],[1],'열차장에서 1차 분기 가능 · 정비소 1차 분기 시간 0');
 add('fortune','advanced','인복',[40,80,140],[1,2,3],'시작 직원 {value}명을 2성으로 (탑승 인원 한도 내)');
 add('extraCrew','advanced','추가 모집',[160],[1],'시작 직원 3명',{id:'fortune',level:2});
 add('startModule','advanced','기초 모듈 설치',[100],[1],'시작 시 무작위 일반 모듈 1개');
 add('startTurret','advanced','더 많은 화력',[100],[1],'시작 시 무작위 일반 포탑 1개');
 add('power','advanced','추가 전력',[160],[1],'기관실 기본 전력 3');
 add('startScrap','advanced','비축된 고철',[20,35,55],[20,40,60],'시작 고철 +{value}');
 add('startMoney','advanced','금수저',[20,40,70],[100,200,300],'시작 돈 +{value}');
 add('focus','captain','집중 사격 훈련',[15,25,35,45,60],[.05,.1,.15,.2,.25],'집중 사격 사거리 보너스 +{percent}%');
 add('focusCool','captain','급속 냉각 시스템',[20,30,40,55,70],[10,20,30,40,50],'집중 사격 사용 시 모든 포탑 열 −{value}');
 add('commandBook','captain','열차장 교본',[15,25,35,50,65],[.5,.8,1,1.5,2],'직접 지휘 스탯 추가 +{value}');
 add('revive','captain','구급 키트 완비',[100,180],[1,2],'직접 지휘 객차의 전투불능 직원 완전 회복 · 런당 {value}회 · 수동 사용');
 add('armorTime','captain','비상 장갑 강화',[15,25,35,50,65],[.05,.1,.15,.2,.25],'비상 장갑 지속시간 +{percent}%');
 add('armorHeal','captain','긴급 수리 키트',[15,25,35,50,65],[1,1.5,2,2.5,3],'비상 장갑 중 초당 객차 HP +{value} · 파괴 객차 제외');
 const modifications={};for(const[id,name,cost,points,text,penalty]of [
 ['random','무작위 무장 체계',150,1,'시작/획득 포탑 무작위 결정','장비 선택 결과를 통제할 수 없음'],
 ['captain','현장 열차장',450,3,'총합 30 스탯·전용 재능·성장 불가 열차장 합류','일반 직원 슬롯 사용 · 사망 시 런 종료'],
 ['grid','고출력 전력망',400,3,'모든 객차 출력 4 · 장비별 추가 효과','추가 출력에는 공급 가능한 전력이 필요'],
 ['rage','과열 폭주',280,2,'과열 시 3초간 피해 +25%, 사격 지속','폭주 후 열 0까지 사격 불가'],
 ['rifle','장거리 라이플 보급',240,2,'직원 대응사격 사거리 확대','전투 −2 (최소 1)'],
 ['armor','특수 장갑 열차',350,3,'객차 최대 HP ×1.4','설치한 포탑 판매·재배치 불가'],
 ['repair','자동 복구 체계',180,1,'전투 후 모든 객차 최대 HP 10% 회복','직원 수리 효율 −25%'],
 ['military','군사 훈련',220,2,'직원 전투 +3','수리 −2 · 운용 −2 (최소 1)'],
 ['pressure','초고압 기관',300,2,'기관실 최대 출력 4 · 출력별 추가 속도','출력 4에서 기관실 지속 피해'],
 ['close','근거리 화력 교리',250,2,'근거리 포탑 피해 강화','모든 포탑 사거리 감소'],
 ['long','원거리 화력 교리',250,2,'장거리 포탑 피해 강화','모든 포탑 최소 사거리 제한']])modifications[id]={id,name,cost,points,text,penalty};
 window.META_CONFIG={version:2,advancedSpent:300,modSpent:1000,upgrades,modifications,points:[[1000,2],[1300,3],[1650,4],[2050,5],[2500,6],[3000,7],[3550,8],[4150,9],[4800,10]],
   apocalypse:[{}, {enemyHp:.05,enemyDamage:.05},{budget:.1},{money:-100},{titan:.07},{enemyHp:.1,enemyDamage:.1},{eliteCap:1},{shop:.1},{distance:-1},{fewerStations:true},{normalDistance:.25,eliteDistance:.2}],
   apocalypseText:['기본 규칙','적·정예·보스 HP 및 피해 +5%','위협 예산 +10%','시작 돈 −100 (최소 0)','타이탄 기본 속도 +7%','적·정예·보스 HP 및 피해 추가 +10%','동시 정예 상한 +1','정비소 장비·직원·수리 가격 +10%','시작 타이탄 거리 −1 km','ACT별 정비소 최대 2곳 · 보스 직전 정비소 보존','일반 전투 길이 +25% · 정예전 +20%'],
   reward:[[0,1],[1,1.05],[4,1.1],[7,1.15],[10,1.2]],
   tuning:{captainStats:30,captainCombatBonus:2,rifleRange:.65,rifleCombat:-2,military:{combat:3,repair:-2,operate:-2},armorHp:1.4,afterHeal:.1,repairFactor:.75,rageSeconds:3,rageDamage:1.25,pressureSpeed:[1,1.04,1.1,1.18,1.3],power4BaseSpeed:1.2,pressureHpPerSecond:.004,closeDamage:1.4,closeRange:.8,longDamage:1.4,longMin:.24,repairTick:1},
   power4:{turrets:{gatling:{interval:.85},cannon:{damage:1.25},scatter:{damage:1.2},mortar:{splash:.08},tesla:{chains:1}},modules:{cooling:1.7,repair:1.7,medical:1.7,ammo:1.7,generator:1},defaultModule:1.6,generatorExtraPower:1}
 };
 // Keep the existing registry object so old save/UI references remain valid.
 for(const id of Object.keys(GAME_DATA.META_UPGRADES))delete GAME_DATA.META_UPGRADES[id];Object.assign(GAME_DATA.META_UPGRADES,upgrades);
})();
