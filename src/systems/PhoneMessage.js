import Phaser from 'phaser';

// PhoneMessage：仿微信手机消息弹窗 — 展示剧情中家人发来的消息。
// UI 框架，消息内容以后从 data/ 读取；引擎共用，不写死具体消息。
export class PhoneMessage {
  constructor(scene) {
    this.scene = scene;
    this.ui = null;       // 面板 Container
    this.backdrop = null; // 半透明遮罩
    this.onClose = null;
    this._closing = false;
  }

  // messages: [{ sender:'妈妈', text:'...' }]; onClose 可选回调
  show(messages, onClose) {
    this._close(true); // 先关掉已有的
    this.onClose = onClose || null;
    this._closing = false;
    const scene = this.scene;

    const panelW = 300;
    const titleH = 36;
    const contentH = this._contentHeight(messages);
    const panelH = titleH + contentH;
    const startX = 960; // 从右侧屏幕外开始
    const endX = 960 - panelW - 16;

    // 半透明遮罩（场景级，不随面板移动）—— 点击遮罩关闭
    const backdrop = scene.add.rectangle(480, 270, 960, 540, 0x000000, 0.35)
      .setInteractive()
      .setDepth(90);
    backdrop.on('pointerdown', () => this._close(false));
    this.backdrop = backdrop;

    // 面板容器
    const c = scene.add.container(startX, 60).setDepth(91);
    this.ui = c;

    // 面板背景（矩形模拟深色手机面板）
    const bg = scene.add.rectangle(panelW / 2, panelH / 2, panelW, panelH, 0x1e1e2e, 0.97);
    c.add(bg);
    bg.setInteractive(); // 吃掉面板区域内的点击，防止穿透到遮罩

    // ---- 标题栏 ----
    // WeChat 绿色标题条
    const titleBar = scene.add.rectangle(panelW / 2, titleH / 2, panelW, titleH, 0x15a15a, 0.9);
    c.add(titleBar);
    // "微信" 标题
    c.add(scene.add.text(18, titleH / 2, '微信', {
      fontSize: '15px', color: '#ffffff',
    }).setOrigin(0, 0.5));
    // ✕ 关闭按钮
    const closeBtn = scene.add.text(panelW - 18, titleH / 2, '✕', {
      fontSize: '16px', color: '#ffffff',
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerover', () => closeBtn.setColor('#ff6666'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#ffffff'));
    closeBtn.on('pointerdown', () => this._close(false));
    c.add(closeBtn);

    // ---- 消息气泡 ----
    let y = titleH + 14;
    messages.forEach(msg => {
      // 发送人（上方小字）
      c.add(scene.add.text(20, y, msg.sender, {
        fontSize: '12px', color: '#9aa0a6',
      }));
      y += 15;

      // 气泡背景（浅暖色，家人的温度）
      const bubbleW = panelW - 40;
      const bubbleH = 36;
      c.add(scene.add.rectangle(20 + bubbleW / 2, y + bubbleH / 2, bubbleW, bubbleH, 0xf0eed8, 0.92));

      // 气泡内文字（深色，左对齐）
      c.add(scene.add.text(28, y + 7, msg.text, {
        fontSize: '14px', color: '#3a3a3a',
      }));

      y += bubbleH + 18;
    });

    // ---- 滑入动画（300ms）----
    scene.tweens.add({
      targets: c,
      x: endX,
      duration: 300,
      ease: 'Power2',
    });
  }

  // immediate=true 直接销毁不播动画
  _close(immediate) {
    if (this._closing || !this.ui) return;
    this._closing = true;
    if (immediate) { this._cleanup(); return; }
    this.scene.tweens.add({
      targets: this.ui,
      x: 960,
      duration: 250,
      ease: 'Power2',
      onComplete: () => this._cleanup(),
    });
  }

  _cleanup() {
    if (this.backdrop) { this.backdrop.destroy(); this.backdrop = null; }
    if (this.ui) { this.ui.destroy(true); this.ui = null; }
    this._closing = false;
    if (this.onClose) {
      const cb = this.onClose;
      this.onClose = null;
      cb();
    }
  }

  _contentHeight(messages) {
    const perMsg = 15 + 36 + 18; // sender 行 + 气泡 + 间隔
    return messages.length * perMsg + 10; // 底部留白
  }
}
