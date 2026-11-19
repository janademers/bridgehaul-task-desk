import ts from 'typescript';import fs from 'node:fs';import assert from 'node:assert/strict';
const source=ts.transpileModule(fs.readFileSync('app/lib/recurrence.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {dueDate}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const due=(schedule,month)=>dueDate({frequency:'Monthly',schedule},month+'-01');
assert.equal(due('DAY:5','2026-12'),'2026-12-05');assert.equal(due('DAY:31','2027-02'),'2027-02-28');assert.equal(due('DAY:31','2028-02'),'2028-02-29');assert.equal(due('NTH:last:3','2026-11'),'2026-11-25');assert.equal(due('NTH:1:1','2026-11'),'2026-11-02');assert.equal(due('NTH:4:5','2026-11'),'2026-11-27');assert.equal(due('BOM','2026-11'),'2026-11-02');assert.equal(due('EOM','2026-11'),'2026-11-30');console.log('Monthly dates, weekend dates, short/leap months, nth/last weekdays and existing BOM/EOM passed.');
