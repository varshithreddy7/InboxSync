# InboxSync — AI-Powered Email Aggregator

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL+pgvector-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Elasticsearch](https://img.shields.io/badge/Elasticsearch-7.14-005571?style=for-the-badge&logo=elasticsearch&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991?style=for-the-badge&logo=openai&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-ISC-green?style=for-the-badge)

**A production-grade email intelligence platform featuring real-time IMAP synchronization, Elasticsearch-powered full-text search, GPT-4o-mini AI categorization, RAG-based reply suggestions, and automated webhook notifications.**

[Features](#-features) · [Architecture](#-architecture) · [Tech Stack](#-tech-stack) · [Getting Started](#-getting-started) · [API Reference](#-api-reference) · [Project Structure](#-project-structure) · [Roadmap](#-roadmap)

</div>

---

## 📖 Overview

InboxSync is a **full-stack email aggregation platform** built to demonstrate production-level engineering across multiple advanced domains: real-time data synchronization, AI/ML integration, vector-based semantic search, and event-driven webhook systems.

The platform connects to real email accounts via the IMAP protocol, continuously syncs incoming mail using IDLE mode, indexes every email into Elasticsearch for sub-100ms full-text search, and leverages OpenAI's GPT-4o-mini to automatically classify emails into actionable business categories. When a lead is classified as *Interested*, a webhook fires automatically to notify downstream CRM or sales systems — with built-in retry logic.

The RAG (Retrieval Augmented Generation) module uses OpenAI embeddings + pgvector cosine similarity search to surface the most contextually relevant training examples, then generates a tailored, professional reply suggestion.

> **Origin:** Started as a technical assignment for ReachInbox and extended into a personal learning project exploring AI-augmented backend engineering.

---

## ✨ Features

### 📬 Real-Time IMAP Synchronization
- Connects to multiple email accounts simultaneously (Gmail, Outlook, Yahoo supported)
- On initial connect: fetches the **last 30 days** of email history
- Activates **IMAP IDLE** for zero-polling real-time delivery of new messages
- Automatic reconnection on connection drops (5-second backoff)
- Deduplication via a processed message set (prevents double-ingestion)
- Emails are upserted into PostgreSQL atomically

### 🔍 Elasticsearch Full-Text Search
- Emails are bulk-indexed into Elasticsearch with a custom field mapping
- **Multi-field fuzzy search** across `subject` (3× boost), `body` (2× boost), `from`, `to`
- Advanced filter combinations: account, folder, category, date range, indexed/notified state
- Aggregation endpoints for category and folder distribution analytics
- Manual bulk-index trigger to sync existing PostgreSQL records into Elasticsearch
- Results sorted by date descending, configurable page size (max 500)

### 🤖 AI Email Categorization (GPT-4o-mini)
Emails are classified into **5 business-relevant categories** using a carefully engineered system prompt:

| Category | Signal Examples |
|---|---|
| **Interested** | "Tell me more", "What's the pricing?", "Can we schedule a demo?" |
| **Meeting Booked** | "Let's meet Tuesday", "Calendar invite sent", "Available next week" |
| **Not Interested** | "Not right now", "We're using a competitor", "No thank you" |
| **Spam** | Marketing blasts, system notifications, unrelated promotional content |
| **Out of Office** | Auto-replies, absence notifications, vacation responders |

- Returns `category`, `confidence` (0–1), and `reasoning` for every classification
- Supports **single email**, **batch**, and **auto-categorize-all** modes
- Priority resolution: `Meeting Booked > Interested > Not Interested > Spam > Out of Office`
- Graceful fallback to `Spam` with 0.5 confidence on API errors

### 🔔 Webhook Notifications
- Fires an HTTP `POST` to a configurable `WEBHOOK_URL` whenever an email is categorized as **Interested**
- Webhook payload includes: event type, timestamp, email metadata, and a 200-character body preview
- **Built-in retry logic**: up to 3 attempts with 2-second delay between retries
- Auto-triggered during AI categorization (no manual intervention required)
- Manual trigger endpoint to backfill notifications for existing Interested emails
- Emails are flagged `notified: true` in the database after successful delivery

### 🧠 RAG-Powered Reply Suggestions
- **Retrieval Augmented Generation** pipeline built on pgvector + OpenAI
- Training examples (topic + email body + suggested reply) are embedded using `text-embedding-3-small` (1536 dimensions) and stored as vectors in PostgreSQL
- For a given email, its embedding is compared against all training data using **cosine similarity** (`<=>` operator)
- The top 3 most similar examples are injected as context into GPT-4o-mini
- The model generates a concise, professional, context-aware reply (2–3 sentences)
- Suggested replies are persisted and retrievable by email ID
- Supports single and bulk training data ingestion via API

### 🖥️ React Dashboard
- **Three-panel layout**: Statistics sidebar → Email list → Email detail
- Account and folder switcher, category filter dropdown
- Elasticsearch-powered search bar with Enter-key trigger
- Category statistics with progress bars and percentage breakdown
- HTML email rendering with **DOMPurify sanitization** (XSS-safe)
- One-click AI reply generation from the detail panel
- Fully typed with TypeScript interfaces shared across components

---

## 🏛️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Frontend                           │
│         Dashboard → EmailList → EmailDetail → StatsPanel        │
└──────────────────────────┬──────────────────────────────────────┘
                           │ REST (Axios)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Express API (Port 3000)                       │
│                                                                 │
│  /api/messages   /api/search   /api/ai   /api/webhook           │
│  /api/rag                                                       │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ EmailCtrl   │  │  SearchCtrl  │  │     AIController     │   │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬───────────┘   │
│         │                │                      │               │
│  ┌──────▼──────┐  ┌──────▼───────┐  ┌──────────▼───────────┐   │
│  │    Prisma   │  │Elasticsearch │  │  ai.service (OpenAI) │   │
│  │    (ORM)    │  │  Service     │  │  webhook.service      │   │
│  └──────┬──────┘  └──────┬───────┘  └──────────────────────┘   │
└─────────┼────────────────┼─────────────────────────────────────┘
          │                │
          ▼                ▼
┌──────────────┐  ┌──────────────────┐
│  PostgreSQL  │  │  Elasticsearch   │
│  + pgvector  │  │  (emails index)  │
│              │  └──────────────────┘
│  Email       │
│  SyncState   │   ┌──────────────────┐
│  Vector      │   │  imap.service    │
│  Embeddings  │◄──│  (ImapFlow IDLE) │◄───── Gmail / Outlook / Yahoo
└──────────────┘   └──────────────────┘

RAG Pipeline:
Email Body ──► OpenAI Embeddings ──► pgvector cosine search
                                          │
                                    Top-3 training examples
                                          │
                                    GPT-4o-mini ──► Suggested Reply
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Runtime** | Node.js 20+ | JavaScript server runtime |
| **Language** | TypeScript 5.x | Type safety across the full stack |
| **Web Framework** | Express 5 | REST API server |
| **ORM** | Prisma 6 | Type-safe PostgreSQL access, migrations |
| **Database** | PostgreSQL 16 + pgvector | ACID-compliant email storage + vector search |
| **Search Engine** | Elasticsearch 7.14 | Sub-100ms full-text search with fuzzy matching |
| **Email Protocol** | ImapFlow | IMAP client with IDLE support |
| **Email Parsing** | mailparser | RFC-compliant email parsing (HTML, attachments, headers) |
| **AI / LLM** | OpenAI GPT-4o-mini | Email categorization + RAG reply generation |
| **Embeddings** | OpenAI text-embedding-3-small | 1536-dim semantic vectors for RAG |
| **HTTP Client** | Axios | REST calls (frontend API + webhook delivery) |
| **Frontend** | React 18 + TypeScript | Component-based UI |
| **Build Tool** | Vite | Lightning-fast HMR dev server |
| **Styling** | Tailwind CSS | Utility-first responsive styling |
| **Icons** | Lucide React | Consistent SVG icon system |
| **HTML Sanitization** | DOMPurify | XSS-safe HTML email rendering |
| **Containerization** | Docker Compose | One-command local infrastructure |
| **Test Framework** | Jest + ts-jest | Unit testing (configured) |
| **Process Manager** | Nodemon + ts-node | Hot-reload TypeScript development |

---

## 📋 Prerequisites

| Requirement | Version |
|---|---|
| Node.js | 20+ |
| Docker & Docker Compose | Latest |
| OpenAI API Key | Required (GPT-4o-mini + embeddings) |
| IMAP credentials | Gmail App Password or equivalent |

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <your-repo-url> inboxsync
cd inboxsync
```

### 2. Install Dependencies

```bash
# Backend
npm install

# Frontend
cd frontend && npm install && cd ..
```

### 3. Configure Environment

```bash
cp .env.sample .env
```

Edit `.env` with your values:

```env
# PostgreSQL (matches docker-compose)
DATABASE_URL="postgresql://inboxsync:password123@localhost:5432/inboxsync"

# OpenAI — required for AI categorization and RAG
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o-mini

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200

# IMAP Credentials (Gmail: use App Passwords, not your account password)
IMAP_EMAIL_1=your_email@gmail.com
IMAP_PASSWORD_1=your_app_password
IMAP_EMAIL_2=another_email@gmail.com
IMAP_PASSWORD_2=another_app_password

# Webhooks — https://webhook.site to capture notifications
WEBHOOK_URL=https://webhook.site/your-unique-id

# Server
PORT=3000
NODE_ENV=development
```

> **Gmail users:** Enable 2FA on your Google account, then generate an **App Password** at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords). Use this as `IMAP_PASSWORD`.

### 4. Start Infrastructure

```bash
# Start PostgreSQL (with pgvector) + Elasticsearch
docker-compose up -d

# Wait ~15 seconds for services to initialize, then verify:
curl http://localhost:9200  # Should return Elasticsearch cluster info
```

### 5. Run Database Migrations

```bash
npx prisma migrate deploy

# Optional: Seed with sample emails + RAG training examples
npx prisma db seed
```

### 6. Start the Application

```bash
# Terminal 1 — Backend API (http://localhost:3000)
npm run dev

# Terminal 2 — Frontend (http://localhost:5173)
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📡 API Reference

### Base URL: `http://localhost:3000/api`

---

### 📧 Email Endpoints — `/api/messages`

#### `GET /api/messages`
Retrieve emails for a given account and folder.

**Query Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `account` | string | `account1` | Account identifier |
| `folder` | string | `INBOX` | Mailbox folder |
| `limit` | number | `100` | Max results (cap: 500) |

**Response:**
```json
{
  "success": true,
  "total": 42,
  "items": [
    {
      "id": "account1-123",
      "messageId": "<msg@gmail.com>",
      "from": "sender@example.com",
      "to": "you@gmail.com",
      "subject": "Re: Product Demo",
      "text": "I would love to schedule a demo...",
      "html": "<p>I would love to...</p>",
      "date": "2025-11-12T10:30:00.000Z",
      "folder": "INBOX",
      "account": "account1",
      "category": "Interested",
      "indexed": true,
      "notified": true
    }
  ]
}
```

---

### 🤖 AI Endpoints — `/api/ai`

#### `POST /api/ai/` — Categorize Single Email
```json
// Request
{
  "emailId": "account1-123",
  "subject": "Re: Product Demo Request",
  "body": "I would love to schedule a demo. Are you available Tuesday?",
  "from": "john@techcorp.com"
}

// Response
{
  "success": true,
  "emailId": "account1-123",
  "categorization": {
    "category": "Interested",
    "confidence": 0.97,
    "reasoning": "Explicit interest in scheduling a demo indicates genuine engagement"
  },
  "webhookSent": true
}
```

#### `POST /api/ai/batch` — Categorize Multiple Emails
```json
// Request
{
  "emails": [
    { "id": "account1-1", "subject": "...", "body": "...", "from": "..." },
    { "id": "account1-2", "subject": "...", "body": "...", "from": "..." }
  ]
}

// Response
{
  "success": true,
  "processed": 2,
  "webhooksTriggered": 1,
  "results": [
    { "id": 0, "category": "Interested", "confidence": 0.95, "reasoning": "..." },
    { "id": 1, "category": "Spam", "confidence": 0.88, "reasoning": "..." }
  ]
}
```

#### `POST /api/ai/auto-categorize` — Auto-categorize All Uncategorized
```json
// Request
{ "account": "account1" }

// Response
{
  "success": true,
  "message": "Successfully categorized 15 emails",
  "processed": 15,
  "total": 15
}
```

#### `GET /api/ai/categories` — List Valid Categories
```json
{
  "success": true,
  "categories": ["Interested", "Meeting Booked", "Not Interested", "Spam", "Out of Office"],
  "descriptions": {
    "Interested": "Customer shows genuine interest in the product/service",
    "Meeting Booked": "Customer has scheduled or confirmed a meeting"
  }
}
```

#### `GET /api/ai/stats/:account` — Category Breakdown
```json
{
  "success": true,
  "account": "account1",
  "stats": [
    { "category": "Interested", "count": 8 },
    { "category": "Spam", "count": 15 },
    { "category": "Not Interested", "count": 4 }
  ]
}
```

---

### 🔍 Search Endpoints — `/api/search`

#### `POST /api/search` — Full-Text Search
```json
// Request
{
  "query": "product demo pricing",
  "account": "account1",
  "folder": "INBOX",
  "category": "Interested",
  "limit": 20
}

// Response
{
  "success": true,
  "query": "product demo pricing",
  "total": 3,
  "results": [ /* Email objects with relevance scores */ ]
}
```

#### `POST /api/search/filter` — Advanced Filter
```json
// Request
{
  "account": "account1",
  "category": "Interested",
  "isNotified": false,
  "limit": 50
}
```

#### `GET /api/search/stats/:account` — Elasticsearch Aggregations
```json
{
  "success": true,
  "account": "account1",
  "statistics": {
    "categories": [
      { "key": "Interested", "doc_count": 8 },
      { "key": "Spam", "doc_count": 15 }
    ],
    "folders": [
      { "key": "INBOX", "doc_count": 40 }
    ]
  }
}
```

#### `POST /api/search/index-emails` — Bulk Index to Elasticsearch
```json
// Request
{ "account": "account1" }

// Response
{
  "success": true,
  "message": "Successfully indexed 42 emails",
  "indexed": 42
}
```

---

### 🔔 Webhook Endpoints — `/api/webhook`

#### `POST /api/webhook/test` — Fire Test Webhook
```json
{ "success": true, "message": "Test webhook sent successfully" }
```

#### `POST /api/webhook/notify-interested` — Backfill Notifications
```json
// Request
{ "account": "account1" }

// Response
{
  "success": true,
  "message": "Successfully sent 3 webhook notifications",
  "notified": 3,
  "total": 3
}
```

#### `GET /api/webhook/config` — Check Configuration
```json
{
  "success": true,
  "config": {
    "webhookUrl": "configured",
    "maxRetries": 3,
    "retryDelay": 2000
  }
}
```

#### `GET /api/webhook/stats/:account` — Notification Stats
```json
{
  "success": true,
  "account": "account1",
  "stats": {
    "totalInterested": 8,
    "notified": 6,
    "pending": 2
  }
}
```

---

### 🧠 RAG Endpoints — `/api/rag`

#### `POST /api/rag/add-training` — Add Training Example
```json
// Request
{
  "topic": "Product Demo",
  "emailBody": "We are interested in your product. Can you provide a demo?",
  "suggestedReply": "Absolutely! I'd be happy to schedule a demo. I have availability next week...",
  "account": "account1"
}
```

#### `POST /api/rag/suggest-reply` — Generate AI Reply
```json
// Request
{
  "emailId": "account1-123",
  "subject": "Can we schedule a demo?",
  "body": "Hi, we'd love to see your product in action...",
  "account": "account1"
}

// Response
{
  "success": true,
  "emailId": "account1-123",
  "suggestedReply": "Thank you for your interest! I'd love to show you the product...",
  "confidence": 0.85
}
```

#### `POST /api/rag/bulk-training` — Add Multiple Training Examples
```json
// Request
{
  "account": "account1",
  "examples": [
    { "topic": "...", "emailBody": "...", "suggestedReply": "..." },
    { "topic": "...", "emailBody": "...", "suggestedReply": "..." }
  ]
}
```

#### `GET /api/rag/suggested-reply/:emailId` — Get Stored Reply
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "emailId": "account1-123",
    "subject": "Can we schedule a demo?",
    "reply": "Thank you for your interest!...",
    "confidence": 0.85,
    "createdAt": "2025-11-12T10:30:00.000Z"
  }
}
```

---

### 🩺 Health Check

#### `GET /status`
```json
{
  "operational": true,
  "timestamp": "2025-11-12T10:30:00.000Z",
  "environment": "development"
}
```

---

## 📁 Project Structure

```
inboxsync/
│
├── src/                              # Backend source (Node.js + Express)
│   ├── index.ts                      # App entry point — server config, CORS, route mounting
│   │
│   ├── config/
│   │   └── database.ts               # Prisma client singleton (prevents connection pool exhaustion)
│   │
│   ├── controllers/                  # Request handlers — input validation, orchestration, response shaping
│   │   ├── email.controller.ts       # GET emails, stats, filter, account/folder queries
│   │   ├── ai.controller.ts          # Categorize + auto-webhook triggering
│   │   ├── webhook.controller.ts     # Test, backfill, config, stats
│   │   └── rag.controller.ts         # Training data management + reply generation
│   │
│   ├── routes/                       # Express Router definitions
│   │   ├── emailRoutes.ts            # GET /api/messages
│   │   ├── aiRoutes.ts               # POST/GET /api/ai/*
│   │   ├── searchRoutes.ts           # POST/GET /api/search/*
│   │   ├── webhookRoutes.ts          # POST/GET /api/webhook/*
│   │   └── ragRoutes.ts              # POST/GET /api/rag/*
│   │
│   └── services/                     # Core business logic
│       ├── imap.service.ts           # IMAP connection, 30-day sync, IDLE real-time, reconnect
│       ├── ai.service.ts             # GPT-4o-mini categorization, batch, validation
│       ├── elasticsearch.service.ts  # Index management, search, filter, aggregations
│       ├── webhook.service.ts        # HTTP POST delivery with retry logic
│       ├── rag.service.ts            # Embedding, vector search, reply generation, storage
│       └── search.controller.ts     # Search/filter/index controller (lives in services/)
│
├── frontend/                         # React frontend (Vite + Tailwind)
│   ├── src/
│   │   ├── App.tsx                   # BrowserRouter — single route to Dashboard
│   │   ├── main.tsx                  # React root mount
│   │   │
│   │   ├── pages/
│   │   │   └── Dashboard.tsx         # Main page — state manager, layout, data fetching
│   │   │
│   │   ├── components/
│   │   │   ├── EmailList.tsx         # Scrollable email list with category badges
│   │   │   ├── EmailDetail.tsx       # Full email view + AI reply button + HTML rendering
│   │   │   ├── FilterBar.tsx         # Account/folder/category dropdowns
│   │   │   ├── SearchBar.tsx         # Full-text search input
│   │   │   └── StatsPanel.tsx        # Category stats with progress bars
│   │   │
│   │   └── services/
│   │       └── api.ts                # Typed Axios client — all API calls + TypeScript interfaces
│   │
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── package.json
│
├── prisma/
│   ├── schema.prisma                 # Data models: Email, SyncState, VectorEmbedding
│   ├── migrations/                   # Version-controlled schema migrations
│   └── seed.ts                       # Sample emails + RAG training examples
│
├── docker/                           # Docker configuration files
├── docker-compose.yml                # PostgreSQL (ankane/pgvector) + Elasticsearch services
│
├── .env                              # Local environment variables (gitignored)
├── .env.sample                       # Environment variable template
├── tsconfig.json                     # TypeScript configuration (backend)
├── package.json                      # Backend dependencies and scripts
└── README.md
```

---

## 🗄️ Database Schema

```prisma
model Email {
  id        String   @id                  // Composite: "{account}-{uid}"
  messageId String   @unique              // IMAP Message-ID header
  from      String
  to        String
  subject   String   @db.Text
  text      String   @db.Text
  html      String?  @db.Text
  date      DateTime
  folder    String
  account   String
  category  String?                       // AI-assigned: Interested | Meeting Booked | ...
  indexed   Boolean  @default(false)      // Elasticsearch sync flag
  notified  Boolean  @default(false)      // Webhook delivery flag
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([account, folder])             // Optimized for primary query pattern
  @@index([date])                        // For time-range queries
  @@index([category])                    // For category filtering
}

