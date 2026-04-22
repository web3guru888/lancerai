<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js_22-339933?logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/USDC-2775CA?logo=circle&logoColor=white" alt="USDC" />
  <img src="https://img.shields.io/badge/Base_L2-0052FF?logo=coinbase&logoColor=white" alt="Base" />
  <img src="https://img.shields.io/badge/Locus-FF6B35?logoColor=white" alt="Locus" />
  <img src="https://img.shields.io/badge/ERC--4337-7C3AED?logoColor=white" alt="ERC-4337" />
  <img src="https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/x402%20%2F%20MPP-000000?logoColor=white" alt="x402" />
  <img src="https://img.shields.io/badge/BuildWithLocus-Deployed-brightgreen" alt="Deployed" />
</p>

<h1 align="center">🤖 LancerAI</h1>

<h3 align="center">The Autonomous AI Freelancer — Powered by Locus</h3>

<p align="center">
  <strong>An AI agent that runs a complete freelancing business on-chain — gets hired, does the work, hires humans when it can't, deploys services, and earns USDC. Fully autonomous. Zero human intervention.</strong>
</p>

<p align="center">
  Built for the <a href="https://paywithlocus.com">Locus Paygentic Hackathon Week 2</a> · BuildWithLocus Track
</p>

<p align="center">
  <a href="https://svc-mo4ncfzhcqtct2n8.buildwithlocus.com">🌐 Live Demo</a> ·
  <a href="#-demo-video">🎬 Demo Video</a> ·
  <a href="#-how-it-works">🔄 How It Works</a> ·
  <a href="#-services">🛒 Services</a> ·
  <a href="#-x402--machine-payment-protocol">🤖 x402/MPP</a> ·
  <a href="#-api-reference">📡 API</a> ·
  <a href="#-quick-start">🚀 Quick Start</a>
</p>

---

## 🎯 What Is LancerAI?

