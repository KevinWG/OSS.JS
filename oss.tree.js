/**
 *
 *  数据源格式：[{id:1,name:"ceshi", parentId:0 , children:[{..}] }]
 *
 *  支持两种形式(childrenField设置是否为空来判断是否是分级结构)
 *        1. 数据格式同级，通过 parentId（字段可定义） 关联
 *        2. 数据已经分级，挂载在 children（字段可定义） 下
 *
 *  数据加载形式分两种：
 *  如果设置 isRemote=true，渲染第一层节点，点击触发getSource方法，并传入当前节点信息
 *  如果设置 isRemote=false，但
 *         isDeferred=false，会递归渲染全部节点
 *         isDeferred=true, 只渲染第一层节点，点击触发渲染下一层，数据源来自第一次加载的数据源
 * 
 *  如果设置 isOpen 为 true 树形默认展开，否则 收起 状态
 *
 *  ul 作为树形构造容器，li对应每个树叶节点
 *  <ul>
 *    <li>
 * 
 *      <div>    （绑定了自定义 chosen 事件）
 * 
 *         <i> +/- </i>   （点击时触发 switch 方法，已阻止冒泡）
 * 
 *         <span> 展示内容 </span> （可通过自定义 format 返回自定义元素）
 * 
 *      </div>
 * 
 *      <ul>  子集  </ul>
 * 
 *    </li>
 *  </ul>
 *
 *  控件加载生命流程：
 *  
 *  initail($control,sourcePromise) - sourcePromise 是对 getSource 封装后返回的promise对象
 *     => renderLeafs($parentLi，节点数据列表)  - 加载页容器
 *        => renderLeafDetail（$parentul,单项数据） - 加载具体单叶内容
 *           如果含有子项，递归 renderLeafs
 *
 * 可供使用的内部方法：
 * 
 *    $ele.osstree("switch",$leafLi,state)
 *       @param {} $leafLi - 当前叶节点元素
 *       @param {} state - "open/close" 【可选】  参数如果不填，则根据已有状态自动转换
 *     
 *    $ele.osstree("add", $parentLeafLi, dataItem)     
 *       @param {} $parentLeafLi 父叶节点对象
 *       @param {} data  添加的节点数据对象
 *
 *    $ele.osstree("del", $leafLi)
 *       @param {} $leafLi 需要删除的节点对象
 * 
 *    $ele.osstree("source", list)
 *       @param {} list 【可选】要更新的数据源
 *       @returns {}  如果list为空, 返回当前完整数据源，否则更新 数据源并渲染 然后返回 osstree 对象
 *             返回的数据源 在 isRemote=true 时，因为节点加载情况不一，可能会和 远程真实数据源 数据有部分出入
 *
 * 用户自定义事件部分，请参阅下方 defaultOption 注释
 */

