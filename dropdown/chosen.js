
/**
* 表格下拉列表
* @author yzh
*/
$.fn.extend({
    chosen: function(options){
        return this.each(function(input_field) {
            var $this, chosen;
            $this = $(this);
            chosen = $this.data('chosen');
            if (options === 'destroy' && chosen) {
                chosen.destroy();
            } else if (!chosen) {
                $this.data('chosen', new Chosen(this, options));
            } else {
                chosen.options(options);
            }
        });
    }
});
var Chosen =(function(){
    function Chosen(obj, options) {
        var tmpInput = $(obj).find('input');
        var tmpObj = $(obj).find('.search-drop-down-menu');
        var tmpIcon = $(obj).find('.select-icon');
        var listSet = [];//存储所有li的id和name
        
        var outerDiv = '';
        var inputOffset = 0;
        var isMulti = false;
        var showSet = [];
        
        // 参数设置方法
        this.options = function (op) {
            setOptions(op);
        }
        
        function setOuterDiv(data) {
            outerDiv = data;
        }
        function setData(list) {
            //点击过之后就会存储子系统
            console.log(list);
            listSet = list;
        }
        
        function setOptions(options) {
            // 初始化
            if(options['height'] == '100%') {
                var height = $(obj).parent().height();
            } else if (options['height']) {
                var height = options['height'].substr(0,options['height'].length-2);
            }
            if (options['data']) {
                setData(options['data']);
            }
            
            if (options['multi']) {
                isMulti = true;
            }
            if (options['outerDiv']) {
                setOuterDiv(options['outerDiv']);
            }

            if(options['width'] == '100%') { 
                $(obj).css('width','100%');
                $(obj).find('.select-case').css('height',height+'px');
                var num = Number(height) + 14;
                tmpInput.css('width', 'calc(100% - '+num+'px)');   
                tmpObj.css('width',$(obj).outerWidth()+'px');
            }
            else if (options['width']) {
                var width = options['width'].substr(0,options['width'].length-2);
                $(obj).find('.select-case').css({'height': height-2+'px','width': width-2+'px'});
                tmpInput.css('margin-right', -height+2+'px');
                tmpObj.css('width',width+'px');
            }
        }

        //匹配不到就返回0,1包含，2完全一致
        function targetCmp(b, a){
            var flag  = 0;
            if(a.indexOf(b) >= 0) {
                flag = 1;
                if(a == b){
                    flag = 2;
                }
            }
            return flag;
        }
        
        // 事件绑定
        $(obj).on('click','.select-icon', function(event){
            tmpInput.trigger('focus');
        });
        
        $(obj).on('click','.drop-down-li',function(event) { 
            clearTimeout(TimeOn);
            var text = $(this).attr('data-name');             
            var data = tmpInput.val();
            var isSelected = true;
            if($(this).find('.checkbox-style').hasClass('active')){
                isSelected = false;
                data = dataRemove(data, text);
                text = null;
            } 
            findCandidate(data, text, inputOffset, isSelected);
            event.stopPropagation();
            tmpInput.trigger('focus');
        });
        
        
        $(obj).on('input', 'input', function(){
            inputOffset = this.selectionStart;
            var data = $(this).val();
            findCandidate(data, null, inputOffset, false);
        });
        
        
        
        // 失去焦点
        tmpInput.blur(function(){ 
            TimeOn = setTimeout(function(){realBlur();}, 400);       
        });
        
        // 获得焦点
        tmpInput.focus(function() {
            // TODO：显示备选框
            var data = $(this).val();
            inputOffset = this.selectionStart;
            findCandidate(data, null, inputOffset, false);
            renderConfig();
        });
        
        function realBlur() {
            tmpObj.hide();
            var data = tmpInput.val();
            var list = dataSplite(data, null, 0, false);
            var selected = [];
            var show = [];
            var isAll = false;
            for (var i in listSet) {
                for (var j in list) {
                    var ret = targetCmp(list[j].data, listSet[i].name);
                    if (ret == 2) {
                        selected.push(listSet[i].id);
                        show.push(listSet[i].name);
                        if (!isMulti) isAll = true;
                        break;
                    }
                }
                if (isAll) break;
            }
            // TODO: 构造结果
            buildSelection(selected);
            renderShow(show);
        }
        
        function buildSelection(data) {
            if (isMulti == true) {
                tmpInput.attr('data-id', JSON.stringify(data));
            } else {
                for (var i in data) {
                    tmpInput.attr('data-id', data[i]);
                    break;
                }
            }
            
        }
        
        function dataRemove(a, b) {
            var list = [a];
            var ret = "";
            var first = true;
            if (isMulti) {
                list = a.split(/[,，、]/);
            }
            console.log(list, b);
            for (var i in list) {
                var t = targetCmp(list[i], b);
                if (t != 2) {
                    if (!first) ret += ",";
                    ret += list[i];
                    first = false;
                }
            }
            return ret;
        }
        
        function dataSplite(s, t, offset, isSelected) {
            var list = [s];
            if (isMulti) {
                list = s.split(/[,，、]/);
            }
            var ret = [];
            var len = 0;
            for (var i in list) {
                var tmp = {};
                tmp.data = list[i];
                if (t && isSelected) {
                    if (!isMulti || (len <= offset && len + list[i].length >= offset)) {
                        tmp.discard = 1;
                    }
                }
                
                if (isSelected || list[i] != t) {
                    ret.push(tmp);
                }
                if (isSelected && len <= offset && len + list[i].length >= offset) {
                    ret.push({data:t});
                }
                len += list[i].length;
                len++;
            }
            return ret;
        }
        
        function findCandidate(origalData, selectedData, offset, isSelected) {
            console.log(origalData, selectedData, offset, isSelected);
            var list = dataSplite(origalData, selectedData, offset, isSelected);
            var candidate = [];
            var show = [];
            for (var i in listSet) {
                var f = 0;
                for (var j in list) {
                    var ret = targetCmp(list[j].data, listSet[i].name);
                    if (ret == 1 && list[j].discard) continue;
                    if (ret > f) f = ret;
                }
                if (f > 0) {
                    candidate.push({id:listSet[i].id, name:listSet[i].name, flag: f});
                }
            }
            for (var j in list) {
                if (!list[j].discard) {
                    show.push(list[j].data);
                } else if (isMulti) for (var i in listSet) {
                    var ret = targetCmp(list[j].data, listSet[i].name);
                    if (ret == 2) {
                        show.push(list[j].data);
                        break;
                    }
                }
            }
            // TODO: 渲染
            renderCandidate(candidate);
            renderShow(show);
        }
        
        function renderCandidate(data) {
            var tm = "";
            for (var i in data) {
                var flag = data[i].flag > 1 ? 'active':'';
                if (isMulti) {
                    tm += '<li class="drop-down-li" data-id='+data[i].id+' data-name='+data[i].name+' style="display:block"><span class="checkbox-style '+flag+'" style="margin-right: 10px"></span>'+data[i].name+'</li>';
                } else {
                    tm += '<li class="drop-down-li" data-id='+data[i].id+' data-name='+data[i].name+' style="display:block">'+data[i].name+'</li>';
                }
            }
            
            tmpObj.html(tm);
            tmpObj.show();
        }
        
        function renderShow(data) {
            var tm = "";
            var first = true;
            for (var i in data) {
                if (!first)
                    tm += ",";
                tm += data[i];
                first = false;
            }
            var t = tmpInput.val();
            if (t != tm) 
                tmpInput.val(tm);
        }
        
        function renderConfig() {
            try{
                var left = $(obj).find('.select-case').offset().left;
                var top = $(obj).find('.select-case')[0].offsetTop+height;
                
                // TODO: 考虑下拉框上浮
                if(outerDiv != '' && (tmpObj.closest(outerDiv).offset().top + tmpObj.closest(outerDiv).height()) < (tmpObj.offset().top + tmpObj.height())){
                    top = -tmpObj.height();
                }
                
                
                tmpObj.css({'top': top, 'left': left}); 
                if(options['position'] == 'fixed'){
                    tmpObj.css({'position':"fixed"});  
                }
                
                
            } catch(err) {
                
            }
        }

        $(obj).resize(function() {
          $(obj).find('.search-drop-down-menu').css('width', $(obj).outerWidth());
        });
        
        
        setOptions(options);
        $(obj).show();
    }
    
    return Chosen;
})();
