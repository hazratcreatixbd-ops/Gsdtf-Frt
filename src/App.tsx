/**
 * FRIDAY AI Assistant — Mobile First Interface
 * Fullscreen futuristic dark UI with red/blue glow, large visual core, and audio-reactive animations.
 */

import { useState, useEffect } from 'react';
import { useFridayVoice } from './hooks/useFridayVoice';
import { FridayCore } from './components/FridayCore';
import { StateIndicator } from './components/StateIndicator';
import { WaveformVisualizer } from './components/WaveformVisualizer';
import { ControlBar } from './components/ControlBar';
import { ToolActionCard } from './components/ToolActionCard';
import { SettingsModal } from './components/SettingsModal';
import { MemoryTasksModal } from './components/MemoryTasksModal';
import { WorkflowModal } from './components/WorkflowModal';
import { InAppBrowser } from './components/InAppBrowser';
import { DeviceControlDrawer } from './components/DeviceControlDrawer';
import { ActionPreviewModal } from './components/ActionPreviewModal';
import { BusinessDashboardModal, DashboardTab } from './components/BusinessDashboardModal';
import { AgentOrchestratorModal } from './components/AgentOrchestratorModal';
import { BusinessWorkflowManagerModal } from './components/BusinessWorkflowManagerModal';
import { LiveMobileResultModal } from './components/LiveMobileResultModal';
import { LiveMobileActivityDock } from './components/LiveMobileActivityDock';
import { WorldShell } from './world/components/WorldShell';
import { toolManager } from './services/ToolManager';
import { androidBridge } from './services/AndroidBridge/AndroidBridge';
import { ActionPreviewItem } from './types/android';
import { AlertCircle, RefreshCw, Send, Mic } from 'lucide-react';

