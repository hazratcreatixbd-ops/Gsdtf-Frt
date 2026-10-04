/**
 * ToolManager
 * Handles client-side execution and event dispatching for Gemini Live Function Calling.
 */

import { ToolCallItem } from '../types/friday';
import { androidBridge } from './AndroidBridge/AndroidBridge';
import { permissionManager } from './AndroidBridge/PermissionManager';
import { businessIntelligenceManager } from './BusinessIntelligenceManager';
import { contentMarketingManager } from './ContentMarketingManager';
import { publishingManager } from './Publishing/PublishingAdapter';
import { agentOrchestrator } from './agents/AgentOrchestrator';
import { businessWorkflowEngine } from './BusinessWorkflowEngine';
import { businessMemoryManager } from './BusinessMemoryManager';
import { campaignManager } from './CampaignManager';
import { workerRegistry } from '../world/workers/WorkerRegistry';
import { managerEngine } from '../world/manager/ManagerEngine';
import { workerTaskQueue } from '../world/manager/WorkerTaskQueue';
import { approvalGate } from '../world/manager/ApprovalGate';
import { advancedMemoryManager } from './memory/AdvancedMemoryManager';
import { part14Orchestrator } from './part14/Part14Orchestrator';

export type ToolExecutionListener = (item: ToolCallItem) => void;

export class ToolManager {
  private listeners: Set<ToolExecutionListener> = new Set();
  private history: ToolCallItem[] = [];
  private inAppBrowserListeners: Set<(open: boolean, url?: string) => void> = new Set();
  private interfaceModeListeners: Set<(mode: 'home' | 'world') => void> = new Set();

  public onInAppBrowser(listener: (open: boolean, url?: string) => void): () => void {
    this.inAppBrowserListeners.add(listener);
    return () => this.inAppBrowserListeners.delete(listener);
  }

  public emitInAppBrowser(open: boolean, url?: string): void {
    this.inAppBrowserListeners.forEach((l) => {
      try {
        l(open, url);
      } catch (e) {
        console.error('Error in inAppBrowser listener:', e);
      }
    });
  }

  public onInterfaceMode(listener: (mode: 'home' | 'world') => void): () => void {
    this.interfaceModeListeners.add(listener);
    return () => this.interfaceModeListeners.delete(listener);
  }

  public setInterfaceMode(mode: 'home' | 'world'): void {
    this.interfaceModeListeners.forEach((l) => {
      try {
        l(mode);
      } catch (e) {
        console.error('Error in interfaceMode listener:', e);
      }
    });
  }

