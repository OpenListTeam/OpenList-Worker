import { Flex, HStack, IconButton, Input, Text } from "@hope-ui/solid"
import {
  createEffect,
  createMemo,
  createSignal,
  mergeProps,
  Show,
} from "solid-js"
import { createStore } from "solid-js/store"
import {
  FaSolidAngleLeft,
  FaSolidAngleRight,
  FaSolidAnglesLeft,
  FaSolidAnglesRight,
} from "solid-icons/fa"

export interface PaginatorProps {
  colorScheme?:
    | "primary"
    | "accent"
    | "neutral"
    | "success"
    | "info"
    | "warning"
    | "danger"
  defaultCurrent?: number
  onChange?: (current: number) => void
  hideOnSinglePage?: boolean
  total: number
  defaultPageSize?: number
  maxShowPage?: number
  setResetCallback?: (callback: () => void) => void
}

export const Paginator = (props: PaginatorProps) => {
  const merged = mergeProps(
    {
      colorScheme: "accent" as const,
      defaultPageSize: 20,
      defaultCurrent: 1,
      hideOnSinglePage: true,
    },
    props,
  )
  const [store, setStore] = createStore({
    pageSize: merged.defaultPageSize,
    current: merged.defaultCurrent,
  })

  const [inputVal, setInputVal] = createSignal(String(merged.defaultCurrent))

  createEffect(() => {
    if (merged.defaultCurrent !== undefined) {
      setStore("current", merged.defaultCurrent)
      setInputVal(String(merged.defaultCurrent))
    }
  })
  createEffect(() => {
    if (merged.defaultPageSize !== undefined) {
      setStore("pageSize", merged.defaultPageSize)
    }
  })
  merged.setResetCallback?.(() => {
    setStore("current", merged.defaultCurrent)
    setInputVal(String(merged.defaultCurrent))
  })

  const pages = createMemo(() => {
    const validSize = Math.max(1, Math.floor(store.pageSize || 20))
    return Math.max(1, Math.ceil(merged.total / validSize))
  })

  const size = {
    "@initial": "sm",
    "@md": "md",
  } as const

  const onPageChange = (page: number) => {
    const target = Math.max(1, Math.min(pages(), page))
    setStore("current", target)
    setInputVal(String(target))
    if (target !== merged.defaultCurrent) {
      merged.onChange?.(target)
    }
  }

  const handleJump = () => {
    const val = parseInt(inputVal(), 10)
    if (!isNaN(val)) {
      onPageChange(val)
    } else {
      setInputVal(String(store.current))
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      handleJump()
    }
  }

  return (
    <Show when={!merged.hideOnSinglePage || pages() > 1}>
      <Flex
        w="$full"
        justifyContent="flex-end"
        alignItems="center"
        class="paginator-wrapper"
      >
        <HStack spacing="$1" alignItems="center" class="paginator-bar">
          {/* First Page */}
          <IconButton
            size={size}
            variant="subtle"
            icon={<FaSolidAnglesLeft />}
            aria-label="First page"
            colorScheme={merged.colorScheme}
            disabled={store.current <= 1}
            onClick={() => onPageChange(1)}
            w="2rem !important"
          />

          {/* Previous Page */}
          <IconButton
            size={size}
            variant="subtle"
            icon={<FaSolidAngleLeft />}
            aria-label="Previous page"
            colorScheme={merged.colorScheme}
            disabled={store.current <= 1}
            onClick={() => onPageChange(store.current - 1)}
            w="2rem !important"
          />

          {/* Page Input & Total Display */}
          <HStack
            spacing="$1"
            alignItems="center"
            px="$2"
            py="$0_5"
            rounded="$md"
            border="1px solid"
            borderColor="$neutral6"
            bgColor="$neutral2"
          >
            <Input
              size={size}
              w="48px"
              h="26px"
              textAlign="center"
              variant="unstyled"
              p="$0"
              fontWeight="medium"
              value={inputVal()}
              onInput={(e) => {
                const val = e.currentTarget.value.replace(/[^0-9]/g, "")
                setInputVal(val)
              }}
              onKeyDown={handleKeyDown}
              onBlur={handleJump}
              aria-label="Page number"
            />
            <Text
              size="sm"
              color="$neutral11"
              css={{ whiteSpace: "nowrap", userSelect: "none" }}
            >
              / {pages()}
            </Text>
          </HStack>

          {/* Next Page */}
          <IconButton
            size={size}
            variant="subtle"
            icon={<FaSolidAngleRight />}
            aria-label="Next page"
            colorScheme={merged.colorScheme}
            disabled={store.current >= pages()}
            onClick={() => onPageChange(store.current + 1)}
            w="2rem !important"
          />

          {/* Last Page */}
          <IconButton
            size={size}
            variant="subtle"
            icon={<FaSolidAnglesRight />}
            aria-label="Last page"
            colorScheme={merged.colorScheme}
            disabled={store.current >= pages()}
            onClick={() => onPageChange(pages())}
            w="2rem !important"
          />
        </HStack>
      </Flex>
    </Show>
  )
}
