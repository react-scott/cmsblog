'use strict';

import Base from './base.js';
import pagination from 'think-pagination';
export default class extends Base {
    init(http) {
        super.init(http);
        this.active = "/topic";
    }
  /**
   * index action
   * @return {Promise} []
   */
 async indexAction(){
     let q = this.get('key');
      let map ={}
      if(!think.isEmpty(q)){
          switch (q){
              case 'week':
                  //todo
                  map.discuss_count_update = [">",new Date().valueOf() - (7*3600*3600*1000)]
                  break;
              case 'month':
                  //todo
                  map.discuss_count_update = [">",new Date().valueOf() - (30*3600*3600*1000)]
                  break;
          }
      }
      let list = await this.model('keyword').page(this.get('page'),15).where(map).order("videonum DESC,focus_count DESC").countSelect();
      let html = pagination(list, this.http, {
          desc: false, //show description
          pageNum: 2,
          url: '', //page url, when not set, it will auto generated
          class: 'nomargin', //pagenation extra class
          text: {
              next: '下一页',
              prev: '上一页',
              total: 'count: ${count} , pages: ${pages}'
          }
      });
      this.assign('pagination', html);
      //console.log(list);
      this.assign("list",list);
      //seo
      this.meta_title = "话题"; //标题
      this.keywords =  "话题"; //seo关键词
      this.description =  "话题"; //seo描述
    //auto render template file index_index.html
    return this.display();
  }

 async listAction(){
     let q = this.get("key").split(",");
     console.log(q);

     //获取所有的模型
     let models = await this.model("model").get_model(null,null,{key_show:1});
     this.assign("models",models);
     //获取当前模型
     let mod = await this.model("model").get_model(q[1]);
     console.log(mod);
     this.assign("mod",mod);

     //获取当前话题
     let topic = await this.model("keyword").where({keyname:q[0]}).find();
     this.assign("topic",topic);
     console.log(topic);

     let list=[];
     if(!think.isEmpty(q[1])){
         if(mod.extend==0){
             list = await this.model('keyword_data').where({tagid:topic.id,mod_id:q[1]}).page(this.get('page'),10).join({
                 table: mod.name,
                 join: "left", //join 方式，有 left, right, inner 3 种方式
                 as: "c", // 表别名
                 on: ["docid", "id"] //ON 条件
             }).order("c.id DESC").countSelect();
             if(mod.id==8){
                 for (let v of list.data){
                     v.imgs = img_text_view(v.detail,200,120);
                 }
             }
         }else {
             list = await this.model('keyword_data').where({tagid:topic.id,mod_id:q[1]}).page(this.param('page'),10)
                 .join({
                     table: "document",
                     join: "left", //join 方式，有 left, right, inner 3 种方式
                     as: "c", // 表别名
                     on: ["docid", "id"] //ON 条件
                 }).order("c.id DESC").countSelect();
         }
     }else {
         list = await this.model('keyword_data').where({tagid:topic.id,mod_type:0}).page(this.param('page'),10)
             .join({
                 table: "document",
                 join: "left", //join 方式，有 left, right, inner 3 种方式
                 as: "c", // 表别名
                 on: ["docid", "id"] //ON 条件
             }).order("c.id DESC").countSelect();
     }

     let html = pagination(list, this.http, {
         desc: false, //show description
         pageNum: 2,
         url: '', //page url, when not set, it will auto generated
         class: 'nomargin', //pagenation extra class
         text: {
             next: '下一页',
             prev: '上一页',
             total: 'count: ${count} , pages: ${pages}'
         }
     });
     this.assign('pagination', html);
     console.log(list);
     this.assign("list",list);
     //该主题是否被关注。
     if(this.is_login) {
         let focus = await this.model("keyword_focus").where({key_id: topic.id, uid:this.user.uid}).find();
         this.assign("focus", focus);
     }
     //seo
     this.meta_title = topic.keyname; //标题
     this.keywords = topic.keyname; //seo关键词
     this.description = topic.description; //seo描述

     this.assign("key",q[0]);
     return this.display();
 }
}