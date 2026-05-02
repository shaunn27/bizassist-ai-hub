import { createServerFn } from "@tanstack/react-start";
import { promises as fs } from "node:fs";
import path from "node:path";

const ORDERS_DIR = "E:\\bizassist-order";
const MEETINGS_DIR = "E:\\bizassist-meeting";

/** Deletes a specific --- ORDER ---...--- END --- block from the customer's order file.
 *  If the file would become empty after deletion, the whole file is deleted. */
export const cancelLocalOrder = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d as { customerName: string; orderId: string })
  .handler(async ({ data }: { data: { customerName: string; orderId: string } }): Promise<{ ok: boolean; error?: string }> => {
    return deleteBlockFromFile(ORDERS_DIR, data.customerName, "--- ORDER ---", data.orderId);
  });

/** Deletes a specific --- MEETING ---...--- END --- block from the customer's meeting file.
 *  If the file would become empty after deletion, the whole file is deleted. */
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
      if (e.code === "ENOENT") return { ok: true }; // File doesn't exist, nothing to do
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
        // Start of a new block — emit any pending non-block lines
        inBlock = true;
        pendingLines = [line];
        blockIsTarget = false;
        continue;
      }

      if (inBlock) {
        // Detect if this block's id matches the one we want to delete
        if (trimmed.startsWith("id:") && trimmed.substring(3).trim() === itemId) {
          blockIsTarget = true;
        }

        if (trimmed === END_MARKER) {
          pendingLines.push(line);
          if (!blockIsTarget) {
            outputLines.push(...pendingLines);
            keptBlocks++;
          }
          // If blockIsTarget, we just skip all pendingLines — effectively deleting the block
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

    // If there are pending lines from an unclosed block, keep them
    if (pendingLines.length > 0) {
      outputLines.push(...pendingLines);
    }

    // Check if any meaningful content is left
    const hasContent = outputLines.some(l => l.trim().length > 0);

    if (!hasContent || keptBlocks === 0) {
      // Delete the file entirely
      await fs.unlink(filePath);
    } else {
      // Write back the cleaned content
      await fs.writeFile(filePath, outputLines.join("\n"), "utf-8");
    }

    return { ok: true };
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
