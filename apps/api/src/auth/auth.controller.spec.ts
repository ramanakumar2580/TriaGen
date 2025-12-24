import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Role } from '@prisma/client';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  // 🔥 Mock Service with Spies
  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ✅ Test 1: Register endpoint
  describe('register', () => {
    it('should call authService.register with correct DTO', async () => {
      const dto = {
        email: 'test@triagen.com',
        name: 'Test User',
        password: 'password123',
        role: Role.ADMIN, // Testing God Mode fields
        teamName: 'DevOps',
      };

      // Mock the return value
      mockAuthService.register.mockResolvedValue({
        message: 'User registered',
        userId: '123',
      });

      const result = await controller.register(dto);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ message: 'User registered', userId: '123' });
    });
  });

  // ✅ Test 2: Login endpoint
  describe('login', () => {
    it('should call authService.login and return token', async () => {
      const dto = { email: 'test@triagen.com', password: 'password123' };
      const mockResult = {
        message: 'Login successful',
        accessToken: 'fake_jwt_token',
        user: {
          id: '1',
          email: dto.email,
          name: 'Test',
          role: 'MEMBER',
          teamId: '1',
        },
      };

      mockAuthService.login.mockResolvedValue(mockResult);

      const result = await controller.login(dto);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockResult);
    });
  });
});