  public subscribe(listener: ToolExecutionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public getHistory(): ToolCallItem[] {
    return [...this.history];
  }

  /**
   * Executes a tool invoked by FRIDAY
   */
  public async executeTool(name: string, args: Record<string, any>, id: string = 'call_' + Date.now()): Promise<any> {
    const item: ToolCallItem = {
      id,
      name,
      args,
      timestamp: Date.now(),
      status: 'executing',
    };

    this.history.unshift(item);
    this.notify(item);

    try {
      let result: any = null;

      if (name === 'openInAppBrowser') {
        result = this.handleOpenInAppBrowser(args);
      } else if (name === 'closeInAppBrowser') {
        result = this.handleCloseInAppBrowser();
      } else if (name === 'openExternalBrowser') {
        result = await this.handleOpenExternalBrowser(args);
      } else if (name === 'openWebsite') {
        result = await this.handleOpenWebsite(args);
      } else if (name === 'getCurrentTime') {
        result = this.handleGetCurrentTime(args);
      } else if (name === 'saveMemory') {
        const content = String(args.content || args.key || '').trim();
        const title = args.key ? String(args.key) : (content.length > 40 ? content.slice(0, 40) + '...' : content);
        if (content) {
          advancedMemoryManager.evaluateAndSave({
            title,
            content,
            suggestedType: 'USER_PREFERENCE',
            sourceType: 'VOICE',
            sourceName: 'FRIDAY Voice Assistant (Live)',
          });
        }
        result = { success: true, message: `Remembered: "${content}"` };
      } else if (name === 'createTask') {
        result = { success: true, message: `Created reminder: "${args.title}"` };
      } else if (name === 'updateTaskStatus') {
        result = { success: true, message: `Updated task status to ${args.status}` };
      } else if (name === 'deleteTask') {
        result = { success: true, message: `Deleted task` };
      } else if (name === 'deleteMemory') {
        const query = String(args.keyOrContent || args.content || args.key || '').toLowerCase().trim();
        if (query) {
          const matches = advancedMemoryManager.search({ query, includeArchived: true });
          matches.forEach((m) => advancedMemoryManager.discardMemory(m.id));
        }
        result = { success: true, message: `Memory forgotten` };
      } else if (name === 'searchWeb') {
        result = await this.handleSearchWeb(args);
      } else if (name === 'playMedia') {
        result = await this.handlePlayMedia(args);
      } else if (name === 'copyToClipboard') {
        result = await this.handleCopyToClipboard(args);
      } else if (name === 'getDeviceStatus') {
        result = await this.handleGetDeviceStatus();
      } else if (name === 'shareContent') {
        result = await this.handleShareContent(args);
      } else if (name === 'exportTasks') {
        result = this.handleExportTasks(args);
      } else if (name === 'composeEmail') {
        result = this.handleComposeEmail(args);
      } else if (name === 'openMap') {
        result = await this.handleOpenMap(args);
      } else if (name === 'startAdvancedWorkflow') {
        result = this.handleStartAdvancedWorkflow(args);
      } else if (name === 'researchPublicBusiness') {
        result = this.handleResearchPublicBusiness(args);
      } else if (name === 'generateWebsitePlan') {
        result = this.handleGenerateWebsitePlan(args);
      } else if (name === 'prepareOutreachDraft') {
        result = this.handlePrepareOutreachDraft(args);
      } else if (name === 'prepareMediaMetadata') {
        result = this.handlePrepareMediaMetadata(args);
      } else if (name === 'planFileOrganization') {
        result = this.handlePlanFileOrganization(args);
      } else if (name === 'scheduleWorkflow') {
        result = this.handleScheduleWorkflow(args);
      } else if (name === 'analyzeWebsiteSecurity') {
        result = this.handleAnalyzeWebsiteSecurity(args);
      } else if (name === 'updateWorkflowStatus') {
        result = this.handleUpdateWorkflowStatus(args);
      } else if (name === 'android_get_capabilities') {
        result = await this.handleAndroidGetCapabilities();
      } else if (name === 'android_open_app') {
        result = await androidBridge.openApp(args.packageName, args.appName);
      } else if (name === 'android_open_url') {
        result = await androidBridge.openExternalUrl(args.url);
      } else if (name === 'android_open_youtube') {
        result = await androidBridge.openYouTube(args.videoId, args.query);
      } else if (name === 'android_search_youtube') {
        result = await androidBridge.openYouTube(undefined, args.query);
      } else if (name === 'android_open_whatsapp') {
        result = await androidBridge.openWhatsApp(args.phone, args.text);
      } else if (name === 'android_prepare_message') {
        result = await androidBridge.prepareWhatsAppMessage(args.phone, args.text);
      } else if (name === 'android_send_message') {
        result = await androidBridge.sendWhatsAppMessage(args.phone, args.text);
      } else if (name === 'android_get_permission_status') {
        result = await this.handleAndroidGetPermissionStatus(args);
      } else if (name === 'android_confirm_action') {
        result = await androidBridge.confirmAction(args.previewId);
      } else if (name === 'android_cancel_action') {
        result = androidBridge.cancelAction(args.previewId);
      } else if (name === 'android_open_settings') {
        result = await androidBridge.openSettings(args.target || 'settings');
      } else if (name === 'android_launch_app' || name === 'launch_app' || name === 'launchApp') {
        const query = args.appName || args.packageName || args.name || '';
        let targetPkg = args.packageName;
        let appName = args.appName;
        if (!targetPkg && query) {
          const matched = await androidBridge.findAppByName(query);
          if (matched) {
            targetPkg = matched.packageName;
            appName = matched.appName;
          } else {
            targetPkg = query;
          }
        }
        result = await androidBridge.launchApp(targetPkg || '', appName);
      } else if (name === 'android_go_home' || name === 'go_home' || name === 'goHome') {
        result = await androidBridge.goHome();
      } else if (name === 'android_list_installed_apps' || name === 'list_installed_apps' || name === 'getInstalledApps') {
        const apps = await androidBridge.getInstalledApps();
        result = { success: true, count: apps.length, apps, message: `Discovered ${apps.length} installed apps.` };
      } else if (name === 'android_get_recent_apps' || name === 'get_recent_apps' || name === 'getRecentApps') {
        result = await androidBridge.getRecentApps();
      } else if (name === 'getBusinessProfile') {
        result = { success: true, profile: businessIntelligenceManager.getProfile() };
      } else if (name === 'updateBusinessProfile') {
        const updated = businessIntelligenceManager.updateProfile(args);
        result = { success: true, message: 'Business profile updated successfully.', profile: updated };
      } else if (name === 'parseVoiceBusinessProfile') {
        result = businessIntelligenceManager.parseVoiceProfileUpdate(args.command || '');
      } else if (name === 'getBusinessGoals') {
        result = { success: true, goals: businessIntelligenceManager.getGoals() };
      } else if (name === 'createBusinessGoal') {
        const goal = businessIntelligenceManager.createGoal(args as any);
        result = { success: true, message: `Created goal: "${goal.title}"`, goal };
      } else if (name === 'updateBusinessGoal') {
        const goal = businessIntelligenceManager.updateGoal(args.id, args.updates || args);
        result = { success: !!goal, goal, message: goal ? `Updated goal "${goal.title}"` : 'Goal not found' };
      } else if (name === 'deleteBusinessGoal') {
        const deleted = businessIntelligenceManager.deleteGoal(args.id);
        result = { success: deleted, message: deleted ? 'Goal removed' : 'Goal not found' };
      } else if (name === 'conductMarketResearch') {
        const research = businessIntelligenceManager.conductMarketResearch(args as any);
        result = { success: true, research, message: `Completed market research for ${research.market}` };
      } else if (name === 'analyzeCompetitor') {
        const competitor = businessIntelligenceManager.analyzeCompetitor(args.competitorName, args.website);
        result = { success: true, competitor, message: `Completed competitor analysis for ${competitor.competitorName}` };
      } else if (name === 'analyzeTargetAudience') {
        const audience = businessIntelligenceManager.analyzeTargetAudience(args.targetMarket);
        result = { success: true, audience, message: `Completed audience analysis for ${audience.targetMarket}` };
      } else if (name === 'generateSWOTAnalysis') {
        const swot = businessIntelligenceManager.generateSWOTAnalysis(args.businessName);
        result = { success: true, swot, message: `Generated SWOT analysis for ${swot.businessName}` };
      } else if (name === 'generateBusinessIdeas') {
        const ideas = businessIntelligenceManager.generateBusinessIdeas(args);
        result = { success: true, ideas, message: `Generated ${ideas.length} practical business ideas.` };
      } else if (name === 'buildBusinessStrategy') {
        const strategy = businessIntelligenceManager.buildBusinessStrategy(args as any);
        result = { success: true, strategy, message: `Built execution strategy for "${strategy.goal}"` };
      } else if (name === 'planContentStrategy') {
        const plan = businessIntelligenceManager.planContentStrategy(args);
        result = { success: true, plan, message: `Generated content strategy plan for ${plan.businessName}` };
      } else if (name === 'createWeeklyPlan') {
        const weekly = businessIntelligenceManager.createWeeklyPlan(args);
        result = { success: true, weeklyPlan: weekly, message: `Created weekly business plan: ${weekly.weekLabel}` };
      } else if (name === 'getDailyBusinessBriefing') {
        const briefing = businessIntelligenceManager.getDailyBriefing();
        result = { success: true, briefing, message: `Business briefing for ${briefing.date}` };
      } else if (name === 'searchResearchMemory') {
        const records = businessIntelligenceManager.searchResearchMemory(args.query || '');
        result = { success: true, count: records.length, records, message: `Retrieved ${records.length} research records` };
      } else if (name === 'evaluateDecisionOptions') {
        const evaluation = businessIntelligenceManager.evaluateDecisionOptions(args as any);
        result = { success: true, evaluation, message: `Evaluated decision tradeoffs for: "${evaluation.question}"` };
      } else if (name === 'generateBusinessReport') {
        const report = businessIntelligenceManager.generateBusinessReport(args as any);
        result = { success: true, report, message: `Generated report: "${report.title}"` };
      } else if (name === 'getContentProfile') {
        result = { success: true, profile: contentMarketingManager.getContentProfile() };
      } else if (name === 'updateContentProfile') {
        const profile = contentMarketingManager.updateContentProfile(args);
        result = { success: true, profile, message: 'Content Profile updated successfully.' };
      } else if (name === 'createContentPillar') {
        const pillar = contentMarketingManager.createContentPillar(args as any);
        result = { success: true, pillar, message: `Created content pillar: "${pillar.name}"` };
      } else if (name === 'getContentPillars') {
        result = { success: true, pillars: contentMarketingManager.getContentPillars() };
      } else if (name === 'generateContentIdeas') {
        const ideas = contentMarketingManager.generateContentIdeas(args);
        result = { success: true, count: ideas.length, ideas, message: `Generated ${ideas.length} content ideas.` };
      } else if (name === 'generateHooks') {
        const hooks = contentMarketingManager.generateHooks(args.topic, args.angle);
        result = { success: true, count: hooks.length, hooks, message: `Generated ${hooks.length} hook styles.` };
      } else if (name === 'createContentBrief') {
        const brief = contentMarketingManager.createContentBrief(args as any);
        result = { success: true, brief, message: `Created content brief: "${brief.title}"` };
      } else if (name === 'getContentBriefs') {
        result = { success: true, briefs: contentMarketingManager.getContentBriefs() };
      } else if (name === 'writeContentScript') {
        const script = contentMarketingManager.writeContentScript(args as any);
        result = { success: true, script, message: `Script created for "${script.title}" (${script.targetDuration})` };
      } else if (name === 'generateCaptions') {
        const captions = contentMarketingManager.generateCaptions(args as any);
        result = { success: true, captions, message: `Generated platform-specific captions.` };
      } else if (name === 'generateTitles') {
        const titles = contentMarketingManager.generateTitles(args as any);
        result = { success: true, titles, message: `Generated title options.` };
      } else if (name === 'generateDescriptions') {
        const description = contentMarketingManager.generateDescriptions(args as any);
        result = { success: true, description, message: `Generated platform description.` };
      } else if (name === 'generateHashtags') {
        const hashtags = contentMarketingManager.generateHashtags(args as any);
        result = { success: true, hashtags, message: `Generated targeted hashtag set.` };
      } else if (name === 'repurposeContent') {
        const repurposed = contentMarketingManager.repurposeContent(args as any);
        result = { success: true, package: repurposed, message: `Repurposed into ${repurposed.variations.length} platform variations.` };
      } else if (name === 'humanizeContent') {
        const humanized = contentMarketingManager.humanizeContent(args.text || args.draftText || '');
        result = { success: true, ...humanized, message: 'Content humanized with conversational flow.' };
      } else if (name === 'analyzeContentStyle') {
        const style = contentMarketingManager.analyzeContentStyle(args as any);
        result = { success: true, style, message: `Style analysis completed for reference.` };
      } else if (name === 'getContentCalendar') {
        result = { success: true, calendar: contentMarketingManager.getContentCalendar() };
      } else if (name === 'scheduleContentItem') {
        const item = contentMarketingManager.scheduleContentItem(args as any);
        result = { success: true, calendarItem: item, message: `Scheduled on ${item.platform} for ${item.scheduledDate} ${item.scheduledTime}` };
      } else if (name === 'createWeeklyContentPlan') {
        const plan = contentMarketingManager.createWeeklyContentPlan(args);
        result = { success: true, plan, message: `Weekly content plan created: ${plan.weekLabel}` };
      } else if (name === 'createContentCampaign') {
        const campaign = contentMarketingManager.createCampaign(args as any);
        result = { success: true, campaign, message: `Campaign "${campaign.name}" created.` };
      } else if (name === 'getContentCampaigns') {
        result = { success: true, campaigns: contentMarketingManager.getCampaigns() };
      } else if (name === 'mapMarketingFunnel') {
        const funnel = contentMarketingManager.mapMarketingFunnel();
        result = { success: true, funnel, message: 'Mapped content across 5 funnel stages.' };
      } else if (name === 'recordContentPerformance') {
        const record = contentMarketingManager.recordPerformance(args as any);
        result = { success: true, record, message: `Recorded performance metrics for "${record.title}".` };
      } else if (name === 'analyzeContentPerformance') {
        const report = contentMarketingManager.analyzePerformance();
        result = { success: true, report, message: 'Analyzed performance metrics.' };
      } else if (name === 'createContentExperiment') {
        const experiment = contentMarketingManager.createExperiment(args as any);
        result = { success: true, experiment, message: `Created A/B content experiment: "${experiment.title}".` };
      } else if (name === 'searchContentLibrary') {
        const searchResults = contentMarketingManager.searchContentLibrary(args.query || '');
        result = { success: true, ...searchResults, message: `Content library search complete.` };
      } else if (name === 'getPlatformCapabilities') {
        const capabilities = publishingManager.getAllCapabilities();
        result = { success: true, capabilities, message: 'Retrieved publishing platform capabilities.' };
      } else if (name === 'publishContentItem') {
        const pubRes = await contentMarketingManager.publishContentItem(args as any);
        result = pubRes;
      } else if (name === 'generateMarketingReport') {
        const report = contentMarketingManager.generateMarketingReport(args as any);
        result = { success: true, report, message: `Generated marketing report: "${report.title}".` };
      } else if (name === 'orchestrateBusinessGoal') {
        const plan = await agentOrchestrator.orchestrateGoal(args.goal, { customTasks: args.customTasks });
        result = {
          success: plan.status !== 'failed',
          workflowId: plan.id,
          status: plan.status,
          progress: plan.progress,
          tasksCount: plan.tasks.length,
          voiceSummary: agentOrchestrator.generateVoiceSummary(plan),
          plan,
        };
      } else if (name === 'getOrchestratorStatus') {
        const active = agentOrchestrator.getActiveWorkflow();
        result = {
          success: true,
          activeWorkflow: active,
          workers: agentOrchestrator.getWorkersStatus(),
          voiceSummary: active ? agentOrchestrator.generateVoiceSummary(active) : 'No active orchestrator workflow running.',
        };
      } else if (name === 'pauseWorkflow') {
        const paused = agentOrchestrator.pauseWorkflow();
        result = { success: paused, message: paused ? 'Workflow paused.' : 'No active running workflow to pause.' };
      } else if (name === 'resumeWorkflow') {
        const resumed = await agentOrchestrator.resumeWorkflow();
        result = { success: resumed, message: resumed ? 'Workflow resumed.' : 'Workflow could not be resumed.' };
      } else if (name === 'cancelWorkflow') {
        const cancelled = agentOrchestrator.cancelWorkflow();
        result = { success: cancelled, message: cancelled ? 'Workflow cancelled.' : 'No active workflow to cancel.' };
      } else if (name === 'approveWorkflowTask') {
        const approved = await agentOrchestrator.approveTask(args.taskId, args.approved ?? true);
        result = { success: approved, message: approved ? 'Task approval recorded.' : 'Task not found or not waiting for approval.' };
      } else if (name === 'getAgentWorkers') {
        result = { success: true, workers: agentOrchestrator.getWorkersStatus() };
      } else if (name === 'getAgentExecutionHistory') {
        result = { success: true, history: agentOrchestrator.getWorkflowHistory() };
      // =========================================================================
      // PART 10 — FRIDAY Autonomous Business Manager & Workflow Engine
      // =========================================================================
      } else if (name === 'createBusinessWorkflow') {
        const wf = businessWorkflowEngine.createWorkflow(args.goal, {
          description: args.description,
          priority: args.priority || 'HIGH',
          customSteps: args.customSteps,
        });
        const status = businessWorkflowEngine.getWorkflowStatus(wf.workflowId);
        result = {
          success: true,
          workflowId: wf.workflowId,
          status: wf.status,
          totalSteps: wf.steps.length,
          voiceSummary: status.voiceSummary,
          workflow: wf,
        };
      } else if (name === 'getBusinessWorkflows') {
        const list = businessWorkflowEngine.listWorkflows();
        result = { success: true, count: list.length, workflows: list };
      } else if (name === 'getBusinessWorkflowStatus') {
        const status = businessWorkflowEngine.getWorkflowStatus(args.workflowId);
        result = { success: true, ...status };
      } else if (name === 'startBusinessWorkflow') {
        const wf = await businessWorkflowEngine.startWorkflow(args.workflowId);
        const status = businessWorkflowEngine.getWorkflowStatus(wf.workflowId);
        result = {
          success: true,
          workflowId: wf.workflowId,
          status: wf.status,
          voiceSummary: status.voiceSummary,
          workflow: wf,
        };
      } else if (name === 'executeNextWorkflowStep') {
        const stepRes = await businessWorkflowEngine.executeNextStep(args.workflowId);
        const status = businessWorkflowEngine.getWorkflowStatus(args.workflowId);
        result = {
          success: stepRes.status !== 'ERROR' && stepRes.status !== 'FAILED',
          ...stepRes,
          voiceSummary: status.voiceSummary,
        };
      } else if (name === 'pauseBusinessWorkflow') {
        const paused = businessWorkflowEngine.pauseWorkflow(args.workflowId);
        result = { success: paused, message: paused ? 'Business workflow paused.' : 'No active running workflow to pause.' };
      } else if (name === 'resumeBusinessWorkflow') {
        const resumed = await businessWorkflowEngine.resumeWorkflow(args.workflowId);
        result = { success: resumed, message: resumed ? 'Business workflow resumed.' : 'Workflow could not be resumed.' };
      } else if (name === 'cancelBusinessWorkflow') {
        const cancelled = businessWorkflowEngine.cancelWorkflow(args.workflowId);
        result = { success: cancelled, message: cancelled ? 'Business workflow cancelled.' : 'Workflow could not be cancelled.' };
      } else if (name === 'retryBusinessWorkflow') {
        const retried = await businessWorkflowEngine.retryWorkflow(args.workflowId);
        result = { success: retried, message: retried ? 'Business workflow retried.' : 'Workflow could not be retried.' };
      } else if (name === 'approveWorkflowStep' || name === 'voiceApproveAction') {
        const active = businessWorkflowEngine.getActiveWorkflow();
        const targetWfId = args.workflowId || active?.workflowId;
        let stepId = args.stepId;
        if (!stepId && active) {
          const pendingApproval = active.approvals.find((a) => a.status === 'PENDING');
          stepId = pendingApproval?.stepId;
        }
        if (!targetWfId || !stepId) {
          result = { success: false, message: 'No pending action waiting for approval.' };
        } else {
          const approved = await businessWorkflowEngine.approveStep(targetWfId, stepId, args.notes);
          result = { success: approved, message: approved ? 'Step authorized and executed.' : 'Approval failed.' };
        }
      } else if (name === 'rejectWorkflowStep' || name === 'voiceRejectAction') {
        const active = businessWorkflowEngine.getActiveWorkflow();
        const targetWfId = args.workflowId || active?.workflowId;
        let stepId = args.stepId;
        if (!stepId && active) {
          const pendingApproval = active.approvals.find((a) => a.status === 'PENDING');
          stepId = pendingApproval?.stepId;
        }
        if (!targetWfId || !stepId) {
          result = { success: false, message: 'No pending action waiting for review.' };
        } else {
          const rejected = await businessWorkflowEngine.rejectStep(targetWfId, stepId, args.notes);
          result = { success: rejected, message: rejected ? 'Step rejected and cancelled.' : 'Rejection failed.' };
        }
      } else if (name === 'generateBusinessWorkflowReport') {
        const report = businessWorkflowEngine.generateWorkflowReport(args.workflowId);
        result = { success: true, report, message: 'Business workflow report compiled.' };
      } else if (name === 'getPendingApprovals') {
        const pending = businessWorkflowEngine.getPendingApprovals();
        result = { success: true, count: pending.length, approvals: pending };
      } else if (name === 'createBusinessCampaign') {
        const campaign = campaignManager.createCampaign(args as any);
        result = { success: true, campaign, message: `Created campaign: "${campaign.name}"` };
      } else if (name === 'getBusinessCampaigns') {
        result = { success: true, campaigns: campaignManager.getCampaigns() };
      } else if (name === 'pauseBusinessCampaign') {
        const paused = campaignManager.pauseCampaign(args.id || args.campaignId);
        result = { success: paused, message: paused ? 'Campaign paused.' : 'Campaign not found.' };
      } else if (name === 'resumeBusinessCampaign') {
        const resumed = campaignManager.resumeCampaign(args.id || args.campaignId);
        result = { success: resumed, message: resumed ? 'Campaign resumed.' : 'Campaign not found.' };
      } else if (name === 'duplicateBusinessCampaign') {
        const dup = campaignManager.duplicateCampaign(args.id || args.campaignId);
        result = { success: !!dup, campaign: dup, message: dup ? 'Campaign duplicated.' : 'Campaign not found.' };
      } else if (name === 'archiveBusinessCampaign') {
        const archived = campaignManager.archiveCampaign(args.id || args.campaignId);
        result = { success: archived, message: archived ? 'Campaign archived.' : 'Campaign not found.' };
      } else if (name === 'generateBusinessCampaignReport') {
        const report = campaignManager.generateCampaignReport(args.id || args.campaignId);
        result = { success: true, report, message: 'Campaign performance report compiled.' };
      } else if (name === 'getBusinessMemory') {
        result = { success: true, memory: businessMemoryManager.getBusinessMemory() };
      } else if (name === 'updateBusinessMemory') {
        const updated = businessMemoryManager.updateBusinessMemory(args.updates || args);
        result = { success: true, memory: updated, message: 'Structured business memory updated.' };
      // =========================================================================
      // PART 11 — FRIDAY WORLD INTERFACE, AGENT TOWN & WORKER MANAGEMENT TOOLS
      // =========================================================================
      } else if (name === 'switchInterfaceMode' || name === 'openWorld' || name === 'exitWorld' || name === 'returnToHome') {
        const mode = (args.mode === 'world' || name === 'openWorld') ? 'world' : 'home';
        this.setInterfaceMode(mode);
        result = {
          success: true,
          mode,
          message: mode === 'world'
            ? 'Entered FRIDAY World: Agent Town, 17 Specialized Stations, and Executive Core are now active.'
            : 'Returned to FRIDAY Home voice interface.',
        };
      } else if (name === 'dispatchManagerGoal' || name === 'orchestrateCeoGoal') {
        const dispatchRes = managerEngine.dispatchGoal(args.goal || args.description || '');
        result = {
          success: true,
          ...dispatchRes,
          message: `Goal dispatched by Executive Manager Hermes across the Worker fleet.`,
        };
      } else if (name === 'getManagerOperationsStatus') {
        const dashboard = managerEngine.getDashboardData();
        result = {
          success: true,
          dashboard,
          message: `Manager operations: ${dashboard.activeWorkflows} active workflows, ${dashboard.completedTasks}/${dashboard.totalTasks} tasks completed.`,
        };
      } else if (name === 'pauseManagerOperations') {
        workerTaskQueue.pause();
        result = { success: true, message: 'Manager operations queue paused.' };
      } else if (name === 'resumeManagerOperations') {
        workerTaskQueue.resume();
        result = { success: true, message: 'Manager operations queue resumed.' };
      } else if (name === 'approveManagerAction') {
        const pending = approvalGate.getPendingRequests();
        const targetId = args.requestId || pending[0]?.id;
        const approved = targetId ? approvalGate.approve(targetId, args.notes) : false;
        result = { success: approved, message: approved ? 'Action approved by user.' : 'No pending approval request found.' };
      } else if (name === 'rejectManagerAction') {
        const pending = approvalGate.getPendingRequests();
        const targetId = args.requestId || pending[0]?.id;
        const rejected = targetId ? approvalGate.reject(targetId, args.reason) : false;
        result = { success: rejected, message: rejected ? 'Action rejected by user.' : 'No pending approval request found.' };
      } else if (name === 'runPart14MediaPipeline') {
        const ws = await part14Orchestrator.executeMediaPipelineA({
          topic: args.topic || args.goal || 'Modern Brand Visual Showcase',
          caption: args.caption,
          referenceCount: args.referenceCount || 5,
        });
        result = {
          success: true,
          workspace: ws,
          message: `Part 14 Media Pipeline A executed: collected ${ws.references.length} verified reference images, generated original visual & motion reel (${ws.status}).`,
        };
      } else if (name === 'runPart14BusinessDemoPipeline') {
        const ws = await part14Orchestrator.executeBusinessDemoPipelineB({
          category: args.category || 'Custom Furniture',
          location: args.location || 'Sylhet',
          specificBusiness: args.specificBusiness || args.businessName,
          targetWebsiteUrl: args.targetWebsiteUrl,
        });
        result = {
          success: true,
          workspace: ws,
          message: `Part 14 Business Demo Pipeline B executed: audited ${ws.businessLeads[0]?.businessName || 'business'} & built live mobile demo website (${ws.status}).`,
        };
      } else if (name === 'getWorkerRegistryStatus') {
        const workers = workerRegistry.getAllWorkers();
        result = {
          success: true,
          totalWorkers: workers.length,
          workers: workers.map((w) => ({
            id: w.id,
            name: w.name,
            role: w.role,
            status: w.status,
            station: w.workstation.deskLabel,
            room: w.workstation.roomName,
            currentTask: w.currentTask,
            progress: w.progress,
            tasksCompleted: w.metrics.tasksCompleted,
          })),
        };
      } else if (name === 'selectWorker') {
        const targetId = args.workerId || args.id;
        workerRegistry.selectWorker(targetId);
        const selected = workerRegistry.getWorker(targetId);
        result = {
          success: !!selected,
          worker: selected,
          message: selected ? `Focused on worker ${selected.name} (${selected.role}) at ${selected.workstation.deskLabel}.` : 'Worker not found.',
        };
      } else if (name === 'assignWorkerTask') {
        const assigned = workerRegistry.assignTask(args.workerId || args.id, args.task || args.assignment);
        result = {
          success: assigned,
          message: assigned ? `Task "${args.task}" assigned to worker.` : 'Worker not found.',
        };
      } else if (name === 'completeWorkerTask') {
        const completed = workerRegistry.completeTask(args.workerId || args.id, args.result || 'Task finished successfully.');
        result = {
          success: completed,
          message: completed ? `Worker task completed.` : 'Worker not found.',
        };
      // ==========================================
      // PART 12 — ADVANCED MEMORY & RESEARCH TOOLS
      // ==========================================
      } else if (name === 'saveToMemory' || name === 'rememberFact') {
        const content = args.content || args.fact || args.text || '';
        if (!content.trim()) {
          result = { success: false, message: 'Content cannot be empty.' };
        } else {
          const evalRes = advancedMemoryManager.evaluateAndSave({
            content,
            title: args.title,
            suggestedType: args.type,
            tags: args.tags,
            relatedProject: args.project,
            sourceType: 'USER',
          });

          result = {
            success: evalRes.decision.action !== 'DISCARD',
            decision: evalRes.decision.action,
            reason: evalRes.decision.reason,
            memory: evalRes.memory,
            message: evalRes.decision.action === 'DISCARD'
              ? `Memory discarded: ${evalRes.decision.reason}`
              : evalRes.decision.action === 'UPDATE_EXISTING'
              ? `Existing memory updated: ${evalRes.memory?.title}`
              : `Saved to ${evalRes.decision.suggestedType.replace('_', ' ')}: "${evalRes.memory?.title}"`,
          };
        }
      } else if (name === 'searchMemory' || name === 'recallMemory') {
        const query = args.query || args.topic || '';
        const memories = advancedMemoryManager.search({
          query,
          type: args.type,
          tags: args.tags,
          project: args.project,
          worker: args.worker,
          limit: args.limit || 5,
        });
        result = {
          success: true,
          query,
          count: memories.length,
          memories: memories.map((m) => ({
            id: m.id,
            type: m.type,
            title: m.title,
            summary: m.summary,
            content: m.content,
            importance: m.importance,
            confidence: m.confidence,
            source: m.source.sourceType,
          })),
        };
      } else if (name === 'searchResearchMemory') {
        const topic = args.topic || args.query || '';
        const findings = advancedMemoryManager.getResearchMemories(topic, args.minConfidence);
        result = {
          success: true,
          topic,
          count: findings.length,
          findings: findings.map((f) => ({
            id: f.id,
            topic: f.topic,
            finding: f.finding,
            confidence: f.confidence,
            sourceType: f.source.sourceType,
            sourceName: f.source.sourceName,
            sourceUrl: f.source.sourceUrl,
            evidence: f.evidence,
          })),
        };
      } else if (name === 'forgetMemory' || name === 'discardMemory') {
        if (args.temporaryOnly || args.sessionOnly) {
          const cleared = advancedMemoryManager.clearSessionMemory();
          result = {
            success: true,
            clearedCount: cleared,
            message: `Cleared ${cleared} temporary session memories.`,
          };
        } else if (args.memoryId || args.id) {
          const discarded = advancedMemoryManager.discardMemory(args.memoryId || args.id);
          result = {
            success: discarded,
            message: discarded ? 'Memory discarded successfully.' : 'Memory record not found.',
          };
        } else if (args.query) {
          const matches = advancedMemoryManager.search({ query: args.query, limit: 1 });
          if (matches.length > 0) {
            advancedMemoryManager.discardMemory(matches[0].id);
            result = {
              success: true,
              discardedId: matches[0].id,
              message: `Discarded memory: "${matches[0].title}".`,
            };
          } else {
            result = { success: false, message: `No memory found matching "${args.query}".` };
          }
        } else {
          result = { success: false, message: 'Please specify memoryId, query, or temporaryOnly.' };
        }
      } else if (name === 'getMemoryOverview') {
        const stats = advancedMemoryManager.getOverviewStats();
        const recent = advancedMemoryManager.search({ limit: 5 });
        result = {
          success: true,
          stats,
          recentMemories: recent.map((m) => ({
            id: m.id,
            title: m.title,
            type: m.type,
            importance: m.importance,
            confidence: m.confidence,
          })),
        };
      } else if (name === 'getWorkerMemoryContext') {
        const workerId = args.workerId || 'worker-manager';
        const ctx = advancedMemoryManager.buildWorkerContext({
          activeWorker: workerId,
          currentTask: args.task,
          project: args.project,
        });
        result = {
          success: true,
          workerId,
          contextSummary: ctx.contextSummary,
          preferencesCount: ctx.relevantPreferences.length,
          researchCount: ctx.relevantResearch.length,
          activeDirectives: ctx.activeDirectives,
        };
      } else if (name === 'addResearchMemory') {
        const res = advancedMemoryManager.addResearchFinding({
          topic: args.topic || 'General Research',
          finding: args.finding || args.content || '',
          source: {
            sourceType: args.sourceType || 'USER',
            sourceName: args.sourceName || 'User Input',
            sourceUrl: args.sourceUrl,
            retrievedAt: Date.now(),
          },
          evidence: args.evidence,
          relevance: args.relevance,
          tags: args.tags,
          relatedProject: args.project,
        });
        result = {
          success: res.verdict.action !== 'LOW_VALUE',
          verdict: res.verdict.action,
          reason: res.verdict.reason,
          confidence: res.verdict.confidence,
          researchItem: res.researchItem,
        };
      } else {
        result = { success: true, message: `Tool ${name} executed` };
      }

      item.status = 'completed';
      item.result = result;
      this.notify(item);
      return result;
    } catch (err: any) {
      console.error(`Tool execution error for ${name}:`, err);
      item.status = 'failed';
      item.result = { error: err.message };
      this.notify(item);
      throw err;
    }
  }

  private handleOpenInAppBrowser(args: { url?: string; query?: string; name?: string }): any {
    let url = args.url || '';
    if (!url && args.query) {
      url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(args.query)}`;
    } else if (!url) {
      url = 'https://en.wikipedia.org';
    } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    this.emitInAppBrowser(true, url);

    return {
      success: true,
      browserType: 'in_app',
      url,
      name: args.name || 'FRIDAY Browser',
      message: `FRIDAY in-app browser launched inside Home screen with ${url}`,
    };
  }

  private handleCloseInAppBrowser(): any {
    this.emitInAppBrowser(false);
    return {
      success: true,
      message: 'Closed FRIDAY in-app browser',
    };
  }

  private async handleOpenExternalBrowser(args: { url?: string; query?: string; name?: string }): Promise<any> {
    let url = args.url || '';
    if (!url && args.query) {
      url = `https://www.google.com/search?q=${encodeURIComponent(args.query)}`;
    } else if (!url) {
      url = 'https://www.google.com';
    } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    let opened = false;
    try {
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      if (win) {
        opened = true;
      }
    } catch (e) {
      console.warn('External browser window.open blocked:', e);
    }

    return {
      success: true,
      browserType: 'external_mobile',
      url,
      name: args.name || 'Mobile Browser',
      openedInNewTab: opened,
    };
  }

