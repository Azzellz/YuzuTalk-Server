import express from "express";
import db from "../tools/db/index.ts";
import { getCurrentTime } from "../tools/time.ts";
import {
    I_Post,
    I_PostComment,
} from "../tools/db/models/post/interface/post.ts";

import { SelectPost } from "../tools/db/models/post/schema/post.ts";
import { SelectUser } from "../tools/db/models/user/schema/user.ts";

//TODO:写接口的时候一定要解耦

//生成路由器
export const router = express.Router();

//添加文章
router.post("/post", async (req, res) => {
    //获取发布的user_id
    const user_id = req.body.user_id;
    try {
        //根据user_id查询用户
        const user = await db.user.findById(user_id);
        // const userObj = user.toObject(); //转换为普通js对象
        //组装post对象
        const post = {
            user, //填充user
            //前端传来的数据在req.body中
            ...req.body.post, //这里的post是前端传来的post对象
            //添加额外信息:文章创建时间,文章索引,时间戳
            index: await db.countCollection("posts"),
            format_time: getCurrentTime(),
            time_stamp: Date.now(),
        };
        if (!user) throw "没有找到对应用户";
        //将post添加到数据库
        const data = await db.post.create(post);
        //将post添加到用户的published数组中
        user.published.push(data as any);
        //保存用户
        await user.save();

        // console.log(`成功添加文章：${data}`);
        res.status(200).send({
            msg: "发布成功",
            data,
        });
    } catch (err) {
        // console.log(`添加文章失败：${err}`);
        res.status(403).send({
            msg: "发布失败",
            err,
        });
    }
});

//更新文章
router.put("/post", async (req, res) => {
    const newPost = req.body;
    try {
        //*更新post
        const data = await db.post.findByIdAndUpdate(newPost._id, newPost, {
            new: true,
        });

        res.status(200).send({
            msg: "更新成功",
            data,
        });
    } catch (err) {
        res.status(403).send({
            msg: "更新失败",
            err,
        });
    }
});

//删除文章
router.delete("/post", async (req, res) => {
    const post_id = req.query.post_id;
    try {
        const data = await db.post.findByIdAndDelete(post_id);
        res.status(200).send({
            msg: "删除成功",
            data,
        });
    } catch (err) {
        res.status(403).send({
            msg: "删除失败",
            err,
        });
    }
});

//根据id获取指定文章
router.get("/post", async (req, res) => {
    //要求内容：post_id(id)
    const id = req.query.id;
    try {
        const post = await db.post.findById(id).populate([
            {
                path: "user",
                select: SelectUser,
            },
            {
                path: "comments.user",
                select: SelectUser,
            },
            {
                path: "comments.post",
                select: SelectPost,
            },
        ]);
        res.status(200).send({
            msg: "获取成功",
            data: post,
        });
    } catch (err) {
        res.status(403).send({
            msg: "获取失败",
            err,
        });
    }
});

//获取文章列表(已添加分页功能)
router.get("/posts", async (req, res) => {
    //实现分页功能
    //这里的skip和limit要转成数字类型,不然会报错
    const limit = Number(req.query.limit) || 10; //默认每页显示10条记录
    const skip = Number(req.query.skip) || 0; //分页跳过
    const keyword = req.query.keyword
        ? String(req.query.keyword).replace(
              /[\^\$\.\*\+\?\=\!\:\|\\\/\(\)\[\]\{\}\,]/g,
              "\\$&"
          )
        : ""; //搜索关键字,要转义正则特殊字符
    const order = String(req.query.order);
    //根据order决定顺序
    let sortType: any;
    if (order === "new") {
        sortType = -1;
    } else {
        sortType = 1;
    }
    const filter = {
        //按照四个搜索字段进行正则匹配,这里要使用$or操作符来实现或条件查询,不用$and
        $or: [
            { title: { $regex: keyword, $options: "i" } },
            { content: { $regex: keyword, $options: "i" } },
            // { user_name: { $regex: keyword, $options: "i" } },
            { tags: { $regex: keyword, $options: "i" } },
        ],
    };
    try {
        //find()不传参默认找全部文档
        const posts = await db.post
            .find(filter)
            .populate([
                {
                    path: "user",
                    select: SelectUser,
                },
                {
                    path: "comments.user",
                    select: SelectUser,
                },
                {
                    path: "comments.post",
                    select: SelectPost,
                },
            ])
            .limit(limit)
            .skip(skip)
            .sort({ time_stamp: sortType }); //按时间戳降序排序;
        res.status(200).send({
            msg: "获取成功",
            data: {
                posts,
                total: await db.countCollection("posts", filter), //记录总数
            },
        });
    } catch (err) {
        //find()失败会抛错然后发给catch,再响应给客户端
        res.status(403).send({
            msg: "获取失败",
            err,
        });
    }
});

