/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;

  // 🔥 1. Mock Prisma (Updated to include TEAMS)
  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    team: {
      findUnique: jest.fn(), // 👈 Added this so "Smart Sign-Up" doesn't crash tests
    },
  };

  // 🔥 2. Mock JWT Service
  const mockJwtService = {
    signAsync: jest.fn(() => Promise.resolve('mock_token')),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should return a token if password matches', async () => {
      // Setup: Mock the DB finding a user
      const mockUser = {
        id: '1',
        email: 'test@test.com',
        password: await bcrypt.hash('password123', 10),
        role: 'MEMBER',
        teamId: null,
        name: 'Test User',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      // Act
      const result = await service.login({
        email: 'test@test.com',
        password: 'password123',
      });

      // Assert
      expect(result.accessToken).toBe('mock_token');
      expect(result.user.email).toBe('test@test.com');
    });
  });

  // 🛡️ New Test for Smart Sign-Up
  describe('register', () => {
    it('should look up team and create user with Role and TeamID', async () => {
      // Setup: Mock the Team lookup
      const mockTeam = { id: 'team-123', name: 'DevOps' };
      (prisma.team.findUnique as jest.Mock).mockResolvedValue(mockTeam);

      // Setup: Mock User creation
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null); // User doesn't exist yet
      (prisma.user.create as jest.Mock).mockImplementation((args) => ({
        id: 'user-1',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        ...args.data,
      }));

      // Act
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await service.register({
        email: 'new@test.com',
        password: 'password123',
        name: 'New User',
        role: 'ADMIN', // 👈 Testing Role
        teamName: 'DevOps', // 👈 Testing Team Lookup
      } as any);

      // Assert: Did it verify the team existed?
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prisma.team.findUnique).toHaveBeenCalledWith({
        where: { name: 'DevOps' },
      });

      // Assert: Did it create the user with the correct Team ID?
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prisma.user.create).toHaveBeenCalledWith({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          email: 'new@test.com',
          role: 'ADMIN',
          teamId: 'team-123', // 👈 Verified!
        }),
      });
    });
  });
});
