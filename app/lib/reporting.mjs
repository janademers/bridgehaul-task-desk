export const canonicalName=name=>({'John Carl':'John Carl Granados','Jeremiah':'Jeremiah Schwartz','Rosie':'Rosie Ballesteros'}[name]||name);
export function reportingScope(person,staff,lines){
 const reports=staff.filter(s=>lines.some(l=>l.employee_id===s.id&&l.manager_id===person.id));
 return {reports,visibleNames:new Set([person.name,...reports.map(s=>s.name)]),editableNames:new Set([person.name,...reports.filter(s=>s.active===1).map(s=>s.name)])};
}
export function validateReporting(employeeId,managerIds,staff,lines){
 if(!Array.isArray(managerIds)||managerIds.some(id=>typeof id!=='string'))throw Error('Choose valid reporting managers.');
 const ids=[...new Set(managerIds)];
 for(const id of ids){if(id===employeeId)throw Error('An employee cannot report to themselves.');if(!staff.some(s=>s.id===id&&s.active===1))throw Error('Choose active staff members as managers.');}
 const next=[...lines.filter(l=>l.employee_id!==employeeId),...ids.map(manager_id=>({employee_id:employeeId,manager_id}))];
 const seen=new Set();function visit(id){if(id===employeeId)throw Error('This reporting relationship would create a cycle.');if(seen.has(id))return;seen.add(id);for(const l of next.filter(l=>l.employee_id===id))visit(l.manager_id);}
 for(const id of ids)visit(id);return ids;
}
