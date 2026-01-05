const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = 5000;

// -------------------- MIDDLEWARE --------------------
app.use(cors());
app.use(express.json());

// -------------------- DATABASE --------------------
const dbPath = path.join(__dirname, "database.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Database connection error:", err.message);
  } else {
    console.log("Connected to SQLite database");
  }
});

// -------------------- TABLES --------------------
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      subject_id INTEGER,
      completed INTEGER DEFAULT 0,
      due_date TEXT,
      FOREIGN KEY (subject_id) REFERENCES subjects(id)
    )
  `);
});

// -------------------- HEALTH CHECK --------------------
app.get("/", (req, res) => {
  res.json({ message: "CampusFlow backend running 🚀" });
});

// ==================== SUBJECTS ====================

// Get all subjects
app.get("/subjects", (req, res) => {
  db.all("SELECT * FROM subjects", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Create subject
app.post("/subjects", (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Subject name is required" });
  }

  db.run(
    "INSERT INTO subjects (name) VALUES (?)",
    [name],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, name });
    }
  );
});

// Delete subject
app.delete("/subjects/:id", (req, res) => {
  db.run(
    "DELETE FROM subjects WHERE id = ?",
    [req.params.id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ deleted: this.changes });
    }
  );
});

// ==================== TASKS ====================

// Get all tasks
app.get("/tasks", (req, res) => {
  db.all("SELECT * FROM tasks", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Create task
app.post("/tasks", (req, res) => {
  const { title, subject_id = null, due_date = null } = req.body;

  if (!title) {
    return res.status(400).json({ error: "Task title is required" });
  }

  db.run(
    `
    INSERT INTO tasks (title, subject_id, due_date)
    VALUES (?, ?, ?)
    `,
    [title, subject_id, due_date],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({
        id: this.lastID,
        title,
        subject_id,
        completed: 0,
        due_date,
      });
    }
  );
});

// Toggle task completion
app.put("/tasks/:id", (req, res) => {
  db.run(
    `
    UPDATE tasks
    SET completed = CASE completed WHEN 0 THEN 1 ELSE 0 END
    WHERE id = ?
    `,
    [req.params.id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ updated: this.changes });
    }
  );
});

// Delete task
app.delete("/tasks/:id", (req, res) => {
  db.run(
    "DELETE FROM tasks WHERE id = ?",
    [req.params.id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ deleted: this.changes });
    }
  );
});

// -------------------- START SERVER --------------------
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
