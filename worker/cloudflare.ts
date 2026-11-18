import handler from 'vinext/server/fetch-handler';
import {verifyAccess} from './access.mjs';
const deny=(message='Access required',status=403)=>Response.json({error:message},{status,headers:{'Cache-Control':'no-store'}});
export default {async fetch(request:Request,env:any,ctx:any){
 const path=new URL(request.url).pathname;
 // A dedicated runner secret is accepted only for the reminders endpoint.
 const runner=path==='/api/reminders'&&!!env.REMINDER_RUNNER_TOKEN&&request.headers.get('Authorization')==='Bearer '+env.REMINDER_RUNNER_TOKEN;
 let email='';if(!runner){try{email=await verifyAccess(request.headers.get('Cf-Access-Jwt-Assertion'),env)}catch{return deny('Sign in through Cloudflare Access. The app must have a valid Access audience configured.',401)}}
 const admin=runner||String(env.ADMIN_EMAILS||'').split(',').map((s:string)=>s.trim().toLowerCase()).includes(email);
 let person:any=null;if(!admin){person=await env.DB.prepare('SELECT * FROM staff WHERE lower(trim(email))=? AND active=1').bind(email).first();if(!person)return deny('Your email is not linked to an active staff record. Contact Jana.');}
 if(!admin&&request.method!=='GET'&&request.method!=='HEAD'){
  if(path!=='/api/tasks')return deny('Only managers can change these settings.');
  let b:any;try{b=await request.clone().json()}catch{return deny('Invalid request',400)}
  if(b.action!=='complete')return deny('Only managers can edit duties.');
  const row=await env.DB.prepare('SELECT data FROM tasks WHERE id=?').bind(b.id).first();const t=row?JSON.parse(row.data):null;
  const aliases:any={'John Carl':'John Carl Granados','Jeremiah':'Jeremiah Schwartz','Rosie':'Rosie Ballesteros'};
  if(!t||t.deletedAt||t.archivedAt||(aliases[t.owner]||t.owner)!==person.name)return deny('You can complete only your assigned duties.');
 }
 const headers=new Headers(request.headers);for(const key of [...headers.keys()])if(key.startsWith('oai-authenticated-'))headers.delete(key);headers.set('oai-authenticated-user-email',email);
 const result=await handler.fetch(new Request(request,{headers}),env,ctx);
 if(!admin&&request.method==='GET'&&result.ok&&path.startsWith('/api/')){
  const d:any=await result.json();const aliases:any={'John Carl':'John Carl Granados','Jeremiah':'Jeremiah Schwartz','Rosie':'Rosie Ballesteros'};const mine=(t:any)=>(aliases[t.owner]||t.owner)===person.name;
  if(path==='/api/tasks'){d.tasks=d.tasks.filter(mine);d.history=d.history.filter(mine)}
  else if(path==='/api/staff')d.staff=[{id:person.id,name:person.name,role:person.role,active:person.active,email:person.email}];
  else if(path==='/api/reminders')return Response.json({browser:(d.browser||[]).filter(mine),viewerEmail:email,clock:d.clock,timezone:d.timezone},{headers:{'Cache-Control':'no-store'}});
  else return deny();
  d.viewer={email,isAdmin:false};return Response.json(d,{headers:{'Cache-Control':'no-store'}});
 }
 return result;
}};
