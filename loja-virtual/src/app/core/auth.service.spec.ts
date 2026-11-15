import { beforeEach, describe, expect, it } from 'vitest';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    localStorage.clear();
    service = new AuthService();
  });

  it('should persist login status across navigation', () => {
    expect(service.estaLogado()).toBeFalsy();

    service.logar({
      nome: 'Maria',
      email: 'maria@email.com',
      senha: '123456',
      cpf: '12345678900',
      telefone: '11999999999'
    });

    expect(service.estaLogado()).toBeTruthy();
    expect(service.obterUsuario()?.email).toBe('maria@email.com');

    service.deslogar();
    expect(service.estaLogado()).toBeFalsy();
  });

  it('should keep multiple registered users without overwriting previous ones', () => {
    service.salvarUsuario({
      nome: 'Maria',
      email: 'maria@email.com',
      senha: '123456',
      cpf: '12345678900',
      telefone: '11999999999'
    });

    service.salvarUsuario({
      nome: 'Joao',
      email: 'joao@email.com',
      senha: '654321',
      cpf: '98765432100',
      telefone: '21988887777'
    });

    expect(service.obterTodosUsuarios()).toHaveLength(2);
    expect(service.validarLogin('joao@email.com', '654321')).toBeTruthy();
  });
});
