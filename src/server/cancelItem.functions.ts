import { createServerFn } from "@tanstack/react-start";
import { promises as fs } from "node:fs";
import path from "node:path";

const ORDERS_DIR = "E:\\bizassist-order";
const MEETINGS_DIR = "E:\\bizassist-meeting";

export const cancelLocalOrder = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d as { customerName: string; orderId: string })
  .handler(async ({ data }: { data: { customerName: string; orderId: string } }): Promise<{ ok: boolean; error?: string }> => {
    return deleteBlockFromFile(ORDERS_DIR, data.customerName, "--- ORDER ---", data.orderId);
  });

export const cancelLocalMeeting = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d as { customerName: string; meetingId: string })
  .handler(async ({ data }: { data: { customerName: string; meetingId: string } }): Promise<{ ok: boolean; error?: string }> => {
    return deleteBlockFromFile(MEETINGS_DIR, data.customerName, "--- MEETING ---", data.meetingId);
  });

async function deleteBlockFromFile(
  dir: string,
  customerName: string,
  blockHeader: string,
  itemId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const safeName = customerName.trim();
    const filePath = path.join(dir, `${safeName}.txt`);

    let content = "";
    try {
      content = await fs.readFile(filePath, "utf-8");
    } catch (e: any) {
      if (e.code === "ENOENT") return { ok: true };
      throw e;
    }

    const END_MARKER = "--- END ---";
    const lines = content.split(/\r?\n/);

    const outputLines: string[] = [];
    let pendingLines: string[] = [];
    let inBlock = false;
    let blockIsTarget = false;
    let keptBlocks = 0;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed === blockHeader) {
        inBlock = true;
        pendingLines = [line];
        blockIsTarget = false;
        continue;
      }

      if (inBlock) {
        if (trimmed.startsWith("id:") && trimmed.substring(3).trim() === itemId) {
          blockIsTarget = true;
        }

        if (trimmed === END_MARKER) {
          pendingLines.push(line);
          if (!blockIsTarget) {
            outputLines.push(...pendingLines);
            keptBlocks++;
          }
          pendingLines = [];
          inBlock = false;
          blockIsTarget = false;
          continue;
        }

        pendingLines.push(line);
      } else {
        outputLines.push(line);
      }
    }

    if (pendingLines.length > 0) {
      outputLines.push(...pendingLines);
    }

    const hasContent = outputLines.some(l => l.trim().length > 0);

    if (!hasContent || keptBlocks === 0) {
      await fs.unlink(filePath);
    } else {
      await fs.writeFile(filePath, outputLines.join("\n"), "utf-8");
    }

    return { ok: true };
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
