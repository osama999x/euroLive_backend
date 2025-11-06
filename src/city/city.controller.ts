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
import { CityService } from './city.service';
import { CreateCityDto } from './dtos/create-city.dto';
import { UpdateCityDto } from './dtos/update-city.dto';
import { Public } from '../common/decorators';

@Controller('cities')
export class CityController {
  constructor(private readonly cityService: CityService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCity(@Body() createCityDto: CreateCityDto) {
    const city = await this.cityService.createCity(createCityDto);
    return {
      message: 'City created successfully!',
      data: city,
      status: HttpStatus.CREATED,
    };
  }

  @Get()
  @Public()
  async getAllCities() {
    const cities = await this.cityService.getAllCities();
    return {
      message: 'Cities retrieved successfully!',
      data: cities,
      status: HttpStatus.OK,
    };
  }

  @Get(':id')
  @Public()
  async getCityById(@Param('id') id: string) {
    const city = await this.cityService.getCityById(id);
    return {
      message: 'City retrieved successfully!',
      data: city,
      status: HttpStatus.OK,
    };
  }

  @Put(':id')
  async updateCity(
    @Param('id') id: string,
    @Body() updateCityDto: UpdateCityDto,
  ) {
    const city = await this.cityService.updateCity(id, updateCityDto);
    return {
      message: 'City updated successfully!',
      data: city,
      status: HttpStatus.OK,
    };
  }

  @Delete(':id')
  async deleteCity(@Param('id') id: string) {
    await this.cityService.deleteCity(id);
    return {
      message: 'City deleted successfully!',
      status: HttpStatus.OK,
    };
  }
}

