import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAppointmentDto {
  @ApiProperty({
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  patientId?: string;

  @ApiProperty({ example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @IsUUID()
  @IsNotEmpty()
  professionalId: string;

  @ApiProperty({ example: '2026-06-29T10:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  startsAt: string;

  @ApiProperty({
    example: 'Paciente relata dor de cabeça persistente',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
