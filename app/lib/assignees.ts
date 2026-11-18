import {staffAliases} from './duty-policy';
export const assignmentGroups=['Ops','Billing & Collections','CSM Team','Underwriting Team'];
export function resolveAssignee(value:unknown,staff:any[]){
 if(typeof value!=='string')throw new Error('Choose a staff member.');
 const input=value.trim();
 if(input==='Unassigned')return input;
 const alias=Object.entries(staffAliases).find(([name])=>name.toLowerCase()===input.toLowerCase())?.[1]||input;
 const person=staff.find(s=>s.name.toLowerCase()===alias.toLowerCase());
 if(person){if(person.active===0)throw new Error('This staff member is inactive. Choose active staff.');return person.name;}
 const group=assignmentGroups.find(s=>s.toLowerCase()===input.toLowerCase());
 if(group)return group;
 throw new Error('Choose an active staff member from the assignment list.');
}
