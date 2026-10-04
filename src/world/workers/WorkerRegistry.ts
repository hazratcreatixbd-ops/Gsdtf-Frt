/**
 * PART 11 — FRIDAY Worker Registry & Management Engine
 * Centralized registry of all visible and specialized autonomous workers in Agent Town.
 * Connects with Part 9 Worker Router and Part 10 Business Workflow Engine.
 */

import { WorkerEntity, WorkerRole, WorkerStatus } from '../types/WorldTypes';
import { worldEventBus } from '../events/WorldEventBus';
import { businessWorkflowEngine } from '../../services/BusinessWorkflowEngine';
import { advancedMemoryManager } from '../../services/memory/AdvancedMemoryManager';
import { WorkerMemoryContext } from '../../services/memory/MemoryTypes';

export class WorkerRegistry {
  private static instance: WorkerRegistry;
  private workers: Map<string, WorkerEntity> = new Map();
  private selectedWorkerId: string = 'worker-manager';

  private constructor() {
    this.initializeDefaultWorkers();
    this.connectToBusinessWorkflowEngine();
  }

  public static getInstance(): WorkerRegistry {
    if (!WorkerRegistry.instance) {
      WorkerRegistry.instance = new WorkerRegistry();
    }
    return WorkerRegistry.instance;
  }

