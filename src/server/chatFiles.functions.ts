import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { promises as fs } from "node:fs";
import path from "node:path";

const CHAT_HISTORY_DIR = "E:\\bizassist-data";
const META_PREFIX = "## BizAssistMeta:";

type ChatHistoryMeta = {
  agentNames?: string[];
  customerName?: string;
};

function sanitizeFileName(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[<>:"/\\|?*]+/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 120);

  return cleaned || "chat";
}

async function ensureHistoryDir(): Promise<void> {
  await fs.mkdir(CHAT_HISTORY_DIR, { recursive: true });
}

export const saveLocalChatHistory = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      customerName: z.string().min(1),
      rawText: z.string().min(1),
      agentNames: z.array(z.string().min(1)).optional(),
    }),
  )
  .handler(async ({ data }) => {
    await ensureHistoryDir();
    const safeName = sanitizeFileName(data.customerName);
    const fileName = `${safeName}.txt`;
    const filePath = path.join(CHAT_HISTORY_DIR, fileName);

    const meta: ChatHistoryMeta = {
      customerName: data.customerName,
      agentNames: data.agentNames?.length ? data.agentNames : undefined,
    };
    const metaLine = `${META_PREFIX} ${JSON.stringify(meta)}`;
    const payload = `${metaLine}\n${data.rawText}`;

    await fs.writeFile(filePath, payload, "utf8");

    return { ok: true, fileName, filePath };
  });

export const listLocalChatHistories = createServerFn({ method: "GET" }).handler(async () => {
  try {
    await ensureHistoryDir();
    const entries = await fs.readdir(CHAT_HISTORY_DIR, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => name.toLowerCase().endsWith(".txt"));

    const results = await Promise.all(
      files.map(async (fileName) => {
        const filePath = path.join(CHAT_HISTORY_DIR, fileName);
        const content = await fs.readFile(filePath, "utf8");
        const lines = content.split(/\r?\n/);
        const first = lines[0] || "";
        let meta: ChatHistoryMeta | undefined;
        let bodyStart = 0;

        if (first.startsWith(META_PREFIX)) {
          const json = first.slice(META_PREFIX.length).trim();
          try {
            meta = JSON.parse(json) as ChatHistoryMeta;
            bodyStart = 1;
          } catch {
            meta = undefined;
          }
        }

        return { fileName, content: lines.slice(bodyStart).join("\n"), meta };
      }),
    );

    return { ok: true, files: results };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, files: [], error: message };
  }
});
