/**
 * Genera PDF de carta laboral con QR y sube a S3.
 * Referencia: validacionesDeCartaQR.md
 */
import { Injectable } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as QRCode from 'qrcode';
import {
  S3Client,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { createHash } from 'crypto';

export interface CartaPdfData {
  qrToken: string;
  consecutivo: number;
  anio: number;
  usuarioNombres: string;
  usuarioApellidos: string;
  usuarioDocumento: string;
}

@Injectable()
export class CartaPdfService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly baseUrl: string;

  constructor() {
    const region = process.env.AWS_REGION || 'us-east-1';
    this.bucket = process.env.AWS_S3_BUCKET_NAME || '';
    // URL base del API para el QR (donde está /api/public/validar-carta).
    // NO usar CORS_ORIGIN (es frontend). En producción: APP_PUBLIC_URL = https://api.tudominio.com
    this.baseUrl =
      process.env.APP_PUBLIC_URL || 'http://localhost:3000';

    this.s3 = new S3Client({
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

  async generateAndUpload(
    data: CartaPdfData,
    juntaId: string,
    usuarioId: string,
  ): Promise<{ rutaPdf: string; hashDocumento: string } | null> {
    if (!this.isConfigured()) return null;
    const pdfBytes = await this.generatePdf(data);
    const hash = createHash('sha256').update(pdfBytes).digest('hex');

    // Estructura: cartas/{juntaId}/{userId}/{anio}-{consecutivo}.pdf
    // (anio evita sobrescritura cuando el mismo usuario tiene carta 1 en años distintos)
    const key = `cartas/${juntaId}/${usuarioId}/${data.anio}-${data.consecutivo}.pdf`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: pdfBytes,
        ContentType: 'application/pdf',
      }),
    );

    return { rutaPdf: key, hashDocumento: hash };
  }

  private async generatePdf(data: CartaPdfData): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 12;

    const qrUrl = `${this.baseUrl}/api/public/validar-carta/${data.qrToken}`;
    const qrPng = await QRCode.toBuffer(qrUrl, { type: 'png', width: 120, margin: 1 });
    const qrImage = await pdfDoc.embedPng(qrPng);
    page.drawImage(qrImage, {
      x: page.getWidth() - 150,
      y: page.getHeight() - 150,
      width: 120,
      height: 120,
    });

    const lineHeight = fontSize + 4;
    let y = page.getHeight() - 180;

    const lines = [
      'CARTA LABORAL',
      '',
      `Consecutivo: ${data.consecutivo} de ${data.anio}`,
      '',
      `Nombre: ${data.usuarioNombres} ${data.usuarioApellidos}`,
      `Documento: ${data.usuarioDocumento}`,
      '',
      'Se certifica que la persona arriba mencionada es afiliada activa',
      'de esta Junta de Acción Comunal.',
      '',
      'Este documento puede ser verificado escaneando el código QR.',
    ];

    for (const line of lines) {
      page.drawText(line, {
        x: 50,
        y,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
      y -= lineHeight;
    }

    return pdfDoc.save();
  }
}
