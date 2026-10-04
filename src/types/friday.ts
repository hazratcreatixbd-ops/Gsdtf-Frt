export type FridayState = 'disconnected' | 'connecting' | 'listening' | 'thinking' | 'speaking';

export type WorkflowStatus =
  | 'planning'
  | 'researching'
  | 'executing'
  | 'waiting_for_permission'
  | 'completed'
  | 'failed';

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'waiting_for_permission';
  result?: any;
}

export interface WorkflowItem {
  id: string;
  title: string;
  goal: string;
  type: string;
  status: WorkflowStatus;
  currentStepIndex: number;
  steps: WorkflowStep[];
  output?: any;
  needsConfirmation?: boolean;
  confirmationDetails?: {
    action: string;
    target: string;
    summary: string;
  };
  createdAt: number;
  updatedAt: number;
}

export interface BusinessResearchItem {
  name: string;
  category: string;
  address: string;
  phone: string;
  website?: string;
  socials?: string;
  services: string[];
  description: string;
  publicContactVerified: boolean;
}

export interface WebsitePlanItem {
  id: string;
  businessName: string;
  tagline: string;
  services: string[];
  location: string;
  contactInfo: string;
  colorScheme: string;
  sections: { title: string; summary: string }[];
  htmlCode: string;
  previewUrl?: string;
  published: boolean;
  createdAt: number;
}

export interface OutreachDraftItem {
  id: string;
  channel: 'email' | 'whatsapp' | 'contact_form';
  recipient: string;
  subject?: string;
  message: string;
  link?: string;
  status: 'draft' | 'confirmed' | 'cancelled';
  businessContext?: string;
  createdAt: number;
}

export interface MediaMetadataItem {
  id: string;
  topic: string;
  platform: 'youtube' | 'tiktok' | 'reels';
  titleOptions: string[];
  description: string;
  tags: string[];
  hashtags: string[];
  checklist: string[];
  createdAt: number;
}

export interface SecurityAuditItem {
  id: string;
  targetUrl: string;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  score: number;
  headersChecked: {
    name: string;
    present: boolean;
    status: 'pass' | 'warn' | 'fail';
    description: string;
    recommendation?: string;
  }[];
  findings: string[];
  remediationChecklist: string[];
  createdAt: number;
}

export interface ToolCallItem {
  id: string;
  name: string;
  args: Record<string, any>;
  timestamp: number;
  status: 'executing' | 'completed' | 'failed';
  result?: any;
}

export interface TranscriptionItem {
  id: string;
  role: 'user' | 'friday';
  text: string;
  timestamp: number;
}

export interface MemoryItem {
  id: string;
  key: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface TaskItem {
  id: string;
  title: string;
  date?: string;
  time?: string;
  reminderTime?: string;
  status: 'pending' | 'completed' | 'cancelled';
  workflowType?: string;
  createdAt: number;
  completedAt?: number;
}

export interface FridayConfig {
  autoListen: boolean;
  vadSensitivity: number; // 0 to 1
  voice: 'Kore' | 'Zephyr';
  soundFx: boolean;
}

