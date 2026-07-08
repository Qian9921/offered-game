# 对话树 JSON 格式
每个职业一个 JSON 文件。结构:
{
  "career": "programmer",          // 职业标识
  "careerName": "程序员",           // 中文名
  "start": "node_intro",           // 起始节点 id
  "nodes": {
    "node_intro": {
      "speaker": "导师老陈",         // 说话人(空字符串表示旁白)
      "text": "来,新人,坐这。你的工位。",  // 这句台词
      "effects": {},               // 可选:本节点触发的状态变化,如 {"passion": 5}
      "choices": [                 // 玩家选项数组;为空则表示对话结束
        { "label": "谢谢老师!(激动)", "next": "node_eager", "effects": {"passion": 5} },
        { "label": "(默默点头)", "next": "node_quiet" }
      ]
    }
  }
}
说明:引擎从 start 节点开始,显示 speaker+text,把 choices 显示为按钮;
玩家点选后,应用该选项的 effects(调 StateSystem.change),跳到 next 指向的节点;
若某节点 choices 为空数组,显示完 text 后结束对话。
