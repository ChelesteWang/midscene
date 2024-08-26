import path, { join } from 'node:path';
import { parseContextFromWebPage } from '@/common/utils';
import { generateExtractData } from '@/debug';
import { sleep } from '@midscene/core/utils';
import { describe, expect, it } from 'vitest';
import { launchPage } from '../ai/puppeteer/utils';

const pagePath = join(__dirname, './fixtures/extractor/index.html');
describe(
  'extractor',
  () => {
    it('basic', async () => {
      const { page, reset } = await launchPage(`file://${pagePath}`);

      const { content } = await parseContextFromWebPage(page);
      await generateExtractData(
        page,
        path.join(__dirname, 'fixtures/extractor'),
        {
          disableInputImage: false,
          disableOutputImage: false,
          disableOutputWithoutTextImg: true,
          disableResizeOutputImg: true,
          disableSnapshot: true,
        },
      );

      const list = content.map((item) => {
        return {
          content: item.content,
          attributes: item.attributes,
        };
      });

      expect(list).toMatchSnapshot();
      await reset();
    });

    it('profile ', async () => {
      const { page, reset } = await launchPage('https://webinfra.org/about');
      await sleep(1000);
      console.time('total - parseContextFromWebPage');
      const { content } = await parseContextFromWebPage(page);
      console.timeEnd('total - parseContextFromWebPage');
    });
  },
  {
    timeout: 90 * 1000,
  },
);
