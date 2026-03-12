import { useState, useEffect } from 'react';
import { History, Download, Trash2, RefreshCw, CheckCircle, XCircle, Clock, Loader } from 'lucide-react';
import { buildApi } from '../utils/api.js';
import { Link } from 'react-router-dom';

const STATUS_CONFIG = {
  success: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10', label: 'Success' },
  failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10', label: 'Failed' },
  building: { icon: Loader, color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Building', spin: true },
  queued: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-400/10', label: 'Queued' },
  cloning: { icon: Loader, color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Cloning', spin: true },
  detecting: { icon: Loader, color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Detecting', spin: true },
  packaging: { icon: Loader, color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Packaging', spin: true }
};

function timeAgo(dateStr) {
  if (!dateStr) return 'Unknown';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}h ${mins % 60}m ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'Just now';
}

function BuildCard({ build, onDelete }) {
  const cfg = STATUS_CONFIG[build.status] || STATUS_CONFIG.failed;
  const StatusIcon = cfg.icon;

  const repoName = build.repoUrl
    ?.replace('https://github.com/', '')
    ?.replace('.git', '') || 'Unknown repo';

  return (
    <div className="glass-panel rounded-xl p-5 border border-white/5 hover:border-white/10 transition-all duration-200">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          {/* Status badge */}
          <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
            <StatusIcon size={15} className={`${cfg.color} ${cfg.spin ? 'animate-spin' : ''}`} />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-200 font-mono truncate">{repoName}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-xs font-medium font-display ${cfg.color}`}>{cfg.label}</span>
              {build.projectType && (
                <>
                  <span className="text-gray-700">·</span>
                  <span className="text-xs text-gray-500 capitalize">{build.projectType}</span>
                </>
              )}
              <span className="text-gray-700">·</span>
              <span className="text-xs text-gray-600">{timeAgo(build.startedAt)}</span>
            </div>
            <p className="text-xs text-gray-700 font-mono mt-1 truncate">{build.buildId}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {build.downloadUrl && (
            <a
              href={build.downloadUrl}
              download
              className="p-2 rounded-lg text-gray-400 hover:text-neon-green hover:bg-neon-green/10 transition-all duration-150"
              title="Download APK"
            >
              <Download size={15} />
            </a>
          )}
          <button
            onClick={() => onDelete(build.buildId)}
            className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-all duration-150"
            title="Delete"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const [builds, setBuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await buildApi.getHistory();
      setBuilds(data.builds || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (buildId) => {
    try {
      await buildApi.deleteBuild(buildId);
      setBuilds(prev => prev.filter(b => b.buildId !== buildId));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold font-display text-white flex items-center gap-3">
              <History size={22} className="text-neon-green" />
              Build History
            </h1>
            <p className="text-sm text-gray-500 mt-1">Recent APK builds and their status</p>
          </div>

          <button
            onClick={fetchHistory}
            disabled={loading}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3 text-gray-600">
              <Loader size={24} className="animate-spin text-neon-green" />
              <p className="text-sm">Loading build history...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <XCircle size={32} className="text-red-400 mx-auto mb-3" />
            <p className="text-red-400 text-sm">{error}</p>
            <button onClick={fetchHistory} className="btn-secondary mt-4">Retry</button>
          </div>
        ) : builds.length === 0 ? (
          <div className="text-center py-20">
            <History size={40} className="text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 font-display">No builds yet</p>
            <p className="text-gray-700 text-sm mt-1">Start a build from the home page</p>
            <Link to="/" className="btn-primary inline-flex items-center gap-2 mt-6 text-sm">
              Start Building
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {builds.map(build => (
              <BuildCard key={build.buildId} build={build} onDelete={handleDelete} />
            ))}
          </div>
        )}

        {/* Stats */}
        {builds.length > 0 && (
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              { label: 'Total', value: builds.length },
              { label: 'Successful', value: builds.filter(b => b.status === 'success').length },
              { label: 'Failed', value: builds.filter(b => b.status === 'failed').length }
            ].map(({ label, value }) => (
              <div key={label} className="glass-panel rounded-xl p-4 text-center border border-white/5">
                <p className="text-2xl font-bold text-white font-display">{value}</p>
                <p className="text-xs text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
