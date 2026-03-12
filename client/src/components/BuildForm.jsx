import { useState } from 'react';
import { Github, ChevronDown, Zap, AlertCircle } from 'lucide-react';

const BUILD_TYPES = [
  { value: 'auto', label: '🔍 Auto Detect', desc: 'Automatically detect project type' },
  { value: 'gradle', label: '🤖 Native Android', desc: 'Java/Kotlin with Gradle' },
  { value: 'flutter', label: '🐦 Flutter', desc: 'Flutter/Dart project' },
  { value: 'react-native', label: '⚛️ React Native', desc: 'React Native project' }
];

const EXAMPLE_REPOS = [
  'https://github.com/android/sunflower',
  'https://github.com/flutter/gallery',
  'https://github.com/facebook/react-native'
];

export default function BuildForm({ onSubmit, isBuilding }) {
  const [repoUrl, setRepoUrl] = useState('');
  const [buildType, setBuildType] = useState('auto');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [urlError, setUrlError] = useState('');

  const selectedType = BUILD_TYPES.find(t => t.value === buildType);

  const validateUrl = (url) => {
    if (!url) {
      setUrlError('Repository URL is required');
      return false;
    }
    const githubPattern = /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(\.git)?\/?$/;
    if (!githubPattern.test(url.trim())) {
      setUrlError('Please enter a valid GitHub repository URL');
      return false;
    }
    setUrlError('');
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateUrl(repoUrl)) return;
    onSubmit(repoUrl.trim(), buildType);
  };

  const handleUrlChange = (e) => {
    setRepoUrl(e.target.value);
    if (urlError) validateUrl(e.target.value);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* URL Input */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2 font-display">
          GitHub Repository URL
        </label>
        <div className={`relative rounded-xl overflow-hidden transition-all duration-300 ${
          urlError ? 'ring-1 ring-red-500/50' : ''
        } neon-border`}>
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
            <Github size={18} />
          </div>
          <input
            type="url"
            value={repoUrl}
            onChange={handleUrlChange}
            placeholder="https://github.com/username/repository"
            disabled={isBuilding}
            className="w-full bg-surface-800 text-gray-100 pl-12 pr-4 py-4 text-sm outline-none placeholder-gray-600 disabled:opacity-50 disabled:cursor-not-allowed font-mono"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {urlError && (
          <p className="mt-2 text-red-400 text-xs flex items-center gap-1.5">
            <AlertCircle size={12} />
            {urlError}
          </p>
        )}

        {/* Example repos */}
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="text-xs text-gray-600">Examples:</span>
          {EXAMPLE_REPOS.map((repo) => (
            <button
              key={repo}
              type="button"
              onClick={() => { setRepoUrl(repo); setUrlError(''); }}
              disabled={isBuilding}
              className="text-xs text-gray-500 hover:text-neon-green transition-colors duration-150 disabled:opacity-50"
            >
              {repo.split('/').slice(-2).join('/')}
            </button>
          ))}
        </div>
      </div>

      {/* Build Type Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2 font-display">
          Build Type
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            disabled={isBuilding}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-surface-800 border border-white/8 text-sm text-gray-200 hover:border-white/15 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="font-display">{selectedType?.label}</span>
            <ChevronDown
              size={16}
              className={`text-gray-500 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 glass-panel rounded-xl border border-white/8 overflow-hidden z-50 shadow-2xl">
              {BUILD_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => {
                    setBuildType(type.value);
                    setDropdownOpen(false);
                  }}
                  className={`w-full flex flex-col items-start px-4 py-3 text-left hover:bg-white/5 transition-colors duration-150 ${
                    buildType === type.value ? 'bg-neon-green/5 border-l-2 border-neon-green' : ''
                  }`}
                >
                  <span className={`text-sm font-medium font-display ${buildType === type.value ? 'text-neon-green' : 'text-gray-200'}`}>
                    {type.label}
                  </span>
                  <span className="text-xs text-gray-500 mt-0.5">{type.desc}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={isBuilding || !repoUrl}
        className="btn-primary w-full flex items-center justify-center gap-3 text-base"
      >
        {isBuilding ? (
          <>
            <div className="w-4 h-4 border-2 border-gray-900/30 border-t-gray-900 rounded-full animate-spin" />
            <span>Building...</span>
          </>
        ) : (
          <>
            <Zap size={18} />
            <span>Build APK</span>
          </>
        )}
      </button>
    </form>
  );
}
