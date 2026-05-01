// ==UserScript==
// @name         雪球一键屏蔽用户
// @namespace    https://github.com/
// @version      3.2
// @description  屏蔽雪球用户：作者→隐藏信息和正文（保留跟帖）；评论者→仅隐藏该条评论。
// @author       holipay
// @match        *://xueqiu.com/*
// @grant        none
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    const STORAGE_KEY = 'xueqiu_block_users';

    // ====================== 存储 ======================
    function getBlockList() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
        catch { return []; }
    }
    function saveBlockList(list) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
    function isBlocked(uid) {
        return getBlockList().includes(uid);
    }

    // 从 a.user-name 提取用户ID
    function getUserId(el) {
        try {
            const url = new URL(el.href);
            if (!/^\/[A-Za-z0-9]+$/.test(url.pathname)) return null;
            return url.pathname.slice(1);
        } catch { return null; }
    }

    // ====================== 屏蔽/取消 ======================
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
        scanAndHide();
    }

    // ====================== 添加 [屏蔽] 按钮 ======================
    function renderButtons() {
        document.querySelectorAll('a.user-name').forEach(el => {
            if (el.nextElementSibling?.classList.contains('xq-block-btn')) return;
            const uid = getUserId(el);
            if (!uid) return;
            const btn = document.createElement('span');
            btn.className = 'xq-block-btn';
            btn.textContent = isBlocked(uid) ? ' [已屏蔽]' : ' [屏蔽]';
            btn.style.cssText = 'color:#f23838!important;margin-left:6px!important;cursor:pointer!important;font-size:12px!important;';
            btn.onclick = e => { e.stopPropagation(); toggleBlock(el); };
            el.parentNode.insertBefore(btn, el.nextSibling);
        });
    }

    // ====================== 核心：扫描并隐藏 ======================
    // 雪球 DOM 结构:
    //   div.timeline__item__main
    //     ├─ div.timeline__item__info (帖子作者信息)
    //     └─ div.timeline__item__bd
    //          ├─ div.timeline__item__content > div.content.content--description (帖子正文)
    //          └─ 评论区 (a.user-name = 评论者)
    //
    // 屏蔽策略:
    //   作者被屏蔽 → 隐藏 timeline__item__info + timeline__item__content，保留评论区（跟帖可见）
    //   评论者被屏蔽 → 只隐藏该条评论
    function scanAndHide() {
        const blocked = getBlockList();
        if (!blocked.length) return;

        // 遍历每一个帖子
        document.querySelectorAll('div.timeline__item__main, article, [class*="timeline__item"]').forEach(post => {
            // --- 判断帖子作者 ---
            // 作者的 user-name 在 timeline__item__info 内
            const infoArea = post.querySelector('div.timeline__item__info');
            const authorNameEl = infoArea ? infoArea.querySelector('a.user-name') : null;
            const authorUid = authorNameEl ? getUserId(authorNameEl) : null;

            // 作者被屏蔽 → 只隐藏作者信息和帖子正文，保留评论区（跟帖）
            if (authorUid && blocked.includes(authorUid)) {
                // 隐藏作者信息区域
                if (infoArea && infoArea.style.display !== 'none') {
                    infoArea.style.display = 'none';
                    infoArea.setAttribute('data-xq-blocked', authorUid);
                }
                // 隐藏帖子正文内容
                const contentArea = post.querySelector('div.timeline__item__bd div.timeline__item__content');
                if (contentArea && contentArea.style.display !== 'none') {
                    contentArea.style.display = 'none';
                    contentArea.setAttribute('data-xq-blocked', authorUid);
                }
                // 不 return，继续往下处理评论区的屏蔽逻辑
            }

            // --- 评论者被屏蔽 → 只隐藏该条评论 ---
            // 雪球评论 DOM:
            //   div.comment__item__main
            //     ├─ div.comment__item__main__hd (包含 a.user-name)
            //     └─ div.comment__item__main__bd (评论正文)
            const commentArea = post.querySelector(
                '[class*="comment"], [class*="Comment"], [class*="reply"], [class*="Reply"]'
            );
            if (commentArea) {
                commentArea.querySelectorAll('a.user-name').forEach(nameEl => {
                    const uid = getUserId(nameEl);
                    if (!uid || !blocked.includes(uid)) return;

                    // 优先匹配雪球实际 DOM：comment__item__main
                    let commentItem = nameEl.closest('div.comment__item__main');

                    // fallback: 通用选择器
                    if (!commentItem) {
                        commentItem = nameEl.closest(
                            '.comment-item, .reply-item, [class*="comment__item"], [class*="reply__item"]'
                        );
                    }
                    if (!commentItem) {
                        // fallback: 向上找只含一个 user-name 的块
                        let node = nameEl.parentElement;
                        while (node && node !== commentArea && node !== post) {
                            if (node.querySelectorAll('a.user-name').length > 1) break;
                            node = node.parentElement;
                        }
                        commentItem = node;
                    }

                    if (commentItem && commentItem.style.display !== 'none') {
                        commentItem.style.display = 'none';
                        commentItem.setAttribute('data-xq-blocked', uid);
                    }
                });
            }
        });
    }

    // ====================== DOM 变化监听 ======================
    function observe() {
        let timer = null;
        new MutationObserver(() => {
            if (timer) return;
            timer = requestAnimationFrame(() => {
                timer = null;
                renderButtons();
                scanAndHide();
            });
        }).observe(document.body, { childList: true, subtree: true });
    }

    // ====================== 面板 ======================
    function createPanel() {
        const panel = document.createElement('div');
        panel.style.cssText = 'position:fixed!important;top:100px!important;right:20px!important;z-index:999999!important;width:220px!important;background:#fff!important;border-radius:6px!important;box-shadow:0 0 10px rgba(0,0,0,.2)!important;overflow:hidden!important;font-size:14px!important;';

        // 拖动条
        const bar = document.createElement('div');
        bar.style.cssText = 'background:#f5f5f5!important;padding:6px 10px!important;cursor:move!important;display:flex!important;justify-content:space-between!important;user-select:none!important;';
        bar.textContent = '屏蔽面板 v3.2';
        const minBtn = document.createElement('span');
        minBtn.textContent = '−';
        minBtn.style.cursor = 'pointer';
        bar.appendChild(minBtn);
        panel.appendChild(bar);

        const body = document.createElement('div');
        body.style.padding = '10px';
        panel.appendChild(body);

        // 导入/导出
        const importBtn = document.createElement('button');
        importBtn.textContent = '导入屏蔽列表(文件)';
        importBtn.style.cssText = 'width:100%;padding:6px;margin-bottom:6px;background:#4CAF50;color:#fff;border:none;border-radius:4px;cursor:pointer;';
        importBtn.onclick = () => {
            const inp = document.createElement('input');
            inp.type = 'file'; inp.accept = '.txt';
            inp.onchange = e => {
                const f = e.target.files[0]; if (!f) return;
                const reader = new FileReader();
                reader.onload = ev => {
                    const users = ev.target.result.split(/\n/).map(s => s.trim()).filter(Boolean);
                    const merged = [...new Set([...getBlockList(), ...users])];
                    saveBlockList(merged);
                    scanAndHide();
                    refreshCount();
                    alert('导入成功，共 ' + merged.length + ' 个');
                };
                reader.readAsText(f);
            };
            inp.click();
        };
        body.appendChild(importBtn);

        const exportBtn = document.createElement('button');
        exportBtn.textContent = '导出屏蔽列表';
        exportBtn.style.cssText = 'width:100%;padding:6px;background:#167dff;color:#fff;border:none;border-radius:4px;cursor:pointer;';
        exportBtn.onclick = () => {
            const d = getBlockList();
            if (!d.length) return alert('无数据');
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([d.join('\n')], { type: 'text/plain' }));
            a.download = 'xueqiu-block.txt';
            a.click();
        };
        body.appendChild(exportBtn);

        const countDisplay = document.createElement('div');
        countDisplay.style.cssText = 'text-align:center;font-size:12px;color:#999;margin-top:6px;';
        body.appendChild(countDisplay);

        function refreshCount() {
            countDisplay.textContent = '当前屏蔽: ' + getBlockList().length + ' 人';
        }
        refreshCount();
        setInterval(refreshCount, 2000);

        // 最小化
        let min = false;
        minBtn.onclick = () => {
            min = !min;
            body.style.display = min ? 'none' : 'block';
            minBtn.textContent = min ? '□' : '−';
        };

        // 拖动
        let dragging = false, startX, startY, rect;
        bar.onmousedown = e => { dragging = true; rect = panel.getBoundingClientRect(); startX = e.clientX; startY = e.clientY; };
        document.onmousemove = e => { if (!dragging) return; panel.style.left = (rect.left + e.clientX - startX) + 'px'; panel.style.top = (rect.top + e.clientY - startY) + 'px'; panel.style.right = 'auto'; };
        document.onmouseup = () => dragging = false;

        document.body.appendChild(panel);
    }

    // ====================== 启动 ======================
    function init() {
        createPanel();
        renderButtons();
        scanAndHide();
        observe();
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') init();
    else document.addEventListener('DOMContentLoaded', init);
})();
