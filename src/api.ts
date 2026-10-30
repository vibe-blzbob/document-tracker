import {
  User,
  Template,
  DocumentRecord,
  DocumentHistoryRecord,
  NetworkInfo,
  SummaryMetrics,
  CustomFieldDefinition,
  PriorityLevel,
  SystemDropdown,
  DropdownsData
} from './types';

const API_BASE = '/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    },
    ...options
  });

  if (!res.ok) {
    let errorMsg = `API Error ${res.status}: ${res.statusText}`;
    try {
      const body = await res.json();
      if (body.error) errorMsg = body.error;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

export const api = {
  // Network
  async getNetworkInfo(): Promise<NetworkInfo> {
    return request<NetworkInfo>('/network-info');
  },

  // Municipal Offices & Actions
  async getOffices(): Promise<{ offices: string[]; actions: string[] }> {
    return request<{ offices: string[]; actions: string[] }>('/offices');
  },

  // Dropdown Management (Admin only)
  async getDropdowns(): Promise<DropdownsData> {
    return request<DropdownsData>('/dropdowns');
  },

  async updateDropdown(key: string, options: string[], userId: string): Promise<{ success: boolean; dropdown: SystemDropdown }> {
    return request<{ success: boolean; dropdown: SystemDropdown }>(`/dropdowns/${key}`, {
      method: 'PUT',
      headers: {
        'x-user-id': userId
      },
      body: JSON.stringify({ options })
    });
  },

  async resetDropdown(key: string, userId: string): Promise<{ success: boolean; dropdown: SystemDropdown }> {
    return request<{ success: boolean; dropdown: SystemDropdown }>(`/dropdowns/${key}/reset`, {
      method: 'POST',
      headers: {
        'x-user-id': userId
      }
    });
  },

  // Users & Auth
  async listUsers(): Promise<User[]> {
    return request<User[]>('/users');
  },

  async createUser(
    data: { name: string; role: string; department: string; pin: string },
    adminUserId?: string
  ): Promise<User> {
    return request<User>('/users', {
      method: 'POST',
      headers: adminUserId ? { 'x-user-id': adminUserId } : undefined,
      body: JSON.stringify(data)
    });
  },

  async updateUser(
    id: string,
    data: { name?: string; role?: string; department?: string; pin?: string },
    adminUserId: string
  ): Promise<{ success: boolean; user: User }> {
    return request<{ success: boolean; user: User }>(`/users/${id}`, {
      method: 'PUT',
      headers: { 'x-user-id': adminUserId },
      body: JSON.stringify(data)
    });
  },

  async deleteUser(id: string, adminUserId: string): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(`/users/${id}`, {
      method: 'DELETE',
      headers: { 'x-user-id': adminUserId }
    });
  },

  async login(userId: string, pin: string): Promise<{ success: boolean; user: User }> {
    return request<{ success: boolean; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ userId, pin })
    });
  },

  // Templates
  async listTemplates(): Promise<Template[]> {
    return request<Template[]>('/templates');
  },

  async getTemplate(id: string): Promise<Template> {
    return request<Template>(`/templates/${id}`);
  },

  async createTemplate(data: {
    name: string;
    description: string;
    icon: string;
    stages: string[];
    fields: CustomFieldDefinition[];
  }): Promise<Template> {
    return request<Template>('/templates', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateTemplate(
    id: string,
    data: {
      name: string;
      description: string;
      icon: string;
      stages: string[];
      fields: CustomFieldDefinition[];
    }
  ): Promise<Template> {
    return request<Template>(`/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteTemplate(id: string): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(`/templates/${id}`, {
      method: 'DELETE'
    });
  },

  // Documents
  async listDocuments(params?: {
    template_id?: string;
    stage?: string;
    priority?: string;
    search?: string;
    assignee_id?: string;
    current_office?: string;
    origin_type?: string;
  }): Promise<DocumentRecord[]> {
    const clean = Object.entries(params || {}).filter(([_, v]) => v != null && v !== '');
    const qs = new URLSearchParams(clean as [string, string][]).toString();
    return request<DocumentRecord[]>(`/documents${qs ? `?${qs}` : ''}`);
  },

  async getDocument(id: string): Promise<DocumentRecord> {
    return request<DocumentRecord>(`/documents/${id}`);
  },

  async getDocumentHistory(id: string): Promise<DocumentHistoryRecord[]> {
    return request<DocumentHistoryRecord[]>(`/documents/${id}/history`);
  },

  async createDocument(data: {
    title: string;
    template_id: string;
    priority?: PriorityLevel;
    origin_type?: string;
    originating_office?: string;
    current_office?: string;
    action_required?: string;
    assignee_id?: string | null;
    assignee_name?: string | null;
    custom_values: Record<string, any>;
    attachment_path?: string | null;
    attachment_name?: string | null;
    attachment_size?: number | null;
    author_name: string;
    notes?: string;
  }): Promise<DocumentRecord> {
    return request<DocumentRecord>('/documents', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateDocument(
    id: string,
    data: {
      title?: string;
      priority?: PriorityLevel;
      origin_type?: string;
      originating_office?: string;
      current_office?: string;
      action_required?: string;
      assignee_id?: string | null;
      assignee_name?: string | null;
      custom_values?: Record<string, any>;
      attachment_path?: string | null;
      attachment_name?: string | null;
      attachment_size?: number | null;
      author_name: string;
      notes?: string;
    }
  ): Promise<DocumentRecord> {
    return request<DocumentRecord>(`/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async advanceStage(
    id: string,
    data: {
      target_stage: string;
      author_name: string;
      notes?: string;
      user_id?: string;
      pin?: string;
    }
  ): Promise<DocumentRecord> {
    return request<DocumentRecord>(`/documents/${id}/advance`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async routeDocument(
    id: string,
    data: {
      to_office: string;
      action_required: string;
      author_name: string;
      notes?: string;
      user_id?: string;
      pin?: string;
    }
  ): Promise<DocumentRecord> {
    return request<DocumentRecord>(`/documents/${id}/route`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async deleteDocument(id: string, userId: string): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(`/documents/${id}`, {
      method: 'DELETE',
      headers: { 'x-user-id': userId }
    });
  },

  async deleteHistoryEntry(id: string, userId: string): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(`/history/${id}`, {
      method: 'DELETE',
      headers: { 'x-user-id': userId }
    });
  },

  // File Upload
  async uploadFile(file: File): Promise<{
    file_path: string;
    file_name: string;
    file_size: number;
    mime_type: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      let errorMsg = 'File upload failed';
      try {
        const body = await res.json();
        if (body.error) errorMsg = body.error;
      } catch {}
      throw new Error(errorMsg);
    }

    return res.json();
  },

  // Metrics
  async getMetrics(): Promise<SummaryMetrics> {
    return request<SummaryMetrics>('/metrics');
  }
};
