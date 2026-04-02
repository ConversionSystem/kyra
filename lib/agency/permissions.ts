// ============================================================================
// Agency Client Permissions — Read-Only Mode & Granular Controls
//
// Allows agencies to deploy client AIs in read-only mode initially,
// then progressively unlock write capabilities.
// ============================================================================

export type DeploymentMode = 'readonly' | 'supervised' | 'autonomous';

export interface ClientPermissions {
  /** Overall deployment mode */
  mode: DeploymentMode;
  
  /** GHL capability permissions */
  ghl: {
    /** Can read contacts (name, email, phone, tags) */
    readContacts: boolean;
    /** Can update contacts (add tags, update fields) */
    writeContacts: boolean;
    /** Can read conversations (message history) */
    readConversations: boolean;
    /** Can send messages (SMS, email, WhatsApp) */
    sendMessages: boolean;
    /** Can read pipeline/opportunities */
    readPipeline: boolean;
    /** Can move pipeline stages */
    writePipeline: boolean;
    /** Can read calendar/availability */
    readCalendar: boolean;
    /** Can book appointments */
    writeCalendar: boolean;
    /** Can trigger workflows */
    triggerWorkflows: boolean;
    /** Can read Voice AI agents */
    readVoiceAgents: boolean;
    /** Can create/update Voice AI agents */
    writeVoiceAgents: boolean;
    /** Can read Conversation AI agents */
    readConversationAI: boolean;
    /** Can push training data to Conversation AI */
    writeConversationAI: boolean;
    /** Can read knowledge bases */
    readKnowledgeBase: boolean;
    /** Can write to knowledge bases */
    writeKnowledgeBase: boolean;
    /** Can read phone numbers */
    readPhoneNumbers: boolean;
  };
  
  /** AI behavior permissions */
  ai: {
    /** Can initiate follow-up messages (proactive outreach) */
    proactiveMessaging: boolean;
    /** Can use web search for answers */
    webSearch: boolean;
    /** Maximum response length (chars, 0 = unlimited) */
    maxResponseLength: number;
    /** Require human approval before sending (supervised mode) */
    requireApproval: boolean;
  };
}

/** Default permissions for each deployment mode */
export const DEPLOYMENT_PRESETS: Record<DeploymentMode, ClientPermissions> = {
  readonly: {
    mode: 'readonly',
    ghl: {
      readContacts: true,
      writeContacts: false,
      readConversations: true,
      sendMessages: false,
      readPipeline: true,
      writePipeline: false,
      readCalendar: true,
      writeCalendar: false,
      triggerWorkflows: false,
      readVoiceAgents: true,
      writeVoiceAgents: false,
      readConversationAI: true,
      writeConversationAI: false,
      readKnowledgeBase: true,
      writeKnowledgeBase: false,
      readPhoneNumbers: true,
    },
    ai: {
      proactiveMessaging: false,
      webSearch: false,
      maxResponseLength: 0,
      requireApproval: true,
    },
  },
  supervised: {
    mode: 'supervised',
    ghl: {
      readContacts: true,
      writeContacts: false,
      readConversations: true,
      sendMessages: true,
      readPipeline: true,
      writePipeline: false,
      readCalendar: true,
      writeCalendar: false,
      triggerWorkflows: false,
      readVoiceAgents: true,
      writeVoiceAgents: false,
      readConversationAI: true,
      writeConversationAI: false,
      readKnowledgeBase: true,
      writeKnowledgeBase: false,
      readPhoneNumbers: true,
    },
    ai: {
      proactiveMessaging: false,
      webSearch: true,
      maxResponseLength: 500,
      requireApproval: false,
    },
  },
  autonomous: {
    mode: 'autonomous',
    ghl: {
      readContacts: true,
      writeContacts: true,
      readConversations: true,
      sendMessages: true,
      readPipeline: true,
      writePipeline: true,
      readCalendar: true,
      writeCalendar: true,
      triggerWorkflows: true,
      readVoiceAgents: true,
      writeVoiceAgents: true,
      readConversationAI: true,
      writeConversationAI: true,
      readKnowledgeBase: true,
      writeKnowledgeBase: true,
      readPhoneNumbers: true,
    },
    ai: {
      proactiveMessaging: true,
      webSearch: true,
      maxResponseLength: 0,
      requireApproval: false,
    },
  },
};

