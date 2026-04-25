import type { ChatMessage } from "@/data/mockChats";

type ParseOptions = {
  agentNames?: string[];
  customerNameOverride?: string;
};

export type ParsedWhatsAppChat = {
  customerName: string;
  customerPhone: string;
  messages: ChatMessage[];
};

const DEFAULT_AGENT_NAMES = ["you", "me", "saya", "agent", "admin"];

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function parseTimeToParts(rawTime: string) {
  const clean = rawTime.trim().replace(/\s+/g, " ");
  const m = clean.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])?$/);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = Number(m[2]);
  const second = m[3] ? Number(m[3]) : 0;
  const ampm = m[4]?.toUpperCase();

  if (ampm === "AM" && hour === 12) hour = 0;
  if (ampm === "PM" && hour < 12) hour += 12;

  if (hour > 23 || minute > 59 || second > 59) return null;
  return { hour, minute, second };
}

function parseDateTime(dateStr: string, timeStr: string): Date | null {
  const dateParts = dateStr.split("/").map((s) => s.trim());
  if (dateParts.length !== 3) return null;

  const day = Number(dateParts[0]);
  const month = Number(dateParts[1]);
  const yearRaw = Number(dateParts[2]);
  const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
  const time = parseTimeToParts(timeStr);

  if (!time || !day || !month || !year) return null;

  const dt = new Date(year, month - 1, day, time.hour, time.minute, time.second, 0);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function formatDisplayTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function extractPhoneFromHeader(text: string): string {
  const phoneMatch = text.match(/\+\d[\d\s-]{6,}/);
  return phoneMatch ? phoneMatch[0].replace(/\s+/g, " ").trim() : "Unknown";
}

function initialsFromName(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "NA";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

export function avatarColorFromSeed(seed: string): string {
  const palette = ["#2563eb", "#16a34a", "#dc2626", "#f59e0b", "#7c3aed", "#0891b2", "#db2777"];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % palette.length;
  return palette[index] || "#2563eb";
}

function parseMessageLine(
  line: string,
): { date: string; time: string; sender: string; body: string } | null {
  const bracketPattern =
    /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?\s*[AaPp]?[Mm]?)\]\s([^:]+):\s([\s\S]*)$/;
  const dashPattern =
    /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?\s*[AaPp]?[Mm]?)\s-\s([^:]+):\s([\s\S]*)$/;

  const m = line.match(bracketPattern) || line.match(dashPattern);
  if (!m) return null;

  return {
    date: m[1].trim(),
    time: m[2].trim(),
    sender: m[3].trim(),
    body: (m[4] || "").trim(),
  };
}

export function parseWhatsAppExport(text: string, options: ParseOptions = {}): ParsedWhatsAppChat {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const agentNames = new Set(
    (options.agentNames?.length ? options.agentNames : DEFAULT_AGENT_NAMES).map(normalizeName),
  );

  const parsed: Array<{ sender: string; date: Date; body: string }> = [];
  let current: { sender: string; date: Date; body: string } | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line) continue;

    const row = parseMessageLine(line);
    if (row) {
      const date = parseDateTime(row.date, row.time);
      if (!date) continue;
      current = { sender: row.sender, date, body: row.body || "[empty message]" };
      parsed.push(current);
      continue;
    }

    if (current) {
      current.body = `${current.body}\n${line}`.trim();
    }
  }

  if (parsed.length === 0) {
    throw new Error("No WhatsApp messages detected. Export chat as .txt and try again.");
  }

  const senderCounts = new Map<string, number>();
  for (const p of parsed) {
    const key = p.sender;
    senderCounts.set(key, (senderCounts.get(key) || 0) + 1);
  }

  const nonAgentSenders = [...senderCounts.entries()]
    .filter(([name]) => !agentNames.has(normalizeName(name)))
    .sort((a, b) => b[1] - a[1]);

  const inferredCustomer =
    options.customerNameOverride?.trim() || nonAgentSenders[0]?.[0] || "Imported Contact";
  const phone = extractPhoneFromHeader(text);

  const messages: ChatMessage[] = parsed.map((p, idx) => {
    const from = agentNames.has(normalizeName(p.sender)) ? "agent" : "customer";
    return {
      id: `wa-${p.date.getTime()}-${idx}`,
      from,
      type: "text",
      text: p.body,
      time: formatDisplayTime(p.date),
      timestamp: p.date.getTime(),
    };
  });

  return {
    customerName: inferredCustomer,
    customerPhone: phone,
    messages,
  };
}

export function makeCustomerId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 24);
  return `wa-${slug || "customer"}-${Date.now().toString(36)}`;
}

export function makeInitials(name: string): string {
  return initialsFromName(name);
}
