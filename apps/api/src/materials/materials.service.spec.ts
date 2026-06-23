import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bull';
import { MaterialsService, AI_ANALYSIS_QUEUE } from './materials.service';
import { Material, MaterialStatus } from './material.entity';
import type { ListMaterialsDto } from './dto/list-materials.dto';
import type { CreateMaterialDto } from './dto/create-material.dto';

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

/** Minimal query builder mock that tracks how it was called. */
function makeQb(items: Material[] = [], total = items.length) {
  const qb: Record<string, jest.Mock> = {};
  const self = (): typeof qb => qb;

  qb.skip = jest.fn(self);
  qb.take = jest.fn(self);
  qb.orderBy = jest.fn(self);
  qb.andWhere = jest.fn(self);
  qb.where = jest.fn(self);
  qb.withDeleted = jest.fn(self);
  qb.getManyAndCount = jest.fn().mockResolvedValue([items, total]);

  return qb;
}

function makeMaterialRepo(qbItems: Material[] = [], overrides: Partial<Record<string, jest.Mock>> = {}) {
  const qb = makeQb(qbItems);
  return {
    createQueryBuilder: jest.fn().mockReturnValue(qb),
    create: jest.fn((data: Partial<Material>) => ({ ...data } as Material)),
    save: jest.fn((entity: Material) => Promise.resolve({ ...entity, id: 'mat-uuid' } as Material)),
    findOne: jest.fn().mockResolvedValue(null),
    softRemove: jest.fn().mockResolvedValue(undefined),
    ...overrides,
    _qb: qb,
  };
}

function makeQueue() {
  return {
    add: jest.fn().mockResolvedValue({ id: 'job-1' }),
  };
}

