/* 全站数据：站点清单 + 人物片段与时间线时间点映射
   时间点（秒）对应素材片段的实际内容，点节点即 seek 到该点播放 */
window.SITE = {
  stations: [
    { id: "s1", title: "开场", kind: "hero" },
    { id: "s2", title: "世界观", kind: "world" },
    { id: "s3", title: "麦当", kind: "person" },
    { id: "s4", title: "咕咚", kind: "person" },
    { id: "s5", title: "笛亚", kind: "person" },
    { id: "s6", title: "米龙", kind: "person" },
    { id: "s7", title: "事件", kind: "events" },
    { id: "s8", title: "尾声", kind: "outro" },
    { id: "s9", title: "收尾", kind: "final" }
  ],
  clips: {
    s3: { times: [0.4, 1.8, 3.8, 5.6] },
    s4: { times: [0.6, 2.4, 4.4, 6.2] },
    s5: { times: [0.6, 2.4, 4.4, 6.2] },
    s6: { times: [0.6, 3.2, 6.6, 9.6] }
  }
};
