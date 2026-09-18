/* LAST RAIL 1.0.2 account-based cloud save via Supabase Auth. */
(()=>{
 'use strict';
 const URL='https://rhamwzsepsfxzcdzjohc.supabase.co';
 const KEY='sb_publishable_OcT4bJxEdTeogQN6mPadEg_vNwLiM8o';
 const LINK_KEY='lastTrainCloudSyncUserV1';
 const STAMP_PREFIX='lastTrainCloudSyncStampV1:';
 const POLL_MS=10000;
 const DEBOUNCE_MS=4000;
 const state={ready:false,user:null,lastCloudAt:null,syncLinked:false,syncPaused:false,busy:false,error:'',message:''};
 const listeners=new Set();
 let client=null,pollTimer=null,saveTimer=null,lastSignature=null,lastSavedSignature=null;
 const emit=()=>{for(const fn of listeners)try{fn({...state});}catch(e){console.warn(e);}};
 const set=(patch)=>{Object.assign(state,patch);emit();};
 const api=window.LAST_RAIL_CLOUD={
  state,subscribe(fn){listeners.add(fn);fn({...state});return()=>listeners.delete(fn);},
  get client(){return client;},get user(){return state.user;},
  async signUp(email,password){if(!client)throw Error('클라우드 모듈을 사용할 수 없습니다.');set({busy:true,error:'',message:'회원가입 중...'});try{const {data,error}=await client.auth.signUp({email,password});if(error)throw error;if(!data.session)set({message:'가입이 완료되었습니다. 이메일 인증이 필요한 설정이라면 메일을 확인하세요.'});else set({message:'회원가입 및 로그인 완료.'});return data;}finally{set({busy:false});}},
  async signIn(email,password){if(!client)throw Error('클라우드 모듈을 사용할 수 없습니다.');set({busy:true,error:'',message:'로그인 중...'});try{const {data,error}=await client.auth.signInWithPassword({email,password});if(error)throw error;set({message:'로그인했습니다.'});return data;}finally{set({busy:false});}},
  async signOut(){if(!client)return;set({busy:true,error:'',message:'로그아웃 중...'});try{const {error}=await client.auth.signOut();if(error)throw error;set({message:'로그아웃했습니다.'});}finally{set({busy:false});}},
  async refreshCloudInfo(){return refreshCloudInfo();},
  async saveNow(options={}){return saveNow(options);},
  async fetchSave(){return fetchSave();},
  markLinked(updatedAt=null){if(!state.user)return;try{localStorage.setItem(LINK_KEY,state.user.id);if(updatedAt)localStorage.setItem(STAMP_PREFIX+state.user.id,updatedAt);}catch{}set({syncLinked:true,syncPaused:false,lastCloudAt:updatedAt||state.lastCloudAt});},
  requestAutosave(){scheduleAutosave();}
 };
 function getSaveApi(){return window.LAST_RAIL_SAVE_API;}
 function signature(save){const copy=JSON.parse(JSON.stringify(save));copy.exportedAt='';return JSON.stringify(copy);}
 async function fetchRow(){if(!state.user)throw Error('로그인이 필요합니다.');const {data,error}=await client.from('cloud_saves').select('user_id,save_data,game_version,save_format_version,created_at,updated_at').eq('user_id',state.user.id).maybeSingle();if(error)throw error;return data||null;}
 async function refreshCloudInfo(){if(!client||!state.user){set({lastCloudAt:null});return null;}try{const row=await fetchRow();set({lastCloudAt:row?.updated_at||null,error:''});return row;}catch(e){set({error:friendly(e)});throw e;}}
 async function reconcileUser(user){clearTimeout(saveTimer);saveTimer=null;state.user=user||null;state.lastCloudAt=null;state.error='';state.message='';state.syncLinked=false;state.syncPaused=false;lastSignature=null;lastSavedSignature=null;
  if(!user){emit();return;}
  let linked='',stamp='';try{linked=localStorage.getItem(LINK_KEY)||'';stamp=localStorage.getItem(STAMP_PREFIX+user.id)||'';}catch{}
  state.syncLinked=linked===user.id;
  emit();
  try{
   const row=await fetchRow();state.lastCloudAt=row?.updated_at||null;
   if(row){
    const cloudMs=Date.parse(row.updated_at)||0,stampMs=Date.parse(stamp)||0;
    if(state.syncLinked&&stampMs&&cloudMs<=stampMs+1000){state.syncPaused=false;state.message='클라우드 자동 동기화가 연결되어 있습니다.';setTimeout(()=>saveNow({force:true,reason:'auto'}).catch(()=>{}),0);}
    else if(state.syncLinked&&stampMs&&cloudMs>stampMs+1000){state.syncPaused=true;state.message='다른 기기에서 더 새로운 클라우드 저장이 확인되었습니다. 불러올지, 현재 로컬로 교체할지 선택하세요.';}
    else{state.syncPaused=true;state.message='기존 클라우드 세이브가 있습니다. 불러오거나 현재 로컬 저장으로 교체한 뒤 자동 동기화가 시작됩니다.';}
   }else{
    state.syncPaused=false;state.syncLinked=true;try{localStorage.setItem(LINK_KEY,user.id);}catch{}
    state.message='새 계정 클라우드 슬롯을 준비했습니다.';
    emit();
    setTimeout(()=>saveNow({force:true,reason:'first-cloud-save'}).catch(()=>{}),0);return;
   }
   emit();
  }catch(e){state.error=friendly(e);emit();}
 }
 async function saveNow({force=false,reason='manual'}={}){
  if(!client||!state.user)throw Error('먼저 계정에 로그인하세요.');
  if(state.syncPaused&&!force)throw Error('이 기기의 자동 동기화가 아직 연결되지 않았습니다. 클라우드 불러오기 또는 현재 로컬 저장으로 교체를 먼저 선택하세요.');
  const saveApi=getSaveApi();if(!saveApi?.snapshot)throw Error('세이브 시스템이 아직 준비되지 않았습니다.');
  const save=saveApi.snapshot();const sig=signature(save);
  if(!force&&sig===lastSavedSignature)return {skipped:true};
  set({busy:true,error:'',message:reason==='auto'?'클라우드 자동 저장 중...':'클라우드 저장 중...'});
  try{
   const payload={user_id:state.user.id,save_data:save,game_version:window.SAVE_FORMAT?.gameVersion||save.gameVersion,save_format_version:window.SAVE_FORMAT?.saveFormatVersion||save.saveFormatVersion};
   const {data,error}=await client.from('cloud_saves').upsert(payload,{onConflict:'user_id'}).select('updated_at').single();if(error)throw error;
   lastSavedSignature=sig;lastSignature=sig;try{localStorage.setItem(LINK_KEY,state.user.id);if(data?.updated_at)localStorage.setItem(STAMP_PREFIX+state.user.id,data.updated_at);}catch{}
   set({syncLinked:true,syncPaused:false,lastCloudAt:data?.updated_at||new Date().toISOString(),message:reason==='auto'?'클라우드 자동 저장 완료.':'현재 진행을 클라우드에 저장했습니다.'});
   return data;
  }catch(e){set({error:friendly(e),message:''});throw e;}finally{set({busy:false});}
 }
 async function fetchSave(){if(!client||!state.user)throw Error('먼저 계정에 로그인하세요.');set({busy:true,error:'',message:'클라우드 세이브 확인 중...'});try{const row=await fetchRow();if(!row)throw Error('이 계정에는 아직 클라우드 세이브가 없습니다.');set({lastCloudAt:row.updated_at,message:'클라우드 세이브를 불러왔습니다. 적용 전 내용을 확인하세요.'});return row;}catch(e){set({error:friendly(e),message:''});throw e;}finally{set({busy:false});}}
 function scheduleAutosave(){if(!state.user||state.syncPaused||!state.syncLinked||state.busy)return;clearTimeout(saveTimer);saveTimer=setTimeout(()=>saveNow({reason:'auto'}).catch(()=>{}),DEBOUNCE_MS);}
 function poll(){if(!state.user||state.syncPaused||!state.syncLinked||state.busy)return;const saveApi=getSaveApi();if(!saveApi?.snapshot)return;try{const sig=signature(saveApi.snapshot());if(lastSignature===null){lastSignature=sig;lastSavedSignature=sig;return;}if(sig!==lastSignature){lastSignature=sig;scheduleAutosave();}}catch(e){console.warn('Cloud autosave snapshot failed',e);}}
 function friendly(e){const m=String(e?.message||e||'알 수 없는 오류');if(/Invalid login credentials/i.test(m))return '이메일 또는 비밀번호가 올바르지 않습니다.';if(/Email not confirmed/i.test(m))return '이메일 인증이 필요합니다.';if(/User already registered/i.test(m))return '이미 가입된 이메일입니다.';if(/Password should be/i.test(m))return '비밀번호가 너무 짧습니다. 6자 이상 입력하세요.';if(/permission denied|row-level security|42501/i.test(m))return '클라우드 DB 권한 설정을 확인하세요. cloud_saves의 authenticated 권한과 RLS 정책이 필요합니다.';return m;}
 async function init(){
  if(!window.supabase?.createClient){set({ready:true,error:'Supabase 라이브러리를 불러오지 못했습니다. 로컬 저장은 계속 사용할 수 있습니다.'});return;}
  client=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const {data,error}=await client.auth.getSession();if(error)state.error=friendly(error);await reconcileUser(data?.session?.user||null);
  client.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>reconcileUser(session?.user||null),0);});
  state.ready=true;emit();pollTimer=setInterval(poll,POLL_MS);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')poll();});
 }
 init().catch(e=>set({ready:true,error:friendly(e)}));
})();
