import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  erroLogin = false;
  mensagem = '';
  tipoMensagem: 'sucesso' | 'erro' = 'erro';

  constructor() {
    if (this.authService.estaLogado()) {
      this.router.navigate(['/vitrine']);
    }
  }

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required, Validators.minLength(6)]]
  });

  entrar(): void {
    if (this.form.valid) {
      this.authService.entrar(
        this.form.controls.email.value ?? '',
        this.form.controls.senha.value ?? ''
      ).subscribe({
        next: () => {
          this.erroLogin = false;
          this.mostrarMensagem('Login realizado com sucesso!', 'sucesso');
          setTimeout(() => this.router.navigate(['/vitrine']), 800);
        },
        error: () => {
          this.mostrarMensagem('Email ou senha incorretos.', 'erro');
          this.erroLogin = true;
        }
      });
    } else {
      this.erroLogin = false;
      this.form.markAllAsTouched();
    }
  }

  private mostrarMensagem(texto: string, tipo: 'sucesso' | 'erro'): void {
    this.mensagem = texto;
    this.tipoMensagem = tipo;
  }
}
