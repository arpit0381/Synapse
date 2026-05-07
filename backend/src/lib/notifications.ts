import { supabaseAdmin } from "./supabase";

export interface NotificationSettings {
  sounds: boolean;
  quiet_hours: string;
  categories: Record<string, { push: boolean; email: boolean; in_app: boolean }>;
}

export async function getUserNotificationSettings(userId: string): Promise<NotificationSettings | null> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("notification_settings")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return data.notification_settings as NotificationSettings;
}

export function isWithinQuietHours(settings: NotificationSettings): boolean {
  if (!settings.quiet_hours || settings.quiet_hours === "Never") return false;
  
  const now = new Date();
  const hour = now.getHours();
  
  // Simple check for "10 PM – 8 AM"
  if (settings.quiet_hours === "10 PM – 8 AM") {
    return hour >= 22 || hour < 8;
  }
  if (settings.quiet_hours === "9 PM – 9 AM") {
    return hour >= 21 || hour < 9;
  }
  if (settings.quiet_hours === "8 PM – 9 AM") {
    return hour >= 20 || hour < 9;
  }
  if (settings.quiet_hours === "Weekends") {
    const day = now.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  }
  
  return false;
}

export async function shouldSendNotification(userId: string, type: string, channel: "push" | "email" | "in_app"): Promise<boolean> {
  const settings = await getUserNotificationSettings(userId);
  if (!settings) return true; // Default to true if not set

  if (isWithinQuietHours(settings)) return false;

  const category = settings.categories[type];
  if (!category) return true; // Default to true if category not found

  return category[channel] ?? true;
}
