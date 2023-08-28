import { Request } from "express";
//处理过后的req类型
//携带Token
interface RequestWithToken {
    hasToken?: boolean;
}
//携带Avatar
interface RequestWithAvatar {
    avatar?: string;
}

//express接口拓展
declare module "express" {
    //拓展Request接口
    interface Request extends RequestWithToken, RequestWithAvatar {
        [key: string]: any;
    }
}
