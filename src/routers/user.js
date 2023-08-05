const express = require("express");
const multer = require("multer"); //解析文件的中间件
const tool = require("../tools");
const middleWares = require("../middlewares");
const uploadAvatar = multer({ dest: "../public/user_avatar" });
//生成路由器
const router = express.Router();
//注册逻辑
router.post(
    "/register",
    uploadAvatar.single("avatar"),
    middleWares.tranformAvatarExtend,
    async (req, res) => {
        //组装注册信息
        const registerInfo = {
            ...req.body,
            avatar: req.avatar, //这个字段是通过中间件拿到的
        };

        try {
            //查询数据库中是否有重复用户:由于mongoose的查询方法返回的是一个promise对象且只支持单独查询
            //所以可以使用Promise.all来遍历Promise数组来同时查询用户名和账号是否重复
            const results = await Promise.all([
                tool.db.user.findOne({
                    user_name: registerInfo.user_name,
                }),
                tool.db.user.findOne({
                    account: registerInfo.account,
                }),
            ]);
            //存在非空结果,说明有重复用户,抛出错误
            console.log(results.find((u) => u !== null));
            if (results.find((u) => u !== null)) throw "用户名或账号已存在";
            //组装user对象
            var user = {
                ...registerInfo,
                //添加额外信息
                register_time: tool.time.getCurrentTime(),
                time_stamp: Date.now(),
            };
            //添加至数据库
            const data = await tool.db.user.create(user);
            //发送响应给客户端
            res.status(200).send({
                msg: "注册成功",
                data: {
                    ...data._doc, //注意要加上_doc
                    //用username生成token
                    token: await tool.token.setToken({
                        user_name: data.user_name,
                        user_id: data._id,
                    }),
                },
            });
        } catch (err) {
            res.status(403).send({
                msg: "注册失败",
                err,
            });
        }
    }
);

//登录校验
router.post("/login", async (req, res) => {
    //判断是否已经通过token中间件的校验
    if (req.hasToken) return;
    //获取登录信息
    const loginInfo = req.body;

    try {
        //校验账号密码是否正确,若正确则登录成功并且返回token和用户信息,不存在则返回错误信息提示账号或者密码错误
        const data = await tool.db.user.findOne({
            account: loginInfo.account,
            password: loginInfo.password,
        });
        if (!data) throw "账号或密码错误";
        //用username和userid生成token
        const token = await tool.token.setToken({
            user_name: data.user_name,
            user_id: data._id,
        });
        //向客户端返回token和用户信息,同时客户端应该保存至本地存储
        res.status(200).send({
            msg: "登录成功",
            data: {
                user_id: data._id,
                user_name: data.user_name,
                user_account: data.account,
                avatar: data.avatar,
                token,
            },
        });
    } catch (err) {
        res.status(403).send({
            msg: "登录失败",
            err,
        });
    }
});

//获取用户信息
router.get("/user", async (req, res) => {
    const id = req.query.id;
    const pageSize = +(req.query.limit || 10); //默认每页显示10条记录
    const skip = +req.query.skip; //分页跳过
    const keyword = req.query.keyword.replace(
        /[\^\$\.\*\+\?\=\!\:\|\\\/\(\)\[\]\{\}\,]/g,
        "\\$&"
    ); //搜索关键字,需要转义

    const filter = new RegExp(keyword, "i");

    try {
        //获取根据分页过滤的用户信息
        const user = await tool.db.user
            .findById(id)
            .populate("published favorites") //!填充字段,从而获取发布和收藏的文章信息
            .slice("published", [skip, pageSize])
            .slice("favorites", [skip, pageSize]);
        //!实现对两个数组字段的正则匹配
        tool.db.filterUserPosts(filter, user);
        //获取原始用户信息
        const originUser = await tool.db.user
            .findById(id)
            .populate("published favorites");
        //获取发布总数和收藏总数
        let publishedTotal = 0,
            favoritesTotal = 0;
        tool.db.filterUserPosts(filter, originUser);
        if (originUser) {
            publishedTotal = originUser.published.length;
            favoritesTotal = originUser.favorites.length;
        }

        res.status(200).send({
            msg: "获取用户信息成功",
            data: {
                user,
                publishedTotal,
                favoritesTotal,
            },
        });
    } catch (err) {
        console.log(err);
        res.status(403).send({
            msg: "获取用户信息失败",
            err,
        });
    }
});

//获取最近的用户信息
router.get("/user/recent", async (req, res) => {
    //应该只保留少部分信息发给前端
    try {
        //获取最近注册的用户信息,只包含部分字段对象的数组
        const data = await tool.db.user.find().select("user_name avatar _id");
        res.status(200).send({
            msg: "获取最近用户信息成功",
            data,
        });
    } catch (err) {
        res.status(403).send({
            msg: "获取最近用户信息失败",
            err,
        });
    }
});

//注销用户
router.delete("/user", async (req, res) => {
    try {
        const deleted_user_id = req.query.id;
        const user = await tool.db.user.findByIdAndDelete(deleted_user_id);
        res.status(200).send({
            msg: "注销成功",
            data: user,
        });
    } catch (err) {
        res.status(403).send({
            msg: "注销用户失败",
            err,
        });
    }
});

//更新用户信息
router.put("/user", async (req, res) => {
    try {
        const user = req.body;
        const data = await tool.db.user.updateOne({ _id: user._id }, user, {
            new: true,
        });
        res.status(200).send({
            msg: "更新用户信息成功",
            data,
        });
    } catch (err) {
        res.status(403).send({
            msg: "更新用户信息失败",
            err,
        });
    }
});

//导出路由
module.exports = router;
