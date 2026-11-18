import json,pathlib
root=pathlib.Path(__file__).resolve().parent.parent
snapshot=json.loads((root/'migration/snapshot.json').read_text())
def q(v):
 if v is None:return 'NULL'
 if isinstance(v,(int,float)):return str(v)
 return "'"+str(v).replace("'","''")+"'"
schema='\n'.join(p.read_text().replace('--> statement-breakpoint','') for p in sorted((root/'drizzle').glob('*.sql')))
sql=[schema]
for table,info in snapshot['tables'].items():
 for row in info['rows']:
  # Imported tables must be empty: duplicate IDs intentionally abort rather than overwrite.
  if table=='reminder_config':
   row=dict(row);runner=json.loads(row['data']);runner.pop('scheduleId',None);runner.update(lastChecked=None,emailAvailable=False,teamsAvailable=False);runner['lastResult']='Migrated snapshot. Background sender not yet connected.';row['data']=json.dumps(runner)
  sql.append('INSERT INTO "'+table+'" ('+','.join('"'+c+'"' for c in info['columns'])+') VALUES ('+','.join(q(row.get(c)) for c in info['columns'])+');')
(root/'migration/import.sql').write_text('\n'.join(sql)+'\n')
print({k:len(v['rows']) for k,v in snapshot['tables'].items()})