//获取最新的文章列表
router.get("/posts/latest", async (req, res) => {
    //获取限制
    const limit = Number(req.query.limit) || 10; //默认10条记录
    try {
        //获取最新的10篇文章,按照每篇文章的时间戳来排序
        const lastestPosts = await db.post
            .find()
            .populate([
                {
                    path: "user",
                    select: SelectUser,
                },
                {
                    path: "comments.user",
                    select: SelectUser,
                },
                {
                    path: "comments.post",
                    select: SelectPost,
                },
            ])
            .sort({ time_stamp: -1 })
            .limit(limit);

        res.status(200).send({
            msg: "获取成功",
            data: { posts: lastestPosts, total: lastestPosts.length },
        });
    } catch (err) {
        res.status(403).send({
            msg: "获取失败",
            err,
        });
    }
});

//获取用户收藏的文章列表
router.get("/posts/favorites", async (req, res) => {
    //要求内容：user_id
    const user_id = req.query.user_id;
    const limit = +(req.query.limit || 10); //默认每页显示10条记录
    const skip = +(req.query.skip || 0); //分页跳过
    const keyword = req.query.keyword
        ? String(req.query.keyword).replace(
              /[\^\$\.\*\+\?\=\!\:\|\\\/\(\)\[\]\{\}\,]/g,
              "\\$&"
          )
        : ""; //搜索关键字,需要转义
    const filter = new RegExp(keyword, "i");

    const order = String(req.query.order) as "new" | "old";

    try {
        //!注意填充字段不能排序
        const user = await db.user.findById(user_id).populate({
            path: "favorites",
            populate: [
                {
                    path: "user",
                },
                {
                    path: "comments.user",
                    select: SelectUser,
                },
                {
                    path: "comments.post",
                    select: SelectPost,
                },
            ],
        });
        if (!user) throw "没有找到对应用户";
        //获取总数
        const total = user.favorites.length;
        //关键字过滤收藏的文章
        if (keyword) (user as any).filterFavorites(filter);
        //分页切割
        user.favorites.splice(0, skip);
        user.favorites.splice(limit);
        //排序
        const sortForNew = (p1: I_Post, p2: I_Post) => {
            return p2.time_stamp - p1.time_stamp;
        };
        const sortForOld = (p1: I_Post, p2: I_Post) => {
            return p1.time_stamp - p2.time_stamp;
        };
        if (order === "new") user.favorites.sort(sortForNew as any);
        else user.favorites.sort(sortForOld as any);

        const favorites = user.favorites;
        res.status(200).send({
            msg: "获取成功",
            data: { posts: favorites, total },
        });
    } catch (err) {
        console.log(err);
        res.status(403).send({
            msg: "获取失败",
            err,
        });
    }
});

