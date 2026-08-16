//Reconhecimento facial

import { IsNotEmpty, isNotEmpty, IsString } from "class-validator";

export class ConfirmFacialDto {
    @IsNotEmpty ()
    @IsString  ()
    token: string;

    @IsNotEmpty()
    @IsString()
    imageBase64:string; //Foto capturada pela camera (webcan)
}

