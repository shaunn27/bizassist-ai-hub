import { createServerFn } from "@tanstack/react-start";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Order } from "@/data/mockOrders";
import type { Meeting } from "@/data/mockMeetings";

const ACTION_DIR = "E:\\bizzasist-data-action";

export const readActionFile = createServerFn({ method: "GET" })
  .inputValidator((customerName: any) => customerName as string)
  .handler(async ({ data: customerName }: { data: string }): Promise<{ ok: boolean; orders: Order[]; meetings: Meeting[]; error?: string }> => {
    try {
      const safeName = customerName.replace(/[^a-zA-Z0-9_-]/g, "_") || "Unknown";
      const filePath = path.join(ACTION_DIR, `${safeName}.txt`);
      
      let content = "";
      try {
        content = await fs.readFile(filePath, "utf-8");
      } catch (e: any) {
        if (e.code === "ENOENT") {
          return { ok: true, orders: [], meetings: [] }; // No actions generated yet
        }
        throw e;
      }

      const orders: Order[] = [];
      const meetings: Meeting[] = [];

      // Parse Orders
      const orderBlocks = content.split("--- ORDER ---").slice(1);
      for (const block of orderBlocks) {
        const endIdx = block.indexOf("--- END ---");
        const relevant = endIdx !== -1 ? block.substring(0, endIdx) : block;
        const lines = relevant.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        
        const orderData: Partial<Order> = {};
        let timelineString = "";
        let actionStatus = "";

        for (const line of lines) {
          if (line.startsWith("id:")) orderData.id = line.substring(3).trim();
          else if (line.startsWith("customerId:")) orderData.customerId = line.substring(11).trim();
          else if (line.startsWith("customerName:")) orderData.customerName = line.substring(13).trim();
          else if (line.startsWith("items:")) orderData.items = line.substring(6).trim();
          else if (line.startsWith("total:")) {
            const t = line.substring(6).trim();
            orderData.total = isNaN(Number(t)) ? 0 : Number(t);
          }
          else if (line.startsWith("source:")) orderData.source = line.substring(7).trim() as any;
          else if (line.startsWith("receivedAt:")) orderData.receivedAt = line.substring(11).trim();
          else if (line.startsWith("status:")) orderData.status = line.substring(7).trim() as any;
          else if (line.startsWith("chatExcerpt:")) orderData.chatExcerpt = line.substring(12).trim();
          else if (line.startsWith("timeline:")) timelineString = line.substring(9).trim();
          else if (line.startsWith("actionStatus:")) actionStatus = line.substring(13).trim();
        }

        // Skip cards that have already been acted on
        if (actionStatus === "approved" || actionStatus === "rejected") continue;

        if (orderData.id && orderData.customerName) {
          const defaultTimeline = [
            { label: "Created", time: orderData.receivedAt || "Now", done: true },
            { label: "Confirmed", time: "—", done: false },
            { label: "Processing", time: "—", done: false },
            { label: "Delivered", time: "—", done: false },
          ];
          if (timelineString) {
            try {
              const parts = timelineString.split(",").map((p) => p.trim()).filter(Boolean);
              orderData.timeline = parts.map((p: any) => {
                const [label, time, doneStr] = p.split(":");
                return {
                  label: label?.trim() || "",
                  time: time?.trim() || "",
                  done: doneStr?.trim().toLowerCase() === "true" || doneStr?.trim().toLowerCase() === "done",
                };
              });
            } catch {
              orderData.timeline = defaultTimeline;
            }
          } else {
            orderData.timeline = defaultTimeline;
          }

          if (!orderData.status) orderData.status = "Pending";
          if (!orderData.source) orderData.source = "WhatsApp";
          if (!orderData.total) orderData.total = 0;

          orders.push(orderData as Order);
        }
      }

      // Parse Meetings
      const meetingBlocks = content.split("--- MEETING ---").slice(1);
      for (const block of meetingBlocks) {
        const endIdx = block.indexOf("--- END ---");
        const relevant = endIdx !== -1 ? block.substring(0, endIdx) : block;
        const lines = relevant.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

        const meetingData: Partial<Meeting> = {};
        let meetingActionStatus = "";
        for (const line of lines) {
          if (line.startsWith("id:")) meetingData.id = line.substring(3).trim();
          else if (line.startsWith("customerId:")) meetingData.customerId = line.substring(11).trim();
          else if (line.startsWith("customerName:")) meetingData.customerName = line.substring(13).trim();
          else if (line.startsWith("date:")) meetingData.date = line.substring(5).trim();
          else if (line.startsWith("time:")) meetingData.time = line.substring(5).trim();
          else if (line.startsWith("duration:")) meetingData.duration = line.substring(9).trim();
          else if (line.startsWith("purpose:")) meetingData.purpose = line.substring(8).trim();
          else if (line.startsWith("status:")) meetingData.status = line.substring(7).trim() as any;
          else if (line.startsWith("actionStatus:")) meetingActionStatus = line.substring(13).trim();
        }

        // Skip cards that have already been acted on
        if (meetingActionStatus === "approved" || meetingActionStatus === "rejected") continue;

        if (meetingData.id && meetingData.customerName) {
          if (!meetingData.status) meetingData.status = "Scheduled";
          meetings.push(meetingData as Meeting);
        }
      }

      return { ok: true, orders, meetings };
    } catch (error: unknown) {
      return { ok: false, orders: [], meetings: [], error: error instanceof Error ? error.message : String(error) };
    }
  });

