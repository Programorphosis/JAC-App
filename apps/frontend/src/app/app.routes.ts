import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { platformAdminGuard } from './core/auth/platform-admin.guard';
import {
  pagosGuard,
  tarifasGuard,
  cartasGuard,
  requisitosGuard,
  usuariosGuard,
  crearUsuarioGuard,
} from './core/auth/permission.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent) },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./core/layout/layout/layout.component').then((m) => m.LayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/dashboard/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'usuarios',
        canActivate: [usuariosGuard],
        loadComponent: () =>
          import('./features/usuarios/usuarios-list/usuarios-list.component').then((m) => m.UsuariosListComponent),
      },
      {
        path: 'usuarios/nuevo',
        canActivate: [crearUsuarioGuard],
        loadComponent: () =>
          import('./features/usuarios/usuario-nuevo/usuario-nuevo.component').then((m) => m.UsuarioNuevoComponent),
      },
      {
        path: 'usuarios/:id',
        loadComponent: () =>
          import('./features/usuarios/usuario-detail/usuario-detail.component').then((m) => m.UsuarioDetailComponent),
      },
      {
        path: 'pagos',
        canActivate: [pagosGuard],
        loadComponent: () =>
          import('./features/pagos/pagos/pagos.component').then((m) => m.PagosComponent),
      },
      {
        path: 'pagos/retorno',
        loadComponent: () =>
          import('./features/pagos/pagos-retorno/pagos-retorno.component').then((m) => m.PagosRetornoComponent),
      },
      {
        path: 'requisitos',
        canActivate: [requisitosGuard],
        loadComponent: () =>
          import('./features/requisitos/requisitos-list/requisitos-list.component').then((m) => m.RequisitosListComponent),
      },
      {
        path: 'cartas',
        canActivate: [cartasGuard],
        loadComponent: () =>
          import('./features/cartas/cartas/cartas.component').then((m) => m.CartasComponent),
      },
      {
        path: 'tarifas',
        canActivate: [tarifasGuard],
        loadComponent: () =>
          import('./features/tarifas/tarifas-list/tarifas-list.component').then((m) => m.TarifasListComponent),
      },
      {
        path: 'platform',
        canActivate: [platformAdminGuard],
        loadComponent: () =>
          import('./features/platform/platform/platform.component').then((m) => m.PlatformComponent),
        children: [
          { path: '', redirectTo: 'juntas', pathMatch: 'full' },
          {
            path: 'juntas',
            loadComponent: () =>
              import('./features/platform/juntas-list/juntas-list.component').then((m) => m.JuntasListComponent),
          },
          {
            path: 'juntas/nueva',
            loadComponent: () =>
              import('./features/platform/junta-nueva/junta-nueva.component').then((m) => m.JuntaNuevaComponent),
          },
          {
            path: 'juntas/:id',
            loadComponent: () =>
              import('./features/platform/junta-detail/junta-detail.component').then((m) => m.JuntaDetailComponent),
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
