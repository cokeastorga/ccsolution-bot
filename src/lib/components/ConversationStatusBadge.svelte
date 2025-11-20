// src/lib/types/models.ts

// -----------------------------------------
// USERS
// -----------------------------------------
export type UserRole = 'admin' | 'staff' | 'superadmin';

export type AppUser = {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  active: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
};

// -----------------------------------------
// CONVERSATIONS
// -----------------------------------------
export type UnifiedChannel = 'whatsapp' | 'web';

export type ConversationStatus = 'open' | 'pending' | 'closed';

export type Conversation = {
  id: string;
  customerId?: string;
  customerName: string;
  channel: UnifiedChannel;
  lastMessage: string;
  updatedAt: Date;
  status: ConversationStatus;
  unreadCount: number;
};

// -----------------------------------------
// MESSAGES
// -----------------------------------------
export type MessageDirection = 'inbound' | 'outbound';
export type MessageChannel = UnifiedChannel;

export type Message = {
  id: string;
  conversationId: string;
  from: 'user' | 'bot' | 'staff';
  direction: MessageDirection;
  channel: MessageChannel;
  content: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
};

// -----------------------------------------
// TEMPLATES (para respuestas rápidas / IA )
// -----------------------------------------
export type TemplateType = 'faq' | 'order' | 'info' | 'custom';

export type Template = {
  id: string;
  name: string;
  type: TemplateType;
  description?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  schema: Record<string, unknown>; // definición del template
};

// -----------------------------------------
// SETTINGS
// -----------------------------------------
export type Setting = {
  id: string;
  key: string;
  value: unknown;
  updatedAt: Date;
};

// -----------------------------------------
// INTEGRATIONS
// -----------------------------------------
export type IntegrationType = 'whatsapp' | 'api' | 'webhook';

export type Integration = {
  id: string;
  type: IntegrationType;
  name: string;
  active: boolean;
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

// -----------------------------------------
// LOGS
// -----------------------------------------
export type LogLevel = 'info' | 'warning' | 'error';

export type BotLog = {
  id: string;
  level: LogLevel;
  message: string;
  details?: Record<string, unknown>;
  createdAt: Date;
};
