// Resolve the base API URL:
// 1. If explicit VITE_API_URL is configured (e.g. separate hosting), use that.
// 2. Otherwise default to '/api' (ideal for unified Docker / same-origin deployments).
const RAW_BACKEND_URL = 
  import.meta.env.VITE_API_URL || 
  import.meta.env.VITE_BACKEND_URL || 
  '';

function getApiBase() {
  if (!RAW_BACKEND_URL) {
    return '/api';
  }
  const trimmed = RAW_BACKEND_URL.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

export const API_BASE = getApiBase();

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

/**
 * Universal fetch wrapper with configurable timeouts, abort controller,
 * and robust cold-start error messaging.
 *
 * @param {string} endpoint - API path (e.g. '/repo/clone')
 * @param {object} options - Fetch options (method, body, headers, etc.)
 * @param {number} timeoutMs - Timeout in milliseconds (default: 60s, clone/build: 120s)
 */
async function request(endpoint, options = {}, timeoutMs = 60000) {
  const url = `${API_BASE}${endpoint}`;
  const controller = new AbortController();
  let isTimedOut = false;

  const timeoutId = setTimeout(() => {
    isTimedOut = true;
    controller.abort();
  }, timeoutMs);

  const config = {
    ...options,
    signal: options.signal || controller.signal,
    headers: {
      ...getHeaders(),
      ...(options.headers || {}),
    },
  };

  try {
    const res = await fetch(url, config);

    // Handle common HTTP error statuses cleanly
    if (!res.ok) {
      let errorDetail = '';
      try {
        const data = await res.json();
        errorDetail = data.detail || data.message || '';
      } catch {
        // Body was not JSON
      }

      if (res.status === 502 || res.status === 503 || res.status === 504) {
        throw new Error(
          errorDetail ||
          `Backend server returned ${res.status} (${res.statusText || 'Bad Gateway'}). The Render service might be restarting or waking up from a cold start. Please try again in 30 seconds.`
        );
      }

      throw new Error(
        errorDetail || `Request to ${endpoint} failed with status ${res.status} (${res.statusText || 'Error'})`
      );
    }

    const data = await res.json().catch(() => ({}));
    return data;
  } catch (err) {
    if (isTimedOut || err.name === 'AbortError') {
      const seconds = Math.round(timeoutMs / 1000);
      const timeoutError = new Error(
        `Request to '${endpoint}' timed out after ${seconds}s. If the Render backend was asleep, it may take up to a minute to wake up. Please try again.`
      );
      console.error(`[API Timeout] ${endpoint}:`, timeoutError);
      throw timeoutError;
    }

    if (err.name === 'TypeError' && err.message?.includes('fetch')) {
      const netError = new Error(
        `Unable to reach backend server at ${API_BASE}. Please check if the Render instance is active, or wait 30–60 seconds if it is cold-starting.`
      );
      console.error(`[API Network Error] ${endpoint}:`, netError);
      throw netError;
    }

    console.error(`[API Error] ${endpoint}:`, err);
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  // Health checks
  checkHealth: () => request('/health', {}, 20000),

  // Auth
  getAuthConfig: () => request('/auth/config', {}, 20000),

  googleLogin: (credential) =>
    request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    }),

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

  getMe: () => request('/auth/me', {}, 20000),

  updateSession: (state) =>
    request('/auth/session', {
      method: 'POST',
      body: JSON.stringify({ state }),
    }),

  // Repository Operations (allow up to 120 seconds for Git cloning and analysis)
  cloneRepo: (repoUrl) =>
    request(
      '/repo/clone',
      {
        method: 'POST',
        body: JSON.stringify({ repo_url: repoUrl }),
      },
      120000
    ),

  buildKb: (repoPath, repoName, groqApiKey) =>
    request(
      '/repo/build-kb',
      {
        method: 'POST',
        body: JSON.stringify({
          repo_path: repoPath,
          repo_name: repoName,
          groq_api_key: groqApiKey,
        }),
      },
      120000
    ),

  getRepoStatus: (repoPath, repoName) => {
    const params = new URLSearchParams();
    if (repoPath) params.append('repo_path', repoPath);
    if (repoName) params.append('repo_name', repoName);
    return request(`/repo/status?${params.toString()}`, {}, 30000);
  },

  getRepoFiles: (repoPath, search, ext) => {
    const params = new URLSearchParams();
    if (repoPath) params.append('repo_path', repoPath);
    if (search) params.append('search', search);
    if (ext) params.append('ext', ext);
    return request(`/repo/files?${params.toString()}`, {}, 30000);
  },

  getFileContent: (filePath, repoPath) => {
    const params = new URLSearchParams({ file_path: filePath });
    if (repoPath) params.append('repo_path', repoPath);
    return request(`/repo/file-content?${params.toString()}`, {}, 30000);
  },

  listLocalRepos: () => request('/repo/list', {}, 20000),

  // AI Operations (allow up to 90 seconds for large Groq LLM generations)
  askChat: (question, repoName, repoPath, apiKey, model) =>
    request(
      '/ai/chat',
      {
        method: 'POST',
        body: JSON.stringify({
          question,
          repo_name: repoName,
          repo_path: repoPath,
          api_key: apiKey,
          model,
        }),
      },
      90000
    ),

  generateSummary: (repoPath, repoName, apiKey, model, regenerate = false) =>
    request(
      '/ai/summary',
      {
        method: 'POST',
        body: JSON.stringify({
          repo_path: repoPath,
          repo_name: repoName,
          api_key: apiKey,
          model,
          regenerate,
        }),
      },
      90000
    ),

  findBugs: (repoPath, repoName, apiKey, model, regenerate = false) =>
    request(
      '/ai/bugs',
      {
        method: 'POST',
        body: JSON.stringify({
          repo_path: repoPath,
          repo_name: repoName,
          api_key: apiKey,
          model,
          regenerate,
        }),
      },
      90000
    ),

  generateArchitecture: (repoPath, repoName, apiKey, model, regenerate = false) =>
    request(
      '/ai/architecture',
      {
        method: 'POST',
        body: JSON.stringify({
          repo_path: repoPath,
          repo_name: repoName,
          api_key: apiKey,
          model,
          regenerate,
        }),
      },
      90000
    ),

  generateReadme: (repoPath, repoName, apiKey, model, regenerate = false) =>
    request(
      '/ai/readme',
      {
        method: 'POST',
        body: JSON.stringify({
          repo_path: repoPath,
          repo_name: repoName,
          api_key: apiKey,
          model,
          regenerate,
        }),
      },
      90000
    ),

  explainFile: (filePath, fileContent, repoName, apiKey, model) =>
    request(
      '/ai/explain-file',
      {
        method: 'POST',
        body: JSON.stringify({
          file_path: filePath,
          file_content: fileContent,
          repo_name: repoName,
          api_key: apiKey,
          model,
        }),
      },
      90000
    ),

  // Activities & Chat History
  getActivities: (activityType, search, limit = 150) => {
    const params = new URLSearchParams();
    if (activityType) params.append('activity_type', activityType);
    if (search) params.append('search', search);
    params.append('limit', limit);
    return request(`/activities?${params.toString()}`, {}, 30000);
  },

  clearActivities: () =>
    request('/activities/clear', {
      method: 'POST',
    }),

  getActivityStats: () => request('/activities/stats', {}, 20000),

  getChatHistory: (repoName, limit = 200) => {
    const params = new URLSearchParams();
    if (repoName) params.append('repo_name', repoName);
    params.append('limit', limit);
    return request(`/activities/chat-history?${params.toString()}`, {}, 30000);
  },

  clearChatHistory: (repoName) => {
    const params = new URLSearchParams();
    if (repoName) params.append('repo_name', repoName);
    return request(
      `/activities/chat-history/clear?${params.toString()}`,
      {
        method: 'POST',
      },
      30000
    );
  },
};
