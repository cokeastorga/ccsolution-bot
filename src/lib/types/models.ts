//src/lib/types/models.ts

export type UserRole = 'admin' | 'staff' | 'superadmin';

export type AppUser = {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  active: boolean;
  createdAt: Date | string | number;
  lastLoginAt?: Date;
};

export type ConversationStatus = 'open' | 'pending' | 'closed';

export type Conversation = {
  id: string;
  customerId?: string;
  customerName: string;
  channel: 'WhatsApp' | 'Web Chat' | string;
  lastMessage: string;
  updatedAt: Date;
  status: ConversationStatus;
  unreadCount: number;
};

export type MessageDirection = 'inbound' | 'outbound';
export type MessageChannel = 'WhatsApp' | 'Web Chat' | string;

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

export type TemplateType = 'faq' | 'order' | 'info' | 'custom';

export type Template = {
  id: string;
  name: string;
  type: TemplateType;
  description?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  // JSON con la definición del flujo / pasos
  schema: Record<string, unknown>;
};

export type Setting = {
  id: string;
  key: string;
  value: unknown;
  updatedAt: Date;
};

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

export type LogLevel = 'info' | 'warning' | 'error';

export type BotLog = {
  id: string;
  level: LogLevel;
  message: string;
  details?: Record<string, unknown>;
  createdAt: Date;
};
