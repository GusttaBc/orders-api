import { IsNotEmpty, IsNumber, IsPositive, IsString } from "class-validator";

export class CreateOrderDto {
@IsString({message:'O CustomerId deve ser Um Texto'})
@IsNotEmpty({message:'O customerId e Obrigatorio'})
customerId: string;

@IsString({message:'O productId deve ser um texto'})
@IsNotEmpty({message:'O productId e Obrigatorio'})
productId: string;

@IsNumber({},{message:'A quantidade deve ser Um numero'})
@IsPositive({message:'A quantidade deve ser um numero  maior que zero '})
@IsNotEmpty({message: 'A quantidade e Obrigatoria'})
quantity: number;
}
