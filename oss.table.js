+function ($) {

    var defaultTemplate = " <table  class=\"table table-bordered table-hover table-responsive-sm\"><thead class=\"oss-table-header\"></thead><tbody class=\"oss-table-body\"></tbody></table><div class=\"oss-table-footer\"></div>";

    var OSSTable = function (element, option) {

        this.opt = option;
        this.element = $(element);
        this.element.addClass("osstable-list");

        this.opt.headers = this.opt.headers || [];
        this.opt.page = this.opt.page || { is_page: true, size: 8, cur_page: 1 };
        
        //方法部分
        this.opt.methods.extSendParas = this.convertToFunc(this.opt.methods.extSendParas, function () { });
        this.opt.methods.dataBound = this.convertToFunc(this.opt.methods.dataBound, function () { });
        this.opt.methods.getSource = this.convertToFunc(this.opt.methods.getSource);

        this.opt.methods.headerFormat = this.convertToFunc(this.opt.methods.headerFormat);
        this.opt.methods.rowFormat = this.convertToFunc(this.opt.methods.rowFormat);
        this.opt.methods.footerFormat = this.convertToFunc(this.opt.methods.footerFormat);
        
        //  头部html格式化
        if (!this.opt.methods.headerFormat) {
            this.opt.methods.headerFormat = function (headers) {
                var headerHtml = "<tr>";
                for (let i = 0; i < headers.length; i++) {
                    const header = headers[i];
                    const width = "style='width:" + header.width + "'";
                    headerHtml += "<th class='text-center' " + (!!header.width ? width : "''") + ">" + header.title + "</th>";
                }
                return headerHtml + "</tr>";
            };
        }

        // 行格式化   tr里的内容
        if (!this.opt.methods.rowFormat) {
            this.opt.methods.rowFormat = function (row, headers) {
                var contentHtml = "<tr  class='text-center'>";
                for (let i = 0; i < headers.length; i++) {
                    const header = headers[i];
                    let itemValue = row[header.col_name];

                    const isFormat = !!header.col_format
                        && (typeof (header.col_format) == "function"
                            || typeof (header.col_format = eval(header.col_format)) == "function");

                    if (isFormat) {
                        itemValue = header.col_format(row) || itemValue;
                    }
                    
                    (itemValue === null || itemValue === undefined) && (itemValue = "");
                    contentHtml += "<td>" + itemValue + "</td>";
                }
                return contentHtml + "</tr>";
            };
        }

        //  分页信息格式化部分
        if (!this.opt.methods.footerFormat) {
            this.opt.methods.footerFormat = function (page) {
                // 1.  分页
                const numSidCount = 4;
                var pageHtml = "";
                if (page.total_page > 0) {
                    pageHtml += "<ul class=\"pagination pagination-sm justify-content-center\">";
                    if (page.cur_page > 1) {
                        pageHtml += "<li class=\"page-item\"><a class=\"page-link\" data-osstable-goto=\"1\" href=\"javascript:void(0);\">首页</a></li>";
                    }
                    if (page.cur_page > numSidCount + 1) {
                        pageHtml += "<li class=\"page-item disabled\"><span class=\"page-link\">...</span></li>";
                    }
                    for (var i = page.cur_page - numSidCount > 0 ? page.cur_page - numSidCount : 1; i < page.cur_page; i++) {
                        pageHtml += "<li class=\"page-item\"> <a class=\"page-link\" data-osstable-goto=\"" + i + "\" href=\"javascript:void(0);\">" + i + "</a></li>";
                    }

                    pageHtml += "<li class=\"page-item active\"><span class=\"page-link\">" + page.cur_page + "</span></li>";

                    for (var j = page.cur_page + 1; j <= page.total_page && j <= page.cur_page + numSidCount; j++) {
                        pageHtml += " <li class=\"page-item\"><a class=\"page-link\" data-osstable-goto=\"" + j + "\" href=\"javascript:void(0);\">" + j + "</a></li>";
                    }

                    if (page.cur_page + numSidCount < page.total_page) {
                        pageHtml += " <li class=\"page-item disabled\"><span class=\"page-link\">...</span></li>";
                    }
                    if (page.cur_page < page.total_page) {
                        pageHtml += "<li class=\"page-item\"><a class=\"page-link\" data-osstable-goto=\"" + page.total_page + "\" href=\"javascript:void(0);\">尾页</a></li>";
                    }
                    pageHtml += " </ul>";
                }
           
                return pageHtml ;
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

            var ossTable = this;
            var page = ossTable.opt.page;
            var sendData = ossTable.opt.methods.extSendParas();
            sendData = $.extend(true, sendData, page);

            var contentcontainer = ossTable.opt.container.body;
            var $content = ossTable.element.find(contentcontainer);
            $content.html("<tr><td colspan='" + ossTable.opt.headers.length + "'>加载中...</td></tr>");

            this.opt.methods.getSource(sendData, function (data) {

                //初始化行数据
                ossTable.initailContent(data);

                // 初始化页脚
                ossTable.initailFooter(data);
            });
            //初始化头部
            ossTable.initailHeader();
        },

        //初始化加载头部
        initailHeader: function () {

            if (!!this.opt.displayHeader
                && !this.element.hasInitialHeader) {

                var headercontainer = this.opt.container.header;
                var html = this.opt.methods.headerFormat(this.opt.headers);

                if (!!html) {
                    this.element.find(headercontainer).html(html);
                }
                this.element.hasInitialHeader = true;
            }
        },

        //初始化加载内容
        initailContent: function (data) {

            var dataList = data.data;

            var contentcontainer = this.opt.container.body;
            var $content = this.element.find(contentcontainer);
            $content.html("");

            if (!!dataList) {

                for (var d = 0; d < dataList.length; d++) {
                    var dataItem = dataList[d];
                    var html = this.opt.methods.rowFormat(dataItem, this.opt.headers);
                    $content.append(html);
                }
            } else {
                $content.html("<tr><td colspan='" + this.opt.headers.length + "'>暂无数据！</td></tr>");
            }

        },

        //初始化加载页尾分页等信息
        initailFooter: function (data) {
            var ossTable = this;
            var footercontainer = ossTable.opt.container.footer;
            var $footer = ossTable.element.find(footercontainer);

            if (this.opt.page.is_page) {
                //   前端根据  data-osstable-goto  确定跳转页面 
                ossTable.opt.page.total = data.total;
                ossTable.opt.page.total_page = Math.ceil(data.total/ ossTable.opt.page.size);

                var html = ossTable.opt.methods.footerFormat(ossTable.opt.page);
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
        container: {
            header: ".oss-table-header",
            body: ".oss-table-body",
            footer: ".oss-table-footer"
        },

        page:
        {
            is_page: true,
            size: 20,
            cur_page: 1
        },
        headers: [{ width: "", title: "名称", col_name: "name", col_format: function(rowData) {} }],
        methods: {

            // 扩展post之前的参数
            extSendParas: function () { return {}; },

            //  获取数据源方法
            getSource: function (pageData, loadDataFunc) { },

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
    $.fn.osstable.constructor = OSSTable;

    // 表格冲突处理
    $.fn.osstable.noConflict = function () {
        $.fn.osstable = oldOssTable;
        return this;
    };

}(window.jQuery);
