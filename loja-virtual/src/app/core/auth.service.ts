import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, Optional, PLATFORM_ID } from '@angular/core';
import { Observable, tap } from 'rxjs';

export interface Usuario {
  id?: number;
  nome: string;
  email: string;
  senha: string;
  cpf: string;
  telefone: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(
    @Optional() private readonly http: HttpClient | null = null,
    @Inject(PLATFORM_ID) private readonly platformId: Object = 'browser'
  ) {}
  private readonly chaveUsuarios = 'vinilshop-usuarios';
  private readonly chaveUsuario = 'vinilshop-usuario';
  private readonly chaveLogado = 'vinilshop-logado';

  obterTodosUsuarios(): Usuario[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    const usuariosSalvos = localStorage.getItem(this.chaveUsuarios);

    if (!usuariosSalvos) {
      return [];
    }

    try {
      const usuarios = JSON.parse(usuariosSalvos) as Usuario[];
      return Array.isArray(usuarios) ? usuarios : [];
    } catch {
      return [];
    }
  }

  obterUsuario(): Usuario | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const usuarioSalvo = localStorage.getItem(this.chaveUsuario);

    if (!usuarioSalvo) {
      return null;
    }

    try {
      return JSON.parse(usuarioSalvo) as Usuario;
    } catch {
      return null;
    }
  }

  salvarUsuario(usuario: Usuario): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const usuarios = this.obterTodosUsuarios();
    const emailNormalizado = usuario.email.trim().toLowerCase();
    const indice = usuarios.findIndex(
      cadastro => cadastro.email.trim().toLowerCase() === emailNormalizado
    );

    if (indice >= 0) {
      usuarios[indice] = usuario;
    } else {
      usuarios.push(usuario);
    }

    localStorage.setItem(this.chaveUsuarios, JSON.stringify(usuarios));
    localStorage.setItem(this.chaveUsuario, JSON.stringify(usuario));
  }

  logar(usuario: Usuario): void {
    this.salvarUsuario(usuario);
    localStorage.setItem(this.chaveLogado, 'true');
  }

  deslogar(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.removeItem(this.chaveUsuario);
    localStorage.removeItem(this.chaveLogado);
    localStorage.removeItem('vinilshop-token');
  }

  estaLogado(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    return localStorage.getItem(this.chaveLogado) === 'true' && !!this.obterUsuario();
  }

  validarLogin(email: string, senha: string): boolean {
    const usuarios = this.obterTodosUsuarios();
    const usuario = usuarios.find(
      cadastro => cadastro.email.trim().toLowerCase() === email.trim().toLowerCase()
    );

    if (!usuario) {
      return false;
    }

    const loginValido = usuario.senha === senha;

    if (loginValido) {
      this.logar(usuario);
    }

    return loginValido;
  }

  cadastrar(usuario: Usuario): Observable<{ id: number; mensagem: string }> {
    if (!this.http) throw new Error('HttpClient não está disponível.');
    return this.http.post<{ id: number; mensagem: string }>('/api/auth/cadastro', usuario);
  }

  verificarDisponibilidade(campo: 'nome' | 'email' | 'senha' | 'cpf' | 'telefone', valor: string): Observable<{ disponivel: boolean; mensagem: string }> {
    if (!this.http) throw new Error('HttpClient não está disponível.');
    return this.http.get<{ disponivel: boolean; mensagem: string }>('/api/auth/disponibilidade', {
      params: { campo, valor }
    });
  }

  entrar(email: string, senha: string): Observable<{ token: string; usuario: Usuario }> {
    if (!this.http) throw new Error('HttpClient não está disponível.');
    return this.http.post<{ token: string; usuario: Usuario }>('/api/auth/login', { email, senha }).pipe(
      tap(resposta => {
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('vinilshop-token', resposta.token);
          localStorage.setItem(this.chaveUsuario, JSON.stringify(resposta.usuario));
          localStorage.setItem(this.chaveLogado, 'true');
        }
      })
    );
  }

  recuperarSenha(email: string): Observable<{ mensagem: string }> {
    if (!this.http) throw new Error('HttpClient não está disponível.');
    return this.http.post<{ mensagem: string }>('/api/auth/recuperar-senha', { email });
  }

  obterToken(): string | null {
    return isPlatformBrowser(this.platformId) ? localStorage.getItem('vinilshop-token') : null;
  }
}
