# 词库准确性审查记录（硬指标②）

> 目标：确保 5 个内置词库**内容准确无误**。日期：2026-06-01。

## 数据来源与许可证

- 源项目：[qwerty-learner-vscode](https://github.com/RealKai42/qwerty-learner-vscode)（MIT License），`assets/dicts/`。
- 复制并重命名：`GaoKao_3500→gaokao3500`、`CET4_T→cet4`、`CET6_T→cet6`、`IELTS_3_T→ielts`、`TOEFL_3_T→toefl`。

## 自动化校验（`src/dicts.accuracy.test.ts`，37 项全通过）

每个词库均校验：精确词数、**SHA-256 校验和锁定**（`src/dicts.checksums.json`）、`name`/`trans` 非空、无重复词、无乱码（`�`）/HTML 实体、释义含中文（CJK）占比、黄金抽查集。

| 词库 | 词数 | 重复 | 备注 |
|---|---|---|---|
| gaokao3500 | 3877 | 无 | 已清洗（见下） |
| cet4 | 2607 | 无 | — |
| cet6 | 2345 | 无 | — |
| ielts | 3575 | 无 | — |
| toefl | 4264 | 无 | — |

## gaokao3500 清洗（3893 → 3877，脚本 `scripts/clean-gaokao.mjs`）

原始数据含 16 个区分大小写的同名词条，处理如下：

- **删除 2 条贴错义项的错误条目：**
  - `ad`：删去 `".离开；（电自来水）停了,中断"`（与 ad 无关），保留 `"(缩) =advertisement n.广告"`。注：`AD`（大写，"n. 公元"）是另一词条，保留。
  - `war`：删去 `"n vt. 警告，预先通知"`（这是 **warn** 的释义），保留 `"n. 战争"`。
- **合并 14 个同名多义词条为单条**（释义数组合并去重，保留首条非空音标）：
  - `doctor`：两条完全相同 → 去重为 1 条。
  - 其余 13 条为名/动词义拆分，合并展示，如 `record → ["n. 记录；唱片","v. 录制，记录"]`、`park → ["n. 公园","vt. 停放（汽车）"]`；还有 broadcast/fall/female/fight/number/order/shine/shoot/strike/tire/will。

## 人工抽检（兜底）

抽检以下词条，释义/音标无误：

- gaokao3500：`cancel→取消`、`govern→统治`、`AD→公元`、`ad→广告`、`war→战争`（已纳入黄金抽查集的前两项）。
- cet4：`abandon→放弃`、`ability→能力`（黄金抽查集）。
- cet6：`abolish→彻底废除`、`negotiate→协商/谈判`。
- ielts：`coherent→条理清楚的/连贯的`、`sustainable→足以支撑的`、`hypothesis→假设/假说`。
- toefl：`photosynthesis→光合作用`、`ambiguous→模棱两可的`、`mammal→哺乳动物`。

## 局限说明

释义"语义是否 100% 正确"无法全自动判定；以上用「精确计数 + 校验和锁定 + 编码/CJK 校验 + 黄金抽查 + 人工抽检」覆盖可自动化部分与抽样兜底。若后续发现个别错误，按词修正后**重新生成校验和并更新词数**即可。
