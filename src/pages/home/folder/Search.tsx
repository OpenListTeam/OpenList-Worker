import {
  Badge,
  createDisclosure,
  HStack,
  Icon,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
  hope,
} from "@hope-ui/solid"
import { BsSearch } from "solid-icons/bs"
import {
  createSignal,
  For,
  Match,
  onCleanup,
  onMount,
  Show,
  Switch,
} from "solid-js"
import Mark from "mark.js"
import {
  FullLoading,
  LinkWithBase,
  Paginator,
  SelectWrapper,
} from "~/components"
import { usePath, useRouter, useT } from "~/hooks"
import { getMainColor, me, password } from "~/store"
import { SearchNode } from "~/types"
import {
  bus,
  encodePath,
  fsSearch,
  getFileSize,
  handleRespWithoutAuthAndNotify,
  hoverColor,
  pathJoin,
} from "~/utils"
import { isMac } from "~/utils/compatibility"
import { getIconByObj } from "~/utils/icon"

// class MarkKeywords {
//   root
//   rootHTML
//   style

//   /**
//    * Keyword highlight
//    * @param root Find root elements
//    * @param style The default background is highly bright yellow
//    */
//   constructor(config: { root: Element | null; style?: string }) {
//     if (!config.root) return
//     this.root = config.root
//     this.rootHTML = config.root.innerHTML
//     this.style = config.style ?? "background-color: #FF0"
//   }

//   /** mark keyword */
//   light(keyword: string) {
//     const handler = (root: any) => {
//       if (
//         root.nodeName === "#text" &&
//         root.parentNode.childNodes.length === 1
//       ) {
//         root.parentNode.innerHTML = root.parentNode.innerHTML.replace(
//           new RegExp(keyword, "g"),
//           `<span class="mark" style="${this.style}">${keyword}</span>`,
//         )
//       } else {
//         for (const node of root.childNodes) {
//           handler(node)
//         }
//       }
//     }

//     if (!this.root) return

//     // reset HTML
//     this.root.innerHTML = this.rootHTML!

//     if (!keyword) return
//     handler(this.root)
//   }
// }

function NodeName(props: { keywords: string; name: string }) {
  let ref: HTMLSpanElement
  onMount(() => {
    // const highlighter = new MarkKeywords({
    //   root: ref!,
    //   style: `background-color: var(--hope-colors-info5); border-radius: var(--hope-radii-md); margin: 0 1px; padding: 0 1px;`,
    // })
    // highlighter.light(props.keywords)
    const mark = new Mark(ref!)
    mark.mark(props.keywords, {
      separateWordSearch: true,
      diacritics: true,
    })
  })
  return (
    <hope.span
      ref={ref!}
      css={{
        mark: {
          bg: "$info4",
          rounded: "$md",
          px: "1px",
          // mx: "1px",
          color: "$info11",
          fontWeight: "$bold",
        },
      }}
    >
      {props.name}
    </hope.span>
  )
}

const SearchResult = (props: { node: SearchNode; keywords: string }) => {
  const { setPathAs } = usePath()
  return (
    <HStack
      w="$full"
      borderBottom={`1px solid ${hoverColor()}`}
      _hover={{
        bgColor: hoverColor(),
      }}
      rounded="$md"
      cursor="pointer"
      px="$2"
      as={LinkWithBase}
      href={`${props.node.path}?from=search`}
      // encode
      onMouseEnter={() => {
        setPathAs(props.node.path, props.node.is_dir)
      }}
    >
      <Icon
        class="icon"
        boxSize="$6"
        color={getMainColor()}
        as={getIconByObj(props.node)}
        mr="$1"
      />
      <VStack flex={1} p="$1" spacing="$1" w="$full" alignItems="start">
        <Text
          css={{
            wordBreak: "break-all",
          }}
        >
          <NodeName keywords={props.keywords} name={props.node.name} />
          <Show when={props.node.size > 0 || !props.node.is_dir}>
            <Badge colorScheme="info" ml="$2">
              {getFileSize(props.node.size)}
            </Badge>
          </Show>
        </Text>
        <Text
          color="$neutral10"
          size="xs"
          css={{
            wordBreak: "break-all",
          }}
        >
          {props.node.parent}
        </Text>
      </VStack>
    </HStack>
  )
}

