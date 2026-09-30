# ReachInbox Email Scheduler

A full stack email scheduling platform built with React, Express, PostgreSQL, Redis, BullMQ and Elasticsearch.

The application allows users to upload recipient lists, schedule email campaigns, control sending delays and hourly limits, search email history and monitor background jobs.

## Features

- Google OAuth authentication
- CSV recipient upload
- Email campaign creation
- Scheduled email delivery
- Multiple sender support
- Configurable delay between emails
- Hourly sending limits
- Redis backed distributed rate limiting
- BullMQ background job processing
- Configurable worker concurrency
- PostgreSQL persistence
- Elasticsearch email search
- Slack OAuth integration
- Slack notifications when hourly limits are reached
- Bull Board queue monitoring
- Responsive React dashboard
- Persistent jobs across application restarts

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Lucide React

### Backend

- Node.js
- Express
- TypeScript
- Prisma
- PostgreSQL
- BullMQ
- Redis
- Nodemailer
- Elasticsearch
- Passport Google OAuth

### Integrations

- Google OAuth
- Slack OAuth
- Ethereal Email SMTP

## Architecture

```text
React Frontend
      |
      v
Express REST API
      |
      +------------------+
      |                  |
      v                  v
 PostgreSQL          Elasticsearch
      |
      v
    Redis
      |
      v
    BullMQ
      |
      v
 Email Worker
      |
      v
 Ethereal SMTP

Rate Limit Reached
      |
      v
 Slack Notification
```

## Main Workflow

1. User signs in using Google OAuth.
2. User creates an email campaign.
3. Recipients are uploaded through CSV.
4. Campaign data is stored in PostgreSQL.
5. Email jobs are added to BullMQ.
6. Redis controls scheduling and hourly sending limits.
7. The worker processes jobs according to configured concurrency.
8. Emails are sent through SMTP.
9. Email status is stored in PostgreSQL.
10. Email records are indexed in Elasticsearch.
11. Users can search email history from the dashboard.
12. When the hourly limit is reached, remaining emails are rescheduled and a Slack notification is sent.

## Project Structure

```text
reachinbox-scheduler/
├── apps/
│   ├── backend/
│   │   ├── prisma/
│   │   ├── src/
│   │   │   ├── auth/
│   │   │   ├── config/
│   │   │   ├── controllers/
│   │   │   ├── middleware/
│   │   │   ├── queues/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   ├── workers/
│   │   │   └── server.ts
│   │   ├── package.json
│   │   ├── prisma.config.ts
│   │   └── tsconfig.json
│   └── frontend/
│       ├── src/
│       ├── public/
│       ├── package.json
│       └── vite.config.ts
├── docker-compose.yml
├── .gitignore
└── README.md
```

## Local Setup

### Prerequisites

- Node.js 20+
- npm
- Docker Desktop
- PostgreSQL
- Redis
- Elasticsearch

### Clone

```bash
git clone <YOUR_GITHUB_REPOSITORY>
cd reachinbox-scheduler
```

## Backend Setup

```bash
cd apps/backend
npm install
```

Create a `.env` file:

```env
DATABASE_URL=

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

ELASTICSEARCH_URL=http://localhost:9200

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_REDIRECT_URI=http://localhost:5000/api/slack/callback

FRONTEND_URL=http://localhost:5173

SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=

WORKER_CONCURRENCY=5
```

### Database Migration

```bash
npx prisma migrate deploy
```

For local development:

```bash
npx prisma migrate dev
```

### Start Backend

```bash
npm run dev
```

Backend:

```text
http://localhost:5000
```

### Start Worker

Open another terminal:

```bash
cd apps/backend
npm run worker
```

## Frontend Setup

```bash
cd apps/frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

## Environment Variables

Never commit real credentials to GitHub.

Create `apps/backend/.env.example` using the same variables as above, but leave all secret values empty.

The actual `.env` file must remain local.

## Google OAuth

Google OAuth is used for user authentication.

Local callback:

```text
http://localhost:5000/api/auth/google/callback
```

Production callback URLs must be configured in the Google Cloud OAuth application.

## Slack OAuth

Slack OAuth is used to authorize Slack notifications.

Local callback:

```text
http://localhost:5000/api/slack/callback
```

When the hourly email sending limit is reached, the application sends a notification to the configured Slack channel.

## Email Scheduling

Users can configure:

- Campaign name
- Email subject
- Email body
- CSV recipient list
- Start time
- Delay between emails
- Hourly sending limit

Example:

```text
Recipients: 100
Delay: 2000 ms
Hourly limit: 20
```

The scheduler places email jobs into BullMQ and Redis controls when each email can be processed.

## Queue Processing

BullMQ is used for asynchronous email scheduling.

Worker concurrency is configurable:

```env
WORKER_CONCURRENCY=5
```

This controls the number of email jobs processed concurrently.

The worker runs independently from the Express API so queued and delayed jobs can continue processing when the API is restarted.

## Rate Limiting

Email sending is controlled using Redis-backed atomic operations.

The rate limiter:

- Tracks sending activity per sender
- Enforces the configured hourly limit
- Reschedules emails instead of dropping them
- Prevents multiple workers from exceeding the limit
- Maintains scheduling state in Redis
- Sends a Slack notification when the limit is reached

Example:

```text
Hourly Limit = 2

