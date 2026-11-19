import handler from 'vinext/server/fetch-handler';
import {verifyAccess} from './access.mjs';
import {canonicalName,reportingScope} from '../app/lib/reporting.mjs';
const deny=(message='Access required',status=403)=>Response.json({error:message},{status,headers:{'Cache-Control':'no-store'}});
export default {async fetch(request:Request,env:any,ctx:any){
 const path=new URL(request.url).pathname;
 const runner=path==='/api/reminders'&&!!env.REMINDER_RUNNER_TOKEN&&request.headers.get('Authorization')==='Bearer '+env.REMINDER_RUNNER_TOKEN;
 let email='';if(!runner){try{email=await verifyAccess(request.headers.get('Cf-Access-Jwt-Assertion'),env)}catch{return deny('Sign in through Cloudflare Access.',401)}}
 const admin=runner||String(env.ADMIN_EMAILS||'').split(',').map((s:string)=>s.trim().toLowerCase()).includes(email);
 let person:any=null,scope:any=null,staff:any[]=[];
 if(!admin){
  person=await env.DB.prepare('SELECT * FROM staff WHERE lower(trim(email))=? AND active=1').bind(email).first();if(!person)return deny('Your email is not linked to an active staff record. Contact Jana.');
  try{staff=(await env.DB.prepare('SELECT * FROM staff').all()).results;const lines=(await env.DB.prepare('SELECT employee_id,manager_id FROM staff_reporting').all()).results;scope=reportingScope(person,staff,lines)}catch{return deny('Reporting setup is incomplete. Ask your administrator to apply the reporting migration.',503)}
 }
 const manager=!admin&&scope.reports.some((s:any)=>s.active===1);
 if(!admin&&request.method!=='GET'&&request.method!=='HEAD'){
  if(path!=='/api/tasks')return deny('Only administrators can change staff or reporting relationships.');
  let b:any;try{b=await request.clone().json()}catch{return deny('Invalid request',400)}
  if(!['create','save','assign','complete','archive','restore','delete'].includes(b.action))return deny('This action requires an administrator.');
  let t:any=null;
  if(b.action==='create'){if(b.id)return deny('New tasks cannot replace existing duties.',400)}
  else{const row=await env.DB.prepare('SELECT data FROM tasks WHERE id=?').bind(b.id).first();t=row?JSON.parse(row.data):null;if(!t||t.deletedAt||!scope.editableNames.has(canonicalName(t.owner)))return deny('You can manage only your own tasks and active direct reports’ tasks.');}
  if(['create','save','assign'].includes(b.action)){
   const input=b.task||{},requested=b.action==='assign'?b.owner:input.owner;
   const owner=manager?(requested===undefined?(t?.owner||person.name):canonicalName(requested)):(t?.owner||person.name);
   if(!scope.editableNames.has(canonicalName(owner)))return deny('Choose yourself or an active direct report.');
   if(b.action==='assign')b={action:'assign',id:b.id,owner};
   else{
    const task:any={};for(const key of ['title','program','frequency','schedule','notes','duration','dailyTimes','remindersEnabled','reminderMinutes','reminderTime','status'])if(Object.prototype.hasOwnProperty.call(input,key))task[key]=input[key];
    if(b.action==='create'&&!['Daily','Weekly','Monthly','When Applicable'].includes(task.frequency))return deny('Choose a valid frequency.',400);
    task.owner=owner;task.backup=t?.backup||'';task.workType=t?.workType||'Manual';b={action:b.action,id:b.action==='create'?'':b.id,task};
   }
   request=new Request(request,{body:JSON.stringify(b)});
  }
 }
 const headers=new Headers(request.headers);for(const key of [...headers.keys()])if(key.startsWith('oai-authenticated-'))headers.delete(key);headers.set('oai-authenticated-user-email',email);
 const result=await handler.fetch(new Request(request,{headers}),env,ctx);
 if(request.method==='GET'&&result.ok&&path.startsWith('/api/')){
  if(admin)return result;
  const d:any=await result.json(),mine=(t:any)=>scope.visibleNames.has(canonicalName(t.owner));
  if(path==='/api/tasks'){d.tasks=d.tasks.filter(mine);d.history=d.history.filter(mine)}
  else if(path==='/api/staff')d.staff=staff.filter(s=>s.id===person.id||scope.reports.some((r:any)=>r.id===s.id)).map(s=>({id:s.id,name:s.name,role:s.role,active:s.active,email:s.id===person.id?s.email:undefined}));
  else if(path==='/api/reminders')return Response.json({browser:(d.browser||[]).filter((t:any)=>canonicalName(t.owner)===person.name),viewerEmail:email,clock:d.clock,timezone:d.timezone},{headers:{'Cache-Control':'no-store'}});
  else return deny();
  d.viewer={email,isAdmin:false,isManager:manager,directReportIds:scope.reports.map((s:any)=>s.id)};return Response.json(d,{headers:{'Cache-Control':'no-store'}});
 }
 return result;
}};
