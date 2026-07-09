import Phaser from 'phaser';
import { StateSystem } from '../systems/StateSystem.js';
import { StatusBarUI } from '../systems/StatusBarUI.js';
import { DialogueEngine } from '../systems/DialogueEngine.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { AudioSystem } from '../systems/AudioSystem.js';

// WorldScene — LimeZu 现代办公室俯视角 RPG 探索 + NPC 交互 + 剧情合体
//
// 素材事实（2026-07 逐帧质心分析修正版）：
// - Adam/Alex/Amelia/Bob.png: 384x224, 24cols x 7rows, frame 16x32
//   Row0(f0-3) = idle: 0=右 1=上 2=左 3=下（质心与走路帧对齐）
//   Row1(f24-47) = 走路，按 6 帧一组分四向：
//     f24-29=右走  f30-35=上走  f36-41=左走  f42-47=下走
//   ⚠️ 旧映射用了 row3/row4（f72+/f96+）——那是"坐下/翻手机"动作帧，
//     质心在 x1.8↔x11.6 间来回跳，这就是"左右移动人物分裂"的根因。
// - office_16.png: 256x848, 16x16 tiles；frame 85 = 蓝灰色办公地毯
// - singles16: 全部 32x48px；roombuilder_16.png: 256x224, 16x16 tiles

const MW = 1280, MH = 960; // SkyOffice 地图像素尺寸（40×30 tiles @ 32px）
const SCALE = 2;       // 角色缩放（LimeZu 16×32 → 32×64，与 32px 地图协调）
// 出生点 + NPC 站位（SkyOffice 地图的可行走空地，像素坐标）：
// 中央走廊约 x600-760；开放工位区在右侧 x900+；会议室左下。
const SPAWN = { x: 680, y: 620 };
const NPC_POS = {
  senior: { x: 980, y: 470 },  // 资深：右侧工位区
  peer:   { x: 700, y: 500 },  // 同事：中央走廊
  vet:    { x: 640, y: 300 },  // 前辈：上方（茶水/休息区一带）
};

// idle 帧（Row0，逐帧目检修正）：f0=右 f1=上 f2=左 f3=下
const IDLE = { right: 0, up: 1, left: 2, down: 3 };
// 走路帧组（Row1，f24-47 按 6 帧一组）：右/上/左/下
const WALK = { right: [24, 29], up: [30, 35], left: [36, 41], down: [42, 47] };

// 轻量职业：单文件全剧情（data/light_*.json），无分幕；深度职业走 {career}_act{n}.json
const LIGHT_CAREERS = ['designer', 'operation', 'teacher', 'doctor', 'civilservant', 'sales', 'lawyer'];

