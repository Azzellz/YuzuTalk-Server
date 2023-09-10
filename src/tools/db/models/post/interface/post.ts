import { Document,Types } from "mongoose";

// 定义用户类型
// interface User {
//     _id: string;
//     username: string;
//     avatar: string;
// }

// 定义评论类型
export interface I_PostComment {
    _id: Types.ObjectId;
    user: Types.ObjectId; //引用的user
    post: Types.ObjectId; //引用的post
    content: string; //评论内容
    time_stamp: number; //评论时间戳
    format_time: string; //格式化的评论时间
    support: number; //点赞数
    oppose: number; //点踩数
}

// 定义帖子类型
export interface I_Post extends Document {
    _id: Types.ObjectId;
    user: Types.ObjectId;
    title: string;
    content: string;
    tags: Array<string>;
    support: number;
    oppose: number;
    follow: number;
    comments: Array<I_PostComment>;
    isShowContent: boolean;
    isCommentable: boolean;
    isUnknown: boolean;
    index: number;
    format_time: string;
    time_stamp: number;
}

//查询投影
export interface SelectedProjection {
    [field: string]: 1|0;
}