// ==UserScript==
// @name         知乎标题关键词屏蔽（精简版·可拖动·可最小化·带关键词列表）
// @namespace    https://github.com/
// @version      1.4
// @description  知乎关键词屏蔽精简版，无正则，保留极简关键词列表，支持面板拖动+最小化，省内存
// @author       你的名字
// @match        *://*.zhihu.com/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // 本地存储 key（仅保存关键词，无多余数据，省内存）
    const STORAGE_KEY = 'zhihu_block_keywords_simple';

    // 获取关键词（精简逻辑，减少内存占用）
    function getWords() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
        catch { return []; }
    }

    // 保存关键词
    function saveWords(words) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
    }

    // 核心过滤：标题包含关键词就隐藏整条内容（精简匹配逻辑，提升效率）
    function filterContent() {
        const words = getWords().map(w => w.toLowerCase().trim()).filter(Boolean);
        if (words.length === 0) return;

        // 匹配所有知乎文章卡片（推荐页/关注页/回答页），精简选择器，减少性能消耗
        document.querySelectorAll('.TopstoryItem, .ContentItem, .List-item').forEach(card => {
            const title = card.querySelector('h2, .ContentItem-title, .TopstoryContent-title')?.textContent.toLowerCase() || '';
            if (words.some(word => title.includes(word))) {
                card.style.display = 'none';
            }
        });
    }

    // ==================== 可拖动、可最小化面板（保留极简关键词列表） ====================
    function createPanel() {
        // 主面板（精简尺寸，减少占用）
        const panel = document.createElement('div');
        panel.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 999999;
            width: 240px;
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
            font-size: 14px;
        `;

        // 拖动条（按住可移动面板）
        const dragBar = document.createElement('div');
        dragBar.style.cssText = `
            padding: 8px 12px;
            background: #f5f5f5;
            cursor: move;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        dragBar.textContent = '知乎关键词屏蔽';

        // 最小化按钮
        const minimizeBtn = document.createElement('span');
        minimizeBtn.textContent = '−';
        minimizeBtn.style.cssText = 'cursor: pointer; font-weight: bold;';
        dragBar.appendChild(minimizeBtn);
        panel.appendChild(dragBar);

        // 内容区（输入框+关键词列表+清空按钮，极简渲染，省内存）
        const content = document.createElement('div');
        content.style.padding = '12px';
        panel.appendChild(content);

        // 关键词输入框
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = '输入关键词，回车添加';
        input.style.cssText = `
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-sizing: border-box;
            margin-bottom: 8px;
        `;
        content.appendChild(input);

        // 极简关键词列表（仅显示关键词+删除按钮，无多余样式，省内存）
        const wordList = document.createElement('div');
        wordList.style.cssText = `
            max-height: 100px;
            overflow-y: auto;
            margin-bottom: 8px;
            font-size: 12px;
        `;
        content.appendChild(wordList);

        // 清空按钮（仅保留清空功能，无多余按钮）
        const clearBtn = document.createElement('button');
        clearBtn.textContent = '清空所有关键词';
        clearBtn.style.cssText = `
            width: 100%;
            padding: 8px;
            background: #f23838;
            color: #fff;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        `;
        content.appendChild(clearBtn);

        // 渲染关键词列表（极简渲染，减少内存消耗）
        function renderWordList() {
            wordList.innerHTML = '';
            const words = getWords();
            if (words.length === 0) {
                const emptyTip = document.createElement('div');
                emptyTip.textContent = '暂无屏蔽关键词';
                emptyTip.style.cssText = 'color: #999; text-align: center; padding: 8px 0;';
                wordList.appendChild(emptyTip);
                return;
            }
            // 极简渲染每个关键词，带删除按钮，无多余样式
            words.forEach((word, index) => {
                const wordItem = document.createElement('div');
                wordItem.style.cssText = `
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 4px 6px;
                    background: #f5f5f5;
                    border-radius: 3px;
                    margin-bottom: 3px;
                `;
                wordItem.textContent = word;

                const deleteBtn = document.createElement('span');
                deleteBtn.textContent = '×';
                deleteBtn.style.cssText = 'color: #f23838; cursor: pointer; margin-left: 6px;';
                deleteBtn.onclick = () => {
                    const newWords = words.filter((_, i) => i !== index);
                    saveWords(newWords);
                    renderWordList();
                    filterContent();
                };

                wordItem.appendChild(deleteBtn);
                wordList.appendChild(wordItem);
            });
        }

        // ==================== 拖动功能（精简逻辑，减少内存占用） ====================
        let isDragging = false, startX, startY, left, top;
        dragBar.onmousedown = e => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            left = panel.offsetLeft;
            top = panel.offsetTop;
            document.body.style.userSelect = 'none'; // 拖动时禁止选中文本
        };
        document.onmousemove = e => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            panel.style.left = left + dx + 'px';
            panel.style.top = top + dy + 'px';
            panel.style.right = 'auto'; // 取消固定右侧，方便自由拖动
        };
        document.onmouseup = () => {
            isDragging = false;
            document.body.style.userSelect = ''; // 拖动结束恢复选中文本
        };

        // ==================== 最小化功能 ====================
        let minimized = false;
        minimizeBtn.onclick = () => {
            minimized = !minimized;
            content.style.display = minimized ? 'none' : 'block'; // 最小化隐藏内容区（含列表）
            minimizeBtn.textContent = minimized ? '□' : '−'; // 切换按钮图标
            dragBar.textContent = minimized ? ' 屏蔽已最小化' : '知乎关键词屏蔽';
            dragBar.appendChild(minimizeBtn); // 重新添加按钮，避免错位
        };

        // ==================== 关键词操作（精简，贴合需求） ====================
        // 回车添加关键词
        input.onkeydown = e => {
            if (e.key !== 'Enter') return;
            const word = input.value.trim();
            if (!word) return;
            const words = getWords();
            if (!words.includes(word)) { // 避免重复添加，减少冗余
                saveWords([...words, word]);
                renderWordList();
                filterContent(); // 添加后立即过滤
            }
            input.value = ''; // 清空输入框，方便继续添加
        };

        // 点击添加关键词（兼容回车，操作更灵活）
        input.addEventListener('change', () => {
            const word = input.value.trim();
            if (!word) return;
            const words = getWords();
            if (!words.includes(word)) {
                saveWords([...words, word]);
                renderWordList();
                filterContent();
            }
            input.value = '';
        });

        // 清空所有关键词
        clearBtn.onclick = () => {
            if (confirm('确定清空所有关键词吗？')) {
                saveWords([]);
                renderWordList();
                filterContent(); // 清空后恢复显示所有内容
            }
        };

        // 初始渲染关键词列表
        renderWordList();

        // 添加面板到页面
        document.body.appendChild(panel);
    }

    // ==================== 初始化（精简延迟，提升加载速度） ====================
    setTimeout(() => {
        createPanel();
        filterContent();

        // 监听页面动态加载（无限滚动），持续过滤，精简监听逻辑
        const observer = new MutationObserver(filterContent);
        observer.observe(document.body, { childList: true, subtree: true });
    }, 1200); // 延迟1.2秒，兼顾加载速度和页面渲染完成度
})();
