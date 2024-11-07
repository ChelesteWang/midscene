import type { UIContext } from '@/types';
import {
  AIActionType,
  type AIArgs,
  callAiFn,
  transformUserMessages,
} from '../common';
import { describeUserPage } from './util';

export function systemPromptToPlanToGoal() {
  return `

## 角色:
你是一个专业的 UI 软件测试工程师，你的工作是根据用户的需求，将用户的需求分解为一系列的行动。

## 目标:

用户会给你一个目标，你需要将这个目标分解为下一步的行动。请一步步思考接下来的行动！谨慎思考！

## 工作流

1. 你将接收到：目标、一系列之前已经执行过的任务、当前页面的截图和 json 元素信息。
2. 你需要根据目标，思考在当前页面下，下一步该做什么才能更接近目标。
3. 通过自然语言描述接下来的操作：点击、输入、滚动（支持向上、向下滚动一屏幕）
4. 在页面可以滚动的情况下，注意可以通过滚动来进一步确认页面是否完成


## 限制

1. 不要重复执行已经完成的任务（比如：在饮品页不需要重复选择已经选中的规格）
2. 注意下一步的任务必须要基于当前页面的内容，不要编造内容
3. 如果当前页面已经处于目标状态，请返回 isDone: true
4. 注意在滚动页面前必须要把当前页面的任务完成，一般任务都可以看到是否为必选选项（重要！）
5. 请注意 action 的 prompt 中的任务一定要基于当前页面的内容规划出来的不要捏造


## 输出格式

请返回一个 JSON 格式的结果，结果的格式如下：

\`\`\`json

 {
    "action": {
       // 通过自然语言描述下一步该做什么（每次只描述一个动作，基于当前的页面情况，直接描述要操作的内容是什么）
       // 描述操作特定元素时，前面一定要增加一句在当前页面操作 xxx
       // 自然语言描述的内容仅包括：点击、输入、滚动（支持向上、向下滚动一屏幕）
       // 在页面可以滚动的情况下，注意可以通过滚动来进一步确认页面是否完成
       // 注意下一步的任务必须要基于当前页面的内容，不要编造内容
       "prompt": string,

       // 描述 prompt 生成的原因
       "reason": string,

       // 当前在什么页面做什么任务
       "pageDescription": string,

       // 描述当前已经完成了多少任务
       // 基于之前已经完成的任务基础之上，将 prompt 生成的任务和之前已经完成的任务合并在一起
       // 注意：completedTasks 是概括性的描述，基于用户的目标来生成已经完成的任务，比如用户需要下单，选择规格。那完成的任务应该描述为已经完成了其中哪些步骤
       // completedTasks 举例：
       // 1.在首页：点击了 xxx 饮品的下单按钮
       // 2.在饮品选择规格页：选择了 xxx 规格...，... 
       // 3. xxx，最终完成了 xx 任务
       "completedTasks": string
    },
    "isDone": boolean // 如果已经达到了目标，请返回 true，否则返回 false
  }
\`\`\`
`;
}

type PlanToGoalAIResponse = {
  action: {
    prompt: string;
    reason: string;
    completedTasks: string;
  };
  isDone: boolean;
};

export async function planToGoal(
  userPrompt: {
    target: string;
    isBottom: boolean;
    completedTasks: string;
  },
  opts: {
    context: UIContext;
    callAI?: typeof callAiFn<PlanToGoalAIResponse>;
  },
  useModel?: 'coze' | 'openAI',
): Promise<PlanToGoalAIResponse> {
  const { callAI, context } = opts || {};
  const { screenshotBase64 } = context;
  const { description: pageDescription, elementByPosition } =
    await describeUserPage(context);

  const systemPrompt = systemPromptToPlanToGoal();

  const msgs: AIArgs = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: transformUserMessages([
        {
          type: 'image_url',
          image_url: {
            url: screenshotBase64,
            detail: 'high',
          },
        },
        {
          type: 'text',
          text: `
              pageDescription:\n 
              ${pageDescription}
              \n

              页面可滚动状态描述：${
                userPrompt.isBottom
                  ? '当前页面已经处于底部'
                  : '当前页面还可以向下滚动'
              }
              \n
              Here is the description of the task. Just go ahead:
              =====================================
              \n
              用户希望页面达成的目标状态：
              ${userPrompt.target}

              之前已经完成的任务：
              ${userPrompt.completedTasks}
              =====================================
            `,
        },
      ]),
    },
  ];

  const call = callAI || callAiFn;
  const planFromAI = await call({
    msgs,
    AIActionType: AIActionType.PLAN_TO_GOAL,
    useModel,
  });

  const action = planFromAI?.action;

  return { action, isDone: planFromAI?.isDone };
}
