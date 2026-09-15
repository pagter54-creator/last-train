/* LAST RAIL v0.8 asset manifest. Add future files here instead of scattering paths across systems. */
(()=>{
 'use strict';
 const eventImages={
  abandoned_station:'./image/abandoned_station.png',
  wreck_train:'./image/destroyed_transport_train.png',
  injured_survivors:'./image/injured_survivor.png',
  raider_trade:'./image/raider_trade.png',
  broken_rails:'./image/broken_rail.png',
  suspicious_fuel:'./image/suspicious_fuel.png',
  distress:'./image/distress_signal.png',
  ancient_wreck:'./image/ancient_debris_deposit.png',
  military_base:'./image/abandoned_military_base.png',
  other_train:'./image/other_train.png',
  mystery_merchant:'./image/mysterious_merchant.png',
  ruins:'./image/ancient_ruin.png',
  biker_race:'./image/biker_race.png',
  arena:'./image/illegal_arena.png',
  relic_converter:'./image/relic_converter.png',
  generator_explosion:'./image/generator_explosion.png',
  engineer_group:'./image/engineer_group.png',
  memory_damage:'./image/memory_damage.png',
  elite_encounter:'./image/elite_encounter.png',
  relic_cache:'./image/relic_cache.png',
  lightning_rod:'./image/lightning_rod.png'
 };
 const act3Images=['relic_converter','generator_explosion','engineer_group','memory_damage','elite_encounter','relic_cache','lightning_rod'];
 const pendingNames=Object.fromEntries(act3Images.map((id,i)=>[id,`./image/act3 image ${i+1}.png`]));
 const eventEntries=(ids,prefix)=>ids.map(id=>({
  id:`${prefix}-${id}`,
  type:'image',
  src:eventImages[id],
  fallbackSrc:pendingNames[id],
  required:true
 }));
 window.LAST_RAIL_ASSET_CONFIG={
  gameVersion:'0.9.1',
  assetVersion:'0.9.1',
  initialGroups:['core','act1'],
  backgroundQueue:['boss1','act2','boss2','act3','boss3','titan','events1','events2','events3'],
  autoRetries:3,
  timeoutMs:15000,
  statusIntervalMs:900,
  fadeMs:180,
  statusMessages:['선로 상태 확인 중...','엔진 압력 상승 중...','승무원 명부 확인 중...','탄약 적재 중...','통신 장비 점검 중...'],
  labels:{core:'핵심 시스템',act1:'ACT I',act2:'ACT II',act3:'ACT III',boss1:'BEHEMOTH',boss2:'ARACHNE',boss3:'JANUS',titan:'TITAN',events1:'ACT I 이벤트',events2:'ACT II 이벤트',events3:'ACT III 이벤트'},
  contentGroups:{
   acts:{act1:'act1',act2:'act2',act3:'act3',titan:'titan'},
   bosses:{behemoth:'boss1',arachne:'boss2',janus:'boss3',titan:'titan'},
   titan:'titan',
   events:{act1:'events1',act2:'events2',act3:'events3'}
  },
  eventImages,
  /*
   * required=true means failure blocks entry to that content group.
   * BGM/fonts are deliberately non-blocking: audio may be unavailable and fonts have CSS fallbacks.
   * Event backgrounds are required for their ACT event group so an event never opens with missing scenery.
   */
  manifest:{
   core:[
    {id:'font-title',type:'font',family:'Black Han Sans',required:false},
    {id:'font-body',type:'font',family:'Gowun Dodum',required:false},
    {id:'bgm-lobby',type:'audio',src:'./bgm/bgm_lobby.mp3',required:false}
   ],
   act1:[
    {id:'station-background',type:'image',src:'./image/station-background.png',required:true},
    {id:'bgm-act1-battle',type:'audio',src:'./bgm/bgm_act1_battle.mp3',required:false}
   ],
   boss1:[
    {id:'bgm-act1-boss',type:'audio',src:'./bgm/bgm_act1_boss.mp3',required:false}
   ],
   act2:[
    {id:'bgm-act2-battle',type:'audio',src:'./bgm/bgm_act2_battle.mp3',required:false}
   ],
   boss2:[
    {id:'bgm-act2-boss',type:'audio',src:'./bgm/bgm_act2_boss.mp3',required:false}
   ],
   act3:[
    {id:'bgm-act3-battle',type:'audio',src:'./bgm/bgm_act3_battle.mp3',required:false}
   ],
   boss3:[
    {id:'bgm-act3-boss',type:'audio',src:'./bgm/bgm_act3_boss.mp3',required:false}
   ],
   titan:[
    {id:'bgm-titan',type:'audio',src:'./bgm/bgm_titan.mp3',required:false}
   ],
   events1:eventEntries([
    'abandoned_station','wreck_train','injured_survivors','raider_trade','broken_rails','suspicious_fuel','distress'
   ],'event-act1'),
   events2:eventEntries([
    'ancient_wreck','military_base','other_train','mystery_merchant','ruins','biker_race','arena'
   ],'event-act2'),
   events3:eventEntries(act3Images,'event-act3')
  }
 };
})();
