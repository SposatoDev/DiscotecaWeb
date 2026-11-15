import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, AsyncValidatorFn } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, debounceTime, map, of, switchMap } from 'rxjs';
import { cpfValidator } from '../../core/validators/cpf.validator';
import { senhasIguaisValidator } from '../../core/validators/senhas-iguais.validator';
import { AuthService } from '../../core/auth.service';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-cadastro',
  templateUrl: './cadastro.html',
  styleUrl: './cadastro.scss'
})
export class Cadastro {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  mensagem = '';
  tipoMensagem: 'sucesso' | 'erro' = 'erro';

  private disponibilidade(campo: 'nome' | 'email' | 'senha' | 'cpf' | 'telefone'): AsyncValidatorFn {
    return control => {
      const valor = String(control.value ?? '').trim();
      if (!valor) return of(null);
      return of(valor).pipe(
        debounceTime(350),
        switchMap(atual => this.authService.verificarDisponibilidade(campo, atual)),
        map(resposta => resposta.disponivel ? null : { dadoDuplicado: resposta.mensagem }),
        catchError(() => of(null))
      );
    };
  }

  form = this.fb.group({
    nome: ['', [Validators.required, Validators.minLength(3)], [this.disponibilidade('nome')]],
    email: ['', [Validators.required, Validators.email], [this.disponibilidade('email')]],
    senha: ['', [Validators.required, Validators.minLength(6)], [this.disponibilidade('senha')]],
    confirmaSenha: ['', [Validators.required]],
    cpf: ['', [Validators.required, cpfValidator()], [this.disponibilidade('cpf')]],
    telefone: ['', [Validators.required, Validators.pattern(/^\d{10,11}$/)], [this.disponibilidade('telefone')]]
  }, {
    validators: senhasIguaisValidator('senha', 'confirmaSenha')
  });

  cadastrar(): void {
    if (this.form.valid) {
      const usuario = {
        nome: this.form.controls.nome.value ?? '',
        email: this.form.controls.email.value ?? '',
        senha: this.form.controls.senha.value ?? '',
        cpf: this.form.controls.cpf.value ?? '',
        telefone: this.form.controls.telefone.value ?? ''
      };
      this.authService.cadastrar(usuario).subscribe({
        next: resposta => {
          this.mostrarMensagem(resposta.mensagem, 'sucesso');
          setTimeout(() => this.router.navigate(['/login']), 1000);
        },
        error: erro => this.mostrarMensagem(erro.error?.mensagem ?? 'Não foi possível realizar o cadastro.', 'erro')
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