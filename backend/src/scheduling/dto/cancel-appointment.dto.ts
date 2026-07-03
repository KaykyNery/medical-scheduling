import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelAppointmentDto {
  @ApiProperty({ example: 'Imprevisto de trabalho' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
