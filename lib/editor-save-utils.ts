/**
 * Utilities for optimizing editor state before saving.
 */

interface LexicalNode {
  type: string
  children?: LexicalNode[]
  [key: string]: unknown
}

interface LexicalEditorState {
  root: LexicalNode
  [key: string]: unknown
}

/**
 * Strips KhmerBreakNodes from a serialized Lexical editor state JSON.
 * Break nodes are purely visual markers that are regenerated on load
 * via FORCE_RESEGMENT_COMMAND, so storing them wastes space.
 */
export function stripBreakNodes(editorStateJson: object): object {
  return stripBreakNodesRecursive(editorStateJson as LexicalEditorState) as object
}

function stripBreakNodesRecursive<T extends LexicalNode>(node: T): T {
  if (!node.children) return node

  const filteredChildren = node.children
    .filter((child) => child.type !== "khmer-break")
    .map((child) => stripBreakNodesRecursive(child))

  return { ...node, children: filteredChildren }
}