const Search = () => {
  const pageSize = 100
  const { isOpen, onOpen, onClose, onToggle } = createDisclosure()
  const t = useT()
  const handler = (name: string) => {
    if (name === "search") {
      onOpen()
    }
  }
  bus.on("tool", handler)
  const searchEvent = (e: KeyboardEvent) => {
    if ((e.ctrlKey || (isMac && e.metaKey)) && e.key.toLowerCase() === "k") {
      e.preventDefault()
      onToggle()
    }
  }
  document.addEventListener("keydown", searchEvent)
  onCleanup(() => {
    bus.off("tool", handler)
    document.removeEventListener("keydown", searchEvent)
  })
  const [keywords, setKeywords] = createSignal("")
  const { pathname } = useRouter()
  const [searching, setSearching] = createSignal(false)
  const [data, setData] = createSignal({
    content: [] as SearchNode[],
    total: 0,
  })
  const [scope, setScope] = createSignal(0)
  const scopes = ["all", "folder", "file"]
  let resetPaginator: () => void
  // 请求序号：实时输入时旧请求可能后到，只有最新一次的结果才允许渲染
  let searchSeq = 0
  // 防抖定时器：输入停止后再发起搜索
  let debounceTimer: number | undefined

  const search = async (page = 1) => {
    page === 1 && resetPaginator?.()
    const kw = keywords().trim()
    if (!kw) {
      // 关键字被删空：取消在途请求并清空结果
      searchSeq++
      setSearching(false)
      setData({ content: [], total: 0 })
      return
    }
    const seq = ++searchSeq
    setSearching(true)
    let resp: Awaited<ReturnType<typeof fsSearch>>
    try {
      resp = await fsSearch(
        pathname(),
        kw,
        password(),
        scope(),
        page,
        pageSize,
      )
    } catch {
      // 网络异常：仅停止 loading，避免实时输入时卡死在加载态
      if (seq === searchSeq) setSearching(false)
      return
    }
    if (seq !== searchSeq) return // 过期响应，丢弃
    setSearching(false)
    handleRespWithoutAuthAndNotify(resp, (data) => {
      if (seq !== searchSeq) return
      const content = data.content
      if (!content) {
        return
      }
      content.forEach((node) => {
        if (me().base_path && node.parent.startsWith(me().base_path)) {
          const pattern = new RegExp("^" + me().base_path)
          node.parent = node.parent.replace(pattern, "") || "/"
          if (!node.parent.startsWith("/")) {
            node.parent = "/" + node.parent
          }
        }
        node.path = encodePath(pathJoin(node.parent, node.name))
      })
      setData(data)
    })
  }

  // 输入实时匹配：停止输入 250ms 后自动搜索（添加/删除关键字都触发）
  const scheduleSearch = () => {
    clearTimeout(debounceTimer)
    if (!keywords().trim()) {
      search()
      return
    }
    debounceTimer = window.setTimeout(() => search(), 250)
  }

  onCleanup(() => {
    clearTimeout(debounceTimer)
    searchSeq++ // 组件卸载后丢弃一切在途响应
  })
  return (
    <Modal
      // blockScrollOnMount={false}
      opened={isOpen()}
      onClose={onClose}
      closeOnEsc={false}
      size={{
        "@initial": "sm",
        "@sm": "lg",
        "@md": "2xl",
      }}
      initialFocus="#search-input"
      scrollBehavior="inside"
    >
      <ModalOverlay bg="$blackAlpha5" />
      <ModalContent mx="$2">
        <ModalCloseButton />
        <ModalHeader>{t("home.search.search")}</ModalHeader>
        <ModalBody>
          <VStack w="$full" spacing="$2">
            <HStack w="$full" spacing="$2">
              <SelectWrapper
                w="$32"
                value={scope()}
                onChange={(v) => {
                  setScope(v)
                  // 切换范围（全部/文件夹/文件）立即重新匹配
                  scheduleSearch()
                }}
                options={scopes.map((v, i) => ({
                  value: i,
                  label: t(`home.search.scopes.${v}`),
                }))}
              />
              <Input
                id="search-input"
                value={keywords()}
                onInput={(e) => {
                  setKeywords(e.currentTarget.value)
                  scheduleSearch()
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && keywords().trim().length !== 0) {
                    clearTimeout(debounceTimer)
                    search()
                  }
                }}
              />
              <IconButton
                flexShrink={0}
                aria-label="search"
                icon={<BsSearch />}
                onClick={() => {
                  clearTimeout(debounceTimer)
                  search()
                }}
                loading={searching()}
                disabled={keywords().trim().length === 0}
              />
            </HStack>
            <Switch>
              <Match when={searching()}>
                <FullLoading />
              </Match>
              <Match when={data().content.length === 0}>
                <Text size="2xl" my="$8">
                  {t("home.search.no_result")}
                </Text>
              </Match>
            </Switch>
            <VStack w="$full">
              <For each={data().content}>
                {(item) => <SearchResult node={item} keywords={keywords()} />}
              </For>
            </VStack>
            <Paginator
              total={data().total}
              defaultPageSize={pageSize}
              onChange={(page) => {
                search(page)
              }}
              setResetCallback={(reset) => (resetPaginator = reset)}
            />
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export { Search }
