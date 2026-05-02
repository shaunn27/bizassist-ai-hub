import { useState } from "react";
import { useApp, BUSINESS_LIST } from "@/lib/appContext";
import { testAIModel } from "@/hooks/useAI";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "@/components/shared/Toast";
import { Badge } from "@/components/shared/Badge";

export function SettingsPage() {
  const { settings, updateSettings, business, setBusiness } = useApp();
  const [show, setShow] = useState(false);
  const [testPrompt, setTestPrompt] = useState("Reply with one short sentence about customer support.");
  const [testResult, setTestResult] = useState("");
  const [testing, setTesting] = useState(false);

  const modelOptions = ["deepseek-v4-flash"];
  const selectedModel = settings.model || modelOptions[0];

  const test = async () => {
    if (!settings.apiKey) {
      toast("Enter an API key first", "error");
      return;
    }

    setTesting(true);
    setTestResult("");
    toast("Running live model test...", "info");

    try {
      const reply = await testAIModel({
        apiKey: settings.apiKey,
        model: selectedModel,
        prompt: testPrompt,
      });
      setTestResult(reply);
      toast("Live test succeeded", "success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast(message, "error");
    } finally {
      setTesting(false);
    }
  };

  const Toggle = ({
    on,
    onChange,
    label,
  }: {
    on: boolean;
    onChange: (v: boolean) => void;
    label: string;
  }) => (
    <label className="flex items-center justify-between py-2.5 border-b border-border cursor-pointer">
      <span className="text-sm text-foreground">{label}</span>
      <button
        onClick={() => onChange(!on)}
        className={`h-5 w-9 rounded-full relative transition-colors ${on ? "bg-primary" : "bg-muted"}`}
      >
        <span
          className={`absolute top-0.5 ${on ? "left-[18px]" : "left-0.5"} h-4 w-4 rounded-full bg-white transition-all`}
        />
      </button>
    </label>
  );

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-3">API Configuration</h3>
          <label className="text-xs font-medium text-muted-foreground">DeepSeek API Key</label>
          <div className="mt-1 flex gap-2">
            <div className="flex-1 relative">
              <input
                type={show ? "text" : "password"}
                value={settings.apiKey}
                onChange={(e) => updateSettings({ apiKey: e.target.value })}
                placeholder="AIza..."
                className="w-full h-10 px-3 pr-10 rounded-md border border-border bg-background text-sm font-mono"
              />
              <button
                onClick={() => setShow(!show)}
                className="absolute right-2 top-2.5 text-muted-foreground"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <button
              onClick={test}
              disabled={testing || !testPrompt.trim()}
              className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold"
            >
              {testing ? "Testing..." : "Run Live Test"}
            </button>
          </div>

          <label className="text-xs font-medium text-muted-foreground mt-3 block">Model</label>
          <select
            value={selectedModel}
            onChange={(e) => updateSettings({ model: e.target.value })}
            className="mt-1 w-full h-10 px-3 rounded-md border border-border bg-background text-sm"
          >
            {!modelOptions.includes(selectedModel) && <option value={selectedModel}>{selectedModel}</option>}
            {modelOptions.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>

          <label className="text-xs font-medium text-muted-foreground mt-3 block">Test prompt</label>
          <textarea
            value={testPrompt}
            onChange={(e) => setTestPrompt(e.target.value)}
            rows={3}
            className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
            placeholder="Type text to send to the model..."
          />

          {testResult && (
            <div className="mt-3 p-3 rounded-md border border-border bg-secondary/40">
              <div className="text-xs font-medium text-muted-foreground mb-1">Model response</div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{testResult}</p>
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-3">Business Profile</h3>
          <label className="text-xs font-medium text-muted-foreground">Active business</label>
          <select
            value={business}
            onChange={(e) => setBusiness(e.target.value)}
            className="mt-1 w-full h-10 px-3 rounded-md border border-border bg-background text-sm"
          >
            {BUSINESS_LIST.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-2">Notification Preferences</h3>
          <Toggle
            on={settings.soundOnNewMessage}
            onChange={(v) => updateSettings({ soundOnNewMessage: v })}
            label="Sound on new message"
          />
          <Toggle
            on={settings.sla5}
            onChange={(v) => updateSettings({ sla5: v })}
            label="SLA alert at 5 minutes"
          />
          <Toggle
            on={settings.sla15}
            onChange={(v) => updateSettings({ sla15: v })}
            label="SLA alert at 15 minutes"
          />
          <Toggle
            on={settings.autoAnalyze}
            onChange={(v) => updateSettings({ autoAnalyze: v })}
            label="Auto-AI analysis on new message"
          />
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground">Agents</h3>
            <button
              onClick={() => toast("Add Agent dialog (UI demo)", "info")}
              className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold"
            >
              Add Agent
            </button>
          </div>
          <ul className="space-y-2">
            {[
              { name: "Sarah Lim", role: "Senior Agent" },
              { name: "Ahmad Z.", role: "Agent" },
              { name: "Priya R.", role: "Agent" },
            ].map((a) => (
              <li
                key={a.name}
                className="flex items-center justify-between p-2.5 border border-border rounded-md"
              >
                <span className="text-sm font-medium">{a.name}</span>
                <Badge variant="primary">{a.role}</Badge>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
