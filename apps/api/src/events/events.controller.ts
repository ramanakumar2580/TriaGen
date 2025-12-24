import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { AuthGuard } from '@nestjs/passport';
import { IsNotEmpty, IsString } from 'class-validator';

// 1. Validation DTO (Prevents empty comments)
class CreateCommentDto {
  @IsNotEmpty()
  @IsString()
  message: string;
}

// 2. Correct Type Definition (Must match JwtStrategy.validate)
interface RequestWithUser {
  user: {
    id: string; // 🔥 FIXED: JwtStrategy returns 'id', not 'userId'
    email: string;
    role: string;
    teamId: string | null;
  };
}

@Controller('incidents')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/comments')
  async addComment(
    @Param('id') incidentId: string,
    @Body() dto: CreateCommentDto, // Use DTO for validation
    @Request() req: RequestWithUser,
  ) {
    // 3. Pass the correct user ID
    return this.eventsService.addComment(incidentId, req.user.id, dto.message);
  }
}
