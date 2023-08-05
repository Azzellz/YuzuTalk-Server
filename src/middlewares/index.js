const tokenTool = require("../tools/token.js");
const fs = require("fs");
const path = require("path");
const tool = require("../tools");
module.exports = {
    //检查请求中是否携带Token,若携带则验证
    async checkLoginToken(req, res, next) {
        if (req.url == "/login" && req.headers.authorization) {
            const token = req.headers.authorization;
            if (token) req.hasToken = true;
            const user_id = req.body.user_id;
            //先验证是否存在此用户
            try {
                await tool.db.user.findById(user_id);
            } catch (err) {
                res.status(403).send({
                    msg: "用户不存在",
                    err,
                });
                return next();
            }
            //验证token是否正确
            try {
                const data = await tokenTool.checkToken(token);
                res.status(200).send({
                    msg: "Token验证成功",
                    data,
                });
            } catch (err) {
                res.status(403).send({
                    msg: "Token验证失败,请重新登录",
                    err,
                });
            }
        }
        next();
    },
    //改变经过multer处理的头像文件拓展名
    tranformAvatarExtend(req, res, next) {
        const extendName = req.file.originalname.split(".")[1];
        const destination = req.file.destination;
        const fileName = req.file.filename;
        const oldFileName = path.join(__dirname, "../", destination, fileName);
        const newFileName = path.join(
            __dirname,
            "../",
            destination,
            `${fileName}.${extendName}`
        );
        fs.rename(oldFileName, newFileName, (err) => {
            if (err) return console.log(err);
        });
        //添加额外的属性
        req.avatar = `${fileName}.${extendName}`;
        next();
    },
    //配置跨域响应头的中间件
    CORS(req, res, next) {
        //解决跨域问题的中间件,很重要
        res.header("Access-Control-Allow-Origin", "*");
        //一定要配置完Authorization后端才能拿到token
        res.header(
            "Access-Control-Allow-Headers",
            "Content-Type,Authorization"
        );
        res.header("Access-Control-Allow-Methods", "*");
        res.header("Content-Type", "application/json;charset=utf-8");
        res.header(("Access-Control-Allow-Credentials", "true"));
        next();
    },
};
