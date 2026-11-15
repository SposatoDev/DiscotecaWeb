import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-esqueci-senha',
  templateUrl: './esqueci-senha.html',
  styleUrl: './esqueci-senha.scss'
})
export class EsqueciSenha {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  mensagem = '';
  tipoMensagem: 'sucesso' | 'erro' = 'erro';

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  enviar(): void {
    if (this.form.valid) {
      this.authService.recuperarSenha(this.form.controls.email.value ?? '').subscribe({
        next: resposta => {
          this.mostrarMensagem(resposta.mensagem, 'sucesso');
          setTimeout(() => this.router.navigate(['/login']), 1000);
        },
        error: erro => this.mostrarMensagem(erro.error?.mensagem ?? 'Não foi possível processar a solicitação.', 'erro')
      });
    } else {
      this.form.markAllAsTouched();
    }
  }

  private mostrarMensagem(texto: string, tipo: 'sucesso' | 'erro'): void {
    this.mensagem = texto;
    this.tipoMensagem = tipo;
  }
}