/**
 * Get permissions for a client. Falls back to deployment preset if no custom permissions.
 */
export function getClientPermissions(
  containerConfig: Record<string, unknown> | null | undefined,
): ClientPermissions {
  if (containerConfig?.permissions) {
    return containerConfig.permissions as ClientPermissions;
  }
  
  const mode = (containerConfig?.deploymentMode as DeploymentMode) || 'supervised';
  return DEPLOYMENT_PRESETS[mode] || DEPLOYMENT_PRESETS.supervised;
}

/**
 * Check if a specific action is allowed for a client.
 */
export function isActionAllowed(
  permissions: ClientPermissions,
  action: keyof ClientPermissions['ghl'] | keyof ClientPermissions['ai'],
): boolean {
  if (action in permissions.ghl) {
    return permissions.ghl[action as keyof ClientPermissions['ghl']];
  }
  if (action in permissions.ai) {
    const value = permissions.ai[action as keyof ClientPermissions['ai']];
    return typeof value === 'boolean' ? value : true;
  }
  return false;
}

/**
 * Build permission context string for the AI system prompt.
 * This tells the AI what it CAN and CANNOT do.
 */
export function buildPermissionPrompt(permissions: ClientPermissions): string {
  const lines: string[] = [];
  
  lines.push(`--- Deployment Mode: ${permissions.mode.toUpperCase()} ---`);
  
  if (permissions.mode === 'readonly') {
    lines.push('⚠️ You are in READ-ONLY mode. You can read information but CANNOT take any actions.');
    lines.push('When a customer asks you to do something (book appointment, send info, etc.),');
    lines.push('politely let them know a team member will follow up shortly.');
    return lines.join('\n');
  }
  
  lines.push('');
  lines.push('You are ALLOWED to:');
  if (permissions.ghl.readContacts) lines.push('- Read customer contact information');
  if (permissions.ghl.sendMessages) lines.push('- Send messages to customers (SMS, email)');
  if (permissions.ghl.readPipeline) lines.push('- View deal/opportunity status');
  if (permissions.ghl.readCalendar) lines.push('- Check calendar availability');
  if (permissions.ghl.writeCalendar) lines.push('- Book appointments');
  if (permissions.ghl.writePipeline) lines.push('- Update deal stages');
  if (permissions.ghl.writeContacts) lines.push('- Update contact records (tags, notes)');
  if (permissions.ghl.triggerWorkflows) lines.push('- Trigger automation workflows');
  if (permissions.ai.webSearch) lines.push('- Search the web for information');
  
  const disallowed: string[] = [];
  if (!permissions.ghl.sendMessages) disallowed.push('send messages');
  if (!permissions.ghl.writeCalendar) disallowed.push('book appointments');
  if (!permissions.ghl.writePipeline) disallowed.push('move deals');
  if (!permissions.ghl.writeContacts) disallowed.push('update contacts');
  if (!permissions.ghl.triggerWorkflows) disallowed.push('trigger workflows');
  
  if (disallowed.length > 0) {
    lines.push('');
    lines.push('You are NOT ALLOWED to:');
    for (const action of disallowed) {
      lines.push(`- ${action} (tell the customer a team member will handle this)`);
    }
  }
  
  if (permissions.ai.maxResponseLength > 0) {
    lines.push('');
    lines.push(`Keep responses under ${permissions.ai.maxResponseLength} characters.`);
  }
  
  if (permissions.ai.requireApproval) {
    lines.push('');
    lines.push('⚠️ All your responses will be reviewed by the agency before being sent to the customer.');
  }
  
  return lines.join('\n');
}

/**
 * Merge custom permission overrides with a preset.
 */
export function mergePermissions(
  preset: DeploymentMode,
  overrides: Partial<ClientPermissions>,
): ClientPermissions {
  const base = { ...DEPLOYMENT_PRESETS[preset] };
  
  if (overrides.ghl) {
    base.ghl = { ...base.ghl, ...overrides.ghl };
  }
  if (overrides.ai) {
    base.ai = { ...base.ai, ...overrides.ai };
  }
  if (overrides.mode) {
    base.mode = overrides.mode;
  }
  
  return base;
}
