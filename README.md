# 🌌 OneAtlas.dev — AI Understanding Layer (Team 3)

[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg)](https://nodejs.org/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

The **AI Understanding Layer** is the cognitive core of the OneAtlas.dev platform. It transforms raw, ambiguous user prompts into high-fidelity, strictly-typed architectural blueprints that drive the downstream code generation engine.

---

## 🚀 Key Capabilities

- **🧠 Multi-Provider Orchestration**: Intelligent routing between **OpenAI**, **Groq**, and **Google Gemini** with automatic failover and model-tiering (FAST vs. CAPABLE).
- **⛓️ Modular Chain System**: A state-of-the-art `ChainRunner` that orchestrates complex multi-step AI reasoning sequences with dynamic context merging.
- **🏗️ Rich Architectural Extraction**: Extracts deep blueprints including fields, relationships, UI pages, features, and business workflows.
- **🛡️ Self-Healing Pipeline**: Integrated `ResponseRecovery` system that automatically detects malformed LLM JSON and utilizes a secondary "repair loop" to fix it using Zod-driven error feedback.
- **⚡ Ultra-Low Latency**: Heuristic early-abort mechanisms and parallel extraction chains for high-speed performance.

---

## 📁 Project Structure

```text
src/ai/
├── gateway/          # AI Provider Abstraction (OpenAI, Gemini, Groq)
├── prompts/          # System prompts and modular Chain logic
│   └── chains/       # Orchestrated multi-step extraction chains
├── understanding/    # Core Extraction Logic (Intent, Features, AppType)
├── validation/       # Zod Schemas, Output Formatters, & Recovery Pipeline
├── shared/           # Authoritative Contracts, Types, and Utils
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
> The system includes **Automatic Fallback**. If OpenAI is out of quota, it will automatically reroute to Groq or Gemini.

### 4. Running Tests
Validate the entire pipeline or specific modules:
```bash
# Run the full AI Stress Test suite (14+ scenarios)
npm run test:ai

# Run the Modular Understanding Chain verification
npm run test:chain
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
