const kovplus2007 = Object.freeze({
  gameId: "kovplus2007",
  title: "三国战纪 2007 快速集气版出招表",
  description: "本改版沿用三国战纪正宗 Plus 的人物招式，主要变化是集气速度。",
  characters: [
    {
      name: "关羽",
      aliases: ["关云长"],
      moves: [
        ["重击", "→ + A", "必杀技", "可挑空"],
        ["飞龙在天", "↓↘→ + A", "必杀技", "向前突进攻击"],
        ["回风扫叶", "←→ + A", "爆气必杀技", "向前发出攻击"],
        ["狂龙出海", "↓↑ + A", "超必杀技", "爆属性攻击"],
        ["亢龙有悔", "↓↑ + A", "爆气超必杀技", "爆气状态使用"]
      ]
    },
    {
      name: "张飞",
      aliases: ["普通张飞"],
      moves: [
        ["重击", "→ + A", "必杀技", "可震飞"],
        ["真·蛮牛式", "↓↓ + A", "必杀技", "快速冲撞"],
        ["跳劈", "跳跃中 ↓↘→ + A", "必杀技", "空中使用"],
        ["狂风式", "←→ + A", "必杀技", "可挑空"],
        ["饿虎扑羊", "↑↓ + A", "必杀技", "跳压攻击"],
        ["神龙摆尾", "↓↘→ + A", "爆气必杀技", "爆气状态使用"],
        ["夜叉探海", "↓↑ + A", "超必杀技", "爆属性攻击"],
        ["天崩地裂", "↓↑ + A", "爆气超必杀技", "爆气状态使用"]
      ]
    },
    {
      name: "赵云",
      aliases: ["赵子龙"],
      moves: [
        ["三分天下·地", "→ + A（可追加 A×3）", "必杀技", "地面连续攻击"],
        ["三分天下·空", "跳跃中 ↑ + A（可追加 A×3）", "必杀技", "空中连续攻击"],
        ["大鹏展翅", "↓↑ + A", "必杀技", "大范围挑空"],
        ["白鹤亮翅", "↓↘→ + A（可追加 A×2）", "爆气必杀技", "爆气状态使用"],
        ["哪吒滚轮", "↑↓ + A", "超必杀技", "爆属性攻击"],
        ["倒转昆仑", "↑↓ + A", "爆气超必杀技", "可按住 A 蓄力"]
      ]
    },
    {
      name: "黄忠",
      aliases: ["普通黄忠"],
      moves: [
        ["射箭", "→ + A", "必杀技", "向前射箭"],
        ["独劈华山", "↓↘→ + A", "必杀技", "近距离刀劈"],
        ["野马分鬃", "↓↑ + A", "爆气必杀技", "爆气状态使用"],
        ["百步穿杨", "↑↓ + A", "超必杀技", "连按 A 可增加箭数"],
        ["李广射虎", "↑↓ + A", "爆气超必杀技", "爆气状态使用"]
      ]
    },
    {
      name: "马超",
      aliases: ["锦马超"],
      moves: [
        ["飞龙追日", "→ + A（可追加 A×3）", "必杀技", "向前连续攻击"],
        ["天舞三式", "跳跃中 ↑ + A（可追加 A×3）", "必杀技", "空中连续攻击"],
        ["翻云崩", "↑↓ + A", "必杀技", "地面攻击"],
        ["仙人指路", "←→ + A", "爆气必杀技", "爆气状态使用"],
        ["野火燎原", "↓↑ + A", "超必杀技", "爆属性攻击"],
        ["藏伏奔原", "↓↑ + A", "爆气超必杀技", "召唤兽前冲攻击"]
      ]
    },
    {
      name: "诸葛亮",
      aliases: ["孔明", "卧龙"],
      moves: [
        ["霹雳火", "←→ + A", "必杀技", "向前喷火"],
        ["万剑穿心", "跳跃中 ↓↘→ + A", "必杀技", "空中发出剑气"],
        ["后羿射日", "↓↘→ + A", "爆气必杀技", "爆气状态使用"],
        ["雷霆万钧", "↓↑ + A", "超必杀技", "电属性攻击"],
        ["呼风唤雨", "↓↑ + A", "爆气超必杀技", "全屏洪水攻击"]
      ]
    },
    {
      name: "张辽",
      aliases: ["文远"],
      moves: [
        ["追风腿", "→ + A（可追加 A×4）", "必杀技", "可连续追加"],
        ["霸王击鼎", "←→ + A", "必杀技", "适合连招收尾"],
        ["秦王鞭石", "↓↘→ + A", "必杀技", "适合清理小兵"],
        ["杀手锏", "↑↓ + A", "爆气必杀技", "爆气状态使用"],
        ["翻雷滚天", "↓↑ + A", "超必杀技", "电属性攻击"],
        ["风卷残云", "↓↑ + A", "爆气超必杀技", "向前发出旋风"]
      ]
    },
    {
      name: "貂蝉",
      aliases: ["闭月"],
      moves: [
        ["重击", "→ + A", "必杀技", "向前重击"],
        ["天女散花", "↓↘→ + A", "必杀技", "多段攻击"],
        ["踢云纵", "↑↓ + A（可追加 A×4）", "必杀技", "近距离连续攻击"],
        ["织女穿梭", "←→ + A", "爆气必杀技", "爆气状态使用"],
        ["飞燕回廊（冰）", "↓↑ + A", "超必杀技", "冰属性攻击"],
        ["飞燕回廊（爆）", "↓↑ + A", "爆气超必杀技", "爆气状态使用"]
      ]
    },
    {
      name: "白甲黄忠",
      aliases: ["白黄忠", "白甲"],
      moves: [
        ["射箭", "→ + A", "必杀技", "向前射出三支箭"],
        ["追魂劈", "↓↘→ + A", "必杀技", "前冲刀劈"],
        ["云里射雕", "跳跃中 ↓ + A", "必杀技", "空中向下射箭"],
        ["野马分鬃", "↓↑ + A", "爆气必杀技", "爆气状态使用"],
        ["百步穿杨", "↑↓ + A", "超必杀技", "地面箭带火属性"],
        ["李广射虎", "↑↓ + A", "爆气超必杀技", "爆气状态使用"]
      ]
    },
    {
      name: "魔法张飞",
      aliases: ["魔张飞", "红张飞"],
      moves: [
        ["重击", "→ + A", "必杀技", "向前重击"],
        ["真·蛮牛式", "↓↓ + A", "必杀技", "快速冲撞"],
        ["跳劈", "跳跃中 ↓↘→ + A", "必杀技", "空中使用"],
        ["狂风式", "←→ + A", "必杀技", "不带挑空效果"],
        ["饿虎扑羊", "↑↓ + A", "必杀技", "起跳瞬间出现吕布残影"],
        ["神龙摆尾", "↓↘→ + A", "必杀技", "大范围攻击"]
      ]
    }
  ].map((character) => Object.freeze({
    ...character,
    aliases: Object.freeze(character.aliases),
    moves: Object.freeze(character.moves.map(([name, command, category, note]) => Object.freeze({ name, command, category, note })))
  }))
});

const moveLists = Object.freeze({ kovplus2007 });

function normalizeSearchText(value) {
  return String(value ?? "").toLocaleLowerCase("zh-CN").replace(/[\s·．。_（）()＋+：:、-]/g, "");
}

export function getMoveList(gameId) {
  return moveLists[gameId] ?? null;
}

export function filterMoveList(moveList, query) {
  if (!moveList) return [];
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return moveList.characters;

  return moveList.characters.flatMap((character) => {
    const characterText = normalizeSearchText([character.name, ...character.aliases].join(" "));
    if (characterText.includes(normalizedQuery)) return [character];

    const moves = character.moves.filter((move) => normalizeSearchText(Object.values(move).join(" ")).includes(normalizedQuery));
    return moves.length ? [{ ...character, moves }] : [];
  });
}

