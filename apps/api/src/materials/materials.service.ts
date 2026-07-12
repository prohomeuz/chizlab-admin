import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Material, MaterialStatus } from './material.entity';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { ListMaterialsDto } from './dto/list-materials.dto';
import { PaginatedResponseDto } from '../common/pagination.dto';
import { AiJobService } from './ai-job.service';

@Injectable()
export class MaterialsService {
  private readonly logger = new Logger(MaterialsService.name);

  constructor(
    @InjectRepository(Material)
    private readonly materialRepo: Repository<Material>,
    private readonly aiJobService: AiJobService,
  ) {}

  async create(dto: CreateMaterialDto): Promise<Material> {
    const material = this.materialRepo.create({
      title: dto.title ?? null,
      description: dto.description ?? null,
      categoryId: dto.categoryId ?? null,
      materialType: dto.materialType ?? null,
      mediaUrl: dto.mediaUrl ?? null,
      tags: dto.tags ?? [],
      authors: [],
      pageCount: dto.pageCount ?? null,
      status: MaterialStatus.PENDING,
      isReady: false,
    });

    const saved = await this.materialRepo.save(material);

    if (saved.mediaUrl) {
      this.enqueueAiJob(saved.id, saved.mediaUrl, dto.selectedPages);
    }

    return saved;
  }

  async findAll(query: ListMaterialsDto): Promise<PaginatedResponseDto<Material>> {
    const {
      limit = 20,
      offset = 0,
      categoryId,
      materialType,
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

    if (materialType) {
      qb.andWhere('m.material_type = :materialType', { materialType });
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
      const like = `%${search}%`;
      qb.andWhere(
        `(m.search_vector @@ plainto_tsquery('simple', :search)
          OR m.title ILIKE :like
          OR m.description ILIKE :like
          OR array_to_string(m.authors, ' ') ILIKE :like
          OR array_to_string(m.tags, ' ') ILIKE :like
          OR word_similarity(:search, coalesce(m.title, '')) > 0.6
          OR word_similarity(:search, array_to_string(m.authors, ' ')) > 0.6)`,
        { search, like },
      );
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
    if (dto.blurb !== undefined) material.blurb = dto.blurb;
    if (dto.categoryId !== undefined) material.categoryId = dto.categoryId;
    if (dto.materialType !== undefined) material.materialType = dto.materialType;
    if (dto.mediaUrl !== undefined) material.mediaUrl = dto.mediaUrl;
    if (dto.tags !== undefined) material.tags = dto.tags;
    if (dto.authors !== undefined) material.authors = dto.authors;
    if (dto.language !== undefined) material.language = dto.language;
    if (dto.publishYear !== undefined) material.publishYear = dto.publishYear;
    if (dto.country !== undefined) material.country = dto.country;
    if (dto.pageCount !== undefined) material.pageCount = dto.pageCount;
    if (dto.status !== undefined) material.status = dto.status;

    // When file is replaced, reset status and re-queue AI
    if (dto.mediaUrl && dto.mediaUrl !== hadMediaUrl) {
      material.status = MaterialStatus.PENDING;
      material.isReady = false;
    }

    const saved = await this.materialRepo.save(material);

    if (dto.mediaUrl && dto.mediaUrl !== hadMediaUrl) {
      this.enqueueAiJob(saved.id, dto.mediaUrl);
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
      .where('m.status = :status', { status: MaterialStatus.READY })
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
      const like = `%${search}%`;
      qb.andWhere(
        `(m.search_vector @@ plainto_tsquery('simple', :search)
          OR m.title ILIKE :like
          OR m.description ILIKE :like
          OR array_to_string(m.authors, ' ') ILIKE :like
          OR array_to_string(m.tags, ' ') ILIKE :like
          OR word_similarity(:search, coalesce(m.title, '')) > 0.6
          OR word_similarity(:search, array_to_string(m.authors, ' ')) > 0.6)`,
        { search, like },
      );
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total, limit, offset };
  }

  async findPublicOne(id: string): Promise<Material> {
    const material = await this.materialRepo.findOne({
      where: {
        id,
        status: MaterialStatus.READY,
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
      blurb?: string | null;
      tags?: string[] | null;
      authors?: string[] | null;
      language?: string | null;
      publishYear?: number | null;
      country?: string | null;
      pageCount?: number | null;
      suggestedCategoryId?: string | null;
      coverUrl?: string | null;
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
      if (fields.blurb != null) material.blurb = fields.blurb;
      if (fields.tags != null) material.tags = fields.tags;
      if (fields.authors != null) material.authors = fields.authors;
      if (fields.language != null) material.language = fields.language;
      if (fields.publishYear != null) material.publishYear = fields.publishYear;
      if (fields.country != null) material.country = fields.country;
      // Page count from the page-prep render (set at create) is authoritative and always
      // accurate — only let the AI's extracted value fill it in when it wasn't already set.
      if (fields.pageCount != null && material.pageCount == null) {
        material.pageCount = fields.pageCount;
      }
      if (fields.suggestedCategoryId != null) {
        material.categoryId = fields.suggestedCategoryId;
      }
      if (fields.coverUrl != null) material.coverUrl = fields.coverUrl;
      material.isReady = true;
      // AI natijasi qoralama bo'lib turadi — admin formani ko'rib chiqib
      // "Saqlash"ni bosgandagina material READY bo'ladi (public API'ga chiqadi).
      material.status = MaterialStatus.DRAFT;
    } else {
      // Technical failure — move out of pending so UI polling stops
      material.isReady = false;
      material.status = MaterialStatus.DRAFT;
    }

    return this.materialRepo.save(material);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  async getProgress(materialId: string): Promise<number> {
    return this.aiJobService.getProgress(materialId);
  }

  private enqueueAiJob(
    materialId: string,
    mediaUrl: string,
    selectedPages?: number[],
  ): void {
    this.aiJobService.enqueue(materialId, mediaUrl, selectedPages).catch((err: unknown) => {
      this.logger.error(`Failed to enqueue AI job for material=${materialId}`, err);
    });
  }
}
