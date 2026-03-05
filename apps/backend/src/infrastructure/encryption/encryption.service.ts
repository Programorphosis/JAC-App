import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
/**
 * Servicio de encriptación para credenciales sensibles (ej. Wompi por junta).
 * Algoritmo: AES-256-GCM.
 * Formato: Base64(IV + ciphertext + authTag).
 * Referencia: WOMPI_POR_JUNTA_DOC.md §2.2
 */
@Injectable()
export class EncryptionService {
  private key: Buffer | null = null;

  constructor() {
    this.loadKey();
  }

  private loadKey(): void {
    const masterKeyHex = process.env.ENCRYPTION_MASTER_KEY;
    if (
      !masterKeyHex ||
      masterKeyHex.length !== 64 ||
      !/^[0-9a-fA-F]+$/.test(masterKeyHex)
    ) {
      return; // Validación diferida: falla en encrypt/decrypt
    }
    const buf = Buffer.from(masterKeyHex, 'hex');
    if (buf.length === KEY_LENGTH) this.key = buf;
  }

  private getKey(): Buffer {
    if (!this.key) {
      throw new Error(
        'ENCRYPTION_MASTER_KEY no configurada. Debe ser 64 caracteres hex. Generar: openssl rand -hex 32',
      );
    }
    return this.key;
  }

  /**
   * Encripta un texto plano. Formato salida: Base64(IV + ciphertext + authTag).
   */
  encrypt(plaintext: string): string {
    const key = this.getKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    const payload = Buffer.concat([iv, encrypted, authTag]);
    return payload.toString('base64');
  }

  /**
   * Desencripta un ciphertext en Base64 (formato: IV + ciphertext + authTag).
   */
  decrypt(ciphertextBase64: string): string {
    const payload = Buffer.from(ciphertextBase64, 'base64');
    if (payload.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new Error('Ciphertext inválido: longitud insuficiente');
    }
    const iv = payload.subarray(0, IV_LENGTH);
    const authTag = payload.subarray(payload.length - AUTH_TAG_LENGTH);
    const encrypted = payload.subarray(
      IV_LENGTH,
      payload.length - AUTH_TAG_LENGTH,
    );

    const decipher = createDecipheriv(ALGORITHM, this.getKey(), iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString('utf8');
  }
}
