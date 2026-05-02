import { Client, Account, Databases, Storage } from "appwrite";

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1";
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";

export const appwriteClient = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID);

export const account = new Account(appwriteClient);
export const databases = new Databases(appwriteClient);
export const storage = new Storage(appwriteClient);

// ── Bucket IDs (create these in Appwrite dashboard) ─────────────────
export const APPWRITE_BUCKETS = {
  avatars: "avatars",
  files: "workspace-files",
  attachments: "message-attachments",
} as const;

// ── Upload a file to Appwrite Storage ────────────────────────────────
export async function uploadFile(bucketId: string, file: File, fileId = "unique()") {
  const { ID } = await import("appwrite");
  return storage.createFile(bucketId, fileId === "unique()" ? ID.unique() : fileId, file);
}

// ── Get file preview URL ─────────────────────────────────────────────
export function getFilePreviewUrl(bucketId: string, fileId: string, width = 400): string {
  return `${ENDPOINT}/storage/buckets/${bucketId}/files/${fileId}/preview?project=${PROJECT_ID}&width=${width}`;
}

// ── Get file download URL ────────────────────────────────────────────
export function getFileDownloadUrl(bucketId: string, fileId: string): string {
  return `${ENDPOINT}/storage/buckets/${bucketId}/files/${fileId}/download?project=${PROJECT_ID}`;
}

// ── Delete a file ────────────────────────────────────────────────────
export async function deleteFile(bucketId: string, fileId: string) {
  return storage.deleteFile(bucketId, fileId);
}
