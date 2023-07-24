const express = require("express");
const tool = require("../tools");
const middleWares = require("../middlewares");

//TODO:写接口的时候一定要解耦

//生成路由器
const router = express.Router();

//添加文章
router.post("/post", async (req, res) => {
    //组装post对象
    var post = {
        //前端传来的数据在req.body中
        ...req.body,
        //添加额外信息:文章创建时间,文章索引,时间戳
        index: await tool.db.countCollection("posts"),
        format_time: tool.time.getCurrentTime(),
        time_stamp: Date.now(),
    };
    try {
        const data = await tool.db.post.create(post);
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

//获取文章列表
router.get("/posts", async (req, res) => {
    //todo: 这里需要添加分页功能,前端请求时应该携带页码
    try {
        //find()不传参默认找全部符合条件的文档
        res.status(200).send({
            msg: "获取成功",
            data: await tool.db.post.find(),
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
        target.save();
        res.status(200).send({
            msg: "点赞成功",
            data: target,
        });
    } catch (err) {
        res.status(403).send({
            msg:"点赞失败",
            err
        })
    }
});

//给帖子点踩的接口
router.post("/oppose/post", async (req, res) => {
    //要求内容：post_id
    const post_id = req.body.post_id;
    try {
        let target = await tool.db.post.findById(post_id);
        target.oppose++;
        target.save();
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
})
//导出路由
module.exports = router;