Email 1 -> Sent
Email 2 -> Sent
Email 3 -> Rescheduled
Email 4 -> Rescheduled
```

## Elasticsearch Search

Email records are indexed in Elasticsearch.

The dashboard provides search across:

- Recipient
- Subject
- Body
- Status

Example:

```text
Search: ReachInbox
```

## Bull Board

Bull Board provides queue monitoring.

Open:

```text
http://localhost:5000/admin/queues
```

It can monitor:

- Waiting jobs
- Delayed jobs
- Active jobs
- Completed jobs
- Failed jobs

## Email Delivery

The application uses SMTP for email delivery.

For development and testing, Ethereal Email can be used to inspect sent emails without sending them to real recipients.

Email flow:

```text
Campaign
   |
   v
PostgreSQL
   |
   v
BullMQ
   |
   v
Redis
   |
   v
Worker
   |
   v
SMTP
   |
   v
Email
```

## API Endpoints

### Health Check

```http
GET /health
```

### Google Authentication

```http
GET /api/auth/google
GET /api/auth/google/callback
```

### Slack OAuth

```http
GET /api/slack/connect
GET /api/slack/callback
```

### Campaigns

```http
GET /campaigns
POST /api/campaigns/upload
```

### Emails

```http
GET /emails
```

### Email Search

```http
GET /emails/search?q=<query>
```

Example:

```text
http://localhost:5000/emails/search?q=ReachInbox
```

## Testing

### Backend Build

```bash
cd apps/backend
npm run build
```

### Frontend Build

```bash
cd apps/frontend
npm run build
```

## Docker

Start local infrastructure:

```bash
docker compose up -d
```

Check containers:

```bash
docker ps
```

Stop services:

```bash
docker compose down
```

## Deployment

Recommended deployment architecture:

```text
Vercel
  |
  v
React Frontend
  |
  v
Backend API
  |
  +------ PostgreSQL
  |
  +------ Redis
  |          |
  |          v
  |       BullMQ
  |          |
  |          v
  |        Worker
  |
  +------ Elasticsearch
  |
  +------ Slack API
  |
  +------ SMTP
```

Deploy the frontend and backend separately. The BullMQ worker should run as a separate long-running worker service.

### Production Frontend API

The frontend should use an environment variable for the backend URL:

```ts
const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
```

Production:

```text
VITE_API_URL=https://your-backend-url
```

### Production Backend

Build:

```bash
npm install
npm run build
```

Start:

```bash
npm start
```

Database migration:

```bash
npx prisma migrate deploy
```

### Production Worker

Build:

```bash
npm install
npm run build
```

Start:

```bash
npm run worker
```

The worker should use the same PostgreSQL and Redis environment variables as the backend.

## Production Environment Variables

```env
DATABASE_URL=

REDIS_HOST=
REDIS_PORT=
REDIS_PASSWORD=

ELASTICSEARCH_URL=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=

SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_REDIRECT_URI=

FRONTEND_URL=

SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=

WORKER_CONCURRENCY=5
```

## Security

Never commit:

```text
.env
Database passwords
Google client secrets
Slack client secrets
Slack bot tokens
SMTP passwords
Redis passwords
Elasticsearch credentials
```

Use environment variables for all credentials.

## Demo Flow

```text
1. Google Login
       |
       v
2. Dashboard
       |
       v
3. Create Campaign
       |
       v
4. Upload CSV
       |
       v
5. Configure Delay + Hourly Limit
       |
       v
6. Start Campaign
       |
       v
7. BullMQ Creates Jobs
       |
       v
8. Worker Processes Emails
       |
       v
9. SMTP Sends Email
       |
       v
10. PostgreSQL Stores Status
       |
       +------------------+
       |                  |
       v                  v
 Elasticsearch         Slack
       |                  |
       v                  v
 Email Search       Rate Limit Alert
```

## Monitoring

Bull Board can be used to demonstrate:

- Waiting jobs
- Delayed jobs
- Active jobs
- Completed jobs
- Failed jobs

Elasticsearch search can be demonstrated from the Search section of the dashboard.

Slack notifications can be demonstrated by configuring a small hourly sending limit and scheduling multiple recipients.

## Future Improvements

- Email analytics
- Delivery tracking
- Open and click tracking
- Campaign pause and resume
- Sender rotation
- Retry configuration
- Advanced Elasticsearch filters
- Campaign analytics dashboard
- Scheduled campaign cancellation
- Improved notification deduplication

## License

Developed as a full stack email scheduling application for demonstration and evaluation purposes.
