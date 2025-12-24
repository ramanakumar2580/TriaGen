/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

describe('EventsController', () => {
  let controller: EventsController;

  // 🔥 Mock the Service correctly
  // We must mock 'addComment' because that is what the Controller calls!
  const mockEventsService = {
    addComment: jest.fn((incidentId, userId, message) =>
      Promise.resolve({ id: 'event-1', incidentId, userId, message }),
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [
        {
          provide: EventsService,
          useValue: mockEventsService, // 💉 Inject the Mock
        },
      ],
    }).compile();

    controller = module.get<EventsController>(EventsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ✅ Test the actual endpoint
  it('should call addComment service with correct parameters', async () => {
    const req = { user: { id: 'user-1' } };
    const dto = { message: 'Test Comment' };

    // @ts-expect-error - Mocking request object partially
    await controller.addComment('incident-123', dto, req);

    expect(mockEventsService.addComment).toHaveBeenCalledWith(
      'incident-123',
      'user-1',
      'Test Comment',
    );
  });
});
