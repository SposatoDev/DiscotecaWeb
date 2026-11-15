import { Component, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';

@Component({
  imports: [RouterLink, FormsModule],
  selector: 'app-header',
  styleUrl: './header.scss',
  templateUrl: './header.html',
})
export class Header {
  private router = inject(Router);
  private authService = inject(AuthService);

  get usuarioLogado(): boolean {
    return this.authService.estaLogado();
  }

  get usuarioAtual() {
    return this.authService.obterUsuario();
  }

  buscar(termo: string): void {
    if (termo.trim()) {
      this.router.navigate(['/busca'], { queryParams: { q: termo } });
    }
  }

  irParaCentral(): void {
    this.router.navigate([this.usuarioLogado ? '/vitrine' : '/login']);
  }

  sair(): void {
    this.authService.deslogar();
    this.router.navigate(['/login']);
  }
}
