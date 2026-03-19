import { io, Socket } from 'socket.io-client';
import { isDemoAccessToken } from './demo-mode';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function createNoopSocket(): Socket {
  const socket = {
    on: () => socket,
    off: () => socket,
    emit: () => socket,
    disconnect: () => socket,
    connect: () => socket,
    close: () => socket,
  };

  return socket as unknown as Socket;
}

export function createCollaborationSocket(token: string): Socket {
  if (isDemoAccessToken(token)) {
    return createNoopSocket();
  }

  return io(`${API_URL}/collaboration`, {
    transports: ['websocket'],
    auth: { token },
  });
}
