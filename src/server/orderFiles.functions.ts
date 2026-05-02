import { createServerFn } from "@tanstack/react-start";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Order } from "@/data/mockOrders";

const ORDERS_DIR = "E:\\bizassist-order";

export const listLocalOrders = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ ok: boolean; orders: Order[]; error?: string }> => {
    try {
      await fs.mkdir(ORDERS_DIR, { recursive: true });
      const files = await fs.readdir(ORDERS_DIR);
      const txtFiles = files.filter((f) => f.toLowerCase().endsWith(".txt"));

      const orders: Order[] = [];

      for (const file of txtFiles) {
        const content = await fs.readFile(path.join(ORDERS_DIR, file), "utf-8");

        const orderBlocks = content.split("--- ORDER ---").slice(1);

        for (const block of orderBlocks) {
          const orderEnd = block.indexOf("--- END ---");
          const relevantBlock = orderEnd !== -1 ? block.substring(0, orderEnd) : block;

          const lines = relevantBlock
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean);

          const orderData: Partial<Order> = {};
          let timelineString = "";

          for (const line of lines) {
            if (line.startsWith("id:")) orderData.id = line.substring(3).trim();
            else if (line.startsWith("customerId:"))
              orderData.customerId = line.substring(11).trim();
            else if (line.startsWith("customerName:"))
              orderData.customerName = line.substring(13).trim();
            else if (line.startsWith("items:")) orderData.items = line.substring(6).trim();
            else if (line.startsWith("total:")) {
              const t = line.substring(6).trim();
              orderData.total = isNaN(Number(t)) ? 0 : Number(t);
            } else if (line.startsWith("source:"))
              orderData.source = line.substring(7).trim() as any;
            else if (line.startsWith("receivedAt:"))
              orderData.receivedAt = line.substring(11).trim();
            else if (line.startsWith("status:"))
              orderData.status = line.substring(7).trim() as any;
            else if (line.startsWith("chatExcerpt:"))
              orderData.chatExcerpt = line.substring(12).trim();
            else if (line.startsWith("timeline:")) timelineString = line.substring(9).trim();
          }

          if (orderData.id && orderData.customerName) {
            const defaultTimeline = [
              { label: "Created", time: orderData.receivedAt || "Now", done: true },
              { label: "Confirmed", time: "—", done: false },
              { label: "Processing", time: "—", done: false },
              { label: "Delivered", time: "—", done: false },
            ];

            if (timelineString) {
              try {
                // e.g. "Created:time:done, Confirmed:time:done"
                const parts = timelineString
                  .split(",")
                  .map((p) => p.trim())
                  .filter(Boolean);
                orderData.timeline = parts.map((p) => {
                  const [label, time, doneStr] = p.split(":");
                  return {
                    label: label?.trim() || "",
                    time: time?.trim() || "",
                    done:
                      doneStr?.trim().toLowerCase() === "true" ||
                      doneStr?.trim().toLowerCase() === "done",
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
      }

      // Sort by ID or whatever, or just return them as they are
      return { ok: true, orders };
    } catch (error: unknown) {
      return {
        ok: false,
        orders: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
);

export const saveLocalOrder = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d as Order)
  .handler(async ({ data: order }: { data: Order }): Promise<{ ok: boolean; error?: string }> => {
    try {
      await fs.mkdir(ORDERS_DIR, { recursive: true });

      const timelineStr = order.timeline
        .map((t: any) => `${t.label}:${t.time}:${t.done}`)
        .join(", ");

      const content = [
        "--- ORDER ---",
        `id: ${order.id}`,
        `customerId: ${order.customerId}`,
        `customerName: ${order.customerName}`,
        `items: ${order.items}`,
        `total: ${order.total}`,
        `source: Manual`,
        `receivedAt: ${order.receivedAt}`,
        `status: ${order.status}`,
        `chatExcerpt: ${order.chatExcerpt || "Manually added"}`,
        `timeline: ${timelineStr}`,
        "--- END ---"
      ].join("\n");

      // Generate a safe filename
      const safeName = order.customerName.replace(/[^a-zA-Z0-9_-]/g, "_") || "Unknown";
      const fileName = `${safeName}_${order.id}.txt`;
      const outPath = path.join(ORDERS_DIR, fileName);

      // Append if file exists, else create new
      // If we append, it adds another order block to the same file.
      // But typically we can just create a new file for this specific order to keep it clean.
      await fs.appendFile(outPath, "\n" + content + "\n", "utf-8");

      return { ok: true };
    } catch (error: unknown) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
