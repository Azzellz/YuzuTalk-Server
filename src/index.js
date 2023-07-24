const express = require("express");

const routers = require("./routers");
const middleWares = require("./middlewares");

const app = express();

//配置全局中间件
app.use(
    express.json(),
    express.urlencoded({ extended: true }),
    express.static("../public")
);
app.use(middleWares.checkLoginToken, middleWares.CORS);

//配置路由器
app.use(routers.user);
app.use(routers.post);

app.listen(4000, () => {
    console.log("The server listen on port 4000 good 我偷偷改了");
});
