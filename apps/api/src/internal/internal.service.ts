import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../categories/category.entity';
import { MaterialsService } from '../materials/materials.service';
import { PagePrepService } from '../materials/page-prep.service';
import { AiResultDto } from './dto/ai-result.dto';
import { PagePrepResultDto } from './dto/page-prep-result.dto';

@Injectable()
export class InternalService {
  constructor(
    private readonly materialsService: MaterialsService,
    private readonly pagePrepService: PagePrepService,
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
      blurb: dto.blurb,
      tags: dto.tags,
      authors: dto.authors,
      language: dto.language,
      publishYear: dto.publishYear,
      country: dto.country,
      pageCount: dto.pageCount,
      suggestedCategoryId: validatedCategoryId,
      coverUrl: dto.coverUrl,
      error: dto.error,
    });

    return { ok: true };
  }

  async handlePagePrepResult(dto: PagePrepResultDto): Promise<{ ok: boolean }> {
    await this.pagePrepService.saveResult(dto.jobId, {
      success: dto.success,
      pageCount: dto.pageCount,
      thumbnailUrls: dto.thumbnailUrls,
      error: dto.error,
    });

    return { ok: true };
  }
}
