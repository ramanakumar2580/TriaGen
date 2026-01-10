/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FilesService {
  private s3Client: S3Client;
  private readonly logger = new Logger(FilesService.name);

  constructor(private prisma: PrismaService) {
    this.s3Client = new S3Client({
      region: 'ap-south-2',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  async uploadFile(file: any, incidentId: string, userId: string) {
    const key = `${incidentId}/${uuidv4()}-${file.originalname}`;

    // 1. Upload to S3
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    try {
      await this.s3Client.send(command);
      this.logger.log(`✅ Uploaded file to S3: ${key}`);
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      this.logger.error(`❌ S3 Upload Failed: ${(error as any).message}`);
      throw error;
    }

    // 2. Save Metadata to DB
    return this.saveFileRecord({
      incidentId,
      filename: file.originalname,
      fileKey: key,
      contentType: file.mimetype,
      userId,
      sizeBytes: file.size,
    });
  }

  // 1. Upload URL (PUT)
  async getPresignedUrl(
    incidentId: string,
    filename: string,
    contentType: string,
  ) {
    const key = `${incidentId}/${uuidv4()}-${filename}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(this.s3Client, command, { expiresIn: 900 });

    return { uploadUrl: url, key: key };
  }

  // 2. Download URL (GET)
  async getDownloadUrl(key: string) {
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      ResponseContentDisposition: 'attachment',
    });

    const url = await getSignedUrl(this.s3Client, command, { expiresIn: 900 });
    this.logger.log(`Generated download link for: ${key}`);

    return { downloadUrl: url };
  }

  // 3. Save Metadata to DB (Helper)
  async saveFileRecord(data: {
    incidentId: string;
    filename: string;
    fileKey: string;
    contentType: string;
    userId: string;
    sizeBytes?: number;
  }) {
    const publicUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.ap-south-2.amazonaws.com/${data.fileKey}`;

    return this.prisma.attachment.create({
      data: {
        incidentId: data.incidentId,
        filename: data.filename,
        fileKey: data.fileKey,
        url: publicUrl,
        contentType: data.contentType,
        sizeBytes: data.sizeBytes || 0,
        uploadedById: data.userId,
      },
      include: {
        uploadedBy: { select: { id: true, name: true } },
      },
    });
  }

  // 4. Delete File (Safely Handles "Already Deleted")
  async deleteFile(attachmentId: string) {
    // A. Find the attachment first
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
    });

    // If already deleted, return null gracefully (Prevention of 500 Error)
    if (!attachment) {
      this.logger.warn(
        `⚠️ File with ID ${attachmentId} not found (already deleted?)`,
      );
      return null;
    }

    const key = attachment.fileKey;

    // B. Delete from S3
    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    });

    try {
      await this.s3Client.send(command);
      this.logger.log(`🗑️ Deleted S3 file: ${key}`);
    } catch (error) {
      // Log but don't crash, ensuring DB cleanup still happens
      this.logger.error(`❌ Failed to delete S3 file: ${key}`, error);
    }

    // C. Delete from DB and Return the Object
    // We do this inside the service now so we don't need to do it in the controller
    return this.prisma.attachment.delete({
      where: { id: attachmentId },
    });
  }
}
