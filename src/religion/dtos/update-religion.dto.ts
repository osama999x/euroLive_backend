import { PartialType } from '@nestjs/mapped-types';
import { CreateReligionDto } from './create-religion.dto';

export class UpdateReligionDto extends PartialType(CreateReligionDto) {}