// 职业主题：每个职业不同的地板/墙色/氛围光 + NPC 名字与开场寒暄。
// 场景骨架(工位/会议角/茶水间)共享——像同一栋写字楼里不同公司的楼层,
// 但色彩、命名、氛围完全不同,一眼能认出"这是哪一行"。
const CAREER_THEMES = {
  programmer: {
    floor: 138, wall: 0x5a5a6e, tint: null,
    npcs: { senior: ['老陈', '资深架构师'], peer: ['江野', '新同事'], vet: ['周哥', '老前辈'] },
    peerLine: '江野挤挤眼:"新来的?老陈在那边,先去他那报个到——别怕,他凶归凶,心是热的。"',
    vetLine: '周哥端着咖啡,慢悠悠:"年轻人,悠着点。这行啊,活是干不完的。"',
  },
  product: {
    floor: 189, wall: 0x5e5a6a, tint: 0xfff4e8,
    npcs: { senior: ['林姐', '产品总监'], peer: ['小杜', '交互设计'], vet: ['大鹏', '资深产品'] },
    peerLine: '小杜抱着原型图:"新来的产品?林姐在等你——她语速快,你带个本子记。"',
    vetLine: '大鹏盯着数据看板:"需求会改的,别急着画原型。先想清楚为什么。"',
  },
  admin: {
    floor: 106, wall: 0x5a6062, tint: 0xf0f6f0,
    npcs: { senior: ['王主任', '办公室主任'], peer: ['小方', '同批入职'], vet: ['刘姐', '老科员'] },
    peerLine: '小方压低声音:"王主任人不坏,就是规矩多。记得先敲门。"',
    vetLine: '刘姐整理着文件:"稳是稳,但稳也有稳的熬法。你慢慢就懂了。"',
  },
  designer: {
    floor: 186, wall: 0x635a6e, tint: 0xfdeef4,
    npcs: { senior: ['Kay', '设计总监'], peer: ['阿棠', '插画师'], vet: ['老葛', '资深视觉'] },
    peerLine: '阿棠头也不抬地画着:"Kay 在那边。她看作品不看人,放轻松。"',
    vetLine: '老葛眯眼看着屏幕:"甲方说\'再改改\'的时候,先深呼吸。"',
  },
  operation: {
    floor: 125, wall: 0x5a5e6e, tint: 0xfff8e0,
    npcs: { senior: ['雅姐', '运营负责人'], peer: ['小鹿', '内容运营'], vet: ['强哥', '增长老兵'] },
    peerLine: '小鹿盯着后台数据:"雅姐在等你。今天数据不错,她心情应该好。"',
    vetLine: '强哥转着笔:"流量是假的,留存是真的。记住这句就够了。"',
  },
  teacher: {
    floor: 173, wall: 0x5e6258, tint: 0xf2f8ea,
    npcs: { senior: ['陈校长', '教学校长'], peer: ['小许', '同组新老师'], vet: ['吴老师', '老教师'] },
    peerLine: '小许抱着教案:"陈校长在办公室等你,第一次见面别紧张。"',
    vetLine: '吴老师批着作业:"讲台站久了就知道,教的是书,带的是人。"',
  },
  doctor: {
    floor: 94, wall: 0x586066, tint: 0xeef6f8,
    npcs: { senior: ['张主任', '科室主任'], peer: ['小蒋', '规培同期'], vet: ['护士长', '二十年资历'] },
    peerLine: '小蒋整理着病历:"张主任查房去了,马上回。白大褂穿好。"',
    vetLine: '护士长快步走过:"这里没有慢班。跟上节奏,照顾好自己。"',
  },
  civilservant: {
    floor: 154, wall: 0x5c5e60, tint: 0xf4f4ee,
    npcs: { senior: ['赵科长', '窗口科科长'], peer: ['小闵', '同批考入'], vet: ['老周', '临退老同志'] },
    peerLine: '小闵冲你点头:"赵科长在里面。材料备齐,他就好说话。"',
    vetLine: '老周喝着茶:"章要盖对,人要对得起章。就这么简单。"',
  },
  sales: {
    floor: 141, wall: 0x635e58, tint: 0xfff0e0,
    npcs: { senior: ['Vincent', '销售总监'], peer: ['小柯', '同期入职'], vet: ['彪哥', '销冠'] },
    peerLine: '小柯整理着客户名单:"Vincent 在等你。他只看结果,但人不坏。"',
    vetLine: '彪哥挂了电话:"单子是跑出来的,不是等出来的。走,带你见客户。"',
  },
  lawyer: {
    floor: 170, wall: 0x565660, tint: 0xf6f2ea,
    npcs: { senior: ['沈律师', '合伙人'], peer: ['小袁', '实习律师'], vet: ['何律', '资深诉讼'] },
    peerLine: '小袁抱着一摞卷宗:"沈律在会议室。案卷先看三遍再开口。"',
    vetLine: '何律合上卷宗:"法条是死的,当事人是活的。别忘了这点。"',
  },
};

export class WorldScene extends Phaser.Scene {
  constructor() { super('WorldScene'); }

  init(data) {
    this.career = (data && data.career) || 'programmer';
    this.deep = data ? data.deep : true;
    this.act = (data && data.act) || 1;
    this.dialogueActive = false;
    this.activeNpc = null;
    // 进场即存档，保证"继续游戏"总能回到当前职业与幕次
    SaveSystem.save({ career: this.career, act: this.act });
  }

