import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import {
  PlatformJuntasService,
  JuntaDetalle,
  JuntaResumen,
  JuntaUso,
  AlertaLimite,
  NotaJuntaItem,
} from '../services/platform-juntas.service';
import { PlatformPlanesService } from '../services/platform-planes.service';
import {
  PlatformFacturasService,
  FacturaItem,
  PagoFacturaItem,
} from '../services/platform-facturas.service';
import { JuntaFormComponent } from '../junta-form/junta-form.component';
import { FacturaCrearDialogComponent } from '../factura-crear-dialog/factura-crear-dialog.component';
import { PagoRegistrarDialogComponent } from '../pago-registrar-dialog/pago-registrar-dialog.component';
import { JuntaInfoCardComponent } from './junta-info-card/junta-info-card.component';
import { JuntaSuscripcionCardComponent } from './junta-suscripcion-card/junta-suscripcion-card.component';
import { JuntaAdminCardComponent } from './junta-admin-card/junta-admin-card.component';
import { JuntaResumenCardComponent } from './junta-resumen-card/junta-resumen-card.component';
import { JuntaUsoCardComponent } from './junta-uso-card/junta-uso-card.component';
import { JuntaFacturacionCardComponent } from './junta-facturacion-card/junta-facturacion-card.component';
import { JuntaNotasCardComponent } from './junta-notas-card/junta-notas-card.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../shared/dialogs/confirm-dialog/confirm-dialog.component';
import {
  MensajeDialogComponent,
  MensajeDialogData,
} from '../../../shared/dialogs/mensaje-dialog/mensaje-dialog.component';
import { PlanSelectorDialogComponent } from '../plan-selector-dialog/plan-selector-dialog.component';
import { AdminSelectorDialogComponent } from '../admin-selector-dialog/admin-selector-dialog.component';
import { handleApiError } from '../../../shared/operators/handle-api-error.operator';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-junta-detail',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatSnackBarModule,
    MatIconModule,
    MatDialogModule,
    JuntaFormComponent,
    JuntaInfoCardComponent,
    JuntaSuscripcionCardComponent,
    JuntaAdminCardComponent,
    JuntaResumenCardComponent,
    JuntaUsoCardComponent,
    JuntaFacturacionCardComponent,
    JuntaNotasCardComponent,
  ],
  templateUrl: './junta-detail.component.html',
  styleUrl: './junta-detail.component.scss',
})
export class JuntaDetailComponent implements OnInit {
  junta: JuntaDetalle | null = null;
  loading = false;
  editando = false;
  resumen: JuntaResumen | null = null;
  uso: JuntaUso | null = null;
  alertas: AlertaLimite[] = [];
  loadingResumen = false;
  loadingUso = false;
  facturas: FacturaItem[] = [];
  facturasMeta: { page: number; limit: number; total: number; totalPages: number } | null = null;
  loadingFacturas = false;
  pagosPlataforma: PagoFacturaItem[] = [];
  pagosMeta: { page: number; limit: number; total: number; totalPages: number } | null = null;
  loadingPagos = false;
  notas: NotaJuntaItem[] = [];
  notasMeta: { page: number; limit: number; total: number; totalPages: number } | null = null;
  loadingNotas = false;
  nuevaNotaTexto = '';
  guardandoNota = false;
  impersonando = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly platform: PlatformJuntasService,
    private readonly facturasService: PlatformFacturasService,
    private readonly planesService: PlatformPlanesService,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
    private readonly auth: AuthService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'nueva') {
      this.cargar(id);
    }
  }

  cargar(id: string): void {
    this.loading = true;
    this.platform
      .obtener(id)
      .pipe(handleApiError(this.snackBar))
      .subscribe({
        next: (j) => {
          this.junta = j;
          this.loading = false;
          this.cargarResumen(id);
          this.cargarUso(id);
          this.cargarAlertas(id);
          this.cargarFacturas(id);
          this.cargarPagosPlataforma(id);
          this.cargarNotas(id);
        },
        error: () => {
          this.loading = false;
          this.router.navigate(['/platform', 'juntas']);
        },
      });
  }

  volver(): void {
    this.router.navigate(['/platform', 'juntas']);
  }

  /** PA-8: Platform admin no impersonando puede ver como junta. */
  puedeImpersonar(): boolean {
    return this.auth.isPlatformAdmin() && !this.auth.isImpersonando();
  }

  /** PA-8: Impersonar junta y navegar a la app de junta. */
  verComoJunta(): void {
    if (!this.junta || this.impersonando) return;
    this.impersonando = true;
    this.auth
      .impersonar(this.junta.id)
      .pipe(handleApiError(this.snackBar))
      .subscribe({
        next: () => {
          this.impersonando = false;
          this.router.navigate(['/']);
        },
        error: () => {
          this.impersonando = false;
      },
    });
  }

  editar(): void {
    this.editando = true;
  }

  onGuardar(
    body: {
      nombre: string;
      nit?: string;
      montoCarta?: number | null;
      telefono?: string | null;
      email?: string | null;
      direccion?: string | null;
      ciudad?: string | null;
      departamento?: string | null;
      enMantenimiento?: boolean;
    }
  ): void {
    if (!this.junta) return;
    this.platform.actualizar(this.junta.id, {
      nombre: body.nombre,
      nit: body.nit ?? undefined,
      montoCarta: body.montoCarta ?? undefined,
      telefono: body.telefono ?? undefined,
      email: body.email ?? undefined,
      direccion: body.direccion ?? undefined,
      ciudad: body.ciudad ?? undefined,
      departamento: body.departamento ?? undefined,
      enMantenimiento: body.enMantenimiento,
    })
      .pipe(handleApiError(this.snackBar))
      .subscribe({
      next: (actualizada) => {
        this.junta = { ...this.junta!, ...actualizada };
        this.editando = false;
        this.snackBar.open('Junta actualizada', 'Cerrar', { duration: 2000 });
      },
      error: () => {},
    });
  }

  toggleActivo(): void {
    if (!this.junta) return;
    const nuevoActivo = !this.junta.activo;
    const accion = nuevoActivo ? 'activar' : 'desactivar';
    this.abrirConfirmacion({
      titulo: nuevoActivo ? 'Activar junta' : 'Desactivar junta',
      mensaje: `¿Desea ${accion} la junta "${this.junta.nombre}"? Las juntas inactivas no pueden iniciar sesión.`,
      textoConfirmar: nuevoActivo ? 'Activar' : 'Desactivar',
      peligroso: !nuevoActivo,
    }).subscribe((confirmed) => {
      if (!confirmed) return;
      this.platform
        .actualizar(this.junta!.id, { activo: nuevoActivo })
        .pipe(handleApiError(this.snackBar))
        .subscribe({
          next: (actualizada) => {
            this.junta = { ...this.junta!, ...actualizada };
            this.snackBar.open(
              nuevoActivo ? 'Junta activada' : 'Junta desactivada',
              'Cerrar',
              { duration: 2000 }
            );
          },
          error: () => {},
        });
    });
  }

  darBaja(): void {
    if (!this.junta) return;
    this.abrirConfirmacion({
      titulo: 'Dar de baja junta',
      mensaje: `¿Dar de baja la junta "${this.junta.nombre}"? Los usuarios no podrán iniciar sesión.`,
      textoConfirmar: 'Dar de baja',
      peligroso: true,
    }).subscribe((confirmed) => {
      if (!confirmed) return;
      this.platform
        .darBaja(this.junta!.id)
        .pipe(handleApiError(this.snackBar))
        .subscribe({
        next: (actualizada) => {
          this.junta = { ...this.junta!, ...actualizada };
          this.snackBar.open('Junta dada de baja', 'Cerrar', { duration: 2000 });
        },
        error: () => {},
      });
    });
  }

  private abrirConfirmacion(data: ConfirmDialogData) {
    return this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
        data,
        width: '400px',
      })
      .afterClosed();
  }

  private cargarResumen(id: string): void {
    this.loadingResumen = true;
    this.platform
      .resumen(id)
      .pipe(handleApiError(this.snackBar))
      .subscribe({
      next: (r) => {
        this.resumen = r;
        this.loadingResumen = false;
      },
      error: () => (this.loadingResumen = false),
    });
  }

  private cargarUso(id: string): void {
    this.loadingUso = true;
    this.platform
      .uso(id)
      .pipe(handleApiError(this.snackBar))
      .subscribe({
      next: (u) => {
        this.uso = u;
        this.loadingUso = false;
      },
      error: () => (this.loadingUso = false),
    });
  }

  private cargarAlertas(id: string): void {
    this.platform
      .alertas(id)
      .pipe(handleApiError(this.snackBar))
      .subscribe({
      next: (a) => (this.alertas = a),
      error: () => (this.alertas = []),
    });
  }

  cargarFacturas(id: string, page = 1): void {
    if (!this.junta) return;
    this.loadingFacturas = true;
    this.facturasService
      .listarFacturas(id, page, 10)
      .pipe(handleApiError(this.snackBar))
      .subscribe({
      next: (r) => {
        this.facturas = r.data;
        this.facturasMeta = r.meta;
        this.loadingFacturas = false;
      },
      error: () => (this.loadingFacturas = false),
    });
  }

  cargarPagosPlataforma(id: string, page = 1): void {
    if (!this.junta) return;
    this.loadingPagos = true;
    this.facturasService
      .listarPagosPlataforma(id, page, 10)
      .pipe(handleApiError(this.snackBar))
      .subscribe({
      next: (r) => {
        this.pagosPlataforma = r.data;
        this.pagosMeta = r.meta;
        this.loadingPagos = false;
      },
      error: () => (this.loadingPagos = false),
    });
  }

  abrirCrearFactura(): void {
    const junta = this.junta;
    if (!junta) return;
    this.dialog
      .open(FacturaCrearDialogComponent, {
        data: { juntaNombre: junta.nombre },
        width: '400px',
      })
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.facturasService
            .crearFactura(junta.id, result)
            .pipe(handleApiError(this.snackBar))
            .subscribe({
            next: () => {
              this.cargarFacturas(junta.id);
              this.cargarPagosPlataforma(junta.id);
              this.snackBar.open('Factura creada', 'Cerrar', { duration: 2000 });
            },
            error: () => {},
          });
        }
      });
  }

  abrirRegistrarPago(f: FacturaItem): void {
    const junta = this.junta;
    if (!junta) return;
    const pagado = f.pagos.reduce((s, p) => s + p.monto, 0);
    const pendiente = f.monto - pagado;
    if (pendiente <= 0) return;
    this.dialog
      .open(PagoRegistrarDialogComponent, {
        data: {
          facturaId: f.id,
          montoTotal: f.monto,
          montoPagado: pagado,
          montoPendiente: pendiente,
        },
        width: '400px',
      })
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.facturasService
            .registrarPago(junta.id, f.id, result)
            .pipe(handleApiError(this.snackBar))
            .subscribe({
            next: () => {
              this.cargarFacturas(junta.id);
              this.cargarPagosPlataforma(junta.id);
              this.snackBar.open('Pago registrado', 'Cerrar', { duration: 2000 });
            },
            error: () => {},
          });
        }
      });
  }

  cancelarFactura(f: FacturaItem): void {
    const junta = this.junta;
    if (!junta) return;
    this.abrirConfirmacion({
      titulo: 'Cancelar factura',
      mensaje: '¿Cancelar esta factura? No se podrán registrar más pagos.',
      textoConfirmar: 'Cancelar factura',
      peligroso: true,
    }).subscribe((confirmed) => {
      if (!confirmed) return;
      this.facturasService
        .cancelarFactura(junta.id, f.id)
        .pipe(handleApiError(this.snackBar))
        .subscribe({
          next: () => {
            this.cargarFacturas(junta.id);
            this.snackBar.open('Factura cancelada', 'Cerrar', { duration: 2000 });
          },
          error: () => {},
        });
    });
  }

  reactivarFactura(f: FacturaItem): void {
    const junta = this.junta;
    if (!junta) return;
    this.abrirConfirmacion({
      titulo: 'Reactivar factura',
      mensaje:
        '¿Reactivar esta factura? Volverá a estar pendiente de pago. Solo se puede reactivar si no tiene pagos y no ha vencido.',
      textoConfirmar: 'Reactivar',
    }).subscribe((confirmed) => {
      if (!confirmed) return;
      this.facturasService
        .reactivarFactura(junta.id, f.id)
        .pipe(handleApiError(this.snackBar))
        .subscribe({
          next: () => {
            this.cargarFacturas(junta.id);
            this.snackBar.open('Factura reactivada', 'Cerrar', { duration: 2000 });
          },
          error: () => {},
        });
    });
  }

  cargarNotas(id: string, page = 1): void {
    if (!this.junta) return;
    this.loadingNotas = true;
    this.platform
      .listarNotas(id, page, 20)
      .pipe(handleApiError(this.snackBar))
      .subscribe({
      next: (r) => {
        this.notas = r.data;
        this.notasMeta = r.meta;
        this.loadingNotas = false;
      },
      error: () => (this.loadingNotas = false),
    });
  }

  agregarNota(): void {
    const junta = this.junta;
    if (!junta || !this.nuevaNotaTexto.trim()) return;
    this.guardandoNota = true;
    this.platform
      .crearNota(junta.id, this.nuevaNotaTexto.trim())
      .pipe(handleApiError(this.snackBar))
      .subscribe({
      next: () => {
        this.nuevaNotaTexto = '';
        this.cargarNotas(junta.id);
        this.guardandoNota = false;
        this.snackBar.open('Nota agregada', 'Cerrar', { duration: 2000 });
      },
      error: () => {
        this.guardandoNota = false;
      },
    });
  }

  exportar(format: 'json' | 'csv'): void {
    const junta = this.junta;
    if (!junta) return;
    const baseName = `export_${junta.nombre.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}`;
    if (format === 'csv') {
      this.platform
        .exportarCsv(junta.id)
        .pipe(handleApiError(this.snackBar))
        .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${baseName}.csv`;
          a.click();
          URL.revokeObjectURL(url);
          this.snackBar.open('Exportación CSV descargada', 'Cerrar', { duration: 2000 });
        },
        error: () => {},
      });
    } else {
      this.platform
        .exportarJson(junta.id)
        .pipe(handleApiError(this.snackBar))
        .subscribe({
        next: (data) => {
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${baseName}.json`;
          a.click();
          URL.revokeObjectURL(url);
          this.snackBar.open('Exportación JSON descargada', 'Cerrar', { duration: 2000 });
        },
        error: () => {},
      });
    }
  }

  resetPasswordAdmin(): void {
    if (!this.junta) return;
    this.abrirConfirmacion({
      titulo: 'Generar contraseña temporal',
      mensaje:
        '¿Generar nueva contraseña temporal para el admin? La contraseña actual dejará de funcionar.',
      textoConfirmar: 'Generar',
    }).subscribe((confirmed) => {
      if (!confirmed) return;
      this.platform
        .resetPasswordAdmin(this.junta!.id)
        .pipe(handleApiError(this.snackBar))
        .subscribe({
        next: (r) => {
          this.dialog.open(MensajeDialogComponent, {
            data: {
              titulo: 'Contraseña temporal generada',
              mensaje: 'Guárdala y compártela con el admin de forma segura.',
              textoCopiable: r.passwordTemporal,
            } as MensajeDialogData,
            width: '450px',
          });
          this.snackBar.open('Contraseña generada. Guárdala de forma segura.', 'Cerrar', {
            duration: 5000,
          });
        },
        error: () => {},
      });
    });
  }

  reenviarCredenciales(): void {
    if (!this.junta) return;
    this.abrirConfirmacion({
      titulo: 'Regenerar credenciales',
      mensaje: '¿Generar nuevas credenciales temporales para el admin actual?',
      textoConfirmar: 'Generar',
    }).subscribe((confirmed) => {
      if (!confirmed) return;
      this.platform
        .reenviarCredencialesAdmin(this.junta!.id)
        .pipe(handleApiError(this.snackBar))
        .subscribe({
        next: (r) => {
          this.dialog.open(MensajeDialogComponent, {
            data: {
              titulo: 'Nueva contraseña temporal',
              mensaje: 'Guárdala y compártela con el admin de forma segura.',
              textoCopiable: r.passwordTemporal,
            } as MensajeDialogData,
            width: '450px',
          });
          this.snackBar.open('Credenciales regeneradas.', 'Cerrar', { duration: 3000 });
        },
        error: () => {},
      });
    });
  }

  abrirCambiarAdmin(): void {
    const junta = this.junta;
    if (!junta) return;
    this.platform
      .listarUsuarios(junta.id)
      .pipe(handleApiError(this.snackBar))
      .subscribe({
        next: (usuarios) => {
          const otros = usuarios.filter((u) => u.id !== junta.admin?.id && u.activo);
          if (otros.length === 0) {
            this.snackBar.open('No hay otros usuarios activos para asignar como admin.', 'Cerrar', { duration: 4000 });
            return;
          }
          this.dialog
            .open(AdminSelectorDialogComponent, {
              data: { titulo: 'Cambiar administrador', usuarios: otros },
              width: '450px',
            })
            .afterClosed()
            .subscribe((nuevoAdmin) => {
              if (!nuevoAdmin) return;
              this.abrirConfirmacion({
                titulo: 'Confirmar cambio',
                mensaje: `¿Asignar a ${nuevoAdmin.nombres} ${nuevoAdmin.apellidos} como admin de la junta?`,
                textoConfirmar: 'Asignar',
              }).subscribe((confirmed) => {
                if (!confirmed) return;
                this.platform
                  .cambiarAdmin(junta.id, nuevoAdmin.id)
                  .pipe(handleApiError(this.snackBar))
                  .subscribe({
                    next: (r) => {
                      if (this.junta && this.junta.id === junta.id) {
                        this.junta = { ...this.junta, admin: r.adminUsuario };
                      }
                      this.snackBar.open('Admin cambiado correctamente', 'Cerrar', { duration: 2000 });
                    },
                    error: () => {},
                  });
              });
            });
        },
        error: () => {},
      });
  }

  abrirCrearSuscripcion(): void {
    const junta = this.junta;
    if (!junta) return;
    this.planesService
      .listar()
      .pipe(handleApiError(this.snackBar))
      .subscribe({
        next: (planes) => {
          if (planes.length === 0) {
            this.snackBar.open('No hay planes disponibles', 'Cerrar', { duration: 3000 });
            return;
          }
          this.dialog
            .open(PlanSelectorDialogComponent, {
              data: { titulo: 'Crear suscripción', planes },
              width: '450px',
            })
            .afterClosed()
            .subscribe((plan) => {
              if (!plan) return;
              const diasPrueba = plan.diasPrueba || 0;
              this.platform
                .crearSuscripcion(junta.id, plan.id, diasPrueba)
                .pipe(handleApiError(this.snackBar))
                .subscribe({
                  next: () => {
                    this.cargar(junta.id);
                    this.snackBar.open('Suscripción creada', 'Cerrar', { duration: 2000 });
                  },
                  error: () => {},
                });
            });
        },
        error: () => {},
      });
  }

  abrirCambiarPlan(): void {
    const junta = this.junta;
    if (!junta?.suscripcion) return;
    this.planesService
      .listar()
      .pipe(handleApiError(this.snackBar))
      .subscribe({
        next: (planes) => {
          const otros = planes.filter((p) => p.id !== junta.suscripcion!.plan.id);
          if (otros.length === 0) {
            this.snackBar.open('No hay otros planes disponibles', 'Cerrar', { duration: 3000 });
            return;
          }
          this.dialog
            .open(PlanSelectorDialogComponent, {
              data: {
                titulo: 'Cambiar plan',
                planes,
                planActualId: junta.suscripcion!.plan.id,
              },
              width: '450px',
            })
            .afterClosed()
            .subscribe((nuevoPlan) => {
              if (!nuevoPlan) return;
              this.abrirConfirmacion({
                titulo: 'Confirmar cambio de plan',
                mensaje: `¿Cambiar a plan ${nuevoPlan.nombre}?`,
                textoConfirmar: 'Cambiar',
              }).subscribe((confirmed) => {
                if (!confirmed) return;
                this.platform
                  .actualizarSuscripcion(junta.id, { planId: nuevoPlan.id })
                  .pipe(handleApiError(this.snackBar))
                  .subscribe({
                    next: () => {
                      this.cargar(junta.id);
                      this.snackBar.open('Plan actualizado', 'Cerrar', { duration: 2000 });
                    },
                    error: () => {},
                  });
              });
            });
        },
        error: () => {},
      });
    }

  bloquearAdmin(): void {
    if (!this.junta?.admin) return;
    const admin = this.junta.admin;
    this.abrirConfirmacion({
      titulo: 'Bloquear administrador',
      mensaje: `¿Bloquear al admin ${admin.nombres} ${admin.apellidos}? No podrá iniciar sesión.`,
      textoConfirmar: 'Bloquear',
      peligroso: true,
    }).subscribe((confirmed) => {
      if (!confirmed) return;
      this.platform
        .bloquearAdmin(this.junta!.id)
        .pipe(handleApiError(this.snackBar))
        .subscribe({
        next: () => {
          this.junta = {
            ...this.junta!,
            admin: { ...this.junta!.admin!, activo: false },
          };
          this.snackBar.open('Admin bloqueado', 'Cerrar', { duration: 2000 });
        },
        error: () => {},
      });
    });
  }
}