model SyncState {
  id        String   @id @default(cuid())
  account   String   @unique
  lastSync  DateTime
  status    String                        // "idle" | "syncing" | "error"
  error     String?
  createdAt DateTime @default(now())
}

model VectorEmbedding {
  id        String   @id @default(cuid())
  title     String
  content   String   @db.Text
  embedding Unsupported("vector(1536)")? // pgvector 1536-dim (text-embedding-3-small)
  createdAt DateTime @default(now())

  @@index([title])
}
```

---

## 🔄 Core Data Flows

### Email Sync Flow
```
IMAP Server
  │
  ├── [CONNECT] mailboxConnector.connectAccount(email, password, accountId)
  │     ├── Upsert SyncState → status: "idle"
  │     ├── loadHistoricalMessages() → search(since: 30 days ago)
  │     │     └── For each msg: simpleParser → upsert Email in PostgreSQL
  │     └── activateRealtimeNotifications() → client.idle()
  │           └── on('exists') → fetch unseen → create Email in PostgreSQL
  │
  └── [RECONNECT] on error → 5s delay → connectAccount() again
```

### AI Categorization + Webhook Flow
```
POST /api/ai/categorize
  │
  ├── aiService.categorizingEmail(subject, body, from)
  │     └── OpenAI GPT-4o-mini → parse JSON → { category, confidence, reasoning }
  │
  ├── prisma.email.update({ category })
  │
  └── if category === "Interested" && !email.notified:
        └── webhookService.sendInterestedNotification(email)
              └── sendWithRetry(payload, attempt=1)
                    ├── axios.POST(WEBHOOK_URL, payload)
                    ├── on success → prisma.email.update({ notified: true })
                    └── on failure → retry (up to 3 times, 2s delay)
