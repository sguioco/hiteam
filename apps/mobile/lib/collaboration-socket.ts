import { io, Socket } from 'socket.io-client';
import { getDemoAccessToken } from './api';
import { API_URL } from './api-config';

export async function createCollaborationSocket(): Promise<Socket> {
  const token = await getDemoAccessToken();

  return io(`${API_URL}/collaboration`, {
    transports: ['websocket'],
    auth: { token },
  });
}
