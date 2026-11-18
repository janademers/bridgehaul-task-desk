export function normalizeDuty(t:any){
  if(!t.workType)t.workType=t.owner==='Automation'?'Automated':/^Part Automated/i.test(t.notes||'')?'Partially automated':'Manual';
  if(t.archivedAt||t.deletedAt)t.active=false;
  if(t.workType==='Automated')t.active=false;
  return t;
}
export const staffAliases:Record<string,string>={'John Carl':'John Carl Granados','Jeremiah':'Jeremiah Schwartz','Rosie':'Rosie Ballesteros'};
export function inactiveAssignment(name:string,staff:any[]){name=name.trim();const canonical=Object.entries(staffAliases).find(([alias])=>alias.toLowerCase()===name.toLowerCase())?.[1]||name;return staff.some(s=>s.active===0&&s.name.toLowerCase()===canonical.toLowerCase());}
