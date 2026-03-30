/**
 * LeadScout - Express Server Entry Point
 * AI-powered cold email personalization from LinkedIn profiles
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Import modules (but don't initialize yet)
const db = require('./models/db');
const { initializeOpenAI } = require('./services/openai');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from public directory (for root page)
app.use(express.static(path.join(__dirname, 'public')));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// API routes
app.use('/api', apiRoutes);

// Dashboard route
app.get('/dashboard', (req, res) => {
  try {
    const stats = db.getStats();
    const generations = db.getAllGenerations(10);
    
    // Calculate average per day
    let avgPerDay = 0;
    if (stats.allTime > 0 && stats.firstGeneration) {
      const firstGen = new Date(stats.firstGeneration);
      const now = new Date();
      const daysDiff = Math.max(1, Math.ceil((now - firstGen) / (1000 * 60 * 60 * 24)));
      avgPerDay = Math.round(stats.allTime / daysDiff * 10) / 10;
    }

    // Format timestamps for display
    const formattedGenerations = generations.map(gen => ({
      ...gen,
      formattedTime: formatTimeAgo(gen.createdAt)
    }));

    // Read and render template
    const templatePath = path.join(__dirname, 'views', 'dashboard.html');
    let html = fs.readFileSync(templatePath, 'utf-8');

    // Simple template replacement for stats
    html = html.replace('{{today}}', stats.today || 0);
    html = html.replace('{{allTime}}', stats.allTime || 0);
    html = html.replace('{{avgPerDay}}', avgPerDay || 0);

    // Generate generations list HTML
    let listHtml = '';
    if (formattedGenerations.length > 0) {
      listHtml = '<ul class="generations-list">';
      formattedGenerations.forEach(gen => {
        listHtml += `
        <li class="generation-item">
          <div class="prospect-info">
            <span class="prospect-name">${escapeHtml(gen.prospectName || 'Unknown')}</span>
            <span class="prospect-company">${escapeHtml(gen.company || 'Unknown Company')}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 16px;">
            <span class="generation-time">${gen.formattedTime}</span>
            <a href="/generations/${gen.id}" class="view-link">View →</a>
          </div>
        </li>`;
      });
      listHtml += '</ul>';
    } else {
      listHtml = `
      <div class="empty-state">
        <span>📭</span>
        <p>No generations yet. Use the Chrome extension on a LinkedIn profile to get started!</p>
      </div>`;
    }

    html = html.replace('<!-- GENERATIONS_LIST -->', listHtml);

    res.send(html);

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).send('Error loading dashboard');
  }
});

// Generation detail route (human-readable view)
app.get('/generations/:id', (req, res) => {
  try {
    const generation = db.getGenerationById(req.params.id);
    
    if (!generation) {
      return res.status(404).send('Generation not found');
    }

    // Read and render template
    const templatePath = path.join(__dirname, 'views', 'generation-detail.html');
    let html = fs.readFileSync(templatePath, 'utf-8');

    // Replace basic fields
    html = html.replace('{{prospectName}}', escapeHtml(generation.prospectName || 'Unknown'));
    html = html.replace('{{company}}', escapeHtml(generation.company || 'Unknown Company'));
    html = html.replace('{{currentRole}}', escapeHtml(generation.currentRole || generation.headline || ''));
    html = html.replace('{{formattedTime}}', formatTimeAgo(generation.createdAt));

    // Generate lines HTML
    let linesHtml = '';
    if (generation.lines && generation.lines.length > 0) {
      generation.lines.forEach((line, index) => {
        const typeClass = (line.type || 'professional').toLowerCase().replace('_', '-');
        const typeLabel = formatLineType(line.type);
        const lineText = escapeHtml(line.text || line.line || '');
        
        linesHtml += `
        <div class="line-card">
          <span class="line-type ${typeClass}">${typeLabel}</span>
          <p class="line-text">${lineText}</p>
          <button class="copy-btn" onclick="copyToClipboard('${escapeJs(line.text || line.line || '')}', this)">📋 Copy</button>
        </div>`;
      });
    } else {
      linesHtml = '<p style="color: #666;">No lines generated for this prospect.</p>';
    }

    html = html.replace('<!-- LINES_LIST -->', linesHtml);

    res.send(html);

  } catch (error) {
    console.error('Generation detail error:', error);
    res.status(500).send('Error loading generation');
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    details: err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

/**
 * Format timestamp as relative time
 */
function formatTimeAgo(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Escape string for JavaScript (for inline onclick handlers)
 */
function escapeJs(text) {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

/**
 * Format line type for display
 */
function formatLineType(type) {
  if (!type) return 'Professional';
  const typeMap = {
    'casual': 'Casual',
    'professional': 'Professional',
    'pain_point': 'Pain Point',
    'pain-point': 'Pain Point'
  };
  return typeMap[type.toLowerCase()] || type;
}

/**
 * Initialize and start server
 */
async function startServer() {
  try {
    // Initialize database FIRST (async for sql.js WASM loading)
    console.log('Initializing database...');
    await db.initializeDatabase();

    // Initialize OpenAI client
    console.log('Initializing OpenAI client...');
    try {
      initializeOpenAI();
      console.log('OpenAI client ready');
    } catch (e) {
      console.warn('Warning: OpenAI not configured:', e.message);
      console.warn('Set OPENAI_API_KEY in .env to enable AI features');
    }

    // Start server
    app.listen(PORT, () => {
      console.log(`\n🎯 LeadScout API running on http://localhost:${PORT}`);
      console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
      console.log(`📋 API Docs: POST /api/generate, GET /api/stats\n`);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  db.closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down...');
  db.closeDatabase();
  process.exit(0);
});

// Start the server
startServer();
