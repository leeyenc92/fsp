const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Database setup - use in-memory database for Render (ephemeral storage)
const dbPath = process.env.NODE_ENV === 'production' ? ':memory:' : './fsps.db';
const db = new sqlite3.Database(dbPath);

// Initialize database tables
db.serialize(() => {
  // Components table
  db.run(`CREATE TABLE IF NOT EXISTS components (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    part_number TEXT UNIQUE NOT NULL,
    description TEXT,
    installation_guide TEXT,
    sequence_order INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Installation sessions table
  db.run(`CREATE TABLE IF NOT EXISTS installation_sessions (
    id TEXT PRIMARY KEY,
    worker_id TEXT NOT NULL,
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME,
    status TEXT DEFAULT 'in_progress',
    total_components INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0
  )`);

  // Installation logs table
  db.run(`CREATE TABLE IF NOT EXISTS installation_logs (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    component_id TEXT NOT NULL,
    scan_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    install_time DATETIME,
    sequence_order INTEGER,
    status TEXT DEFAULT 'scanned',
    error_message TEXT,
    FOREIGN KEY (session_id) REFERENCES installation_sessions (id),
    FOREIGN KEY (component_id) REFERENCES components (id)
  )`);

  // Add install_time column if it doesn't exist (for existing databases)
  db.run("PRAGMA table_info(installation_logs)", (err, rows) => {
    if (!err && rows) {
      const hasInstallTime = rows.some(row => row.name === 'install_time');
      if (!hasInstallTime) {
        db.run("ALTER TABLE installation_logs ADD COLUMN install_time DATETIME", (err) => {
          if (err) {
            console.log('Note: install_time column already exists or could not be added');
          } else {
            console.log('Added install_time column to existing installation_logs table');
          }
        });
      }
    }
  });

  // Workers table
  db.run(`CREATE TABLE IF NOT EXISTS workers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    employee_id TEXT UNIQUE NOT NULL,
    department TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Insert sample components if table is empty OR reset to ensure consistency
  db.get("SELECT COUNT(*) as count FROM components", (err, row) => {
    if (row.count === 0 || process.env.RESET_DB === 'true') {
      // Clear existing components if reset is requested
      if (process.env.RESET_DB === 'true') {
        db.run("DELETE FROM components", (err) => {
          if (err) console.log('Note: Could not clear components table');
        });
        db.run("DELETE FROM installation_sessions", (err) => {
          if (err) console.log('Note: Could not clear sessions table');
        });
        db.run("DELETE FROM installation_logs", (err) => {
          if (err) console.log('Note: Could not clear logs table');
        });
        console.log('Database reset requested - cleared existing data');
      }
      
      const sampleComponents = [
        ['comp-001', 'Papan Asas', 'PA-001', 'Papan asas utama untuk pemasangan', '1. Bersihkan permukaan\n2. Sejajarkan dengan lubang pemasangan\n3. Kencangkan dengan 4 bolt M8\n4. Tork kepada 45 Nm', 1],
        ['comp-002', 'Pemegang Motor', 'PM-002', 'Bracket pemasangan motor', '1. Letakkan pada papan asas\n2. Sejajarkan dengan aci motor\n3. Kencangkan dengan 2 bolt M6\n4. Periksa penjajaran', 2],
        ['comp-003', 'Tali Pemacu', 'TP-003', 'Tali penghantaran kuasa', '1. Laluan tali di sekeliling takal\n2. Laraskan ketegangan\n3. Sahkan penjajaran\n4. Periksa keadaan tali', 3],
        ['comp-004', 'Panel Kawalan', 'PK-004', 'Antara muka kawalan utama', '1. Pasang ke kawasan yang ditetapkan\n2. Sambungkan kabel kuasa\n3. Sambungkan kabel isyarat\n4. Uji fungsi', 4],
        ['comp-005', 'Pelindung Keselamatan', 'PK-005', 'Penutup keselamatan pelindung', '1. Letakkan di atas bahagian bergerak\n2. Kencangkan dengan kunci\n3. Sahkan jarak bebas\n4. Uji suis keselamatan', 5]
      ];

      const stmt = db.prepare("INSERT INTO components (id, name, part_number, description, installation_guide, sequence_order) VALUES (?, ?, ?, ?, ?, ?)");
      sampleComponents.forEach(comp => stmt.run(comp));
      stmt.finalize();
      console.log('Sample components inserted/updated');
    }
  });

  // Insert sample workers if table is empty
  db.get("SELECT COUNT(*) as count FROM workers", (err, row) => {
    if (row.count === 0) {
             const sampleWorkers = [
         ['worker-001', 'Ahmad bin Ismail', 'EMP001', 'Pemasangan'],
         ['worker-002', 'Siti binti Rahman', 'EMP002', 'Kawalan Kualiti'],
         ['worker-003', 'Raj Kumar a/l Muthu', 'EMP003', 'Pemasangan'],
         ['worker-004', 'Lim Wei Chen', 'EMP004', 'Penyelenggaraan'],
         ['worker-005', 'Fatimah binti Omar', 'EMP005', 'Kawalan Kualiti']
       ];

      const stmt = db.prepare("INSERT INTO workers (id, name, employee_id, department) VALUES (?, ?, ?, ?)");
      sampleWorkers.forEach(worker => stmt.run(worker));
      stmt.finalize();
    }
  });
});

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes

// Get all components
app.get('/api/components', (req, res) => {
  db.all("SELECT * FROM components ORDER BY sequence_order", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get component by part number
app.get('/api/components/:partNumber', (req, res) => {
  db.get("SELECT * FROM components WHERE part_number = ?", [req.params.partNumber], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Component not found' });
      return;
    }
    res.json(row);
  });
});

// Get all workers
app.get('/api/workers', (req, res) => {
  db.all("SELECT * FROM workers", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Start new installation session
app.post('/api/sessions', (req, res) => {
  const { worker_id } = req.body;
  const session_id = uuidv4();
  
  db.run("INSERT INTO installation_sessions (id, worker_id) VALUES (?, ?)", 
    [session_id, worker_id], 
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ 
        session_id, 
        worker_id, 
        start_time: moment().format(),
        status: 'in_progress' 
      });
    }
  );
});

// Scan component
app.post('/api/sessions/:sessionId/scan', (req, res) => {
  const { sessionId } = req.params;
  const { partNumber } = req.body;
  
  // Get component details
  db.get("SELECT * FROM components WHERE part_number = ?", [partNumber], (err, component) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!component) {
      res.status(404).json({ error: 'Component not found' });
      return;
    }

    // Get current session
    db.get("SELECT * FROM installation_sessions WHERE id = ?", [sessionId], (err, session) => {
      if (err || !session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

              // Check if component was already scanned or installed
        db.get("SELECT * FROM installation_logs WHERE session_id = ? AND component_id = ?", 
          [sessionId, component.id], (err, existingLog) => {
          if (existingLog) {
            if (existingLog.status === 'installed') {
              res.status(400).json({ 
                error: 'Component already installed',
                component: component,
                isAlreadyInstalled: true
              });
            } else if (existingLog.status === 'sequence_error') {
              // Component was previously scanned with sequence error - block it
              res.status(400).json({ 
                error: 'Component was previously scanned with sequence error',
                component: component,
                isSequenceError: true,
                errorMessage: existingLog.error_message
              });
            } else {
              res.status(400).json({ 
                error: 'Component already scanned',
                component: component,
                isDuplicate: true
              });
            }
            return;
          }

          // Get last installed component to check sequence
          db.get("SELECT * FROM installation_logs WHERE session_id = ? AND status = 'installed' ORDER BY sequence_order DESC LIMIT 1", 
            [sessionId], (err, lastInstalledLog) => {
            
            // Check sequence validation
            let isSequenceCorrect = true;
            let errorMessage = null;
            let canScan = true;

            if (lastInstalledLog) {
              // Check if sequence is correct - must follow the last installed component
              if (component.sequence_order !== lastInstalledLog.sequence_order + 1) {
                isSequenceCorrect = false;
                canScan = false;
                errorMessage = `Ralat urutan: Anda mesti memasang komponen urutan ${lastInstalledLog.sequence_order} terlebih dahulu sebelum mengimbas komponen urutan ${component.sequence_order}`;
              }
            } else if (component.sequence_order !== 1) {
              isSequenceCorrect = false;
              canScan = false;
              errorMessage = `Ralat urutan: Pemasangan mesti bermula dengan komponen urutan 1, tetapi mendapat ${component.sequence_order}`;
            }

            // If sequence is incorrect, block the scan completely
            if (!isSequenceCorrect || !canScan) {
              // Log the sequence error
              const logId = uuidv4();
              db.run("INSERT INTO installation_logs (id, session_id, component_id, scan_time, sequence_order, status, error_message) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [logId, sessionId, component.id, moment().format(), component.sequence_order, 'sequence_error', errorMessage], 
                function(err) {
                  if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                  }

                  // Update session stats
                  db.run("UPDATE installation_sessions SET total_components = total_components + 1, errors_count = errors_count + 1 WHERE id = ?",
                    [sessionId]);

                  // Get wrong scans count
                  db.get("SELECT COUNT(*) as wrongScans FROM installation_logs WHERE session_id = ? AND status = 'sequence_error'", 
                    [sessionId], (err, wrongScansResult) => {
                    
                    const wrongScansCount = wrongScansResult.wrongScans;
                    const isBlocked = wrongScansCount >= 3;

                    res.json({
                      component: component,
                      isSequenceCorrect: false,
                      canScan: false,
                      errorMessage: errorMessage,
                      logId: logId,
                      scanTime: moment().format(),
                      wrongScansCount: wrongScansCount,
                      isBlocked: isBlocked,
                      showInstallationGuide: false
                    });
                  });
                }
              );
              return;
            }

            // If sequence is correct, proceed with the scan
            // Check if worker has exceeded 3 wrong scans
            db.get("SELECT COUNT(*) as wrongScans FROM installation_logs WHERE session_id = ? AND status = 'sequence_error'", 
              [sessionId], (err, wrongScansResult) => {
              
              const wrongScansCount = wrongScansResult.wrongScans;
              const isBlocked = wrongScansCount >= 3;

              // Log the successful scan
              const logId = uuidv4();
              db.run("INSERT INTO installation_logs (id, session_id, component_id, scan_time, sequence_order, status, error_message) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [logId, sessionId, component.id, moment().format(), component.sequence_order, 'scanned', null], 
                function(err) {
                  if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                  }

                  // Update session stats
                  db.run("UPDATE installation_sessions SET total_components = total_components + 1, errors_count = errors_count + 0 WHERE id = ?",
                    [sessionId]);

                  res.json({
                    component: component,
                    isSequenceCorrect: true,
                    canScan: true,
                    errorMessage: null,
                    logId: logId,
                    scanTime: moment().format(),
                    wrongScansCount: wrongScansCount,
                    isBlocked: isBlocked,
                    showInstallationGuide: !isBlocked
                  });
                }
              );
            });
          });




      });
    });
  });
});

