export const COLLABORATION_REDIS_CHANNEL = 'smart:collaboration';

export type CollaborationRealtimeEnvelope =
  | {
      type: 'workspace.refresh';
      userId: string;
      payload: unknown;
    }
  | {
      type: 'chat.thread-updated';
      userId: string;
      payload: unknown;
    }
  | {
      type: 'chat.message';
      threadId: string;
      payload: unknown;
    };
