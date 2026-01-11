import type { NodeKey, LexicalNode, EditorConfig, SerializedLexicalNode, Spread } from "lexical"
import { DecoratorNode } from "lexical"
import type React from "react" // Import React to declare JSX

export type SerializedKhmerBreakNode = Spread<
  {
    type: "khmer-break"
    version: 1
  },
  SerializedLexicalNode
>

export class KhmerBreakNode extends DecoratorNode<React.JSX.Element> {
  // Use React.JSX.Element instead of JSX.Element
  static getType(): string {
    return "khmer-break"
  }

  static clone(node: KhmerBreakNode): KhmerBreakNode {
    return new KhmerBreakNode(node.__key)
  }

  constructor(key?: NodeKey) {
    super(key)
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = document.createElement("span")
    element.className = "break-marker"
    element.contentEditable = "false"
    element.style.cssText = `
      display: inline-block;
      width: 1px;
      height: 1.2em;
      background: rgb(96 165 250 / 0.6);
      margin: 0 1px;
      vertical-align: middle;
      user-select: none;
      pointer-events: none;
    `
    return element
  }

  updateDOM(): false {
    return false
  }

  decorate(): React.JSX.Element {
    // Use React.JSX.Element instead of JSX.Element
    return <span className="break-marker" />
  }

  isInline(): boolean {
    return true
  }

  isKeyboardSelectable(): boolean {
    return false
  }

  static importJSON(serializedNode: SerializedKhmerBreakNode): KhmerBreakNode {
    return $createKhmerBreakNode()
  }

  exportJSON(): SerializedKhmerBreakNode {
    return {
      type: "khmer-break",
      version: 1,
    }
  }
}

export function $createKhmerBreakNode(): KhmerBreakNode {
  return new KhmerBreakNode()
}

export function $isKhmerBreakNode(node: LexicalNode | null | undefined): node is KhmerBreakNode {
  return node instanceof KhmerBreakNode
}