//获取用户发布的文章列表
router.get("/posts/published", async (req, res) => {
    //要求内容：user_id
    const user_id = req.query.user_id;
    const limit = +(req.query.limit || 10); //默认每页显示10条记录
    const skip = +(req.query.skip || 0); //分页跳过
    const keyword = req.query.keyword
        ? String(req.query.keyword).replace(
              /[\^\$\.\*\+\?\=\!\:\|\\\/\(\)\[\]\{\}\,]/g,
              "\\$&"
          )
        : ""; //搜索关键字,需要转义
    const filter = new RegExp(keyword, "i");

    const order = String(req.query.order);

    try {
        //!注意填充字段不能排序
        const user = await db.user.findById(user_id).populate({
            path: "published",
            populate: [
                {
                    path: "user",
                },
                {
                    path: "comments.user",
                    select: SelectUser,
                },
                {
                    path: "comments.post",
                    select: SelectPost,
                },
            ],
        });
        if (!user) throw "没有找到对应用户";
        //获取总数
        const total = user.published.length;

        //关键字过滤收藏的文章
        if (keyword) (user as any).filterPublished(filter);
        //分页切割
        user.published.splice(0, skip);
        user.published.splice(limit);
        //排序
        const sortForNew = (p1: I_Post, p2: I_Post) => {
            return p2.time_stamp - p1.time_stamp;
        };
        const sortForOld = (p1: I_Post, p2: I_Post) => {
            return p1.time_stamp - p2.time_stamp;
        };
        if (order === "new") user.published.sort(sortForNew as any);
        else user.published.sort(sortForOld as any);
        
        const published = user.published;
        res.status(200).send({
            msg: "获取成功",
            data: { posts: published, total },
        });
    } catch (err) {
        console.log(err);
        res.status(403).send({
            msg: "获取失败",
            err,
        });
    }
});

//发布评论
router.post("/comment", async (req, res) => {
    //组装comment对象
    const comment = {
        //要求内容：post(id),user(id),content,oppose,support
        ...req.body,
        //添加额外信息:评论时间,时间戳
        format_time: getCurrentTime(),
        time_stamp: Date.now(),
    };
    //先找到post_id对应的文章
    try {
        let targetPost = await db.post.findById(comment.post); //根据post_id找到对应的文章
        if (!targetPost) throw "没有找到对应文章";
        targetPost.comments.push(comment); //将评论添加到文章的comments数组中
        await targetPost.save(); //保存文章
        //填充评论的user和post字段
        await targetPost.populate([
            {
                path: "comments.user",
                select: SelectUser,
            },
            {
                path: "comments.post",
                select: SelectPost,
            },
        ]);
        //获取到添加的那条评论
        const targetComment =
            targetPost.comments[targetPost.comments.length - 1];
        //发给前端
        res.status(200).send({
            msg: "评论成功",
            data: targetComment,
        });
    } catch (err) {
        console.log(err);
        res.status(403).send({
            msg: "评论失败",
            err,
        });
    }
});

//给评论点赞的接口
router.put("/post/comment/support", async (req, res) => {
    const { comment_id, post_id } = req.body;
    try {
        const targetPost = await db.post.findById(post_id);
        //遍历查找对应的评论
        let isFindComment = false;
        if (!targetPost) throw "没有找到对应文章";

        targetPost.comments.forEach((comment: I_PostComment) => {
            //!注意ObjectId类型不能直接比较,要转换成字符串
            if (comment._id.toString() === comment_id) {
                //找到对应的评论,给评论点赞
                comment.support++;
                isFindComment = true;
            }
        });

        if (!isFindComment) throw "没有找到对应评论";
        //保存文章
        await targetPost.save();
        res.status(200).send({
            msg: "点赞成功",
            data: "",
        });
    } catch (err) {
        console.log(err);
        res.status(403).send({
            msg: "点赞失败",
            err,
        });
    }
});

//给评论点踩的接口
router.put("/post/comment/oppose", async (req, res) => {
    const { comment_id, post_id } = req.body;
    try {
        const targetPost = await db.post.findById(post_id);
        //遍历查找对应的评论
        let isFindComment = false;

        targetPost?.comments.forEach((comment: I_PostComment) => {
            //!注意ObjectId类型不能直接比较,要转换成字符串
            if (comment._id.toString() === comment_id) {
                //找到对应的评论,给评论点赞
                comment.oppose++;
                isFindComment = true;
            }
        });

        if (!isFindComment) throw "没有找到对应评论";
        if (!targetPost) throw "没有找到对应文章";
        //保存文章
        await targetPost.save();
        res.status(200).send({
            msg: "点踩成功",
            data: "",
        });
    } catch (err) {
        console.log(err);
        res.status(403).send({
            msg: "点踩失败",
            err,
        });
    }
});

