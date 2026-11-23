CREATE TABLE templates (
  id TEXT PRIMARY KEY,
  request_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  source TEXT NOT NULL,
  official INTEGER NOT NULL DEFAULT 0 CHECK (official IN (0,1))
);
CREATE INDEX templates_catalog ON templates(official,name,id);
