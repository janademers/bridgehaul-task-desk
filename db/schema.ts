import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core';
export const tasks = sqliteTable('tasks', {id:text('id').primaryKey(), data:text('data').notNull()});
export const history = sqliteTable('history', {id:text('id').primaryKey(), taskId:text('task_id').notNull(), data:text('data').notNull()});
export const staff = sqliteTable('staff', {id:text('id').primaryKey(), name:text('name').notNull().unique(), role:text('role').notNull().default(''), source:text('source').notNull().default(''), active:integer('active').notNull().default(1), deactivatedAt:text('deactivated_at'), email:text('email').notNull().default(''), teamsChatId:text('teams_chat_id').notNull().default(''), teamsLabel:text('teams_label').notNull().default(''), emailReminders:integer('email_reminders').notNull().default(1), teamsReminders:integer('teams_reminders').notNull().default(1)});

export const reminderQueue=sqliteTable('reminder_queue',{id:text('id').primaryKey(),taskId:text('task_id').notNull(),channel:text('channel').notNull(),status:text('status').notNull(),payload:text('payload').notNull(),claim:text('claim'),providerReference:text('provider_reference').notNull().default(''),updatedAt:text('updated_at').notNull()});
export const reminderConfig=sqliteTable('reminder_config',{id:text('id').primaryKey(),data:text('data').notNull()});

export const staffReporting=sqliteTable('staff_reporting',{employeeId:text('employee_id').notNull(),managerId:text('manager_id').notNull()},table=>[primaryKey({columns:[table.employeeId,table.managerId]}),index('staff_reporting_manager').on(table.managerId)]);
