import { Box } from "@hope-ui/solid"
import { createEffect, createSignal, onCleanup, onMount } from "solid-js"
import { MaybeLoading } from "./FullLoading"
import loader from "@monaco-editor/loader"
import { useCDN } from "~/hooks"
import type * as monacoType from "monaco-editor/esm/vs/editor/editor.api.js"
import { local } from "~/store"

export interface MonacoEditorProps {
  value: string
  onChange?: (value: string) => void
  theme: "vs" | "vs-dark"
  path?: string
  language?: string
}
let monaco: typeof monacoType

export const MonacoEditorLoader = (props: MonacoEditorProps) => {
  const { monacoPath } = useCDN()
  const [loading, setLoading] = createSignal(true)
  loader.config({
    paths: {
      vs: monacoPath(),
    },
  })
  loader.init().then((m) => {
    monaco = m
    setLoading(false)
  })
  return (
    <MaybeLoading loading={loading()}>
      <MonacoEditor {...props} />
    </MaybeLoading>
  )
}

export const MonacoEditor = (props: MonacoEditorProps) => {
  let monacoEditorDiv: HTMLDivElement
  let monacoEditor: monacoType.editor.IStandaloneCodeEditor
  let model: monacoType.editor.ITextModel

  onMount(() => {
    monacoEditor = monaco.editor.create(monacoEditorDiv!, {
      value: props.value,
      theme: props.theme,
      fontSize: parseInt(local.editor_font_size),
    })
    model = monaco.editor.createModel(
      props.value,
      props.language,
      props.path ? monaco.Uri.parse(props.path) : undefined,
    )
    monacoEditor.setModel(model)
    monacoEditor.onDidChangeModelContent(() => {
      props.onChange?.(monacoEditor.getValue())
    })
  })
  createEffect(() => {
    monacoEditor.setValue(props.value)
  })

  createEffect(() => {
    monaco.editor.setTheme(props.theme)
  })

  createEffect(() => {
    monacoEditor?.updateOptions({
      fontSize: parseInt(local.editor_font_size),
    })
  })

  onCleanup(() => {
    model && model.dispose()
    monacoEditor && monacoEditor.dispose()
  })
  return <Box w="$full" h="70vh" ref={monacoEditorDiv!} />
}
