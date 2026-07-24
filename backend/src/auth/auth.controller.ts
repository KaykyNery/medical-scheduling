import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterThrottlerGuard } from './guards/register-throttler.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @ApiOperation({ summary: 'Register a new patient' })
  @ApiResponse({ status: 201, type: UserResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Conflict: e-mail already exists' })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests: Rate limit exceeded',
  })
  @UseGuards(RegisterThrottlerGuard)
  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<UserResponseDto> {
    const user = await this.usersService.create({
      ...registerDto,
      role: 'PATIENT',
    });
    return new UserResponseDto(user);
  }

  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: 200,
    description: 'Return JWT access and refresh tokens',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: LoginDto })
  @Post('login')
  async login(@Request() req: any) {
    const result = await this.authService.login(req.user);
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: new UserResponseDto(result.user),
    };
  }

  @ApiOperation({ summary: 'Refresh JWT access and refresh tokens' })
  @ApiResponse({ status: 200, description: 'Return new JWT tokens' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Body() refreshDto: RefreshDto) {
    const result = await this.authService.refresh(refreshDto.refreshToken);
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: new UserResponseDto(result.user),
    };
  }

  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req: any): Promise<UserResponseDto> {
    const user = await this.usersService.findById(req.user.id);
    return new UserResponseDto(user);
  }
}
