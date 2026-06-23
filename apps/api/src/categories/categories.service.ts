import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Material } from '../materials/material.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Material)
    private readonly materialRepo: Repository<Material>,
  ) {}

  async findAll(): Promise<Category[]> {
    return this.categoryRepo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<Category> {
    const cat = await this.categoryRepo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    if (dto.parentId) {
      // Validate parent exists
      const parent = await this.categoryRepo.findOne({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException('Parent category not found');
    }

    const cat = this.categoryRepo.create({
      name: dto.name,
      parentId: dto.parentId ?? null,
    });
    return this.categoryRepo.save(cat);
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const cat = await this.findOne(id);

    if (dto.name !== undefined) cat.name = dto.name;
    if (dto.parentId !== undefined) {
      if (dto.parentId !== null) {
        const parent = await this.categoryRepo.findOne({ where: { id: dto.parentId } });
        if (!parent) throw new NotFoundException('Parent category not found');
      }
      cat.parentId = dto.parentId ?? null;
    }

    return this.categoryRepo.save(cat);
  }

  async remove(id: string): Promise<void> {
    const cat = await this.findOne(id);

    // Check if any non-deleted materials reference this category
    const materialCount = await this.materialRepo
      .createQueryBuilder('m')
      .where('m.category_id = :id', { id })
      .andWhere('m.deleted_at IS NULL')
      .getCount();

    if (materialCount > 0) {
      throw new ConflictException('Category has associated materials and cannot be deleted');
    }

    await this.categoryRepo.softRemove(cat);
  }
}
