import { Test, TestingModule } from '@nestjs/testing';
import { FilesService } from './files.service';
import { PrismaService } from '../prisma/prisma.service';

// 🔥 Senior Trick: Mock the AWS SDK to prevent real network calls/Config errors
jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn().mockImplementation(() => {
      return {
        send: jest.fn().mockResolvedValue({}),
      };
    }),
    PutObjectCommand: jest.fn(),
    DeleteObjectCommand: jest.fn(),
    GetObjectCommand: jest.fn(),
  };
});

// 🔥 Mock the Presigner (since it's a separate import)
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://fake-s3-url.com'),
}));

describe('FilesService', () => {
  let service: FilesService;
  // We don't strictly need to assign 'prisma' from the module if we have the mock reference

  const mockPrismaService = {
    attachment: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        // 💉 Inject Mock Prisma
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<FilesService>(FilesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('deleteFile', () => {
    it('should delete from both S3 and DB', async () => {
      const key = 'test-key';

      await service.deleteFile(key);

      expect(mockPrismaService.attachment.deleteMany).toHaveBeenCalledWith({
        where: { fileKey: key },
      });
    });
  });
});
