import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Religion } from '../common/entities';
import { CreateReligionDto } from './dtos/create-religion.dto';
import { UpdateReligionDto } from './dtos/update-religion.dto';

@Injectable()
export class ReligionService {
  constructor(
    @InjectRepository(Religion)
    private readonly religionRepository: Repository<Religion>,
  ) {}

  async createReligion(
    createReligionDto: CreateReligionDto,
  ): Promise<Religion> {
    const religion = this.religionRepository.create(createReligionDto);
    return await this.religionRepository.save(religion);
  }

  async getAllReligions(): Promise<Religion[]> {
    return await this.religionRepository.find();
  }

  async getReligionById(id: string): Promise<Religion> {
    const religion = await this.religionRepository.findOne({ where: { id } });
    if (!religion) {
      throw new NotFoundException('Religion not found');
    }
    return religion;
  }

  async updateReligion(
    id: string,
    updateReligionDto: UpdateReligionDto,
  ): Promise<Religion> {
    await this.religionRepository.update(id, updateReligionDto);
    const religion = await this.religionRepository.findOne({ where: { id } });
    if (!religion) {
      throw new NotFoundException('Religion not found');
    }
    return religion;
  }

  async deleteReligion(id: string): Promise<void> {
    const result = await this.religionRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Religion not found');
    }
  }
}

