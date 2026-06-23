import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../categories/category.entity';
import { MaterialsService } from '../materials/materials.service';
import { AiResultDto } from './dto/ai-result.dto';

@Injectable()
export class InternalService {
  constructor(
    private readonly materialsService: MaterialsService,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  async handleAiResult(dto: AiResultDto): Promise<{ ok: boolean }> {
    // Validate suggested category exists before applying
    let validatedCategoryId: string | null = null;
    if (dto.success && dto.suggestedCategoryId) {
      const cat = await this.categoryRepo.findOne({ where: { id: dto.suggestedCategoryId } });
      if (cat) {
        validatedCategoryId = dto.suggestedCategoryId;
      }
      // If category doesn't exist, we just skip it silently (don't fail the callback)
    }

    await this.materialsService.applyAiResult(dto.materialId, dto.success, {
      title: dto.title,
      description: dto.description,
      tags: dto.tags,
      suggestedCategoryId: validatedCategoryId,
      error: dto.error,
    });

    return { ok: true };
  }
}
