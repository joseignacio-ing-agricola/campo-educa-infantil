import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
const url=Deno.env.get('SUPABASE_URL')!;
const service=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(async req=>{
 const configuredOrigin=Deno.env.get('APP_ORIGIN');
 const requestOrigin=req.headers.get('origin');
 const allowedOrigins=new Set([configuredOrigin,'https://campo-educa.pages.dev','https://campo-educa-infantil.farias-l-jose95.workers.dev'].filter(Boolean));
 const origin=requestOrigin&&allowedOrigins.has(requestOrigin)?requestOrigin:(configuredOrigin||'https://invalid.example');
 const cors={'Access-Control-Allow-Origin':origin||'https://invalid.example','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(!configuredOrigin)return reply({error:'Configura APP_ORIGIN en el servidor.'},503);
 if(req.headers.get('origin')!==origin)return reply({error:'Origen no permitido.'},403);
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return reply({error:'Método no permitido.'},405);
 try{
  const bearer=req.headers.get('authorization')||'';if(!bearer.startsWith('Bearer '))return reply({error:'Inicia sesión.'},401);
  const {data:auth,error:authError}=await service.auth.getUser(bearer.slice(7));if(authError||!auth.user)return reply({error:'Sesión no válida.'},401);
  const {data:admin,error:roleError}=await service.from('course_admins').select('user_id').eq('user_id',auth.user.id).maybeSingle();if(roleError||!admin)return reply({error:'Solo el encargado puede administrar alumnos.'},403);
  const body=await req.json();
  const infantPortal=requestOrigin==='https://campo-educa-infantil.farias-l-jose95.workers.dev';
  if(infantPortal&&body.action==='delete_user')return reply({error:'Las cuentas son compartidas. Desde el portal infantil solo puedes retirar una matrícula infantil.'},403);
  if(infantPortal&&body.action==='set_access'&&!/^infantil-[a-z0-9-]+$/.test(String(body.course_id||'')))return reply({error:'Selecciona un curso infantil.'},400);
  if(infantPortal&&body.action==='create_user'&&(!Array.isArray(body.courses)||body.courses.some((id:unknown)=>typeof id!=='string'||!/^infantil-[a-z0-9-]+$/.test(id))))return reply({error:'Este portal solo registra matrículas infantiles.'},400);
  function expiry(){
   const unit=body.duration_unit||'unlimited';if(unit==='unlimited')return null;
   const amount=body.duration_amount;
   if(!['days','months'].includes(unit)||!Number.isInteger(amount)||amount<1||amount>(unit==='days'?3650:120))throw Error('Duración no válida');
   const d=new Date();if(unit==='days')d.setUTCDate(d.getUTCDate()+amount);
   else{const day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+amount);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));}
   return d.toISOString();
  }
  let expiresAt:string|null=null;
  if(['create_user','set_access'].includes(body.action)){try{expiresAt=expiry();}catch(_){return reply({error:'Duración no válida. Usa de 1 a 3650 días o de 1 a 120 meses.'},400);}}
  if(body.action==='delete_user'){
   if(typeof body.user_id!=='string'||body.user_id===auth.user.id)return reply({error:'No puedes eliminar tu propia cuenta.'},400);
   const {data:protectedAdmin,error:protectedError}=await service.from('course_admins').select('user_id').eq('user_id',body.user_id).maybeSingle();
   if(protectedError)throw protectedError;if(protectedAdmin)return reply({error:'No se pueden eliminar administradores.'},403);
   const {data:target,error:targetError}=await service.from('learner_profiles').select('email').eq('user_id',body.user_id).maybeSingle();
   if(targetError)throw targetError;if(!target||String(body.confirm_email||'').trim().toLowerCase()!==target.email.toLowerCase())return reply({error:'Confirma el correo del alumno.'},400);
   const {error:accessError}=await service.from('enrollments').update({active:false}).eq('user_id',body.user_id);if(accessError)throw accessError;
   const {error:banError}=await service.auth.admin.updateUserById(body.user_id,{ban_duration:'876000h'});if(banError)throw banError;
   const {error:deleteError}=await service.auth.admin.deleteUser(body.user_id);if(deleteError)return reply({error:'El acceso quedó bloqueado, pero la eliminación no se completó. Contacta al encargado técnico antes de reintentar.'},500);
   return reply({ok:true});
  }
  if(body.action==='create_user'){
   const email=String(body.email||'').trim().toLowerCase(),name=String(body.name||'').trim(),password=String(body.password||'');
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||name.length<3||name.length>100||password.length<12)return reply({error:'Revisa nombre, correo y contraseña (mínimo 12 caracteres).'},400);
   const ids=[...new Set(Array.isArray(body.courses)?body.courses:[])];if(!ids.length||ids.length>100||ids.some(id=>typeof id!=='string'||!/^[a-z0-9-]+$/.test(id)))return reply({error:'Selecciona los cursos comprados.'},400);
   const {data:courses,error:courseError}=await service.from('courses').select('id').in('id',ids).eq('active',true);if(courseError||courses?.length!==ids.length)return reply({error:'Hay cursos no disponibles.'},400);
   const {data:created,error:createError}=await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:name}});
   if(createError||!created.user)return reply({error:'No se creó la cuenta. Revisa si el correo ya existe o la política de contraseñas.'},400);
   const uid=created.user.id;
   const {error:profileError}=await service.from('learner_profiles').insert({user_id:uid,email,full_name:name});
   const {error:enrollmentError}=profileError?{error:profileError}:await service.from('enrollments').insert(ids.map(course_id=>({user_id:uid,course_id,expires_at:expiresAt,granted_by:auth.user.id})));
   if(profileError||enrollmentError){const {error:rollbackError}=await service.auth.admin.deleteUser(uid);return reply({error:rollbackError?'Registro incompleto. Revisa Auth y las matrículas antes de reintentar.':'No se guardó el registro. La cuenta creada se ha eliminado.'},500);}
   return reply({ok:true,user_id:uid});
  }
  if(body.action==='set_access'){
   if(typeof body.active!=='boolean'||typeof body.user_id!=='string'||typeof body.course_id!=='string')return reply({error:'Datos no válidos.'},400);
   const {data:learner}=await service.from('learner_profiles').select('user_id').eq('user_id',body.user_id).maybeSingle();const {data:course}=await service.from('courses').select('id').eq('id',body.course_id).maybeSingle();if(!learner||!course)return reply({error:'Alumno o curso no encontrado.'},404);
   const {error}=await service.from('enrollments').upsert({user_id:body.user_id,course_id:body.course_id,active:body.active,expires_at:expiresAt,granted_by:auth.user.id},{onConflict:'user_id,course_id'});if(error)throw error;return reply({ok:true});
  }
  return reply({error:'Acción no reconocida.'},400);
 }catch(_){return reply({error:'No se pudo completar la operación. Revisa la configuración del servidor.'},500);}
});


