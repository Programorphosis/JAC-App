import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ReporteResult {
  data: string;
  filename: string;
}

/**
 * PA-10: Reportes exportables para platform admin.
 */
@Injectable({ providedIn: 'root' })
export class PlatformReportesService {
  private readonly base = `${environment.apiUrl}/platform/reportes`;

  constructor(private readonly http: HttpClient) {}

  private triggerDownload(csv: string, filename: string): void {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  descargarJuntas(): Observable<void> {
    return this.http.get<ReporteResult>(`${this.base}/juntas`).pipe(
      tap((r) => this.triggerDownload(r.data, r.filename)),
      map(() => undefined)
    );
  }

  descargarFacturacion(): Observable<void> {
    return this.http.get<ReporteResult>(`${this.base}/facturacion`).pipe(
      tap((r) => this.triggerDownload(r.data, r.filename)),
      map(() => undefined)
    );
  }

  descargarUso(): Observable<void> {
    return this.http.get<ReporteResult>(`${this.base}/uso`).pipe(
      tap((r) => this.triggerDownload(r.data, r.filename)),
      map(() => undefined)
    );
  }
}
