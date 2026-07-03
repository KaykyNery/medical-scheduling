import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { SchedulingService } from './scheduling.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AppointmentStatus } from '@prisma/client';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('scheduling')
@Controller('scheduling')
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @ApiOperation({ summary: 'List available slots for a professional on a specific date' })
  @ApiQuery({ name: 'professionalId', example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @ApiQuery({ name: 'date', example: '2026-06-29', description: 'Date in YYYY-MM-DD format' })
  @ApiResponse({ status: 200, description: 'List of slots' })
  @Get('available-slots')
  async getAvailableSlots(
    @Query('professionalId') professionalId: string,
    @Query('date') date: string,
  ) {
    return this.schedulingService.getAvailableSlots(professionalId, date);
  }

  @ApiOperation({ summary: 'Create an appointment (Patient self-service or Admin/Receptionist scheduling)' })
  @ApiResponse({ status: 201, description: 'Appointment created' })
  @ApiResponse({ status: 400, description: 'Validation error / Out of availability' })
  @ApiResponse({ status: 409, description: 'Conflict: Slot already booked (double-booking protection)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('appointments')
  async create(@Request() req: any, @Body() dto: CreateAppointmentDto) {
    let patientId = req.user.id;
    if ((req.user.role === 'ADMIN' || req.user.role === 'RECEPTIONIST') && dto.patientId) {
      patientId = dto.patientId;
    }
    return this.schedulingService.createAppointment({ ...dto, patientId });
  }

  @ApiOperation({ summary: 'Cancel an appointment with a reason' })
  @ApiResponse({ status: 200, description: 'Appointment cancelled' })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('appointments/:id/cancel')
  async cancel(
    @Param('id') id: string,
    @Body() dto: CancelAppointmentDto,
    @Request() req: any,
  ) {
    return this.schedulingService.cancelAppointment(id, dto.reason, req.user);
  }

  @ApiOperation({ summary: 'Confirm an appointment (Patient confirmation)' })
  @ApiResponse({ status: 200, description: 'Appointment confirmed' })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('appointments/:id/confirm')
  async confirm(@Param('id') id: string) {
    return this.schedulingService.confirmAppointment(id);
  }

  @ApiOperation({ summary: 'List all appointments with filters (Admin/Receptionist/Professional)' })
  @ApiQuery({ name: 'date', required: false, example: '2026-06-29' })
  @ApiQuery({ name: 'professionalId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: AppointmentStatus })
  @ApiQuery({ name: 'patientId', required: false })
  @ApiResponse({ status: 200, description: 'Filtered appointments list' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'RECEPTIONIST', 'PROFESSIONAL', 'PATIENT')
  @Get('appointments')
  async listAll(
    @Request() req: any,
    @Query('date') date?: string,
    @Query('professionalId') professionalId?: string,
    @Query('status') status?: AppointmentStatus,
    @Query('patientId') patientId?: string,
  ) {
    let targetPatientId = patientId;
    if (req.user.role === 'PATIENT') {
      targetPatientId = req.user.id;
    }
    return this.schedulingService.listAppointments({
      date,
      professionalId,
      status,
      patientId: targetPatientId,
    });
  }

  @ApiOperation({ summary: 'Get booking history for a specific patient' })
  @ApiResponse({ status: 200, description: 'List of patient appointments' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('/users/:id/appointments')
  async getUserAppointments(@Param('id') userId: string, @Request() req: any) {
    if (req.user.role === 'PATIENT' && req.user.id !== userId) {
      throw new ForbiddenException('Não autorizado a acessar histórico de outro paciente');
    }
    return this.schedulingService.getUserAppointments(userId);
  }
}
