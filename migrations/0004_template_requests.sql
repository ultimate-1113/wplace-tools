CREATE TABLE template_requests (
  request_key TEXT PRIMARY KEY,
  template_id TEXT NOT NULL
);
INSERT INTO template_requests SELECT request_key, id FROM templates;