  private initializeDefaultWorkers(): void {
    const initialList: WorkerEntity[] = [
      {
        id: 'worker-manager',
        name: 'Hermes',
        role: 'MANAGER',
        description: 'Executive Operations Lead. Coordinates cross-department workflow dispatch, goals, and delivery.',
        status: 'READY',
        capabilities: ['Executive Planning', 'Task Delegation', 'Cross-Worker Context Sharing', 'Decision Support'],
        avatar: '👔',
        accentColor: '#38bdf8', // Sky / Cyan
        workstation: {
          zone: 'executive',
          roomName: 'Executive Suite',
          deskLabel: 'Station 01 (Executive)',
          x: 18,
          y: 28,
        },
        lastActivity: 'Monitoring Agent Town and workspace readiness.',
        assignedBy: 'User (Direct Command)',
        metrics: { tasksCompleted: 14, tasksFailed: 0, uptimeSec: 3600 },
        progress: 100,
      },
      {
        id: 'worker-planner',
        name: 'Chronos',
        role: 'PLANNER',
        description: 'Multi-Step Workflow & Milestone Planner. Breaks high-level business goals into sequenced DAG steps.',
        status: 'READY',
        capabilities: ['Goal Decomposition', 'DAG Scheduling', 'Dependency Analysis', 'Contingency Routing'],
        avatar: '⏱️',
        accentColor: '#0ea5e9', // Blue
        workstation: {
          zone: 'executive',
          roomName: 'Executive Suite',
          deskLabel: 'Station 02 (Strategic Planning)',
          x: 28,
          y: 28,
        },
        lastActivity: 'Validated dependency graph for active campaigns.',
        assignedBy: 'Hermes (Manager)',
        metrics: { tasksCompleted: 16, tasksFailed: 0, uptimeSec: 3600 },
        progress: 100,
      },
      {
        id: 'worker-research',
        name: 'Nova',
        role: 'RESEARCH',
        description: 'Market & Public Signals Researcher. Scans trends, publicly observable benchmarks, and customer signals.',
        status: 'READY',
        capabilities: ['Public Market Scan', 'Competitor Intelligence', 'Audience Demographics', 'Fact Verification'],
        avatar: '🔬',
        accentColor: '#818cf8', // Indigo
        workstation: {
          zone: 'research_lab',
          roomName: 'Research Lab',
          deskLabel: 'Station 03 (Data Lab)',
          x: 44,
          y: 24,
        },
        lastActivity: 'Indexed competitive signals and public business data.',
        assignedBy: 'Hermes (Manager)',
        metrics: { tasksCompleted: 18, tasksFailed: 0, uptimeSec: 3600 },
        progress: 100,
      },
      {
        id: 'worker-market-data',
        name: 'Mercury',
        role: 'MARKET_DATA',
        description: 'Market Feeds & Competitive Pricing Analyst. Tracks industry benchmarks and search volume signals.',
        status: 'READY',
        capabilities: ['Search Signals', 'Pricing Benchmarks', 'Trend Velocity', 'Platform Metrics'],
        avatar: '📊',
        accentColor: '#6366f1', // Indigo Accent
        workstation: {
          zone: 'research_lab',
          roomName: 'Research Lab',
          deskLabel: 'Station 04 (Market Benchmarks)',
          x: 54,
          y: 24,
        },
        lastActivity: 'Synced public industry benchmarks and organic keywords.',
        assignedBy: 'Hermes (Manager)',
        metrics: { tasksCompleted: 11, tasksFailed: 0, uptimeSec: 3600 },
        progress: 100,
      },
      {
        id: 'worker-news-weather',
        name: 'Aero',
        role: 'NEWS_WEATHER',
        description: 'Real-time News & Environmental Signals. Monitors external world context, press events, and atmospheric data.',
        status: 'READY',
        capabilities: ['Breaking Feeds', 'Local Weather Conditions', 'Macro Sentiment', 'Event Radar'],
        avatar: '🌤️',
        accentColor: '#38bdf8', // Light Blue
        workstation: {
          zone: 'research_lab',
          roomName: 'Research Lab',
          deskLabel: 'Station 05 (Signals Radar)',
          x: 49,
          y: 38,
        },
        lastActivity: 'Live telemetry online. Feed monitoring active.',
        assignedBy: 'Hermes (Manager)',
        metrics: { tasksCompleted: 8, tasksFailed: 0, uptimeSec: 3600 },
        progress: 100,
      },
      {
        id: 'worker-business',
        name: 'Orion',
        role: 'BUSINESS',
        description: 'Business Intelligence & Strategic Analyst. Constructs SWOT analyses, business roadmaps, and revenue logic.',
        status: 'READY',
        capabilities: ['SWOT Modeling', 'Strategic Milestones', 'Revenue Logic', 'Weekly Briefings'],
        avatar: '📈',
        accentColor: '#34d399', // Emerald
        workstation: {
          zone: 'business_hub',
          roomName: 'Business Strategy Hub',
          deskLabel: 'Station 06 (Strategy Hub)',
          x: 74,
          y: 24,
        },
        lastActivity: 'Compiled high-growth milestones for active venture.',
        assignedBy: 'Hermes (Manager)',
        metrics: { tasksCompleted: 15, tasksFailed: 0, uptimeSec: 3600 },
        progress: 100,
      },
      {
        id: 'worker-analytics',
        name: 'Pythagoras',
        role: 'ANALYTICS',
        description: 'Quantitative Modeling & Performance Metrics. Computes conversion funnels, retention rates, and ROI.',
        status: 'READY',
        capabilities: ['Funnel Analysis', 'Cohort Retention', 'CAC/LTV Estimates', 'KPI Dashboards'],
        avatar: '📐',
        accentColor: '#10b981', // Emerald
        workstation: {
          zone: 'business_hub',
          roomName: 'Business Strategy Hub',
          deskLabel: 'Station 07 (Quant Desk)',
          x: 84,
          y: 28,
        },
        lastActivity: 'Projected 90-day trajectory with baseline conversion models.',
        assignedBy: 'Hermes (Manager)',
        metrics: { tasksCompleted: 13, tasksFailed: 0, uptimeSec: 3600 },
        progress: 100,
      },
      {
        id: 'worker-content',
        name: 'Echo',
        role: 'CONTENT',
        description: 'Creative Content & Copywriting Specialist. Formulates viral hooks, scripts, captions, and repurposing matrices.',
        status: 'READY',
        capabilities: ['Hook Ideation', 'Timed Video Scripts', 'Platform Captions', 'Conversational Humanizer'],
        avatar: '✍️',
        accentColor: '#f43f5e', // Rose
        workstation: {
          zone: 'creative_studio',
          roomName: 'Creative Studio',
          deskLabel: 'Station 08 (Copy Desk)',
          x: 18,
          y: 72,
        },
        lastActivity: 'Drafted 30-day content calendar and high-retention hooks.',
        assignedBy: 'Hermes (Manager)',
        metrics: { tasksCompleted: 24, tasksFailed: 0, uptimeSec: 3600 },
        progress: 100,
      },
      {
        id: 'worker-media',
        name: 'Vesper',
        role: 'MEDIA',
        description: 'Media Packaging & SEO Specialist. Formulates video titles, tags, visual directions, and metadata packages.',
        status: 'READY',
        capabilities: ['SEO Tag Packages', 'Thumbnail Specifications', 'Video Deliverables', 'Platform Formatting'],
        avatar: '🎬',
        accentColor: '#fb923c', // Amber / Orange
        workstation: {
          zone: 'creative_studio',
          roomName: 'Creative Studio',
          deskLabel: 'Station 09 (Media Suite)',
          x: 28,
          y: 72,
        },
        lastActivity: 'Prepared upload metadata for multi-platform short video.',
        assignedBy: 'Hermes (Manager)',
        metrics: { tasksCompleted: 14, tasksFailed: 0, uptimeSec: 3600 },
        progress: 100,
      },
      {
        id: 'worker-verification',
        name: 'Astra',
        role: 'VERIFICATION',
        description: 'Quality, Truth, & Safety Auditor. Audits claims, platform policy compliance, and anti-hallucination standards.',
        status: 'READY',
        capabilities: ['Anti-Hallucination Audit', 'Platform Safety Check', 'Tone Alignment', 'Verification Grading'],
        avatar: '🛡️',
        accentColor: '#a855f7', // Purple
        workstation: {
          zone: 'audit_station',
          roomName: 'Audit Station',
          deskLabel: 'Station 10 (Quality Gate)',
          x: 44,
          y: 72,
        },
        lastActivity: 'Verified brand claims with PASS grade compliance.',
        assignedBy: 'Hermes (Manager)',
        metrics: { tasksCompleted: 20, tasksFailed: 0, uptimeSec: 3600 },
        progress: 100,
      },
      {
        id: 'worker-security',
        name: 'Aegis',
        role: 'SECURITY',
        description: 'Cybersecurity, Permissions, & Secret Guardian. Enforces zero unauthorized credentials and access rules.',
        status: 'READY',
        capabilities: ['Secrets Audit', 'Permission Scopes', 'CSRF/XSS Guards', 'Token Integrity'],
        avatar: '🔒',
        accentColor: '#c084fc', // Purple Accent
        workstation: {
          zone: 'audit_station',
          roomName: 'Audit Station',
          deskLabel: 'Station 11 (Security Vault)',
          x: 54,
          y: 72,
        },
        lastActivity: 'Audited permission boundaries. Zero token leaks detected.',
        assignedBy: 'Hermes (Manager)',
        metrics: { tasksCompleted: 19, tasksFailed: 0, uptimeSec: 3600 },
        progress: 100,
      },
      {
        id: 'worker-coder',
        name: 'Zephyr',
        role: 'CODER',
        description: 'Technical Architect & Code Automator. Implements scripts, tool schemas, and backend automation pipes.',
        status: 'READY',
        capabilities: ['TypeScript / Node', 'API Adapters', 'WebSocket Pipelines', 'Code Diagnostics'],
        avatar: '💻',
        accentColor: '#06b6d4', // Cyan
        workstation: {
          zone: 'tech_dev',
          roomName: 'Tech & Automation Lab',
          deskLabel: 'Station 12 (Dev Console)',
          x: 72,
          y: 64,
        },
        lastActivity: 'Maintained WebSocket Live session protocols.',
        assignedBy: 'Hermes (Manager)',
        metrics: { tasksCompleted: 17, tasksFailed: 0, uptimeSec: 3600 },
        progress: 100,
      },
      {
        id: 'worker-debugger',
        name: 'Vigil',
        role: 'DEBUGGER',
        description: 'Root Cause & Stack Trace Diagnostician. Analyzes runtime anomalies and inspects WebSocket logs.',
        status: 'READY',
        capabilities: ['Stack Trace Parsing', 'Anomalous Event Detection', 'Memory Leak Profiling', 'Patch Verification'],
        avatar: '🔍',
        accentColor: '#22d3ee', // Cyan
        workstation: {
          zone: 'tech_dev',
          roomName: 'Tech & Automation Lab',
          deskLabel: 'Station 13 (Diagnostics)',
          x: 82,
          y: 64,
        },
        lastActivity: 'Continuous trace profiling clean. No unhandled rejections.',
        assignedBy: 'Zephyr (Coder)',
        metrics: { tasksCompleted: 11, tasksFailed: 0, uptimeSec: 3600 },
        progress: 100,
      },
      {
        id: 'worker-tester',
        name: 'Argus',
        role: 'TESTER',
        description: 'Automated Test Suite Runner & End-to-End Assertion Engineer. Executes orchestration and unit tests.',
        status: 'READY',
        capabilities: ['Automated Vitest/Jest', 'Integration Scenarios', 'Regression Proofing', 'Mock Bridge Tests'],
        avatar: '🧪',
        accentColor: '#38bdf8', // Sky
        workstation: {
          zone: 'tech_dev',
          roomName: 'Tech & Automation Lab',
          deskLabel: 'Station 14 (Test Suite)',
          x: 92,
          y: 64,
        },
        lastActivity: 'Executed complete test suite across Parts 1-11. All green.',
        assignedBy: 'Zephyr (Coder)',
        metrics: { tasksCompleted: 22, tasksFailed: 0, uptimeSec: 3600 },
        progress: 100,
      },
      {
        id: 'worker-reviewer',
        name: 'Athena',
        role: 'REVIEWER',
        description: 'Code Quality & Architectural Reviewer. Checks type soundness, anti-slop rules, and clean abstractions.',
        status: 'READY',
        capabilities: ['Static Analysis', 'Anti-Pattern Flagging', 'Type Soundness', 'Architecture Reviews'],
        avatar: '📜',
        accentColor: '#0284c7', // Deep Sky
        workstation: {
          zone: 'tech_dev',
          roomName: 'Tech & Automation Lab',
          deskLabel: 'Station 15 (Code Review)',
          x: 72,
          y: 80,
        },
        lastActivity: 'Passed architectural review for Part 11 World & Agent Town.',
        assignedBy: 'Zephyr (Coder)',
        metrics: { tasksCompleted: 15, tasksFailed: 0, uptimeSec: 3600 },
        progress: 100,
      },
      {
        id: 'worker-device',
        name: 'Titan',
        role: 'DEVICE',
        description: 'Android & Hardware Bridge Controller. Dispatches Android intents, launches installed apps, and checks sensors.',
        status: 'READY',
        capabilities: ['Intent Dispatcher', 'Installed App Discovery', 'Safe Home Navigation', 'External Browser Bridge'],
        avatar: '📱',
        accentColor: '#10b981', // Emerald
        workstation: {
          zone: 'tech_dev',
          roomName: 'Tech & Automation Lab',
          deskLabel: 'Station 16 (Device Lab)',
          x: 82,
          y: 80,
        },
        lastActivity: 'Validated Android Bridge capability discovery.',
        assignedBy: 'Hermes (Manager)',
        metrics: { tasksCompleted: 16, tasksFailed: 0, uptimeSec: 3600 },
        progress: 100,
      },
      {
        id: 'worker-travel',
        name: 'Atlas',
        role: 'TRAVEL',
        description: 'Location, Geo, & Navigation Coordinator. Plans itineraries, route maps, and location-aware logistics.',
        status: 'READY',
        capabilities: ['Route Planning', 'Itinerary Mapping', 'Geo-lookup', 'Transit Logistics'],
        avatar: '🧭',
        accentColor: '#059669', // Emerald Accent
        workstation: {
          zone: 'tech_dev',
          roomName: 'Tech & Automation Lab',
          deskLabel: 'Station 17 (Logistics & Geo)',
          x: 92,
          y: 80,
        },
        lastActivity: 'Geo coordinates indexed for local device context.',
        assignedBy: 'Titan (Device)',
        metrics: { tasksCompleted: 7, tasksFailed: 0, uptimeSec: 3600 },
        progress: 100,
      },
    ];

    initialList.forEach((w) => this.workers.set(w.id, w));
  }

