(()=>{
 'use strict';

 const SUPABASE_URL='https://rhamwzsepsfxzcdzjohc.supabase.co';
 const SUPABASE_PUBLISHABLE_KEY='sb_publishable_OcT4bJxEdTeogQN6mPadEg_vNwLiM8o';
 const CODE_CHARS='ABCDEFGHJKMNPQRSTUVWXYZ23456789';
 const CODE_PATTERN=/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}$/;
 const REQUEST_TIMEOUT_MS=15000;

 function compactCode(value){
  return String(value??'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,10);
 }

 function formatCode(value){
  const compact=compactCode(value);
  return compact.length>5?`${compact.slice(0,5)}-${compact.slice(5)}`:compact;
 }

 function normalizeCode(value){
  const code=formatCode(value);
  if(!CODE_PATTERN.test(code))throw Error('공유 코드는 XXXXX-XXXXX 형식의 10자리 코드입니다.');
  for(const char of code.replace('-',''))if(!CODE_CHARS.includes(char))throw Error('공유 코드에 사용할 수 없는 문자가 포함되어 있습니다.');
  return code;
 }

 function bytes(value){
  const text=typeof value==='string'?value:JSON.stringify(value);
  return new TextEncoder().encode(text).byteLength;
 }

 async function rpc(name,params){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS);
  try{
   const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${encodeURIComponent(name)}`,{
    method:'POST',
    headers:{
     apikey:SUPABASE_PUBLISHABLE_KEY,
     'Content-Type':'application/json',
     Accept:'application/json'
    },
    body:JSON.stringify(params),
    signal:controller.signal
   });
   const text=await response.text();
   let data=null;
   if(text){try{data=JSON.parse(text);}catch{data=text;}}
   if(!response.ok){
    const detail=data?.message||data?.details||`HTTP ${response.status}`;
    throw Error(detail);
   }
   return data;
  }catch(error){
   if(error?.name==='AbortError')throw Error('클라우드 요청 시간이 초과되었습니다. 인터넷 연결을 확인해 주세요.');
   if(error instanceof TypeError)throw Error('Supabase 서버에 연결하지 못했습니다. 인터넷 연결을 확인해 주세요.');
   throw error;
  }finally{clearTimeout(timer);}
 }

 async function createShare(save){
  if(!save||typeof save!=='object')throw Error('공유할 저장 데이터를 만들지 못했습니다.');
  if(bytes(save)>(window.SAVE_FORMAT?.maxBytes||8*1024*1024))throw Error('저장 데이터가 너무 큽니다. 최대 8MB까지 공유할 수 있습니다.');
  const result=await rpc('create_save_share',{
   p_save_data:save,
   p_game_version:String(save.gameVersion||window.SAVE_FORMAT?.gameVersion||''),
   p_save_format_version:Number(save.saveFormatVersion||window.SAVE_FORMAT?.saveFormatVersion||0)
  });
  if(typeof result!=='string')throw Error('서버가 올바른 공유 코드를 반환하지 않았습니다.');
  return normalizeCode(result);
 }

 async function getShare(value){
  const code=normalizeCode(value);
  const rows=await rpc('get_save_share',{p_share_code:code});
  const row=Array.isArray(rows)?rows[0]:null;
  if(!row||!row.save_data)throw Error('해당 공유 코드를 찾을 수 없습니다. 코드를 다시 확인해 주세요.');
  if(bytes(row.save_data)>(window.SAVE_FORMAT?.maxBytes||8*1024*1024))throw Error('공유 저장 데이터가 허용 크기를 초과했습니다.');
  return{
   code,
   saveData:row.save_data,
   gameVersion:row.game_version,
   saveFormatVersion:row.save_format_version,
   createdAt:row.created_at
  };
 }

 window.LAST_RAIL_CLOUD={
  createShare,
  getShare,
  formatCode,
  normalizeCode,
  isConfigured:()=>Boolean(SUPABASE_URL&&SUPABASE_PUBLISHABLE_KEY)
 };
})();
