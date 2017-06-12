## OSS.Grid

一.使用方式：
```js
 var opt = { IsDisplayHeader: true,
  Page:
  {
     IsPage: true,
     PageSize: 8,
     CurrentPage: 1
  },

  Container: {
     Header: "",
     Content: "",
     Footer: ""
  },

  Methods: {
     // 扩展post之前的参数
     ExtSendParas: function () { return {}; },
     //  获取数据源方法
     GetDataFunc: function (pageData, loadDataFunc) {
		$.post("/ajax/url",pageData,function(res){
			loadDataFunc(res);
		})
   },

   //数据绑定完成之后
   DataBound: function () { }
  }
}

$("#container").osgrid(opt)
```


## OS.Tree

一. 使用方式：
```js
  var opt = {
  textField: "name",
  valueField: "id",
  parentField: "parentId",

  isLoadAll: true,
  isSpreaded: true,

  methods: {
      //  获取数据源方法
      getDataFunc: function(proNode, loadDataFunc) {
          var treeData = [
              { id: 1, name: "ceshi1", parentId: 0 },
              { id: 2, name: "ceshi2", parentId: 1 },
              { id: 3, name: "ceshi3", parentId: 0 },
              { id: 4, name: "ceshi4", parentId: 2 }
          ];
          loadDataFunc(treeData);
      },

      //  选中事件
      chosen: function (dataItem, element) {
          console.info("chosen");
          console.info(dataItem);
          //alert("被选中了！");
      },
      //  每一个层级执行完成之后事件
      dataBound: function(data, element) {
          //alert("层级绑定完毕");
          console.info("dataBound");
          console.info(data);
      },
      //  绑定每个对象时触发
      dataBounding: function (dateItem, leaf) {
          console.info("dataBounding");
          console.info(dateItem);
      }
  }
 }
 $(function () {
     $("#treeContainer").ostree(opt);
 });
```