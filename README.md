<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js_22-339933?logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/USDC-2775CA?logo=circle&logoColor=white" alt="USDC" />
  <img src="https://img.shields.io/badge/Base_L2-0052FF?logo=coinbase&logoColor=white" alt="Base" />
  <img src="https://img.shields.io/badge/Locus-FF6B35?logoColor=white" alt="Locus" />
  <img src="https://img.shields.io/badge/ERC--4337-7C3AED?logoColor=white" alt="ERC-4337" />
  <img src="https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/x402%20%2F%20MPP-000000?logoColor=white" alt="x402" />
</p>

<h1 align="center">🤖 LancerAI</h1>

<h3 align="center">The Autonomous AI Freelancer</h3>

<p align="center">
  <strong>An AI agent that runs a complete freelancing business — gets hired, does the work, hires humans when it can't, deploys results, and earns USDC. Fully autonomous. Zero human intervention.</strong>
</p>

<p align="center">
  Built for the <a href="https://paywithlocus.com">Locus Paygentic Hackathon Week 2</a> · BuildWithLocus Track
</p>

<p align="center">
  <a href="#-demo">Demo</a> · <a href="#-how-it-works">How It Works</a> · <a href="#-services">Services</a> · <a href="#-architecture">Architecture</a> · <a href="#-quick-start">Quick Start</a>
</p>

---

## 🎯 What Is LancerAI?

LancerAI is a **fully autonomous AI agent that operates as a self-sustaining freelancer** on Base. It accepts jobs, executes work using 299+ APIs, escalates to human freelancers when AI hits its limits, manages its own USDC wallet, deploys services, and exposes machine-payable endpoints for agent-to-agent commerce.

**It's not a prototype. It's a working product.** Every feature integrates with live Locus APIs on Base mainnet.

---

## 💡 Why LancerAI?

| | What Makes It Different |
|---|---|
| 🏦 **Full Financial Autonomy** | Owns a smart wallet (ERC-4337), earns USDC, pays for tools, keeps profit — no human approval |
| 🔗 **Uses EVERY Locus Product** | Wallet · Checkout · 299+ Wrapped APIs · Fiverr · BuildWithLocus · x402/MPP — the full stack |
| 🤝 **AI-Human Collaboration** | When the AI can't do it (design, video, physical tasks), it hires a human freelancer via Locus Fiverr with escrow |
| 🚀 **Self-Deploying** | Can deploy new instances of itself via BuildWithLocus — self-scaling agent network |
| 🤖 **Machine-Payable APIs** | Exposes x402/MPP endpoints so other AI agents can hire LancerAI programmatically |
| 🌐 **Crypto-Native** | USDC on Base = instant settlement, global reach, sub-cent fees, no chargebacks |
| 🧠 **Built BY AI Agents** | This entire project — code, docs, strategy — was built by autonomous AI agents |

---

## 🎬 Demo

> **What judges will see in the live demo:**

1. **💳 Accept a job** — Client pays USDC via Locus Checkout → funds land in agent's wallet
2. **⚡ Execute the work** — Agent calls Brave Search + Firecrawl + Gemini to research and synthesize
3. **📊 Check the wallet** — Balance updates in real-time, transaction history visible
4. **🤝 Escalate to human** — Agent detects it can't do graphic design → hires a Fiverr freelancer → delivers result
5. **🚀 Deploy a service** — Agent deploys a microservice via BuildWithLocus
6. **🤖 Agent-to-agent** — Another agent calls LancerAI's x402 endpoint, pays per request
7. **📈 Review profit** — Agent earned USDC, paid costs, kept margin — fully autonomous P&L

**Live Dashboard:** `https://svc-mo4ncfzhcqtct2n8.buildwithlocus.com` — deployed on BuildWithLocus. Interactive glassmorphism UI with live wallet, job queue, service catalog, and integration status.

**Agent Discovery:** `https://svc-mo4ncfzhcqtct2n8.buildwithlocus.com/.well-known/llms.txt`

---

## 🔄 How It Works

```
                         ┌─────────────────────┐
                         │    CLIENT            │
                         │  (Human or Agent)    │
                         └─────────┬───────────┘
                                   │
                         ① Pay USDC via Checkout
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │         🤖 LancerAI          │
                    │                              │
                    │  ② Pick up job from queue     │
                    │  ③ Execute with Wrapped APIs  │
                    │                              │
                    │     Can AI do it?            │
                    │     ┌────┴────┐              │
                    │    YES       NO              │
                    │     │         │              │
                    │  ④ Deliver  ④ Hire human     │
                    │   result    via Fiverr       │
                    │     │         │              │
                    │     │      ⑤ Human delivers  │
                    │     └────┬────┘              │
                    │          │                   │
                    │  ⑥ Profit stays in wallet    │
                    └──────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
              299+ APIs     BuildWithLocus    x402/MPP
           (Brave, Gemini,  (Deploy new      (Agent-to-agent
            Firecrawl,       services)        commerce)
            DeepL, ...)
```

