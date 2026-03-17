# Lead Finder — AI-Powered Outreach Research Tool

A web app that helps you discover and research people for outreach. Enter either a list of names or a category query (like "top 10 pastors in the US"), and the app will find their official websites, contact pages, profiles, and best outreach paths.

## How It Works

The app runs a 5-step pipeline:

1. **Query Expansion (Prompt A)** — Claude turns your input into structured search intents (official site, Wikipedia, contact page, booking page, interviews, etc.)
2. **Web Search** — OSV Engineering Search API runs each search query across Google, DuckDuckGo, and Bing
3. **Page Crawling** — OSV Engineering Crawl API extracts content from the top results
4. **Classification (Prompt B)** — Claude classifies each page: Is it about the right person? Is it an official source? Does it have contact info?
5. **Ranking (Prompt C)** — Claude produces a final ranked summary with confidence scores and next actions

## Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── discover/route.ts   # Main pipeline endpoint
│   │   └── search/route.ts     # Simple search endpoint (for testing)
│   ├── layout.tsx
│   ├── page.tsx                # Frontend UI
│   └── globals.css
├── components/
│   ├── SearchForm.tsx          # Query input + filters
│   ├── ResultsCards.tsx        # Card view for results
│   └── ResultsTable.tsx        # Table view for results
├── lib/
│   ├── osv-search.ts           # OSV Web Search API client
│   ├── osv-crawl.ts            # OSV Web Crawling API client
│   ├── llm.ts                  # Claude (Anthropic) SDK wrapper
│   ├── prompts.ts              # All 3 prompt templates (A, B, C)
│   └── pipeline.ts             # Pipeline orchestrator
└── types/
    └── index.ts                # TypeScript types
```

## Setup

### Prerequisites
- Node.js 18+
- An OSV Engineering API key (https://osv.engineering)
- An Anthropic API key (https://console.anthropic.com)

### Installation

```bash
# Clone or copy the project
cd lead-finder

# Install dependencies
npm install

# Copy the example environment file
cp .env.example .env.local

# Edit .env.local and add your API keys
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OSV_API_KEY` | Yes | Your OSV Engineering API key (for search + crawl) |
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key (for Claude) |
| `CLAUDE_MODEL` | No | Claude model to use (default: `claude-sonnet-4-20250514`) |
| `MAX_RESULTS_PER_QUERY` | No | Max search results per query (default: `5`) |
| `MAX_CRAWL_PAGES` | No | Max pages to crawl per URL (default: `1`) |

### Running

```bash
# Development mode
npm run dev

# Then open http://localhost:3000
```

### Building for Production (Local)

```bash
npm run build
npm start
```

## Deploy to Vercel

This app is built for Vercel. The pipeline endpoint uses SSE streaming to
keep the connection alive during the 30-90 second processing window.

### Option A: Deploy via Vercel CLI

```bash
# Install the Vercel CLI
npm i -g vercel

# From the project directory, run:
vercel

# Follow the prompts — it will:
#   - Link or create a Vercel project
#   - Build and deploy automatically

# For production deployment:
vercel --prod
```

### Option B: Deploy via GitHub

1. Push this project to a GitHub repo
2. Go to https://vercel.com/new
3. Import your repository
4. Vercel auto-detects Next.js — no build settings to change

### Set Environment Variables

After deploying, go to your Vercel project dashboard:

**Settings > Environment Variables** and add:

| Name | Value |
|------|-------|
| `OSV_API_KEY` | Your OSV Engineering API key |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `CLAUDE_MODEL` | `claude-sonnet-4-20250514` (optional) |

Then redeploy for the variables to take effect.

### Vercel Plan Notes

| Plan | Function Timeout | Works? |
|------|-----------------|--------|
| Hobby (free) | 60 seconds | Works for 1-3 people per search |
| Pro ($20/mo) | 300 seconds | Full support for 10+ people |

The `vercel.json` in this project sets `maxDuration: 120` on the pipeline
endpoint. If you're on the free tier and researching many people, reduce
the `maxPeople` setting to 2-3 to stay within the 60-second window.

## Usage

### Example 1: Category Query
Enter: `top 10 pastors in the US`

The app will:
1. Run discovery searches to find lists of major pastors
2. Extract names from those lists
3. For each pastor, search for their official site, church profile, contact page, Wikipedia, etc.
4. Crawl and classify each result
5. Return ranked results with confidence scores

### Example 2: Name List
Enter: `John Piper, T.D. Jakes, Joel Osteen`

The app will skip the discovery step and go straight to searching for each person's official presence.

### Output Format

Each result includes:
- **Name** — Full name of the person
- **Role** — Their primary role/title
- **Organization** — Their church, company, or org
- **Official Site** — Best official website URL
- **Profile Links** — Top profile/bio pages
- **Contact Links** — Contact or booking pages
- **Confidence** — How confident the app is (0-100%)
- **Next Action** — Recommended next step for outreach
- **Evidence** — Why these links were selected

### CSV Export
Click "Export CSV" to download all results as a CSV file.

## Notes

- The pipeline processes people sequentially to manage API rate limits
- Each person typically requires 4 search queries and up to 8 page crawls
- Processing 5 people takes roughly 30-60 seconds depending on API response times
- Strict mode filters out low-confidence and low-outreach-value results
- The app never invents people, titles, or contact information
