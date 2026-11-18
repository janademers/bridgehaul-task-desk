import {env} from 'cloudflare:workers';
import {dueRuns,wallClock} from '../../lib/daily-runs';
import {normalizeDuty,staffAliases} from '../../lib/duty-policy';
import {roll} from '../../lib/recurrence';
export const dynamic='force-dynamic';
const json=(d:any,status=200)=>Response.json(d,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(req:Request){
 try{
  const db=env.DB!,now=new Date(),stamp=now.toISOString();
  const [tr,sr,cr]=await Promise.all([db.prepare('SELECT data FROM tasks').all<any>(),db.prepare('SELECT * FROM staff').all<any>(),db.prepare("SELECT data FROM reminder_config WHERE id='runner'").first<any>()]);
  const browser:any[]=[],skipped:any[]=[],queue:any[]=[];
  for(const row of tr.results){
   const task=roll(normalizeDuty(JSON.parse(row.data))),runs=dueRuns(task,now),name=staffAliases[task.owner]||task.owner,person=sr.results.find(s=>s.name===name&&s.active===1);
   if(!runs.length)continue;
   if(!person){skipped.push({taskId:task.id,title:task.title,reason:'No active individual owner'});continue}
   for(const run of runs){
    const base={taskId:task.id,title:task.title,owner:person.name,staffId:person.id,cycle:task.cycle,due:run.due,slotTime:run.time,program:task.program,url:new URL('/?rep='+encodeURIComponent(person.name),req.url).href};
    browser.push({...base,id:`${task.id}:${task.cycle}:${run.time}:browser`,email:person.email});
    for(const channel of ['email','teams']){
     const target=channel==='email'?person.email:person.teams_chat_id,enabled=channel==='email'?person.email_reminders:person.teams_reminders;
     if(!enabled)continue;
     if(!target){skipped.push({...base,channel,reason:'Recipient destination not set'});continue}
     const id=`${task.id}:${task.cycle}:${run.time}:${channel}`,payload={...base,channel,target,subject:'BridgeHaul task reminder: '+task.title,text:`${task.title}\nAssigned to: ${person.name}\nDue: ${run.due.replace('T',' ')} (America/Boise)\nProgram: ${task.program}\nOpen your task: ${base.url}`};
     queue.push(db.prepare(`INSERT INTO reminder_queue(id,task_id,channel,status,payload,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,status='pending' WHERE reminder_queue.status IN ('pending','cancelled')`).bind(id,task.id,channel,'pending',JSON.stringify(payload),stamp));
    }
   }
  }
  if(queue.length)await db.batch(queue);
  const qr=await db.prepare("SELECT * FROM reminder_queue WHERE status IN ('pending','sending','unknown') ORDER BY updated_at LIMIT 1000").all<any>();
  const dueIds=new Set(browser.map(r=>r.id.replace(/:browser$/,'')));
  const eligible=qr.results.filter(r=>{const p=JSON.parse(r.payload),person=sr.results.find(s=>s.id===p.staffId&&s.active===1),target=r.channel==='email'?person?.email:person?.teams_chat_id,enabled=r.channel==='email'?person?.email_reminders:person?.teams_reminders;return person&&enabled&&target===p.target&&dueIds.has(r.id.replace(/:(email|teams)$/,''))}).map(r=>({...JSON.parse(r.payload),id:r.id,status:r.status,updatedAt:r.updated_at}));
  const eligibleIds=new Set(eligible.map(r=>r.id)),cancelled=qr.results.filter(r=>r.status==='pending'&&!eligibleIds.has(r.id));
  if(cancelled.length)await db.batch(cancelled.map(r=>db.prepare("UPDATE reminder_queue SET status='cancelled',updated_at=? WHERE id=? AND status='pending'").bind(stamp,r.id)));
  const history=await db.prepare('SELECT id,channel,status,payload,updated_at FROM reminder_queue ORDER BY updated_at DESC LIMIT 50').all<any>();
  return json({pending:eligible.filter(r=>r.status==='pending'),needsReview:eligible.filter(r=>r.status!=='pending'),browser,skipped,runner:cr?JSON.parse(cr.data):null,deliveries:history.results.map(r=>({id:r.id,channel:r.channel,status:r.status,title:JSON.parse(r.payload).title,owner:JSON.parse(r.payload).owner,updatedAt:r.updated_at})),clock:wallClock(now),viewerEmail:req.headers.get('oai-authenticated-user-email')||'',timezone:'America/Boise'});
 }catch{return json({error:'Unable to load reminder settings'},500)}
}
export async function POST(req:Request){
 try{
  if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return json({error:'Invalid origin'},403);
  const db=env.DB!,b=await req.json() as any,stamp=new Date().toISOString();
  if(b.action==='runner-status'){
   const old=await db.prepare("SELECT data FROM reminder_config WHERE id='runner'").first<any>();
   const data={...(old?JSON.parse(old.data):{}),...b.data,updatedAt:stamp};
   await db.prepare("INSERT INTO reminder_config(id,data) VALUES ('runner',?) ON CONFLICT(id) DO UPDATE SET data=excluded.data").bind(JSON.stringify(data)).run();return json({ok:true,runner:data});
  }
  if(b.action==='claim'){
   if(!Array.isArray(b.ids)||b.ids.length>100||b.ids.some((x:any)=>typeof x!=='string'))return json({error:'Choose up to 100 reminder IDs'},400);
   const claim=crypto.randomUUID(),[tasks,staff,queued]=await Promise.all([db.prepare('SELECT id,data FROM tasks').all<any>(),db.prepare('SELECT * FROM staff').all<any>(),db.prepare("SELECT id,payload FROM reminder_queue WHERE status='pending'").all<any>()]);
   const allowed=queued.results.filter(row=>{
    if(!b.ids.includes(row.id))return false;
    const p=JSON.parse(row.payload),tr=tasks.results.find(t=>t.id===p.taskId),person=staff.results.find(s=>s.id===p.staffId&&s.active===1);
    if(!tr||!person)return false;
    const t=roll(normalizeDuty(JSON.parse(tr.data))),name=staffAliases[t.owner]||t.owner,target=p.channel==='email'?person.email:person.teams_chat_id,enabled=p.channel==='email'?person.email_reminders:person.teams_reminders;
    return name===person.name&&enabled&&target===p.target&&t.cycle===p.cycle&&dueRuns(t).some(run=>run.time===p.slotTime);
   });
   if(allowed.length)await db.batch(allowed.map(row=>db.prepare("UPDATE reminder_queue SET status='sending',claim=?,updated_at=? WHERE id=? AND status='pending'").bind(claim,stamp,row.id)));
   const r=await db.prepare('SELECT * FROM reminder_queue WHERE claim=?').bind(claim).all<any>();
   return json({claim,reminders:r.results.map(r=>({...JSON.parse(r.payload),id:r.id}))});
  }
  if(b.action==='record'){
   const entries=Array.isArray(b.deliveries)?b.deliveries:[b];
   if(!entries.length||entries.length>100||entries.some((r:any)=>!['sent','unknown','pending'].includes(r.status)||!r.id||!r.claim||(r.status==='sent'&&!String(r.providerReference||'').trim())))return json({error:'A valid claim, delivery state, and successful provider reference are required'},400);
   const results=await db.batch(entries.map((r:any)=>db.prepare("UPDATE reminder_queue SET status=?,updated_at=?,provider_reference=? WHERE id=? AND claim=? AND status='sending'").bind(r.status,stamp,String(r.providerReference||''),r.id,r.claim)));
   return json({ok:true,updated:results.reduce((n,r)=>n+(r.meta.changes||0),0)});
  }
  return json({error:'Invalid reminder action'},400);
 }catch{return json({error:'Unable to save reminder delivery state'},500)}
}
