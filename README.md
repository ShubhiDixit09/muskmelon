# MuskMelon — The Adaptive, Two-Way Knowledge Twin

<!-- LIVE DEPLOYMENT LINK -->

[**Open live MuskMelon**](https://muskmelon-shubhidixit09.vercel.app/)

**Deployment:** Vercel · Gemini-powered chat enabled. Answers use a bundled historical archive for context; Weaviate Cloud is not configured, and archive citations are not independently verified.
<!-- END LIVE DEPLOYMENT LINK -->

> **Git for Two Evolving Minds**: Version Elon Musk’s changing knowledge, preserve relevant context across follow-up questions, and personalise every conversation through a consent-based User Twin—without mixing inference with fact.

---

## 1. What is MuskMelon?

MuskMelon is a **Cognitive Version-Controlled Knowledge Twin** of Elon Musk built for the **Swytchcode Hackathon — Trial 2: The Persona Clone**. It models Musk’s cognitive reasoning, first-principles logic and conversational rhythm while strictly separating factual knowledge from communication style through the **Knowledge–Voice Firewall**.

Unlike a one-sided persona chatbot, MuskMelon also builds a consent-based understanding of the user and maintains a focused working memory for connected follow-up questions.

### Core Features and Problem Statements

* **PS1: Temporal Grounding and Answer Receipts**

  * **Now Mode (2025+)**: Answers using verified knowledge from the latest available timeline, including Starship Flight 5, Cybercab and the Colossus cluster.
  * **Time Lens Mode**: Restricts answers to what was known at a selected date, such as comparing questions about Bitcoin in 2017 and 2021.
  * **Belief Diff Mode**: Provides a side-by-side comparison of position shifts across two historical periods.
  * **Answer Receipts**: Attaches supporting passages, primary sources, dates and grounding-confidence information to factual claims.
  * **Honest Absence**: Distinguishes between “Elon never addressed this” and “the required information is missing from the dataset.”
  * **Trap-Question Defence**: Detects and corrects false premises instead of role-playing an unsupported belief.

* **PS2: Generalisation, Style and Tone Cloning**

  * Recreates Elon Musk’s phrasing, conversational cadence and recurring explanation patterns.
  * Models his first-principles logic and five-step engineering algorithm.
  * Reasons through novel, out-of-dataset scenarios using documented behavioural patterns and physical constraints such as mass, energy and cycle time.
  * Clearly separates **Documented Answers**, **Evidence-Synthesised Answers** and **Persona-Inferred Answers**.

### Adaptive Context Capsule

Instead of performing a completely independent retrieval for every query, MuskMelon retrieves the most relevant Knowledge Commit chunks and promotes them into a compact **Context Capsule**.

For a related follow-up question, the system first checks whether sufficient evidence already exists inside the capsule:

* A **Context Hit** reuses the relevant chunks.
* A **Partial Hit** retrieves only the missing evidence.
* A **Context Miss** or topic change triggers a fresh Weaviate search.
* A change in Time Lens removes temporally incompatible chunks.

This improves multi-turn continuity, reduces repeated retrieval calls and token usage, and prevents unrelated information from distracting the model.

### User Twin

MuskMelon analyses not only Elon Musk’s documented behaviour and personality, but—with explicit permission—also learns from the user’s interaction history.

The separate **User Twin** can remember:

* Preferred explanation depth
* Technical familiarity
* Recurring interests
* Previous questions and follow-ups
* Preferred tone and response format
* Corrections and feedback

This allows MuskMelon to preserve the Elon Cognitive Signature while presenting the answer in a way that suits the individual user. The Elon Knowledge Twin and User Twin remain separated: user preferences may change presentation, but they cannot change historical evidence.

Users can inspect, edit, disable or delete their profile.

---

## 2. Swytchcode API Execution Layer

Swytchcode serves as the central execution layer between the AI agent and external production APIs, enforcing authentication, tool permissions, policies, validation, retries and execution auditing.

$$
\text{User Query}
\rightarrow
\text{User Twin Context}
\rightarrow
\text{Context Capsule Check}
\rightarrow
\textbf{Swytchcode Execution Layer}
\rightarrow
\text{Weaviate / OpenAI}
\rightarrow
\text{Grounded Response}
$$

### Context-Aware Execution Flow

1. MuskMelon classifies the question and selected temporal mode.
2. The User Twin supplies only the preferences required for the current response.
3. The Context Capsule is checked for relevant and temporally valid evidence.
4. If additional evidence is needed, Weaviate retrieval is executed through Swytchcode.
5. Newly retrieved Knowledge Commits are merged into the Context Capsule.
6. The Evidence Pack, Cognitive Signature and minimal User Context are sent to the LLM through Swytchcode.
7. The response passes through the Knowledge–Voice Firewall and Grounding Gate.
8. MuskMelon returns the answer, Answer Receipt and Swytchcode Execution Trace.

### Connected Integrations

1. **OpenAI (`openai`)**: Primary reasoning model using temporal RAG context, Cognitive Signature and User Twin preferences.
2. **Weaviate (`weaviate`)**: Live cloud vector cluster containing `ElonMuskMemory` and `ElonKnowledgeGraph`.
3. **Google Drive (`googledrive`)**: Approved document and historical transcript ingestion.
4. **Stripe (`stripe`)**: Production-ready agentic refund flow protected by a `$500` policy guardrail.
5. **Gmail (`gmail`) / Slack (`slack`) / Telegram (`telegram`)**: Verified multi-channel notification delivery.

### Swytchcode CLI and Audit Inspection

```powershell
# Check logged-in account status
swy.cmd whoami

# Check enabled tools in the project trust boundary
swy.cmd list

# View execution statistics
swy.cmd audit stats

# Inspect recent network calls executed through Swytchcode
swy.cmd audit network -n 10

# Inspect policy violations
swy.cmd audit policy -n 10

# Run the built-in MCP server for AI coding assistants
swy.cmd mcp serve --claude
```

---

## 3. Live Weaviate Cloud Vector and Knowledge Graph

MuskMelon is connected to a live Weaviate Cloud cluster:

* **REST Endpoint**: `https://xqr3z5ags5w0vxrzhitlw.c0.eu-central-1.aws.weaviate.cloud`
* **Schemas**:

  * `ElonMuskMemory`: 1536-dimensional temporal vectors with `validFrom` and `validTo` timestamps.
  * `ElonKnowledgeGraph`: Structured entity relationships and Cognitive Signature profiles.

The **Context Capsule** is not another copy of the complete database. It is a temporary, session-level subset assembled from the most relevant Weaviate chunks. It is reused for connected follow-ups and refreshed when the topic or temporal boundary changes.

The **User Twin** is maintained separately from Elon’s historical knowledge. Only the minimal user preferences required for personalising the current answer are included during generation.

---

## 4. Quick Start and Local Setup

```bash
# Clone the repository
git clone https://github.com/shdra06/muskmelon.git
cd muskmelon

# Install dependencies
npm install

# Configure environment variables in .env.local
WEAVIATE_URL=https://xqr3z5ags5w0vxrzhitlw.c0.eu-central-1.aws.weaviate.cloud
WEAVIATE_API_KEY=your-weaviate-api-key
OPENAI_API_KEY=your-openai-api-key

# Synchronise the Weaviate Cloud database
npm run sync:weaviate

# Run the GDG Agentic Refund test suite
npm run test:gdg-agent

# Build and start the application
npm run build
npm start

# Open http://localhost:3000
```

Never commit `.env.local` or real provider credentials to the repository.

---

## 5. Verification and Test Commands

| Test Suite                     | Command                       | What It Verifies                                                                                                       |
| ------------------------------ | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **GDG Agentic Guardrails**     | `npm run test:gdg-agent`      | Verifies that a `$2,500` refund is blocked by policy and a `$400` refund is permitted through the configured workflow. |
| **Weaviate Database Sync**     | `npm run sync:weaviate`       | Ingests the 2010–2025 Knowledge Commits and Knowledge Graph nodes into Weaviate Cloud.                                 |
| **Swytchcode Execution Audit** | `swy.cmd audit stats`         | Displays execution statistics for operations routed through Swytchcode.                                                |
| **Swytchcode Network Audit**   | `swy.cmd audit network -n 10` | Displays recent outbound network executions and their status.                                                          |
| **Swytchcode Policy Audit**    | `swy.cmd audit policy -n 10`  | Displays recent operations blocked by configured policies.                                                             |

---

## 6. Codebase Architecture

```text
muskmelon/
├── .swytchcode/
│   ├── tooling.json
│   ├── integrations/
│   │   └── policies.json
│   └── manifest.json
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── admin/page.tsx
│   │   └── api/
│   │       ├── chat/
│   │       ├── pipeline/
│   │       ├── diff/
│   │       └── ingest/
│   ├── lib/
│   │   ├── agent/persona-agent.ts
│   │   │   # Multi-turn orchestration, Context Capsule and User Twin
│   │   ├── rag/grounded-generator.ts
│   │   │   # OpenAI generation with the Knowledge–Voice Firewall
│   │   ├── rag/cognitive-signature.ts
│   │   │   # Personality, reasoning, rhythm and tone definitions
│   │   ├── rag/answer-receipt.ts
│   │   │   # Claim-level provenance and confidence scoring
│   │   ├── weaviate/weaviate-client.ts
│   │   │   # Live Weaviate Cloud vector-store connector
│   │   ├── knowledge-graph/
│   │   │   # Graph engine and 2010–2025 knowledge database
│   │   └── swytchcode/
│   │       # Swytchcode middleware, tools, telemetry and pipeline
│   └── components/
├── scripts/
│   ├── test-gdg-agent.ts
│   └── sync-weaviate-knowledge.ts
├── SWYTCHCODE_DEEP_AUDIT.md
├── ARCHITECTURE.md
└── README.md
```

---

## License

MIT. Built for the NSUT Hackathon 2026.
