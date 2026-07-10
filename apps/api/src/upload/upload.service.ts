import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, HeadBucketCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import type { AppConfig } from '../config/config';

const ALLOWED_MIME_TYPES = [
  // Documents
  'application/pdf',
  'application/msword',                                                          // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',    // .docx
  'application/vnd.oasis.opendocument.text',                                    // .odt
  // Presentations
  'application/vnd.ms-powerpoint',                                              // .ppt
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',  // .pptx
  'application/vnd.oasis.opendocument.presentation',                            // .odp
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly s3: S3Client;

  constructor(private readonly configService: ConfigService) {
    const cfg = this.cfg;

    this.s3 = new S3Client({
      endpoint: cfg.minioEndpoint,
      region: 'us-east-1', // MinIO ignores this but SDK requires it
      credentials: {
        accessKeyId: cfg.minioAccessKey,
        secretAccessKey: cfg.minioSecretKey,
      },
      forcePathStyle: true, // Required for MinIO path-style addressing
    });

    this.ensureBucketExists().catch((err) =>
      this.logger.warn(`Could not ensure bucket exists: ${String(err)}`),
    );
  }

  private get cfg(): AppConfig {
    const c = this.configService.get<AppConfig>('app');
    if (!c) throw new Error('App config missing');
    return c;
  }

  async upload(file: Express.Multer.File): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File exceeds maximum size of 100 MB');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Qo'llab-quvvatlanmaydigan fayl turi: ${file.mimetype}. Ruxsat etilgan: PDF, DOC, DOCX, PPT, PPTX, ODP, ODT`,
      );
    }

    const ext = path.extname(file.originalname).toLowerCase() || '';
    const key = `${uuidv4()}${ext}`;
    const bucket = this.cfg.minioBucket;

    // Stream the upload — no full buffer in memory beyond what multer already holds
    const stream = Readable.from(file.buffer);

    const upload = new Upload({
      client: this.s3,
      params: {
        Bucket: bucket,
        Key: key,
        Body: stream,
        ContentType: file.mimetype,
        ContentLength: file.size,
      },
    });

    await upload.done();

    const url = `${this.cfg.minioPublicUrl}/${key}`;
    this.logger.log(`Uploaded file to MinIO: ${url}`);
    return { url };
  }

  private async ensureBucketExists(): Promise<void> {
    const bucket = this.cfg.minioBucket;
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch {
      this.logger.log(`Bucket "${bucket}" not found — creating...`);
      await this.s3.send(new CreateBucketCommand({ Bucket: bucket }));
      this.logger.log(`Bucket "${bucket}" created`);
    }
  }
}