// Mark component as installed
app.post('/api/sessions/:sessionId/install', (req, res) => {
  const { sessionId } = req.params;
  const { componentId } = req.body;
  
  // Get current session
  db.get("SELECT * FROM installation_sessions WHERE id = ?", [sessionId], (err, session) => {
    if (err || !session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Get the component log
    db.get("SELECT * FROM installation_logs WHERE session_id = ? AND component_id = ? AND status = 'scanned'", 
      [sessionId, componentId], (err, log) => {
      if (err || !log) {
        res.status(404).json({ error: 'Component not found or not scanned' });
        return;
      }

      // Update status to installed with install_time
      db.run("UPDATE installation_logs SET status = 'installed', install_time = ? WHERE id = ?", 
        [moment().format(), log.id], function(err) {
        if (err) {
          // If install_time field doesn't exist, try without it
          db.run("UPDATE installation_logs SET status = 'installed' WHERE id = ?", 
            [log.id], function(err2) {
            if (err2) {
              res.status(500).json({ error: err2.message });
              return;
            }
            res.json({ 
              message: 'Component marked as installed',
              componentId: componentId,
              installTime: moment().format()
            });
          });
          return;
        }

        res.json({ 
          message: 'Component marked as installed',
          componentId: componentId,
          installTime: moment().format()
        });
      });
    });
  });
});

// Get session logs
app.get('/api/sessions/:sessionId/logs', (req, res) => {
  const { sessionId } = req.params;
  
  db.all(`SELECT il.*, c.name, c.part_number, c.sequence_order 
           FROM installation_logs il 
           JOIN components c ON il.component_id = c.id 
           WHERE il.session_id = ? 
           ORDER BY il.scan_time`, [sessionId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Complete session
app.put('/api/sessions/:sessionId/complete', (req, res) => {
  const { sessionId } = req.params;
  
  db.run("UPDATE installation_sessions SET end_time = ?, status = 'completed' WHERE id = ?",
    [moment().format(), sessionId], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: 'Session completed successfully' });
    }
  );
});

// Get session statistics
app.get('/api/sessions/:sessionId/stats', (req, res) => {
  const { sessionId } = req.params;
  
  db.get("SELECT * FROM installation_sessions WHERE id = ?", [sessionId], (err, session) => {
    if (err || !session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    db.all("SELECT * FROM installation_logs WHERE session_id = ?", [sessionId], (err, logs) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      const stats = {
        sessionId: session.id,
        workerId: session.worker_id,
        startTime: session.start_time,
        endTime: session.end_time,
        status: session.status,
        totalComponents: session.total_components,
        errorsCount: session.errors_count,
        successRate: session.total_components > 0 ? 
          ((session.total_components - session.errors_count) / session.total_components * 100).toFixed(2) : 0,
        duration: session.end_time ? 
          moment.duration(moment(session.end_time).diff(moment(session.start_time))).asMinutes().toFixed(2) : null,
        components: logs.map(log => ({
          name: log.name,
          partNumber: log.part_number,
          sequenceOrder: log.sequence_order,
          scanTime: log.scan_time,
          status: log.status,
          errorMessage: log.error_message
        }))
      };

      res.json(stats);
    });
  });
});

// Get all sessions summary
app.get('/api/sessions', (req, res) => {
  db.all(`SELECT s.*, w.name as worker_name, w.employee_id,
           (SELECT COUNT(*) FROM installation_logs WHERE session_id = s.id) as components_installed
           FROM installation_sessions s 
           JOIN workers w ON s.worker_id = w.id 
           ORDER BY s.start_time DESC`, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Reset database for testing (development only)
app.post('/api/reset-db', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({ error: 'Database reset not allowed in production' });
    return;
  }
  
  db.serialize(() => {
    db.run("DELETE FROM installation_logs", (err) => {
      if (err) console.log('Error clearing logs:', err.message);
    });
    db.run("DELETE FROM installation_sessions", (err) => {
      if (err) console.log('Error clearing sessions:', err.message);
    });
    db.run("DELETE FROM components", (err) => {
      if (err) console.log('Error clearing components:', err.message);
    });
    db.run("DELETE FROM workers", (err) => {
      if (err) console.log('Error clearing workers:', err.message);
    });
    
    // Re-insert sample data
    setTimeout(() => {
      const sampleComponents = [
        ['comp-001', 'Papan Asas', 'PA-001', 'Papan asas utama untuk pemasangan', '1. Bersihkan permukaan\n2. Sejajarkan dengan lubang pemasangan\n3. Kencangkan dengan 4 bolt M8\n4. Tork kepada 45 Nm', 1],
        ['comp-002', 'Pemegang Motor', 'PM-002', 'Bracket pemasangan motor', '1. Letakkan pada papan asas\n2. Sejajarkan dengan aci motor\n3. Kencangkan dengan 2 bolt M6\n4. Periksa penjajaran', 2],
        ['comp-003', 'Tali Pemacu', 'TP-003', 'Tali penghantaran kuasa', '1. Laluan tali di sekeliling takal\n2. Laraskan ketegangan\n3. Sahkan penjajaran\n4. Periksa keadaan tali', 3],
        ['comp-004', 'Panel Kawalan', 'PK-004', 'Antara muka kawalan utama', '1. Pasang ke kawasan yang ditetapkan\n2. Sambungkan kabel kuasa\n3. Sambungkan kabel isyarat\n4. Uji fungsi', 4],
        ['comp-005', 'Pelindung Keselamatan', 'PK-005', 'Penutup keselamatan pelindung', '1. Letakkan di atas bahagian bergerak\n2. Kencangkan dengan kunci\n3. Sahkan jarak bebas\n4. Uji suis keselamatan', 5]
      ];
      
      const sampleWorkers = [
        ['worker-001', 'Ahmad bin Ismail', 'EMP001', 'Pemasangan'],
        ['worker-002', 'Siti binti Rahman', 'EMP002', 'Kawalan Kualiti'],
        ['worker-003', 'Raj Kumar a/l Muthu', 'EMP003', 'Pemasangan'],
        ['worker-004', 'Lim Wei Chen', 'EMP004', 'Penyelenggaraan'],
        ['worker-005', 'Fatimah binti Omar', 'EMP005', 'Kawalan Kualiti']
      ];
      
      const compStmt = db.prepare("INSERT INTO components (id, name, part_number, description, installation_guide, sequence_order) VALUES (?, ?, ?, ?, ?, ?)");
      sampleComponents.forEach(comp => compStmt.run(comp));
      compStmt.finalize();
      
      const workerStmt = db.prepare("INSERT INTO workers (id, name, employee_id, department) VALUES (?, ?, ?, ?)");
      sampleWorkers.forEach(worker => workerStmt.run(worker));
      workerStmt.finalize();
      
      console.log('Database reset completed - fresh sample data inserted');
    }, 100);
    
    res.json({ message: 'Database reset completed successfully' });
  });
});

// Serve the main application
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Factory Standard Procedure System running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
