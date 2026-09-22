import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  FileText, 
  Bug, 
  GitFork, 
  FileEdit, 
  FolderTree, 
  History, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  Info
} from 'lucide-react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import AuthModal from './components/AuthModal';
import ChatTab from './components/tabs/ChatTab';
import SummaryTab from './components/tabs/SummaryTab';
import BugFinderTab from './components/tabs/BugFinderTab';
import ArchitectureTab from './components/tabs/ArchitectureTab';
import ReadmeTab from './components/tabs/ReadmeTab';
import FileExplorerTab from './components/tabs/FileExplorerTab';
import ActivityTab from './components/tabs/ActivityTab';
import { api } from './services/api';

const TABS = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'summary', label: 'Summary', icon: FileText },
  { id: 'bugs', label: 'Bug Finder', icon: Bug },
  { id: 'architecture', label: 'Architecture', icon: GitFork },
  { id: 'readme', label: 'README', icon: FileEdit },
  { id: 'files', label: 'File Explorer', icon: FolderTree },
  { id: 'activity', label: 'Activity & History', icon: History },
];

export default function App() {
  const [user, setUser] = useState(localStorage.getItem('codementor_user') || null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  
  // Repository State
  const [activeRepo, setActiveRepo] = useState(null);
  const [localRepos, setLocalRepos] = useState([]);
  const [isCloning, setIsCloning] = useState(false);
  const [isBuildingKb, setIsBuildingKb] = useState(false);
  
  // AI & Config State
  const [groqApiKey, setGroqApiKey] = useState(localStorage.getItem('codementor_groq_key') || '');
  const [selectedModel, setSelectedModel] = useState('openai/gpt-oss-120b');
  
  // Caches for the active repository
  const [summaryCache, setSummaryCache] = useState('');
  const [bugCache, setBugCache] = useState(null);
  const [archCache, setArchCache] = useState(null);
  const [readmeCache, setReadmeCache] = useState('');
  const [selectedFileForExplorer, setSelectedFileForExplorer] = useState(null);

  // Banner Notification
  const [notification, setNotification] = useState(null);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    // 1. Check current logged-in user profile
    const token = localStorage.getItem('codementor_token');
    if (token) {
      try {
        const profile = await api.getMe();
        setUser(profile.username);
        if (profile.session_state) {
          const s = profile.session_state;
          if (s.groq_api_key) setGroqApiKey(s.groq_api_key);
          if (s.selected_model) setSelectedModel(s.selected_model);
          if (s.summary_cache) setSummaryCache(s.summary_cache);
          if (s.architecture_cache) setArchCache({ diagram_code: '', raw: s.architecture_cache });
          if (s.readme_cache) setReadmeCache(s.readme_cache);
        }
      } catch (err) {
        console.warn('Session expired or invalid token:', err);
        localStorage.removeItem('codementor_token');
        localStorage.removeItem('codementor_user');
        setUser(null);
      }
    }

    // 2. Fetch local repositories list
    await refreshLocalRepos();
  };

  const refreshLocalRepos = async () => {
    try {
      const res = await api.listLocalRepos();
      setLocalRepos(res.repos || []);
      if (res.repos && res.repos.length > 0 && !activeRepo) {
        handleSelectRepo(res.repos[0]);
      }
    } catch (err) {
      console.error('Failed to list local repos:', err);
    }
  };

  const handleSelectRepo = async (repoObj) => {
    try {
      const statusRes = await api.getRepoStatus(repoObj.path, repoObj.name);
      setActiveRepo({
        name: repoObj.name,
        path: repoObj.path,
        knowledgeBaseBuilt: statusRes.knowledge_base_built,
        info: statusRes.repo_info,
        stats: statusRes.repo_stats,
      });
      // Clear caches for new repo
      setSummaryCache('');
      setBugCache(null);
      setArchCache(null);
      setReadmeCache('');
    } catch (err) {
      console.error('Failed to get repo status:', err);
    }
  };

  const handleCloneRepo = async (url) => {
    setIsCloning(true);
    try {
      const res = await api.cloneRepo(url);
      setActiveRepo({
        name: res.repo_name,
        path: res.repo_path,
        knowledgeBaseBuilt: res.knowledge_base_built,
        info: res.repo_info,
        stats: res.repo_stats,
      });
      await refreshLocalRepos();
      showNotification('success', `Repository '${res.repo_name}' cloned successfully!`);
    } catch (err) {
      showNotification('error', err.message || 'Clone failed.');
    } finally {
      setIsCloning(false);
    }
  };

  const handleBuildKb = async () => {
    if (!activeRepo) return;
    setIsBuildingKb(true);
    try {
      const res = await api.buildKb(activeRepo.path, activeRepo.name, groqApiKey);
      setActiveRepo((prev) => ({ ...prev, knowledgeBaseBuilt: true }));
      await refreshLocalRepos();
      showNotification('success', `Knowledge base built! ${res.total_chunks} code chunks indexed.`);
    } catch (err) {
      showNotification('error', err.message || 'Failed to build knowledge base.');
    } finally {
      setIsBuildingKb(false);
    }
  };

  const handleApiKeyChange = (newKey) => {
    setGroqApiKey(newKey);
    localStorage.setItem('codementor_groq_key', newKey);
    showNotification('success', 'Groq API Key saved successfully.');
  };

  const handleAuthSuccess = (username, sessionState) => {
    setUser(username);
    showNotification('success', `Welcome back, ${username}!`);
  };

  const handleLogout = () => {
    localStorage.removeItem('codementor_token');
    localStorage.removeItem('codementor_user');
    setUser(null);
    showNotification('info', 'Logged out successfully.');
  };

  const handleOpenFileInExplorer = (filePath) => {
    setSelectedFileForExplorer(filePath);
    setActiveTab('files');
  };

  return (
    <div className="app-container">
      {/* 1. Top Navigation Bar */}
      <Navbar
        user={user}
        onLogout={handleLogout}
        onOpenAuth={() => setAuthModalOpen(true)}
        activeRepo={activeRepo}
        groqApiKey={groqApiKey}
        onApiKeyChange={handleApiKeyChange}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
      />

      {/* 2. Notification Toast */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '74px',
            right: '24px',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 20px',
            borderRadius: 'var(--radius-md)',
            background:
              notification.type === 'success'
                ? 'rgba(63, 185, 80, 0.95)'
                : notification.type === 'error'
                ? 'rgba(248, 81, 73, 0.95)'
                : 'rgba(88, 166, 255, 0.95)',
            color: '#fff',
            fontWeight: 500,
            fontSize: '0.88rem',
            boxShadow: 'var(--shadow-lg)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 size={18} />
          ) : notification.type === 'error' ? (
            <AlertCircle size={18} />
          ) : (
            <Info size={18} />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* 3. Main Workspace Layout */}
      <div className="main-layout">
        {/* Sidebar */}
        <Sidebar
          activeRepo={activeRepo}
          localRepos={localRepos}
          onSelectRepo={handleSelectRepo}
          onCloneRepo={handleCloneRepo}
          onBuildKb={handleBuildKb}
          isCloning={isCloning}
          isBuildingKb={isBuildingKb}
        />

        {/* Content Tabs Area */}
        <main className="content-area">
          {/* Tabs Bar */}
          <div className="tabs-bar">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`tab-btn ${isActive ? 'active' : ''}`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Tab View */}
          <div className="tab-content">
            {activeTab === 'chat' && (
              <ChatTab
                activeRepo={activeRepo}
                groqApiKey={groqApiKey}
                selectedModel={selectedModel}
                onOpenFileInExplorer={handleOpenFileInExplorer}
              />
            )}

            {activeTab === 'summary' && (
              <SummaryTab
                activeRepo={activeRepo}
                groqApiKey={groqApiKey}
                selectedModel={selectedModel}
                cachedSummary={summaryCache}
                onSummaryGenerated={setSummaryCache}
              />
            )}

            {activeTab === 'bugs' && (
              <BugFinderTab
                activeRepo={activeRepo}
                groqApiKey={groqApiKey}
                selectedModel={selectedModel}
                cachedBugReport={bugCache}
                onBugsAnalyzed={setBugCache}
              />
            )}

            {activeTab === 'architecture' && (
              <ArchitectureTab
                activeRepo={activeRepo}
                groqApiKey={groqApiKey}
                selectedModel={selectedModel}
                cachedArch={archCache}
                onArchGenerated={setArchCache}
              />
            )}

            {activeTab === 'readme' && (
              <ReadmeTab
                activeRepo={activeRepo}
                groqApiKey={groqApiKey}
                selectedModel={selectedModel}
                cachedReadme={readmeCache}
                onReadmeGenerated={setReadmeCache}
              />
            )}

            {activeTab === 'files' && (
              <FileExplorerTab
                activeRepo={activeRepo}
                groqApiKey={groqApiKey}
                selectedModel={selectedModel}
                selectedFileFromNav={selectedFileForExplorer}
              />
            )}

            {activeTab === 'activity' && (
              <ActivityTab user={user} />
            )}
          </div>
        </main>
      </div>

      {/* 4. Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}
