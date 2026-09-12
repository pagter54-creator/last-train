/* All encounter tuning lives here. Part HP is independent of shared boss HP. */
(() => {
  const D=window.GAME_DATA;
  const C=window.BOSS_REWORK={
    core:{interval:40,seconds:8,damage:1.2},repairWarning:3,noticeSeconds:3,shotSeconds:.45,
    phases:[{above:.66,interval:1,repair:1,concurrent:1},{above:.33,interval:1,repair:1,concurrent:2},{above:0,interval:.82,repair:.85,concurrent:2}],
    firstPattern:4,patternGap:5,gripWindup:2.6,gripMax:100,gripDamagePerHp:.12,armStun:2,armRest:5,
    gripSeconds:18,suppressionCombatPerSecond:.75,engineChance:.2,
    crew:{interval:1,damageBase:3,damagePerCombat:1.6,hitBase:.65,hitPerCombat:.035,hitMax:.97,visualSeconds:.18},
    truck:{hp:950,armor:.68,travel:17,warning:3,boarders:[2,4],boarderHp:115,carDamage:7,crewDamage:5,maxAlive:2},
    behemoth:{hp:12000,cannon:{warning:2.8,damage:100},drive:{warning:2,seconds:8,speed:.68}},
    arachne:{hp:18500},
    grips:{
      crush:{name:'파쇄',color:'#ff6868',damagePerSecond:9,help:'팔 집중 사격 / 비상 장갑으로 지속 피해 차단'},
      seal:{name:'봉쇄',color:'#e3e8eb',help:'장비·직원 작업 정지 — 다른 객차의 포탑으로 팔 공격'},
      drain:{name:'흡전',color:'#a38bff',power:1,help:'출력 1 감소 — 팔 공격 또는 비상 장갑'},
      suppress:{name:'진압',color:'#ffce63',help:'직원 작업 정지 — 직원 전투력이 높으면 빨리 해제'}
    }
  };
  const part=(type,name,hp,x,y,regen,extra={})=>({type,name,hp,x,y,regen,armor:.12,...extra});
  Object.assign(D.BOSSES.behemoth,{sharedHp:C.behemoth.hp,engineSpeedMult:1,summon:null,parts:[
    part('core','CORE',C.behemoth.hp,.59,.41,0,{victory:true,armor:0}),
    part('cannon','MAIN CANNON',1000,.63,.27,30),
    part('bay','TROOP BAY',900,.35,.44,32),part('drive','DRIVE UNIT',950,.79,.53,27)
  ]});
  Object.assign(D.BOSSES.arachne,{sharedHp:C.arachne.hp,summon:null,parts:[
    part('core','CORE',C.arachne.hp,.54,.35,0,{victory:true,armor:0}),
    part('crush','파쇄 ARM',1050,.25,.3,28),part('seal','봉쇄 ARM',1050,.78,.3,30),
    part('drain','흡전 ARM',1000,.24,.5,26),part('suppress','진압 ARM',1000,.8,.5,26)
  ]});
  D.ENEMIES.infiltrationTruck={name:'침투 트럭',hp:C.truck.hp,armor:C.truck.armor,speed:0,carDamage:0,crewDamage:0,interval:99,fromStage:999,behavior:'bossTruck',tags:['PRESSURE']};
  D.BALANCE.audio.steam={noise:true,frequency:1500,duration:.8,gain:.45};
})();