  /**
   * Connects to Part 10 BusinessWorkflowEngine to update visible workers when tasks run
   */
  private connectToBusinessWorkflowEngine(): void {
    businessWorkflowEngine.subscribe((workflow) => {
      if (!workflow) return;

      const activeStep = workflow.steps.find((s) => s.status === 'RUNNING' || s.status === 'WAITING_FOR_APPROVAL');
      if (activeStep) {
        let targetWorkerId = 'worker-manager';
        if (activeStep.workerType.includes('research')) targetWorkerId = 'worker-research';
        else if (activeStep.workerType.includes('business') || activeStep.stage === 'STRATEGY') targetWorkerId = 'worker-business';
        else if (activeStep.workerType.includes('content') || activeStep.stage === 'CONTENT_CREATION') targetWorkerId = 'worker-content';
        else if (activeStep.workerType.includes('media')) targetWorkerId = 'worker-media';
        else if (activeStep.workerType.includes('verification') || activeStep.stage === 'QUALITY_CHECK') targetWorkerId = 'worker-verification';
        else if (activeStep.workerType.includes('publishing')) targetWorkerId = 'worker-manager';

        this.updateWorkerStatus(
          targetWorkerId,
          activeStep.status === 'WAITING_FOR_APPROVAL' ? 'WAITING' : 'WORKING',
          activeStep.title,
          activeStep.requiresApproval ? 90 : 60
        );
      } else if (workflow.status === 'COMPLETED') {
        this.workers.forEach((w) => {
          if (w.status === 'WORKING' || w.status === 'WAITING') {
            w.status = 'READY';
            w.progress = 100;
          }
        });
      }
    });
  }

