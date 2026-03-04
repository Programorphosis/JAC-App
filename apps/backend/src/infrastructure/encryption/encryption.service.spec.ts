import { EncryptionService } from './encryption.service';

const VALID_KEY = 'a'.repeat(64); // 64 hex chars → 32 bytes

describe('EncryptionService', () => {
  let svc: EncryptionService;

  beforeEach(() => {
    process.env.ENCRYPTION_MASTER_KEY = VALID_KEY;
    svc = new EncryptionService();
  });

  afterEach(() => {
    delete process.env.ENCRYPTION_MASTER_KEY;
  });

  it('debe encriptar y desencriptar correctamente (round-trip)', () => {
    const plaintext = 'clave-secreta-wompi-123';
    const encrypted = svc.encrypt(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(svc.decrypt(encrypted)).toBe(plaintext);
  });

  it('debe producir ciphertexts diferentes para el mismo texto (IV aleatorio)', () => {
    const plaintext = 'dato-sensible';
    const a = svc.encrypt(plaintext);
    const b = svc.encrypt(plaintext);
    expect(a).not.toBe(b);
    expect(svc.decrypt(a)).toBe(plaintext);
    expect(svc.decrypt(b)).toBe(plaintext);
  });

  it('debe manejar texto vacío', () => {
    const encrypted = svc.encrypt('');
    expect(svc.decrypt(encrypted)).toBe('');
  });

  it('debe manejar texto con caracteres especiales y emojis', () => {
    const texto = '¡Hola café! 🎉 ñ á é í ó ú';
    const encrypted = svc.encrypt(texto);
    expect(svc.decrypt(encrypted)).toBe(texto);
  });

  it('debe lanzar error si ciphertext es corrupto', () => {
    const encrypted = svc.encrypt('dato');
    const corrupted = encrypted.slice(0, -5) + 'XXXXX';
    expect(() => svc.decrypt(corrupted)).toThrow();
  });

  it('debe lanzar error si ciphertext es demasiado corto', () => {
    expect(() => svc.decrypt('YQ==')).toThrow('longitud insuficiente');
  });

  it('debe lanzar error si ENCRYPTION_MASTER_KEY no está configurada', () => {
    delete process.env.ENCRYPTION_MASTER_KEY;
    const svcSinKey = new EncryptionService();
    expect(() => svcSinKey.encrypt('test')).toThrow('ENCRYPTION_MASTER_KEY no configurada');
  });

  it('debe lanzar error si ENCRYPTION_MASTER_KEY tiene longitud incorrecta', () => {
    process.env.ENCRYPTION_MASTER_KEY = 'abc123';
    const svcMalKey = new EncryptionService();
    expect(() => svcMalKey.encrypt('test')).toThrow('ENCRYPTION_MASTER_KEY no configurada');
  });

  it('debe lanzar error si ENCRYPTION_MASTER_KEY tiene caracteres no-hex', () => {
    process.env.ENCRYPTION_MASTER_KEY = 'g'.repeat(64);
    const svcBadKey = new EncryptionService();
    expect(() => svcBadKey.encrypt('test')).toThrow('ENCRYPTION_MASTER_KEY no configurada');
  });
});
