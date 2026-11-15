import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-perfil',
  imports: [RouterLink],
  templateUrl: './perfil.html',
  styleUrl: './perfil.scss'
})
export class Perfil {
  private authService = inject(AuthService);
  private router = inject(Router);

  usuario = this.authService.obterUsuario();

  constructor() {
    if (!this.authService.estaLogado()) {
      this.router.navigate(['/login']);
    }
  }

  sair(): void {
    this.authService.deslogar();
    this.router.navigate(['/login']);
  }
}
