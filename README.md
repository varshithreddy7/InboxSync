# 📬 ReachInbox Assignment

> **AI-Powered Email Aggregator with Real-Time Sync & Intelligent Categorization**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com/)

---

## 🌟 Overview

**ReachInbox Onebox** is a feature-rich email aggregation platform that unifies multiple email accounts into a single, intelligent interface. Leveraging real-time IMAP synchronization, AI-powered categorization, and RAG-based reply suggestions, it transforms how you manage your inbox.

### 🎯 Project Timeline

| Milestone | Date |
|-----------|------|
| **Start Date** | November 12, 2025, 12:33 AM IST |
| **Deadline** | November 14, 2025, 12:33 AM IST |
| **Duration** | 48-hour Development Challenge |
| **Status** | ✅ Completed |

---

## ✨ Key Features

### 🔄 Real-Time Email Synchronization
- **Dual Account Support** – Manage multiple Gmail accounts simultaneously
- **IDLE Mode Integration** – Sub-second latency for instant email delivery
- **Historical Sync** – Automatically fetches emails from the past 30 days
- **Auto-Reconnect** – Exponential backoff for resilient connections

### 🤖 AI-Powered Intelligence
- **Smart Categorization** – Automatically classifies emails into:
  - 💼 Interested
  - 📅 Meeting Booked
  - ❌ Not Interested
  - 🚫 Spam
  - 🏖️ Out of Office
- **RAG Suggested Replies** – Context-aware responses using vector similarity search
- **OpenAI Integration** – Powered by GPT-4o-mini for cost-effective accuracy

### 🔍 Advanced Search
- **Full-Text Search** – Lightning-fast queries across subject, body, and sender
- **Smart Filtering** – Filter by account, folder, and AI category
- **Elasticsearch Backend** – Sub-100ms search performance

### 🔔 Webhook Notifications
- **Automated Alerts** – Instant notifications for "Interested" emails
- **Retry Logic** – Exponential backoff for failed deliveries
- **Configurable Endpoints** – Easy webhook.site integration

### 🎨 Modern React Interface
- **Real-Time Updates** – Live email list synchronization
- **Responsive Design** – Seamless experience across devices
- **Intuitive Filtering** – Easy navigation and search

---

## 🏗️ Technology Stack

