/**
 * Genera PDF de Constancia de Afiliación según formato físico oficial.
 * Referencia: validacionesDeCartaQR.md, formato físico libro de afiliados.
 */
import { Injectable } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as QRCode from 'qrcode';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { S3StorageService } from '../storage/s3-storage.service';

export interface FirmaCartaData {
  nombres: string;
  apellidos: string;
  tipoDocumento: string;
  numeroDocumento: string;
  lugarExpedicion?: string | null;
  telefono?: string | null;
  cargo: string; // "PRESIDENTE DE LA J.A.C X" o "SECRETARIO DE LA J.A.C X"
}

export interface CartaPdfData {
  qrToken: string;
  consecutivo: number;
  anio: number;
  usuarioNombres: string;
  usuarioApellidos: string;
  usuarioDocumento: string;
  usuarioTelefono?: string | null;
  usuarioLugarExpedicion?: string | null;
  fechaAfiliacion?: Date | null;
  folio?: number | null;
  numeral?: number | null;
  juntaNombre: string;
  juntaNit?: string | null;
  juntaDepartamento?: string | null;
  juntaCiudad?: string | null;
  juntaPersoneriaJuridica?: string | null;
  juntaEmail?: string | null;
  /** URL de imagen de membrete para versión premium. Opcional. */
  membreteUrl?: string | null;
  /** S3 key del escudo municipal (juntas/{juntaId}/escudo.png). Obligatorio para expedir cartas. */
  escudoS3Key?: string | null;
  /** Datos del ADMIN (Presidente). */
  presidente?: FirmaCartaData | null;
  /** Datos del SECRETARIA. */
  secretaria?: FirmaCartaData | null;
  /** Fecha de emisión de la carta. */
  fechaEmision?: Date | null;
}

/** Calcula "X AÑOS Y MESES" o "X MESES" desde fechaAfiliacion hasta hoy. */
function calcularTiempoPermanencia(fechaAfiliacion: Date): string {
  const hoy = new Date();
  let meses = (hoy.getFullYear() - fechaAfiliacion.getFullYear()) * 12;
  meses += hoy.getMonth() - fechaAfiliacion.getMonth();
  if (hoy.getDate() < fechaAfiliacion.getDate()) meses--;
  if (meses < 0) meses = 0;

  if (meses >= 12) {
    const años = Math.floor(meses / 12);
    const m = meses % 12;
    return m > 0 ? `${años} AÑOS Y ${m} MESES` : `${años} AÑOS`;
  }
  return meses === 1 ? '1 MES' : `${meses} MESES`;
}

/** Formatea fecha DD/MM/YYYY. */
function formatearFecha(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/** Divide texto en líneas de max caracteres. */
function _wrap(text: string, max = 95): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > max) {
      if (line) lines.push(line.trim());
      line = w;
    } else {
      line += (line ? ' ' : '') + w;
    }
  }
  if (line) lines.push(line.trim());
  return lines;
}

/** Divide texto en líneas que caben en maxWidth (píxeles). Retorna array de arrays de palabras. */
function wrapByWidth(
  text: string,
  measure: (s: string) => number,
  maxWidth: number,
): string[][] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[][] = [];
  let current: string[] = [];
  let currentWidth = 0;
  const spaceWidth = measure(' ');

  for (const w of words) {
    const wWidth = measure(w);
    const needSpace = current.length > 0 ? spaceWidth : 0;
    if (currentWidth + needSpace + wWidth <= maxWidth) {
      current.push(w);
      currentWidth += needSpace + wWidth;
    } else {
      if (current.length) lines.push(current);
      current = [w];
      currentWidth = wWidth;
    }
  }
  if (current.length) lines.push(current);
  return lines;
}

