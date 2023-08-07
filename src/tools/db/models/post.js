const mongoose = require("mongoose");
const { Schema } = mongoose;
//第一个参数是字段,第二个参数是配置
const Post = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "user", //引用的model
    }, //发布人
    title: String, //帖子标题
    content: String, //帖子正文
    tags: Array, //帖子标签
    support: Number, //帖子点赞数
    oppose: Number, //帖子反对数
    comments: Array, //帖子评论,应该是一个对象数组,每个对象包含评论人的id,评论人的用户名,评论人的头像,评论内容,评论时间
    isShowContent: Boolean, //是否显示正文
    isCommentable: Boolean, //是否启动评论区
    isUnknown: Boolean, //是否匿名发布
    index: Number, //文章索引
    format_time: String, //格式化的发布时间
    time_stamp: Number, //发布时间戳
},{
    methods:{}//指定实例方法
});

module.exports = Post;
