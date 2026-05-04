"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Camera, Mail, Lock, Save, Loader2, Check, Globe } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { api } from "@/lib/api";
import { cn, getInitials, stringToColor } from "@/lib/utils";
import { toast } from "react-hot-toast";

export default function ProfilePage() {
  const { user, updateUser, enterKeyBehavior, setEnterKeyBehavior } = useAppStore();
  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [statusMessage, setStatusMessage] = useState(user?.status_message || "");
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setBio(user.bio || "");
      setStatusMessage(user.status_message || "");
    }
  }, [user]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      await api.profiles.update(user.id, { full_name: name, bio, status_message: statusMessage });
      updateUser({ name, bio, status_message: statusMessage });
      toast.success("Profile updated!");
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    // Check file extension instead of just type because Windows sometimes gives empty type
    const isImage = file.type.startsWith("image/") || file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    if (!isImage) { 
      toast.error("Please select a valid image file"); 
      e.target.value = ""; 
      return; 
    }

    // Cloudinary free tier has a 10MB limit
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
      e.target.value = ""; // Reset input so user can pick the same file again if it failed
    }
  }

  if (!user) return null;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="font-display font-bold text-2xl tracking-tight flex items-center gap-2"><User className="w-6 h-6 text-accent" />Profile Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your personal information and preferences</p>
      </div>

      {/* Avatar Section */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-surface border border-border rounded-2xl p-6">
        <h3 className="font-semibold text-sm mb-4">Profile Picture</h3>
        <div className="flex items-center gap-5">
          <div className="relative group">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white overflow-hidden" style={{ backgroundColor: user.avatar_url ? "transparent" : stringToColor(user.name) }}>
              {user.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" /> : getInitials(user.name)}
            </div>
            <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              {avatarUploading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={avatarUploading} />
            </label>
          </div>
          <div><p className="text-sm font-medium">{user.name}</p><p className="text-xs text-muted-foreground">@{user.username || "user"}</p><p className="text-xs text-muted-foreground mt-1">Click avatar to change</p></div>
        </div>
      </motion.div>

      {/* Profile Info */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-surface border border-border rounded-2xl p-6 space-y-5">
        <h3 className="font-semibold text-sm">Personal Information</h3>
        <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block">Display Name</label><input value={name} onChange={e => setName(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50" /></div>
        <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email</label><div className="flex items-center gap-2 px-3 py-2.5 bg-muted/30 border border-border rounded-lg text-sm text-muted-foreground"><Mail className="w-4 h-4" />{user.email}</div></div>
        <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block">Bio</label><textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Tell your team about yourself…" className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent/50 resize-none" /></div>
        <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block">Status Message</label><input value={statusMessage} onChange={e => setStatusMessage(e.target.value)} placeholder="e.g. In a meeting…" className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent/50" /></div>
      </motion.div>

      {/* Preferences */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-surface border border-border rounded-2xl p-6 space-y-4">
        <h3 className="font-semibold text-sm">Preferences</h3>
        <div className="flex items-center justify-between">
          <div><p className="text-sm font-medium">Enter key behavior</p><p className="text-xs text-muted-foreground">What happens when you press Enter in chat</p></div>
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
            <button onClick={() => setEnterKeyBehavior("send")} className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-colors", enterKeyBehavior === "send" ? "bg-accent text-white" : "text-muted-foreground")}>Send</button>
            <button onClick={() => setEnterKeyBehavior("newline")} className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-colors", enterKeyBehavior === "newline" ? "bg-accent text-white" : "text-muted-foreground")}>New Line</button>
          </div>
        </div>
      </motion.div>

      <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 accent-gradient text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity shadow-lg disabled:opacity-50">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{saving ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );
}
