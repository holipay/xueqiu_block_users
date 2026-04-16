// ==UserScript==
// @name         雪球一键屏蔽用户（纯净版·不刷新·兼容字母+数字ID）
// @namespace    https://github.com/
// @version      1.0
// @description  雪球帖子/评论一键屏蔽用户，本地隐藏，屏蔽后不刷新页面直接消失，兼容数字、字母、混合格式用户名
// @author       holipay
// @match        *://xueqiu.com/*
// @grant        none
// @run-at       document-idle
// @license      MIT
// @copyright    2026 holipay
// ==/UserScript==

// 雪球本地屏蔽脚本
// 功能：一键屏蔽用户，即时隐藏，无需刷新，兼容所有用户名格式

(function() {
    'use strict';
    const BLOCK_KEY = 'xueqiu_block_users';

    // 获取屏蔽列表
    function getBlockList() {
        try {
            return JSON.parse(localStorage.getItem(BLOCK_KEY)) || [];
        } catch {
            return [];
        }
    }

    // 保存屏蔽列表
    function saveBlock(list) {
        localStorage.setItem(BLOCK_KEY, JSON.stringify(list));
    }

    // 判断是否已屏蔽
    function isBlocked(uid) {
        return uid && getBlockList().includes(uid.trim());
    }

    // 获取用户唯一标识（href）
    function getUserId(el) {
        return el?.getAttribute('href');
    }

    // 屏蔽/取消屏蔽（不刷新页面）
    function toggleBlock(el) {
        const uid = getUserId(el);
        const name = el.textContent.trim();
        if (!uid) return;

        let list = getBlockList();
        if (isBlocked(uid)) {
            saveBlock(list.filter(id => id !== uid));
            alert(`已取消屏蔽：${name}`);
        } else {
            list.push(uid);
            saveBlock(list);
            alert(`已屏蔽：${name}`);
            const item = el.closest('article.timeline__item');
            if (item) item.style.display = 'none';
        }
    }

    // 添加屏蔽按钮
    function addBlockButton() {
        document.querySelectorAll('a.user-name').forEach(el => {
            if (el.nextElementSibling?.classList.contains('block-btn')) return;
            const uid = getUserId(el);
            if (!uid) return;

            const btn = document.createElement('span');
            btn.className = 'block-btn';
            btn.textContent = isBlocked(uid) ? ' [已屏蔽]' : ' [屏蔽]';
            btn.style.cssText = 'color:#f23838; margin-left:6px; cursor:pointer; font-size:12px;';
            btn.addEventListener('click', e => {
                e.stopPropagation();
                toggleBlock(el);
            });
            el.parentNode.insertBefore(btn, el.nextSibling);
        });
    }

    // 自动隐藏已屏蔽内容
    function hideBlockedContent() {
        const list = getBlockList();
        document.querySelectorAll('a.user-name').forEach(el => {
            const uid = getUserId(el);
            if (uid && list.includes(uid)) {
                const item = el.closest('article.timeline__item');
                if (item) item.style.display = 'none';
            }
        });
    }

    // 启动
    setTimeout(() => {
        addBlockButton();
        hideBlockedContent();
    }, 600);

    // 监听动态内容
    const observer = new MutationObserver(() => {
        addBlockButton();
        hideBlockedContent();
    });
    observer.observe(document.body, { childList: true, subtree: true });
})();
