var $ = layui.$, jQuery = layui.jquery, layer = layui.layer, form = layui.form, table = layui.table,
    element = layui.element, laydate = layui.laydate;

/* 按数据集字段渲染表格 */
$.extend({
    autoTbl: function (cfg, def) {
        cfg = cfg || {};
        def = def || {};
        //.CSRF 保护
        let csrf_token = $('meta[name=csrf-token]').attr('content');
        cfg["headers"] || (cfg["headers"] = {});
        var o_ins;
        //.PS：请用标准的 {code: 0, msg: '', count: 0, data: []}，该函数未做自定义参数兼容
        //.必须要有数据集，才开始渲染表格
        if (cfg["r"]) {
            var cols = [[]];
            //.单元格宽度，默认自适应，2.2.0 新增，还是手动强
            cfg["w"] = cfg["w"] || null;
            if (cfg["cols"]) {
                //.优先使用传参中的列配置
                cols = cfg["cols"];
            } else {
                //.附加的表头, 前置: [{cols},{cols}]
                $.each(def["before"], function (k, v) {
                    cols[0].push(v);
                });
                //.提取数据集中的字段
                if ($.isEmptyObject(cfg["r"]["data"][0])) {
                    //.数据集为空时的默认列配置
                    cols = [[{
                        field: "null",
                        title: "无数据",
                        width: cfg["w"]
                    }]];
                } else {
                    // 指定字段及顺序优先
                    var fields = cfg["colsFields"] || Object.keys(cfg["r"]["data"][0]);
                    $.each(fields, function (_, field) {
                        var col = {
                            field: field,
                            title: $.fxmlchars(field)
                        };
                        // 默认对齐方式
                        cfg["colsAlign"] && (col["align"] = cfg["colsAlign"]);
                        cfg["w"] && (col['width'] = cfg["w"]);
                        //.优先使用传参中的字段配置: {field: {cols.option}}
                        def["main"] && def["main"][field] && $.each(def["main"][field], function (k, v) {
                            col[k] = v;
                        });
                        cols[0].push(col);
                        //.字段的附加字段, 如计算的%, 可以是多个, 单个值为完整字段配置: {field: [{cols},{cols}]}
                        def["main_add"] && def["main_add"][field] && $.each(def["main_add"][field], function (k, v) {
                            v && cols[0].push(v);
                        });
                    });
                }
                //.附加的表头, 后置: [{cols},{cols}]
                $.each(def["after"], function (k, v) {
                    cols[0].push(v);
                });
            }
            if (cfg["t"]) {
                //.静态表格，非数据表格
                var colgroup = "";
                var thead = "";
                var tbody = "";
                //.数据请求完成表格渲染前时回调
                typeof cfg["parseData"] === "function" && (cfg["r"] = cfg["parseData"](cfg["r"]));
                //.表格配置及表头
                $.each(cols[0], function (k, v) {
                    colgroup += v["width"] ? '<col width="' + v["width"] + '">' : '<col>';
                    thead += "<th>" + v["title"] + "</th>";
                });
                //.表格数据
                $.each(cfg["r"]["data"], function (i, row) {
                    tbody += "<tr>";
                    //.表格行数据，按表头字段取值
                    $.each(cols[0], function (k, v) {
                        tbody += "<td>" + (row[v["field"]] === undefined ? "" : row[v["field"]]) + "</td>";
                    });
                    tbody += "</tr>";
                });
                //.其他配置项
                var css = "layui-table" + (cfg["css"] ? " " + cfg["css"] : "");
                var add = cfg["add"] ? " " + cfg["add"] : "";
                var size = cfg["size"] ? ' lay-size="' + cfg["size"] + '"' : "";
                //.返回静态表格 HTML
                var tbl = '<table class="' + css + '"' + size + add + ">" + "<colgroup>" + colgroup + "</colgroup>" + "<thead>" + thead + "</thead>" + "<tbody>" + tbody + "</tbody>" + "</table>";
                //.完成时回调
                typeof cfg["done"] === "function" && cfg["done"](tbl, cfg["r"]);
                return tbl;
            } else {
                //.数据表格渲染参数集
                var option = {};
                //.配置参数
                $.each(cfg, function (k, v) {
                    //.表格类型，结果集，请求参数，表格列默认宽度，这四个参数特殊用途（避免后期与官方参数冲突，用单字母）
                    k == "t" || k == "r" || k == "d" || k == "w" || (option[k] = v);
                });
                //.必要的参数处理
                option["elem"] || (option["elem"] = cfg["elem"] ? cfg["elem"] : cfg["id"] ? "#" + cfg["id"] : "#tbl_main");
                option["id"] || (option["id"] = cfg["id"] ? cfg["id"] : cfg["elem"] ? cfg["elem"].replace("#", "").replace(".", "") : "tbl_main");
                //.2.1.7 非异步数据时不分页这参数也会生效，修正
                option["limit"] = option["limit"] || cfg["limit"] || (cfg["page"] ? 60 : 99999);
                option["data"] = cfg["r"]["data"] || []; //.data 为了进入已知数据渲染
                option["setRes"] = cfg["r"]; //.用原始数据集进入渲染，为了回调时可使用原始数据集
                option["setCount"] = option["setCount"] || cfg["r"]["count"];  //.记录总数
                option["cols"] = cols;
                //.需要分页且不是已知数据分页时的处理
                if (option["page"] && !option["dataPage"]) {
                    //.在得到 cols 后，以下二个参数将写入当前实例参数中，后续由实例自身的 laypage 接管请求
                    option["setUrl"] = cfg["d"]["url"];
                    option["setWhere"] = cfg["d"]["where"];
                }
                //.请求状态及消息，以下两个参数用于模拟 Ajax 请求后表格主体上显示的错误消息
                option["firstCode"] = cfg["r"]["code"];
                option["firstMsg"] = cfg["r"]["msg"];
                //.表格翻页时回调，可动态附加请求参数，第一页除外，默认会附加 总页数 count 字段，需要返回 obj
                option["myJump"] = cfg["myJump"] || null;
                //.自动宽度时全局最小列宽（系统默认 60）
                option["cellMinWidth"] = option["cellMinWidth"] || 110;
                //.请求头
                option["headers"] = cfg["headers"];
                //.返回方法级渲染实例
                o_ins = table.render(option);
                typeof option["myIns"] === 'function' && option["myIns"](o_ins);
                return o_ins;
            }
        } else {
            //.先呈现一个带加载图标的占位表格
            var tmp = {
                elem: cfg["elem"],
                id: cfg["id"],
                size: cfg["size"],
                height: cfg["height"],
                loading: true,
                autoSort: false,
                data: [],
                cols: cfg["cols"] || [[{title: "..."}]],
                text: {none: '<i class="layui-icon layui-icon-loading layui-anim layui-anim-rotate layui-anim-loop f32 p20"></i>'}
            };
            o_ins = table.render(tmp);
            //.异步请求数据（最后使用回调取得结果）
            var ret = null;
            $.ajax({
                url: cfg["d"]["url"],
                type: cfg["method"] || "POST",
                data: cfg["d"]["where"],
                dataType: cfg["dataType"] || "json",
                headers: cfg["headers"],
                beforeSend: function (xhr, settings) {
                    if (csrf_token && !/^(GET|HEAD|OPTIONS|TRACE)$/i.test(settings.type) && !this.crossDomain) {
                        xhr.setRequestHeader("X-CSRFToken", csrf_token);
                        cfg["headers"]["X-CSRFToken"] = csrf_token;
                    }
                }
            }).done(function (r) {
                if ($.isEmptyObject(r["data"]) || $.isEmptyObject(r["data"][0]) || r["code"] > 1) {
                    //.0 和 1 由表格显示消息或渲染数据，否则中止渲染弹出消息层
                    //.initSort 存在时, 默认的 无数据 提示将无效, 故统一判断数据集是否为空
                    o_ins.reload({
                        data: [],
                        cols: [[{title: ""}]],
                        text: {none: r["msg"] || "暂无相关数据"}
                    });
                } else {
                    //.用已知数据渲染表格
                    cfg["r"] = r;
                    ret = $.autoTbl(cfg, def);
                }
            }).fail(function (jqXHR, textStatus) {
                o_ins.reload({
                    autoSort: false,
                    data: [],
                    cols: [[{title: ""}]],
                    text: {none: "数据加载失败, 请稍后重试"}
                });
            });

            return ret;
        }
    }
});

/* 替换 XML 特殊字符 */
$.extend({
    fxmlchars: function (a) {
        if (a) {
            var b = ["_x003C_", "_x003E_", "_x0022_", "_x002A_", "_x0025_", "_x0026_", "_x0028_", "_x0029_", "_x003D_"],
                c = ["&lt;", "&gt;", "&quot;", "*", "%", "&amp;", "(", ")", "="];
            $.each(b, function (b, d) {
                a = a.toString().replace(new RegExp(d, "gm"), c[b])
            });
            return a.replace(new RegExp("_x003(\\d+)_", "gm"), "$1")
        }
        return ""
    }
});

/* $('form').serializeJson(); */
$.fn.serializeJson = function () {
    let a = {}, b = this.serializeArray();
    $.each(b, function () {
        if (a[this.name]) {
            a[this.name].push || (a[this.name] = [a[this.name]]);
            a[this.name].push(this.value || "")
        } else a[this.name] = this.value || ""
    });
    return a
};
