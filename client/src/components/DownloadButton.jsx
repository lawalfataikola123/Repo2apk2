import { useState } from 'react';
import { Download, Package, RefreshCw, XCircle } from 'lucide-react';
import { buildApi } from '../utils/api.js';

export default function DownloadButton({ status, buildId, error, onReset }) {
  const [downloading, setDownloading] = useState(false);
  if (status === 'idle') return null;

  const downloadApk = async () => {
    setDownloading(true);
    try {
      await buildApi.downloadBuild(buildId);
    } catch (e) {
      window.alert(e.message || 'Download failed.');
    } finally {
      setDownloading(false);
    }
  };

  if (status === 'failed') {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5">
          <div className="flex items-start gap-3">
            <XCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-400 font-display">Build Failed</p>
              <p className="text-xs text-red-400/70 mt-1 font-mono leading-relaxed">
                {error || 'An unknown error occurred during the build.'}
              </p>
            </div>
          </div>
        </div>
        <button onClick={onReset} className="btn-secondary w-full flex items-center justify-center gap-2">
          <RefreshCw size={15} /><span>Try Again</span>
        </button>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-xl border border-neon-green/20 bg-neon-green/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-neon-green/10 flex items-center justify-center shrink-0">
              <Package size={18} className="text-neon-green" />
            </div>
            <div>
              <p className="text-sm font-semibold text-neon-green font-display">APK Ready!</p>
              <p className="text-xs text-gray-400 mt-0.5">Your APK has been built successfully</p>
            </div>
          </div>
        </div>
        <button onClick={downloadApk} disabled={downloading} className="btn-primary flex items-center justify-center gap-3 text-base w-full">
          <Download size={18} /><span>{downloading ? 'Preparing download…' : 'Download APK'}</span>
        </button>
        <button onClick={onReset} className="btn-secondary w-full flex items-center justify-center gap-2 text-sm">
          <RefreshCw size={14} /><span>Build Another</span>
        </button>
        <p className="text-center text-xs text-gray-600">Download is served securely through your signed-in session</p>
      </div>
    );
  }
  return null;
}
