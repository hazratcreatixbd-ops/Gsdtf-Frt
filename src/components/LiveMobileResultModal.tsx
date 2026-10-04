import React, { useState, useEffect } from 'react';
import { part14Orchestrator } from '../services/part14/Part14Orchestrator';
import {
  Part14ProjectWorkspace,
  WEBSITE_PIPELINE_STAGES,
  LiveMobileOperationStatus,
} from '../services/part14/Part14Types';
import {
  X,
  Play,
  ExternalLink,
  Sparkles,
  Check,
  Ban,
  Share2,
  Download,
  Eye,
  Edit3,
  Save,
  MapPin,
  Globe,
  ShieldAlert,
  FolderOpen,
  Smartphone,
} from 'lucide-react';

interface LiveMobileResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenInAppBrowser?: (url: string) => void;
}

type ResultTab =
  | 'OPERATIONS'
  | 'REFERENCES'
  | 'MEDIA'
  | 'BUSINESS'
  | 'PREVIEW'
  | 'PUBLISH_OUTREACH'
  | 'SAVED_ASSETS'
  | 'ERRORS_BLOCKED';

export const LiveMobileResultModal: React.FC<LiveMobileResultModalProps> = ({
  isOpen,
  onClose,
  onOpenInAppBrowser,
}) => {
  const [workspaces, setWorkspaces] = useState<Part14ProjectWorkspace[]>(
    part14Orchestrator.getAllWorkspaces()
  );
  const [activeWs, setActiveWs] = useState<Part14ProjectWorkspace | null>(
    part14Orchestrator.getActiveWorkspace()
  );
  const [activeTab, setActiveTab] = useState<ResultTab>('OPERATIONS');
  const [isRunningA, setIsRunningA] = useState(false);
  const [isRunningB, setIsRunningB] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Inputs for Workflow A
  const [mediaTopic, setMediaTopic] = useState('Modern Minimalist Teak Furniture Showcase');
  const [fbCaption, setFbCaption] = useState('');

  // Inputs for Workflow B
  const [bizCategory, setBizCategory] = useState('Custom Furniture & Woodwork');
  const [bizLocation, setBizLocation] = useState('Sylhet');
  const [bizName, setBizName] = useState('Sylhet Heritage Woodworks');
  const [bizUrl, setBizUrl] = useState('');

  // Demo HTML Editor state
  const [editingDemoId, setEditingDemoId] = useState<string | null>(null);
  const [editedHtml, setEditedHtml] = useState<string>('');
  const [selectedAssetUrl, setSelectedAssetUrl] = useState<string | null>(null);

  useEffect(() => {
    const unsub = part14Orchestrator.subscribe((all, active) => {
      setWorkspaces([...all]);
      setActiveWs(active ? { ...active } : null);
    });
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const notifyUser = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleShare = async (title: string, text: string, url: string) => {
    const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text, url: fullUrl });
        notifyUser(`Shared "${title}" via native share sheet.`);
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(`${title} — ${fullUrl}`);
      notifyUser(`Copied share link to clipboard: ${fullUrl}`);
    }
  };

  const handleOpenInPhone = (url: string) => {
    if (onOpenInAppBrowser) {
      onOpenInAppBrowser(url);
      onClose();
    } else {
      setSelectedAssetUrl(url);
    }
  };

  const handleRunWorkflowA = async () => {
    if (!mediaTopic.trim() || isRunningA) return;
    setIsRunningA(true);
    try {
      await part14Orchestrator.executeMediaPipelineA({
        topic: mediaTopic.trim(),
        caption: fbCaption.trim() || undefined,
        referenceCount: 5,
      });
      setActiveTab('OPERATIONS');
    } finally {
      setIsRunningA(false);
    }
  };

  const handleRunWorkflowB = async () => {
    if (!bizCategory.trim() || !bizLocation.trim() || isRunningB) return;
    setIsRunningB(true);
    try {
      await part14Orchestrator.executeBusinessDemoPipelineB({
        category: bizCategory.trim(),
        location: bizLocation.trim(),
        specificBusiness: bizName.trim() || undefined,
        targetWebsiteUrl: bizUrl.trim() || undefined,
      });
      setActiveTab('BUSINESS');
    } finally {
      setIsRunningB(false);
    }
  };

  const handleApprove = () => {
    if (!activeWs) return;
    part14Orchestrator.approvePendingProjectAction(activeWs.projectId);
    notifyUser('Approved pending action. Verifying real external result...');
  };

  const handleReject = () => {
    if (!activeWs) return;
    part14Orchestrator.rejectPendingProjectAction(activeWs.projectId);
    notifyUser('Action rejected by user.');
  };

  const handleRequestAndroidPermission = async () => {
    if (!activeWs) return;
    const status = await part14Orchestrator.requestAndroidStoragePermission(activeWs.projectId);
    notifyUser(status.statusMessage);
  };

  const statusColor = (st: LiveMobileOperationStatus | string) => {
    switch (st) {
      case 'COMPLETED':
      case 'PUBLISHED':
        return 'text-emerald-300';
      case 'RUNNING':
      case 'PUBLISHING':
      case 'VERIFYING':
        return 'text-cyan-300';
      case 'WAITING_APPROVAL':
      case 'WAITING':
      case 'QUEUED':
        return 'text-amber-300';
      case 'BLOCKED':
      case 'FAILED':
      case 'PUBLISH_FAILED':
      case 'SERVICE_UNAVAILABLE':
      case 'ACTION_BLOCKED':
        return 'text-rose-300';
      default:
        return 'text-slate-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-2 sm:p-4 select-none">
      <div className="relative w-full max-w-5xl h-[94dvh] flex flex-col rounded-2xl bg-[#04091a] border border-cyan-500/35 shadow-[0_0_50px_rgba(6,182,212,0.2)] overflow-hidden text-slate-100 font-sans">
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/25 bg-slate-950/90 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold tracking-wider uppercase font-mono text-white">
                PART 14 — LIVE MOBILE RESULT &amp; ACTIVITY CENTER
              </h2>
              <p className="text-[10px] text-slate-400 font-mono">
                REAL ACTION → REAL RESULT → REAL MOBILE DISPLAY (Never Fakes Completion or External APIs)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl border border-rose-500/40 bg-rose-950/50 hover:bg-rose-900/70 text-rose-200 transition-colors cursor-pointer"
            title="Close Live Mobile Result Center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {actionFeedback && (
          <div className="px-4 py-1.5 bg-cyan-950/90 border-b border-cyan-500/40 text-xs font-mono text-cyan-200 flex items-center justify-between">
            <span>{actionFeedback}</span>
            <button onClick={() => setActionFeedback(null)} className="text-cyan-400 text-[10px]">
              DISMISS
            </button>
          </div>
        )}

        {/* Pipeline Launchers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 p-3 bg-slate-950/60 border-b border-slate-800/80 shrink-0">
          {/* Launcher A */}
          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-cyan-500/25 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="font-bold text-cyan-300">
                MEDIA PIPELINE A: REFS → IMAGE → VIDEO → VERIFY → FACEBOOK
              </span>
              <span className="text-slate-400">Nova · Echo · Vesper · Astra</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-1.5">
              <input
                type="text"
                value={mediaTopic}
                onChange={(e) => setMediaTopic(e.target.value)}
                placeholder="Topic (e.g. Modern Teak Furniture Showcase)"
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-cyan-400"
              />
              <button
                onClick={handleRunWorkflowA}
                disabled={isRunningA}
                className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs flex items-center justify-center space-x-1 transition-all cursor-pointer disabled:opacity-50 shrink-0"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{isRunningA ? 'Running...' : 'Run Media Pipeline'}</span>
              </button>
            </div>
          </div>

          {/* Launcher B */}
          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-emerald-500/25 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="font-bold text-emerald-300">
                WEBSITE FLOW B: SEARCH → AUDIT → DEMO SITE → PREVIEW → OUTREACH
              </span>
              <span className="text-slate-400">Nova · Orion · Zephyr · Astra</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-1.5">
              <input
                type="text"
                value={bizName}
                onChange={(e) => setBizName(e.target.value)}
                placeholder="Business Name"
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-emerald-400"
              />
              <input
                type="text"
                value={bizLocation}
                onChange={(e) => setBizLocation(e.target.value)}
                placeholder="City (e.g. Sylhet)"
                className="w-28 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-emerald-400"
              />
              <button
                onClick={handleRunWorkflowB}
                disabled={isRunningB}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs flex items-center justify-center space-x-1 transition-all cursor-pointer disabled:opacity-50 shrink-0"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{isRunningB ? 'Running...' : 'Run Website Flow'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950 border-b border-slate-800 overflow-x-auto scrollbar-none gap-2 shrink-0">
          <div className="flex items-center space-x-1">
            {(
              [
                { id: 'OPERATIONS', label: `1. Result Center (${activeWs?.operations.length || 0})` },
                { id: 'REFERENCES', label: `2. References (${activeWs?.references.length || 0})` },
                { id: 'MEDIA', label: `3. Image & Video (${(activeWs?.generatedImages.length || 0) + (activeWs?.generatedVideos.length || 0)})` },
                { id: 'BUSINESS', label: `4. Location & Biz (${activeWs?.businessLeads.length || 0})` },
                { id: 'PREVIEW', label: `5. DEMO / SAMPLE Site (${activeWs?.demoWebsites.length || 0})` },
                { id: 'PUBLISH_OUTREACH', label: '6. Publish & Outreach' },
                { id: 'SAVED_ASSETS', label: `7. Android / Disk Files (${activeWs?.savedAssets.length || 0})` },
                { id: 'ERRORS_BLOCKED', label: `8. Service Status (${(activeWs?.blockedIntegrations.length || 0) + (activeWs?.errors.length || 0)})` },
              ] as { id: ResultTab; label: string }[]
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === t.id
                    ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/50'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-900/50 border border-transparent'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {workspaces.length > 1 && (
            <select
              value={activeWs?.projectId || ''}
              onChange={(e) => part14Orchestrator.setActiveProject(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] font-mono text-slate-200"
            >
              {workspaces.map((w) => (
                <option key={w.projectId} value={w.projectId}>
                  {w.name} ({w.status})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Inline Asset Viewer Drawer when user clicks VIEW inside modal */}
        {selectedAssetUrl && (
          <div className="p-3 bg-slate-900 border-b border-cyan-500/40 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-cyan-300">DIRECT MOBILE ASSET VIEWER: {selectedAssetUrl}</span>
              <button
                onClick={() => setSelectedAssetUrl(null)}
                className="px-2 py-0.5 rounded bg-rose-950 text-rose-200 border border-rose-500/40 cursor-pointer"
              >
                Close Viewer
              </button>
            </div>
            <div className="w-full h-56 bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
              <iframe src={selectedAssetUrl} title="Mobile Asset Viewer" className="w-full h-full border-0" />
            </div>
          </div>
        )}

        {/* Main Content Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
          {!activeWs ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <Sparkles className="w-10 h-10 text-cyan-400 mb-3 opacity-80" />
              <h3 className="text-sm font-mono font-bold text-slate-200">
                LIVE MOBILE RESULT CENTER READY
              </h3>
              <p className="text-xs text-slate-400 max-w-md mt-1">
                Launch Media Pipeline A or Website Opportunity Flow B above to inspect live worker execution, real files saved on disk, verified references, and DEMO / SAMPLE mobile previews.
              </p>
            </div>
          ) : (
            <>
              {/* Top Live Status Banner */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                    <span className="text-white font-bold">{activeWs.name}</span>
                    <span>·</span>
                    <span className="text-slate-400">Folder: /data/part14_projects/{activeWs.projectId}</span>
                    <span>·</span>
                    <span className={`font-bold ${statusColor(activeWs.status)}`}>
                      State: {activeWs.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 font-mono">
                    Active Stage: <strong className="text-cyan-300">{activeWs.currentStage}</strong>
                  </p>
                </div>

                {activeWs.status === 'WAITING_APPROVAL' && (
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={handleApprove}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs flex items-center space-x-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve Action</span>
                    </button>
                    <button
                      onClick={handleReject}
                      className="px-3 py-1.5 rounded-lg bg-rose-950 border border-rose-500/50 hover:bg-rose-900 text-rose-200 font-mono font-bold text-xs flex items-center space-x-1 cursor-pointer"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 11-Stage Website Research -> Demo Complete Flow Tracker (when Business Pipeline B is active) */}
              {activeWs.workflowType === 'BUSINESS_DEMO_B' && (
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="text-[11px] font-mono text-emerald-300 font-bold">
                    WEBSITE RESEARCH → DEMO COMPLETE FLOW (11 REAL STAGES):
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                    {WEBSITE_PIPELINE_STAGES.map((stg, idx) => {
                      const done = activeWs.completedWebsiteStages?.includes(stg);
                      const isCurrent = activeWs.websiteFlowStage === stg;
                      return (
                        <React.Fragment key={stg}>
                          <span
                            className={
                              isCurrent
                                ? 'text-cyan-300 font-bold underline'
                                : done
                                ? 'text-emerald-400'
                                : 'text-slate-500'
                            }
                          >
                            {stg}
                          </span>
                          {idx < WEBSITE_PIPELINE_STAGES.length - 1 && (
                            <span className="text-slate-600">→</span>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 1: LIVE MOBILE RESULT CENTER (Worker, Task, Status, Progress, Input, Output, Files, Errors, Timestamps, Verification) */}
              {activeTab === 'OPERATIONS' && (
                <div className="space-y-3">
                  <div className="text-xs font-mono text-slate-300">
                    Real-Time Worker Operations Log (States: QUEUED · RUNNING · WAITING · WAITING_APPROVAL · COMPLETED · FAILED · BLOCKED):
                  </div>
                  {activeWs.operations.map((op) => (
                    <div
                      key={op.id}
                      className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2 text-xs font-mono"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-white font-bold">{op.workerName}</span>
                          <span className="text-slate-400"> · {op.taskTitle}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${statusColor(op.status)}`}>{op.status}</span>
                          <span>·</span>
                          <span className="text-slate-400">{op.progress}%</span>
                          <span>·</span>
                          <span className="text-slate-500">
                            {new Date(op.updatedAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>

                      <div className="text-slate-300">
                        <span className="text-slate-500">Input: </span>
                        {op.input}
                      </div>

                      {op.output && (
                        <div className="text-cyan-200">
                          <span className="text-slate-500">Output: </span>
                          {op.output}
                        </div>
                      )}

                      {op.filesCreated.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="text-slate-500">Files Created:</span>
                          {op.filesCreated.map((f, i) => (
                            <button
                              key={i}
                              onClick={() => handleOpenInPhone(f)}
                              className="text-emerald-400 hover:underline cursor-pointer"
                            >
                              {f} (Open on Phone)
                            </button>
                          ))}
                        </div>
                      )}

                      {op.errors.length > 0 && (
                        <div className="text-rose-300">
                          <span className="text-rose-400 font-bold">Error / Block Reason: </span>
                          {op.errors.join(' | ')}
                        </div>
                      )}

                      {op.verificationResult && (
                        <div className="pt-1 border-t border-slate-800/80 text-emerald-300">
                          Verification ({op.verificationResult.score}%): {op.verificationResult.summary}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 2: REFERENCES (VIEW, OPEN, SAVE, SHARE) */}
              {activeTab === 'REFERENCES' && (
                <div className="space-y-3">
                  <div className="text-xs font-mono text-slate-300">
                    Collected Reference Images ({activeWs.references.length}) · Project Folder: /data/part14_projects/{activeWs.projectId}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {activeWs.references.map((ref) => (
                      <div
                        key={ref.id}
                        className="rounded-xl bg-slate-900/70 border border-slate-800 overflow-hidden flex flex-col justify-between"
                      >
                        <div className="h-36 bg-slate-950 flex items-center justify-center overflow-hidden">
                          <img
                            src={ref.imageUrl}
                            alt={ref.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="p-3 space-y-2">
                          <div className="text-xs font-bold text-slate-100 line-clamp-1">{ref.title}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {ref.sourceName} · {ref.license}
                          </div>
                          <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                            <button
                              onClick={() => setSelectedAssetUrl(ref.imageUrl)}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 cursor-pointer"
                            >
                              VIEW
                            </button>
                            <a
                              href={ref.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                            >
                              OPEN
                            </a>
                            <a
                              href={ref.imageUrl}
                              download
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300"
                            >
                              SAVE
                            </a>
                            <button
                              onClick={() => handleShare(ref.title, ref.sourceName, ref.sourceUrl)}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 cursor-pointer"
                            >
                              SHARE
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: GENERATED IMAGE & VIDEO (VIEW, OPEN, SAVE, SHARE + Exact Unavailable Provider Message) */}
              {activeTab === 'MEDIA' && (
                <div className="space-y-4">
                  {activeWs.generatedImages.map((img) => (
                    <div
                      key={img.id}
                      className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-mono font-bold text-cyan-300">
                            GENERATED IMAGE: {img.title}
                          </h4>
                          <p className="text-[11px] text-slate-400 font-mono">
                            Project Folder: {img.projectFolder} · File: {img.savedPath} · Format: {img.mimeType}
                          </p>
                          {img.metadata && (
                            <p className="text-[11px] text-slate-400 font-mono">
                              Metadata: {img.metadata.dimensions} · {img.metadata.sizeBytes} bytes · {img.metadata.referencesUsed} refs used · Verified: {img.verificationScore}%
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                          <button
                            onClick={() => setSelectedAssetUrl(img.savedPath)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 cursor-pointer"
                          >
                            VIEW
                          </button>
                          <button
                            onClick={() => handleOpenInPhone(img.savedPath)}
                            className="px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 cursor-pointer"
                          >
                            OPEN
                          </button>
                          <a
                            href={img.savedPath}
                            download
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300"
                          >
                            SAVE
                          </a>
                          <button
                            onClick={() => handleShare(img.title, img.prompt, img.savedPath)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 cursor-pointer"
                          >
                            SHARE
                          </button>
                        </div>
                      </div>
                      <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 max-h-72 flex items-center justify-center">
                        <img src={img.imageUrl} alt={img.title} className="max-h-72 object-contain" />
                      </div>
                      {img.verificationSummary && (
                        <p className="text-[11px] font-mono text-emerald-300">
                          Verification Result: {img.verificationSummary}
                        </p>
                      )}
                    </div>
                  ))}

                  {activeWs.generatedVideos.map((vid) => (
                    <div
                      key={vid.id}
                      className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-mono font-bold text-amber-300">
                            VIDEO GENERATION STATUS: {vid.status} (Provider: {vid.modelUsed})
                          </h4>
                          <p className="text-[11px] text-slate-400 font-mono">
                            Project Folder: {vid.projectFolder} · Verification: {vid.verified ? 'Verified' : 'Unverified'}
                          </p>
                        </div>
                        {vid.motionPreviewUrl && (
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                            <button
                              onClick={() => setSelectedAssetUrl(vid.motionPreviewUrl!)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 cursor-pointer"
                            >
                              VIEW
                            </button>
                            <button
                              onClick={() => handleOpenInPhone(vid.motionPreviewUrl!)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-500/20 border border-indigo-400/40 text-indigo-200 cursor-pointer"
                            >
                              OPEN
                            </button>
                            <a
                              href={vid.motionPreviewUrl}
                              download
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300"
                            >
                              SAVE
                            </a>
                            <button
                              onClick={() => handleShare('Motion Storyboard', vid.prompt, vid.motionPreviewUrl!)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 cursor-pointer"
                            >
                              SHARE
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-xs font-mono text-rose-200">
                        {vid.providerMessage || 'Video generation is unavailable because the required provider/API is not connected.'}
                      </div>

                      {vid.motionPreviewUrl && (
                        <div className="w-full h-60 rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                          <iframe
                            src={vid.motionPreviewUrl}
                            title="Motion Storyboard Preview"
                            className="w-full h-full border-0"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 4: WEBSITE OPPORTUNITY & LOCATION-BASED RESEARCH (OPEN MAP, OPEN WEBSITE, VIEW RESEARCH) */}
              {activeTab === 'BUSINESS' && (
                <div className="space-y-3">
                  {activeWs.businessLeads.length === 0 ? (
                    <p className="text-xs text-slate-400 font-mono">
                      No public business research in this workspace. Run Website Flow B above.
                    </p>
                  ) : (
                    activeWs.businessLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-bold text-white">{lead.businessName}</h4>
                            <p className="text-xs text-slate-400 font-mono">
                              Category: {lead.category} · Location: {lead.location} · Source: {lead.sourceProvider} · Status: {lead.researchStatus}
                            </p>
                          </div>
                          <div className="text-xs font-mono text-emerald-300">
                            Website Status: {lead.websiteStatus} · Quality Score: {lead.audit.qualityScore}/100
                          </div>
                        </div>

                        <div className="text-xs font-mono text-slate-300 space-y-1">
                          <div>Map / Location Info: {lead.address}</div>
                          <div>Public Website: {lead.existingWebsite || 'None found in public records'}</div>
                          <div>
                            Public Contact: {lead.phone || 'Not publicly listed'}{' '}
                            {lead.email ? `· ${lead.email}` : ''}
                          </div>
                          <div>Public Sources: {lead.publicSources.join(' · ')}</div>
                          <div className="text-cyan-200 pt-1">
                            Opportunity Reason ({lead.opportunityLevel}): {lead.opportunitySummary}
                          </div>
                        </div>

                        {/* Required Action Buttons: OPEN MAP, OPEN WEBSITE, VIEW RESEARCH */}
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800 text-xs font-mono">
                          <a
                            href={lead.mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 font-bold"
                          >
                            OPEN MAP
                          </a>
                          {lead.existingWebsite ? (
                            <button
                              onClick={() => handleOpenInPhone(lead.existingWebsite!)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 font-bold cursor-pointer"
                            >
                              OPEN WEBSITE
                            </button>
                          ) : (
                            <span className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-500">
                              OPEN WEBSITE (No Public Website)
                            </span>
                          )}
                          <button
                            onClick={() => setActiveTab('OPERATIONS')}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold cursor-pointer"
                          >
                            VIEW RESEARCH
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800 text-xs">
                          <div>
                            <div className="font-mono text-rose-300 mb-1">WEBSITE QUALITY FINDINGS:</div>
                            <ul className="space-y-1 text-slate-300">
                              {lead.audit.issues.map((iss, i) => (
                                <li key={i}>• {iss}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <div className="font-mono text-emerald-300 mb-1">OPPORTUNITY RECOMMENDATIONS:</div>
                            <ul className="space-y-1 text-slate-300">
                              {lead.audit.opportunities.map((opp, i) => (
                                <li key={i}>✓ {opp}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 5: WEBSITE DEMO — REAL PREVIEW (DEMO / SAMPLE label + OPEN DEMO, PREVIEW, EDIT, SAVE, SHARE) */}
              {activeTab === 'PREVIEW' && (
                <div className="space-y-3">
                  {activeWs.demoWebsites.length === 0 ? (
                    <p className="text-xs text-slate-400 font-mono">
                      No demo website generated in this workspace yet. Run Website Flow B above.
                    </p>
                  ) : (
                    activeWs.demoWebsites.map((site) => (
                      <div key={site.id} className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                          <div>
                            <div className="text-xs font-mono font-bold text-amber-300">
                              [{site.sampleLabel}] WEBSITE ARTIFACT: {site.businessName}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400">
                              File: {site.savedHtmlPath} · Folder: {site.projectFolder}
                            </div>
                          </div>

                          {/* Required Controls: OPEN DEMO, PREVIEW, EDIT, SAVE, SHARE */}
                          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                            <button
                              onClick={() => handleOpenInPhone(site.previewUrl)}
                              className="px-2.5 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold cursor-pointer"
                            >
                              OPEN DEMO
                            </button>
                            <button
                              onClick={() => setEditingDemoId(null)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-200 cursor-pointer"
                            >
                              PREVIEW
                            </button>
                            <button
                              onClick={() => {
                                setEditingDemoId(site.id);
                                setEditedHtml(site.htmlContent);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-200 cursor-pointer"
                            >
                              EDIT
                            </button>
                            <a
                              href={site.previewUrl}
                              download
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300"
                            >
                              SAVE
                            </a>
                            <button
                              onClick={() =>
                                handleShare(
                                  `[${site.sampleLabel}] ${site.businessName}`,
                                  `Mobile demo website for ${site.businessName}`,
                                  site.previewUrl
                                )
                              }
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                            >
                              SHARE
                            </button>
                          </div>
                        </div>

                        {editingDemoId === site.id ? (
                          <div className="p-3 rounded-xl bg-slate-900 border border-amber-500/40 space-y-2">
                            <div className="flex items-center justify-between text-xs font-mono">
                              <span className="text-amber-300 font-bold">
                                EDITING [{site.sampleLabel}] HTML ARTIFACT
                              </span>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={async () => {
                                    await part14Orchestrator.updateDemoWebsiteHtml(
                                      activeWs.projectId,
                                      site.id,
                                      editedHtml
                                    );
                                    setEditingDemoId(null);
                                    notifyUser('Saved updated DEMO / SAMPLE website to project disk.');
                                  }}
                                  className="px-3 py-1 rounded bg-emerald-500 text-slate-950 font-bold cursor-pointer"
                                >
                                  SAVE CHANGES TO DISK
                                </button>
                                <button
                                  onClick={() => setEditingDemoId(null)}
                                  className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                            <textarea
                              value={editedHtml}
                              onChange={(e) => setEditedHtml(e.target.value)}
                              rows={12}
                              className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 outline-none"
                            />
                          </div>
                        ) : (
                          /* Mobile Viewport Simulator Frame */
                          <div className="mx-auto w-full max-w-[412px] h-[540px] rounded-3xl border-4 border-slate-700 bg-slate-950 overflow-hidden shadow-2xl flex flex-col">
                            <div className="px-4 py-1.5 bg-amber-500/20 border-b border-amber-500/40 flex items-center justify-between text-[10px] font-mono text-amber-200">
                              <span className="font-bold">{site.sampleLabel}</span>
                              <span>{site.previewUrl}</span>
                            </div>
                            <iframe
                              srcDoc={site.htmlContent}
                              title={`Demo Website for ${site.businessName}`}
                              className="w-full flex-1 border-0 bg-slate-950"
                            />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 6: FACEBOOK PUBLISHING & AUTHORIZED OUTREACH */}
              {activeTab === 'PUBLISH_OUTREACH' && (
                <div className="space-y-4">
                  {activeWs.facebookPublish && (
                    <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-mono font-bold text-cyan-300">
                          FACEBOOK PUBLISHING STATE: {activeWs.facebookPublish.status}
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          Transition History: {activeWs.facebookPublish.stageHistory.join(' → ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 whitespace-pre-wrap bg-slate-950 p-3 rounded-lg border border-slate-800">
                        {activeWs.facebookPublish.caption}
                      </p>
                      <p className="text-xs font-mono text-amber-300">{activeWs.facebookPublish.reason}</p>
                      {activeWs.facebookPublish.errorDetails && (
                        <p className="text-xs font-mono text-rose-300 font-bold">
                          {activeWs.facebookPublish.errorDetails}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {activeWs.facebookPublish.status === 'WAITING_APPROVAL' && (
                          <>
                            <button
                              onClick={handleApprove}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-mono font-bold text-xs cursor-pointer"
                            >
                              Approve &amp; Attempt Publish
                            </button>
                            <button
                              onClick={handleReject}
                              className="px-3 py-1.5 rounded-lg bg-rose-950 border border-rose-500/40 text-rose-200 font-mono text-xs cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {activeWs.facebookPublish.status === 'PUBLISHED' &&
                          activeWs.facebookPublish.externalUrl && (
                            <a
                              href={activeWs.facebookPublish.externalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-mono font-bold text-xs"
                            >
                              OPEN POST ({activeWs.facebookPublish.externalPostId})
                            </a>
                          )}
                      </div>
                    </div>
                  )}

                  {activeWs.outreachRecords.map((out) => (
                    <div
                      key={out.id}
                      className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-emerald-300">
                          AUTHORIZED OUTREACH ({out.businessName}): {out.status}
                        </span>
                        <span className="text-xs font-mono text-amber-300">
                          External Messaging API: {out.externalApiStatus}
                        </span>
                      </div>
                      <div className="text-xs font-mono text-slate-400">
                        Recipient: {out.recipient || 'User-selected contact'} · Subject: {out.subject}
                      </div>
                      <p className="text-xs text-slate-200 whitespace-pre-wrap bg-slate-950 p-3 rounded-lg border border-slate-800">
                        {out.messageBody}
                      </p>
                      <p className="text-xs font-mono text-slate-300">{out.reason}</p>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {out.status === 'WAITING_APPROVAL' && (
                          <>
                            <button
                              onClick={handleApprove}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-mono font-bold text-xs cursor-pointer"
                            >
                              Approve Outreach
                            </button>
                            <button
                              onClick={handleReject}
                              className="px-3 py-1.5 rounded-lg bg-rose-950 border border-rose-500/40 text-rose-200 font-mono text-xs cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {out.approvedByUser && out.mailtoOrIntentUrl && (
                          <a
                            href={out.mailtoOrIntentUrl}
                            className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-mono font-bold text-xs"
                          >
                            Launch User Email Client Handoff
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 7: ANDROID FILE ACCESS & PERSISTED PROJECT FILES */}
              {activeTab === 'SAVED_ASSETS' && (
                <div className="space-y-3">
                  {activeWs.androidFileAccess && (
                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                      <div>
                        <div className="text-cyan-300 font-bold">
                          ANDROID FILE ACCESS &amp; PERMISSION BOUNDARY
                        </div>
                        <div className="text-slate-300 mt-0.5">
                          {activeWs.androidFileAccess.statusMessage}
                        </div>
                      </div>
                      <button
                        onClick={handleRequestAndroidPermission}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-400/50 text-cyan-200 font-bold shrink-0 cursor-pointer"
                      >
                        Request Android Permission
                      </button>
                    </div>
                  )}

                  <div className="text-xs font-mono text-slate-300">
                    Persisted Project Files in <code>/data/part14_projects/{activeWs.projectId}</code>:
                  </div>
                  {activeWs.savedAssets.map((asset, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono"
                    >
                      <div>
                        <span className="text-cyan-300 font-bold">{asset.name}</span>
                        <span className="text-slate-400">
                          {' '}
                          · {asset.type} · {asset.sizeBytes} bytes · Disk Persisted: {asset.persistedOnDisk ? 'YES' : 'NO'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleOpenInPhone(asset.publicUrl)}
                          className="text-cyan-300 hover:underline cursor-pointer"
                        >
                          OPEN ON PHONE
                        </button>
                        <a
                          href={asset.publicUrl}
                          download
                          className="text-emerald-400 hover:underline"
                        >
                          SAVE
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 8: OFFLINE / UNAVAILABLE SERVICES & ACTION BLOCKED */}
              {activeTab === 'ERRORS_BLOCKED' && (
                <div className="space-y-3">
                  <div className="text-xs font-mono text-amber-300">
                    SERVICE UNAVAILABLE / ACTION BLOCKED Registry — Never replaces unavailable external services with fake completion:
                  </div>
                  {activeWs.blockedIntegrations.map((b, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-1"
                    >
                      <div className="text-xs font-mono font-bold text-amber-300">
                        {b.service} — {b.status}
                      </div>
                      <p className="text-xs text-slate-200 font-mono">{b.reason}</p>
                    </div>
                  ))}

                  {activeWs.errors.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="text-xs font-mono text-rose-400">EXECUTION ERRORS:</div>
                      {activeWs.errors.map((err, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-200 font-mono"
                        >
                          {err}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