```

### RAG Reply Generation Flow
```
POST /api/rag/suggest-reply
  │
  ├── ragService.createEmbedding(emailBody)
  │     └── OpenAI text-embedding-3-small → float[1536]
  │
  ├── prisma.$queryRaw (pgvector cosine distance <=>)
  │     └── Top 3 most similar TrainingData rows
  │
  ├── Build GPT-4o-mini context from training examples
  │
  ├── OpenAI chat.completions → suggestedReply string
  │
  └── prisma.$executeRaw → INSERT INTO SuggestedReply
```

---

## 🌎 Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `OPENAI_API_KEY` | ✅ | — | OpenAI API key |
| `OPENAI_MODEL` | ❌ | `gpt-4o-mini` | Model override |
| `ELASTICSEARCH_URL` | ❌ | `http://localhost:9200` | Elasticsearch node URL |
| `IMAP_EMAIL_1` | ✅* | — | First account email address |
| `IMAP_PASSWORD_1` | ✅* | — | First account IMAP password/app-password |
| `IMAP_EMAIL_2` | ❌ | — | Second account email address |
| `IMAP_PASSWORD_2` | ❌ | — | Second account IMAP password |
| `WEBHOOK_URL` | ❌ | — | Destination URL for Interested notifications |
| `PORT` | ❌ | `3000` | Backend server port |
| `NODE_ENV` | ❌ | `development` | Environment mode |
| `FRONTEND_URL` | ❌ | — | Required in production for CORS |