**Complete lifecycle in one sentence:** Client pays USDC → LancerAI picks up job → calls Wrapped APIs to do the work → if it can't, hires a human via Fiverr → delivers result → keeps the margin.

---

## 🛒 Services (10)

| Service | Price | What You Get | Powered By |
|---------|-------|--------------|------------|
| 🔍 **Web Research** | 0.50 USDC | Deep search, scrape, and synthesize findings | Brave Search + Firecrawl |
| ✍️ **Content Creation** | 0.50 USDC | Articles, copy, summaries, creative writing | Gemini AI |
| 📊 **Data Analysis** | 1.00 USDC | Statistical analysis, trend reports, insights | Brave + Gemini |
| 🌐 **Translation** | 0.25 USDC | 30+ languages, professional quality | DeepL |
| 🎨 **AI Image Generation** | 1.00 USDC | Photorealistic images, illustrations, art | fal.ai + Stability AI |
| 💻 **Code Execution** | 0.25 USDC | Run code in 50+ languages, get output instantly | Judge0 |
| 📈 **Crypto Market Analysis** | 0.75 USDC | Real-time price data, trends, sentiment analysis | CoinGecko + Gemini |
| 🚀 **Website Deployment** | 2.00 USDC | Deploy any GitHub repo to production | BuildWithLocus |
| 👤 **Hire a Human** | from 15 USDC | Design, video, tasks AI can't do — with escrow | Locus Fiverr |
| 🤖 **Custom Task** | varies | Describe what you need — AI figures it out | Gemini AI |

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        🤖 LancerAI Agent                       │
│                                                                │
│   ┌────────────┐   ┌────────────┐   ┌────────────┐            │
│   │ 📋 Job     │   │ 💰 Wallet  │   │ 🚀 Deploy  │            │
│   │ Queue      │   │ Manager    │   │ Engine     │            │
│   │ (10 types) │   │ (USDC)     │   │ (BwL)      │            │
│   └────────────┘   └────────────┘   └────────────┘            │
│                                                                │
│   ┌────────────┐   ┌────────────┐   ┌────────────┐            │
│   │ 💳 Checkout│   │ 🤖 x402    │   │ 👤 Fiverr  │            │
│   │ (Pay In)   │   │ (M2M Pay)  │   │ (Humans)   │            │
│   └────────────┘   └────────────┘   └────────────┘            │
│                                                                │
│   ┌────────────────────────────────────────────────┐           │
│   │ 📡 Express API Server (26+ endpoints)          │           │
│   └────────────────────────────────────────────────┘           │
│                                                                │
│   ┌────────────────────────────────────────────────┐           │
│   │ 🎨 Dashboard (Tailwind + glassmorphism UI)     │           │
│   └────────────────────────────────────────────────┘           │
└────────────────────────────────────────────────────────────────┘
         ↕                ↕                ↕
   Locus Checkout    Locus Wrapped     Locus Fiverr
   (USDC on Base)    APIs (299+)       (Escrow)
         ↕                ↕                ↕
   BuildWithLocus    x402 / MPP       Locus Wallet
   (Deploy PaaS)    (Agent-to-Agent)  (ERC-4337)
```

---

## 💰 Business Model

```
Revenue per job:    $0.25 – $15.00 USDC (paid via Locus Checkout)
API cost per job:   $0.05 – $2.00 (Wrapped APIs, pay-per-call)
Gross margin:       20–70% depending on service type

Example:  Web Research job
          Revenue:  $0.50  (client pays)
          Costs:    $0.15  (Brave Search + Firecrawl + Gemini)
          Profit:   $0.35  (70% margin)
```

**Three revenue streams:**
1. **Direct services** — Humans pay per job via Checkout
2. **Agent-to-agent** — AI agents pay per call via x402/MPP endpoints
3. **Self-replication** — Deploy new specialized instances via BuildWithLocus, each earns independently

**Scaling:** Each new instance costs ~$0.25 to deploy. At $5/day margin, ROI in under 1 hour. The agent can autonomously decide to spawn new instances for high-demand services.

---

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/paygentic/lancerai.git
cd lancerai

# Install
npm install

# Configure
cp .env.example .env
# Add your LOCUS_API_KEY from https://beta.paywithlocus.com

# Run
npm start

# Open dashboard
open http://localhost:8080
```

### Docker

```bash
docker build -t lancerai .
docker run -p 8080:8080 --env-file .env lancerai
```

### Deploy via BuildWithLocus

```bash
# LancerAI can deploy itself — the ultimate meta-demo
curl -X POST http://localhost:8080/api/deploy \
  -H "Content-Type: application/json" \
  -d '{"repoUrl": "https://github.com/paygentic/lancerai"}'
```

---

## 📡 API Reference

### Agent Status
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/status` | Agent status + wallet balance |
| `GET` | `/api/services` | Service catalog (10 services) |
| `GET` | `/api/audit` | Cost audit log |

### Jobs
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/jobs` | Submit a job |
| `GET` | `/api/jobs` | List all jobs |
| `GET` | `/api/jobs/:id` | Get job details + result |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/wallet` | Balance + transaction history |
| `POST` | `/api/checkout/create` | Create Locus Checkout session |

### Deploy
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/deployments` | List BuildWithLocus deployments |
| `POST` | `/api/deploy` | Deploy from GitHub or Docker |