```mermaid
graph TD
    A[React Frontend] -->|REST API| B[Express Backend]
    B -->|ORM| C[PostgreSQL + pgvector]
    B -->|Indexing| D[Elasticsearch]
    B -->|AI Services| E[OpenAI GPT-4o-mini]
    B -->|Email Sync| F[ImapFlow IDLE]
    B -->|Notifications| G[Webhook.site]
```

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React + TypeScript | Dynamic, type-safe UI |
| **Backend** | Node.js + Express + TypeScript | Scalable REST API server |
| **Database** | PostgreSQL + pgvector | ACID compliance + vector search |
| **Search Engine** | Elasticsearch | Full-text search (<100ms) |
| **Email Protocol** | ImapFlow (IDLE mode) | Real-time synchronization |
| **AI/ML** | OpenAI GPT-4o-mini | Email classification & replies |
| **Notifications** | Webhooks | External event triggers |

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Docker & Docker Compose** (v2.27+)
- **Node.js** (v20.11+)
- **npm** (v10.8+)
- **OpenAI API Key** ([Get one here](https://platform.openai.com/api-keys))
- **Gmail App Passwords** ([Setup guide](https://support.google.com/accounts/answer/185833))

---

## 🚀 Quick Start

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/varshithreddy7/reachinbox-assignment.git
cd reachinbox-assignment
```

### 2️⃣ Install Dependencies

```bash
# Backend dependencies
npm install

# Frontend dependencies
cd frontend
npm install
cd ..
```

### 3️⃣ Start Docker Services

```bash
docker-compose up -d
```

This will start:
- PostgreSQL (port 5432)
- Elasticsearch (port 9200)

### 4️⃣ Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/reachinbox

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200

# OpenAI
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4o-mini

# Email Account 1
IMAP_EMAIL_1=your.email1@gmail.com
IMAP_PASSWORD_1=your-app-password-1

# Email Account 2
IMAP_EMAIL_2=your.email2@gmail.com
IMAP_PASSWORD_2=your-app-password-2

# Webhooks
WEBHOOK_URL=https://webhook.site/your-unique-id

# Frontend
FRONTEND_URL=http://localhost:5173
```

### 5️⃣ Setup Database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed initial data (optional)
npx prisma db seed
```

### 6️⃣ Launch Application

```bash
# Terminal 1: Start backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev
```

### 7️⃣ Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

---

## 🎥 Video Demonstration

📺 **[Watch Full Demo](https://drive.google.com/file/d/1nIUaSw7GcSISztYk1F8Jo6kl5vQaLvKv/view?usp=sharing)**

See ReachInbox Onebox in action, showcasing:
- Real-time email synchronization
- AI-powered categorization
- RAG-based reply suggestions
- Search and filtering capabilities

---

## 🏛️ Architecture

### System Design

```
┌─────────────────┐
│  React Frontend │
│   (Port 5173)   │
└────────┬────────┘
         │ REST API
         ▼
┌─────────────────┐      ┌──────────────┐
│ Express Backend │◄────►│ Elasticsearch│
│   (Port 3000)   │      │  (Port 9200) │
└────────┬────────┘      └──────────────┘
         │
    ┌────┴────┬────────────┬──────────────┐
    ▼         ▼            ▼              ▼
┌────────┐ ┌──────┐ ┌──────────┐  ┌──────────┐
│Postgres│ │IMAP  │ │ OpenAI   │  │ Webhooks │
│+pgvector│ │Sync  │ │ API      │  │          │
└────────┘ └──────┘ └──────────┘  └──────────┘
```

### Key Components

- **IMAP Sync Service** – Maintains persistent connections using IDLE mode
- **AI Service** – Handles categorization and reply generation
- **Search Service** – Manages Elasticsearch indexing and queries
- **Webhook Service** – Delivers notifications with retry logic
- **Vector Store** – pgvector for semantic similarity search

---

## 📁 Project Structure

```
reachinbox-assignment/
├── src/
│   ├── services/
│   │   ├── imap.service.ts      # Email synchronization
│   │   ├── ai.service.ts        # AI categorization & replies
│   │   ├── search.service.ts    # Elasticsearch integration
│   │   ├── rag.service.ts    # Rag Service integration
│   │   └── webhook.service.ts   # Notification delivery
│   ├── routes/
│   │   └── aiRoutes.ts        # REST API endpoints
│   │   └── emailRoutes.ts
│   │   └── ragRoutes.ts
│   │   └── searchRoutes.ts
│   │   └── webhookRoutes.ts
    └── server.ts                # Express application
├── frontend/
│   ├── src/
│   │   ├── components/          # React components
│   │   └── App.tsx              # Main application
│   └── package.json
├── prisma/
│   └── schema.prisma            # Database schema
├── docker-compose.yml           # Docker services
└── package.json
```

---

## 🔒 Security Features

- **CORS Protection** – Configured for frontend origin only
- **DOMPurify Integration** – XSS prevention for email content
- **Environment Variables** – Sensitive data never hardcoded
- **Type Safety** – Full TypeScript coverage
- **Input Validation** – Sanitized user inputs

---

## 🧪 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/emails` | Fetch all emails with filters |
| `GET` | `/api/emails/:id` | Get specific email details |
| `POST` | `/api/emails/:id/categorize` | Trigger AI categorization |
| `POST` | `/api/emails/:id/reply` | Generate AI reply suggestion |
| `GET` | `/api/search` | Full-text email search |
| `GET` | `/api/accounts` | List connected accounts |

---

## 🤝 Contributing

This project was developed as part of a 48-hour coding challenge. Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 👨‍💻 Author

**Varshith Reddy**

- GitHub: [@varshithreddy7](https://github.com/varshithreddy7)
- Project Link: [ReachInbox Assignment](https://github.com/varshithreddy7/reachinbox-assignment)

---

## 🙏 Acknowledgments

- **ReachInbox** – For the challenging assignment opportunity
- **OpenAI** – For GPT-4o-mini API
- **ImapFlow** – For reliable IMAP implementation
- **Elasticsearch** – For blazing-fast search capabilities

---

<div align="center">

**Made with ❤️ in 48 hours**

⭐ Star this repository if you found it helpful!

</div>
