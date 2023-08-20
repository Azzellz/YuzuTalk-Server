const express = require("express");
const tool = require("../tools");
const middleWares = require("../middlewares");

const selectUser = require("../tools/db/models/user").SelectUser;
const selectPost = require("../tools/db/models/post").SelectPost;

//TODO:写接口的时候一定要解耦

//生成路由器
const router = express.Router();

//添加文章
router.post("/post", async (req, res) => {
    //获取发布的user_id
    const user_id = req.body.user_id;

    try {
        //根据user_id查询用户
        const user = await tool.db.user.findById(user_id);
        // const userObj = user.toObject(); //转换为普通js对象
        //组装post对象
        var post = {
            user, //填充user
            //前端传来的数据在req.body中
            ...req.body.post, //这里的post是前端传来的post对象
            //添加额外信息:文章创建时间,文章索引,时间戳
            index: await tool.db.countCollection("posts"),
            format_time: tool.time.getCurrentTime(),
            time_stamp: Date.now(),
        };

        //将post添加到数据库
        const data = await tool.db.post.create(post);
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

//删除文章
router.delete("/post", async (req, res) => {
    const post_id = req.query.post_id;
    try {
        const data = await tool.db.post.findByIdAndDelete(post_id);
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
        const post = await tool.db.post.findById(id).populate([
            {
                path: "user",
                select: selectUser,
            },
            {
                path: "comments.user",
                select: selectUser,
            },
            {
                path: "comments.post",
                select: selectPost,
            },
        ]);
        res.status(200).send({
            msg: "获取成功",
            data: post,
        })
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
    const limit = req.query.limit || 10; //默认每页显示10条记录
    const skip = req.query.skip || 0; //分页跳过
    const keyword = req.query.keyword.replace(
        /[\^\$\.\*\+\?\=\!\:\|\\\/\(\)\[\]\{\}\,]/g,
        "\\$&"
    ); //搜索关键字,要转义正则特殊字符
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
        const posts = await tool.db.post
            .find(filter)
            .populate([
                {
                    path: "user",
                    select: selectUser,
                },
                {
                    path: "comments.user",
                    select: selectUser,
                },
                {
                    path: "comments.post",
                    select: selectPost,
                },
            ])
            .limit(limit)
            .skip(skip);
        res.status(200).send({
            msg: "获取成功",
            data: {
                posts,
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

//获取最新的文章列表
router.get("/posts/lastest", async (req, res) => {
    try {
        //获取最新的10篇文章,按照每篇文章的时间戳来排序
        const lastestPosts = await tool.db.post
            .find()
            .populate([
                {
                    path: "user",
                    select: selectUser,
                },
                {
                    path: "comments.user",
                    select: selectUser,
                },
                {
                    path: "comments.post",
                    select: selectPost,
                },
            ])
            .sort({ time_stamp: -1 })
            .limit(10);

        res.status(200).send({
            msg: "获取成功",
            data: lastestPosts,
        });
    } catch (err) {
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
        format_time: tool.time.getCurrentTime(),
        time_stamp: Date.now(),
    };
    //先找到post_id对应的文章
    try {
        let targetPost = await tool.db.post.findById(comment.post); //根据post_id找到对应的文章
        
        targetPost.comments.push(comment); //将评论添加到文章的comments数组中
        await targetPost.save(); //保存文章
        res.status(200).send({
            msg: "评论成功",
            data: comment,
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
        const targetPost = await tool.db.post.findById(post_id);
        //遍历查找对应的评论
        let isFindComment = false;

        targetPost.comments.forEach((comment) => {
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
        const targetPost = await tool.db.post.findById(post_id);
        //遍历查找对应的评论
        let isFindComment = false;

        targetPost.comments.forEach((comment) => {
            //!注意ObjectId类型不能直接比较,要转换成字符串
            if (comment._id.toString() === comment_id) {
                //找到对应的评论,给评论点赞
                comment.oppose++;
                isFindComment = true;
            }
        });

        if (!isFindComment) throw "没有找到对应评论";
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
        let targetPost = await tool.db.post.findById(post_id);
        let targetUser = await tool.db.user.findById(user_id);
        //这里有个小坑,文档对象的_id是一个对象,而post_id是一个字符串,所以要转换一下
        targetUser.favorites = targetUser.favorites.filter(
            (post) => post._id.toString() !== post_id
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
        const target = await tool.db.post.find({ user: user_id });
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

//检查是否收藏了某个帖子
router.post("/user/isfavorite", async (req, res) => {
    //需要前端提供post_id,user_id
    const { post_id, user_id } = req.body;
    try {
        const user = await tool.db.user.findById(user_id);
        const isFavorite = user.favorites.some(
            (post) => post._id.toString() === post_id
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
//导出路由
module.exports = router;
