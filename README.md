# 🌌 OneAtlas Intelligence Layer (Team 3)

> **The Cognitive Core for Next-Gen Vibe Coding.**  
> Transform ambiguous natural language into high-fidelity, strictly-typed architectural blueprints.

[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg)](https://nodejs.org/)
[![Zod](https://img.shields.io/badge/Zod-4.4-purple.svg)](https://zod.dev/)
[![Production Ready](https://img.shields.io/badge/Deployment-Ready-success.svg)](#)

---

## 🚀 Overview

The **OneAtlas Intelligence Layer** is a state-of-the-art AI orchestration engine designed as a high-fidelity "Base44" clone. It serves as the bridge between raw user intent and structured application generation, utilizing multi-model reasoning, self-healing validation pipelines, and real-time intelligence tracing.

### 💎 Key Pillars
- **🧠 Multi-Model Orchestration**: Intelligent routing between **GPT-5.5**, **Claude 4**, and **Groq (Llama-4)** with sub-second failover.
- **🛡️ Self-Healing Pipeline**: Integrated `ResponseRecovery` loop that automatically repairs malformed LLM outputs using Zod-driven error feedback.
- **⛓️ Modular Chains**: A flexible `ChainRunner` architecture that allows for complex, multi-turn AI reasoning without context dilution.
- **📊 Production Observability**: 100% structured JSON logging and full-stack intelligence tracing compatible with Datadog and CloudWatch.

---

## 📁 Architecture

```text
src/ai/
├── gateway/          # 🌐 AI Provider Abstraction & Model Routing
├── prompts/          # 🎭 Modular System Prompts & Reasoning Chains
├── understanding/    # 🧠 Intent, Feature, & Topology Extraction
├── validation/       # 🛡️ Zod Schemas & The Self-Healing Recovery Loop
├── shared/           # 📜 Authoritative Contracts & Type Definitions
└── workflows/        # ⚙️ Pipeline Execution & Redis State Persistence
```

---

## 🛠️ Getting Started

### 1. Prerequisites
- **Node.js 22.x** (Strict Requirement)
- **pnpm** or **npm**
- **Redis** (Upstash) for deployment state persistence

### 2. Installation
```bash
npm install
npm run build
```

### 3. Environment Setup
Create a `.env` file from the provided template:
```bash
cp .env.example .env
```
Ensure your **UPSTASH_REDIS** tokens are present for production workflow persistence.

---

## 🧪 Verification & Testing

The system includes a rigorous **Phase 7 Security Suite** and an **End-to-End Stress Test**.

```bash
# Run the Final Production Stress Test (14+ Scenarios)
npm test

# Run Modular Unit Tests
npm run test:security      # Validates Adversarial Guard & Topology Limits
npm run test:recovery      # Validates JSON Self-Healing Loops
npm run test:mutation      # Validates Semantic App Mutations
```

---

## ⛓️ The Handshake Contract

The Intelligence Layer communicates via the **Authoritative AppUnderstanding Contract**. Downstream generators consume this graph to build UI, API, and DB layers.

```typescript
import { UnderstandingChain } from 'oneatlas-intelligence';

const chain = new UnderstandingChain(router);
const blueprint = await chain.run("Build a CRM with Stripe payments");

// blueprint is now a strictly typed, validated, and normalized 
// graph ready for code generation.
```

---

## 📊 Production Observability

All logs are emitted in **Principal-Grade JSON**:

```json
{
  "level": "INFO",
  "module": "IntelligenceTracer",
  "event": "INTELLIGENCE_TRACE",
  "meta": {
    "telemetry": {
      "totalTokens": 2287,
      "totalLatencyMs": 4195,
      "model": "gpt-5.5"
    }
  }
}
```

---

## 🤝 Team 3 & Handoff

- **Lead Architecture**: Team 3
- **Primary Repo**: `AshishXoTech/OneAtlas.dev_Team3`
- **Upstream**: `TheAiSignal/dev_oneatlas`
- **Handoff Contact**: Kevin (Deployment & Generation Lead)

---

## 📜 License

This project is licensed under the ISC License. Built with 🌌 by Team 3 for the OneAtlas.dev ecosystem.
