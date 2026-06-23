import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Material, MaterialStatus } from './material.entity';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { ListMaterialsDto } from './dto/list-materials.dto';
import { PaginatedResponseDto } from '../common/pagination.dto';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

export const AI_ANALYSIS_QUEUE = 'ai-analysis';

@Injectable()
export class MaterialsService {
  constructor(
    @InjectRepository(Material)
    private readonly materialRepo: Repository<Material>,
    @InjectQueue(AI_ANALYSIS_QUEUE)
    private readonly aiQueue: Queue,
  ) {}

  async create(dto: CreateMaterialDto): Promise<Material> {
    const material = this.materialRepo.create({
      title: dto.title ?? null,
      description: dto.description ?? null,
      categoryId: dto.categoryId ?? null,
      mediaUrl: dto.mediaUrl ?? null,
      tags: dto.tags ?? [],
      status: dto.status ?? MaterialStatus.PENDING,
      isReady: false,
    });

    const saved = await this.materialRepo.save(material);

    // Enqueue AI job if mediaUrl is present
    if (saved.mediaUrl) {
      await this.enqueueAiJob(saved.id, saved.mediaUrl);
    }

    return saved;
  }

  async findAll(query: ListMaterialsDto): Promise<PaginatedResponseDto<Material>> {
    const {
      limit = 20,
      offset = 0,
      categoryId,
      tags,
      status,
      search,
      includeDeleted = false,
    } = query;

    const qb = this.materialRepo
      .createQueryBuilder('m')
      .skip(offset)
      .take(limit)
      .orderBy('m.created_at', 'DESC');

    if (!includeDeleted) {
      qb.andWhere('m.deleted_at IS NULL');
    } else {
      // withDeleted must be called to see soft-deleted records in TypeORM
      qb.withDeleted();
    }

    if (categoryId) {
      qb.andWhere('m.category_id = :categoryId', { categoryId });
    }

    if (tags) {
      const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
      if (tagList.length > 0) {
        qb.andWhere('m.tags @> :tags', { tags: tagList });
      }
    }

    if (status) {
      qb.andWhere('m.status = :status', { status });
    }

    if (search) {
      qb.andWhere(`m.search_vector @@ plainto_tsquery('simple', :search)`, { search });
    }

    const [items, total] = await qb.getManyAndCount();

    return { items, total, limit, offset };
  }

  async findOne(id: string): Promise<Material> {
    const material = await this.materialRepo.findOne({ where: { id } });
    if (!material) {
      throw new NotFoundException('Material not found');
    }
    return material;
  }

  async update(id: string, dto: UpdateMaterialDto): Promise<Material> {
    const material = await this.findOne(id);

    const hadMediaUrl = material.mediaUrl;

    if (dto.title !== undefined) material.title = dto.title;
    if (dto.description !== undefined) material.description = dto.description;
    if (dto.categoryId !== undefined) material.categoryId = dto.categoryId;
    if (dto.mediaUrl !== undefined) material.mediaUrl = dto.mediaUrl;
    if (dto.tags !== undefined) material.tags = dto.tags;
    if (dto.status !== undefined) material.status = dto.status;

    const saved = await this.materialRepo.save(material);

    // If mediaUrl was newly set (or changed), enqueue AI job
    if (dto.mediaUrl && dto.mediaUrl !== hadMediaUrl) {
      await this.enqueueAiJob(saved.id, dto.mediaUrl);
    }

    return saved;
  }

  async remove(id: string): Promise<void> {
    const material = await this.findOne(id);
    await this.materialRepo.softRemove(material);
  }

  // ---------------------------------------------------------------------------
  // Public API queries
  // ---------------------------------------------------------------------------

  async findPublicList(
    limit: number,
    offset: number,
    categoryId?: string,
    tags?: string,
    search?: string,
  ): Promise<PaginatedResponseDto<Material>> {
    const qb = this.materialRepo
      .createQueryBuilder('m')
      .where('m.status = :status', { status: MaterialStatus.ACTIVE })
      .andWhere('m.is_ready = true')
      .andWhere('m.deleted_at IS NULL')
      .skip(offset)
      .take(limit)
      .orderBy('m.created_at', 'DESC');

    if (categoryId) {
      qb.andWhere('m.category_id = :categoryId', { categoryId });
    }

    if (tags) {
      const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
      if (tagList.length > 0) {
        qb.andWhere('m.tags @> :tags', { tags: tagList });
      }
    }

    if (search) {
      qb.andWhere(`m.search_vector @@ plainto_tsquery('simple', :search)`, { search });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total, limit, offset };
  }

  async findPublicOne(id: string): Promise<Material> {
    const material = await this.materialRepo.findOne({
      where: {
        id,
        status: MaterialStatus.ACTIVE,
        isReady: true,
      },
    });

    if (!material || material.deletedAt !== null) {
      throw new NotFoundException('Material not found');
    }

    return material;
  }

  // ---------------------------------------------------------------------------
  // AI callback
  // ---------------------------------------------------------------------------

  async applyAiResult(
    materialId: string,
    success: boolean,
    fields: {
      title?: string | null;
      description?: string | null;
      tags?: string[] | null;
      suggestedCategoryId?: string | null;
      error?: string | null;
    },
  ): Promise<Material> {
    const material = await this.materialRepo.findOne({ where: { id: materialId } });
    if (!material) {
      throw new NotFoundException(`Material ${materialId} not found`);
    }

    if (success) {
      if (fields.title != null) material.title = fields.title;
      if (fields.description != null) material.description = fields.description;
      if (fields.tags != null) material.tags = fields.tags;
      if (fields.suggestedCategoryId != null) {
        // Validated upstream in InternalService
        material.categoryId = fields.suggestedCategoryId;
      }
      material.isReady = true;
      material.status = MaterialStatus.ACTIVE;
    } else {
      material.status = MaterialStatus.NEEDS_REVIEW;
      material.isReady = false;
    }

    return this.materialRepo.save(material);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async enqueueAiJob(materialId: string, mediaUrl: string): Promise<void> {
    await this.aiQueue.add(
      'analyze_material',
      { materialId, mediaUrl },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    );
  }
}
