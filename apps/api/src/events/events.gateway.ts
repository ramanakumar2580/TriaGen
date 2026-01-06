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
import { Logger, Injectable } from '@nestjs/common'; // 1. Import Injectable

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
    origin: '*', // Allow connections from any origin (Mobile, Web, Postman)
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // 🔥 AWS & Performance Optimization:
  // Allow 'polling' for fast initial connect, then upgrade to 'websocket'
  transports: ['websocket', 'polling'],
  pingTimeout: 60000, // 60s timeout to prevent AWS LB from closing connection
  pingInterval: 25000, // Send heartbeat every 25s
})
@Injectable() // 2. Add Injectable decorator so Service can use it
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
      // 1. Extract Token from Auth Object (Client) or Headers (Postman)
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

      // 4. 🔥 CRITICAL FIX: Join 'general' Room
      // This ensures the user receives global 'incident:created' events immediately
      await client.join('general');

      // 5. Auto-Join Team Room
      if (payload.teamId) {
        const teamRoom = `team:${payload.teamId}`;
        await client.join(teamRoom);
        this.logger.log(
          `📢 User ${payload.email} joined Team Room: ${teamRoom}`,
        );
      } else {
        this.logger.warn(`⚠️ User ${payload.email} has no Team ID!`);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown authentication error';
      this.logger.error(
        `❌ Connection rejected for ${client.id}: ${errorMessage}`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`🔌 Client disconnected: ${client.id}`);
  }

  // =========================================================
  // 🚀 BROADCAST METHODS (Called by Services)
  // =========================================================

  /**
   * Called by IncidentsService after a new incident is saved to DB.
   * This pushes the data to everyone in 'general' room instantly.
   */
  broadcastIncident(incident: any) {
    this.server.to('general').emit('incident:created', incident);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    this.logger.log(`📡 Broadcasted incident ${incident.id} to 'general'`);
  }

  // =========================================================
  // 🎯 Room Management
  // =========================================================

  // Frontend calls this to listen to a specific incident
  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @MessageBody() room: string, // Expects "incident:123"
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

  // Legacy support (optional)
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
