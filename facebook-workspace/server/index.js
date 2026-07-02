const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { WebSocketServer } = require('ws');

const app = express();
const PORT = 3099;
const DATA_DIR = path.join(__dirname, '..', 'data');
const STATE_FILE = path.join(__dirname, 'state.json');
const LOG_FILE = path.join(DATA_DIR, 'logs', 'actions.jsonl');
const TASKS_DIR = path.join(DATA_DIR, 'tasks');

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..', 'dashboard')));

// ─── Ensure dirs ───
[DATA_DIR, path.join(DATA_DIR, 'logs'), TASKS_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

// ─── State helpers ───
function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return {}; }
}
function writeState(s) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
  broadcast({ type: 'state', state: s });
}

// ─── Log helpers ───
function logAction(action) {
  const entry = { ...action, timestamp: new Date().toISOString(), id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) };
  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
  broadcast({ type: 'log', entry });
  return entry;
}
function readLogs(limit = 100) {
  try {
    const lines = fs.readFileSync(LOG_FILE, 'utf8').trim().split('\n').filter(Boolean);
    return lines.slice(-limit).map(l => JSON.parse(l)).reverse();
  } catch { return []; }
}

// ─── Task helpers ───
function createTask(task) {
  const t = { ...task, id: Date.now().toString(36), status: 'pending', created: new Date().toISOString(), updated: new Date().toISOString() };
  fs.writeFileSync(path.join(TASKS_DIR, `${t.id}.json`), JSON.stringify(t, null, 2));
  broadcast({ type: 'task', task: t });
  return t;
}
function getTasks() {
  try {
    return fs.readdirSync(TASKS_DIR).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(path.join(TASKS_DIR, f), 'utf8')));
  } catch { return []; }
}

// ─── WebSocket ───
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const clients = new Set();
wss.on('connection', ws => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
});
function broadcast(msg) {
  clients.forEach(c => { try { c.send(JSON.stringify(msg)); } catch {} });
}

// ─── APIs ───

// State
app.get('/api/state', (req, res) => res.json(readState()));
app.put('/api/state', (req, res) => {
  const s = readState();
  Object.assign(s, req.body);
  writeState(s);
  logAction({ type: 'state_update', target: 'state', status: 'success' });
  res.json(s);
});

// Page
app.get('/api/page', (req, res) => {
  const state = readState();
  res.json(state.page);
});
app.get('/api/page/:id', (req, res) => {
  const state = readState();
  res.json(req.params.id === 'gamebox' ? state.gaming_page : state.page);
});
app.put('/api/page/:id', (req, res) => {
  const state = readState();
  const target = req.params.id === 'gamebox' ? 'gaming_page' : 'page';
  Object.assign(state[target], req.body);
  writeState(state);
  logAction({ type: 'page_update', target, status: 'success' });
  res.json(state[target]);
});

// Logs
app.get('/api/logs', (req, res) => res.json(readLogs(parseInt(req.query.limit) || 100)));
app.post('/api/logs', (req, res) => {
  const entry = logAction(req.body);
  res.json(entry);
});

// Tasks
app.get('/api/tasks', (req, res) => res.json(getTasks()));
app.post('/api/tasks', (req, res) => {
  const t = createTask(req.body);
  res.json(t);
});
app.put('/api/tasks/:id', (req, res) => {
  const fp = path.join(TASKS_DIR, `${req.params.id}.json`);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'not found' });
  const t = JSON.parse(fs.readFileSync(fp, 'utf8'));
  Object.assign(t, req.body, { updated: new Date().toISOString() });
  fs.writeFileSync(fp, JSON.stringify(t, null, 2));
  broadcast({ type: 'task', task: t });
  logAction({ type: 'task_update', target: req.params.id, status: t.status });
  res.json(t);
});
app.delete('/api/tasks/:id', (req, res) => {
  const fp = path.join(TASKS_DIR, `${req.params.id}.json`);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
  res.json({ ok: true });
});

