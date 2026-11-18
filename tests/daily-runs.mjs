import ts from 'typescript';import fs from 'node:fs';import assert from 'node:assert/strict';
async function module(path){const s=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;return import('data:text/javascript;base64,'+Buffer.from(s).toString('base64'))}
const {validTimes,runTimes,completeRun,dueRuns,wallClock}=await module('app/lib/daily-runs.ts'),{roll}=await module('app/lib/recurrence.ts');
assert.deepEqual(validTimes(['15:00','09:00','09:00','12:00']),['09:00','12:00','15:00']);
assert.throws(()=>validTimes(['25:00']));assert.deepEqual(runTimes({frequency:'Daily',dailyTimes:['']}),[]);
let duty={id:'t',active:true,owner:'Jana',frequency:'Daily',workType:'Manual',cycle:'2026-11-17',due:'2026-11-17',dailyTimes:['09:00','12:00','15:00'],status:'Not Started'};
let t=completeRun({...duty},'09:00','2026-11-17T09:01','Jana');assert.equal(t.status,'In Progress');assert.equal(t.runCompletions['09:00'].by,'Jana');assert.equal(Object.keys(t.runCompletions).length,1);
assert.deepEqual(dueRuns(t,new Date('2026-11-17T19:00:00Z')).map(r=>r.time),['12:00']);
assert.equal(dueRuns({...duty,reminderMinutes:15},new Date('2026-11-17T15:45:00Z')).length,1);
assert.equal(dueRuns({...duty,workType:'Automated'},new Date('2026-11-17T22:00:00Z')).length,0);
assert.equal(dueRuns({...duty,remindersEnabled:false},new Date('2026-11-17T22:00:00Z')).length,0);
t=completeRun(t,'12:00','2026-11-17T12:00','Jana');t=completeRun(t,'15:00','2026-11-17T15:00','Jana');assert.equal(t.status,'Completed');assert.equal(Object.keys(t.runCompletions).length,3);
let reset=roll({...t},'2026-11-18');assert.equal(reset.status,'Not Started');assert.deepEqual(reset.runCompletions,{});assert.deepEqual(reset.dailyTimes,['09:00','12:00','15:00']);
let carry=roll({...duty,runCompletions:{'09:00':{at:'2026-11-17T09:00'}},status:'In Progress'},'2026-11-18');assert.equal(carry.cycle,'2026-11-17');assert.equal(Object.keys(carry.runCompletions).length,1);
assert.equal(wallClock(new Date('2026-11-18T03:01:00Z')),'2026-11-17T20:01');
assert.equal(dueRuns({...duty,frequency:'Weekly',dailyTimes:[],reminderTime:'10:30'},new Date('2026-11-17T17:30:00Z')).length,1);
console.log('Daily slot completion, reminder times, suppression, carry-forward, and reset checks passed.');
