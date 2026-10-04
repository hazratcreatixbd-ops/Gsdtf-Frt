import React, { useState, useEffect, useMemo } from 'react';
import {
  Memory,
  MemoryType,
  MemoryImportance,
  MemoryConfidence,
  MemoryStatus,
  ResearchMemoryItem,
} from '../../services/memory/MemoryTypes';
import { advancedMemoryManager } from '../../services/memory/AdvancedMemoryManager';
import { workerRegistry } from '../workers/WorkerRegistry';
import {
  X,
  Search,
  Bookmark,
  FolderOpen,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Archive,
  RefreshCw,
  Plus,
  Link,
  Cpu,
  Sparkles,
  Zap,
  Tag,
  Clock,
  User,
  ExternalLink,
  ShieldAlert,
  Flame,
  FileText,
  Copy,
  Check,
} from 'lucide-react';

interface WorldMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type MemoryViewMode = 'all' | 'research';

export const WorldMemoryModal: React.FC<WorldMemoryModalProps> = ({ isOpen, onClose }) => {
  const [memories, setMemories] = useState<Memory[]>(advancedMemoryManager.getAllMemories());
  const [researchItems, setResearchItems] = useState<ResearchMemoryItem[]>(
    advancedMemoryManager.getResearchMemories()
  );
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);
  const [selectedResearchId, setSelectedResearchId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<MemoryViewMode>('all');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | MemoryType>('ALL');
  const [importanceFilter, setImportanceFilter] = useState<'ALL' | MemoryImportance>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'CONFLICTING' | 'ARCHIVED'>('ALL');
  const [workerFilter, setWorkerFilter] = useState<string>('ALL');
  const [projectFilter, setProjectFilter] = useState<string>('ALL');

  // UI state
  const [showAddForm, setShowAddForm] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Custom Memory Form State
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<MemoryType>('USER_PREFERENCE');
  const [newImportance, setNewImportance] = useState<MemoryImportance>('HIGH');
  const [newTags, setNewTags] = useState('');
  const [newWorker, setNewWorker] = useState('');
  const [newProject, setNewProject] = useState('');

  // Subscribe to real-time memory updates
  useEffect(() => {
    const unsub = advancedMemoryManager.subscribe((list) => {
      setMemories([...list]);
      setResearchItems(advancedMemoryManager.getResearchMemories());
    });
    return () => unsub();
  }, []);

  const stats = useMemo(() => advancedMemoryManager.getOverviewStats(), [memories, researchItems]);
  const workers = useMemo(() => workerRegistry.getAllWorkers(), []);

  // Compute available projects from memories
  const availableProjects = useMemo(() => {
    const set = new Set<string>();
    memories.forEach((m) => {
      m.relatedProjects.forEach((p) => {
        if (p) set.add(p);
      });
    });
    return Array.from(set);
  }, [memories]);

  // Filter memories
  const filteredMemories = useMemo(() => {
    return memories.filter((mem) => {
      // Discarded are completely hidden
      if (mem.status === 'DISCARDED') return false;

      // Status filter
      if (statusFilter !== 'ALL') {
        if (mem.status !== statusFilter) return false;
      } else {
        // By default show active and conflicting, hide archived unless filter is ARCHIVED
        // But if user didn't specify, we show active & conflicting
      }

      // Type filter
      if (typeFilter !== 'ALL' && mem.type !== typeFilter) {
        return false;
      }

      // Importance filter
      if (importanceFilter !== 'ALL' && mem.importance !== importanceFilter) {
        return false;
      }

      // Worker filter
      if (workerFilter !== 'ALL') {
        const hasWorker = mem.relatedWorkers.some((w) => w.toLowerCase() === workerFilter.toLowerCase());
        if (!hasWorker) return false;
      }

      // Project filter
      if (projectFilter !== 'ALL') {
        const hasProject = mem.relatedProjects.some((p) => p.toLowerCase().includes(projectFilter.toLowerCase()));
        if (!hasProject) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = mem.title.toLowerCase().includes(q);
        const matchContent = mem.content.toLowerCase().includes(q);
        const matchSummary = mem.summary.toLowerCase().includes(q);
        const matchTags = mem.tags.some((t) => t.toLowerCase().includes(q));
        const matchSource = mem.source.sourceName.toLowerCase().includes(q);
        if (!matchTitle && !matchContent && !matchSummary && !matchTags && !matchSource) {
          return false;
        }
      }

      return true;
    });
  }, [memories, statusFilter, typeFilter, importanceFilter, workerFilter, projectFilter, searchQuery]);

  // Filtered research items
  const filteredResearch = useMemo(() => {
    return researchItems.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTopic = item.topic.toLowerCase().includes(q);
        const matchFinding = item.finding.toLowerCase().includes(q);
        const matchEvidence = item.evidence.toLowerCase().includes(q);
        const matchTags = item.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchTopic && !matchFinding && !matchEvidence && !matchTags) {
          return false;
        }
      }
      if (workerFilter !== 'ALL') {
        if (item.relatedWorker?.toLowerCase() !== workerFilter.toLowerCase()) return false;
      }
      return true;
    });
  }, [researchItems, searchQuery, workerFilter]);

  // Selected item
  const selectedMemory = useMemo(() => {
    if (selectedMemoryId) {
      const found = memories.find((m) => m.id === selectedMemoryId);
      if (found) return found;
    }
    return filteredMemories[0] || null;
  }, [selectedMemoryId, memories, filteredMemories]);

  const selectedResearch = useMemo(() => {
    if (selectedResearchId) {
      const found = researchItems.find((r) => r.id === selectedResearchId);
      if (found) return found;
    }
    return filteredResearch[0] || null;
  }, [selectedResearchId, researchItems, filteredResearch]);

  if (!isOpen) return null;

  // Flash a notification
  const triggerNotification = (text: string) => {
    setNotification(text);
    setTimeout(() => setNotification(null), 4000);
  };

  // Test Flow
  const handleRunTestFlow = () => {
    const testCandidate = {
      title: 'System Diagnostic Test Memory',
      content: 'Autonomous Memory Engine verification test candidate for multi-tier storage, provenance indexing, and instant retrieval validation.',
      suggestedType: 'SYSTEM' as MemoryType,
      suggestedImportance: 'HIGH' as MemoryImportance,
      tags: ['diagnostic', 'verification', 'system-test'],
      sourceType: 'SYSTEM' as const,
      sourceName: 'Memory Core Diagnostic Test Flow',
    };

    const result = advancedMemoryManager.evaluateAndSave(testCandidate);
    if (result.memory) {
      setSelectedMemoryId(result.memory.id);
      setStatusFilter('ALL');
      setTypeFilter('ALL');
      setSearchQuery('');
      triggerNotification(`[TEST PASS] Evaluated as ${result.decision.action}: "${result.memory.title}" saved & retrieved!`);
    }
  };

  const handleCreateMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    const tags = newTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const result = advancedMemoryManager.evaluateAndSave({
      title: newTitle.trim() || undefined,
      content: newContent.trim(),
      suggestedType: newType,
      tags: tags.length > 0 ? tags : undefined,
      sourceType: 'USER',
      sourceName: 'User Direct Input',
      relatedProject: newProject.trim() || undefined,
      relatedTask: undefined,
    });

    if (result.memory) {
      setSelectedMemoryId(result.memory.id);
      triggerNotification(`Memory saved: "${result.memory.title}"`);
    } else {
      triggerNotification(`Decision Engine verdict: ${result.decision.action} (${result.decision.reason})`);
    }

    setNewTitle('');
    setNewContent('');
    setNewTags('');
    setNewWorker('');
    setNewProject('');
    setShowAddForm(false);
  };

  const handleArchiveToggle = (id: string, currentStatus: MemoryStatus) => {
    if (currentStatus === 'ARCHIVED') {
      advancedMemoryManager.updateMemory(id, { status: 'ACTIVE' });
      triggerNotification('Memory restored to ACTIVE status.');
    } else {
      advancedMemoryManager.archiveMemory(id);
      triggerNotification('Memory moved to ARCHIVED storage.');
    }
  };

  const handleDiscard = (id: string) => {
    advancedMemoryManager.discardMemory(id);
    triggerNotification('Memory discarded.');
    if (selectedMemoryId === id) {
      setSelectedMemoryId(null);
    }
  };

  const handleClearSession = () => {
    const cleared = advancedMemoryManager.clearSessionMemory();
    triggerNotification(`Cleared ${cleared} temporary session memories.`);
  };

  const handleCopyContent = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setTypeFilter('ALL');
    setImportanceFilter('ALL');
    setStatusFilter('ALL');
    setWorkerFilter('ALL');
    setProjectFilter('ALL');
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    typeFilter !== 'ALL' ||
    importanceFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    workerFilter !== 'ALL' ||
    projectFilter !== 'ALL';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 font-mono select-none">
      <div className="relative w-full max-w-6xl h-[92vh] rounded-3xl border border-cyan-500/40 bg-[#030714] text-slate-100 shadow-[0_0_50px_rgba(6,182,212,0.15)] flex flex-col overflow-hidden">
        {/* TOP COMMAND STRIP */}
        <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-cyan-500/30 bg-slate-950/95 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
              <Bookmark className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm sm:text-base font-black tracking-widest text-white uppercase">
                  FRIDAY MEMORY CORE
                </h2>
                <span className="text-[9px] px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 font-extrabold uppercase">
                  PART 12
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold hidden sm:inline">
                  DECISION ENGINE ACTIVE
                </span>
              </div>
              <span className="text-[10px] text-slate-400 hidden sm:inline">
                Multi-Tier Storage • Provenance Tracking • Conflict Defense • Research Findings
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* View Mode Switcher: ALL MEMORIES vs RESEARCH */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-xs">
              <button
                onClick={() => setViewMode('all')}
                className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  viewMode === 'all'
                    ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ALL MEMORIES ({memories.length})
              </button>
              <button
                onClick={() => setViewMode('research')}
                className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  viewMode === 'research'
                    ? 'bg-indigo-500/25 text-indigo-200 border border-indigo-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                RESEARCH FINDINGS ({researchItems.length})
              </button>
            </div>

            {/* Test Memory Flow Button */}
            <button
              onClick={handleRunTestFlow}
              title="Execute development-only test flow through MemoryDecisionEngine"
              className="flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-cyan-400/80 bg-gradient-to-r from-cyan-950 via-cyan-900/60 to-blue-950 hover:from-cyan-900 hover:to-blue-900 text-cyan-200 hover:text-white font-bold text-[11px] tracking-wider transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] active:scale-95 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>TEST MEMORY</span>
            </button>

            {/* Close / Return to World */}
            <button
              onClick={onClose}
              title="Close Memory Core (Return to Agent Town)"
              className="p-1.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* NOTIFICATION TOAST */}
        {notification && (
          <div className="px-4 py-2 bg-gradient-to-r from-cyan-950/90 via-slate-900/90 to-cyan-950/90 border-b border-cyan-500/40 text-cyan-300 text-xs flex items-center justify-between shrink-0 animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>{notification}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-white text-[10px]"
            >
              DISMISS
            </button>
          </div>
        )}

        {/* 1. MEMORY OVERVIEW: 6 STATS OVERVIEW CARDS (WITH QUICK CLICK-TO-FILTER) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 p-3 bg-slate-950/80 border-b border-cyan-500/20 shrink-0 text-xs">
          {/* Card 1: Active Memories */}
          <button
            onClick={() => {
              setViewMode('all');
              setStatusFilter('ACTIVE');
              setTypeFilter('ALL');
            }}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              statusFilter === 'ACTIVE'
                ? 'bg-cyan-950/50 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                : 'bg-slate-900/60 border-cyan-500/20 hover:border-cyan-500/50'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-slate-400 font-bold uppercase">ACTIVE MEMORIES</span>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            </div>
            <span className="text-lg font-black text-cyan-300">{stats.activeCount}</span>
          </button>

          {/* Card 2: Research Memories */}
          <button
            onClick={() => {
              setViewMode('research');
            }}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              viewMode === 'research'
                ? 'bg-indigo-950/50 border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.3)]'
                : 'bg-slate-900/60 border-indigo-500/20 hover:border-indigo-500/50'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-slate-400 font-bold uppercase">RESEARCH MEMORIES</span>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            </div>
            <span className="text-lg font-black text-indigo-300">{stats.researchCount}</span>
          </button>

          {/* Card 3: User Preferences */}
          <button
            onClick={() => {
              setViewMode('all');
              setTypeFilter('USER_PREFERENCE');
              setStatusFilter('ALL');
            }}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              typeFilter === 'USER_PREFERENCE'
                ? 'bg-emerald-950/50 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'bg-slate-900/60 border-emerald-500/20 hover:border-emerald-500/50'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-slate-400 font-bold uppercase">USER PREFERENCES</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>
            <span className="text-lg font-black text-emerald-300">{stats.preferenceCount}</span>
          </button>

          {/* Card 4: Important Memories */}
          <button
            onClick={() => {
              setViewMode('all');
              setImportanceFilter('HIGH');
              setStatusFilter('ALL');
            }}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              importanceFilter === 'HIGH' || importanceFilter === 'CRITICAL'
                ? 'bg-amber-950/50 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                : 'bg-slate-900/60 border-amber-500/20 hover:border-amber-500/50'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-slate-400 font-bold uppercase">IMPORTANT MEMORIES</span>
              <Flame className="w-3 h-3 text-amber-400" />
            </div>
            <span className="text-lg font-black text-amber-300">{stats.importantCount}</span>
          </button>

          {/* Card 5: Conflicting Memories */}
          <button
            onClick={() => {
              setViewMode('all');
              setStatusFilter('CONFLICTING');
              setTypeFilter('ALL');
            }}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              statusFilter === 'CONFLICTING'
                ? 'bg-rose-950/50 border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                : 'bg-slate-900/60 border-rose-500/20 hover:border-rose-500/50'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-slate-400 font-bold uppercase">CONFLICTING</span>
              <ShieldAlert className="w-3 h-3 text-rose-400" />
            </div>
            <span className={`text-lg font-black ${stats.conflictCount > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`}>
              {stats.conflictCount}
            </span>
          </button>

          {/* Card 6: Archived Memories */}
          <button
            onClick={() => {
              setViewMode('all');
              setStatusFilter('ARCHIVED');
              setTypeFilter('ALL');
            }}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              statusFilter === 'ARCHIVED'
                ? 'bg-slate-800/80 border-slate-400 shadow-[0_0_12px_rgba(148,163,184,0.2)]'
                : 'bg-slate-900/60 border-slate-700/30 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-slate-400 font-bold uppercase">ARCHIVED</span>
              <Archive className="w-3 h-3 text-slate-400" />
            </div>
            <span className="text-lg font-black text-slate-400">{stats.archivedCount}</span>
          </button>
        </div>

        {/* 2. SEARCH & FILTER CONTROLS */}
        <div className="p-3 border-b border-slate-800/80 bg-[#040818] shrink-0 space-y-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Box */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search memory keywords, content, tags, provenance, topics..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-mono"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Type Filter */}
            {viewMode === 'all' && (
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:border-cyan-400 outline-none"
              >
                <option value="ALL">All Memory Types</option>
                <option value="USER_PREFERENCE">User Preference</option>
                <option value="RESEARCH">Research Finding</option>
                <option value="BUSINESS">Business Strategy</option>
                <option value="WORKFLOW">Workflow / Goal</option>
                <option value="TASK">Task / Directive</option>
                <option value="CONVERSATION">Conversation</option>
                <option value="WORKER">Worker Directives</option>
                <option value="PROJECT">Project Knowledge</option>
                <option value="SYSTEM">System / Config</option>
                <option value="TEMPORARY">Temporary Note</option>
              </select>
            )}

            {/* Importance Filter */}
            {viewMode === 'all' && (
              <select
                value={importanceFilter}
                onChange={(e) => setImportanceFilter(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:border-cyan-400 outline-none"
              >
                <option value="ALL">All Importance</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            )}

            {/* Status Filter */}
            {viewMode === 'all' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:border-cyan-400 outline-none"
              >
                <option value="ALL">All Statuses (Active / Conflict)</option>
                <option value="ACTIVE">Active Only</option>
                <option value="CONFLICTING">Conflicting Only</option>
                <option value="ARCHIVED">Archived Only</option>
              </select>
            )}

            {/* Worker Filter */}
            <select
              value={workerFilter}
              onChange={(e) => setWorkerFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:border-cyan-400 outline-none"
            >
              <option value="ALL">All Workers</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.role})
                </option>
              ))}
            </select>

            {/* Project Filter */}
            {availableProjects.length > 0 && (
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:border-cyan-400 outline-none"
              >
                <option value="ALL">All Projects</option>
                {availableProjects.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            )}

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={handleClearAllFilters}
                className="px-2.5 py-1.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 hover:bg-rose-900/50 text-[10px] font-bold cursor-pointer"
              >
                RESET FILTERS
              </button>
            )}

            {/* Add Memory Form Toggle */}
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-cyan-950 border border-cyan-500/50 hover:bg-cyan-900 text-cyan-300 font-bold text-xs shadow-sm cursor-pointer ml-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddForm ? 'CANCEL' : 'STORE MEMORY'}</span>
            </button>

            {/* Clear Session */}
            <button
              onClick={handleClearSession}
              title="Purge temporary short-term and session memories"
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 text-xs cursor-pointer"
            >
              CLEAR SESSION
            </button>
          </div>
        </div>

        {/* ADD MEMORY DRAWER */}
        {showAddForm && (
          <form
            onSubmit={handleCreateMemory}
            className="p-3.5 bg-slate-900/95 border-b border-cyan-500/30 text-xs space-y-2.5 shrink-0 animate-in slide-in-from-top duration-150"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Submit Candidate to MemoryDecisionEngine</span>
              </span>
              <span className="text-[10px] text-slate-400">
                Deterministic triage • Duplicate detection • Provenance tracking
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                type="text"
                placeholder="Title (optional, auto-derived if empty)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs outline-none focus:border-cyan-400"
              />
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as MemoryType)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs outline-none focus:border-cyan-400"
              >
                <option value="USER_PREFERENCE">User Preference</option>
                <option value="RESEARCH">Research Finding</option>
                <option value="BUSINESS">Business Strategy</option>
                <option value="WORKFLOW">Workflow / Goal</option>
                <option value="PROJECT">Project Knowledge</option>
                <option value="CONVERSATION">Conversation Context</option>
                <option value="SYSTEM">System Configuration</option>
                <option value="TEMPORARY">Temporary Note</option>
              </select>
              <input
                type="text"
                placeholder="Tags (comma separated, e.g. video, style, titles)"
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs outline-none focus:border-cyan-400"
              />
              <select
                value={newWorker}
                onChange={(e) => setNewWorker(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs outline-none focus:border-cyan-400"
              >
                <option value="">Associate Worker (Optional)</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.role})
                  </option>
                ))}
              </select>
            </div>

            <textarea
              rows={2}
              placeholder="Candidate content (e.g. 'I prefer short video titles under 50 characters with bold curiosity hooks')..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs resize-none outline-none focus:border-cyan-400"
            />

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md cursor-pointer"
              >
                Evaluate & Save Memory
              </button>
            </div>
          </form>
        )}

        {/* MAIN MASTER-DETAIL WORKSPACE */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          {/* VIEW MODE A: ALL MEMORIES */}
          {viewMode === 'all' && (
            <>
              {/* 3. MEMORY LIST: Left Master Column */}
              <div className="w-full md:w-5/12 border-r border-slate-800/80 overflow-y-auto p-2.5 space-y-2 scrollbar-thin scrollbar-thumb-cyan-500/20 min-h-0">
                {memories.length === 0 ? (
                  /* 6. EMPTY STATE: ZERO MEMORIES STORED */
                  <div className="flex flex-col items-center justify-center p-12 text-slate-400 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center">
                      <Bookmark className="w-6 h-6 text-cyan-400/60" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                        No saved memories yet.
                      </h4>
                      <p className="text-xs text-slate-400 max-w-xs">
                        FRIDAY has not stored any permanent candidate memories yet. Save preferences via voice ("FRIDAY, remember this") or test the engine below.
                      </p>
                    </div>
                    <button
                      onClick={handleRunTestFlow}
                      className="mt-2 flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-950 border border-cyan-500/60 hover:bg-cyan-900 text-cyan-200 text-xs font-bold transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 text-cyan-400" />
                      <span>RUN TEST MEMORY FLOW</span>
                    </button>
                  </div>
                ) : filteredMemories.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-10 text-slate-500 text-center space-y-2">
                    <FolderOpen className="w-8 h-8 opacity-40" />
                    <span className="text-xs">No memories matching the selected filters.</span>
                    <button
                      onClick={handleClearAllFilters}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-[10px] hover:text-white"
                    >
                      Reset Filters
                    </button>
                  </div>
                ) : (
                  filteredMemories.map((mem) => {
                    const isSelected = selectedMemory?.id === mem.id;
                    const isConflicting = mem.status === 'CONFLICTING';
                    const isArchived = mem.status === 'ARCHIVED';

                    return (
                      <div
                        key={mem.id}
                        onClick={() => setSelectedMemoryId(mem.id)}
                        className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all duration-150 space-y-1.5 ${
                          isSelected
                            ? 'bg-cyan-950/50 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400/40'
                            : isConflicting
                            ? 'bg-rose-950/20 border-rose-500/40 hover:bg-slate-900'
                            : isArchived
                            ? 'bg-slate-950/40 border-slate-800/60 opacity-70 hover:opacity-100 hover:bg-slate-900'
                            : 'bg-slate-950/70 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
                        }`}
                      >
                        {/* Memory Row: Type, Status, Importance, Confidence */}
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-extrabold uppercase tracking-wider text-cyan-400">
                            {mem.type.replace('_', ' ')}
                          </span>

                          <div className="flex items-center space-x-1">
                            {isConflicting && (
                              <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-500/50 text-[8px] font-black animate-pulse">
                                CONFLICT
                              </span>
                            )}
                            <span
                              className={`px-1.5 py-0.2 rounded text-[8px] font-bold ${
                                mem.importance === 'CRITICAL'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-500/50'
                                  : mem.importance === 'HIGH'
                                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50'
                                  : mem.importance === 'MEDIUM'
                                  ? 'bg-slate-900 text-slate-300 border border-slate-700'
                                  : 'bg-slate-950 text-slate-500'
                              }`}
                            >
                              {mem.importance}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[8px] font-bold ${
                                mem.confidence === 'VERIFIED'
                                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                                  : mem.confidence === 'PARTIAL'
                                  ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                                  : 'bg-slate-900 text-slate-400'
                              }`}
                            >
                              {mem.confidence}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[8px] font-bold ${
                                mem.status === 'ACTIVE'
                                  ? 'bg-emerald-950 text-emerald-300'
                                  : mem.status === 'ARCHIVED'
                                  ? 'bg-slate-800 text-slate-400'
                                  : 'bg-amber-950 text-amber-300'
                              }`}
                            >
                              {mem.status}
                            </span>
                          </div>
                        </div>

                        {/* Title */}
                        <h4 className="font-bold text-white text-xs truncate">{mem.title}</h4>

                        {/* Short Summary Preview */}
                        <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                          {mem.summary || mem.content}
                        </p>

                        {/* Bottom Row: Source & Date */}
                        <div className="flex items-center justify-between text-[9px] text-slate-500 pt-1.5 border-t border-slate-800/60">
                          <span className="truncate max-w-[150px]">
                            Src: {mem.source.sourceName || mem.source.sourceType}
                          </span>
                          <span>{formatDate(mem.updatedAt)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* 4. MEMORY DETAIL: Right Detail Column */}
              <div className="flex-1 overflow-y-auto p-4 bg-[#020510] space-y-4 scrollbar-thin scrollbar-thumb-cyan-500/20 min-h-0">
                {selectedMemory ? (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    {/* Conflict Notice & Resolver if present */}
                    {selectedMemory.status === 'CONFLICTING' && (
                      <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-start space-x-2">
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-rose-300">Empirical Conflict Detected</span>
                            <p className="text-[11px] text-rose-200/80 mt-0.5">
                              This memory contradicts an existing rule or preference in FRIDAY's memory bank.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 shrink-0">
                          <button
                            onClick={() =>
                              advancedMemoryManager.resolveConflict(
                                selectedMemory.id,
                                'ACTIVE',
                                'User confirmed this memory as source of truth'
                              )
                            }
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-sm cursor-pointer"
                          >
                            Confirm Truth
                          </button>
                          <button
                            onClick={() =>
                              advancedMemoryManager.resolveConflict(
                                selectedMemory.id,
                                'ARCHIVED',
                                'Superseded by older record'
                              )
                            }
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold cursor-pointer"
                          >
                            Archive
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Header: Title, Type, ID */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                            {selectedMemory.type.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-slate-600">•</span>
                          <span className="text-[10px] text-slate-400">ID: {selectedMemory.id}</span>
                          <span className="text-[10px] text-slate-600">•</span>
                          <span
                            className={`text-[10px] font-bold ${
                              selectedMemory.status === 'ACTIVE'
                                ? 'text-emerald-400'
                                : selectedMemory.status === 'CONFLICTING'
                                ? 'text-rose-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {selectedMemory.status}
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
                          {selectedMemory.title}
                        </h3>
                      </div>

                      {/* Copy content button */}
                      <button
                        onClick={() => handleCopyContent(selectedMemory.content, selectedMemory.id)}
                        className="p-1.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 text-xs flex items-center space-x-1 cursor-pointer shrink-0"
                      >
                        {copiedId === selectedMemory.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[10px] text-emerald-300">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="text-[10px]">Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                      <div>
                        <span className="text-[9px] text-slate-500 font-bold uppercase block">IMPORTANCE</span>
                        <span className="font-bold text-cyan-300">{selectedMemory.importance}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 font-bold uppercase block">CONFIDENCE</span>
                        <span className="font-bold text-emerald-400">{selectedMemory.confidence}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 font-bold uppercase block">RETENTION</span>
                        <span className="font-bold text-slate-300">{selectedMemory.retention}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 font-bold uppercase block">SENSITIVITY</span>
                        <span className="font-bold text-slate-300">{selectedMemory.sensitivity}</span>
                      </div>
                    </div>

                    {/* Full Content Box */}
                    <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          FULL CONTENT & RECORD
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap selection:bg-cyan-500/30">
                        {selectedMemory.content}
                      </p>
                    </div>

                    {/* Short Summary */}
                    {selectedMemory.summary && (
                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">
                          EXECUTIVE SUMMARY
                        </span>
                        <p className="text-xs text-slate-300 leading-relaxed">{selectedMemory.summary}</p>
                      </div>
                    )}

                    {/* Source & Provenance */}
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                          SOURCE & PROVENANCE
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-bold">
                          {selectedMemory.source.sourceType}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-[11px] text-slate-400">
                        <div>
                          <span className="text-slate-500">Source:</span>{' '}
                          <span className="text-slate-200 font-semibold">
                            {selectedMemory.source.sourceName}
                          </span>
                        </div>
                        {selectedMemory.source.sourceUrl && (
                          <div className="flex items-center space-x-1">
                            <ExternalLink className="w-3 h-3 text-cyan-400 shrink-0" />
                            <a
                              href={selectedMemory.source.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyan-400 hover:underline truncate"
                            >
                              {selectedMemory.source.sourceUrl}
                            </a>
                          </div>
                        )}
                        {selectedMemory.source.evidenceSummary && (
                          <div>
                            <span className="text-slate-500">Evidence:</span>{' '}
                            <span className="text-slate-300">{selectedMemory.source.evidenceSummary}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-slate-500">Retrieved:</span>{' '}
                          <span className="text-slate-300">
                            {formatDate(selectedMemory.source.retrievedAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Tags, Worker & Project Association */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {/* Tags */}
                      <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">TAGS</span>
                        <div className="flex flex-wrap gap-1">
                          {selectedMemory.tags.length > 0 ? (
                            selectedMemory.tags.map((t) => (
                              <button
                                key={t}
                                onClick={() => setSearchQuery(t)}
                                className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-cyan-300 hover:border-cyan-500 transition-colors cursor-pointer"
                              >
                                #{t}
                              </button>
                            ))
                          ) : (
                            <span className="text-slate-600 text-[10px]">No tags assigned</span>
                          )}
                        </div>
                      </div>

                      {/* Worker & Project */}
                      <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">
                          ASSOCIATED WORKER & PROJECT
                        </span>
                        <div className="space-y-1 text-[11px] text-slate-300">
                          <div>
                            <span className="text-slate-500">Worker:</span>{' '}
                            <span className="text-cyan-300 font-semibold">
                              {selectedMemory.relatedWorkers.length > 0
                                ? selectedMemory.relatedWorkers.join(', ')
                                : 'Universal Core'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Project:</span>{' '}
                            <span className="text-emerald-300 font-semibold">
                              {selectedMemory.relatedProjects.length > 0
                                ? selectedMemory.relatedProjects.join(', ')
                                : 'General System'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Timestamps */}
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-800/80">
                      <span>Created: {formatDate(selectedMemory.createdAt)}</span>
                      <span>Last Updated: {formatDate(selectedMemory.updatedAt)}</span>
                    </div>

                    {/* Action Bar: Archive & Discard */}
                    <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800/60">
                      <button
                        onClick={() => handleArchiveToggle(selectedMemory.id, selectedMemory.status)}
                        className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold transition-all cursor-pointer"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        <span>{selectedMemory.status === 'ARCHIVED' ? 'UNARCHIVE' : 'ARCHIVE'}</span>
                      </button>

                      <button
                        onClick={() => handleDiscard(selectedMemory.id)}
                        className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-rose-500/50 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-white text-xs font-bold transition-all shadow-[0_0_10px_rgba(244,63,94,0.2)] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>DISCARD</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                    Select a memory from the list to view provenance and details.
                  </div>
                )}
              </div>
            </>
          )}

          {/* 5. RESEARCH MEMORY: SEPARATE VIEW/FILTER FOR RESEARCH FINDINGS */}
          {viewMode === 'research' && (
            <>
              {/* Research List Left Column */}
              <div className="w-full md:w-5/12 border-r border-slate-800/80 overflow-y-auto p-2.5 space-y-2 scrollbar-thin scrollbar-thumb-indigo-500/20 min-h-0">
                {researchItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-slate-400 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-indigo-400/60" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                        No research findings yet.
                      </h4>
                      <p className="text-xs text-slate-400 max-w-xs">
                        Market research, competitor analysis, and empirical findings gather automatically when autonomous research workers or research tools execute.
                      </p>
                    </div>
                  </div>
                ) : filteredResearch.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-slate-500 text-center space-y-2">
                    <FolderOpen className="w-8 h-8 opacity-40" />
                    <span className="text-xs">No research findings matching query.</span>
                  </div>
                ) : (
                  filteredResearch.map((item) => {
                    const isSelected = selectedResearch?.id === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedResearchId(item.id)}
                        className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all duration-150 space-y-1.5 ${
                          isSelected
                            ? 'bg-indigo-950/50 border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.25)] ring-1 ring-indigo-400/40'
                            : 'bg-slate-950/70 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-extrabold uppercase tracking-wider text-indigo-400">
                            RESEARCH TOPIC
                          </span>
                          <div className="flex items-center space-x-1">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[8px] font-bold ${
                                item.confidence === 'VERIFIED'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                              }`}
                            >
                              {item.confidence}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-slate-900 text-cyan-300 border border-cyan-500/30 text-[8px] font-bold">
                              {item.relevance}% RELEVANT
                            </span>
                          </div>
                        </div>

                        <h4 className="font-bold text-white text-xs">{item.topic}</h4>
                        <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                          {item.finding}
                        </p>

                        <div className="flex items-center justify-between text-[9px] text-slate-500 pt-1.5 border-t border-slate-800/60">
                          <span className="truncate max-w-[150px]">Src: {item.source.sourceName}</span>
                          <span>{item.dateResearched}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Research Detail Right Column */}
              <div className="flex-1 overflow-y-auto p-4 bg-[#020510] space-y-4 scrollbar-thin scrollbar-thumb-indigo-500/20 min-h-0">
                {selectedResearch ? (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                          EMPIRICAL RESEARCH FINDING
                        </span>
                        <span className="text-[10px] text-slate-600">•</span>
                        <span className="text-[10px] text-slate-400">ID: {selectedResearch.id}</span>
                      </div>
                      <h3 className="text-lg font-bold text-white mt-1">{selectedResearch.topic}</h3>
                    </div>

                    {/* Stats & Confidence */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                      <div>
                        <span className="text-[9px] text-slate-500 font-bold uppercase block">CONFIDENCE</span>
                        <span className="font-bold text-emerald-400">{selectedResearch.confidence}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 font-bold uppercase block">RELEVANCE</span>
                        <span className="font-bold text-cyan-300">{selectedResearch.relevance}%</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 font-bold uppercase block">DATE</span>
                        <span className="font-bold text-slate-300">{selectedResearch.dateResearched}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 font-bold uppercase block">VERDICT</span>
                        <span className="font-bold text-indigo-300">
                          {selectedResearch.filterVerdict?.action || 'KEPT'}
                        </span>
                      </div>
                    </div>

                    {/* Finding Box */}
                    <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        VERIFIED FINDING
                      </span>
                      <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {selectedResearch.finding}
                      </p>
                    </div>

                    {/* Evidence Snippet */}
                    {selectedResearch.evidence && (
                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">
                          DOCUMENTED EVIDENCE
                        </span>
                        <p className="text-xs text-slate-300 leading-relaxed font-mono">
                          {selectedResearch.evidence}
                        </p>
                      </div>
                    )}

                    {/* Provenance */}
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                        SOURCE & ORIGIN
                      </span>
                      <div className="space-y-1 text-[11px] text-slate-400">
                        <div>
                          <span className="text-slate-500">Source:</span>{' '}
                          <span className="text-slate-200 font-semibold">{selectedResearch.source.sourceName}</span>
                        </div>
                        {selectedResearch.source.sourceUrl && (
                          <div className="flex items-center space-x-1">
                            <ExternalLink className="w-3 h-3 text-cyan-400 shrink-0" />
                            <a
                              href={selectedResearch.source.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyan-400 hover:underline truncate"
                            >
                              {selectedResearch.source.sourceUrl}
                            </a>
                          </div>
                        )}
                        <div>
                          <span className="text-slate-500">Assigned Worker:</span>{' '}
                          <span className="text-cyan-300">{selectedResearch.relatedWorker || 'Research Specialist'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                    Select a research finding to view empirical documentation.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const WorldMemoryCore = WorldMemoryModal;
