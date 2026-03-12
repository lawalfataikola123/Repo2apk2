import { useCallback } from 'react';
import { Smartphone, Shield, Zap, GitBranch } from 'lucide-react';
import BuildForm from '../components/BuildForm.jsx';
import TerminalLog from '../components/TerminalLog.jsx';
import BuildProgress from '../components/BuildProgress.jsx';
import DownloadButton from '../components/DownloadButton.jsx';
import { useBuild } from '../hooks/useBuild.js';
import { useBuildSocket } from '../hooks/useSocket.js';
import { buildApi } from '../utils/api.js';

const FEATURES = [
  { icon: Smartphone, label: 'Multi-Framework', desc: 'Native Android, Flutter & React Native' },
  { icon: Zap, label: 'Real-time Logs', desc: 'Watch your build live via WebSocket' },
  { icon: Shield, label: 'Secure Builds', desc: 'Isolated Docker environment' },
  { icon: GitBranch, label: 'Auto Detect', desc: 'Automatically detects project type' }
];

const ACTIVE_STATUSES = ['queued', 'cloning', 'detecting', 'building', 'packaging'];

export default function HomePage() {
  const build = useBuild();

  const isBuilding = ACTIVE_STATUSES.includes(build.status);
  const isActive = isBuilding;

  // Connect to socket for real-time updates
  useBuildSocket(build.buildId, {
    onLog: build.addLog,
    onStatus: build.handleSocketStatus,
    onComplete: build.handleSocketComplete,
    onError: build.handleSocketError,
    onDetected: build.handleSocketDetected
  });

  const handleSubmit = useCallback(async (repoUrl, buildType) => {
    try {
      await build.startBuild(repoUrl, buildType);
    } catch (err) {
      build.handleSocketError({ error: err.message });
    }
  }, [build]);

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Hero Header */}
        <div className="text-center mb-12">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 text-xs font-medium font-display"
            style={{
              background: 'rgba(0, 255, 136, 0.06)',
              border: '1px solid rgba(0, 255, 136, 0.2)',
              color: '#00ff88'
            }}>
            <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
            Production-Ready APK Builder
          </div>

          {/* Title */}
          <h1 className="text-5xl sm:text-6xl font-bold mb-4 tracking-tight font-display">
            <span className="text-white">Repo</span>
            <span className="gradient-text">2APK</span>
          </h1>

          <p className="text-lg text-gray-400 max-w-xl mx-auto leading-relaxed">
            Convert any public GitHub repository into a downloadable Android APK.
            Supports <span className="text-gray-300">Native Android</span>,{' '}
            <span className="text-gray-300">Flutter</span>, and{' '}
            <span className="text-gray-300">React Native</span> projects.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-xs text-gray-400 transition-all duration-200 hover:text-gray-200"
                style={{
                  background: 'rgba(22, 27, 39, 0.8)',
                  border: '1px solid rgba(255,255,255,0.06)'
                }}
                title={desc}
              >
                <Icon size={13} className="text-neon-green" />
                <span className="font-display font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Panel: Controls */}
          <div className="lg:col-span-2 space-y-6">
            {/* Build Form */}
            <div className="glass-panel rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-gray-300 mb-5 font-display flex items-center gap-2">
                <Zap size={14} className="text-neon-green" />
                Start Build
              </h2>
              <BuildForm onSubmit={handleSubmit} isBuilding={isBuilding} />
            </div>

            {/* Download / Error */}
            {(build.status === 'success' || build.status === 'failed') && (
              <div className="glass-panel rounded-2xl p-6">
                <DownloadButton
                  status={build.status}
                  downloadUrl={build.downloadUrl ? `/api${build.downloadUrl}` : null}
                  error={build.error}
                  onReset={build.reset}
                />
              </div>
            )}

            {/* Build Info */}
            {build.buildId && (
              <div className="glass-panel rounded-2xl p-4 border border-white/5">
                <p className="text-xs text-gray-600 font-mono mb-1">Build ID</p>
                <p className="text-xs text-gray-400 font-mono break-all">{build.buildId}</p>
              </div>
            )}
          </div>

          {/* Right Panel: Terminal + Progress */}
          <div className="lg:col-span-3 space-y-5">
            {/* Progress tracker */}
            {build.status !== 'idle' && (
              <div className="glass-panel rounded-2xl p-5">
                <BuildProgress
                  status={build.status}
                  progress={build.progress}
                  projectType={build.projectType}
                  apkSizeMB={build.apkSizeMB}
                />
              </div>
            )}

            {/* Terminal */}
            <TerminalLog
              logs={build.logs}
              status={build.status}
              isActive={isActive}
            />
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-12 text-center text-xs text-gray-700 space-y-1">
          <p>Builds run in isolated Docker containers • APKs expire after 1 hour • Max repo size: 500MB</p>
          <p>Only public GitHub repositories are supported</p>
        </div>
      </div>
    </div>
  );
}
