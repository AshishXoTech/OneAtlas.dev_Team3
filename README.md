# 🌌 OneAtlas.dev — AI Understanding Layer (Team 3)

[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg)](https://nodejs.org/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

The **AI Understanding Layer** is the cognitive core of the OneAtlas.dev platform. It transforms raw, ambiguous user prompts into high-fidelity, strictly-typed architectural blueprints that drive the downstream code generation engine.

---

## 🚀 Key Capabilities

- **🧠 Multi-Provider Orchestration**: Intelligent routing between **OpenAI**, **Groq**, and **Google Gemini** with automatic failover and model-tiering (FAST vs. CAPABLE).
- **🏗️ Rich Architectural Extraction**: Extracts not just entity names, but deep blueprints including fields, relationships, UI pages, features, and business workflows.
- **🛡️ Self-Healing Pipeline**: Integrated `ResponseRecovery` system that automatically detects malformed LLM JSON and utilizes a secondary "repair loop" to fix it using Zod-driven error feedback.
- **⚡ Ultra-Low Latency**: Heuristic early-abort mechanisms for trivially short prompts and parallel extraction chains for complex architectural design.
- **🔧 Production-Grade Infrastructure**: 
  - ESM-native architecture for modern Node.js performance.
  - Cross-platform path handling (Full Windows/Linux/Mac support).
  - Robust state management via Upstash Redis.

---

## 📁 Project Structure

```text
src/ai/
├── gateway/          # AI Provider Abstraction (OpenAI, Gemini, Groq)
├── understanding/    # Core Extraction Logic (Intent, Features, AppType)
├── validation/       # Zod Schemas, Output Formatters, & Recovery Pipeline
├── shared/           # Authoritative Contracts, Types, and Utils
├── generators/       # Teammate's Generation Engine (Prisma, Pages, CRUD)
└── workflows/        # Orchestration Pipeline & Redis State Store
```

---

## 🛠️ Getting Started

### 1. Prerequisites
- **Node.js 22.x** or higher.
- **pnpm** or **npm**.

### 2. Installation
```bash
npm install
```

### 3. Environment Configuration
Copy the example environment file and fill in your API keys:
```bash
cp .env.example .env
```
> [!IMPORTANT]
> At least one of `OPENAI_API_KEY`, `GROQ_API_KEY`, or `GEMINI_API_KEY` is required.

### 4. Running the AI Stress Tests
Validate the entire pipeline against 14+ complex architectural prompts:
```bash
npm run test:ai
```

---

## ⛓️ The Handshake Contract

The AI Layer communicates with the Generation Engine through the **Authoritative AppUnderstanding Contract**.

```typescript
export interface Entity {
  name: string;      // e.g., "Customer"
  fields: string[];  // e.g., ["email", "fullName"]
  relations: string[]; // e.g., ["Order"]
}

export interface AppUnderstanding {
  appName: string;
  appType: 'dashboard' | 'e-commerce' | 'social' | 'productivity' | 'other';
  features: string[];
  entities: Entity[];
  // ... (Pages, Workflows, Metadata)
}
```

---

## 🤝 Team 3 Boundaries

- **Our Ownership**: `src/ai/gateway`, `src/ai/understanding`, `src/ai/validation`.
- **Handoff Point**: `src/ai/shared/types/app-understanding.types.ts`.
- **Downstream Consumer**: `src/ai/generators` (Handled by Teammate).

---

## 📜 License

This project is licensed under the ISC License.
