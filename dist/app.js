import { createProgressSync, mergeProgress, completedLessons } from './progress-sync.js';
import { infantHTML } from './infant-reader.js';
const el=id=>document.getElementById(id),status=message=>{el('status').textContent=message;};
const localStore={getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v),removeItem:k=>localStorage.removeItem(k)};
let retryTimer=null;
const progressSync=createProgressSync({storage:localStore,send:async(course,patch,owner)=>{if(!sb||!user||user.id!==owner)throw Error('Cuenta cambiada');let merged=patch;if(patch['agro-course-done']){const {data,error}=await sb.from('campo_learning_state').select('records').eq('user_id',owner).eq('course_id',course).maybeSingle();if(error)throw error;merged=mergeProgress(data?.records||{},patch);}const {error}=await sb.rpc('campo_save_learning',{p_course:course,p_patch:merged});if(error)throw error;},onStatus:updateSyncUI});
function updateSyncUI({state,pending,persisted}){const message=state==='saved'?'✓ Avance guardado en tu cuenta':state==='saving'?'Guardando tu aventura…':persisted?'Avance guardado en este navegador · pendiente de sincronizar':'No se pudo guardar una copia en este navegador. Mantén esta página abierta e intenta de nuevo.';const summary=document.getElementById('sync-summary');if(summary)summary.textContent=message;const detail=document.getElementById('viewer-access-status');if(detail&&activeCourse)detail.textContent=message;}
const config=window.AULA_CONFIG||{};let accessExpiryTimer=null;let sb=null,user=null,courses=[],profiles=[],activeCourse=null,opening=false,isAdmin=false,renewTimer=null,renewing=false;
function node(tag,text){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;}
function closeCourse(){clearTimeout(accessExpiryTimer);clearTimeout(renewTimer);renewTimer=null;el('course-frame').srcdoc='';el('viewer').hidden=true;activeCourse=null;}
async function initialize(){
 if(!config.url||!config.publishableKey){status('Plataforma pendiente de conectar a Supabase. El encargado debe completar web/config.js y activar la configuración del servidor.');el('login-form').querySelector('button').disabled=true;return;}
 if(!/^https:\/\//.test(config.url)||config.publishableKey.startsWith('sb_secret_'))throw Error('Revisa la configuración pública.');
 const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm');
 sb=createClient(config.url,config.publishableKey);
 sb.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT'){progressSync.setUser(null);clearTimeout(retryTimer);user=null;isAdmin=false;closeCourse();el('dashboard').hidden=true;el('admin').hidden=true;el('login').hidden=false;el('logout').hidden=true;}});
 const {data}=await sb.auth.getSession();if(data.session)await loadDashboard();
}
async function loadDashboard(){
 const {data,error}=await sb.auth.getUser();if(error||!data.user)throw Error('Inicia sesión para entrar.');user=data.user;if(progressSync.getOwner()!==user.id)progressSync.setUser(user.id);
 const [{data:profile,error:pError},{data:admin,error:aError},{data:list,error:cError}]=await Promise.all([sb.from('learner_profiles').select('full_name').eq('user_id',user.id).maybeSingle(),sb.from('course_admins').select('user_id').eq('user_id',user.id).maybeSingle(),sb.from('courses').select('id,title,description,active').like('id','infantil-%').order('title')]);
 if(pError||aError||cError)throw Error('No se pudieron consultar los accesos. Revisa tu conexión e intenta nuevamente.');isAdmin=Boolean(admin);courses=list||[];
 el('greeting').textContent='Hola, '+(profile?.full_name||user.email);el('login').hidden=true;el('dashboard').hidden=false;el('logout').hidden=false;el('admin').hidden=!admin;
 const [{data:states,error:stateError},{data:enrollments,error:enrollmentError}]=await Promise.all([courses.length?sb.from('campo_learning_state').select('course_id,records').eq('user_id',user.id).in('course_id',courses.map(c=>c.id)):Promise.resolve({data:[],error:null}),sb.from('enrollments').select('course_id,active,expires_at').eq('user_id',user.id).like('course_id','infantil-%')]);
 el('courses').replaceChildren();let last=null;try{last=localStore.getItem('campo-infantil-last:'+user.id);}catch{}const visible=courses.filter(c=>c.active);
 for(const c of visible){const records=mergeProgress(states?.find(s=>s.course_id===c.id)?.records||{},progressSync.getPending(c.id)),done=completedLessons(records);const enrollment=enrollments?.find(e=>e.course_id===c.id),card=node('article');card.className='course';const visual=node('div');visual.className='dashboard-illustration '+({'infantil-mini-huerta':'huerta','infantil-detectives':'detectives','infantil-guardianes-agua':'agua'}[c.id]||'huerta');visual.setAttribute('aria-hidden','true');card.append(visual,node('h2',c.title),node('p',c.description));const meter=node('progress');meter.max=4;meter.value=done.length;meter.setAttribute('aria-label',done.length+' de 4 aventuras realizadas');card.append(node('p',done.length+' de 4 aventuras realizadas'),meter);let access=isAdmin?'Acceso de administración':enrollment?.expires_at?'Acceso hasta el '+new Intl.DateTimeFormat('es-CL',{dateStyle:'medium',timeZone:'America/Santiago'}).format(new Date(enrollment.expires_at)):'Consulta tu plazo de acceso con el encargado';card.append(node('p',access));const button=node('button',done.length===4?'Volver a explorar →':records['agro-last-lesson']!==undefined||done.length?'Continuar mi aventura →':'Empezar mi aventura →');button.type='button';button.onclick=()=>openInfant(c.id);card.append(button);el('courses').append(card);}
 const resume=el('continue-adventure');resume.replaceChildren();resume.hidden=!visible.length;const next=visible.find(c=>c.id===last)||visible[0];if(next){const image=node('img');image.src='imagenes/broti.webp';image.alt='Broti te espera';image.width=95;image.height=110;const body=node('div');body.append(node('h2','¡Tu aventura continúa!'),node('p',next.title));const button=node('button','Continuar mi aventura →');button.type='button';button.onclick=()=>openInfant(next.id);resume.append(image,body,button);}
 if(!visible.length)el('courses').append(node('p','No tienes cursos infantiles habilitados. Consulta al encargado para activar tu matrícula.'));showProfile(profile);if(admin)await loadAdmin();status(stateError||enrollmentError?'No se pudo actualizar toda la información del avance. Puedes intentar abrir tu curso.':'');if(progressSync.count())void flushLearning();
}
async function loadAdmin(){
 const {data:entries,error:eError}=await sb.from('enrollments').select('user_id,course_id,active,expires_at,created_at').like('course_id','infantil-%').order('created_at',{ascending:false});if(eError)throw Error('No se pudieron cargar las matrículas infantiles.');const ids=[...new Set((entries||[]).map(e=>e.user_id))];const result=ids.length?await sb.from('learner_profiles').select('user_id,full_name,email').in('user_id',ids).order('full_name'):{data:[],error:null};if(result.error)throw Error('No se pudieron cargar los alumnos infantiles.');profiles=result.data||[];refreshLearnerOptions();const activeEntries=(entries||[]).filter(e=>e.active&&(!e.expires_at||new Date(e.expires_at)>new Date()));el('enrollment-overview').textContent=activeEntries.length+' matrículas infantiles activas · '+new Set(activeEntries.map(e=>e.user_id)).size+' cuentas con acceso.';
 el('course-select').replaceChildren();el('course-options').replaceChildren();courses.forEach(c=>{const option=node('option',c.title);option.value=c.id;el('course-select').append(option);if(c.active){const label=node('label'),check=node('input');check.type='checkbox';check.name='courses';check.value=c.id;label.append(check,document.createTextNode(c.title));el('course-options').append(label);}});
 const table=node('table'),head=node('tr');['Cuenta responsable','Curso infantil','Acceso','Vencimiento'].forEach(t=>head.append(node('th',t)));table.append(head);for(const e of entries||[]){const tr=node('tr');[profiles.find(p=>p.user_id===e.user_id)?.full_name||'Cuenta registrada',courses.find(c=>c.id===e.course_id)?.title||e.course_id,!e.active?'Retirado':e.expires_at&&new Date(e.expires_at)<=new Date()?'Vencido':'Habilitado',e.expires_at?new Intl.DateTimeFormat('es-CL',{dateStyle:'medium',timeZone:'America/Santiago'}).format(new Date(e.expires_at)):'Sin vencimiento'].forEach(t=>tr.append(node('td',t)));table.append(tr);}const wrapper=node('div');wrapper.className='table-wrap';wrapper.append(table);el('enrollments').replaceChildren(wrapper);await loadAcademicAdmin();await loadSalesMetrics();
}
function refreshLearnerOptions(){const select=el('learner-select');select.replaceChildren();profiles.forEach(p=>{const option=node('option',p.full_name+' · '+p.email);option.value=p.user_id;select.append(option);});}
el('find-family').addEventListener('submit',async event=>{event.preventDefault();event.submitter.disabled=true;try{const {data,error}=await sb.from('learner_profiles').select('user_id,full_name,email').eq('email',el('family-search-email').value.trim().toLowerCase()).maybeSingle();if(error)throw error;if(!data)throw Error('No encontramos esa cuenta. Puedes registrarla en el formulario siguiente.');if(!profiles.some(p=>p.user_id===data.user_id))profiles.push(data);refreshLearnerOptions();el('learner-select').value=data.user_id;status('Cuenta encontrada. Elige un curso infantil y confirma su acceso.');}catch(e){status(e.message||'No se pudo buscar la cuenta.');}finally{event.submitter.disabled=false;}});
async function adminAction(body){const {data,error}=await sb.functions.invoke('course-admin',{body});if(error){let message='No se completó la operación administrativa.';try{const detail=await error.context.json();if(detail.error)message=detail.error;}catch(_){}throw Error(message);}if(data?.error)throw Error(data.error);return data;}
el('login-form').addEventListener('submit',async event=>{event.preventDefault();const button=event.submitter;button.disabled=true;try{if(!sb)throw Error('Falta conectar Supabase.');const {error}=await sb.auth.signInWithPassword({email:el('email').value.trim(),password:el('password').value});if(error)throw Error('No se pudo entrar. Revisa el correo y la contraseña o consulta al encargado.');el('password').value='';await loadDashboard();}catch(e){status(e.message);}finally{button.disabled=false;}});
el('logout').addEventListener('click',async()=>{await flushLearning();closeCourse();const {error}=await sb.auth.signOut();if(error)status('No se pudo cerrar la sesión. Intenta nuevamente.');});
el('create-user').addEventListener('submit',async event=>{event.preventDefault();event.submitter.disabled=true;try{const ids=Array.from(el('course-options').querySelectorAll('input:checked')).map(i=>i.value);await adminAction({action:'create_user',name:el('learner-name').value,email:el('learner-email').value,password:el('learner-password').value,courses:ids,...durationPayload('create-duration')});el('create-user').reset();await loadAdmin();status('Alumno registrado y cursos habilitados. Entrega sus credenciales por un medio personal.');}catch(e){status(e.message);}finally{event.submitter.disabled=false;}});
el('access-form').addEventListener('submit',async event=>{event.preventDefault();event.submitter.disabled=true;try{await adminAction({action:'set_access',user_id:el('learner-select').value,course_id:el('course-select').value,active:el('access-active').value==='true',...durationPayload('access-duration')});await loadAdmin();status('Acceso actualizado. Los enlaces ya emitidos caducan en un máximo de 10 minutos.');}catch(e){status(e.message);}finally{event.submitter.disabled=false;}});
el('password-form').addEventListener('submit',async event=>{event.preventDefault();event.submitter.disabled=true;try{if(el('new-password').value!==el('confirm-password').value)throw Error('Las contraseñas no coinciden.');const {error}=await sb.auth.updateUser({password:el('new-password').value});if(error)throw Error('No se cambió la contraseña. Revisa la política de contraseñas o vuelve a iniciar sesión.');el('password-form').reset();status('Contraseña actualizada.');}catch(e){status(e.message);}finally{event.submitter.disabled=false;}});
async function openCourse(id){
 if(id.startsWith('infantil-'))return openInfant(id);
 if(opening)return;opening=true;status('Consultando tu acceso y preparando el aula…');
 try{
  const {data:course,error}=await sb.from('courses').select('*').eq('id',id).eq('active',true).single();if(error||!course)throw Error('No tienes acceso activo a este curso.');
  const paths=course.files;if(!Array.isArray(paths)||!paths.includes('aula.html')||paths.some(p=>typeof p!=='string'||p.includes('..')||p.startsWith('/')))throw Error('El encargado todavía no cargó el material de este curso.');
  const access=await courseAccess(id);const {data:signed,error:sError}=await sb.storage.from('course-materials').createSignedUrls(paths.map(p=>id+'/'+p),access.ttl);if(sError||!signed||signed.some(s=>s.error||!s.signedUrl))throw Error('No se pudo acceder al material. Puede que tu permiso haya sido retirado.');
  const map=Object.fromEntries(signed.map(s=>[s.path.slice(id.length+1),s.signedUrl]));
  const academic=await sb.rpc('campo_get_learning',{p_course:id});
  const missingAcademic=academic.error&&['PGRST202','42883'].includes(academic.error.code);
  if(academic.error&&!missingAcademic)throw Error('No se pudo cargar tu expediente: '+academic.error.message);
  const learning=academic.error?null:academic.data;
  const response=await fetch(map['aula.html'],{cache:'no-store'});if(!response.ok)throw Error('No se pudo cargar el aula.');let html=await response.text();
  if(learning){
   if(!html.includes('CAMPO_ACADEMIC_V2'))throw Error('La actualización del aula está pendiente de cargar sus archivos privados.');
   html=html.replace(/const finalQuestions\s*=\s*(\[[\s\S]*?\]);/,(_,raw)=>'const finalQuestions = '+JSON.stringify(JSON.parse(raw).map(q=>[q[0],q[1],null,'',[]]))+';');
   html=html.replace(/var courseStorage=\{[\s\S]*?\};/,`var courseStorage={getItem:function(k){const state=window.PRIVATE_LEARNING.records;const academic=/history|assessment/.test(k);if(Object.prototype.hasOwnProperty.call(state,k))return state[k];if(academic)return null;const value=localStorage.getItem('aula:'+courseProfile.user+':'+courseProfile.course+':'+k);if(value!==null){state[k]=value;window.parent.postMessage({type:'campo-save-learning',key:k,value:value},window.PRIVATE_PROFILE.parentOrigin);}return value;},setItem:function(k,v){window.PRIVATE_LEARNING.records[k]=v;localStorage.setItem('aula:'+courseProfile.user+':'+courseProfile.course+':'+k,v);window.parent.postMessage({type:'campo-save-learning',key:k,value:v},window.PRIVATE_PROFILE.parentOrigin);},removeItem:function(k){delete window.PRIVATE_LEARNING.records[k];localStorage.removeItem('aula:'+courseProfile.user+':'+courseProfile.course+':'+k);}};`);
   const archivePrefix='aula:'+user.id+':'+id+':';
   const archived=localStorage.getItem(archivePrefix+'campo-legacy-history-v1')||localStorage.getItem(archivePrefix+'agro-exam-history-v1');
   if(archived){if(!localStorage.getItem(archivePrefix+'campo-legacy-history-v1'))localStorage.setItem(archivePrefix+'campo-legacy-history-v1',archived);learning.records['campo-legacy-history-v1']=archived;}
   learning.records['agro-exam-history-v1']=JSON.stringify(learning.attempts);
  }
  const safeJSON=value=>JSON.stringify(value).replace(/</g,'\\u003c');
  const navigationBoot=`
window.addEventListener('message',function(event){
 if(event.source!==window.parent||event.origin!==window.PRIVATE_PROFILE.parentOrigin||event.data?.type!=='campo-material-refresh')return;
 const previous=window.PRIVATE_FILES,next=event.data.files;
 if(!next||typeof next!=='object'||Object.keys(previous).some(key=>typeof next[key]!=='string'||!next[key].startsWith('https://')))return;
 window.PRIVATE_FILES=next;
 const reverse=new Map(Object.entries(previous).map(([key,url])=>[url,key]));
 document.querySelectorAll('img[src],a[href]').forEach(function(item){const attr=item.tagName==='A'?'href':'src';const path=reverse.get(item.getAttribute(attr));if(path)item.setAttribute(attr,next[path]);});
});
window.campoAcademic={enabled:Boolean(window.PRIVATE_LEARNING),request:function(action,payload){
 if(!this.enabled)return Promise.reject(Error('El seguimiento centralizado todavía no está instalado.'));
 return new Promise((resolve,reject)=>{const id=crypto.randomUUID();const timer=setTimeout(()=>{window.removeEventListener('message',receive);reject(Error('La operación sigue pendiente de respuesta. Revisa el historial antes de reenviar.'));},20000);
 function receive(event){if(event.source!==window.parent||event.origin!==window.PRIVATE_PROFILE.parentOrigin||event.data?.type!=='campo-academic-response'||event.data.id!==id)return;clearTimeout(timer);window.removeEventListener('message',receive);event.data.error?reject(Error(event.data.error)):resolve(event.data.data);}
 window.addEventListener('message',receive);window.parent.postMessage({type:'campo-academic-request',id,action,payload},window.PRIVATE_PROFILE.parentOrigin);});
}};

document.addEventListener('click',function(event){
 const fileLink=event.target.closest('a[download]');
 if(fileLink&&!fileLink.href.startsWith('blob:')&&!fileLink.href.startsWith('data:')){
  const raw=fileLink.getAttribute('href');
  const path=Object.keys(window.PRIVATE_FILES).find(k=>k===raw||window.PRIVATE_FILES[k]===raw);
  if(path){event.preventDefault();window.parent.postMessage({type:'campo-download',path},window.PRIVATE_PROFILE.parentOrigin);return;}
 }
 const anchor=event.target.closest('a[href^="#"]');
 if(anchor){
  event.preventDefault();
  const hash=anchor.getAttribute('href');
  if(location.hash!==hash)location.hash=hash;
  else window.dispatchEvent(new Event('hashchange'));
  return;
 }
 if(event.target.closest('button.lesson')){
  queueMicrotask(function(){if(location.hash!=='#lecciones')location.hash='#lecciones';});
 }
});`;
  html=html.replace('/*AULA_PRIVATE_BOOT*/',()=> 'window.PRIVATE_FILES='+safeJSON(map)+';window.PRIVATE_PROFILE='+safeJSON({user:user.id,name:el('greeting').textContent.replace(/^Hola, /,''),course:id,isAdmin,parentOrigin:window.location.origin})+';window.PRIVATE_LEARNING='+safeJSON(learning)+';'+navigationBoot);
  for(const [relative,url] of Object.entries(map)){html=html.replaceAll('href="'+relative+'"','href="'+url+'"').replaceAll('src="'+relative+'"','src="'+url+'"');}
  el('course-frame').srcdoc=html;el('viewer-title').textContent=course.title;el('viewer').hidden=false;activeCourse=id;setAccessExpiry(access.expires_at);scheduleRenewal(access.ttl);status('');el('viewer-access-status').textContent=learning?'Expediente sincronizado. Acceso al material con renovación automática.':'Acceso al material activo. Avance local: el seguimiento centralizado está pendiente de instalación.';
 }catch(e){closeCourse();status(e.message);}finally{opening=false;}
}
function scheduleRenewal(ttl=600){clearTimeout(renewTimer);renewTimer=setTimeout(()=>{if(!activeCourse)return;if(document.hidden){scheduleRenewalSoon();return;}renewMaterial();},Math.max(1000,(ttl-60)*1000));}
function scheduleRenewalSoon(){clearTimeout(renewTimer);renewTimer=setTimeout(()=>{if(!document.hidden&&activeCourse)renewMaterial();else if(activeCourse)scheduleRenewalSoon();},30000);}
async function renewMaterial(){
 if(activeCourse?.startsWith('infantil-')){try{const a=await courseAccess(activeCourse);setAccessExpiry(a.expires_at);scheduleRenewal(a.ttl);el('viewer-access-status').textContent=progressSync.count()?'Acceso verificado · avance pendiente de sincronizar.':'Acceso verificado · avance guardado en tu cuenta.';}catch(e){closeCourse();status(e.message);}return;}
 if(!activeCourse||renewing)return;renewing=true;const courseId=activeCourse;
 el('viewer-access-status').textContent='Renovando acceso al material…';
 try{
  const {data:course,error}=await sb.from('courses').select('files').eq('id',courseId).eq('active',true).single();
  if(error||!course)throw Error('No se pudo confirmar tu acceso. Vuelve al catálogo e inicia sesión si es necesario.');
  if(!Array.isArray(course.files))throw Error('El material todavía no está disponible.');
  const access=await courseAccess(courseId);const {data:signed,error:failed}=await sb.storage.from('course-materials').createSignedUrls(course.files.map(p=>courseId+'/'+p),access.ttl);
  if(failed||!signed||signed.some(s=>s.error||!s.signedUrl))throw Error('No se pudo renovar el material. Revisa conexión y permiso de acceso.');
  if(activeCourse!==courseId)return;
  const files=Object.fromEntries(signed.map(s=>[s.path.slice(courseId.length+1),s.signedUrl]));
  el('course-frame').contentWindow.postMessage({type:'campo-material-refresh',files},window.location.origin);
  el('viewer-access-status').textContent='Acceso renovado. Se conserva tu lección y tus respuestas.';setAccessExpiry(access.expires_at);scheduleRenewal(access.ttl);
 }catch(error){if(activeCourse===courseId){if(error.expired){closeCourse();status(error.message);}else{el('viewer-access-status').textContent=error.message+' Puedes volver a pulsar Renovar acceso.';scheduleRenewalSoon();}}}
 finally{renewing=false;}
}
el('close-course').addEventListener('click',closeCourse);el('renew-course').addEventListener('click',renewMaterial);
window.addEventListener('message',event=>{if(event.source===el('course-frame').contentWindow&&event.data?.type==='aula-close')closeCourse();});
initialize().catch(()=>status('No se pudo iniciar la plataforma. Revisa tu conexión y la configuración de Supabase.'));

// La cuenta y el curso se obtienen de la sesión del portal, nunca del contenido del mensaje.
let learningTimer=null;
const allowedLearningKey=k=>['agro-last-lesson','agro-course-done','agro-presentation-positions-v2','agro-learning-lab-v1','riego-learning-lab-v1','agro-exam-draft-v3-casos','campo-alternative-order-v1'].includes(k);
async function flushLearning(){clearTimeout(learningTimer);clearTimeout(retryTimer);if(!progressSync.getOwner())return true;if(!navigator.onLine&&progressSync.count())return false;const ok=await progressSync.flush();if(!ok&&progressSync.count()&&progressSync.getOwner())retryTimer=setTimeout(()=>void flushLearning(),15000);return ok;}
window.addEventListener('online',()=>void flushLearning());document.addEventListener('visibilitychange',()=>{if(!document.hidden)void flushLearning();});
window.addEventListener('message',async event=>{
 if(event.source!==el('course-frame').contentWindow||event.origin!==window.location.origin||!activeCourse||!user)return;
 const message=event.data,course=activeCourse;
 if(course.startsWith('infantil-') && message?.courseId!==course)return;
 if(message?.type==='campo-save-learning'&&allowedLearningKey(message.key)&&typeof message.value==='string'&&message.value.length<=1000000){
  progressSync.enqueue(course,{[message.key]:message.value});try{localStore.setItem('campo-infantil-last:'+user.id,course);}catch{}clearTimeout(learningTimer);learningTimer=setTimeout(()=>void flushLearning(),750);return;
 }
 if(message?.type!=='campo-academic-request'||typeof message.id!=='string'||message.id.length>100)return;
 const rpc={grade:['campo_grade_attempt',{p_course:course,p_answers:message.payload?.answers}],certificate:['campo_issue_certificate',{p_course:course,p_kind:message.payload?.kind}],submit:['campo_submit_portfolio',{p_course:course,p_module:message.payload?.module,p_texts:message.payload?.texts}]}[message.action];
 if(!rpc)return;
 try{await flushLearning();const {data,error}=await sb.rpc(rpc[0],rpc[1]);if(error)throw error;if(activeCourse===course)event.source.postMessage({type:'campo-academic-response',id:message.id,data},window.location.origin);}
 catch(error){if(activeCourse===course)event.source.postMessage({type:'campo-academic-response',id:message.id,error:error.message||'No se completó la operación.'},window.location.origin);}
});

async function loadAcademicAdmin(){
 let area=el('academic-admin');if(!area){area=node('section');area.id='academic-admin';el('admin').append(area);}area.replaceChildren(node('h3','Entregas y registro académico'));
 const [{data:entries,error},{data:certificates,error:cError}]=await Promise.all([sb.from('campo_portfolios').select('*').in('course_id',courses.map(c=>c.id)).order('submitted_at',{ascending:false}).limit(100),sb.from('campo_certificates').select('*').in('course_id',courses.map(c=>c.id)).order('created_at',{ascending:false}).limit(100)]);
 if(error||cError){area.append(node('p','El seguimiento académico todavía no está instalado. Los alumnos y las matrículas se administran en el panel anterior.'));return;}
 area.append(node('p','Se muestran las últimas 100 entregas y los últimos 100 certificados. Una nueva entrega del módulo vuelve a quedar pendiente de revisión.'));
 if(!entries?.length)area.append(node('p','No hay entregas recibidas.'));
 for(const entry of entries||[]){
  const card=node('article');card.className='academic-review';const name=profiles.find(p=>p.user_id===entry.user_id)?.full_name||'Alumno';const course=courses.find(c=>c.id===entry.course_id)?.title||entry.course_id;
  card.append(node('h4',name+' · '+course+' · Módulo '+(entry.module_index+1)));const details=node('details');details.append(node('summary','Leer entrega y aplicar rúbrica'));
  (entry.texts||[]).forEach((answer,i)=>{details.append(node('h5','Respuesta '+(i+1)),node('p',answer));});
  const form=node('form');form.className='teacher-review';const scores=[];
  ['Datos y contexto','Método y unidades','Cálculos y razonamiento','Límites y riesgos','Decisión y seguimiento'].forEach((text,i)=>{const label=node('label',text),select=node('select');select.required=true;const blank=node('option','Selecciona');blank.value='';select.append(blank);[0,1,2].forEach(score=>{const option=node('option',score+' · '+['Sin evidencia','Parcial','Completo'][score]);option.value=score;select.append(option);});select.value=entry.teacher_scores?String(entry.teacher_scores[i]):'';scores.push(select);label.append(select);form.append(label);});
  const label=node('label','Devolución al estudiante'),feedback=node('textarea');feedback.required=true;feedback.minLength=3;feedback.maxLength=4000;feedback.rows=5;feedback.value=entry.teacher_feedback||'';label.append(feedback);const button=node('button','Guardar revisión docente');button.type='submit';const message=node('p',entry.reviewed_at?'Revisada · '+new Date(entry.reviewed_at).toLocaleDateString('es-CL'):'Revisión pendiente');message.setAttribute('role','status');form.append(label,button,message);
  form.addEventListener('submit',async event=>{event.preventDefault();button.disabled=true;try{const {error}=await sb.rpc('campo_review_portfolio',{p_id:entry.id,p_scores:scores.map(s=>Number(s.value)),p_feedback:feedback.value.trim()});if(error)throw error;message.textContent='Revisión guardada. El estudiante podrá consultar tu devolución al abrir el curso.';}catch(error){message.textContent=error.message;}finally{button.disabled=false;}});
  details.append(form);card.append(details);area.append(card);
 }
 const list=node('details');list.append(node('summary','Consultar folios emitidos'));const table=node('table'),head=node('tr');['Estudiante','Curso','Tipo','Folio','Fecha'].forEach(t=>head.append(node('th',t)));table.append(head);for(const c of certificates||[]){const row=node('tr');[c.name,courses.find(k=>k.id===c.course_id)?.title||c.course_id,c.kind,c.id,new Date(c.created_at).toLocaleDateString('es-CL')].forEach(t=>row.append(node('td',t)));table.append(row);}const wrap=node('div');wrap.className='table-wrap';wrap.append(table);list.append(wrap);area.append(list);
}

function durationPayload(prefix){const unit=el(prefix+'-unit').value;return {duration_unit:unit,duration_amount:unit==='unlimited'?null:Number(el(prefix+'-amount').value)};}
['create-duration','access-duration'].forEach(prefix=>el(prefix+'-unit').addEventListener('change',()=>{const input=el(prefix+'-amount');input.disabled=el(prefix+'-unit').value==='unlimited';input.max=el(prefix+'-unit').value==='months'?'120':'3650';if(Number(input.value)>Number(input.max))input.value=input.max;}));
async function courseAccess(id){
 const {data,error}=await sb.rpc('campo_access_window',{p_course:id});
 if(error){const e=Error('Tu acceso al curso venció o fue retirado. Consulta al encargado.');e.expired=true;throw e;}
 return data;
}
function setAccessExpiry(expires){
 clearTimeout(accessExpiryTimer);if(!expires)return;const ms=new Date(expires)-Date.now();
 if(ms<=0){closeCourse();status('El acceso al curso ha vencido.');return;}
 accessExpiryTimer=setTimeout(()=>{if(ms>2147480000)setAccessExpiry(expires);else{closeCourse();status('El acceso al curso ha vencido. Contacta al encargado para renovarlo.');}},Math.min(ms,2147480000));
}
const downloadsInFlight=new Set();
window.addEventListener('message',async event=>{
 if(event.source!==el('course-frame').contentWindow||event.origin!==location.origin||event.data?.type!=='campo-download'||!activeCourse)return;
 const course=activeCourse,path=event.data.path;
 if(typeof path!=='string'||!courses.find(c=>c.id===course)?.files.includes(path)||downloadsInFlight.has(path))return;
 downloadsInFlight.add(path);status('Preparando descarga…');
 try{
  const access=await courseAccess(course);const filename=path.split('/').pop();
  const {data,error}=await sb.storage.from('course-materials').createSignedUrl(course+'/'+path,Math.min(access.ttl,60),{download:filename});
  if(error)throw error;const response=await fetch(data.signedUrl,{cache:'no-store'});if(!response.ok)throw Error('No se pudo descargar el archivo. Renueva tu acceso e inténtalo de nuevo.');
  const blob=await response.blob();if(!blob.size)throw Error('El archivo está vacío. Contacta al encargado.');
  if(path.endsWith('.pdf')&&await blob.slice(0,5).text()!=='%PDF-')throw Error('El material recibido no es un PDF válido.');
  if(activeCourse!==course)throw Error('Abre nuevamente el curso para descargar.');
  const url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);status('Archivo preparado: '+filename+'. Revisa las descargas de tu navegador.');
 }catch(error){status(error.message||'No se pudo descargar el material.');}finally{downloadsInFlight.delete(path);}
});

