import ts from 'typescript';import fs from 'node:fs';import assert from 'node:assert/strict';
const people=[{id:'e',name:'Employee',email:'e@test.com',active:1},{id:'a',name:'Manager A',email:'a@test.com',active:1},{id:'b',name:'Manager B',email:'b@test.com',active:1},{id:'c',name:'Senior',email:'c@test.com',active:1},{id:'u',name:'Unrelated',email:'u@test.com',active:1},{id:'x',name:'Inactive',email:'x@test.com',active:0}];
let lines=[{employee_id:'e',manager_id:'a'},{employee_id:'e',manager_id:'b'},{employee_id:'a',manager_id:'c'}];
const tasks=people.map(p=>({id:p.id,owner:p.name,workType:'Manual'}));
globalThis.reportingTestHandler={fetch:async r=>r.method==='GET'?Response.json({tasks,history:tasks,staff:people,browser:tasks}):Response.json({body:await r.json(),by:r.headers.get('oai-authenticated-user-email')})};
const mod='data:text/javascript;base64,'+Buffer.from(fs.readFileSync('app/lib/reporting.mjs')).toString('base64');
let source=fs.readFileSync('worker/cloudflare.ts','utf8').replace("import handler from 'vinext/server/fetch-handler';",'const handler=globalThis.reportingTestHandler;').replace("import {verifyAccess} from './access.mjs';",'const verifyAccess=async token=>token;').replace("'../app/lib/reporting.mjs'",JSON.stringify(mod));
const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText).toString('base64'));
const env={ADMIN_EMAILS:'admin@test.com',DB:{prepare(sql){return {all:async()=>({results:sql.includes('staff_reporting')?lines:people}),bind(value){return {first:async()=>sql.includes('FROM staff')?people.find(p=>p.email===value&&p.active===1):tasks.some(t=>t.id===value)?{data:JSON.stringify(tasks.find(t=>t.id===value))}:null}}}}}};
async function call(email,b,path='/api/tasks'){return worker.fetch(new Request('https://taskdesk.test'+path,{method:b?'POST':'GET',headers:{'Cf-Access-Jwt-Assertion':email,'oai-authenticated-user-email':'spoofed@test.com'},...(b?{body:JSON.stringify(b)}:{})}),env,{})}
for(const manager of ['a','b']){
 const r=await call(manager+'@test.com');const d=await r.json();assert.ok(d.tasks.some(t=>t.id==='e'));assert.ok(!d.tasks.some(t=>t.id==='u'));assert.equal(d.viewer.isManager,true);
 for(const action of ['save','complete','archive','delete','restore'])assert.equal((await call(manager+'@test.com',{action,id:'e',task:{owner:'Employee',title:'Updated'}})).status,200);
 const saved=await (await call(manager+'@test.com',{action:'create',task:{title:'Delegated',owner:'Employee',frequency:'Weekly',workType:'Automated',backup:'Unrelated'}})).json();assert.equal(saved.body.task.owner,'Employee');assert.equal(saved.body.task.workType,'Manual');assert.equal(saved.body.task.backup,'');assert.equal(saved.by,manager+'@test.com');
 assert.equal((await call(manager+'@test.com',{action:'save',id:'e',task:{owner:'Unrelated'}})).status,403);
 assert.equal((await call(manager+'@test.com',{id:'e',reportsTo:['a']},'/api/staff')).status,403);
}
for(const viewer of ['e','c','u']){const d=await (await call(viewer+'@test.com')).json();if(viewer!=='e')assert.ok(!d.tasks.some(t=>t.id==='e'));assert.equal((await call(viewer+'@test.com',{action:'save',id:viewer==='e'?'a':'e',task:{}})).status,403);}
const own=await (await call('e@test.com',{action:'create',task:{owner:'Unrelated',frequency:'Daily',title:'Self'}})).json();assert.equal(own.body.task.owner,'Employee');
assert.equal((await call('e@test.com',{action:'save',id:'e',task:{title:'Updated'}})).status,200);
assert.equal((await call('a@test.com',{action:'create',id:'e',task:{frequency:'Weekly'}})).status,400);
assert.equal((await call('x@test.com')).status,403);
lines=lines.filter(l=>l.manager_id!=='a');assert.equal((await call('a@test.com',{action:'save',id:'e',task:{}})).status,403);
assert.equal((await call('admin@test.com',{reportsTo:['a']},'/api/staff')).status,200);
console.log('Worker access tests passed for both managers, unrelated/upward access denial, employees editing themselves, assignments, create-ID protection, spoofed headers, admin-only reporting, inactive staff, and revoked access.');