// Campaigns
app.get('/api/campaigns', (req, res) => {
  const state = readState();
  res.json(state.campaigns || []);
});
app.post('/api/campaigns', (req, res) => {
  const state = readState();
  const c = { ...req.body, id: Date.now().toString(36), status: 'draft', created: new Date().toISOString() };
  state.campaigns = state.campaigns || [];
  state.campaigns.push(c);
  writeState(state);
  logAction({ type: 'campaign_create', target: c.id, status: 'draft' });
  res.json(c);
});
app.put('/api/campaigns/:id', (req, res) => {
  const state = readState();
  const idx = (state.campaigns || []).findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  Object.assign(state.campaigns[idx], req.body);
  writeState(state);
  logAction({ type: 'campaign_update', target: req.params.id, status: req.body.status });
  res.json(state.campaigns[idx]);
});
app.delete('/api/campaigns/:id', (req, res) => {
  const state = readState();
  state.campaigns = (state.campaigns || []).filter(c => c.id !== req.params.id);
  writeState(state);
  logAction({ type: 'campaign_delete', target: req.params.id, status: 'deleted' });
  res.json({ ok: true });
});

// Contacts / conversations
app.get('/api/contacts', (req, res) => {
  try {
    const cf = path.join(DATA_DIR, '..', 'contacts.json');
    const data = JSON.parse(fs.readFileSync(cf, 'utf8'));
    res.json(data.saved_conversations || []);
  } catch { res.json([]); }
});

// Analytics
app.get('/api/analytics', (req, res) => {
  const state = readState();
  res.json(state.analytics || {});
});
app.put('/api/analytics', (req, res) => {
  const state = readState();
  Object.assign(state.analytics, req.body, { last_updated: new Date().toISOString() });
  writeState(state);
  res.json(state.analytics);
});

// ─── NL Command endpoint ───
app.post('/api/command', async (req, res) => {
  const { command } = req.body;
  if (!command) return res.status(400).json({ error: 'no command' });

  const cmd = command.toLowerCase();
  let response = { understood: true, action: null, target: null, needs_confirmation: false };

  // Parse page reference
  let pageId = 'smart';
  if (cmd.includes('gamebox') || cmd.includes('game box') || cmd.includes('جيم')) pageId = 'gamebox';
  if (cmd.includes('smart link') || cmd.includes('الربط')) pageId = 'smart';

  response.target = pageId;

  // Post/story
  if (cmd.includes('publish') || cmd.includes('post') || cmd.includes('انشر') || cmd.includes('منشور')) {
    response.action = 'publish_post';
    response.needs_confirmation = true;
  }
  if (cmd.includes('story') || cmd.includes('ستوري') || cmd.includes('قصة')) {
    response.action = 'publish_story';
    response.needs_confirmation = true;
  }

  // Message
  if (cmd.includes('message') || cmd.includes('رسالة') || cmd.includes('reply') || cmd.includes('رد')) {
    response.action = 'send_message';
    response.needs_confirmation = cmd.includes('bulk') || cmd.includes('all') || cmd.includes('كل');
  }

  // Campaign
  if (cmd.includes('campaign') || cmd.includes('حملة') || cmd.includes('ad') || cmd.includes('إعلان')) {
    response.action = 'create_campaign';
  }

  // Analytics
  if (cmd.includes('analytics') || cmd.includes('تحليلات') || cmd.includes('insights') || cmd.includes('report') || cmd.includes('تقرير')) {
    response.action = 'show_analytics';
    response.needs_confirmation = false;
  }

  // Bio/update
  if (cmd.includes('update') || cmd.includes('edit') || cmd.includes('bio') || cmd.includes('تحديث') || cmd.includes('تعديل')) {
    response.action = 'update_page';
    response.needs_confirmation = true;
  }

  // Schedule
  if (cmd.includes('schedule') || cmd.includes('جدول') || cmd.includes('خطة')) {
    response.action = 'schedule_content';
  }

  // Create task for execution
  const task = createTask({ title: command, type: response.action, target: response.target, status: 'pending', needs_confirmation: response.needs_confirmation });
  response.task = task;

  logAction({ type: 'command', target: command, status: 'parsed', action: response.action });

  res.json(response);
});

// ─── Serve dashboard ───
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, '..', 'dashboard', 'index.html'));
});

server.listen(PORT, () => {
  console.log(`\x1b[36m■ Facebook Control Center running at http://localhost:${PORT}\x1b[0m`);
  console.log(`\x1b[2m  API: http://localhost:${PORT}/api/state\x1b[0m`);
  console.log(`\x1b[2m  WS:  ws://localhost:${PORT}\x1b[0m`);
});
