import { IsNotEmpty, IsString, IsInt, IsBoolean, Min, Max, Matches, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AvailabilityItemDto {
  @ApiProperty({ example: 1, description: '0 = Sunday, ..., 6 = Saturday' })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({ example: '08:00' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'startTime must be in HH:MM format (24h)' })
  startTime: string;

  @ApiProperty({ example: '18:00' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'endTime must be in HH:MM format (24h)' })
  endTime: string;

  @ApiProperty({ example: 30, default: 30 })
  @IsInt()
  @Min(10)
  @Max(120)
  @IsOptional()
  slotDuration?: number;

  @ApiProperty({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateAvailabilityDto {
  @ApiProperty({ type: [AvailabilityItemDto] })
  @ValidateNested({ each: true })
  @Type(() => AvailabilityItemDto)
  @IsNotEmpty()
  availabilities: AvailabilityItemDto[];
}
