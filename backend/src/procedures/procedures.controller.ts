import { Controller, Post, Body, UseGuards, Patch, Param, Get, Delete } from '@nestjs/common';
import { ProceduresService } from './procedures.service';
import { CreateProcedureDto } from './dto/create-procedure.dto';
import { UpdateProcedureDto } from './dto/update-procedure.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('procedures')
@Controller('procedures')
export class ProceduresController {
  constructor(private readonly proceduresService: ProceduresService) {}

  @ApiOperation({ summary: 'Create a medical procedure (Admin/Receptionist only)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'RECEPTIONIST')
  @Post()
  async create(@Body() dto: CreateProcedureDto) {
    return this.proceduresService.create(dto);
  }

  @ApiOperation({ summary: 'List all active procedures' })
  @Get()
  async listActive() {
    return this.proceduresService.listActive();
  }

  @ApiOperation({ summary: 'Edit a procedure (Admin/Receptionist only)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'RECEPTIONIST')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateProcedureDto) {
    return this.proceduresService.update(id, dto);
  }

  @ApiOperation({ summary: 'Soft delete a procedure (Admin/Receptionist only)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'RECEPTIONIST')
  @Delete(':id')
  async softDelete(@Param('id') id: string) {
    return this.proceduresService.softDelete(id);
  }
}
