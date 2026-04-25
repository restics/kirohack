import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { analyzeConsistency, analyzeCascade, analyzeSummary } from './llm.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.post('/api/consistency', async (req, res) => {
  try {
    const { event, sources } = req.body;
    if (!event || !sources?.length) {
      return res.status(400).json({ error: 'Missing event or sources' });
    }
    console.log(`[consistency] Analyzing: "${event.slice(0, 80)}..." with ${sources.length} sources`);
    const result = await analyzeConsistency(event, sources);
    res.json(result);
  } catch (err) {
    console.error('[consistency] Error:', err.message);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

app.post('/api/cascade', async (req, res) => {
  try {
    const { event, sources } = req.body;
    if (!event || !sources?.length) {
      return res.status(400).json({ error: 'Missing event or sources' });
    }
    console.log(`[cascade] Analyzing: "${event.slice(0, 80)}..."`);
    const result = await analyzeCascade(event, sources);
    res.json(result);
  } catch (err) {
    console.error('[cascade] Error:', err.message);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

app.post('/api/summary', async (req, res) => {
  try {
    const { event, sources } = req.body;
    if (!event || !sources?.length) {
      return res.status(400).json({ error: 'Missing event or sources' });
    }
    console.log(`[summary] Analyzing: "${event.slice(0, 80)}..."`);
    const result = await analyzeSummary(event, sources);
    res.json(result);
  } catch (err) {
    console.error('[summary] Error:', err.message);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
