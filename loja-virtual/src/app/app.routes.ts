import { inject } from '@angular/core';
import { Routes, Router } from '@angular/router';
import { AuthService } from './core/auth.service';
import { Vitrine } from './pages/vitrine/vitrine';
import { ProdutoDetalhe } from './pages/produto-detalhe/produto-detalhe';
import { Cesta } from './pages/cesta/cesta';
import { Login } from './pages/login/login';
import { Cadastro } from './pages/cadastro/cadastro';
import { EsqueciSenha } from './pages/esqueci-senha/esqueci-senha';
import { Busca } from './pages/busca/busca';
import { Perfil } from './pages/perfil/perfil';

const exigeLogin = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.estaLogado()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};

const redirecionaParaVitrineSeLogado = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.estaLogado()) {
    return router.createUrlTree(['/vitrine']);
  }

  return true;
};

export const routes: Routes = [
  { path: '', component: Login, canActivate: [redirecionaParaVitrineSeLogado] },
  { path: 'vitrine', component: Vitrine, canActivate: [exigeLogin] },
  { path: 'perfil', component: Perfil, canActivate: [exigeLogin] },
  { path: 'produto/:id', component: ProdutoDetalhe, canActivate: [exigeLogin] },
  { path: 'cesta', component: Cesta, canActivate: [exigeLogin] },
  { path: 'login', component: Login, canActivate: [redirecionaParaVitrineSeLogado] },
  { path: 'cadastro', component: Cadastro },
  { path: 'esqueci-senha', component: EsqueciSenha },
  { path: 'busca', component: Busca, canActivate: [exigeLogin] }
];