  public getAllWorkers(): WorkerEntity[] {
    return Array.from(this.workers.values());
  }

  public getWorker(id: string): WorkerEntity | undefined {
    return this.workers.get(id);
  }

  public getSelectedWorker(): WorkerEntity {
    return this.workers.get(this.selectedWorkerId) || this.getAllWorkers()[0];
  }

  public selectWorker(id: string): void {
    if (this.workers.has(id)) {
      this.selectedWorkerId = id;
      const worker = this.workers.get(id)!;
      worldEventBus.emit({
        type: 'WORKER_STATUS_CHANGED',
        title: `Selected ${worker.name} (${worker.role})`,
        details: `Focused on workstation: ${worker.workstation.deskLabel} in ${worker.workstation.roomName}.`,
        workerId: worker.id,
        workerName: worker.name,
        level: 'info',
      });
    }
  }

  public updateWorkerStatus(
    id: string,
    status: WorkerStatus,
    currentTask?: string,
    progress?: number
  ): WorkerEntity | null {
    const worker = this.workers.get(id);
    if (!worker) return null;

    const prevStatus = worker.status;
    worker.status = status;
    if (currentTask !== undefined) worker.currentTask = currentTask;
    if (progress !== undefined) worker.progress = Math.min(100, Math.max(0, progress));
    worker.lastActivity = currentTask || `Status updated to ${status}.`;

    worldEventBus.emit({
      type: 'WORKER_STATUS_CHANGED',
      title: `${worker.name} status: ${status}`,
      details: currentTask ? `Working on "${currentTask}"` : `Transitioned from ${prevStatus} to ${status}.`,
      workerId: worker.id,
      workerName: worker.name,
      level: status === 'FAILED' ? 'error' : status === 'WORKING' ? 'info' : 'success',
    });

    return worker;
  }

