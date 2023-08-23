import express from "express";

import {router as post} from "./routers/post.ts";
import { router as user } from "./routers/user.ts";
import {CORS,checkLoginToken} from "./middlewares/index.ts";

const app = express();

//配置全局中间件
app.use(
    express.json(),
    express.urlencoded({ extended: true }),
    express.static("../public")
);
//!跨域中间件必须第一个配置,不然异步中间件可能会提前发送响应
app.use(CORS, checkLoginToken);

//配置路由器
app.use(user);
app.use(post);

app.listen(4000, () => {
    console.log("The server listen on port 4000! ");
});
