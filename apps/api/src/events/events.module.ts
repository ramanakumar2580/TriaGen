import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsGateway } from './events.gateway';
import { AuthModule } from '../auth/auth.module'; // Needed for JwtService in Gateway

@Module({
  imports: [AuthModule],
  providers: [EventsGateway, EventsService],
  exports: [EventsGateway, EventsService], // 🔥 REQUIRED: Makes them visible to other modules
})
export class EventsModule {}
