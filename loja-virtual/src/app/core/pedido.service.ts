import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, Optional } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { ItemCarrinho } from './models/item-carrinho';

export interface Pedido {
  id: number;
  total: number;
  criadoEm: string;
}

@Injectable({ providedIn: 'root' })
export class PedidoService {
  constructor(
    @Optional() private readonly http: HttpClient | null = null,
    private readonly auth: AuthService
  ) {}

  criar(itens: ItemCarrinho[]): Observable<{ id: number; total: number }> {
    if (!this.http) throw new Error('HttpClient não está disponível.');
    const token = this.auth.obterToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token ?? ''}`
    });

    return this.http.post<{ id: number; total: number }>('/api/pedidos', {
      itens: itens.map(item => ({ produtoId: item.produto.id, quantidade: item.quantidade }))
    }, { headers });
  }
}
