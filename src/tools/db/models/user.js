const mongoose = require("mongoose");
const { Schema } = mongoose;
//第一个参数是字段,第二个参数是配置
const User = new Schema(
    {
        user_name: String,
        account: String,
        password: String,
        avatar: String,
        favorites: [
            {
                type: Schema.Types.ObjectId,
                ref: "post",
            },
        ],
        published: [
            {
                type: Schema.Types.ObjectId,
                ref: "post",
            },
        ],
        follows: [
            {
                type: Schema.Types.ObjectId,
                ref: "user",
            },
        ],
        fans: [
            {
                type: Schema.Types.ObjectId,
                ref: "user",
            },
        ],
        register_time: String,
        time_stamp: Number,
    },
    {
        statics: {}, //指定静态方法
        methods: {
            //根据传入的filter过滤favorites和published
            filterPosts(filter) {
                function filterKeyword(posts) {
                    return posts.filter(
                        (p) =>
                            filter.test(p.title) ||
                            filter.test(p.content) ||
                            (p.tags
                                ? p.tags.some((t) => filter.test(t))
                                : false) ||
                            filter.test(p.user.user_name) //!这里可能会有错
                    );
                }
                this.favorites = filterKeyword(this.favorites);
                this.published = filterKeyword(this.published);
            },
        }, //指定实例方法,this指向实例本身
        query: {}, //指定查询方法
    }
);

//用于查询用户信息时的投影
const SelectUser = {
    user_name: 1,
    avatar: 1,
    _id: 1,
};

module.exports = { User, SelectUser };
