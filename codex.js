/* Device-local knowledge is separate from run progression and event transactions. */
(()=>{
 const g=lastRail,D=GAME_DATA,B=D.BALANCE,C=EVENT_CONFIG,R=REVISION_CONFIG,$=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),num=v=>typeof v==='number'?Number(v.toFixed(3)):v,key='lastRailCodexV2';
 let book;try{book=JSON.parse(localStorage.getItem(key));}catch{}book??={gear:[],enemies:[],crew:[],skills:[],events:[],results:{}};for(const k of ['gear','enemies','crew','skills','events'])book[k]??=[];book.results??={};if(!Array.isArray(book.loreRead))book.loreRead=[];
 function save(){try{localStorage.setItem(key,JSON.stringify(book));}catch{g.toast('도감 기록을 저장할 공간이 없습니다.');}}
 g.recordEncounter=function(kind,id){if(!book[kind]||book[kind].includes(id))return;book[kind].push(id);save();};
 g.recordEventResult=function(id,choice,index){this.recordEncounter('events',id);const k=id+':'+choice;book.results[k]??=[];if(!book.results[k].includes(index)){book.results[k].push(index);save();}};
 function crew(c){g.recordEncounter('crew',c.name);for(const t of c.traits)g.recordEncounter('skills',t);}
 const equipmentHTML=g.equipmentHTML.bind(g);g.equipmentHTML=function(e,...a){this.recordEncounter('gear',e.kind+':'+e.type);return equipmentHTML(e,...a);};
 const crewHTML=g.crewHTML.bind(g);g.crewHTML=function(c,...a){if(c.id)crew(c);return crewHTML(c,...a);};
 function train(){if(!g.state)return;g.state.cars.forEach(c=>c.equipment.forEach(e=>g.recordEncounter('gear',e.kind+':'+e.type)));g.state.crew.forEach(crew);}
 const make=g.makeInitialState.bind(g);g.makeInitialState=function(){const s=make();s.cars.forEach(c=>c.equipment.forEach(e=>this.recordEncounter('gear',e.kind+':'+e.type)));s.crew.forEach(crew);return s;};
 const spawn=g.spawnEnemy.bind(g);g.spawnEnemy=function(...a){const r=spawn(...a);this.state.enemies.forEach(e=>this.recordEncounter('enemies',e.type));return r;};
 const boss=g.startBoss.bind(g);g.startBoss=function(id){const r=boss(id);this.recordEncounter('enemies','boss:'+id);return r;};
 const shop=g.renderStation.bind(g);g.renderStation=function(){shop();if(this.stationTab==='gear')this.stationOffers.gear.forEach(e=>this.recordEncounter('gear',e.kind+':'+e.id));if(this.stationTab==='crew')this.stationOffers.crew.forEach(crew);};
 const render=g.renderCars.bind(g);g.renderCars=function(){render();train();};
 function table(rows){return '<table class="codex-table"><tbody>'+rows.map(([a,b])=>`<tr><th>${esc(a)}</th><td>${esc(num(b))}</td></tr>`).join('')+'</tbody></table>';}
 function fold(name,html,known,extra=''){const cls=`codex-entry${extra?' '+extra:''}`;return known?`<details class="${cls}"><summary>${esc(name)}</summary>${html}</details>`:`<article class="${cls} locked">미발견 · ???</article>`;}
 const behavior={hook:'갈고리로 객차 수리 효율을 떨어뜨리고 승선 적 접근을 돕습니다.',power:'일정 시간 객차의 유효 전력을 감소시킵니다.',shield:'주변 적이 받는 피해를 감소시킵니다.',transport:'접근 후 승선병들을 하차시킵니다.',repair:'주변 적을 지속 수리합니다.',suppress:'연사와 모듈 효과를 억제합니다.',bomber:'선로 폭격으로 열차 속도를 감소시킵니다.',infiltrator:'승선 후 객차의 포탑·모듈 운용을 방해합니다.'};
 const flavor={
  gear:{
   gatling:'“황무지에서 가장 믿을 만한 건 탄환의 양이다.” 구형 회전기관총을 열차용으로 뜯어고친 물건. 정교하지는 않지만, 총열이 돌아가는 동안 적어도 앞길은 조용해진다.',
   cannon:'원래는 장갑차에 달려 있던 대구경 화포. 열차에 얹기엔 지나치게 무겁지만, 정비공들은 늘 같은 말을 한다. “저쪽 장갑이 더 무거워 보이는데요.”',
   scatter:'열차 바로 옆까지 붙은 적을 떼어내기 위해 만들어졌다. 발사할 때마다 객차 벽까지 울리지만, 승선병이 창문에 얼굴을 들이미는 것보다는 낫다.',
   mortar:'시야 밖으로 포탄을 던지는 오래된 방식의 무기. 조준수가 목표를 볼 수 없다는 사실은 큰 문제가 아니다. 어차피 저 멀리 있는 놈들도 곧 폭발을 보게 될 테니까.',
   breaker:'장갑을 뚫는 대신, 장갑 그 자체를 망가뜨리는 데 초점을 맞춘 화포. 첫 발보다 두 번째 발이, 두 번째보다 세 번째 발이 더 위험하다.',
   phosphorus:'맞힌 적보다 불이 붙은 땅이 더 오래 남는다. 사용 후 포신 청소 담당을 자원하는 사람은 거의 없다.',
   sludge:'탄체가 터진 자리에는 진흙도 기름도 아닌 회색 침전물이 남는다. 정비반은 성분 분석을 포기했고, 포수들은 “장갑이 싫어하는 것”이라고만 부른다.',
   medical:'접이식 침상, 약품함, 자동 주입기와 오래된 생체감지기를 한데 묶은 간이 의무실. “병원은 아니지만, 다음 역까지 살아 있게는 해줄 수 있어.”',
   repair:'용접기, 공압 공구, 예비 판금과 각종 규격이 맞지 않는 볼트들. 제대로 된 부품이 없어도 어떻게든 객차를 다시 움직이게 만드는 것이 정비공의 일이다.',
   ammo:'장약과 탄두를 전투 중에도 손볼 수 있도록 만든 군수 작업대. 설명서에는 절대 운행 중 조작하지 말라고 적혀 있다. 아무도 그 부분을 읽지 않는다.',
   generator:'열차의 보조 발전기를 객차 하나에 욱여넣은 장치. 시끄럽고 뜨겁고 기름을 많이 먹지만, 전력이 부족할 때는 불평하는 사람이 없다.',
   crewArms:'개인화기 거치대, 탄약 보급함, 간이 조준장비와 방탄판이 포함된 승무원 전투지원 세트. 객차가 전장이 되는 순간 가장 먼저 값어치를 증명한다.',
   shield:'고대 시설의 방호장을 흉내 내 축소한 장치. 완벽한 방패는 아니지만, 가끔 그 한 발을 막아주는 것만으로 충분하다.',
   autoRepair:'균열을 감지하면 자동으로 용접팔과 보수재를 투입한다. 정비공들은 편리하다고 말하면서도, 자기보다 먼저 움직이는 기계팔을 그다지 좋아하지 않는다.',
   grinder:'전투가 끝난 뒤 남은 잔해를 고철과 쓸 만한 부품으로 갈아낸다. 적이 많았던 전장일수록 돌아오는 길의 화물칸이 무거워진다.',
   targeting:'거리측정기와 탄도 계산기를 하나로 묶은 사격보조 장치. 포수들 사이에서는 “멀리 있는 적을 가까이 보이게 만드는 상자”라고 불린다.',
   lightningRod:'낙뢰를 피하는 장치는 많았지만, 이 장치는 반대로 번개를 불러들인다. 정비반은 원리를 이해하기 전에 먼저 “맑은 날에도 가까이 서지 말 것”이라는 규칙부터 만들었다.'
  },
  enemies:{
   biker:'문명은 무너졌지만 오토바이와 총은 놀랍도록 오래 살아남았다. 황무지에서 가장 흔히 들리는 경고음은 엔진 굉음 뒤에 따라오는 총성이다.',
   raider:'폐차 두 대에서 멀쩡한 부분만 잘라 붙여 만든 전투차량. 보기에는 금방이라도 무너질 것 같지만, 이상하게 우리 열차보다 먼저 퍼지는 법은 없다.',
   boarder:'달리는 열차에 직접 올라타겠다는 생각부터 제정신이 아니다. 문제는 황무지에는 그런 일을 직업으로 삼은 사람들이 제법 많다는 것이다.',
   buggy:'강철판, 도로표지판, 심지어 보일러 문짝까지 용접해 놓았다. 누군가는 이것을 장갑이라고 부르고, 우리 포수들은 ‘귀찮은 고철더미’라고 부른다.',
   mortar:'멀리서 연기 한 줄기가 솟아오르면 이미 늦었을 가능성이 높다. 포탄보다 먼저 보이는 건, 황무지 어딘가에서 번쩍이는 작은 불꽃뿐이다.',
   drone:'주인도 명령도 사라진 뒤에도 순찰을 계속하는 오래된 기계. 무엇을 지키고 있는지는 몰라도, 우리를 침입자로 보는 것만큼은 확실하다.',
   hook:'총보다 갈고리를 먼저 쏜다. 죽이는 것보다 열차를 붙잡아 세우는 편이 뒤따라오는 것에게 더 유리하다는 걸 아는 놈들이다.',
   power_raider:'고철보다 귀한 것이 전기라는 걸 아는 약탈자들. 객차를 털기보다 케이블 하나를 물고 늘어지는 편이 열차 전체를 더 빨리 죽일 수 있다.',
   shield:'혼자 살아남으려고 만든 장갑이 아니다. 다른 차량 앞을 막아서며 전진하는 모습 때문에, 승무원들은 이들을 ‘움직이는 벽’이라고 부른다.',
   transporter:'겉보기에는 낡은 화물차지만 내부는 사람으로 가득하다. 가까이 붙고 문이 열리는 순간, 차량이 아니라 이동식 출입구였다는 걸 알게 된다.',
   repair_drone:'고장 난 기계를 살리는 것이 본래 임무였던 모양이다. 재앙 이후에도 그 명령은 남았고, 이제는 우리가 열심히 부순 적들을 다시 일으켜 세운다.',
   suppressor:'총을 쏘지도, 직접 올라타지도 않는다. 그저 가까이 있는 것만으로 열차의 장치들이 하나씩 말을 듣지 않기 시작한다.',
   rail_bomber:'열차가 아니라 우리가 달리는 길을 노린다. 선로가 끊기면 아무리 좋은 기관차도 결국은 무거운 집 한 채일 뿐이다.',
   infiltrator:'인간을 상대하기 위해 만들어진 흔적이 너무 선명한 기계병. 폐허 속에서 몇십 년을 기다렸는지는 몰라도, 객차 문을 여는 방법은 아직 기억하고 있다.',
   connectorBlocker:'뇌우 속에서 열차의 연결부를 노리는 전문 병력. 이들에게 객차 하나를 떼어내는 일은 적을 죽이는 것보다 훨씬 효율적인 승리다.',
   saboteur:'무기가 아니라 공구를 들고 접근한다. 문제는 그 공구가 우리 객차를 수리하기 위한 것이 아니라는 점이다.',
   tetherDrone:'열차보다 작은 기계가 열차 전체의 움직임을 방해한다. 한 대만 보면 우스워 보이지만, 여러 대가 케이블을 걸기 시작하면 아무도 웃지 않는다.',
   airdropSoldier:'도로도 선로도 필요 없다. 위에서 떨어진다. 낙하산이 보이는 순간 객차 안에서는 이미 누가 그 칸으로 갈지 결정하고 있다.',
   siegeElite:'황무지의 작은 요새. 멀리 자리를 잡고 포신을 들어 올리는 순간, 승무원들은 누가 맞을지보다 어느 객차가 버틸지를 먼저 계산한다.',
   bulwarkElite:'자기 뒤에 숨은 놈들을 대신 맞도록 만들어진 철갑 덩어리. 사격 명령이 떨어질 때마다 포수들은 같은 질문을 한다. “벽부터 부술까요, 벽 뒤를 노릴까요?”',
   sniperElite:'장갑도 포탑도 보지 않는다. 창문 너머의 사람을 본다. 조준선이 객차 안에서 한 사람을 따라 움직일 때, 열차 전체가 잠깐 조용해진다.',
   parasiteElite:'열차에 붙어 에너지를 빼앗는다. 엔진이 살아 있는데 속도가 떨어지기 시작한다면, 어딘가에서 이 놈이 전선을 빨고 있을 가능성이 높다.',
   commandElite:'자체 화력은 특별하지 않다. 대신 이 차량이 살아 있는 동안 주변의 약탈자들이 갑자기 군대처럼 움직이기 시작한다.',
   fireElite:'장갑을 뚫을 필요가 없다는 결론에 도달한 약탈자들. 불은 객차와 사람을 구분하지 않고, 전투가 끝난 뒤에도 한동안 남는다.',
   stealthElite:'포탑 탐지망에서 사라지는 데 모든 것을 투자한 기계. 발견되었을 때는 대부분 너무 가깝고, 발견하지 못했을 때는 더 가깝다.',
   airdropElite:'뇌우 위에서 움직이는 공중 강습 플랫폼. 우리가 지상을 아무리 잘 막아도 하늘에는 선로도, 방벽도 없다.',
   signalElite:'포탄 대신 신호를 쏜다. 장비 하나가 갑자기 침묵하면 승무원들은 고장을 의심하기 전에 먼저 저 차량을 찾는다.',
   assaultElite:'느리게 접근할 이유가 없는 장갑차. 전투를 길게 끌 생각도 없다. 살아서 열차 옆까지 도착하는 것이 이 차량의 유일한 전술처럼 보인다.',
   janusHeatDrone:'JANUS에서 떨어져 나온 작은 작업기. 직접 파괴하기보다 열과 과부하를 남기며, 기계에게도 ‘숨이 막힌다’는 표현이 어울릴 수 있다는 걸 보여준다.',
   titanAssaultDrone:'TITAN의 몸체에서 분리되어 열차 외벽에 달라붙는다. 저 거대한 기계가 굳이 작은 손을 만드는 이유는 하나다. 객차 안까지 직접 닿기 위해서다.',
   infiltrationTruck:'BEHEMOTH 내부에서 쏟아져 나오는 중장갑 수송차. 저 거대한 전차가 우리를 직접 부수지 못한다고 판단했을 때 보내는 ‘손’에 가깝다.',
   'boss:behemoth':'전쟁이 끝나도 움직이는 요새. 누가 만들었고 누구를 위해 싸웠는지는 중요하지 않다. 놈의 주포가 우리 쪽을 향하고 있다는 사실만 현재형이다.',
   'boss:arachne':'거대한 다리들은 걷기 위해서만 존재하지 않는다. 열차를 붙잡고, 찢고, 전력을 빨아들이는 모습을 보면 왜 생존자들이 이 기계에 거미의 이름을 붙였는지 알 수 있다.',
   'boss:janus':'하나의 목적을 두 개의 몸으로 수행하는 고대 병기. 한쪽이 부수는 동안 다른 쪽은 과열시키고, 어느 쪽을 먼저 봐야 할지 고민하는 순간 이미 둘 다 움직이고 있다.',
   'boss:titan':'재앙 이후 태어난 사람들에게 타이탄은 기계의 이름이 아니라 자연현상에 가깝다. 멀리서 땅이 울리기 시작하면 싸울 생각보다 먼저 떠날 준비를 한다. LR-01이 방향을 바꾸기 전까지는 그랬다.'
  },
  skills:{
   adaptable:'“처음 맡은 일은 항상 서툴다. 문제는 두 번째에도 서툰가 하는 거다.” 어떤 자리에서도 결국 자기 할 일을 찾아내는 사람들이 있다.',
   teacher:'“저 사람 옆에 있으면 이상하게 일이 쉬워 보여.” 뛰어난 사람보다, 다른 사람을 뛰어나게 만드는 사람이 더 오래 기억되기도 한다.',
   arrogant:'“내가 잘하는 게 문제가 아니라, 너희가 못 따라오는 게 문제지.” 성격에 문제가 있다는 보고는 많다. 능력에 문제가 있다는 보고는 아직 없다.',
   coward:'총성이 나면 가장 먼저 몸을 숙인다. 대신 모두가 싸우느라 정신없을 때 망가진 곳을 가장 먼저 찾아낸다. 용감하지 않다고 쓸모없는 것은 아니다.',
   gunner:'“총열이 빨갛다고? 아직 녹진 않았잖아.” 포탑 수리 기록에는 이 재능을 가진 직원에게 개틀링을 맡기지 말라는 메모가 자주 붙는다. 대부분 무시된다.',
   engineer:'옛 기관사들은 엔진 소리만 듣고도 오늘 얼마나 달릴 수 있는지 알았다고 한다. 살아남은 몇몇은 아직도 계기판보다 진동을 먼저 믿는다.',
   medic:'“싸움이 끝났는데 저 사람이 보이면 아직 살았다는 뜻이야.” 병원도 의사도 부족한 황무지에서 가장 믿음직한 흰색은 붕대의 색이다.',
   lonewolf:'“혼자가 편합니다. 적어도 누구 실수까지 계산할 필요는 없으니까.” 이상하게도 정말 혼자 둘 때 가장 좋은 결과를 낸다.',
   scholar:'“만지지 마십시오”라는 고대 경고문을 발견하면 대부분은 손을 뗀다. 이 사람들은 먼저 전원을 찾는다.',
   marksman:'‘회색선의 렌’은 달리는 두 열차 사이에서 적 운전수의 손만 맞혔다고 전해진다. 본인은 마지막까지 “바람이 운이 좋았다”고 주장했다.',
   antiAir:'“하늘에서 오면 피할 곳이 없다고? 그건 저쪽도 마찬가지야.”',
   boardingExpert:'객차 안에서는 사거리도 엄폐물도 의미가 달라진다. 이 사람들은 적이 열차에 올라온 순간부터 오히려 표정이 편안해진다.',
   armorAmmo:'탄약함에는 항상 다른 탄과 섞지 말라는 붉은 표시가 있다. 이유를 모른다면, 맞은편 장갑차를 보면 된다.',
   rapidTraining:'“완벽하게 한 발 쏘는 동안 세 발을 맞힐 수 있다면, 완벽함이 꼭 필요한지 생각해 보라.”',
   closeTraining:'적이 가까워질수록 대부분의 사수는 불안해진다. 이들은 조준하기 편해졌다고 말한다.',
   eliteHunter:'평범한 약탈자 열 대보다 이름 붙은 한 대를 찾는다. 위험한 놈일수록 값비싼 부품을 달고 있다는 것이 그들의 논리다.',
   steadyStance:'“움직이지 마. 숨도 줄이고. 열차가 흔들리는 건 열차 문제고, 네 총구가 흔들리는 건 네 문제다.”',
   veteranGunner:'새 포탑을 주면 설명서부터 찾는 사람이 있고, 손잡이를 잡아보는 사람이 있다. 이들은 대개 세 번째 발부터 이미 오래 써온 무기처럼 다룬다.',
   overloadEngineer:'“저 사람한테는 열 게이지를 보여주지 마.” 보여줘도 멈추지 않는다는 사실을 모두 알고 있기 때문이다.',
   coolantKeeper:'오래된 포수들은 탄약보다 냉각수가 먼저 떨어지는 전투가 진짜 위험한 전투라고 말한다. 이 사람은 그 말을 너무 잘 알고 있다.',
   powerTechnician:'“전력이 부족한 게 아닙니다. 쓸데없는 곳에 가 있는 겁니다.”',
   fireController:'포탑 다섯 문이 같은 순간 같은 목표를 향하면, 개별 포수 다섯 명보다 훨씬 무섭다. 누군가는 그 순간을 만들어야 한다.',
   aimExpert:'“난 저 거리에서는 안 보이는데?” “그래서 네가 쏘는 게 아니잖아.”',
   heatTuner:'보통 기술자는 경고등이 켜지면 출력을 낮춘다. 이들은 경고등이 켜져야 비로소 ‘제대로 올라왔다’고 말한다.',
   fixer:'제대로 고칠 시간은 거의 없다. 그래서 황무지 최고의 정비공은 완벽하게 고치는 사람이 아니라, 다음 정비소까지 버티게 만드는 사람이다.',
   temporaryWeld:'“용접 자국이 예쁘면 시간이 너무 많았다는 뜻이다.”',
   repairForeman:'직접 렌치를 잡고 있는 시간보다 다른 사람에게 소리치는 시간이 더 길다. 이상하게도 그 사람이 있는 칸은 항상 먼저 고쳐진다.',
   partsSaver:'버리는 나사 하나, 휘어진 철판 하나까지 따로 모아둔다. 전투가 끝나면 모두가 왜 그랬는지 알게 된다.',
   dismantler:'“적 한 대를 부수면 위협 하나가 사라지고, 해체공이 부수면 고철도 생긴다.”',
   restorationExpert:'객차가 무너지면 대부분은 무엇을 건질지 본다. 이 사람들은 어디서부터 다시 세울지를 본다.',
   fireResistant:'처음에는 용감해서 불길 속으로 들어가는 줄 알았다. 나중에 보니 그냥 뜨거운 걸 남들보다 덜 무서워하는 사람이었다.',
   fireTraining:'“불은 적이 아닙니다. 적은 불이 어디로 번질지 모르는 겁니다.” 화재 진압 교관들이 첫날 반드시 하는 말이라고 한다.',
   tacticalMovement:'객차 네 칸은 지도에서는 짧다. 총알과 화재와 무너진 통로가 사이에 있으면 전혀 다른 거리가 된다.',
   guardian:'“그 사람 뒤에 있으면 살아남을 것 같았다.” 이유를 설명할 수 있는 사람은 드물지만, 많은 생존자 기록에 비슷한 문장이 남아 있다.',
   fieldAid:'피를 멈추고, 숨을 확인하고, 다시 총을 쥐여준다. 제대로 된 치료는 나중 문제다. 일단 다음 1분을 살아야 한다.',
   toughness:'치명상으로 기록된 부상을 입고도 다시 일어난 사람이 있다. 본인은 나중에 말했다. “누울 곳이 없어서요.”',
   composure:'객차 장갑이 마지막 한 장 남았을 때 사람의 진짜 성격이 드러난다. 이들은 그때 오히려 목소리가 낮아진다.',
   morale:'특별한 연설을 하는 사람은 아니다. 그런데 저 사람이 아직 싸우고 있으면, 괜히 나도 한 발 더 쏠 수 있을 것 같다.',
   independent:'지시도, 지원도, 동료도 필요 없다고 말한다. 그래서 정말 혼자 보내면 가장 빨리 일을 끝내고 돌아온다.',
   escape:'“벽이 무너지기 전에 어디로 갈지 먼저 봐둬.” 살아남은 사람들은 운이 좋았다고 말하지만, 대개 같은 실수를 두 번 하지 않는다.',
   throughFlames:'그날 객차에서 세 사람이 나왔다. 구조된 둘과, 들어갔을 때와 전혀 다른 눈을 하고 나온 한 사람. 이후 그는 불붙은 객차에 들어가라는 명령을 한 번도 기다리지 않았다.',
   lastStand:'“뒤에는 갈 곳이 없습니다.” 어느 방어전에서 누군가 남긴 마지막 무전. 객차는 반파됐지만 그 칸은 끝까지 뚫리지 않았다.',
   ancientWhisper:'고대 장치를 오래 다룬 사람들은 가끔 기계가 무슨 말을 하는지 안다고 표현한다. 기술자들은 미신이라 부른다. 그러면서도 고장 난 고대 장비가 생기면 그 사람부터 찾는다.',
   railOath:'“기관실이 움직이는 한 열차는 살아 있다. 내가 움직이는 한 기관실도 살아 있다.” 오래된 기관사들 사이에서 전해지는 맹세.',
   lifeDebt:'“그날 저 사람이 아니었으면 난 죽었어.” 그 뒤로 둘이 서로를 구한 횟수는 아무도 세지 않았다.',
   wastelandHunter:'‘세 개의 흉터를 가진 마라’는 정예 차량의 이름과 약점을 전부 외웠다고 한다. 그녀가 처음 보는 적을 만났을 때 가장 먼저 한 말은 늘 같았다. “좋아. 새로 배울 게 생겼네.”'
  }
 };
 function flavorBlock(text,extra=''){return text?`<blockquote class="codex-flavor${extra?' '+extra:''}">${esc(text)}</blockquote>`:'';}
 function gear(e){const d=(e.kind==='turret'?D.TURRETS:D.MODULES)[e.type];let html=(d.ancient?'<div class="ancient-gear-mark"><b>ANCIENT EQUIPMENT</b><span>고대 장비</span></div>':'')+g.equipmentHTML({...e,level:1,heat:0},null)+table([['기본 가격',d.price],['최대 강화',d.upgradeable===false?'강화 불가':e.kind==='turret'?WEAPON_UPGRADES.maxLevel:'레벨 5 · 레벨 3 보조 슬롯'],['출력 0','사격·모듈 정지, 포탑 냉각 유지'],['출력 1','기본 성능'],['출력 2',`포탑 간격 ×${R.power[1].intervalMult}, 모듈 효과량 ×${R.modulePower[2]}`],['출력 3',`포탑 간격 ×${R.power[2].intervalMult}, 피해 ×${R.power[2].damageMult}, 발열 ×${R.power[2].heatMult}, 모듈 효과량 ×${R.modulePower[3]}`]]);
  if(e.kind==='turret'){html+=table([['탄환 수',d.pellets||1],['연쇄 수',d.chains||1],['연쇄 피해 비율',d.chainRatio||0],['광역 반경',(d.splash||0)*B.projectile.splashRadiusScale],['기본 DPS',d.damage*(d.pellets||1)/d.interval],['과열 한도 / 재개',`${B.heat.max} / ${B.heat.resumeAt}`],['냉각 공식',`직원·모듈·강화 보정 냉각량 × 과열 중 ${EQUIPMENT_REFORM.overheatCoolingMultiplier} (평시 1)`],['개틀링 열 증폭','없음 · 현재 열에 따른 발열 증가 없음']]);for(const[tier,branches]of Object.entries(WEAPON_UPGRADES.tiers))html+=`<h4>Lv.${tier} · 정비소 전용 분기</h4>`+Object.values(branches).map(b=>`<p>${esc(b.name)}: ${esc(b.text)}</p>`).join('');html+='<p>실제 전투 수치는 장비를 클릭하면 직원·전력·모듈·강화·현재 열을 반영해 표시됩니다.</p>';}
  else if(d.upgradeable!==false)html+=Object.values(B.moduleUpgrade.branches).map(b=>`<p>${esc(b.name)} · 효과량 ×${b.factor} · 범위 ${esc(({self:'현재 객차',base:'기본 범위',all:'모든 객차'})[b.range])}</p>`).join('');html+=flavorBlock(d.flavor||flavor.gear[e.type],d.ancient?'ancient-flavor':'');return html;
 }
 function enemy(id,e){let html=table([['기본 HP',e.hp],['장갑',`${num((e.armor||0)*100)}%`],['객차 피해',e.carDamage],['직원 피해',e.crewDamage],['공격 간격 (초)',e.interval],['접근 속도',g.enemySpeed(e)],['원거리 / 승선',`${e.ranged?'원거리':'근접'} / ${e.boards?'승선 가능':'승선 없음'}`],['공격 사거리',e.attackRange??'접근 후'],['전투 예산 비용',e.threatCost],['역할',(e.tags||[]).join(' / ')]])+`<p>${esc(behavior[e.behavior]||'접근 후 열차 또는 직원을 공격합니다.')}</p>`;
  if(e.elite&&g.eliteCodexHTML)html+=g.eliteCodexHTML(id);
  const tuning=ACT2_CONFIG[e.behavior];if(tuning)html+=table(Object.entries(tuning).map(([k,v])=>[({'repairMultiplier':'객차 수리 배율',boardingSpeed:'승선 접근 배율',radius:'효과 반경',damageMultiplier:'받는 피해 배율',hpPerSecond:'초당 회복',seconds:'지속 시간',amount:'감소 전력',count:'하차 인원',range:'발동 거리'})[k]||k,typeof v==='object'?JSON.stringify(v):v]));
  html+='<p>최종 피해 = 공격 피해 × (1 − 장갑 × (1 − 관통)). 구간별 HP·공격 배율이 추가 적용됩니다.</p><details><summary>구간별 HP / 피해 배율</summary>'+table(D.STAGE_CURVE.map((c,i)=>[`ACT ${i<R.stages?'I':'II'}-${i%R.stages+1}`,`HP ×${num(c.hp)} / 피해 ×${num(c.damage)}`]))+`<p>정예전: 위 배율에 HP ×${num(R.elite.hp*B.battle.eliteHp)}, 피해 ×${num(R.elite.damage*B.battle.eliteDamage)} 추가.</p></details>`;html+=flavorBlock(flavor.enemies[id]);return html;
 }
 function reward(r={}){const names={stationVisit:'정비소 이용',firstUpgrade:'무료 1차 강화 횟수 (Lv.1 → 2)',survivorSupplies:'구조 답례',skillReward:'이벤트 스킬',money:'돈',scrap:'고철',relics:'고대 잔해',distance:'타이탄 거리 (km)',moneyLoss:'돈 손실',carDamage:'객차 HP 손실',crewDamage:'직원 HP 손실',actorDamage:'출전 직원 HP 손실',engineDamage:'기관실 HP 손실',carCount:'피해 객차 수',crewCount:'피해 직원 수',gear:'장비 종류',candidates:'직원 후보 수',repairRatio:'최대 객차 HP 회복 비율',healRatio:'최대 직원 HP 회복 비율',healCrew:'직원 HP 회복',temporaryEngine:'다음 전투 엔진 속도 배율',shop:'거래소',shopFactor:'상점 가격 배율',freeItem:'상품 1개 무료',disableGear:'무작위 장비 다음 전투 정지',routeInfo:'다음 경로 정보',buff:'런 한정 무작위 강화',debuff:'런 한정 무작위 약화',medicalRescue:'의무병 구조',possibleCandidate:'추가 직원 후보',possibleRareGear:'희귀 장비',possibleTalent:'전투 재능',labReward:'실험실 무작위 보상'};
  let rows=Object.entries(r).map(([k,v])=>[names[k]||k,k==='survivorSupplies'?C.survivorSupplies.map(r=>Object.entries(r).map(([id,v])=>`${id==='money'?'돈':'고철'} +${v.join('~')}`).join(' · ')).join(' 또는 '):k==='skillReward'?`${v.count}개 후보 중 선택 · ${v.pool==='normal'?'일반 스킬 전체':v.pool.map(id=>D.TRAITS[id]?.name||id).join(', ')}`:Array.isArray(v)?v.join(' ~ '):v===true?'있음':v]);if(r.possibleCandidate)rows.push(['후보 확률',C.candidateChance*100+'%']);if(r.possibleRareGear)rows.push(['희귀 장비 확률',C.rareGearChance*100+'%']);if(r.possibleTalent)rows.push(['재능 확률',C.talentChance*100+'%']);if(r.candidates||r.medicalRescue)rows.push(['성급 1/2/3 확률',(r.medicalRescue?C.medicalStars:C.survivorStars).map(v=>v*100+'%').join(' / ')],['초기 HP',C.survivorHp.map(v=>v*100+'%').join(' ~ ')]);if(r.buff)rows.push(...Object.entries(C.buffs).map(([k,v])=>[k,v]));if(r.debuff)rows.push(...Object.entries(C.debuffs).map(([k,v])=>[k,v]));if(r.labReward)rows.push(['균등 무작위','잔해 5 / 희귀 모듈 / 무료 1차 강화 (Lv.1 → 2)']);return table(rows);
 }
 function event(e){return `<p>${esc(e.text)}</p>`+e.choices.map(c=>{const seen=book.results[e.id+':'+c.id],p=c.chance;return `<details><summary>${esc(c.label)} ${seen?'':'🔒 결과 미발견'}</summary>${table([['거리 비용',c.time+' km'],...Object.entries(c.cost||{}).map(([k,v])=>[k,v])])}${reward(c.reward)}${seen?table([['기본 성공률',p===undefined?'결과별 가중치':p*100+'%'],...(c.scholarChance?[['연구자 성공률',c.scholarChance*100+'%']]:[]),...(c.skill?[['능력 보정',`${c.skill} 5 기준 ±1당 ${C.skill.step*100}%p (최소 ${C.skill.min*100}%, 최대 ${C.skill.max*100}%)`]]:[]),...(c.engineChance?[['엔진 보정',`출력 ${C.engine.powerReference} 기준 ±1당 ${C.engine.powerStep*100}%p, 손상 비율 ×${C.engine.hullStep*100}%p 감소`]]:[])])+((c.outcomes||[]).map((o,i)=>seen.includes(i)?`<h4>${esc(o.title)}</h4><p>${esc(o.text)}</p>${p===undefined?'<p>확률 '+num(o.weight/c.outcomes.reduce((n,o)=>n+o.weight,0)*100)+'%</p>':''}${reward(o.reward)}`:'<p class="locked">미경험 결과 🔒</p>').join('')):'<p class="locked">이 행동을 선택하면 확률과 경험한 결과가 기록됩니다.</p>'}</details>`;}).join('');}
 let tab='gear',loreKeyHandler=null;
 const loreData=()=>window.LAST_RAIL_LORE||{codex:[],apocalypse:[]};
 function codexCompletion(){
  const totals={gear:0,enemies:0,skills:0,events:0},known={gear:0,enemies:0,skills:0,events:0};
  for(const kind of ['turret','module'])for(const type of Object.keys(kind==='turret'?D.TURRETS:D.MODULES)){totals.gear++;if(book.gear.includes(kind+':'+type))known.gear++;}
  for(const id of Object.keys(D.ENEMIES)){totals.enemies++;if(book.enemies.includes(id))known.enemies++;}
  for(const id of Object.keys(D.BOSSES)){totals.enemies++;if(book.enemies.includes('boss:'+id))known.enemies++;}
  for(const id of Object.keys(D.TRAITS)){totals.skills++;if(book.skills.includes(id))known.skills++;}
  for(const e of C.events){totals.events++;if(book.events.includes(e.id))known.events++;}
  const total=Object.values(totals).reduce((a,b)=>a+b,0),opened=Object.values(known).reduce((a,b)=>a+b,0),percent=total?Math.min(100,Math.floor(opened/total*100)):0;
  return{opened,total,percent,totals,known};
 }
 g.codexCompletion=codexCompletion;
 function loreUnlocked(entry,progress=codexCompletion()){
  if(entry.kind==='codex')return progress.percent>=entry.threshold;
  const highest=Number.isFinite(g.meta?.apocalypseCleared)?g.meta.apocalypseCleared:-1;
  return highest>=entry.level;
 }
 function loreCards(){
  const data=loreData(),progress=codexCompletion(),highest=Number.isFinite(g.meta?.apocalypseCleared)?g.meta.apocalypseCleared:-1;
  const progressCards=data.codex.map(entry=>{
   const unlocked=loreUnlocked(entry,progress),read=book.loreRead.includes(entry.id);
   return unlocked?`<button class="lore-card ${read?'read':''}" data-lore-id="${esc(entry.id)}"><span class="lore-card-tag">도감 ${entry.threshold}%</span><b>${esc(entry.title)}</b><small>${read?'열람 완료':'새 기록'}</small></button>`:`<article class="lore-card locked"><span class="lore-card-tag">도감 ${entry.threshold}%</span><b>???</b><small>도감 복원율 ${entry.threshold}%에서 해금</small></article>`;
  }).join('');
  const doomCards=data.apocalypse.map(entry=>{
   const unlocked=loreUnlocked(entry,progress),read=book.loreRead.includes(entry.id);
   return unlocked?`<button class="lore-card ${read?'read':''}" data-lore-id="${esc(entry.id)}"><span class="lore-card-tag">종말 ${entry.level}</span><b>${esc(entry.title)}</b><small>${read?'열람 완료':'새 기록'}</small></button>`:`<article class="lore-card locked"><span class="lore-card-tag">종말 ${entry.level}</span><b>???</b><small>종말 단계 ${entry.level} 클리어 시 해금</small></article>`;
  }).join('');
  const step=Math.floor(progress.percent/10)*10;
  return `<section class="lore-progress"><div><span>도감 복원율</span><strong>${progress.percent}%</strong><small>${progress.opened} / ${progress.total} 개방</small></div><div class="lore-progress-track"><i style="width:${progress.percent}%"></i></div><p>도감 기록 ${Math.floor(step/10)} / 10 해금 · 종말 기록 ${Math.max(0,Math.min(11,highest+1))} / 11 해금</p></section><section class="lore-section"><header><div><span class="section-kicker">ARCHIVE RECOVERY</span><h3>도감 복원 기록</h3></div><small>도감 전체 개방률이 10% 오를 때마다 복원됩니다.</small></header><div class="lore-grid">${progressCards}</div></section><section class="lore-section"><header><div><span class="section-kicker">APOCALYPSE LOG</span><h3>종말 기록</h3></div><small>각 종말 단계를 클리어하면 해당 기록이 해금됩니다.</small></header><div class="lore-grid">${doomCards}</div></section>`;
 }
 function findLore(id){const data=loreData();return[...data.codex,...data.apocalypse].find(x=>x.id===id);}
 function removeLoreKeys(){if(loreKeyHandler){window.removeEventListener('keydown',loreKeyHandler,true);loreKeyHandler=null;}}
 function attachDragScroll(el){
  let down=false,startY=0,startScroll=0,moved=false;
  el.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button!==0)return;down=true;moved=false;startY=e.clientY;startScroll=el.scrollTop;el.classList.add('dragging');el.setPointerCapture?.(e.pointerId);});
  el.addEventListener('pointermove',e=>{if(!down)return;const dy=e.clientY-startY;if(Math.abs(dy)>3)moved=true;if(moved){el.scrollTop=startScroll-dy;e.preventDefault();}});
  const up=e=>{if(!down)return;down=false;el.classList.remove('dragging');try{el.releasePointerCapture?.(e.pointerId);}catch{}};el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);
 }
 function openLore(entry){
  if(!entry||!loreUnlocked(entry))return;
  if(!book.loreRead.includes(entry.id)){book.loreRead.push(entry.id);save();}
  removeLoreKeys();
  const overlay=$('#overlay'),modal=$('#modal');overlay.classList.add('show');modal.className='modal lore-reader-modal';
  const unlockLabel=entry.kind==='codex'?`도감 복원율 ${entry.threshold}%`:`종말 단계 ${entry.level} 클리어`;
  modal.innerHTML=`<div class="lore-reader-shell"><header class="lore-reader-head"><div><span class="eyebrow">RECORD ARCHIVE</span><h2>${esc(entry.title)}</h2><p>${esc(unlockLabel)}</p></div><button class="lore-reader-close" type="button" aria-label="도감으로 돌아가기">×</button></header><div class="lore-reader-grid"><figure class="lore-reader-image"><img src="${esc(entry.image)}" alt="${esc(entry.title)} 기록 이미지"><figcaption>${esc(entry.title)}</figcaption><div class="lore-image-missing" hidden>기록 이미지<br>파일을 찾을 수 없습니다.</div></figure><article class="lore-reader-copy" tabindex="0"><pre>${esc(entry.text)}</pre></article></div><footer class="lore-reader-foot"><span>마우스로 드래그하거나 휠로 기록을 읽을 수 있습니다.</span><span>ESC / X · 도감으로 돌아가기</span></footer></div>`;
  const back=()=>{removeLoreKeys();tab='records';g.showCodex();};
  modal.querySelector('.lore-reader-close').onclick=back;
  const img=modal.querySelector('.lore-reader-image img'),missing=modal.querySelector('.lore-image-missing');img.onerror=()=>{img.hidden=true;missing.hidden=false;};
  const copy=modal.querySelector('.lore-reader-copy');attachDragScroll(copy);requestAnimationFrame(()=>copy.focus({preventScroll:true}));
  loreKeyHandler=e=>{if(e.key==='Escape'||e.key==='x'||e.key==='X'){e.preventDefault();e.stopImmediatePropagation();back();}};window.addEventListener('keydown',loreKeyHandler,true);
 }
 g.openLoreRecord=id=>openLore(findLore(id));
 g.showCodex=function(){
  removeLoreKeys();train();const m=this.modalShell('도감','발견 기록',''),body=m.querySelector('.dialog-body');m.classList.add('codex-modal');
  body.innerHTML='<nav class="codex-tabs">'+[['gear','장비'],['enemies','적'],['crew','직원'],['events','이벤트'],['records','기록']].map(([id,label])=>`<button data-codex-tab="${id}" aria-pressed="${tab===id}">${label}</button>`).join('')+'</nav><div id="codex-content"></div>';let html='';
  if(tab==='gear')for(const kind of ['turret','module'])for(const[type,d]of Object.entries(kind==='turret'?D.TURRETS:D.MODULES))html+=fold(d.name,book.gear.includes(kind+':'+type)?gear({kind,type}):'',book.gear.includes(kind+':'+type),d.ancient?'ancient-codex-entry':'');
  if(tab==='enemies'){for(const[id,e]of Object.entries(D.ENEMIES))html+=fold(e.name,book.enemies.includes(id)?enemy(id,e):'',book.enemies.includes(id));for(const[id,b]of Object.entries(D.BOSSES)){const known=book.enemies.includes('boss:'+id),bossHtml=g.bossCodexHTML?g.bossCodexHTML(id):table(b.parts.map(p=>[p.name,`HP ${p.hp}`]));html+=fold(b.name,known?bossHtml+flavorBlock(flavor.enemies['boss:'+id]):'',known);}}
  if(tab==='crew'){const known=Object.entries(D.TRAITS).filter(([id])=>book.skills.includes(id));html='<h3>발견한 직원 스킬</h3>'+ (known.map(([id,t])=>fold(t.name,'<p>'+esc(t.text)+'</p><p>'+(t.eventExclusive?'이벤트 전용 스킬':'일반 스킬 · 이벤트 슬롯에도 획득 가능')+'</p>'+flavorBlock(flavor.skills[id]),true)).join('')||'<p>아직 발견한 직원 스킬이 없습니다.</p>');}
  if(tab==='events')for(const e of C.events)html+=fold(e.title,book.events.includes(e.id)?event(e):'',book.events.includes(e.id));
  if(tab==='records')html=loreCards();
  $('#codex-content').innerHTML=html;
  body.querySelectorAll('[data-codex-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.codexTab;this.showCodex();});
  body.querySelectorAll('[data-lore-id]').forEach(b=>b.onclick=()=>openLore(findLore(b.dataset.loreId)));
 };
 const css=document.createElement('style');css.textContent='.codex-modal{max-height:90dvh;overflow:auto}.codex-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}.codex-tabs button{padding:12px 20px;background:#243f46;color:#eee;border:1px solid #7e9e9b;border-radius:5px}.codex-tabs [aria-pressed=true]{border-color:#dfc580;background:#526059}.codex-entry{padding:14px;border:1px solid #627f7a;border-radius:6px;margin:10px 0}.codex-entry summary{cursor:pointer;word-break:keep-all}.codex-entry.ancient-codex-entry{border-color:#6cbdb1;box-shadow:0 0 0 1px #c5a66544 inset,0 0 14px #58c9b62a;background:linear-gradient(145deg,#132b2a55,#101819)}.codex-entry.ancient-codex-entry>summary{color:#b8e2d9}.ancient-gear-mark{display:flex;align-items:center;gap:9px;margin:12px 0;padding:7px 10px;border-left:3px solid #72cbbd;background:#16302d;color:#b9e4da}.ancient-gear-mark b{font-size:10px;letter-spacing:.15em;color:#d9bb78}.ancient-gear-mark span{font-size:12px}.codex-flavor{margin:20px 0 2px;padding:14px 4px 2px;border:0;border-top:1px solid #8f7744;background:none;color:#d6b96f;font-size:13px;line-height:1.8;font-style:italic;letter-spacing:.01em}.codex-flavor.ancient-flavor{border-top-color:#b29a5b;color:#e0c477;text-shadow:0 0 10px #d0aa5530}.codex-entry details{padding:12px 0}.codex-table{width:100%;border-collapse:collapse;margin:12px 0;table-layout:fixed}.codex-table th,.codex-table td{padding:8px;text-align:left;word-break:keep-all;overflow-wrap:anywhere;border-bottom:1px solid #8fa49d33}.codex-table th{width:38%;color:#bccdc3}.locked{color:#a2aaaa;background:#ffffff07}.codex-entry .stat-grid{display:grid;grid-template-columns:repeat(4,1fr)}.lore-progress{padding:16px 18px;margin:4px 0 22px;border:1px solid #6d817d;background:linear-gradient(135deg,#162529,#101819);border-radius:8px}.lore-progress>div:first-child{display:flex;align-items:baseline;gap:12px}.lore-progress span{color:#9db0ad;font-size:12px;letter-spacing:.12em}.lore-progress strong{font:32px/1 "Black Han Sans";color:#e5c57f}.lore-progress small{color:#82928f}.lore-progress-track{height:7px!important;background:#283538;margin:12px 0 8px;overflow:hidden}.lore-progress-track i{display:block;height:100%;background:linear-gradient(90deg,#647c75,#e1bd75)}.lore-progress p{margin:0;color:#9ca9a6;font-size:12px}.lore-section{margin:24px 0}.lore-section>header{display:flex;align-items:end;justify-content:space-between;gap:18px;margin-bottom:10px}.lore-section h3{margin:3px 0 0;font:24px "Black Han Sans"}.lore-section>header>small{color:#82908d;text-align:right}.lore-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.lore-card{min-height:92px;padding:13px 14px;border:1px solid #59716e;border-radius:7px;background:linear-gradient(145deg,#192729,#101718);color:#e8e6dc;text-align:left;cursor:pointer}.lore-card:hover:not(.locked){border-color:#dfc580;transform:translateY(-1px)}.lore-card .lore-card-tag{display:block;color:#85a09b;font-size:10px;letter-spacing:.12em;margin-bottom:8px}.lore-card b{display:block;font-size:15px;line-height:1.35}.lore-card small{display:block;margin-top:8px;color:#d2b879;font-size:11px}.lore-card.read small{color:#7f9691}.lore-card.locked{cursor:default;border-style:dashed;opacity:.62}.lore-reader-modal{width:min(1180px,96vw);height:min(820px,92dvh);max-height:none;overflow:hidden;background:#0d1416;border:1px solid #536866}.lore-reader-shell{height:100%;display:grid;grid-template-rows:auto minmax(0,1fr) auto}.lore-reader-head{display:flex;align-items:flex-start;justify-content:space-between;padding:22px 24px 16px;border-bottom:1px solid #344846;background:linear-gradient(180deg,#172629,#10191b)}.lore-reader-head h2{margin:7px 0 3px;font:34px/1.05 "Black Han Sans"}.lore-reader-head p{margin:0;color:#94a39f;font-size:12px}.lore-reader-close{width:42px;height:42px;border:1px solid #6f817d;background:#182426;color:#eae6da;font-size:28px;line-height:1;cursor:pointer}.lore-reader-close:hover{border-color:#dfc580;color:#dfc580}.lore-reader-grid{min-height:0;display:grid;grid-template-columns:minmax(300px,42%) minmax(0,1fr)}.lore-reader-image{position:relative;margin:0;padding:18px;border-right:1px solid #30413f;background:#080d0f;display:grid;grid-template-rows:minmax(0,1fr) auto;min-height:0}.lore-reader-image img{width:100%;height:100%;min-height:0;object-fit:contain;background:#050808;border:1px solid #283937}.lore-reader-image figcaption{padding:10px 4px 0;color:#7f918d;font-size:11px;letter-spacing:.08em}.lore-image-missing{align-self:center;justify-self:stretch;text-align:center;padding:40px 12px;border:1px dashed #4a5a57;color:#788581;line-height:1.8}.lore-reader-copy{min-height:0;overflow:auto;padding:26px 30px 44px;cursor:grab;scrollbar-color:#667a76 #101719}.lore-reader-copy.dragging{cursor:grabbing;user-select:none}.lore-reader-copy pre{margin:0;white-space:pre-wrap;word-break:keep-all;overflow-wrap:anywhere;font:14px/1.9 "Gowun Dodum",sans-serif;color:#d6dcd8}.lore-reader-foot{display:flex;justify-content:space-between;gap:16px;padding:10px 18px;border-top:1px solid #2d3c3a;color:#778783;background:#0b1113;font-size:11px}@media(max-width:760px){.lore-grid{grid-template-columns:1fr}.lore-section>header{align-items:flex-start;flex-direction:column}.lore-reader-modal{width:98vw;height:94dvh}.lore-reader-head{padding:15px 16px}.lore-reader-head h2{font-size:25px}.lore-reader-grid{grid-template-columns:1fr;grid-template-rows:34% minmax(0,1fr)}.lore-reader-image{border-right:0;border-bottom:1px solid #30413f;padding:10px}.lore-reader-image figcaption{display:none}.lore-reader-copy{padding:18px 18px 36px}.lore-reader-foot{display:none}}';document.head.append(css);
 train();
 for(const id of g.meta.discovered?.enemies||[])if(D.ENEMIES[id])g.recordEncounter('enemies',id);
 try{const saved=JSON.parse(localStorage.getItem(C.storageKey));if(saved?.session){const s=saved.session;g.recordEncounter('events',s.eventId);if(s.selected&&['result','receipt','candidate','placement','shop','finish','leaving'].includes(s.phase))g.recordEventResult(s.eventId,s.selected,s.chosenOutcome??-1);}}catch{}
})();
