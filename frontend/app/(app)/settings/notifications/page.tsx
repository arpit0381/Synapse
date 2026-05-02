"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, MessageSquare, CheckSquare, AtSign, Hash, Mail, Smartphone, Volume2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotifSetting { id: string; label: string; description: string; icon: React.ReactNode; push: boolean; email: boolean; inApp: boolean; }

const NOTIF_SETTINGS: NotifSetting[] = [
  { id: "mentions", label: "Direct Mentions", description: "When someone @mentions you in a channel", icon: <AtSign className="w-4 h-4 text-accent" />, push: true, email: true, inApp: true },
  { id: "dms", label: "Direct Messages", description: "When you receive a new direct message", icon: <MessageSquare className="w-4 h-4 text-blue-400" />, push: true, email: false, inApp: true },
  { id: "tasks", label: "Task Assignments", description: "When a task is assigned or updated", icon: <CheckSquare className="w-4 h-4 text-yellow-400" />, push: true, email: true, inApp: true },
  { id: "channels", label: "Channel Activity", description: "New messages in channels you follow", icon: <Hash className="w-4 h-4 text-green-400" />, push: false, email: false, inApp: true },
  { id: "email_digest", label: "Weekly Digest", description: "Weekly summary of team activity", icon: <Mail className="w-4 h-4 text-purple-400" />, push: false, email: true, inApp: false },
];

const QUIET_HOURS = ["Never", "10 PM – 8 AM", "9 PM – 9 AM", "8 PM – 9 AM", "Weekends"];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)}
      className={cn("relative w-9 h-5 rounded-full transition-colors flex-shrink-0", checked ? "bg-accent" : "bg-muted border border-border")}>
      <span className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform", checked ? "translate-x-4" : "translate-x-0.5")} />
    </button>
  );
}

export default function NotificationsSettingsPage() {
  const [settings, setSettings] = useState<NotifSetting[]>(NOTIF_SETTINGS);
  const [quietHours, setQuietHours] = useState("10 PM – 8 AM");
  const [sound, setSound] = useState(true);
  const [saved, setSaved] = useState(false);

  function toggle(id: string, key: "push" | "email" | "inApp") {
    setSettings(prev => prev.map(s => s.id === id ? { ...s, [key]: !s[key] } : s));
  }

  return (
    <div className="max-w-2xl mx-auto px-8 py-8">
      <h1 className="font-display font-bold text-xl text-foreground mb-6">Notifications</h1>

      {/* Global settings */}
      <div className="bg-surface border border-border rounded-xl p-5 mb-6">
        <h2 className="font-semibold text-sm text-foreground mb-4">Global Settings</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Volume2 className="w-4 h-4 text-accent" />
              <div>
                <p className="text-sm font-medium text-foreground">Notification Sounds</p>
                <p className="text-xs text-muted-foreground">Play sounds for new notifications</p>
              </div>
            </div>
            <Toggle checked={sound} onChange={setSound} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="w-4 h-4 text-accent" />
              <div>
                <p className="text-sm font-medium text-foreground">Quiet Hours</p>
                <p className="text-xs text-muted-foreground">Pause notifications during these times</p>
              </div>
            </div>
            <select value={quietHours} onChange={e => setQuietHours(e.target.value)}
              className="bg-muted border border-border rounded-lg px-3 py-1.5 text-xs text-foreground outline-none">
              {QUIET_HOURS.map(q => <option key={q}>{q}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Per-event settings */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-border bg-muted/30">
          <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-muted-foreground">
            <span className="col-span-6">Notification</span>
            <span className="col-span-2 text-center">Push</span>
            <span className="col-span-2 text-center">Email</span>
            <span className="col-span-2 text-center">In-App</span>
          </div>
        </div>
        {settings.map((s, i) => (
          <div key={s.id} className={cn("px-5 py-4 grid grid-cols-12 gap-4 items-center", i < settings.length - 1 && "border-b border-border")}>
            <div className="col-span-6 flex items-center gap-3">
              <div className="p-1.5 bg-muted rounded-lg">{s.icon}</div>
              <div>
                <p className="text-sm font-medium text-foreground">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.description}</p>
              </div>
            </div>
            <div className="col-span-2 flex justify-center"><Toggle checked={s.push} onChange={() => toggle(s.id, "push")} /></div>
            <div className="col-span-2 flex justify-center"><Toggle checked={s.email} onChange={() => toggle(s.id, "email")} /></div>
            <div className="col-span-2 flex justify-center"><Toggle checked={s.inApp} onChange={() => toggle(s.id, "inApp")} /></div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <motion.button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          className={cn("flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all",
            saved ? "bg-green-500/20 text-green-400 border border-green-500/30" : "accent-gradient text-white shadow-accent-glow")}>
          {saved ? <><Check className="w-4 h-4" /> Saved!</> : "Save Preferences"}
        </motion.button>
      </div>
    </div>
  );
}
