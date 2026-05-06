/**
 * @framework-baseline 116dec37dbe7f2ca
 */

/**
 * 自定义 ESLint 规则：强制 Antd 泛型组件必须传入类型参数
 *
 * Form.useForm<T>() 必须传入泛型类型
 * Table<RecordType> 必须传入泛型类型
 */

export const requireAntdGenericTypes = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require generic type parameters for Antd Form.useForm() and Table components',
      recommended: true,
    },
    messages: {
      useFormMissingGeneric:
        'Form.useForm() must have a generic type parameter.\n' +
        'Example: const [form] = Form.useForm<MyFormValues>()\n' +
        'This ensures type safety for form field values.',
      tableMissingGeneric:
        'Table component must have a generic type parameter for dataSource.\n' +
        'Example: Table<UserData> or Table<RecordType>\n' +
        'This ensures type safety for table data.',
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === 'Form' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'useForm'
        ) {
          const typeArgs = node.typeArguments || node.typeParameters
          if (!typeArgs || typeArgs.params.length === 0) {
            context.report({
              node,
              messageId: 'useFormMissingGeneric',
            })
          }
        }
      },
      JSXElement(node) {
        if (
          node.openingElement.name.type === 'Identifier' &&
          node.openingElement.name.name === 'Table'
        ) {
          const typeArgs = node.openingElement.typeArguments || node.openingElement.typeParameters
          if (!typeArgs || typeArgs.params.length === 0) {
            const hasDataSource = node.openingElement.attributes.some(
              attr => attr.type === 'JSXAttribute' && attr.name.name === 'dataSource'
            )
            if (hasDataSource) {
              context.report({
                node: node.openingElement,
                messageId: 'tableMissingGeneric',
              })
            }
          }
        }
      },
    }
  },
}

export default requireAntdGenericTypes