/**
 * Sets actionStatus on a specific block (order or meeting) by id
 * in the customer's action file. Status can be 'approved' or 'rejected'.
 * Uses a block-split approach for reliability.
 */
export const setActionItemStatus = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d as { customerName: string; itemId: string; status: "approved" | "rejected" })
  .handler(async ({ data }: { data: { customerName: string; itemId: string; status: "approved" | "rejected" } }): Promise<{ ok: boolean; error?: string }> => {
    try {
      // The action files are stored with customer name as-is (not sanitized) by the AI generator
      // Try both the raw name and the sanitized version
      const rawName = data.customerName.trim();
      const safeName = rawName.replace(/[^a-zA-Z0-9_-]/g, "_");

      let filePath = path.join(ACTION_DIR, `${rawName}.txt`);
      let content = "";

      // Try raw name first, fall back to sanitized
      try {
        content = await fs.readFile(filePath, "utf-8");
      } catch {
        filePath = path.join(ACTION_DIR, `${safeName}.txt`);
        try {
          content = await fs.readFile(filePath, "utf-8");
        } catch (e: any) {
          if (e.code === "ENOENT") return { ok: true }; // Nothing to update
          throw e;
        }
      }

      // Split file into segments by block headers
      const BLOCK_HEADERS = ["--- ORDER ---", "--- MEETING ---"];
      const END_MARKER = "--- END ---";

      // Rebuild the file line by line, tracking which block we are in
      const lines = content.split(/\r?\n/);
      const outputLines: string[] = [];
      let insideTargetBlock = false;
      let blockHasId = false;
      let pendingBlockLines: string[] = [];
      let inBlock = false;

      const flushPendingBlock = (inject: boolean) => {
        if (inject) {
          // Remove existing actionStatus lines from the block
          const cleaned = pendingBlockLines.filter((l: string) => !l.trim().startsWith("actionStatus:"));
          // Insert actionStatus just before --- END --- (find last occurrence)
          let endIdx = -1;
          for (let i = cleaned.length - 1; i >= 0; i--) {
            if (cleaned[i].trim() === END_MARKER) { endIdx = i; break; }
          }
          if (endIdx !== -1) {
            cleaned.splice(endIdx, 0, `actionStatus: ${data.status}`);
          } else {
            cleaned.push(`actionStatus: ${data.status}`);
            cleaned.push(END_MARKER);
          }
          outputLines.push(...cleaned);
        } else {
          outputLines.push(...pendingBlockLines);
        }
        pendingBlockLines = [];
        insideTargetBlock = false;
        blockHasId = false;
        inBlock = false;
      };

      for (const line of lines) {
        const trimmed = line.trim();

        if (BLOCK_HEADERS.some(h => trimmed === h)) {
          // Starting a new block — flush any in-progress block first
          if (inBlock) {
            flushPendingBlock(insideTargetBlock && blockHasId);
          }
          pendingBlockLines = [line];
          inBlock = true;
          blockHasId = false;
          insideTargetBlock = false;
          continue;
        }

        if (inBlock) {
          // Check if this block contains our target id
          if (trimmed === `id: ${data.itemId}` || trimmed.startsWith(`id: ${data.itemId}`)) {
            // exact match check
            const idVal = trimmed.substring(3).trim();
            if (idVal === data.itemId) {
              blockHasId = true;
              insideTargetBlock = true;
            }
          }

          if (trimmed === END_MARKER) {
            pendingBlockLines.push(line);
            flushPendingBlock(insideTargetBlock && blockHasId);
            continue;
          }

          pendingBlockLines.push(line);
        } else {
          outputLines.push(line);
        }
      }

      // Flush any remaining open block
      if (inBlock && pendingBlockLines.length > 0) {
        flushPendingBlock(insideTargetBlock && blockHasId);
      }

      await fs.writeFile(filePath, outputLines.join("\n"), "utf-8");
      return { ok: true };
    } catch (error: unknown) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  });


