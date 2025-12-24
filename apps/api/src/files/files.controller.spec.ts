import { Test, TestingModule } from '@nestjs/testing';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

describe('FilesController', () => {
  let controller: FilesController;

  // 🔥 Senior Practice: Mock the Service Dependency
  // This prevents the test from trying to hit real AWS S3
  const mockFilesService = {
    getPresignedUrl: jest.fn(() =>
      Promise.resolve({ uploadUrl: 'http://fake-s3-url', key: 'key' }),
    ),
    saveFileRecord: jest.fn(() =>
      Promise.resolve({ id: '1', filename: 'test.png' }),
    ),
    getDownloadUrl: jest.fn(() =>
      Promise.resolve({ downloadUrl: 'http://fake-dl-url' }),
    ),
    deleteFile: jest.fn(() => Promise.resolve()),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [
        {
          provide: FilesService,
          useValue: mockFilesService, // 💉 Inject the Mock
        },
      ],
    }).compile();

    controller = module.get<FilesController>(FilesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('downloadFile', () => {
    it('should call service with decoded key', async () => {
      const key = 'folder%2Ffile.png';
      await controller.downloadFile(key);
      // Ensure the controller decodes the URL before passing to service
      expect(mockFilesService.getDownloadUrl).toHaveBeenCalledWith(
        'folder/file.png',
      );
    });
  });
});
