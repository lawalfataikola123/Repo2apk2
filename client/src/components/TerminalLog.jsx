import { useEffect, useRef } from 'react';
import { Terminal, Maximize2 } from 'lucide-react';

const LOG_COLORS = {
  error: 'text-red-400',
  warn: 'text-yellow-400',
  info: 'text-gray-300'
};

const LOG_PREFIXES = {
  error: '✗',
  warn: '⚠',
  info: '›'
};

function formatTime(timestamp) {
  if (!timestamp) return '';
  try {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return '';
  }
}

function getLineStyle(message) {
  if (message.includes('❌') || message.includes('Error') || message.includes('FAILED')) {
    return 'text-red-400';
  }
  if (message.includes('✅') || message.includes('🎉') || message.includes('success')) {
    return 'text-green-400';
  }
  if (message.includes('⚠') || message.includes('Warning') || message.includes('WARN')) {
    return 'text-yellow-400';
  }
  if (message.startsWith('$') || message.startsWith('./')) {
    return 'text-cyan-400 font-bold';
  }
  if (message.includes('📥') || message.includes('📦') || message.includes('🔨') ||
      message.includes('🔍') || message.includes('🧹') || message.includes('📊')) {
    return 'text-blue-300';
  }
  return 'text-gray-400';
}

export default function TerminalLog({ logs, status, isActive }) {
  const containerRef = useRef(null);
  const autoScrollRef = useRef(true);

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (autoScrollRef.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  // Handle user scroll
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    autoScrollRef.current = scrollHeight - scrollTop - clientHeight < 50;
  };

  const isEmpty = logs.length === 0;

  return (
    <div className="rounded-xl overflow-hidden border border-white/6" style={{ background: '#0d1117' }}>
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5" style={{ background: '#161b22' }}>
        <div className="flex items-center gap-3">
          {/* Traffic lights */}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-green-500/70" />
          </div>
          <div className="flex items-center gap-2 text-gray-500 text-xs font-mono">
            <Terminal size={12} />
            <span>build output</span>
            {isActive && (
              <span className="flex items-center gap-1 text-neon-green">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
                live
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-600 font-mono">{logs.length} lines</span>
          <Maximize2 size={12} className="text-gray-600 cursor-pointer hover:text-gray-400 transition-colors" />
        </div>
      </div>

      {/* Log content */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="terminal-scroll overflow-y-auto"
        style={{ height: '380px', fontFamily: '"JetBrains Mono", monospace' }}
      >
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600">
            <Terminal size={32} className="mb-3 opacity-30" />
            <p className="text-sm">Waiting for build output...</p>
            <p className="text-xs mt-1 text-gray-700">Logs will appear here in real-time</p>
          </div>
        ) : (
          <div className="p-4 space-y-0.5">
            {logs.map((entry, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-3 text-xs leading-relaxed log-entry ${getLineStyle(entry.message)}`}
              >
                <span className="text-gray-700 shrink-0 pt-0.5 select-none w-16 text-right">
                  {formatTime(entry.timestamp)}
                </span>
                <span className="break-all whitespace-pre-wrap">{entry.message}</span>
              </div>
            ))}

            {/* Blinking cursor when active */}
            {isActive && (
              <div className="flex items-center gap-3 text-xs mt-1">
                <span className="w-16 text-right text-gray-700 select-none shrink-0">
                  {formatTime(new Date().toISOString())}
                </span>
                <span className="text-neon-green">
                  <span className="animate-blink">▊</span>
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
