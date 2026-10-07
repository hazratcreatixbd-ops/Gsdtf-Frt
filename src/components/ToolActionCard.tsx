import React from 'react';
import { ToolCallItem } from '../types/friday';
import {
  Globe,
  Clock,
  ExternalLink,
  CheckCircle2,
  Loader2,
  X,
  Bookmark,
  ListTodo,
  Search,
  Play,
  Copy,
  Share2,
  Download,
  Mail,
  MapPin,
  Laptop,
  Workflow,
  Building2,
  Layout,
  Send,
  Video,
  FolderTree,
  ShieldCheck,
  ChevronRight,
  Eye,
  Smartphone,
  MessageSquare,
  Youtube,
} from 'lucide-react';

interface ToolActionCardProps {
  toolItem: ToolCallItem | null;
  onDismiss: () => void;
  onOpenModal?: (type: any, data: any) => void;
}

export const ToolActionCard: React.FC<ToolActionCardProps> = ({ toolItem, onDismiss, onOpenModal }) => {
  if (!toolItem) return null;

  const isWebsite = toolItem.name === 'openWebsite';
  const isClock = toolItem.name === 'getCurrentTime';
  const isMemory = toolItem.name === 'saveMemory' || toolItem.name === 'deleteMemory';
  const isTask =
    toolItem.name === 'createTask' ||
    toolItem.name === 'updateTaskStatus' ||
    toolItem.name === 'deleteTask';
  const isSearch = toolItem.name === 'searchWeb';
  const isPlay = toolItem.name === 'playMedia';
  const isClipboard = toolItem.name === 'copyToClipboard';
  const isDevice = toolItem.name === 'getDeviceStatus';
  const isShare = toolItem.name === 'shareContent';
  const isExport = toolItem.name === 'exportTasks';
  const isEmail = toolItem.name === 'composeEmail';
  const isMap = toolItem.name === 'openMap';
  const isInAppBrowser = toolItem.name === 'openInAppBrowser' || toolItem.name === 'closeInAppBrowser';
  const isExternalBrowser = toolItem.name === 'openExternalBrowser';
  const isAndroidTool = toolItem.name.startsWith('android_');
  const isAndroidWhatsApp = toolItem.name === 'android_open_whatsapp' || toolItem.name === 'android_prepare_message' || toolItem.name === 'android_send_message';
  const isAndroidYouTube = toolItem.name === 'android_open_youtube' || toolItem.name === 'android_search_youtube';

  // Part 5 Advanced Workflow Tools
  const isWorkflow = toolItem.name === 'startAdvancedWorkflow' || toolItem.name === 'updateWorkflowStatus';
  const isBusiness = toolItem.name === 'researchPublicBusiness';
  const isWebsitePlan = toolItem.name === 'generateWebsitePlan';
  const isOutreach = toolItem.name === 'prepareOutreachDraft';
  const isMedia = toolItem.name === 'prepareMediaMetadata';
  const isFiles = toolItem.name === 'planFileOrganization';
  const isWorkflowSchedule = toolItem.name === 'scheduleWorkflow';
  const isSecurity = toolItem.name === 'analyzeWebsiteSecurity';

  const getTitle = () => {
    if (isWebsite) return `Opening ${toolItem.args.name || 'Website'}`;
    if (isClock) return 'Real-Time Clock';
    if (toolItem.name === 'saveMemory') return `Remembered: #${toolItem.args.key || 'note'}`;
    if (toolItem.name === 'deleteMemory') return `Memory Forgotten`;
    if (toolItem.name === 'createTask') return `Reminder Set: "${toolItem.args.title || 'Task'}"`;
    if (toolItem.name === 'updateTaskStatus') return `Task ${toolItem.args.status || 'Updated'}`;
    if (toolItem.name === 'deleteTask') return `Task Cancelled`;
    if (isSearch) return `Search: "${toolItem.args.query}"`;
    if (isPlay) return `Play: "${toolItem.args.query}"`;
    if (isClipboard) return `Copied to Clipboard`;
    if (isDevice) return `Device Environment`;
    if (isShare) return `Content Shared`;
    if (isExport) return `Task Archive Downloaded`;
    if (isEmail) return `Email Draft: ${toolItem.args.recipient}`;
    if (isMap) return `Map Location: "${toolItem.args.location}"`;
    if (toolItem.name === 'openInAppBrowser') return `FRIDAY In-App Browser`;
    if (toolItem.name === 'closeInAppBrowser') return `In-App Browser Closed`;
    if (isExternalBrowser) return `Phone Browser: ${toolItem.args.name || toolItem.args.url || 'External'}`;

    if (toolItem.name === 'android_get_capabilities') return 'Android Capabilities Check';
    if (toolItem.name === 'android_open_app') return toolItem.args.appName ? `Open App: ${toolItem.args.appName}` : `Open App: ${toolItem.args.packageName}`;
    if (toolItem.name === 'android_open_url') return `Device URL: ${toolItem.args.url}`;
    if (toolItem.name === 'android_open_youtube') return toolItem.args.query ? `YouTube: "${toolItem.args.query}"` : 'YouTube App';
    if (toolItem.name === 'android_search_youtube') return `YouTube Search: "${toolItem.args.query}"`;
    if (toolItem.name === 'android_open_whatsapp') return `WhatsApp: ${toolItem.args.phone || 'App'}`;
    if (toolItem.name === 'android_prepare_message') return `Prepare WhatsApp: ${toolItem.args.phone}`;
    if (toolItem.name === 'android_send_message') return `Send WhatsApp: ${toolItem.args.phone}`;
    if (toolItem.name === 'android_get_permission_status') return 'Android Permissions Check';
    if (toolItem.name === 'android_confirm_action') return 'Action Confirmed';
    if (toolItem.name === 'android_cancel_action') return 'Action Cancelled';

    if (toolItem.name === 'startAdvancedWorkflow') return toolItem.args.title || 'Autonomous Workflow';
    if (toolItem.name === 'updateWorkflowStatus') return `Workflow: ${toolItem.args.status}`;
    if (isBusiness) return `Public Directory: ${toolItem.args.location}`;
    if (isWebsitePlan) return `Website Plan: ${toolItem.args.businessName || 'Business'}`;
    if (isOutreach) return `Outreach Draft: ${toolItem.args.recipient}`;
    if (isMedia) return `Publishing Package: "${toolItem.args.topic}"`;
    if (isFiles) return `Project Structure: ${toolItem.args.projectName}`;
    if (isWorkflowSchedule) return `Scheduled: ${toolItem.args.workflowName}`;
    if (isSecurity) return `Security Audit: ${toolItem.args.targetUrl}`;

    return toolItem.name;
  };

  const getCategory = () => {
    if (isMemory) return 'Memory Sync';
    if (isTask) return 'Task Manager';
    if (isSearch || isPlay) return 'Web Automation';
    if (isDevice) return 'Diagnostics';
    if (isClipboard || isExport) return 'File & Data';
    if (isEmail || isMap || isShare) return 'App Action';
    if (isInAppBrowser) return 'In-App Web';
    if (isExternalBrowser) return 'Phone Browser';
    if (isWorkflow || isWorkflowSchedule) return 'Workflow Engine';
    if (isBusiness) return 'Public Research';
    if (isWebsitePlan) return 'Website Architect';
    if (isOutreach) return 'Outreach Draft';
    if (isMedia) return 'Media SEO';
    if (isFiles) return 'Asset Pipeline';
    if (isSecurity) return 'Security Audit';
    if (isAndroidWhatsApp) return 'WhatsApp Bridge';
    if (isAndroidYouTube) return 'YouTube Bridge';
    if (isAndroidTool) return 'Android Device';
    return 'Voice Action';
  };

  const linkUrl = toolItem.args.url;

  return (
    <div className="w-full max-w-sm mx-auto px-4 z-30 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/40 bg-slate-900/90 backdrop-blur-xl p-4 shadow-[0_10px_30px_rgba(6,182,212,0.25)]">
        {/* Shimmer line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />

        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-300 shrink-0">
              {isWebsite ? (
                <Globe className="w-5 h-5" />
              ) : isClock ? (
                <Clock className="w-5 h-5" />
              ) : isMemory ? (
                <Bookmark className="w-5 h-5 text-rose-400" />
              ) : isTask ? (
                <ListTodo className="w-5 h-5 text-cyan-300" />
              ) : isSearch ? (
                <Search className="w-5 h-5 text-cyan-300" />
              ) : isPlay ? (
                <Play className="w-5 h-5 text-red-400" />
              ) : isClipboard ? (
                <Copy className="w-5 h-5 text-amber-300" />
              ) : isDevice ? (
                <Laptop className="w-5 h-5 text-cyan-300" />
              ) : isShare ? (
                <Share2 className="w-5 h-5 text-emerald-400" />
              ) : isExport ? (
                <Download className="w-5 h-5 text-cyan-300" />
              ) : isEmail ? (
                <Mail className="w-5 h-5 text-sky-400" />
              ) : isMap ? (
                <MapPin className="w-5 h-5 text-emerald-400" />
              ) : isInAppBrowser ? (
                <Globe className="w-5 h-5 text-cyan-300" />
              ) : isExternalBrowser ? (
                <ExternalLink className="w-5 h-5 text-sky-400" />
              ) : isWorkflow ? (
                <Workflow className="w-5 h-5 text-cyan-300" />
              ) : isBusiness ? (
                <Building2 className="w-5 h-5 text-amber-400" />
              ) : isWebsitePlan ? (
                <Layout className="w-5 h-5 text-amber-400" />
              ) : isOutreach ? (
                <Send className="w-5 h-5 text-sky-400" />
              ) : isMedia ? (
                <Video className="w-5 h-5 text-rose-400" />
              ) : isFiles ? (
                <FolderTree className="w-5 h-5 text-cyan-300" />
              ) : isSecurity ? (
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              ) : isAndroidWhatsApp ? (
                <MessageSquare className="w-5 h-5 text-emerald-400" />
              ) : isAndroidYouTube ? (
                <Youtube className="w-5 h-5 text-rose-400" />
              ) : isAndroidTool ? (
                <Smartphone className="w-5 h-5 text-cyan-300" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-xs font-mono font-semibold tracking-wider text-cyan-300 uppercase">
                  {getCategory()}
                </span>
                {toolItem.status === 'executing' ? (
                  <span className="flex items-center space-x-1 text-[10px] text-amber-400 font-mono">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Processing</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-1 text-[10px] text-emerald-400 font-mono">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Confirmed</span>
                  </span>
                )}
              </div>
              <h3 className="text-sm font-semibold text-slate-100 font-sans mt-0.5 break-words [overflow-wrap:anywhere]">
                {getTitle()}
              </h3>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content details */}
        {linkUrl && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 min-w-0">
            <span className="text-xs text-slate-400 font-mono break-all line-clamp-1 flex-1 min-w-0">
              {linkUrl}
            </span>
            <a
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-medium transition-colors"
            >
              <span>{isPlay ? 'Watch' : isMap ? 'View Map' : isEmail ? 'Send' : 'Open'}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {isClipboard && toolItem.args.text && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-800/80">
            <p className="text-xs text-slate-300 font-mono bg-slate-950/60 p-2 rounded-lg border border-slate-800/60 truncate">
              "{toolItem.args.text}"
            </p>
          </div>
        )}

        {toolItem.name === 'saveMemory' && toolItem.args.content && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-800/80">
            <p className="text-xs text-slate-300 font-sans">"{toolItem.args.content}"</p>
          </div>
        )}

        {toolItem.name === 'createTask' && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-300 font-mono">
            <span>{toolItem.args.date || 'Today'}</span>
            <span className="text-rose-400">{toolItem.args.time || 'Scheduled'}</span>
          </div>
        )}

        {/* Part 5: Workflow Step Tracker */}
        {toolItem.name === 'startAdvancedWorkflow' && toolItem.args.workflow && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-cyan-300">
              <span>Goal: {toolItem.args.workflow.goal}</span>
              <span className="text-amber-400 font-bold uppercase">{toolItem.args.workflow.status}</span>
            </div>
            <div className="flex items-center space-x-1 text-[11px] text-slate-300 font-sans">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>Step 1: {toolItem.args.workflow.steps?.[0]?.name}</span>
            </div>
          </div>
        )}

        {/* Part 5: Public Business Research */}
        {isBusiness && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-xs text-emerald-400 font-mono">
              ● {toolItem.args.businesses?.length || 5} Verified Public Locations
            </span>
            {onOpenModal && (
              <button
                onClick={() => onOpenModal('business', toolItem.args)}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-medium flex items-center space-x-1"
              >
                <span>Directory</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Part 5: Website Plan & Code Preview */}
        {isWebsitePlan && toolItem.args.plan && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-xs text-slate-300 font-sans truncate max-w-[170px]">
              Ready for Review (6 sections)
            </span>
            {onOpenModal && (
              <button
                onClick={() => onOpenModal('website', toolItem.args.plan)}
                className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-amber-500/20 transition-all"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview Site</span>
              </button>
            )}
          </div>
        )}

        {/* Part 5: Outreach Draft Review & Explicit Confirmation */}
        {isOutreach && toolItem.args.draft && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono">Held in Draft</span>
              <span className="text-amber-400 font-semibold text-[11px]">Requires Confirmation</span>
            </div>
            {onOpenModal && (
              <button
                onClick={() => onOpenModal('outreach', toolItem.args.draft)}
                className="w-full py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-medium flex items-center justify-center space-x-1.5"
              >
                <Send className="w-3 h-3" />
                <span>Review & Confirm Outreach</span>
              </button>
            )}
          </div>
        )}

        {/* Part 5: Video Media Metadata */}
        {isMedia && toolItem.args.metadata && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-xs text-slate-300 font-mono">SEO Titles & Tags</span>
            {onOpenModal && (
              <button
                onClick={() => onOpenModal('media', toolItem.args.metadata)}
                className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-medium flex items-center space-x-1"
              >
                <span>View Package</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Part 5: File & Project Architecture */}
        {isFiles && toolItem.args.plan && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-xs text-cyan-300 font-mono">
              {toolItem.args.plan.folders?.length || 10} Folder Tree
            </span>
            {onOpenModal && (
              <button
                onClick={() => onOpenModal('files', toolItem.args.plan)}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-medium flex items-center space-x-1"
              >
                <span>Inspect</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Part 5: Scheduled Workflow */}
        {isWorkflowSchedule && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-300 font-mono">
            <span className="text-cyan-300">● {toolItem.args.schedule}</span>
            <span className="text-slate-400">FRIDAY Task Engine</span>
          </div>
        )}

        {/* Part 5: Security Analysis */}
        {isSecurity && toolItem.args.report && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs">
                Grade {toolItem.args.report.grade}
              </span>
              <span className="text-xs text-slate-300">Score: {toolItem.args.report.score}/100</span>
            </div>
            {onOpenModal && (
              <button
                onClick={() => onOpenModal('security', toolItem.args.report)}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-medium flex items-center space-x-1"
              >
                <span>Report</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {isClock && toolItem.result?.formatted && (
          <div className="mt-3 pt-2 border-t border-slate-800/80">
            <p className="text-xs font-mono text-cyan-200">{toolItem.result.formatted}</p>
          </div>
        )}

        {isDevice && (
          <div className="mt-3 pt-2 border-t border-slate-800/80 text-xs text-slate-300 font-mono flex items-center justify-between">
            <span className="text-emerald-400">● Online Active</span>
            <span className="text-slate-400">Browser Sandbox</span>
          </div>
        )}
      </div>
    </div>
  );
};


