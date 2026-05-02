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
        for (const line of lines) {
          if (line.startsWith("id:")) meetingData.id = line.substring(3).trim();
          else if (line.startsWith("customerId:")) meetingData.customerId = line.substring(11).trim();
          else if (line.startsWith("customerName:")) meetingData.customerName = line.substring(13).trim();
          else if (line.startsWith("date:")) meetingData.date = line.substring(5).trim();
          else if (line.startsWith("time:")) meetingData.time = line.substring(5).trim();
          else if (line.startsWith("duration:")) meetingData.duration = line.substring(9).trim();
          else if (line.startsWith("purpose:")) meetingData.purpose = line.substring(8).trim();
          else if (line.startsWith("status:")) meetingData.status = line.substring(7).trim() as any;
        }

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
