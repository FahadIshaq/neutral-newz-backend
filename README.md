# Neutral News Backend API

A robust backend service for processing RSS feeds and generating neutral news briefs. This service automatically fetches news from verified sources every 30 minutes and creates objective summaries.

## Features

- **RSS Feed Processing**: Automatically fetches from 20+ verified news sources
- **News Brief Generation**: Creates neutral summaries from multiple sources
- **Scheduled Processing**: Runs every 30 minutes via cron jobs
- **RESTful API**: Clean endpoints for feeds and briefs
- **TypeScript**: Full type safety and modern development experience
- **Error Handling**: Comprehensive error handling and logging

## RSS Feed Sources

### US National
- NPR National & Politics
- PBS Headlines & Politics
- White House
- Department of Justice
- Congress

### International
- BBC World
- CNN World
- UN News
- NPR World

### Finance/Macro
- Federal Reserve
- US Treasury
- NPR Economy
- PBS Economy
- IMF Press

## API Endpoints

### Health Check
- `GET /health` - Service health status

### RSS Feeds
- `GET /api/feeds` - List all RSS feeds
- `GET /api/feeds/category/:category` - Feeds by category
- `GET /api/feeds/:id` - Single feed details
- `POST /api/feeds/process-all` - Process all feeds
- `POST /api/feeds/:id/process` - Process single feed
- `GET /api/feeds/status/processing` - Processing status

### News Briefs
- `GET /api/briefs` - List all briefs
- `GET /api/briefs/category/:category` - Briefs by category
- `GET /api/briefs/:id` - Single brief details
- `GET /api/briefs/latest/:limit` - Latest briefs

## Installation

1. **Clone and navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## Development

- **Development server**: `npm run dev` (uses nodemon for auto-reload)
- **Build**: `npm run build` (compiles TypeScript to JavaScript)
- **Production**: `npm start` (runs compiled JavaScript)

## Project Structure

```
src/
├── index.ts              # Main server entry point
├── types/                # TypeScript type definitions
├── services/             # Business logic services
│   ├── rssService.ts     # RSS feed processing
│   ├── briefService.ts   # News brief generation
│   └── processingService.ts # Main orchestration
├── routes/               # API route handlers
│   ├── feeds.ts          # RSS feed endpoints
│   └── briefs.ts         # News brief endpoints
├── utils/                # Utility functions and constants
└── middleware/           # Express middleware (future)
```

## Configuration

Key configuration options in `env.example`:

- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment (development/production)
- `RSS_PROCESSING_INTERVAL`: Cron schedule for processing
- `MAX_ARTICLES_PER_FEED`: Maximum articles to process per feed
- `MAX_BRIEF_LENGTH`: Maximum length of generated briefs

## Performance & Scalability

- **Processing Time**: Target ≤30 minutes from source publish
- **Concurrent Processing**: Handles multiple RSS feeds simultaneously
- **Error Resilience**: Continues processing even if individual feeds fail
- **Resource Management**: Configurable limits for articles and briefs

## Future Enhancements

- [ ] Database integration (MongoDB/PostgreSQL)
- [ ] LLM-powered brief generation
- [ ] User authentication and authorization
- [ ] Webhook notifications
- [ ] Advanced filtering and search
- [ ] Analytics and monitoring
- [ ] Docker containerization
- [ ] Kubernetes deployment

## Monitoring

The service includes:
- Request logging for all API calls
- Processing status endpoints
- Error tracking and reporting
- Health check endpoints

## Contributing

1. Follow TypeScript best practices
2. Add proper error handling
3. Include type definitions
4. Test API endpoints
5. Update documentation

## License

ISC License
