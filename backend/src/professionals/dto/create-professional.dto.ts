import { IsNotEmpty, IsString, IsEmail, IsOptional, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AvailabilityItemDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  dayOfWeek: number;

  @ApiProperty({ example: '08:00' })
  @IsString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ example: '12:00' })
  @IsString()
  @IsNotEmpty()
  endTime: string;
}

export class CreateProfessionalDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({ example: 'Dr. House' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'house@clinic.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: '(11) 99999-9999' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'Infectologia' })
  @IsString()
  @IsNotEmpty()
  specialty: string;

  @ApiProperty({ example: 'CRM/SP 123456' })
  @IsString()
  @IsNotEmpty()
  registrationId: string;

  @ApiProperty({ example: 30 })
  @IsNumber()
  @IsOptional()
  slotDuration?: number;

  @ApiProperty({ type: [AvailabilityItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityItemDto)
  @IsOptional()
  availabilities?: AvailabilityItemDto[];
}
