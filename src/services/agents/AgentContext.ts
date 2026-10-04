/**
 * PART 9 — FRIDAY Agent Context
 * Runtime context supplied to specialized workers during task execution.
 * Provides read-only access to previous task outputs, shared agent memory,
 * logging, cancellation checking, and core service adapters.
 */

import { AgentContext as IAgentContext, ExecutionLogEntry } from './AgentTypes';
import { agentMemory, AgentMemory } from './AgentMemory';
import { toolManager, ToolManager } from '../ToolManager';
import { businessIntelligenceManager, BusinessIntelligenceManager } from '../BusinessIntelligenceManager';
import { contentMarketingManager, ContentMarketingManager } from '../ContentMarketingManager';
import { androidBridge, AndroidBridge } from '../AndroidBridge/AndroidBridge';

export class AgentContextImpl implements IAgentContext {
  public readonly workflowId: string;
  public readonly goal: string;
  private outputs: Map<string, any>;
  private cancelledFlag: () => boolean;
  private logSink: (entry: ExecutionLogEntry) => void;

  public readonly memory: AgentMemory;
  public readonly tools: ToolManager;
  public readonly bi: BusinessIntelligenceManager;
  public readonly content: ContentMarketingManager;
  public readonly android: AndroidBridge;

  constructor(params: {
    workflowId: string;
    goal: string;
    outputs: Map<string, any>;
    isCancelled: () => boolean;
    logSink: (entry: ExecutionLogEntry) => void;
  }) {
    this.workflowId = params.workflowId;
    this.goal = params.goal;
    this.outputs = params.outputs;
    this.cancelledFlag = params.isCancelled;
    this.logSink = params.logSink;

    this.memory = agentMemory;
    this.tools = toolManager;
    this.bi = businessIntelligenceManager;
    this.content = contentMarketingManager;
    this.android = androidBridge;
  }

  public getTaskOutput(taskId: string): any {
    return this.outputs.get(taskId);
  }

  public getAllOutputs(): Record<string, any> {
    const obj: Record<string, any> = {};
    this.outputs.forEach((val, key) => {
      obj[key] = val;
    });
    return obj;
  }

  public isCancelled(): boolean {
    return this.cancelledFlag();
  }

  public log(message: string, level: 'info' | 'warn' | 'error' = 'info', taskId?: string): void {
    this.logSink({
      timestamp: Date.now(),
      level,
      message,
      taskId,
    });
  }
}
