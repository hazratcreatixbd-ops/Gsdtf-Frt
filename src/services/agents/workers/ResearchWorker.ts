/**
 * PART 9 — Research Worker
 * Specializes in public web scans, competitor signals, market research,
 * source verification, and structured factual synthesis.
 */

import { AgentWorker, AgentTask, WorkerExecutionResult } from '../AgentTypes';
import { AgentContextImpl } from '../AgentContext';

export class ResearchWorker implements AgentWorker {
  public readonly id = 'research-worker';
  public readonly name = 'Research Worker';
  public readonly description = 'Executes public market research, competitor scans, source collection, and factual summaries.';
  public readonly capabilities = [
    'public_market_research',
    'competitor_research',
    'audience_research',
    'web_search',
    'source_attribution',
  ];

  private status: 'idle' | 'busy' | 'paused' | 'error' = 'idle';

  public canHandle(task: AgentTask): boolean {
    const type = task.workerType.toLowerCase();
    return (
      type === 'research' ||
      type === 'research_worker' ||
      type === 'market_research' ||
      type === 'competitor_research'
    );
  }

  public getStatus(): 'idle' | 'busy' | 'paused' | 'error' {
    return this.status;
  }

  public async execute(task: AgentTask, context: AgentContextImpl): Promise<WorkerExecutionResult> {
    this.status = 'busy';
    context.log(`ResearchWorker started task: ${task.title}`, 'info', task.id);

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
          warnings: ['Task cancelled by user.'],
          errors: ['Execution aborted due to cancellation.'],
          nextActions: [],
        };
      }

      const input = task.input || {};
      const query = input.query || input.market || input.topic || context.goal;
      const geography = input.geography || 'Global';

      // Use Part 7 BusinessIntelligenceManager market scan
      const researchResult = context.bi.conductMarketResearch({
        market: query,
        geography,
      });

      // Save into Agent Memory for cross-worker sharing
      context.memory.remember({
        category: 'research_summary',
        title: `Research: ${query}`,
        content: researchResult.overview,
        metadata: {
          findingsCount: researchResult.findings.length,
          opportunitiesCount: researchResult.potentialOpportunities.length,
        },
      });

      context.log(`ResearchWorker completed market scan for "${query}"`, 'info', task.id);
      this.status = 'idle';

      return {
        success: true,
        workerId: this.id,
        taskId: task.id,
        status: 'completed',
        result: {
          query,
          geography,
          overview: researchResult.overview,
          customerNeeds: researchResult.customerNeeds,
          commonProblems: researchResult.commonProblems,
          potentialOpportunities: researchResult.potentialOpportunities,
          potentialRisks: researchResult.potentialRisks,
          verifiedFindings: researchResult.findings,
        },
        artifacts: [
          {
            id: `art_res_${Date.now()}`,
            name: `Market Research Report: ${query}`,
            type: 'research_report',
            data: researchResult,
          },
        ],
        warnings: [],
        errors: [],
        nextActions: ['Analyze competitors and audience segments with Business Intelligence Worker.'],
      };
    } catch (err: any) {
      this.status = 'error';
      context.log(`ResearchWorker error: ${err.message}`, 'error', task.id);
      return {
        success: false,
        workerId: this.id,
        taskId: task.id,
        status: 'failed',
        result: null,
        artifacts: [],
        warnings: [],
        errors: [err.message || 'Unknown research worker failure'],
        nextActions: ['Retry with refined query parameters.'],
      };
    }
  }
}