//给帖子点赞的接口
router.post("/support/post", async (req, res) => {
    //要求内容：post_id
    const post_id = req.body.post_id;
    try {
        let target = await db.post.findById(post_id);
        if (!target) throw "没有找到对应文章";
        target.support++;
        await target.save();
        res.status(200).send({
            msg: "点赞成功",
            data: target,
        });
    } catch (err) {
        res.status(403).send({
            msg: "点赞失败",
            err,
        });
    }
});

//给帖子点踩的接口
router.post("/oppose/post", async (req, res) => {
    //要求内容：post_id
    const post_id = req.body.post_id;
    try {
        let target = await db.post.findById(post_id);
        if (!target) throw "没有找到对应文章";
        target.oppose++;
        await target.save();
        res.status(200).send({
            msg: "点踩成功",
            data: target,
        });
    } catch (err) {
        res.status(403).send({
            msg: "点踩失败",
            err,
        });
    }
});

//收藏文章的接口
router.post("/favorite/post", async (req, res) => {
    //要求内容：post_id,user_id
    const { post_id, user_id } = req.body;
    try {
        let targetPost = await db.post.findById(post_id);
        let targetUser = await db.user.findById(user_id);
        if (!targetUser || !targetPost) throw "没有找到对应用户或者文章";
        (targetUser.favorites as any).push(targetPost);
        targetPost.follow++;
        await targetUser.save();
        await targetPost.save();
        res.status(200).send({
            msg: "收藏成功",
            data: targetPost,
        });
    } catch (err) {
        res.status(403).send({
            msg: "收藏失败",
            err,
        });
    }
});

//取消收藏文章的接口
router.post("/unfavorite/post", async (req, res) => {
    //要求内容：post_id,user_id
    const { post_id, user_id } = req.body;
    try {
        let targetPost = await db.post.findById(post_id);
        let targetUser = await db.user.findById(user_id);
        if (!targetUser || !targetPost) throw "没有找到对应用户或者文章";
        //这里有个小坑,文档对象的_id是一个对象,而post_id是一个字符串,所以要转换一下
        targetUser.favorites = (targetUser.favorites as any).filter(
            (post: I_Post) => post._id.toString() !== post_id
        );
        targetPost.follow--;

        await targetUser.save();
        await targetPost.save();

        res.status(200).send({
            msg: "收藏成功",
            data: targetPost,
        });
    } catch (err) {
        res.status(403).send({
            msg: "收藏失败",
            err,
        });
    }
});

//获取用户的帖子信息
router.get("/user/posts", async (req, res) => {
    //要求内容：user_id
    const user_id = req.query.user_id;
    try {
        const target = await db.post.find({ user: user_id });
        res.status(200).send({
            msg: "获取成功",
            data: target,
        });
    } catch (err) {
        res.status(403).send({
            msg: "获取失败",
            err,
        });
    }
});

//???获取用户收藏的帖子
router.get("/user/favorites", async (req, res) => {
    //要求内容：user_id
    const user_id = req.query.user_id;
    try {
        let target = await db.user.findById(user_id);
        res.status(200).send({
            msg: "获取成功",
            data: target?.favorites,
        });
    } catch (err) {
        res.status(403).send({
            msg: "获取失败",
            err,
        });
    }
});

//检查是否收藏了某个帖子
router.post("/user/isfavorite", async (req, res) => {
    //需要前端提供post_id,user_id
    const { post_id, user_id } = req.body;
    try {
        const user = await db.user.findById(user_id);
        const isFavorite = (user?.favorites as any).some(
            (post: I_Post) => post._id.toString() === post_id
        );
        res.status(200).send({
            msg: "获取成功",
            data: isFavorite,
        });
    } catch (err) {
        res.status(403).send({
            msg: "获取失败",
            err,
        });
    }
});
