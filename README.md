# LancerAI — The Autonomous AI Freelancer

> An AI agent that operates as an autonomous freelancer — gets hired, does work, deploys results, hires humans when needed, and earns USDC. All powered by [Locus](https://paywithlocus.com) on Base.

**Built for the [Synthesis Hackathon](https://paywithlocus.com)**

## What is LancerAI?

LancerAI is a fully autonomous AI agent that runs a freelancing business:

1. **Gets hired** — Clients pay via Locus Checkout (USDC on Base) to request services
2. **Does the work** — Uses Locus Wrapped APIs (Brave Search, Gemini, Firecrawl, etc.)
3. **Deploys results** — Uses BuildWithLocus to deploy websites and apps for clients
4. **Hires humans** — Escalates to human freelancers via Locus Fiverr when AI can't do it
5. **Gets paid** — Collects USDC in its Locus smart wallet (ERC-4337, gasless)
6. **Offers APIs** — Exposes x402/MPP machine-payable endpoints for agent-to-agent commerce

## Services Offered

| Service | Price | Description | Powered By |
|---------|-------|-------------|------------|
| 🔍 Web Research | 0.50 USDC | Search, scrape, and summarize | Brave Search + Firecrawl |
| ✍️ Content Creation | 0.50 USDC | Generate high-quality content | Gemini AI |
| 📊 Data Analysis | 1.00 USDC | Analyze data, compute stats | Brave + Gemini |
| 🌐 Translation | 0.25 USDC | 30+ language translation | DeepL |
| 🚀 Website Deployment | 2.00 USDC | Deploy from GitHub repo | BuildWithLocus |
| 👤 Hire a Human | from 15 USDC | Escalate to human freelancer | Locus Fiverr |
| 🤖 Custom Task | varies | Describe what you need | Gemini AI |

## Locus Protocol (TASK_ESCALATE)

When LancerAI can't complete a job, it automatically escalates to a human freelancer via Locus Fiverr:

```
Client Request → AI Attempts → Success? → Deliver Result
                                  ↓ No
                            Escalate to Human (Fiverr)
                                  ↓
                            Escrow Payment (USDC)
                                  ↓
                            Human Delivers → Client Gets Result
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│              LancerAI Agent                     │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ Job Queue │  │ Wallet   │  │ Deployer │      │
│  │ Manager  │  │ (USDC)   │  │ (BwL)    │      │
│  └──────────┘  └──────────┘  └──────────┘      │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ Checkout │  │ x402/MPP │  │ Fiverr   │      │
│  │ (Pay In) │  │ (M2M)    │  │ (Humans) │      │
│  └──────────┘  └──────────┘  └──────────┘      │
└─────────────────────────────────────────────────┘
         ↕              ↕            ↕
    Locus Checkout  Locus Wrapped  Locus Fiverr
    (USDC on Base)  APIs (50+)    (Escrow)
```

## Revenue Flow

```
Client → Locus Checkout (USDC) → Agent Wallet
                                      ↓
                              Wrapped APIs (costs)
                              BuildWithLocus (deploy costs)
                              Fiverr (human hire costs)
                                      ↓
                              Profit stays in wallet
```

## Quick Start

```bash
# Clone and install
git clone https://github.com/YOUR_ORG/lancerai.git
cd lancerai
npm install

# Set up credentials
cp .env.example .env
# Edit .env with your LOCUS_API_KEY from https://beta.paywithlocus.com

# Run the agent
npm start
# Dashboard: http://localhost:8080
```

## API Endpoints

### Agent
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/status` | Agent status + wallet |
| GET | `/api/services` | Service catalog (7 services) |
| GET | `/api/audit` | Request audit log |

### Jobs
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/jobs` | Submit a job |
| GET | `/api/jobs` | List all jobs |
| GET | `/api/jobs/:id` | Get job details |

### Wallet & Payments
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/wallet` | Balance + transactions |
| POST | `/api/checkout/create` | Create checkout session (accept payment) |

### BuildWithLocus
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/deployments` | List deployments |
| POST | `/api/deploy` | Deploy from GitHub/Docker |

### Hire with Locus (Fiverr)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/hire/categories` | Browse freelancer categories |
| POST | `/api/hire` | Hire a human freelancer |
| GET | `/api/hire/orders` | List hire orders |
| GET | `/api/hire/orders/:id` | Order details + deliverables |

### x402 Machine-Payable
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/x402/research` | Paid research endpoint |
| POST | `/api/x402/content` | Paid content generation |
| POST | `/api/x402/deploy` | Paid deployment |

## Tech Stack

- **Language**: TypeScript (ES2022)
- **Runtime**: Node.js 22
- **Framework**: Express
- **Payments**: Locus — USDC on Base (ERC-4337 smart wallets, gasless)
- **Deployment**: BuildWithLocus (Railway-powered PaaS)
- **AI**: Gemini (via Wrapped APIs), Brave Search, Firecrawl
- **Humans**: Locus Fiverr (escrow-backed freelance marketplace)
- **Container**: Docker (multi-stage, Alpine)

## Project Structure

```
lancerai/
├── src/
│   ├── agent/
│   │   └── agent.ts           # Job engine (7 job types, auto-escalation)
│   ├── api/
│   │   ├── server.ts          # Express server (port 8080)
│   │   └── public/index.html  # Dashboard (Tailwind, glassmorphism)
│   └── locus/
│       ├── client.ts          # HTTP client with auth, retries
│       ├── wallet.ts          # USDC balance, send, transactions
│       ├── wrapped.ts         # Wrapped APIs (Brave, Gemini, Firecrawl)
│       ├── checkout.ts        # Locus Checkout SDK (accept payments)
│       ├── fiverr.ts          # Locus Fiverr (hire human freelancers)
│       ├── deploy.ts          # BuildWithLocus client
│       ├── x402.ts            # x402/MPP endpoints
│       ├── tasks.ts           # Legacy tasks module
│       └── index.ts           # Barrel exports
├── docker/
│   ├── Dockerfile             # Production build
│   └── Dockerfile.dev         # Dev with hot-reload
├── services/
│   └── web-research/          # Deployable research microservice
├── tests/                     # Integration tests
├── Dockerfile                 # Root Dockerfile
├── .locusbuild                # BuildWithLocus config
└── tsconfig.json
```

## Locus Features Used

- ✅ **Smart Wallet** — ERC-4337 on Base, gasless USDC transactions
- ✅ **Wrapped APIs** — Brave Search, Gemini AI, Firecrawl, DeepL
- ✅ **BuildWithLocus** — Deploy services from GitHub repos
- ✅ **Locus Checkout** — Accept USDC payments (Stripe-style sessions)
- ✅ **Locus Fiverr** — Hire human freelancers with escrow
- ✅ **x402/MPP** — Machine-payable API endpoints
- ✅ **TASK_ESCALATE** — Auto-escalation from AI to human

## License

MIT
