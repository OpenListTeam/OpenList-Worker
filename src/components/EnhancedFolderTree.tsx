import { Box, HStack, Icon, Spinner, Text, VStack } from "@hope-ui/solid"
import { BiSolidRightArrow, BiSolidFolderOpen } from "solid-icons/bi"
import { TbFile, TbFolder } from "solid-icons/tb"
import {
  Accessor,
  createContext,
  createSignal,
  useContext,
  Show,
  For,
  Setter,
  createEffect,
  on,
} from "solid-js"
import { useFetch, useT, useUtil } from "~/hooks"
import { getMainColor, password } from "~/store"
import { Obj } from "~/types"
import {
  pathBase,
  handleResp,
  hoverColor,
  pathJoin,
  createMatcher,
} from "~/utils"
import { fsList } from "~/utils/api"

export type EnhancedFolderTreeHandler = {
  setPath: Setter<string>
}

export interface EnhancedFolderTreeProps {
  onChange: (path: string) => void
  forceRoot?: boolean
  autoOpen?: boolean
  handle?: (handler: EnhancedFolderTreeHandler) => void
  showEmptyIcon?: boolean
  showHiddenFolder?: boolean
}

interface EnhancedFolderTreeContext extends Omit<
  EnhancedFolderTreeProps,
  "handle"
> {
  value: Accessor<string>
}

const context = createContext<EnhancedFolderTreeContext>()

export const EnhancedFolderTree = (props: EnhancedFolderTreeProps) => {
  const [path, setPath] = createSignal("/")
  props.handle?.({ setPath })
  return (
    <Box class="folder-tree-box" w="$full" overflowX="auto">
      <context.Provider
        value={{
          value: path,
          onChange: (val) => {
            setPath(val)
            props.onChange(val)
          },
          autoOpen: props.autoOpen ?? false,
          forceRoot: props.forceRoot ?? false,
          showEmptyIcon: props.showEmptyIcon ?? false,
          showHiddenFolder: props.showHiddenFolder ?? true,
        }}
      >
        <EnhancedFolderTreeNode path="/" />
      </context.Provider>
    </Box>
  )
}

const EnhancedFolderTreeNode = (props: { path: string }) => {
  const { isHidePath } = useUtil()
  const [items, setItems] = createSignal<Obj[]>()
  const {
    value,
    onChange,
    forceRoot,
    autoOpen,
    showEmptyIcon,
    showHiddenFolder,
  } = useContext(context)!

  const emptyIconVisible = () =>
    Boolean(showEmptyIcon && items() !== undefined && !items()?.length)

  const [loading, fetchItems] = useFetch(() =>
    fsList(props.path, password(), 1, 0, false),
  )

  let isLoaded = false

  const load = async () => {
    if (items()?.length) return
    const resp = await fetchItems()
    handleResp(
      resp,
      (data) => {
        isLoaded = true
        setItems(data.content || [])
      },
      () => {
        if (isOpen()) onToggle()
      },
    )
  }

  const { isOpen, onToggle } = createDisclosure()
  const active = () => value() === props.path
  const isMatchedFolder = createMatcher(props.path)

  const checkIfShouldOpen = async (pathname: string) => {
    if (!autoOpen) return
    if (isMatchedFolder(pathname)) {
      if (!isOpen()) onToggle()
      if (!isLoaded) load()
    }
  }

  createEffect(on(value, checkIfShouldOpen))

  const isHiddenFolder = () =>
    isHidePath(props.path) && !isMatchedFolder(value())

  const folders = () => items()?.filter((item) => item.is_dir) || []
  const files = () => items()?.filter((item) => !item.is_dir) || []

  return (
    <Show when={showHiddenFolder || !isHiddenFolder()}>
      <Box>
        <HStack spacing="$2">
          <Show
            when={!loading()}
            fallback={<Spinner size="sm" color={getMainColor()} />}
          >
            <Show
              when={!emptyIconVisible()}
              fallback={<Icon color={getMainColor()} as={BiSolidFolderOpen} />}
            >
              <Icon
                color={getMainColor()}
                as={BiSolidRightArrow}
                transform={isOpen() ? "rotate(90deg)" : "none"}
                transition="transform 0.2s"
                cursor="pointer"
                onClick={() => {
                  onToggle()
                  if (isOpen()) {
                    load()
                  }
                }}
              />
            </Show>
          </Show>
          <Icon color={getMainColor()} as={TbFolder} cursor="pointer" />
          <Text
            css={{
              whiteSpace: "nowrap",
            }}
            fontSize="$md"
            cursor="pointer"
            px="$1"
            rounded="$md"
            bgColor={active() ? "$info8" : "transparent"}
            _hover={
              {
                bgColor: active() ? "$info8" : hoverColor(),
              } as any
            }
            onClick={() => {
              onChange(props.path)
            }}
          >
            {props.path === "/" ? "root" : pathBase(props.path)}
          </Text>
        </HStack>

        <Show when={isOpen()}>
          <VStack mt="$1" pl="$4" alignItems="start" spacing="$1">
            <For each={folders()}>
              {(item) => (
                <EnhancedFolderTreeNode
                  path={pathJoin(props.path, item.name)}
                />
              )}
            </For>

            <For each={files()}>
              {(item) => (
                <HStack spacing="$2" w="$full">
                  <Box w="16px" />
                  <Icon color={getMainColor()} as={TbFile} cursor="pointer" />
                  <Text
                    css={{
                      whiteSpace: "nowrap",
                    }}
                    fontSize="$md"
                    cursor="pointer"
                    px="$1"
                    rounded="$md"
                    bgColor={
                      value() === pathJoin(props.path, item.name)
                        ? "$info8"
                        : "transparent"
                    }
                    _hover={
                      {
                        bgColor:
                          value() === pathJoin(props.path, item.name)
                            ? "$info8"
                            : hoverColor(),
                      } as any
                    }
                    onClick={() => {
                      onChange(pathJoin(props.path, item.name))
                    }}
                  >
                    {item.name}
                  </Text>
                </HStack>
              )}
            </For>
          </VStack>
        </Show>
      </Box>
    </Show>
  )
}

function createDisclosure() {
  const [isOpen, setIsOpen] = createSignal(false)
  return {
    isOpen,
    onToggle: () => setIsOpen(!isOpen()),
    onOpen: () => setIsOpen(true),
    onClose: () => setIsOpen(false),
  }
}