+function ($) {

    var defaultOption = {

        textField: "text",
        valueField: "value",

        parentField: "parentId",
        defaultParentVal: 0,

        childrenField: "",   //  如果设置，则走递归层级

        isRemote: false,     //  是否远程加载，子节点会延迟渲染
        isDeferred: false,   //  是否延迟加载，isRemote=true 时，isDeferred 恒为 true
        isOpen: false,       //  首次加载是否是展开状态,isDeferred=true时，isOpen 恒为 false

        methods: {
            /**
             * 获取数据源方法
             * @param {any} parentItem  父节点
             * @param {any} callBack 加载数据后回调方法 
             */
            getSource: function (parentItem, callBack) { },


            /**
             * 选中叶节点事件
             * @param {any} item 选中节点数据
             * @param {any} $leaf 选中节点对象
             */
            chosen: function (item, $leaf) { },

            /**
             *   层级数据绑定完成后事件
             * @param {any} items 当前层级数据对象列表
             * @param {any} $ul 当前层级的ul对象
             */
            dataBound: function (items, $ul) { },

            /**
             * 单个对象绑定后事件
             * @param {any} dateItem 当前数据对象
             * @param {any} $leaf 当前页面对象
             */
            dataBounding: function (dateItem, $leaf) { },

            /**
             *  叶格式化方法
             * @param {any} item  数据项
             * @returns {any} 返回 jQuery 元素对象
             */
            format: function (item) {
                var value = item[this.opt.textField];
                return $("<span class='leaf-text'>" + value + "</span>");
            }

        }
    };
    var OSSTree = function (element, option) {

        const opt = option;

        if (opt.isRemote) {
            opt.isDeferred = true;
        }
        if (opt.isDeferred) {
            opt.isOpen = false;
        }
        if (!opt.methods) {
            opt.methods = {};
        }

        opt.IsIndented = !!opt.childrenField;
        opt.methods.chosen = convertToFunc(opt.methods.chosen);
        opt.methods.format = convertToFunc(opt.methods.format);

        opt.methods.getSource = convertToFunc(opt.methods.getSource);
        opt.methods.dataBound = convertToFunc(opt.methods.dataBound);
        opt.methods.dataBounding = convertToFunc(opt.methods.dataBounding);

        const self = this;

        self.opt = opt;
        self.firstLoad = true;
        self.$element = $(element);

        self.$element.data("tree-contain", true);
        self.initail(self.$element, getSourcePromise({}, self.opt.methods.getSource));

        return self;
    };


    OSSTree.prototype = {

        initail: function ($control, sourcePromise) {

            var self = this;
            $control.children("ul").html("");

            sourcePromise.done(function (data) {
                self.renderLeafs($control, data);

                if (self.firstLoad) {

                    self.firstLoad = false;
                    self.dataSet = data;

                    self.$element.find("ul:first").data("tree-root", true);

                }

            });
        },

        renderLeafs: function ($leafLi, data) {

            const os = this;
            const opt = os.opt;
            const dataItem = $leafLi.data("tree-item-data");

            // 获取当前渲染数据 
            let leafItems = [];
            let restData = null;  // 如果平级且不延迟加载，获取剩余未渲染的数据便于下次递归使用

            if (opt.IsIndented || opt.isRemote) {

                leafItems = data || [];

            } else {

                restData = [];
                const parentVal = !dataItem ? opt.defaultParentVal : dataItem[opt.valueField];

                for (let i = 0, count = 0; i < data.length; i++) {

                    if (parentVal === data[i][opt.parentField]) {
                        leafItems[count++] = data[i];
                    } else {
                        restData[i - count] = data[i];
                    }
                }
            }

            //  如果子集元素不存在
            if (leafItems.length === 0) {
                if (!opt.isDeferred || !os.firstLoad) {
                    $leafLi.find(".tree-icon:first").hide();
                }
                return restData;
            }

            //  处理子集容器
            var $ul = $leafLi.children("ul:first");
            if ($ul.length === 0) {

                $ul = $("<ul class=\"oss-tree\"></ul>");

                if (!$leafLi.data("tree-contain")) {  //  不是容器自身时，默认子集ul初始化时是折叠状态
                    $ul.hide();
                }
                $leafLi.append($ul);

                if (opt.isOpen && os.firstLoad) {
                    os.switch($leafLi, "open");
                }
            }

            // 全量加载（平级格式），异步渲染时，保存下次查询的数组
            if (opt.isDeferred && !!restData) {
                os.$element.data("temp-rest-dataset", restData);
            }

            // 循环递归渲染节点
            for (let j = 0; j < leafItems.length; j++) {

                const subDataItem = leafItems[j];
                const $subLeaf = os.renderLeafDetail($ul, subDataItem);

                if (!opt.isDeferred) {
                    restData = os.renderLeafs($subLeaf,
                        opt.IsIndented ? subDataItem[opt.childrenField] : restData);
                }
            }

            opt.methods.dataBound(leafItems, $ul); //  数据完成之后执行事件
            return restData;
        },

        renderLeafDetail: function ($ul, dataItem) {
            var os = this;
            var opt = os.opt;

            // 设置叶元和数据，并绑定点击事件
            //  li 中会包含自身内容  以及  下属子节点列表的ul
            const $leafLi = $("<li class='tree-leaf' leaf-key='" + (dataItem[opt.valueField] || '') + "'></li>");
            $leafLi.data("tree-item-data", dataItem);

            //  叶元素自身内容部分
            const $leafDiv = $("<div class='leaf-body'></div>");   //  节点内容部分
            const $leafIcon = $("<i class='tree-icon plus'></i>");  //   节点内容 - icon 部分
            const $leafText = opt.methods.format.call(os, dataItem);     //  节点内容 - 文本部分 ,用户可以自定义

            $leafDiv.append($leafIcon);
            $leafDiv.append($leafText);

            $leafLi.append($leafDiv);

            // 内容的点击事件
            $leafDiv.off("click").on("click", function (e) {

                const $leafNode = $(this).closest("li");
                const cuDataItem = $leafNode.data("tree-item-data");

                opt.methods.chosen(cuDataItem, $leafNode);

            });
            //  icon 的折叠展开事件
            $leafIcon.off("click").on("click", function (e) {

                os.switch($leafLi);
                e.stopPropagation();

            });

            $ul.append($leafLi);
            opt.methods.dataBounding(dataItem, $leafLi);

            return $leafLi;
        },

        /**
         * 控制节点展开、关闭
         * @param {any} $leafLi  节点元素
         * @param {any} state  要控制的状态（"open/close"），不传/空 则根据当前已有状态自动转换
         */
        switch: function ($leafLi, state) {
            const os = this;
            const opt = os.opt;

            const $leafIcon = $leafLi.find(".tree-icon:first");
            const setOpen = !state ? $leafIcon.hasClass("plus") : state === "open";

            if (setOpen) {

                if (opt.isDeferred && !os.firstLoad) {

                    const hasLoaded = $leafIcon.data("had-already-async");
                    if (!hasLoaded) {
                        $leafIcon.data("had-already-async", true);

                        var parSet = getParentSet(os, $leafLi);
                        if (opt.isRemote) {

                            const dataItem = $leafLi.data("tree-item-data");
                            getSourcePromise(dataItem, opt.methods.getSource).done(function (dataList) {

                                if (dataList.length > 0) {

                                    os.renderLeafs($leafLi, dataList);
                                    parSet.push.apply(parSet, dataList);

                                    open($leafLi, $leafIcon);
                                }
                            });

                            return;
                        } else {

                            if (!opt.IsIndented) {
                                parSet = os.$element.data("temp-rest-dataset") || [];
                            }
                            os.renderLeafs($leafLi, parSet);
                        }


                    }
                }
                open($leafLi, $leafIcon);

            } else {

                $leafLi.children("ul").hide("slow");
                $leafIcon.removeClass("minus").addClass("plus");
            }

            function open($li, $icon) {
                $li.children("ul").show("slow");
                $icon.removeClass("plus").addClass("minus");
            }
        },

        /**
         *   添加叶节点
         * @param {any} $parentLeafLi 父叶节点对象
         * @param {any} dataItem  添加的节点对象
         */
        add: function ($parentLeafLi, dataItem) {

            const self = this;

            // 处理数据
            const parSet = getParentSet(self, $parentLeafLi);
            parSet.push(dataItem);

            // 处理节点
            self.renderLeafs($parentLeafLi || self.$element, [dataItem]);
            if (!!$parentLeafLi) {
                self.switch($parentLeafLi, "open");
            }

        },

        /**
         * 删除叶节点
         * @param {any} $leafLi 需要删除的节点对象
         */
        del: function ($leafLi) {

            const self = this;
            const currentItem = $leafLi.data("tree-item-data");

            // 处理数据
            const $selfUl = $leafLi.closest("ul");
            const isRoot = $selfUl.data("tree-root"); //  是否根节点

            var $parentLi = null;
            if (!isRoot) {
                $parentLi = $selfUl.closest("li");
            }

            const parentSet = getParentSet(self, $parentLi);
            removeFromArray(currentItem, parentSet);

            // 处理节点
            $leafLi.remove();

            // 非根级叶节点下不存在子节点时，折叠按钮隐藏
            if (!isRoot && $selfUl.children("li").length === 0) {
                self.switch($parentLi, "close");
            }
        },
        /**
         *  获取/更新数据源
         * @param {any} list 【可选】要更新的数据源
         * @returns {any}  如果为空返回当前完整数据源，否则返回 osstree 对象
         */
        source: function (list) {

            if (!list) {
                return this.dataSet;
            }
            if ($.isArray(list)) {

                this.initail(this.$element, getSourcePromise(null, list));
                return this;
            }
            log("error", "the data source is not an available Array!");
            return null;
        }
    };

    /**
     * 获取数据源的异步对象
     * @param {any} dataItem  上个节点数据对象
     * @param {any} source 数据源（方法/数组）- 传入方法时，会把 dataItem 作为参数传入
     * @returns {any} promise
     */
    function getSourcePromise(dataItem, source) {

        const defer = $.Deferred();
        if ($.isFunction(source)) {

            source(dataItem, function (data) { defer.resolve(data); });

        } else {

            defer.resolve(source);
        }
        return defer.promise();
    }

    function getParentSet(osObj, $parentLeafLi) {

        var cuSet;
        const opt = osObj.opt;

        if (!!$parentLeafLi && opt.IsIndented) {

            const currentItem = $parentLeafLi.data("tree-item-data");

            if (!currentItem[opt.childrenField]) {
                currentItem[opt.childrenField] = [];
            }
            cuSet = currentItem[opt.childrenField];

        } else {
            cuSet = osObj.dataSet;
        }
        return cuSet;
    }

    function convertToFunc(strFunc) {

        var func = null;
        if (!!strFunc
            && (typeof (strFunc) == "function" || typeof (func = eval(strFunc)) == "function")) {

            return func || strFunc;
        }
        return function () { };
    }

    function removeFromArray(obj, list) {

        var index;
        if (list.length > 0
            && (index = $.inArray(obj, list)) > -1) {

            list.splice(index, 1);
        }
    }
    /**
     * 日志方法
     * @param {any} level 等级 info, error ,debug
     * @param {any} msg 日志等信息
     */
    function log(level, msg) {
        console.info(msg);
    }



    var old = $.fn.osstree;

    $.fn.osstree = function (option) {

        var args = Array.apply(null, arguments);
        args.shift();
        var internalReturn;

        this.each(function () {

            const $this = $(this);
            var cacheData = $this.data("os.tree");
            var options = typeof option == "object" && option;

            if (!cacheData) {
                options = $.extend(true, {}, defaultOption, options);
                $this.data("os.tree", (cacheData = new OSSTree(this, options)));
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
    $.fn.osstree.constructor = OSSTree;

    // 树冲突处理
    $.fn.osstree.noConflict = function () {
        $.fn.osstree = old;
        return this;
    };
}(window.jQuery);