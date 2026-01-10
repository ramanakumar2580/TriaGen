import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { FilesService } from './files.service';
import { AuthGuard } from '@nestjs/passport';

interface RequestWithUser {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@Controller('files')
export class FilesController {
  private readonly logger = new Logger(FilesController.name);

  constructor(private readonly filesService: FilesService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('presign')
  async getPresignedUrl(
    @Body() body: { incidentId: string; filename: string; contentType: string },
  ) {
    return this.filesService.getPresignedUrl(
      body.incidentId,
      body.filename,
      body.contentType,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('confirm')
  async confirmUpload(
    @Request() req: RequestWithUser,
    @Body()
    body: {
      incidentId: string;
      filename: string;
      fileKey: string;
      contentType: string;
      sizeBytes?: number;
    },
  ) {
    return this.filesService.saveFileRecord({
      ...body,
      userId: req.user.id,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('download/:key')
  async downloadFile(@Param('key') key: string) {
    // Decode key in case it contains special characters
    const decodedKey = decodeURIComponent(key);
    return this.filesService.getDownloadUrl(decodedKey);
  }

  // 🔥 UPDATED: Now accepts ID instead of Key
  // This matches the updated FilesService logic.
  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  async deleteFile(@Param('id') id: string) {
    this.logger.log(`Request to delete file ID: ${id}`);

    const deleted = await this.filesService.deleteFile(id);

    if (!deleted) {
      return { message: 'File already deleted or not found' };
    }
    return deleted;
  }
}
