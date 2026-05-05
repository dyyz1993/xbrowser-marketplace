/**
 * 要求 optional 字段必须同时 nullable
 *
 * 原因：
 * 1. 前端经常传 null 表示空值（如 description: null）
 * 2. Zod 的 .optional() 只接受 undefined，不接受 null
 * 3. 导致前后端数据不一致，产生 ZodError
 *
 * 解决方案：
 * - 使用 .optional().nullable() 同时接受 undefined 和 null
 * - 或者使用 .nullish() 简写（等价于 .optional().nullable()）
 */

export const requireNullableForOptional = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'optional 字段必须同时 nullable，避免前端传 null 时产生 ZodError。使用 .optional().nullable() 或 .nullish()',
      recommended: true,
    },
    messages: {
      requireNullable:
        '🚫 .optional() 字段必须同时加 .nullable()！\n\n' +
        '❌ 问题原因：\n' +
        '   前端经常传 { description: null } 表示空值\n' +
        '   但 z.string().optional() 只接受 undefined，不接受 null\n' +
        '   导致 ZodError: expected string, received null\n\n' +
        '✅ 正确写法：\n' +
        '   description: z.string().optional().nullable()\n' +
        '   // 或使用简写\n' +
        '   description: z.string().nullish()\n\n' +
        '💡 修复建议：\n' +
        '   在 .optional() 后添加 .nullable()，或改用 .nullish()',
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename || context.getFilename?.() || ''

    const isSchemaFile = filename.includes('/shared/modules/') && filename.includes('/schemas.ts')
    if (!isSchemaFile) {
      return {}
    }

    return {
      CallExpression(node) {
        if (
          node.callee?.type !== 'MemberExpression' ||
          node.callee.property?.type !== 'Identifier' ||
          node.callee.property.name !== 'optional'
        ) {
          return
        }

        let currentNode = node.parent
        let hasNullable = false

        while (currentNode) {
          if (
            currentNode.type === 'CallExpression' &&
            currentNode.callee?.type === 'MemberExpression' &&
            currentNode.callee.property?.type === 'Identifier'
          ) {
            const methodName = currentNode.callee.property.name

            if (methodName === 'nullable' || methodName === 'nullish') {
              hasNullable = true
              break
            }

            if (
              methodName !== 'optional' &&
              methodName !== 'describe' &&
              methodName !== 'openapi' &&
              methodName !== 'default'
            ) {
              break
            }
          }
          currentNode = currentNode.parent
        }

        if (!hasNullable) {
          context.report({
            node,
            messageId: 'requireNullable',
          })
        }
      },
    }
  },
}

export default requireNullableForOptional
