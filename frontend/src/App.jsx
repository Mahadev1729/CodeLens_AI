import React, { useState, useEffect } from 'react';
import { 
  Brain,
  MessageSquare, 
  FileText, 
  Bug, 
  GitFork, 
  FileEdit, 
  FolderTree, 
  History, 
  CheckCircle2, 
  AlertCircle, 
  Info
} from 'lucide-react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import AuthModal from './components/AuthModal';
import AuthScreen from './components/AuthScreen';
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
  { id: 'files', label: 'Files', icon: FolderTree },
  { id: 'activity', label: 'Activity', icon: History },
];

export default function App() {
  const [user, setUser] = useState(localStorage.getItem('codementor_user') || null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(!!localStorage.getItem('codementor_token'));
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  
  // UI Mobile Drawer State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Repository State
  const [activeRepo, setActiveRepo] = useState(null);
  const [localRepos, setLocalRepos] = useState([]);
  const [isCloning, setIsCloning] = useState(false);
  const [isBuildingKb, setIsBuildingKb] = useState(false);
  
  // AI & Config State
  const [groqApiKey, setGroqApiKey] = useState(localStorage.getItem('codementor_groq_key') || '');
  const [selectedModel, setSelectedModel] = useState('openai/gpt-oss-120b');
  
  // Caches for active repository
  const [summaryCache, setSummaryCache] = useState('');
  const [bugCache, setBugCache] = useState(null);
  const [archCache, setArchCache] = useState(null);
  const [readmeCache, setReadmeCache] = useState('');
  const [selectedFileForExplorer, setSelectedFileForExplorer] = useState(null);

  // Banner Notification
  const [notification, setNotification] = useState(null);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
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
        await refreshLocalRepos();
      } catch (err) {
        console.warn('Session expired or invalid token:', err);
        localStorage.removeItem('codementor_token');
        localStorage.removeItem('codementor_user');
        setUser(null);
      } finally {
        setIsCheckingAuth(false);
      }
    } else {
      setIsCheckingAuth(false);
    }
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
      showNotification('success', `Repository '${res.repo_name}' cloned successfully.`);
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
      showNotification('info', res.message || 'Indexing repository in background...');

      const pollStartTime = Date.now();
      const MAX_POLL_MS = 600000;

      const pollTimer = setInterval(async () => {
        try {
          if (Date.now() - pollStartTime > MAX_POLL_MS) {
            clearInterval(pollTimer);
            setIsBuildingKb(false);
            showNotification('error', 'Indexing timed out. Please retry.');
            return;
          }

          const statusRes = await api.getRepoStatus(activeRepo.path, activeRepo.name);

          if (statusRes.knowledge_base_built || statusRes.kb_status === 'completed') {
            clearInterval(pollTimer);
            setIsBuildingKb(false);
            setActiveRepo((prev) => ({ ...prev, knowledgeBaseBuilt: true }));
            await refreshLocalRepos();
            showNotification('success', 'Repository indexed successfully.');
          } else if (statusRes.kb_status === 'error') {
            clearInterval(pollTimer);
            setIsBuildingKb(false);
            showNotification('error', statusRes.kb_message || statusRes.kb_error || 'Indexing failed.');
          }
        } catch (pollErr) {
          console.warn('[Status Poll] Check failed:', pollErr);
        }
      }, 2500);

    } catch (err) {
      setIsBuildingKb(false);
      showNotification('error', err.message || 'Failed to start indexing.');
    }
  };

  const handleApiKeyChange = (newKey) => {
    setGroqApiKey(newKey);
    localStorage.setItem('codementor_groq_key', newKey);
    showNotification('success', 'API Key saved.');
  };

  const handleAuthSuccess = async (username, sessionState) => {
    setUser(username);
    if (sessionState) {
      if (sessionState.groq_api_key) setGroqApiKey(sessionState.groq_api_key);
      if (sessionState.selected_model) setSelectedModel(sessionState.selected_model);
      if (sessionState.summary_cache) setSummaryCache(sessionState.summary_cache);
      if (sessionState.architecture_cache) setArchCache({ diagram_code: '', raw: sessionState.architecture_cache });
      if (sessionState.readme_cache) setReadmeCache(sessionState.readme_cache);
    }
    await refreshLocalRepos();
    showNotification('success', `Signed in as ${username}.`);
  };

  const handleLogout = () => {
    localStorage.removeItem('codementor_token');
    localStorage.removeItem('codementor_user');
    setUser(null);
    showNotification('info', 'Logged out.');
  };

  const handleOpenFileInExplorer = (filePath) => {
    setSelectedFileForExplorer(filePath);
    setActiveTab('files');
  };

  // 1. Initial Auth Check loading screen
  if (isCheckingAuth) {
    return (
      <div className="auth-fullscreen-container" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <Brain size={28} style={{ color: '#ffffff' }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Loading workspace...</p>
      </div>
    );
  }

  // 2. Unauthenticated: Full-screen Auth portal
  if (!user) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  // 3. Authenticated: Render workspace
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
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* 2. Notification Toast */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '70px',
            right: '20px',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: 'var(--radius-md)',
            background: '#18181b',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#ffffff',
            fontWeight: 500,
            fontSize: '0.84rem',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 size={16} style={{ color: '#ffffff' }} />
          ) : notification.type === 'error' ? (
            <AlertCircle size={16} style={{ color: '#fca5a5' }} />
          ) : (
            <Info size={16} style={{ color: '#ffffff' }} />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* 3. Main Workspace Layout */}
      <div className="main-layout">
        {isSidebarOpen && (
          <div
            className="sidebar-backdrop"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <Sidebar
          activeRepo={activeRepo}
          localRepos={localRepos}
          onSelectRepo={(repo) => {
            handleSelectRepo(repo);
            setIsSidebarOpen(false);
          }}
          onCloneRepo={handleCloneRepo}
          onBuildKb={handleBuildKb}
          isCloning={isCloning}
          isBuildingKb={isBuildingKb}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

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
                  <Icon size={14} />
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
                localRepos={localRepos}
                onSelectRepo={handleSelectRepo}
                onCloneRepo={handleCloneRepo}
                onBuildKb={handleBuildKb}
                isCloning={isCloning}
                isBuildingKb={isBuildingKb}
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
