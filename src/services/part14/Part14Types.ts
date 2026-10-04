/**
 * PART 14 — Real-World Execution Pipelines & Live Mobile Result Types
 * Covers:
 * 1. Live Mobile Result Center (QUEUED, RUNNING, WAITING, WAITING_APPROVAL, COMPLETED, FAILED, BLOCKED)
 * 2. Media — Real Mobile Results (Reference Research -> Image Collection -> Original Image -> Video -> Verification)
 * 3. Website Opportunity — Real Mobile Results
 * 4. Google Maps / Location-Based Research (OPEN MAP, OPEN WEBSITE, VIEW RESEARCH)
 * 5. Website Demo — Real Preview (DEMO / SAMPLE label, OPEN DEMO, PREVIEW, EDIT, SAVE, SHARE)
 * 6. Website Research -> Demo Complete 11-Stage Flow
 * 7. Facebook Publishing (PUBLISHING -> VERIFYING -> PUBLISHED / PUBLISH FAILED)
 * 8. Android File Access & Permission Enforcement
 */

export type CapabilityAvailability = 'AVAILABLE' | 'BLOCKED' | 'UNAVAILABLE' | 'REQUIRES_APPROVAL';

export type LiveMobileOperationStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'WAITING'
  | 'WAITING_APPROVAL'
  | 'COMPLETED'
  | 'FAILED'
  | 'BLOCKED';

export type WebsitePipelineStage =
  | 'SEARCHING'
  | 'BUSINESSES_FOUND'
  | 'WEBSITE_CHECK'
  | 'OPPORTUNITY_IDENTIFIED'
  | 'DEMO_BUILDING'
  | 'DEMO_READY'
  | 'USER_REVIEW'
  | 'APPROVAL'
  | 'OUTREACH_READY'
  | 'AUTHORIZED_SEND'
  | 'REAL_RESULT';

export const WEBSITE_PIPELINE_STAGES: WebsitePipelineStage[] = [
  'SEARCHING',
  'BUSINESSES_FOUND',
  'WEBSITE_CHECK',
  'OPPORTUNITY_IDENTIFIED',
  'DEMO_BUILDING',
  'DEMO_READY',
  'USER_REVIEW',
  'APPROVAL',
  'OUTREACH_READY',
  'AUTHORIZED_SEND',
  'REAL_RESULT',
];

export interface LiveMobileOperationRecord {
  id: string;
  projectId: string;
  workerId: string;
  workerName: string;
  taskTitle: string;
  status: LiveMobileOperationStatus;
  progress: number; // 0 to 100
  input: string;
  output?: string;
  filesCreated: string[];
  errors: string[];
  startedAt: number;
  updatedAt: number;
  completedAt?: number;
  verificationResult?: {
    verified: boolean;
    score: number;
    summary: string;
  };
}

export interface ReferenceImageAsset {
  id: string;
  projectId: string;
  title: string;
  sourceUrl: string;
  imageUrl: string;
  pageUrl: string;
  sourceName: string;
  license: string;
  width?: number;
  height?: number;
  savedPath: string;
  downloadedAt: number;
  verified: boolean;
}

export interface GeneratedImageAsset {
  id: string;
  projectId: string;
  prompt: string;
  title: string;
  modelUsed: string;
  generationMode: 'GEMINI_IMAGE_API' | 'SERVER_SVG_SYNTHESIS';
  imageUrl: string;
  savedPath: string;
  projectFolder: string;
  mimeType: string;
  externalApiStatus: CapabilityAvailability;
  externalApiNote?: string;
  metadata?: {
    dimensions: string;
    sizeBytes: number;
    format: string;
    referencesUsed: number;
  };
  createdAt: number;
  verified: boolean;
  verificationScore?: number;
  verificationSummary?: string;
}

export interface GeneratedVideoAsset {
  id: string;
  projectId: string;
  prompt: string;
  sourceImageId?: string;
  modelUsed: string;
  status: 'COMPLETED' | 'BLOCKED' | 'UNAVAILABLE' | 'FAILED';
  externalApiStatus: CapabilityAvailability;
  videoUrl?: string;
  motionPreviewUrl?: string;
  savedPath?: string;
  projectFolder?: string;
  reason: string;
  providerMessage: string;
  createdAt: number;
  verified: boolean;
  verificationResult?: string;
}

export type FacebookPublishingStage =
  | 'WAITING_APPROVAL'
  | 'PUBLISHING'
  | 'VERIFYING'
  | 'PUBLISHED'
  | 'PUBLISH_FAILED'
  | 'BLOCKED'
  | 'UNAVAILABLE'
  | 'REJECTED';

export interface FacebookPublishResult {
  id: string;
  projectId: string;
  caption: string;
  mediaPaths: string[];
  status: FacebookPublishingStage;
  stageHistory: FacebookPublishingStage[];
  approvalRequestId?: string;
  approvedByUser: boolean;
  externalApiStatus: CapabilityAvailability;
  externalPostId?: string;
  externalUrl?: string;
  verifiedBeforePublished: boolean;
  draftPackagePath?: string;
  reason: string;
  errorDetails?: string;
  timestamp: number;
}

