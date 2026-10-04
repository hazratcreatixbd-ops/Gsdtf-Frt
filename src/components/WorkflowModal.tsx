import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  Globe,
  ShieldCheck,
  Send,
  Download,
  Video,
  FolderTree,
  Building2,
  Phone,
  MapPin,
  AlertTriangle,
} from 'lucide-react';

interface WorkflowModalProps {
  isOpen: boolean;
  type: 'website' | 'outreach' | 'security' | 'media' | 'files' | 'business' | 'workflow' | null;
  data: any;
  onClose: () => void;
}

export const WorkflowModal: React.FC<WorkflowModalProps> = ({ isOpen, type, data, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [previewTab, setPreviewTab] = useState<'preview' | 'code'>('preview');
  const [confirmedSend, setConfirmedSend] = useState(false);

  if (!isOpen || !data) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[88vh] flex flex-col rounded-3xl border border-cyan-500/40 bg-slate-950 text-slate-100 shadow-[0_20px_60px_rgba(6,182,212,0.3)] overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-rose-500 to-cyan-500" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center space-x-2.5">
            {type === 'website' && <Globe className="w-5 h-5 text-amber-400" />}
            {type === 'outreach' && <Send className="w-5 h-5 text-sky-400" />}
            {type === 'security' && <ShieldCheck className="w-5 h-5 text-emerald-400" />}
            {type === 'media' && <Video className="w-5 h-5 text-rose-400" />}
            {type === 'files' && <FolderTree className="w-5 h-5 text-cyan-400" />}
            {type === 'business' && <Building2 className="w-5 h-5 text-amber-400" />}

            <div>
              <h2 className="text-base font-bold tracking-tight text-white">
                {type === 'website' && 'Website Plan & Interactive Preview'}
                {type === 'outreach' && 'Outreach Message Confirmation'}
                {type === 'security' && 'Defensive Security Audit Report'}
                {type === 'media' && 'Video Publishing & SEO Package'}
                {type === 'files' && 'File & Project Architecture Plan'}
                {type === 'business' && 'Public Business Research Directory'}
                {type === 'workflow' && 'Workflow Progress & Trace'}
              </h2>
              <p className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider">
                FRIDAY Autonomous Assistant Engine
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm text-slate-300">
          {/* 1. Website Preview Workflow */}
          {type === 'website' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">{data.businessName}</h3>
                  <p className="text-xs text-slate-400">{data.location} • {data.tagline}</p>
                </div>
                <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
                  <button
                    onClick={() => setPreviewTab('preview')}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                      previewTab === 'preview' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'
                    }`}
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => setPreviewTab('code')}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                      previewTab === 'code' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'
                    }`}
                  >
                    HTML Code
                  </button>
                </div>
              </div>

              {previewTab === 'preview' ? (
                <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900 h-80 relative shadow-inner">
                  <iframe
                    title="Website Preview"
                    srcDoc={data.htmlCode}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts"
                  />
                </div>
              ) : (
                <div className="relative">
                  <pre className="p-3 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs overflow-x-auto max-h-80 text-cyan-200">
                    {data.htmlCode}
                  </pre>
                  <button
                    onClick={() => handleCopy(data.htmlCode)}
                    className="absolute top-2.5 right-2.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-cyan-300 flex items-center space-x-1"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              )}

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Draft Review Status: Not published automatically. Confirmation required.</span>
                </div>
                <button
                  onClick={() => {
                    const blob = new Blob([data.htmlCode], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${data.businessName.toLowerCase().replace(/\s+/g, '_')}_website.html`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-medium border border-amber-500/40 flex items-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export HTML</span>
                </button>
              </div>
            </div>
          )}

          {/* 2. Outreach Workflow */}
          {type === 'outreach' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-400 uppercase">Channel</span>
                  <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-semibold uppercase font-mono">
                    {data.channel}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-400 uppercase">Recipient</span>
                  <span className="font-mono text-white font-medium">{data.recipient}</span>
                </div>
                {data.subject && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-400 uppercase">Subject</span>
                    <span className="text-slate-200 font-medium">{data.subject}</span>
                  </div>
                )}
                <div>
                  <div className="text-xs font-mono text-slate-400 uppercase mb-1">Message Preview</div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-sans text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {data.message}
                  </div>
                </div>
              </div>

              {/* Strict explicit user confirmation */}
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2">
                <div className="flex items-center space-x-2 text-xs text-rose-300">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span className="font-medium">
                    Safety Rule: FRIDAY never sends messages automatically. Explicit confirmation is required.
                  </span>
                </div>
                <div className="flex items-center space-x-3 pt-1">
                  <button
                    onClick={() => {
                      setConfirmedSend(true);
                      if (data.link) {
                        window.open(data.link, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-lg shadow-sky-500/20"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Confirm & Launch in {data.channel === 'whatsapp' ? 'WhatsApp' : 'Mail Client'}</span>
                  </button>
                  <button
                    onClick={() => handleCopy(data.message)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center space-x-1.5 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy Text</span>
                  </button>
                </div>
                {confirmedSend && (
                  <p className="text-[11px] font-mono text-emerald-400 text-center">
                    ✓ Confirmed by user and dispatched to client app.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 3. Security Audit Workflow */}
          {type === 'security' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <div>
                  <span className="text-xs font-mono text-slate-400 uppercase">Target Domain</span>
                  <h3 className="text-base font-bold text-white truncate max-w-[240px]">{data.targetUrl}</h3>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <span className="text-xs font-mono text-slate-400">Score</span>
                    <div className="text-lg font-mono font-bold text-cyan-300">{data.score}/100</div>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-xl font-bold font-mono">
                    {data.grade}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-mono uppercase text-slate-400 tracking-wider mb-2">
                  Security Headers Verification
                </h4>
                <div className="space-y-2">
                  {data.headersChecked?.map((h: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start justify-between">
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-white flex items-center space-x-2">
                          <span>{h.name}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                              h.status === 'pass'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {h.status === 'pass' ? 'ENFORCED' : 'RECOMMENDED'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{h.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-mono uppercase text-slate-400 tracking-wider mb-2">
                  Remediation Action Checklist
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-300 font-sans">
                  {data.remediationChecklist?.map((c: string, idx: number) => (
                    <li key={idx} className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* 4. Video Media Publishing Package */}
          {type === 'media' && (
            <div className="space-y-4">
              <div>
                <span className="text-xs font-mono text-slate-400 uppercase">Main Topic</span>
                <h3 className="text-base font-bold text-white">{data.topic}</h3>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-mono text-slate-400 uppercase">High-Converting Titles</span>
                {data.titleOptions?.map((t: string, i: number) => (
                  <div
                    key={i}
                    onClick={() => handleCopy(t)}
                    className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 cursor-pointer flex items-center justify-between text-xs text-slate-200 transition-colors"
                  >
                    <span>{t}</span>
                    <Copy className="w-3.5 h-3.5 text-slate-400 hover:text-cyan-300 shrink-0 ml-2" />
                  </div>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-slate-400 uppercase">SEO Description & Timestamps</span>
                  <button
                    onClick={() => handleCopy(data.description)}
                    className="text-xs font-mono text-cyan-300 hover:underline flex items-center space-x-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {data.description}
                </pre>
              </div>

              <div>
                <span className="text-xs font-mono text-slate-400 uppercase">Tags & Keywords</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {data.tags?.map((tag: string, i: number) => (
                    <span key={i} className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-300">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 5. Public Business Directory Research */}
          {type === 'business' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Publicly verified businesses found. No private data accessed.
              </p>
              {Array.isArray(data.businesses) &&
                data.businesses.map((b: any, i: number) => (
                  <div key={i} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-white">{b.name}</h4>
                        <span className="text-[11px] font-mono text-cyan-300">{b.category}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                        VERIFIED PUBLIC
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-slate-300">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>{b.address}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="font-mono text-cyan-300">{b.phone}</span>
                      </div>
                      {b.website && (
                        <div className="flex items-center space-x-2">
                          <Globe className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <a
                            href={b.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:underline flex items-center space-x-1"
                          >
                            <span>{b.website}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-800/80">
                      <p className="text-xs text-slate-400 italic">"{b.description}"</p>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* 6. File Organization Plan */}
          {type === 'files' && (
            <div className="space-y-4">
              <div>
                <span className="text-xs font-mono text-slate-400 uppercase">Project Plan</span>
                <h3 className="text-base font-bold text-white">{data.projectName}</h3>
                <p className="text-xs text-slate-400 mt-1">Naming format: {data.namingConvention}</p>
              </div>

              <div>
                <span className="text-xs font-mono text-slate-400 uppercase mb-2 block">
                  Directory Architecture
                </span>
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs text-cyan-300 space-y-1 max-h-60 overflow-y-auto">
                  {data.folders?.map((f: string, i: number) => (
                    <div key={i} className="flex items-center space-x-2">
                      <FolderTree className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{f}/</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    const text = `PROJECT: ${data.projectName}\nNAMING CONVENTION: ${data.namingConvention}\n\nFOLDERS:\n${data.folders?.map((f: string) => `- ${f}/`).join('\n')}`;
                    const blob = new Blob([text], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${data.projectName}_structure_manifest.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-medium flex items-center space-x-2 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Manifest</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
