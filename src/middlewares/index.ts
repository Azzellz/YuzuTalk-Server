import { checkToken } from "../tools/token.ts";
import fs from "fs";
import path from "path";
import { user } from "../tools/db/index.ts";
import { Request, Response, NextFunction } from "express";
import { color, colors } from "../tools/color.ts";
import { __dirname } from "../tools/path.ts";

//检查请求中是否携带Token,若携带则验证
export async function checkLoginToken(
    req: Request,
    res: Response,
    next: NextFunction
) {
    if (req.url == "/api/user/login" && req.headers.authorization) {
        const token = req.headers.authorization;
        //添加额外的属性
        // const tokenRequest = req as RequestWithToken;
        if (token) req.hasToken = true;
        const user_id = req.body.user_id;
        //先验证是否存在此用户
        try {
            await user.findById(user_id);
        } catch (err) {
            res.status(403).send({
                msg: "用户不存在",
                err,
            });
            return next();
        }
        //验证token是否正确
        try {
            const data = await checkToken(token);
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
}
//改变经过multer处理的头像文件拓展名
export function tranformAvatarExtend(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const extendName = req.file?.originalname.split(".")[1];
    const destination = req.file?.destination;
    const fileName = req.file?.filename;
    const oldFileName = path.join(__dirname, "../", destination!, fileName!);
    const newFileName = path.join(
        __dirname,
        "../",
        destination!,
        `${fileName}.${extendName}`
    );
    fs.rename(oldFileName, newFileName, (err) => {
        if (err) return console.log(err);
    });
    req.avatar = `${fileName}.${extendName}`;
    next();
}
//配置跨域响应头的中间件
export function CORS(req: Request, res: Response, next: NextFunction) {
    //解决跨域问题的中间件,很重要
    res.header("Access-Control-Allow-Origin", "*");
    //一定要配置完Authorization后端才能拿到token
    res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.header("Access-Control-Allow-Methods", "*");
    res.header("Content-Type", "application/json;charset=utf-8");
    res.header("Access-Control-Allow-Credentials", "true");
    next();
}
//日志中间件
export function logger(req: Request, res: Response, next: NextFunction) {
    const map: Record<string, colors> = {
        GET: "绿色",
        POST: "蓝色",
        PUT: "黄色",
        DELETE: "红色",
    };
    //获取当前毫秒时间戳
    const start = Date.now();
    res.on("finish", () => {
        const end = Date.now();
        const time = end - start;
        const log = color(
            map[req.method],
            `[${req.method}] ${res.statusCode} ${req.url} ${time}ms`
        );
        console.log(log);
    });
    next();
}
//全局错误处理中间件
export function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) {
    console.log("server got error:", err);
    next();
}
