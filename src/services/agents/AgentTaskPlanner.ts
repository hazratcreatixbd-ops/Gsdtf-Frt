/**
 * PART 9 — FRIDAY Agent Task Planner
 * Goal Analyzer & Decomposition Engine:
 * Analyzes complex business goals, breaks them into structured AgentTasks,
 * constructs directed dependency graphs (sequential + parallel),
 * assigns specialized worker types, and injects human approval checkpoints.
 */

import { AgentTask, WorkflowPlan } from './AgentTypes';

export class AgentTaskPlanner {
  private static instance: AgentTaskPlanner;

  private constructor() {}

  public static getInstance(): AgentTaskPlanner {
    if (!AgentTaskPlanner.instance) {
      AgentTaskPlanner.instance = new AgentTaskPlanner();
    }
    return AgentTaskPlanner.instance;
  }

  /**
   * Decomposes a user goal into an ordered DAG of AgentTasks
   */
  public planGoal(goal: string, options?: { customTasks?: Partial<AgentTask>[] }): WorkflowPlan {
    const cleanGoal = goal.trim();
    const workflowId = `wf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    let tasks: AgentTask[] = [];

    if (options?.customTasks && options.customTasks.length > 0) {
      tasks = options.customTasks.map((t, idx) => ({
        id: t.id || `task_${idx + 1}_${Date.now()}`,
        title: t.title || `Task ${idx + 1}`,
        description: t.description || '',
        workerType: t.workerType || 'research',
        priority: t.priority || 'medium',
        status: 'pending',
        dependencies: t.dependencies || [],
        input: t.input || {},
        requiresApproval: t.requiresApproval || false,
        timeoutMs: t.timeoutMs || 30000,
        maxRetries: t.maxRetries ?? 2,
        retryCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }));
    } else {
      tasks = this.decomposeGoalHeuristically(cleanGoal, workflowId);
    }

    const plan: WorkflowPlan = {
      id: workflowId,
      goal: cleanGoal,
      status: 'draft',
      tasks,
      progress: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      executionLogs: [
        {
          timestamp: Date.now(),
          level: 'info',
          message: `Decomposed goal into ${tasks.length} orchestrated tasks across specialized workers.`,
        },
      ],
    };

    return plan;
  }

  private decomposeGoalHeuristically(goal: string, workflowId: string): AgentTask[] {
    const g = goal.toLowerCase();

    // Comprehensive end-to-end multi-worker workflow
    const isFullMarketingPipeline =
      (g.includes('research') && g.includes('content')) ||
      g.includes('complete marketing') ||
      g.includes('everything') ||
      g.includes('strategy') ||
      g.length > 50;

    if (isFullMarketingPipeline) {
      const t1Id = `${workflowId}_t1_research`;
      const t2Id = `${workflowId}_t2_bi`;
      const t3Id = `${workflowId}_t3_content`;
      const t4Id = `${workflowId}_t4_linkedin`;
      const t5Id = `${workflowId}_t5_social`;
      const t6Id = `${workflowId}_t6_publishing`;
      const t7Id = `${workflowId}_t7_verify`;

      return [
        {
          id: t1Id,
          title: 'Public Market & Competitor Scan',
          description: 'Gather public market signals, demand trends, and competitor positioning.',
          workerType: 'research-worker',
          priority: 'high',
          status: 'pending',
          dependencies: [],
          input: { query: goal },
          timeoutMs: 30000,
          maxRetries: 2,
          retryCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: t2Id,
          title: 'Strategic SWOT & Audience Profiling',
          description: 'Synthesize verified research into a SWOT analysis and strategic milestone roadmap.',
          workerType: 'business-intelligence-worker',
          priority: 'high',
          status: 'pending',
          dependencies: [t1Id], // Depends on Task 1
          input: { action: 'strategy', goal },
          timeoutMs: 30000,
          maxRetries: 2,
          retryCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: t3Id,
          title: 'High-Impact Content Ideas & Script Drafting',
          description: 'Generate 5 high-converting content ideas, hooks, and timed 60s video script.',
          workerType: 'content-worker',
          priority: 'medium',
          status: 'pending',
          dependencies: [t2Id], // Depends on Task 2
          input: { topic: goal },
          timeoutMs: 30000,
          maxRetries: 2,
          retryCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        // Parallel independent tasks: Task 4 and Task 5 both depend on Task 3
        {
          id: t4Id,
          title: 'LinkedIn B2B Post & Carousel Outline',
          description: 'Adapt core insights into an executive LinkedIn breakdown and 5-slide carousel outline.',
          workerType: 'linkedin-worker',
          priority: 'medium',
          status: 'pending',
          dependencies: [t3Id],
          input: { topic: goal },
          timeoutMs: 30000,
          maxRetries: 2,
          retryCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: t5Id,
          title: 'Multi-Platform Short-Form Social Adaptation',
          description: 'Format copy and specifications for YouTube Shorts, Instagram, and TikTok.',
          workerType: 'social-media-worker',
          priority: 'medium',
          status: 'pending',
          dependencies: [t3Id],
          input: { topic: goal },
          timeoutMs: 30000,
          maxRetries: 2,
          retryCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: t6Id,
          title: 'Production Publishing Package & Calendar Staging',
          description: 'Stage release dates in FRIDAY Calendar and prepare publish-ready handoff package.',
          workerType: 'publishing-worker',
          priority: 'medium',
          status: 'pending',
          dependencies: [t4Id, t5Id], // Depends on both parallel branches
          input: { title: goal },
          requiresApproval: true, // Human approval checkpoint
          approvalDetails: {
            action: 'Schedule & Stage Publishing Package',
            summary: 'Staging content in FRIDAY calendar. Direct publishing requires official account connection.',
          },
          timeoutMs: 30000,
          maxRetries: 1,
          retryCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: t7Id,
          title: 'Deliverable Quality & Safety Audit',
          description: 'Verify field completeness, check safety compliance, and assign a PASS/NEEDS_REVIEW grade.',
          workerType: 'verification-worker',
          priority: 'high',
          status: 'pending',
          dependencies: [t6Id], // Final audit
          input: {},
          timeoutMs: 20000,
          maxRetries: 1,
          retryCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];
    }

    // Specific sub-workflows
    if (g.includes('linkedin')) {
      return [
        {
          id: `${workflowId}_t1_li`,
          title: 'Draft LinkedIn Thought-Leadership Post',
          description: 'Structure B2B post with clean linebreaks and hook.',
          workerType: 'linkedin-worker',
          priority: 'high',
          status: 'pending',
          dependencies: [],
          input: { topic: goal },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: `${workflowId}_t2_verify`,
          title: 'Verify LinkedIn Post Compliance',
          description: 'Audit post for non-clickbait standards.',
          workerType: 'verification-worker',
          priority: 'medium',
          status: 'pending',
          dependencies: [`${workflowId}_t1_li`],
          input: {},
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];
    }

    // Fallback: 2-step focused task
    return [
      {
        id: `${workflowId}_t1_exec`,
        title: `Execute Strategy for: ${goal}`,
        description: 'Analyze parameters and draft execution plan.',
        workerType: 'business-intelligence-worker',
        priority: 'high',
        status: 'pending',
        dependencies: [],
        input: { goal },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: `${workflowId}_t2_verify`,
        title: 'Verify Strategy Deliverables',
        description: 'Audit output completeness and safety.',
        workerType: 'verification-worker',
        priority: 'medium',
        status: 'pending',
        dependencies: [`${workflowId}_t1_exec`],
        input: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];
  }
}

export const agentTaskPlanner = AgentTaskPlanner.getInstance();
