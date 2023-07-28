const mongoose = require("mongoose");

mongoose.connect("mongodb://127.0.0.1/posts");

var db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function () {
    //连接后的回调函数
    console.log("Connected!");
});

const Schema = mongoose.Schema;
//这里的字段非常重要,前后端改字段名要考虑到这里,这里只能多,不能少
//这里的字段名要和前端的字段名一致,否则前端拿不到数据
//todo  Schema都用默认生成的_id字段,不用再额外添加id字段
//Post集合的字段
const Post = new Schema({
    user_id: String, //发布帖子的用户id
    user_name: String, //发布帖子的用户名
    avatar: String, //发布帖子的用户的头像
    title: String, //帖子标题
    content: String, //帖子正文
    tags: Array, //帖子标签
    support: Number, //帖子点赞数
    oppose: Number, //帖子反对数
    comments: Array, //帖子评论,应该是一个对象数组,每个对象包含评论人的id,评论人的用户名,评论人的头像,评论内容,评论时间
    isShowContent: Boolean, //是否显示正文
    index: Number, //文章索引
    format_time: String, //格式化的发布时间
    time_stamp: Number, //发布时间戳
});
//User集合的字段
const User = new Schema({
    user_name: String,
    account: String,
    password: String,
    avatar: String, //头像
    favorites:[Post],//收藏的文章,子文档数组
    published:[Post],//发布的文章,子文档数组
    register_time: String, //注册时间
    time_stamp: Number,
});
//创建集合
const post = mongoose.model("post", Post);
const user = mongoose.model("user", User);

module.exports = {
    user,
    post,
    //统计集合中的文档数量,接收一个集合名作为参数
    countCollection(name,filter){
        return db.collection(name).countDocuments(filter)
    }
};
