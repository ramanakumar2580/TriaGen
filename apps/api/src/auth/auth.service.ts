import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // 1. REGISTER
  async register(dto: RegisterDto) {
    // A. Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // B. 🏢 Smart Sign-Up: Find Team ID from Name
    let teamId: string | null = null;

    if (dto.teamName) {
      const team = await this.prisma.team.findUnique({
        where: { name: dto.teamName },
      });

      if (!team) {
        throw new NotFoundException(
          `Team '${dto.teamName}' not found. Please contact support.`,
        );
      }
      teamId = team.id;
    }

    // C. Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    // D. Create User with Role & Team
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        password: hashedPassword,
        role: dto.role || 'MEMBER',
        teamId: teamId,
      },
      include: { team: true }, // Return team details after register
    });

    return { message: 'User registered successfully', userId: user.id };
  }

  // 2. LOGIN (🔥 FIXED TO INCLUDE TEAM NAME)
  async login(dto: LoginDto) {
    // A. Find User AND include Team details
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { team: true }, // <--- IDHI ADD CHESA! (Very Important)
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // B. Check Password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // C. Generate Token
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      teamId: user.teamId,
    };

    const token = await this.jwtService.signAsync(payload);

    return {
      message: 'Login successful',
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        team: user.team, // <--- Now this has { name: "DevOps" }
      },
    };
  }
}
