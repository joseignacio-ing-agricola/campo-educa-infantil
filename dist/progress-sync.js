const keys=new Set(['agro-last-lesson','agro-course-done','agro-learning-lab-v1','agro-presentation-positions-v2','riego-learning-lab-v1','agro-exam-draft-v3-casos','campo-alternative-order-v1']);
export function createProgressSync({storage,send,onStatus=()=>{}}){
 let owner=null,pending={},flight=null,persisted=true;
 const storageKey=uid=>'campo-infantil-pending-v1:'+uid;
 const count=()=>Object.keys(pending).length;
 function announce(state){onStatus({state,pending:count(),persisted});}
 function persist(){if(!owner)return;try{if(count())storage.setItem(storageKey(owner),JSON.stringify(pending));else storage.removeItem(storageKey(owner));persisted=true;}catch{persisted=false;}return persisted;}
 function validPatch(patch){return Object.fromEntries(Object.entries(patch||{}).filter(([k,v])=>keys.has(k)&&typeof v==='string'&&v.length<=1000000));}
 function setUser(uid){owner=uid||null;pending={};persisted=true;if(owner){try{const saved=JSON.parse(storage.getItem(storageKey(owner))||'{}');for(const [course,patch]of Object.entries(saved)){if(/^infantil-[a-z0-9-]+$/.test(course)){const clean=validPatch(patch);if(Object.keys(clean).length)pending[course]=clean;}}}catch{persisted=false;}}announce(count()?'pending':'saved');}
 function enqueue(course,patch){if(!owner||!/^infantil-[a-z0-9-]+$/.test(course))return false;const clean=validPatch(patch);if(!Object.keys(clean).length)return false;pending[course]={...pending[course],...clean};persist();announce('pending');return true;}
 async function flush(){
  if(flight)return flight;
  if(!owner||!count()){announce('saved');return true;}
  const user=owner,batch=JSON.parse(JSON.stringify(pending));announce('saving');
  const run=(async()=>{let failed=false;for(const [course,patch]of Object.entries(batch)){
   try{await send(course,patch,user);if(owner!==user)continue;for(const [key,value]of Object.entries(patch)){if(pending[course]?.[key]===value)delete pending[course][key];}if(pending[course]&&!Object.keys(pending[course]).length)delete pending[course];persist();}
   catch{failed=true;}
  }if(owner===user){announce(count()?(failed?'pending':'saving'):'saved');return count()===0;}return false;})();
  flight=run;try{return await run;}finally{if(flight===run)flight=null;}
 }
 return {setUser,enqueue,flush,count,getPending:course=>({...pending[course]}),getOwner:()=>owner};
}
export function mergeProgress(server={},local={}){const result={...server,...local};if(server['agro-course-done']&&local['agro-course-done'])result['agro-course-done']=JSON.stringify([...new Set([...completedLessons(server,12),...completedLessons(local,12)])].sort((a,b)=>a-b));return result;}
export function completedLessons(records={},total=4){try{const value=JSON.parse(records['agro-course-done']||'[]');return Array.isArray(value)?[...new Set(value.filter(n=>Number.isInteger(n)&&n>=0&&n<total))]:[];}catch{return [];}}
