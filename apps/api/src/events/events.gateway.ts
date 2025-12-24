import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

// 1. Define Payload
interface UserPayload {
  sub: string;
  email: string;
  role: string;
  teamId: string | null;
}

// 2. Define Authenticated Socket
interface SocketWithAuth extends Socket {
  user: UserPayload;
}

@WebSocketGateway({
  cors: { origin: '*' },
  transports: ['websocket'], // Force websocket for better performance
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  private logger = new Logger('EventsGateway');

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // --- AUTHENTICATION HANDLER ---
  async handleConnection(client: Socket) {
    try {
      const headers = client.handshake.headers as { authorization?: string };
      const auth = client.handshake.auth as { token?: string };

      const authHeader = headers.authorization;
      const authToken = auth.token;
      const token = authToken || (authHeader ? authHeader.split(' ')[1] : null);

      if (!token) {
        this.logger.warn(`Client ${client.id} tried to connect without token.`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify<UserPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Attach user to socket
      (client as SocketWithAuth).user = payload;

      this.logger.log(`✅ User ${payload.email} connected (ID: ${client.id})`);

      // Auto-Join Team Room
      if (payload.teamId) {
        const teamRoom = `team:${payload.teamId}`;
        await client.join(teamRoom);
        this.logger.log(`📢 User joined Team Room: ${teamRoom}`);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown authentication error';
      this.logger.error(`❌ Connection rejected: ${errorMessage}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // =========================================================
  // 🔥 FIX: Match the Frontend 'joinRoom' event exactly
  // =========================================================
  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @MessageBody() room: string, // Expects "incident:123"
    @ConnectedSocket() client: SocketWithAuth,
  ) {
    // Basic cleanup just in case
    const safeRoom = String(room).replace(/"/g, '');

    void client.join(safeRoom);

    this.logger.log(
      `👤 User ${client.user?.email ?? 'Unknown'} joined room: ${safeRoom}`,
    );
    return { event: 'joined', room: safeRoom };
  }

  // (Optional) Leave Room
  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @MessageBody() room: string,
    @ConnectedSocket() client: Socket,
  ) {
    const safeRoom = String(room).replace(/"/g, '');
    void client.leave(safeRoom);
    return { event: 'left', room: safeRoom };
  }

  // --- Keep legacy handlers if other parts of your app use them ---
  @SubscribeMessage('joinIncident')
  handleJoinIncident(
    @MessageBody() data: any,
    @ConnectedSocket() client: SocketWithAuth,
  ) {
    const incidentId = String(data).replace(/"/g, '');
    const roomName = `incident:${incidentId}`;
    void client.join(roomName);
    return { event: 'joined', room: roomName };
  }
}
