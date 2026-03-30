# 🎯 LeadScout

AI-powered cold email personalization from LinkedIn profiles. Generate 3 personalized opening lines in seconds — no more manual research.

## Features

- **One-Click Extraction**: Click the extension on any LinkedIn profile to extract name, headline, company, about section, and recent posts
- **AI-Generated Lines**: Get 3 tailored opening lines (casual, professional, pain-point focused)
- **Instant Copy**: One-click copy to paste directly into your cold emails
- **Usage Dashboard**: Track your generation stats and review past prospects

## Quick Start

### 1. Set Up the Server

```bash
# Navigate to the build directory
cd builds/2026-03-25-leadscout-ai-powered-cold-outreach-resea

# Install dependencies
npm install

# Create your .env file
cp .env.example .env

# Add your OpenAI API key to .env
# OPENAI_API_KEY=sk-your-api-key-here

# Start the server
npm start
```

You should see:
```
🎯 LeadScout API running on http://localhost:3000
📊 Dashboard: http://localhost:3000/dashboard
```

### 2. Install the Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `extension` folder from this project
5. You'll see the LeadScout icon (🎯) in your toolbar

### 3. Generate Your First Lines

1. Navigate to any LinkedIn profile (e.g., `linkedin.com/in/satya-nadella`)
2. Click the LeadScout extension icon
3. Review the extracted profile data
4. Click **✨ Generate Opening Lines**
5. Copy your favorite line and paste into your cold email!

## Project Structure

```
leadscout/
├── server/                    # Express API server
│   ├── index.js              # Entry point
│   ├── routes/api.js         # REST endpoints
│   ├── services/
│   │   ├── openai.js         # OpenAI integration
│   │   └── prompts.js        # AI prompts
│   ├── models/db.js          # SQLite database
│   └── views/dashboard.html  # Usage dashboard
├── extension/                 # Chrome Extension (Manifest V3)
│   ├── manifest.json
│   ├── popup/                # Extension popup UI
│   ├── content/scraper.js    # LinkedIn DOM scraper
│   ├── background/           # Service worker
│   └── icons/                # Extension icons
├── data/                      # SQLite database file (created on first run)
├── package.json
├── .env.example
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/generate` | Generate opening lines from profile data |
| GET | `/api/generations` | List recent generations |
| GET | `/api/generations/:id` | Get specific generation details |
| GET | `/api/stats` | Get usage statistics |
| GET | `/dashboard` | Web dashboard (HTML) |
| GET | `/health` | Health check |

### Example: Generate Lines

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sarah Chen",
    "headline": "Head of Growth @ Stripe | Ex-Uber",
    "company": "Stripe",
    "currentRole": "Head of Growth",
    "location": "San Francisco",
    "about": "Helping B2B companies scale",
    "recentPosts": ["Just published: The 3 metrics that predict growth"]
  }'
```

### Response

```json
{
  "id": "gen_abc123",
  "lines": [
    {
      "type": "casual",
      "text": "Loved your '3 metrics that predict growth' piece, Sarah — the leading vs lagging indicators insight was gold."
    },
    {
      "type": "professional",
      "text": "Sarah, with your track record scaling Uber B2B and now leading growth at Stripe, I imagine you've optimized every part of the funnel..."
    },
    {
      "type": "pain_point",
      "text": "Scaling growth at Stripe's pace means your team is probably drowning in prospect research. What if each rep could personalize 50 emails/day?"
    }
  ],
  "createdAt": "2026-03-25T14:30:00Z"
}
```

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes | - | Your OpenAI API key |
| `PORT` | No | 3000 | Server port |

### OpenAI Model

The default model is `gpt-4o-mini` for speed and cost efficiency (~$0.0001 per generation).
To use a different model, modify `server/services/openai.js`.

## Troubleshooting

### "Cannot connect to server"
Make sure the server is running on `localhost:3000`. Run `npm start` in the project directory.

### "OPENAI_API_KEY not set"
1. Copy `.env.example` to `.env`
2. Add your OpenAI API key
3. Restart the server

### Extension not extracting data
- Make sure you're on a LinkedIn profile page (URL should contain `/in/`)
- Try refreshing the LinkedIn page
- LinkedIn's DOM structure changes; selectors in `content/scraper.js` may need updates

### Icons not showing
Replace the placeholder icons in `extension/icons/` with actual PNG files (16x16, 48x48, 128x128).

## Development

```bash
# Run in development mode (auto-restart on changes)
npm run dev

# Check API is working
curl http://localhost:3000/api/stats

# Test generation
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User", "headline": "Developer", "company": "TestCo"}'
```

## Tech Stack

- **Runtime**: Node.js 20+
- **Server**: Express 4.x
- **Database**: SQLite (sql.js - WebAssembly)
- **AI**: OpenAI GPT-4o-mini
- **Extension**: Chrome Manifest V3

## Cost

At GPT-4o-mini rates:
- ~$0.15 per 1M input tokens
- ~$0.60 per 1M output tokens
- **Average cost per generation: ~$0.0001** (essentially free at MVP scale)

## License

MIT

---

Built for B2B sales pros who want to personalize at scale without sacrificing quality. 🚀
