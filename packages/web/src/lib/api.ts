const API_BASE = '';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return response.json();
}

export interface User {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  provider: 'google' | 'github' | 'discord';
  role: 'admin' | 'user';
  invite_redeemed: boolean;
}

export interface AuthStatus {
  authenticated: boolean;
  inviteRedeemed: boolean;
}

export interface Template {
  id: string;
  name: string;
  filename: string;
  width: number;
  height: number;
  uploaded_by: string | null;
  created_at: number;
}

export interface TextBox {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  fontFamily: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  align: 'left' | 'center' | 'right';
  rotation: number;
}

export interface EditorState {
  textBoxes: TextBox[];
}

export interface Meme {
  id: string;
  template_id: string;
  created_by: string | null;
  editor_state: EditorState;
  output_filename: string | null;
  is_public?: number;
  created_at: number;
  template_name?: string | null;
  template_filename?: string | null;
  template_width?: number | null;
  template_height?: number | null;
  upvotes?: number;
  downvotes?: number;
  score?: number;
}

export interface VoteResponse {
  upvotes: number;
  downvotes: number;
  score: number;
  userVote: number | null;
}

export interface GalleryMeme {
  id: string;
  template_id: string;
  created_by: string | null;
  output_filename: string | null;
  is_public: number;
  created_at: number;
  template_name: string | null;
  template_filename: string | null;
  creator_name: string | null;
  creator_avatar: string | null;
  upvotes: number;
  downvotes: number;
  score: number;
  userVote: number | null;
}

export interface GalleryResponse {
  memes: GalleryMeme[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface InviteCode {
  id: string;
  code: string;
  created_by: string | null;
  used_by: string | null;
  created_at: number;
  used_at: number | null;
  created_by_name?: string | null;
  used_by_name?: string | null;
}

export interface Stats {
  totalUsers: number;
  adminUsers: number;
  activeUsers: number;
  pendingUsers: number;
  totalInvites: number;
  usedInvites: number;
  availableInvites: number;
}

// Auth API
export const auth = {
  getStatus: () => fetch(`${API_BASE}/auth/status`, { credentials: 'include' }).then(handleResponse<AuthStatus>),

  getMe: () => fetch(`${API_BASE}/auth/me`, { credentials: 'include' }).then(handleResponse<User>),

  logout: () => fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' }).then(handleResponse<{ success: boolean }>),

  loginUrl: (provider: 'google' | 'github' | 'discord') => `${API_BASE}/auth/${provider}`,
};

// Invites API
export const invites = {
  redeem: (code: string) =>
    fetch(`${API_BASE}/api/invites/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ code }),
    }).then(handleResponse<{ success: boolean; message: string }>),

  list: () => fetch(`${API_BASE}/api/invites`, { credentials: 'include' }).then(handleResponse<InviteCode[]>),

  create: () =>
    fetch(`${API_BASE}/api/invites`, {
      method: 'POST',
      credentials: 'include',
    }).then(handleResponse<{ id: string; code: string; created_at: number }>),

  delete: (id: string) =>
    fetch(`${API_BASE}/api/invites/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    }).then(handleResponse<{ success: boolean }>),
};

// Templates API
export const templates = {
  list: () => fetch(`${API_BASE}/api/templates`, { credentials: 'include' }).then(handleResponse<Template[]>),

  get: (id: string) => fetch(`${API_BASE}/api/templates/${id}`, { credentials: 'include' }).then(handleResponse<Template>),

  upload: (file: File, name: string) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('name', name);
    return fetch(`${API_BASE}/api/templates`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    }).then(handleResponse<Template>);
  },

  delete: (id: string) =>
    fetch(`${API_BASE}/api/templates/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    }).then(handleResponse<{ success: boolean }>),

  imageUrl: (filename: string) => `${API_BASE}/uploads/templates/${filename}`,
};

// Memes API
export const memes = {
  list: () => fetch(`${API_BASE}/api/memes`, { credentials: 'include' }).then(handleResponse<Meme[]>),

  get: (id: string) => fetch(`${API_BASE}/api/memes/${id}`, { credentials: 'include' }).then(handleResponse<Meme>),

  create: (templateId: string, editorState: EditorState) =>
    fetch(`${API_BASE}/api/memes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ template_id: templateId, editor_state: editorState }),
    }).then(handleResponse<Meme>),

  update: (id: string, editorState: EditorState) =>
    fetch(`${API_BASE}/api/memes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ editor_state: editorState }),
    }).then(handleResponse<Meme>),

  render: (id: string, imageData: string) =>
    fetch(`${API_BASE}/api/memes/${id}/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ imageData }),
    }).then(handleResponse<{ success: boolean; filename: string }>),

  delete: (id: string) =>
    fetch(`${API_BASE}/api/memes/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    }).then(handleResponse<{ success: boolean }>),

  setVisibility: (id: string, isPublic: boolean) =>
    fetch(`${API_BASE}/api/memes/${id}/visibility`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ is_public: isPublic }),
    }).then(handleResponse<Meme>),

  imageUrl: (filename: string) => `${API_BASE}/uploads/memes/${filename}`,
};

// Votes API
export const votes = {
  get: (memeId: string) =>
    fetch(`${API_BASE}/api/votes/${memeId}`, { credentials: 'include' }).then(handleResponse<VoteResponse>),

  cast: (memeId: string, vote: 1 | -1) =>
    fetch(`${API_BASE}/api/votes/${memeId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ vote }),
    }).then(handleResponse<VoteResponse>),

  remove: (memeId: string) =>
    fetch(`${API_BASE}/api/votes/${memeId}`, {
      method: 'DELETE',
      credentials: 'include',
    }).then(handleResponse<VoteResponse>),
};

// Gallery API
export const gallery = {
  list: (params?: {
    period?: '7d' | '30d' | 'year' | 'all';
    sort?: 'hot' | 'top' | 'new';
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.period) searchParams.set('period', params.period);
    if (params?.sort) searchParams.set('sort', params.sort);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    const queryString = searchParams.toString();
    const url = queryString
      ? `${API_BASE}/api/gallery?${queryString}`
      : `${API_BASE}/api/gallery`;
    return fetch(url, { credentials: 'include' }).then(handleResponse<GalleryResponse>);
  },
};

// Admin API
export const admin = {
  getUsers: () => fetch(`${API_BASE}/api/admin/users`, { credentials: 'include' }).then(handleResponse<User[]>),

  setUserRole: (userId: string, role: 'admin' | 'user') =>
    fetch(`${API_BASE}/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ role }),
    }).then(handleResponse<{ success: boolean }>),

  getStats: () => fetch(`${API_BASE}/api/admin/stats`, { credentials: 'include' }).then(handleResponse<Stats>),

  bootstrap: () =>
    fetch(`${API_BASE}/api/admin/bootstrap`, {
      method: 'POST',
      credentials: 'include',
    }).then(handleResponse<{ success: boolean; message: string }>),
};
