import { io, Socket } from 'socket.io-client';
import { getDemoAccessToken } from './api';
import { API_URL } from './api-config';

export async function createNotificationsSocket(): Promise<Socket> {
  const token = await getDemoAccessToken();

  return io(`${API_URL}/notifications`, {
    transports: ['websocket'],
    auth: { token },
  });
}
