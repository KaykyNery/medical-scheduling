import { Controller, Post, Body, UseGuards, Put, Param, Get, Delete, Query, Patch } from '@nestjs/common';
import { ProfessionalsService } from './professionals.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { ProfessionalResponseDto } from './dto/professional-response.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('professionals')
@Controller('professionals')
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @ApiOperation({ summary: 'Create a professional profile (Admin/Receptionist only)' })
  @ApiResponse({ status: 201, type: ProfessionalResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 409, description: 'Conflict: user already is professional or CRM is in use' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'RECEPTIONIST')
  @Post()
  async create(@Body() dto: CreateProfessionalDto): Promise<ProfessionalResponseDto> {
    const result = await this.professionalsService.create(dto);
    return new ProfessionalResponseDto(result);
  }

  @ApiOperation({ summary: 'List all professionals' })
  @ApiResponse({ status: 200, type: [ProfessionalResponseDto] })
  @Get()
  async listAll(@Query('onlyActive') onlyActive?: string): Promise<ProfessionalResponseDto[]> {
    const activeOnly = onlyActive === 'true';
    const results = await this.professionalsService.listAll(activeOnly);
    return results.map((item) => new ProfessionalResponseDto(item));
  }

  @ApiOperation({ summary: 'List available specialties' })
  @ApiResponse({ status: 200, description: 'List of distinct specialties' })
  @Get('specialties')
  async listSpecialties() {
    return this.professionalsService.listSpecialties();
  }

  @ApiOperation({ summary: 'Get professional details by ID' })
  @ApiResponse({ status: 200, type: ProfessionalResponseDto })
  @ApiResponse({ status: 404, description: 'Professional not found' })
  @Get(':id')
  async findById(@Param('id') id: string): Promise<ProfessionalResponseDto> {
    const result = await this.professionalsService.findById(id);
    return new ProfessionalResponseDto(result);
  }

  @ApiOperation({ summary: 'Configure weekly availability for a professional (Admin/Receptionist/Professional)' })
  @ApiResponse({ status: 200, description: 'Weekly availability updated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Professional not found' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'RECEPTIONIST', 'PROFESSIONAL')
  @Put(':id/availability')
  async updateAvailability(
    @Param('id') id: string,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    return this.professionalsService.updateAvailability(id, dto);
  }

  @ApiOperation({ summary: 'Update a professional profile (Admin/Receptionist only)' })
  @ApiResponse({ status: 200, type: ProfessionalResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Professional not found' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'RECEPTIONIST')
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProfessionalDto,
  ) {
    const result = await this.professionalsService.update(id, dto);
    return new ProfessionalResponseDto(result);
  }

  @ApiOperation({ summary: 'Soft delete a professional profile (Admin/Receptionist only)' })
  @ApiResponse({ status: 200, description: 'Professional profile deactivated' })
  @ApiResponse({ status: 404, description: 'Professional not found' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'RECEPTIONIST')
  @Delete(':id')
  async softDelete(@Param('id') id: string) {
    const result = await this.professionalsService.softDelete(id);
    return new ProfessionalResponseDto(result);
  }

  @ApiOperation({ summary: 'Update professional active status (Admin/Receptionist only)' })
  @ApiResponse({ status: 200, type: ProfessionalResponseDto })
  @ApiResponse({ status: 404, description: 'Professional not found' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'RECEPTIONIST')
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    const result = await this.professionalsService.updateStatus(id, dto.isActive);
    return new ProfessionalResponseDto(result);
  }
}
