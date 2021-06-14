-- This is an empty migration.
UPDATE "Sound" SET
path = regexp_replace(path, '.*/(.*)', '\1');
