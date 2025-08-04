// constants/index.js

export const CHART_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
];

export const USER_TYPES = {
  EMPLOYEE: 'EMPLOYEE',
  AFFILIATE: 'AFFILIATE',
  VISITOR: 'VISITOR',
  CONTRACTOR: 'CONTRACTOR',
  SECURITY: 'SECURITY'
};

export const ACCESS_DIRECTIONS = {
  IN: 'IN',
  OUT: 'OUT'
};

export const ACCESS_STATUS = {
  SUCCESS: 'Verify Success',
  DENIED: 'Access Denied',
  EXPIRED: 'Card Expired',
  INVALID: 'Invalid Card',
  TIMEOUT: 'Timeout'
};

export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  SUPPORTED_FORMATS: ['.txt'],
  ENCODING: 'UTF-8'
};

export const SECURITY_LEVELS = {
  EXCELLENT: { threshold: 0, label: 'ดีเยี่ยม', color: 'green' },
  GOOD: { threshold: 5, label: 'ดี', color: 'blue' },
  MODERATE: { threshold: 15, label: 'ปานกลาง', color: 'yellow' },
  WARNING: { threshold: 100, label: 'ต้องระวัง', color: 'red' }
};

export const TIME_RANGES = {
  BUSINESS_HOURS: { start: 8, end: 18, label: 'เวลาทำงาน' },
  AFTER_HOURS: { start: 18, end: 22, label: 'หลังเลิกงาน' },
  NIGHT_TIME: { start: 22, end: 6, label: 'กลางคืน' },
  EARLY_MORNING: { start: 6, end: 8, label: 'เช้าตรู่' }
};

export const API_ENDPOINTS = {
  UPLOAD: '/api/upload-log',
  LOGS: '/api/logs',
  AI_CHAT: '/api/ai-chat',
  EXPORT: '/api/export'
};

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100
};

export const FILTER_DEBOUNCE_MS = 300;