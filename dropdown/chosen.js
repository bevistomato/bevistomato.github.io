
/**
* 表格下拉列表
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
        var TimeOn = null;
        
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
            clearTimeout(TimeOn);
            tmpInput.focus();
        });
        
        
        $(obj).on('click','.drop-down-li',function(event) { 
            
            var text = $(this).attr('data-name');             
            var data = tmpInput.val();
            var list = process(data, text, inputOffset);
            renderCandidate(list.candidate);
            renderShow(list.list);
            if (isMulti) {
                clearTimeout(TimeOn);
                tmpInput.trigger('focus');
            }
            event.stopPropagation();
            
        });
        
        
        $(obj).on('input', 'input', function(){
            inputOffset = this.selectionStart;
            var data = $(this).val();
            var list = process(data, null, inputOffset);
            renderCandidate(list.candidate);
            renderShow(list.list);
        });
        
        
        
        // 失去焦点
        tmpInput.blur(function(){ 
            TimeOn = setTimeout(function(){realBlur();}, 400);       
        });
        
        // 获得焦点
        tmpInput.focus(function() {
            // 在非编辑状态下，不起用搜索功能
            if($(this).attr("readonly") == true) {
                $(obj).find('.select-icon').focus();
            }
            // TODO：显示备选框
            var data = $(this).val();
            inputOffset = this.selectionStart;
            var list = process(data, null, inputOffset);
                        
            // TODO: 渲染
            renderConfig();
            renderCandidate(list.candidate);
            renderShow(list.list);
            
        });
        
        function realBlur() {
            tmpObj.hide();
            var data = tmpInput.val();
            var list = process(data, null, inputOffset);
            var show = [];
            for (var i in list.list) {
                if (list.list[i].selected) show.push(list.list[i]);
            }
            // TODO: 最终渲染结果
            renderShow(show);
        }
        
        function buildSelection(list) {
            var data = [];
            for (var i in list) {
                if (list[i].selected) data.push(list[i].id);
            }
            
            target = JSON.stringify(data);
            if (!isMulti) {
                for (var i in data) {
                    target = data[i];
                    break;
                }
            }
            
            var old = tmpInput.attr('data-id');
            if (old != target) {
                tmpInput.trigger('change');
            }
            tmpInput.attr('data-id', target);
        }
        
        function getWordList(s, offset) {
            var list = [s];
            if (isMulti) {
                list = s.split(/[,，、]/);
            }
            var ret = [];
            var len = 0;
            for (var i in list) {
                var tmp = {};
                tmp.data = list[i];
                tmp.editing = false;
                if (!isMulti || (len <= offset && len + list[i].length >= offset)) {
                    tmp.editing = true;
                }
                ret.push(tmp);
                len += list[i].length;
                len++;
            }
            return ret;
        }
        
        function removeSelectedWord(list, word) {
            if (word == null) return list;
            var ret = [];
            var found = false;
            var target = {};
            target.data = word;
            target.selected = true;
            target.editing = false;
            target.discard = false;
            for(var i in list) {
                list[i].discard = false;
                if (list[i].data == word) {
                    found = true;
                    list[i].discard = true;
                }
            }
            for(var i in list) {
                if (list[i].discard) continue;
                if (list[i].editing && !found) {
                    if (list[i].selected) ret.push(list[i]);
                    ret.push(target);
                    continue;
                }
                ret.push(list[i]);
            }
            
            return ret;
        }
        
        function checkAllSelected(list) {
            var ret = true;
            for (var i in list) {
                if (!list[i].selected || list[i].cnt > 1) {
                    ret = false;
                    break;
                }
            }
            return ret;
        }
        
        function process(originalData, selectedWord, offset) {
            console.log(originalData, selectedWord, offset);
            var list = getWordList(originalData, offset);
            list = getWordStatus(list);
            list = removeSelectedWord(list, selectedWord);
            var candidate = getCandidate(list);
            console.log(list, candidate);
            return {list: list, candidate: candidate};
            
        }
        
        
        function getWordStatus(list) {
            var ret = [];
            for (var i in list) {
                list[i].selected = false;
                list[i].id = -1;
                list[i].cnt = 0;
                for (var j in listSet) {
                    var ret = targetCmp(list[i].data, listSet[j].name);
                    if (ret == 2) {
                        list[i].id = listSet[j].id;
                        list[i].selected = true;
                    }
                    if (ret > 0) list[i].cnt++;
                }
            }
            return list;
        }
        
        function getCandidate(list) {
            var candidate = [];
            var allSelected = checkAllSelected(list);
            for (var i in listSet) {
                var f = 0;
                for (var j in list) {
                    var ret = targetCmp(list[j].data, listSet[i].name);
                    if (ret > f) f = ret;
                }
                if (f > 0 || allSelected) {
                    candidate.push({id:listSet[i].id, name:listSet[i].name, flag: f});
                }
            }
            return candidate;
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
            var list = [];
            for (var i in data) {
                if (!isMulti) list = [];
                list.push(data[i]);
            }
            var word = "";
            var last = null;
            for (var i in list) {
                if (last != null)
                    word += ",";
                word += list[i].data;
                last = list[i];
            }
            var t = tmpInput.val();
            if (t != word) {
                tmpInput.val(word);
            }
            
            // 构造选择项
            buildSelection(list);
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
