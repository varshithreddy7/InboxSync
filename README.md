# ReachInbox Onebox - Email Aggregator with AI

A feature-rich email aggregator with real-time IMAP sync, AI categorization, and RAG-powered suggested replies built for the ReachInbox assignment.

## 🎯 Project Status

**48-Hour Assignment Challenge**
- Start: November 12, 2025, 12:33 AM IST
- Deadline: November 14, 2025, 12:33 AM IST
- Status: In Progress

## 🏗️ Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| **Backend** | Node.js + TypeScript + Express | Type-safe, scalable backend |
| **Database** | PostgreSQL + pgvector | ACID compliance + vector similarity search |
| **Search** | Elasticsearch | Full-text search with sub-100ms queries |
| **Email Sync** | ImapFlow (IDLE mode) | Real-time sync, not polling |
| **AI** | OpenAI GPT-4o-mini | Cost-effective, high accuracy |
| **Notifications** | Webhooks (webhook.site) | External automation trigger |
| **Frontend** | React + TypeScript | Interactive email interface |

## ✨ Features

### Completed
- [x] Project setup with TypeScript configuration
- [x] Docker Compose with Postgres + Elasticsearch
- [x] Prisma ORM with pgvector extension
- [x] Git repository initialization

### In Progress (Features 1-6)
- [ ] **Feature 1: Real-Time IMAP Sync**
  - Dual account support for now, after completion I will add multiple accounts too.
  - IDLE mode for sub-second latency
  - 30-day email fetching
  - Auto-reconnect with exponential backoff

- [ ] **Feature 2: Elasticsearch Search**
  - Full-text search across subject, body, sender
  - Filtering by account, folder, category
  - Multi-field indexing

- [ ] **Feature 3: AI Email Categorization**
  - 5-category classification (Interested, Meeting Booked, Not Interested, Spam, Out of Office)
  - GPT-4o-mini for cost efficiency
  - Automatic categorization on email arrival

- [ ] **Feature 4: Webhook Notifications**
  - Trigger webhooks for "Interested" emails
  - Retry logic with exponential backoff
  - External system integration

- [ ] **Feature 5: React Frontend**
  - Email list with real-time updates
  - Filter by account, category, folder
  - Search functionality
  - Responsive UI design

- [ ] **Feature 6: RAG Suggested Replies**
  - pgvector for vector similarity search
  - Training data with embeddings
  - Context-aware reply suggestions
  - **Direct interview invitation upon completion**

## 📦 Prerequisites

- **Docker & Docker Compose** (v2.27+)
- **Node.js** (v20.11+)
- **npm** (v10.8+)
- **OpenAI API Key** (for GPT-4o-mini)
- **Gmail App Passwords** (2 accounts for IMAP)

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/varshithreddy7/reachinbox-assignment.git
cd reachinbox-assignment
