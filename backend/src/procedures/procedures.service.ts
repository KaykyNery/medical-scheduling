import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateProcedureDto } from './dto/create-procedure.dto';
import { UpdateProcedureDto } from './dto/update-procedure.dto';

@Injectable()
export class ProceduresService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProcedureDto) {
    return this.prisma.procedure.create({
      data: {
        name: dto.name,
        description: dto.description,
        duration: dto.duration,
        isActive: true,
      },
    });
  }

  async listActive() {
    return this.prisma.procedure.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async update(id: string, dto: UpdateProcedureDto) {
    const procedure = await this.prisma.procedure.findUnique({
      where: { id },
    });
    if (!procedure) {
      throw new NotFoundException('Procedimento não encontrado');
    }

    return this.prisma.procedure.update({
      where: { id },
      data: dto,
    });
  }

  async softDelete(id: string) {
    const procedure = await this.prisma.procedure.findUnique({
      where: { id },
    });
    if (!procedure) {
      throw new NotFoundException('Procedimento não encontrado');
    }

    return this.prisma.procedure.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
