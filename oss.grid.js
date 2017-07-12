+function ($) {

    var defaultTemplate = " <table id=\"simple-table\"  class=\"table table-striped table-border table-bordered table-hover\"><thead class=\"page-list-header\"></thead><tbody class=\"page-list-content\"></tbody></table><div class=\"well page-list-footer\"></div>";

    var OSGrid = function (element, option) {

        this.opt = option;
        this.element = $(element);
        this.element.addClass("osgrid-list");

        this.opt.Headers = this.opt.Headers || [];
        this.opt.Page = this.opt.Page || { IsPage: true, PageSize: 8, CurrentPage: 1 };

        this.opt.Container = this.opt.Container || {};
        this.opt.Container.Header = this.opt.Container.Header || ".page-list-header";
        this.opt.Container.Content = this.opt.Container.Content || ".page-list-content";
        this.opt.Container.Footer = this.opt.Container.Footer || ".page-list-footer";

        //方法部分
        this.opt.Methods.ExtSendParas = this.convertToFunc(this.opt.Methods.ExtSendParas, function () { });
        this.opt.Methods.DataBound = this.convertToFunc(this.opt.Methods.DataBound, function () { });
        this.opt.Methods.GetDataFunc = this.convertToFunc(this.opt.Methods.GetDataFunc);

        this.opt.Methods.HeaderFormat = this.convertToFunc(this.opt.Methods.HeaderFormat);
        this.opt.Methods.RowFormat = this.convertToFunc(this.opt.Methods.RowFormat);
        this.opt.Methods.FooterFormat = this.convertToFunc(this.opt.Methods.FooterFormat);
      

        //  头部html格式化
        if (!this.opt.Methods.HeaderFormat) {
            this.opt.Methods.HeaderFormat = function (headers) {
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
        if (!this.opt.Methods.RowFormat) {
            this.opt.Methods.RowFormat = function (row, headers) {
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
        if (!this.opt.Methods.FooterFormat) {
            this.opt.Methods.FooterFormat = function (page) {
                // 1.  分页
                var numSidCount = 4;
                var pageHtml = "";
                if (page.TotalPage > 0) {
                    pageHtml += "<div class=\"col-xs-12 col-md-6\">" +
                        "<ul id='pagination' class=\"pagination\" style=\"margin: 0px;\">";
                    if (page.CurrentPage > 1) {
                        pageHtml += "<li><a data-osgrid-goto=\"1\" href=\"javascript:void(0);\">首页</a></li>";
                    }
                    if (page.CurrentPage > numSidCount + 1) {
                        pageHtml += "<li class=\"disabled\"><a href=\"#\">...</a></li>";
                    }
                    for (var i = page.CurrentPage - numSidCount > 0 ? page.CurrentPage - numSidCount : 1; i < page.CurrentPage; i++) {
                        pageHtml += "<li><a  data-osgrid-goto=\"" + i + "\" href=\"javascript:void(0);\">" + i + "</a></li>";
                    }

                    pageHtml += "<li class=\"active\"><a href=\"javascript:void(0);\">" + page.CurrentPage + "</a></li>";

                    for (var j = page.CurrentPage + 1; j <= page.TotalPage && j <= page.CurrentPage + numSidCount; j++) {
                        pageHtml += " <li><a data-osgrid-goto=\"" + j + "\" href=\"javascript:void(0);\">" + j + "</a></li>";
                    }
                    if (page.CurrentPage + numSidCount < page.TotalPage) {
                        pageHtml += " <li class=\"disabled\"><a href=\"#\">...</a></li>";
                    }
                    if (page.CurrentPage < page.TotalPage) {
                        pageHtml += "<li><a data-osgrid-goto=\"" + page.TotalPage + "\" href=\"javascript:void(0);\">末页</a></li>";
                    }
                    pageHtml += " </ul ></div> ";
                }
                // 2.  下拉框

                // 3.  显示总数
                var countHtml = "<div class=\"col-xs-12 col-md-6\"><span style=\"line-height: 2.5\">第 " + page.CurrentPage + " 页，总 " + page.TotalPage + " 页，总 " + page.Total + " 条记录 </span></div>";

                return pageHtml + countHtml;
            }
        }

        //   如果不存在templateid  说明使用默认模板
        var templateId = this.element.attr("data-grid-template");
        var templateHtml = !!templateId ? $(templateId).html() : "";
        templateHtml = templateHtml || defaultTemplate;
        this.element.prepend(templateHtml);
    };

    OSGrid.prototype = {
        constructor: OSGrid,

        reload: function () {
            this.opt.Page.CurrentPage = 1;
            this.opt.Page.TotalPage = 0;
            this.render();
        },

        refresh: function () {
            this.render();
        },

        //  执行控件渲染
        render: function render() {

            var os = this;
            var page = os.opt.Page;
            var sendData = os.opt.Methods.ExtSendParas();
            sendData = $.extend(true, sendData, page);

            var contentContainer = os.opt.Container.Content;
            var $content = os.element.find(contentContainer);
            $content.html("<tr><td colspan=" + os.opt.Headers.length + ">加载中...</td></tr>");

            this.opt.Methods.GetDataFunc(sendData, function (data) {

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

            if (!!this.opt.IsDisplayHeader
                && !this.element.hasInitialHeader) {

                var headerContainer = this.opt.Container.Header;
                var html = this.opt.Methods.HeaderFormat(this.opt.Headers);

                if (!!html) {
                    this.element.find(headerContainer).html(html);
                }
                this.element.hasInitialHeader = true;
            }
        },

        //初始化加载内容
        initailContent: function (data) {

            var dataList = data.Data;

            var contentContainer = this.opt.Container.Content;
            var $content = this.element.find(contentContainer);
            $content.html("");

            if (!!dataList) {

                for (var d = 0; d < dataList.length; d++) {
                    var dataItem = dataList[d];
                    var html = this.opt.Methods.RowFormat(dataItem, this.opt.Headers);
                    $content.append(html);
                }
            } else {
                $content.html("<tr><td colspan=" + this.opt.Headers.length + ">暂无数据！</td></tr>");
            }

        },

        //初始化加载页尾分页等信息
        initailFooter: function (data) {
            var os = this;
            var footerContainer = os.opt.Container.Footer;
            var $footer = os.element.find(footerContainer);

            if (this.opt.Page.IsPage) {
                $footer.show();

                //   前端根据  data-osgrid-goto  确定跳转页面 
                os.opt.Page.Total = data.Total;
                os.opt.Page.TotalPage = data.TotalPage;

                var html = os.opt.Methods.FooterFormat(os.opt.Page);
                $footer.html(html);

                $footer.find("[data-osgrid-goto]").unbind("click").bind("click",
                    function () {
                        os.goToPage($(this), os);
                    });
            } else {
                $footer.hide();
            }
            this.opt.Methods.DataBound();
        },
        goToPage: function ($a, os) {

            var page = parseInt($a.attr("data-osgrid-goto"));
            page = page != 'NaN' ? page : 1;

            os.opt.Page.CurrentPage = page;

            os.render();
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
        IsDisplayHeader: true,

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
            GetDataFunc: function (pageData, loadDataFunc) { },

            //数据绑定完成之后
            DataBound: function () { }
        }
    }

    //  避免其他地方已经定义，作为避免冲突保留项
    var old = $.fn.osgrid;



    //  设置jQuery插件对象
    $.fn.osgrid = function (option) {

        var args = Array.apply(null, arguments);
        args.shift();

        var internalReturn;

        this.each(function () {

            var $this = $(this);

            var cacheData = $this.data('os.grid');
            var options = typeof option == 'object' && option;

            if (!cacheData) {
                options = $.extend(true, {}, defaultOption, options);
                $this.data('os.grid', (cacheData = new OSGrid(this, options)));
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
    $.fn.osgrid.constructor = OSGrid;

    // 表格冲突处理
    $.fn.osgrid.noConflict = function () {
        $.fn.osgrid = old;
        return this;
    };

}(window.jQuery);
