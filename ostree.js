+function($) {
    var OSTree = function(element, option) {
        this.opt = option;
        this.element = $(element);

        this.opt.valueField = this.opt.valueField || "id";
        this.opt.textField = this.opt.textField || "name";
        this.opt.IsIndented = !this.opt.parentField; //  是否是层级深入的数据格式
        
        this.opt.methods = this.opt.methods || {};
        this.opt.methods.getDataFunc = this.convertToFunc(this.opt.methods.getDataFunc);
        this.opt.methods.chosen = this.convertToFunc(this.opt.methods.chosen);
        this.opt.methods.dataBound = this.convertToFunc(this.opt.methods.dataBound);
        this.opt.methods.dataBounding = this.convertToFunc(this.opt.methods.dataBounding);

        if (!!this.opt.methods.getDataFunc) {
            this.render(this.element);
        }
    }


    //  数据格式：[{id:1,name:"ceshi", parentId:0 , children:[{..}] }]
    //  支持两种形式(parentField设置是否为空来判断)
    //        1. 数据格式同级，通过 parentId（可定义） 关联
    //        2. 数据已经分级，挂载在 children（可定义） 下

    //  数据加载形式分两种：
    //  如果设置 isLoadAll 为false，末端子叶在请求后如果不包含数据，则清除i节点
    //  如果设置 isLoadAll 为true，默认加载全部数据，末端子叶不包含i节点
    //  如果设置 isSpreaded 为 true 树形默认展开，否则 收起 状态 

    //  ul 作为树形页面容器，li对应每个树节点
    //  li 本身绑定节点信息，通过 $li.data("tree-item-data") 获取
    //    li 下有一个文本<span>节点, 展示内容部分
    //    li 下有一个i节点，控制 展开，收起 ，数据的异步加载。点击事件已终止冒泡
    //  如果是异步加载数据，加载后 li 添加 has-loaded="y" 属性防止二次加载
    
    //  控件加载生命流程：
    //  getDataFunc - 外部绑定数据加载方法，调用方传入参数loadData方法，方便异步调用数据后loadData(data)即可
    //     => renderLeafs($parentLi，节点数据列表)  - 加载页容器
    //        => renderLeafDetail（$parentul,单项数据） - 加载具体单叶内容,如果含有子项，递归renderLeafs

    OSTree.prototype = {
        constructor: OSTree,

        render: function ($control) {

            var os = this;
            var dataItem = $control.data("tree-item-data");
           
            os.opt.methods.getDataFunc(dataItem, function(data) {
                os.renderLeafs($control, data);
            });
        },

        renderLeafs: function($leafContain, data) {

            var os = this;
            var dataItem = $leafContain.data("tree-item-data");

            // 获取叶数据 
            var leafItems = [],newData=[];
            if (os.opt.IsIndented || !dataItem) {
                newData = leafItems = data || [];
            } else {
                var count = 0;
                for (var i = 0; i < data.length; i++) {
                    if (dataItem[os.opt.valueField] == data[i][os.opt.parentField]) {
                        leafItems[count++] = data[i];
                    } else {
                        newData[i - count] = data[i];
                    }
                }
            }

            //  判断叶是否可以继续加载
            if (leafItems.length == 0) {
                var hasLoaded = $leafContain.attr("has-loaded") == "y";
                if (os.opt.isLoadAll || hasLoaded) {
                    $leafContain.find("i").remove();
                }
                return;
            }

            var $ul = $("<ul></ul>");
            if (!os.opt.isSpreaded) $ul.hide();
     
            // 渲染节点
            for (var j = 0; j < leafItems.length; j++) {

                var subDataItem = leafItems[j];
                if (subDataItem.hasOnTree) {
                    continue;
                }
                subDataItem.hasOnTree = true;//  避免重复渲染

                var $subLeaf = os.renderLeafDetail($ul, subDataItem );

                if (os.opt.isLoadAll) {

                    os.renderLeafs($subLeaf,
                        os.opt.IsIndented ? subDataItem[os.opt.childrenField] : newData);
                }
            }

            $leafContain.append($ul);
            $leafContain.attr("has-loaded", "y");
            os.opt.methods.dataBound(leafItems, $ul); //  数据完成之后执行事件
        },
        
        renderLeafDetail: function ($ul,dataItem) {
            var os = this;

            var  key = dataItem[os.opt.valueField];
            var  value = dataItem[os.opt.textField];

            // 设置叶元和数据，并绑定点击事件
            var $leaf = $("<li class='tree-leaf'>" +
                "<div class='leaf-body'>" +
                "<i class='tree-icon plus'></i>" +
                "<span class='leaf-text'>" + value + "</span>" +
                "</div></li>");
            $leaf.data("tree-item-data", dataItem);
            $leaf.find(".leaf-body").unbind("click").bind("click", function (e) {

                var $leafNode = $(this).closest("li");
                var cuDataItem = $leafNode.data("tree-item-data");

                os.opt.methods.chosen(cuDataItem, $leafNode);
            });
            
            // 设置icon的默认状态和相关事件
            if (os.opt.isLoadAll) 
                os.switchLeafIcon($leaf);

            $leaf.find("i").off("click").on("click", function (e) {

                    var $leaf = $(this).closest("li");
                    var hasLoaded = $leaf.attr("has-loaded") == "y";

                    if (!os.opt.isLoadAll && !hasLoaded) {
                        os.render($leaf);
                    }

                    os.switchLeafIcon($leaf);
                    e.stopPropagation();
                });

            $ul.append($leaf);
            os.opt.methods.dataBounding(dataItem, $leaf);

            return $leaf;
        },

        //  设置叶端 加减号 并控制显示子叶
        switchLeafIcon: function ($leaf) {

            var $gyh = $leaf.find("i");

            var hasOpen = $gyh.hasClass("minus");
            if (hasOpen) {

                $leaf.find("ul").hide();
                $gyh.removeClass("minus").addClass("plus");

            } else {
                $leaf.find("ul").show();
                $gyh.removeClass("plus").addClass("minus");
            }
        },

        // 字符串转化为方法
        convertToFunc: function(strFunc) {
            var func = null;
            if (!!strFunc
                && (typeof (strFunc) == "function"
                    || typeof (func = eval(strFunc)) == "function")) {
                return func || strFunc;
            }
            return function() {};
        }
    };

    function getDefaultOption() {
        return {

            textField: "",
            valueField: "",
            parentField: "",
            childrenField: "",

            isLoadAll: false,   //  是否是加载全部数据，否则子节点通过异步方式加载
            isSpreaded: true,   //  是否是展开状态

            methods: {
                //  获取数据源方法
                getDataFunc: function(nodeKey, loadDataFunc) {},
                //  选中事件
                chosen: function (dataItem, element) { },
                //  每一个层级执行完成之后事件
                //  data 如果是同级元素，则是全部数据，如果是层级数据，则是子集数据
                //  element 当前层级的ul对象
                dataBound: function (data, element) { },
                //  绑定每个对象时触发
                dataBounding: function(dateItem,leaf) {}
            }
        };
    }

    var old = $.fn.ostree;

    $.fn.ostree = function(option) {

        var args = Array.apply(null, arguments);
        args.shift();
        var internalReturn;

        this.each(function() {

            var $this = $(this);
            var cacheData = $this.data("os.tree");
            var options = typeof option == "object" && option;

            if (!cacheData) {
                var defaultOption = getDefaultOption();
                options = $.extend(defaultOption, options);
                $this.data("os.tree", (cacheData = new OSTree(this, options)));
            }

            if (typeof option == "string" && typeof cacheData[option] == "function") {
                internalReturn = cacheData[option].apply(cacheData, args);
            }
        });

        if (internalReturn !== undefined)
            return internalReturn;
        else
            return this;
    }
    $.fn.ostree.constructor = OSTree;

    // 树冲突处理
    $.fn.ostree.noConflict = function() {
        $.fn.ostree = old;
        return this;
    };
}(window.jQuery);