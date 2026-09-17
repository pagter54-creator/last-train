(() => {
  'use strict';
  const D = window.GAME_DATA;
  const B = D.BALANCE;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const uid = (() => { const session=Array.from(crypto.getRandomValues(new Uint32Array(4)),v=>v.toString(16).padStart(8,'0')).join('');let n = 0; return (p) => `${p}-${session}-${++n}`; })();
  const deepCopy = (v) => JSON.parse(JSON.stringify(v));

  class Registry {
    constructor(data) { this.data = data; }
    get(id) { return this.data[id]; }
    entries() { return Object.entries(this.data); }
    available(meta) { return this.entries().filter(([, v]) => !v.unlockSpent || meta.spent >= v.unlockSpent); }
  }

  const registries = {
    turrets: new Registry(D.TURRETS), modules: new Registry(D.MODULES), enemies: new Registry(D.ENEMIES), bosses: new Registry(D.BOSSES), traits: new Registry(D.TRAITS)
  };

  const store = {
    read() {
      try { return JSON.parse(localStorage.getItem('lastRailMeta')) || this.defaults(); }
      catch { return this.defaults(); }
    },
    defaults() { return { relics: B.run.startingRelics, spent: 0, clears: 0, upgrades: {}, discovered: { turrets: ['gatling','cannon','scatter','cooling'], enemies: [] } }; },
    write(meta) { localStorage.setItem('lastRailMeta', JSON.stringify(meta)); }
  };

  class Game {
    constructor() {
      this.canvas = $('#game-canvas');
      this.ctx = this.canvas.getContext('2d');
      this.meta = store.read();
      this.state = null;
      this.mode = 'menu';
      this.lastFrame = performance.now();
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.canvas.parentElement);
      this.bindUI();
      this.registerWebMCP();
      this.drawMenuState();
      this.resize();
      requestAnimationFrame((t) => this.loop(t));
    }

    registerWebMCP() {
      const context = document.modelContext;
      if (!context?.registerTool) return;
      const register = (tool) => {
        try { Promise.resolve(context.registerTool(tool)).catch(() => {}); } catch { /* unsupported draft implementation */ }
      };
      register({
        name: 'read_run_state', title: '현재 런 상태 읽기',
        description: '현재 Act, 구간, 자원, 타이탄 거리, 객차와 직원 상태를 읽습니다.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute: () => {
          if (!this.state) return { status: 'menu', relics: this.meta.relics, clears: this.meta.clears };
          return { status: this.mode, act: this.state.actId, stage: this.state.stageIndex + 1, money: Math.floor(this.state.money), scrap: Math.floor(this.state.scrap), relics: Math.floor(this.state.relics), titanDistance: Number(this.state.titanDistance.toFixed(2)), cars: this.state.cars.map((c, index) => ({ index, name: c.name, hp: Math.ceil(c.hp), power: c.power })), crew: this.state.crew.map(c => ({ id: c.id, name: c.name, hp: Math.ceil(c.hp), car: c.car, moving: Boolean(c.moving) })) };
        }
      });
      register({
        name: 'start_new_run', title: '새 런 시작', description: '메뉴에서 ACT I 새 런을 시작합니다.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: () => { this.newRun(); return { status: 'started', act: this.state.actId, stage: 1 }; }
      });
      register({
        name: 'move_crew', title: '직원 이동 명령', description: '진행 중인 런에서 직원 ID와 목적 객차 번호로 이동을 명령합니다.',
        inputSchema: { type: 'object', properties: { crewId: { type: 'string' }, carIndex: { type: 'integer', minimum: 0, maximum: 4 } }, required: ['crewId','carIndex'], additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: ({ crewId, carIndex }) => {
          if (!this.state) throw new Error('진행 중인 런이 없습니다.');
          const crew = this.state.crew.find(c => c.id === crewId);
          if (!crew || !Number.isInteger(carIndex) || !this.state.cars[carIndex]) throw new Error('직원 ID 또는 객차 번호가 올바르지 않습니다.');
          this.moveCrew(crewId, carIndex); return { status: 'moving', crewId, carIndex };
        }
      });
    }

    bindUI() {
      $('#new-run-btn').onclick = () => this.newRun();
      $('#continue-btn').onclick = () => this.closeOverlay();
      $('#menu-btn').onclick = () => this.openPause();
      $('#meta-btn').onclick = () => this.showMeta();
      $('#codex-btn').onclick = () => this.showCodex();
      $('#howto-btn').onclick = () => this.showHowTo();
      $('#focus-order').onclick = () => this.activateOrder('focus');
      $('#command-order').onclick = () => this.activateOrder('command');
      $('#armor-order').onclick = () => this.activateArmor();
      $$('.speed-controls button').forEach(btn => btn.onclick = () => this.setSpeed(Number(btn.dataset.speed)));
      $('#train-cars').onclick = (e) => {
        const card = e.target.closest('.car-card');
        if (!card || !this.state) return;
        const index = Number(card.dataset.index);
        const power = e.target.closest('[data-power]');
        if (power) this.setCarPower(index, Number(power.dataset.power));
        else this.selectCar(index);
      };
      $('#crew-list').onclick = (e) => {
        const card = e.target.closest('.crew-card');
        if (card) this.selectCrew(card.dataset.id);
      };
      this.canvas.addEventListener('click', (e) => this.canvasClick(e));
      window.addEventListener('keydown', (e) => {
        if (e.key === '1') this.activateOrder('focus');
        if (e.key === '2') this.activateOrder('command');
        if (e.key === '3') this.activateArmor();
        if (e.key === 'Escape' && this.state) this.openPause();
      });
    }

    makeInitialState() {
      const hpBonus = (this.runMetaLevel?.('hull')??(Number(this.meta.upgrades.hull)||0))*B.meta.hullHpBonus;
      const maxHp = B.train.carHp * (1 + hpBonus);
      const cars = [
        { id: uid('car'), name: '기관실', type: 'engine', hp: maxHp, maxHp, power: B.train.enginePower.start, equipment: [], repair: 0, armor: 0 },
        ...B.train.carNames.slice(1, B.train.startingCars).map(name => ({ id: uid('car'), name, type: 'car', hp: maxHp, maxHp, power: B.train.baseCarPower, equipment: [], repair: 0, armor: 0 }))
      ];
      B.train.startingEquipment.forEach(e => { if(cars[e.car]) this.addEquipment(cars[e.car], e.kind, e.type); });
      const crew = D.CREW_TEMPLATES.slice(0, B.train.startingCrew).map((c, i) => ({ ...deepCopy(c), id: uid('crew'), hp: B.crew.maxHp, maxHp: B.crew.maxHp, car: 1 + i % (cars.length - 1), moving: null, dead: false }));
      return {
        actId: 'act1', stageIndex: 0, money: B.run.startingMoney, scrap: B.run.startingScrap, relics: B.run.startingRelics,
        titanDistance: B.run.startingTitanDistance, cars, crew, enemies: [], projectiles: [], particles: [], battle: null,
        selectedCrew: null, selectedCar: null, selectedEnemy: null, targetMode: null, speed: 1, priorSpeed: 1,
        orders: { focus: { cooldown: 0, active: 0, target: null }, command: { cooldown: 0, active: 0, car: null } },
        armorCharge: B.armor.maxCharge, doctrine: true, runDamageMult: 1, kills: 0, clear: false
      };
    }

    addEquipment(car, kind, type) {
      car.equipment.push({ id: uid('eq'), kind, type, level: 1, branch: false, heat: 0, overheated: false, cooldown: Math.random() });
    }

    newRun() {
      this.state = this.makeInitialState();
      this.mode = 'run';
      this.closeOverlay();
      this.renderAll();
      this.showBanner('ACT I', '재의 궤도');
      const run = this.state;
      this.state.launchElapsed = 0;
      this.state.titanDistance = B.launch.startDistance;
      this.state.launchPending = true;
      this.log('장갑열차가 출발했습니다.', 'hot');
    }

    enterNode() {
      if (!this.state) return;
      this.resetTurretHeat?.();
      const act = D.ACTS[this.state.actId];
      if (this.state.stageIndex >= act.stages.length) {
        if (act.loop) { this.state.stageIndex = act.loop.fromStage || 0; return this.enterNode(); }
        if (act.boss) return this.startBoss(act.boss);
        return this.completeAct();
      }
      const node = act.stages[this.state.stageIndex];
      this.updateHUD();
      if (node.node === 'branch') this.showBranch(node);
      else this.resolveNode(node.node, node);
    }

    resolveNode(type, node = {}) {
      if (type === 'battle' || type === 'elite') this.startBattle(type, node);
      if (type === 'event') this.showEvent(node);
      if (type === 'station') this.showStation();
    }

    showBranch(node) {
      const labels = { battle: ['일반 전투','위협은 낮지만 보상도 평범하다.','⚔'], elite: ['엘리트 전투','강한 적과 특수 개체. 보상이 크다.','▲'], event: ['미지의 신호','결과를 예측할 수 없다.','?'] };
      const options = node.options.map((type) => ({ ...{ type }, label: labels[type][0], text: labels[type][1], hint: type === 'elite' ? '보상 약 1.5배' : type === 'event' ? '선택형 사건' : '표준 보상', icon: labels[type][2] }));
      this.showDialog('경로 선택', `구간 ${this.state.stageIndex + 1}`, '현재 열차 상태를 보고 다음 선로를 선택하십시오.', options, (o) => {
        this.closeOverlay();
        this.resolveNode(o.type, { title: o.label, dangerousEvent: node.dangerousEvent });
      });
    }

    globalStage() { const act=D.ACTS[this.state.actId];return (act.stageOffset||0)+Math.min(this.state.stageIndex+1,act.stages.length); }
    stageCurve() { return D.STAGE_CURVE[Math.min(this.globalStage()-1, D.STAGE_CURVE.length - 1)]; }

    startBattle(kind, node = {}) {
      this.state.projectiles = []; this.state.impacts = [];
      const curve = this.stageCurve();
      const elite = kind === 'elite';
      const count = Math.ceil((B.battle.baseEnemyCount + curve.stage * B.battle.enemyCountPerStage) * curve.count * (elite ? B.battle.eliteCount : 1));
      this.state.enemies = [];
      this.state.battle = {
        kind, boss: false, title: node.title || (elite ? '엘리트 습격' : '황무지 교전'), elapsed: 0,
        duration: curve.duration * B.battle.durationScale, spawnLeft: count, spawnTimer: 0, total: count, elite, forceEnemy: node.forceEnemy, allEnemies: node.allEnemies
      };
      this.mode = 'battle';
      this.setSpeed(this.preferredSpeed||1);
      this.showBanner(`STAGE ${curve.stage}`, this.state.battle.title);
      this.log(`${this.state.battle.title} 시작`, elite ? 'bad' : 'hot');
      this.renderAll();
    }

    startBoss(bossId) {
      this.state.projectiles = []; this.state.impacts = [];
      const bossData = registries.bosses.get(bossId);
      if (!bossData) throw new Error(`Unknown boss: ${bossId}`);
      this.state.enemies = [];
      this.state.battle = {
        kind: 'boss', boss: true, bossId, title: bossData.name, elapsed: 0, duration: bossData.duration, spawnLeft: 0, spawnTimer: 0, elite: true,
        parts: bossData.parts.map(part => ({ ...part, id: uid('boss'), maxHp: part.hp, destroyed: false })),
        attackTimer: bossData.attack.interval, spawnTimerBoss: bossData.summon?.initialDelay || 0
      };
      this.mode = 'battle';
      this.setSpeed(this.preferredSpeed||1);
      this.showBanner(`ACT ${D.ACTS[this.state.actId].label} BOSS`, bossData.name);
      this.log(`고대 전투차량 ${bossData.name} 접근!`, 'bad');
      this.renderAll();
    }

    spawnEnemy(forceId) {
      const stage = this.globalStage();
      let pool = registries.enemies.entries().filter(([, e]) => e.fromStage <= stage);
      if (this.state.battle.allEnemies) pool = registries.enemies.entries().filter(([,e])=>e.fromStage<=stage);
      let id = forceId || pick(pool)[0];
      if (!forceId && this.state.battle.elite && Math.random() < B.battle.eliteSpecialChance) {
        const specials = pool.filter(([, e]) => e.special || e.armor > .4 || e.ranged);
        if (specials.length) id = pick(specials)[0];
      }
      const base = D.ENEMIES[id];
      const curve = this.stageCurve();
      const hpMult = curve.hp * (this.state.battle.elite ? B.battle.eliteHp : 1);
      const dmgMult = curve.damage * (this.state.battle.elite ? B.battle.eliteDamage : 1);
      const targetCar = this.pickTargetCar(base.boards);
      const enemy = {
        id: uid('enemy'), type: id, name: base.name, hp: base.hp * hpMult, maxHp: base.hp * hpMult,
        carDamage: base.carDamage * dmgMult, crewDamage: base.crewDamage * dmgMult, interval: base.interval || B.battle.defaultEnemyAttackInterval,
        armor: base.armor, speed: this.enemySpeed?this.enemySpeed(base):base.speed, x: 1.04 + Math.random() * B.battle.spawnVariance, y: .25 + Math.random() * .48,
        targetCar, attackTimer: base.interval || B.battle.defaultEnemyAttackInterval, boarded: false, dead: false
      };
      this.state.enemies.push(enemy);
      if (!this.meta.discovered.enemies.includes(id)) { this.meta.discovered.enemies.push(id); store.write(this.meta); }
    }

    pickTargetCar(boarder) {
      const live = this.state.cars.map((c, i) => ({ c, i })).filter(({ c }) => c.hp > 0);
      const destroyed = this.state.cars.map((c, i) => ({ c, i })).filter(({ c }) => c.hp <= 0);
      if (boarder && destroyed.length && Math.random() < B.battle.destroyedCarThreat / (B.battle.destroyedCarThreat + 1)) return pick(destroyed).i;
      return live.length ? pick(live).i : 0;
    }

    update(dt) {
      if (!this.state || this.mode !== 'battle' || !this.state.battle) return;
      const s = this.state;
      const scale = s.speed;
      if (!scale) return;
      dt *= scale;
      s.battle.elapsed += dt;
      this.updateOrders(dt);
      this.updateCrew(dt);
      this.updateEnemies(dt);
      this.updateTurrets(dt);
      this.updateTitan(dt);
      this.updateParticles(dt);
      if (!s.battle.boss) this.updateSpawns(dt);
      else this.updateBoss(dt);
      this.checkBattleState();
    }

    updateSpawns(dt) {
      const battle = this.state.battle;
      battle.spawnTimer -= dt;
      const wave=B.battle.waveSize[Math.min(B.battle.waveSize.length-1,Math.floor(this.state.stageIndex/B.battle.waveSizeStageStep))];
      const room=B.battle.maxAlive-this.state.enemies.filter(e=>!e.dead).length;
      if (battle.spawnLeft > 0 && battle.spawnTimer <= 0 && room>0) {
        const count=Math.min(wave,battle.spawnLeft,room);
        for(let i=0;i<count;i++){
          const force = battle.forceEnemy && battle.spawnLeft === battle.total ? battle.forceEnemy : null;
          this.spawnEnemy(force);battle.spawnLeft--;
        }
        const interval=battle.duration/Math.max(1,Math.ceil(battle.total/wave));
        battle.spawnTimer = interval * (1 - B.battle.spawnVariance + Math.random() * B.battle.spawnVariance * 2);
      }
    }

    updateEnemies(dt) {
      const s = this.state;
      for (const e of s.enemies) {
        if (e.dead) continue;
        if(this.updateSpecialEnemy?.(e,dt))continue;
        const data = D.ENEMIES[e.type];
        if (!e.boarded) {
          e.x = Math.max(B.battle.boardDistance, e.x - B.battle.enemyApproachSpeed * e.speed * dt);
          const attackRange = data.attackRange ?? (data.ranged ? .72 : B.battle.boardDistance);
          if (e.x <= attackRange) {
            e.attackTimer -= dt;
            if (e.attackTimer <= 0) {
              if (data.boards && e.x <= B.battle.boardDistance) {
                if(this.allowMajorThreat && !this.allowMajorThreat(e))continue;
                e.boarded = true; e.x = B.battle.boardDistance; this.log(`${e.name}이 ${s.cars[e.targetCar].name}에 승선!`, 'bad');
                this.onBoarding?.(e);
              } else this.enemyAttack(e);
              e.attackTimer = e.interval;
            }
          }
        } else {
          if(this.tickBoardedEnemy)this.tickBoardedEnemy(e,dt);
          else {e.attackTimer -= dt;if(e.attackTimer<=0){this.enemyAttack(e);e.attackTimer=e.interval;}}
        }
      }
      s.enemies = s.enemies.filter(e => !e.dead || e.deathTime > 0).map(e => { if (e.dead) e.deathTime -= dt; return e; });
    }

    enemyAttack(e) {
      const s = this.state;
      const car = s.cars[e.targetCar];
      if (!car) return;
      if (car.armor > 0) { this.fx(.22 + e.targetCar * .12, .78, '#f0bd52'); return; }
      const damageSnapshot={car:car.hp,crew:s.crew.map(c=>({id:c.id,hp:c.hp,dead:c.dead}))};
      car.hp = Math.max(0, car.hp - (this.absorbHullDamage?.(e.targetCar,e.carDamage)??e.carDamage));
      car.hitFlash = B.feedback.carFlashSeconds;
      this.playSound?.('hull');
      const occupants = s.crew.filter(c => !c.dead && !c.moving && c.car === e.targetCar && c.hp > 0);
      if (occupants.length) {
        const victim = pick(occupants);
        const reduction = clamp(this.effectiveStat(victim, 'combat') * B.crew.boarderDamageReductionPerCombat, 0, B.crew.maxDamageReduction);
        if(this.hurtCrew)this.hurtCrew(victim,e.crewDamage*(1-reduction),e.boarded?'boarded':'attack');else victim.hp=Math.max(0,victim.hp-e.crewDamage*(1-reduction));
        if (victim.hp <= 0) this.log(`${victim.name} 전투불능`, 'bad');
      }
      if (car.hp <= 0 && !car.destroyedLogged) {
        car.destroyedLogged = true;
        this.log(`${car.name} 파괴! 장비가 정지합니다.`, 'bad');
        for (const c of occupants.filter(c => c.hp <= 0)) { c.dead = true; this.log(`${c.name} 사망`, 'bad'); }
      }
      this.onHullImpact?.(e.targetCar,damageSnapshot);
      this.fx(.22 + e.targetCar * .12, .78, '#e35235');
    }

    updateCrew(dt) {
      const s = this.state;
      const repairRules=window.PROGRESSION_CONFIG.crew;
      s.cars.forEach(car=>{if(car.hp<=car.maxHp*repairRules.repairStart)car.autoRepair=true;if(car.hp>=car.maxHp*repairRules.repairStop)car.autoRepair=false;});
      for (const c of s.crew) {
        if (c.dead || c.hp <= 0) continue;
        if(this.bossCrewStopped?.(c)){this.bossCrewReturnFire?.(c,dt);continue;}
        if (c.moving) {
          c.moving.left -= dt*(this.crewMoveMultiplier?.(c)??1);
          if (c.moving.left <= 0) { c.car = c.moving.to; c.moving = null; this.log(`${c.name} → ${s.cars[c.car].name}`); }
          continue;
        }
        const car = s.cars[c.car];
        const workDt=this.crewWorkStep?this.crewWorkStep(c,dt):dt;
        const boarders = s.enemies.filter(e => !e.dead && e.boarded && e.targetCar === c.car);
        const repairPriorityRatio=window.SURVIVABILITY_CONFIG?.repairPriorityHpRatio??0.30;
        const emergencyRepairPriority=boarders.length===0&&(car.hp<=0||(car.maxHp>0&&car.hp/car.maxHp<=repairPriorityRatio));

        // Normally crew defend first and repair only after immediate threats are handled.
        // At critical hull (<= configured ratio) or after destruction, everyone on that
        // carriage switches to emergency repair even while enemies are present.
        const firingAtArm=emergencyRepairPriority?false:this.bossCrewReturnFire?.(c,dt);
        const engagedInDefense=!emergencyRepairPriority&&(boarders.length>0||!!firingAtArm);
        if (!emergencyRepairPriority&&boarders.length && !firingAtArm) {
          const target = boarders[0];
          let combat = this.effectiveStat(c, 'combat');
          let damage = Math.max(0, combat) * B.crew.personalDpsPerCombat * workDt;
          if (c.traits.includes('marksman')) damage *= D.TRAITS.marksman.damageMult;
          damage*=this.crewWeaponMultiplier?.(c)??1;
          if(damage>0){if(this.crewAttack)this.crewAttack(c,target,damage*(this.crewFireRate?.(c)??1),1);else this.damageEnemy(target,damage,1);this.onCrewBoardShot?.(c,target);}
        } else if(!emergencyRepairPriority&&!firingAtArm)this.crewReturnFire?.(c,dt);
        if(engagedInDefense)continue;
        if (car.hp <= 0) {
          let repair = B.train.repairBasePerSecond + this.effectiveStat(c, 'repair') * B.train.repairStatScale;
          if (c.traits.includes('fixer')) repair *= D.TRAITS.fixer.repairMult;
          repair *= this.moduleEffect(c.car, 'repair', 'repairMult');
          car.repair += repair * workDt * (this.crewRestorationMultiplier?.(c)??1);
          if(repair*workDt>0)this.onCrewHammer?.(c);
          if (car.repair >= B.train.repairGoal) {
            car.hp = car.maxHp * B.train.restoredHpRatio; car.repair = 0; car.destroyedLogged = false;
            this.log(`${car.name} 긴급 복구 완료`, 'hot');
          }
        } else if ((emergencyRepairPriority || car.autoRepair) && car.hp < car.maxHp*repairRules.repairStop) {
          let repair=this.effectiveStat(c,'repair')*B.train.repairStatScale*this.moduleEffect(c.car,'repair','repairMult');
          if(c.traits.includes('fixer'))repair*=D.TRAITS.fixer.repairMult;
          car.hp = Math.min(car.maxHp*repairRules.repairStop, car.hp + repair * workDt);
          if(repair*workDt>0)this.onCrewHammer?.(c);
        }
      }
    }

    effectiveStat(c, stat) {
      let v = c.stats[stat];
      if(c.traits.includes('coward')&&this.state.enemies.some(e=>!e.dead&&e.boarded&&e.targetCar===c.car))v+=stat==='combat'?D.TRAITS.coward.combatVsBoarder:stat==='repair'?D.TRAITS.coward.repairVsBoarder:0;
      const same = this.state.crew.filter(x => !x.dead && !x.moving && x.car === c.car && x.hp > 0).length;
      if (c.traits.includes('lonewolf') && same === 1) v += D.TRAITS.lonewolf.soloBonus;
      if (this.state.orders.command.active > 0 && this.state.orders.command.car === c.car && ['combat','operate','repair'].includes(stat)) v += this.commandStatBonus?.()??B.crew.directCommandBonus;
      return v;
    }

    updateTurrets(dt) {
      const s = this.state;
      s.cars.forEach((car, carIndex) => {
        for (const eq of car.equipment) {
          if (eq.kind !== 'turret') continue;
          const t = D.TURRETS[eq.type];
          let operator = s.crew.filter(c => !c.dead && !c.moving && c.car === carIndex && c.hp > 0).sort((a,b) => this.effectiveStat(b,'operate') - this.effectiveStat(a,'operate'))[0];
          const operate = operator ? this.effectiveStat(operator, 'operate') : 0;
          const opMod = clamp(operate * B.heat.operatorCoolingBonusPerPoint, 0, B.heat.maxOperatorModifier);
          let cool = this.turretCooling?this.turretCooling(eq,carIndex):t.cool * (1 + opMod) * this.moduleEffect(carIndex, 'cooling', 'coolingMult');
          if (car.armor > 0) cool *= B.armor.coolingMultiplier;
          eq.heat = clamp(eq.heat - cool * dt, 0, B.heat.max);
          if (eq.overheated && eq.heat <= B.heat.resumeAt && !eq.rageCooling) eq.overheated = false;
          this.updateRage?.(eq,dt);
          if (!this.equipmentActive(carIndex) || (eq.overheated&&!eq.rageLeft) || eq.rageCooling || this.eventEquipmentDisabled?.(eq) || this.bossCarSealed?.(carIndex)) continue;
          eq.cooldown -= dt;
          if (eq.cooldown > 0) continue;
          const target = this.pickTurretTarget(carIndex, t, eq);
          if (!target) continue;
          const stats = this.turretStats(eq, carIndex, operator);
          this.fireTurret(eq, stats, target, carIndex);
          eq.cooldown = stats.interval;
          eq.heat = clamp(eq.heat + stats.heat, 0, B.heat.max);
          if (eq.heat >= B.heat.max && !eq.overheated) { eq.overheated = true; this.log(`${t.name} 과열`, 'bad'); }
        }
      });
      s.cars.forEach(c => c.armor = Math.max(0, c.armor - dt));
    }

    equipmentCapacity(i) { return i===0?B.train.engineEquipmentSlots:B.train.equipmentSlots; }
    crewCapacity(i) { return i===0?Math.max(0,B.train.engineCrewSlots-B.train.captainReservedSlots):B.train.crewSlots; }
    moduleData(eq) {
      if(D.MODULES[eq.type].upgradeable===false)return {...D.MODULES[eq.type]};
      const base=D.MODULES[eq.type],branch=B.moduleUpgrade.branches[eq.model],factor=(1+((eq.level||1)-1)*B.moduleUpgrade.perLevel)*(branch?.factor||1),m={...base};
      for(const key of ['heatMult','coolingMult','stageHealMult','repairMult','ammoDamageMult'])if(key in m)m[key]=Math.max(0,1+(base[key]-1)*factor);
      if('extraPower' in m)m.extraPower=base.extraPower*factor;
      m.range=branch?.range==='self'?0:branch?.range==='all'?Math.max(0,(this.state?.cars.length||B.train.maxCars)-1):base.range;
      return m;
    }
    moduleEffect(carIndex, effect, key) {
      let mult = 1;
      this.state.cars.forEach((car, i) => car.equipment.forEach(eq => {
        if (eq.kind !== 'module') return;
        if(this.bossCarSealed?.(i))return;
        const m = this.moduleData(eq);
        if (m.effect === effect && Math.abs(i - carIndex) <= m.range && this.equipmentActive(i) && !this.eventEquipmentDisabled?.(eq)) mult *= m[key] ?? 1;
      }));
      return mult;
    }

    turretStats(eq, carIndex, operator) {
      const t = D.TURRETS[eq.type];
      const bonusPower = Math.max(0, (this.effectiveCarPower?.(carIndex) ?? this.state.cars[carIndex].power) - B.train.baseCarPower);
      const p = t.power[Math.min(bonusPower, t.power.length - 1)] || {};
      let damage = t.damage * ((t.pellets || 1) + (p.pelletsBonus || 0)) * (p.damageMult || 1);
      let interval = t.interval * (p.intervalMult || 1);
      let heat = t.heat * (p.heatMult || 1);
      let chains = (t.chains || 1) + (p.chainsBonus || 0);
      let splash = Math.max(t.splash || 0, p.splash || 0) + (p.splashBonus || 0);
      if (eq.level > 1) damage *= 1 + (eq.level - 1) * B.upgrade.damagePerLevel;
      heat *= 1 + (eq.level - 1) * B.upgrade.heatPerLevel;
      if (eq.branch && t.branch) {
        damage *= t.branch.damageMult || 1; interval *= t.branch.intervalMult || 1; heat *= t.branch.heatMult || 1;
        chains += t.branch.chainsBonus || 0; splash = Math.max(splash, t.branch.splash || 0);
      }
      const operators=this.crewForCar?.(carIndex)||(operator?[operator]:[]),operate=operators.reduce((sum,c)=>sum+this.effectiveStat(c,'operate'),0);
      heat *= 1-clamp(operate*B.heat.operatorHeatReductionPerPoint,0,B.heat.maxOperatorModifier);
      damage *= 1+clamp(operate*window.PROGRESSION_CONFIG.crew.operateDamagePerPoint,0,window.PROGRESSION_CONFIG.crew.maxOperateDamage);
      for (const operator of operators) {
        if (operator.traits.includes('gunner') && eq.type === 'gatling') { interval *= D.TRAITS.gunner.gatlingIntervalMult; heat *= D.TRAITS.gunner.gatlingHeatMult; }
        if (operator.traits.includes('marksman')) damage *= D.TRAITS.marksman.damageMult;
        if (operator.traits.includes('scholar') && D.TURRETS[eq.type]?.ancient) damage *= D.TRAITS.scholar.ancientDamageMult;
      }
      heat *= this.moduleEffect(carIndex, 'cooling', 'heatMult');
      if (t.ammo) damage *= this.moduleEffect(carIndex, 'ammo', 'ammoDamageMult');
      damage *= this.state.runDamageMult;
      if (this.state.orders.focus.active > 0) damage *= 1 + (this.focusDamageBonus?.()??B.focus.damageBonus);
      return { damage, interval, heat, chains, chainRatio: p.chainRatio || t.chainRatio || 1, splash, armorPierce: eq.branch && t.branch.armorPierce || t.armorPierce || 0 };
    }

    pickTurretTarget(carIndex, turret) {
      let targets = this.state.enemies.filter(e => !e.dead && !e.boarded);
      const maxRange = B.targeting[turret.range];
      const minRange = turret.minRange ? B.targeting[turret.minRange] : 0;
      targets = targets.filter(e => e.x <= maxRange && e.x >= minRange);
      if (this.state.battle.boss) {
        const parts = this.state.battle.parts.filter(p => !p.destroyed);
        if (this.state.orders.focus.target) {
          const f = parts.find(p => p.id === this.state.orders.focus.target); if (f) return f;
        }
        if (parts.length) return parts[0];
      }
      if (!targets.length) return null;
      if (this.state.orders.focus.active > 0 && this.state.orders.focus.target) {
        const focused = targets.find(e => e.id === this.state.orders.focus.target); if (focused) return focused;
      }
      return targets.sort((a,b) => a.x - b.x)[0];
    }

    fireTurret(eq, stats, target, carIndex) {
      this.playSound?.('shot');
      this.damageEnemy(target, stats.damage, stats.armorPierce);
      const impacted = this.state.enemies.filter(e => !e.dead && e.id !== target.id).sort((a,b) => Math.abs(a.x-target.x)-Math.abs(b.x-target.x));
      if (stats.chains > 1) impacted.slice(0, stats.chains - 1).forEach((e,i) => this.damageEnemy(e, stats.damage * Math.pow(stats.chainRatio, i + 1), stats.armorPierce));
      if (stats.splash) impacted.filter(e => Math.abs(e.x-target.x) < stats.splash).slice(0, B.battle.maxSecondaryTargets).forEach(e => this.damageEnemy(e, stats.damage * stats.splash, stats.armorPierce));
      this.state.projectiles.push({ from: carIndex, targetId: target.id, tx: target.x, ty: target.y || .5, life: .18, type: eq.type });
    }

    damageEnemy(target, amount, pierce = 0) {
      if (!target || target.destroyed || target.dead) return;
      const mitigation = (target.armor || 0) * (1 - pierce);
      target.hp -= amount * (1 - mitigation);
      target.hitFlash = B.feedback.enemyFlashSeconds;
      this.playSound?.('hit');
      if (target.hp <= 0) {
        target.hp = 0;
        if ('destroyed' in target) { target.destroyed = true; this.log(`${D.BOSSES[this.state.battle.bossId]?.name||'보스'} ${target.name} 파괴`, 'hot'); }
        else { target.dead = true; target.deathTime = .35; this.state.kills++; }
      }
    }

    updateOrders(dt) {
      const o = this.state.orders;
      ['focus','command'].forEach(k => { o[k].cooldown = Math.max(0, o[k].cooldown - dt); o[k].active = Math.max(0, o[k].active - dt); });
      if (o.focus.active <= 0) o.focus.target = null;
      if (o.command.active <= 0) o.command.car = null;
    }

    updateTitan(dt) {
      const s = this.state;
      const stage = Math.min(this.globalStage(), D.STAGE_CURVE.length);
      let titan = B.titan.speedBase + (stage - 1) * B.titan.speedPerStage;
      let train = B.train.speedByPower[this.effectiveCarPower?.(0) ?? s.cars[0].power] || B.train.speedByPower[B.train.enginePower.min];
      train *= 1 + B.meta.engineSpeedBonus*(this.runMetaLevel?.('engine')??(Number(this.meta.upgrades.engine)||0));
      const engineer = s.crew.find(c => !c.dead && !c.moving && c.car === 0 && c.traits.includes('engineer'));
      if (engineer) train *= D.TRAITS.engineer.engineSpeedMult;
      if (s.battle?.boss) {
        const enginePart = s.battle.parts.find(p => p.type === 'engine');
        if (enginePart && !enginePart.destroyed) train *= D.BOSSES[s.battle.bossId].engineSpeedMult;
      }
      train *= this.trainDisruptionMultiplier?.() ?? 1;
      s.currentTrainSpeed = train; s.currentTitanSpeed = titan;
      s.titanDistance = clamp(s.titanDistance + (train - titan) * dt / 60, 0, B.run.maxTitanDistance);
    }

    updateBoss(dt) {
      const battle = this.state.battle;
      const boss = D.BOSSES[battle.bossId];
      const cannon = battle.parts.find(p => p.type === 'cannon');
      const barracks = battle.parts.find(p => p.type === 'barracks');
      battle.attackTimer -= dt;
      if (battle.attackTimer <= 0) {
        const target = this.pickTargetCar(false);
        const pseudo = { targetCar: target, carDamage: boss.attack.carDamage * (cannon?.destroyed ? boss.attack.cannonDestroyedDamageMult : 1), crewDamage: boss.attack.crewDamage, name: boss.name };
        if(cannon&&!cannon.destroyed){pseudo.carDamage*=boss.attack.liveCannonMultiplier||1;pseudo.crewDamage*=boss.attack.liveCannonMultiplier||1;}
        this.enemyAttack(pseudo); battle.attackTimer = boss.attack.interval;
      }
      battle.spawnTimerBoss -= dt;
      if (battle.elapsed<battle.duration&&boss.summon && !barracks?.destroyed && battle.spawnTimerBoss <= 0) { if(this.spawnBossWave)this.spawnBossWave(boss.summon.enemy);else this.spawnEnemy(boss.summon.enemy);battle.spawnTimerBoss = boss.summon.interval*(this.bossWaveInterval?.()||1); }
    }

    checkBattleState() {
      const s = this.state;
      if (s.cars.every(c => c.hp <= 0)) return this.gameOver('열차의 모든 객차가 파괴되었습니다.');
      if (s.titanDistance <= B.titan.forcedBattleAt) return this.gameOver('타이탄이 열차를 따라잡았습니다.');
      if (s.battle.boss) {
        const body = s.battle.parts.find(p => p.victory);
        if (body.destroyed) this.bossClear();
      } else if (s.battle.spawnLeft <= 0 && s.enemies.every(e => e.dead) && !s.projectiles.some(p=>p.hostile)) this.battleClear();
    }

    battleClear() {
      const s = this.state; if (this.mode !== 'battle') return;
      this.mode = 'result'; this.setSpeed(0);
      s.crew.forEach(c=>{if(c.moving){c.car=c.moving.to;c.moving=null;}});
      s.cars.forEach(c=>c.armor=0);
      s.orders.command.active=0;s.orders.command.car=null;
      s.orders.focus.active=0;s.orders.focus.target=null;
      const stage = this.globalStage(), elite = s.battle.elite;
      let money = B.rewards.battleMoneyBase + stage * B.rewards.battleMoneyPerStage;
      let scrap = B.rewards.battleScrapBase + stage * B.rewards.battleScrapPerStage;
      // 1.0.1 risk/reward pass: standard battles after ACT I pay substantially less money.
      // Elite rewards keep their existing premium so choosing a harder node still has a clear payoff.
      if (!elite) {
        if (s.actId === 'act2') money = Math.round(money * 0.65);
        else if (s.actId === 'act3') money = Math.round(money * 0.50);
      }
      if (elite) { money = Math.round(money * B.rewards.eliteMultiplier); scrap = Math.round(scrap * B.rewards.eliteMultiplier); }
      const relics = this.rewardRelics09?.(B.rewards.battleRelics + (elite ? B.rewards.eliteBonusRelics : 0)) ?? (B.rewards.battleRelics + (elite ? B.rewards.eliteBonusRelics : 0));
      money=this.metaGain?.('money',money)??money;scrap=this.metaGain?.('scrap',scrap)??scrap;
      s.money += money; s.scrap += scrap; s.relics += relics;
      s.armorCharge = clamp(s.armorCharge + (elite ? B.armor.eliteCharge : B.armor.battleCharge), 0, B.armor.maxCharge);
      this.healAfterStage();
      this.showDialog('교전 승리', `STAGE ${stage} 확보`, `${s.battle.title}에서 적 ${s.kills}기를 격파했습니다.`, [
        { label: `¤ ${money} · ▰ ${scrap} · ◆ ${relics}`, text: '보급품을 회수하고 다음 구간으로 이동합니다.', hint: `비상 장갑 ${Math.round(s.armorCharge)}%`, icon: '✓', action: 'next' }
      ], () => { this.closeOverlay(); this.advanceStage(); });
      this.renderAll();
    }

    healAfterStage() {
      this.state.crew.forEach(c => {
        if (c.dead) return;
        let mult = this.moduleEffect(c.car, 'medical', 'stageHealMult');
        if (this.state.crew.some(x=>!x.dead&&x.hp>0&&!x.moving&&x.car===c.car&&x.traits.includes('medic'))) mult *= D.TRAITS.medic.healMult;
        const amount = c.maxHp * this.effectiveStat(c,'recovery') * B.crew.stageHealPerRecovery * mult;
        if (amount <= 0) return;
        const wasKO = c.hp <= 0;
        c.hp = Math.min(c.maxHp, Math.max(0,c.hp) + amount);
        if (wasKO && c.hp > 0) this.log(`${c.name} 전투불능 회복 · HP ${Math.ceil(c.hp)}`, 'hot');
      });
    }

    advanceStage() {
      this.state.titanDistance = clamp(this.state.titanDistance + (this.departureDistance?.()??B.run.branchDistanceBonus), 0, B.run.maxTitanDistance);
      this.state.stageIndex++;
      this.state.kills = 0;
      this.state.battle = null;
      this.mode = 'run';
      this.renderAll();
      this.enterNode();
    }

    bossClear() {
      if (this.mode !== 'battle') return;
      const next=D.ACTS[this.state.actId].nextAct;
      this.healAfterStage();
      if(next){
        this.mode='result';this.setSpeed(0);
        this.state.crew.forEach(c=>{if(c.moving){c.car=c.moving.to;c.moving=null;}});
        this.state.cars.forEach(c=>c.armor=0);
        this.state.orders.command.active=0;this.state.orders.command.car=null;
        this.state.orders.focus.active=0;this.state.orders.focus.target=null;
        this.state.relics+=this.rewardRelics09?.(D.BOSSES[this.state.battle.bossId].rewardRelics)??D.BOSSES[this.state.battle.bossId].rewardRelics;
        this.showDialog(`ACT ${D.ACTS[this.state.actId].label} CLEAR`,'다음 노선 · '+D.ACTS[next].name,D.ACTS[next].intro,[{label:`ACT ${D.ACTS[next].label} 진입`,text:'열차·직원·장비·자원을 유지합니다.',hint:`출발 거리 +${(this.departureDistance?.()??B.run.branchDistanceBonus)} km`,icon:'→'}],()=>{
          this.closeOverlay();this.state.actId=next;this.state.stageIndex=-1;this.stationOffers=null;this.stationStage=null;this.advanceStage();
        });return;
      }
      this.mode = 'ending'; this.setSpeed(0);
      const endingReward=this.rewardRelics09?.(D.BOSSES[this.state.battle.bossId].rewardRelics)??D.BOSSES[this.state.battle.bossId].rewardRelics;
      const earned = this.metaRelicReward?.(this.state.relics + endingReward + B.run.clearRelicBonus) ?? (this.state.relics + endingReward + B.run.clearRelicBonus);
      this.meta.relics += earned; this.meta.clears++; store.write(this.meta);
      this.state.clear = true;
      this.showEnding(earned);
    }

    completeAct() {
      if (this.mode === 'ending') return;
      this.mode = 'ending'; this.setSpeed(0);
      const earned = this.metaRelicReward?.(this.state.relics + B.run.clearRelicBonus) ?? (this.state.relics + B.run.clearRelicBonus);
      this.meta.relics += earned; this.meta.clears++; store.write(this.meta);
      this.showDialog('ACT CLEAR', '노선 완주', `이 Act의 모든 구간을 통과했습니다. 고대 잔해 ◆ ${earned}를 보관했습니다.`, [
        { label: '메인 메뉴로', text: '새로운 노선을 준비합니다.', hint: '클리어 기록 저장', icon: '✓' }
      ], () => this.returnMenu());
    }

    gameOver(reason) {
      if (this.mode === 'gameover') return;
      this.mode = 'gameover'; this.setSpeed(0);
      this.state.relics=this.metaRelicReward?.(this.state.relics)??this.state.relics;
      this.meta.relics += this.state.relics; store.write(this.meta);
      this.showDialog('RUN END', '열차가 멈췄습니다', reason, [
        { label: '메인 메뉴로', text: `이번 원정 고대 잔해 ◆ ${this.state.relics}`, hint: '다시 도전할 수 있습니다.', icon: '↺' }
      ], () => this.returnMenu());
    }

    showEvent(node = {}) {
      const event = pick(D.EVENTS);
      this.mode = 'event'; this.setSpeed(0);
      const choices = event.choices.map((c, i) => ({ ...c, icon: i ? 'Ⅱ' : 'Ⅰ', text: c.hint }));
      this.showDialog(event.title, node.dangerousEvent ? '위험 신호' : '황무지 사건', event.text, choices, (choice) => this.resolveEventChoice(choice));
    }

    canPay(cost = {}) { return (!cost.money || this.state.money >= cost.money) && (!cost.scrap || this.state.scrap >= cost.scrap) && (!cost.relics || this.state.relics >= cost.relics); }
    pay(cost = {}) { this.state.money -= cost.money || 0; this.state.scrap -= cost.scrap || 0; this.state.relics -= cost.relics || 0; }

    resolveEventChoice(choice) {
      if (!this.canPay(choice.cost)) return this.toast('자원이 부족합니다.');
      this.pay(choice.cost);
      let success = true;
      if (choice.req) success = Math.max(...this.state.crew.filter(c => !c.dead).map(c => c.stats[choice.req] || 0), 0) >= choice.value;
      if (choice.reqTrait) success = this.state.crew.some(c => !c.dead && c.traits.includes(choice.reqTrait));
      const result = success ? choice.result : choice.risk || {};
      this.applyResult(result);
      this.toast(success ? '선택의 결과를 확보했습니다.' : '조건이 부족해 위험이 발생했습니다.');
      setTimeout(() => { this.closeOverlay(); this.advanceStage(); }, B.ui.toastMs / 2);
    }

    applyResult(r) {
      const s = this.state;
      s.money += this.metaGain?.('money',r.money||0)??(r.money||0);s.scrap += this.metaGain?.('scrap',r.scrap||0)??(r.scrap||0);s.relics += this.metaGain?.('relics',r.relics||0)??(r.relics||0);
      s.titanDistance = clamp(s.titanDistance + (r.distance || 0), 0, B.run.maxTitanDistance);
      s.armorCharge = clamp(s.armorCharge + (r.armor || 0), 0, B.armor.maxCharge);
      s.runDamageMult *= 1 + (r.turretBuff || 0);
      if (r.healCrew) s.crew.forEach(c => { if (!c.dead) c.hp = Math.min(c.maxHp, c.hp + r.healCrew); });
      if (r.crewDamage) s.crew.filter(c => !c.dead).forEach(c => c.hp = Math.max(B.battle.nonFatalEventMinHp, c.hp - r.crewDamage));
      if (r.repairAll) s.cars.forEach(c => c.hp = Math.min(c.maxHp, c.hp + r.repairAll));
      if (r.carDamage) { const car = pick(s.cars); car.hp = Math.max(B.battle.nonFatalEventMinHp, car.hp - r.carDamage); }
      if (r.recruit) this.recruitCrew();
      if (r.randomGear) this.giveRandomGear();
      this.renderAll();
    }

    recruitCrew(template = null) {
      if (this.state.crew.filter(c => !c.dead).length >= this.state.cars.reduce((n,c,i)=>n+this.crewCapacity(i),0)) return false;
      const available = D.CREW_TEMPLATES.filter(t => !this.state.crew.some(c => c.name === t.name));
      if (!available.length) return false;
      const base = template || pick(available);
      const car = this.state.cars.findIndex((_, i) => this.state.crew.filter(c => !c.dead && (c.moving?c.moving.to:c.car) === i).length < this.crewCapacity(i));
      if(car<0)return false;
      this.state.crew.push({ ...deepCopy(base), id: uid('crew'), hp: B.crew.maxHp, maxHp: B.crew.maxHp, car: Math.max(0,car), moving: null, dead: false });
      return true;
    }

    giveRandomGear(type = null, kind = null) {
      const unlocked=(key,reg)=>Object.entries(reg).filter(([id])=>this.runContentUnlocked?.(key,id)??true);const options = kind === 'module' ? unlocked('modules',D.MODULES) : kind === 'turret' ? unlocked('turrets',D.TURRETS) : [...unlocked('turrets',D.TURRETS).map(x => ['turret',...x]), ...unlocked('modules',D.MODULES).map(x => ['module',...x])];
      let selected;
      if (type && kind) selected = [kind, type, kind === 'turret' ? D.TURRETS[type] : D.MODULES[type]];
      else { const x = pick(options); selected = x.length === 3 ? x : [kind || 'turret', x[0], x[1]]; }
      const car = this.state.cars.find((c,i) => c.equipment.length < this.equipmentCapacity(i));
      if (!car) return false;
      this.addEquipment(car, selected[0], selected[1]);
      if (selected[0] === 'turret' && !this.meta.discovered.turrets.includes(selected[1])) { this.meta.discovered.turrets.push(selected[1]); store.write(this.meta); }
      return true;
    }

    showStation() {
      this.mode = 'station'; this.setSpeed(0);
      const crewOffers = D.CREW_TEMPLATES.filter(t => !this.state.crew.some(c => c.name === t.name)).slice(0, B.station.crewOfferCount);
      const turretOffers = Object.entries(D.TURRETS).filter(([id])=>this.runContentUnlocked?.('turrets',id)??true).sort(() => Math.random() - .5).slice(0, B.station.turretOfferCount);
      const moduleOffers = Object.entries(D.MODULES).filter(([id])=>this.runContentUnlocked?.('modules',id)??true).sort(() => Math.random() - .5).slice(0, B.station.moduleOfferCount);
      const modal = this.modalShell('정비 스테이션', `구간 ${this.state.stageIndex + 1}`, '열차가 정차했습니다. 장비와 직원을 보강하고 손상을 복구하십시오.');
      modal.querySelector('.dialog-body').innerHTML = `<div class="tabs"><button class="active" data-tab="gear">장비</button><button data-tab="crew">직원</button><button data-tab="upgrade">강화</button></div><div id="shop-content"></div><div class="station-actions"><button id="repair-train">전 객차 수리</button><button class="depart" id="depart-station">정비 완료 →</button></div>`;
      const renderTab = (tab) => {
        const content = $('#shop-content');
        if (tab === 'gear') {
          const offers = [...turretOffers.map(([id,d]) => ({ kind:'turret',id,d })), ...moduleOffers.map(([id,d]) => ({kind:'module',id,d}))];
          content.innerHTML = `<div class="shop-grid">${offers.map(o => `<article class="shop-item"><header><h3>${o.d.icon} ${o.d.name}</h3><b>¤ ${o.d.price}</b></header><p>${o.d.role || this.moduleDescription(o.d)}</p><button data-buy="gear" data-kind="${o.kind}" data-id="${o.id}" data-price="${o.d.price}">구매 및 자동 배치</button></article>`).join('')}</div>`;
        } else if (tab === 'crew') {
          content.innerHTML = `<div class="shop-grid">${crewOffers.map((c,i) => { const price=B.station.crewPrices[Math.min(i,B.station.crewPrices.length-1)]; return `<article class="shop-item"><header><h3>${c.name}</h3><b>¤ ${price}</b></header><p>${c.background} · ${D.TRAITS[c.traits[0]].name}<br>전 ${c.stats.combat} / 운 ${c.stats.operate} / 수 ${c.stats.repair} / 회 ${c.stats.recovery}</p><button data-buy="crew" data-index="${i}" data-price="${price}">영입</button></article>`}).join('')}</div>`;
        } else {
          const gear = this.state.cars.flatMap((c,ci) => c.equipment.filter(e=>e.kind==='turret').map(e=>({e,ci})));
          content.innerHTML = `<div class="shop-grid">${gear.map(({e,ci}) => { const t=D.TURRETS[e.type], cost=e.level===1?B.upgrade.level2Scrap:e.level===2?B.upgrade.level3Scrap:B.upgrade.branchScrap; return `<article class="shop-item"><header><h3>${t.name} Lv.${e.level}${e.branch?' ◈':''}</h3><b>▰ ${cost}</b></header><p>${this.state.cars[ci].name} · 피해/발열 효율 강화</p><button data-upgrade="${e.id}" data-cost="${cost}" ${e.branch?'disabled':''}>${e.level<3?'다음 레벨':'최종 분기: '+t.branch.name}</button></article>`}).join('')}</div>`;
        }
      };
      renderTab('gear');
      modal.onclick = (e) => {
        const tabBtn = e.target.closest('[data-tab]');
        if (tabBtn) { modal.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b===tabBtn)); renderTab(tabBtn.dataset.tab); return; }
        const buy = e.target.closest('[data-buy]');
        if (buy) {
          const price=Number(buy.dataset.price); if(this.state.money<price)return this.toast('돈이 부족합니다.');
          let ok=false;
          if(buy.dataset.buy==='gear') ok=this.giveRandomGear(buy.dataset.id,buy.dataset.kind);
          else ok=this.recruitCrew(crewOffers[Number(buy.dataset.index)]);
          if(!ok)return this.toast('빈 슬롯이 없습니다.'); this.state.money-=price; buy.disabled=true; buy.textContent='구매 완료'; this.renderAll();
        }
        const up=e.target.closest('[data-upgrade]');
        if(up){const cost=Number(up.dataset.cost);if(this.state.scrap<cost)return this.toast('고철이 부족합니다.');const eq=this.findEquipment(up.dataset.upgrade);if(!eq)return;if(eq.level<3)eq.level++;else eq.branch=true;this.state.scrap-=cost;renderTab('upgrade');this.renderAll();}
      };
      $('#repair-train').onclick = () => {
        const missing = this.state.cars.reduce((n,c)=>n+(c.maxHp-c.hp),0);
        const cost=Math.ceil(missing*B.station.repairMoneyPerHp); if(!missing)return this.toast('수리가 필요하지 않습니다.'); if(this.state.money<cost)return this.toast(`수리 비용 ¤ ${cost} 필요`);
        this.state.money-=cost;this.state.cars.forEach(c=>{c.hp=c.maxHp;c.repair=0;c.destroyedLogged=false});this.toast(`전 객차 수리 완료 · ¤ ${cost}`);this.renderAll();
      };
      $('#depart-station').onclick = () => { this.closeOverlay(); this.advanceStage(); };
    }

    findEquipment(id) { for(const c of this.state.cars){const e=c.equipment.find(x=>x.id===id);if(e)return e;} return null; }
    moduleDescription(m) { const map={cooling:'포탑 냉각 강화',medical:'전투 후 직원 회복 강화',repair:'객차 수리 속도 강화',ammo:'실탄 포탑 피해 강화',generator:'배분 가능한 추가 전력 +1'}; return map[m.effect]; }

    selectCrew(id) {
      if (!this.state) return; const crew=this.state.crew.find(c=>c.id===id); if(!crew)return;
      this.state.selectedCrew=id;this.state.selectedCar=null;this.state.targetMode=null;this.setTactical(true);this.renderAll();this.inspectCrew(crew);
      this.hint('이동시킬 객차를 선택하세요. 이동 중에도 시간은 흐릅니다.');
    }
    selectCar(index) {
      const s=this.state;if(!s)return;
      if(s.targetMode==='command'){this.executeCommand(index);return;}
      if(s.selectedCrew){this.moveCrew(s.selectedCrew,index);return;}
      s.selectedCar=index;s.selectedEnemy=null;this.renderAll();this.inspectCar(index);
    }
    moveCrew(id,to) {
      const c=this.state.crew.find(x=>x.id===id);if(!c||c.dead||c.hp<=0)return;
      const target=this.state.cars[to];if(!target)return;
      // Destroyed/armored cars remain valid destinations: crew must be able to enter
      // wrecks to repair them. Incapacitated crew still occupy their slot.
      const occupants=this.state.crew.filter(x=>x.id!==id&&!x.dead&&(x.moving?x.moving.to===to:x.car===to)).length;
      if(occupants>=this.crewCapacity(to))return this.toast('직원 슬롯이 가득 찼습니다.');
      const distance=Math.abs(c.car-to);if(!distance){this.state.selectedCrew=null;this.setTactical(false);return;}
      c.moving={from:c.car,to,left:distance*B.train.moveSecondsPerCar,total:distance*B.train.moveSecondsPerCar};
      this.state.selectedCrew=null;this.setTactical(false);this.renderAll();
    }
    setTactical(on) { if(!this.state)return;if(on){this.state.priorSpeed=this.state.speed||1;this.state.speed=B.simulation.tacticalScale;}else this.state.speed=this.state.priorSpeed||1;this.renderSpeed(); }

    setCarPower(index, desired) {
      const s=this.state;if(!s||index===0||!s.cars[index])return;const car=s.cars[index];
      const max=Math.max(...Object.values(D.TURRETS).map(t=>t.power.length));
      if(!Number.isInteger(desired)||desired<B.train.minCarPower||desired>max)return;
      const previous=car.power;car.power=desired;
      if(this.availableEnginePower()<B.train.enginePower.min){car.power=previous;return this.toast('배분할 전력이 부족합니다. 다른 객차의 출력을 낮추세요.');}
      this.rebalancePower();
      this.log(`${car.name} 전력 ${desired} · 기관실 ${s.cars[0].power}`,'hot');this.renderAll();
    }

    availableEnginePower() {
      const s=this.state;
      const generator=s.cars.reduce((n,c)=>n+(c.hp>0&&c.power>0&&c.armor<=0?c.equipment.reduce((v,e)=>v+(e.kind==='module'?((this.moduleData(e).extraPower||0)*(e.model==='wide'?s.cars.length:1)):0),0):0),0);
      return B.train.enginePower.start+(s.cars.length-1)*B.train.baseCarPower+Math.floor(generator)-s.cars.slice(1).reduce((n,c)=>n+c.power,0);
    }
    rebalancePower() {
      if(!this.state)return;
      for(let i=this.state.cars.length-1;i>0&&this.availableEnginePower()<B.train.enginePower.min;i--){
        while(this.state.cars[i].power>0&&this.availableEnginePower()<B.train.enginePower.min)this.state.cars[i].power--;
      }
      this.state.cars[0].power=clamp(this.availableEnginePower(),B.train.enginePower.min,B.train.enginePower.max);
    }

    activateOrder(type) {
      if(!this.state||this.mode!=='battle')return;const o=this.state.orders[type];if(o.cooldown>0)return;
      this.state.targetMode=type;this.state.selectedCrew=null;this.setTactical(true);
      this.hint(type==='focus'?'집중 사격할 적을 전투 화면에서 선택하세요.':'직접 지휘할 객차를 선택하세요.');
    }
    executeFocus(target) { const o=this.state.orders.focus;o.target=target.id;o.active=B.focus.duration;o.cooldown=B.focus.cooldown;this.state.targetMode=null;this.state.selectedEnemy=target.id;this.setTactical(false);this.log(`${target.name} 집중 사격`,'hot'); }
    executeCommand(carIndex) { const o=this.state.orders.command;o.car=carIndex;o.active=B.directCommand.duration;o.cooldown=B.directCommand.cooldown;this.state.targetMode=null;this.setTactical(false);this.log(`${this.state.cars[carIndex].name} 직접 지휘`,'hot'); }
    activateArmor() {
      const s=this.state;if(!s||this.mode!=='battle'||s.armorCharge<B.armor.maxCharge)return;
      const boarders=s.enemies.some(e=>!e.dead&&e.boarded);if(boarders)return this.toast('승선병이 있어 비상 장갑을 닫을 수 없습니다.');
      s.armorCharge=0;s.cars.forEach(c=>c.armor=B.armor.duration);s.crew.forEach(c=>{if(!c.dead&&c.hp>0)c.hp=Math.min(c.maxHp,c.hp+c.maxHp*B.armor.healRatio)});this.log('비상 장갑 전개','hot');this.renderAll();
    }

    canvasClick(e) {
      if(!this.state||this.mode!=='battle')return;const rect=this.canvas.getBoundingClientRect();const x=(e.clientX-rect.left)/rect.width,y=(e.clientY-rect.top)/rect.height;
      let candidates=[];
      if(this.state.battle.boss)candidates=this.state.battle.parts.filter(p=>!p.destroyed);else candidates=this.state.enemies.filter(n=>!n.dead);
      const target=candidates.map(n=>({n,d:Math.hypot(n.x-x,(n.y||.5)-y)})).sort((a,b)=>a.d-b.d)[0];
      if(target&&target.d<.12){if(this.state.targetMode==='focus')this.executeFocus(target.n);else{this.state.selectedEnemy=target.n.id;this.inspectEnemy(target.n);this.renderAll();}}
    }

    showMeta() {
      const modal=this.modalShell('영구 강화','폐허의 기억',`보유 고대 잔해 ◆ ${this.meta.relics} · 누적 사용 ${this.meta.spent}`);
      modal.querySelector('.dialog-body').innerHTML=`<div class="meta-grid">${Object.entries(D.META_UPGRADES).map(([id,u])=>{const level=Math.min(u.max,Number(this.meta.upgrades[id])||0);return `<article class="meta-item"><header><h3>${u.name} ${level} / ${u.max}</h3><b>◆ ${level>=u.max?'MAX':u.costs[level]}</b></header><p>${u.text}</p><button data-meta="${id}" ${level>=u.max?'disabled':''}>${level>=u.max?'최대 레벨':'다음 레벨 강화'}</button></article>`;}).join('')}</div><p class="section-kicker" style="margin-top:22px">누적 사용 해금</p><div class="codex-grid"><div class="codex-item"><b>${this.meta.spent>=B.unlocks.traitSpent?'고대기술 연구자':'？？？'}</b><p>◆ ${B.unlocks.traitSpent} 사용</p></div><div class="codex-item"><b>${this.meta.spent>=B.unlocks.teslaSpent?'테슬라 코일':'？？？'}</b><p>◆ ${B.unlocks.teslaSpent} 사용</p></div><div class="codex-item"><b>${this.meta.spent>=B.unlocks.moduleSpent?'발전 모듈':'？？？'}</b><p>◆ ${B.unlocks.moduleSpent} 사용</p></div></div>`;
      modal.onclick=(e)=>{const btn=e.target.closest('[data-meta]');if(!btn)return;const id=btn.dataset.meta,u=D.META_UPGRADES[id],level=Number(this.meta.upgrades[id])||0;if(!u||level>=u.max)return;const cost=u.costs[level];if(this.meta.relics<cost)return this.toast('고대 잔해가 부족합니다.');this.meta.relics-=cost;this.meta.spent+=cost;this.meta.upgrades[id]=level+1;store.write(this.meta);this.showMeta();this.drawMenuState();};
    }
    showCodex() {
      const modal=this.modalShell('도감','기록 보관소','발견한 장비와 적의 정보가 이곳에 남습니다. 잠긴 항목은 실루엣으로 표시됩니다.');
      const turretCards=registries.turrets.entries().map(([id,t])=>{const seen=this.meta.discovered.turrets.includes(id), unlocked=!t.unlockSpent||this.meta.spent>=t.unlockSpent;return `<div class="codex-item"><b>${seen&&unlocked?t.icon+' '+t.name:'◼ ？？？'}</b><p>${seen&&unlocked?t.role:`누적 잔해 사용 ${t.unlockSpent||'—'}`}</p></div>`}).join('');
      const enemyCards=registries.enemies.entries().map(([id,n])=>{const seen=this.meta.discovered.enemies.includes(id);return `<div class="codex-item"><b>${seen?n.icon+' '+n.name:'◼ ？？？'}</b><p>${seen?`기본 HP ${n.hp} · 장갑 ${Math.round(n.armor*100)}%`:'아직 조우하지 않음'}</p></div>`}).join('');
      modal.querySelector('.dialog-body').innerHTML=`<p class="section-kicker">포탑</p><div class="codex-grid">${turretCards}</div><p class="section-kicker" style="margin-top:20px">적</p><div class="codex-grid">${enemyCards}</div>`;
    }
    showHowTo() {
      const modal=this.modalShell('조작법','열차장 교범','전투는 실시간으로 진행되며, 결정을 내리는 동안에도 완전히 멈추지 않습니다.');
      modal.querySelector('.dialog-body').innerHTML=`<div class="choices"><div class="choice-card"><span class="choice-icon">↔</span><div><b>직원 이동</b><p>오른쪽 직원 카드를 누른 뒤 아래 객차를 선택합니다. 이동 거리에 따라 시간이 걸립니다.</p></div></div><div class="choice-card"><span class="choice-icon">ϟ</span><div><b>전력 재배분</b><p>객차 카드의 전력 단계를 누릅니다. 기관실 전력을 빼면 포탑은 강해지지만 타이탄이 가까워집니다.</p></div></div><div class="choice-card"><span class="choice-icon">1</span><div><b>열차장 명령</b><p>집중 사격은 적, 직접 지휘는 객차를 지정합니다. 비상 장갑은 승선병이 없을 때만 사용할 수 있습니다.</p></div></div><div class="choice-card"><span class="choice-icon">⚒</span><div><b>파괴와 복구</b><p>파괴된 객차에 수리 능력이 높은 직원을 보내면 복구됩니다. 전투불능 직원은 파괴 객차에서 사망합니다.</p></div></div></div>`;
    }

    openPause() {
      if(!this.state){$('#overlay').classList.add('show');return;}this.state.priorSpeed=this.state.speed;this.state.speed=0;
      const modal=this.modalShell('작전 일시정지',`ACT ${D.ACTS[this.state.actId].label} · 구간 ${Math.min(this.state.stageIndex+1,10)}`,'다음 행동을 정비할 수 있습니다.');
      modal.querySelector('.dialog-body').innerHTML=`<div class="doctrine-row"><div><b>교리: 긴급 자동 수리</b><p>수리 6 이상 직원이 손상 65% 이하의 현재 객차를 자동 수리합니다.</p></div><button class="switch ${this.state.doctrine?'on':''}" id="doctrine-switch" aria-label="교리 전환"></button></div><div class="station-actions"><button id="pause-howto">조작법</button><button id="abandon">런 포기</button><button class="depart" id="resume">작전 계속 →</button></div>`;
      $('#doctrine-switch').onclick=()=>{this.state.doctrine=!this.state.doctrine;$('#doctrine-switch').classList.toggle('on',this.state.doctrine)};
      $('#pause-howto').onclick=()=>this.showHowTo();$('#abandon').onclick=()=>this.returnMenu();$('#resume').onclick=()=>this.closeOverlay();
    }
    returnMenu(){this.state=null;this.mode='menu';this.drawMenuState();this.showMainMenu();}
    showMainMenu(){location.reload();}

    modalShell(title,kicker,text) {
      const overlay=$('#overlay'),modal=$('#modal');overlay.classList.add('show');modal.className='modal dialog-modal';
      modal.innerHTML=`<div class="dialog-head"><div><div class="eyebrow">${kicker}</div><h2>${title}</h2><p>${text}</p></div><button class="close-btn" aria-label="닫기">×</button></div><div class="dialog-body"></div>`;
      modal.querySelector('.close-btn').onclick=()=>this.closeOverlay();return modal;
    }
    showDialog(title,kicker,text,choices,onChoice) {
      const modal=this.modalShell(title,kicker,text);const body=modal.querySelector('.dialog-body');body.innerHTML='<div class="choices"></div>';
      const list=body.firstChild;choices.forEach(c=>{const btn=document.createElement('button');btn.className='choice-card';const affordable=this.canPay(c.cost);btn.disabled=!affordable;btn.innerHTML=`<span class="choice-icon">${c.icon||'→'}</span><div><b>${c.label}</b><p>${c.text||''}</p><small>${c.hint||(!affordable?'자원 부족':'')}</small></div>`;btn.onclick=()=>onChoice(c);list.appendChild(btn)});
      return modal;
    }
    closeOverlay(){if(this.state&&this.mode==='battle'&&this.state.speed===0)this.state.speed=this.state.priorSpeed||1;$('#overlay').classList.remove('show');this.renderSpeed();}
    showEnding(earned){const modal=$('#modal');$('#overlay').classList.add('show');modal.className='modal dialog-modal';modal.innerHTML=`<div class="ending"><div class="eyebrow">BEHEMOTH 격파 · 고대 잔해 ◆ ${earned}</div><div class="clear">ACT I CLEAR</div><div class="titan-word">TITAN</div><h2>그러나 여정은 여기서 끝났다.</h2><p>승리의 경적이 채 사라지기도 전에 지평선이 일어섰다.<br>현재의 열차로 타이탄을 상대하기에는 아직 준비가 부족했다.<br><b>다음 업데이트에서 여정이 계속됩니다.</b></p><button class="primary-btn" id="ending-menu">메인 메뉴로 <span>→</span></button></div>`;$('#ending-menu').onclick=()=>this.returnMenu();}

    inspectCrew(c){const traits=c.traits.map(t=>`<span class="badge">${D.TRAITS[t].name}</span>`).join('');$('#inspector').innerHTML=`<h3>${c.name}</h3><p>${c.background} · ${this.state.cars[c.car].name}</p><div>${traits}</div><div class="stat-grid"><span><b>${c.stats.combat}</b>전투</span><span><b>${c.stats.operate}</b>운용</span><span><b>${c.stats.repair}</b>수리</span><span><b>${c.stats.recovery}</b>회복</span></div><p>${c.traits.map(t=>D.TRAITS[t].text).join('<br>')}</p>`;}
    inspectCar(i){const c=this.state.cars[i],gear=c.equipment.map(e=>{const d=e.kind==='turret'?D.TURRETS[e.type]:D.MODULES[e.type];return `${d.icon} ${d.name}${e.kind==='turret'?` Lv.${e.level}`:''}`}).join('<br>')||'비어 있음';$('#inspector').innerHTML=`<h3>${c.name}</h3><p>내구 ${Math.ceil(c.hp)} / ${Math.ceil(c.maxHp)} · 전력 ${c.power}</p><p>${gear}</p>${c.hp<=0?`<p>복구 진행 ${Math.round(c.repair)} / ${B.train.repairGoal}</p>`:''}`;}
    inspectEnemy(e){const data=e.type?D.ENEMIES[e.type]:null;$('#inspector').innerHTML=`<h3>${e.name}</h3><p>내구 ${Math.ceil(e.hp)} / ${Math.ceil(e.maxHp)}</p>${data?`<p>장갑 ${Math.round(data.armor*100)}% · 객차 피해 ${Math.round(e.carDamage)} · 직원 피해 ${Math.round(e.crewDamage)}</p>`:`<p>BEHEMOTH의 공격 가능한 부위</p>`}`;}
    hint(text){const h=$('#hint');h.textContent=text;h.style.opacity=1;clearTimeout(this.hintTimer);this.hintTimer=setTimeout(()=>h.style.opacity=.25,B.ui.toastMs);}
    toast(text){document.querySelector('.toast')?.remove();const t=document.createElement('div');t.className='toast';t.textContent=text;document.body.appendChild(t);setTimeout(()=>t.remove(),B.ui.toastMs);}
    log(text,cls=''){if(!this.state)return;const box=$('#combat-log');const el=document.createElement('div');el.className=cls;el.textContent=`${fmtTime(this.state.battle?.elapsed||0)}  ${text}`;box.prepend(el);while(box.children.length>B.ui.logLimit)box.lastChild.remove();}
    showBanner(title,sub){const el=$('#stage-banner');el.innerHTML=`<small>${sub}</small>${title}`;el.classList.remove('hidden');setTimeout(()=>el.classList.add('hidden'),B.ui.bannerMs);}
    setSpeed(v){if(!this.state)return;this.state.speed=v;this.state.priorSpeed=v||this.state.priorSpeed;this.renderSpeed();}
    renderSpeed(){$$('.speed-controls button').forEach(b=>b.classList.toggle('active',this.state&&Number(b.dataset.speed)===this.state.speed));}

    renderAll(){this.updateHUD();this.renderCars();this.renderCrew();this.renderOrders();this.renderSpeed();}
    updateHUD(){const s=this.state;if(!s)return;$('#act-label').textContent=D.ACTS[s.actId].label;$('#stage-label').textContent=`${Math.min(s.stageIndex+1,10)} / 10`;$('#money-label').textContent=Math.floor(s.money);$('#scrap-label').textContent=Math.floor(s.scrap);$('#relic-label').textContent=Math.floor(s.relics);$('#titan-distance').textContent=`${s.titanDistance.toFixed(2)} km`;$('#train-speed').textContent=(s.currentTrainSpeed||B.train.speedByPower[s.cars[0].power]).toFixed(2);$('#titan-speed').textContent=(s.currentTitanSpeed||B.titan.speedBase).toFixed(2);$('#threat-fill').style.width=`${clamp(s.titanDistance/B.run.maxTitanDistance*100,0,100)}%`;$('#titan-distance').style.color=s.titanDistance<=B.titan.critical?'var(--danger)':s.titanDistance<=B.titan.warning?'var(--amber)':'';$('#battle-kind').textContent=s.battle?(s.battle.boss?'BOSS · '+s.battle.title:s.battle.title):'이동 중';$('#battle-timer').textContent=fmtTime(s.battle?.elapsed||0);}
    renderCars(){const s=this.state;if(!s)return;$('#train-cars').innerHTML=s.cars.map((c,i)=>{const gear=c.equipment.map(e=>(e.kind==='turret'?D.TURRETS[e.type]:D.MODULES[e.type]).icon).join(' ')||'—';const crew=s.crew.filter(x=>!x.dead&&!x.moving&&x.car===i&&x.hp>0).map(x=>x.name).join(' · ')||'—';return `<article class="car-card ${c.hp<=0?'destroyed':''} ${s.selectedCar===i?'selected':''}" data-index="${i}"><div class="car-top"><b>${c.name}</b><div class="power-stepper">${i===0?`<span>ϟ ${c.power}</span>`:[1,2,3].map(p=>`<button class="${c.power>=p?'on':''}" data-power="${p}" aria-label="전력 ${p}">${p}</button>`).join('')}</div></div><div class="hp-bar"><i style="width:${c.hp/c.maxHp*100}%;background:${c.hp/c.maxHp<.35?'var(--danger)':''}"></i></div><div class="car-slots"><span>장비 ${gear}</span><span>직원 ${crew}</span></div></article>`}).join('');}
    renderCrew(){const s=this.state;if(!s)return;$('#crew-list').innerHTML=s.crew.map(c=>`<button class="crew-card ${s.selectedCrew===c.id?'selected':''} ${c.dead||c.hp<=0?'ko':''}" data-id="${c.id}"><span class="crew-avatar">${c.name[0]}</span><span class="crew-copy"><b>${c.name}</b><small>${c.dead?'사망':c.hp<=0?'전투불능':c.moving?'이동 중':s.cars[c.car].name} · ${D.TRAITS[c.traits[0]].name}</small></span><span class="crew-hp">${Math.ceil(c.hp)}<i style="--hp:${c.hp/c.maxHp*100}%"></i></span></button>`).join('');}
    renderOrders(){const s=this.state;if(!s)return;const f=s.orders.focus,c=s.orders.command;$('#focus-status').textContent=f.active>0?`${f.active.toFixed(1)}초`:f.cooldown>0?`재사용 ${Math.ceil(f.cooldown)}초`:'대상 지정';$('#command-status').textContent=c.active>0?`${c.active.toFixed(1)}초`:c.cooldown>0?`재사용 ${Math.ceil(c.cooldown)}초`:'객차 지정';$('#armor-status').textContent=`충전 ${Math.round(s.armorCharge)}%`;$('#focus-order').disabled=f.cooldown>0;$('#command-order').disabled=c.cooldown>0;$('#armor-order').disabled=s.armorCharge<B.armor.maxCharge;$('#focus-order .cooldown').style.transform=`scaleX(${f.cooldown/B.focus.cooldown})`;$('#command-order .cooldown').style.transform=`scaleX(${c.cooldown/B.directCommand.cooldown})`;$('#armor-order .cooldown').style.transform=`scaleX(${s.armorCharge/B.armor.maxCharge})`;}
    drawMenuState(){$('#menu-relics').textContent=`${this.meta.relics} ◆`;}

    resize(){const rect=this.canvas.parentElement.getBoundingClientRect();const ratio=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.max(1,Math.floor(rect.width*ratio));this.canvas.height=Math.max(1,Math.floor(rect.height*ratio));this.ctx.setTransform(ratio,0,0,ratio,0,0);this.view={w:rect.width,h:rect.height};}
    loop(now){const dt=Math.min((now-this.lastFrame)/1000,B.simulation.maxDelta);this.lastFrame=now;this.update(dt);this.draw();if(this.state&&Math.floor(now/200)%2===0){this.updateHUD();this.renderOrders();this.renderCrew();this.renderCars();}requestAnimationFrame(t=>this.loop(t));}
    fx(x,y,color){if(!this.state)return;this.state.particles.push({x,y,color,life:.35});}
    updateParticles(dt){const s=this.state;s.projectiles.forEach(p=>p.life-=dt);s.projectiles=s.projectiles.filter(p=>p.life>0);s.particles.forEach(p=>p.life-=dt);s.particles=s.particles.filter(p=>p.life>0);}

    draw(){const ctx=this.ctx,w=this.view?.w||1,h=this.view?.h||1,t=performance.now()/1000;ctx.clearRect(0,0,w,h);const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#27383b');sky.addColorStop(.53,'#9b513d');sky.addColorStop(.54,'#2b2823');sky.addColorStop(1,'#111516');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);ctx.fillStyle='#e6a24a22';ctx.beginPath();ctx.arc(w*.72,h*.34,Math.min(w,h)*.16,0,Math.PI*2);ctx.fill();for(let i=0;i<11;i++){const x=((i*173-t*12)% (w+160))-80;ctx.fillStyle=i%2?'#0e1212aa':'#1b2222aa';ctx.beginPath();ctx.moveTo(x,h*.55);ctx.lineTo(x+90,h*.28+(i%3)*18);ctx.lineTo(x+160,h*.55);ctx.fill()}ctx.fillStyle='#181613';ctx.fillRect(0,h*.73,w,h*.27);ctx.strokeStyle='#4b4034';ctx.lineWidth=3;for(let y=h*.81;y<h;y+=22){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y-9);ctx.stroke()}if(!this.state){this.drawAmbient(ctx,w,h,t);return;}this.drawTrain(ctx,w,h,t);if(this.state.battle?.boss)this.drawBoss(ctx,w,h);this.drawEnemies(ctx,w,h,t);this.drawProjectiles(ctx,w,h);this.drawParticles(ctx,w,h);}
    drawAmbient(ctx,w,h,t){ctx.fillStyle='#0a0d0d';ctx.fillRect(w*.08,h*.68,w*.58,h*.12);for(let i=0;i<5;i++){ctx.fillStyle=i===0?'#222b2b':'#171e1e';ctx.fillRect(w*(.1+i*.12),h*.6,w*.11,h*.12)} }
    drawTrain(ctx,w,h,t){const s=this.state,baseY=h*.78,startX=w*.05,carW=Math.min(w*.13,150),gap=5;s.cars.forEach((c,i)=>{const x=startX+i*(carW+gap),shake=c.hp/c.maxHp<.3?Math.sin(t*22+i)*2:0;ctx.save();ctx.translate(0,shake);ctx.fillStyle=c.hp<=0?'#2a1714':i===0?'#293335':'#343e3e';ctx.strokeStyle=c.armor>0?'#f0bd52':'#0b0d0d';ctx.lineWidth=c.armor>0?5:2;ctx.fillRect(x,baseY-carW*.48,carW,carW*.43);ctx.strokeRect(x,baseY-carW*.48,carW,carW*.43);ctx.fillStyle='#111718';ctx.fillRect(x+8,baseY-carW*.4,carW-16,carW*.13);ctx.fillStyle='#e35235';ctx.fillRect(x,baseY-carW*.08,carW,carW*.08);ctx.fillStyle='#080a0a';for(let j=0;j<2;j++){ctx.beginPath();ctx.arc(x+carW*(.27+j*.47),baseY,carW*.09,0,Math.PI*2);ctx.fill()}c.equipment.forEach((eq,j)=>{const d=eq.kind==='turret'?D.TURRETS[eq.type]:D.MODULES[eq.type];ctx.fillStyle=eq.kind==='turret'?(eq.overheated?'#e34f35':'#d3bd7b'):'#65b9b8';ctx.font=`bold ${Math.max(12,carW*.13)}px sans-serif`;ctx.fillText(d.icon,x+14+j*carW*.46,baseY-carW*.5)});const occupants=s.crew.filter(cr=>!cr.dead&&!cr.moving&&cr.car===i&&cr.hp>0);occupants.forEach((cr,j)=>{ctx.fillStyle='#e8ddd0';ctx.beginPath();ctx.arc(x+carW*(.35+j*.3),baseY-carW*.27,5,0,Math.PI*2);ctx.fill()});ctx.restore()});}
    drawEnemies(ctx,w,h,t){if(!this.state)return;this.state.enemies.forEach(e=>{if(e.dead&&e.deathTime<=0)return;const data=D.ENEMIES[e.type],x=w*(.1+e.x*.84),y=h*e.y;ctx.save();if(e.dead)ctx.globalAlpha=clamp(e.deathTime/.35,0,1);ctx.fillStyle=data.color;ctx.strokeStyle='#0b0c0c';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,e.boarded?13:18,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#0b0c0c';ctx.font='bold 17px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(data.icon,x,y);ctx.fillStyle='#0b0c0c';ctx.fillRect(x-22,y-30,44,5);ctx.fillStyle=e.boarded?'#e35235':'#f0bd52';ctx.fillRect(x-22,y-30,44*(e.hp/e.maxHp),5);if(this.state.selectedEnemy===e.id){ctx.strokeStyle='#f0bd52';ctx.setLineDash([4,4]);ctx.beginPath();ctx.arc(x,y,27+Math.sin(t*5)*2,0,Math.PI*2);ctx.stroke()}ctx.restore()});}
    drawBoss(ctx,w,h){const b=this.state.battle;ctx.fillStyle='#171d1d';ctx.strokeStyle='#755342';ctx.lineWidth=4;ctx.fillRect(w*.7,h*.31,w*.27,h*.47);ctx.fillStyle='#070909';ctx.fillRect(w*.73,h*.42,w*.2,h*.18);b.parts.forEach(p=>{const x=w*p.x,y=h*p.y;ctx.fillStyle=p.destroyed?'#2b1714':p.type==='body'?'#9d553c':'#c69555';ctx.fillRect(x-35,y-21,70,42);ctx.fillStyle='#070909';ctx.fillRect(x-33,y-31,66,5);ctx.fillStyle=p.type==='body'?'#e35235':'#f0bd52';ctx.fillRect(x-33,y-31,66*(p.hp/p.maxHp),5);ctx.fillStyle='#d8ddd6';ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillText(p.name,x,y+4)});}
    drawProjectiles(ctx,w,h){if(!this.state)return;const startX=w*.18;this.state.projectiles.forEach(p=>{const progress=1-p.life/.18;const x=startX+p.from*w*.09+(w*p.tx-(startX+p.from*w*.09))*progress,y=h*.68+(h*p.ty-h*.68)*progress;ctx.fillStyle=p.type==='tesla'?'#62dce0':'#ffd27a';ctx.beginPath();ctx.arc(x,y,p.type==='cannon'?5:3,0,Math.PI*2);ctx.fill()});}
    drawParticles(ctx,w,h){if(!this.state)return;this.state.particles.forEach(p=>{ctx.fillStyle=p.color;ctx.globalAlpha=clamp(p.life/.35,0,1);ctx.beginPath();ctx.arc(w*p.x,h*p.y,20*(1-p.life/.35)+3,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1});}
  }

  window.lastRail = new Game();
})();
