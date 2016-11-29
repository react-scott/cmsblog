'use strict';
import Base from '../index.js';

export default class extends Base {
  /**
   * index action
   * @return {Promise} []
   * 封面入口
   */
  indexAction(){
    //console.log(this);
    //auto render template file index_index.html

   return this.display();
  }

  async addAction(){
      //前台登录验证
      await this.weblogin();
      let cid = this.get("cid");
      //验证用户权限
      await this.c_verify("add");
      //获取面包屑信息
      let breadcrumb = await this.model('category').get_parent_category(cid,true);
      this.assign('breadcrumb', breadcrumb);
      console.log(breadcrumb)
      this.assign('category', this.m_cate);
      this.meta_title = "发布";
      if(checkMobile(this.userAgent())){
          //手机端模版
          return this.modtemp("question","mobile");
      }else{
          //console.log(temp);
          // return this.display(temp);
          return this.modtemp();
      }
  }
  async testAction(){
      return this.display();
  }
  //编辑主题
    async editAction(){
     //前台登录验证
        await this.weblogin();
        let info = await this.model("question").find(this.get("id"));
        //console.log(info);
        this.assign("info",info);
        //后台管理员跳过验证
       if(!in_array(parseInt(this.user.uid), this.config('user_administrator'))){
           //await this.c_verify("edit");
           //安全判断
           if(info.uid !=this.user.uid){
               this.http.error = new Error('你不能编辑，不属于自己的东西！');
               return think.statusAction(702, this.http);
           }
       }
        //获取面包屑信息
        let breadcrumb = await this.model('category').get_parent_category(info.category_id,true);
        this.assign('breadcrumb', breadcrumb);
        //获取栏目信息
        let cate = await this.category(info.category_id);
       // console.log(cate);
        this.assign('category', cate);
        //获取分组
        let group = await this.model("category").get_groups(cate.id);
       // console.log(group);
        if(!think.isEmpty(group)){
            this.assign('group', think._.filter(group, {'id': info.group_id}));
        }
        //获取相关话题;
        let where = {};
        where.docid=info.id;
        where.mod_type=1;
        where.mod_id=cate.model;
        let keyword;
        let topicid = await think.model("keyword_data", think.config("db")).where(where).getField("tagid");
        if(!think.isEmpty(topicid)){
            keyword = await think.model("keyword", think.config("db")).where({id:["IN",topicid]}).getField("keyname");
            if(!think.isEmpty(keyword)){
                this.assign("keyword",keyword.join(","))
            }

        }
        //seo
        this.meta_title = "编辑"; //标题
        return this.display()
    }
  //添加或编辑主题
  async updateAction(){
      //前台登录验证
      await this.weblogin();

      let data = this.post();
      if(think.isEmpty(data.id)){
          data.uid = this.user.uid;
          data.ip = _ip2int(this.ip());
      }else {
          data.userid=this.user.uid;
      }
      data.anonymous = data.anonymous||1;
      //console.log(data);
      // return this.fail(data);
      let res = await this.model('question').updates(data);
      if (res) {
          //行为记录
          if (!res.data.id) {
              //添加操作日志，可根据需求后台设置日志类型。
              //await this.model("action").log("add_document", "document", res.id, this.user.uid, this.ip(), this.http.url);

            return this.success({name: "添加成功", url: '/mod/question/'+res.id});
          } else {
              return this.success({name: "更新成功", url: '/mod/question/'+res.data.id});
          }

      } else {
          return this.fail("操作失败！");
      }

  }
  //添加或编辑回复
    async updateanswerAction(){
        //前台登录验证
        await this.weblogin();
        let data = this.post();
        if(think.isEmpty(data.answer_id)){
            data.uid = this.user.uid;
            data.ip = _ip2int(this.ip());
            data.anonymous = data.anonymous||1;
        }
        console.log(data);
        let res = await this.model('question_answer').updates(data);
        if (res) {
            //行为记录
            if (!res.data.answer_id) {
                //添加操作日志，可根据需求后台设置日志类型。
                //await this.model("action").log("add_document", "document", res.id, this.user.uid, this.ip(), this.http.url);
                this.success({name: "添加成功",data:res});
            } else {
                this.success({name: "更新成功",data:res});
            }

        } else {
            this.fail("操作失败！");
        }
    }

}