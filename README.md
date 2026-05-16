# Bridgr 🌉

> Paste a GitHub repo. Get a business report. Instantly.

**Built with IBM Bob · Powered by IBM watsonx**

---

## What is Bridgr?

Technical teams speak in frameworks and repositories. Business teams speak in value, risk, and ROI. That gap costs companies weeks of back-and-forth and delayed approvals.

**Bridgr bridges that gap.** Paste any public GitHub repository URL and get a complete executive business report in seconds — no technical knowledge required.

---

## Features

- 🎯 **Plain English Summary** — What the project does, without jargon
- 💼 **Business Value** — Concrete benefits for decision makers
- 📊 **Fit Assessment** — Radar chart scoring complexity, cost, time, risk, and ROI
- ⚠️ **Risks & Considerations** — What to know before approving
- 📅 **Implementation Timeline** — Phase-by-phase roadmap
- 💬 **AI Chat Assistant** — Ask follow-up questions in plain English
- 📄 **PDF Export** — Download the full report

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, Lucide Icons, Chart.js |
| Backend | Node.js, Express |
| AI | IBM watsonx (Granite model) |
| Development | IBM Bob IDE |

---

## Getting Started

### Prerequisites
- Node.js v18+
- IBM watsonx API Key and Project ID

### Installation

```bash
git clone https://github.com/arsoftwarelabco-design/bridgr.git
cd bridgr
npm install
```

### Configuration

Create a `.env` file in the root folder:

```
WATSONX_API_KEY=your_api_key_here
WATSONX_PROJECT_ID=your_project_id_here
WATSONX_URL=https://us-south.ml.cloud.ibm.com
```

### Run

```bash
node server.js
```

Open your browser at `http://localhost:3000`

---

## How It Works

1. **Paste** any public GitHub repository URL
2. **Bridgr** fetches the repository metadata and README via GitHub API
3. **IBM watsonx** analyzes the content and generates a structured business report
4. **You** get an executive-ready report with charts, timelines, and insights

---

## IBM Bob Sessions

All Bob IDE task session reports are available in the [`bob_sessions/`](./bob_sessions) folder as required by the hackathon guidelines.

---

## Hackathon

Built for the **IBM Bob Hackathon 2026** · Theme: *Turn idea into impact faster*

---

*Bridgr — Because great software deserves to be understood.*
