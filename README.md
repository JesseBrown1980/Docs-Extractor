# Docs Extractor - AI-Powered Documentation Generator

An intelligent documentation extraction tool powered by Zypher Agent and Firecrawl. This tool automatically crawls documentation websites and generates comprehensive guides based on your needs.

## Demo

Watch a quick demo of the tool in action:

🎥 [View Demo Video](https://www.loom.com/share/337cd99cd5604fecada46ef910be5989)

## Setup

### Prerequisites

1. [Deno](https://deno.com) installed
2. [Node.js and npm](https://nodejs.org) installed (for frontend)
3. API Keys:
   - Anthropic API key (for Claude AI)
   - Firecrawl API key (for web crawling)

### Installation

1. **Set up environment variables:**

   Create a `.env` file in the `docs-extractor` directory:

   ```bash
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   FIRECRAWL_API_KEY=your_firecrawl_api_key_here
   ```

   Get your API keys:
   - Anthropic: https://console.anthropic.com/
   - Firecrawl: https://firecrawl.dev/

2. **Install frontend dependencies:**

   ```bash
   cd frontend
   npm install
   ```

## Usage

### Option 1: With UI (Recommended)

1. **Start the backend server:**

   ```bash
   deno task server
   ```

   The API server will start on `http://localhost:8000`

2. **Start the frontend (in a new terminal):**

   ```bash
   cd frontend
   npm run dev
   ```

   The UI will be available at `http://localhost:5173`

3. **Use the web interface:**
   - Enter a documentation URL (e.g., `https://react.dev/docs`)
   - Specify what you want to extract (e.g., "Quickstart guide with installation and examples")
   - Click "Extract Documentation"
   - Wait for the AI to process and generate the documentation
   - View and download the generated markdown file


