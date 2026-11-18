import ts from 'typescript';import fs from 'node:fs';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
const url=s=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64');
const policy=url(fs.readFileSync('app/lib/duty-policy.ts','utf8'));
const {resolveAssignee}=await import(url(fs.readFileSync('app/lib/assignees.ts','utf8').replace("'./duty-policy'",JSON.stringify(policy))));
const staff=[{name:'Shaina Short',active:1},{name:'John Carl Granados',active:1},{name:'Larry George',active:0}];
assert.equal(resolveAssignee('Unassigned',staff),'Unassigned');assert.equal(resolveAssignee('Shaina Short',staff),'Shaina Short');assert.equal(resolveAssignee(' shaina short ',staff),'Shaina Short');assert.equal(resolveAssignee('John Carl',staff),'John Carl Granados');assert.throws(()=>resolveAssignee('Larry George',staff),/inactive/);assert.throws(()=>resolveAssignee('Shaina Wrong',staff),/assignment list/);assert.throws(()=>resolveAssignee('',staff));assert.equal(resolveAssignee('Ops',staff),'Ops');
const dbTest=spawnSync('python',['-c',`import sqlite3,json
c=sqlite3.connect(':memory:')
c.execute('create table tasks(id text primary key,data text)')
t={'owner':'Unassigned','status':'In Progress','dailyTimes':['09:00','12:00'],'runCompletions':{'09:00':{'at':'2026-11-17T09:00'}},'notes':'Keep these notes','backup':'Courtney Butigan'}
c.execute('insert into tasks values (?,?)',('t',json.dumps(t)))
# Completion and schedule changes that happen before assignment must survive.
c.execute("update tasks set data=json_set(data,'$.status','Completed') where id='t'")
c.execute("update tasks set data=json_set(data,'$.owner',?) where id=?",('Shaina Short','t'))
saved=json.loads(c.execute('select data from tasks').fetchone()[0])
assert saved['owner']=='Shaina Short'
assert saved['status']=='Completed'
for key in ['dailyTimes','runCompletions','notes','backup']:assert saved[key]==t[key]
print('Owner-only SQL update preserves completion, times, notes, and backup.')
`],{encoding:'utf8'});assert.equal(dbTest.status,0,dbTest.stderr);console.log(dbTest.stdout.trim());console.log('Active, inactive, aliases, unknown staff, groups, and Unassigned checks passed.');
