-- Optional SQLite schema for persisting audit runs. The CLI does not require or use it.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS audit_runs (
  id INTEGER PRIMARY KEY,
  target TEXT NOT NULL CHECK (length(target) BETWEEN 1 AND 2048),
  tool_version TEXT NOT NULL,
  started_at TEXT NOT NULL CHECK (started_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T*Z'),
  error_count INTEGER NOT NULL CHECK (error_count >= 0),
  warning_count INTEGER NOT NULL CHECK (warning_count >= 0),
  item_count INTEGER NOT NULL CHECK (item_count >= 0)
) STRICT;

CREATE TABLE IF NOT EXISTS audit_findings (
  id INTEGER PRIMARY KEY,
  run_id INTEGER NOT NULL REFERENCES audit_runs (id) ON DELETE CASCADE,
  rule TEXT NOT NULL CHECK (length(rule) BETWEEN 1 AND 64),
  severity TEXT NOT NULL CHECK (severity IN ('error', 'warning')),
  message TEXT NOT NULL CHECK (length(message) BETWEEN 1 AND 500),
  line INTEGER CHECK (line IS NULL OR line >= 1)
) STRICT;

CREATE INDEX IF NOT EXISTS idx_audit_runs_target_started ON audit_runs (target, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_findings_run ON audit_findings (run_id);
CREATE INDEX IF NOT EXISTS idx_audit_findings_rule ON audit_findings (rule, severity);
