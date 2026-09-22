const API_BASE = '/api';

function getHeaders() {
  const token = localStorage.getItem('codementor_token');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {}),
    },
  };

  try {
    const res = await fetch(url, config);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || data.message || `Request failed with status ${res.status}`);
    }
    return data;
  } catch (err) {
    console.error(`[API Error] ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  // Health
  checkHealth: () => request('/health'),

  // Auth
  register: (username, password) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  login: (username, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  getMe: () => request('/auth/me'),

  updateSession: (state) =>
    request('/auth/session', {
      method: 'POST',
      body: JSON.stringify({ state }),
    }),

  // Repository
  cloneRepo: (repoUrl) =>
    request('/repo/clone', {
      method: 'POST',
      body: JSON.stringify({ repo_url: repoUrl }),
    }),

  buildKb: (repoPath, repoName, groqApiKey) =>
    request('/repo/build-kb', {
      method: 'POST',
      body: JSON.stringify({
        repo_path: repoPath,
        repo_name: repoName,
        groq_api_key: groqApiKey,
      }),
    }),

  getRepoStatus: (repoPath, repoName) => {
    const params = new URLSearchParams();
    if (repoPath) params.append('repo_path', repoPath);
    if (repoName) params.append('repo_name', repoName);
    return request(`/repo/status?${params.toString()}`);
  },

  getRepoFiles: (repoPath, search, ext) => {
    const params = new URLSearchParams();
    if (repoPath) params.append('repo_path', repoPath);
    if (search) params.append('search', search);
    if (ext) params.append('ext', ext);
    return request(`/repo/files?${params.toString()}`);
  },

  getFileContent: (filePath, repoPath) => {
    const params = new URLSearchParams({ file_path: filePath });
    if (repoPath) params.append('repo_path', repoPath);
    return request(`/repo/file-content?${params.toString()}`);
  },

  listLocalRepos: () => request('/repo/list'),

  // AI Operations
  askChat: (question, repoName, repoPath, apiKey, model) =>
    request('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        question,
        repo_name: repoName,
        repo_path: repoPath,
        api_key: apiKey,
        model,
      }),
    }),

  generateSummary: (repoPath, repoName, apiKey, model, regenerate = false) =>
    request('/ai/summary', {
      method: 'POST',
      body: JSON.stringify({
        repo_path: repoPath,
        repo_name: repoName,
        api_key: apiKey,
        model,
        regenerate,
      }),
    }),

  findBugs: (repoPath, repoName, apiKey, model, regenerate = false) =>
    request('/ai/bugs', {
      method: 'POST',
      body: JSON.stringify({
        repo_path: repoPath,
        repo_name: repoName,
        api_key: apiKey,
        model,
        regenerate,
      }),
    }),

  generateArchitecture: (repoPath, repoName, apiKey, model, regenerate = false) =>
    request('/ai/architecture', {
      method: 'POST',
      body: JSON.stringify({
        repo_path: repoPath,
        repo_name: repoName,
        api_key: apiKey,
        model,
        regenerate,
      }),
    }),

  generateReadme: (repoPath, repoName, apiKey, model, regenerate = false) =>
    request('/ai/readme', {
      method: 'POST',
      body: JSON.stringify({
        repo_path: repoPath,
        repo_name: repoName,
        api_key: apiKey,
        model,
        regenerate,
      }),
    }),

  explainFile: (filePath, fileContent, repoName, apiKey, model) =>
    request('/ai/explain-file', {
      method: 'POST',
      body: JSON.stringify({
        file_path: filePath,
        file_content: fileContent,
        repo_name: repoName,
        api_key: apiKey,
        model,
      }),
    }),

  // Activities & Chat History
  getActivities: (activityType, search, limit = 150) => {
    const params = new URLSearchParams();
    if (activityType) params.append('activity_type', activityType);
    if (search) params.append('search', search);
    params.append('limit', limit);
    return request(`/activities?${params.toString()}`);
  },

  clearActivities: () =>
    request('/activities/clear', {
      method: 'POST',
    }),

  getActivityStats: () => request('/activities/stats'),

  getChatHistory: (repoName, limit = 200) => {
    const params = new URLSearchParams();
    if (repoName) params.append('repo_name', repoName);
    params.append('limit', limit);
    return request(`/activities/chat-history?${params.toString()}`);
  },

  clearChatHistory: (repoName) => {
    const params = new URLSearchParams();
    if (repoName) params.append('repo_name', repoName);
    return request(`/activities/chat-history/clear?${params.toString()}`, {
      method: 'POST',
    });
  },
};
