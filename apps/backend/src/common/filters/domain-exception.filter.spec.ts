import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { DomainExceptionFilter } from './domain-exception.filter';
import {
  DomainError,
  DeudaCeroError,
  PagoDuplicadoError,
  UsuarioNoEncontradoError,
  UsuarioInactivoError,
  AlmacenamientoNoConfiguradoError,
  BootstrapYaEjecutadoError,
  LimiteUsuariosExcedidoError,
  TipoDocumentoNoPermitidoError,
} from '../../domain/errors/domain.errors';

function createMockHost(requestId?: string) {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const headers: Record<string, string> = {};
  if (requestId) headers['x-request-id'] = requestId;
  return {
    host: {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ headers }),
      }),
    } as unknown as ArgumentsHost,
    json,
    status,
  };
}

describe('DomainExceptionFilter', () => {
  const filter = new DomainExceptionFilter();

  beforeEach(() => {
    jest.spyOn(filter['logger'], 'warn').mockImplementation(() => {});
  });

  it('debe manejar HttpException y devolver su status', () => {
    const { host, status, json } = createMockHost();
    const ex = new HttpException('No encontrado', HttpStatus.NOT_FOUND);

    filter.catch(ex, host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, error: 'Not Found' }),
    );
  });

  it('debe manejar HttpException con mensaje array', () => {
    const { host, json } = createMockHost();
    const ex = new HttpException(
      {
        message: ['campo1 requerido', 'campo2 inválido'],
        error: 'Bad Request',
        statusCode: 400,
      },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(ex, host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'campo1 requerido. campo2 inválido' }),
    );
  });

  it('debe mapear DeudaCeroError a 422', () => {
    const { host, status, json } = createMockHost();
    filter.catch(new DeudaCeroError('u1'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'DEUDA_CERO' }),
    );
  });

  it('debe mapear PagoDuplicadoError a 409', () => {
    const { host, status } = createMockHost();
    filter.catch(new PagoDuplicadoError('ref-1'), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
  });

  it('debe mapear UsuarioNoEncontradoError a 404', () => {
    const { host, status } = createMockHost();
    filter.catch(new UsuarioNoEncontradoError('u1'), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
  });

  it('debe mapear UsuarioInactivoError a 403', () => {
    const { host, status } = createMockHost();
    filter.catch(new UsuarioInactivoError('u1'), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
  });

  it('debe mapear AlmacenamientoNoConfiguradoError a 503', () => {
    const { host, status } = createMockHost();
    filter.catch(new AlmacenamientoNoConfiguradoError(), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
  });

  it('debe mapear BootstrapYaEjecutadoError a 409', () => {
    const { host, status } = createMockHost();
    filter.catch(new BootstrapYaEjecutadoError(), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
  });

  it('debe mapear LimiteUsuariosExcedidoError a 403', () => {
    const { host, status } = createMockHost();
    filter.catch(new LimiteUsuariosExcedidoError(50), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
  });

  it('debe mapear TipoDocumentoNoPermitidoError a 400', () => {
    const { host, status } = createMockHost();
    filter.catch(new TipoDocumentoNoPermitidoError('exe'), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
  });

  it('debe mapear DomainError con código desconocido a 422 por defecto', () => {
    const { host, status } = createMockHost();
    filter.catch(new DomainError('algo pasó', 'CODIGO_NUEVO'), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY);
  });

  it('debe manejar Error genérico como 500', () => {
    const { host, status, json } = createMockHost();
    filter.catch(new Error('algo inesperado'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        error: 'Internal Server Error',
      }),
    );
  });

  it('debe manejar excepción no-Error como 500', () => {
    const { host, status } = createMockHost();
    filter.catch('string error', host);
    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
  });
});
