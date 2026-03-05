import { RolNombre } from '@prisma/client';
import { PERMISSIONS } from './permissions.constants';
import {
  computePermissions,
  computePermissionsForImpersonation,
} from './permissions-from-roles';

describe('computePermissions', () => {
  it('PLATFORM_ADMIN con juntaId null retorna array vacío', () => {
    const perms = computePermissions([RolNombre.PLATFORM_ADMIN], false, null);
    expect(perms).toEqual([]);
  });

  it('ADMIN obtiene todos sus permisos', () => {
    const perms = computePermissions([RolNombre.ADMIN], false, 'j1');
    expect(perms).toContain(PERMISSIONS.AVISOS_JUNTA_GESTIONAR);
    expect(perms).toContain(PERMISSIONS.JUNTA_CONFIG_WOMPI);
    expect(perms).toContain(PERMISSIONS.JUNTA_DATOS_EDITAR);
    expect(perms).toContain(PERMISSIONS.USUARIOS_VER);
    expect(perms).toContain(PERMISSIONS.USUARIOS_CREAR);
    expect(perms).toContain(PERMISSIONS.USUARIOS_EDITAR);
    expect(perms).toContain(PERMISSIONS.USUARIOS_EDITAR_ROLES);
    expect(perms).toContain(PERMISSIONS.REQUISITOS_VER);
    expect(perms).toContain(PERMISSIONS.REQUISITOS_MODIFICAR);
    expect(perms).toContain(PERMISSIONS.PAGOS_VER);
    expect(perms).toContain(PERMISSIONS.TARIFAS_VER);
    expect(perms).toContain(PERMISSIONS.AUDITORIAS_VER);
    expect(perms).toContain(PERMISSIONS.DOCUMENTOS_SUBIR_OTROS);
    expect(perms).toContain(PERMISSIONS.HISTORIAL_CREAR);
  });

  it('SECRETARIA obtiene cartas:validar y pagar online propio', () => {
    const perms = computePermissions([RolNombre.SECRETARIA], false, 'j1');
    expect(perms).toContain(PERMISSIONS.CARTAS_VALIDAR);
    expect(perms).toContain(PERMISSIONS.PAGOS_PAGAR_ONLINE_PROPIO);
    expect(perms).toContain(PERMISSIONS.AVISOS_JUNTA_GESTIONAR);
    expect(perms).not.toContain(PERMISSIONS.JUNTA_CONFIG_WOMPI);
  });

  it('TESORERA obtiene pagos:gestionar, pagos:pagarOnline, tarifas:modificar', () => {
    const perms = computePermissions([RolNombre.TESORERA], false, 'j1');
    expect(perms).toContain(PERMISSIONS.PAGOS_GESTIONAR);
    expect(perms).toContain(PERMISSIONS.PAGOS_PAGAR_ONLINE);
    expect(perms).toContain(PERMISSIONS.TARIFAS_MODIFICAR);
    expect(perms).toContain(PERMISSIONS.JUNTA_SUSCRIPCION_GESTIONAR);
    expect(perms).toContain(PERMISSIONS.HISTORIAL_CREAR);
  });

  it('FISCAL obtiene solo permisos de lectura', () => {
    const perms = computePermissions([RolNombre.FISCAL], false, 'j1');
    expect(perms).toContain(PERMISSIONS.USUARIOS_VER);
    expect(perms).toContain(PERMISSIONS.PAGOS_VER);
    expect(perms).toContain(PERMISSIONS.TARIFAS_VER);
    expect(perms).toContain(PERMISSIONS.REQUISITOS_VER);
    expect(perms).toContain(PERMISSIONS.CARTAS_VER);
    expect(perms).toContain(PERMISSIONS.AUDITORIAS_VER);
    expect(perms).not.toContain(PERMISSIONS.USUARIOS_CREAR);
    expect(perms).not.toContain(PERMISSIONS.PAGOS_GESTIONAR);
  });

  it('AFILIADO obtiene pagar online propio y solicitar cartas', () => {
    const perms = computePermissions([RolNombre.AFILIADO], false, 'j1');
    expect(perms).toContain(PERMISSIONS.PAGOS_PAGAR_ONLINE_PROPIO);
    expect(perms).toContain(PERMISSIONS.CARTAS_SOLICITAR);
    expect(perms).not.toContain(PERMISSIONS.USUARIOS_VER);
  });

  it('RECEPTOR_AGUA obtiene usuarios:ver', () => {
    const perms = computePermissions([RolNombre.RECEPTOR_AGUA], false, 'j1');
    expect(perms).toContain(PERMISSIONS.USUARIOS_VER);
    expect(perms).not.toContain(PERMISSIONS.PAGOS_VER);
  });

  it('modificador sin roles admin obtiene usuarios:ver', () => {
    const perms = computePermissions([RolNombre.AFILIADO], true, 'j1');
    expect(perms).toContain(PERMISSIONS.USUARIOS_VER);
  });

  it('múltiples roles combina permisos sin duplicados', () => {
    const perms = computePermissions(
      [RolNombre.ADMIN, RolNombre.SECRETARIA],
      false,
      'j1',
    );
    const uniquePerms = [...new Set(perms)];
    expect(perms.length).toBe(uniquePerms.length);
    expect(perms).toContain(PERMISSIONS.CARTAS_VALIDAR);
    expect(perms).toContain(PERMISSIONS.JUNTA_CONFIG_WOMPI);
  });
});

describe('computePermissionsForImpersonation', () => {
  it('retorna permisos de solo lectura', () => {
    const perms = computePermissionsForImpersonation();
    expect(perms).toContain(PERMISSIONS.USUARIOS_VER);
    expect(perms).toContain(PERMISSIONS.PAGOS_VER);
    expect(perms).toContain(PERMISSIONS.TARIFAS_VER);
    expect(perms).toContain(PERMISSIONS.REQUISITOS_VER);
    expect(perms).toContain(PERMISSIONS.AUDITORIAS_VER);
    expect(perms).toHaveLength(5);
  });

  it('no incluye permisos de escritura', () => {
    const perms = computePermissionsForImpersonation();
    expect(perms).not.toContain(PERMISSIONS.USUARIOS_CREAR);
    expect(perms).not.toContain(PERMISSIONS.PAGOS_GESTIONAR);
    expect(perms).not.toContain(PERMISSIONS.CARTAS_VALIDAR);
  });
});
