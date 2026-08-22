import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

import { loadEnv } from '../config/env';
import {
  detectMimeType,
  DOCUMENT_MIME_TYPES,
  extensionForMime,
  IMAGE_MIME_TYPES,
  type DocumentMime,
} from './file-type';

export type StoredFile = {
  key: string;
  mimeType: DocumentMime;
  byteSize: number;
};

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly root: string;
  private readonly maxAvatarBytes: number;
  private readonly maxDocumentBytes: number;

  constructor() {
    const env = loadEnv();
    this.root = resolve(env.UPLOAD_DIR);
    this.maxAvatarBytes = env.MAX_AVATAR_BYTES;
    this.maxDocumentBytes = env.MAX_DOCUMENT_BYTES;
  }

  async saveAvatar(buffer: Buffer): Promise<StoredFile> {
    return this.save(buffer, 'avatars', IMAGE_MIME_TYPES, this.maxAvatarBytes);
  }

  async saveDocument(buffer: Buffer): Promise<StoredFile> {
    return this.save(buffer, 'documents', DOCUMENT_MIME_TYPES, this.maxDocumentBytes);
  }

  async delete(key: string | null | undefined): Promise<void> {
    if (!key) {
      return;
    }
    const abs = this.absolutePath(key);
    try {
      await unlink(abs);
    } catch (error) {
      const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: string }).code) : '';
      if (code !== 'ENOENT') {
        this.logger.warn(`Failed to delete stored file ${key}`);
      }
    }
  }

  openReadStream(key: string) {
    return createReadStream(this.absolutePath(key));
  }

  absolutePath(key: string): string {
    if (!key || key.includes('\0') || key.startsWith('/') || key.includes('..')) {
      throw new NotFoundException('File not found');
    }
    const abs = resolve(join(this.root, key));
    const rel = relative(this.root, abs);
    if (rel.startsWith('..') || rel === '') {
      throw new NotFoundException('File not found');
    }
    return abs;
  }

  mimeFromKey(key: string): string {
    if (key.endsWith('.jpg') || key.endsWith('.jpeg')) {
      return 'image/jpeg';
    }
    if (key.endsWith('.png')) {
      return 'image/png';
    }
    if (key.endsWith('.webp')) {
      return 'image/webp';
    }
    if (key.endsWith('.pdf')) {
      return 'application/pdf';
    }
    return 'application/octet-stream';
  }

  private async save(
    buffer: Buffer,
    kind: 'avatars' | 'documents',
    allowed: readonly string[],
    maxBytes: number,
  ): Promise<StoredFile> {
    if (!buffer?.length) {
      throw new BadRequestException('File is empty');
    }
    if (buffer.length > maxBytes) {
      throw new BadRequestException('File is too large');
    }
    const mime = detectMimeType(buffer);
    if (!mime || !allowed.includes(mime)) {
      throw new BadRequestException('Unsupported file type');
    }
    const key = `${kind}/${randomUUID()}${extensionForMime(mime)}`;
    const abs = this.absolutePath(key);
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, buffer);
    return { key, mimeType: mime, byteSize: buffer.length };
  }
}
