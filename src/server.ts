import express from 'express';
import cors from 'cors';
import * as path from 'path';
import { MultiAgentRunner } from './adk/runner';
import { SecurityEngine } from './mcp/security';

const app = express();
const PORT = process.env.PORT || 3000;

// Setup Middleware
app.use(cors());
app.use(express.json());

// Initialize Multi-Agent runner
const runner = new MultiAgentRunner();

// Serve static frontend assets in production
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));

// API 1: Run complete Multi-Agent system
app.post('/api/run', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Prompt must be a non-empty string'
    });
  }

  // Sanitize the high-level prompt
  const cleanPrompt = SecurityEngine.sanitizeInput(prompt);

  try {
    const result = await runner.runSystem(cleanPrompt);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Error occurred during agent execution',
      agentLogs: runner.getAllAgentLogs(),
      mcpLogs: runner.mcpServer.logs
    });
  }
});

// API 2: Get current execution logs
app.get('/api/logs', (req, res) => {
  res.json({
    agentLogs: runner.getAllAgentLogs(),
    mcpLogs: runner.mcpServer.logs
  });
});

// API 3: Clear all logs
app.post('/api/clear', (req, res) => {
  runner.clearLogs();
  res.json({ success: true, message: 'Logs successfully cleared' });
});

// API 4: Test single command execution
app.post('/api/execute-cli', async (req, res) => {
  const { command } = req.body;
  if (!command || typeof command !== 'string') {
    return res.status(400).json({ success: false, error: 'Command must be specified' });
  }

  try {
    const result = await runner.mcpServer.callTool('execute_safe_command', { command });
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Fallback: serve index.html for React routing
app.get('*', (req, res, next) => {
  // If requesting api routes that don't exist, return 404
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// Start express server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(` Omnix AI server listening on: http://localhost:${PORT}`);
  console.log(` System mode: Production / Serving static client`);
  console.log(`==================================================`);
});
