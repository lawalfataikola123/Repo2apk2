import { CheckCircle, Circle, Loader, XCircle, Clock } from 'lucide-react';

const STAGES = [
  { key: 'queued', label: 'Queued', desc: 'Build request accepted' },
  { key: 'cloning', label: 'Cloning', desc: 'Downloading repository' },
  { key: 'detecting', label: 'Detecting', desc: 'Identifying project type' },
  { key: 'building', label: 'Building', desc: 'Compiling source code' },
  { key: 'packaging', label: 'Packaging', desc: 'Creating APK file' },
  { key: 'success', label: 'Complete', desc: 'APK ready to download' }
];

const STATUS_ORDER = ['queued', 'cloning', 'detecting', 'building', 'packaging', 'success'];

function getStageState(stageKey, currentStatus, isFailed) {
  if (isFailed) {
    const currentIdx = STATUS_ORDER.indexOf(currentStatus.replace('failed', 'building'));
    const stageIdx = STATUS_ORDER.indexOf(stageKey);
    if (stageIdx < currentIdx) return 'done';
    if (stageIdx === currentIdx) return 'failed';
    return 'pending';
  }

  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  const stageIdx = STATUS_ORDER.indexOf(stageKey);

  if (stageIdx < currentIdx) return 'done';
  if (stageIdx === currentIdx) return 'active';
  return 'pending';
}

function StageIcon({ state }) {
  switch (state) {
    case 'done':
      return <CheckCircle size={16} className="text-neon-green" />;
    case 'active':
      return <Loader size={16} className="text-neon-blue animate-spin" />;
    case 'failed':
      return <XCircle size={16} className="text-red-400" />;
    default:
      return <Circle size={16} className="text-gray-700" />;
  }
}

export default function BuildProgress({ status, progress, projectType, apkSizeMB }) {
  if (status === 'idle') return null;

  const isFailed = status === 'failed';
  const isSuccess = status === 'success';

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-500 font-display uppercase tracking-wider">
            Progress
          </span>
          <span className="text-xs font-mono text-gray-400">{progress}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div
            className="h-full rounded-full progress-bar-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Stage indicators */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {STAGES.map((stage, idx) => {
          const state = getStageState(stage.key, status, isFailed);
          return (
            <div
              key={stage.key}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all duration-300 ${
                state === 'active' ? 'bg-neon-blue/5 border border-neon-blue/20' :
                state === 'done' ? 'bg-neon-green/5' :
                state === 'failed' ? 'bg-red-500/5 border border-red-500/20' :
                'opacity-40'
              }`}
            >
              <StageIcon state={state} />
              <span className={`text-xs font-display font-medium text-center leading-tight ${
                state === 'active' ? 'text-neon-blue' :
                state === 'done' ? 'text-neon-green' :
                state === 'failed' ? 'text-red-400' :
                'text-gray-600'
              }`}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Info badges */}
      {(projectType || apkSizeMB) && (
        <div className="flex items-center gap-3 flex-wrap">
          {projectType && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-700 border border-white/5">
              <span className="text-xs text-gray-400">Project:</span>
              <span className="text-xs font-medium text-neon-green font-mono capitalize">{projectType}</span>
            </div>
          )}
          {apkSizeMB && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-700 border border-white/5">
              <span className="text-xs text-gray-400">Size:</span>
              <span className="text-xs font-medium text-neon-blue font-mono">{apkSizeMB} MB</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
