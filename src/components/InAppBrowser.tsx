import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  ExternalLink,
  X,
  Globe,
  Search,
  Shield,
  AlertCircle,
  Compass,
} from 'lucide-react';

interface InAppBrowserProps {
  initialUrl?: string;
  onClose: () => void;
  onOpenExternal: (url: string) => void;
}

export const InAppBrowser: React.FC<InAppBrowserProps> = ({
  initialUrl = 'https://en.wikipedia.org',
  onClose,
  onOpenExternal,
}) => {
  const [history, setHistory] = useState<string[]>([initialUrl]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [key, setKey] = useState(0);
  const [showSecurityNotice, setShowSecurityNotice] = useState(true);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const currentUrl = history[historyIndex] || initialUrl;

  useEffect(() => {
    setInputUrl(currentUrl);
  }, [currentUrl]);

  // Handle URL navigation
  const navigateTo = (urlOrQuery: string) => {
    let clean = urlOrQuery.trim();
    if (!clean) return;

    let target = clean;
    // Check if it's a search term or a domain
    if (!clean.includes('.') || clean.includes(' ')) {
      // Use DuckDuckGo HTML search which is iframe-friendly or standard search
      target = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(clean)}`;
    } else {
      if (!target.startsWith('http://') && !target.startsWith('https://')) {
        target = 'https://' + target;
      }
    }

    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(target);
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    setIsLoading(true);
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setIsLoading(true);
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setIsLoading(true);
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setKey((prev) => prev + 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigateTo(inputUrl);
  };

  return (
    <div className="w-full h-full max-h-[72dvh] sm:max-h-[76dvh] flex flex-col rounded-3xl border border-cyan-500/40 bg-slate-950/95 backdrop-blur-2xl shadow-[0_20px_60px_rgba(6,182,212,0.25)] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      {/* Top Futuristic Browser Toolbar */}
      <div className="flex flex-col border-b border-slate-800/80 bg-slate-900/90 px-3 py-2.5 space-y-2 select-none">
        {/* Header Row: Navigation & Controls */}
        <div className="flex items-center justify-between space-x-2">
          {/* Back / Forward / Refresh controls */}
          <div className="flex items-center space-x-1 shrink-0">
            <button
              onClick={handleBack}
              disabled={historyIndex <= 0}
              className={`p-1.5 rounded-xl transition-colors ${
                historyIndex > 0
                  ? 'text-cyan-300 hover:bg-cyan-500/20 active:scale-95'
                  : 'text-slate-600 cursor-not-allowed'
              }`}
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleForward}
              disabled={historyIndex >= history.length - 1}
              className={`p-1.5 rounded-xl transition-colors ${
                historyIndex < history.length - 1
                  ? 'text-cyan-300 hover:bg-cyan-500/20 active:scale-95'
                  : 'text-slate-600 cursor-not-allowed'
              }`}
              title="Forward"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleRefresh}
              className={`p-1.5 rounded-xl text-cyan-300 hover:bg-cyan-500/20 active:scale-95 transition-colors ${
                isLoading ? 'animate-spin text-cyan-400' : ''
              }`}
              title="Refresh"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          {/* URL & Search Input Bar */}
          <form onSubmit={handleSubmit} className="flex-1 min-w-0">
            <div className="relative flex items-center w-full">
              <div className="absolute left-2.5 text-cyan-400 flex items-center pointer-events-none">
                {currentUrl.startsWith('https://') ? (
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="Search or enter web address..."
                className="w-full pl-8 pr-8 py-1.5 rounded-xl bg-slate-950/80 border border-slate-700/80 focus:border-cyan-400 text-xs font-mono text-slate-200 placeholder-slate-500 outline-none transition-all truncate"
              />
              <button
                type="submit"
                className="absolute right-2 text-slate-400 hover:text-cyan-300 transition-colors"
                title="Go"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {/* External Browser & Close Controls */}
          <div className="flex items-center space-x-1 shrink-0">
            <button
              onClick={() => onOpenExternal(currentUrl)}
              className="p-1.5 rounded-xl text-sky-400 hover:bg-sky-500/20 active:scale-95 transition-colors"
              title="Open in Mobile's Default Browser"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-rose-400 hover:bg-rose-500/20 active:scale-95 transition-colors"
              title="Close In-App Browser"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Launch / Preset Navigation Chips */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5 text-[11px] font-mono">
          <span className="text-slate-500 shrink-0 flex items-center space-x-1">
            <Compass className="w-3 h-3 text-cyan-400" />
            <span>Fast:</span>
          </span>
          <button
            onClick={() => navigateTo('https://en.wikipedia.org')}
            className="px-2 py-0.5 rounded-lg bg-slate-800/80 hover:bg-cyan-500/20 hover:text-cyan-300 border border-slate-700 text-slate-300 shrink-0 transition-colors"
          >
            Wikipedia
          </button>
          <button
            onClick={() => navigateTo('https://html.duckduckgo.com')}
            className="px-2 py-0.5 rounded-lg bg-slate-800/80 hover:bg-cyan-500/20 hover:text-cyan-300 border border-slate-700 text-slate-300 shrink-0 transition-colors"
          >
            DuckDuckGo
          </button>
          <button
            onClick={() => navigateTo('https://archive.org')}
            className="px-2 py-0.5 rounded-lg bg-slate-800/80 hover:bg-cyan-500/20 hover:text-cyan-300 border border-slate-700 text-slate-300 shrink-0 transition-colors"
          >
            Internet Archive
          </button>
          <button
            onClick={() => navigateTo('https://news.ycombinator.com')}
            className="px-2 py-0.5 rounded-lg bg-slate-800/80 hover:bg-cyan-500/20 hover:text-cyan-300 border border-slate-700 text-slate-300 shrink-0 transition-colors"
          >
            Hacker News
          </button>
        </div>
      </div>

      {/* CSP & Security Restriction Notice (Honest Technical Transparency) */}
      {showSecurityNotice && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-cyan-950/70 border-b border-cyan-800/40 text-[11px] text-cyan-200">
          <div className="flex items-center space-x-1.5 truncate">
            <AlertCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">
              Sites restricting iframes (X-Frame-Options/CSP) can be opened in phone browser.
            </span>
          </div>
          <div className="flex items-center space-x-2 shrink-0 ml-2">
            <button
              onClick={() => onOpenExternal(currentUrl)}
              className="font-semibold underline text-sky-300 hover:text-sky-200"
            >
              Open in Phone
            </button>
            <button
              onClick={() => setShowSecurityNotice(false)}
              className="text-cyan-400 hover:text-cyan-200 p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Main Web Page Display Area */}
      <div className="relative flex-1 w-full bg-slate-900/50 overflow-hidden">
        {isLoading && (
          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-cyan-400 via-rose-500 to-cyan-400 animate-pulse z-20" />
        )}

        <iframe
          key={key}
          ref={iframeRef}
          src={currentUrl}
          title="FRIDAY In-App Browser"
          className="w-full h-full border-0 bg-white"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
          onLoad={() => setIsLoading(false)}
          onError={() => setIsLoading(false)}
        />
      </div>

      {/* Bottom Status Info */}
      <div className="px-3 py-1.5 border-t border-slate-800/80 bg-slate-900/90 flex items-center justify-between text-[10px] font-mono text-slate-400">
        <span className="flex items-center space-x-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>FRIDAY In-App Web Engine</span>
        </span>
        <button
          onClick={() => onOpenExternal(currentUrl)}
          className="text-cyan-400 hover:underline flex items-center space-x-1"
        >
          <span>Phone Browser</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </button>
      </div>
    </div>
  );
};
