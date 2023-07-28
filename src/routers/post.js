const express = require("express");
const tool = require("../tools");
const middleWares = require("../middlewares");

//TODO:写接口的时候一定要解耦

//生成路由器
const router = express.Router();

//添加文章
router.post("/post", async (req, res) => {
    //获取发布的user_id
    const user_id = req.body.user_id;

    try {
        //组装post对象
        var post = {
            //前端传来的数据在req.body中
            ...req.body,
            //添加额外信息:文章创建时间,文章索引,时间戳
            index: await tool.db.countCollection("posts"),
            format_time: tool.time.getCurrentTime(),
            time_stamp: Date.now(),
        };

        //将post添加到数据库
        const data = await tool.db.post.create(post);

        //获取发布post的用户的实例(这里要放在创建post后面,因为要用到post的_id)
        const user = await tool.db.user.findById(user_id);
        //将post添加到用户的published数组中
        user.published.push(data);
        //保存用户
        await user.save();

        console.log(`成功添加文章：${data}`);
        res.status(200).send({
            msg: "发布成功",
            data,
        });
    } catch (err) {
        console.log(`添加文章失败：${err}`);
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
        const data = await tool.db.post.findByIdAndUpdate(
            newPost._id,
            newPost,
            { new: true }
        );

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

//获取文章列表(已添加分页功能)
router.get("/posts", async (req, res) => {
    //实现分页功能
    const pageSize = req.query.limit || 10; //默认每页显示10条记录
    const skip = req.query.skip; //分页跳过
    const keyword = req.query.keyword; //搜索关键字
    const filter = {
        //按照四个搜索字段进行正则匹配,这里要使用$or操作符来实现或条件查询,不用$and
        $or: [
            { title: { $regex: keyword, $options: "i" } },
            { content: { $regex: keyword, $options: "i" } },
            { user_name: { $regex: keyword, $options: "i" } },
            { tags: { $regex: keyword, $options: "i" } },
        ],
    };
    try {
        //find()不传参默认找全部文档
        res.status(200).send({
            msg: "获取成功",
            data: {
                posts: await tool.db.post
                    .find(filter)
                    .limit(pageSize)
                    .skip(skip),
                total: await tool.db.countCollection("posts", filter), //记录总数
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

//发布评论
router.post("/comment", async (req, res) => {
    //组装comment对象
    const comment = {
        //要求内容：post_id,comment_id(由前端自己生成),user_id,user_name,avatar,content
        ...req.body,
        //添加额外信息:评论时间,时间戳
        format_time: tool.time.getCurrentTime(),
        time_stamp: Date.now(),
    };
    //先找到post_id对应的文章
    try {
        let targetPost = await tool.db.post.findById(comment.post_id); //根据post_id找到对应的文章
        targetPost.comments.push(comment); //将评论添加到文章的comments数组中
        await targetPost.save(); //保存文章
        res.status(200).send({
            msg: "评论成功",
            data: comment,
        });
    } catch (err) {
        res.status(403).send({
            msg: "评论失败",
            err,
        });
    }
});

//给帖子点赞的接口
router.post("/support/post", async (req, res) => {
    //要求内容：post_id
    const post_id = req.body.post_id;
    try {
        let target = await tool.db.post.findById(post_id);
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
        let target = await tool.db.post.findById(post_id);
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
        let targetPost = await tool.db.post.findById(post_id);
        let targetUser = await tool.db.user.findById(user_id);
        targetUser.favorites.push(targetPost);
        await targetUser.save();
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
        let targetPost = await tool.db.post.findById(post_id);
        let targetUser = await tool.db.user.findById(user_id);
        //这里有个小坑,文档对象的_id是一个对象,而post_id是一个字符串,所以要转换一下
        targetUser.favorites = targetUser.favorites.filter(
            (post) => post._id.toString() !== post_id
        );

        await targetUser.save();
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
        let target = await tool.db.post.find({ user_id });
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

//获取用户收藏的帖子
router.get("/user/favorites", async (req, res) => {
    //要求内容：user_id
    const user_id = req.query.user_id;
    try {
        let target = await tool.db.user.findById(user_id);
        res.status(200).send({
            msg: "获取成功",
            data: target.favorites,
        });
    } catch (err) {
        res.status(403).send({
            msg: "获取失败",
            err,
        });
    }
});
//导出路由
module.exports = router;
