# 记录开发DIY单选多选框背后的逻辑

最近在工程中前端的同事编码时遇到的一些问题“实现的控件样式好看，但是实际体验不好，显示效果常出现意料之外的情况，BUG频出”。这帮助他修bug的同时也促使我最近一直在思考一个问题，作为一个HTML工程师，要实现一些DIY控件，很多时候重心都放在让控件样式优美这类可以直观感受的指标上，隐藏在背后的指标很容易就被忽略——封闭而完备的状态转移逻辑。

BUG频繁出现，最根本的原因就是代码的逻辑并不完备。如何才能如何实现代码才能确保逻辑完备，并没有一套100%通用的方法。因此，打算从这篇笔记开始，记录下问题思考的轨迹，解决问题过程中抽象的模型，状态自动机的转移过程等等，以备将来迭代优化时使用。


## 一、单选框和多选框的异同
![sample](sample.gif)

### 相同点：
它们都是由一个文本输入框和一个备选词框构成。文本输入框都显示当前已经选择的内容。都可以直接在框中输入文字检索。都可以直接点击选定备选词框中符合要求的候选词。此外，当输入内容和备选内容一致时，都可以自动选定备选内容。非输入状态下，备选词框不可见。


### 不同点：
单选框只能选一个词，多选框可以选多个。

从上面的对比来看，单选框和多选框绝大部分都是相同的，只有可选词数目不同而已。因此，在模型抽象时，可以把两者合二为一，从而简化分析和编码的难度。

## 二、模型
从相同点分析中可以得出，框架模型由一个文本输入框（text）和一个列表（list）备选词框构成，list存在显示和隐藏两种状态（1显示/0隐藏，是否显示list由text是否有是否有焦点决定）。

事件模型（状态转移）包括：1、响应text的input事件（keyup事件在粘贴时失效），触发备选词变更。2、tap和click事件，触发选定和取消候选词。3、text的focus/blur事件，触发备选词的显示/隐藏。

从不同点分析，模型需要一个状态当前在编辑的候选词，由于已经选定和正在编辑的候选词，都在text中显示着，所以可以使用selectionStart获取的光标的位置才计算当前正在编辑的候选词。（对于单选框而言，正在编辑的候选词只能是第一个词。多选框不一样，可以编辑“，”之间的任何一个候选词）。

## 三、状态转移过程

焦点 | 编辑词 | 词数 | 事件（所有输入词语集合I，所有选项集合C，点击词语T） | 转移至 | 焦点 | 编辑词 | 词数 | 说明
--- | ------ | ---- | ----------------------------------------------- | ----- | ---- | ----- | ---- | ---
 0  |  Null  | N    | Text.focus                                      |       | 1    |  Y    | N    | 激活控件进入输入状态，
 1  |  X     | N    | Text.click                                      |       | 1    |  Y    | N    | 更改光标位置，变更编辑词
 1  |  X     | N    | List.click, T ∈ I                              |       |  1   |   Y   | N - 1 | 去掉输入词中包含的T
 1  |  X     | N    | List.click,T∉I,X≠T,X∈C                         |       |  1   |  X    | N+1   | I集合中新增一个词T
 1  |  X     | N    | List.click,T∉I,X≠T,X∉C                          |       | 1    | T     | N     | I集合中将X替换成T
 1  |  X     | N    | Text.Input                                      |       |  1   |  Y     | N     | 词语X变更成新的词语Y
 1  |  X     | N    | Text.input 分隔符（，、）                        |       |  1   |  Y     | N+1   | 输入分隔符，新增加一个词语
 1  |  X     | N    | Text.blur                                       |        | 0    | Null   | M    | 控件失焦，退出输入状态，求I和C的交集，作为最终选词
 
 

## 四、构造候选词
 
 经过状态转移之后，产生的新集合I，检查C中的每一个词语str，只要集合I中的任何一个元素是str的子串，则str就是可能的候选词。如果str和I中的某一个元素完全一样，那么str就是一个选中的词语。
 
 
## 五、代码

### 绑定事件
从状态转移分析，需要click事件和focus事件

```javascript
// 获得焦点
tmpInput.focus(function() {
    // 获取输入框的值
    var data = $(this).val();
    // 获取当前光标位置，用来分析正在编辑的词
    inputOffset = this.selectionStart;
    // 寻找候选词
    findCandidate(data, null, inputOffset, false);
});

// 失去焦点
// 因为点击list的候选词，也会导致失去焦点
// 因此，设定一个延时，如果在延时内点击了list，那么就不执行失去焦点的处理逻辑
tmpInput.blur(function(){ 
    TimeOn = setTimeout(function(){realBlur();}, 400);       
});




// 绑定list的点击事件
$(obj).on('click','.drop-down-li',function(event) { 
    // 停止执行失焦事件相关逻辑
    clearTimeout(TimeOn);
    // 获取候选次T
    var text = $(this).attr('data-name');             
    // 获取已输入内容，切分后就是I
    var data = tmpInput.val();
    // 检查I中是否存在T，如果存在就将I中的T去掉
    var isSelected = true;
    if($(this).find('.checkbox-style').hasClass('active')){
        isSelected = false;
        data = dataRemove(data, text);
        text = null;
    } 
    // 寻找候选词
    findCandidate(data, text, inputOffset, isSelected);
    event.stopPropagation();
    // 保持输入框的焦点
    tmpInput.trigger('focus');
});

// 输入框内容改变
$(obj).on('input', 'input', function(){
    // 记录光标所在位置
    inputOffset = this.selectionStart;
    // 获取已输入内容
    var data = $(this).val();
    findCandidate(data, null, inputOffset, false);
});
```

### 寻找候选词

```javascript
function findCandidate(origalData, selectedData, offset, isSelected) {
    // 构造集合I
    var list = dataSplite(origalData, selectedData, offset, isSelected);
    var candidate = [];
    var show = [];
    
    // 遍历集合C
    for (var i in listSet) {
        var f = 0;
        // 和I中的元素进行比较
        // f = 0 表示 不是候选词
        // f = 1 表示 是 候选词
        // f = 2 表示 是 选中的词语
        for (var j in list) {
            var ret = targetCmp(list[j].data, listSet[i].name);
            if (ret == 1 && list[j].discard) continue;
            if (ret > f) f = ret;
        }
        if (f > 0) {
            candidate.push({id:listSet[i].id, name:listSet[i].name, flag: f});
        }
    }
    // 自动修正输入框中的文字
    for (var j in list) {
        // list[j].discard表示是正在编辑的词语，此时，选定的词语T一定在list[j+1]
        // 如果list[j]！= T，那么这个正在编辑的词语要就被T替换掉，不再显示
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
```

### 部分源码
[JS源码](chosen.js)
