// ==UserScript==
// @name         雪球一键屏蔽用户
// @namespace    https://github.com/
// @version      1.1
// @description  雪球帖子/评论一键屏蔽用户，本地隐藏，屏蔽后不刷新页面直接消失，兼容数字、字母、混合格式用户名
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

    // 读取屏蔽列表
    function getBlockList() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch (e) {
            return [];
        }
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
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

    // 隐藏已屏蔽用户的内容
    function hideBlockedUsers() {
        const blocked = getBlockList();
        document.querySelectorAll('a.user-name').forEach(el => {
            const uid = getUserId(el);
            if (!uid) return;
            const item = el.closest('article, .post-item, .timeline__item, .comment-item');
            if (item && blocked.includes(uid)) {
                item.style.display = 'none';
            }
        });
    }

    // ====================== 可拖动 + 最小化面板 + 导入导出 ======================
    function createPanel() {
        const panel = document.createElement('div');
        panel.style.cssText = `
            position:fixed !important;
            top:100px !important;
            right:20px !important;
            z-index:999999 !important;
            width:180px !important;
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

        const importBtn = document.createElement('button');
        importBtn.textContent = "导入屏蔽列表";
        importBtn.style.cssText = "width:100%;padding:6px;margin-bottom:6px;background:#4CAF50;color:white;border:none;border-radius:4px;";

        const exportBtn = document.createElement('button');
        exportBtn.textContent = "导出屏蔽列表";
        exportBtn.style.cssText = "width:100%;padding:6px;background:#167dff;color:white;border:none;border-radius:4px;";

        content.appendChild(importBtn);
        content.appendChild(exportBtn);
        document.body.appendChild(panel);

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
                new FileReader().onload = ev => {
                    const users = ev.target.result.split(/\n/).map(i=>i.trim()).filter(Boolean);
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
                    renderButtons();
                    hideBlockedUsers();
                    alert("导入成功");
                };
                inp.readAsText(f);
            };
            inp.click();
        };
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