export interface WebsiteQualityAudit {
  url?: string;
  exists: boolean;
  reachable: boolean;
  httpStatus?: number;
  sslEnabled: boolean;
  responseTimeMs?: number;
  hasTitle: boolean;
  titleText?: string;
  hasMetaDescription: boolean;
  hasViewportMeta: boolean;
  mobileFriendly: boolean;
  hasClearCTA: boolean;
  qualityScore: number; // 0 to 100
  issues: string[];
  opportunities: string[];
  auditedAt: number;
}

export interface PublicBusinessLead {
  id: string;
  projectId: string;
  businessName: string;
  category: string;
  location: string;
  address: string;
  coordinates?: {
    lat: number;
    lon: number;
  };
  mapUrl: string;
  phone?: string;
  email?: string;
  existingWebsite?: string;
  websiteStatus: 'ONLINE' | 'UNREACHABLE' | 'NO_WEBSITE';
  publicSources: string[];
  sourceProvider: 'OPENSTREETMAP_NOMINATIM' | 'GOOGLE_MAPS_AUTHORIZED' | 'PUBLIC_WEB_DIRECTORY';
  researchStatus: 'VERIFIED_PUBLIC_DATA' | 'PARTIAL_PUBLIC_DATA' | 'UNVERIFIED';
  audit: WebsiteQualityAudit;
  opportunityLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  opportunitySummary: string;
}

export interface GeneratedDemoWebsite {
  id: string;
  projectId: string;
  businessId: string;
  businessName: string;
  category: string;
  location: string;
  sampleLabel: 'DEMO / SAMPLE' | 'AUTHORIZED';
  previewUrl: string;
  savedHtmlPath: string;
  projectFolder: string;
  htmlContent: string;
  mobileResponsive: boolean;
  sections: string[];
  generatedBy: 'GEMINI_FLASH_SERVER' | 'STRUCTURED_HTML5_ENGINE';
  createdAt: number;
  updatedAt?: number;
  verified: boolean;
  verificationScore: number;
}

export interface AuthorizedOutreachRecord {
  id: string;
  projectId: string;
  businessId: string;
  businessName: string;
  channel: 'EMAIL' | 'WHATSAPP' | 'ANDROID_INTENT';
  recipient: string;
  subject: string;
  messageBody: string;
  demoPreviewUrl: string;
  status: 'WAITING_APPROVAL' | 'OUTREACH_READY' | 'AUTHORIZED_SEND' | 'SENT' | 'HANDOFF_READY' | 'BLOCKED' | 'UNAVAILABLE' | 'REJECTED';
  approvalRequestId?: string;
  approvedByUser: boolean;
  externalApiStatus: CapabilityAvailability;
  savedPackagePath?: string;
  mailtoOrIntentUrl?: string;
  reason: string;
  timestamp: number;
}

export interface SavedProjectAssetItem {
  name: string;
  type: 'reference_manifest' | 'generated_image' | 'motion_preview' | 'demo_website' | 'publish_package' | 'outreach_package';
  relativePath: string;
  publicUrl: string;
  projectFolder: string;
  sizeBytes: number;
  persistedOnDisk: boolean;
  androidPermissionStatus?: 'GRANTED' | 'REQUIRED' | 'WEB_FALLBACK';
  createdAt: number;
}

export interface AndroidFileAccessStatus {
  bridgeConnected: boolean;
  permissionRequired: boolean;
  permissionName: string;
  permissionGranted: boolean;
  statusMessage: string;
  lastCheckedAt: number;
}

export interface Part14ProjectWorkspace {
  projectId: string;
  name: string;
  workflowType: 'MEDIA_PIPELINE_A' | 'BUSINESS_DEMO_B' | 'COMBINED';
  goal: string;
  status: LiveMobileOperationStatus;
  currentStage: string;
  websiteFlowStage?: WebsitePipelineStage;
  completedWebsiteStages?: WebsitePipelineStage[];
  createdAt: number;
  updatedAt: number;
  operations: LiveMobileOperationRecord[];
  references: ReferenceImageAsset[];
  generatedImages: GeneratedImageAsset[];
  generatedVideos: GeneratedVideoAsset[];
  facebookPublish?: FacebookPublishResult;
  businessLeads: PublicBusinessLead[];
  demoWebsites: GeneratedDemoWebsite[];
  outreachRecords: AuthorizedOutreachRecord[];
  savedAssets: SavedProjectAssetItem[];
  androidFileAccess?: AndroidFileAccessStatus;
  verificationScore?: number;
  verificationNotes?: string;
  blockedIntegrations: {
    service: string;
    status: 'BLOCKED' | 'UNAVAILABLE' | 'SERVICE_UNAVAILABLE' | 'ACTION_BLOCKED';
    reason: string;
  }[];
  errors: string[];
}
