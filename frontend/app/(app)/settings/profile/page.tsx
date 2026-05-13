"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Camera, Mail, Lock, Save, Loader2, Check, Globe, Settings, Clock, Smile, LogOut } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { api } from "@/lib/api";
import { cn, getInitials, stringToColor } from "@/lib/utils";
import { toast } from "sonner";

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Australia/Sydney"
];

export default function ProfilePage() {
  const { user, updateUser, enterKeyBehavior, setEnterKeyBehavior } = useAppStore();
  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [statusMessage, setStatusMessage] = useState(user?.status_message || "");
  const [timezone, setTimezone] = useState(user?.timezone || "UTC");
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setBio(user.bio || "");
      setStatusMessage(user.status_message || "");
      setTimezone(user.timezone || "UTC");
    }
  }, [user]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      await api.profiles.update(user.id, { 
        full_name: name, 
        bio, 
        status_message: statusMessage,
        timezone 
      });
      updateUser({ name, bio, status_message: statusMessage, timezone });
      toast.success("Profile updated successfully");
    } catch (err: any) { 
      toast.error(err.message || "Failed to update profile"); 
    }
    finally { setSaving(false); }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    const isImage = file.type.startsWith("image/") || file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    if (!isImage) { 
      toast.error("Please select a valid image file"); 
      e.target.value = ""; 
      return; 
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image is too large. Please select an image under 10MB.");
      e.target.value = "";
      return;
    }
    
    setAvatarUploading(true);
    try {
      const sigRes = await api.profiles.getCloudinarySignature(user.id);
      if (!sigRes || !sigRes.signature) throw new Error("Failed to get upload signature");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", sigRes.apiKey);
      formData.append("timestamp", sigRes.timestamp);
      formData.append("signature", sigRes.signature);
      formData.append("folder", sigRes.folder);
      
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dup3wsdib";
      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error?.message || "Failed to upload image");
      
      const avatarUrl = uploadData.secure_url;
      await api.profiles.update(user.id, { avatar_url: avatarUrl });
      updateUser({ avatar_url: avatarUrl });
      toast.success("Avatar updated successfully!");
    } catch (err: any) { 
      console.error("[Avatar Upload Error]", err);
      toast.error(err.message || "Something went wrong uploading the avatar"); 
    }
    finally { 
      setAvatarUploading(false); 
      e.target.value = "";
    }
  }

  if (!user) return null;

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      <div>
        <h1 className="font-display font-black text-2xl md:text-4xl tracking-tight flex items-center gap-3 text-foreground">
          <div className="p-2 md:p-2.5 rounded-2xl bg-accent/10">
            <User className="w-6 h-6 md:w-8 md:h-8 text-accent" />
          </div>
          Profile Settings
        </h1>
        <p className="text-sm font-medium text-muted-foreground mt-2 md:mt-3 px-1">Manage your personal information and presence</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        <div className="lg:col-span-4 space-y-6 md:space-y-8">
          {/* Avatar Section */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-surface/50 backdrop-blur-sm border border-border/60 rounded-[24px] p-6 md:p-8 shadow-sm">
            <h3 className="font-bold text-[15px] mb-6 flex items-center gap-2">
              <Camera className="w-4 h-4 text-accent" /> Profile Picture
            </h3>
            <div className="flex flex-col items-center gap-6">
              <div className="relative group">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-[32px] flex items-center justify-center text-3xl font-bold text-white overflow-hidden shadow-xl transition-transform group-hover:scale-[1.02]" style={{ backgroundColor: user.avatar_url ? "transparent" : stringToColor(user.name) }}>
                  {user.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" /> : getInitials(user.name)}
                </div>
                <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-[32px] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-[2px]">
                  {avatarUploading ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Camera className="w-6 h-6 text-white" />}
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={avatarUploading} />
                </label>
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-foreground">{user.name}</p>
                <p className="text-xs font-semibold text-muted-foreground opacity-60">@{user.username || "user"}</p>
                <p className="text-[11px] text-accent font-bold mt-2 uppercase tracking-widest opacity-80">Click avatar to change</p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="lg:col-span-8 space-y-6 md:space-y-8">
          {/* Profile Info */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-surface/50 backdrop-blur-sm border border-border/60 rounded-[24px] p-6 md:p-8 space-y-6 shadow-sm">
            <h3 className="font-bold text-[15px] flex items-center gap-2 border-b border-border/30 pb-4">
              <Globe className="w-4 h-4 text-accent" /> Personal Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2 block opacity-70">Display Name</label>
                <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-background/50 border border-border/40 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all" />
              </div>
              <div>
                <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2 block opacity-70">Email Address</label>
                <div className="flex items-center gap-3 px-4 py-3 bg-muted/20 border border-border/30 rounded-xl text-sm font-medium text-muted-foreground select-none">
                  <Mail className="w-4 h-4 opacity-50" />
                  {user.email}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2 block opacity-70">Timezone</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-3.5 w-4 h-4 text-muted-foreground opacity-50" />
                  <select 
                    value={timezone} 
                    onChange={e => setTimezone(e.target.value)}
                    className="w-full bg-background/50 border border-border/40 rounded-xl pl-11 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all appearance-none cursor-pointer"
                  >
                    {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz.replace("_", " ")}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2 block opacity-70">Status</label>
                <div className="relative">
                  <Smile className="absolute left-4 top-3.5 w-4 h-4 text-muted-foreground opacity-50" />
                  <input 
                    value={statusMessage} 
                    onChange={e => setStatusMessage(e.target.value)} 
                    placeholder="Set a status..."
                    className="w-full bg-background/50 border border-border/40 rounded-xl pl-11 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all" 
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2 block opacity-70">Bio</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Tell your team about yourself…" className="w-full bg-background/50 border border-border/40 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all resize-none" />
            </div>
          </motion.div>

          {/* Preferences */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-surface/50 backdrop-blur-sm border border-border/60 rounded-[24px] p-6 md:p-8 space-y-6 shadow-sm">
            <h3 className="font-bold text-[15px] flex items-center gap-2 border-b border-border/30 pb-4">
              <Settings className="w-4 h-4 text-accent" /> Chat Preferences
            </h3>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-foreground">Enter key behavior</p>
                <p className="text-xs font-medium text-muted-foreground opacity-60">Control what happens when you press Enter in the chat box</p>
              </div>
              <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-xl w-fit">
                <button onClick={() => setEnterKeyBehavior("send")} className={cn("px-5 py-2 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all duration-200", enterKeyBehavior === "send" ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-muted-foreground hover:text-foreground")}>Send</button>
                <button onClick={() => setEnterKeyBehavior("newline")} className={cn("px-5 py-2 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all duration-200", enterKeyBehavior === "newline" ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-muted-foreground hover:text-foreground")}>New Line</button>
              </div>
            </div>
          </motion.div>

           <div className="flex justify-between items-center pt-4">
             <button onClick={handleSave} disabled={saving} className="flex items-center gap-3 px-8 py-4 accent-gradient text-white rounded-[18px] font-bold text-sm hover:scale-[1.02] transition-all shadow-xl shadow-accent/20 disabled:opacity-50 btn-press">
               {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
               {saving ? "SAVING..." : "SAVE CHANGES"}
             </button>
             <button onClick={() => {
               useAppStore.getState().clearAuth();
               window.location.href = "/login";
             }} className="flex items-center gap-3 px-8 py-4 bg-destructive text-white rounded-[18px] font-bold text-sm hover:scale-[1.02] transition-all shadow-xl shadow-destructive/20 btn-press">
               <LogOut className="w-5 h-5" />
               Log Out
             </button>
           </div>
        </div>
      </div>
    </div>
  );
}
