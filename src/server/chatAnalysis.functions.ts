import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { promises as fs } from "node:fs";
import path from "node:path";

const CHAT_ANALYSIS_DIR = "E:\\bizassist-data-responce";

function sanitizeFileName(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[<>:"/\\|?*]+/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 120);

  return cleaned || "chat";
}

async function ensureAnalysisDir(): Promise<void> {
  await fs.mkdir(CHAT_ANALYSIS_DIR, { recursive: true });
}

export const saveLocalChatAnalysis = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      customerName: z.string().min(1),
      analysisText: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    await ensureAnalysisDir();
    const safeName = sanitizeFileName(data.customerName);
    const fileName = `${safeName}.txt`;
    const filePath = path.join(CHAT_ANALYSIS_DIR, fileName);

    await fs.writeFile(filePath, data.analysisText, "utf8");

    return { ok: true, fileName, filePath };
  });

export const getLocalChatAnalysis = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      customerName: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    try {
      await ensureAnalysisDir();
      const safeName = sanitizeFileName(data.customerName);
      const fileName = `${safeName}.txt`;
      const filePath = path.join(CHAT_ANALYSIS_DIR, fileName);
      const content = await fs.readFile(filePath, "utf8");
      return { ok: true, fileName, content };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, content: "", error: message };
    }
  });
