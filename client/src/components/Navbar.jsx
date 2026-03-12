import { Link, useLocation } from 'react-router-dom';
import { Package, History, Github, Zap } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();

  return (
    <nav className="relative z-20 border-b border-white/5 glass-panel">
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
                  boxShadow: '0 0 20px rgba(0, 255, 136, 0.3)'
                }}
              >
                <Package size={18} className="text-gray-900" />
              </div>
              <div className="absolute inset-0 rounded-xl animate-pulse-slow opacity-50"
                style={{ background: 'linear-gradient(135deg, #00ff88, #00d4ff)', filter: 'blur(8px)', zIndex: -1 }} />
            </div>
            <div>
              <span className="font-display font-bold text-lg text-white tracking-tight">
                Repo<span className="gradient-text">2APK</span>
              </span>
            </div>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                location.pathname === '/'
                  ? 'text-neon-green bg-neon-green/10 border border-neon-green/20'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <Zap size={15} />
              <span className="font-display">Build</span>
            </Link>

            <Link
              to="/history"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                location.pathname === '/history'
                  ? 'text-neon-green bg-neon-green/10 border border-neon-green/20'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <History size={15} />
              <span className="font-display">History</span>
            </Link>

            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-all duration-200"
            >
              <Github size={15} />
              <span className="font-display">GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
