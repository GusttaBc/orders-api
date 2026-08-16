import { Controller, Post, Get, Body, Patch, Delete, Param } from '@nestjs/common';
import { AppService } from './app.service';
import { CreateOrderDto } from './create-order.dto';
import { ConfirmFacialDto } from './confirm-facial.dto'; // 👈 Nome da classe corrigido para PascalCase

@Controller('orders')
export class AppController {
  constructor(private readonly appService: AppService) {}

  // 1. RECONHECIMENTO FACIAL (PATCH /orders/confirm-facial)
  @Patch('confirm-facial') 
  async confirmOrderWithFacial(@Body() body: ConfirmFacialDto) {
    return this.appService.confimOrderWithFacial(body.token, body.imageBase64);
  }

  // 2. CRIAR PEDIDO (POST /orders)
  @Post()
  async createOrder(@Body() data: CreateOrderDto) {
    return this.appService.createOrder(data);
  }

  // 3. LISTAR TODOS OS PEDIDOS (GET /orders)
  @Get()
  findAll() {
    return this.appService.findAllOrders();
  }

  // 4. OBTER MÉTRICAS (GET /orders/metrics)
  @Get('metrics')
  getMetrics() {
    return this.appService.getMetrics();
  }

  // 5. CONFIRMAR PEDIDO VIA TOKEN (PATCH /orders/confirm)
  @Patch('confirm')
  async confirmOrder(@Body('token') token: string) {
    return this.appService.confirmOrder(token);
  }

  // 6. BUSCAR PEDIDO POR ID (GET /orders/:id)
  @Get(':id')
  findOrderById(@Param('id') id: string) {
    return this.appService.findOrderById(id);
  }

  // 7. CANCELAR PEDIDO (PATCH /orders/:id/cancel)
  @Patch(':id/cancel')
  cancelOrder(@Param('id') id: string) {
    return this.appService.cancelOrder(id);
  }

  // 8. ATUALIZAR STATUS (PATCH /orders/:id/status)
  @Patch(':id/status')
  updateOrderStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.appService.updateOrderStatus(id, status);
  }

  // 9. DELETAR PEDIDO (DELETE /orders/:id)
  @Delete(':id')
  deleteOrder(@Param('id') id: string) {
    return this.appService.deleteOrder(id);
  }
}