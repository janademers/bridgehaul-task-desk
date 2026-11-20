export function updateTaskStatus(task,status){
 if(!task?.active||task.archivedAt||task.deletedAt)throw Error('This task is not active.');
 if(!['Not Started','In Progress','Delayed'].includes(status))throw Error('Choose a valid task status.');
 if(task.status==='Completed')throw Error('Completed tasks keep their completion record until the next cycle.');
 if(status==='Not Started'&&Object.keys(task.runCompletions||{}).length)throw Error('This task already has completed runs. Choose In Progress or Delayed.');
 return {...task,status};
}
