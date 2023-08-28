import express from "express";
import multer from "multer"; //解析文件的中间件
import db from "../tools/db/index.ts";
import { tranformAvatarExtend } from "../middlewares/index.ts";
import { getCurrentTime } from "../tools/time.ts";
const uploadAvatar = multer({ dest: "../public/user_avatar" });
import { SelectPost } from "../tools/db/models/post/schema/post.ts";
import { SelectUser } from "../tools/db/models/user/schema/user.ts";
import { setToken } from "../tools/token.ts";
import { I_User } from "../tools/db/models/user/interface/user.ts";
import { Request, Response } from "express";

//生成路由器
export const router = express.Router();
//!注册逻辑
router.post(
    "/register",
    uploadAvatar.single("avatar"),
    tranformAvatarExtend,
    async (req: Request, res: Response) => {
        //组装注册信息
        //处理过后的请求对象
        // const afterRequest = req as RequestWithAvatar;
        const registerInfo = {
            ...req.body,
            avatar: req.avatar, //这个字段是通过中间件拿到的
        };

        try {
            //查询数据库中是否有重复用户:由于mongoose的查询方法返回的是一个promise对象且只支持单独查询
            //所以可以使用Promise.all来遍历Promise数组来同时查询用户名和账号是否重复
            const results = await Promise.all([
                db.user.findOne({
                    user_name: registerInfo.user_name,
                }),
                db.user.findOne({
                    account: registerInfo.account,
                }),
            ]);
            //存在非空结果,说明有重复用户,抛出错误
            // console.log(results.find((u) => u !== null));
            if (results.find((u) => u !== null)) throw "用户名或账号已存在";
            //组装user对象
            const user = {
                ...registerInfo,
                //添加额外信息
                register_time: getCurrentTime(),
                time_stamp: Date.now(),
            };
            //添加至数据库
            const data = await db.user.create(user);
            //发送响应给客户端
            res.status(200).send({
                msg: "注册成功",
                data: {
                    ...(data as any)._doc, //注意要加上_doc
                    //用username生成token
                    token: await setToken({
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
router.post("/login", async (req: Request, res: Response) => {
    //判断是否已经通过token中间件的校验
    if (req.hasToken) return;
    //获取登录信息
    const loginInfo = req.body;

    try {
        //校验账号密码是否正确,若正确则登录成功并且返回token和用户信息,不存在则返回错误信息提示账号或者密码错误
        const data = await db.user.findOne({
            account: loginInfo.account,
            password: loginInfo.password,
        });
        if (!data) throw "账号或密码错误";
        //用username和userid生成token
        const token = await setToken({
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
    // const limit = +(req.query.limit || 10); //默认每页显示10条记录
    // const skip = +(req.query.skip || 0); //分页跳过
    // const keyword = req.query.keyword
    //     ? String(req.query.keyword).replace(
    //           /[\^\$\.\*\+\?\=\!\:\|\\\/\(\)\[\]\{\}\,]/g,
    //           "\\$&"
    //       )
    //     : ""; //搜索关键字,需要转义
    // const filter = new RegExp(keyword, "i");
    //判断是否请求的是其他用户的数据,如果是则隐藏密码字段
    const shadowFields = req.query.isOther ? ["-password"] : ""; //需要隐藏的字段:密码

    try {
        //获取根据分页过滤的用户信息
        const user = await db.user.findById(id, shadowFields);
        //!填充二级嵌套字段,从而获取发布和收藏的文章信息
        // .populate([
        //     {
        //         path: "published",
        //         populate: [
        //             {
        //                 path: "user",
        //             },
        //             {
        //                 path: "comments.user",
        //                 select: SelectUser,
        //             },
        //             {
        //                 path: "comments.post",
        //                 select: SelectPost,
        //             },
        //         ],
        //     },
        //     {
        //         path: "favorites",
        //         populate: [
        //             {
        //                 path: "user",
        //             },
        //             {
        //                 path: "comments.user",
        //                 select: SelectUser,
        //             },
        //             {
        //                 path: "comments.post",
        //                 select: SelectPost,
        //             },
        //         ],
        //     },
        // ]);
        //!这里需要调用clone方法,因为query只能被执行一次,否则会报错
        //先获取总数,再获取分页数据
        if (!user) throw "用户不存在";

        // //切割过滤的逻辑
        // //#region
        // (user as any).filterPosts(filter);
        // const publishedTotal = user.published.length;
        // const favoritesTotal = user.favorites.length;
        // //获取分页切割的数据

        // user.published.splice(0, skip);
        // user.published.splice(limit);

        // user.favorites.splice(0, skip);
        // user.favorites.splice(limit);
        //#endregion

        res.status(200).send({
            msg: "获取用户信息成功",
            data: {
                user,
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
        const data = await db.user.find().select(SelectUser);
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
        const user = await db.user.findByIdAndDelete(deleted_user_id);
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
        const newUser = req.body;
        console.log(newUser);
        //!要先检查是否有重复信息的用户,若有则抛出错误
        const result = await db.user.findOne({
            user_name: newUser.user_name,
        });
        if (result) throw "用户名已存在";

        const user = await db.user.findById(newUser._id);
        if (!user) throw "用户不存在";
        //只更新指定数据
        user.user_name = newUser.user_name;
        user.account = newUser.account;
        await user.save();

        res.status(200).send({
            msg: "更新用户信息成功",
            data: user,
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
        const currentUser = await db.user.findById(user_id);
        if (!currentUser) throw "当前用户不存在";
        //先检查是否已经关注过了
        const isFollowed = currentUser.follows.some((item: any) => {
            return item._id.toString() === follow_id;
        });
        if (isFollowed) {
            return res.status(403).send({
                msg: "已关注该用户",
                err: "",
            });
        }

        const followUser = await db.user.findById(follow_id);
        if (!followUser) throw "follow用户不存在";
        //加关注,得粉丝
        currentUser.follows.push(followUser as any);
        followUser.fans.push(currentUser as any);
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
        const currentUser = await db.user.findById(user_id);
        if (!currentUser) throw "当前用户不存在";
        //先检查是否已经关注过了
        const isFollowed = (currentUser.follows as any).some((item: I_User) => {
            return item._id.toString() === follow_id;
        });
        if (!isFollowed) {
            return res.status(403).send({
                msg: "未关注该用户",
                err: "",
            });
        }

        const followUser = await db.user.findById(follow_id);
        if (!followUser) throw "follow用户不存在";

        currentUser.follows = (currentUser.follows as any).filter(
            (item: I_User) => {
                return item._id.toString() !== follow_id;
            }
        );
        followUser.fans = (currentUser.fans as any).filter((item: I_User) => {
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
        const currentUser = await db.user.findById(user_id);
        if (!currentUser) throw "当前用户不存在";
        const isFollowed = (currentUser.follows as any).some((item: I_User) => {
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
