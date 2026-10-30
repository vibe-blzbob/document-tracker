export interface User {
  id: string;
  name: string;
  role: string;
  department: string;
  created_at: string;
}

export type FieldType = 'text' | 'number' | 'date' | 'select';

export interface CustomFieldDefinition {
  id: string;
  name: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  defaultValue?: any;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  stages: string[];
  fields: CustomFieldDefinition[];
  created_at: string;
}

export type PriorityLevel = 'Low' | 'Normal' | 'High' | 'Urgent';

export type OriginType = 'External / Citizen / Barangay' | 'Internal Department';

export const MUNICIPAL_OFFICES = [
  'Office of the Mayor',
  'Sangguniang Bayan / Panlungsod',
  'City Administrator',
  'Records & Archives Management',
  'City Budget Office',
  'City Accounting Office',
  'City Treasurer',
  'Business Permits & Licensing Office (BPLO)',
  'City Engineering & Building Official',
  'City Planning & Development (CPDO)',
  'City Legal Office',
  'City Health Office',
  'City Assessor',
  'General Services & Procurement (BAC)'
] as const;

export const ACTION_REQUIRED_OPTIONS = [
  "For Mayor's Signature / Approval",
  'For Legal Review & Opinion',
  'For Fund Certification & Budget Allocation',
  'For Committee Hearing & Deliberation',
  'For Technical Inspection & Field Audit',
  'For Assessment & Payment Processing',
  'For Official Endorsement / Transmittal',
  'For Release to Constituent / Client',
  'For Record-Keeping & Archival'
] as const;

export interface SystemDropdown {
  key: string;
  label: string;
  options: string[];
  updated_at?: string;
}

export type DropdownsData = Record<string, SystemDropdown>;

export interface DocumentRecord {
  id: string;
  tracking_code: string;
  title: string;
  template_id: string;
  current_stage: string;
  priority: PriorityLevel;
  origin_type: OriginType | string;
  originating_office: string;
  current_office: string;
  action_required: string;
  assignee_id: string | null;
  assignee_name: string | null;
  custom_values: Record<string, any>;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_size: number | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentHistoryRecord {
  id: string;
  document_id: string;
  action: 'created' | 'stage_changed' | 'edited' | 'file_attached' | 'routed';
  from_stage: string | null;
  to_stage: string | null;
  from_office?: string | null;
  to_office?: string | null;
  action_required?: string | null;
  author_name: string;
  notes: string | null;
  created_at: string;
}

export interface NetworkInfo {
  primaryIp: string;
  allIps: string[];
  port: number;
  localUrl: string;
  lanUrl?: string | null;
  hostname: string;
  isLocalOnly?: boolean;
}

export interface SummaryMetrics {
  totalDocs: number;
  stageBreakdown: { current_stage: string; count: number }[];
  priorityBreakdown: { priority: string; count: number }[];
  officeBreakdown?: { current_office: string; count: number }[];
  recentHistory: (DocumentHistoryRecord & {
    document_title: string;
    tracking_code: string;
  })[];
}