  public assignTask(id: string, taskTitle: string): boolean {
    const worker = this.workers.get(id);
    if (!worker) return false;

    worker.status = 'WORKING';
    worker.currentTask = taskTitle;
    worker.progress = 15;
    worker.lastActivity = `Assigned task: "${taskTitle}"`;

    worldEventBus.emit({
      type: 'TASK_ASSIGNED',
      title: `Task Assigned to ${worker.name}`,
      details: `Direct assignment: "${taskTitle}" to ${worker.role}.`,
      workerId: worker.id,
      workerName: worker.name,
      level: 'info',
    });

    return true;
  }

  public completeTask(id: string, resultMessage: string): boolean {
    const worker = this.workers.get(id);
    if (!worker) return false;

    worker.status = 'READY';
    worker.progress = 100;
    worker.metrics.tasksCompleted++;
    worker.result = resultMessage;
    worker.lastActivity = `Completed: "${worker.currentTask || 'Task'}": ${resultMessage}`;
    worker.currentTask = undefined;

    worldEventBus.emit({
      type: 'WORKER_COMPLETED',
      title: `${worker.name} completed task`,
      details: resultMessage,
      workerId: worker.id,
      workerName: worker.name,
      level: 'success',
    });

    // PART 12: Memory evaluation on worker output
    if (resultMessage && resultMessage.length > 20) {
      advancedMemoryManager.evaluateAndSave({
        title: `${worker.name}: ${worker.lastActivity?.slice(0, 40) || 'Task Result'}`,
        content: resultMessage,
        sourceType: 'WORKER',
        suggestedType: worker.role === 'RESEARCH' ? 'RESEARCH' : worker.role === 'BUSINESS' ? 'BUSINESS' : 'WORKER',
        tags: [worker.role.toLowerCase(), worker.name.toLowerCase()],
      });
    }

    return true;
  }

  /**
   * PART 12: Retrieves compact, specialized memory context for a given worker
   */
  public getWorkerContext(workerId: string, currentTask?: string): WorkerMemoryContext {
    const worker = this.workers.get(workerId);
    return advancedMemoryManager.buildWorkerContext({
      activeWorker: workerId,
      currentTask: currentTask || worker?.currentTask,
    });
  }
}

export const workerRegistry = WorkerRegistry.getInstance();