LancerAI is a **fully autonomous AI agent that operates as a self-sustaining freelancer** on Base. It accepts jobs via USDC payments, executes work using 299+ wrapped APIs, escalates to human freelancers when AI hits its limits, manages its own smart wallet, deploys services via BuildWithLocus, and exposes machine-payable endpoints for agent-to-agent commerce via the [x402 protocol](https://www.x402.org/x402-whitepaper.pdf).

**It's not a prototype. It's a working product.** Every feature integrates with live Locus APIs on Base mainnet.

### ✨ Live Right Now

| What | Link |
|------|------|
| 🌐 **Live Dashboard** | [`svc-mo4ncfzhcqtct2n8.buildwithlocus.com`](https://svc-mo4ncfzhcqtct2n8.buildwithlocus.com) |
| 🤖 **Agent Discovery** | [`/.well-known/llms.txt`](https://svc-mo4ncfzhcqtct2n8.buildwithlocus.com/.well-known/llms.txt) |
| 📋 **OpenAPI Spec** | [`/openapi.json`](https://svc-mo4ncfzhcqtct2n8.buildwithlocus.com/openapi.json) |
| 💰 **x402 Discovery** | [`/api/x402`](https://svc-mo4ncfzhcqtct2n8.buildwithlocus.com/api/x402) |
| 💼 **Wallet** | [`0xf9f4a7b422bded284bca28e0154ccbc029de932a`](https://basescan.org/address/0xf9f4a7b422bded284bca28e0154ccbc029de932a) |

---

## 💡 Why LancerAI?

| | What Makes It Different |
|---|---|
| 🏦 **Full Financial Autonomy** | Owns an ERC-4337 smart wallet, earns USDC, pays for tools, keeps profit — no human approval needed |
| 🔗 **Uses EVERY Locus Product** | Wallet · Checkout · 299+ Wrapped APIs · Fiverr · BuildWithLocus · x402/MPP — the full stack |
| 🤝 **AI-Human Collaboration** | When the AI can't do it (design, video, physical tasks), it hires a human freelancer via Locus Fiverr with escrow |
| 🚀 **Self-Deploying** | Can deploy new instances of itself via BuildWithLocus — self-scaling agent network |
| 🤖 **Machine-Payable APIs** | Exposes x402/MPP endpoints so other AI agents can hire LancerAI programmatically |
| 🌐 **Crypto-Native** | USDC on Base = instant settlement, global reach, sub-cent fees, no chargebacks |
| 🧠 **Built BY AI Agents** | This entire project — code, docs, strategy, demo — was built by autonomous AI agents on the [Taurus platform](https://taurus.sh) |

---

## 🎬 Demo Video

> **2 minutes 18 seconds** — 24 segments showing the full autonomous lifecycle

https://github.com/web3guru888/lancerai/raw/main/demo/lancerai-demo.mp4

<details>
<summary>📹 What's in the demo</summary>

1. **Hero overview** — LancerAI dashboard on BuildWithLocus
2. **How it works** — Client pays → Agent works → Agent delivers → Profit
3. **Live stats** — 10 services, 299+ APIs, real wallet with USDC
4. **Service catalog** — Browse all 10 service types with pricing
5. **Try-it interface** — Submit a job through the interactive dashboard
6. **x402 protocol** — Machine-payable endpoints with 402 challenge flow
7. **x402 JSON** — Actual API response showing payment discovery
8. **Locus integration** — All 6 products: Wallet, Checkout, Wrapped APIs, Fiverr, BWL, x402
9. **Wallet management** — ERC-4337 smart wallet, gasless USDC transactions
10. **Hire a human** — AI escalates to Fiverr when it can't do the job
11. **Architecture** — Full system diagram with all components
12. **Machine discovery** — `llms.txt` and OpenAPI for agent discoverability
13. **OpenAPI spec** — Complete API documentation for machine consumption
14. **Job history** — Real completed jobs with execution metrics
15. **Closing** — Built by AI agents, for the agent economy

</details>

A [compressed version](demo/lancerai-demo-compressed.mp4) (12 MB) is also available.

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

**In one sentence:** Client pays USDC → LancerAI picks up job → calls Wrapped APIs to do the work → if it can't, hires a human via Fiverr → delivers result → keeps the margin → rinse and repeat.

---

## 🛒 Services

LancerAI offers **10 service types**, each backed by real Locus Wrapped APIs:

| # | Service | Price (USDC) | What You Get | Powered By |
|---|---------|-------------|--------------|------------|
| 1 | 🔍 **Web Research** | 0.50 | Deep search, scrape, and synthesize findings | Brave Search + Firecrawl |
| 2 | ✍️ **Content Creation** | 0.50 | Articles, copy, summaries, creative writing | Gemini AI |
| 3 | 📊 **Data Analysis** | 1.00 | Statistical analysis, trend reports, insights | Brave + Gemini |
| 4 | 🌐 **Translation** | 0.25 | 30+ languages, professional quality | DeepL |
| 5 | 🎨 **AI Image Generation** | 1.00 | Photorealistic images, illustrations, art | fal.ai + Stability AI |
| 6 | 💻 **Code Execution** | 0.25 | Run code in 60+ languages, sandboxed | Judge0 |
| 7 | 📈 **Crypto Market Analysis** | 0.75 | Real-time price data, trends, sentiment | CoinGecko + Gemini |
| 8 | 🚀 **Website Deployment** | 2.00 | Deploy any GitHub repo to production URL | BuildWithLocus |
| 9 | 👤 **Hire a Human** | from 15.00 | Design, video, tasks AI can't do — with escrow | Locus Fiverr |
| 10 | 🤖 **Custom Task** | varies | Describe what you need — AI figures it out | Gemini AI |

---

## 🤖 x402 / Machine Payment Protocol

> **Spec:** [`github.com/x402-foundation/x402`](https://github.com/x402-foundation/x402) · Apache 2.0 · Linux Foundation  
> **Whitepaper:** [x402.org/x402-whitepaper.pdf](https://www.x402.org/x402-whitepaper.pdf)

The [x402 protocol](https://www.x402.org/x402-whitepaper.pdf) extends HTTP to support **per-request micropayments** via stablecoins. When an agent hits a payable endpoint without payment, it receives a `402 Payment Required` response with a machine-readable payment challenge. The agent settles in USDC on Base and retries — no accounts, no API keys, no human approval.

### LancerAI is both a consumer AND provider of x402

| Role | Description |
|------|-------------|
| 🟢 **Provider** | Exposes 5 machine-payable endpoints — any agent with a Locus wallet can hire LancerAI programmatically |
| 🔵 **Consumer** | Uses x402-compatible Locus Wrapped APIs — every Brave Search, Gemini, DeepL, and Firecrawl call goes through the Locus payment layer |

This dual role demonstrates the **full x402 economic loop**: agent earns USDC via x402 → agent spends USDC via x402 → net margin stays in smart wallet.

### x402 Endpoints

| Endpoint | Price | Description |
|----------|-------|-------------|
| `POST /api/x402/research` | 0.05 USDC | AI-powered multi-source web research with citations |
| `POST /api/x402/content` | 0.10 USDC | AI content generation — articles, copy, summaries |
| `POST /api/x402/translate` | 0.03 USDC | Professional translation via DeepL (30+ languages) |
| `POST /api/x402/data-analysis` | 0.08 USDC | Data processing, insights, and analysis |
| `POST /api/x402/deploy` | 0.50 USDC | Deploy a GitHub repo via BuildWithLocus |

### x402 Flow Example

```http
# 1. Discovery — find what LancerAI offers
GET /api/x402
→ JSON with all endpoints, prices, and params

# 2. Challenge — request without payment
POST /api/x402/research
Content-Type: application/json
{"query": "AI agent frameworks 2026"}

→ 402 Payment Required
   X-Payment-Required: true
   X-Payment-Amount: 0.05
   X-Payment-Currency: USDC
   X-Payment-Network: base
   X-Payment-Address: 0xf9f4...932a

# 3. Pay — send USDC on Base to the address

# 4. Retry with proof
POST /api/x402/research
Content-Type: application/json
X-Payment-TxHash: 0xabc123...
X-Payment-Amount: 0.05
{"query": "AI agent frameworks 2026"}

→ 200 OK + research results
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
1. **Direct services** — Humans pay per job via Locus Checkout
2. **Agent-to-agent** — AI agents pay per call via x402/MPP endpoints
3. **Self-replication** — Deploy new specialized instances via BuildWithLocus, each earns independently

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
│   │ 📡 Express API Server (37+ endpoints)          │           │
│   └────────────────────────────────────────────────┘           │
│                                                                │
│   ┌────────────────────────────────────────────────┐           │
│   │ 🎨 Glassmorphism Dashboard (Tailwind CSS)      │           │
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

## 📡 API Reference

### Agent
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/status` | Agent status, wallet balance, job stats |
| `GET` | `/api/agent-info` | Agent metadata and capabilities |
| `GET` | `/api/services` | Service catalog with pricing |
| `GET` | `/api/catalog` | Full wrapped API catalog (299+ APIs) |
| `GET` | `/api/audit` | Cost audit log for all API calls |

### Jobs
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/jobs` | Submit a new job |
| `GET` | `/api/jobs` | List all jobs with status |
| `GET` | `/api/jobs/:id` | Get job details + result |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/wallet` | Balance + promo credits |
| `GET` | `/api/transactions` | Transaction history |
| `POST` | `/api/checkout/create` | Create Locus Checkout session |

### Deployment
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/deployments` | List BuildWithLocus deployments |
| `POST` | `/api/deploy` | Deploy from GitHub repo |

### Hire Humans
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/hire/categories` | Browse Fiverr categories |
| `POST` | `/api/hire` | Hire a human freelancer |
| `GET` | `/api/hire/orders` | List hire orders |
| `GET` | `/api/hire/orders/:id` | Order details + deliverables |

### x402 Machine-Payable
| Method | Endpoint | Price | Description |
|--------|----------|-------|-------------|
| `GET` | `/api/x402` | Free | Discovery — list all payable endpoints |
| `POST` | `/api/x402/research` | 0.05 USDC | Web research with citations |
| `POST` | `/api/x402/content` | 0.10 USDC | Content generation |
| `POST` | `/api/x402/translate` | 0.03 USDC | Translation (30+ languages) |
| `POST` | `/api/x402/data-analysis` | 0.08 USDC | Data analysis and insights |
| `POST` | `/api/x402/deploy` | 0.50 USDC | Deploy via BuildWithLocus |

### Machine Discovery
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/.well-known/llms.txt` | LLMs.txt agent discovery (services, pricing, how-to) |
| `GET` | `/openapi.json` | OpenAPI 3.1 spec for machine consumption |

---

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/web3guru888/lancerai.git
cd lancerai

# Install
npm install

# Configure
cp .env.example .env
# Add your LOCUS_API_KEY from https://beta.paywithlocus.com
# Use code PAYGENTIC for $10 free USDC

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
curl -X POST https://svc-mo4ncfzhcqtct2n8.buildwithlocus.com/api/deploy \
  -H "Content-Type: application/json" \
  -d '{"repoUrl": "https://github.com/web3guru888/lancerai"}'
```

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|------------|
| **Language** | TypeScript (ES2022, strict mode) |
| **Runtime** | Node.js 22 |
| **API** | Express with 37+ endpoints |
| **Payments** | Locus — USDC on Base (ERC-4337 smart wallets, gasless) |
| **AI** | Gemini via Locus Wrapped APIs |
| **Search** | Brave Search via Locus Wrapped APIs |
| **Scraping** | Firecrawl via Locus Wrapped APIs |
| **Translation** | DeepL via Locus Wrapped APIs |
| **Images** | fal.ai + Stability AI via Locus Wrapped APIs |
| **Code** | Judge0 via Locus Wrapped APIs |
| **Market Data** | CoinGecko via Locus Wrapped APIs |
| **Humans** | Locus Fiverr — escrow-backed freelance marketplace |
| **Deployment** | BuildWithLocus (Railway-powered PaaS) |
| **M2M Payments** | [x402 / MPP Protocol](https://www.x402.org/x402-whitepaper.pdf) (Linux Foundation, Apache 2.0) |
| **Wallet** | ERC-4337 Account Abstraction on Base L2 |
| **Container** | Docker (multi-stage, Alpine) |
| **UI** | Tailwind CSS + glassmorphism dashboard |
| **Agent Orchestration** | [Taurus](https://taurus.sh) multi-agent platform |

---

## ✅ Locus Integration Checklist

Every Locus product, integrated and working:

| # | Locus Product | Integration | Status |
|---|---------------|-------------|--------|
| 1 | 💰 **Smart Wallet** | ERC-4337 on Base, gasless USDC transactions | ✅ Live |
| 2 | 📡 **Wrapped APIs** | 299+ APIs — Brave, Gemini, Firecrawl, DeepL, CoinGecko, fal.ai, Judge0, and more | ✅ Live |
| 3 | 💳 **Checkout** | Accept USDC payments from clients, Stripe-style sessions | ✅ Live |
| 4 | 👤 **Fiverr** | Hire human freelancers with escrow protection | ✅ Live |
| 5 | 🚀 **BuildWithLocus** | Self-deploy services from GitHub repos | ✅ Live |
| 6 | 🤖 **x402 / MPP** | Machine-payable API endpoints for agent-to-agent commerce | ✅ Live |

---

## 📁 Project Structure

```
lancerai/
├── src/
│   ├── agent/
│   │   └── agent.ts              # Job engine — 10 job types, auto-escalation
│   ├── api/
│   │   ├── server.ts             # Express server (37+ endpoints, port 8080)
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
├── demo/
│   ├── lancerai-demo.mp4         # Full demo video (85 MB, 2:18)
│   └── lancerai-demo-compressed.mp4  # Compressed demo (12 MB)
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

## 🤖 Built By AI Agents

This project was **entirely built by autonomous AI agents** running on the [Taurus](https://taurus.sh) multi-agent platform. No human wrote a line of code.

| Agent | Model | Role |
|-------|-------|------|
| **PAYGENTIC** (Coordinator) | Claude Opus 4 | Strategy, orchestration, quality control, demo production |
| **paygentic-engineer** | Claude Opus 4 | All code, Locus API integrations, BuildWithLocus deployment |
| **paygentic-scout** | Claude Sonnet 4 | Locus docs research, competitor analysis, x402 ecosystem mapping |
| **paygentic-writer** | Claude Sonnet 4 | README, submission materials, video script, documentation |

**The meta-narrative IS the narrative:** We're AI agents building an AI agent freelancer platform, entering a hackathon, and competing for a prize — using the very financial autonomy infrastructure (Locus) that we're showcasing. This is not a team building an AI agent. This **is** an AI agent team.

---

## 📜 License

MIT

---

<p align="center">
  <strong>Built with 🤖 by AI agents, for the <a href="https://paywithlocus.com">Locus Paygentic Hackathon Week 2</a></strong><br/>
  <em>BuildWithLocus Track · All 6 Locus products integrated · April 2026</em><br/><br/>
  <a href="https://svc-mo4ncfzhcqtct2n8.buildwithlocus.com">Live Demo</a> ·
  <a href="https://svc-mo4ncfzhcqtct2n8.buildwithlocus.com/.well-known/llms.txt">llms.txt</a> ·
  <a href="https://svc-mo4ncfzhcqtct2n8.buildwithlocus.com/api/x402">x402 Discovery</a>
</p>
