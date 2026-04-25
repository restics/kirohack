import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { analyzeConsistency, analyzeCascade, analyzeSummary } from './llm.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

function extractOpts(body) {
  return {
    apiKey: body.apiKey || null,
    newsApiKey: body.newsApiKey || null,
  };
}

app.post('/api/consistency', async (req, res) => {
  try {
    const { event, sources } = req.body;
    if (!event || !sources?.length) {
      return res.status(400).json({ error: 'Missing event or sources' });
    }
    const opts = extractOpts(req.body);
    console.log(`[consistency] "${event.slice(0, 60)}..." (${opts.apiKey ? 'anthropic' : opts.freeModel || 'default'})`);
    const result = await analyzeConsistency(event, sources, opts);
    res.json(result);
  } catch (err) {
    console.error('[consistency] Error:', err.message);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

app.post('/api/cascade', async (req, res) => {
  try {
    const { event, sources, selectedFacts } = req.body;
    if (!event || !sources?.length) {
      return res.status(400).json({ error: 'Missing event or sources' });
    }
    const opts = extractOpts(req.body);
    console.log(`[cascade] "${event.slice(0, 60)}..." (${selectedFacts?.length ?? 0} verified facts)`);
    const result = await analyzeCascade(event, sources, opts, selectedFacts);
    res.json(result);
  } catch (err) {
    console.error('[cascade] Error:', err.message);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

app.post('/api/summary', async (req, res) => {
  try {
    const { event, sources, cascadeData } = req.body;
    if (!event || !sources?.length) {
      return res.status(400).json({ error: 'Missing event or sources' });
    }
    const opts = extractOpts(req.body);
    console.log(`[summary] "${event.slice(0, 60)}..." (${cascadeData?.sectors?.length ?? 0} sectors from cascade)`);
    const result = await analyzeSummary(event, sources, opts, cascadeData);
    res.json(result);
  } catch (err) {
    console.error('[summary] Error:', err.message);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
