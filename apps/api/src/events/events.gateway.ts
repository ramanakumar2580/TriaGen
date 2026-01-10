import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger, Injectable } from '@nestjs/common';

// 1. Define Payload
interface UserPayload {
  sub: string;
  email: string;
  role: string;
  teamId: string | null;
}

// 2. Define Authenticated Socket
export interface SocketWithAuth extends Socket {
  user: UserPayload;
}

@WebSocketGateway({
  cors: {
    // 👇 FIX 1: Add your specific sslip.io domain here
    origin: ['https://triagen.40.192.34.253.sslip.io', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // 🔥 AWS & Performance Optimization:
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
})
@Injectable()
export class EventsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('EventsGateway');

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  afterInit() {
    this.logger.log('🚀 WebSocket Gateway Initialized');
  }

  // --- AUTHENTICATION HANDLER ---
  async handleConnection(client: Socket) {
    try {
      // 1. Extract Token
      const auth = client.handshake.auth as { token?: string };
      const headers = client.handshake.headers as { authorization?: string };

      let token = auth.token;
      if (!token && headers.authorization) {
        const parts = headers.authorization.split(' ');
        if (parts.length === 2) token = parts[1];
      }

      if (!token) {
        this.logger.warn(
          `⚠️ Client ${client.id} tried to connect without token.`,
        );
        client.disconnect();
        return;
      }

      // 2. Verify Token
      const payload = this.jwtService.verify<UserPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // 3. Attach user to socket
      (client as SocketWithAuth).user = payload;

      this.logger.log(`✅ User Connected: ${payload.email} (ID: ${client.id})`);

      // 4. 🔥 FIX 2: Join 'general' Room for dashboard updates
      await client.join('general');

      // 5. Auto-Join Team Room
      if (payload.teamId) {
        const teamRoom = `team:${payload.teamId}`;
        await client.join(teamRoom);
        this.logger.log(
          `📢 User ${payload.email} joined Team Room: ${teamRoom}`,
        );
      }
    } catch (err) {
      // Restored Error Handling Logic
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown authentication error';
      this.logger.error(
        `❌ Connection rejected for ${client.id}: ${errorMessage}`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // Restored Disconnect Log
    this.logger.log(`🔌 Client disconnected: ${client.id}`);
  }
  broadcastIncident(incident: any) {
    this.server.to('general').emit('incident:created', incident);

    // 👇 FIX 3: Added eslint-disable to ignore the "unsafe member access" error on .id
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    this.logger.log(`📡 Broadcasted incident ${incident.id} to 'general'`);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @MessageBody() room: string,
    @ConnectedSocket() client: SocketWithAuth,
  ) {
    const safeRoom = String(room).replace(/"/g, ''); // Cleanup quotes

    void client.join(safeRoom);

    this.logger.log(
      `👀 User ${client.user?.email ?? 'Unknown'} joined specific room: ${safeRoom}`,
    );
    return { event: 'joined', room: safeRoom };
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @MessageBody() room: string,
    @ConnectedSocket() client: Socket,
  ) {
    const safeRoom = String(room).replace(/"/g, '');
    void client.leave(safeRoom);
    this.logger.log(`👋 Client left room: ${safeRoom}`);
    return { event: 'left', room: safeRoom };
  }
}
