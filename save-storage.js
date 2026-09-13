/* Loaded before the game reads storage: recover an interrupted import first. */
(()=>{
 const keys=['lastRailMeta','lastRailMetaBeforeV2','lastRailCodexV2','lastRailCombatReports','lastRailEliteSeen','lastRailVolume','lastRailEventCheckpointV1','lastTrainRunCheckpoint','lastTrainSaveWarningAcknowledged'];
 const backupKey='lastTrainImportBackup',journalKey='lastTrainImportJournal';
 const snapshot=()=>Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)]));
 function restore(raw){for(const k of keys){if(raw[k]===null||raw[k]===undefined)localStorage.removeItem(k);else if(typeof raw[k]==='string')localStorage.setItem(k,raw[k]);else throw Error('잘못된 백업 데이터');}}
 function recover(){if(!localStorage.getItem(journalKey))return;const backup=JSON.parse(localStorage.getItem(backupKey));if(!backup?.raw)throw Error('가져오기 백업을 찾을 수 없습니다.');restore(backup.raw);localStorage.removeItem(journalKey);}
 try{recover();}catch(e){document.documentElement.innerHTML='<body><p>중단된 저장 불러오기를 복구하지 못했습니다. 저장 공간을 확보한 뒤 새로고침하세요. 기존 백업은 보관되어 있습니다.</p></body>';window.stop();throw e;}
 window.SAVE_STORAGE={keys,backupKey,journalKey,snapshot,apply(raw){
  const before=snapshot();localStorage.setItem(backupKey,JSON.stringify({createdAt:new Date().toISOString(),raw:before}));
  localStorage.setItem(journalKey,'applying');
  try{restore(raw);localStorage.removeItem(journalKey);}catch(error){try{restore(before);localStorage.removeItem(journalKey);}catch{throw Error('복원이 중단되었습니다. 백업을 보관했습니다. 저장 공간 확보 후 새로고침하면 복원을 재시도합니다.');}throw Error('불러오기에 실패하여 기존 저장을 복원했습니다.');}
 }};
})();
