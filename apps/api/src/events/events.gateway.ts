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

// --- Interfaces ---
interface UserPayload {
  sub: string;
  email: string;
  role: string;
  teamId: string | null;
}

export interface SocketWithAuth extends Socket {
  user: UserPayload;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
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
      const auth = client.handshake.auth as { token?: string };
      const headers = client.handshake.headers as { authorization?: string };

      let token = auth.token;
      if (!token && headers.authorization) {
        const parts = headers.authorization.split(' ');
        if (parts.length === 2) token = parts[1];
      }

      if (!token) {
        this.logger.warn(`⚠️ Connection rejected: No token for ${client.id}`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify<UserPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      (client as SocketWithAuth).user = payload;
      this.logger.log(`✅ User Connected: ${payload.email}`);

      // Auto-join global room for new incident alerts
      await client.join('general');

      // Auto-join team-specific room
      if (payload.teamId) {
        await client.join(`team:${payload.teamId}`);
      }
    } catch {
      this.logger.error(`❌ Socket Auth Failed: ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`🔌 Client disconnected: ${client.id}`);
  }

  broadcastIncident(incident: any) {
    this.server.to('general').emit('incident:created', incident);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    this.logger.log(`📡 Broadcast: New Incident ${incident.id}`);
  }

  /**
   * Send new comments, edits, or status change events to the specific War Room
   */
  broadcastToWarRoom(incidentId: string, event: any) {
    this.server.to(`incident:${incidentId}`).emit('newComment', event);
    this.logger.log(`💬 Broadcast: Event in room incident:${incidentId}`);
  }

  /**
   * Sync full incident object updates (e.g., assignee change, severity change)
   */
  broadcastIncidentUpdate(incidentId: string, data: any) {
    this.server.to(`incident:${incidentId}`).emit('incident:updated', data);
  }

  /**
   * Notify War Room when a new file is uploaded to S3
   */
  broadcastAttachment(incidentId: string, attachment: any) {
    this.server
      .to(`incident:${incidentId}`)
      .emit('incident:new_attachment', attachment);
  }

  /**
   * Notify War Room when a file is deleted from S3
   */
  broadcastAttachmentRemoval(incidentId: string, attachmentId: string) {
    this.server
      .to(`incident:${incidentId}`)
      .emit('incident:attachment_removed', { id: attachmentId });
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @MessageBody() room: string,
    @ConnectedSocket() client: SocketWithAuth,
  ) {
    const safeRoom = String(room).replace(/"/g, '');
    void client.join(safeRoom);
    this.logger.log(`👀 User ${client.user?.email} joined: ${safeRoom}`);
    return { status: 'success', room: safeRoom };
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @MessageBody() room: string,
    @ConnectedSocket() client: Socket,
  ) {
    const safeRoom = String(room).replace(/"/g, '');
    void client.leave(safeRoom);
    return { status: 'success', room: safeRoom };
  }
}
