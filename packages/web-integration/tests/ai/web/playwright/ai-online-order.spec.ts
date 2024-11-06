import { parseContextFromWebPage } from '@/common/utils';
import { generateTestDataPath } from '@/debug';
import { PlaywrightWebPage } from '@/playwright';
import { planToGoal } from '@midscene/core/ai-model';
import { expect } from 'playwright/test';
import { test } from './fixture';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

test.beforeEach(async ({ page }) => {
  page.setViewportSize({ width: 400, height: 905 });
  await page.goto('https://heyteavivocity.meuu.online/home');
  await page.waitForLoadState('networkidle');
});

test('ai online order', async ({ ai, page, aiQuery }) => {
  await ai('点击左上角语言切换按钮(英文、中文)，在弹出的下拉列表中点击中文');
  await ai('向下滚动两屏');
  await ai('直接点击多肉葡萄的规格按钮');
  await ai('点击不使用吸管、点击冰沙推荐、点击正常冰推荐');
  await ai('向下滚动一屏');
  await ai('点击标准甜、点击绿妍（推荐）、点击标准口味');
  await ai('滚动到最下面');
  await ai('点击页面下边的“选好了”按钮');
  await ai('点击右上角商品图标按钮(仅商品按钮)');

  const cardDetail = await aiQuery({
    productName: '商品名称，在价格上面',
    productPrice: '商品价格， string',
    productDescription: '商品描述（饮品的各种参数，吸管、冰沙等），在价格下面',
  });

  // expect(cardDetail.productName.indexOf('多肉葡萄')).toBeGreaterThanOrEqual(0);

  // const content = await aiQuery(query('购物车商品详情', {
  //   productName: "商品名称，在价格上面",
  //   productPrice: "商品价格",
  //   productDescription: "商品描述（饮品的各种参数，吸管、冰沙等），在价格下面",
  // }));

  console.log('商品订单详情：', {
    productName: cardDetail.productName,
    productPrice: cardDetail.productPrice,
    productDescription: cardDetail.productDescription,
  });
  expect(cardDetail.productName).toContain('多肉葡萄');
  expect(cardDetail.productDescription).toContain('绿妍');
});

test('ai todo plan to goal', async ({ ai, aiQuery, page }) => {
  const target = `
   1. 在首页时随便点击一个饮品进入下单流程即可
   2. 在饮品选择规格页，逐步选择规格（规格可能分成多页，注意滚动保证每个规格都选择好了），规格中我想要热饮少糖，规格页下面一般都有确认下单按钮
  `;
  const tasks: { prompt: string; reason: string }[] = [];
  while (true) {
    const nPage = new PlaywrightWebPage(page);
    const context = await parseContextFromWebPage(nPage);
    const isBottom = await page.evaluate(() => {
      return (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight
      );
    });
    const plan = await planToGoal(
      {
        target,
        isBottom: false,
      },
      {
        context,
      },
    );
    console.log('plan: ', plan);
    if (plan.isDone) {
      break;
    }
    await ai(plan.action.prompt);
    tasks.push(plan.action);
  }
});
