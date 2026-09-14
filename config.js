/*
 * LAST RAIL — 모든 게임플레이 수치와 콘텐츠 정의.
 * 새 콘텐츠는 해당 registry에 항목을 추가하고 ACTS의 stage pool에서 참조한다.
 * 엔진(game.js)은 특정 포탑/적/Act ID에 의존하지 않는다.
 */
window.GAME_DATA = (() => {
  const BALANCE = {
    version: '0.8.0',
    simulation: { tickRate: 30, maxDelta: 0.1, tacticalScale: 0.3, speedOptions: [0, 1, 2, 3], canvasWidth: 1440, canvasHeight: 700 },
    run: { startingMoney: 150, startingScrap: 20, startingRelics: 0, startingTitanDistance: 5, branchDistanceBonus: 0.35, maxTitanDistance: 8, clearRelicBonus: 5 },
    train: {
      carHp: 300, equipmentSlots: 2, crewSlots: 2, baseCarPower: 1,
      startingCars: 3, startingCrew: 2, maxCars: 5, minCarPower: 0,
      engineEquipmentSlots: 1, engineCrewSlots: 1, captainReservedSlots: 0,
      carNames: ['기관실', '전방 포대', '지원 객차', '중앙 포대', '후방 객차'],
      startingEquipment: [{ car: 1, kind: 'turret', type: 'gatling' }, { car: 2, kind: 'turret', type: 'cannon' }],
      enginePower: { min: 1, max: 3, start: 2 },
      speedByPower: { 1: 1.6, 2: 2.0, 3: 2.4 },
      moveSecondsPerCar: 1.5, repairGoal: 100, repairBasePerSecond: 1, repairStatScale: 0.15, restoredHpRatio: 0.3
    },
    crew: { maxHp: 100, stageHealPerRecovery: 0.04, personalDpsPerCombat: 1.2, boarderDamageReductionPerCombat: 0.025, maxDamageReduction: 0.65, directCommandBonus: 2 },
    heat: { max: 100, resumeAt: 40, operatorHeatReductionPerPoint: 0.02, operatorCoolingBonusPerPoint: 0.02, maxOperatorModifier: 0.4 },
    titan: { speedBase: 2.12, speedPerStage: 0.025, warning: 3, critical: 1.5, imminent: 0.5, forcedBattleAt: 0 },
    battle: {
      durationScale: 1, spawnVariance: 0.22, enemyApproachSpeed: 0.055, boardDistance: 0.13, baseEnemyCount: 12, enemyCountPerStage: 2.2,
      waveSize: [2, 3, 4], waveSizeStageStep: 4, maxAlive: 30,
      enemyEscapeX: 0.95, lootScatter: 0.12, destroyedCarThreat: 1.8, defaultEnemyAttackInterval: 2,
      eliteHp: 1.08, eliteDamage: 1.03, eliteCount: 1.16, eliteSpecialChance: 0.42, maxSecondaryTargets: 20,
      doctrineRepairThreshold: 0.35, doctrineMinRepairStat: 6, nonFatalEventMinHp: 1
    },
    rewards: { battleMoneyBase: 30, battleMoneyPerStage: 4, battleScrapBase: 12, battleScrapPerStage: 2, battleRelics: 1, eliteMultiplier: 1.5, eliteBonusRelics: 2 },
    upgrade: { level2Scrap: 25, level3Scrap: 45, branchScrap: 70, damagePerLevel: 0.18, heatPerLevel: -0.06 },
    armor: { maxCharge: 100, duration: 5, healRatio: 0.15, battleCharge: 30, eliteCharge: 45, coolingMultiplier: 5 },
    focus: { duration: 4, cooldown: 20, damageBonus: 0.2, rangeBonus: 0.25 },
    directCommand: { duration: 10, cooldown: 75 },
    targeting: { close: 0.28, medium: 0.62, long: 1, mortarMin: 0.28 },
    station: { repairMoneyPerHp: 0.55, crewPrices: [70, 110, 170], crewOfferCount: 2, turretOfferCount: 3, moduleOfferCount: 2, carPrices: [120, 180], actionSeconds: { buy: 8, recruit: 10, upgrade: 6, repair: 15, rearrange: 3, car: 20, depart: 5 } },
    event: { choiceSeconds: 15 },
    arsenal: { damageMultiplier: 1.35, intervalMultiplier: 0.9, heatMultiplier: 0.92, coolingMultiplier: 1.08 },
    projectile: { directSeconds: 0.2, enemySeconds: 0.45, arcSeconds: 0.85, arcHeight: 0.23, splashRadiusScale: 0.3, laneSpan: 0.48, impactSeconds: 0.65, muzzleSeconds: 0.13, areaSegments: 48 },
    formation: { baseSeconds: 6, secondsPerChange: 3 },
    sale: { moneyRatio: 0.5, turretScrapRatio: 0.5 },
    moduleUpgrade: { perLevel: 0.2, costs: [25,45], branches: {specialized:{name:'특화모델',factor:1.5,range:'self'},standard:{name:'표준모델',factor:1,range:'base'},wide:{name:'광역모델',factor:0.5,range:'all'}} },
    transition: { exitSeconds: 0.8, enterSeconds: 1.2, backdropBoost: 4, shakePixels: 12, shakeSeconds: 0.35 },
    launch: { seconds: 3, startDistance: 1.2, visualSpeed: 3.5, shakeSeconds: 0.8, shakePixels: 18 },
    feedback: { carFlashSeconds: 0.22, enemyFlashSeconds: 0.12, walkCyclesPerSecond: 3, walkAngle: 8, walkLift: 3 },
    audio: { volume: 0.14, defaultMaster: 0.65, minInterval: 0.055, maxVoices: 24, bgmTracks: { lobby: './bgm/bgm_lobby.mp3', act1_battle: './bgm/bgm_act1_battle.mp3', act2_battle: './bgm/bgm_act2_battle.mp3', act1_boss: './bgm/bgm_act1_boss.mp3', act2_boss: './bgm/bgm_act2_boss.mp3' }, bgmGain: 0.3, bgmFadeSeconds: 1.4, windInterval: 8, railInterval: 0.8,
      shot: { frequency: 150, duration: 0.07 }, hit: { frequency: 460, duration: 0.045 }, hull: { frequency: 65, duration: 0.16 },
      ui: { frequency: 650, duration: 0.045 }, purchase: { frequency: 900, end: 1350, duration: 0.18 }, recruit: { frequency: 440, end: 880, duration: 0.24 },
      equip: { frequency: 260, end: 110, duration: 0.17 }, skill: { frequency: 320, end: 960, duration: 0.28 }, upgrade: { frequency: 500, end: 1500, duration: 0.24 },
      error: { frequency: 110, end: 70, duration: 0.18 }, enemyShot: { frequency: 190, duration: 0.1 }, mortarShot: { frequency: 90, duration: 0.25 }, explosion: { frequency: 55, duration: 0.3, noise: true },
      titan: { frequency: 35, duration: 1.2, noise: true }, wind: { frequency: 400, duration: 3, noise: true, gain: 0.12 }, rail: { frequency: 95, duration: 0.12, noise: true, gain: 0.35 } },
    meta: { hullCost: 10, hullHpBonus: 0.05, engineCost: 15, engineSpeedBonus: 0.08, focusCost: 10, focusRangeBonus: 0.1 },
    unlocks: { traitSpent: 15, teslaSpent: 30, moduleSpent: 50 },
    ui: { logLimit: 12, bannerMs: 1800, toastMs: 2400 }
  };

  const TURRETS = {
    gatling: { name: '개틀링', icon: 'G', role: '잡몹 제압', damage: 6, interval: 0.25, range: 'medium', heat: 8, cool: 15, price: 80, ammo: true, armorPierce: 0, power: [{}, { intervalMult: 0.8 }, { intervalMult: 0.714, heatMult: 1.2 }], branch: { name: '회전총열', intervalMult: 0.78, heatMult: 1.08 } },
    cannon: { name: '캐논', icon: 'C', role: '중장갑 파괴', damage: 48, interval: 3, range: 'long', heat: 26, cool: 13, price: 100, ammo: true, armorPierce: 0.55, power: [{}, { intervalMult: 0.85 }, { intervalMult: 0.75, splash: 0.22 }], branch: { name: '철갑탄', damageMult: 1.3, armorPierce: 0.85 } },
    scatter: { name: '스캐터건', icon: 'S', role: '근접 방어', damage: 8, pellets: 4, interval: 1.4, range: 'close', heat: 19, cool: 18, price: 85, ammo: true, armorPierce: 0.1, power: [{}, { pelletsBonus: 1 }, { pelletsBonus: 2, intervalMult: 0.9 }], branch: { name: '용숨탄', damageMult: 1.22, splash: 0.18 } },
    mortar: { name: '박격포', icon: 'M', role: '원거리 광역', damage: 34, interval: 2.8, range: 'long', minRange: 'mortarMin', heat: 22, cool: 12, price: 125, ammo: true, armorPierce: 0.25, splash: 0.45, power: [{}, { splashBonus: 0.12 }, { damageMult: 1.25, splashBonus: 0.2 }], branch: { name: '지진탄', damageMult: 1.25, splash: 0.7 } },
    tesla: { name: '테슬라 코일', icon: 'T', role: '연쇄 제압', damage: 14, interval: 1.8, range: 'medium', heat: 20, cool: 17, price: 145, ammo: false, armorPierce: 0.2, chains: 3, chainRatio: 0.75, unlockSpent: 30, power: [{}, { chainsBonus: 1 }, { chainsBonus: 1, chainRatio: 0.88 }], branch: { name: '폭풍핵', chainsBonus: 2, damageMult: 1.15 } }
  };

  // Apply one tuning profile to base definitions; every stat panel reads these values.
  Object.values(TURRETS).forEach(t=>{
    t.damage*=BALANCE.arsenal.damageMultiplier;t.interval*=BALANCE.arsenal.intervalMultiplier;
    t.heat*=BALANCE.arsenal.heatMultiplier;t.cool*=BALANCE.arsenal.coolingMultiplier;
  });
  TURRETS.mortar.trajectory='arc';

  const MODULES = {
    cooling: { name: '냉각 모듈', icon: '❄', price: 90, effect: 'cooling', heatMult: 0.90, coolingMult: 1.15, range: 1 },
    medical: { name: '의료 모듈', icon: '+', price: 85, effect: 'medical', stageHealMult: 1.3, range: 1 },
    repair: { name: '수리 모듈', icon: '⚒', price: 80, effect: 'repair', repairMult: 1.3, range: 1 },
    ammo: { name: '탄약 모듈', icon: '▦', price: 105, effect: 'ammo', ammoDamageMult: 1.15, range: 1 },
    generator: { name: '발전 모듈', icon: 'ϟ', price: 180, effect: 'generator', extraPower: 1, range: 0, upgradeable: false }
  };

  const ENEMIES = {
    biker: { name: '바이커 사수', icon: '♠', hp: 35, carDamage: 2, crewDamage: 3, interval: 1.4, armor: 0, speed: 1.35, reward: 1, fromStage: 1, color: '#d7c66f' },
    raider: { name: '약탈자 차량', icon: '◆', hp: 80, carDamage: 6, crewDamage: 2, interval: 2.2, armor: 0.12, speed: 0.82, reward: 2, fromStage: 1, color: '#cc6a45' },
    boarder: { name: '승선병', icon: '†', hp: 45, carDamage: 1, crewDamage: 8, interval: 1.25, armor: 0, speed: 1.3, reward: 2, fromStage: 3, boards: true, color: '#b9a89b' },
    buggy: { name: '장갑 버기', icon: '⬢', hp: 150, carDamage: 8, crewDamage: 2, interval: 2.8, armor: 0.55, speed: 0.58, reward: 3, fromStage: 4, color: '#7f8e7c' },
    mortar: { name: '박격포 차량', icon: '●', hp: 100, carDamage: 12, crewDamage: 5, interval: 3.5, armor: 0.18, speed: 0.5, reward: 3, fromStage: 5, ranged: true, color: '#b85f4f' },
    drone: { name: '고대 드론', icon: '◇', hp: 120, carDamage: 7, crewDamage: 4, interval: 1.7, armor: 0.28, speed: 1.55, reward: 4, fromStage: 7, special: true, color: '#66cdd1' }
  };

  ENEMIES.biker.attackRange=0.42;
  ENEMIES.raider.attackRange=0.32;
  ENEMIES.drone.attackRange=0.55;
  ENEMIES.mortar.trajectory='arc';

  const BOSSES = {
    behemoth: {
      name: 'BEHEMOTH', duration: 240, rewardRelics: 8,
      attack: { interval: 2.5, carDamage: 5, crewDamage: 1, cannonDestroyedDamageMult: 0.45, liveCannonMultiplier: 2 },
      engineSpeedMult: 0.78,
      summon: { enemy: 'boarder', initialDelay: 5, interval: 7, disabledByPart: 'barracks' },
      parts: [
        { type: 'body', name: '본체', hp: 2400, x: 0.84, y: 0.52, victory: true },
        { type: 'cannon', name: '주포', hp: 650, x: 0.78, y: 0.36 },
        { type: 'barracks', name: '병력칸', hp: 550, x: 0.9, y: 0.55 },
        { type: 'engine', name: '엔진', hp: 600, x: 0.9, y: 0.7 }
      ]
    }
  };

  const TRAITS = {
    adaptable: { name: '적응력', text: '본인의 경험치 획득량 +20%', xpMultiplier: 1.2 },
    teacher: { name: '친절한 선생님', text: '자신과 같은 칸의 활동 직원 경험치 +10%. 여러 선생님의 보너스는 합산됩니다.', crewXpBonus: .1 },
    arrogant: { name: '오만함', text: '모든 능력 +1 · 경험치 획득량 -50%', allStats: 1, xpMultiplier: .5 },
    coward: { name: '겁쟁이', text: '승선병이 같은 칸에 있으면 전투 -2, 수리 +2', combatVsBoarder: -2, repairVsBoarder: 2 },
    marksman: { name: '명사수', text: '개인화기 및 포탑 피해 +15%', damageMult: 1.15 },
    fixer: { name: '응급수리공', text: '파괴 객차 수리 +30%', repairMult: 1.3 },
    gunner: { name: '기관총 애호가', text: '개틀링 연사 +18%, 과열 +8%', gatlingIntervalMult: 0.82, gatlingHeatMult: 1.08 },
    engineer: { name: '노련한 기관사', text: '기관실 배치 시 열차 속도 +6%', engineSpeedMult: 1.06 },
    medic: { name: '야전의무병', text: '같은 객차 직원 전투 후 회복 +25%', healMult: 1.25 },
    lonewolf: { name: '외로운 늑대', text: '객차에 혼자 있으면 모든 능력 +2', soloBonus: 2 },
    scholar: { name: '고대기술 연구자', text: '고대 장비 운용 +25%', ancientDamageMult: 1.25, unlockSpent: 15 }
  };

  const CREW_TEMPLATES = [
    { name: '윤서', background: '전직 경비대', stats: { combat: 6, operate: 4, repair: 3, recovery: 5 }, traits: ['marksman'] },
    { name: '마루', background: '화물 기관사', stats: { combat: 3, operate: 7, repair: 3, recovery: 4 }, traits: ['engineer'] },
    { name: '도윤', background: '폐선 해체공', stats: { combat: 2, operate: 3, repair: 8, recovery: 5 }, traits: ['fixer'] },
    { name: '하나', background: '야전 구호사', stats: { combat: 4, operate: 5, repair: 4, recovery: 7 }, traits: ['medic'] },
    { name: '미로', background: '황무지 사냥꾼', stats: { combat: 8, operate: 3, repair: 2, recovery: 5 }, traits: ['lonewolf'] },
    { name: '백산', background: '군수 기술자', stats: { combat: 4, operate: 6, repair: 7, recovery: 4 }, traits: ['gunner'] },
    { name: '겨울', background: '유적 조사원', stats: { combat: 3, operate: 7, repair: 5, recovery: 6 }, traits: ['scholar'] },
    { name: '진', background: '도망친 징집병', stats: { combat: 5, operate: 3, repair: 6, recovery: 6 }, traits: ['coward'] }
  ];

  const STAGE_CURVE = [
    { stage: 1, targetPI: 65, hp: 0.75, damage: 0.7, count: 1, duration: 50 },
    { stage: 2, targetPI: 72, hp: 0.82, damage: 0.74, count: 1, duration: 55 },
    { stage: 3, targetPI: 80, hp: 0.9, damage: 0.78, count: 1.04, duration: 60 },
    { stage: 4, targetPI: 90, hp: 1, damage: 0.83, count: 1.08, duration: 65 },
    { stage: 5, targetPI: 103, hp: 1.12, damage: 0.9, count: 1.13, duration: 75 },
    { stage: 6, targetPI: 118, hp: 1.25, damage: 0.97, count: 1.18, duration: 85 },
    { stage: 7, targetPI: 134, hp: 1.4, damage: 1.04, count: 1.24, duration: 90 },
    { stage: 8, targetPI: 150, hp: 1.55, damage: 1.1, count: 1.3, duration: 100 },
    { stage: 9, targetPI: 168, hp: 1.7, damage: 1.17, count: 1.36, duration: 110 },
    { stage: 10, targetPI: 186, hp: 1.85, damage: 1.24, count: 1.42, duration: 120 }
  ];

  const EVENTS = [
    { id: 'station', title: '버려진 정거장', text: '녹슨 급수탑 아래에 아직 쓸 만한 보급품이 남아 있다.', choices: [
      { label: '샅샅이 수색한다', req: 'combat', value: 5, result: { scrap: 28, money: 35 }, risk: { crewDamage: 12 }, hint: '전투 5 · 성공 시 돈과 고철' },
      { label: '철로만 확보한다', result: { distance: 0.65, repairAll: 12 }, hint: '안전 · 거리와 객차 수리' }
    ]},
    { id: 'wreck', title: '파괴된 수송열차', text: '반쯤 전복된 열차의 화물칸에서 희미한 신호가 잡힌다.', choices: [
      { label: '절단기로 화물칸을 연다', cost: { scrap: 8 }, result: { randomGear: true, relics: 2 }, hint: '고철 8 · 장비와 잔해' },
      { label: '부품만 회수한다', result: { scrap: 34 }, hint: '고철 획득' }
    ]},
    { id: 'survivor', title: '부상당한 생존자', text: '선로 옆에서 붉은 조명탄이 오른다. 누군가 아직 살아 있다.', choices: [
      { label: '응급 처치를 한다', req: 'recovery', value: 6, result: { recruit: true, healCrew: 20 }, risk: { crewDamage: 8 }, hint: '회복 6 · 직원 영입 가능' },
      { label: '식량만 건네고 떠난다', result: { distance: 0.45 }, hint: '거리 확보' }
    ]},
    { id: 'relicfield', title: '고대 잔해 매장지', text: '모래 아래 푸른 광맥처럼 고대 회로가 드러나 있다.', choices: [
      { label: '깊이 채굴한다', reqTrait: 'scholar', result: { relics: 4, scrap: 20 }, risk: { distance: -0.75 }, hint: '고대기술 연구자 · 큰 보상' },
      { label: '노출된 잔해만 줍는다', result: { relics: 2 }, hint: '고대 잔해 2' }
    ]},
    { id: 'trade', title: '약탈자 거래', text: '백기를 단 장갑차가 나란히 달리며 탄약 상자를 내보인다.', choices: [
      { label: '탄약을 산다', cost: { money: 55 }, result: { turretBuff: 0.12 }, hint: '돈 55 · 이번 런 포탑 피해 증가' },
      { label: '거래단을 턴다', req: 'combat', value: 8, result: { money: 95, scrap: 16 }, risk: { carDamage: 24, distance: -0.4 }, hint: '전투 8 · 고위험' }
    ]},
    { id: 'rails', title: '끊어진 철로', text: '협곡 위 철교가 무너졌다. 우회로는 길고, 정면 돌파는 위험하다.', choices: [
      { label: '현장에서 선로를 잇는다', req: 'repair', value: 7, result: { distance: 0.9 }, risk: { distance: -0.7 }, hint: '수리 7 · 큰 거리 확보' },
      { label: '우회한다', result: { distance: -0.45, healCrew: 12 }, hint: '거리 감소 · 직원 회복' }
    ]},
    { id: 'base', title: '폐군사기지', text: '격납고 문은 잠겼지만 내부 전력은 아직 살아 있다.', choices: [
      { label: '고철로 문을 연다', cost: { scrap: 15 }, result: { randomGear: true, money: 45 }, hint: '고철 15 · 고급 장비 확률' },
      { label: '발전기만 회수한다', result: { armor: 40, scrap: 12 }, hint: '비상 장갑 충전' }
    ]},
    { id: 'merchant', title: '정체불명의 상인', text: '방독면을 쓴 상인이 무전기로 “시간을 팔겠다”고 말한다.', choices: [
      { label: '시간을 산다', cost: { relics: 2 }, result: { distance: 1.5 }, hint: '고대 잔해 2 · 거리 +1.5 km' },
      { label: '고철을 판다', cost: { scrap: 20 }, result: { money: 100 }, hint: '고철 20 · 돈 100' }
    ]}
  ];

  const ACTS = {
    act1: {
      id: 'act1', label: 'I', name: '재의 궤도', boss: 'behemoth',
      stages: [
        { node: 'battle', title: '먼지의 시동' },
        { node: 'branch', options: ['battle', 'event'] },
        { node: 'battle', title: '갈고리와 총성', forceEnemy: 'boarder' },
        { node: 'station' },
        { node: 'branch', options: ['battle', 'event'], dangerousEvent: true },
        { node: 'elite', title: '강철 포위망' },
        { node: 'event' },
        { node: 'station' },
        { node: 'branch', options: ['battle', 'elite', 'event'] },
        { node: 'battle', title: '고대병기의 문턱', allEnemies: true }
      ]
    }
  };

  const META_UPGRADES = {
    hull: { name: '열차 내구 강화', text: '레벨당 모든 객차 최대 HP +5%', costs: [10,15,20,25,30], max: 5 },
    engine: { name: '엔진 개선', text: '레벨당 열차 속도 +8%', costs: [15,20,25,30,35], max: 5 },
    focus: { name: '집중 사격 훈련', text: '레벨당 집중 사격 사거리 보너스 +10%', costs: [10,15,20,25,30], max: 5 }
  };

  return { BALANCE, TURRETS, MODULES, ENEMIES, BOSSES, TRAITS, CREW_TEMPLATES, STAGE_CURVE, EVENTS, ACTS, META_UPGRADES };
})();
