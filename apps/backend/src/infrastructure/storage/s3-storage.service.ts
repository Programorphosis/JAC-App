/**
 * Servicio de almacenamiento S3 para documentos.
 * Referencia: flujoDocumentos.md
 */
import { Injectable } from '@nestjs/common';
import {
  ArchivoSobrepasaTamanioError,
  FormatoArchivoNoPermitidoError,
} from '../../domain/errors';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
];

@Injectable()
export class S3StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    const region = process.env.AWS_REGION || 'us-east-1';
    this.bucket = process.env.AWS_S3_BUCKET_NAME || '';

    this.client = new S3Client({
      region,
      credentials:
        process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            }
          : undefined,
    });
  }

  isConfigured(): boolean {
    return !!this.bucket && !!process.env.AWS_ACCESS_KEY_ID;
  }

  validateFile(file: { size: number; mimetype: string }): void {
    const maxMb = 5;
    if (file.size > MAX_FILE_SIZE) {
      throw new ArchivoSobrepasaTamanioError(maxMb);
    }
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      throw new FormatoArchivoNoPermitidoError();
    }
  }

  /** Valida que sea PNG para escudo municipal. */
  validateEscudoFile(file: { size: number; mimetype: string }): void {
    const maxMb = 2;
    if (file.size > maxMb * 1024 * 1024) {
      throw new ArchivoSobrepasaTamanioError(maxMb);
    }
    if (file.mimetype !== 'image/png') {
      throw new FormatoArchivoNoPermitidoError();
    }
  }

  async upload(params: {
    key: string;
    body: Buffer;
    contentType: string;
  }): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType,
      }),
    );
    return params.key;
  }

  async getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  /** Obtiene bytes de un objeto S3. Para escudo, imágenes, etc. */
  async getObjectBytes(key: string): Promise<Uint8Array> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const body = response.Body;
    if (!body) throw new Error(`Objeto S3 vacío: ${key}`);
    const chunks: Uint8Array[] = [];
    for await (const chunk of body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
}
