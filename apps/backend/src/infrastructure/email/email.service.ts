import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/** Tipos de factura para el asunto del email. */
const TIPO_LABEL: Record<string, string> = {
  RENOVACION: 'Renovación de suscripción',
  OVERRIDE: 'Consumo adicional',
  MANUAL: 'Factura manual',
  TRIAL: 'Período de prueba',
};

type EmailTransport = 'ses' | 'mailhog' | 'disabled';

/**
 * Servicio de email transaccional vía Nodemailer.
 * Soporta: AWS SES (producción), MailHog (desarrollo local).
 *
 * Variables de entorno:
 *   EMAIL_TRANSPORT: 'ses' | 'mailhog' | 'disabled'
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (para ses)
 *   EMAIL_FROM, APP_PUBLIC_URL
 *
 * Si EMAIL_TRANSPORT=disabled o no configurado, los envíos se omiten silenciosamente.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter | null = null;
  private readonly from: string;
  private readonly enabled: boolean;
  private readonly appUrl: string;

  constructor() {
    const transport = (process.env.EMAIL_TRANSPORT ?? 'disabled') as EmailTransport;
    this.appUrl = (process.env.APP_PUBLIC_URL ?? 'http://localhost:4200').replace(/\/$/, '');
    this.from = process.env.EMAIL_FROM ?? 'JAC App <noreply@localhost>';

    if (transport === 'disabled') {
      this.logger.warn(
        'Email deshabilitado (EMAIL_TRANSPORT=disabled o no configurado). Los emails se omitirán.',
      );
      this.enabled = false;
      return;
    }

    const host = process.env.SMTP_HOST ?? 'localhost';
    const port = parseInt(process.env.SMTP_PORT ?? '1025', 10);
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    const config = {
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    };

    this.transporter = nodemailer.createTransport(config);
    this.enabled = true;
    this.logger.log(`Email configurado: ${transport} (${host}:${port})`);
  }

  async ping(): Promise<boolean> {
    if (!this.enabled || !this.transporter) return false;
    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }

  /** Envío genérico. No lanza excepción: los errores quedan solo en logs. */
  async enviar(opts: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void> {
    if (!this.enabled || !this.transporter) return;

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text ?? this.htmlToText(opts.html),
      });
      this.logger.log(`Email enviado → ${opts.to}: "${opts.subject}"`);
    } catch (err) {
      this.logger.error(`Error enviando email a ${opts.to}: "${opts.subject}"`, err);
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Templates de negocio
  // ──────────────────────────────────────────────────────────────

  /**
   * Nueva factura pendiente. Llamar después de crearFactura() o generarFacturasRenovacion().
   */
  async enviarFacturaPendiente(opts: {
    juntaNombre: string;
    juntaEmail: string;
    monto: number;
    fechaVencimiento: Date;
    tipo: string;
  }): Promise<void> {
    const portalUrl = `${this.appUrl}/facturas-plataforma`;
    const montoFmt = this.formatCOP(opts.monto);
    const fechaFmt = this.formatDate(opts.fechaVencimiento);
    const tipoLabel = TIPO_LABEL[opts.tipo] ?? opts.tipo;

    await this.enviar({
      to: opts.juntaEmail,
      subject: `Nueva factura pendiente – ${montoFmt} COP`,
      html: this.wrapBase({
        title: 'Nueva factura pendiente',
        body: `
          <p>Hola,</p>
          <p>Se ha generado una nueva factura para
            <strong>Junta de Acción Comunal de ${opts.juntaNombre}</strong>:
          </p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr>
              <td style="padding:8px;color:#555;width:40%">Concepto:</td>
              <td style="padding:8px"><strong>${tipoLabel}</strong></td>
            </tr>
            <tr style="background:#f9f9f9">
              <td style="padding:8px;color:#555">Monto:</td>
              <td style="padding:8px"><strong>${montoFmt} COP</strong></td>
            </tr>
            <tr>
              <td style="padding:8px;color:#555">Vencimiento:</td>
              <td style="padding:8px">${fechaFmt}</td>
            </tr>
          </table>
          <p>
            <a href="${portalUrl}"
               style="display:inline-block;padding:12px 24px;background:#2E7D32;color:#fff;
                      text-decoration:none;border-radius:4px;font-weight:bold">
              Pagar ahora
            </a>
          </p>
          <p style="color:#888;font-size:13px">
            Si ya realizaste el pago, ignora este mensaje.
          </p>
        `,
      }),
    });
  }

  /**
   * Aviso de que la suscripción está próxima a vencer (1 o 3 días antes).
   */
  async enviarSuscripcionPorVencer(opts: {
    juntaNombre: string;
    juntaEmail: string;
    diasRestantes: number;
    fechaVencimiento: Date;
  }): Promise<void> {
    const portalUrl = `${this.appUrl}/facturas-plataforma`;
    const fechaFmt = this.formatDate(opts.fechaVencimiento);
    const dias = opts.diasRestantes;
    const diasLabel = `${dias} día${dias !== 1 ? 's' : ''}`;

    await this.enviar({
      to: opts.juntaEmail,
      subject: `Tu suscripción vence en ${diasLabel} – JAC App`,
      html: this.wrapBase({
        title: `Tu suscripción vence en ${diasLabel}`,
        body: `
          <p>Hola,</p>
          <p>La suscripción de
            <strong>Junta de Acción Comunal de ${opts.juntaNombre}</strong>
            vence el <strong>${fechaFmt}</strong>.
          </p>
          <p>Tienes <strong>${diasLabel}</strong> para renovar y mantener el acceso sin interrupciones.</p>
          <p>
            <a href="${portalUrl}"
               style="display:inline-block;padding:12px 24px;background:#1565C0;color:#fff;
                      text-decoration:none;border-radius:4px;font-weight:bold">
              Ver facturas pendientes
            </a>
          </p>
        `,
      }),
    });
  }

  /**
   * La suscripción ya venció. Se envía cuando el cron la marca como VENCIDA.
   */
  async enviarSuscripcionVencida(opts: {
    juntaNombre: string;
    juntaEmail: string;
  }): Promise<void> {
    const portalUrl = `${this.appUrl}/facturas-plataforma`;

    await this.enviar({
      to: opts.juntaEmail,
      subject: 'Tu suscripción ha vencido – JAC App',
      html: this.wrapBase({
        title: 'Tu suscripción ha vencido',
        body: `
          <p>Hola,</p>
          <p>La suscripción de
            <strong>Junta de Acción Comunal de ${opts.juntaNombre}</strong>
            ha vencido.
          </p>
          <p>Para recuperar el acceso completo, paga las facturas pendientes.</p>
          <p>
            <a href="${portalUrl}"
               style="display:inline-block;padding:12px 24px;background:#C62828;color:#fff;
                      text-decoration:none;border-radius:4px;font-weight:bold">
              Renovar ahora
            </a>
          </p>
          <p style="color:#888;font-size:13px">
            Si tienes dudas, contacta al soporte de JAC App.
          </p>
        `,
      }),
    });
  }

  /**
   * Código de verificación de correo (al agregar email por primera vez, ej. cambiar contraseña).
   */
  async enviarCodigoVerificacionEmail(opts: {
    to: string;
    codigo: string;
    nombreUsuario: string;
  }): Promise<void> {
    await this.enviar({
      to: opts.to,
      subject: 'Verifica tu correo electrónico – JAC App',
      html: this.wrapBase({
        title: 'Verificación de correo',
        body: `
          <p>Hola ${opts.nombreUsuario},</p>
          <p>Estás verificando tu correo electrónico en JAC App.</p>
          <p>Tu código de verificación es:</p>
          <p style="font-size:24px;font-weight:bold;letter-spacing:8px;color:#1565C0;margin:20px 0">
            ${opts.codigo}
          </p>
          <p>Este código expira en 15 minutos. Si no solicitaste esta verificación, ignora este mensaje.</p>
          <p style="color:#888;font-size:13px">
            Por seguridad, no compartas este código con nadie.
          </p>
        `,
      }),
    });
  }

  /**
   * Código de recuperación de contraseña. Se envía al email indicado por el usuario.
   */
  async enviarCodigoRecuperacion(opts: {
    to: string;
    codigo: string;
    nombreUsuario: string;
  }): Promise<void> {
    await this.enviar({
      to: opts.to,
      subject: 'Código de recuperación de contraseña – JAC App',
      html: this.wrapBase({
        title: 'Recuperación de contraseña',
        body: `
          <p>Hola ${opts.nombreUsuario},</p>
          <p>Has solicitado recuperar tu contraseña en JAC App.</p>
          <p>Tu código de verificación es:</p>
          <p style="font-size:24px;font-weight:bold;letter-spacing:8px;color:#1565C0;margin:20px 0">
            ${opts.codigo}
          </p>
          <p>Este código expira en 15 minutos. Si no solicitaste este cambio, ignora este mensaje.</p>
          <p style="color:#888;font-size:13px">
            Por seguridad, no compartas este código con nadie.
          </p>
        `,
      }),
    });
  }

  /**
   * Confirmación de pago recibido (cuando la factura queda en estado PAGADA).
   */
  async enviarPagoConfirmado(opts: {
    juntaNombre: string;
    juntaEmail: string;
    monto: number;
    fecha: Date;
  }): Promise<void> {
    const portalUrl = `${this.appUrl}/facturas-plataforma`;
    const montoFmt = this.formatCOP(opts.monto);
    const fechaFmt = this.formatDate(opts.fecha);

    await this.enviar({
      to: opts.juntaEmail,
      subject: `Pago recibido – ${montoFmt} COP – JAC App`,
      html: this.wrapBase({
        title: 'Pago recibido',
        body: `
          <p>Hola,</p>
          <p>Hemos recibido el pago de <strong>${montoFmt} COP</strong> para
            <strong>Junta de Acción Comunal de ${opts.juntaNombre}</strong>
            el <strong>${fechaFmt}</strong>.
          </p>
          <p>Puedes consultar el detalle de tus facturas en el portal.</p>
          <p>
            <a href="${portalUrl}"
               style="display:inline-block;padding:12px 24px;background:#2E7D32;color:#fff;
                      text-decoration:none;border-radius:4px;font-weight:bold">
              Ver mis facturas
            </a>
          </p>
          <p style="color:#888;font-size:13px">Gracias por tu pago.</p>
        `,
      }),
    });
  }

  // ──────────────────────────────────────────────────────────────
  // Helpers internos
  // ──────────────────────────────────────────────────────────────

  private wrapBase(opts: { title: string; body: string }): string {
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${opts.title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" style="background:#f4f4f4;padding:32px 0">
    <tr><td align="center">
      <table width="600" style="background:#fff;border-radius:8px;overflow:hidden;
                                box-shadow:0 2px 8px rgba(0,0,0,.12);max-width:600px">
        <tr style="background:#2E7D32">
          <td style="padding:20px 32px;color:#fff;font-size:22px;font-weight:bold;
                     letter-spacing:.5px">
            JAC App
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#333;font-size:15px;line-height:1.7">
            <h2 style="margin:0 0 20px;color:#1B5E20;font-size:20px">
              ${opts.title}
            </h2>
            ${opts.body}
          </td>
        </tr>
        <tr style="background:#f5f5f5">
          <td style="padding:16px 32px;color:#aaa;font-size:12px;text-align:center">
            Este es un mensaje automático de JAC App. Por favor no respondas a este correo.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  private formatCOP(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date(date));
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{2,}/g, '\n')
      .trim();
  }
}
