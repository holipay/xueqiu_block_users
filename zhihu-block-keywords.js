// ==UserScript==
// @name         知乎标题关键词屏蔽（带界面可编辑版·支持正则）
// @namespace    https://github.com/
// @version      1.2
// @description  带可视化界面，支持基础关键词+正则表达式高级屏蔽，可直接添加/删除，自动过滤标题匹配内容
// @author       holipay
// @match        *://*.zhihu.com/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // 存储键名（本地保存，刷新不丢失）
    const STORAGE_KEY = 'zhihu_block_keywords';
    const REGEX_STORAGE_KEY = 'zhihu_block_regex'; // 正则表达式存储键
    const REGEX_ENABLE_KEY = 'zhihu_regex_enable'; // 正则开关存储键

    // 初始化屏蔽关键词（从本地获取，没有则默认空数组）
    function getBlockKeywords() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    }

    // 保存屏蔽关键词到本地
    function saveBlockKeywords(keywords) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(keywords));
    }

    // 初始化正则表达式列表（从本地获取，没有则默认空数组）
    function getBlockRegex() {
        try {
            const stored = localStorage.getItem(REGEX_STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    }

    // 保存正则表达式到本地
    function saveBlockRegex(regexList) {
        localStorage.setItem(REGEX_STORAGE_KEY, JSON.stringify(regexList));
    }

    // 获取正则开关状态（默认关闭）
    function getRegexEnable() {
        try {
            const stored = localStorage.getItem(REGEX_ENABLE_KEY);
            return stored ? JSON.parse(stored) : false;
        } catch (e) {
            return false;
        }
    }

    // 保存正则开关状态
    function saveRegexEnable(enable) {
        localStorage.setItem(REGEX_ENABLE_KEY, JSON.stringify(enable));
    }

    // 核心：根据关键词+正则过滤标题，隐藏对应文章
    function filterByKeywordsAndRegex() {
        const keywords = getBlockKeywords().map(word => word.trim().toLowerCase()).filter(word => word);
        const regexList = getBlockRegex().filter(regexStr => regexStr.trim());
        const regexEnable = getRegexEnable();
        // 无关键词且正则未开启/无正则，不执行过滤
        if (keywords.length === 0 && (!regexEnable || regexList.length === 0)) return;

        // 匹配所有知乎文章卡片（推荐页/关注页/回答页）
        const articleCards = document.querySelectorAll('.TopstoryItem, .ContentItem, .List-item');
        articleCards.forEach(card => {
            // 匹配所有可能的标题元素（兼容不同页面结构）
            const titleEl = card.querySelector(
                'h2, .ContentItem-title, [data-za-detail-view-path-item_index] h2, .RichContent h2, .TopstoryContent-title'
            );
            if (!titleEl) return;

            const title = titleEl.textContent.trim().toLowerCase();
            let shouldHide = false;

            // 基础关键词匹配（包含匹配，不区分大小写）
            if (keywords.some(keyword => title.includes(keyword))) {
                shouldHide = true;
            }

            // 正则表达式匹配（开启状态下生效）
            if (regexEnable && regexList.length > 0) {
                regexList.forEach(regexStr => {
                    try {
                        // 忽略大小写，全局匹配
                        const regex = new RegExp(regexStr.trim(), 'i');
                        if (regex.test(title)) {
                            shouldHide = true;
                        }
                    } catch (e) {
                        // 正则表达式错误，跳过该条
                        console.error('正则表达式无效：', regexStr, e);
                    }
                });
            }

            // 满足任一条件，隐藏卡片
            if (shouldHide) {
                card.style.display = 'none';
            }
        });
    }

    // ====================== 可视化操作界面 ======================
    function createUI() {
        // 1. 主容器（悬浮在页面右侧，不遮挡内容）
        const uiContainer = document.createElement('div');
        uiContainer.style.cssText = `
            position: fixed;
            right: 20px;
            top: 80px;
            z-index: 999999;
            width: 280px;
            background: #fff;
            border: 1px solid #eee;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 16px;
            font-size: 14px;
        `;

        // 2. 标题
        const uiTitle = document.createElement('h3');
        uiTitle.textContent = '知乎关键词屏蔽（支持正则）';
        uiTitle.style.cssText = 'margin: 0 0 12px 0; font-size: 16px; color: #333;';
        uiContainer.appendChild(uiTitle);

        // ====================== 基础关键词屏蔽区域 ======================
        const keywordArea = document.createElement('div');
        keywordArea.style.cssText = 'margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #eee;';
        
        const keywordTitle = document.createElement('h4');
        keywordTitle.textContent = '基础关键词屏蔽';
        keywordTitle.style.cssText = 'margin: 0 0 8px 0; font-size: 14px; color: #666;';
        keywordArea.appendChild(keywordTitle);

        // 3. 关键词输入框
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = '输入要屏蔽的关键词，回车添加';
        input.style.cssText = `
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin-bottom: 8px;
            box-sizing: border-box;
        `;
        keywordArea.appendChild(input);

        // 4. 添加按钮
        const addBtn = document.createElement('button');
        addBtn.textContent = '添加关键词';
        addBtn.style.cssText = `
            width: 100%;
            padding: 8px;
            background: #167dff;
            color: #fff;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin-bottom: 12px;
        `;
        keywordArea.appendChild(addBtn);

        // 5. 已屏蔽关键词列表（带删除按钮）
        const keywordList = document.createElement('div');
        keywordList.style.cssText = 'max-height: 120px; overflow-y: auto; margin-bottom: 8px;';
        keywordArea.appendChild(keywordList);

        uiContainer.appendChild(keywordArea);

        // ====================== 正则表达式屏蔽区域 ======================
        const regexArea = document.createElement('div');
        regexArea.style.cssText = 'margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #eee;';
        
        const regexTitle = document.createElement('h4');
        regexTitle.textContent = '正则表达式高级屏蔽';
        regexTitle.style.cssText = 'margin: 0 0 8px 0; font-size: 14px; color: #666;';
        regexArea.appendChild(regexTitle);

        // 正则开关
        const regexSwitch = document.createElement('div');
        regexSwitch.style.cssText = 'display: flex; align-items: center; margin-bottom: 8px;';
        const switchLabel = document.createElement('span');
        switchLabel.textContent = '开启正则屏蔽：';
        switchLabel.style.cssText = 'margin-right: 8px; color: #666;';
        const switchInput = document.createElement('input');
        switchInput.type = 'checkbox';
        switchInput.checked = getRegexEnable();
        switchInput.onchange = () => {
            saveRegexEnable(switchInput.checked);
            filterByKeywordsAndRegex(); // 开关切换后重新过滤
        };
        regexSwitch.appendChild(switchLabel);
        regexSwitch.appendChild(switchInput);
        regexArea.appendChild(regexSwitch);

        // 正则输入框
        const regexInput = document.createElement('input');
        regexInput.type = 'text';
        regexInput.placeholder = '输入正则表达式，回车添加（如：^震惊.*）';
        regexInput.style.cssText = `
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin-bottom: 8px;
            box-sizing: border-box;
        `;
        regexArea.appendChild(regexInput);

        // 正则添加按钮
        const addRegexBtn = document.createElement('button');
        addRegexBtn.textContent = '添加正则表达式';
        addRegexBtn.style.cssText = `
            width: 100%;
            padding: 8px;
            background: #4CAF50;
            color: #fff;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin-bottom: 12px;
        `;
        regexArea.appendChild(addRegexBtn);

        // 已屏蔽正则列表（带删除按钮）
        const regexList = document.createElement('div');
        regexList.style.cssText = 'max-height: 120px; overflow-y: auto; margin-bottom: 8px;';
        regexArea.appendChild(regexList);

        // 正则提示（简单说明）
        const regexTip = document.createElement('div');
        regexTip.textContent = '提示：正则匹配不区分大小写，无效正则会自动跳过';
        regexTip.style.cssText = 'font-size: 12px; color: #999;';
        regexArea.appendChild(regexTip);

        uiContainer.appendChild(regexArea);

        // 6. 清空按钮（区分关键词和正则，新增全部清空）
        const clearContainer = document.createElement('div');
        clearContainer.style.cssText = 'display: flex; gap: 8px; margin-bottom: 0;';
        
        const clearKeywordBtn = document.createElement('button');
        clearKeywordBtn.textContent = '清空关键词';
        clearKeywordBtn.style.cssText = `
            flex: 1;
            padding: 8px;
            background: #f23838;
            color: #fff;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        `;
        
        const clearRegexBtn = document.createElement('button');
        clearRegexBtn.textContent = '清空正则';
        clearRegexBtn.style.cssText = `
            flex: 1;
            padding: 8px;
            background: #f23838;
            color: #fff;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        `;
        
        clearContainer.appendChild(clearKeywordBtn);
        clearContainer.appendChild(clearRegexBtn);
        uiContainer.appendChild(clearContainer);

        // 7. 渲染已有的关键词列表
        function renderKeywordList() {
            keywordList.innerHTML = ''; // 清空列表
            const keywords = getBlockKeywords();
            if (keywords.length === 0) {
                const emptyTip = document.createElement('div');
                emptyTip.textContent = '暂无屏蔽关键词';
                emptyTip.style.cssText = 'color: #999; text-align: center; padding: 10px; font-size: 12px;';
                keywordList.appendChild(emptyTip);
                return;
            }

            // 遍历关键词，每个关键词带删除按钮
            keywords.forEach((word, index) => {
                const wordItem = document.createElement('div');
                wordItem.style.cssText = `
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 6px 8px;
                    background: #f5f5f5;
                    border-radius: 4px;
                    margin-bottom: 4px;
                `;
                wordItem.textContent = word;

                const deleteBtn = document.createElement('span');
                deleteBtn.textContent = '×';
                deleteBtn.style.cssText = 'color: #f23838; cursor: pointer; margin-left: 8px;';
                deleteBtn.onclick = () => {
                    const newKeywords = keywords.filter((_, i) => i !== index);
                    saveBlockKeywords(newKeywords);
                    renderKeywordList();
                    filterByKeywordsAndRegex(); // 删除后重新过滤
                };

                wordItem.appendChild(deleteBtn);
                keywordList.appendChild(wordItem);
            });
        }

        // 8. 渲染已有的正则列表
        function renderRegexList() {
            regexList.innerHTML = ''; // 清空列表
            const regexs = getBlockRegex();
            if (regexs.length === 0) {
                const emptyTip = document.createElement('div');
                emptyTip.textContent = '暂无正则表达式';
                emptyTip.style.cssText = 'color: #999; text-align: center; padding: 10px; font-size: 12px;';
                regexList.appendChild(emptyTip);
                return;
            }

            // 遍历正则，每个正则带删除按钮
            regexs.forEach((regexStr, index) => {
                const regexItem = document.createElement('div');
                regexItem.style.cssText = `
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 6px 8px;
                    background: #f0f8fb;
                    border-radius: 4px;
                    margin-bottom: 4px;
                `;
                regexItem.textContent = regexStr;

                const deleteBtn = document.createElement('span');
                deleteBtn.textContent = '×';
                deleteBtn.style.cssText = 'color: #f23838; cursor: pointer; margin-left: 8px;';
                deleteBtn.onclick = () => {
                    const newRegexs = regexs.filter((_, i) => i !== index);
                    saveBlockRegex(newRegexs);
                    renderRegexList();
                    filterByKeywordsAndRegex(); // 删除后重新过滤
                };

                regexItem.appendChild(deleteBtn);
                regexList.appendChild(regexItem);
            });
        }

        // 9. 绑定按钮事件
        // 回车添加关键词
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const word = input.value.trim();
                if (word && !getBlockKeywords().includes(word)) {
                    const newKeywords = [...getBlockKeywords(), word];
                    saveBlockKeywords(newKeywords);
                    input.value = '';
                    renderKeywordList();
                    filterByKeywordsAndRegex(); // 添加后重新过滤
                }
            }
        });

        // 点击添加关键词
        addBtn.addEventListener('click', () => {
            const word = input.value.trim();
            if (word && !getBlockKeywords().includes(word)) {
                const newKeywords = [...getBlockKeywords(), word];
                saveBlockKeywords(newKeywords);
                input.value = '';
                renderKeywordList();
                filterByKeywordsAndRegex(); // 添加后重新过滤
            }
        });

        // 回车添加正则
        regexInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const regexStr = regexInput.value.trim();
                if (regexStr && !getBlockRegex().includes(regexStr)) {
                    const newRegexs = [...getBlockRegex(), regexStr];
                    saveBlockRegex(newRegexs);
                    regexInput.value = '';
                    renderRegexList();
                    filterByKeywordsAndRegex(); // 添加后重新过滤
                }
            }
        });

        // 点击添加正则
        addRegexBtn.addEventListener('click', () => {
            const regexStr = regexInput.value.trim();
            if (regexStr && !getBlockRegex().includes(regexStr)) {
                const newRegexs = [...getBlockRegex(), regexStr];
                saveBlockRegex(newRegexs);
                regexInput.value = '';
                renderRegexList();
                filterByKeywordsAndRegex(); // 添加后重新过滤
            }
        });

        // 清空关键词
        clearKeywordBtn.addEventListener('click', () => {
            if (confirm('确定要清空所有屏蔽关键词吗？')) {
                saveBlockKeywords([]);
                renderKeywordList();
                filterByKeywordsAndRegex(); // 清空后重新过滤
            }
        });

        // 清空正则
        clearRegexBtn.addEventListener('click', () => {
            if (confirm('确定要清空所有正则表达式吗？')) {
                saveBlockRegex([]);
                renderRegexList();
                filterByKeywordsAndRegex(); // 清空后重新过滤
            }
        });

        // 初始渲染列表
        renderKeywordList();
        renderRegexList();

        // 添加到页面
        document.body.appendChild(uiContainer);
    }

    // ====================== 初始化执行 ======================
    setTimeout(() => {
        // 先创建界面，再执行过滤
        createUI();
        filterByKeywordsAndRegex();

        // 监听页面动态加载（无限滚动），持续过滤
        const observer = new MutationObserver(filterByKeywordsAndRegex);
        observer.observe(document.body, { childList: true, subtree: true });
    }, 1500); // 延迟1.5秒，确保页面完全加载
})();
