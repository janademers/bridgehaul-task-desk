-- Run ONCE before deploying this update.
ALTER TABLE staff ADD COLUMN view_ids TEXT NOT NULL DEFAULT '[]';
