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
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      <div>
        <h1 className="font-display font-black text-2xl md:text-4xl tracking-tight flex items-center gap-3 text-foreground">
          <div className="p-2 md:p-2.5 rounded-2xl bg-accent/10">
            <Bell className="w-6 h-6 md:w-8 md:h-8 text-accent" />
          </div>
          Notifications
        </h1>
        <p className="text-sm font-medium text-muted-foreground mt-2 md:mt-3 px-1">Manage how and when you receive alerts and updates</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        <div className="lg:col-span-4 space-y-6 md:space-y-8">
          {/* Global settings */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-surface/50 backdrop-blur-sm border border-border/60 rounded-[24px] p-6 md:p-8 space-y-8 shadow-sm">
            <h3 className="font-bold text-[15px] flex items-center gap-2 border-b border-border/30 pb-4">
              <Smartphone className="w-4 h-4 text-accent" /> Global Settings
            </h3>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-foreground">Notification Sounds</p>
                    <p className="text-[11px] font-medium text-muted-foreground opacity-60">Alert sounds for messages</p>
                  </div>
                </div>
                <Toggle checked={sound} onChange={setSound} />
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                    <Bell className="w-4 h-4" />
                  </div>
                  <p className="text-[13px] font-bold text-foreground">Quiet Hours</p>
                </div>
                <select value={quietHours} onChange={e => setQuietHours(e.target.value)}
                  className="w-full bg-background/50 border border-border/40 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-widest text-foreground outline-none focus:ring-2 focus:ring-accent/20 transition-all cursor-pointer">
                  {QUIET_HOURS.map(q => <option key={q} className="bg-surface">{q}</option>)}
                </select>
                <p className="text-[10px] font-medium text-muted-foreground px-1 opacity-60 italic">Pause all notifications during these times</p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          {/* Per-event settings */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-surface/50 backdrop-blur-sm border border-border/60 rounded-[24px] overflow-hidden shadow-sm">
            <div className="hidden md:grid grid-cols-12 gap-4 px-8 py-5 border-b border-border/40 bg-surface/30">
              <span className="col-span-6 text-[11px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Notification Type</span>
              <span className="col-span-2 text-center text-[11px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Push</span>
              <span className="col-span-2 text-center text-[11px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Email</span>
              <span className="col-span-2 text-center text-[11px] font-black uppercase tracking-widest text-muted-foreground opacity-60">In-App</span>
            </div>

            <div className="divide-y divide-border/30">
              {settings.map((s) => (
                <div key={s.id} className="p-6 md:px-8 md:py-6 flex flex-col md:grid md:grid-cols-12 gap-6 md:gap-4 items-start md:items-center hover:bg-muted/10 transition-colors">
                  <div className="col-span-6 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-muted/40 border border-border/30 flex items-center justify-center flex-shrink-0">
                      {s.icon}
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-foreground">{s.label}</p>
                      <p className="text-xs font-medium text-muted-foreground opacity-60">{s.description}</p>
                    </div>
                  </div>

                  {/* Desktop Grid Layout */}
                  <div className="hidden md:contents">
                    <div className="col-span-2 flex justify-center"><Toggle checked={s.push} onChange={() => toggle(s.id, "push")} /></div>
                    <div className="col-span-2 flex justify-center"><Toggle checked={s.email} onChange={() => toggle(s.id, "email")} /></div>
                    <div className="col-span-2 flex justify-center"><Toggle checked={s.inApp} onChange={() => toggle(s.id, "inApp")} /></div>
                  </div>

                  {/* Mobile Stacked Controls */}
                  <div className="flex md:hidden w-full items-center justify-between bg-muted/20 p-3 rounded-2xl gap-4">
                    <div className="flex flex-col items-center gap-1.5 px-2">
                      <span className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground opacity-60">Push</span>
                      <Toggle checked={s.push} onChange={() => toggle(s.id, "push")} />
                    </div>
                    <div className="w-px h-8 bg-border/40" />
                    <div className="flex flex-col items-center gap-1.5 px-2">
                      <span className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground opacity-60">Email</span>
                      <Toggle checked={s.email} onChange={() => toggle(s.id, "email")} />
                    </div>
                    <div className="w-px h-8 bg-border/40" />
                    <div className="flex flex-col items-center gap-1.5 px-2">
                      <span className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground opacity-60">In-App</span>
                      <Toggle checked={s.inApp} onChange={() => toggle(s.id, "inApp")} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="flex justify-end pt-4">
            <button 
              onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}
              className={cn("px-8 py-4 rounded-[18px] text-[13px] font-bold uppercase tracking-widest transition-all btn-press shadow-xl",
                saved ? "bg-green-500 text-white shadow-green-500/20" : "accent-gradient text-white shadow-accent/20")}
            >
              {saved ? <><Check className="w-4 h-4" /> Preferences Saved</> : "Apply Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
