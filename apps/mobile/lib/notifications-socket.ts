import { io, Socket } from 'socket.io-client';
import { getDemoAccessToken } from './api';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function createNotificationsSocket(): Promise<Socket> {
  const token = await getDemoAccessToken();

  return io(`${API_URL}/notifications`, {
    transports: ['websocket'],
    auth: { token },
  });
}