function showProfile(profile){let box=el('family-profile');if(!box){box=node('section');box.id='family-profile';box.className='profile-panel';el('dashboard').insertBefore(box,el('courses'));}box.replaceChildren(node('h2','Mi perfil'));const list=node('dl');for(const [label,value]of [['Nombre de la cuenta',profile?.full_name||'Sin nombre registrado'],['Correo',user.email],['Rol',isAdmin?'Administración':'Cuenta de aprendizaje']]){list.append(node('dt',label),node('dd',value));}box.append(list,node('p','Puedes cambiar tu contraseña desde esta página. Para corregir el nombre o el correo, contacta al encargado.'));}
async function openInfant(id){if(opening)return;opening=true;closeCourse();const owner=user?.id;const openingPatch=progressSync.getPending(id);status('Verificando tu matrícula…');try{if(!owner)throw Error('Inicia sesión para entrar.');void flushLearning();const access=await courseAccess(id);const [{data:material,error},{data:state,error:sError}]=await Promise.all([sb.from('campo_infantil_materials').select('content').eq('course_id',id).single(),sb.from('campo_learning_state').select('records').eq('user_id',user.id).eq('course_id',id).maybeSingle()]);if(user?.id!==owner)throw Error('La sesión cambió. Abre el curso desde tu cuenta.');if(error||!material)throw Error('No se pudo cargar el material infantil. Revisa tu matrícula y conexión.');if(sError)throw Error('No se pudo recuperar tu avance. Intenta nuevamente.');el('course-frame').srcdoc=infantHTML(material.content,mergeProgress(state?.records||{},{...openingPatch,...progressSync.getPending(id)}),location.origin);activeCourse=id;el('viewer-title').textContent=material.content.title;el('viewer').hidden=false;setAccessExpiry(access.expires_at);scheduleRenewal(access.ttl);el('viewer-access-status').textContent=progressSync.count()?'Tienes avance pendiente de sincronizar. Se mantiene tu copia en este navegador.':'✓ Avance guardado en tu cuenta. Explora con un adulto.';try{localStore.setItem('campo-infantil-last:'+user.id,id);}catch{}status('');}catch(e){closeCourse();status(e.message);}finally{opening=false;}}



