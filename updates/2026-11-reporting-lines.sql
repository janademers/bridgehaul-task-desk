CREATE TABLE IF NOT EXISTS staff_reporting (
 employee_id TEXT NOT NULL,
 manager_id TEXT NOT NULL,
 PRIMARY KEY(employee_id, manager_id),
 CHECK(employee_id <> manager_id)
);
CREATE INDEX IF NOT EXISTS staff_reporting_manager ON staff_reporting(manager_id);
CREATE TRIGGER IF NOT EXISTS staff_reporting_no_cycle
BEFORE INSERT ON staff_reporting
BEGIN
 SELECT RAISE(ABORT,'Circular reporting relationship')
 WHERE EXISTS (
  WITH RECURSIVE managers(id) AS (
   SELECT NEW.manager_id
   UNION
   SELECT r.manager_id FROM staff_reporting r JOIN managers m ON r.employee_id=m.id
  ) SELECT 1 FROM managers WHERE id=NEW.employee_id
 );
END;
