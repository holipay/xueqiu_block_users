// ==UserScript==
// @name         雪球一键屏蔽用户
// @namespace    https://github.com/
// @version      1.3
// @description  雪球帖子/评论一键屏蔽用户，本地隐藏，屏蔽后不刷新页面直接消失，兼容数字、字母、混合格式用户名。支持远程URL合并屏蔽列表。
// @author       holipay
// @match        *://xueqiu.com/*
// @grant        none
// @run-at       document-idle
// @license      MIT
// @copyright    2026 holipay
// ==/UserScript==

// 雪球本地屏蔽脚本

(function() {
    'use strict';

    const STORAGE_KEY = 'xueqiu_block_users';
    const REMOTE_URL_KEY = 'xueqiu_block_remote_url'; // 记住上次使用的远程URL

    // 读取屏蔽列表
    function getBlockList() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch (e) {
            return [];
        }
    }

    // 保存屏蔽列表
    function saveBlockList(list) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }

    // 判断是否已屏蔽
    function isBlocked(uid) {
        return getBlockList().includes(uid);
    }

    // 切换屏蔽状态
    function toggleBlock(el) {
        const uid = getUserId(el);
        if (!uid) return;
        let list = getBlockList();
        if (list.includes(uid)) {
            list = list.filter(id => id !== uid);
            alert('已取消屏蔽');
        } else {
            list.push(uid);
            alert('已屏蔽用户');
        }
        saveBlockList(list);
        renderButtons();
        hideBlockedUsers();
    }

    // ====================== 【核心】从 URL 提取用户ID（只允许 /xxx 格式） ======================
    function getUserId(el) {
        try {
            const href = el.href;
            const url = new URL(href);
            const path = url.pathname;

            // 只匹配：/数字  /字母  组合
            // 不匹配：/S/xxx  /xxx/xxx
            if (!/^\/[A-Za-z0-9]+$/.test(path)) return null;

            return path.slice(1); // 返回 ID
        } catch (e) {
            return null;
        }
    }

    // ====================== 添加屏蔽按钮 ======================
    function renderButtons() {
        document.querySelectorAll('a.user-name').forEach(el => {
            if (el.nextElementSibling?.classList.contains('block-btn')) return;
            const uid = getUserId(el);
            if (!uid) return;

            const btn = document.createElement('span');
            btn.className = 'block-btn';
            btn.textContent = isBlocked(uid) ? ' [已屏蔽]' : ' [屏蔽]';
            btn.style.cssText = `
                color:#f23838 !important;
                margin-left:6px !important;
                cursor:pointer !important;
                font-size:12px !important;
                display:inline-block !important;
                background:#fff !important;
                z-index:999 !important;
            `;
            btn.addEventListener('click', e => {
                e.stopPropagation();
                toggleBlock(el);
            });
            el.parentNode.insertBefore(btn, el.nextSibling);
        });
    }

    // ====================== 【修复】精确隐藏屏蔽用户的内容 ======================
    // 策略：向上遍历 DOM，找到"最小的、只属于该用户"的容器再隐藏
    // 避免误伤帖子中其他用户的内容
    function hideBlockedUsers() {
        const blocked = getBlockList();
        if (!blocked.length) return;

        document.querySelectorAll('a.user-name').forEach(el => {
            const uid = getUserId(el);
            if (!uid || !blocked.includes(uid)) return;

            // 找到该用户名最近的"内容块"，而非整个帖子容器
            const item = findUserContentBlock(el);
            if (item && item.style.display !== 'none') {
                item.style.display = 'none';
            }
        });
    }

    // 向上查找只属于当前用户的最小内容块
    // 核心修复：帖子作者 → 隐藏整个帖子；评论者 → 只隐藏该条评论
    function findUserContentBlock(el) {
        // 先检查是否是帖子作者（user-name 在帖子头部区域）
        const postContainer = el.closest('article, .post-item, .timeline__item, .timeline__item__content, [class*="post"]');
        if (postContainer) {
            // 检查 user-name 是否在帖子头部（作者区域），而非评论区域
            const headerArea = postContainer.querySelector('.post-content__header, .timeline__item__header, [class*="header"], [class*="author"]');
            if (headerArea && headerArea.contains(el)) {
                // 是帖子作者 → 隐藏整个帖子
                return postContainer;
            }
        }

        // 是评论者/回复者 → 找到只包含该用户的最小评论容器
        let node = el.parentElement;
        while (node && node !== document.body) {
            // 如果到达了帖子级别的容器，说明已经超出了评论范围，停下来
            if (node.matches && node.matches('article, .post-item, .timeline__item, .timeline__item__content, [class*="post"]')) {
                // 退回一层，返回评论容器
                break;
            }
            const userNames = node.querySelectorAll('a.user-name');
            if (userNames.length <= 1) {
                // 只包含一个用户 → 这就是该用户的最小内容块
                return node;
            }
            node = node.parentElement;
        }

        // fallback：用通用评论选择器
        return el.closest('.comment-item, .reply-item, [class*="comment"], [class*="reply"]');
    }

    // ====================== 远程更新屏蔽列表 ======================
    async function fetchRemoteBlockList(url) {
        try {
            const resp = await fetch(url, { cache: 'no-store' });
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            const text = await resp.text();
            // 支持每行一个用户ID，忽略空行和注释行(#开头)
            const remoteUsers = text.split(/[\n\r]+/)
                .map(s => s.trim())
                .filter(s => s && !s.startsWith('#'));
            return remoteUsers;
        } catch (e) {
            throw new Error('获取远程列表失败: ' + e.message);
        }
    }

    async function updateFromRemote(url) {
        if (!url || !url.startsWith('http')) {
            alert('请输入有效的URL（以http/https开头）');
            return;
        }
        // 保存URL方便下次使用
        localStorage.setItem(REMOTE_URL_KEY, url);

        try {
            const remoteUsers = await fetchRemoteBlockList(url);
            if (!remoteUsers.length) {
                alert('远程列表为空');
                return;
            }
            const localList = getBlockList();
            const merged = [...new Set([...localList, ...remoteUsers])];
            const newCount = merged.length - localList.length;
            saveBlockList(merged);
            renderButtons();
            hideBlockedUsers();
            alert(`更新完成！远程 ${remoteUsers.length} 个用户，新增 ${newCount} 个，当前共屏蔽 ${merged.length} 个用户`);
        } catch (e) {
            alert(e.message);
        }
    }

    // ====================== 可拖动 + 最小化面板 + 导入导出 + 远程更新 ======================
    function createPanel() {
        const panel = document.createElement('div');
        panel.style.cssText = `
            position:fixed !important;
            top:100px !important;
            right:20px !important;
            z-index:999999 !important;
            width:220px !important;
            background:#fff !important;
            border-radius:6px !important;
            box-shadow:0 0 10px rgba(0,0,0,0.2) !important;
            overflow:hidden !important;
            font-size:14px !important;
        `;

        const dragBar = document.createElement('div');
        dragBar.style.cssText = `
            background:#f5f5f5 !important;
            padding:6px 10px !important;
            cursor:move !important;
            display:flex !important;
            justify-content:space-between !important;
            user-select:none !important;
        `;
        dragBar.textContent = "屏蔽面板";

        const minBtn = document.createElement('span');
        minBtn.textContent = "−";
        minBtn.style.cursor = "pointer";
        dragBar.appendChild(minBtn);
        panel.appendChild(dragBar);

        const content = document.createElement('div');
        content.style.padding = "10px";
        panel.appendChild(content);

        // 远程更新区域
        const remoteSection = document.createElement('div');
        remoteSection.style.cssText = "margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #eee;";

        const remoteLabel = document.createElement('div');
        remoteLabel.textContent = "远程屏蔽列表URL：";
        remoteLabel.style.cssText = "font-size:12px;color:#666;margin-bottom:4px;";
        remoteSection.appendChild(remoteLabel);

        const remoteInput = document.createElement('input');
        remoteInput.type = "text";
        remoteInput.placeholder = "https://example.com/block.txt";
        remoteInput.style.cssText = "width:100%;padding:4px 6px;margin-bottom:4px;border:1px solid #ccc;border-radius:3px;font-size:12px;box-sizing:border-box;";
        // 恢复上次使用的URL
        remoteInput.value = localStorage.getItem(REMOTE_URL_KEY) || '';
        remoteSection.appendChild(remoteInput);

        const remoteBtn = document.createElement('button');
        remoteBtn.textContent = "从URL更新并合并";
        remoteBtn.style.cssText = "width:100%;padding:6px;background:#ff9800;color:white;border:none;border-radius:4px;cursor:pointer;";
        remoteBtn.onclick = () => updateFromRemote(remoteInput.value.trim());
        remoteSection.appendChild(remoteBtn);

        content.appendChild(remoteSection);

        // 导入/导出
        const importBtn = document.createElement('button');
        importBtn.textContent = "导入屏蔽列表(文件)";
        importBtn.style.cssText = "width:100%;padding:6px;margin-bottom:6px;background:#4CAF50;color:white;border:none;border-radius:4px;cursor:pointer;";

        const exportBtn = document.createElement('button');
        exportBtn.textContent = "导出屏蔽列表";
        exportBtn.style.cssText = "width:100%;padding:6px;background:#167dff;color:white;border:none;border-radius:4px;cursor:pointer;";

        // 屏蔽用户数显示
        const countDisplay = document.createElement('div');
        countDisplay.style.cssText = "text-align:center;font-size:12px;color:#999;margin-top:6px;";
        countDisplay.textContent = `当前屏蔽: ${getBlockList().length} 人`;

        content.appendChild(importBtn);
        content.appendChild(exportBtn);
        content.appendChild(countDisplay);
        document.body.appendChild(panel);

        // 更新计数
        function refreshCount() {
            countDisplay.textContent = `当前屏蔽: ${getBlockList().length} 人`;
        }

        // 最小化（不漂移）
        let min = false;
        minBtn.onclick = () => {
            min = !min;
            content.style.display = min ? "none" : "block";
            minBtn.textContent = min ? "□" : "−";
        };

        // 拖动（不飞）
        let dragging = false, startX, startY, rect;
        dragBar.onmousedown = e => {
            dragging = true;
            rect = panel.getBoundingClientRect();
            startX = e.clientX;
            startY = e.clientY;
        };
        document.onmousemove = e => {
            if (!dragging) return;
            panel.style.left = (rect.left + e.clientX - startX) + "px";
            panel.style.top = (rect.top + e.clientY - startY) + "px";
            panel.style.right = "auto";
        };
        document.onmouseup = () => dragging = false;

        // 导出
        exportBtn.onclick = () => {
            const d = getBlockList();
            if (!d.length) return alert("无屏蔽数据");
            const blob = new Blob([d.join("\n")], { type: "text/plain" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "xueqiu-block.txt";
            a.click();
        };

        // 导入
        importBtn.onclick = () => {
            const inp = document.createElement("input");
            inp.type = "file";
            inp.accept = ".txt";
            inp.onchange = e => {
                const f = e.target.files[0];
                if (!f) return;
                const reader = new FileReader();
                reader.onload = ev => {
                    const users = ev.target.result.split(/\n/).map(i=>i.trim()).filter(Boolean);
                    // 合并而非覆盖
                    const merged = [...new Set([...getBlockList(), ...users])];
                    saveBlockList(merged);
                    renderButtons();
                    hideBlockedUsers();
                    refreshCount();
                    alert("导入成功，当前共 " + merged.length + " 个屏蔽用户");
                };
                reader.readAsText(f);
            };
            inp.click();
        };

        // 监听列表变化刷新计数
        setInterval(refreshCount, 2000);
    }

    // 启动
    function init() {
        createPanel();
        renderButtons();
        hideBlockedUsers();

        new MutationObserver(() => {
            renderButtons();
            hideBlockedUsers();
        }).observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === "complete" || document.readyState === "interactive") init();
    else document.addEventListener('DOMContentLoaded', init);
})();
