+function ($) {

    var defaultTemplate = " <table  class=\"table table-responsive table-bordered table-hover\"><thead class=\"oss-table-header\"></thead><tbody class=\"oss-table-body\"></tbody></table><div class=\"oss-table-footer\"></div>";

    var OSSTable = function (element, option) {

        this.opt = option;
        this.element = $(element);
        this.element.addClass("osstable-list");

        this.opt.Headers = this.opt.Headers || [];
        this.opt.page = this.opt.page || { is_page: true, size: 8, cur_page: 1 };

        this.opt.container = this.opt.container || {};
        this.opt.container.header = this.opt.container.header || ".oss-table-header";
        this.opt.container.content = this.opt.container.content || ".oss-table-body";
        this.opt.container.footer = this.opt.container.footer || ".oss-table-footer";

        //方法部分
        this.opt.methods.extSendParas = this.convertToFunc(this.opt.methods.extSendParas, function () { });
        this.opt.methods.dataBound = this.convertToFunc(this.opt.methods.dataBound, function () { });
        this.opt.methods.getDataFunc = this.convertToFunc(this.opt.methods.getDataFunc);

        this.opt.methods.headerFormat = this.convertToFunc(this.opt.methods.headerFormat);
        this.opt.methods.rowFormat = this.convertToFunc(this.opt.methods.rowFormat);
        this.opt.methods.footerFormat = this.convertToFunc(this.opt.methods.footerFormat);
      

        //  头部html格式化
        if (!this.opt.methods.headerFormat) {
            this.opt.methods.headerFormat = function (headers) {
                var headerHtml = "<tr>";
                for (var i = 0; i < headers.length; i++) {
                    var header = headers[i];
                    var width = "style='width:" + header.Width + "'";
                    headerHtml += "<th class='text-center' " + (!!header.Width ? width : "''") + ">" + header.Title + "</th>";
                }
                return headerHtml + "</tr>";
            };
        }

        // 行格式化   tr里的内容
        if (!this.opt.methods.rowFormat) {
            this.opt.methods.rowFormat = function (row, headers) {
                var contentHtml = "<tr>";
                for (var i = 0; i < headers.length; i++) {
                    var header = headers[i];

                    var isFormat = !!header.ContentFormat
                        && (typeof (header.ContentFormat) == "function"
                            || typeof (header.ContentFormat = eval(header.ContentFormat)) == "function");

                    var itemValue = row[header.ColumnName];
                    (itemValue === null || itemValue === undefined) && (itemValue = '')

                    contentHtml += "<td>" + (isFormat ? header.ContentFormat(itemValue, row) : itemValue) + "</td>";
                }
                return contentHtml + "</tr>";
            };
        }

        //  分页信息格式化部分
        if (!this.opt.methods.footerFormat) {
            this.opt.methods.footerFormat = function (page) {
                // 1.  分页
                var numSidCount = 4;
                var pageHtml = "";
                if (page.total_page > 0) {
                    pageHtml += "<ul class=\"pagination justify-content-center\">";
                    if (page.cur_page > 1) {
                        pageHtml += "<li><a class=\"page-item\" data-osstable-goto=\"1\" href=\"javascript:void(0);\">首页</a></li>";
                    }
                    if (page.cur_page > numSidCount + 1) {
                        pageHtml += "<li class=\"page-item disabled\"><a href=\"#\">...</a></li>";
                    }
                    for (var i = page.cur_page - numSidCount > 0 ? page.cur_page - numSidCount : 1; i < page.cur_page; i++) {
                        pageHtml += "<li><a class=\"page-item\" data-osstable-goto=\"" + i + "\" href=\"javascript:void(0);\">" + i + "</a></li>";
                    }

                    pageHtml += "<li class=\"page-item active\"><a href=\"javascript:void(0);\">" + page.cur_page + "</a></li>";

                    for (var j = page.cur_page + 1; j <= page.total_page && j <= page.cur_page + numSidCount; j++) {
                        pageHtml += " <li><a class=\"page-item\" data-osstable-goto=\"" + j + "\" href=\"javascript:void(0);\">" + j + "</a></li>";
                    }

                    if (page.cur_page + numSidCount < page.total_page) {
                        pageHtml += " <li class=\"page-item disabled\"><a href=\"#\">...</a></li>";
                    }
                    if (page.cur_page < page.total_page) {
                        pageHtml += "<li><a class=\"page-item\" data-osstable-goto=\"" + page.total_page + "\" href=\"javascript:void(0);\">末页</a></li>";
                    }
                    pageHtml += " </ul >";
                }
           
                return pageHtml + countHtml;
            }
        }

        //   如果不存在templateid  说明使用默认模板
        var templateId = this.element.attr("data-grid-template");
        var templateHtml = (templateId ? $(templateId).html() : defaultTemplate)||defaultTemplate;

        this.element.prepend(templateHtml);
    };

    OSSTable.prototype = {
        constructor: OSSTable,

        reload: function () {
            this.opt.page.cur_page = 1;
            this.opt.page.total_page = 0;
            this.render();
        },

        refresh: function () {
            this.render();
        },

        //  执行控件渲染
        render: function render() {

            var os = this;
            var page = os.opt.page;
            var sendData = os.opt.methods.extSendParas();
            sendData = $.extend(true, sendData, page);

            var contentcontainer = os.opt.container.content;
            var $content = os.element.find(contentcontainer);
            $content.html("<tr><td colspan='" + os.opt.Headers.length + "'>加载中...</td></tr>");

            this.opt.methods.getDataFunc(sendData, function (data) {

                //初始化行数据
                os.initailContent(data);

                // 初始化页脚
                os.initailFooter(data);
            });
            //初始化头部
            os.initailHeader();
        },

        //初始化加载头部
        initailHeader: function () {

            if (!!this.opt.displayHeader
                && !this.element.hasInitialHeader) {

                var headercontainer = this.opt.container.header;
                var html = this.opt.methods.headerFormat(this.opt.Headers);

                if (!!html) {
                    this.element.find(headercontainer).html(html);
                }
                this.element.hasInitialHeader = true;
            }
        },

        //初始化加载内容
        initailContent: function (data) {

            var dataList = data.Data;

            var contentcontainer = this.opt.container.content;
            var $content = this.element.find(contentcontainer);
            $content.html("");

            if (!!dataList) {

                for (var d = 0; d < dataList.length; d++) {
                    var dataItem = dataList[d];
                    var html = this.opt.methods.rowFormat(dataItem, this.opt.Headers);
                    $content.append(html);
                }
            } else {
                $content.html("<tr><td colspan='" + this.opt.Headers.length + "'>暂无数据！</td></tr>");
            }

        },

        //初始化加载页尾分页等信息
        initailFooter: function (data) {
            var ossTable = this;
            var footercontainer = os.opt.container.footer;
            var $footer = os.element.find(footercontainer);

            if (this.opt.page.is_page) {
                //   前端根据  data-osstable-goto  确定跳转页面 
                ossTable.opt.page.total = data.total;
                ossTable.opt.page.total_page = Math.ceil(data.total_page/ ossTable.opt.page.size);

                var html = os.opt.methods.footerFormat(os.opt.page);
                $footer.html(html);

                $footer.find("[data-osstable-goto]").unbind("click").bind("click",
                    function () {
                        ossTable.goToPage($(this));
                    });

                $footer.show();
            } else {
                $footer.hide();
            }
            this.opt.methods.dataBound();
        },
        goToPage: function ($a) {
            var ossTable = this;
            var page = parseInt($a.attr("data-osstable-goto"));

            page = page != 'NaN' ? page : 1;
            ossTable.opt.page.cur_page = page;

            ossTable.render();
        },
        // 字符串转化为方法
        convertToFunc: function (strFunc, defautFun) {
            var func = null;
            if (!!strFunc
                && (typeof (strFunc) == "function"
                    || typeof (func = eval(strFunc)) == "function")) {
                return func || strFunc;
            }
            return defautFun || null;
        }
    };


    var defaultOption = {

        displayHeader: true,

        page:
        {
            is_page: true,
            size: 8,
            cur_page: 1
        },

        container: {
            header: "",
            content: "",
            footer: ""
        },

        methods: {

            // 扩展post之前的参数
            extSendParas: function () { return {}; },

            //  获取数据源方法
            getDataFunc: function (pageData, loadDataFunc) { },

            //数据绑定完成之后
            dataBound: function () { }
        }
    }

    //  避免其他地方已经定义，作为避免冲突保留项
    var oldOssTable = $.fn.osstable;



    //  设置jQuery插件对象
    $.fn.osstable = function (option) {

        var args = Array.apply(null, arguments);
        args.shift();

        var internalReturn;

        this.each(function () {

            var $this = $(this);

            var cacheData = $this.data('oss.grid');
            var options = typeof option == 'object' && option;

            if (!cacheData) {
                options = $.extend(true, {}, defaultOption, options);
                $this.data('oss.grid', (cacheData = new OSSTable(this, options)));
                cacheData.render();
            }

            if (typeof option == 'string' && typeof cacheData[option] == 'function') {
                internalReturn = cacheData[option].apply(cacheData, args);
            }
        });

        if (internalReturn !== undefined)
            return internalReturn;
        else
            return this;

    };

    //设置初始值
    $.fn.osstable.constructor = osstable;

    // 表格冲突处理
    $.fn.osstable.noConflict = function () {
        $.fn.osstable = oldOssTable;
        return this;
    };

}(window.jQuery);
