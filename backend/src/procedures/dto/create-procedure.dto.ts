import { IsNotEmpty, IsString, IsInt, Min, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProcedureDto {
  @ApiProperty({ example: 'Consulta Geral' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Consulta de rotina e acompanhamento' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 30 })
  @IsInt()
  @Min(1)
  duration: number;
}
