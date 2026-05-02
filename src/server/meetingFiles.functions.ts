import { createServerFn } from "@tanstack/react-start";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Meeting } from "@/data/mockMeetings";

const MEETINGS_DIR = "E:\\bizassist-meeting";

export const listLocalMeetings = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ ok: boolean; meetings: Meeting[]; error?: string }> => {
    try {
      await fs.mkdir(MEETINGS_DIR, { recursive: true });
      const files = await fs.readdir(MEETINGS_DIR);
      const txtFiles = files.filter((f) => f.toLowerCase().endsWith(".txt"));

      const meetings: Meeting[] = [];

      for (const file of txtFiles) {
        const content = await fs.readFile(path.join(MEETINGS_DIR, file), "utf-8");
        const meetingBlocks = content.split("--- MEETING ---").slice(1);

        for (const block of meetingBlocks) {
          const meetingEnd = block.indexOf("--- END ---");
          const relevantBlock = meetingEnd !== -1 ? block.substring(0, meetingEnd) : block;

          const lines = relevantBlock
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean);

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
      }

      return { ok: true, meetings };
    } catch (error: unknown) {
      return {
        ok: false,
        meetings: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
);

export const saveLocalMeeting = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d as Meeting)
  .handler(async ({ data: meeting }: { data: Meeting }): Promise<{ ok: boolean; error?: string }> => {
    try {
      await fs.mkdir(MEETINGS_DIR, { recursive: true });

      const content = [
        "--- MEETING ---",
        `id: ${meeting.id}`,
        `customerId: ${meeting.customerId}`,
        `customerName: ${meeting.customerName}`,
        `date: ${meeting.date}`,
        `time: ${meeting.time}`,
        `duration: ${meeting.duration}`,
        `purpose: ${meeting.purpose}`,
        `status: ${meeting.status}`,
        "--- END ---",
      ].join("\n");

      const safeName = meeting.customerName.trim() || "Unknown";
      const fileName = `${safeName}.txt`;
      const outPath = path.join(MEETINGS_DIR, fileName);

      await fs.appendFile(outPath, "\n" + content + "\n", "utf-8");

      return { ok: true };
    } catch (error: unknown) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