  preload() {
    // 玩家角色
    this.load.spritesheet('adam', './assets/limezu/characters/Adam.png', {
      frameWidth: 16, frameHeight: 32,
    });
    // NPC 角色（同规格）
    this.load.spritesheet('alex', './assets/limezu/characters/Alex.png', {
      frameWidth: 16, frameHeight: 32,
    });
    this.load.spritesheet('amelia', './assets/limezu/characters/Amelia.png', {
      frameWidth: 16, frameHeight: 32,
    });
    this.load.spritesheet('bob', './assets/limezu/characters/Bob.png', {
      frameWidth: 16, frameHeight: 32,
    });
    // ===== SkyOffice 成品办公室地图（MIT 许可）+ 其 tileset（frame 均 32×32，物件除外）=====
    // 专业设计的多区办公室：开放工位/会议室/休息室/老板办公室，一次加载全套。
    const SO = './assets/skyoffice';
    this.load.tilemapTiledJSON('office_map', `${SO}/map/map.json`);
    this.load.spritesheet('tiles_wall', `${SO}/map/FloorAndGround.png`, { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('so_office', `${SO}/tileset/Modern_Office_Black_Shadow.png`, { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('so_generic', `${SO}/tileset/Generic.png`, { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('so_basement', `${SO}/tileset/Basement.png`, { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('so_chairs', `${SO}/items/chair.png`, { frameWidth: 32, frameHeight: 64 });
    this.load.spritesheet('so_computers', `${SO}/items/computer.png`, { frameWidth: 96, frameHeight: 64 });
    this.load.spritesheet('so_whiteboards', `${SO}/items/whiteboard.png`, { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('so_vending', `${SO}/items/vendingmachine.png`, { frameWidth: 48, frameHeight: 72 });
  }

  create() {
    AudioSystem.playBgm('office');

    this._buildMap();       // SkyOffice tilemap：地板 + 墙碰撞 + 物件层
    this._createPlayer();
    this._createNpcs();

    // 设计分辨率 1920×1080；camera zoom 1.6 让视口显示约 1200×675 世界单位，
    // 既看得清家具细节又有足够视野，渲染在真实像素上 = 锐利。
    this.cameras.main.setZoom(1.6);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, MW, MH);

    // 核心系统（状态 + 状态条 HUD + 对话引擎）
    this.stateSystem = new StateSystem();
    this.statusUI = new StatusBarUI(this, this.stateSystem);
    this.dialogueEngine = new DialogueEngine(this, this.stateSystem);
    this._setupDialogueEvents();

    // 交互键
    this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    // ===== 双相机架构：main 相机 zoom 2 渲染世界，uiCamera 原生 1:1 渲染 HUD =====
    // 主相机放大世界会连带放大钉屏 UI，故 HUD 交给独立的满分辨率 UI 相机，二者互相 ignore。
    const SW = this.scale.width, SH = this.scale.height; // 1920×1080 屏幕坐标系
    this.uiObjects = [];
    const trackUI = (o) => { this.uiObjects.push(o); return o; };

    // 操作提示（屏幕顶部居中）
    trackUI(this.add.text(SW / 2, 14, 'WASD / 方向键 移动 · 走近 NPC 按 E 交谈 · ESC 菜单', {
      fontSize: '22px',
      fill: '#dfe3ff',
      backgroundColor: '#000000aa',
      padding: { x: 14, y: 7 },
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(9999));

    // 引导语（屏幕底部）——按职业主题生成"找谁报到"
    const gTheme = CAREER_THEMES[this.career] || CAREER_THEMES.programmer;
    const [gName, gTitle] = gTheme.npcs.senior;
    this.guideText = trackUI(this.add.text(SW / 2, SH - 90, `📋 新人报到:去找${gTitle}「${gName}」(头顶有 ❗),走近按 E`, {
      fontSize: '22px',
      fill: '#ffe08a',
      backgroundColor: '#00000099',
      padding: { x: 16, y: 8 },
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(9999));

    // "按 E 交谈"浮标（屏幕中下，默认隐藏）
    this.ePrompt = trackUI(this.add.text(SW / 2, SH - 150, '［ E ］交谈', {
      fontSize: '28px',
      fill: '#ffffff',
      backgroundColor: '#2a6fd6ee',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(9999).setVisible(false));

    // 素材署名（屏幕右下角小字）
    trackUI(this.add.text(SW - 10, SH - 6, 'Art: LimeZu · Kenney', {
      fontSize: '14px', fill: '#7a7a8a',
    }).setOrigin(1, 1).setScrollFactor(0).setDepth(9999));

    // HUD（StatusBarUI 的 mini/panel 容器）也归 UI 相机
    if (this.statusUI) {
      if (this.statusUI.mini) trackUI(this.statusUI.mini);
      if (this.statusUI.panel) trackUI(this.statusUI.panel);
    }

    // 建 UI 相机：主相机忽略所有 UI；UI 相机忽略当前所有世界对象（快照）。
    this.uiCamera = this.cameras.add(0, 0, SW, SH);
    this.uiCamera.setScroll(0, 0);
    this.cameras.main.ignore(this.uiObjects);
    this._worldObjects = this.children.list.filter(o => !this.uiObjects.includes(o));
    this.uiCamera.ignore(this._worldObjects);

    // 调试自验证钩子:?autochen=1 → 传送到报到 NPC 并自动触发第一幕(仅用于截图验证)
    if (typeof window !== 'undefined' && window.location.search.includes('autochen=1')) {
      const chen = this.npcs.find(n => n.id === 'senior');
      if (chen) {
        this.player.setPosition(chen.spr.x, chen.spr.y + 40);
        this.time.delayedCall(800, () => this._interact(chen));
      }
    }
  }

  // 把动态 UI（对话框/仪式弹窗/气泡）指派给 UI 相机：
  // main 相机忽略它（不受 zoom 影响）、uiCamera 渲染它（屏幕坐标、满分辨率、锐利）。
  // 传 Container 或对象数组均可。
  attachToUICamera(objOrArr) {
    if (!this.uiCamera) return;
    const arr = Array.isArray(objOrArr) ? objOrArr : [objOrArr];
    this.cameras.main.ignore(arr);
    // uiCamera 之前 ignore 了世界快照；新 UI 对象不在快照里，故 uiCamera 默认会渲染它——无需额外处理。
  }

  // ==================== SkyOffice 成品办公室地图（MIT）====================
  // 用 Phaser 原生 tilemap 加载专业设计的多区办公室：地板 tile 层 + 墙碰撞 +
  // 各物件层（桌椅/电脑/白板/售货机等）。逻辑移植自 SkyOffice Game.ts（同源素材）。
  _buildMap() {
    const map = this.make.tilemap({ key: 'office_map' });
    this.officeMap = map;

    // 地板层：FloorAndGround tileset，带 collides 属性的瓦片作墙壁碰撞
    const floorTs = map.addTilesetImage('FloorAndGround', 'tiles_wall');
    const ground = map.createLayer('Ground', floorTs).setDepth(0);
    ground.setCollisionByProperty({ collides: true });
    this.groundLayer = ground;

    // 物件层 → staticGroup，逐个按 gid 摆放（origin 左下 → 中心换算）。
    // collidable 的层加入碰撞组，供 _createPlayer 后与玩家碰撞。
    this.solidGroups = [];
    const addGroup = (layerName, sheetKey, tilesetName, collidable) => {
      const ts = map.getTileset(tilesetName);
      if (!ts) return;
      const group = this.physics.add.staticGroup();
      const layer = map.getObjectLayer(layerName);
      if (!layer) return;
      layer.objects.forEach((o) => {
        const ax = o.x + o.width * 0.5;
        const ay = o.y - o.height * 0.5;
        const img = group.get(ax, ay, sheetKey, o.gid - ts.firstgid);
        if (img) img.setDepth(ay);
      });
      if (collidable) this.solidGroups.push(group);
    };

    // 墙（用地板 sheet 的瓦片做立面）+ 各类家具物件
    addGroup('Wall', 'tiles_wall', 'FloorAndGround', false);
    addGroup('Objects', 'so_office', 'Modern_Office_Black_Shadow', false);
    addGroup('ObjectsOnCollide', 'so_office', 'Modern_Office_Black_Shadow', true);
    addGroup('GenericObjects', 'so_generic', 'Generic', false);
    addGroup('GenericObjectsOnCollide', 'so_generic', 'Generic', true);
    addGroup('Basement', 'so_basement', 'Basement', true);
    // 椅子/电脑/白板/售货机（专用 sheet，帧尺寸各异）
    addGroup('Chair', 'so_chairs', 'chair', false);
    addGroup('Computer', 'so_computers', 'computer', true);
    addGroup('Whiteboard', 'so_whiteboards', 'whiteboard', true);
    addGroup('VendingMachine', 'so_vending', 'vendingmachine', true);

    // 职业氛围光：极淡全屏色调（保留职业差异化的"行业气质"）
    const theme = CAREER_THEMES[this.career] || CAREER_THEMES.programmer;
    if (theme.tint) {
      this.add.rectangle(0, 0, MW, MH, theme.tint, 0.05).setOrigin(0).setDepth(1);
    }
  }

  // ==================== 玩家 ====================
  _createPlayer() {
    // 主角皮肤 = 捏人选的形象（wdwtb_profile.avatar.skinKey）,默认 adam
    let skinKey = 'adam', skinTint = null;
    try {
      const prof = JSON.parse(localStorage.getItem('wdwtb_profile') || '{}');
      if (prof?.avatar?.skinKey && this.textures.exists(prof.avatar.skinKey)) {
        skinKey = prof.avatar.skinKey;
        skinTint = prof.avatar.tint || null;
      }
    } catch (e) {}

    // 四向走路动画：全部来自 Row1 的稳定帧组（质心恒定,不再分裂）;anim key 带皮肤名防冲突
    this.walkPrefix = `walk_${skinKey}`;
    for (const [dir, [s, e]] of Object.entries(WALK)) {
      const k = `${this.walkPrefix}_${dir}`;
      if (!this.anims.exists(k)) {
        this.anims.create({
          key: k,
          frames: this.anims.generateFrameNumbers(skinKey, { start: s, end: e }),
          frameRate: 10, repeat: -1, // 10fps 配 130px/s 步频更贴地，消除"漂"感
        });
      }
    }

    this.player = this.physics.add.sprite(SPAWN.x, SPAWN.y, skinKey, IDLE.down);
    if (skinTint) this.player.setTint(skinTint);
    this.player.setScale(SCALE);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(12, 14);
    this.player.body.setOffset(2, 18);

    this.physics.world.setBounds(0, 0, MW, MH);
    // 与地板墙碰撞层 + 各碰撞物件组碰撞（替代旧的 this.obstacles）
    if (this.groundLayer) this.physics.add.collider(this.player, this.groundLayer);
    if (this.solidGroups) this.solidGroups.forEach(g => this.physics.add.collider(this.player, g));

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.facing = 'down';
  }

  // ==================== NPC ====================
  _createNpcs() {
    // 站位用 NPC_POS（SkyOffice 地图的可行走空地）；名字/头衔/寒暄按职业主题注入。
    const theme = CAREER_THEMES[this.career] || CAREER_THEMES.programmer;
    const [seniorName, seniorTitle] = theme.npcs.senior;
    const [peerName, peerTitle] = theme.npcs.peer;
    const [vetName, vetTitle] = theme.npcs.vet;
    const defs = [
      {
        id: 'senior', name: seniorName, tex: 'bob',
        x: NPC_POS.senior.x, y: NPC_POS.senior.y, facing: 'down',
        label: `${seniorName} · ${seniorTitle}`, mark: '❗', markColor: '#ffdd33',
        act: 1, // 走近报到 → 播第一幕
      },
      {
        id: 'peer', name: peerName, tex: 'alex',
        x: NPC_POS.peer.x, y: NPC_POS.peer.y, facing: 'down',
        label: `${peerName} · ${peerTitle}`, mark: '💬', markColor: '#7ec8ff',
        line: theme.peerLine,
      },
      {
        id: 'vet', name: vetName, tex: 'amelia',
        x: NPC_POS.vet.x, y: NPC_POS.vet.y, facing: 'down',
        label: `${vetName} · ${vetTitle}`, mark: '💬', markColor: '#7ec8ff',
        line: theme.vetLine,
      },
    ];

    this.npcs = [];
    for (const d of defs) {
      const spr = this.add.sprite(d.x, d.y, d.tex, IDLE[d.facing] ?? 0)
        .setScale(SCALE)
        .setOrigin(0.5, 1)
        .setDepth(d.y);

      // NPC 名牌（脚下小字，1920 尺度）
      const nameTag = this.add.text(d.x, d.y + 8, d.name, {
        fontSize: '13px', color: '#ffffff',
        backgroundColor: '#00000088', padding: { x: 5, y: 2 },
      }).setOrigin(0.5, 0).setDepth(d.y + 1);

      // 头顶交互浮标（上下浮动）
      const markY = d.y - 78;
      const mark = this.add.text(d.x, markY, d.mark, {
        fontSize: '24px', color: d.markColor,
      }).setOrigin(0.5, 1).setDepth(9000);
      this.tweens.add({
        targets: mark, y: markY - 6,
        duration: 620, yoyo: true, repeat: -1, ease: 'Sine.inOut',
      });

      this.npcs.push({ ...d, spr, mark, nameTag });
    }
  }

  update() {
    if (!this.player?.body) return;

    // HUD 随对话状态自动让路（半透明），单点同步不怕遗漏
    if (this.statusUI && this._lastDim !== this.dialogueActive) {
      this._lastDim = this.dialogueActive;
      this.statusUI.setDimmed(this.dialogueActive);
    }

    // ESC 唤起暂停菜单（对话进行中不触发，交给对话自己的 ESC）
    if (!this.dialogueActive && Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.scene.pause();
      this.scene.launch('PauseScene', {
        origin: 'WorldScene',
        stateSystem: this.stateSystem,
        career: this.career,
        act: this.act,
      });
      return;
    }

    // 对话中冻结移动，跳过交互检测
    if (this.dialogueActive) {
      this.player.setVelocity(0, 0);
      if (this.player.anims.isPlaying) {
        this.player.anims.stop();
        this.player.setFrame(IDLE[this.facing] ?? IDLE.down);
      }
      return;
    }

    const speed = 130;
    let vx = 0, vy = 0;
    let newFacing = null;

    if (this.cursors.left.isDown || this.wasd.A.isDown) { vx = -speed; newFacing = 'left'; }
    if (this.cursors.right.isDown || this.wasd.D.isDown) { vx = speed; newFacing = 'right'; }
    if (this.cursors.up.isDown || this.wasd.W.isDown) { vy = -speed; newFacing = 'up'; }
    if (this.cursors.down.isDown || this.wasd.S.isDown) { vy = speed; newFacing = 'down'; }

    if (vx !== 0 && vy !== 0) { vx *= 0.7071; vy *= 0.7071; }
    if (newFacing) this.facing = newFacing;

    this.player.setVelocity(vx, vy);
    this.player.setDepth(this.player.y);

    if (vx === 0 && vy === 0) {
      // 停步：停动画并回到该朝向的 idle 帧（不再定格在走路中间帧）
      if (this.player.anims.isPlaying) {
        this.player.anims.stop();
        this.player.setFrame(IDLE[this.facing] ?? IDLE.down);
      }
    } else {
      this.player.anims.play(`${this.walkPrefix}_${this.facing}`, true);
    }

    // ---- 交互:找最近可交互 NPC ----
    this._updateInteraction();
  }

  _updateInteraction() {
    const RANGE = 78;
    let nearest = null, nd = RANGE;
    for (const npc of this.npcs) {
      const d = Phaser.Math.Distance.Between(
        this.player.x, this.player.y, npc.spr.x, npc.spr.y
      );
      if (d < nd) { nd = d; nearest = npc; }
    }

    this.activeNpc = nearest;
    if (nearest) {
      this.ePrompt.setText(`［ E ］与 ${nearest.name} 交谈`).setVisible(true);
      if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
        this._interact(nearest);
      }
    } else {
      this.ePrompt.setVisible(false);
    }
  }

  _interact(npc) {
    if (this.dialogueActive) return;

    // 老陈 → 触发正式剧情第一幕
    if (npc.act) {
      this.dialogueActive = true;
      this.ePrompt.setVisible(false);
      this.guideText.setVisible(false);
      this.act = npc.act;
      // 轻量职业单文件；深度职业按幕分文件
      const url = LIGHT_CAREERS.includes(this.career)
        ? `./data/light_${this.career}.json`
        : `./data/${this.career}_act${this.act}.json`;
      console.log('[WorldScene] 走近老陈,加载剧情:', url);
      fetch(url)
        .then(res => {
          if (!res.ok) throw new Error(`加载剧情失败:HTTP ${res.status}`);
          return res.json();
        })
        .then(data => {
          this.dialogueEngine._clearUI();
          this.dialogueEngine.start(data);
        })
        .catch(err => {
          console.error('[WorldScene]', err.message);
          this.dialogueActive = false;
        });
      return;
    }

    // 其余 NPC → 一句轻量寒暄气泡
    if (npc.line) this._showLine(npc.name, npc.line);
  }

  // 轻量单句气泡（非正式剧情）——钉屏 UI 相机，1920 尺度，点击/E/空格关闭
  _showLine(name, text) {
    this.dialogueActive = true;
    this.ePrompt.setVisible(false);
    if (this.guideText) this.guideText.setVisible(false);
    const { width, height } = this.scale;
    const bw = Math.min(1400, width - 120);
    const bx = (width - bw) / 2, by = height - 200;
    const PAD = 32;
    const c = this.add.container(0, 0).setScrollFactor(0).setDepth(10000);
    // 全屏输入层（点任何位置关闭，永不错位）
    const hit = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.001)
      .setScrollFactor(0).setInteractive();
    c.add(hit);
    c.add(this.add.rectangle(bx + bw / 2, by + 80, bw, 160, 0x0a0a14, 0.86).setStrokeStyle(2, 0xd4a353, 0.5));
    c.add(this.add.text(bx + PAD, by + 20, name, {
      fontSize: '22px', color: '#ffd24d', fontStyle: 'bold',
    }));
    c.add(this.add.text(bx + PAD, by + 56, text, {
      fontSize: '26px', color: '#ffffff', lineSpacing: 8, wordWrap: { width: bw - PAD * 2, useAdvancedWrap: true },
    }));
    c.add(this.add.text(bx + bw - PAD, by + 150, '［点击 / E 继续］', {
      fontSize: '18px', color: '#9aa0a6',
    }).setOrigin(1, 1));
    if (typeof this.attachToUICamera === 'function') this.attachToUICamera(c);

    const close = () => {
      c.destroy(true);
      this.dialogueActive = false;
      if (this.guideText) this.guideText.setVisible(true);
    };
    this.time.delayedCall(120, () => {
      hit.on('pointerdown', close);
      this.input.keyboard.once('keydown-E', close);
      this.input.keyboard.once('keydown-SPACE', close);
      this.input.keyboard.once('keydown-ESC', close);
    });
  }

  // ==================== 剧情引擎事件（移植自 OfficeScene）====================
  _setupDialogueEvents() {
    const eng = this.dialogueEngine;
    const self = this;

    eng.on('bgChange', bg => {
      console.log('[WorldScene] bgChange:', bg);
    });

    eng.on('dialogueEnd', () => {
      self.dialogueActive = false;
      if (self.guideText) self.guideText.setVisible(true); // 对话结束恢复引导语
    });

    eng.on('action', (action, node) => {
      switch (action) {
        case 'plant_tree':
          self._showRitual('🌱 你给绿萝浇了水。它好像在灯光下轻轻颤了一下。');
          break;
        case 'write_letter':
          self._showRitual('✉️ 你写下了给一年后自己的信,封存在抽屉最深处。');
          break;
        case 'minigame:coding':
        case 'minigame:review':
        case 'minigame:affairs':
          self.scene.pause();
          self.scene.launch('MinigameScene', {
            type: action.split(':')[1],
            fromScene: null,
            onComplete: (result) => {
              // 按成绩反哺状态:全对 skill+5 passion+4;部分 skill+3;全错 stress+3 但 skill+1(试错也是学)
              const total = result?.total || 3, ok = result?.correct || 0;
              if (ok === total) { self.stateSystem.change('skill', 5); self.stateSystem.change('passion', 4); }
              else if (ok > 0) { self.stateSystem.change('skill', 3); self.stateSystem.change('energy', -3); }
              else { self.stateSystem.change('stress', 3); self.stateSystem.change('skill', 1); }
              self.scene.stop('MinigameScene');
              self.scene.resume();
            },
          });
          break;
        case 'enter_mindscape':
          self.scene.pause();
          self.scene.launch('MindscapeScene', {
            stateSystem: self.stateSystem,
            returnScene: 'WorldScene',
            monoScene: 'auto',
          });
          self.events.once('mindscapeReturn', () => {
            self.dialogueEngine._advanceAfterAction && self.dialogueEngine._advanceAfterAction();
          });
          break;
        case 'next_act':
          self._loadNextAct();
          break;
        case 'ending':
          self.scene.start('EndingScene', {
            ending: self.career,
            stats: self.stateSystem.getAll(),
          });
          break;
        default:
          console.log('[WorldScene] unhandled action:', action);
      }
    });
  }

  // ---------- 仪式弹窗（钉屏）----------
  _showRitual(text) {
    const { width, height } = this.scale;
    const overlay = this.add.container(0, 0).setScrollFactor(0).setDepth(10001);
    // 全屏遮罩兼点击层（点任何处关闭）
    const mask = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.55).setInteractive();
    overlay.add(mask);
    overlay.add(this.add.rectangle(width / 2, height / 2 - 30, 820, 220, 0x1e1e2e, 0.97).setStrokeStyle(2, 0xd4a353, 0.6));
    overlay.add(this.add.text(width / 2, height / 2 - 55, text, {
      fontSize: '30px', color: '#f0d080',
      wordWrap: { width: 720, useAdvancedWrap: true }, align: 'center', lineSpacing: 8,
    }).setOrigin(0.5));
    overlay.add(this.add.text(width / 2, height / 2 + 55, '点击任意处继续', {
      fontSize: '20px', color: '#8a8a9e',
    }).setOrigin(0.5));
    if (typeof this.attachToUICamera === 'function') this.attachToUICamera(overlay);

    const close = () => overlay.destroy(true);
    this.time.delayedCall(100, () => {
      mask.on('pointerdown', close);
      this.input.keyboard.once('keydown-ESC', close);
      this.input.keyboard.once('keydown-SPACE', close);
    });
  }

  // ---------- 加载下一幕 ----------
  _loadNextAct() {
    this.dialogueEngine._clearUI();
    const next = this.act + 1;
    const url = `./data/${this.career}_act${next}.json`;
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        this.act = next;
        SaveSystem.save({ career: this.career, act: this.act }); // 过幕即存，续档回到最新一幕
        this.dialogueEngine._clearUI();
        this.dialogueEngine.start(data);
      })
      .catch(() => {
        this.scene.start('EndingScene', {
          ending: this.career,
          stats: this.stateSystem.getAll(),
        });
      });
  }

}
