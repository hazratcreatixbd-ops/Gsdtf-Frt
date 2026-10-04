/**
 * PART 13 — Worker Capability Registry
 * Explicit capability declarations, task types, tool sets, risk levels,
 * and current load tracking for all 17 Agent Town workers.
 */

import { WorkerRole } from '../types/WorldTypes';
import { WorkerCapability, GoalRiskLevel, WorkerLiveStatus } from './ManagerTypes';

export class WorkerCapabilityRegistry {
  private static instance: WorkerCapabilityRegistry;
  private registry: Map<string, WorkerCapability> = new Map();

  private constructor() {
    this.registerDefaultCapabilities();
  }

  public static getInstance(): WorkerCapabilityRegistry {
    if (!WorkerCapabilityRegistry.instance) {
      WorkerCapabilityRegistry.instance = new WorkerCapabilityRegistry();
    }
    return WorkerCapabilityRegistry.instance;
  }

  private registerDefaultCapabilities(): void {
    const list: WorkerCapability[] = [
      {
        workerId: 'worker-manager',
        name: 'Hermes',
        role: 'MANAGER',
        capabilities: [
          'Executive Planning',
          'Task Delegation',
          'Cross-Worker Context Sharing',
          'Decision Support',
          'Workflow Lifecycle Management',
          'Final Review Synthesis',
        ],
        supportedTaskTypes: ['executive_triage', 'manager_review', 'delegation', 'synthesis'],
        requiredTools: ['orchestrateCeoGoal', 'getManagerOperationsStatus'],
        riskLevel: 'LOW',
        status: 'READY',
        currentLoad: 0,
        maxConcurrentTasks: 5,
      },
      {
        workerId: 'worker-planner',
        name: 'Chronos',
        role: 'PLANNER',
        capabilities: [
          'Goal Decomposition',
          'DAG Scheduling',
          'Dependency Analysis',
          'Contingency Routing',
          'Parallel Grouping',
        ],
        supportedTaskTypes: ['plan_generation', 'dag_scheduling', 'contingency_planning'],
        requiredTools: ['generateExecutionPlan', 'decomposeGoal'],
        riskLevel: 'LOW',
        status: 'READY',
        currentLoad: 0,
        maxConcurrentTasks: 3,
      },
      {
        workerId: 'worker-research',
        name: 'Nova',
        role: 'RESEARCH',
        capabilities: [
          'Public Market Scan',
          'Competitor Intelligence',
          'Audience Demographics',
          'Fact Verification',
          'Web Sourcing',
          'Empirical Evidence Extraction',
        ],
        supportedTaskTypes: ['market_research', 'competitor_scan', 'web_research', 'evidence_gathering'],
        requiredTools: ['searchWeb', 'researchPublicBusiness', 'fetchPublicSignals'],
        riskLevel: 'LOW',
        status: 'READY',
        currentLoad: 0,
        maxConcurrentTasks: 3,
      },
      {
        workerId: 'worker-market-data',
        name: 'Mercury',
        role: 'MARKET_DATA',
        capabilities: [
          'Search Signals',
          'Pricing Benchmarks',
          'Trend Velocity',
          'Platform Metrics',
          'Competitive Price Comparison',
        ],
        supportedTaskTypes: ['price_benchmark', 'market_data', 'keyword_metrics', 'trend_velocity'],
        requiredTools: ['analyzeCompetitor', 'fetchMarketData'],
        riskLevel: 'LOW',
        status: 'READY',
        currentLoad: 0,
        maxConcurrentTasks: 3,
      },
      {
        workerId: 'worker-news-weather',
        name: 'Aero',
        role: 'NEWS_WEATHER',
        capabilities: [
          'Breaking Feeds',
          'Local Weather Conditions',
          'Macro Sentiment',
          'Event Radar',
        ],
        supportedTaskTypes: ['news_scan', 'weather_telemetry', 'macro_signals'],
        requiredTools: ['fetchNewsFeeds', 'getWeatherReport'],
        riskLevel: 'LOW',
        status: 'READY',
        currentLoad: 0,
        maxConcurrentTasks: 2,
      },
      {
        workerId: 'worker-business',
        name: 'Orion',
        role: 'BUSINESS',
        capabilities: [
          'SWOT Modeling',
          'Strategic Milestones',
          'Revenue Logic',
          'Weekly Briefings',
          'Business Plan Architecture',
        ],
        supportedTaskTypes: ['business_strategy', 'swot_analysis', 'revenue_model', 'business_opportunity'],
        requiredTools: ['buildBusinessStrategy', 'generateSWOTAnalysis', 'generateBusinessIdeas'],
        riskLevel: 'LOW',
        status: 'READY',
        currentLoad: 0,
        maxConcurrentTasks: 3,
      },
      {
        workerId: 'worker-analytics',
        name: 'Pythagoras',
        role: 'ANALYTICS',
        capabilities: [
          'Performance Audits',
          'Data Synthesis',
          'Conversion Modeling',
          'Attribution Modeling',
          'Landed Cost Calculation',
        ],
        supportedTaskTypes: ['cost_calculation', 'analytics_synthesis', 'conversion_audit', 'roi_projection'],
        requiredTools: ['calculateMetrics', 'analyzePerformance', 'recordContentPerformance'],
        riskLevel: 'LOW',
        status: 'READY',
        currentLoad: 0,
        maxConcurrentTasks: 3,
      },
      {
        workerId: 'worker-content',
        name: 'Echo',
        role: 'CONTENT',
        capabilities: [
          'Hook Architecture',
          'Full Scriptwriting',
          'Content Repurposing',
          'Style Humanization',
          'Publishing Copy',
        ],
        supportedTaskTypes: ['content_brief', 'script_writing', 'hook_generation', 'repurposing', 'humanizing'],
        requiredTools: ['writeContentScript', 'generateHooks', 'repurposeContent', 'humanizeContent'],
        riskLevel: 'LOW',
        status: 'READY',
        currentLoad: 0,
        maxConcurrentTasks: 3,
      },
      {
        workerId: 'worker-media',
        name: 'Vesper',
        role: 'MEDIA',
        capabilities: [
          'Thumbnail Blueprints',
          'Video Metadata',
          'Upload Packaging',
          'Timeline Sequencing',
          'Media Distribution Staging',
        ],
        supportedTaskTypes: ['media_packaging', 'thumbnail_concept', 'metadata_prep', 'publishing_staging'],
        requiredTools: ['prepareMediaMetadata', 'scheduleContentItem'],
        riskLevel: 'MEDIUM',
        status: 'READY',
        currentLoad: 0,
        maxConcurrentTasks: 2,
      },
      {
        workerId: 'worker-verification',
        name: 'Astra',
        role: 'VERIFICATION',
        capabilities: [
          'Fact Checking',
          'Evidence Review',
          'Consistency Checking',
          'Safety Policy Audit',
          'Claim Grounding',
        ],
        supportedTaskTypes: ['verification', 'fact_check', 'evidence_audit', 'claim_grounding'],
        requiredTools: ['verifyClaims', 'auditFactConsistency'],
        riskLevel: 'LOW',
        status: 'READY',
        currentLoad: 0,
        maxConcurrentTasks: 4,
      },
      {
        workerId: 'worker-security',
        name: 'Aegis',
        role: 'SECURITY',
        capabilities: [
          'Defensive Header Checks',
          'Permission Verification',
          'API Security Auditing',
          'Credential Exposure Prevention',
          'Action Boundary Enforcement',
        ],
        supportedTaskTypes: ['security_audit', 'permission_check', 'credential_scan', 'boundary_check'],
        requiredTools: ['analyzeWebsiteSecurity', 'verifyPermissionStatus'],
        riskLevel: 'SENSITIVE',
        status: 'READY',
        currentLoad: 0,
        maxConcurrentTasks: 2,
      },
      {
        workerId: 'worker-coder',
        name: 'Zephyr',
        role: 'CODER',
        capabilities: [
          'TypeScript Architecture',
          'Component Engineering',
          'API Route Implementation',
          'Service Integration',
        ],
        supportedTaskTypes: ['code_generation', 'api_route', 'frontend_component'],
        requiredTools: ['generateWebsitePlan'],
        riskLevel: 'LOW',
        status: 'READY',
        currentLoad: 0,
        maxConcurrentTasks: 2,
      },
      {
        workerId: 'worker-debugger',
        name: 'Vigil',
        role: 'DEBUGGER',
        capabilities: [
          'Error Stack Trace Analysis',
          'State Inconsistency Detection',
          'Runtime Issue Diagnosis',
          'Failure Triage',
        ],
        supportedTaskTypes: ['stack_diagnosis', 'runtime_fix', 'failure_triage'],
        requiredTools: ['diagnoseError'],
        riskLevel: 'LOW',
        status: 'READY',
        currentLoad: 0,
        maxConcurrentTasks: 2,
      },
      {
        workerId: 'worker-tester',
        name: 'Argus',
        role: 'TESTER',
        capabilities: [
          'End-to-End Test Execution',
          'Regression Validation',
          'Edge Case Assertion',
          'Contract Verification',
        ],
        supportedTaskTypes: ['unit_test', 'integration_test', 'regression_check'],
        requiredTools: ['runAutomatedTests'],
        riskLevel: 'LOW',
        status: 'READY',
        currentLoad: 0,
        maxConcurrentTasks: 3,
      },
      {
        workerId: 'worker-reviewer',
        name: 'Athena',
        role: 'REVIEWER',
        capabilities: [
          'Peer Review',
          'Completeness Inspection',
          'Executive Readiness Check',
          'Editorial Standard Enforcement',
        ],
        supportedTaskTypes: ['peer_review', 'readiness_check', 'editorial_inspection'],
        requiredTools: ['reviewDeliverable'],
        riskLevel: 'LOW',
        status: 'READY',
        currentLoad: 0,
        maxConcurrentTasks: 3,
      },
      {
        workerId: 'worker-device',
        name: 'Titan',
        role: 'DEVICE',
        capabilities: [
          'Android Bridge Intents',
          'App Launcher Dispatch',
          'Device Status Telemetry',
          'Approval Action Preview Coordination',
        ],
        supportedTaskTypes: ['android_intent', 'app_launch', 'device_status', 'action_preview'],
        requiredTools: ['android_open_app', 'android_open_url', 'getDeviceStatus'],
        riskLevel: 'HIGH',
        status: 'READY',
        currentLoad: 0,
        maxConcurrentTasks: 2,
      },
      {
        workerId: 'worker-travel',
        name: 'Atlas',
        role: 'TRAVEL',
        capabilities: [
          'Destination Research',
          'Transport Options',
          'Lodging Comparison',
          'Itinerary Construction',
        ],
        supportedTaskTypes: ['itinerary_plan', 'destination_research', 'transit_comparison'],
        requiredTools: ['openMap', 'searchWeb'],
        riskLevel: 'MEDIUM',
        status: 'READY',
        currentLoad: 0,
        maxConcurrentTasks: 2,
      },
    ];

    list.forEach((w) => this.registry.set(w.workerId, w));
  }

  public getAllCapabilities(): WorkerCapability[] {
    return Array.from(this.registry.values());
  }

  public getCapability(workerId: string): WorkerCapability | null {
    return this.registry.get(workerId) || null;
  }

  public findWorkersForTaskType(taskType: string): WorkerCapability[] {
    const q = taskType.toLowerCase();
    return this.getAllCapabilities().filter(
      (w) =>
        w.supportedTaskTypes.some((t) => t.toLowerCase() === q || q.includes(t.toLowerCase())) ||
        w.capabilities.some((c) => c.toLowerCase().includes(q))
    );
  }

  public updateWorkerLoad(workerId: string, delta: number): void {
    const worker = this.registry.get(workerId);
    if (worker) {
      worker.currentLoad = Math.max(0, worker.currentLoad + delta);
    }
  }

  public updateWorkerStatus(workerId: string, status: WorkerLiveStatus): void {
    const worker = this.registry.get(workerId);
    if (worker) {
      worker.status = status;
    }
  }
}

export const workerCapabilityRegistry = WorkerCapabilityRegistry.getInstance();
