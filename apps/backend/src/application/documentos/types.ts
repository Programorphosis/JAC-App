/**
 * Tipo para archivo subido por Multer (evita dependencia de Express.Multer).
 */
export interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}
