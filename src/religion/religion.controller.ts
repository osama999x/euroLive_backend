import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReligionService } from './religion.service';
import { CreateReligionDto } from './dtos/create-religion.dto';
import { UpdateReligionDto } from './dtos/update-religion.dto';
import { Public } from '../common/decorators';

@Controller('religion')
export class ReligionController {
  constructor(private readonly religionService: ReligionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createReligion(@Body() createReligionDto: CreateReligionDto) {
    const religion =
      await this.religionService.createReligion(createReligionDto);
    return {
      message: 'Religion created successfully!',
      data: religion,
      status: HttpStatus.CREATED,
    };
  }

  @Get()
  @Public()
  async getAllReligions() {
    const religions = await this.religionService.getAllReligions();
    return {
      message: 'Religions retrieved successfully!',
      data: religions,
      status: HttpStatus.OK,
    };
  }

  @Get(':id')
  @Public()
  async getReligionById(@Param('id') id: string) {
    const religion = await this.religionService.getReligionById(id);
    return {
      message: 'Religion retrieved successfully!',
      data: religion,
      status: HttpStatus.OK,
    };
  }

  @Put(':id')
  async updateReligion(
    @Param('id') id: string,
    @Body() updateReligionDto: UpdateReligionDto,
  ) {
    const religion = await this.religionService.updateReligion(
      id,
      updateReligionDto,
    );
    return {
      message: 'Religion updated successfully!',
      data: religion,
      status: HttpStatus.OK,
    };
  }

  @Delete(':id')
  async deleteReligion(@Param('id') id: string) {
    await this.religionService.deleteReligion(id);
    return {
      message: 'Religion deleted successfully!',
      status: HttpStatus.OK,
    };
  }
}

