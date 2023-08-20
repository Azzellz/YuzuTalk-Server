const express = require("express");
const multer = require("multer"); //解析文件的中间件
const tool = require("../tools");
const middleWares = require("../middlewares");
const uploadAvatar = multer({ dest: "../public/user_avatar" });

const selectUser = require("../tools/db/models/user").SelectUser;
const selectPost = require("../tools/db/models/post").SelectPost;

//生成路由器
const router = express.Router();
//!注册逻辑
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
    const limit = +(req.query.limit || 10); //默认每页显示10条记录
    const skip = +(req.query.skip || 0); //分页跳过
    const keyword = req.query.keyword
        ? req.query.keyword.replace(
              /[\^\$\.\*\+\?\=\!\:\|\\\/\(\)\[\]\{\}\,]/g,
              "\\$&"
          )
        : ""; //搜索关键字,需要转义
    const filter = new RegExp(keyword, "i");
    //判断是否请求的是其他用户的数据,如果是则隐藏密码字段
    const shadowFields = req.query.isOther ? ["-password"] : ""; //需要隐藏的字段:密码

    try {
        //获取根据分页过滤的用户信息
        const user = await tool.db.user
            .findById(id, shadowFields)
            //!填充二级嵌套字段,从而获取发布和收藏的文章信息
            .populate([
                {
                    path: "published",
                    populate: [
                        {
                            path: "user",
                        },
                        {
                            path: "comments.user",
                            select: selectUser,
                        },
                        {
                            path: "comments.post",
                            select: selectPost,
                        },
                    ],
                },
                {
                    path: "favorites",
                    populate: [
                        {
                            path: "user",
                        },
                        {
                            path: "comments.user",
                            select: selectUser,
                        },
                        {
                            path: "comments.post",
                            select: selectPost,
                        },
                    ],
                },
            ]);
        //!这里需要调用clone方法,因为query只能被执行一次,否则会报错
        //先获取总数,再获取分页数据

        //切割过滤的逻辑
        //#region
        user.filterPosts(filter);
        const publishedTotal = user.published.length;
        const favoritesTotal = user.favorites.length;
        //获取分页切割的数据

        user.published.splice(0, skip);
        user.published.splice(limit);

        user.favorites.splice(0, skip);
        user.favorites.splice(limit);
        //#endregion

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
        const data = await tool.db.user.find().select(selectUser);
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
        //!要先检查是否有重复信息的用户,若有则抛出错误
        const result = await tool.db.user.findOne({
            user_name: user.user_name,
        });
        if (result) throw "用户名已存在";

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

//关注用户
router.put("/user/follow", async (req, res) => {
    const { user_id, follow_id } = req.body;
    try {
        const currentUser = await tool.db.user.findById(user_id);
        //先检查是否已经关注过了
        const isFollowed = currentUser.follows.some((item) => {
            return item._id.toString() === follow_id;
        });
        // console.log(isFollowed)
        if (isFollowed) {
            return res.status(403).send({
                msg: "已关注该用户",
                err: "",
            });
        }

        const followUser = await tool.db.user.findById(follow_id);
        //加关注,得粉丝
        currentUser.follows.push(followUser);
        followUser.fans.push(currentUser);
        await currentUser.save();
        await followUser.save();

        res.status(200).send({
            msg: "关注成功",
            data: currentUser.follows,
        });
    } catch (err) {
        res.status(403).send({
            msg: "关注失败",
            err,
        });
    }
});

//取消关注
router.put("/user/unFollow", async (req, res) => {
    const { user_id, follow_id } = req.body;
    try {
        const currentUser = await tool.db.user.findById(user_id);
        //先检查是否已经关注过了
        const isFollowed = currentUser.follows.some((item) => {
            return item._id.toString() === follow_id;
        });
        // console.log(isFollowed)
        if (!isFollowed) {
            return res.status(403).send({
                msg: "未关注该用户",
                err: "",
            });
        }

        const followUser = await tool.db.user.findById(follow_id);

        currentUser.follows = currentUser.follows.filter((item) => {
            return item._id.toString() !== follow_id;
        });
        followUser.fans = currentUser.fans.filter((item) => {
            return item._id.toString() !== user_id;
        });

        await currentUser.save();
        await followUser.save();

        res.status(200).send({
            msg: "取关成功",
            data: currentUser.follows,
        });
    } catch (err) {
        res.status(403).send({
            msg: "取关失败",
            err,
        });
    }
});

//是否关注用户
router.get("/user/isFollow", async (req, res) => {
    const { user_id, follow_id } = req.query;
    try {
        const currentUser = await tool.db.user.findById(user_id);
        const isFollowed = currentUser.follows.some((item) => {
            return item._id.toString() === follow_id;
        });
        res.status(200).send({
            msg: "查询成功",
            data: isFollowed,
        });
    } catch (err) {
        res.status(403).send({
            msg: "查询失败",
            err,
        });
    }
});

//导出路由
module.exports = router;
