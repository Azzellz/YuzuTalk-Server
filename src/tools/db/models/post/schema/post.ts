import { Schema } from "mongoose";
import { I_PostComment, I_Post, SelectedProjection } from "../interface/post";
//!注意,如果没有使用SchemaType定义的字段,则不会被保存到数据库中,如果发生修改也不会被保存到数据库中
//!所以如果有嵌套字段,一定要使用SchemaType再定义一个子Schema
//!注意ObjectId类型不能直接比较,要转换成字符串
//定义Comment的Schema
const PostComment = new Schema<I_PostComment>({
    // user_id: String, //评论人id
    // user_name: String, //评论人用户名
    user: {
        type: Schema.Types.ObjectId,
        ref: "user", //引用的model
    }, //发布人
    // comment_id: String, //评论id
    // post_id: String, //评论所属的帖子id
    post: {
        type: Schema.Types.ObjectId,
        ref: "post", //引用的model
    },
    content: String, //评论内容
    time_stamp: Number, //评论时间戳
    format_time: String, //格式化的评论时间
    support: Number, //点赞数
    oppose: Number, //点踩数
    // comments: Array,//用来追加评论的字段
});
//定义Post的Schema
//第一个参数是字段,第二个参数是配置
export const Post = new Schema<I_Post>({
    user: {
        type: Schema.Types.ObjectId,
        ref: "user", //引用的model
    }, //发布人
    title: String, //帖子标题
    content: String, //帖子正文
    preContent: String, //正文预览
    tags: Array, //帖子标签
    support: Number, //帖子点赞数
    oppose: Number, //帖子反对数
    follow: Number, //收藏数
    comments: [PostComment], //帖子评论,应该是一个Comment类实例数组,每个对象包含评论人的id,评论人的用户名,评论人的头像,评论内容,评论时间
    isShowContent: Boolean, //是否显示正文
    isCommentable: Boolean, //是否启动评论区
    isUnknown: Boolean, //是否匿名发布
    index: Number, //文章索引
    format_time: String, //格式化的发布时间
    time_stamp: Number, //发布时间戳
});

//查询投影
export const SelectPost: SelectedProjection = {
    _id: 1,
};
