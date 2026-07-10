import { BoxWithFullScreen, Error as Erro, FullLoading } from "~/components"
import { Box, Button, HStack } from "@hope-ui/solid"
import { loadScriptIIFE } from "~/utils"
import { createSignal, onMount, For, Show } from "solid-js"
import { useLink, useT, useCDN } from "~/hooks"

// 声明全局ExcelJS类型
declare global {
  interface Window {
    ExcelJS: any
  }
}

interface CellData {
  value: string
  style?: {
    bold?: boolean
    italic?: boolean
    bgColor?: string
    fgColor?: string
    alignment?: string
  }
}

interface SheetData {
  name: string
  rows: CellData[][]
}

const ExcelViewerApp = () => {
  const t = useT()
  const { currentObjLink } = useLink()
  const { excelJSPath } = useCDN()
  const [loading, setLoading] = createSignal(true)
  const [error, setError] = createSignal(false)
  const [sheets, setSheets] = createSignal<SheetData[]>([])
  const [currentSheetIndex, setCurrentSheetIndex] = createSignal(0)
  let containerRef: HTMLDivElement | undefined

  // 加载并解析Excel文件
  const loadExcelFile = async () => {
    try {
      setLoading(true)
      setError(false)

      // 先加载ExcelJS库
      await loadScriptIIFE(excelJSPath(), "exceljs-script")

      // 获取文件URL
      const fileUrl = currentObjLink()

      // 下载文件
      const response = await fetch(fileUrl)
      if (!response.ok) {
        throw new Error("Failed to fetch Excel file")
      }

      const arrayBuffer = await response.arrayBuffer()

      // 使用ExcelJS解析文件
      const workbook = new window.ExcelJS.Workbook()
      await workbook.xlsx.load(arrayBuffer)

      // 提取所有工作表数据
      const sheetsData: SheetData[] = []

      workbook.worksheets.forEach((worksheet: any) => {
        const rows: CellData[][] = []

        worksheet.eachRow((row: any, rowNumber: number) => {
          const rowData: CellData[] = []

          row.eachCell(
            { includeEmpty: true },
            (cell: any, colNumber: number) => {
              // 获取单元格值
              let cellValue = ""
              if (cell.value !== null && cell.value !== undefined) {
                if (typeof cell.value === "object" && "text" in cell.value) {
                  cellValue = cell.value.text
                } else if (
                  typeof cell.value === "object" &&
                  "result" in cell.value
                ) {
                  cellValue = String(cell.value.result)
                } else {
                  cellValue = String(cell.value)
                }
              }

              // 获取单元格样式
              const style: CellData["style"] = {}
              if (cell.font) {
                style.bold = cell.font.bold
                style.italic = cell.font.italic
              }
              if (cell.fill && cell.fill.fgColor) {
                style.bgColor = cell.fill.fgColor.argb
              }
              if (cell.alignment) {
                style.alignment = cell.alignment.horizontal || "left"
              }

              rowData.push({ value: cellValue, style })
            },
          )

          rows.push(rowData)
        })

        sheetsData.push({
          name: worksheet.name,
          rows: rows,
        })
      })

      setSheets(sheetsData)
      setLoading(false)
    } catch (e) {
      console.error("Excel加载失败:", e)
      setError(true)
      setLoading(false)
    }
  }

  onMount(() => {
    loadExcelFile()
  })

  return (
    <BoxWithFullScreen w="$full" h="70vh" pos="relative">
      {/* 工作表标签和全屏按钮 */}
      <Box
        pos="absolute"
        top="$2"
        left="$2"
        right="$2"
        zIndex="10"
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        px="$2"
      >
        {/* 工作表标签 */}
        <Show when={!loading() && !error() && sheets().length > 0}>
          <HStack spacing="$2" flexWrap="wrap">
            <For each={sheets()}>
              {(sheet, index) => (
                <Button
                  size="sm"
                  variant={
                    currentSheetIndex() === index() ? "solid" : "outline"
                  }
                  colorScheme="primary"
                  onClick={() => setCurrentSheetIndex(index())}
                >
                  {sheet.name}
                </Button>
              )}
            </For>
          </HStack>
        </Show>

        {/* Excel表格容器 */}
        <div
          ref={containerRef}
          style={{
            width: "100%",
            height: "100%",
            overflow: "auto",
            position: "relative",
            background: "#ffffff",
            "padding-top": "50px",
          }}
        >
          {/* 表格内容 */}
          <Show when={!loading() && !error() && sheets().length > 0}>
            <div style={{ padding: "20px", overflow: "auto" }}>
              <table
                style={{
                  "border-collapse": "collapse",
                  width: "100%",
                  "background-color": "white",
                  "box-shadow": "0 2px 8px rgba(0,0,0,0.1)",
                }}
              >
                <tbody>
                  <For each={sheets()[currentSheetIndex()]?.rows || []}>
                    {(row) => (
                      <tr>
                        <For each={row}>
                          {(cell) => (
                            <td
                              style={{
                                border: "1px solid #ddd",
                                padding: "8px 12px",
                                "font-weight": cell.style?.bold
                                  ? "bold"
                                  : "normal",
                                "font-style": cell.style?.italic
                                  ? "italic"
                                  : "normal",
                                "background-color": cell.style?.bgColor
                                  ? `#${cell.style.bgColor.slice(2)}`
                                  : "transparent",
                                "text-align":
                                  (cell.style?.alignment as any) || "left",
                                "white-space": "pre-wrap",
                                "word-break": "break-word",
                                "min-width": "100px",
                              }}
                            >
                              {cell.value}
                            </td>
                          )}
                        </For>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </Show>

          {/* 加载状态 */}
          <Show when={loading()}>
            <FullLoading />
          </Show>

          {/* 错误状态 */}
          <Show when={error()}>
            <Erro msg={t("preview.failed_load_excel")} h="70vh" />
          </Show>
        </div>
      </Box>
    </BoxWithFullScreen>
  )
}

export default ExcelViewerApp