/** Justifica una línea: distribuye espacio entre palabras para ocupar lineWidth. */
function justifyLine(
  words: string[],
  lineWidth: number,
  measure: (s: string) => number,
): Array<{ text: string; x: number }> {
  if (words.length === 0) return [];
  const wordWidths = words.map((w) => measure(w));
  const totalWordsWidth = wordWidths.reduce((a, b) => a + b, 0);
  const totalGaps = words.length - 1;
  const _spaceWidth = measure(' ');
  const spaceForGaps = lineWidth - totalWordsWidth;
  const gapWidth = totalGaps > 0 ? spaceForGaps / totalGaps : 0;

  const result: Array<{ text: string; x: number }> = [];
  let x = 0;
  for (let i = 0; i < words.length; i++) {
    result.push({ text: words[i], x });
    x += wordWidths[i] + (i < totalGaps ? gapWidth : 0);
  }
  return result;
}

@Injectable()
export class CartaPdfService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly baseUrl: string;

  constructor(private readonly s3Storage: S3StorageService) {
    const region = process.env.AWS_REGION || 'us-east-1';
    this.bucket = process.env.AWS_S3_BUCKET_NAME || '';
    this.baseUrl = process.env.APP_PUBLIC_URL || 'http://localhost:3000';

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
    options?: { useMembrete?: boolean },
  ): Promise<{ rutaPdf: string; hashDocumento: string } | null> {
    if (!this.isConfigured()) return null;
    const pdfBytes = await this.generatePdf(data, options);
    const hash = createHash('sha256').update(pdfBytes).digest('hex');

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

  /** Genera bytes del PDF sin subir a S3. Usado para PDF de prueba. */
  async generatePdfBytes(
    data: CartaPdfData,
    options?: { useMembrete?: boolean },
  ): Promise<Uint8Array> {
    return this.generatePdf(data, options);
  }

  private async generatePdf(
    data: CartaPdfData,
    options?: { useMembrete?: boolean },
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const margin = 40;
    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();
    const contentWidth = pageWidth - 2 * margin;
    let y = pageHeight - 40;

    const _draw = (text: string, size = 10, bold = false, x = margin) => {
      page.drawText(text, {
        x,
        y,
        size,
        font: bold ? fontBold : font,
        color: negroInstitucional,
      });
      y -= size + 3;
    };

    const _drawCentered = (text: string, size = 10, bold = false) => {
      const f = bold ? fontBold : font;
      const w = f.widthOfTextAtSize(text, size);
      page.drawText(text, {
        x: margin + (contentWidth - w) / 2,
        y,
        size,
        font: f,
        color: negroInstitucional,
      });
      y -= size + 3;
    };

    const _drawLine = () => {
      page.drawLine({
        start: { x: margin, y },
        end: { x: pageWidth - margin, y },
        thickness: 0.5,
        color: negroInstitucional,
      });
      y -= 8;
    };

    // 1️⃣ Versión premium: fondo membrete escaneado
    if (options?.useMembrete && data.membreteUrl) {
      try {
        const res = await fetch(data.membreteUrl);
        if (res.ok) {
          const arrBuf = await res.arrayBuffer();
          const imgBytes = new Uint8Array(arrBuf);
          const contentType = res.headers.get('content-type') || '';
          const isJpeg =
            contentType.includes('jpeg') ||
            contentType.includes('jpg') ||
            data.membreteUrl.toLowerCase().endsWith('.jpg') ||
            data.membreteUrl.toLowerCase().endsWith('.jpeg');
          const img = isJpeg
            ? await pdfDoc.embedJpg(imgBytes)
            : await pdfDoc.embedPng(imgBytes);
          page.drawImage(img, {
            x: 0,
            y: 0,
            width: pageWidth,
            height: pageHeight,
            opacity: 0.12,
          });
        }
      } catch {
        // Si falla la carga del membrete, continuar sin fondo
      }
    }

    // 1b️⃣ Marca de agua: Escudo Acción Comunal Colombia (centrado, baja opacidad)
    const watermarkPaths = [
      join(process.cwd(), 'assets', 'Escudo_Acción_Comunal_Colombia.svg.png'),
      join(
        process.cwd(),
        'apps',
        'backend',
        'assets',
        'Escudo_Acción_Comunal_Colombia.svg.png',
      ),
    ];
    const watermarkSize = 420;
    for (const wmPath of watermarkPaths) {
      try {
        const wmBytes = await readFile(wmPath);
        const wmImage = await pdfDoc.embedPng(wmBytes);
        const wmX = (pageWidth - watermarkSize) / 2;
        const wmY = (pageHeight - watermarkSize) / 2;
        page.drawImage(wmImage, {
          x: wmX,
          y: wmY - 60,
          width: watermarkSize,
          height: watermarkSize + 100,
          opacity: 0.08,
        });
        break;
      } catch {
        continue;
      }
    }

    const bordeBlanco = rgb(1, 1, 1);
    const bordeNegro = rgb(0, 0, 0);
    const negroInstitucional = rgb(0.15, 0.15, 0.15);
    const rojoConstancia = rgb(0.7, 0.1, 0.1);

    // 2️⃣ HEADER: coordenadas fijas, independientes del flujo y
    const escudoSize = 80;
    const qrSize = 90;
    const headerHeight = 110;

    const headerTop = pageHeight - margin;
    const headerBottom = headerTop - headerHeight;

    page.drawRectangle({
      x: margin,
      y: headerBottom,
      width: contentWidth,
      height: headerHeight,
      borderWidth: 0.5,
      borderColor: bordeBlanco,
    });

    let escudoLoaded = false;
    if (data.escudoS3Key && this.s3Storage.isConfigured()) {
      try {
        const escudoBytes = await this.s3Storage.getObjectBytes(
          data.escudoS3Key,
        );
        const escudoImage = await pdfDoc.embedPng(escudoBytes);
        page.drawImage(escudoImage, {
          x: margin,
          y: headerTop - escudoSize,
          width: escudoSize,
          height: escudoSize,
        });
        escudoLoaded = true;
      } catch {
        // Fallback a local o rectángulo
      }
    }
    if (!escudoLoaded) {
      const escudoPaths = [
        join(process.cwd(), 'assets', 'Escudo_de_Puerto_Gaitán.svg.png'),
        join(
          process.cwd(),
          'apps',
          'backend',
          'assets',
          'Escudo_de_Puerto_Gaitán.svg.png',
        ),
      ];
      for (const escudoPath of escudoPaths) {
        try {
          const escudoBytes = await readFile(escudoPath);
          const escudoImage = await pdfDoc.embedPng(escudoBytes);
          page.drawImage(escudoImage, {
            x: margin,
            y: headerTop - escudoSize,
            width: escudoSize,
            height: escudoSize,
          });
          escudoLoaded = true;
          break;
        } catch {
          continue;
        }
      }
    }
    if (!escudoLoaded) {
      page.drawRectangle({
        x: margin,
        y: headerTop - escudoSize,
        width: escudoSize,
        height: escudoSize,
        borderWidth: 0.5,
        borderColor: bordeNegro,
      });
    }

    const qrUrl = `${this.baseUrl}/api/public/validar-carta/${data.qrToken}`;
    const qrPng = await QRCode.toBuffer(qrUrl, {
      type: 'png',
      width: qrSize * 2,
      margin: 1,
    });
    const qrImage = await pdfDoc.embedPng(qrPng);
    page.drawImage(qrImage, {
      x: pageWidth - margin - qrSize,
      y: headerTop - qrSize,
      width: qrSize,
      height: qrSize,
    });

    const headerCenterWidth = contentWidth - escudoSize - qrSize;
    const centerStartX = margin + escudoSize;
    let headerY = headerTop - 20;

    const drawHeaderCentered = (text: string, size = 10, bold = false) => {
      const f = bold ? fontBold : font;
      const w = f.widthOfTextAtSize(text, size);
      page.drawText(text, {
        x: centerStartX + (headerCenterWidth - w) / 2,
        y: headerY,
        size,
        font: f,
        color: negroInstitucional,
      });
      headerY -= size + 3;
    };

    drawHeaderCentered('REPÚBLICA DE COLOMBIA', 11, true);
    if (data.juntaDepartamento) {
      drawHeaderCentered(
        `DEPARTAMENTO ${data.juntaDepartamento.toUpperCase()}`,
        10,
      );
    }
    if (data.juntaCiudad) {
      drawHeaderCentered(`MUNICIPIO DE ${data.juntaCiudad.toUpperCase()}`, 10);
    }
    drawHeaderCentered(
      `JUNTA DE ACCIÓN COMUNAL ${data.juntaNombre.toUpperCase()}`,
      10,
    );
    if (data.juntaPersoneriaJuridica) {
      drawHeaderCentered(
        `Personería jurídica N.º ${data.juntaPersoneriaJuridica}`,
        9,
      );
    }
    if (data.juntaNit) {
      drawHeaderCentered(`NIT. ${data.juntaNit}`, 9);
    }

    // Reiniciar flujo: el enunciado empieza debajo del header (más cerca para subir el bloque)
    y = headerBottom;

    // 3️⃣ BLOQUE ENUNCIADO LEGAL: rectángulo con bordes blancos, texto justificado (interlineado compacto)
    const enunciadoSize = 9;
    const enunciadoLineHeight = enunciadoSize + 2; // compacto tipo físico
    const tieneUbicacion = data.juntaCiudad && data.juntaDepartamento;
    const zonaTexto = tieneUbicacion
      ? `zona rural del municipio de ${data.juntaCiudad}, ${data.juntaDepartamento}`
      : 'en su jurisdicción';
    const tituloConstancia = `CONSTANCIA DE AFILIACIÓN AL LIBRO DE LA JUNTA DE ACCIÓN COMUNAL ${data.juntaNombre.toUpperCase()}:`;
    const enunciado = `
      El suscrito Presidente de la Junta de Acción Comunal ${data.juntaNombre.toUpperCase()}, ${zonaTexto}, en ejercicio de sus funciones y con fundamento en la Ley 1551 de 2012, que modifica el artículo 91 de la Ley 136 de 1994, el cual establece las funciones de los alcaldes y, específicamente, en el literal F, numeral 6, relacionado con la prosperidad integral de su región, donde se dispone que: "Expedirá la certificación para acreditar residencia a aquellas personas que residen en el territorio del área de influencia de los proyectos de exploración y explotación petrolera y minera en general, y que aspiren a acceder a labores como mano de obra no calificada y calificada. Los alcaldes expedirán dichos certificados con base en los registros electorales o del Sisbén, así como en los REGISTROS DEL LIBRO DE AFILIADOS DE LA JUNTA DE ACCIÓN COMUNAL."
      ${tituloConstancia} La Junta de Acción Comunal ${data.juntaNombre.toUpperCase()}, a solicitud del interesado, se permite informar por medio de la presente que la persona que se relaciona a continuación se encuentra debidamente registrada en el libro de afiliados de la JUNTA DE ACCIÓN COMUNAL ${data.juntaNombre.toUpperCase()}, así:
      `.trim();

    const measureEnunciado = (s: string) =>
      font.widthOfTextAtSize(s, enunciadoSize);
    const paragraphs = enunciado.split('\n');

    // Precalcular altura total para el rectángulo
    let enunciadoBlockHeight = 0;
    let prevHadContent = false;
    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) {
        enunciadoBlockHeight += enunciadoLineHeight;
        continue;
      }
      if (prevHadContent) enunciadoBlockHeight += 4;
      prevHadContent = true;
      const lines = wrapByWidth(
        paragraph.trim(),
        measureEnunciado,
        contentWidth,
      );
      enunciadoBlockHeight += lines.length * enunciadoLineHeight;
    }
    enunciadoBlockHeight += 8;

    page.drawRectangle({
      x: margin,
      y: y - enunciadoBlockHeight,
      width: contentWidth,
      height: enunciadoBlockHeight,
      borderWidth: 0.5,
      borderColor: bordeBlanco,
    });

    let firstParagraph = true;
    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) {
        y -= enunciadoLineHeight;
        continue;
      }
      if (!firstParagraph) y -= 4;
      firstParagraph = false;
      const para = paragraph.trim();
      const lines = wrapByWidth(para, measureEnunciado, contentWidth);
      const contieneTituloConstancia = para.includes(tituloConstancia);
      const redPartLen = tituloConstancia.length;

      if (!contieneTituloConstancia) {
        for (let i = 0; i < lines.length; i++) {
          const words = lines[i];
          const isLastLine = i === lines.length - 1;
          if (isLastLine || words.length <= 1) {
            page.drawText(words.join(' '), {
              x: margin,
              y,
              size: enunciadoSize,
              font,
              color: negroInstitucional,
            });
          } else {
            const justified = justifyLine(
              words,
              contentWidth,
              measureEnunciado,
            );
            for (const { text, x } of justified) {
              page.drawText(text, {
                x: margin + x,
                y,
                size: enunciadoSize,
                font,
                color: negroInstitucional,
              });
            }
          }
          y -= enunciadoLineHeight;
        }
      } else {
        let charPos = 0;
        for (let i = 0; i < lines.length; i++) {
          const words = lines[i];
          const isLastLine = i === lines.length - 1;
          if (isLastLine || words.length <= 1) {
            let x = margin;
            for (let w = 0; w < words.length; w++) {
              const sep = w > 0 ? ' ' : '';
              const text = sep + words[w];
              const wordEnd = charPos + text.length;
              const color =
                wordEnd <= redPartLen ? rojoConstancia : negroInstitucional;
              page.drawText(text, { x, y, size: enunciadoSize, font, color });
              x += measureEnunciado(text);
              charPos = wordEnd;
            }
          } else {
            const justified = justifyLine(
              words,
              contentWidth,
              measureEnunciado,
            );
            for (let w = 0; w < words.length; w++) {
              const text = justified[w].text;
              const wordLen = (w > 0 ? 1 : 0) + text.length;
              const wordEnd = charPos + wordLen;
              const color =
                wordEnd <= redPartLen ? rojoConstancia : negroInstitucional;
              page.drawText(text, {
                x: margin + justified[w].x,
                y,
                size: enunciadoSize,
                font,
                color,
              });
              charPos = wordEnd;
            }
          }
          y -= enunciadoLineHeight;
        }
      }
    }
    y -= 8;

    // ================= LAYOUT FIJO (desde FOLIO hacia abajo, formato físico) =================
    const sectionStartY = y;
    const azulClaro = rgb(0.75, 0.88, 0.98);
    const boxW = 45;
    const boxH = 18;

    // 🧱 BLOQUE 1 — FOLIO / NUMERAL (mini-cuadros azules, label fuera del cuadro)
    const folioLineY = sectionStartY - 20;
    const folioVal = String(data.folio ?? '-');
    const numeralVal = String(data.numeral ?? '-');

    page.drawText('FOLIO', {
      x: margin,
      y: folioLineY,
      size: 9,
      font: fontBold,
      color: negroInstitucional,
    });
    const folioBoxX = margin + fontBold.widthOfTextAtSize('FOLIO', 9) + 8;
    page.drawRectangle({
      x: folioBoxX,
      y: folioLineY - 2,
      width: boxW,
      height: boxH,
      color: azulClaro,
      borderWidth: 0.5,
      borderColor: rgb(0, 0, 0),
    });
    const folioNumW = fontBold.widthOfTextAtSize(folioVal, 11);
    page.drawText(folioVal, {
      x: folioBoxX + (boxW - folioNumW) / 2,
      y: folioLineY + 5,
      size: 11,
      font: fontBold,
      color: negroInstitucional,
    });

    const numeralLabelW = fontBold.widthOfTextAtSize('NUMERAL', 9);
    const numeralBoxX = pageWidth - margin - numeralLabelW - 8 - boxW;
    page.drawRectangle({
      x: numeralBoxX,
      y: folioLineY - 2,
      width: boxW,
      height: boxH,
      color: azulClaro,
      borderWidth: 0.5,
      borderColor: rgb(0, 0, 0),
    });
    const numeralNumW = fontBold.widthOfTextAtSize(numeralVal, 11);
    page.drawText(numeralVal, {
      x: numeralBoxX + (boxW - numeralNumW) / 2,
      y: folioLineY + 5,
      size: 11,
      font: fontBold,
      color: negroInstitucional,
    });
    page.drawText('NUMERAL', {
      x: pageWidth - margin - numeralLabelW,
      y: folioLineY,
      size: 9,
      font: fontBold,
      color: negroInstitucional,
    });

    const afterFolioY = folioLineY - 12;

    // 🧱 BLOQUE 2 — TABLA DATOS DE RESIDENTE (cabecera 100% + filas 50-50)
    const datosRowH = 21;
    const datosTituloH = 22;
    const half = contentWidth / 2;
    const numDatosRows = 6;

    const nombreCompleto =
      `${data.usuarioNombres.toUpperCase()} ${data.usuarioApellidos.toUpperCase()}`.trim();
    const docCelular = data.usuarioTelefono
      ? `${data.usuarioDocumento.toUpperCase()}  CELULAR: ${data.usuarioTelefono}`
      : data.usuarioDocumento.toUpperCase();
    const tiempo = data.fechaAfiliacion
      ? calcularTiempoPermanencia(data.fechaAfiliacion)
      : '-';
    const fechaAf = data.fechaAfiliacion
      ? formatearFecha(data.fechaAfiliacion)
      : '-';
    const lugarExp = data.usuarioLugarExpedicion?.toUpperCase() ?? '-';

    const datosTableTop = afterFolioY;
    let datosY = datosTableTop;

    // Cabecera: DATOS DE RESIDENTE (100% ancho)
    page.drawRectangle({
      x: margin,
      y: datosY - datosTituloH,
      width: contentWidth,
      height: datosTituloH,
      borderWidth: 0.5,
      borderColor: bordeNegro,
    });
    const datosTituloW = fontBold.widthOfTextAtSize('DATOS DE RESIDENTE', 12);
    page.drawText('DATOS DE RESIDENTE', {
      x: margin + (contentWidth - datosTituloW) / 2,
      y: datosY - datosTituloH / 2 - 4,
      size: 12,
      font: fontBold,
      color: negroInstitucional,
    });
    datosY -= datosTituloH;

    const datosRows: [string, string][] = [
      ['NOMBRES Y APELLIDOS', nombreCompleto],
      ['DOCUMENTO DE IDENTIDAD', docCelular],
      ['LUGAR DE EXPEDICIÓN', lugarExp],
      ['JURISDICCIÓN DE RESIDENCIA', data.juntaNombre.toUpperCase()],
      ['TIEMPO DE PERMANENCIA EN EL TERRITORIO', tiempo],
      ['FECHA DE AFILIACIÓN', fechaAf],
    ];

    for (let i = 0; i < numDatosRows; i++) {
      const rowBottom = datosY - datosRowH;
      const textY = rowBottom + datosRowH / 2 - 4;

      page.drawRectangle({
        x: margin,
        y: rowBottom,
        width: half,
        height: datosRowH,
        borderWidth: 0.5,
        borderColor: bordeNegro,
      });
      page.drawRectangle({
        x: margin + half,
        y: rowBottom,
        width: half,
        height: datosRowH,
        borderWidth: 0.5,
        borderColor: bordeNegro,
      });
      page.drawText(datosRows[i][0].toUpperCase(), {
        x: margin + 5,
        y: textY,
        size: 10,
        font: fontBold,
        color: negroInstitucional,
      });
      const valTrunc =
        datosRows[i][1].length > 50
          ? datosRows[i][1].slice(0, 47) + '...'
          : datosRows[i][1];
      page.drawText(valTrunc, {
        x: margin + half + 5,
        y: textY,
        size: 10,
        font,
        color: negroInstitucional,
      });
      datosY -= datosRowH;
    }
    const afterDatosY = datosY;

    // 🧱 FILA SEPARADORA — AUTENTICACION (100% ancho, unida a tabla DATOS sin gap)
    const autentTituloH = 22;
    page.drawRectangle({
      x: margin,
      y: afterDatosY - autentTituloH,
      width: contentWidth,
      height: autentTituloH,
      borderWidth: 0.5,
      borderColor: bordeNegro,
    });
    const autentTituloW = fontBold.widthOfTextAtSize('AUTENTICACION', 11);
    page.drawText('AUTENTICACION', {
      x: margin + (contentWidth - autentTituloW) / 2,
      y: afterDatosY - autentTituloH + autentTituloH / 2 - 4,
      size: 11,
      font: fontBold,
      color: negroInstitucional,
    });
    const firmaBlockTop = afterDatosY - autentTituloH;

    // 🧱 BLOQUE 3 — TABLA AUTENTICACION (fila grande firma + filas datos sin labels)
    // Altura aumentada con el espacio ahorrado al subir enunciado y unir tablas
    const firmaGrandeH = 160; // era 75, +20 para más espacio firma/sello
    const firmaRowH = 21; // era 19, +2 por fila
    const colWidth = contentWidth / 2;
    const numFirmaDataRows = 5; // cédula, expedida en, cargo, línea verif, email (nombre va dentro del cuadro)
    const firmaBlockHeight = firmaGrandeH + numFirmaDataRows * firmaRowH;

    for (let col = 0; col < 2; col++) {
      const colX = margin + col * colWidth;
      let rowTop = firmaBlockTop;

      // FILA 1: espacio grande para firma y sello
      page.drawRectangle({
        x: colX,
        y: rowTop - firmaGrandeH,
        width: colWidth,
        height: firmaGrandeH,
        borderWidth: 0.5,
        borderColor: bordeNegro,
      });

      const isPresidente = col === 0;
      const line1 = isPresidente ? 'AVALADO POR:' : '';
      const line2 = 'ESPACIO RESERVADO PARA FIRMA AUTORIZADA';
      const line1Y = rowTop - 10;
      const line2Y = rowTop - 22;

      if (line1) {
        page.drawText(line1.toUpperCase(), {
          x: colX + 12,
          y: line1Y,
          size: 8,
          font,
          color: rgb(0.4, 0.4, 0.4),
        });
      }
      page.drawText(line2.toUpperCase(), {
        x: colX + 12,
        y: line2Y,
        size: 8,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });

      const firma = col === 0 ? data.presidente : data.secretaria;
      const firmaLineY = rowTop - firmaGrandeH + firmaGrandeH * 0.15;
      page.drawLine({
        start: { x: colX + 20, y: firmaLineY },
        end: { x: colX + colWidth - 20, y: firmaLineY },
        thickness: 0.8,
        color: rgb(0.2, 0.2, 0.2),
      });

      if (firma) {
        const nombreFirmante = `${firma.nombres} ${firma.apellidos}`
          .trim()
          .toUpperCase();
        const nombreWidth = fontBold.widthOfTextAtSize(nombreFirmante, 10);
        page.drawText(nombreFirmante, {
          x: colX + (colWidth - nombreWidth) / 2,
          y: firmaLineY - 18,
          size: 10,
          font: fontBold,
          color: negroInstitucional,
        });
      }

      rowTop -= firmaGrandeH;

      const cargoDinamico =
        col === 0
          ? `PRESIDENTE DE LA J.A.C ${data.juntaNombre.toUpperCase()}`
          : `SECRETARIA DE LA J.A.C ${data.juntaNombre.toUpperCase()}`;
      const valores: string[] = firma
        ? [
            `${firma.tipoDocumento} N° ${firma.numeroDocumento}`,
            `EXPEDIDA EN ${(firma.lugarExpedicion ?? '-').toUpperCase()}`,
            cargoDinamico,
            `LINEA DE VERIFICACION ${firma.telefono || '-'}`,
            data.juntaEmail || '-',
          ]
        : ['', '', '', '', ''];

      for (const val of valores) {
        page.drawRectangle({
          x: colX,
          y: rowTop - firmaRowH,
          width: colWidth,
          height: firmaRowH,
          borderWidth: 0.5,
          borderColor: bordeNegro,
        });
        if (val) {
          const valTrunc = val.length > 45 ? val.slice(0, 42) + '...' : val;
          page.drawText(valTrunc, {
            x: colX + 6,
            y: rowTop - firmaRowH / 2 - 4,
            size: 10,
            font,
            color: negroInstitucional,
          });
        }
        rowTop -= firmaRowH;
      }
    }

    // 🧱 FILA VIGENCIA (100% ancho, integrada a tabla autenticación, con borde)
    const fechaEmision = data.fechaEmision ?? new Date();
    const vigenciaRowH = 22;
    const vigenciaY = firmaBlockTop - firmaBlockHeight - vigenciaRowH;

    page.drawRectangle({
      x: margin,
      y: vigenciaY,
      width: contentWidth,
      height: vigenciaRowH,
      borderWidth: 0.5,
      borderColor: bordeNegro,
    });
    const vigenciaText = `Este documento tiene vigencia de tres (3) meses a partir de su expedición.  Fecha de expedición: ${formatearFecha(fechaEmision)}`;
    const vigenciaSize = 8;
    const vigenciaWidth = font.widthOfTextAtSize(vigenciaText, vigenciaSize);
    page.drawText(vigenciaText, {
      x: margin + (contentWidth - vigenciaWidth) / 2,
      y: vigenciaY + vigenciaRowH / 2 - 3,
      size: vigenciaSize,
      font,
      color: negroInstitucional,
    });

    // 🧱 FILA CÓDIGO PENAL (100% ancho, sin borde visible, centrado)
    const penalTitulo = 'CÓDIGO PENAL COLOMBIANO';
    const penalText = `${penalTitulo} "Ley 599 de 2000 Artículo 287, Falsedad Material en Documento Público. El que falsifique documento público que pueda servir de prueba, incurrirá en prisión de tres (3) a seis (6) años."`;
    const penalSize = 9;
    const penalLineH = 9;
    const penalMeasure = (s: string) => font.widthOfTextAtSize(s, penalSize);
    const penalLines = wrapByWidth(penalText, penalMeasure, contentWidth - 20);
    const penalBlockH = penalLines.length * penalLineH + 12;
    const penalY = vigenciaY - penalBlockH;
    const penalRedLen = penalTitulo.length;
    const penalGray = rgb(0.3, 0.3, 0.3);

    let penalCharPos = 0;
    for (let i = 0; i < penalLines.length; i++) {
      const words = penalLines[i];
      const lineText = words.join(' ');
      const lineW = penalMeasure(lineText);
      const lineY = penalY + penalBlockH - 10 - i * penalLineH;
      let x = margin + (contentWidth - lineW) / 2;
      for (let w = 0; w < words.length; w++) {
        const sep = w > 0 ? ' ' : '';
        const text = sep + words[w];
        const wordEnd = penalCharPos + text.length;
        const color = wordEnd <= penalRedLen ? rojoConstancia : penalGray;
        page.drawText(text, {
          x,
          y: lineY,
          size: penalSize,
          font,
          color,
        });
        x += penalMeasure(text);
        penalCharPos = wordEnd;
      }
    }

    return pdfDoc.save();
  }
}