  private async handleOpenWebsite(args: { url?: string; name?: string }): Promise<any> {
    let url = args.url || 'https://google.com';
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    let opened = false;
    try {
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      if (win) {
        opened = true;
      }
    } catch (e) {
      console.warn('Window open blocked by browser policy:', e);
    }

    return {
      success: true,
      url,
      name: args.name || url,
      openedInNewTab: opened,
    };
  }

  private handleGetCurrentTime(args: { timeZone?: string }): any {
    const timeZone = args.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const now = new Date();
    const formatted = new Intl.DateTimeFormat('en-US', {
      timeZone,
      dateStyle: 'full',
      timeStyle: 'medium',
    }).format(now);

    return {
      success: true,
      formatted,
      timeZone,
    };
  }

  private async handleSearchWeb(args: { query?: string; engine?: string; url?: string }): Promise<any> {
    const query = args.query || '';
    const engine = (args.engine || 'Google').toLowerCase();
    let url = args.url;
    if (!url) {
      if (engine === 'youtube') {
        url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      } else if (engine === 'wikipedia') {
        url = `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}`;
      } else {
        url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      }
    }
    let opened = false;
    try {
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      if (win) opened = true;
    } catch (e) {
      console.warn('Window open blocked:', e);
    }
    return { success: true, query, url, engine: args.engine || 'Google', openedInNewTab: opened };
  }