export default function App() {
  const {
    state,
    userVolume,
    fridayVolume,
    isMuted,
    errorMessage,
    recentTool,
    memories,
    tasks,
    removeMemory,
    toggleTaskStatus,
    removeTask,
    connect,
    disconnect,
    toggleMute,
    interrupt,
    clearError,
    sendTextInput,
    retryMicrophone,
  } = useFridayVoice();

  const [textInput, setTextInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showArchives, setShowArchives] = useState(false);
  const [showDeviceControl, setShowDeviceControl] = useState(false);
  const [showBusinessDashboard, setShowBusinessDashboard] = useState(false);
  const [showAgentOrchestrator, setShowAgentOrchestrator] = useState(false);
  const [showBusinessWorkflowManager, setShowBusinessWorkflowManager] = useState(false);
  const [showLiveMobileResults, setShowLiveMobileResults] = useState(false);
  const [interfaceMode, setInterfaceMode] = useState<'home' | 'world'>(() => {
    if (typeof window !== 'undefined') {
      const search = new URLSearchParams(window.location.search);
      if (search.get('mode') === 'world' || window.location.hash === '#world') {
        return 'world';
      }
      try {
        const saved = localStorage.getItem('friday_interface_mode');
        if (saved === 'world') {
          return 'world';
        }
      } catch {
        // ignore
      }
    }
    return 'home';
  });

  const handleOpenWorld = () => {
    setInterfaceMode('world');
    try {
      localStorage.setItem('friday_interface_mode', 'world');
      if (window.location.hash !== '#world') {
        window.location.hash = '#world';
      }
    } catch {
      // ignore
    }
  };

  const handleExitWorld = () => {
    setInterfaceMode('home');
    try {
      localStorage.setItem('friday_interface_mode', 'home');
      if (window.location.hash === '#world') {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    } catch {
      // ignore
    }
  };

  const [businessTab, setBusinessTab] = useState<DashboardTab>('overview');
  const [activePreview, setActivePreview] = useState<ActionPreviewItem | null>(null);
  const [modalType, setModalType] = useState<'website' | 'outreach' | 'security' | 'media' | 'files' | 'business' | 'workflow' | null>(null);
  const [modalData, setModalData] = useState<any>(null);

  // FRIDAY In-App Browser State
  const [isInAppBrowserOpen, setIsInAppBrowserOpen] = useState(false);
  const [inAppBrowserUrl, setInAppBrowserUrl] = useState('https://en.wikipedia.org');

  useEffect(() => {
    const unsubBrowser = toolManager.onInAppBrowser((open, url) => {
      setIsInAppBrowserOpen(open);
      if (url) {
        setInAppBrowserUrl(url);
      }
    });

    const unsubPreviews = androidBridge.subscribePreviews((previews) => {
      const pending = previews.find((p) => p.status === 'pending_confirmation');
      setActivePreview(pending || null);
    });

    const unsubInterfaceMode = toolManager.onInterfaceMode((mode) => {
      if (mode === 'world') {
        handleOpenWorld();
      } else {
        handleExitWorld();
      }
    });

    const handleHashChange = () => {
      if (window.location.hash === '#world') {
        setInterfaceMode('world');
      } else if (window.location.hash === '#home' || window.location.hash === '') {
        setInterfaceMode('home');
      }
    };
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      unsubBrowser();
      unsubPreviews();
      unsubInterfaceMode();
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const pendingTaskCount = tasks.filter((t) => t.status === 'pending').length;

  const getSubtext = () => {
    switch (state) {
      case 'speaking':
        return 'FRIDAY is speaking • Speak to interrupt';
      case 'listening':
        return isMuted ? 'Microphone muted' : 'Listening... speak naturally';
      case 'thinking':
        return 'Processing...';
      case 'connecting':
        return 'Connecting to Gemini Live...';
      case 'disconnected':
      default:
        return 'Tap the core or button to begin';
    }
  };

  // PART 11 — IMMERSIVE WORLD INTERFACE
  if (interfaceMode === 'world') {
    return (
      <div className="relative w-full h-[100dvh] overflow-hidden bg-[#020510]">
        <WorldShell
          state={state}
          isMuted={isMuted}
          userVolume={userVolume}
          fridayVolume={fridayVolume}
          onExitWorld={handleExitWorld}
          onCoreClick={() => {
            if (state === 'disconnected') {
              connect();
            } else if (state === 'speaking') {
              interrupt();
            }
          }}
          onToggleMute={toggleMute}
          onSendText={(text) => {
            if (state === 'disconnected') {
              connect().then(() => {
                setTimeout(() => sendTextInput(text), 600);
              });
            } else {
              sendTextInput(text);
            }
          }}
          onOpenSettings={() => setShowSettings(true)}
          onOpenBusinessWorkflowManager={() => setShowBusinessWorkflowManager(true)}
          onOpenLiveResults={() => setShowLiveMobileResults(true)}
        />

        {/* Specs / About Modal */}
        <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

        {/* Memory Core & Task Archives Modal */}
        <MemoryTasksModal
          isOpen={showArchives}
          onClose={() => setShowArchives(false)}
          memories={memories}
          tasks={tasks}
          onToggleTask={toggleTaskStatus}
          onDeleteTask={removeTask}
          onDeleteMemory={removeMemory}
        />

        {/* Part 5: Interactive Workflow & Artifact Review Modal */}
        <WorkflowModal
          isOpen={!!modalType}
          type={modalType}
          data={modalData}
          onClose={() => {
            setModalType(null);
            setModalData(null);
          }}
        />

        {/* Part 6: Device Control Drawer & Action Preview Confirmation */}
        <DeviceControlDrawer
          isOpen={showDeviceControl}
          onClose={() => setShowDeviceControl(false)}
        />

        <ActionPreviewModal
          preview={activePreview}
          onConfirm={(id) => androidBridge.confirmAction(id)}
          onCancel={(id) => androidBridge.cancelAction(id)}
        />

        {/* Part 7: Business Intelligence & Planning Engine Modal */}
        <BusinessDashboardModal
          isOpen={showBusinessDashboard}
          onClose={() => setShowBusinessDashboard(false)}
          initialTab={businessTab}
        />

        {/* Part 9: Agent & Worker Orchestration Modal */}
        <AgentOrchestratorModal
          isOpen={showAgentOrchestrator}
          onClose={() => setShowAgentOrchestrator(false)}
        />

        {/* Part 10: Autonomous Business Manager & Workflow Engine Modal */}
        <BusinessWorkflowManagerModal
          isOpen={showBusinessWorkflowManager}
          onClose={() => setShowBusinessWorkflowManager(false)}
        />

        {/* Part 14: Live Mobile Result & Real Execution Pipelines Modal */}
        <LiveMobileResultModal
          isOpen={showLiveMobileResults}
          onClose={() => setShowLiveMobileResults(false)}
          onOpenInAppBrowser={(url) => {
            handleExitWorld();
            setInAppBrowserUrl(url);
            setIsInAppBrowserOpen(true);
          }}
        />
      </div>
    );
  }

  return (
    <div className="relative flex flex-col justify-between h-[100dvh] w-full bg-[#030712] text-slate-100 font-sans overflow-hidden select-none">
      {/* Futuristic Background Atmospheric Mesh with Red & Blue Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Subtle Upper Blue Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[340px] sm:w-[480px] h-[340px] bg-cyan-500/10 rounded-full blur-[100px]" />
        {/* Subtle Lower Red Glow */}
        <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-[340px] sm:w-[480px] h-[340px] bg-rose-600/10 rounded-full blur-[100px]" />
        {/* Ambient Radial Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,#030712_85%)]" />
        {/* Subtle Cybernetic Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0, 195, 255, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 38, 75, 0.2) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Top Header Status */}
      <StateIndicator
        state={state}
        taskCount={pendingTaskCount}
        onOpenSettings={() => setShowSettings(true)}
        onOpenArchives={() => setShowArchives(true)}
        onOpenDeviceControl={() => setShowDeviceControl(true)}
        onOpenBusinessDashboard={() => {
          setBusinessTab('overview');
          setShowBusinessDashboard(true);
        }}
        onOpenAgentOrchestrator={() => setShowAgentOrchestrator(true)}
        onOpenBusinessWorkflowManager={() => setShowBusinessWorkflowManager(true)}
        onOpenLiveResults={() => setShowLiveMobileResults(true)}
        onOpenWorld={handleOpenWorld}
      />

      {/* Error notification banner if any */}
      {errorMessage && (
        <div className="w-full max-w-sm mx-auto px-4 z-30">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-rose-950/80 border border-rose-500/40 backdrop-blur-xl text-rose-200 text-xs shadow-lg animate-in fade-in duration-200">
            <div className="flex items-center space-x-2 min-w-0">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="truncate">{errorMessage}</span>
            </div>
            <div className="flex items-center space-x-1 shrink-0 ml-2">
              {errorMessage.toLowerCase().includes('mic') && (
                <button
                  onClick={async () => {
                    const ok = await retryMicrophone();
                    if (!ok && state === 'disconnected') {
                      connect();
                    }
                  }}
                  className="px-2 py-0.5 rounded-lg bg-rose-500/30 hover:bg-rose-500/50 text-rose-100 font-mono text-[10px] border border-rose-500/40 flex items-center space-x-1 transition-all"
                  title="Grant Microphone Access"
                >
                  <Mic className="w-3 h-3 text-rose-300" />
                  <span>Allow Mic</span>
                </button>
              )}
              <button
                onClick={() => {
                  clearError();
                  connect();
                }}
                className="p-1 rounded hover:bg-rose-900/50 text-rose-300"
                title="Retry"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Minimal Tool Notification (e.g. When FRIDAY executes an action or workflow) */}
      <ToolActionCard
        toolItem={recentTool}
        onDismiss={() => {}}
        onOpenModal={(type, data) => {
          setModalType(type);
          setModalData(data);
        }}
      />

      {/* Main Center Area: Large FRIDAY AI Core/Orb + Waveform OR FRIDAY In-App Browser */}
      <main className="flex-1 flex flex-col items-center justify-center px-3 sm:px-4 z-10 my-auto w-full max-w-xl mx-auto overflow-hidden">
        {isInAppBrowserOpen ? (
          <InAppBrowser
            initialUrl={inAppBrowserUrl}
            onClose={() => setIsInAppBrowserOpen(false)}
            onOpenExternal={(url) => {
              window.open(url, '_blank', 'noopener,noreferrer');
            }}
          />
        ) : (
          <div className="flex flex-col items-center w-full max-w-xs sm:max-w-sm">
            {/* Large Central FRIDAY Core Orb */}
            <FridayCore
              state={state}
              userVolume={userVolume}
              fridayVolume={fridayVolume}
              isMuted={isMuted}
              onClick={() => {
                if (state === 'disconnected') {
                  connect();
                } else if (state === 'speaking') {
                  interrupt();
                }
              }}
            />

            {/* Minimal State Description */}
            <div className="mt-4 text-center">
              <p className="text-xs sm:text-sm font-mono tracking-wider text-slate-300">
                {getSubtext()}
              </p>
            </div>

            {/* Dynamic Audio-Reactive Waveform */}
            <div className="mt-4 w-full max-w-[280px]">
              <WaveformVisualizer
                state={state}
                userVolume={userVolume}
                fridayVolume={fridayVolume}
              />
            </div>
          </div>
        )}
      </main>

      {/* Persistent Part 14 Live Mobile Result & Activity Center Dock */}
      <LiveMobileActivityDock
        onOpenResultCenter={() => setShowLiveMobileResults(true)}
        onOpenAssetInPhone={(url) => {
          setInAppBrowserUrl(url);
          setIsInAppBrowserOpen(true);
        }}
      />

      {/* Text Command Input Bar (Supports Silent & Permission-Denied environments) */}
      <div className="w-full max-w-sm mx-auto px-6 mb-2 z-20">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!textInput.trim()) return;
            const text = textInput.trim();
            setTextInput('');
            if (state === 'disconnected') {
              connect().then(() => {
                setTimeout(() => sendTextInput(text), 600);
              });
            } else {
              sendTextInput(text);
            }
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={
              state === 'disconnected'
                ? 'Type command or tap Start...'
                : 'Type command or speak to FRIDAY...'
            }
            className="w-full pl-4 pr-10 py-2 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-200 placeholder-slate-500 focus:border-cyan-500/60 focus:bg-slate-900 outline-none backdrop-blur-xl transition-all shadow-inner"
          />
          <button
            type="submit"
            disabled={!textInput.trim()}
            className={`absolute right-1.5 p-1.5 rounded-full transition-all ${
              textInput.trim()
                ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 active:scale-95 shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Send text command to FRIDAY"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* Mobile-First Floating Control Dock */}
      <ControlBar
        state={state}
        isMuted={isMuted}
        onConnect={connect}
        onDisconnect={disconnect}
        onToggleMute={toggleMute}
        onInterrupt={interrupt}
      />

      {/* Specs / About Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Memory Core & Task Archives Modal */}
      <MemoryTasksModal
        isOpen={showArchives}
        onClose={() => setShowArchives(false)}
        memories={memories}
        tasks={tasks}
        onToggleTask={toggleTaskStatus}
        onDeleteTask={removeTask}
        onDeleteMemory={removeMemory}
      />

      {/* Part 5: Interactive Workflow & Artifact Review Modal */}
      <WorkflowModal
        isOpen={!!modalType}
        type={modalType}
        data={modalData}
        onClose={() => {
          setModalType(null);
          setModalData(null);
        }}
      />

      {/* Part 6: Device Control Drawer & Action Preview Confirmation */}
      <DeviceControlDrawer
        isOpen={showDeviceControl}
        onClose={() => setShowDeviceControl(false)}
      />

      <ActionPreviewModal
        preview={activePreview}
        onConfirm={(id) => androidBridge.confirmAction(id)}
        onCancel={(id) => androidBridge.cancelAction(id)}
      />

      {/* Part 7: Business Intelligence & Planning Engine Modal */}
      <BusinessDashboardModal
        isOpen={showBusinessDashboard}
        onClose={() => setShowBusinessDashboard(false)}
        initialTab={businessTab}
      />

      {/* Part 9: Agent & Worker Orchestration Modal */}
      <AgentOrchestratorModal
        isOpen={showAgentOrchestrator}
        onClose={() => setShowAgentOrchestrator(false)}
      />

      {/* Part 10: Autonomous Business Manager & Workflow Engine Modal */}
      <BusinessWorkflowManagerModal
        isOpen={showBusinessWorkflowManager}
        onClose={() => setShowBusinessWorkflowManager(false)}
      />

      {/* Part 14: Live Mobile Result & Real Execution Pipelines Modal */}
      <LiveMobileResultModal
        isOpen={showLiveMobileResults}
        onClose={() => setShowLiveMobileResults(false)}
        onOpenInAppBrowser={(url) => {
          setInAppBrowserUrl(url);
          setIsInAppBrowserOpen(true);
        }}
      />
    </div>
  );
}
