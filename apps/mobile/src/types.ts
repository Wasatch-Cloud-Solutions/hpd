export type Role = "EMPLOYEE" | "MANAGER" | "ADMINISTRATOR";

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  profileImageUrl?: string | null;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  memberships?: { userId: string; membershipRole: "MEMBER" | "MANAGER" }[];
}

export interface InventoryItem {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  unit: string;
  quantity: number | string | null;
  minimumStock: number | string | null;
  teams: { teamId: string; team: { id: string; name: string } }[];
}

export interface Message {
  id: string;
  teamId: string;
  content: string;
  messageType: string;
  isPinned: boolean;
  createdAt: string;
  sender: { id: string; fullName: string; profileImageUrl?: string | null };
  _count?: { replies: number; reads: number; reactions: number };
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}
