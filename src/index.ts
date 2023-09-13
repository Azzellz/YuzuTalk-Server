import express, { Response } from "express";
//引入自定义的接口拓展
import "./extends/express-request.ts";

import { router as post } from "./routers/post.ts";
import { router as user } from "./routers/user.ts";
import { router as test } from "./routers/test.ts";

import {
    CORS,
    checkLoginToken,
    errorHandler,
    logger,
} from "./middlewares/index.ts";

const app = express();

//配置静态资源跨域
const options = {
    setHeaders: (res: Response, path: any, stat: any) => {
        res.set("Access-Control-Allow-Origin", "*");
    },
};
//配置全局中间件
app.use(
    express.json(),
    express.urlencoded({ extended: true }),
    express.static("../public", options)
);
//!跨域中间件必须第一个配置,不然异步中间件可能会提前发送响应
app.use(CORS, checkLoginToken, errorHandler);

//配置路由器
app.use("/api", user, post,test);

app.listen(4000, () => {
    console.log("The server listen on port 4000! ");
});
