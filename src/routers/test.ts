import express from "express";
import multer from "multer"; //解析文件的中间件
import { Request, Response } from "express";
import { tranformImgExtend } from "../middlewares/index.ts";
//生成路由器
export const router = express.Router();

router.get("/test", (req, res) => {
    res.status(200).send({
        msg: "test:get",
        data: "test:get",
    });
});

const uploadImg = multer({
    //这里会自动创建文件夹
    dest: "../public/post/images",
});
router.post("/test", uploadImg.single("img"), tranformImgExtend, (req:Request, res:Response) => {
    const filename = req.img;
    res.status(200).send({
        msg: "上传成功",
        data: {
            filename,
        },
    });
});
