/* v0.6 tuning. Loaded before meta captures its per-run baseline. */
(()=>{
 const D=GAME_DATA,B=D.BALANCE,C=window.UPDATE06={version:'0.6',stations:[4,9,15],hardStations:[7,15],hardAt:9,stationEventWeight:.15};
 Object.assign(B.moduleUpgrade.branches,{specialized:{name:'집중',factor:1.5,range:'self',text:'현재 객차 1칸 · 성능 ×1.5'},standard:{name:'표준',factor:1.1,range:'base',text:'기본 범위 유지 · 성능 ×1.1'},wide:{name:'광역',factor:.6,range:'all',text:'모든 객차 · 성능 ×0.6'}});
 B.targeting.frost=.8;D.TURRETS.frost.range=D.TURRETS.frost.rangeType='frost';
 window.configureStationSchedule=function(apocalypse){const wanted=apocalypse>=C.hardAt?C.hardStations:C.stations;for(const act of Object.values(D.ACTS))act.stages=act.stages.map((node,i)=>wanted.includes(i+1)?{node:'station',title:'정비 스테이션'}:node.node==='station'?{node:'battle',title:'황무지 교전'}:node.node==='branch'?{...node,options:node.options?.filter(o=>(typeof o==='string'?o:o.type)!=='station')}:node);};
 EVENT_CONFIG.events.push({id:'unexpected_station',act:1,rareStation:true,weight:C.stationEventWeight,title:'뜻 밖의 정비소',text:'지도에 없던 작은 정비소가 선로 옆에서 신호를 보냅니다. 이번 런에서 한 번만 만날 수 있습니다.',choices:[{id:'pass',label:'통과한다',time:0,reward:{}},{id:'visit',label:'정비소에 들른다',time:0,reward:{stationVisit:true},title:'뜻 밖의 정비소',text:'장비와 직원을 확인하고 열차를 정비할 수 있습니다. 정비소의 각 행동에는 기존 시간 비용이 적용됩니다.'}]});
 const groups=[['서준','지우','민재','하린','도하','수아','시온','예린','태오','나리','준호','유진'],['올리버','샬럿','리암','아멜리아','노아','에밀리','제임스','소피아','잭','그레이스','이선','클로이'],['루카','엘레나','마테오','프레야','레온','아스트리드','니콜라이','카타리나','에밀','잉그리드','라파엘','이네스'],['하루토','유이','렌','아오이','웨이','메이린','준','샤오란','아르준','프리야','민','린']];
 C.namePools=groups;const templates=D.CREW_TEMPLATES.slice();
 for(let i=0;i<groups[0].length;i++)for(let j=0;j<groups.length;j++){const name=groups[j][i];if(D.CREW_TEMPLATES.some(c=>c.name===name))continue;const base=templates[(i*groups.length+j)%templates.length];D.CREW_TEMPLATES.push({...JSON.parse(JSON.stringify(base)),name});}
})();