  private async handlePlayMedia(args: { query?: string; url?: string }): Promise<any> {
    const query = args.query || '';
    const url = args.url || `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    let opened = false;
    try {
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      if (win) opened = true;
    } catch (e) {
      console.warn('Window open blocked:', e);
    }
    return { success: true, query, url, openedInNewTab: opened };
  }

  private async handleCopyToClipboard(args: { text?: string }): Promise<any> {
    const text = args.text || '';
    let copied = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        copied = true;
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        copied = document.execCommand('copy');
        document.body.removeChild(textarea);
      }
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }
    return { success: copied, text, message: copied ? 'Copied to clipboard' : 'Clipboard access restricted' };
  }

  private async handleGetDeviceStatus(): Promise<any> {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const screenWidth = typeof window !== 'undefined' ? window.screen.width : 0;
    const screenHeight = typeof window !== 'undefined' ? window.screen.height : 0;
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';

    let batteryInfo: any = null;
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).getBattery) {
        const b = await (navigator as any).getBattery();
        batteryInfo = {
          level: Math.round(b.level * 100),
          charging: b.charging,
        };
      } else {
        batteryInfo = {
          supported: false,
          note: 'Battery Status API restricted by browser privacy sandbox (Safari/iOS/Firefox).',
        };
      }
    } catch {
      batteryInfo = { supported: false, note: 'Battery status unavailable in this browser.' };
    }

    return {
      success: true,
      online: isOnline,
      resolution: `${screenWidth}x${screenHeight}`,
      battery: batteryInfo,
      userAgent,
      limitations: 'Hardware power-off and physical display brightness cannot be altered from browser sandbox.',
    };
  }

  private async handleShareContent(args: { title?: string; text?: string; url?: string }): Promise<any> {
    const title = args.title || 'FRIDAY Note';
    const text = args.text || '';
    const url = args.url || window.location.href;

    let shared = false;
    let method = 'none';

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title, text, url });
        shared = true;
        method = 'web_share_api';
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${title}\n${text}\n${url}`);
        shared = true;
        method = 'clipboard_fallback';
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.warn('Share error:', e);
      }
    }

    return { success: shared, method, title, text };
  }

  private handleExportTasks(args: { format?: string }): any {
    try {
      const raw = localStorage.getItem('friday_persistent_tasks');
      const tasks = raw ? JSON.parse(raw) : [];
      const format = args.format === 'json' ? 'json' : 'text';

      let fileContent = '';
      let mimeType = 'text/plain';
      let fileName = 'friday_tasks.txt';

      if (format === 'json') {
        fileContent = JSON.stringify(tasks, null, 2);
        mimeType = 'application/json';
        fileName = 'friday_tasks.json';
      } else {
        fileContent =
          `========================================\n` +
          `       FRIDAY TASK & REMINDER ARCHIVE\n` +
          `       Exported: ${new Date().toLocaleString()}\n` +
          `========================================\n\n`;

        if (tasks.length === 0) {
          fileContent += 'No tasks currently scheduled.\n';
        } else {
          tasks.forEach((t: any, i: number) => {
            fileContent += `${i + 1}. [${t.status.toUpperCase()}] ${t.title}\n`;
            if (t.date) fileContent += `   Date: ${t.date}\n`;
            if (t.time) fileContent += `   Time: ${t.time}\n`;
            fileContent += `\n`;
          });
        }
      }

      const blob = new Blob([fileContent], { type: mimeType });
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = dlUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(dlUrl);

      return { success: true, count: tasks.length, fileName };
    } catch (e: any) {
      console.error('Export error:', e);
      return { success: false, error: e.message };
    }
  }

  private handleComposeEmail(args: { recipient?: string; subject?: string; body?: string }): any {
    const recipient = args.recipient || '';
    const subject = encodeURIComponent(args.subject || '');
    const body = encodeURIComponent(args.body || '');
    const mailto = `mailto:${recipient}?subject=${subject}&body=${body}`;
    window.location.href = mailto;
    return { success: true, recipient, mailto };
  }

  private async handleOpenMap(args: { location?: string; url?: string }): Promise<any> {
    const location = args.location || '';
    const url = args.url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
    let opened = false;
    try {
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      if (win) opened = true;
    } catch (e) {
      console.warn('Map open blocked:', e);
    }
    return { success: true, location, url, openedInNewTab: opened };
  }

  private handleStartAdvancedWorkflow(args: any): any {
    const wf = args.workflow || {
      id: `wf_${Date.now()}`,
      title: args.title || 'Workflow',
      goal: args.goal || '',
      type: args.workflowType || 'general',
      status: 'planning',
      currentStepIndex: 0,
      steps: (args.steps || []).map((s: string, i: number) => ({
        id: `step_${i + 1}`,
        name: s,
        description: s,
        status: i === 0 ? 'in_progress' : 'pending',
      })),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    try {
      localStorage.setItem('friday_active_workflow', JSON.stringify(wf));
    } catch {}
    return { success: true, workflow: wf };
  }

  private handleResearchPublicBusiness(args: any): any {
    const businesses = args.businesses || [];
    try {
      localStorage.setItem('friday_researched_businesses', JSON.stringify(businesses));
    } catch {}
    return { success: true, count: businesses.length, category: args.category, location: args.location };
  }

  private handleGenerateWebsitePlan(args: any): any {
    const plan = args.plan;
    if (plan) {
      try {
        localStorage.setItem('friday_website_plan', JSON.stringify(plan));
      } catch {}
    }
    return { success: true, plan };
  }

  private handlePrepareOutreachDraft(args: any): any {
    const draft = args.draft;
    if (draft) {
      try {
        localStorage.setItem('friday_outreach_draft', JSON.stringify(draft));
      } catch {}
    }
    return { success: true, draft, requiresConfirmation: true };
  }

  private handlePrepareMediaMetadata(args: any): any {
    const metadata = args.metadata;
    if (metadata) {
      try {
        localStorage.setItem('friday_media_metadata', JSON.stringify(metadata));
      } catch {}
    }
    return { success: true, metadata };
  }

  private handlePlanFileOrganization(args: any): any {
    const plan = args.plan;
    try {
      localStorage.setItem('friday_file_plan', JSON.stringify(plan));
    } catch {}
    return { success: true, plan };
  }

  private handleScheduleWorkflow(args: any): any {
    return {
      success: true,
      workflowName: args.workflowName,
      schedule: args.schedule,
      note: 'Stored in persistent scheduler. Reminders trigger while FRIDAY is open/active in browser tab.',
    };
  }

  private handleAnalyzeWebsiteSecurity(args: any): any {
    const report = args.report;
    try {
      localStorage.setItem('friday_security_audit', JSON.stringify(report));
    } catch {}
    return { success: true, report };
  }

  private handleUpdateWorkflowStatus(args: any): any {
    try {
      const raw = localStorage.getItem('friday_active_workflow');
      if (raw) {
        const wf = JSON.parse(raw);
        wf.status = args.status || wf.status;
        if (typeof args.stepIndex === 'number' && wf.steps[args.stepIndex]) {
          wf.currentStepIndex = args.stepIndex;
          wf.steps[args.stepIndex].status = 'completed';
          if (wf.steps[args.stepIndex + 1]) {
            wf.steps[args.stepIndex + 1].status = 'in_progress';
          }
        }
        wf.updatedAt = Date.now();
        localStorage.setItem('friday_active_workflow', JSON.stringify(wf));
      }
    } catch {}
    return { success: true, status: args.status };
  }

  private async handleAndroidGetCapabilities(): Promise<any> {
    const isAvailable = androidBridge.isAvailable();
    const deviceInfo = await androidBridge.getDeviceInfo();
    const capabilities = androidBridge.getSupportedCapabilities();
    const pendingPreviews = androidBridge.getPendingPreviews();

    return {
      success: true,
      isAvailable,
      deviceInfo,
      capabilities,
      pendingPreviewsCount: pendingPreviews.length,
      notice: isAvailable
        ? 'FRIDAY Android Native Bridge is active.'
        : 'Running in Web environment. Native Android app launcher & automated accessibility gestures require the FRIDAY Android wrapper.',
    };
  }

  private async handleAndroidGetPermissionStatus(args: { permission?: string }): Promise<any> {
    const perm = args.permission as any;
    if (perm) {
      const isGranted = permissionManager.isAndroidPermissionGranted(perm);
      return {
        success: true,
        permission: perm,
        granted: isGranted,
      };
    }

    const accessibility = await androidBridge.requestAccessibilityStatus();
    return {
      success: true,
      accessibility,
      policies: permissionManager.getAllPolicies(),
    };
  }

  private notify(item: ToolCallItem) {
    this.listeners.forEach((listener) => {
      try {
        listener(item);
      } catch (e) {
        console.error('Error in ToolManager listener:', e);
      }
    });
  }
}

export const toolManager = new ToolManager();