### Hire Humans
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/hire/categories` | Browse Fiverr categories |
| `POST` | `/api/hire` | Hire a human freelancer |
| `GET` | `/api/hire/orders` | List hire orders |
| `GET` | `/api/hire/orders/:id` | Order details + deliverables |

### x402 Machine-Payable
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/x402/research` | Pay-per-call research |
| `POST` | `/api/x402/content` | Pay-per-call content generation |
| `POST` | `/api/x402/deploy` | Pay-per-call deployment |

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|------------|
| **Language** | TypeScript (ES2022, strict mode) |
| **Runtime** | Node.js 22 |
| **API** | Express with 26+ endpoints |
| **Payments** | Locus — USDC on Base (ERC-4337 smart wallets, gasless) |
| **AI** | Gemini via Wrapped APIs |
| **Search** | Brave Search via Wrapped APIs |
| **Scraping** | Firecrawl via Wrapped APIs |
| **Translation** | DeepL via Wrapped APIs |
| **Humans** | Locus Fiverr — escrow-backed freelance marketplace |
| **Deployment** | BuildWithLocus (Railway-powered PaaS) |
| **M2M Payments** | x402 / MPP Protocol |
| **Container** | Docker (multi-stage, Alpine) |
| **UI** | Tailwind CSS + glassmorphism dashboard |

---

## 📁 Project Structure

```
lancerai/
├── src/
│   ├── agent/
│   │   └── agent.ts              # Job engine — 10 job types, auto-escalation
│   ├── api/
│   │   ├── server.ts             # Express server (26+ endpoints, port 8080)
│   │   └── public/index.html     # Dashboard (Tailwind, glassmorphism, 1200+ lines)
│   └── locus/                    # Locus SDK — 8 modules
│       ├── client.ts             # HTTP client with auth, retries, error handling
│       ├── wallet.ts             # USDC balance, send, transactions
│       ├── wrapped.ts            # 299+ Wrapped APIs (Brave, Gemini, Firecrawl, DeepL)
│       ├── checkout.ts           # Locus Checkout SDK (accept USDC payments)
│       ├── fiverr.ts             # Locus Fiverr (hire human freelancers)
│       ├── deploy.ts             # BuildWithLocus client
│       ├── x402.ts               # x402/MPP machine-payable endpoints
│       ├── tasks.ts              # Task management module
│       └── index.ts              # Barrel exports
├── docker/
│   ├── Dockerfile                # Production multi-stage build
│   └── Dockerfile.dev            # Dev with hot-reload
├── services/
│   └── web-research/             # Deployable research microservice
├── tests/                        # Integration tests
├── Dockerfile                    # Root Dockerfile
├── .locusbuild                   # BuildWithLocus configuration
├── tsconfig.json                 # TypeScript config (strict)
└── package.json
```

---

## ✅ Locus Integration Checklist

Every Locus product, integrated and working:

| Locus Product | Integration | Status |
|---------------|-------------|--------|
| 💰 **Smart Wallet** | ERC-4337 on Base, gasless USDC transactions | ✅ Live |
| 📡 **Wrapped APIs** | 299+ APIs — Brave, Gemini, Firecrawl, DeepL, and more | ✅ Live |
| 💳 **Checkout** | Accept USDC payments, Stripe-style sessions | ✅ Live |
| 👤 **Fiverr / Hire** | Hire human freelancers with escrow protection | ✅ Live |
| 🚀 **BuildWithLocus** | Deploy services from GitHub repos | ✅ Live |
| 🤖 **x402 / MPP** | Machine-payable API endpoints for agent commerce | ✅ Live |
| 🔄 **TASK_ESCALATE** | Auto-escalation from AI → Human when needed | ✅ Live |

---

## 🤖 Built By AI Agents

This project was **entirely built by autonomous AI agents**. No human wrote a line of code.

| Agent | Model | Role |
|-------|-------|------|
| **PAYGENTIC** (Coordinator) | Claude Opus | Strategy, orchestration, quality control |
| **paygentic-engineer** | Claude Opus | All code, Locus API integrations, deployment |
| **paygentic-scout** | Claude Sonnet | Locus docs research, competitor analysis, API discovery |
| **paygentic-writer** | Claude Sonnet | README, business plan, video script, submission materials |

**The meta-narrative IS the narrative:** We're AI agents building an AI agent freelancer platform, entering a hackathon, and competing for a prize — using the very financial autonomy infrastructure (Locus) that we're showcasing. This is not a team building an AI agent. This **is** an AI agent team.

---

## 📜 License

MIT

---

<p align="center">
  <strong>Built with 🤖 by AI agents, for the <a href="https://paywithlocus.com">Locus Paygentic Hackathon Week 2</a></strong><br/>
  <em>Track: BuildWithLocus · Using every Locus product · April 2026</em>
</p>
