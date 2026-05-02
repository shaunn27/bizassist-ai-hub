# BizAssist AI Hub 🚀

An AI-powered customer service and business intelligence dashboard tailored for SMEs. Built with React, TanStack Start, and Gemini AI.

## 📚 Project Documentation

We have prepared comprehensive documentation for this project. You can view our core hackathon submission documents directly on GitHub by clicking the links below:

*   📑 **[Pitch Deck Final](./Pitch%20Deck%20Final.pdf)** — Our vision, problem statement, solution, and business model.
*   📋 **[Business Proposal](./Business%20Proposal.pdf)** — Comprehensive strategy, market analysis, and product roadmap.
*   📐 **[Deployment Plan](./Deployment%20Plan.pdf)** — System design, cloud infrastructure, and CI/CD pipelines.
*   ✅ **[Refined Quality Assurance & Test Document (QATD)](./Refined%20QATD.pdf)** — Testing strategies, test cases, and quality benchmarks.

---

## 🌟 Key Features

*   **Intelligent Chat Interface:** Context-aware conversations powered by Gemini 3.1 Pro.
*   **Dynamic UI Generation:** The AI can generate components (charts, data tables, order forms) directly in the chat stream.
*   **Customer 360 View:** Comprehensive CRM integration with sentiment analysis and transaction history.
*   **Real-time Analytics:** Mock real-time data visualizing key business metrics.

## 🛠️ Technology Stack

*   **Framework:** React 18 & TanStack Start
*   **Build Tool:** Vite & Nitro
*   **Styling:** Tailwind CSS & shadcn/ui
*   **AI Engine:** Google Gemini API
*   **Database:** Supabase
*   **Deployment:** Vercel (Serverless Functions)

## 🚀 Getting Started

### Prerequisites

*   Node.js (v18 or higher)
*   npm or pnpm

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/shaunn27/bizassist-ai-hub.git
    cd bizassist-ai-hub
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Set up Environment Variables:
    Create a `.env` file in the root directory and add your keys:
    ```env
    VITE_GEMINI_API_KEY=your_gemini_api_key
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  Start the development server:
    ```bash
    npm run dev
    ```

5.  Open [http://localhost:8080](http://localhost:8080) to view the application in your browser.

## 📄 License
This project is submitted as part of the Hackathon. All rights reserved.
