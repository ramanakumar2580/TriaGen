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
    const decodedKey = decodeURIComponent(key);
    return this.filesService.getDownloadUrl(decodedKey);
  }
  @UseGuards(AuthGuard('jwt'))
  @Delete(':key')
  async deleteFile(@Param('key') key: string) {
    const decodedKey = decodeURIComponent(key);
    this.logger.log(`Request to delete file: ${decodedKey}`);
    return this.filesService.deleteFile(decodedKey);
  }
}
