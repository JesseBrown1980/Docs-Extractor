import "@std/dotenv/load";
import {
  AnthropicModelProvider,
  ZypherAgent,
  createZypherContext,
} from "@corespeed/zypher";
import { eachValueFrom } from "rxjs-for-await";

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Environment variable ${name} is not set`);
  }
  return value;
}

const prompt = `You are a documentation extraction agent. Extract and format documentation as clean markdown.

RULES:
- Output ONLY the final markdown document
- Do NOT include meta-commentary like "I'll help you...", "Let me create...", "Perfect!", etc.
- Do NOT narrate what you're doing
- Start directly with the documentation title

PROCESS:
1. Crawl the main page (be fast - don't follow multiple links)
2. Extract: installation, key concepts, 1-2 code examples
3. Output the markdown document immediately

FORMAT:
# [Document Title]
> Source: [original URL]

[Your extracted content with headings, code blocks, and links]

Be concise and practical. Output the document, not commentary about creating it.`;

export class DocsExtractorAgent {
  public zypher: ZypherAgent;

  private constructor(agent: ZypherAgent) {
    this.zypher = agent;
  }

  static async create() {
    // Initialize the agent execution context
    const workingDir = Deno.cwd();
    const homeDir = Deno.env.get("HOME") || Deno.env.get("USERPROFILE") || workingDir;
    
    const zypherContext = await createZypherContext(workingDir, {
      zypherDir: `${homeDir}/.zypher`,
      enableBuiltInTools: true, // Explicitly enable built-in tools
    });

    // Create the agent with Anthropic model provider
    const agent = new ZypherAgent(
      zypherContext,
      new AnthropicModelProvider({
        apiKey: getRequiredEnv("ANTHROPIC_API_KEY"),
      }),
      {
        customInstructions: prompt,
      },
    );

    // Register Firecrawl MCP server
    try {
      await agent.mcp.registerServer({
        id: "firecrawl",
        type: "command",
        command: {
          command: "npx",
          args: ["-y", "firecrawl-mcp"],
          env: {
            FIRECRAWL_API_KEY: getRequiredEnv("FIRECRAWL_API_KEY"),
            FIRECRAWL_TIMEOUT: "30000", // 30 second timeout
            FIRECRAWL_MAX_DEPTH: "1",   // Only crawl 1 level deep
          },
        },
      });
      
      console.log("✅ Registered Firecrawl MCP server");
    } catch (error) {
      console.error("⚠️  Failed to register Firecrawl MCP server:", error);
    }

    return new DocsExtractorAgent(agent);
  }

  async extract(docsUrl: string, extractionType: string, model: string = "claude-sonnet-4-20250514") {
    const userPrompt = `Extract from ${docsUrl}: ${extractionType}

OUTPUT ONLY THE MARKDOWN DOCUMENT. No meta-commentary.

Start with:
# [Title for ${extractionType}]
> Source: ${docsUrl}

Then include:
- Installation/setup (if relevant)
- Key concepts
- 1-2 code examples
- Links to original docs

Keep it concise and practical. Output the document directly.`;

    console.log(`🔍 Starting extraction from ${docsUrl}...`);

    const event$ = this.zypher.runTask(userPrompt, model);

    let responseText = "";
    const toolUses: Array<{ name: string; input: unknown }> = [];

    for await (const event of eachValueFrom(event$)) {
      switch (event.type) {
        case "text":
        case "message":
          if (event.content?.text) {
            responseText += event.content.text;
          } else if (typeof event.content === "string") {
            responseText += event.content;
          }
          break;

        case "tool_use":
        case "tool_use_input":
          if (event.content?.name) {
            toolUses.push({
              name: event.content.name,
              input: event.content.input,
            });
          } else if (event.tool || event.name) {
            const toolName = event.tool || event.name;
            const toolInput = event.input || event.content;
            toolUses.push({ name: toolName, input: toolInput });
          }
          break;

        case "tool_result":
        case "tool_use_approved":
        default:
          break;
      }
    }

    console.log("✅ Extraction completed!");
    
    // Save the response text to a file
    try {
      if (responseText) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `extraction-${timestamp}.md`;
        const filepath = `./generated-docs/${filename}`;
        await Deno.writeTextFile(filepath, responseText);
        console.log(`📄 Saved: ${filename}`);
      }
    } catch (error) {
      console.error("❌ Error saving file:", error);
    }

    return {
      response: {
        content: [
          {
            type: "text",
            text: responseText,
          },
        ],
      },
      toolUses,
    };
  }

  async cleanup() {
  }
}

// Terminal mode: Run agent in interactive CLI
if (import.meta.main) {
  const { runAgentInTerminal } = await import("@corespeed/zypher");
  const agent = await DocsExtractorAgent.create();
  await runAgentInTerminal(agent.zypher, "claude-sonnet-4-20250514");
  await agent.cleanup();
}