async function buildModule(
  qbItems: Material[] = [],
  repoOverrides: Partial<Record<string, jest.Mock>> = {},
) {
  const repo = makeMaterialRepo(qbItems, repoOverrides);
  const queue = makeQueue();

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      MaterialsService,
      { provide: getRepositoryToken(Material), useValue: repo },
      { provide: getQueueToken(AI_ANALYSIS_QUEUE), useValue: queue },
    ],
  }).compile();

  const service = module.get<MaterialsService>(MaterialsService);
  return { service, repo, queue };
}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeMaterial(overrides: Partial<Material> = {}): Material {
  return {
    id: 'mat-uuid',
    title: 'Test Material',
    description: 'A description',
    categoryId: null,
    mediaUrl: null,
    tags: [],
    status: MaterialStatus.PENDING,
    isReady: false,
    embedding: null,
    searchVector: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    category: null,
    getEmbeddingArray: () => null,
    ...overrides,
  } as Material;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MaterialsService', () => {
  // -------------------------------------------------------------------------
  // create()
  // -------------------------------------------------------------------------
  describe('create()', () => {
    it('sets status=pending and isReady=false', async () => {
      const { service, repo } = await buildModule();
      const dto: CreateMaterialDto = { title: 'New Material', mediaUrl: null };

      repo.save.mockResolvedValue(makeMaterial({ title: 'New Material' }));

      const result = await service.create(dto);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: MaterialStatus.PENDING, isReady: false }),
      );
      expect(result.status).toBe(MaterialStatus.PENDING);
      expect(result.isReady).toBe(false);
    });

    it('enqueues an AI job when mediaUrl is present', async () => {
      const { service, repo, queue } = await buildModule();
      const dto: CreateMaterialDto = { title: 'Video', mediaUrl: 'https://minio/video.mp4' };
      const saved = makeMaterial({ id: 'new-id', mediaUrl: 'https://minio/video.mp4' });
      repo.save.mockResolvedValue(saved);

      await service.create(dto);

      expect(queue.add).toHaveBeenCalledWith(
        'analyze_material',
        { materialId: 'new-id', mediaUrl: 'https://minio/video.mp4' },
        expect.objectContaining({ attempts: 3 }),
      );
    });

    it('does NOT enqueue AI job when mediaUrl is absent', async () => {
      const { service, repo, queue } = await buildModule();
      const dto: CreateMaterialDto = { title: 'No Media' };
      repo.save.mockResolvedValue(makeMaterial());

      await service.create(dto);

      expect(queue.add).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // findAll()
  // -------------------------------------------------------------------------
  describe('findAll()', () => {
    it('applies skip/take from offset/limit', async () => {
      const items = [makeMaterial()];
      const { service, repo } = await buildModule(items);
      const qb = repo._qb as ReturnType<typeof makeQb>;

      const query: ListMaterialsDto = { limit: 10, offset: 20 };
      await service.findAll(query);

      expect(qb.skip).toHaveBeenCalledWith(20);
      expect(qb.take).toHaveBeenCalledWith(10);
    });

    it('filters by categoryId when provided', async () => {
      const { service, repo } = await buildModule();
      const qb = repo._qb as ReturnType<typeof makeQb>;

      const query: ListMaterialsDto = { categoryId: 'cat-123' };
      await service.findAll(query);

      expect(qb.andWhere).toHaveBeenCalledWith(
        'm.category_id = :categoryId',
        { categoryId: 'cat-123' },
      );
    });

    it('filters by status when provided', async () => {
      const { service, repo } = await buildModule();
      const qb = repo._qb as ReturnType<typeof makeQb>;

      const query: ListMaterialsDto = { status: MaterialStatus.ACTIVE };
      await service.findAll(query);

      expect(qb.andWhere).toHaveBeenCalledWith('m.status = :status', { status: MaterialStatus.ACTIVE });
    });

    it('filters by tags when provided', async () => {
      const { service, repo } = await buildModule();
      const qb = repo._qb as ReturnType<typeof makeQb>;

      const query: ListMaterialsDto = { tags: 'math,science' };
      await service.findAll(query);

      expect(qb.andWhere).toHaveBeenCalledWith('m.tags @> :tags', { tags: ['math', 'science'] });
    });

    it('excludes soft-deleted records by default', async () => {
      const { service, repo } = await buildModule();
      const qb = repo._qb as ReturnType<typeof makeQb>;

      await service.findAll({});

      expect(qb.andWhere).toHaveBeenCalledWith('m.deleted_at IS NULL');
    });

    it('includes soft-deleted records when includeDeleted=true', async () => {
      const { service, repo } = await buildModule();
      const qb = repo._qb as ReturnType<typeof makeQb>;

      await service.findAll({ includeDeleted: true });

      expect(qb.withDeleted).toHaveBeenCalled();
    });

    it('returns paginated envelope with correct shape', async () => {
      const items = [makeMaterial(), makeMaterial({ id: 'mat-2' })];
      const { service } = await buildModule(items, {
        createQueryBuilder: jest.fn().mockReturnValue(makeQb(items, 50)),
      });

      const result = await service.findAll({ limit: 2, offset: 0 });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(50);
      expect(result.limit).toBe(2);
      expect(result.offset).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // softDelete (remove())
  // -------------------------------------------------------------------------
  describe('remove() — soft delete', () => {
    it('calls softRemove() and never calls repository.remove()', async () => {
      const mat = makeMaterial();
      const softRemoveMock = jest.fn().mockResolvedValue(undefined);
      const { service, repo } = await buildModule([], {
        findOne: jest.fn().mockResolvedValue(mat),
        softRemove: softRemoveMock,
      });

      await service.remove('mat-uuid');

      // softRemove must have been called with the material entity
      expect(softRemoveMock).toHaveBeenCalledWith(mat);
      // The mock has no "remove" property — asserting the mock isn't present
      // implicitly proves hard-delete was never attempted.
      expect('remove' in repo).toBe(false);
    });

    it('throws NotFoundException when material does not exist', async () => {
      const { service } = await buildModule([], { findOne: jest.fn().mockResolvedValue(null) });

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // Public API filter (findPublicList)
  // -------------------------------------------------------------------------
  describe('findPublicList() — public API filters', () => {
    it('always filters status=active, is_ready=true, and deleted_at IS NULL', async () => {
      const { service, repo } = await buildModule();
      const qb = repo._qb as ReturnType<typeof makeQb>;

      await service.findPublicList(10, 0);

      // Verify the three mandatory public-safety constraints are applied
      expect(qb.where).toHaveBeenCalledWith('m.status = :status', { status: MaterialStatus.ACTIVE });
      expect(qb.andWhere).toHaveBeenCalledWith('m.is_ready = true');
      expect(qb.andWhere).toHaveBeenCalledWith('m.deleted_at IS NULL');
    });
  });
});
