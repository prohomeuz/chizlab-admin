import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AppConfig } from '../config/config';
import { Category } from '../categories/category.entity';
import { Material, MaterialStatus } from '../materials/material.entity';
import { buildCaption, slugifyCategory } from './telegram.util';

/** Minimal shape of a Telegram Bot API response we care about. */
interface TgResponse {
  ok: boolean;
  result?: { message_id: number };
  error_code?: number;
  description?: string;
}

/**
 * Keeps a Telegram channel post in sync with a material's public state.
 *
 * A material is posted to the channel the moment it becomes public
 * (status = ready). Any later edit re-renders the post; unpublishing or
 * soft-deleting removes it. All work is idempotent and driven off the
 * material's persisted `telegramMessageId`, so repeated syncs converge.
 */
@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly token: string;
  private readonly channelId: string;
  private readonly siteUrl: string;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Material)
    private readonly materialRepo: Repository<Material>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {
    const cfg = this.config.get<AppConfig>('app');
    this.token = cfg?.telegramBotToken ?? '';
    this.channelId = cfg?.telegramChannelId ?? '';
    this.siteUrl = cfg?.publicSiteUrl ?? 'https://chizlab.uz';
  }

  get enabled(): boolean {
    return Boolean(this.token && this.channelId);
  }

  /**
   * Reconcile the channel post for a material. Safe to call after any
   * mutation (create/update/publish/unpublish/delete). Errors are logged,
   * never thrown, so channel issues can't break admin operations.
   */
  async syncMaterial(materialId: string): Promise<void> {
    if (!this.enabled) return;

    try {
      const material = await this.materialRepo.findOne({
        where: { id: materialId },
        withDeleted: true,
      });
      if (!material) return;

      const shouldPublish =
        material.status === MaterialStatus.READY &&
        !material.deletedAt &&
        Boolean(material.mediaUrl);
      const existingId = material.telegramMessageId;

      if (shouldPublish) {
        const category = material.categoryId
          ? await this.categoryRepo.findOne({ where: { id: material.categoryId } })
          : null;
        const url = `${this.siteUrl}/materiallar/${slugifyCategory(category?.name)}/${material.id}`;
        const caption = buildCaption(material, category?.name ?? null, url);

        if (existingId == null) {
          const messageId = await this.sendPost(this.channelId, caption, material.coverUrl);
          await this.materialRepo.update(material.id, {
            telegramMessageId: messageId,
            telegramChatId: this.channelId,
          });
        } else {
          const chatId = material.telegramChatId ?? this.channelId;
          try {
            await this.editPost(chatId, existingId, caption, material.coverUrl);
          } catch (err) {
            // Fallback covers photo<->text switches, manually deleted posts, etc.
            this.logger.warn(
              `edit failed for material=${material.id}, resending: ${String(err)}`,
            );
            await this.deletePost(chatId, existingId);
            const messageId = await this.sendPost(this.channelId, caption, material.coverUrl);
            await this.materialRepo.update(material.id, {
              telegramMessageId: messageId,
              telegramChatId: this.channelId,
            });
          }
        }
      } else if (existingId != null) {
        await this.deletePost(material.telegramChatId ?? this.channelId, existingId);
        await this.materialRepo.update(material.id, {
          telegramMessageId: null,
          telegramChatId: null,
        });
      }
    } catch (err) {
      this.logger.error(`Telegram sync failed for material=${materialId}`, err as Error);
    }
  }

  // ---------------------------------------------------------------------------
  // Bot API primitives
  // ---------------------------------------------------------------------------

  private async sendPost(
    chatId: string,
    caption: string,
    coverUrl: string | null,
  ): Promise<number> {
    if (coverUrl) {
      const result = await this.callApi('sendPhoto', {
        chat_id: chatId,
        photo: coverUrl,
        caption,
        parse_mode: 'HTML',
      });
      return result.message_id;
    }
    const result = await this.callApi('sendMessage', {
      chat_id: chatId,
      text: caption,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });
    return result.message_id;
  }

  private async editPost(
    chatId: string,
    messageId: number,
    caption: string,
    coverUrl: string | null,
  ): Promise<void> {
    if (coverUrl) {
      await this.callApi('editMessageMedia', {
        chat_id: chatId,
        message_id: Number(messageId),
        media: { type: 'photo', media: coverUrl, caption, parse_mode: 'HTML' },
      });
    } else {
      await this.callApi('editMessageText', {
        chat_id: chatId,
        message_id: Number(messageId),
        text: caption,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      });
    }
  }

  private async deletePost(chatId: string, messageId: number): Promise<void> {
    try {
      await this.callApi('deleteMessage', {
        chat_id: chatId,
        message_id: Number(messageId),
      });
    } catch (err) {
      // Already gone / too old to delete — nothing to reconcile.
      this.logger.warn(`deleteMessage failed for chat=${chatId} msg=${messageId}: ${String(err)}`);
    }
  }

  private async callApi(
    method: string,
    body: Record<string, unknown>,
  ): Promise<{ message_id: number }> {
    const res = await fetch(`https://api.telegram.org/bot${this.token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as TgResponse;
    if (!json.ok) {
      throw new Error(`Telegram ${method}: ${json.error_code ?? '?'} ${json.description ?? ''}`);
    }
    return json.result ?? { message_id: 0 };
  }
}
