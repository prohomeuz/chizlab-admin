import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * DataSource used by TypeORM CLI for migrations.
 * The app module uses a separate TypeOrmModule.forRootAsync() that reads
 * from @nestjs/config — keep them in sync.
 */
export default new DataSource({
  type: 'postgres',
  host: process.env['DATABASE_HOST'] ?? 'localhost',
  port: parseInt(process.env['DATABASE_PORT'] ?? '5432', 10),
  username: process.env['DATABASE_USER'] ?? 'chizlab',
  password: process.env['DATABASE_PASSWORD'] ?? 'chizlab_password',
  database: process.env['DATABASE_NAME'] ?? 'chizlab_materials',
  entities: [path.resolve(__dirname, '../**/*.entity{.ts,.js}')],
  migrations: [path.resolve(__dirname, '../migrations/*{.ts,.js}')],
  synchronize: false,
  migrationsTransactionMode: 'each',
  logging: process.env['NODE_ENV'] !== 'production',
});
