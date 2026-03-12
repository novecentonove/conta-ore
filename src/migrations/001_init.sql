PRAGMA foreign_keys = ON;

CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  hourly_rate REAL,
  created_at TEXT,
  archived INTEGER DEFAULT 0
);

CREATE TABLE projects (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  hourly_rate REAL,
  created_at TEXT,
  archived INTEGER DEFAULT 0,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE timesheets (
  id INTEGER PRIMARY KEY,
  project_id INTEGER,
  time_from TEXT NOT NULL,
  time_to TEXT,
  note TEXT,
  created_at TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE timer (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  project_id INTEGER,
  start_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