function chileToday(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago'}).format(new Date());}
async function loadSalesMetrics(){const {data,error}=await sb.from('infantil_sales_metrics').select('day,course_id,channel,qualified_contacts,buyers').order('day',{ascending:false}).limit(90);const area=el('sales-summary');area.replaceChildren();if(error){area.append(node('p','No se pudo cargar el registro comercial. Intenta nuevamente.'));return;}const total=(data||[]).reduce((a,r)=>({contacts:a.contacts+r.qualified_contacts,buyers:a.buyers+r.buyers}),{contacts:0,buyers:0});area.append(node('p',total.contacts+' consultas calificadas y '+total.buyers+' compradores registrados en las últimas '+(data?.length||0)+' filas. Son cifras ingresadas manualmente.'));if(!data?.length)area.append(node('p','Todavía no hay registros. No se cuentan clics como consultas.'));else{const t=node('table'),h=node('tr');['Fecha','Curso','Canal','Consultas','Compradores'].forEach(s=>h.append(node('th',s)));t.append(h);for(const r of data){const row=node('tr');[r.day,courses.find(c=>c.id===r.course_id)?.title||r.course_id,r.channel,r.qualified_contacts,r.buyers].forEach(v=>row.append(node('td',String(v))));t.append(row);}const wrap=node('div');wrap.className='table-wrap';wrap.append(t);area.append(wrap);}const select=el('sales-course');select.replaceChildren();for(const c of courses){const option=node('option',c.title);option.value=c.id;select.append(option);}if(!el('sales-day').value)el('sales-day').value=chileToday();}
el('sales-form').addEventListener('submit',async event=>{event.preventDefault();event.submitter.disabled=true;try{const contacts=Number(el('sales-contacts').value),buyers=Number(el('sales-buyers').value);if(!Number.isInteger(contacts)||contacts<0||!Number.isInteger(buyers)||buyers<0)throw Error('Usa cantidades enteras mayores o iguales a cero.');const {error}=await sb.from('infantil_sales_metrics').upsert({day:el('sales-day').value,course_id:el('sales-course').value,channel:el('sales-channel').value,qualified_contacts:contacts,buyers,recorded_by:user.id,updated_at:new Date().toISOString()},{onConflict:'day,course_id,channel'});if(error)throw error;await loadSalesMetrics();status('Registro comercial guardado. Una misma fecha, curso y canal actualiza la fila anterior.');}catch(e){status(e.message||'No se guardó el registro.');}finally{event.submitter.disabled=false;}});

