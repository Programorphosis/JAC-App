import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface DocumentoItem {
  id: string;
  tipo: string;
  rutaS3: string;
  fechaSubida: string;
}

@Injectable({ providedIn: 'root' })
export class DocumentosService {
  private readonly usuariosBase = `${environment.apiUrl}/usuarios`;
  private readonly documentosBase = `${environment.apiUrl}/documentos`;

  constructor(private readonly http: HttpClient) {}

  listarPorUsuario(usuarioId: string): Observable<DocumentoItem[]> {
    return this.http
      .get<{ data: DocumentoItem[] }>(`${this.usuariosBase}/${usuarioId}/documentos`)
      .pipe(map((r) => r.data));
  }

  subir(usuarioId: string, tipo: string, file: File): Observable<{ id: string; tipo: string; rutaS3: string; fechaSubida: string }> {
    const formData = new FormData();
    formData.append('usuarioId', usuarioId);
    formData.append('tipo', tipo);
    formData.append('file', file);

    return this.http
      .post<{ data: { id: string; tipo: string; rutaS3: string; fechaSubida: string } }>(
        this.documentosBase,
        formData
      )
      .pipe(map((r) => r.data));
  }

  getUrlDescarga(documentoId: string): Observable<{ url: string }> {
    return this.http
      .get<{ data: { url: string } }>(`${this.documentosBase}/${documentoId}/descargar`)
      .pipe(map((r) => r.data));
  }
}
