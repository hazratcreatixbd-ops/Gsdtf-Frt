/**
 * PART 9 — Business Intelligence Worker
 * Connects with Part 7 Business Intelligence system:
 * Executes SWOT analysis, competitor snapshots, audience segmentation,
 * strategy building, decision support, and structured business reports.
 */

import { AgentWorker, AgentTask, WorkerExecutionResult } from '../AgentTypes';
import { AgentContextImpl } from '../AgentContext';

export class BusinessIntelligenceWorker implements AgentWorker {
  public readonly id = 'business-intelligence-worker';
  public readonly name = 'Business Intelligence Worker';
  public readonly description = 'Executes SWOT, competitor analysis, audience profiles, strategy roadmaps, and business reports.';
  public readonly capabilities = [
    'swot_analysis',
    'competitor_analysis',
    'audience_segmentation',
    'strategy_generation',
    'business_reporting',
    'decision_support',
  ];

  private status: 'idle' | 'busy' | 'paused' | 'error' = 'idle';

  public canHandle(task: AgentTask): boolean {
    const type = task.workerType.toLowerCase();
    return (
      type === 'business_intelligence' ||
      type === 'business_intelligence_worker' ||
      type === 'bi' ||
      type === 'swot' ||
      type === 'strategy' ||
      type === 'competitor'
    );
  }

  public getStatus(): 'idle' | 'busy' | 'paused' | 'error' {
    return this.status;
  }

  public async execute(task: AgentTask, context: AgentContextImpl): Promise<WorkerExecutionResult> {
    this.status = 'busy';
    context.log(`BusinessIntelligenceWorker executing: ${task.title}`, 'info', task.id);

    try {
      if (context.isCancelled()) {
        this.status = 'idle';
        return {
          success: false,
          workerId: this.id,
          taskId: task.id,
          status: 'failed',
          result: null,
          artifacts: [],
          warnings: ['Task cancelled.'],
          errors: ['Execution cancelled.'],
          nextActions: [],
        };
      }

      const input = task.input || {};
      const action = input.action || 'strategy';
      let resultData: any = null;
      const artifacts: any[] = [];

      if (action === 'swot' || task.title.toLowerCase().includes('swot')) {
        const swot = context.bi.generateSWOTAnalysis(input.businessName);
        resultData = swot;
        artifacts.push({
          id: `art_swot_${Date.now()}`,
          name: `SWOT Analysis: ${swot.businessName}`,
          type: 'swot',
          data: swot,
        });
      } else if (action === 'competitor' || task.title.toLowerCase().includes('competitor')) {
        const comp = context.bi.analyzeCompetitor(input.competitorName || 'Category Benchmark', input.website);
        resultData = comp;
        artifacts.push({
          id: `art_comp_${Date.now()}`,
          name: `Competitor Snapshot: ${comp.competitorName}`,
          type: 'competitor_snapshot',
          data: comp,
        });
      } else if (action === 'audience' || task.title.toLowerCase().includes('audience')) {
        const audience = context.bi.analyzeTargetAudience(input.targetMarket);
        resultData = audience;
        artifacts.push({
          id: `art_aud_${Date.now()}`,
          name: `Audience Analysis: ${audience.targetMarket}`,
          type: 'audience_analysis',
          data: audience,
        });
      } else {
        // Default: Build Strategy Roadmap
        const strategyGoal = input.goal || context.goal;
        const strategy = context.bi.buildBusinessStrategy({
          goal: strategyGoal,
          timelineWeeks: input.timelineWeeks || 4,
          autoCreateTasks: false,
        });
        resultData = strategy;
        artifacts.push({
          id: `art_strat_${Date.now()}`,
          name: `Strategy Roadmap: ${strategy.goal}`,
          type: 'business_strategy',
          data: strategy,
        });

        // Remember in Agent Memory
        context.memory.remember({
          category: 'approved_strategy',
          title: `Strategy: ${strategy.goal}`,
          content: strategy.strategicApproach,
          metadata: { milestonesCount: strategy.milestones.length },
        });
      }

      this.status = 'idle';
      context.log(`BusinessIntelligenceWorker completed task: ${task.title}`, 'info', task.id);

      return {
        success: true,
        workerId: this.id,
        taskId: task.id,
        status: 'completed',
        result: resultData,
        artifacts,
        warnings: [],
        errors: [],
        nextActions: ['Route outputs to Content Worker for content pillar and script drafting.'],
      };
    } catch (err: any) {
      this.status = 'error';
      context.log(`BusinessIntelligenceWorker error: ${err.message}`, 'error', task.id);
      return {
        success: false,
        workerId: this.id,
        taskId: task.id,
        status: 'failed',
        result: null,
        artifacts: [],
        warnings: [],
        errors: [err.message],
        nextActions: [],
      };
    }
  }
}
