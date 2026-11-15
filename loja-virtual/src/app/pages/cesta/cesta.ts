import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Observable, map } from 'rxjs';
import { CarrinhoService } from '../../core/carrinho';
import { ItemCarrinho } from '../../core/models/item-carrinho';
import { PedidoService } from '../../core/pedido.service';

@Component({
  imports: [CommonModule, RouterLink],
  selector: 'app-cesta',
  templateUrl: './cesta.html',
  styleUrl: './cesta.scss'
})
export class Cesta {
  itens$: Observable<ItemCarrinho[]>;
  total$: Observable<number>;
  mensagem = '';
  tipoMensagem: 'sucesso' | 'erro' = 'erro';

  constructor(private carrinhoService: CarrinhoService, private router: Router, private pedidoService: PedidoService) {
    this.itens$ = this.carrinhoService.itens$;
    this.total$ = this.itens$.pipe(
      map(itens => itens.reduce((total, item) => total + item.produto.preco * item.quantidade, 0))
    );
  }

  remover(produtoId: number): void {
    this.carrinhoService.remover(produtoId);
  }

  limparCesta(): void {
    this.carrinhoService.limpar();
  }

  finalizar(): void {
    this.itens$.pipe(map(itens => itens)).subscribe(itens => {
      if (itens.length === 0) return;
      this.pedidoService.criar(itens).subscribe({
        next: resposta => {
          this.mensagem = `Pedido #${resposta.id} criado com sucesso!`;
          this.tipoMensagem = 'sucesso';
          this.carrinhoService.limpar();
          setTimeout(() => this.router.navigate(['/vitrine']), 1000);
        },
        error: erro => {
          this.mensagem = erro.error?.mensagem ?? 'Não foi possível finalizar o pedido.';
          this.tipoMensagem = 'erro';
        }
      });
    });
  }
}