*Required only if IMAP sync is to be used

---

## 🧩 Available Scripts

### Backend
```bash
npm run dev        # Start backend with nodemon hot-reload
npm run build      # Compile TypeScript to dist/
npm run start      # Start compiled production server
npm test           # Run Jest test suite
```

### Frontend
```bash
cd frontend
npm run dev        # Start Vite dev server (http://localhost:5173)
npm run build      # Build production bundle to dist/
npm run preview    # Preview production build locally
```

### Database
```bash
npx prisma migrate dev     # Create and apply a new migration
npx prisma migrate deploy  # Apply migrations (CI/production)
npx prisma db seed         # Seed sample emails + RAG training data
npx prisma studio          # Open visual DB browser (http://localhost:5555)
```

---

## 🔮 Roadmap

- [ ] **IMAP API endpoints** — Connect/disconnect accounts via REST instead of server startup
- [ ] **WebSocket live updates** — Push new emails to the frontend in real time
- [ ] **Multi-folder sync** — Extend IMAP sync to SENT, DRAFTS, custom folders
- [ ] **Multiple account UI** — Dynamic account management from the dashboard
- [ ] **Custom categories & rules** — User-defined classification logic
- [ ] **RAG training UI** — Manage training examples from the app without API calls
- [ ] **Pagination** — Cursor-based pagination for large inboxes
- [ ] **Authentication** — JWT/session-based auth with per-user account isolation
- [ ] **CI/CD pipeline** — GitHub Actions with automated test + Docker build
- [ ] **Metrics & observability** — Prometheus metrics, structured logging with Winston

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss the proposed change.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

Please follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

---

## 📄 License

ISC © [Varshith Reddy](https://github.com/varshithreddy7)

---

<div align="center">

Built with ❤️ using Node.js, TypeScript, React, PostgreSQL, Elasticsearch, and OpenAI

</div>
