import "@std/dotenv/load";
import { Application, Router } from "@oak/oak";
import { DocsExtractorAgent } from "./main.ts";

const jobs = new Map<string, { status: string; result?: unknown; error?: string }>();

const router = new Router();

router
  .post("/api/extract", async (ctx) => {
    try {
      const body = await ctx.request.body.json();
      const { docsUrl, extractionType } = body;

      if (!docsUrl || !extractionType) {
        ctx.response.status = 400;
        ctx.response.body = { error: "Missing required fields: docsUrl, extractionType" };
        return;
      }

      const jobId = crypto.randomUUID();
      jobs.set(jobId, { status: "processing" });

      // Process extraction in background
      (async () => {
        try {
          const agent = await DocsExtractorAgent.create();
          const result = await agent.extract(docsUrl, extractionType, "claude-sonnet-4-20250514");
          jobs.set(jobId, { status: "completed", result });
          await agent.cleanup();
        } catch (error) {
          console.error("Extraction error:", error);
          jobs.set(jobId, { 
            status: "failed", 
            error: error instanceof Error ? error.message : String(error)
          });
        }
      })();

      ctx.response.body = { jobId, status: "processing" };
    } catch (error) {
      console.error("API error:", error);
      ctx.response.status = 500;
      ctx.response.body = { 
        error: error instanceof Error ? error.message : "Internal server error" 
      };
    }
  })
  .get("/api/job/:jobId", (ctx) => {
    const jobId = ctx.params.jobId;
    const job = jobs.get(jobId);

    if (!job) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Job not found" };
      return;
    }

    ctx.response.body = job;
  })
  .get("/api/docs", async (ctx) => {
    try {
      const docs: Array<{ name: string; path: string }> = [];
      for await (const entry of Deno.readDir("./generated-docs")) {
        if (entry.isFile && entry.name.endsWith(".md")) {
          docs.push({ name: entry.name, path: `./generated-docs/${entry.name}` });
        }
      }
      ctx.response.body = { docs };
    } catch (error) {
      console.error("Error reading docs:", error);
      ctx.response.body = { docs: [] };
    }
  })
  .get("/api/docs/:filename", async (ctx) => {
    try {
      const filename = ctx.params.filename;
      const content = await Deno.readTextFile(`./generated-docs/${filename}`);
      ctx.response.headers.set("Content-Type", "text/markdown");
      ctx.response.body = content;
    } catch (error) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Document not found" };
    }
  });

const app = new Application();

// CORS middleware
app.use(async (ctx, next) => {
  ctx.response.headers.set("Access-Control-Allow-Origin", "*");
  ctx.response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  ctx.response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (ctx.request.method === "OPTIONS") {
    ctx.response.status = 200;
    return;
  }
  await next();
});

app.use(router.routes());
app.use(router.allowedMethods());

const PORT = 8000;
console.log(`🚀 Docs Extractor API running on http://localhost:${PORT}`);
await app.listen({ port: PORT });
