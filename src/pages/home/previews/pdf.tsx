import EmbedPDF from "@embedpdf/snippet"
import pdfiumWasmUrl from "@embedpdf/snippet/dist/pdfium.wasm?url"
import { Box, useColorMode } from "@hope-ui/solid"
import { onMount } from "solid-js"
import { currentLang } from "~/app/i18n"
import { BoxWithFullScreen } from "~/components"
import { objStore } from "~/store"
import { base_path } from "~/utils"

const PDFViewer = () => {
  const { colorMode } = useColorMode()
  let ref: HTMLDivElement | undefined
  onMount(() => {
    const src = objStore.raw_url
    // wasm url must be absolute
    const absolutePdfiumWasmUrl = new URL(
      pdfiumWasmUrl,
      location.href + base_path,
    ).href
    if (ref && src) {
      EmbedPDF.init({
        type: "container",
        target: ref,
        src,
        theme: { preference: colorMode() },
        i18n: {
          defaultLocale: currentLang(),
          fallbackLocale: "en",
        },
        wasmUrl: absolutePdfiumWasmUrl,
      })
    }
  })
  return (
    <BoxWithFullScreen w="$full" h="60vh">
      <Box ref={ref} w="$full" h="$full" />
    </BoxWithFullScreen>
  )
}

export default PDFViewer
